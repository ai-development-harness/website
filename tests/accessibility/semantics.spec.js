import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

test.describe('Доступность — семантика публичных страниц', () => {
  for (const publicPage of PUBLIC_PAGES) {
    test(`страница ${publicPage.path} имеет корректный язык и основные области страницы`, async ({ page }) => {
      await page.goto(publicPage.path);

      await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
      await expect(page.locator('header.site-header')).toHaveCount(1);
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('footer.site-footer')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveCount(1);
    });

    test(`на странице ${publicPage.path} нет изображений без alt и пустых ссылок`, async ({ page }) => {
      await page.goto(publicPage.path);

      await expect(page.locator('img:not([alt])')).toHaveCount(0);
      await expect(page.locator('a:not([href])')).toHaveCount(0);
      await expect(page.locator('a[href=""]')).toHaveCount(0);
    });

    test(`на странице ${publicPage.path} нет скачков уровней заголовков`, async ({ page }) => {
      await page.goto(publicPage.path);
      const levels = await page.locator('h1, h2, h3, h4, h5, h6')
        .evaluateAll((headings) => headings.map((heading) => Number(heading.tagName.slice(1))));

      expect(levels[0]).toBe(1);
      for (let index = 1; index < levels.length; index += 1) {
        expect(levels[index] - levels[index - 1]).toBeLessThanOrEqual(1);
      }
    });

    test(`интерактивные кнопки на странице ${publicPage.path} имеют доступные имена`, async ({ page }) => {
      await page.goto(publicPage.path);
      const buttons = page.locator('button');

      for (let index = 0; index < await buttons.count(); index += 1) {
        const ariaLabel = await buttons.nth(index).getAttribute('aria-label');
        const text = (await buttons.nth(index).innerText()).trim();
        expect(Boolean(ariaLabel?.trim() || text)).toBeTruthy();
      }
    });
  }

  test('кнопка мобильного меню сообщает состояние через aria-expanded', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.menu-button')).toHaveAttribute('aria-expanded', /^(true|false)$/);
    await expect(page.locator('.menu-button')).toHaveAttribute('aria-controls', 'mobile-nav');
    await expect(page.locator('.menu-button')).toHaveAttribute('aria-label', /меню/i);
  });
});
