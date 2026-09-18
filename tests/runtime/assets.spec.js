import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

const LOCAL_ORIGIN = 'http://127.0.0.1:4173';

const RESOURCES = [
  '/css/styles.css',
  '/css/styles-site.css',
  '/css/styles-docs.css',
  '/css/styles-responsive.css',
  '/css/styles-hero-redesign.css',
  '/css/search.css',
  '/css/copy.css',
  '/css/theme.css',
  '/js/main.js',
  '/js/search.js',
  '/js/theme-init.js',
  '/js/theme.js',
  '/assets/mark.svg',
  '/assets/favicon.svg',
  '/assets/social-card.svg',
];

async function isolateFromExternalNetwork(page) {
  await page.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());

    if (requestUrl.origin === LOCAL_ORIGIN) {
      await route.continue();
      return;
    }

    // Smoke-тесты проверяют только наш runtime и локальные ресурсы. Любые
    // сторонние скрипты, пиксели и API здесь изолируются, чтобы результат теста
    // не зависел от сети, rate limits или доступности внешних сервисов.
    await route.fulfill({ status: 204, body: '' });
  });
}

test.describe('Выполнение страницы — загрузка и статические ресурсы', () => {
  test('основные статические ресурсы доступны', async ({ request }) => {
    for (const path of RESOURCES) {
      const response = await request.get(path);
      expect(response.status(), `Не загрузился ресурс ${path}`).toBe(200);
    }
  });

  for (const publicPage of PUBLIC_PAGES) {
    test(`страница ${publicPage.path} не создаёт ошибок JavaScript`, async ({ page }) => {
      const pageErrors = [];
      const consoleErrors = [];

      await isolateFromExternalNetwork(page);

      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      await page.goto(publicPage.path);
      await page.waitForTimeout(250);

      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });

    test(`страница ${publicPage.path} не получает ошибочные ответы со своего домена`, async ({ page }) => {
      const failedResponses = [];

      await isolateFromExternalNetwork(page);

      page.on('response', (response) => {
        const url = new URL(response.url());
        if (url.origin === LOCAL_ORIGIN && response.status() >= 400) {
          failedResponses.push({ url: response.url(), status: response.status() });
        }
      });

      await page.goto(publicPage.path);
      await page.waitForLoadState('networkidle');
      expect(failedResponses).toEqual([]);
    });
  }
});
