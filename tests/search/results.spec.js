import { test, expect } from '@playwright/test';

async function openSearch(page) {
  await page.goto('/');
  await page.keyboard.press('Control+K');
  await expect(page.locator('.search-input')).toBeEnabled();
}

async function searchFor(page, query) {
  const input = page.locator('.search-input');
  await input.fill(query);
  await expect(page.locator('.search-status')).not.toContainText('Загружаю');
  return page.locator('.search-result');
}

test.describe('Поиск — результаты', () => {
  test('находит точную команду STEP ADD и поднимает её в начало', async ({ page }) => {
    await openSearch(page);
    const results = await searchFor(page, 'STEP ADD');

    await expect(results.first().locator('.search-result__title')).toContainText('STEP ADD');
    await expect(results.first().locator('.search-result__meta')).toContainText('Команда');
  });

  test('находит техническое имя PROJECT_BRIEF.local.md', async ({ page }) => {
    await openSearch(page);
    const results = await searchFor(page, 'PROJECT_BRIEF.local.md');

    await expect(results.first()).toBeVisible();
    await expect(page.locator('.search-results')).toContainText('PROJECT_BRIEF.local.md');
  });

  test('находит русский термин по содержимому документации', async ({ page }) => {
    await openSearch(page);
    const results = await searchFor(page, 'самообновление');

    await expect(results.first()).toBeVisible();
    await expect(page.locator('.search-results')).toContainText(/обновлен/i);
  });

  test('ищет без учёта регистра', async ({ page }) => {
    await openSearch(page);
    const upperCaseResults = await searchFor(page, 'HARNESS UPDATE');
    const firstHref = await upperCaseResults.first().getAttribute('href');

    const lowerCaseResults = await searchFor(page, 'harness update');
    await expect(lowerCaseResults.first()).toHaveAttribute('href', firstHref);
  });

  test('многословный запрос учитывает все значимые слова', async ({ page }) => {
    await openSearch(page);
    const results = await searchFor(page, 'обновление Harness');

    await expect(results.first()).toBeVisible();
    await expect(page.locator('.search-results')).toContainText(/Harness/i);
    await expect(page.locator('.search-results')).toContainText(/обновлен/i);
  });

  test('ограничивает выдачу восемью результатами', async ({ page }) => {
    await openSearch(page);
    const results = await searchFor(page, 'проект');

    expect(await results.count()).toBeLessThanOrEqual(8);
    expect(await results.count()).toBeGreaterThan(0);
  });

  test('показывает понятное сообщение при отсутствии результатов', async ({ page }) => {
    await openSearch(page);
    const results = await searchFor(page, 'совершенно-несуществующий-запрос-987654');

    await expect(results).toHaveCount(0);
    await expect(page.locator('.search-status')).toContainText('ничего не найдено');
  });

  test('подсвечивает точное совпадение в заголовке результата', async ({ page }) => {
    await openSearch(page);
    const results = await searchFor(page, 'STEP ADD');

    await expect(results.first().locator('.search-result__title mark')).toHaveText('STEP ADD');
  });

  test('результат команды ведёт непосредственно к найденной команде', async ({ page }) => {
    await openSearch(page);
    const results = await searchFor(page, 'STEP ADD');

    await expect(results.first()).toHaveAttribute('href', '/commands/#command-step-add');
  });

  test('переходит к конкретной команде и закрывает диалог', async ({ page }) => {
    await openSearch(page);
    const results = await searchFor(page, 'STEP ADD');
    await results.first().click();

    await expect(page).toHaveURL(/\/commands\/#command-step-add$/);
    await expect(page.locator('#command-step-add')).toBeVisible();
    await expect(page.locator('#command-step-add code')).toContainText('STEP ADD');
    await expect(page.locator('.search-dialog')).not.toHaveAttribute('open', '');
  });

  test('при пустом запросе не показывает случайные результаты', async ({ page }) => {
    await openSearch(page);

    await expect(page.locator('.search-result')).toHaveCount(0);
    await expect(page.locator('.search-status')).toContainText('Введите запрос');
  });
});
