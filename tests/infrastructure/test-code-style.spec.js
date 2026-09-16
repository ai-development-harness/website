import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const TESTS_DIR = 'tests';
const CYRILLIC = /[А-Яа-яЁё]/;

function filesRecursively(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesRecursively(path) : [path];
  });
}

function toUnixPath(path) {
  return relative('.', path).split(sep).join('/');
}

function collectCyrillicIdentifiers(source) {
  const findings = [];

  const declarationPattern = /\b(?:const|let|var|function|class)\s+([A-Za-z_$А-Яа-яЁё][A-Za-z0-9_$А-Яа-яЁё]*)/g;
  for (const match of source.matchAll(declarationPattern)) {
    if (CYRILLIC.test(match[1])) findings.push(match[1]);
  }

  const singleArrowParameterPattern = /\b([A-Za-z_$А-Яа-яЁё][A-Za-z0-9_$А-Яа-яЁё]*)\s*=>/g;
  for (const match of source.matchAll(singleArrowParameterPattern)) {
    if (CYRILLIC.test(match[1])) findings.push(match[1]);
  }

  const arrowParametersPattern = /\(([^()\n]*)\)\s*=>/g;
  for (const match of source.matchAll(arrowParametersPattern)) {
    const identifiers = match[1].match(/[A-Za-z_$А-Яа-яЁё][A-Za-z0-9_$А-Яа-яЁё]*/g) || [];
    findings.push(...identifiers.filter((identifier) => CYRILLIC.test(identifier)));
  }

  const catchParameterPattern = /\bcatch\s*\(\s*([A-Za-z_$А-Яа-яЁё][A-Za-z0-9_$А-Яа-яЁё]*)\s*\)/g;
  for (const match of source.matchAll(catchParameterPattern)) {
    if (CYRILLIC.test(match[1])) findings.push(match[1]);
  }

  return [...new Set(findings)];
}

function collectTestTitles(source) {
  const titles = [];
  const titlePattern = /\btest(?:\.describe)?\(\s*([`'"])(.*?)\1/gms;

  for (const match of source.matchAll(titlePattern)) {
    titles.push(match[2]);
  }

  return titles;
}

test.describe('Инфраструктура — стиль кода тестов', () => {
  test('идентификаторы в тестовом JavaScript пишутся на английском', async () => {
    const violations = filesRecursively(TESTS_DIR)
      .filter((path) => path.endsWith('.js'))
      .flatMap((path) => {
        const identifiers = collectCyrillicIdentifiers(readFileSync(path, 'utf8'));
        return identifiers.map((identifier) => `${toUnixPath(path)}: ${identifier}`);
      });

    expect(violations).toEqual([]);
  });

  test('названия test и describe содержат русский текст', async () => {
    const violations = filesRecursively(TESTS_DIR)
      .filter((path) => path.endsWith('.js'))
      .flatMap((path) => {
        const titles = collectTestTitles(readFileSync(path, 'utf8'));
        return titles
          .filter((title) => !CYRILLIC.test(title))
          .map((title) => `${toUnixPath(path)}: ${title}`);
      });

    expect(violations).toEqual([]);
  });
});
