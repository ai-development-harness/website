import { test, expect } from '@playwright/test';
import { DOC_PAGES } from '../helpers/site.js';

test.describe('Документация — структура страниц', () => {
  for (const docPage of DOC_PAGES) {
    test(`страница «${docPage.h1}» открывается и содержит ожидаемую структуру`, async ({ page }) => {
      const response = await page.goto(docPage.path);

      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(docPage.h1);
      await expect(page.locator('.docs-hero')).toBeVisible();
      await expect(page.locator('.docs-shell')).toBeVisible();
      await expect(page.locator('article.article')).toBeVisible();
      expect(await page.locator('article.article section[id]').count()).toBeGreaterThan(0);
    });

    test(`страница «${docPage.h1}» содержит хлебные крошки`, async ({ page }) => {
      await page.goto(docPage.path);
      const breadcrumbs = page.locator('.breadcrumbs');

      await expect(breadcrumbs).toBeVisible();
      await expect(breadcrumbs.getByRole('link', { name: 'Главная' })).toHaveAttribute('href', '/');
      await expect(breadcrumbs).toContainText(docPage.h1 === 'Команды Harness' ? 'Команды Harness' : docPage.h1);
    });

    test(`оглавление страницы «${docPage.h1}» ссылается только на существующие разделы`, async ({ page }) => {
      await page.goto(docPage.path);
      const hrefs = await page.locator('.toc a[href^="#"]')
        .evaluateAll((elements) => elements.map((element) => element.getAttribute('href')));

      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) {
        await expect(page.locator(href)).toHaveCount(1);
      }
    });
  }

  test('документация обновления описывает маршрут через harness-update-graph.json', async ({ page }) => {
    for (const path of ['/getting-started/', '/commands/', '/maintenance/']) {
      await page.goto(path);
      await expect(page.locator('article.article')).toContainText('.project/harness-update-graph.json');
    }
  });

  test('документация разделяет REQ definition и lifecycle status', async ({ page }) => {
    await page.goto('/architecture/');
    const article = page.locator('article.article');

    await expect(article).toContainText('docs/requirements/SPEC.md');
    await expect(article).toContainText('docs/requirements/STATUS.md');
  });

  test('workflow описывает проверяемое Evidence без подмены output пересказом', async ({ page }) => {
    await page.goto('/workflow/');
    const article = page.locator('article.article');

    await expect(article).toContainText('exit code');
    await expect(article).toContainText('Observed');
  });

  test('FAQ описывает BLOCKED при недоступном Git metadata', async ({ page }) => {
    await page.goto('/faq/');
    await expect(page.locator('article.article')).toContainText('HARNESS VALIDATION: BLOCKED');
  });

  test('страница FAQ содержит раскрываемые ответы на частые вопросы', async ({ page }) => {
    await page.goto('/faq/');
    const questions = page.locator('.faq-item');

    expect(await questions.count()).toBeGreaterThanOrEqual(10);
    await expect(questions.first().locator('summary')).toBeVisible();
  });

  test('страница начала работы использует естественную русскую формулировку', async ({ page }) => {
    await page.goto('/getting-started/');
    await expect(page.locator('h1')).toHaveText('Начало работы');
    await expect(page.locator('body')).not.toContainText('руководство по старту');
  });
});
