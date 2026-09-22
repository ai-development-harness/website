import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../helpers/site.js';

test.describe('Контент — актуальный Harness', () => {
  test('публичные страницы не описывают старый .project control plane', async ({ page }) => {
    for (const publicPage of PUBLIC_PAGES) {
      await page.goto(publicPage.path);
      const text = await page.locator('body').innerText();

      expect(text, publicPage.path).not.toContain('.project/');
      expect(text, publicPage.path).not.toContain('tools/harness/');
    }
  });

  test('справочник команд отражает проверки планирования и детерминированные инструменты', async ({ page }) => {
    await page.goto('/commands/');
    const article = page.locator('article.article');

    await expect(article).toContainText('Команды Harness используют форму');
    await expect(article).toContainText('.harness/command-transitions.json');
    await expect(article).toContainText('Независимая проверка плана');
    await expect(article).toContainText('Основа контекста + хэш плана');
    await expect(article).toContainText('.harness/tools/harness-update.py');
    await expect(article).toContainText('.harness/tools/git-preflight.py');

    for (const command of [
      'HARNESS HELP',
      'HARNESS STATUS',
      'HARNESS RESUME',
      'HARNESS DOCTOR',
      'HARNESS CONFIG',
      'STEP LIST',
      'STEP SHOW STEP-NNN',
      'GIT PR FINISH',
    ]) {
      await expect(article).toContainText(command);
    }

    await expect(page.locator('#syntax')).toContainText('STEP RUN 024');
    await expect(page.locator('#syntax')).toContainText('STEP RUN STEP-024');
    await expect(page.locator('#git')).toContainText('.harness/local/git/pr-state.json');
    await expect(page.locator('#git')).toContainText('headRefOid');
  });

  test('начало работы требует две INIT-проверки и детерминированную финализацию', async ({ page }) => {
    await page.goto('/getting-started/');

    await expect(page.locator('#init')).toContainText('две независимые семантические проверки');
    await expect(page.locator('#init')).toContainText('.harness/tools/finalize-project-init.py');
    await expect(page.locator('#init')).toContainText('REQ-NNN-*.md');
    await expect(page.locator('#prerequisites')).toContainText('HARNESS DOCTOR');
    await expect(page.locator('#prerequisites')).toContainText('GIT PR FINISH');
    await expect(page.locator('#prerequisites')).toContainText('gh');
  });

  test('страница репозитория показывает канонические REQ и детерминированные проекции', async ({ page }) => {
    await page.goto('/repository/');

    await expect(page.locator('#layout')).toContainText('.harness/manifest.yaml');
    await expect(page.locator('#layout')).toContainText('docs/requirements/REQ-NNN-*.md');
    await expect(page.locator('#projections')).toContainText('.harness/tools/sync-projections.py');
    await expect(page.locator('#topology')).toContainText('manifest');
    await expect(page.locator('#layout')).toContainText('.harness/docs/DEPENDENCIES.md');
    await expect(page.locator('#layout')).toContainText('.harness/local/git/pr-state.json');
    await expect(page.locator('#execution-status')).toContainText('HARNESS RESUME');
  });

  test('страница валидаторов документирует основные публичные проверки', async ({ page }) => {
    await page.goto('/validators/');
    const article = page.locator('article.article');

    for (const tool of [
      '.harness/tools/validate.py',
      '.harness/tools/validate-command.py',
      '.harness/tools/check-command-references.py',
      '.harness/tools/sync-projections.py',
      '.harness/tools/finalize-project-init.py',
      '.harness/tools/review_gates.py',
      '.harness/tools/review_contract.py',
      '.harness/tools/report_contract.py',
      '.harness/tools/projection_contract.py',
      '.harness/tools/template_contract.py',
      '.harness/tools/git-preflight.py',
      '.harness/tools/harness-help.py',
      '.harness/tools/harness-ux.py',
      '.harness/tools/execution_status.py',
    ]) {
      await expect(article).toContainText(tool);
    }
  });

  test('поддержка описывает детерминированное обновление и миграцию проектных документов', async ({ page }) => {
    await page.goto('/maintenance/');

    await expect(page.locator('#update')).toContainText('.harness/tools/harness-update.py');
    await expect(page.locator('#migration')).toContainText('PROJECT RECONCILE');
    await expect(page.locator('#git-preflight')).toContainText('.harness/tools/git-preflight.py');
    await expect(page.locator('#git-preflight')).toContainText('GIT PR FINISH');
    await expect(page.locator('#git-preflight')).toContainText('.harness/local/git/pr-state.json');
    await expect(page.locator('#git-preflight')).toContainText('gh');
  });
});
