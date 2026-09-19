import { test, expect } from '@playwright/test';

const EXPECTED_STEPS = [
  'Описание проекта',
  'PROJECT INIT',
  'STEP ADD',
  'STEP RUN',
  'Ревью и доказательства',
  'Git',
];

test.describe('Главная страница — первый экран', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('показывает ключевое сообщение и основные действия', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('долгосрочной памятью проекта');
    await expect(page.locator('.hero-lead')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Использовать шаблон' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Как это работает/ })).toBeVisible();
  });

  test('показывает все шесть шагов процесса в правильном порядке', async ({ page }) => {
    const steps = page.locator('.workflow-step');
    await expect(steps).toHaveCount(6);

    for (let index = 0; index < EXPECTED_STEPS.length; index += 1) {
      await expect(steps.nth(index).locator('.workflow-no')).toHaveText(String(index + 1).padStart(2, '0'));
      await expect(steps.nth(index).locator('.workflow-copy b')).toHaveText(EXPECTED_STEPS[index]);
    }
  });

  test('не оставляет пустой хвост под содержимым панели процесса', async ({ page }) => {
    const bottomGap = await page.locator('.memory-map').evaluate((panel) => {
      const note = panel.querySelector('.timeline-note');
      const panelRect = panel.getBoundingClientRect();
      const noteRect = note.getBoundingClientRect();
      return panelRect.bottom - noteRect.bottom;
    });

    expect(bottomGap).toBeGreaterThanOrEqual(0);
    expect(bottomGap).toBeLessThanOrEqual(28);
  });

  test('иконки шагов имеют крупный единый контейнер и заметную внутреннюю геометрию', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'На узком мобильном экране пиктограммы намеренно скрыты');

    const sizes = await page.locator('.workflow-icon').evaluateAll((icons) => icons.map((icon) => {
      const rect = icon.getBoundingClientRect();
      const before = getComputedStyle(icon, '::before');
      return {
        width: rect.width,
        height: rect.height,
        beforeWidth: Number.parseFloat(before.width),
        beforeHeight: Number.parseFloat(before.height),
      };
    }));

    for (const size of sizes) {
      expect(size.width).toBeGreaterThanOrEqual(60);
      expect(size.height).toBeGreaterThanOrEqual(60);
      expect(Math.max(size.beforeWidth, size.beforeHeight)).toBeGreaterThanOrEqual(25);
    }
  });

  test('на узком мобильном экране пиктограммы шагов скрываются, а текст процесса остаётся читаемым', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'Проверка относится только к узкому мобильному экрану');

    const icons = page.locator('.workflow-icon');
    const descriptions = page.locator('.workflow-copy');

    await expect(icons).toHaveCount(6);
    await expect(descriptions).toHaveCount(6);

    for (let index = 0; index < 6; index += 1) {
      await expect(icons.nth(index)).toBeHidden();
      await expect(descriptions.nth(index)).toBeVisible();
      await expect(descriptions.nth(index).locator('b')).toHaveText(EXPECTED_STEPS[index]);
    }
  });

  test('три карточки свойств имеют крупные самостоятельные иконки', async ({ page }) => {
    const icons = page.locator('.hero-fact-icon');
    await expect(icons).toHaveCount(3);

    const sizes = await icons.evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }));

    for (const size of sizes) {
      expect(size.width).toBeGreaterThanOrEqual(35);
      expect(size.height).toBeGreaterThanOrEqual(35);
    }
  });

  test('блок быстрого старта не растягивается пустой панелью', async ({ page }) => {
    const list = page.locator('.cta-steps');
    await expect(list.locator('li')).toHaveCount(3);

    const metrics = await page.locator('.cta-quickstart').evaluate((block) => {
      const rect = block.getBoundingClientRect();
      const listRect = block.querySelector('.cta-steps').getBoundingClientRect();
      return { blockHeight: rect.height, listHeight: listRect.height, difference: rect.height - listRect.height };
    });

    expect(metrics.difference).toBeLessThanOrEqual(40);
  });
});
