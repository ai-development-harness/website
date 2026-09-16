import { test, expect } from '@playwright/test';

async function открытьИПодготовить(page, запрос = 'STEP') {
  await page.goto('/');
  await page.keyboard.press('Control+K');
  const поле = page.locator('.search-input');
  await expect(поле).toBeEnabled();
  await поле.fill(запрос);
  await expect(page.locator('.search-result').first()).toBeVisible();
  return поле;
}

test.describe('Поиск — клавиатурная навигация', () => {
  test('после появления результатов выбирает первый результат', async ({ page }) => {
    const поле = await открытьИПодготовить(page);
    const activeId = await поле.getAttribute('aria-activedescendant');

    expect(activeId).toBeTruthy();
    await expect(page.locator(`#${activeId}`)).toHaveClass(/is-active/);
  });

  test('стрелка вниз выбирает следующий результат', async ({ page }) => {
    const поле = await открытьИПодготовить(page);
    const первыйId = await поле.getAttribute('aria-activedescendant');

    await page.keyboard.press('ArrowDown');
    const второйId = await поле.getAttribute('aria-activedescendant');

    expect(второйId).not.toBe(первыйId);
    await expect(page.locator(`#${второйId}`)).toHaveClass(/is-active/);
  });

  test('стрелка вверх циклически переходит к последнему результату', async ({ page }) => {
    const поле = await открытьИПодготовить(page);
    const количество = await page.locator('.search-result').count();

    await page.keyboard.press('ArrowUp');
    await expect(поле).toHaveAttribute('aria-activedescendant', `site-search-result-${количество - 1}`);
  });

  test('Enter открывает активный результат', async ({ page }) => {
    const поле = await открытьИПодготовить(page, 'ADD STEP');
    const href = await page.locator('.search-result.is-active').getAttribute('href');

    await поле.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  });

  test('после смены запроса выбор снова начинается с первого результата', async ({ page }) => {
    const поле = await открытьИПодготовить(page, 'STEP');
    await page.keyboard.press('ArrowDown');
    await поле.fill('UPDATE HARNESS');

    await expect(поле).toHaveAttribute('aria-activedescendant', 'site-search-result-0');
  });

  test('Escape закрывает поиск из поля ввода и возвращает фокус', async ({ page }) => {
    await page.goto('/');
    const кнопка = page.getByRole('button', { name: 'Открыть поиск по сайту' });
    await кнопка.click();
    await expect(page.locator('.search-input')).toBeFocused();

    await page.locator('.search-input').press('Escape');
    await expect(page.locator('.search-dialog')).not.toHaveAttribute('open', '');
    await expect(кнопка).toBeFocused();
  });
});
