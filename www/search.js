const FALLBACK_PUBLIC_PATHS = [
  '/',
  '/getting-started/',
  '/workflow/',
  '/commands/',
  '/architecture/',
  '/repository/',
  '/maintenance/',
  '/faq/',
];

const MAX_RESULTS = 8;
let indexPromise = null;
let lastTrigger = null;

export function normalizeSearchText(value = '') {
  return value
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalizeSearchText(value)
    .split(/[^a-zа-я0-9_.:/-]+/i)
    .filter((token) => token.length > 1);
}

export async function getPublicPaths() {
  try {
    const response = await fetch('/sitemap.xml', { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`sitemap: ${response.status}`);

    const xml = new DOMParser().parseFromString(await response.text(), 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('sitemap: invalid XML');

    const paths = [...xml.querySelectorAll('loc')]
      .map((node) => node.textContent?.trim())
      .filter(Boolean)
      .map((url) => new URL(url, location.origin).pathname)
      .filter((path) => path.startsWith('/'));

    return [...new Set(paths.length ? paths : FALLBACK_PUBLIC_PATHS)];
  } catch {
    return [...FALLBACK_PUBLIC_PATHS];
  }
}

function textOf(element) {
  if (!element) return '';
  const clone = element.cloneNode(true);
  clone.querySelectorAll('script, style, nav, .toc, .prev-next, [aria-hidden="true"]').forEach((node) => node.remove());
  return clone.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function pageTitleFrom(documentNode) {
  return documentNode.querySelector('h1')?.textContent?.trim()
    || documentNode.title?.replace(/\s+[—|-].*$/, '').trim()
    || 'Без названия';
}

function createItem({ path, href, pageTitle, title, text, kind, keywords = '' }) {
  return {
    path,
    href,
    pageTitle,
    title,
    text,
    kind,
    keywords,
    normalizedTitle: normalizeSearchText(title),
    normalizedPageTitle: normalizeSearchText(pageTitle),
    normalizedText: normalizeSearchText(text),
    normalizedKeywords: normalizeSearchText(keywords),
  };
}

export function extractSearchItems(html, path) {
  const documentNode = new DOMParser().parseFromString(html, 'text/html');
  const main = documentNode.querySelector('main');
  if (!main) return [];

  const pageTitle = pageTitleFrom(documentNode);
  const description = documentNode.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const items = [createItem({
    path,
    href: path,
    pageTitle,
    title: pageTitle,
    text: description || textOf(main).slice(0, 900),
    kind: 'page',
  })];

  for (const section of main.querySelectorAll('section[id]')) {
    const id = section.id;
    const heading = section.querySelector('h2, h3');
    if (!id || !heading) continue;

    const title = heading.textContent?.trim();
    if (!title) continue;

    items.push(createItem({
      path,
      href: `${path}#${id}`,
      pageTitle,
      title,
      text: textOf(section),
      kind: 'section',
    }));
  }

  for (const command of main.querySelectorAll('.command-item')) {
    const code = command.querySelector('h3 code');
    if (!code) continue;

    const title = code.textContent?.trim();
    if (!title) continue;

    const section = command.closest('section[id]');
    items.push(createItem({
      path,
      href: section?.id ? `${path}#${section.id}` : path,
      pageTitle,
      title,
      text: textOf(command),
      kind: 'command',
      keywords: title,
    }));
  }

  const unique = new Map();
  for (const item of items) unique.set(`${item.href}|${item.title}`, item);
  return [...unique.values()];
}

export async function buildSearchIndex() {
  const paths = await getPublicPaths();
  const pages = await Promise.all(paths.map(async (path) => {
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: { Accept: 'text/html' },
    });

    if (!response.ok) throw new Error(`Не удалось загрузить ${path}: ${response.status}`);
    return extractSearchItems(await response.text(), path);
  }));

  return pages.flat();
}

function getIndex() {
  indexPromise ||= buildSearchIndex().catch((error) => {
    indexPromise = null;
    throw error;
  });
  return indexPromise;
}

export function scoreSearchItem(item, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const tokens = tokenize(normalizedQuery);
  if (!tokens.length) return 0;

  const fields = [item.normalizedTitle, item.normalizedPageTitle, item.normalizedKeywords, item.normalizedText];
  if (!tokens.every((token) => fields.some((field) => field.includes(token)))) return 0;

  let score = 0;
  if (item.normalizedTitle === normalizedQuery) score += 420;
  else if (item.normalizedTitle.startsWith(normalizedQuery)) score += 300;
  else if (item.normalizedTitle.includes(normalizedQuery)) score += 240;

  if (item.normalizedKeywords === normalizedQuery) score += 380;
  else if (item.normalizedKeywords.includes(normalizedQuery)) score += 220;

  if (item.normalizedPageTitle.includes(normalizedQuery)) score += 130;
  if (item.normalizedText.includes(normalizedQuery)) score += 90;

  for (const token of tokens) {
    if (item.normalizedTitle.includes(token)) score += 70;
    if (item.normalizedKeywords.includes(token)) score += 65;
    if (item.normalizedPageTitle.includes(token)) score += 28;
    if (item.normalizedText.includes(token)) score += 14;
  }

  if (item.kind === 'command') score += 35;
  if (item.kind === 'section') score += 15;
  return score;
}

export function rankSearchResults(index, query, limit = MAX_RESULTS) {
  return index
    .map((item) => ({ item, score: scoreSearchItem(item, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'ru'))
    .slice(0, limit)
    .map(({ item }) => item);
}

function getSnippet(item, query) {
  const source = item.text || '';
  if (!source) return '';

  const normalizedSource = normalizeSearchText(source);
  const normalizedQuery = normalizeSearchText(query);
  const firstToken = tokenize(normalizedQuery)[0] || normalizedQuery;
  const index = normalizedSource.indexOf(firstToken);
  const start = Math.max(0, index >= 0 ? index - 90 : 0);
  const end = Math.min(source.length, start + 220);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < source.length ? '…' : '';
  return `${prefix}${source.slice(start, end).trim()}${suffix}`;
}

function appendHighlightedText(target, text, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    target.textContent = text;
    return;
  }

  const normalizedText = normalizeSearchText(text);
  const index = normalizedText.indexOf(normalizedQuery);
  if (index < 0) {
    target.textContent = text;
    return;
  }

  target.append(document.createTextNode(text.slice(0, index)));
  const mark = document.createElement('mark');
  mark.textContent = text.slice(index, index + query.length);
  target.append(mark, document.createTextNode(text.slice(index + query.length)));
}

function createSearchButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'site-search-button';
  button.setAttribute('aria-label', 'Открыть поиск по сайту');
  button.innerHTML = '<span class="site-search-button__icon" aria-hidden="true"></span><span class="site-search-button__label">Поиск</span><kbd>⌘K</kbd>';
  return button;
}

function createSearchDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'search-dialog';
  dialog.setAttribute('aria-labelledby', 'site-search-title');
  dialog.innerHTML = `
    <div class="search-shell">
      <div class="search-header">
        <div class="search-input-wrap">
          <span class="search-input-icon" aria-hidden="true"></span>
          <label class="search-visually-hidden" for="site-search-input">Поиск по сайту</label>
          <input id="site-search-input" class="search-input" type="search" autocomplete="off" spellcheck="false" placeholder="Поиск по документации и командам…" aria-controls="site-search-results" aria-autocomplete="list">
          <button class="search-close" type="button" aria-label="Закрыть поиск">Esc</button>
        </div>
      </div>
      <div class="search-body">
        <div class="search-intro" id="site-search-title">Поиск по AI Development Harness</div>
        <div class="search-status" role="status" aria-live="polite"></div>
        <div class="search-results" id="site-search-results" role="listbox" aria-label="Результаты поиска"></div>
      </div>
      <div class="search-footer" aria-hidden="true">
        <span><kbd>↑</kbd><kbd>↓</kbd> выбрать</span>
        <span><kbd>Enter</kbd> открыть</span>
        <span><kbd>Esc</kbd> закрыть</span>
      </div>
    </div>`;
  return dialog;
}

