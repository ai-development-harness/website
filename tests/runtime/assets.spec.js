import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

const РЕСУРСЫ = [
  '/styles.css',
  '/styles-site.css',
  '/styles-docs.css',
  '/styles-responsive.css',
  '/styles-hero-redesign.css',
  '/main.js',
  '/assets/mark.svg',
  '/assets/favicon.svg',
  '/assets/social-card.svg',
];

test.describe('Выполнение страницы — загрузка и статические ресурсы', () => {
  test('основные статические ресурсы доступны', async ({ request }) => {
    for (const путь of РЕСУРСЫ) {
      const ответ = await request.get(путь);
      expect(ответ.status(), `Не загрузился ресурс ${путь}`).toBe(200);
    }
  });

  for (const страница of PUBLIC_PAGES) {
    test(`страница ${страница.path} не создаёт ошибок JavaScript`, async ({ page }) => {
      const ошибкиСтраницы = [];
      const ошибкиКонсоли = [];

      page.on('pageerror', (ошибка) => ошибкиСтраницы.push(ошибка.message));
      page.on('console', (сообщение) => {
        if (сообщение.type() === 'error') ошибкиКонсоли.push(сообщение.text());
      });

      await page.goto(страница.path);
      await page.waitForTimeout(250);

      expect(ошибкиСтраницы).toEqual([]);
      expect(ошибкиКонсоли).toEqual([]);
    });

    test(`страница ${страница.path} не получает ошибочные ответы со своего домена`, async ({ page }) => {
      const ошибки = [];

      page.on('response', (response) => {
        const url = new URL(response.url());
        if (url.origin === 'http://127.0.0.1:4173' && response.status() >= 400) {
          ошибки.push({ url: response.url(), status: response.status() });
        }
      });

      await page.goto(страница.path);
      await page.waitForLoadState('networkidle');
      expect(ошибки).toEqual([]);
    });
  }
});
