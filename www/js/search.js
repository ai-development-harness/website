// -----------------------------------------------------------------------------
// Клиентский поиск по сайту AI Development Harness.
//
// Поиск намеренно не требует backend, отдельного build-step или заранее
// сгенерированного JSON-индекса. Индекс строится прямо из опубликованных HTML-
// страниц, а список страниц берётся из sitemap.xml.
//
// Жизненный цикл индекса:
// 1. при первом открытии поиска проверяем sessionStorage;
// 2. если кэша нет, он повреждён или относится к другому revision — загружаем
//    публичные HTML-страницы;
// 3. строим компактный индекс, сгруппированный по path страницы;
// 4. сохраняем его в sessionStorage вместе с revision клиентских ассетов;
// 5. при переходах и reload в той же вкладке переиспользуем готовый индекс;
// 6. после закрытия вкладки sessionStorage очищается браузером, и следующая
//    сессия строит индекс заново из актуального сайта.
// -----------------------------------------------------------------------------

// Query-параметр текущего ES-модуля содержит общий revision сайта. Мы читаем его
// через import.meta.url вместо дублирования токена в search.js: так динамически
// подключаемый search.css автоматически получает ту же версию, что и сам модуль.
const ASSET_REVISION = new URL(import.meta.url).searchParams.get('v') || '';

/** Добавляет к локальному ассету revision текущего модуля, если он присутствует. */
function versionedAsset(path) {
  return ASSET_REVISION ? `${path}?v=${ASSET_REVISION}` : path;
}

// Если sitemap временно недоступен, поиск всё равно должен работать на текущем
// наборе публичных страниц. Этот список — аварийный fallback, а не второй
// канонический источник навигации.
const FALLBACK_PUBLIC_PATHS = [
  '/',
  '/getting-started/',
  '/workflow/',
  '/commands/',
  '/architecture/',
  '/repository/',
  '/validators/',
  '/maintenance/',
  '/faq/',
  '/runtimes/',
];

const MAX_RESULTS = 8;

// Версия ключа меняется только при несовместимом изменении структуры индекса.
// Актуальность содержимого внутри этого формата проверяется отдельно по revision.
export const SEARCH_INDEX_STORAGE_KEY = 'aih:search-index:v2';

// В памяти страницы Promise нужен для дедупликации параллельных запросов: если
// пользователь быстро откроет поиск дважды, индекс всё равно строится один раз.
let indexPromise = null;

// Элемент, из которого поиск был открыт. После закрытия вернём ему фокус.
let lastTrigger = null;

// -----------------------------------------------------------------------------
// Нормализация поискового текста
// -----------------------------------------------------------------------------

/**
 * Приводит текст к форме, удобной для сравнения:
 * - русский регистр не влияет на поиск;
 * - «ё» и «е» считаются эквивалентными;
 * - повторные пробелы схлопываются.
 *
 * Нормализованные копии намеренно НЕ хранятся в индексе: для небольшого сайта
 * дешевле вычислять их при поиске, чем дублировать почти все строки в памяти и
 * sessionStorage.
 */
export function normalizeSearchText(value = '') {
  return value
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Разбивает запрос на значимые токены для многословного поиска. */
function tokenize(value) {
  return normalizeSearchText(value)
    .split(/[^a-zа-я0-9_.:/-]+/i)
    .filter((token) => token.length > 1);
}

/**
 * Строит стабильный fragment для конкретной команды Harness.
 *
 * Аргументы в угловых скобках выкидываются, чтобы, например,
 * `STEP ADD: <описание>` всегда даёт `command-step-add`, а не якорь,
 * зависящий от текста placeholder-а.
 */
export function commandAnchorFromTitle(value = '') {
  const withoutArguments = value.replace(/<[^>]*>/g, ' ');
  const slug = normalizeSearchText(withoutArguments)
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  return slug ? `command-${slug}` : '';
}

// -----------------------------------------------------------------------------
// Получение списка публичных страниц
// -----------------------------------------------------------------------------

/**
 * Читает sitemap.xml и возвращает только pathname текущего сайта.
 *
 * Любая проблема — сетевой сбой, HTTP-ошибка или битый XML — переводит поиск на
 * безопасный fallback. Ошибка sitemap не должна полностью ломать поиск.
 */
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

    // Set убирает случайные дубликаты URL в sitemap.
    return [...new Set(paths.length ? paths : FALLBACK_PUBLIC_PATHS)];
  } catch {
    return [...FALLBACK_PUBLIC_PATHS];
  }
}

