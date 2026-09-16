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
        normalizedPageTitle: 'команды harness',
        normalizedKeywords: '',
        normalizedText: 'add step создаёт новую задачу',
        kind: 'section',
      };
      return {
        точное: scoreSearchItem({ ...base, normalizedTitle: 'add step' }, 'ADD STEP'),
        толькоТекст: scoreSearchItem({ ...base, normalizedTitle: 'инициализация' }, 'ADD STEP'),
      };
    });

    expect(результат.точное).toBeGreaterThan(результат.толькоТекст);
  });

  test('отдельная запись команды получает приоритет перед обычным разделом', async ({ page }) => {
    const порядок = await page.evaluate(async () => {
      const { rankSearchResults } = await import('/search.js');
      const item = (kind, title, keywords = '') => ({
        kind,
        title,
        pageTitle: 'Команды Harness',
        text: 'ADD STEP создаёт задачу',
        href: '/commands/#bootstrap',
        path: '/commands/',
        normalizedTitle: title.toLowerCase(),
        normalizedPageTitle: 'команды harness',
        normalizedKeywords: keywords.toLowerCase(),
        normalizedText: 'add step создаёт задачу',
      });

      return rankSearchResults([
        item('section', 'Инициализация'),
        item('command', 'ADD STEP', 'ADD STEP'),
      ], 'ADD STEP').map((result) => result.kind);
    });

    expect(порядок[0]).toBe('command');
  });

  test('результат отбрасывается если не содержит все значимые слова запроса', async ({ page }) => {
    const количество = await page.evaluate(async () => {
      const { rankSearchResults } = await import('/search.js');
      return rankSearchResults([{
        kind: 'section',
        title: 'Обновление',
        pageTitle: 'Поддержка',
        text: 'UPDATE HARNESS',
        href: '/maintenance/#updates',
        path: '/maintenance/',
        normalizedTitle: 'обновление',
        normalizedPageTitle: 'поддержка',
        normalizedKeywords: '',
        normalizedText: 'update harness',
      }], 'UPDATE HARNESS конфликт').length;
    });

    expect(количество).toBe(0);
  });

  test('ранжирование соблюдает заданный лимит выдачи', async ({ page }) => {
    const количество = await page.evaluate(async () => {
      const { rankSearchResults } = await import('/search.js');
      const индекс = Array.from({ length: 20 }, (_, index) => ({
        kind: 'section',
        title: `Проект ${index}`,
        pageTitle: 'Документация',
        text: 'проект',
        href: `/page-${index}/`,
        path: `/page-${index}/`,
        normalizedTitle: `проект ${index}`,
        normalizedPageTitle: 'документация',
        normalizedKeywords: '',
        normalizedText: 'проект',
      }));
      return rankSearchResults(индекс, 'проект', 5).length;
    });

    expect(количество).toBe(5);
  });
});
