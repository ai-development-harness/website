import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

const STORAGE_KEY = 'aih:theme';

async function clearStoredTheme(page) {
  await page.goto('/');
  await page.evaluate((storageKey) => localStorage.removeItem(storageKey), STORAGE_KEY);
}

test.describe('Тема — выбор и сохранение', () => {
  test('без сохранённого выбора использует системную светлую тему', async ({ page }) => {
    await clearStoredTheme(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f6f8fc');
  });

  test('без сохранённого выбора использует системную тёмную тему', async ({ page }) => {
    await clearStoredTheme(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#050b14');
  });

  test('явно сохранённая тема имеет приоритет над системной', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.evaluate((storageKey) => localStorage.setItem(storageKey, 'dark'), STORAGE_KEY);
    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('переключатель меняет тему и сохраняет выбор в localStorage', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await clearStoredTheme(page);
    await page.reload();

    const button = page.getByRole('button', { name: 'Включить светлую тему' });
    await expect(button).toBeVisible();
    await button.click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(button).toHaveAttribute('aria-label', 'Включить тёмную тему');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), STORAGE_KEY)).toBe('light');
  });

  test('сохранённая тема переживает переход между страницами', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((storageKey) => localStorage.setItem(storageKey, 'light'), STORAGE_KEY);
    await page.goto('/commands/');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('button', { name: 'Включить тёмную тему' })).toBeVisible();
  });

  for (const publicPage of PUBLIC_PAGES) {
    test(`на странице ${publicPage.path} доступен переключатель темы`, async ({ page }) => {
      await page.goto(publicPage.path);
      await expect(page.locator('.theme-toggle')).toBeVisible();
    });
  }

  test('ранний theme-init подключён до таблиц стилей и предотвращает вспышку неверной темы', async ({ request }) => {
    for (const publicPage of PUBLIC_PAGES) {
      const response = await request.get(publicPage.path);
      const html = await response.text();
      const themeInitPosition = html.indexOf('/js/theme-init.js?v=');
      const firstStylesheetPosition = html.indexOf('<link rel="stylesheet"');

      expect(themeInitPosition, publicPage.path).toBeGreaterThan(0);
      expect(firstStylesheetPosition, publicPage.path).toBeGreaterThan(themeInitPosition);
    }
  });
});