// -----------------------------------------------------------------------------
// Извлечение поисковых данных из HTML
// -----------------------------------------------------------------------------

/**
 * Возвращает читаемый текст DOM-узла без служебной навигации и скрытых элементов.
 *
 * Для section можно дополнительно выкинуть .command-item: команды индексируются
 * отдельными entries и иначе их текст искусственно повышал бы вес родительского
 * раздела.
 */
function textOf(element, { withoutCommands = false } = {}) {
  if (!element) return '';

  const clone = element.cloneNode(true);
  clone
    .querySelectorAll('script, style, nav, .toc, .prev-next, [aria-hidden="true"]')
    .forEach((node) => node.remove());

  if (withoutCommands) {
    clone.querySelectorAll('.command-item').forEach((node) => node.remove());
  }

  return clone.textContent?.replace(/\s+/g, ' ').trim() || '';
}

/** Выбирает человекочитаемый заголовок страницы для выдачи и ранжирования. */
function pageTitleFrom(documentNode) {
  return documentNode.querySelector('h1')?.textContent?.trim()
    || documentNode.title?.replace(/\s+[—|-].*$/, '').trim()
    || 'Без названия';
}

/**
 * Создаёт компактную запись раздела/команды.
 *
 * В entry нет path, href и pageTitle — они уже известны из родительского объекта
 * страницы. keywords сохраняем только если они действительно отличаются от title.
 */
function createEntry({ fragment = '', title, text, kind, keywords }) {
  const entry = { fragment, title, text, kind };
  if (keywords && keywords !== title) entry.keywords = keywords;
  return entry;
}

/**
 * Преобразует HTML одной страницы в компактное представление:
 *
 * {
 *   title,
 *   text,
 *   entries: [{ fragment, title, text, kind }]
 * }
 *
 * Ключ path добавляется уровнем выше — в buildSearchIndex().
 */
export function extractSearchPage(html, path) {
  const documentNode = new DOMParser().parseFromString(html, 'text/html');
  const main = documentNode.querySelector('main');
  if (!main) return null;

  const title = pageTitleFrom(documentNode);
  const description = documentNode
    .querySelector('meta[name="description"]')
    ?.getAttribute('content') || '';

  const page = {
    title,
    text: description || textOf(main).slice(0, 900),
    entries: [],
  };

  // Обычные секции индексируются по их существующему HTML id.
  for (const section of main.querySelectorAll('section[id]')) {
    const fragment = section.id;
    const heading = section.querySelector('h2, h3');
    if (!fragment || !heading) continue;

    const sectionTitle = heading.textContent?.trim();
    if (!sectionTitle) continue;

    page.entries.push(createEntry({
      fragment,
      title: sectionTitle,
      text: textOf(section, { withoutCommands: true }),
      kind: 'section',
    }));
  }

  // Команды индексируются отдельными entries, чтобы точное совпадение имени
  // команды имело больший вес и вело прямо к карточке этой команды.
  for (const command of main.querySelectorAll('.command-item')) {
    const code = command.querySelector('h3 code');
    if (!code) continue;

    const commandTitle = code.textContent?.trim();
    if (!commandTitle) continue;

    const section = command.closest('section[id]');
    page.entries.push(createEntry({
      fragment: command.id || commandAnchorFromTitle(commandTitle) || section?.id || '',
      title: commandTitle,
      text: textOf(command),
      kind: 'command',
    }));
  }

  // Защита от случайного повторного извлечения одной и той же записи.
  const unique = new Map();
  for (const entry of page.entries) {
    unique.set(`${entry.kind}|${entry.fragment}|${entry.title}`, entry);
  }
  page.entries = [...unique.values()];

  return page;
}

