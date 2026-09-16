import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

test.describe('Доступность — клавиатурная навигация', () => {
  for (const страница of PUBLIC_PAGES) {
    test(`ссылка перехода к содержимому на странице ${страница.path} переводит фокус к основному содержимому`, async ({ page }) => {
      await page.goto(страница.path);

      await page.keyboard.press('Tab');
      await expect(page.locator('.skip-link')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#content')).toBeFocused();
    });
  }

  test('FAQ раскрывается с клавиатуры', async ({ page }) => {
    await page.goto('/faq/');
    const первыйВопрос = page.locator('.faq-item summary').first();

    await первыйВопрос.focus();
    await expect(первыйВопрос).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.faq-item').first()).toHaveAttribute('open', '');
  });
});
