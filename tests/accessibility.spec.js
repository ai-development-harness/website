import { test, expect } from '@playwright/test';

test('basic accessibility contract', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('img:not([alt])')).toHaveCount(0);
  await expect(page.locator('a[href=""]')).toHaveCount(0);
  await expect(page.locator('button.menu-button')).toHaveAttribute('aria-label', /меню/i);
});

test('keyboard focus can reach main actions', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#content')).toBeFocused();
});
