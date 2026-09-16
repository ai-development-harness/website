// -----------------------------------------------------------------------------
// Переключатель цветовой темы AI Development Harness.
//
// Начальную тему выставляет theme-init.js ещё в <head>, до первого рендера.
// Этот файл отвечает только за пользовательское управление после загрузки DOM:
// - создаёт кнопку в шапке;
// - переключает light/dark;
// - сохраняет явный выбор пользователя в localStorage;
// - пока явного выбора нет, реагирует на изменение системной темы.
// -----------------------------------------------------------------------------

(() => {
  const STORAGE_KEY = 'aih:theme';
  const LIGHT_THEME = 'light';
  const DARK_THEME = 'dark';
  const LIGHT_THEME_COLOR = '#f6f8fc';
  const DARK_THEME_COLOR = '#050b14';

  /** Возвращает сохранённую тему или null, если пользователь ещё не выбирал её. */
  function readStoredTheme() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === LIGHT_THEME || value === DARK_THEME ? value : null;
    } catch {
      return null;
    }
  }

  /** Сохраняет явный выбор пользователя; отсутствие storage не ломает UI. */
  function storeTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // В privacy mode тема останется активной до закрытия текущей страницы.
    }
  }

  /** Обновляет meta theme-color вместе с визуальной темой страницы. */
  function updateThemeColor(theme) {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === LIGHT_THEME ? LIGHT_THEME_COLOR : DARK_THEME_COLOR);
  }

  /**
   * Применяет тему и синхронизирует доступное имя переключателя.
   * Иконка строится CSS-ом: в тёмной теме показывается солнце, в светлой — луна.
   */
  function applyTheme(theme, button) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    updateThemeColor(theme);

    if (button) {
      const nextThemeLabel = theme === DARK_THEME ? 'светлую' : 'тёмную';
      button.setAttribute('aria-label', `Включить ${nextThemeLabel} тему`);
      button.setAttribute('title', `Включить ${nextThemeLabel} тему`);
    }
  }

  /** Создаёт компактную кнопку, визуально совместимую с кнопкой поиска. */
  function createThemeButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.innerHTML = '<span class="theme-toggle__icon" aria-hidden="true"></span>';
    return button;
  }

  const headerActions = document.querySelector('.header-actions');
  if (!headerActions || document.querySelector('.theme-toggle')) return;

  const button = createThemeButton();
  const systemPreference = window.matchMedia('(prefers-color-scheme: light)');

  // theme-init.js уже выставил data-theme. Fallback нужен на случай, если ранний
  // скрипт был заблокирован расширением или загрузился с ошибкой.
  const currentTheme = document.documentElement.dataset.theme
    || (systemPreference.matches ? LIGHT_THEME : DARK_THEME);

  applyTheme(currentTheme, button);
  headerActions.prepend(button);

  button.addEventListener('click', () => {
    const activeTheme = document.documentElement.dataset.theme === LIGHT_THEME
      ? LIGHT_THEME
      : DARK_THEME;
    const nextTheme = activeTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;

    storeTheme(nextTheme);
    applyTheme(nextTheme, button);
  });

  // Системную тему слушаем только до первого явного выбора. После сохранения
  // пользовательская настройка всегда имеет приоритет над prefers-color-scheme.
  systemPreference.addEventListener('change', (event) => {
    if (readStoredTheme()) return;
    applyTheme(event.matches ? LIGHT_THEME : DARK_THEME, button);
  });
})();
