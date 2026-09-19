import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';


const CANONICAL_COMMAND_PATTERNS = [
  /\bPROJECT (?:INIT|STATUS|RECONCILE|QUICK FIX)\b/g,
  /\bSTEP (?:ADD|NEXT)\b/g,
  /\bSTEP (?:PLAN|IMPLEMENT|REVIEW|FIX|RUN|AUDIT)\b(?:\s+STEP-[A-Z0-9]+)?/g,
  /\bSKILL (?:FIND|INSTALL|CREATE)\b/g,
  /\bGITHUB GENERATE TEMPLATES\b/g,
  /\bRELEASE CHECK\b/g,
  /\bHARNESS UPDATE (?:CHECK|APPLY)\b/g,
  /\bGIT (?:CHECK|COMMIT|PUSH|PR|SYNC)\b/g,
];

const DEPRECATED_COMMAND_PATTERNS = [
  /\bINIT PROJECT\b/,
  /\bADD STEP\b/,
  /\bPLAN STEP(?:-[A-Z0-9]+)?\b/,
  /\bIMPLEMENT STEP(?:-[A-Z0-9]+)?\b/,
  /\bREVIEW STEP(?:-[A-Z0-9]+)?\b/,
  /\bFIX STEP(?:-[A-Z0-9]+)?\b/,
  /\bRUN STEP(?:-[A-Z0-9]+)?\b/,
  /\bAUDIT STEP(?:-[A-Z0-9]+)?\b/,
  /\bNEXT STEP\b/,
  /\bSTATUS PROJECT\b/,
  /\bRECONCILE PROJECT\b/,
  /\bQUICK FIX\b/,
  /\bFIND SKILL\b/,
  /\bINSTALL SKILL\b/,
  /\bCREATE SKILL\b/,
  /\bGENERATE GITHUB TEMPLATES\b/,
  /\bCHECK HARNESS UPDATE\b/,
  /\bUPDATE HARNESS\b/,
];

function stripCanonicalCommands(value) {
  return CANONICAL_COMMAND_PATTERNS.reduce(
    (result, pattern) => result.replace(pattern, ''),
    value,
  );
}

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
        const legacyCandidate = stripCanonicalCommands(textNode);

        for (const pattern of DEPRECATED_COMMAND_PATTERNS) {
          expect(legacyCandidate).not.toMatch(pattern);
        }
      }
    });
  }

  test('legacy-проверка отличает PROJECT QUICK FIX от старого QUICK FIX', async () => {
    expect(stripCanonicalCommands('PROJECT QUICK FIX: исправить опечатку')).not.toMatch(/\bQUICK FIX\b/);
    expect(stripCanonicalCommands('QUICK FIX: исправить опечатку')).toMatch(/\bQUICK FIX\b/);
  });

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
