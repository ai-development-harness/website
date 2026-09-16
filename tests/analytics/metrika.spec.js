import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

test.describe('Аналитика — Яндекс Метрика', () => {
  for (const страница of PUBLIC_PAGES) {
    test(`на localhost страница ${страница.path} не загружает Метрику`, async ({ page }) => {
      const запросыМетрики = [];
      page.on('request', (request) => {
        if (request.url().includes('mc.yandex.ru')) запросыМетрики.push(request.url());
      });

      await page.goto(страница.path);
      await page.waitForTimeout(300);

      expect(запросыМетрики).toHaveLength(0);
      expect(await page.evaluate(() => typeof window.ym)).toBe('undefined');
    });
  }

  test('код счётчика содержит нужный ID и защиту от локальных хостов', async ({ page }) => {
    await page.goto('/');
    const текстыСкриптов = await page.locator('script').allTextContents();
    const метрика = текстыСкриптов.find((текст) => текст.includes('112703953'));

    expect(метрика).toBeTruthy();
    expect(метрика).toContain("'localhost'");
    expect(метрика).toContain("'127.0.0.1'");
    expect(метрика).toContain("'::1'");
    expect(метрика).not.toContain('ecommerce');
  });

  test('noscript fallback содержит тот же ID счётчика', async ({ page }) => {
    await page.goto('/');
    const html = await page.content();
    expect(html).toContain('https://mc.yandex.ru/watch/112703953');
  });
});
