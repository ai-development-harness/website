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

  test('имена команд Harness остаются неизменными техническими идентификаторами', async ({ page }) => {
    await page.goto('/commands/');
    const text = await page.locator('article.article').innerText();

    for (const command of ['INIT PROJECT', 'ADD STEP:', 'RUN STEP-NNN', 'QUICK FIX:', 'CHECK HARNESS UPDATE', 'UPDATE HARNESS']) {
      expect(text).toContain(command);
    }
  });
});
