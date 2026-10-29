import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

const articles = PUBLIC_PAGES.filter((entry) => /portable-handoff|incremental-review-verification|late-defects-after-review|engineering-decisions-adr-git/.test(entry.path));

test.describe('Статьи — перенос, повторные проверки и поздние дефекты', () => {
  for (const article of articles) {
    test(`статья ${article.path} доступна из каталога и содержит пример и первоисточники`, async ({ page }) => {
      await page.goto('/articles/');
      await page.locator(`article a[href="${article.path}"]`).click();
      await expect(page.locator('h1')).toHaveText(article.h1);
      await expect(page.locator('article pre').first()).toBeVisible();
      expect(await page.locator('article a[href*="/.harness/docs/"]').count()).toBeGreaterThanOrEqual(2);
      await expect(page.locator('[data-copy="false"] .copy-button')).toHaveCount(0);
    });

    test(`поиск находит статью ${article.path} по её заголовку`, async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Открыть поиск по сайту' }).click();
      await expect(page.locator('.search-input')).toBeEnabled();
      await page.locator('.search-input').fill(article.h1);
      await expect(page.locator('.search-result').first()).toHaveAttribute('href', article.path);
    });
  }

  test('поздний дефект не переписывает completed STEP и старый PASS', async ({ page }) => {
    await page.goto('/articles/late-defects-after-review/');
    await expect(page.locator('#completed')).toContainText('отдельный корректирующий STEP');
    await expect(page.locator('#active')).toContainText('Единственным новым входом');
    await expect(page.locator('#reuse')).toContainText('invalidatedChecks');
    await expect(page.locator('#reuse')).toContainText('полный прогон');
  });
});


test('статья об инженерных решениях отделяет факты от выводов и ссылается на реальную историю', async ({ page }) => {
  await page.goto('/articles/engineering-decisions-adr-git/');
  await expect(page.locator('#claims')).toContainText('Документированный факт');
  await expect(page.locator('#claims')).toContainText('Обоснованный вывод');
  await expect(page.locator('#claims')).toContainText('Пробел в доказательствах');
  await expect(page.locator('#case a[href$="/issues/342"]')).toBeVisible();
  await expect(page.locator('#case a[href$="/commit/88755a09c0052201f057664d07d2af48d2185a3b"]')).toBeVisible();
  await expect(page.locator('#conflicts')).toContainText('Более поздняя дата коммита не отменяет ADR автоматически');
});
