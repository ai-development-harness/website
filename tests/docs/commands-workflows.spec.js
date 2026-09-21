import { test, expect } from '@playwright/test';

test.describe('Команды — диаграммы цепочек выполнения', () => {
  test('каждая команда содержит визуальную цепочку выполнения', async ({ page }) => {
    await page.goto('/commands/');
    const commands = page.locator('.command-item');
    const count = await commands.count();

    expect(count).toBeGreaterThanOrEqual(20);
    for (let index = 0; index < count; index += 1) {
      await expect(commands.nth(index).locator('.command-flow')).toHaveCount(1);
    }
  });

  test('STEP RUN STEP-NNN показывает планирование, реализацию, проверку и все ветки результата', async ({ page }) => {
    await page.goto('/commands/');
    const runCommand = page.locator('.command-item').filter({ hasText: 'STEP RUN STEP-NNN' });

    await expect(runCommand).toContainText('STEP PLAN STEP-NNN');
    await expect(runCommand).toContainText('STEP IMPLEMENT');
    await expect(runCommand).toContainText('Проверки реализации');
    await expect(runCommand).toContainText('Независимая STEP REVIEW');
    await expect(runCommand).toContainText('FAIL');
    await expect(runCommand).toContainText('FIX');
    await expect(runCommand).toContainText('PASS');
    await expect(runCommand).toContainText('Финализация STEP');
    await expect(runCommand).toContainText('BLOCKED');
    await expect(runCommand).toContainText('execution.maxFixReviewCycles');
  });

  test('цепочки отражают актуальную семантику v0.6.0, а не старые упрощения', async ({ page }) => {
    await page.goto('/commands/');

    const next = page.locator('.command-item').filter({ hasText: 'STEP NEXT' }).first();
    await expect(next).toContainText('Незавершённые исполнения');
    await expect(next).toContainText('Есть прерванный STEP?');

    const quickFix = page.locator('.command-item').filter({ hasText: 'PROJECT QUICK FIX' }).first();
    await expect(quickFix).toContainText('Предложить GIT COMMIT');

    const updateApply = page.locator('.command-item').filter({ hasText: 'HARNESS UPDATE APPLY' }).first();
    await expect(updateApply).toContainText('Свежая машинная предварительная проверка');
    await expect(updateApply).toContainText('Показать изменения и предложить GIT CHECK');
    await expect(updateApply).not.toContainText('GIT COMMIT');

    const gitCommit = page.locator('.command-item').filter({ hasText: 'GIT COMMIT /' }).first();
    await expect(gitCommit).toContainText('Фактические изменения');
    await expect(gitCommit).not.toContainText('GIT CHECK');

    const reconcile = page.locator('.command-item').filter({ hasText: 'PROJECT RECONCILE' }).first();
    await expect(reconcile).toContainText('Проверка устаревших команд');
    await expect(reconcile).toContainText('Нужна миграция');
  });

  test('страница описывает CTS, цепочки и восстановление выполнения', async ({ page }) => {
    await page.goto('/commands/');
    await expect(page.locator('#syntax')).toContainText('INVALID_CHAIN');
    await expect(page.locator('#syntax')).toContainText('GIT CHECK > COMMIT > PUSH > PR');
    await expect(page.locator('#execution-status')).toContainText('RESUME');
    await expect(page.locator('#execution-status')).toContainText('execution-status.json');
  });

  test('диаграммы не создают горизонтальное переполнение страницы', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/commands/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
