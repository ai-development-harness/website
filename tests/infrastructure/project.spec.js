import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const ci = readFileSync('.github/workflows/ci.yml', 'utf8');

test.describe('Инфраструктура — пакетный менеджер и CI', () => {
  test('проект зафиксирован на Yarn Classic', async () => {
    expect(packageJson.packageManager).toBe('yarn@1.22.22');
    expect(existsSync('yarn.lock')).toBeTruthy();
    expect(existsSync('package-lock.json')).toBeFalsy();
  });

  test('npm не используется в scripts package.json', async () => {
    const scripts = Object.values(packageJson.scripts ?? {}).join('\n');
    expect(scripts).not.toMatch(/\bnpm\b/);
    expect(packageJson.scripts.dev).toContain('yarn dev:server');
    expect(packageJson.scripts.dev).toContain('yarn dev:open');
  });

  test('CI устанавливает зависимости через frozen yarn.lock', async () => {
    expect(ci).toContain('yarn install --frozen-lockfile');
    expect(ci).not.toMatch(/npm (ci|install)/);
  });

  test('CI запускает тесты через Yarn', async () => {
    expect(ci).toMatch(/yarn test/);
  });

  test('Playwright preview запускается через Yarn', async () => {
    const конфиг = readFileSync('playwright.config.js', 'utf8');
    expect(конфиг).toContain("command: 'yarn preview'");
  });
});
