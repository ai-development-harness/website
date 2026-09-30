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
    await expect(page.locator('#syntax')).toContainText('.harness/tools/harness-dispatch.py');
    await expect(page.locator('#syntax')).toContainText('.harness/reasoning-boundaries.json');
    await expect(page.locator('#execution')).toContainText('.harness/tools/verification.py');
    await expect(page.locator('#execution')).toContainText('.harness/tools/semantic-writer.py');
    await expect(page.locator('#git')).toContainText('.harness/tools/git-action.py');

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
    await expect(page.locator('#git')).toContainText('.harness/tools/pr_provider.py');
    await expect(page.locator('#git')).toContainText('Gitea');
    await expect(page.locator('#git')).toContainText('PROVIDER_LOGIN_AMBIGUOUS');
    await expect(page.locator('#updates')).toContainText('.harness/local/update-journal/');
    await expect(page.locator('#updates')).toContainText('UPDATE_JOURNAL_PENDING');
    await expect(page.locator('#git')).toContainText('COMMIT_POSTCONDITION_FAILED');
    await expect(page.locator('#execution-status')).toContainText('execution-status.lock');
    await expect(page.locator('#execution-status')).toContainText('schemaVersion: 2');
    await expect(page.locator('#execution-status')).toContainText('recentTerminals');
    await expect(page.locator('#execution-status')).toContainText('current.context.sideEffect');
    await expect(page.locator('#execution-status')).toContainText('ALREADY_APPLIED');
  });

  test('начало работы требует две INIT-проверки и детерминированную финализацию', async ({ page }) => {
    await page.goto('/getting-started/');

    await expect(page.locator('#init')).toContainText('две независимые семантические проверки');
    await expect(page.locator('#init')).toContainText('.harness/tools/finalize-project-init.py');
    await expect(page.locator('#init')).toContainText('REQ-NNN-*.md');
    await expect(page.locator('#prerequisites')).toContainText('HARNESS DOCTOR');
    await expect(page.locator('#prerequisites')).toContainText('GIT PR FINISH');
    await expect(page.locator('#prerequisites')).toContainText('gh');
    await expect(page.locator('#prerequisites')).toContainText('tea');
    await expect(page.locator('#prerequisites')).toContainText('Gitea');
  });

  test('страница репозитория показывает канонические REQ и детерминированные проекции', async ({ page }) => {
    await page.goto('/repository/');

    await expect(page.locator('#layout')).toContainText('.harness/manifest.yaml');
    await expect(page.locator('#layout')).toContainText('docs/requirements/REQ-NNN-*.md');
    await expect(page.locator('#projections')).toContainText('.harness/tools/sync-projections.py');
    await expect(page.locator('#topology')).toContainText('manifest');
    await expect(page.locator('#layout')).toContainText('.harness/docs/DEPENDENCIES.md');
    await expect(page.locator('#layout')).toContainText('.harness/reasoning-boundaries.json');
    await expect(page.locator('#layout')).toContainText('.harness/runtime-adapter-contract.json');
    await expect(page.locator('#layout')).toContainText('.harness/local/git/pr-state.json');
    await expect(page.locator('#execution-status')).toContainText('HARNESS RESUME');
    await expect(page.locator('#execution-status')).toContainText('execution-status.lock');
    await expect(page.locator('#execution-status')).toContainText('recentTerminals');
  });

  test('страница валидаторов документирует основные публичные проверки', async ({ page }) => {
    await page.goto('/validators/');
    const article = page.locator('article.article');

    for (const tool of [
      '.harness/tools/validate.py',
      '.harness/tools/run-self-tests.py',
      '.harness/tools/harness-dispatch.py',
      '.harness/tools/validate-command.py',
      '.harness/tools/check-command-references.py',
      '.harness/tools/sync-projections.py',
      '.harness/tools/finalize-project-init.py',
      '.harness/tools/review_gates.py',
      '.harness/tools/review_contract.py',
      '.harness/tools/review_findings.py',
      '.harness/tools/repair_cycle.py',
      '.harness/tools/report_contract.py',
      '.harness/tools/projection_contract.py',
      '.harness/tools/template_contract.py',
      '.harness/tools/git-preflight.py',
      '.harness/tools/harness-help.py',
      '.harness/tools/harness-ux.py',
      '.harness/tools/verification.py',
      '.harness/tools/semantic-writer.py',
      '.harness/tools/git-action.py',
      '.harness/tools/pr_provider.py',
      '.harness/tools/runtime_adapter_contract.py',
      '.harness/tools/runtime_adapter_conformance.py',
      '.harness/tools/reasoning-boundaries.py',
      '.harness/tools/execution_status.py',
      '.harness/tools/side_effect_recovery.py',
      '.harness/tools/scripted_runtime.py',
    ]) {
      await expect(article).toContainText(tool);
    }
    await expect(page.locator('#validate')).toContainText('.env');
    await expect(page.locator('#validate')).toContainText('приватные SSH/PEM/PGP-ключи');
    await expect(page.locator('#execution-tools')).toContainText('VERIFICATION_MUTATED_REFS');
    await expect(page.locator('#reviews')).toContainText('stable fingerprint');
    await expect(page.locator('#reviews')).toContainText('NO_PROGRESS');
    await expect(page.locator('#execution-tools')).toContainText('gitea → tea');
    await expect(page.locator('#validate')).toContainText('*-self-test.py');
    await expect(page.locator('#validate')).toContainText('--list');
  });

  test('процесс и FAQ описывают recovery и provider-neutral Pull Request capability', async ({ page }) => {
    await page.goto('/workflow/');
    await expect(page.locator('#run')).toContainText('переходы между PLAN, IMPLEMENT, REVIEW и FIX вычисляет dispatcher');
    await expect(page.locator('#run')).toContainText('Verification запускается машинно');
    await expect(page.locator('#git-flow')).toContainText('GIT PR FINISH');
    await expect(page.locator('#git-flow')).toContainText('git branch -D');
    await expect(page.locator('#git-flow')).toContainText('gh');
    await expect(page.locator('#git-flow')).toContainText('tea');
    await expect(page.locator('#git-flow')).toContainText('SIDE_EFFECT_RECOVERY_AMBIGUOUS');
    await expect(page.locator('#git-flow')).toContainText('COMMIT_POSTCONDITION_FAILED');

    await page.goto('/faq/');
    const article = page.locator('article.article');
    await expect(article).toContainText('HARNESS STATUS');
    await expect(article).toContainText('HARNESS RESUME');
    await expect(article).toContainText('Нужен ли отдельный CLI для Pull Request?');
    await expect(article).toContainText('Gitea');
    await expect(article).toContainText('GIT PR FINISH');
    await expect(article).toContainText('UPDATE_JOURNAL_PENDING');
  });

  test('страницы навыков фиксируют provenance через UPSTREAM.md', async ({ page }) => {
    await page.goto('/architecture/');
    await expect(page.locator('#skills')).toContainText('UPSTREAM.md');
    await expect(page.locator('#skills')).toContainText('project-native');
    await expect(page.locator('#skills')).toContainText('exact upstream/ref/license');

    await page.goto('/commands/');
    await expect(page.locator('#skills')).toContainText('Source: project-native');
    await expect(page.locator('#skills')).toContainText('UPSTREAM.md');
  });

  test('страница runtimes публикует provider-neutral Runtime Adapter Contract', async ({ page }) => {
    await page.goto('/runtimes/');

    await expect(page.locator('#contract')).toContainText('.harness/runtime-adapter-contract.json');
    await expect(page.locator('#contract')).toContainText('native');
    await expect(page.locator('#contract')).toContainText('synthesized');
    await expect(page.locator('#contract')).toContainText('unsupported');
    await expect(page.locator('#contract')).toContainText('account/read');
    await expect(page.locator('#contract')).toContainText('claude auth status');
    await expect(page.locator('#contract')).toContainText('input.required');
  });

  test('поддержка описывает детерминированное обновление и миграцию проектных документов', async ({ page }) => {
    await page.goto('/maintenance/');

    await expect(page.locator('#update')).toContainText('.harness/tools/harness-update.py');
    await expect(page.locator('#update')).toContainText('без вызова модели');
    await expect(page.locator('#update')).toContainText('.harness/local/update-journal/');
    await expect(page.locator('#update')).toContainText('UPDATE_JOURNAL_PENDING');
    await expect(page.locator('#migration')).toContainText('LEGACY_COMPLETION');
    await expect(page.locator('#legacy')).toContainText('v0.6.0');
    await expect(page.locator('#legacy')).toContainText('SOURCE_TAG_MOVED');
    await expect(page.locator('#legacy')).toContainText('v0.7.0');
    await expect(page.locator('#migration')).toContainText('PROJECT RECONCILE');
    await expect(page.locator('#git-preflight')).toContainText('.harness/tools/git-preflight.py');
    await expect(page.locator('#git-preflight')).toContainText('GIT PR FINISH');
    await expect(page.locator('#git-preflight')).toContainText('.harness/local/git/pr-state.json');
    await expect(page.locator('#git-preflight')).toContainText('gh');
    await expect(page.locator('#git-preflight')).toContainText('tea');
    await expect(page.locator('#git-preflight')).toContainText('SIDE_EFFECT_RECOVERY_AMBIGUOUS');
    await expect(page.locator('#git-preflight')).toContainText('COMMIT_POSTCONDITION_FAILED');
  });
});
