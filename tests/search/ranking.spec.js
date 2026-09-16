import { test, expect } from '@playwright/test';

test.describe('Поиск — нормализация и ранжирование', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('нормализует регистр, лишние пробелы и букву ё', async ({ page }) => {
    const результат = await page.evaluate(async () => {
      const { normalizeSearchText } = await import('/search.js');
      return normalizeSearchText('  ЁЛКА   ADD   STEP  ');
    });

    expect(результат).toBe('елка add step');
  });

  test('точное совпадение заголовка получает более высокий вес', async ({ page }) => {
    const результат = await page.evaluate(async () => {
      const { scoreSearchItem } = await import('/search.js');
      const base = {
        pageTitle: 'Команды Harness',
        keywords: '',
        text: 'ADD STEP создаёт новую задачу',
        kind: 'section',
      };
      return {
        точное: scoreSearchItem({ ...base, title: 'ADD STEP' }, 'ADD STEP'),
        толькоТекст: scoreSearchItem({ ...base, title: 'Инициализация' }, 'ADD STEP'),
      };
    });

    expect(результат.точное).toBeGreaterThan(результат.толькоТекст);
  });

  test('отдельная запись команды получает приоритет перед обычным разделом', async ({ page }) => {
    const порядок = await page.evaluate(async () => {
      const { rankSearchResults } = await import('/search.js');
      const индекс = {
        '/commands/': {
          title: 'Команды Harness',
          text: 'Справочник команд',
          entries: [
            {
              fragment: 'bootstrap',
              kind: 'section',
              title: 'Инициализация',
              text: 'ADD STEP создаёт задачу',
            },
            {
              fragment: 'bootstrap',
              kind: 'command',
              title: 'ADD STEP',
              text: 'ADD STEP создаёт задачу',
            },
          ],
        },
      };

      return rankSearchResults(индекс, 'ADD STEP').map((result) => result.kind);
    });

    expect(порядок[0]).toBe('command');
  });

  test('результат отбрасывается если не содержит все значимые слова запроса', async ({ page }) => {
    const количество = await page.evaluate(async () => {
      const { rankSearchResults } = await import('/search.js');
      return rankSearchResults({
        '/maintenance/': {
          title: 'Поддержка',
          text: '',
          entries: [{
            fragment: 'updates',
            kind: 'section',
            title: 'Обновление',
            text: 'UPDATE HARNESS',
          }],
        },
      }, 'UPDATE HARNESS конфликт').length;
    });

    expect(количество).toBe(0);
  });

  test('ранжирование соблюдает заданный лимит выдачи', async ({ page }) => {
    const количество = await page.evaluate(async () => {
      const { rankSearchResults } = await import('/search.js');
      const индекс = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [
        `/page-${index}/`,
        {
          title: `Проект ${index}`,
          text: 'проект',
          entries: [],
        },
      ]));
      return rankSearchResults(индекс, 'проект', 5).length;
    });

    expect(количество).toBe(5);
  });

  test('href результата собирается из пути страницы и fragment только при выдаче', async ({ page }) => {
    const href = await page.evaluate(async () => {
      const { rankSearchResults } = await import('/search.js');
      const индекс = {
        '/commands/': {
          title: 'Команды Harness',
          text: '',
          entries: [{
            fragment: 'execution',
            kind: 'command',
            title: 'RUN STEP-NNN',
            text: 'Оркестрирует выполнение шага',
          }],
        },
      };

      return rankSearchResults(индекс, 'RUN STEP-NNN')[0].href;
    });

    expect(href).toBe('/commands/#execution');
  });
});
