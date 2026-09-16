import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

test.describe('Навигация — ссылки', () => {
  for (const publicPage of PUBLIC_PAGES) {
    test(`внешние ссылки на странице ${publicPage.path} безопасно открываются в новой вкладке`, async ({ page }) => {
      await page.goto(publicPage.path);
      const externalLinks = page.locator('a[target="_blank"]');
      expect(await externalLinks.count()).toBeGreaterThan(0);

      for (let index = 0; index < await externalLinks.count(); index += 1) {
        await expect(externalLinks.nth(index)).toHaveAttribute('rel', /noreferrer/);
      }
    });

    test(`внутренние ссылки со страницы ${publicPage.path} отвечают без ошибок`, async ({ page, request }) => {
      await page.goto(publicPage.path);
      const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) => [
        ...new Set(links.map((link) => link.getAttribute('href')).filter(Boolean)),
      ]);

      for (const href of hrefs) {
        const url = href.split('#')[0] || '/';
        const response = await request.get(url);
        expect(response.status(), `Не открылась ссылка ${href} со страницы ${publicPage.path}`).toBeLessThan(400);
      }
    });

    test(`локальные якоря на странице ${publicPage.path} указывают на существующие элементы`, async ({ page }) => {
      await page.goto(publicPage.path);
      const hrefs = await page.locator('a[href^="#"]').evaluateAll((links) => [
        ...new Set(links
          .map((link) => link.getAttribute('href'))
          .filter((href) => href && href.length > 1)),
      ]);

      for (const href of hrefs) {
        await expect(page.locator(href)).toHaveCount(1);
      }
    });
  }

  test('ссылка использования шаблона ведёт на GitHub Template', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('link', { name: 'Использовать шаблон' }).first();
    await expect(link).toHaveAttribute('href', 'https://github.com/ai-development-harness/ai-development-harness-template/generate');
  });
});
