import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

test.describe('Навигация — ссылки', () => {
  for (const страница of PUBLIC_PAGES) {
    test(`внешние ссылки на странице ${страница.path} безопасно открываются в новой вкладке`, async ({ page }) => {
      await page.goto(страница.path);
      const внешние = page.locator('a[target="_blank"]');
      expect(await внешние.count()).toBeGreaterThan(0);

      for (let индекс = 0; индекс < await внешние.count(); индекс += 1) {
        await expect(внешние.nth(индекс)).toHaveAttribute('rel', /noreferrer/);
      }
    });

    test(`внутренние ссылки со страницы ${страница.path} отвечают без ошибок`, async ({ page, request }) => {
      await page.goto(страница.path);
      const hrefs = await page.locator('a[href^="/"]').evaluateAll((ссылки) => [...new Set(ссылки.map((ссылка) => ссылка.getAttribute('href')).filter(Boolean))]);

      for (const href of hrefs) {
        const url = href.split('#')[0] || '/';
        const ответ = await request.get(url);
        expect(ответ.status(), `Не открылась ссылка ${href} со страницы ${страница.path}`).toBeLessThan(400);
      }
    });

    test(`локальные якоря на странице ${страница.path} указывают на существующие элементы`, async ({ page }) => {
      await page.goto(страница.path);
      const hrefs = await page.locator('a[href^="#"]').evaluateAll((ссылки) => [...new Set(ссылки.map((ссылка) => ссылка.getAttribute('href')).filter((href) => href && href.length > 1))]);

      for (const href of hrefs) {
        await expect(page.locator(href)).toHaveCount(1);
      }
    });
  }

  test('ссылка использования шаблона ведёт на GitHub Template', async ({ page }) => {
    await page.goto('/');
    const ссылка = page.getByRole('link', { name: 'Использовать шаблон' }).first();
    await expect(ссылка).toHaveAttribute('href', 'https://github.com/ai-development-harness/ai-development-harness-template/generate');
  });
});
