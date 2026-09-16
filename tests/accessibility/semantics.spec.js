import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

test.describe('Доступность — семантика публичных страниц', () => {
  for (const страница of PUBLIC_PAGES) {
    test(`страница ${страница.path} имеет корректные язык и основные landmarks`, async ({ page }) => {
      await page.goto(страница.path);

      await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
      await expect(page.locator('header.site-header')).toHaveCount(1);
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('footer.site-footer')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveCount(1);
    });

    test(`на странице ${страница.path} нет изображений без alt и пустых ссылок`, async ({ page }) => {
      await page.goto(страница.path);

      await expect(page.locator('img:not([alt])')).toHaveCount(0);
      await expect(page.locator('a:not([href])')).toHaveCount(0);
      await expect(page.locator('a[href=""]')).toHaveCount(0);
    });

    test(`на странице ${страница.path} нет скачков уровней заголовков`, async ({ page }) => {
      await page.goto(страница.path);
      const уровни = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((заголовки) => заголовки.map((заголовок) => Number(zаголовок.tagName.slice(1))));

      expect(уровни[0]).toBe(1);
      for (let индекс = 1; индекс < уровни.length; индекс += 1) {
        expect(уровни[индекс] - уровни[индекс - 1]).toBeLessThanOrEqual(1);
      }
    });

    test(`интерактивные кнопки на странице ${страница.path} имеют доступные имена`, async ({ page }) => {
      await page.goto(страница.path);
      const кнопки = page.locator('button');

      for (let индекс = 0; индекс < await кнопки.count(); индекс += 1) {
        const имя = await кнопки.nth(индекс).getAttribute('aria-label');
        const текст = (await кнопки.nth(индекс).innerText()).trim();
        expect(Boolean(имя?.trim() || текст)).toBeTruthy();
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
