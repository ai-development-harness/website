import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

const UNWANTED_PHRASES = [
  'руководство по старту',
  'Пошаговый старт',
  'Getting Started',
  'Durable handoff',
  'Micro-change',
  'Self-update',
];

const OBSOLETE_HARNESS_RELEASE_REFERENCES = ['v0.1.1', 'v0.1.2'];

test.describe('Контент — русская терминология', () => {
  for (const publicPage of PUBLIC_PAGES) {
    test(`страница ${publicPage.path} не содержит ранее выявленных неудачных калек`, async ({ page }) => {
      await page.goto(publicPage.path);
      const text = await page.locator('body').innerText();

      for (const phrase of UNWANTED_PHRASES) {
        expect(text).not.toContain(phrase);
      }
    });
  }

  test('раздел начала работы называется «Начало работы»', async ({ page }) => {
    await page.goto('/getting-started/');
    await expect(page.locator('h1')).toHaveText('Начало работы');
    await expect(page.locator('.breadcrumbs')).toContainText('Начало работы');
  });

  test('в навигации используется формулировка «Начало работы»', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.desktop-nav a[href="/getting-started/"]')).toHaveText('Начало работы');
    await expect(page.locator('.mobile-nav a[href="/getting-started/"]')).toHaveText('Начало работы');
  });



  test('публичные страницы не содержат одноразовые исторические release-переходы Harness', async ({ request }) => {
    for (const publicPage of PUBLIC_PAGES) {
      const response = await request.get(publicPage.path);
      const html = await response.text();

      for (const release of OBSOLETE_HARNESS_RELEASE_REFERENCES) {
        expect(html, `Устаревшая release-ссылка ${release} найдена на ${publicPage.path}`).not.toContain(release);
      }
    }
  });

  test('имена команд Harness остаются неизменными техническими идентификаторами', async ({ page }) => {
    await page.goto('/commands/');
    const text = await page.locator('article.article').innerText();

    for (const command of ['INIT PROJECT', 'ADD STEP:', 'RUN STEP-NNN', 'QUICK FIX:', 'CHECK HARNESS UPDATE', 'UPDATE HARNESS']) {
      expect(text).toContain(command);
    }
  });
});
