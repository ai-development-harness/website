import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

const ожидаемыеПути = PUBLIC_PAGES.map((страница) => страница.path).sort();

async function загрузитьМодуль(page) {
  await page.goto('/');
  return page.evaluate(async () => {
    const модуль = await import('/search.js');
    return Boolean(
      модуль.buildSearchIndex
      && модуль.getPublicPaths
      && модуль.getSearchIndex
      && модуль.SEARCH_INDEX_STORAGE_KEY
    );
  });
}

test.describe('Поиск — поисковый индекс', () => {
  test('модуль поиска экспортирует функции построения и кэширования индекса', async ({ page }) => {
    expect(await загрузитьМодуль(page)).toBeTruthy();
  });

  test('получает список публичных страниц из sitemap.xml', async ({ page }) => {
    await page.goto('/');
    const пути = await page.evaluate(async () => {
      const { getPublicPaths } = await import('/search.js');
      return (await getPublicPaths()).sort();
    });

    expect(пути).toEqual(ожидаемыеПути);
  });

  test('группирует индекс по путям публичных страниц', async ({ page }) => {
    await page.goto('/');
    const пути = await page.evaluate(async () => {
      const { buildSearchIndex } = await import('/search.js');
      return Object.keys(await buildSearchIndex()).sort();
    });

    expect(пути).toEqual(ожидаемыеПути);
  });

  test('метаданные страницы хранятся один раз, а записи не дублируют path href и pageTitle', async ({ page }) => {
    await page.goto('/');
    const структура = await page.evaluate(async () => {
      const { buildSearchIndex } = await import('/search.js');
      const индекс = await buildSearchIndex();
      const страница = индекс['/commands/'];
      const запись = страница.entries[0];
      return {
        pageKeys: Object.keys(страница).sort(),
        entryKeys: Object.keys(запись).sort(),
        hasNormalized: Object.keys(запись).some((ключ) => ключ.startsWith('normalized')),
      };
    });

    expect(структура.pageKeys).toEqual(['entries', 'text', 'title']);
    expect(структура.entryKeys).toEqual(['fragment', 'kind', 'text', 'title']);
    expect(структура.hasNormalized).toBeFalsy();
  });

  test('индексирует секции с якорями внутри соответствующих страниц', async ({ page }) => {
    await page.goto('/');
    const результат = await page.evaluate(async () => {
      const { buildSearchIndex } = await import('/search.js');
      const индекс = await buildSearchIndex();
      const секции = Object.values(индекс).flatMap((страница) => страница.entries.filter((элемент) => элемент.kind === 'section'));
      return {
        count: секции.length,
        hasFragments: секции.some((элемент) => элемент.fragment.length > 0),
      };
    });

    expect(результат.count).toBeGreaterThan(10);
    expect(результат.hasFragments).toBeTruthy();
  });

  test('индексирует команды отдельно от обычных разделов', async ({ page }) => {
    await page.goto('/');
    const команды = await page.evaluate(async () => {
      const { buildSearchIndex } = await import('/search.js');
      return (await buildSearchIndex())['/commands/'].entries
        .filter((элемент) => элемент.kind === 'command')
        .map((элемент) => элемент.title);
    });

    expect(команды).toContain('INIT PROJECT');
    expect(команды.some((команда) => команда.startsWith('ADD STEP'))).toBeTruthy();
    expect(команды).toContain('UPDATE HARNESS');
  });

  test('не хранит нормализованные копии текста в индексе', async ({ page }) => {
    await page.goto('/');
    const содержитНормализованныеПоля = await page.evaluate(async () => {
      const { buildSearchIndex } = await import('/search.js');
      const индекс = await buildSearchIndex();
      return Object.values(индекс).some((страница) => (
        Object.keys(страница).some((ключ) => ключ.startsWith('normalized'))
        || страница.entries.some((элемент) => Object.keys(элемент).some((ключ) => ключ.startsWith('normalized')))
      ));
    });

    expect(содержитНормализованныеПоля).toBeFalsy();
  });

  test('компактная структура меньше эквивалентного развёрнутого индекса', async ({ page }) => {
    await page.goto('/');
    const размеры = await page.evaluate(async () => {
      const { buildSearchIndex, normalizeSearchText } = await import('/search.js');
      const индекс = await buildSearchIndex();
      const развёрнутый = [];

      for (const [path, страница] of Object.entries(индекс)) {
        const записи = [
          { fragment: '', title: страница.title, text: страница.text, kind: 'page' },
          ...страница.entries,
        ];

        for (const запись of записи) {
          развёрнутый.push({
            path,
            href: запись.fragment ? `${path}#${запись.fragment}` : path,
            pageTitle: страница.title,
            title: запись.title,
            text: запись.text,
            kind: запись.kind,
            keywords: запись.keywords || '',
            normalizedTitle: normalizeSearchText(запись.title),
            normalizedPageTitle: normalizeSearchText(страница.title),
            normalizedText: normalizeSearchText(запись.text),
            normalizedKeywords: normalizeSearchText(запись.keywords || ''),
          });
        }
      }

      return {
        compact: JSON.stringify(индекс).length,
        expanded: JSON.stringify(развёрнутый).length,
      };
    });

    expect(размеры.compact).toBeLessThan(размеры.expanded);
  });

  test('не индексирует содержимое шапки и подвала как текст результата', async ({ page }) => {
    await page.goto('/');
    const содержитДоменПодвала = await page.evaluate(async () => {
      const { buildSearchIndex } = await import('/search.js');
      const индекс = await buildSearchIndex();
      return Object.values(индекс).some((страница) => (
        страница.text.includes('ai-development-harness.ru')
        || страница.entries.some((элемент) => элемент.text.includes('ai-development-harness.ru'))
      ));
    });

    expect(содержитДоменПодвала).toBeFalsy();
  });

  test('при недоступном sitemap использует безопасный список публичных страниц', async ({ page }) => {
    await page.route('**/sitemap.xml', (route) => route.fulfill({ status: 503, body: 'unavailable' }));
    await page.goto('/');

    const пути = await page.evaluate(async () => {
      const { getPublicPaths } = await import('/search.js');
      return (await getPublicPaths()).sort();
    });

    expect(пути).toEqual(ожидаемыеПути);
  });

  test('при первом открытии сохраняет построенный индекс в sessionStorage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => sessionStorage.clear());

    const кнопка = page.getByRole('button', { name: 'Открыть поиск по сайту' });
    await кнопка.click();
    await expect(page.locator('.search-input')).toBeEnabled();

    const кэш = await page.evaluate(async () => {
      const { SEARCH_INDEX_STORAGE_KEY } = await import('/search.js');
      const значение = sessionStorage.getItem(SEARCH_INDEX_STORAGE_KEY);
      return значение ? JSON.parse(значение) : null;
    });

    expect(кэш).not.toBeNull();
    expect(Object.keys(кэш).sort()).toEqual(ожидаемыеПути);
  });

  test('после перехода на другую страницу использует индекс из sessionStorage без повторной загрузки HTML', async ({ page }) => {
    const запросыСтраниц = [];
    page.on('request', (request) => {
      if (request.resourceType() !== 'fetch') return;
      const url = new URL(request.url());
      if (ожидаемыеПути.includes(url.pathname)) запросыСтраниц.push(url.pathname);
    });

    await page.goto('/');
    await page.evaluate(() => sessionStorage.clear());
    await page.getByRole('button', { name: 'Открыть поиск по сайту' }).click();
    await expect(page.locator('.search-input')).toBeEnabled();
    const послеПостроения = запросыСтраниц.length;

    expect(послеПостроения).toBeGreaterThanOrEqual(PUBLIC_PAGES.length);

    await page.goto('/commands/');
    await page.getByRole('button', { name: 'Открыть поиск по сайту' }).click();
    await expect(page.locator('.search-input')).toBeEnabled();

    expect(запросыСтраниц.length).toBe(послеПостроения);
  });

  test('повреждённый индекс в sessionStorage игнорируется и строится заново', async ({ page }) => {
    const запросыСтраниц = [];
    page.on('request', (request) => {
      if (request.resourceType() !== 'fetch') return;
      const url = new URL(request.url());
      if (ожидаемыеПути.includes(url.pathname)) запросыСтраниц.push(url.pathname);
    });

    await page.goto('/');
    await page.evaluate(async () => {
      const { SEARCH_INDEX_STORAGE_KEY } = await import('/search.js');
      sessionStorage.setItem(SEARCH_INDEX_STORAGE_KEY, '{сломанный json');
    });

    await page.getByRole('button', { name: 'Открыть поиск по сайту' }).click();
    await expect(page.locator('.search-input')).toBeEnabled();

    expect(запросыСтраниц.length).toBeGreaterThanOrEqual(PUBLIC_PAGES.length);

    const кэшВалиден = await page.evaluate(async () => {
      const { SEARCH_INDEX_STORAGE_KEY } = await import('/search.js');
      try {
        return Boolean(JSON.parse(sessionStorage.getItem(SEARCH_INDEX_STORAGE_KEY)));
      } catch {
        return false;
      }
    });
    expect(кэшВалиден).toBeTruthy();
  });
});
