import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

test.describe('SEO — обнаружение страниц', () => {
  test('все публичные маршруты отвечают кодом 200', async ({ request }) => {
    for (const publicPage of PUBLIC_PAGES) {
      const response = await request.get(publicPage.path);
      expect(response.status(), `Маршрут ${publicPage.path} недоступен`).toBe(200);
    }
  });

  test('sitemap содержит все публичные canonical URL без дублей', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();

    for (const publicPage of PUBLIC_PAGES) {
      expect(xml).toContain(`<loc>${publicPage.canonical}</loc>`);
    }

    const foundUrls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
    expect(foundUrls).toHaveLength(PUBLIC_PAGES.length);
    expect(new Set(foundUrls).size).toBe(PUBLIC_PAGES.length);
  });

  test('robots.txt разрешает индексацию и указывает sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const robots = await response.text();

    expect(robots).toMatch(/User-agent:\s*\*/i);
    expect(robots).toMatch(/Allow:\s*\//i);
    expect(robots).toContain('https://ai-development-harness.ru/sitemap.xml');
  });
});
