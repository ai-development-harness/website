import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';


const DEPRECATED_COMMAND_PATTERNS = [
  /\bINIT PROJECT\b/,
  /\bADD STEP\b/,
  /(?<!STEP )\bPLAN STEP(?:-[A-Z0-9]+)?\b/,
  /(?<!STEP )\bIMPLEMENT STEP(?:-[A-Z0-9]+)?\b/,
  /(?<!STEP )\bREVIEW STEP(?:-[A-Z0-9]+)?\b/,
  /(?<!STEP )\bFIX STEP(?:-[A-Z0-9]+)?\b/,
  /(?<!STEP )\bRUN STEP(?:-[A-Z0-9]+)?\b/,
  /(?<!STEP )\bAUDIT STEP(?:-[A-Z0-9]+)?\b/,
  /\bNEXT STEP\b/,
  /\bSTATUS PROJECT\b/,
  /\bRECONCILE PROJECT\b/,
  /(?<!PROJECT )\bQUICK FIX\b/,
  /\bFIND SKILL\b/,
  /\bINSTALL SKILL\b/,
  /\bCREATE SKILL\b/,
  /\bGENERATE GITHUB TEMPLATES\b/,
  /\bCHECK HARNESS UPDATE\b/,
  /\bUPDATE HARNESS\b/,
];

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


  for (const publicPage of PUBLIC_PAGES) {
    test(`страница ${publicPage.path} не содержит устаревших форм команд Harness`, async ({ page }) => {
      await page.goto(publicPage.path);
      const textNodes = await page.locator('body').evaluate((body) => {
        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
        const values = [];
        let node = walker.nextNode();

        while (node) {
          const value = node.nodeValue?.trim();
          if (value) values.push(value);
          node = walker.nextNode();
        }

        return values;
      });

      for (const textNode of textNodes) {
        for (const pattern of DEPRECATED_COMMAND_PATTERNS) {
          expect(textNode).not.toMatch(pattern);
        }
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

    for (const command of ['PROJECT INIT', 'STEP ADD:', 'STEP RUN STEP-NNN', 'PROJECT QUICK FIX:', 'HARNESS UPDATE CHECK', 'HARNESS UPDATE APPLY']) {
      expect(text).toContain(command);
    }
  });
});
