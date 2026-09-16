import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES, DOC_PAGES, isDesktop } from '../helpers/site.js';

test.describe('Адаптивность — геометрия страниц', () => {
  for (const publicPage of PUBLIC_PAGES) {
    test(`страница ${publicPage.path} не имеет горизонтального переполнения`, async ({ page }) => {
      await page.goto(publicPage.path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test(`основной заголовок страницы ${publicPage.path} полностью помещается в области экрана`, async ({ page }) => {
      await page.goto(publicPage.path);
      const box = await page.locator('h1').boundingBox();
      const viewport = page.viewportSize();

      expect(box).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    });
  }

  for (const docPage of DOC_PAGES) {
    test(`оглавление страницы ${docPage.path} соответствует размеру экрана`, async ({ page }, testInfo) => {
      await page.goto(docPage.path);

      if (isDesktop(testInfo)) {
        await expect(page.locator('.toc')).toBeVisible();
      } else {
        await expect(page.locator('.toc')).toBeHidden();
      }
    });
  }

  test('главный экран располагает текст и процесс рядом только на широком экране', async ({ page }, testInfo) => {
    await page.goto('/');
    const heroCopy = await page.locator('.hero-copy').boundingBox();
    const processPanel = await page.locator('.memory-map').boundingBox();

    expect(heroCopy).not.toBeNull();
    expect(processPanel).not.toBeNull();

    if (isDesktop(testInfo)) {
      expect(processPanel.x).toBeGreaterThan(heroCopy.x + heroCopy.width - 20);
      expect(Math.abs(processPanel.y - heroCopy.y)).toBeLessThan(80);
    } else {
      expect(processPanel.y).toBeGreaterThan(heroCopy.y + heroCopy.height - 10);
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

  test('финальный призыв к действию не выходит за границы экрана', async ({ page }) => {
    await page.goto('/');
    const box = await page.locator('.cta-box').boundingBox();
    const viewport = page.viewportSize();

    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  });
});
