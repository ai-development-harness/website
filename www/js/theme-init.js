// -----------------------------------------------------------------------------
// Ранняя инициализация цветовой темы.
//
// Этот файл подключается в <head> синхронно и ДО таблиц стилей. Его задача —
// выставить data-theme ещё до первого рендера страницы, чтобы при сохранённой
// светлой теме пользователь не видел короткую вспышку тёмного интерфейса.
//
// Здесь намеренно нет UI и обработчиков клика: переключатель создаёт main.js
// после загрузки DOM. Этот файл только выбирает исходную тему.
// -----------------------------------------------------------------------------

(() => {
  const STORAGE_KEY = 'aih:theme';
  const LIGHT_THEME = 'light';
  const DARK_THEME = 'dark';

  /** Возвращает сохранённый выбор пользователя или null. */
  function readStoredTheme() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === LIGHT_THEME || value === DARK_THEME ? value : null;
    } catch {
      // В privacy mode localStorage может быть недоступен. Это не должно мешать
      // загрузке сайта — в таком случае просто используем системную тему.
      return null;
    }
  }

  /** Системная тема используется только пока пользователь не сделал свой выбор. */
  function preferredSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: light)').matches
      ? LIGHT_THEME
      : DARK_THEME;
  }

  const theme = readStoredTheme() || preferredSystemTheme();

  // data-theme — единственный селектор, на который опирается theme.css.
  document.documentElement.dataset.theme = theme;

  // color-scheme помогает браузеру сразу подобрать правильные системные цвета
  // для встроенных контролов и полос прокрутки.
  document.documentElement.style.colorScheme = theme;

  // Обновляем системный цвет вкладки/браузера ещё до основного JS.
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute('content', theme === LIGHT_THEME ? '#f6f8fc' : '#050b14');
  }
})();
