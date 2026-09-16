export const PUBLIC_PAGES = [
  { path: '/', h1: 'Ваш репозиторий становится долгосрочной памятью проекта', canonical: 'https://ai-development-harness.ru/', docs: false },
  { path: '/getting-started/', h1: 'Начало работы', canonical: 'https://ai-development-harness.ru/getting-started/', docs: true },
  { path: '/workflow/', h1: 'Процесс разработки', canonical: 'https://ai-development-harness.ru/workflow/', docs: true },
  { path: '/commands/', h1: 'Команды Harness', canonical: 'https://ai-development-harness.ru/commands/', docs: true },
  { path: '/architecture/', h1: 'Архитектура Harness', canonical: 'https://ai-development-harness.ru/architecture/', docs: true },
  { path: '/repository/', h1: 'Репозиторий как долговременная память', canonical: 'https://ai-development-harness.ru/repository/', docs: true },
  { path: '/maintenance/', h1: 'Поддержка и обновление', canonical: 'https://ai-development-harness.ru/maintenance/', docs: true },
  { path: '/faq/', h1: 'FAQ', canonical: 'https://ai-development-harness.ru/faq/', docs: true },
];

export const DOC_PAGES = PUBLIC_PAGES.filter((page) => page.docs);

export const INTERNAL_ANCHORS = ['problem', 'workflow', 'traceability', 'example', 'audience'];

export function isDesktop(testInfo) {
  return testInfo.project.name === 'desktop-chromium';
}
