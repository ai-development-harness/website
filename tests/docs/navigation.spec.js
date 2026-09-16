import { test, expect } from '@playwright/test';
import { DOC_PAGES } from '../helpers/site.js';

test.describe('Документация — навигация между страницами', () => {
  for (const docPage of DOC_PAGES) {
    test(`на странице «${docPage.h1}» присутствует навигация по документации`, async ({ page }) => {
      await page.goto(docPage.path);
      const navigation = page.locator('.prev-next');

      await expect(navigation).toBeVisible();
      expect(await navigation.locator('a').count()).toBeGreaterThanOrEqual(1);
    });

    test(`ссылки назад и далее на странице «${docPage.h1}» ведут на существующие страницы`, async ({ page, request }) => {
      await page.goto(docPage.path);
      const hrefs = await page.locator('.prev-next a')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')));

      for (const href of hrefs) {
        expect(href).toMatch(/^\//);
        const response = await request.get(href);
        expect(response.status(), `Не открылась ссылка ${href} со страницы ${docPage.path}`).toBe(200);
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
