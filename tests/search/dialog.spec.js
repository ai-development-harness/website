import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

async function waitForSearchReady(page) {
  const input = page.locator('.search-input');
  await expect(input).toBeEnabled();
  await expect(input).toBeFocused();
}

test.describe('Поиск — диалог и открытие', () => {
  for (const publicPage of PUBLIC_PAGES) {
    test(`на странице ${publicPage.path} доступна кнопка поиска`, async ({ page }) => {
      await page.goto(publicPage.path);
      await expect(page.getByRole('button', { name: 'Открыть поиск по сайту' })).toBeVisible();
    });
  }

  test('открывает поиск по кнопке в шапке', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Открыть поиск по сайту' }).click();

    await expect(page.locator('.search-dialog')).toHaveAttribute('open', '');
    await waitForSearchReady(page);
  });

  test('открывает поиск сочетанием Ctrl+K', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+K');

    await expect(page.locator('.search-dialog')).toHaveAttribute('open', '');
    await waitForSearchReady(page);
  });

  test('не теряет Ctrl+K во время загрузки модуля поиска', async ({ page }) => {
    await page.route('**/js/search.js*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });

    // DOM уже готов и main.js успел поставить bootstrap-listener, но search.js
    // намеренно остаётся в полёте. Именно в этом окне раньше терялся shortcut.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.keyboard.press('Control+K');

    await expect(page.locator('.search-dialog')).toHaveAttribute('open', '');
    await waitForSearchReady(page);
  });

  test('открывает поиск клавишей слэш вне поля ввода', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('/');

    await expect(page.locator('.search-dialog')).toHaveAttribute('open', '');
    await waitForSearchReady(page);
  });

  test('не перехватывает слэш внутри поля поиска', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+K');
    await waitForSearchReady(page);

    await page.keyboard.type('/');
    await expect(page.locator('.search-input')).toHaveValue('/');
    await expect(page.locator('.search-dialog')).toHaveAttribute('open', '');
  });

  test('закрывает поиск клавишей Escape', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+K');
    await waitForSearchReady(page);
    await page.keyboard.press('Escape');

    await expect(page.locator('.search-dialog')).not.toHaveAttribute('open', '');
  });

  test('после закрытия возвращает фокус на кнопку поиска', async ({ page }) => {
    await page.goto('/');
    const button = page.getByRole('button', { name: 'Открыть поиск по сайту' });
    await button.click();
    await waitForSearchReady(page);
    await page.keyboard.press('Escape');

    await expect(button).toBeFocused();
  });

  test('кнопка закрытия имеет доступное имя и закрывает диалог', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+K');
    await waitForSearchReady(page);

    const closeButton = page.getByRole('button', { name: 'Закрыть поиск' });
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    await expect(page.locator('.search-dialog')).not.toHaveAttribute('open', '');
  });

  test('диалог связывает поле ввода со списком результатов', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+K');
    await waitForSearchReady(page);

    await expect(page.locator('.search-dialog')).toHaveAttribute('aria-labelledby', 'site-search-title');
    await expect(page.locator('.search-input')).toHaveAttribute('aria-controls', 'site-search-results');
    await expect(page.locator('.search-results')).toHaveAttribute('role', 'listbox');
  });
});
