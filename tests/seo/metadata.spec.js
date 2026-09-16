import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

test.describe('SEO — метаданные публичных страниц', () => {
  for (const publicPage of PUBLIC_PAGES) {
    test(`страница ${publicPage.path} содержит корректный канонический URL и директиву robots`, async ({ page }) => {
      await page.goto(publicPage.path);

      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', publicPage.canonical);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index,follow/i);
    });

    test(`страница ${publicPage.path} содержит заполненные заголовок и описание`, async ({ page }) => {
      await page.goto(publicPage.path);

      const title = await page.title();
      const description = await page.locator('meta[name="description"]').getAttribute('content');

      expect(title.length).toBeGreaterThanOrEqual(10);
      expect(title.length).toBeLessThanOrEqual(100);
      expect(description?.length ?? 0).toBeGreaterThanOrEqual(60);
      expect(description?.length ?? 0).toBeLessThanOrEqual(220);
    });

    test(`страница ${publicPage.path} содержит метаданные Open Graph и Twitter Card`, async ({ page }) => {
      await page.goto(publicPage.path);

      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/);
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', publicPage.canonical);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https:\/\/ai-development-harness\.ru\//);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', /.+/);
      await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', /.+/);
      await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', /^https:\/\/ai-development-harness\.ru\//);
    });

    test(`страница ${publicPage.path} содержит валидный JSON-LD`, async ({ page }) => {
      await page.goto(publicPage.path);
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();

      expect(blocks.length).toBeGreaterThanOrEqual(1);
      for (const block of blocks) {
        expect(() => JSON.parse(block)).not.toThrow();
      }
    });
  }

  test('заголовки и описания не повторяются между публичными страницами', async ({ page }) => {
    const titles = [];
    const descriptions = [];

    for (const publicPage of PUBLIC_PAGES) {
      await page.goto(publicPage.path);
      titles.push(await page.title());
      descriptions.push(await page.locator('meta[name="description"]').getAttribute('content'));
    }

    expect(new Set(titles).size).toBe(PUBLIC_PAGES.length);
    expect(new Set(descriptions).size).toBe(PUBLIC_PAGES.length);
  });
});
