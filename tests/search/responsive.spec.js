import { test, expect } from '@playwright/test';

async function открытьПоиск(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть поиск по сайту' }).click();
  await expect(page.locator('.search-input')).toBeEnabled();
}

test.describe('Поиск — адаптивность', () => {
  test('диалог поиска полностью помещается в область просмотра', async ({ page }) => {
    await открытьПоиск(page);
    const box = await page.locator('.search-dialog').boundingBox();
    const viewport = page.viewportSize();

    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  });

  test('поле поиска не создаёт горизонтального переполнения', async ({ page }) => {
    await открытьПоиск(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('кнопка поиска остаётся доступной рядом с мобильным меню', async ({ page }, testInfo) => {
    await page.goto('/');
    const поиск = page.getByRole('button', { name: 'Открыть поиск по сайту' });
    await expect(поиск).toBeVisible();

    if (testInfo.project.name !== 'desktop-chromium') {
      await expect(page.locator('.menu-button')).toBeVisible();
    }
  });

  test('результаты поиска остаются читаемыми на узком экране', async ({ page }) => {
    await открытьПоиск(page);
    await page.locator('.search-input').fill('ADD STEP');
    const первый = page.locator('.search-result').first();

    await expect(первый).toBeVisible();
    const box = await первый.boundingBox();
    const viewport = page.viewportSize();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  });
});
