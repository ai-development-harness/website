import { test, expect } from '@playwright/test';

const selectors = {
  header: '.site-header',
  hero: '.hero',
  nav: '.desktop-nav',
  menu: '.menu-button',
  diagram: '.memory-map',
  problemCards: '.problem-card',
  steps: '.process-step',
  traceability: '.traceability-flow',
  footer: '.site-footer'
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('renders primary content and CTAs', async ({ page }) => {
  await expect(page).toHaveTitle(/AI Development Harness/);
  await expect(page.locator('h1')).toContainText('долгосрочной');
  await expect(page.getByRole('link', { name: 'Использовать шаблон' }).first()).toBeVisible();
  await expect(page.locator(selectors.diagram)).toBeVisible();
  await expect(page.locator(selectors.problemCards)).toHaveCount(4);
  await expect(page.locator(selectors.steps)).toHaveCount(5);
  await expect(page.locator(selectors.traceability)).toBeVisible();
  await expect(page.locator(selectors.footer)).toBeVisible();
});

test('has no horizontal overflow', async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('semantic navigation anchors resolve', async ({ page }) => {
  for (const id of ['problem', 'workflow', 'traceability', 'example', 'audience']) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
});

test('external GitHub links are safe', async ({ page }) => {
  const externalLinks = page.locator('a[target="_blank"]');
  const count = await externalLinks.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(externalLinks.nth(i)).toHaveAttribute('rel', /noreferrer/);
  }
});

test('responsive navigation matches viewport', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'desktop-chromium') {
    await expect(page.locator(selectors.nav)).toBeVisible();
    await expect(page.locator(selectors.menu)).toBeHidden();
  } else {
    await expect(page.locator(selectors.nav)).toBeHidden();
    await expect(page.locator(selectors.menu)).toBeVisible();
    await page.locator(selectors.menu).click();
    await expect(page.locator('.mobile-nav')).toBeVisible();
    await expect(page.locator(selectors.menu)).toHaveAttribute('aria-expanded', 'true');
  }
});

test('critical text remains readable and inside viewport', async ({ page }) => {
  const targets = ['h1', '.hero-lead', '.section-title', '.cta-title'];
  for (const selector of targets) {
    const locator = page.locator(selector).first();
    await expect(locator).toBeVisible();
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual((await page.viewportSize()).width + 1);
  }
});
