import { test, expect } from '@playwright/test';

const SEARCH_MODULE_URL = '/js/search.js';

test.describe('Поиск — нормализация и ранжирование', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('нормализует регистр, лишние пробелы и букву ё', async ({ page }) => {
    const result = await page.evaluate(async (moduleUrl) => {
      const { normalizeSearchText } = await import(moduleUrl);
      return normalizeSearchText('  ЁЛКА   ADD   STEP  ');
    }, SEARCH_MODULE_URL);

    expect(result).toBe('елка add step');
  });

  test('точное совпадение заголовка получает более высокий вес', async ({ page }) => {
    const result = await page.evaluate(async (moduleUrl) => {
      const { scoreSearchItem } = await import(moduleUrl);
      const base = {
        pageTitle: 'Команды Harness',
        keywords: '',
        text: 'STEP ADD создаёт новую задачу',
        kind: 'section',
      };
      return {
        exact: scoreSearchItem({ ...base, title: 'STEP ADD' }, 'STEP ADD'),
        textOnly: scoreSearchItem({ ...base, title: 'Инициализация' }, 'STEP ADD'),
      };
    }, SEARCH_MODULE_URL);

    expect(result.exact).toBeGreaterThan(result.textOnly);
  });

  test('отдельная запись команды получает приоритет перед обычным разделом', async ({ page }) => {
    const order = await page.evaluate(async (moduleUrl) => {
      const { rankSearchResults } = await import(moduleUrl);
      const index = {
        '/commands/': {
          title: 'Команды Harness',
          text: 'Справочник команд',
          entries: [
            {
              fragment: 'bootstrap',
              kind: 'section',
              title: 'Инициализация',
              text: 'STEP ADD создаёт задачу',
            },
            {
              fragment: 'bootstrap',
              kind: 'command',
              title: 'STEP ADD',
              text: 'STEP ADD создаёт задачу',
            },
          ],
        },
      };

      return rankSearchResults(index, 'STEP ADD').map((searchResult) => searchResult.kind);
    }, SEARCH_MODULE_URL);

    expect(order[0]).toBe('command');
  });

  test('результат отбрасывается если не содержит все значимые слова запроса', async ({ page }) => {
    const count = await page.evaluate(async (moduleUrl) => {
      const { rankSearchResults } = await import(moduleUrl);
      return rankSearchResults({
        '/maintenance/': {
          title: 'Поддержка',
          text: '',
          entries: [{
            fragment: 'updates',
            kind: 'section',
            title: 'Обновление',
            text: 'HARNESS UPDATE',
          }],
        },
      }, 'HARNESS UPDATE конфликт').length;
    }, SEARCH_MODULE_URL);

    expect(count).toBe(0);
  });

  test('ранжирование соблюдает заданный лимит выдачи', async ({ page }) => {
    const count = await page.evaluate(async (moduleUrl) => {
      const { rankSearchResults } = await import(moduleUrl);
      const index = Object.fromEntries(Array.from({ length: 20 }, (_, itemIndex) => [
        `/page-${itemIndex}/`,
        {
          title: `Проект ${itemIndex}`,
          text: 'проект',
          entries: [],
        },
      ]));
      return rankSearchResults(index, 'проект', 5).length;
    }, SEARCH_MODULE_URL);

    expect(count).toBe(5);
  });

  test('href результата собирается из пути страницы и fragment только при выдаче', async ({ page }) => {
    const href = await page.evaluate(async (moduleUrl) => {
      const { rankSearchResults } = await import(moduleUrl);
      const index = {
        '/commands/': {
          title: 'Команды Harness',
          text: '',
          entries: [{
            fragment: 'execution',
            kind: 'command',
            title: 'STEP RUN STEP-NNN',
            text: 'Оркестрирует выполнение шага',
          }],
        },
      };

      return rankSearchResults(index, 'STEP RUN STEP-NNN')[0].href;
    }, SEARCH_MODULE_URL);

    expect(href).toBe('/commands/#execution');
  });
});
