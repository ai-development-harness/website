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

  test('объясняет единый dispatcher на первом экране', async ({ page }) => {
    await expect(page.locator('.timeline-note')).toContainText('Единый dispatcher');
    await expect(page.locator('.hero-facts')).toContainText('Проверяемое выполнение');
  });

  test('показывает четыре карточки проблем', async ({ page }) => {
    await expect(page.locator('.problem-card')).toHaveCount(4);
  });

  test('показывает пять этапов сохраняемого процесса', async ({ page }) => {
    await expect(page.locator('.process-step')).toHaveCount(5);
  });

  test('показывает модель контекста как три визуальных слоя', async ({ page }) => {
    const model = page.locator('.traceability-flow');

    await expect(model).toBeVisible();
    await expect(model.locator('.context-layer')).toHaveCount(3);
    await expect(model.locator('.knowledge-parts > div')).toHaveCount(3);
    await expect(model).toContainText('Протокол');
    await expect(model).toContainText('База знаний проекта');
    await expect(model).toContainText('Фактическое состояние');
  });

  test('показывает оба поддерживаемых runtime adapter', async ({ page }) => {
    const section = page.locator('#runtimes');

    await expect(section).toBeVisible();
    await expect(section).toContainText('Codex');
    await expect(section).toContainText('Claude Code');
    await expect(section.getByRole('link', { name: /среды исполнения/i })).toHaveAttribute('href', '/runtimes/');
  });


  test('показывает три сценария аудитории', async ({ page }) => {
    await expect(page.locator('.audience-card')).toHaveCount(3);
  });

  test('показывает шесть карточек документации', async ({ page }) => {
    await expect(page.locator('.docs-grid .doc-card')).toHaveCount(6);
  });

  test('финальный призыв к действию содержит три шага запуска и ссылку на шаблон', async ({ page }) => {
    await expect(page.locator('.cta-steps li')).toHaveCount(3);
    await expect(page.locator('.cta-box').getByRole('link', { name: 'Использовать шаблон' })).toBeVisible();
  });
});
