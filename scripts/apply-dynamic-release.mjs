import { promises as fs } from 'node:fs';
import path from 'node:path';

const repositoryRoot = process.cwd();
const wwwRoot = path.join(repositoryRoot, 'www');
const homePath = path.join(wwwRoot, 'index.html');
const nextRevision = 'e7c4a91d';

const templateRepository = 'https://github.com/ai-development-harness/ai-development-harness-template';
const latestReleaseApi = 'https://api.github.com/repos/ai-development-harness/ai-development-harness-template/releases/latest';
const latestReleaseFallback = `${templateRepository}/releases/latest`;

async function collectHtmlFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectHtmlFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(entryPath);
    }
  }

  return files;
}

const homeSource = await fs.readFile(homePath, 'utf8');
const currentRevisionMatch = homeSource.match(/\/js\/theme-init\.js\?v=([a-zA-Z0-9_-]+)/);
if (!currentRevisionMatch) {
  throw new Error('Не найден текущий cache-busting revision в www/index.html');
}
const currentRevision = currentRevisionMatch[1];

const htmlFiles = await collectHtmlFiles(wwwRoot);
for (const htmlPath of htmlFiles) {
  let source = await fs.readFile(htmlPath, 'utf8');

  // Yandex.Metrika загружает внешний script с mc.yandex.ru на каждой публичной
  // странице. Открываем соединение ещё в <head>, чтобы DNS/TLS не начинались
  // только после того, как браузер дойдёт до счётчика в <body>.
  if (!source.includes('rel="preconnect" href="https://mc.yandex.ru"')) {
    source = source.replace(
      '<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">',
      '<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">\n<link rel="preconnect" href="https://mc.yandex.ru">',
    );
  }

  // Любое изменение JS требует нового общего revision для всех JS/CSS-ссылок.
  source = source.replaceAll(`?v=${currentRevision}`, `?v=${nextRevision}`);

  if (htmlPath === homePath) {
    // Только главная обращается к GitHub Releases API. Для fetch() используется
    // анонимное cross-origin соединение, поэтому preconnect задаём с crossorigin.
    if (!source.includes('rel="preconnect" href="https://api.github.com"')) {
      source = source.replace(
        '<link rel="preconnect" href="https://mc.yandex.ru">',
        '<link rel="preconnect" href="https://mc.yandex.ru">\n<link rel="preconnect" href="https://api.github.com" crossorigin>',
      );
    }

    const releasePattern = /<p><a class="text-link" href="https:\/\/github\.com\/ai-development-harness\/ai-development-harness-template\/releases\/tag\/[^\"]+" target="_blank" rel="noreferrer">Latest release: [^<]+ →<\/a><\/p>/;
    if (!releasePattern.test(source)) {
      throw new Error('Не найден текущий hardcoded latest release на главной странице');
    }

    source = source.replace(
      releasePattern,
      `<p><a class="text-link" href="${latestReleaseFallback}" target="_blank" rel="noreferrer" data-latest-release>Latest release →</a></p>`,
    );

    if (!source.includes('/js/release.js')) {
      source = source.replace(
        `<script src="/js/theme.js?v=${nextRevision}"></script>`,
        `<script src="/js/release.js?v=${nextRevision}"></script>\n<script src="/js/theme.js?v=${nextRevision}"></script>`,
      );
    }
  }

  await fs.writeFile(htmlPath, source);
}

const releaseScript = `// -----------------------------------------------------------------------------
// Динамическое отображение последнего опубликованного релиза Harness.
//
// GitHub Releases остаётся источником истины для номера версии. В HTML хранится
// только стабильная fallback-ссылка /releases/latest, поэтому новый релиз не
// требует отдельного изменения сайта. Ответ GitHub API кешируется на один час в
// localStorage: этого достаточно, чтобы не делать лишний публичный API-запрос при
// каждом открытии страницы и при этом довольно быстро показывать новый релиз.
// -----------------------------------------------------------------------------

(() => {
  const releaseLink = document.querySelector('[data-latest-release]');
  if (!releaseLink) return;

  const API_URL = '${latestReleaseApi}';
  const CACHE_KEY = 'aih.latest-release.v1';
  const CACHE_TTL_MS = 60 * 60 * 1000;

  /** Показывает проверенные данные релиза и обновляет ссылку на GitHub Release. */
  function renderRelease(release) {
    releaseLink.textContent = \`Latest release: \${release.tagName} →\`;
    releaseLink.href = release.url;
  }

  /**
   * Читает кеш без предположения, что localStorage всегда доступен. Браузер может
   * запретить его политикой приватности или окружением, и это не должно ломать UI.
   */
  function readCache() {
    try {
      const rawValue = window.localStorage.getItem(CACHE_KEY);
      if (!rawValue) return null;

      const parsed = JSON.parse(rawValue);
      if (
        typeof parsed?.tagName !== 'string'
        || typeof parsed?.url !== 'string'
        || typeof parsed?.savedAt !== 'number'
      ) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  /** Сохраняет только минимальные данные, нужные для повторного отображения. */
  function writeCache(release) {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify({
        ...release,
        savedAt: Date.now(),
      }));
    } catch {
      // Недоступный localStorage не критичен: сайт продолжит работать без кеша.
    }
  }

  /**
   * Преобразует ответ GitHub в небольшой внутренний объект и не принимает
   * неожиданные URL. Это не даёт случайному/повреждённому ответу заменить href
   * ссылки на посторонний origin.
   */
  function normalizeRelease(payload) {
    if (typeof payload?.tag_name !== 'string' || typeof payload?.html_url !== 'string') {
      throw new Error('GitHub Releases API вернул неполные данные');
    }

    const releaseUrl = new URL(payload.html_url);
    if (releaseUrl.origin !== 'https://github.com') {
      throw new Error('GitHub Releases API вернул неожиданный origin');
    }

    return {
      tagName: payload.tag_name,
      url: releaseUrl.href,
    };
  }

  const cachedRelease = readCache();
  if (cachedRelease) renderRelease(cachedRelease);

  const cacheIsFresh = cachedRelease
    && Date.now() - cachedRelease.savedAt < CACHE_TTL_MS;
  if (cacheIsFresh) return;

  fetch(API_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(\`GitHub Releases API ответил HTTP \${response.status}\`);
      }
      return response.json();
    })
    .then(normalizeRelease)
    .then((release) => {
      renderRelease(release);
      writeCache(release);
    })
    .catch(() => {
      // При ошибке оставляем стабильную /releases/latest fallback-ссылку или
      // ранее показанное кешированное значение. Основной контент сайта не зависит
      // от доступности GitHub API.
    });
})();
`;
await fs.writeFile(path.join(wwwRoot, 'js', 'release.js'), releaseScript);

