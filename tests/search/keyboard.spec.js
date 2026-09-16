import { test, expect } from '@playwright/test';

async function openSearchWithQuery(page, query = 'STEP') {
  await page.goto('/');
  await page.keyboard.press('Control+K');
  const input = page.locator('.search-input');
  await expect(input).toBeEnabled();
  await input.fill(query);
  await expect(page.locator('.search-result').first()).toBeVisible();
  return input;
}

test.describe('Поиск — клавиатурная навигация', () => {
  test('после появления результатов выбирает первый результат', async ({ page }) => {
    const input = await openSearchWithQuery(page);
    const activeId = await input.getAttribute('aria-activedescendant');

    expect(activeId).toBeTruthy();
    await expect(page.locator(`#${activeId}`)).toHaveClass(/is-active/);
  });

  test('стрелка вниз выбирает следующий результат', async ({ page }) => {
    const input = await openSearchWithQuery(page);
    const firstId = await input.getAttribute('aria-activedescendant');

    await page.keyboard.press('ArrowDown');
    const secondId = await input.getAttribute('aria-activedescendant');

    expect(secondId).not.toBe(firstId);
    await expect(page.locator(`#${secondId}`)).toHaveClass(/is-active/);
  });

  test('стрелка вверх циклически переходит к последнему результату', async ({ page }) => {
    const input = await openSearchWithQuery(page);
    const resultCount = await page.locator('.search-result').count();

    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveAttribute('aria-activedescendant', `site-search-result-${resultCount - 1}`);
  });

  test('Enter открывает активный результат', async ({ page }) => {
    const input = await openSearchWithQuery(page, 'ADD STEP');
    const href = await page.locator('.search-result.is-active').getAttribute('href');

    await input.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  });

  test('после смены запроса выбор снова начинается с первого результата', async ({ page }) => {
    const input = await openSearchWithQuery(page, 'STEP');
    await page.keyboard.press('ArrowDown');
    await input.fill('UPDATE HARNESS');

    await expect(input).toHaveAttribute('aria-activedescendant', 'site-search-result-0');
  });

  test('Escape закрывает поиск из поля ввода и возвращает фокус', async ({ page }) => {
    await page.goto('/');
    const button = page.getByRole('button', { name: 'Открыть поиск по сайту' });
    await button.click();
    await expect(page.locator('.search-input')).toBeFocused();

    await page.locator('.search-input').press('Escape');
    await expect(page.locator('.search-dialog')).not.toHaveAttribute('open', '');
    await expect(button).toBeFocused();
  });
});
