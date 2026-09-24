import { test, expect } from '@playwright/test';

test.describe('Команды — интерактивные схемы выполнения', () => {
  test('у каждого блока команды есть кнопка интерактивной схемы', async ({ page }) => {
    await page.goto('/commands/');

    const items = page.locator('.command-item');
    const buttons = page.locator('.command-diagram-open');

    await expect(items).not.toHaveCount(0);
    await expect(buttons).toHaveCount(await items.count());
  });

  test('в HTML страницы команд нет буквальных \\n между подключаемыми ассетами', async ({ page }) => {
    await page.goto('/commands/');

    const html = await page.content();

    expect(html).not.toContain('\\n<link');
    expect(html).not.toContain('\\n<script');
  });

  test('STEP ADD показывает развилки и останавливает путь при дубликате', async ({ page }) => {
    await page.goto('/commands/');

    await page.locator('.command-diagram-open[data-command="STEP ADD:"]').click();

    const dialog = page.locator('.command-diagram-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#command-diagram-title')).toContainText('STEP ADD:');
    await expect(dialog).toContainText('Пользователь вводит команду');
    await expect(dialog).toContainText('harness-dispatch.py start');
    await expect(dialog.locator('.command-diagram-step.is-inactive')).toHaveCount(0);
    await expect(
      dialog.getByRole('button', { name: 'Дубликат не найден', exact: true })
    ).toBeEnabled();

    await dialog.getByRole('button', { name: 'Найден дубликат или пересечение' }).click();

    await expect(dialog.locator('[data-diagram-result]')).toContainText('ОСТАНОВКА');
    await expect(dialog.locator('[data-diagram-result]')).toContainText('Новый STEP не создаётся');
  });

  test('STEP REVIEW позволяет выбрать PASS, FAIL и BLOCKED', async ({ page }) => {
    await page.goto('/commands/');

    await page
      .locator('.command-diagram-open[data-command="STEP REVIEW STEP-NNN"]')
      .click();

    const dialog = page.locator('.command-diagram-dialog');

    await dialog.getByRole('button', { name: 'FAIL', exact: true }).click();
    await expect(dialog.locator('[data-diagram-result]')).toContainText('FAIL');
    await expect(dialog.locator('[data-diagram-result]')).toContainText('STEP FIX STEP-NNN');

    const verdictNode = dialog.locator('.command-diagram-node', { hasText: 'Вердикт' });
    await verdictNode.getByRole('button', { name: 'BLOCKED', exact: true }).click();
    await expect(dialog.locator('[data-diagram-result]')).toContainText('BLOCKED');
    await expect(dialog.locator('[data-diagram-result]')).toContainText('Цикл FIX не запускается');
  });

  test('GIT SYNC показывает разные состояния веток', async ({ page }) => {
    await page.goto('/commands/');

    await page.locator('.command-diagram-open[data-command="GIT SYNC"]').click();

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
