import { test, expect } from '@playwright/test';
import { isDesktop } from '../helpers/site.js';

test.describe('Навигация — шапка сайта', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('показывает подходящую навигацию для текущего размера экрана', async ({ page }, testInfo) => {
    const desktopNav = page.locator('.desktop-nav');
    const menuButton = page.locator('.menu-button');

    if (isDesktop(testInfo)) {
      await expect(desktopNav).toBeVisible();
      await expect(menuButton).toBeHidden();
    } else {
      await expect(desktopNav).toBeHidden();
      await expect(menuButton).toBeVisible();
    }
  });

  test('мобильное меню открывается и закрывается повторным нажатием', async ({ page }, testInfo) => {
    test.skip(isDesktop(testInfo), 'Проверка относится к мобильной навигации');

    const button = page.locator('.menu-button');
    const menu = page.locator('.mobile-nav');

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();
  });

  test('мобильное меню закрывается клавишей Escape', async ({ page }, testInfo) => {
    test.skip(isDesktop(testInfo), 'Проверка относится к мобильной навигации');

    const button = page.locator('.menu-button');
    const menu = page.locator('.mobile-nav');

    await button.click();
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();
  });

  test('мобильное меню закрывается после перехода по ссылке', async ({ page }, testInfo) => {
    test.skip(isDesktop(testInfo), 'Проверка относится к мобильной навигации');

    await page.locator('.menu-button').click();
    await page.locator('.mobile-nav a[href="/getting-started/"]').click();

    await expect(page).toHaveURL(/\/getting-started\/$/);
    await expect(page.locator('.menu-button')).toHaveAttribute('aria-expanded', 'false');
  });

  test('логотип всегда ведёт на главную страницу', async ({ page }) => {
    await expect(page.locator('.brand')).toHaveAttribute('href', '/');
  });
});
