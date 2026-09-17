import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

const NEXT_PAGE = new Map([
  ['/', '/getting-started/'],
  ['/getting-started/', '/workflow/'],
  ['/workflow/', '/commands/'],
  ['/commands/', '/architecture/'],
  ['/architecture/', '/runtimes/'],
  ['/runtimes/', '/repository/'],
  ['/repository/', '/maintenance/'],
  ['/maintenance/', '/faq/'],
]);

test.describe('Resource hints для загрузки и следующей навигации', () => {
  for (const publicPage of PUBLIC_PAGES) {
    test(`страница ${publicPage.path} оптимизирует только действительно нужные ресурсы`, async ({ page }) => {
      await page.goto(publicPage.path);

      // Yandex.Metrika — единственный внешний script-origin на каждой странице.
      await expect(page.locator('link[rel="preconnect"][href="https://mc.yandex.ru"]')).toHaveCount(1);

      // copy.css браузер иначе узнаёт только после выполнения main.js. Preload
      // должен быть ровно на тех страницах, где main.js реально создаёт Copy UI.
      const copyButtonCount = await page.locator('.copy-button').count();
      const copyStylesPreload = page.locator('link[rel="preload"][as="style"][href^="/css/copy.css?v="]');
      await expect(copyStylesPreload).toHaveCount(copyButtonCount > 0 ? 1 : 0);

      // Предзагружаем только один наиболее вероятный следующий документ, чтобы
      // не расходовать трафик на все ссылки страницы.
      const nextPage = NEXT_PAGE.get(publicPage.path);
      const documentPrefetch = page.locator('link[rel="prefetch"][as="document"]');
      if (nextPage) {
        await expect(documentPrefetch).toHaveCount(1);
        await expect(documentPrefetch).toHaveAttribute('href', nextPage);
      } else {
        await expect(documentPrefetch).toHaveCount(0);
      }
    });
  }

  test('главная заранее открывает соединение с GitHub Releases API', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="preconnect"][href="https://api.github.com"]')).toHaveCount(1);
  });
});
