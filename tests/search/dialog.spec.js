import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

async function дождатьсяГотовностиПоиска(page) {
  const поле = page.locator('.search-input');
  await expect(поле).toBeEnabled();
  await expect(поле).toBeFocused();
}

test.describe('Поиск — диалог и открытие', () => {
  for (const страница of PUBLIC_PAGES) {
    test(`на странице ${страница.path} доступна кнопка поиска`, async ({ page }) => {
      await page.goto(страница.path);
      await expect(page.getByRole('button', { name: 'Открыть поиск по сайту' })).toBeVisible();
    });
  }

  test('открывает поиск по кнопке в шапке', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Открыть поиск по сайту' }).click();

    await expect(page.locator('.search-dialog')).toHaveAttribute('open', '');
    await дождатьсяГотовностиПоиска(page);
  });

  test('открывает поиск сочетанием Ctrl+K', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+K');

    await expect(page.locator('.search-dialog')).toHaveAttribute('open', '');
    await дождатьсяГотовностиПоиска(page);
  });

  test('открывает поиск клавишей слэш вне поля ввода', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('/');

    await expect(page.locator('.search-dialog')).toHaveAttribute('open', '');
    await дождатьсяГотовностиПоиска(page);
  });

  test('не перехватывает слэш внутри поля поиска', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+K');
    await дождатьсяГотовностиПоиска(page);

    await page.keyboard.type('/');
    await expect(page.locator('.search-input')).toHaveValue('/');
    await expect(page.locator('.search-dialog')).toHaveAttribute('open', '');
  });

  test('закрывает поиск клавишей Escape', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+K');
    await дождатьсяГотовностиПоиска(page);
    await page.keyboard.press('Escape');

    await expect(page.locator('.search-dialog')).not.toHaveAttribute('open', '');
  });

  test('после закрытия возвращает фокус на кнопку поиска', async ({ page }) => {
    await page.goto('/');
    const кнопка = page.getByRole('button', { name: 'Открыть поиск по сайту' });
    await кнопка.click();
    await дождатьсяГотовностиПоиска(page);
    await page.keyboard.press('Escape');

    await expect(кнопка).toBeFocused();
  });

  test('кнопка закрытия имеет доступное имя и закрывает диалог', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+K');
    await дождатьсяГотовностиПоиска(page);

    const закрыть = page.getByRole('button', { name: 'Закрыть поиск' });
    await expect(закрыть).toBeVisible();
    await закрыть.click();
    await expect(page.locator('.search-dialog')).not.toHaveAttribute('open', '');
  });

  test('диалог связывает поле ввода со списком результатов', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+K');
    await дождатьсяГотовностиПоиска(page);

    await expect(page.locator('.search-dialog')).toHaveAttribute('aria-labelledby', 'site-search-title');
    await expect(page.locator('.search-input')).toHaveAttribute('aria-controls', 'site-search-results');
    await expect(page.locator('.search-results')).toHaveAttribute('role', 'listbox');
  });
});
