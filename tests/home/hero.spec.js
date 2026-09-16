import { test, expect } from '@playwright/test';

const ожидаемыеШаги = [
  'Brief',
  'INIT PROJECT',
  'ADD STEP',
  'RUN STEP',
  'Review & Evidence',
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
    const шаги = page.locator('.workflow-step');
    await expect(шаги).toHaveCount(6);

    for (let индекс = 0; индекс < ожидаемыеШаги.length; индекс += 1) {
      await expect(шаги.nth(индекс).locator('.workflow-no')).toHaveText(String(индекс + 1).padStart(2, '0'));
      await expect(шаги.nth(индекс).locator('.workflow-copy b')).toHaveText(ожидаемыеШаги[индекс]);
    }
  });

  test('не оставляет пустой хвост под содержимым панели процесса', async ({ page }) => {
    const отступСнизу = await page.locator('.memory-map').evaluate((панель) => {
      const заметка = панель.querySelector('.timeline-note');
      const панельRect = панель.getBoundingClientRect();
      const заметкаRect = заметка.getBoundingClientRect();
      return панельRect.bottom - заметкаRect.bottom;
    });

    expect(отступСнизу).toBeGreaterThanOrEqual(0);
    expect(отступСнизу).toBeLessThanOrEqual(28);
  });

  test('иконки шагов имеют крупный единый контейнер и заметную внутреннюю геометрию', async ({ page }, testInfo) => {
    const размеры = await page.locator('.workflow-icon').evaluateAll((иконки) => иконки.map((иконка) => {
      const rect = иконка.getBoundingClientRect();
      const before = getComputedStyle(иконка, '::before');
      return {
        width: rect.width,
        height: rect.height,
        beforeWidth: Number.parseFloat(before.width),
        beforeHeight: Number.parseFloat(before.height),
      };
    }));

    for (const размер of размеры) {
      const минимумКонтейнера = testInfo.project.name === 'mobile-chromium' ? 34 : 60;
      expect(размер.width).toBeGreaterThanOrEqual(минимумКонтейнера);
      expect(размер.height).toBeGreaterThanOrEqual(минимумКонтейнера);
      expect(Math.max(размер.beforeWidth, размер.beforeHeight)).toBeGreaterThanOrEqual(25);
    }
  });

  test('три карточки свойств имеют крупные самостоятельные иконки', async ({ page }) => {
    const иконки = page.locator('.hero-fact-icon');
    await expect(иконки).toHaveCount(3);

    const размеры = await иконки.evaluateAll((элементы) => элементы.map((элемент) => {
      const rect = элемент.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }));

    for (const размер of размеры) {
      expect(размер.width).toBeGreaterThanOrEqual(35);
      expect(размер.height).toBeGreaterThanOrEqual(35);
    }
  });

  test('блок быстрого старта не растягивается пустой панелью', async ({ page }) => {
    const список = page.locator('.cta-steps');
    await expect(список.locator('li')).toHaveCount(3);

    const метрики = await page.locator('.cta-quickstart').evaluate((блок) => {
      const rect = блок.getBoundingClientRect();
      const список = блок.querySelector('.cta-steps').getBoundingClientRect();
      return { высотаБлока: rect.height, высотаСписка: список.height, разница: rect.height - список.height };
    });

    expect(метрики.разница).toBeLessThanOrEqual(40);
  });
});
