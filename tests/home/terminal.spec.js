import { test, expect } from '@playwright/test';

test.describe('Главная страница — демонстрационный терминал', () => {
  test('запускает анимацию при появлении терминала в области просмотра', async ({ page }) => {
    await page.goto('/');
    const терминал = page.locator('.terminal-panel');
    await терминал.scrollIntoViewIfNeeded();

    await expect(терминал).toHaveAttribute('data-animated', 'true', { timeout: 5_000 });
    await expect(терминал).toHaveClass(/is-running|is-complete/);
  });

  test('завершает сценарий финальным результатом и убирает состояние выполнения', async ({ page }) => {
    await page.goto('/');
    const терминал = page.locator('.terminal-panel');
    await терминал.scrollIntoViewIfNeeded();

    await expect(терминал).toHaveClass(/is-complete/, { timeout: 12_000 });
    await expect(терминал).not.toHaveClass(/is-running/);
    await expect(терминал.locator('pre code')).toContainText('RESULT › доказательства выполнения + отчёт ревью');
  });

  test('последовательно показывает создание STEP и запуск RUN STEP', async ({ page }) => {
    await page.goto('/');
    const терминал = page.locator('.terminal-panel');
    await терминал.scrollIntoViewIfNeeded();
    await expect(терминал).toHaveClass(/is-complete/, { timeout: 12_000 });

    const текст = await терминал.locator('pre code').innerText();
    const add = текст.indexOf('ADD STEP: Добавить экспорт отчётов в PDF');
    const created = текст.indexOf('CREATED › STEP-024');
    const run = текст.indexOf('RUN STEP-024');
    const result = текст.indexOf('RESULT › доказательства выполнения + отчёт ревью');

    expect(add).toBeGreaterThanOrEqual(0);
    expect(created).toBeGreaterThan(add);
    expect(run).toBeGreaterThan(created);
    expect(result).toBeGreaterThan(run);
  });

  test('не запускает анимацию при включённом reduced motion и сохраняет статичный пример', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const терминал = page.locator('.terminal-panel');
    await терминал.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);

    await expect(терминал).not.toHaveAttribute('data-animated', 'true');
    await expect(терминал.locator('pre code')).toContainText('ADD STEP: Добавить экспорт отчётов в PDF');
    await expect(терминал.locator('pre code')).toContainText('RUN STEP-024');
  });

  test('курсор анимации не остаётся после завершения сценария', async ({ page }) => {
    await page.goto('/');
    const терминал = page.locator('.terminal-panel');
    await терминал.scrollIntoViewIfNeeded();
    await expect(терминал).toHaveClass(/is-complete/, { timeout: 12_000 });
    await expect(терминал.locator('.terminal-cursor')).toHaveCount(0);
  });
});
