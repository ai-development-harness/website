import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const baseline = JSON.parse(readFileSync(new URL('../fixtures/harness-commands.json', import.meta.url), 'utf8'));

// Зафиксированный CTS позволяет проверять сайт локально без сети и соседнего checkout.
// При следующей синхронизации снимок обновляется вместе с картой источников.
test.describe('Контент — команды и надёжность Harness', () => {
  test('все команды CTS представлены ровно один раз и имеют интерактивную схему', async ({ page }) => {
    await page.goto('/commands/');
    const items = page.locator('.command-item');
    const actual = await items.locator('h3 code').allTextContents();
    const normalize = (value) => value.replace(/ \[TO .*$/, '').replace(/ \/.*$/, '').replace(/: .*$/, ':').trim();
    expect(actual.map(normalize).sort()).toEqual(baseline.commands.map((entry) => entry.canonical).sort());
    await expect(items).toHaveCount(34);
    await expect(page.locator('.command-diagram-open')).toHaveCount(34);

    const keys = await page.locator('.command-diagram-open').evaluateAll((nodes) => nodes.map((node) => node.dataset.command));
    expect(keys.sort()).toEqual(baseline.commands.map((entry) => entry.canonical).sort());
  });

  test('обновление устанавливает конечный релиз и не объявляет приёмку проекта', async ({ page }) => {
    for (const path of ['/getting-started/', '/commands/', '/maintenance/']) {
      await page.goto(path);
      const article = page.locator('article.article');
      await expect(article).toContainText('напрямую к конечному релизу за одну транзакцию');
      await expect(article).toContainText('без промежуточных APPLY');
      await expect(article).toContainText('не означает миграцию продуктовых данных');
      await expect(article).not.toContainText('Применять переходы по очереди');
      await expect(article).not.toContainText('Каждый переход — отдельная транзакция');
    }
  });

  test('перенос создаёт новую PLAN и сохраняет локальные границы', async ({ page }) => {
    for (const path of ['/workflow/', '/repository/', '/commands/']) {
      await page.goto(path);
      const section = page.locator('#portable');
      await expect(section).toContainText('новый локальный STEP PLAN');
      await expect(section).toContainText('не переносятся через Git');
      await expect(section).toContainText('новой ревизии плана и нового независимого отчёта проверки плана');
      await expect(section).toContainText('Любой последующий коммит');
      await expect(section).toContainText('явно обновите ссылки');
    }
  });

  test('выборочная проверка требует карты и новых доказательств', async ({ page }) => {
    await page.goto('/validators/');
    const section = page.locator('#incremental');
    await expect(section).toContainText('По умолчанию проверки выполняются полностью');
    await expect(section).toContainText('verification.impactMap');
    await expect(section).toContainText('локального подтверждения происхождения');
    await expect(section).toContainText('возвращают полный прогон');
    await expect(section).toContainText('fixDeltaCausality');
    await expect(section).toContainText('VERIFICATION_INPUTS_STALE');
  });
});


// Каждая команда проверяется отдельно: последовательный обход всех диалогов
// превышал лимит одного случая в WebKit и мешал точно определить место сбоя.
test.describe('Режим модели в схемах всех канонических команд', () => {
  const expectedModes = {
    none: /Модель не вызывается|Сама команда без модели/,
    required: /Модель обязательна/,
    conditional: /Модель зависит от сценария/,
  };

  for (const entry of baseline.commands) {
    test(`команда ${entry.canonical} показывает режим из реестра Harness`, async ({ page }) => {
      await page.goto('/commands/');
      await page.locator(`.command-diagram-open[data-command="${entry.canonical}"]`).click();
      const dialog = page.locator('.command-diagram-dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(expectedModes[entry.reasoning]);
    });
  }
});
