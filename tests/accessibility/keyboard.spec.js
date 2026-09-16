import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

test.describe('Доступность — клавиатурная навигация', () => {
  for (const publicPage of PUBLIC_PAGES) {
    test(`ссылка перехода к содержимому на странице ${publicPage.path} переводит фокус к основному содержимому`, async ({ page }) => {
      await page.goto(publicPage.path);

      await page.keyboard.press('Tab');
      await expect(page.locator('.skip-link')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#content')).toBeFocused();
    });
  }

  test('FAQ раскрывается с клавиатуры', async ({ page }) => {
    await page.goto('/faq/');
    const firstQuestion = page.locator('.faq-item summary').first();

    await firstQuestion.focus();
    await expect(firstQuestion).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.faq-item').first()).toHaveAttribute('open', '');
  });
});
