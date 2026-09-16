import { test, expect } from '@playwright/test';

test.describe('Главная страница — демонстрационный терминал', () => {
  test('запускает анимацию при появлении терминала в области просмотра', async ({ page }) => {
    await page.goto('/');
    const terminal = page.locator('.terminal-panel');
    await terminal.scrollIntoViewIfNeeded();

    await expect(terminal).toHaveAttribute('data-animated', 'true', { timeout: 5_000 });
    await expect(terminal).toHaveClass(/is-running|is-complete/);
  });

  test('завершает сценарий финальным результатом и убирает состояние выполнения', async ({ page }) => {
    await page.goto('/');
    const terminal = page.locator('.terminal-panel');
    await terminal.scrollIntoViewIfNeeded();

    await expect(terminal).toHaveClass(/is-complete/, { timeout: 12_000 });
    await expect(terminal).not.toHaveClass(/is-running/);
    await expect(terminal.locator('pre code')).toContainText('RESULT › доказательства выполнения + отчёт ревью');
  });

  test('последовательно показывает создание STEP и запуск RUN STEP', async ({ page }) => {
    await page.goto('/');
    const terminal = page.locator('.terminal-panel');
    await terminal.scrollIntoViewIfNeeded();
    await expect(terminal).toHaveClass(/is-complete/, { timeout: 12_000 });

    const text = await terminal.locator('pre code').innerText();
    const addIndex = text.indexOf('ADD STEP: Добавить экспорт отчётов в PDF');
    const createdIndex = text.indexOf('CREATED › STEP-024');
    const runIndex = text.indexOf('RUN STEP-024');
    const resultIndex = text.indexOf('RESULT › доказательства выполнения + отчёт ревью');

    expect(addIndex).toBeGreaterThanOrEqual(0);
    expect(createdIndex).toBeGreaterThan(addIndex);
    expect(runIndex).toBeGreaterThan(createdIndex);
    expect(resultIndex).toBeGreaterThan(runIndex);
  });

  test('не запускает анимацию при включённом reduced motion и сохраняет статичный пример', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const terminal = page.locator('.terminal-panel');
    await terminal.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);

    await expect(terminal).not.toHaveAttribute('data-animated', 'true');
    await expect(terminal.locator('pre code')).toContainText('ADD STEP: Добавить экспорт отчётов в PDF');
    await expect(terminal.locator('pre code')).toContainText('RUN STEP-024');
  });

  test('курсор анимации не остаётся после завершения сценария', async ({ page }) => {
    await page.goto('/');
    const terminal = page.locator('.terminal-panel');
    await terminal.scrollIntoViewIfNeeded();
    await expect(terminal).toHaveClass(/is-complete/, { timeout: 12_000 });
    await expect(terminal.locator('.terminal-cursor')).toHaveCount(0);
  });
});
