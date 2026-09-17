// -----------------------------------------------------------------------------
// Динамическое отображение последнего опубликованного релиза Harness.
//
// GitHub Releases остаётся источником истины для номера версии. В HTML хранится
// только стабильная fallback-ссылка /releases/latest, поэтому новый релиз не
// требует отдельного изменения сайта. Ответ GitHub API кешируется на один час в
// localStorage: этого достаточно, чтобы не делать лишний публичный API-запрос при
// каждом открытии страницы и при этом довольно быстро показывать новый релиз.
// -----------------------------------------------------------------------------

(() => {
  const releaseLink = document.querySelector('[data-latest-release]');
  if (!releaseLink) return;

  const API_URL = 'https://api.github.com/repos/ai-development-harness/ai-development-harness-template/releases/latest';
  const CACHE_KEY = 'aih.latest-release.v1';
  const CACHE_TTL_MS = 60 * 60 * 1000;

  /** Показывает проверенные данные релиза и обновляет ссылку на GitHub Release. */
  function renderRelease(release) {
    releaseLink.textContent = `Latest release: ${release.tagName} →`;
    releaseLink.href = release.url;
  }

  /**
   * Читает кеш без предположения, что localStorage всегда доступен. Браузер может
   * запретить его политикой приватности или окружением, и это не должно ломать UI.
   */
  function readCache() {
    try {
      const rawValue = window.localStorage.getItem(CACHE_KEY);
      if (!rawValue) return null;

      const parsed = JSON.parse(rawValue);
      if (
        typeof parsed?.tagName !== 'string'
        || typeof parsed?.url !== 'string'
        || typeof parsed?.savedAt !== 'number'
      ) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  /** Сохраняет только минимальные данные, нужные для повторного отображения. */
  function writeCache(release) {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify({
        ...release,
        savedAt: Date.now(),
      }));
    } catch {
      // Недоступный localStorage не критичен: сайт продолжит работать без кеша.
    }
  }

  /**
   * Преобразует ответ GitHub в небольшой внутренний объект и не принимает
   * неожиданные URL. Это не даёт случайному/повреждённому ответу заменить href
   * ссылки на посторонний origin.
   */
  function normalizeRelease(payload) {
    if (typeof payload?.tag_name !== 'string' || typeof payload?.html_url !== 'string') {
      throw new Error('GitHub Releases API вернул неполные данные');
    }

    const releaseUrl = new URL(payload.html_url);
    if (releaseUrl.origin !== 'https://github.com') {
      throw new Error('GitHub Releases API вернул неожиданный origin');
    }

    return {
      tagName: payload.tag_name,
      url: releaseUrl.href,
    };
  }

  const cachedRelease = readCache();
  if (cachedRelease) renderRelease(cachedRelease);

  const cacheIsFresh = cachedRelease
    && Date.now() - cachedRelease.savedAt < CACHE_TTL_MS;
  if (cacheIsFresh) return;

  fetch(API_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`GitHub Releases API ответил HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(normalizeRelease)
    .then((release) => {
      renderRelease(release);
      writeCache(release);
    })
    .catch(() => {
      // При ошибке оставляем стабильную /releases/latest fallback-ссылку или
      // ранее показанное кешированное значение. Основной контент сайта не зависит
      // от доступности GitHub API.
    });
})();
