export const PRODUCTION_ORIGIN = 'https://ai-development-harness.ru';

export const PUBLIC_PAGES = [
  { path: '/', h1: 'Ваш репозиторий становится долгосрочной памятью проекта', docs: false },
  { path: '/getting-started/', h1: 'Начало работы', docs: true },
  { path: '/workflow/', h1: 'Процесс разработки', docs: true },
  { path: '/commands/', h1: 'Команды Harness', docs: true },
  { path: '/architecture/', h1: 'Архитектура Harness', docs: true },
  { path: '/runtimes/', h1: 'Codex и Claude Code', docs: true },
  { path: '/repository/', h1: 'Репозиторий как долговременная память', docs: true },
  { path: '/maintenance/', h1: 'Поддержка и обновление', docs: true },
  { path: '/faq/', h1: 'FAQ', docs: true },
];

export const DOC_PAGES = PUBLIC_PAGES.filter((page) => page.docs);

export const INTERNAL_ANCHORS = ['problem', 'workflow', 'traceability', 'runtimes', 'example', 'audience'];

/**
 * Возвращает production canonical URL для SEO-проверок.
 *
 * Навигационные тесты всегда используют только publicPage.path, поэтому
 * Playwright подставляет baseURL локального dev-сервера. Production-домен нужен
 * исключительно там, где мы намеренно проверяем canonical/sitemap/OG metadata.
 */
export function productionUrl(path) {
  return new URL(path, PRODUCTION_ORIGIN).href;
}

export function isDesktop(testInfo) {
  return testInfo.project.name === 'desktop-chromium';
}
