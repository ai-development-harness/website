import { test, expect } from '@playwright/test';
import { DOC_PAGES } from '../helpers/site.js';

test.describe('Документация — навигация между страницами', () => {
  for (const страница of DOC_PAGES) {
    test(`на странице «${страница.h1}» присутствует навигация по документации`, async ({ page }) => {
      await page.goto(страница.path);
      const навигация = page.locator('.prev-next');

      await expect(навигация).toBeVisible();
      expect(await навигация.locator('a').count()).toBeGreaterThanOrEqual(1);
    });

    test(`ссылки назад и далее на странице «${страница.h1}» ведут на существующие страницы`, async ({ page, request }) => {
      await page.goto(страница.path);
      const hrefs = await page.locator('.prev-next a').evaluateAll((ссылки) => ссылки.map((ссылка) => ссылка.getAttribute('href')));

      for (const href of hrefs) {
        expect(href).toMatch(/^\//);
        const ответ = await request.get(href);
        expect(ответ.status(), `Не открылась ссылка ${href} со страницы ${страница.path}`).toBe(200);
      }
    });
  }

  test('цепочка документации начинается с «Начало работы» и заканчивается FAQ', async ({ page }) => {
    await page.goto('/getting-started/');
    await expect(page.locator('.prev-next')).toContainText('Процесс разработки');

    await page.goto('/faq/');
    await expect(page.locator('.prev-next')).toContainText('Поддержка и обновление');
    await expect(page.locator('.prev-next a')).toHaveCount(1);
  });
});
