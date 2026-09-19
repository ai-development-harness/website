import { test, expect } from '@playwright/test';

async function installClipboardStub(page) {
  await page.addInitScript(() => {
    window.__copiedText = null;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__copiedText = value;
        },
      },
    });
  });
}

test.describe('Копирование — команды Harness', () => {
  test.beforeEach(async ({ page }) => {
    await installClipboardStub(page);
    await page.goto('/commands/');
  });

  test('каждая карточка команды получает кнопку копирования', async ({ page }) => {
    const commandItems = page.locator('.command-item');
    const copyButtons = page.locator('.command-item > h3 .copy-button');

    expect(await commandItems.count()).toBeGreaterThan(10);
    await expect(copyButtons).toHaveCount(await commandItems.count());
  });

  test('копирует точный текст команды', async ({ page }) => {
    const item = page.locator('.command-item').filter({ hasText: 'PROJECT INIT' }).first();
    await item.getByRole('button', { name: /Копировать команду PROJECT INIT/ }).click();

    expect(await page.evaluate(() => window.__copiedText)).toBe('PROJECT INIT');
  });

  test('после успешного копирования показывает состояние «Скопировано»', async ({ page }) => {
    const button = page.locator('.command-item').filter({ hasText: 'PROJECT INIT' }).first().locator('.copy-button');
    await button.click();

    await expect(button).toHaveText('Скопировано');
    await expect(button).toHaveClass(/is-copied/);
  });

  test('кнопка не ломает стабильный якорь команды', async ({ page }) => {
    const item = page.locator('#command-step-add');

    await expect(item).toBeVisible();
    await expect(item.locator('code')).toContainText('STEP ADD');
    await expect(item.locator('.copy-button')).toBeVisible();
  });
});

test.describe('Копирование — исполняемые блоки кода', () => {
  test.beforeEach(async ({ page }) => {
    await installClipboardStub(page);
  });

  test('добавляет кнопку к shell-команде', async ({ page }) => {
    await page.goto('/getting-started/');
    const block = page.locator('.code-block').filter({ hasText: 'cp PROJECT_BRIEF.example.md' });

    await expect(block.locator(':scope > .copy-button')).toBeVisible();
  });

  test('копирует многострочный блок без изменения содержимого', async ({ page }) => {
    await page.goto('/getting-started/');
    const block = page.locator('#git .code-block');
    const expectedText = (await block.locator('pre code').innerText()).trim();

    await block.locator(':scope > .copy-button').click();
    expect(await page.evaluate(() => window.__copiedText)).toBe(expectedText);
  });

  test('не добавляет кнопку к архитектурной ASCII-схеме', async ({ page }) => {
    await page.goto('/architecture/');
    const block = page.locator('.code-block').filter({ hasText: 'HARNESS / PROTOCOL' });

    await expect(block).toBeVisible();
    await expect(block.locator(':scope > .copy-button')).toHaveCount(0);
  });

  test('стили кнопки копирования подключаются с общим revision', async ({ page }) => {
    await page.goto('/commands/');
    const href = await page.locator('link[data-copy-styles]').getAttribute('href');
    const mainScript = await page.locator('script[src^="/js/main.js?v="]').getAttribute('src');

    expect(href).toMatch(/^\/css\/copy\.css\?v=[a-z0-9]+$/);
    expect(href.split('?v=')[1]).toBe(mainScript.split('?v=')[1]);
  });
});
