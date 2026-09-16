import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

const EXPECTED_PATHS = PUBLIC_PAGES.map((publicPage) => publicPage.path).sort();
const SEARCH_MODULE_URL = '/js/search.js';

async function loadSearchModule(page) {
  await page.goto('/');
  return page.evaluate(async (moduleUrl) => {
    const searchModule = await import(moduleUrl);
    return Boolean(
      searchModule.buildSearchIndex
      && searchModule.getPublicPaths
      && searchModule.getSearchIndex
      && searchModule.SEARCH_INDEX_STORAGE_KEY
    );
  }, SEARCH_MODULE_URL);
}

test.describe('Поиск — поисковый индекс', () => {
  test('модуль поиска экспортирует функции построения и кэширования индекса', async ({ page }) => {
    expect(await loadSearchModule(page)).toBeTruthy();
  });

  test('получает список публичных страниц из sitemap.xml', async ({ page }) => {
    await page.goto('/');
    const paths = await page.evaluate(async (moduleUrl) => {
      const { getPublicPaths } = await import(moduleUrl);
      return (await getPublicPaths()).sort();
    }, SEARCH_MODULE_URL);

    expect(paths).toEqual(EXPECTED_PATHS);
  });

  test('группирует индекс по путям публичных страниц', async ({ page }) => {
    await page.goto('/');
    const paths = await page.evaluate(async (moduleUrl) => {
      const { buildSearchIndex } = await import(moduleUrl);
      return Object.keys(await buildSearchIndex()).sort();
    }, SEARCH_MODULE_URL);

    expect(paths).toEqual(EXPECTED_PATHS);
  });

  test('метаданные страницы хранятся один раз, а записи не дублируют path href и pageTitle', async ({ page }) => {
    await page.goto('/');
    const structure = await page.evaluate(async (moduleUrl) => {
      const { buildSearchIndex } = await import(moduleUrl);
      const index = await buildSearchIndex();
      const indexedPage = index['/commands/'];
      const entry = indexedPage.entries[0];
      return {
        pageKeys: Object.keys(indexedPage).sort(),
        entryKeys: Object.keys(entry).sort(),
        hasNormalized: Object.keys(entry).some((key) => key.startsWith('normalized')),
      };
    }, SEARCH_MODULE_URL);

    expect(structure.pageKeys).toEqual(['entries', 'text', 'title']);
    expect(structure.entryKeys).toEqual(['fragment', 'kind', 'text', 'title']);
    expect(structure.hasNormalized).toBeFalsy();
  });

  test('индексирует секции с якорями внутри соответствующих страниц', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async (moduleUrl) => {
      const { buildSearchIndex } = await import(moduleUrl);
      const index = await buildSearchIndex();
      const sections = Object.values(index)
        .flatMap((indexedPage) => indexedPage.entries.filter((entry) => entry.kind === 'section'));
      return {
        count: sections.length,
        hasFragments: sections.some((entry) => entry.fragment.length > 0),
      };
    }, SEARCH_MODULE_URL);

    expect(result.count).toBeGreaterThan(10);
    expect(result.hasFragments).toBeTruthy();
  });

  test('индексирует команды отдельно от обычных разделов', async ({ page }) => {
    await page.goto('/');
    const commands = await page.evaluate(async (moduleUrl) => {
      const { buildSearchIndex } = await import(moduleUrl);
      return (await buildSearchIndex())['/commands/'].entries
        .filter((entry) => entry.kind === 'command')
        .map((entry) => entry.title);
    }, SEARCH_MODULE_URL);

    expect(commands).toContain('INIT PROJECT');
    expect(commands.some((command) => command.startsWith('ADD STEP'))).toBeTruthy();
    expect(commands).toContain('UPDATE HARNESS');
  });

  test('не хранит нормализованные копии текста в индексе', async ({ page }) => {
    await page.goto('/');
    const hasNormalizedFields = await page.evaluate(async (moduleUrl) => {
      const { buildSearchIndex } = await import(moduleUrl);
      const index = await buildSearchIndex();
      return Object.values(index).some((indexedPage) => (
        Object.keys(indexedPage).some((key) => key.startsWith('normalized'))
        || indexedPage.entries.some((entry) => Object.keys(entry).some((key) => key.startsWith('normalized')))
      ));
    }, SEARCH_MODULE_URL);

    expect(hasNormalizedFields).toBeFalsy();
  });

  test('компактная структура меньше эквивалентного развёрнутого индекса', async ({ page }) => {
    await page.goto('/');
    const sizes = await page.evaluate(async (moduleUrl) => {
      const { buildSearchIndex, normalizeSearchText } = await import(moduleUrl);
      const index = await buildSearchIndex();
      const expanded = [];

      for (const [path, indexedPage] of Object.entries(index)) {
        const entries = [
          { fragment: '', title: indexedPage.title, text: indexedPage.text, kind: 'page' },
          ...indexedPage.entries,
        ];

        for (const entry of entries) {
          expanded.push({
            path,
            href: entry.fragment ? `${path}#${entry.fragment}` : path,
            pageTitle: indexedPage.title,
            title: entry.title,
            text: entry.text,
            kind: entry.kind,
            keywords: entry.keywords || '',
            normalizedTitle: normalizeSearchText(entry.title),
            normalizedPageTitle: normalizeSearchText(indexedPage.title),
            normalizedText: normalizeSearchText(entry.text),
            normalizedKeywords: normalizeSearchText(entry.keywords || ''),
          });
        }
      }

      return {
        compact: JSON.stringify(index).length,
        expanded: JSON.stringify(expanded).length,
      };
    }, SEARCH_MODULE_URL);

    expect(sizes.compact).toBeLessThan(sizes.expanded);
  });

  test('не индексирует содержимое шапки и подвала как текст результата', async ({ page }) => {
    await page.goto('/');
    const hasFooterDomain = await page.evaluate(async (moduleUrl) => {
      const { buildSearchIndex } = await import(moduleUrl);
      const index = await buildSearchIndex();
      return Object.values(index).some((indexedPage) => (
        indexedPage.text.includes('ai-development-harness.ru')
        || indexedPage.entries.some((entry) => entry.text.includes('ai-development-harness.ru'))
      ));
    }, SEARCH_MODULE_URL);

    expect(hasFooterDomain).toBeFalsy();
  });

  test('при недоступном sitemap использует безопасный список публичных страниц', async ({ page }) => {
    await page.route('**/sitemap.xml', (route) => route.fulfill({ status: 503, body: 'unavailable' }));
    await page.goto('/');

    const paths = await page.evaluate(async (moduleUrl) => {
      const { getPublicPaths } = await import(moduleUrl);
      return (await getPublicPaths()).sort();
    }, SEARCH_MODULE_URL);

    expect(paths).toEqual(EXPECTED_PATHS);
  });

  test('пропускает недоступную страницу и строит индекс из остальных', async ({ page }) => {
    const unavailablePath = '/faq/';
    await page.route(`**${unavailablePath}`, (route) => {
      if (route.request().resourceType() === 'fetch') {
        return route.fulfill({ status: 503, body: 'unavailable' });
      }
      return route.continue();
    });
    await page.goto('/');

    const paths = await page.evaluate(async (moduleUrl) => {
      const { buildSearchIndex } = await import(moduleUrl);
      return Object.keys(await buildSearchIndex()).sort();
    }, SEARCH_MODULE_URL);

    expect(paths).not.toContain(unavailablePath);
    expect(paths).toEqual(EXPECTED_PATHS.filter((path) => path !== unavailablePath));
  });

  test('при первом открытии сохраняет построенный индекс в sessionStorage вместе с revision', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => sessionStorage.clear());

    const button = page.getByRole('button', { name: 'Открыть поиск по сайту' });
    await button.click();
    await expect(page.locator('.search-input')).toBeEnabled();

    const cacheState = await page.evaluate(async (moduleUrl) => {
      const { SEARCH_INDEX_STORAGE_KEY } = await import(moduleUrl);
      const value = sessionStorage.getItem(SEARCH_INDEX_STORAGE_KEY);
      const searchScript = document.querySelector('script[type="module"][src*="/js/search.js?v="]');
      return {
        cache: value ? JSON.parse(value) : null,
        currentRevision: searchScript
          ? new URL(searchScript.src).searchParams.get('v') || ''
          : '',
      };
    }, SEARCH_MODULE_URL);

    expect(cacheState.cache).not.toBeNull();
    expect(cacheState.cache.revision).toBe(cacheState.currentRevision);
    expect(Object.keys(cacheState.cache.index).sort()).toEqual(EXPECTED_PATHS);
  });

  test('игнорирует структурно валидный кэш от старого revision и перестраивает индекс', async ({ page }) => {
    const pageRequests = [];
    page.on('request', (request) => {
      if (request.resourceType() !== 'fetch') return;
      const url = new URL(request.url());
      if (EXPECTED_PATHS.includes(url.pathname)) pageRequests.push(url.pathname);
    });

    await page.goto('/');
    const revisions = await page.evaluate(async (moduleUrl) => {
      const { SEARCH_INDEX_STORAGE_KEY } = await import(moduleUrl);
      const searchScript = document.querySelector('script[type="module"][src*="/js/search.js?v="]');
      const currentRevision = searchScript
        ? new URL(searchScript.src).searchParams.get('v') || ''
        : '';
      const previousRevision = `${currentRevision}-previous`;

      sessionStorage.setItem(SEARCH_INDEX_STORAGE_KEY, JSON.stringify({
        revision: previousRevision,
        index: {
          '/stale/': {
            title: 'Устаревшая страница',
            text: 'Структурно валидный индекс предыдущего deploy.',
            entries: [],
          },
        },
      }));

      return { currentRevision, previousRevision };
    }, SEARCH_MODULE_URL);

    expect(revisions.previousRevision).not.toBe(revisions.currentRevision);

    await page.getByRole('button', { name: 'Открыть поиск по сайту' }).click();
    await expect(page.locator('.search-input')).toBeEnabled();

    expect(pageRequests.length).toBeGreaterThanOrEqual(PUBLIC_PAGES.length);

    const cache = await page.evaluate(async (moduleUrl) => {
      const { SEARCH_INDEX_STORAGE_KEY } = await import(moduleUrl);
      return JSON.parse(sessionStorage.getItem(SEARCH_INDEX_STORAGE_KEY));
    }, SEARCH_MODULE_URL);

    expect(cache.revision).toBe(revisions.currentRevision);
    expect(Object.keys(cache.index).sort()).toEqual(EXPECTED_PATHS);
    expect(cache.index['/stale/']).toBeUndefined();
  });

  test('после перехода на другую страницу использует индекс из sessionStorage без повторной загрузки HTML', async ({ page }) => {
    const pageRequests = [];
    page.on('request', (request) => {
      if (request.resourceType() !== 'fetch') return;
      const url = new URL(request.url());
      if (EXPECTED_PATHS.includes(url.pathname)) pageRequests.push(url.pathname);
    });

    await page.goto('/');
    await page.evaluate(() => sessionStorage.clear());
    await page.getByRole('button', { name: 'Открыть поиск по сайту' }).click();
    await expect(page.locator('.search-input')).toBeEnabled();
    const requestCountAfterBuild = pageRequests.length;

    expect(requestCountAfterBuild).toBeGreaterThanOrEqual(PUBLIC_PAGES.length);

    await page.goto('/commands/');
    await page.getByRole('button', { name: 'Открыть поиск по сайту' }).click();
    await expect(page.locator('.search-input')).toBeEnabled();

    expect(pageRequests.length).toBe(requestCountAfterBuild);
  });

  test('повреждённый индекс в sessionStorage игнорируется и строится заново', async ({ page }) => {
    const pageRequests = [];
    page.on('request', (request) => {
      if (request.resourceType() !== 'fetch') return;
      const url = new URL(request.url());
      if (EXPECTED_PATHS.includes(url.pathname)) pageRequests.push(url.pathname);
    });

    await page.goto('/');
    await page.evaluate(async (moduleUrl) => {
      const { SEARCH_INDEX_STORAGE_KEY } = await import(moduleUrl);
      sessionStorage.setItem(SEARCH_INDEX_STORAGE_KEY, '{broken json');
    }, SEARCH_MODULE_URL);

    await page.getByRole('button', { name: 'Открыть поиск по сайту' }).click();
    await expect(page.locator('.search-input')).toBeEnabled();

    expect(pageRequests.length).toBeGreaterThanOrEqual(PUBLIC_PAGES.length);

    const cacheIsValid = await page.evaluate(async (moduleUrl) => {
      const { SEARCH_INDEX_STORAGE_KEY } = await import(moduleUrl);
      try {
        const cache = JSON.parse(sessionStorage.getItem(SEARCH_INDEX_STORAGE_KEY));
        return Boolean(cache?.revision && cache?.index && Object.keys(cache.index).length);
      } catch {
        return false;
      }
    }, SEARCH_MODULE_URL);

    expect(cacheIsValid).toBeTruthy();
  });
});
