import { test, expect } from '@playwright/test';

test.describe('Команды — диаграммы цепочек выполнения', () => {
  test('каждая команда содержит визуальную цепочку выполнения', async ({ page }) => {
    await page.goto('/commands/');
    const commands = page.locator('.command-item');
    const count = await commands.count();

    expect(count).toBeGreaterThanOrEqual(32);
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

  test('цепочки отражают актуальную семантику Harness, а не старые упрощения', async ({ page }) => {
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

  test('оперативные команды показывают проверяемое состояние без скрытых изменений', async ({ page }) => {
    await page.goto('/commands/');

    const status = page.locator('.command-item').filter({ hasText: 'HARNESS STATUS' }).first();
    await expect(status).toContainText('Незавершённые исполнения');
    await expect(status).toContainText('Снимок состояния без изменений');

    const resume = page.locator('.command-item').filter({ hasText: 'HARNESS RESUME' }).first();
    await expect(resume).toContainText('Ровно одно продолжение?');
    await expect(resume).toContainText('BLOCKED');

    const doctor = page.locator('.command-item').filter({ hasText: 'HARNESS DOCTOR' }).first();
    await expect(doctor).toContainText('Python 3.11+ / Git');
    await expect(doctor).toContainText('Codex / Claude Code / gh');

    const config = page.locator('.command-item').filter({ hasText: 'HARNESS CONFIG' }).first();
    await expect(config).toContainText('Эффективная конфигурация без изменений');
  });

  test('просмотр STEP поддерживает список, подробности и сокращённый идентификатор', async ({ page }) => {
    await page.goto('/commands/');

    const list = page.locator('.command-item').filter({ hasText: 'STEP LIST' }).first();
    await expect(list).toContainText('Компактный список без изменений');

    const show = page.locator('.command-item').filter({ hasText: 'STEP SHOW STEP-NNN' }).first();
    await expect(show).toContainText('STEP SHOW 024');

    await expect(page.locator('#syntax')).toContainText('STEP RUN 024');
    await expect(page.locator('#syntax')).toContainText('STEP RUN STEP-024');
  });

  test('GIT PR FINISH описывает безопасное завершение локальной ветки после слияния', async ({ page }) => {
    await page.goto('/commands/');

    const finish = page.locator('.command-item').filter({ hasText: 'GIT PR FINISH' }).first();
    await expect(finish).toContainText('MERGED');
    await expect(finish).toContainText('headRefOid');
    await expect(finish).toContainText('git branch -D');
    await expect(finish).toContainText('Удалить только проверенную локальную ветку PR');
  });

  test('страница описывает CTS, цепочки и восстановление выполнения', async ({ page }) => {
    await page.goto('/commands/');
    await expect(page.locator('#syntax')).toContainText('INVALID_CHAIN');
    await expect(page.locator('#syntax')).toContainText('GIT CHECK > COMMIT > PUSH > PR');
    await expect(page.locator('#execution-status')).toContainText('HARNESS RESUME');
    await expect(page.locator('#execution-status')).toContainText('execution-status.json');
  });

  test('диаграммы не создают горизонтальное переполнение страницы', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/commands/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