/**
 * Загружает публичные страницы параллельно и строит индекс вида:
 *
 * {
 *   "/commands/": { title, text, entries: [...] },
 *   "/faq/":      { title, text, entries: [...] }
 * }
 *
 * Ошибка одной страницы не обнуляет весь индекс: пригодные страницы сохраняются,
 * а построение завершается ошибкой только если индексировать не удалось ничего.
 */
export async function buildSearchIndex() {
  const paths = await getPublicPaths();

  const settledPages = await Promise.allSettled(paths.map(async (path) => {
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: { Accept: 'text/html' },
    });

    if (!response.ok) {
      throw new Error(`Не удалось загрузить ${path}: ${response.status}`);
    }

    return [path, extractSearchPage(await response.text(), path)];
  }));

  const pages = settledPages
    .filter((result) => result.status === 'fulfilled' && result.value?.[1])
    .map((result) => result.value);

  if (!pages.length) {
    throw new Error('Не удалось получить ни одной страницы для поискового индекса');
  }

  return Object.fromEntries(pages);
}

// -----------------------------------------------------------------------------
// sessionStorage-кэш поискового индекса
// -----------------------------------------------------------------------------

/**
 * Проверяет только структурные инварианты индекса.
 *
 * Нам не нужна тяжёлая JSON-schema библиотека: достаточно убедиться, что объект
 * похож на текущий формат и содержит только поддерживаемые типы entries.
 */
function isSearchIndex(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const pages = Object.values(value);
  if (!pages.length) return false;

  return pages.every((page) => (
    page
    && typeof page === 'object'
    && typeof page.title === 'string'
    && typeof page.text === 'string'
    && Array.isArray(page.entries)
    && page.entries.every((entry) => (
      entry
      && typeof entry === 'object'
      && typeof entry.fragment === 'string'
      && typeof entry.title === 'string'
      && typeof entry.text === 'string'
      && ['section', 'command'].includes(entry.kind)
    ))
  ));
}

/** Проверяет оболочку кэша и соответствие текущему revision клиентских ассетов. */
function isSearchIndexCache(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && typeof value.revision === 'string'
    && value.revision === ASSET_REVISION
    && isSearchIndex(value.index)
  );
}

