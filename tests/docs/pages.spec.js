import { test, expect } from '@playwright/test';
import { DOC_PAGES } from '../helpers/site.js';

test.describe('Документация — структура страниц', () => {
  for (const страница of DOC_PAGES) {
    test(`страница «${страница.h1}» открывается и содержит ожидаемую структуру`, async ({ page }) => {
      const ответ = await page.goto(страница.path);

      expect(ответ?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(страница.h1);
      await expect(page.locator('.docs-hero')).toBeVisible();
      await expect(page.locator('.docs-shell')).toBeVisible();
      await expect(page.locator('article.article')).toBeVisible();
      expect(await page.locator('article.article section[id]').count()).toBeGreaterThan(0);
    });

    test(`страница «${страница.h1}» содержит хлебные крошки`, async ({ page }) => {
      await page.goto(страница.path);
      const крошки = page.locator('.breadcrumbs');

      await expect(крошки).toBeVisible();
      await expect(крошки.getByRole('link', { name: 'Главная' })).toHaveAttribute('href', '/');
      await expect(крошки).toContainText(страница.h1 === 'Команды Harness' ? 'Команды Harness' : страница.h1);
    });

    test(`оглавление страницы «${страница.h1}» ссылается только на существующие разделы`, async ({ page }) => {
      await page.goto(страница.path);
      const ссылки = await page.locator('.toc a[href^="#"]').evaluateAll((элементы) => элементы.map((элемент) => элемент.getAttribute('href')));

      expect(ссылки.length).toBeGreaterThan(0);
      for (const href of ссылки) {
        await expect(page.locator(href)).toHaveCount(1);
      }
    });
  }

  test('страница FAQ содержит раскрываемые ответы на частые вопросы', async ({ page }) => {
    await page.goto('/faq/');
    const вопросы = page.locator('.faq-item');

    expect(await вопросы.count()).toBeGreaterThanOrEqual(10);
    await expect(вопросы.first().locator('summary')).toBeVisible();
  });

  test('страница начала работы использует естественную русскую формулировку', async ({ page }) => {
    await page.goto('/getting-started/');
    await expect(page.locator('h1')).toHaveText('Начало работы');
    await expect(page.locator('body')).not.toContainText('руководство по старту');
  });
});
