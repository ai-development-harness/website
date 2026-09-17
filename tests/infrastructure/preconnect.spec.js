import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

test.describe('Resource hints для внешних подключений', () => {
  for (const publicPage of PUBLIC_PAGES) {
    test(`страница ${publicPage.path} заранее открывает соединение с Yandex.Metrika`, async ({ page }) => {
      await page.goto(publicPage.path);
      await expect(page.locator('link[rel="preconnect"][href="https://mc.yandex.ru"]')).toHaveCount(1);
    });
  }

  test('главная заранее открывает соединение с GitHub Releases API', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="preconnect"][href="https://api.github.com"]')).toHaveCount(1);
  });
});
