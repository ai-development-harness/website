import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

const identifiers = new Set(['harness.lock.json', 'execution-status.json', 'execution-status.lock']);

// Имена файлов проверяются и вне code: ошибка перевода однажды попала в summary FAQ.
// Отрицательная проверка слева исключает домен ai-development-harness.ru.
const identifierPattern = /(?<![\w-])(?:harness|execution-status)\.[\wА-Яа-яЁё.]+/g;

function collectIdentifiers(source) {
  return [...source.matchAll(identifierPattern)].map((match) => match[0].replace(/\.+$/, ''));
}

test.describe('Контент — сохранность технических имён', () => {
  test('перевод не меняет имена файлов ни на одной публичной странице', () => {
    for (const entry of PUBLIC_PAGES) {
      const url = new URL(`../../www${entry.path}index.html`, import.meta.url);
      const source = readFileSync(url, 'utf8');
      for (const identifier of collectIdentifiers(source)) {
        expect(identifiers.has(identifier), `${entry.path}: ${identifier}`).toBeTruthy();
      }
    }
  });

  test('проверка обнаруживает перевод имени в обычном тексте и заголовке', () => {
    for (const sample of ['harness.файл состояния.json', '<summary>execution-status.файл состояния</summary>']) {
      expect(collectIdentifiers(sample).some((identifier) => !identifiers.has(identifier))).toBeTruthy();
    }
  });

  test('FAQ сохраняет точное имя файла состояния обновления', async ({ page }) => {
    await page.goto('/faq/');
    const question = page.locator('.faq-item summary').filter({ hasText: 'Что если проект старый' });
    await expect(question.locator('code')).toHaveText('harness.lock.json');
  });
});
