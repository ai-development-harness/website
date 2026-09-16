import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES, DOC_PAGES, isDesktop } from '../helpers/site.js';

test.describe('Адаптивность — геометрия страниц', () => {
  for (const страница of PUBLIC_PAGES) {
    test(`страница ${страница.path} не имеет горизонтального переполнения`, async ({ page }) => {
      await page.goto(страница.path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test(`основной заголовок страницы ${страница.path} полностью помещается в viewport`, async ({ page }) => {
      await page.goto(страница.path);
      const box = await page.locator('h1').boundingBox();
      const viewport = page.viewportSize();

      expect(box).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    });
  }

  for (const страница of DOC_PAGES) {
    test(`оглавление страницы ${страница.path} соответствует размеру экрана`, async ({ page }, testInfo) => {
      await page.goto(страница.path);

      if (isDesktop(testInfo)) {
        await expect(page.locator('.toc')).toBeVisible();
      } else {
        await expect(page.locator('.toc')).toBeHidden();
      }
    });
  }

  test('главный экран располагает текст и процесс рядом только на широком экране', async ({ page }, testInfo) => {
    await page.goto('/');
    const текст = await page.locator('.hero-copy').boundingBox();
    const процесс = await page.locator('.memory-map').boundingBox();

    expect(текст).not.toBeNull();
    expect(процесс).not.toBeNull();

    if (isDesktop(testInfo)) {
      expect(процесс.x).toBeGreaterThan(текст.x + текст.width - 20);
      expect(Math.abs(процесс.y - текст.y)).toBeLessThan(80);
    } else {
      expect(процесс.y).toBeGreaterThan(текст.y + текст.height - 10);
    }
  });

  test('терминал полностью помещается по ширине экрана', async ({ page }) => {
    await page.goto('/');
    const box = await page.locator('.terminal-panel').boundingBox();
    const viewport = page.viewportSize();

    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  });

  test('CTA не выходит за границы viewport', async ({ page }) => {
    await page.goto('/');
    const box = await page.locator('.cta-box').boundingBox();
    const viewport = page.viewportSize();

    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  });
});
