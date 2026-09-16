import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

const TEMPLATE_GENERATE_URL = 'https://github.com/ai-development-harness/ai-development-harness-template/generate';

test.describe('Контент — согласованные формулировки', () => {
  test('главная использует согласованный текст короткого пути', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Для небольших изменений с низким риском Harness оставляет короткий путь. Если правка меняет поведение, API, данные, безопасность, архитектуру или зависимости — выполнение прекращается.')).toBeVisible();
  });

  test('главная называет раздел документации простым языком', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Документация простым языком' })).toBeVisible();
  });

  test('финальный призыв на главной использует согласованную формулировку', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Начните с описания проекта. Остальную структуру Harness соберёт в репозитории сам.' })).toBeVisible();
  });

  test('начало работы объясняет создание репозитория и даёт прямую ссылку', async ({ page }) => {
    await page.goto('/getting-started/');
    const section = page.locator('#create');

    await expect(section).toContainText('GitHub создаст отдельный репозиторий вашего проекта с готовой структурой Harness.');
    await expect(section.getByRole('link', { name: 'открыть форму создания репозитория на GitHub' })).toHaveAttribute('href', TEMPLATE_GENERATE_URL);
  });

  for (const publicPage of PUBLIC_PAGES) {
    test(`на странице ${publicPage.path} в футере указан копирайт вместо домена`, async ({ page }) => {
      await page.goto(publicPage.path);
      const footer = page.locator('.site-footer');

      await expect(footer.getByText('© 2026 AI Development Harness', { exact: true })).toBeVisible();
      await expect(footer.getByText('ai-development-harness.ru', { exact: true })).toHaveCount(0);
    });
  }
});
