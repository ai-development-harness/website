import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

test.describe('SEO — обнаружение страниц', () => {
  test('все публичные маршруты отвечают кодом 200', async ({ request }) => {
    for (const страница of PUBLIC_PAGES) {
      const ответ = await request.get(страница.path);
      expect(ответ.status(), `Маршрут ${страница.path} недоступен`).toBe(200);
    }
  });

  test('sitemap содержит все публичные canonical URL без дублей', async ({ request }) => {
    const ответ = await request.get('/sitemap.xml');
    expect(ответ.status()).toBe(200);
    const xml = await ответ.text();

    for (const страница of PUBLIC_PAGES) {
      expect(xml).toContain(`<loc>${страница.canonical}</loc>`);
    }

    const найденныеUrl = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((совпадение) => совпадение[1]);
    expect(найденныеUrl).toHaveLength(PUBLIC_PAGES.length);
    expect(new Set(найденныеUrl).size).toBe(PUBLIC_PAGES.length);
  });

  test('robots.txt разрешает индексацию и указывает sitemap', async ({ request }) => {
    const ответ = await request.get('/robots.txt');
    expect(ответ.status()).toBe(200);
    const robots = await ответ.text();

    expect(robots).toMatch(/User-agent:\s*\*/i);
    expect(robots).toMatch(/Allow:\s*\//i);
    expect(robots).toContain('https://ai-development-harness.ru/sitemap.xml');
  });
});
