import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

test.describe('Аналитика — Яндекс Метрика', () => {
  for (const publicPage of PUBLIC_PAGES) {
    test(`на localhost страница ${publicPage.path} не загружает Метрику`, async ({ page }) => {
      const metrikaRequests = [];
      page.on('request', (request) => {
        if (request.url().includes('mc.yandex.ru')) metrikaRequests.push(request.url());
      });

      await page.goto(publicPage.path);
      await page.waitForTimeout(300);

      expect(metrikaRequests).toHaveLength(0);
      expect(await page.evaluate(() => typeof window.ym)).toBe('undefined');
    });
  }

  test('код счётчика содержит нужный ID и защиту от локальных хостов', async ({ page }) => {
    await page.goto('/');
    const scriptTexts = await page.locator('script').allTextContents();
    const metrikaScript = scriptTexts.find((text) => text.includes('112703953'));

    expect(metrikaScript).toBeTruthy();
    expect(metrikaScript).toContain("'localhost'");
    expect(metrikaScript).toContain("'127.0.0.1'");
    expect(metrikaScript).toContain("'::1'");
    expect(metrikaScript).not.toContain('ecommerce');
  });

  test('noscript fallback содержит тот же ID счётчика', async ({ page }) => {
    await page.goto('/');
    const html = await page.content();
    expect(html).toContain('https://mc.yandex.ru/watch/112703953');
  });
});
