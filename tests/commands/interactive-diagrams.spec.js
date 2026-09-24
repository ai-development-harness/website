import { test, expect } from '@playwright/test';

test.describe('Команды — интерактивные схемы выполнения', () => {
  test('у каждого блока команды есть кнопка интерактивной схемы', async ({ page }) => {
    await page.goto('/commands/');

    const items = page.locator('.command-item');
    const buttons = page.locator('.command-diagram-open');

    await expect(items).not.toHaveCount(0);
    await expect(buttons).toHaveCount(await items.count());
  });

  test('STEP ADD показывает развилки и останавливает путь при дубликате', async ({ page }) => {
    await page.goto('/commands/');

    const item = page.locator('.command-item', { hasText: 'STEP ADD:' }).first();
    await item.locator('.command-diagram-open').click();

    const dialog = page.locator('.command-diagram-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#command-diagram-title')).toContainText('STEP ADD:');
    await expect(dialog).toContainText('Пользователь вводит команду');
    await expect(dialog).toContainText('harness-dispatch.py start');

    await dialog.getByRole('button', { name: 'Найден дубликат или пересечение' }).click();

    await expect(dialog.locator('[data-diagram-result]')).toContainText('STOP');
    await expect(dialog.locator('[data-diagram-result]')).toContainText('Новый STEP не создаётся');
  });

  test('STEP REVIEW позволяет выбрать PASS, FAIL и BLOCKED', async ({ page }) => {
    await page.goto('/commands/');

    const item = page.locator('.command-item', { hasText: 'STEP REVIEW STEP-NNN' }).first();
    await item.locator('.command-diagram-open').click();

    const dialog = page.locator('.command-diagram-dialog');

    await dialog.getByRole('button', { name: 'FAIL', exact: true }).click();
    await expect(dialog.locator('[data-diagram-result]')).toContainText('FAIL');
    await expect(dialog.locator('[data-diagram-result]')).toContainText('STEP FIX STEP-NNN');

    await dialog.getByRole('button', { name: 'BLOCKED', exact: true }).click();
    await expect(dialog.locator('[data-diagram-result]')).toContainText('BLOCKED');
    await expect(dialog.locator('[data-diagram-result]')).toContainText('Цикл FIX не запускается');
  });

  test('GIT SYNC показывает разные состояния веток', async ({ page }) => {
    await page.goto('/commands/');

    const item = page.locator('.command-item', { hasText: 'GIT SYNC' }).first();
    await item.locator('.command-diagram-open').click();

    const dialog = page.locator('.command-diagram-dialog');
    await dialog.getByRole('button', { name: 'Ветки разошлись' }).click();

    await expect(dialog.locator('[data-diagram-result]')).toContainText('BLOCKED');
    await expect(dialog.locator('[data-diagram-result]')).toContainText('rebase');
  });

  test('модальное окно закрывается Escape и возвращает фокус на кнопку', async ({ page }) => {
    await page.goto('/commands/');

    const button = page.locator('.command-diagram-open').first();
    await button.focus();
    await button.press('Enter');

    const dialog = page.locator('.command-diagram-dialog');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(button).toBeFocused();
  });

  test('на планшетной ширине модальное окно помещается в область просмотра', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/commands/');

    await page.locator('.command-diagram-open').first().click();
    const box = await page.locator('.command-diagram-dialog').boundingBox();

    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(1024);
  });
});
