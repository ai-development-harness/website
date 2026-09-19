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

  test('STEP RUN STEP-NNN показывает PLAN, implementation, review и все verdict-ветки', async ({ page }) => {
    await page.goto('/commands/');
    const runCommand = page.locator('.command-item').filter({ hasText: 'STEP RUN STEP-NNN' });

    await expect(runCommand).toContainText('STEP PLAN STEP-NNN');
    await expect(runCommand).toContainText('STEP IMPLEMENT');
    await expect(runCommand).toContainText('Verification');
    await expect(runCommand).toContainText('Independent REVIEW');
    await expect(runCommand).toContainText('FAIL');
    await expect(runCommand).toContainText('FIX');
    await expect(runCommand).toContainText('PASS');
    await expect(runCommand).toContainText('CLOSE STEP');
    await expect(runCommand).toContainText('BLOCKED');
    await expect(runCommand).toContainText('execution.maxFixReviewCycles');
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
