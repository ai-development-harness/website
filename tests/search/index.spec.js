import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

const ожидаемыеПути = PUBLIC_PAGES.map((страница) => страница.path).sort();

async function загрузитьМодуль(page) {
  await page.goto('/');
  return page.evaluate(async () => {
    const модуль = await import('/search.js');
    return Boolean(модуль.buildSearchIndex && модуль.getPublicPaths);
  });
}

test.describe('Поиск — поисковый индекс', () => {
  test('модуль поиска экспортирует функции построения индекса', async ({ page }) => {
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

  test('индекс содержит каждую публичную страницу', async ({ page }) => {
    await page.goto('/');
    const пути = await page.evaluate(async () => {
      const { buildSearchIndex } = await import('/search.js');
      const индекс = await buildSearchIndex();
      return [...new Set(индекс.map((элемент) => элемент.path))].sort();
    });

    expect(пути).toEqual(ожидаемыеПути);
  });

  test('для каждой публичной страницы создаёт отдельную запись страницы', async ({ page }) => {
    await page.goto('/');
    const страницы = await page.evaluate(async () => {
      const { buildSearchIndex } = await import('/search.js');
      return (await buildSearchIndex())
        .filter((элемент) => элемент.kind === 'page')
        .map((элемент) => элемент.path)
        .sort();
    });

    expect(страницы).toEqual(ожидаемыеПути);
  });

  test('индексирует секции с якорями', async ({ page }) => {
    await page.goto('/');
    const секции = await page.evaluate(async () => {
      const { buildSearchIndex } = await import('/search.js');
      return (await buildSearchIndex()).filter((элемент) => элемент.kind === 'section');
    });

    expect(секции.length).toBeGreaterThan(10);
    expect(секции.some((элемент) => элемент.href.includes('#'))).toBeTruthy();
  });

  test('индексирует команды отдельно от обычных разделов', async ({ page }) => {
    await page.goto('/');
    const команды = await page.evaluate(async () => {
      const { buildSearchIndex } = await import('/search.js');
      return (await buildSearchIndex())
        .filter((элемент) => элемент.kind === 'command')
        .map((элемент) => элемент.title);
    });

    expect(команды).toContain('INIT PROJECT');
    expect(команды.some((команда) => команда.startsWith('ADD STEP'))).toBeTruthy();
    expect(команды).toContain('UPDATE HARNESS');
  });

  test('не индексирует содержимое шапки и подвала как текст результата', async ({ page }) => {
    await page.goto('/');
    const содержитДоменПодвала = await page.evaluate(async () => {
      const { buildSearchIndex } = await import('/search.js');
      return (await buildSearchIndex()).some((элемент) => элемент.text.includes('ai-development-harness.ru'));
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

  test('повторное открытие поиска не загружает HTML-страницы заново', async ({ page }) => {
    const запросыСтраниц = [];
    page.on('request', (request) => {
      if (request.resourceType() !== 'fetch') return;
      const url = new URL(request.url());
      if (ожидаемыеПути.includes(url.pathname)) запросыСтраниц.push(url.pathname);
    });

    await page.goto('/');
    const кнопка = page.getByRole('button', { name: 'Открыть поиск по сайту' });
    await кнопка.click();
    await expect(page.locator('.search-input')).toBeEnabled();
    const послеПервогоОткрытия = запросыСтраниц.length;

    await page.keyboard.press('Escape');
    await кнопка.click();
    await expect(page.locator('.search-input')).toBeEnabled();

    expect(послеПервогоОткрытия).toBeGreaterThanOrEqual(PUBLIC_PAGES.length);
    expect(запросыСтраниц.length).toBe(послеПервогоОткрытия);
  });
});