/** Возвращает актуальный валидный индекс из sessionStorage или null. */
function readSessionIndex() {
  try {
    const cached = sessionStorage.getItem(SEARCH_INDEX_STORAGE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    return isSearchIndexCache(parsed) ? parsed.index : null;
  } catch {
    // JSON.parse, privacy mode и ограничения storage не должны ломать поиск.
    return null;
  }
}

/** Сохраняет индекс с revision, но не делает sessionStorage обязательной зависимостью. */
function writeSessionIndex(index) {
  try {
    sessionStorage.setItem(SEARCH_INDEX_STORAGE_KEY, JSON.stringify({
      revision: ASSET_REVISION,
      index,
    }));
  } catch {
    // Если storage отключён или переполнен, текущая страница продолжит работать
    // с индексом из памяти. На следующей странице он просто построится заново.
  }
}

/**
 * Главная точка доступа к индексу для UI.
 *
 * Порядок источников: Promise в памяти → sessionStorage → полная индексация.
 * При ошибке Promise сбрасывается, чтобы следующая попытка могла восстановиться.
 */
export function getSearchIndex() {
  indexPromise ||= (async () => {
    const cached = readSessionIndex();
    if (cached) return cached;

    const index = await buildSearchIndex();
    writeSessionIndex(index);
    return index;
  })().catch((error) => {
    indexPromise = null;
    throw error;
  });

  return indexPromise;
}

// -----------------------------------------------------------------------------
// Подготовка результатов и ранжирование
// -----------------------------------------------------------------------------

/** Собирает URL только тогда, когда запись реально участвует в поиске. */
function hrefFor(path, fragment = '') {
  return fragment ? `${path}#${fragment}` : path;
}

/**
 * Временно разворачивает компактный индекс в плоские search items.
 *
 * Это вычисляемое представление живёт только во время поиска; в sessionStorage
 * оно не сохраняется, поэтому path/pageTitle/href не дублируются постоянно.
 */
function materializeSearchItems(index) {
  const items = [];

  for (const [path, page] of Object.entries(index || {})) {
    items.push({
      path,
      href: path,
      pageTitle: page.title,
      title: page.title,
      text: page.text,
      kind: 'page',
      keywords: '',
    });

    for (const entry of page.entries) {
      items.push({
        path,
        href: hrefFor(path, entry.fragment),
        pageTitle: page.title,
        title: entry.title,
        text: entry.text,
        kind: entry.kind,
        keywords: entry.keywords || '',
      });
    }
  }

  return items;
}

/**
 * Вычисляет вес одного результата для запроса.
 *
 * Сначала требуем присутствие всех значимых токенов хотя бы в одном поле. Затем
 * начисляем вес: точный title > keywords > page title > обычный текст. Команды
 * получают небольшой дополнительный бонус, потому что пользователь часто ищет
 * их по точному техническому имени.
 */
export function scoreSearchItem(item, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const tokens = tokenize(normalizedQuery);
  if (!tokens.length) return 0;

  const normalizedTitle = normalizeSearchText(item.title);
  const normalizedPageTitle = normalizeSearchText(item.pageTitle);
  const normalizedKeywords = normalizeSearchText(item.keywords);
  const normalizedText = normalizeSearchText(item.text);
  const fields = [normalizedTitle, normalizedPageTitle, normalizedKeywords, normalizedText];

  if (!tokens.every((token) => fields.some((field) => field.includes(token)))) {
    return 0;
  }

  let score = 0;

  if (normalizedTitle === normalizedQuery) score += 420;
  else if (normalizedTitle.startsWith(normalizedQuery)) score += 300;
  else if (normalizedTitle.includes(normalizedQuery)) score += 240;

  if (normalizedKeywords === normalizedQuery) score += 380;
  else if (normalizedKeywords.includes(normalizedQuery)) score += 220;

  if (normalizedPageTitle.includes(normalizedQuery)) score += 130;
  if (normalizedText.includes(normalizedQuery)) score += 90;

  for (const token of tokens) {
    if (normalizedTitle.includes(token)) score += 70;
    if (normalizedKeywords.includes(token)) score += 65;
    if (normalizedPageTitle.includes(token)) score += 28;
    if (normalizedText.includes(token)) score += 14;
  }

  if (item.kind === 'command') score += 35;
  if (item.kind === 'section') score += 15;

  return score;
}

/** Возвращает только лучшие результаты в стабильном порядке. */
export function rankSearchResults(index, query, limit = MAX_RESULTS) {
  return materializeSearchItems(index)
    .map((item) => ({ item, score: scoreSearchItem(item, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'ru'))
    .slice(0, limit)
    .map(({ item }) => item);
}

/**
 * Строит короткий фрагмент текста вокруг первого значимого совпадения.
 * Длина ограничена, чтобы выдача оставалась компактной на мобильных экранах.
 */
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

/**
 * Безопасно подсвечивает совпадение через DOM-узлы, а не innerHTML.
 * Пользовательский запрос никогда не интерпретируется как HTML.
 */
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

// -----------------------------------------------------------------------------
// DOM интерфейса поиска
// -----------------------------------------------------------------------------

/** Создаёт компактную кнопку поиска для header-actions. */
function createSearchButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'site-search-button';
  button.setAttribute('aria-label', 'Открыть поиск по сайту');
  button.innerHTML = '<span class="site-search-button__icon" aria-hidden="true"></span><span class="site-search-button__label">Поиск</span><kbd>/</kbd>';
  return button;
}

/** Создаёт modal dialog со всеми необходимыми ARIA-связями. */
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

/** Подключает search.css ровно один раз на страницу. */
function installSearchStyles() {
  if (document.querySelector('link[data-search-styles]')) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = versionedAsset('/css/search.css');
  link.dataset.searchStyles = 'true';
  document.head.append(link);
}

/**
 * Назначает карточкам команд те же стабильные id, которые использует индекс.
 *
 * HTML остаётся лаконичным: id генерируются централизованно из имени команды.
 * Если страница открыта сразу с #command-..., после установки id выполняем
 * явный scrollIntoView, потому что браузер мог попытаться найти fragment раньше.
 */
function installCommandAnchors() {
  let requestedId = location.hash.slice(1);

  try {
    requestedId = decodeURIComponent(requestedId);
  } catch {
    // Некорректно закодированный fragment просто не используем для автопрокрутки.
  }

  let requestedCommand = null;

  for (const command of document.querySelectorAll('.command-item')) {
    const code = command.querySelector('h3 code');
    if (!code) continue;

    const id = command.id || commandAnchorFromTitle(code.textContent?.trim() || '');
    if (!id) continue;

    command.id = id;
    if (requestedId === id) requestedCommand = command;
  }

  if (requestedCommand) {
    requestAnimationFrame(() => requestedCommand.scrollIntoView({ block: 'start' }));
  }
}

/** Горячая клавиша `/` не должна перехватываться во время ввода текста. */
function isTypingTarget(target) {
  return target instanceof HTMLElement && (
    target.matches('input, textarea, select')
    || target.isContentEditable
  );
}

/** Человекочитаемый тип результата для строки meta. */
function resultLabel(item) {
  if (item.kind === 'command') return 'Команда';
  if (item.kind === 'section') return 'Раздел';
  return 'Страница';
}

// -----------------------------------------------------------------------------
// Инициализация и взаимодействие с поиском
// -----------------------------------------------------------------------------

export function initSiteSearch() {
  // Якоря команд полезны даже до первого открытия поиска.
  installCommandAnchors();

  // Защита от двойной инициализации при повторном import/вызове.
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

  let index = null;
  let activeIndex = -1;
  let currentResults = [];

  /**
   * Переключает активный результат и синхронизирует aria-activedescendant.
   * Индекс циклический: ArrowDown с последнего возвращает к первому и наоборот.
   */
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

  /** Строит DOM выдачи для текущего значения input. */
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

      // Hover мышью синхронизируем с клавиатурным activeIndex.
      link.addEventListener('mouseenter', () => setActiveResult(resultIndex));
      link.addEventListener('click', () => dialog.close());
      results.append(link);
    });

    setActiveResult(0);
  };

  /** Лениво получает индекс только при первом реальном открытии поиска. */
  const ensureIndex = async () => {
    if (index) return;

    status.textContent = 'Загружаю поисковый индекс…';
    input.disabled = true;

    try {
      index = await getSearchIndex();
      status.textContent = 'Введите запрос: название раздела, команду или термин.';
    } catch {
      status.textContent = 'Не удалось загрузить поисковый индекс. Попробуйте ещё раз.';
    } finally {
      input.disabled = false;
      input.focus();
    }
  };

  /** Открывает modal и запоминает элемент, которому потом вернём фокус. */
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

  // ArrowUp/ArrowDown меняют выбор, Enter открывает текущий результат.
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

  // Клик по backdrop закрывает dialog, клик по содержимому — нет.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  // При закрытии очищаем временный UI и возвращаем клавиатурный фокус туда,
  // откуда пользователь вызвал поиск.
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('search-open');
    input.value = '';
    results.replaceChildren();
    status.textContent = '';
    lastTrigger?.focus();
  });

  // Глобальные shortcuts. Ctrl+K сохраняем для совместимых браузеров, хотя Chrome
  // на Windows/Linux резервирует его для адресной строки. Alt+K и `/` остаются
  // браузерно-безопасными вариантами; event.code делает K и Slash независимыми
  // от активной раскладки клавиатуры.
  document.addEventListener('keydown', (event) => {
    const keyK = event.code === 'KeyK' || event.key.toLocaleLowerCase() === 'k';
    const commandShortcut = (event.ctrlKey || event.metaKey) && !event.altKey && keyK;
    const altShortcut = event.altKey && !event.ctrlKey && !event.metaKey && keyK;
    const slashKey = event.key === '/' || event.code === 'Slash' || event.code === 'NumpadDivide';
    const slash = slashKey
      && !event.ctrlKey
      && !event.metaKey
      && !event.altKey;

    if (commandShortcut || altShortcut || (slash && !dialog.open && !isTypingTarget(event.target))) {
      event.preventDefault();
      openSearch(document.activeElement);
    }
  });
}

// search.js подключается на каждой странице отдельным <script type="module">.
// Модуль сам устанавливает кнопку, диалог, shortcuts и якоря команд.
initSiteSearch();