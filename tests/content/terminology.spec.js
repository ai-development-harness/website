import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

const НЕЖЕЛАТЕЛЬНЫЕ_ФРАЗЫ = [
  'руководство по старту',
  'Пошаговый старт',
  'Getting Started',
  'Durable handoff',
  'Micro-change',
  'Self-update',
];

test.describe('Контент — русская терминология', () => {
  for (const страница of PUBLIC_PAGES) {
    test(`страница ${страница.path} не содержит ранее выявленных неудачных калек`, async ({ page }) => {
      await page.goto(страница.path);
      const текст = await page.locator('body').innerText();

      for (const фраза of НЕЖЕЛАТЕЛЬНЫЕ_ФРАЗЫ) {
        expect(текст).not.toContain(фраза);
      }
    });
  }

  test('раздел Getting Started называется «Начало работы»', async ({ page }) => {
    await page.goto('/getting-started/');
    await expect(page.locator('h1')).toHaveText('Начало работы');
    await expect(page.locator('.breadcrumbs')).toContainText('Начало работы');
  });

  test('в навигации используется короткая формулировка «Как начать»', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.desktop-nav a[href="/getting-started/"]')).toHaveText('Как начать');
    await expect(page.locator('.mobile-nav a[href="/getting-started/"]')).toHaveText('Как начать');
  });

  test('имена команд Harness остаются неизменными техническими идентификаторами', async ({ page }) => {
    await page.goto('/commands/');
    const текст = await page.locator('article.article').innerText();

    for (const команда of ['INIT PROJECT', 'ADD STEP:', 'RUN STEP-NNN', 'QUICK FIX:', 'CHECK HARNESS UPDATE', 'UPDATE HARNESS']) {
      expect(текст).toContain(команда);
    }
  });
});