const homeContentTestPath = path.join(repositoryRoot, 'tests', 'home', 'content.spec.js');
let homeContentTest = await fs.readFile(homeContentTestPath, 'utf8');
const hardcodedReleaseTest = /\n  test\('показывает текущий latest release со ссылкой на GitHub Release',[\s\S]*?\n  \}\);\n(?=\n  test\('показывает три сценария аудитории')/;
if (!hardcodedReleaseTest.test(homeContentTest)) {
  throw new Error('Не найден старый тест hardcoded latest release');
}
homeContentTest = homeContentTest.replace(hardcodedReleaseTest, '\n');
await fs.writeFile(homeContentTestPath, homeContentTest);

const releaseTest = `import { test, expect } from '@playwright/test';

const API_URL = '${latestReleaseApi}';
const FALLBACK_URL = '${latestReleaseFallback}';
const MOCK_RELEASE_URL = '${templateRepository}/releases/tag/v9.9.9';

test.describe('Главная страница — последний релиз Harness', () => {
  test('подставляет последний опубликованный релиз из GitHub API', async ({ page }) => {
    await page.route(API_URL, (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tag_name: 'v9.9.9', html_url: MOCK_RELEASE_URL }),
    }));

    await page.goto('/');

    const release = page.locator('[data-latest-release]');
    await expect(release).toHaveText('Latest release: v9.9.9 →');
    await expect(release).toHaveAttribute('href', MOCK_RELEASE_URL);
  });

  test('оставляет стабильный fallback при недоступном GitHub API', async ({ page }) => {
    await page.route(API_URL, (route) => route.fulfill({ status: 503, body: '' }));

    await page.goto('/');

    const release = page.locator('[data-latest-release]');
    await expect(release).toHaveText('Latest release →');
    await expect(release).toHaveAttribute('href', FALLBACK_URL);
  });

  test('использует часовой кеш и не повторяет API-запрос при перезагрузке', async ({ page }) => {
    let requestCount = 0;
    await page.route(API_URL, (route) => {
      requestCount += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tag_name: 'v9.9.9', html_url: MOCK_RELEASE_URL }),
      });
    });

    await page.goto('/');
    await expect(page.locator('[data-latest-release]')).toHaveText('Latest release: v9.9.9 →');
    await page.reload();
    await expect(page.locator('[data-latest-release]')).toHaveText('Latest release: v9.9.9 →');

    expect(requestCount).toBe(1);
  });
});
`;
await fs.writeFile(path.join(repositoryRoot, 'tests', 'home', 'release.spec.js'), releaseTest);

const preconnectTest = `import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

test.describe('Resource hints для внешних подключений', () => {
  for (const publicPage of PUBLIC_PAGES) {
    test(\`страница \${publicPage.path} заранее открывает соединение с Yandex.Metrika\`, async ({ page }) => {
      await page.goto(publicPage.path);
      await expect(page.locator('link[rel="preconnect"][href="https://mc.yandex.ru"]')).toHaveCount(1);
    });
  }

  test('главная заранее открывает соединение с GitHub Releases API', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="preconnect"][href="https://api.github.com"]')).toHaveCount(1);
  });
});
`;
await fs.writeFile(path.join(repositoryRoot, 'tests', 'infrastructure', 'preconnect.spec.js'), preconnectTest);

// Временный migration-script и workflow не должны становиться частью сайта.
await fs.rm(path.join(repositoryRoot, 'scripts', 'apply-dynamic-release.mjs'));
await fs.rm(path.join(repositoryRoot, '.github', 'workflows', 'apply-dynamic-release.yml'));
