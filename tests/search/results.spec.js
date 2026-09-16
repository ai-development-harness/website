import { test, expect } from '@playwright/test';

async function открытьПоиск(page) {
  await page.goto('/');
  await page.keyboard.press('Control+K');
  await expect(page.locator('.search-input')).toBeEnabled();
}

async function найти(page, запрос) {
  const поле = page.locator('.search-input');
  await поле.fill(запрос);
  await expect(page.locator('.search-status')).not.toContainText('Загружаю');
  return page.locator('.search-result');
}

test.describe('Поиск — результаты', () => {
  test('находит точную команду ADD STEP и поднимает её в начало', async ({ page }) => {
    await открытьПоиск(page);
    const результаты = await найти(page, 'ADD STEP');

    await expect(результаты.first().locator('.search-result__title')).toContainText('ADD STEP');
    await expect(результаты.first().locator('.search-result__meta')).toContainText('Команда');
  });

  test('находит техническое имя PROJECT_BRIEF.local.md', async ({ page }) => {
    await открытьПоиск(page);
    const результаты = await найти(page, 'PROJECT_BRIEF.local.md');

    await expect(результаты.first()).toBeVisible();
    await expect(page.locator('.search-results')).toContainText('PROJECT_BRIEF.local.md');
  });

  test('находит русский термин по содержимому документации', async ({ page }) => {
    await открытьПоиск(page);
    const результаты = await найти(page, 'самообновление');

    await expect(результаты.first()).toBeVisible();
    await expect(page.locator('.search-results')).toContainText(/обновлен/i);
  });

  test('ищет без учёта регистра', async ({ page }) => {
    await открытьПоиск(page);
    const верхнийРегистр = await найти(page, 'UPDATE HARNESS');
    const первыйHref = await верхнийРегистр.first().getAttribute('href');

    const нижнийРегистр = await найти(page, 'update harness');
    await expect(нижнийРегистр.first()).toHaveAttribute('href', первыйHref);
  });

  test('многословный запрос учитывает все значимые слова', async ({ page }) => {
    await открытьПоиск(page);
    const результаты = await найти(page, 'обновление Harness');

    await expect(результаты.first()).toBeVisible();
    await expect(page.locator('.search-results')).toContainText(/Harness/i);
    await expect(page.locator('.search-results')).toContainText(/обновлен/i);
  });

  test('ограничивает выдачу восемью результатами', async ({ page }) => {
    await открытьПоиск(page);
    const результаты = await найти(page, 'проект');

    expect(await результаты.count()).toBeLessThanOrEqual(8);
    expect(await результаты.count()).toBeGreaterThan(0);
  });

  test('показывает понятное сообщение при отсутствии результатов', async ({ page }) => {
    await открытьПоиск(page);
    const результаты = await найти(page, 'совершенно-несуществующий-запрос-987654');

    await expect(результаты).toHaveCount(0);
    await expect(page.locator('.search-status')).toContainText('ничего не найдено');
  });

  test('подсвечивает точное совпадение в заголовке результата', async ({ page }) => {
    await открытьПоиск(page);
    const результаты = await найти(page, 'ADD STEP');

    await expect(результаты.first().locator('.search-result__title mark')).toHaveText('ADD STEP');
  });

  test('результат команды ведёт к соответствующему разделу справочника', async ({ page }) => {
    await открытьПоиск(page);
    const результаты = await найти(page, 'ADD STEP');

    await expect(результаты.first()).toHaveAttribute('href', '/commands/#bootstrap');
  });

  test('переходит по выбранному результату и закрывает диалог', async ({ page }) => {
    await открытьПоиск(page);
    const результаты = await найти(page, 'ADD STEP');
    await результаты.first().click();

    await expect(page).toHaveURL(/\/commands\/#bootstrap$/);
    await expect(page.locator('.search-dialog')).not.toHaveAttribute('open', '');
  });

  test('при пустом запросе не показывает случайные результаты', async ({ page }) => {
    await открытьПоиск(page);

    await expect(page.locator('.search-result')).toHaveCount(0);
    await expect(page.locator('.search-status')).toContainText('Введите запрос');
  });
});