function installSearchStyles() {
  if (document.querySelector('link[data-search-styles]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/search.css';
  link.dataset.searchStyles = 'true';
  document.head.append(link);
}

function isTypingTarget(target) {
  return target instanceof HTMLElement && (
    target.matches('input, textarea, select')
    || target.isContentEditable
  );
}

function resultLabel(item) {
  if (item.kind === 'command') return 'Команда';
  if (item.kind === 'section') return 'Раздел';
  return 'Страница';
}

export function initSiteSearch() {
  if (document.querySelector('.site-search-button')) return;

  installSearchStyles();
  const headerActions = document.querySelector('.header-actions');
  if (!headerActions) return;

  const button = createSearchButton();
  const dialog = createSearchDialog();
  const input = dialog.querySelector('.search-input');
  const results = dialog.querySelector('.search-results');
  const status = dialog.querySelector('.search-status');
  const closeButton = dialog.querySelector('.search-close');

  headerActions.prepend(button);
  document.body.append(dialog);

  let index = [];
  let activeIndex = -1;
  let currentResults = [];

  const setActiveResult = (nextIndex) => {
    const links = [...results.querySelectorAll('.search-result')];
    links.forEach((link) => link.classList.remove('is-active'));

    if (!links.length) {
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
      return;
    }

    activeIndex = (nextIndex + links.length) % links.length;
    const active = links[activeIndex];
    active.classList.add('is-active');
    active.id = `site-search-result-${activeIndex}`;
    input.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  };

  const renderResults = (query) => {
    results.replaceChildren();
    activeIndex = -1;
    input.removeAttribute('aria-activedescendant');

    const trimmed = query.trim();
    if (!trimmed) {
      currentResults = [];
      status.textContent = 'Введите запрос: название раздела, команду или термин.';
      return;
    }

    currentResults = rankSearchResults(index, trimmed);
    if (!currentResults.length) {
      status.textContent = `По запросу «${trimmed}» ничего не найдено.`;
      return;
    }

    status.textContent = `Найдено: ${currentResults.length}`;
    currentResults.forEach((item, resultIndex) => {
      const link = document.createElement('a');
      link.className = 'search-result';
      link.href = item.href;
      link.setAttribute('role', 'option');
      link.dataset.resultIndex = String(resultIndex);

      const meta = document.createElement('div');
      meta.className = 'search-result__meta';
      meta.textContent = `${resultLabel(item)} · ${item.pageTitle}`;

      const title = document.createElement('div');
      title.className = 'search-result__title';
      appendHighlightedText(title, item.title, trimmed);

      const snippet = document.createElement('div');
      snippet.className = 'search-result__snippet';
      appendHighlightedText(snippet, getSnippet(item, trimmed), trimmed);

      link.append(meta, title, snippet);
      link.addEventListener('mouseenter', () => setActiveResult(resultIndex));
      link.addEventListener('click', () => dialog.close());
      results.append(link);
    });

    setActiveResult(0);
  };

  const ensureIndex = async () => {
    if (index.length) return;
    status.textContent = 'Загружаю поисковый индекс…';
    input.disabled = true;

    try {
      index = await getIndex();
      status.textContent = 'Введите запрос: название раздела, команду или термин.';
    } catch {
      status.textContent = 'Не удалось загрузить поисковый индекс. Попробуйте ещё раз.';
    } finally {
      input.disabled = false;
      input.focus();
    }
  };

  const openSearch = async (trigger = document.activeElement) => {
    if (dialog.open) return;
    lastTrigger = trigger instanceof HTMLElement ? trigger : button;
    dialog.showModal();
    document.documentElement.classList.add('search-open');
    input.value = '';
    results.replaceChildren();
    activeIndex = -1;
    await ensureIndex();
  };

  button.addEventListener('click', () => openSearch(button));
  closeButton.addEventListener('click', () => dialog.close());
  input.addEventListener('input', () => renderResults(input.value));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveResult(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveResult(activeIndex - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      results.querySelectorAll('.search-result')[activeIndex]?.click();
    }
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('search-open');
    input.value = '';
    results.replaceChildren();
    status.textContent = '';
    lastTrigger?.focus();
  });

  document.addEventListener('keydown', (event) => {
    const shortcut = (event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'k';
    const slash = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey;

    if (shortcut || (slash && !dialog.open && !isTypingTarget(event.target))) {
      event.preventDefault();
      openSearch(document.activeElement);
    }
  });
}
