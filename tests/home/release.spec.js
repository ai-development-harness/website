import { test, expect } from '@playwright/test';

const API_URL = 'https://api.github.com/repos/ai-development-harness/ai-development-harness-template/releases/latest';
const FALLBACK_URL = 'https://github.com/ai-development-harness/ai-development-harness-template/releases/latest';
const MOCK_RELEASE_URL = 'https://github.com/ai-development-harness/ai-development-harness-template/releases/tag/v9.9.9';

test.describe('Главная страница — последний релиз Harness', () => {
  test('подставляет последний опубликованный релиз из GitHub API', async ({ page }) => {
    await page.route(API_URL, (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tag_name: 'v9.9.9', html_url: MOCK_RELEASE_URL }),
    }));

    await page.goto('/');

    const release = page.locator('[data-latest-release]');
    await expect(release).toHaveText('Latest release: v9.9.9 →');
    await expect(release).toHaveAttribute('href', MOCK_RELEASE_URL);
  });

  test('оставляет стабильный fallback при недоступном GitHub API', async ({ page }) => {
    await page.route(API_URL, (route) => route.fulfill({ status: 503, body: '' }));

    await page.goto('/');

    const release = page.locator('[data-latest-release]');
    await expect(release).toHaveText('Latest release →');
    await expect(release).toHaveAttribute('href', FALLBACK_URL);
  });

  test('использует часовой кеш и не повторяет API-запрос при перезагрузке', async ({ page }) => {
    let requestCount = 0;
    await page.route(API_URL, (route) => {
      requestCount += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tag_name: 'v9.9.9', html_url: MOCK_RELEASE_URL }),
      });
    });

    await page.goto('/');
    await expect(page.locator('[data-latest-release]')).toHaveText('Latest release: v9.9.9 →');
    await page.reload();
    await expect(page.locator('[data-latest-release]')).toHaveText('Latest release: v9.9.9 →');

    expect(requestCount).toBe(1);
  });
});
