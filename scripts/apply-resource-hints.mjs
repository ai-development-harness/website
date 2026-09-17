import { promises as fs } from 'node:fs';
import path from 'node:path';

const repositoryRoot = process.cwd();
const wwwRoot = path.join(repositoryRoot, 'www');

// Последовательность соответствует основному пути чтения документации. Prefetch
// добавляем только там, где следующая страница достаточно предсказуема. FAQ —
// конечная точка цепочки, поэтому там намеренно нет speculative navigation.
const nextPageByFile = new Map([
  ['index.html', '/getting-started/'],
  ['getting-started/index.html', '/workflow/'],
  ['workflow/index.html', '/commands/'],
  ['commands/index.html', '/architecture/'],
  ['architecture/index.html', '/runtimes/'],
  ['runtimes/index.html', '/repository/'],
  ['repository/index.html', '/maintenance/'],
  ['maintenance/index.html', '/faq/'],
]);

const harnessCommandPattern = /^(?:INIT PROJECT|ADD STEP|PLAN STEP|NEXT STEP|STATUS PROJECT|IMPLEMENT STEP|REVIEW STEP|FIX STEP|RUN STEP|AUDIT STEP|RECONCILE PROJECT|RELEASE CHECK|QUICK FIX|FIND SKILL|INSTALL SKILL|CREATE SKILL|GENERATE GITHUB TEMPLATES|CHECK HARNESS UPDATE|UPDATE HARNESS|GIT CHECK|COMMIT|PUSH|PR|SYNC)(?:\b|:|\s|$)/i;
const shellCommandPattern = /^(?:cd|cp|mv|rm|mkdir|touch|cat|chmod|export|git|yarn|npm|npx|node|python|python3|docker|curl|wget)\b/i;

function decodeHtml(text) {
  return text
    .replace(/<[^>]*>/g, '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&nbsp;', ' ');
}

// Повторяем критерий main.js достаточно близко, чтобы preload copy.css появлялся
// только там, где этот stylesheet действительно будет применён после запуска JS.
function needsCopyStyles(source) {
  if (source.includes('class="command-item"')) return true;

  const codeBlocks = source.matchAll(/<div class="code-block"[^>]*>[\s\S]*?<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>[\s\S]*?<\/div>/g);
  for (const match of codeBlocks) {
    const lines = decodeHtml(match[1])
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    if (lines.some((line) => harnessCommandPattern.test(line) || shellCommandPattern.test(line))) {
      return true;
    }
  }

  return false;
}

async function collectHtmlFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtmlFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(entryPath);
  }

  return files;
}

const htmlFiles = await collectHtmlFiles(wwwRoot);
for (const htmlPath of htmlFiles) {
  let source = await fs.readFile(htmlPath, 'utf8');
  const relativePath = path.relative(wwwRoot, htmlPath).replaceAll(path.sep, '/');

  const revisionMatch = source.match(/\/js\/theme-init\.js\?v=([a-zA-Z0-9_-]+)/);
  if (!revisionMatch) throw new Error(`Не найден revision в ${relativePath}`);
  const revision = revisionMatch[1];

  const hints = [];
  if (needsCopyStyles(source)) {
    hints.push(`<link rel="preload" href="/css/copy.css?v=${revision}" as="style">`);
  }

  const nextPage = nextPageByFile.get(relativePath);
  if (nextPage) {
    hints.push(`<link rel="prefetch" href="${nextPage}" as="document">`);
  }

  if (hints.length) {
    const anchor = source.includes('<link rel="preconnect" href="https://api.github.com" crossorigin>')
      ? '<link rel="preconnect" href="https://api.github.com" crossorigin>'
      : '<link rel="preconnect" href="https://mc.yandex.ru">';

    for (const hint of hints) {
      if (!source.includes(hint)) source = source.replace(anchor, `${anchor}\n${hint}`);
    }
  }

  await fs.writeFile(htmlPath, source);
}

const resourceHintsTestPath = path.join(repositoryRoot, 'tests', 'infrastructure', 'preconnect.spec.js');
const resourceHintsTest = `import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

const NEXT_PAGE = new Map([
  ['/', '/getting-started/'],
  ['/getting-started/', '/workflow/'],
  ['/workflow/', '/commands/'],
  ['/commands/', '/architecture/'],
  ['/architecture/', '/runtimes/'],
  ['/runtimes/', '/repository/'],
  ['/repository/', '/maintenance/'],
  ['/maintenance/', '/faq/'],
]);

test.describe('Resource hints для загрузки и следующей навигации', () => {
  for (const publicPage of PUBLIC_PAGES) {
    test(\`страница \${publicPage.path} оптимизирует только действительно нужные ресурсы\`, async ({ page }) => {
      await page.goto(publicPage.path);

      // Yandex.Metrika — единственный внешний script-origin на каждой странице.
      await expect(page.locator('link[rel="preconnect"][href="https://mc.yandex.ru"]')).toHaveCount(1);

      // copy.css браузер иначе узнаёт только после выполнения main.js. Preload
      // должен быть ровно на тех страницах, где main.js реально создаёт Copy UI.
      const copyButtonCount = await page.locator('.copy-button').count();
      const copyStylesPreload = page.locator('link[rel="preload"][as="style"][href^="/css/copy.css?v="]');
      await expect(copyStylesPreload).toHaveCount(copyButtonCount > 0 ? 1 : 0);

      // Предзагружаем только один наиболее вероятный следующий документ, чтобы
      // не расходовать трафик на все ссылки страницы.
      const nextPage = NEXT_PAGE.get(publicPage.path);
      const documentPrefetch = page.locator('link[rel="prefetch"][as="document"]');
      if (nextPage) {
        await expect(documentPrefetch).toHaveCount(1);
        await expect(documentPrefetch).toHaveAttribute('href', nextPage);
      } else {
        await expect(documentPrefetch).toHaveCount(0);
      }
    });
  }

  test('главная заранее открывает соединение с GitHub Releases API', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="preconnect"][href="https://api.github.com"]')).toHaveCount(1);
  });
});
`;
await fs.writeFile(resourceHintsTestPath, resourceHintsTest);

// Временные файлы нужны только для безопасного пакетного изменения через GitHub
// Actions и не должны оставаться в итоговом PR.
await fs.rm(path.join(repositoryRoot, 'scripts', 'apply-resource-hints.mjs'));
await fs.rm(path.join(repositoryRoot, '.github', 'workflows', 'apply-resource-hints.yml'));
