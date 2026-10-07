export const PRODUCTION_ORIGIN = 'https://ai-development-harness.ru';

export const PUBLIC_PAGES = [
  { path: '/', h1: 'Репозиторий как долговременная память для AI-разработки', docs: false },
  { path: '/getting-started/', h1: 'Начало работы', docs: true },
  { path: '/workflow/', h1: 'Процесс разработки', docs: true },
  { path: '/commands/', h1: 'Команды Harness', docs: true },
  { path: '/architecture/', h1: 'Архитектура Harness', docs: true },
  { path: '/runtimes/', h1: 'Codex и Claude Code', docs: true },
  { path: '/repository/', h1: 'Репозиторий как долговременная память', docs: true },
  { path: '/validators/', h1: 'Валидаторы и детерминированные проверки', breadcrumb: 'Валидаторы', docs: true },
  { path: '/maintenance/', h1: 'Поддержка и обновление', docs: true },
  { path: '/faq/', h1: 'Вопросы и ответы', docs: true },
  { path: '/articles/', h1: 'Статьи об AI-разработке', breadcrumb: 'Статьи', docs: true },
  { path: '/articles/what-is-ai-coding-harness/', h1: 'Что такое AI coding harness и зачем он нужен', breadcrumb: 'Что такое AI coding harness', docs: true },
  { path: '/articles/persistent-context-codex-claude-code/', h1: 'Как не терять контекст между сессиями Codex и Claude Code', breadcrumb: 'Контекст между сессиями', docs: true },
  { path: '/articles/codex-claude-code-workflow/', h1: 'Codex и Claude Code в одном проекте', breadcrumb: 'Codex и Claude Code', docs: true },
  { path: '/articles/harness-development-lifecycle/', h1: 'Как устроен AI Development Harness: от требований до проверенного изменения', breadcrumb: 'Цикл разработки Harness', docs: true },
  { path: '/articles/deterministic-core-vs-llm/', h1: 'Что отдавать LLM, а что проверять детерминированно', breadcrumb: 'LLM и детерминированные проверки', docs: true },
];

export const DOC_PAGES = PUBLIC_PAGES.filter((page) => page.docs);

export const INTERNAL_ANCHORS = ['problem', 'what-is-harness', 'workflow', 'comparison', 'traceability', 'runtimes', 'example', 'audience', 'articles'];

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
