import { test, expect } from '@playwright/test';
import { INTERNAL_ANCHORS } from '../helpers/site.js';

test.describe('Главная страница — основные секции', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('содержит все ключевые смысловые секции', async ({ page }) => {
    for (const id of INTERNAL_ANCHORS) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });

  test('показывает четыре карточки проблем', async ({ page }) => {
    await expect(page.locator('.problem-card')).toHaveCount(4);
  });

  test('показывает пять этапов сохраняемого процесса', async ({ page }) => {
    await expect(page.locator('.process-step')).toHaveCount(5);
  });

  test('показывает модель контекста из пяти элементов', async ({ page }) => {
    await expect(page.locator('.traceability-flow')).toBeVisible();
    await expect(page.locator('.flow-card')).toHaveCount(5);
  });

  test('показывает оба поддерживаемых runtime adapter', async ({ page }) => {
    const section = page.locator('#runtimes');

    await expect(section).toBeVisible();
    await expect(section).toContainText('Codex');
    await expect(section).toContainText('Claude Code');
    await expect(section.getByRole('link', { name: /runtime adapters/ })).toHaveAttribute('href', '/runtimes/');
  });


  test('показывает три сценария аудитории', async ({ page }) => {
    await expect(page.locator('.audience-card')).toHaveCount(3);
  });

  test('показывает шесть карточек документации', async ({ page }) => {
    await expect(page.locator('.docs-grid .doc-card')).toHaveCount(6);
  });
});
