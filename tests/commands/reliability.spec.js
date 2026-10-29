import { test, expect } from '@playwright/test';

test.describe('Команды — безопасные развилки восстановления', () => {
  test('UPDATE идёт прямо к target и откатывает сбой установки', async ({ page }) => {
    await page.goto('/commands/');
    await page.locator('[data-command="HARNESS UPDATE CHECK"]').click();
    const dialog = page.locator('.command-diagram-dialog');
    await dialog.getByRole('button', { name: 'Целевой релиз уже установлен', exact: true }).click();
    await expect(dialog.locator('[data-diagram-result]')).toContainText('NO_UPDATE');
    await page.keyboard.press('Escape');
    await page.locator('[data-command="HARNESS UPDATE APPLY"]').click();
    await expect(dialog.locator('[data-diagram-result]')).toContainText('UPDATED');
    await expect(dialog).toContainText('Одна транзакция напрямую к конечному релизу');
    await dialog.getByRole('button', { name: 'Целевой релиз уже установлен', exact: true }).click();
    await expect(dialog.locator('[data-diagram-result]')).toContainText('NO_UPDATE');
    await dialog.getByRole('button', { name: 'Нужно установить целевой релиз', exact: true }).click();
    await dialog.getByRole('button', { name: 'Сбой до момента фиксации', exact: true }).click();
    await expect(dialog.locator('[data-diagram-result]')).toContainText('Откат');
  });

  test('CHECK очистки не обещает удаление или запись состояния', async ({ page }) => {
    await page.goto('/commands/');
    await page.locator('[data-command="HARNESS CLEANUP CHECK"]').click();
    const dialog = page.locator('.command-diagram-dialog');
    await expect(dialog).toContainText('Модель не вызывается');
    await dialog.getByRole('button', { name: 'Нужно сохранить файлы', exact: true }).click();
    await expect(dialog.locator('[data-diagram-result]')).toContainText('Ничего не удалять');
    await expect(dialog.locator('[data-diagram-result]')).toContainText('WARNING');
  });

  test('APPLY очистки сохраняет защищённый или изменившийся каталог', async ({ page }) => {
    await page.goto('/commands/');
    await page.locator('[data-command="HARNESS CLEANUP APPLY"]').click();
    const dialog = page.locator('.command-diagram-dialog');
    await dialog.getByRole('button', { name: 'Каталог защищён или изменился', exact: true }).click();
    await expect(dialog.locator('[data-diagram-result]')).toContainText('Сохранить каталог');
    await expect(dialog.locator('.command-diagram-step.is-inactive')).not.toHaveCount(0);
  });

  test('новый клон получает новую PLAN, повреждённая локальная история блокируется', async ({ page }) => {
    await page.goto('/commands/');
    await page.locator('[data-command="HARNESS RESUME"]').click();
    const dialog = page.locator('.command-diagram-dialog');
    await dialog.getByRole('button', { name: 'Новый клон без локальной истории', exact: true }).click();
    await expect(dialog.locator('[data-diagram-result]')).toContainText('Новый локальный STEP PLAN');
    await dialog.getByRole('button', { name: 'Старая история или повреждённая контрольная запись', exact: true }).click();
    await expect(dialog.locator('[data-diagram-result]')).toContainText('BLOCKED');
  });

  test('потерянный FIX delta блокирует повторный REVIEW', async ({ page }) => {
    await page.goto('/commands/');
    await page.locator('[data-command="STEP REVIEW STEP-NNN"]').click();
    const dialog = page.locator('.command-diagram-dialog');
    await dialog.getByRole('button', { name: 'Набор изменений утрачен или устарел', exact: true }).click();
    await expect(dialog.locator('[data-diagram-result]')).toContainText('BLOCKED');
    await expect(dialog.locator('[data-diagram-result]')).toContainText('не выполняется молча');
  });
});
