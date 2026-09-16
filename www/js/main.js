// -----------------------------------------------------------------------------
// Основной клиентский код сайта AI Development Harness.
//
// Файл отвечает только за поведение, общее для всех страниц:
// 1. мобильное меню;
// 2. демонстрационную анимацию терминала на главной;
// 3. кнопки копирования для команд и исполняемых блоков кода.
//
// Поиск подключается отдельно на каждой HTML-странице как ES-модуль. Его логика
// живёт в ./search.js и не требует промежуточной загрузки или bootstrap-кода здесь.
// -----------------------------------------------------------------------------

// Общий revision-токен клиентских ассетов. Он обязан совпадать с ?v= во всех
// HTML-страницах и других динамических подключениях. После любого изменения
// файла в www/js или www/css токен меняется во всём сайте целиком.
const ASSET_REVISION = '2f6c8a1d';

// -----------------------------------------------------------------------------
// Мобильная навигация
// -----------------------------------------------------------------------------

const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.querySelector('.mobile-nav');
const desktopBreakpoint = 940;

/**
 * Возвращает мобильное меню в закрытое состояние.
 *
 * Функция используется из нескольких мест: по Escape, после перехода по ссылке
 * и при возвращении окна к desktop-ширине. Благодаря этому aria-expanded и
 * атрибут hidden всегда остаются синхронизированы.
 */
function closeMobileMenu() {
  menuButton?.setAttribute('aria-expanded', 'false');
  if (mobileMenu) mobileMenu.hidden = true;
}

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  if (mobileMenu) mobileMenu.hidden = isOpen;
});

// После выбора пункта мобильной навигации меню не должно оставаться раскрытым.
mobileMenu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', closeMobileMenu);
});

// Escape закрывает меню независимо от того, на каком его элементе находится фокус.
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMobileMenu();
});

// При расширении окна мобильное меню прячется, чтобы не сохранять невидимое
// состояние aria-expanded="true" при переходе между breakpoint-ами.
window.addEventListener('resize', () => {
  if (window.innerWidth > desktopBreakpoint) closeMobileMenu();
});

// -----------------------------------------------------------------------------
// Анимированный пример терминальной сессии на главной странице
// -----------------------------------------------------------------------------

const terminalCode = document.querySelector('.terminal-panel pre code');
const terminalPanel = terminalCode?.closest('.terminal-panel');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Небольшой Promise-helper для последовательной анимации строк терминала. */
const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Добавляет в терминал одну строку и возвращает узел, в который затем можно
 * либо мгновенно записать текст, либо напечатать его посимвольно.
 */
function appendTerminalLine({ prefix, prefixClass, textClass, gap = false }) {
  const line = document.createElement('span');
  line.className = `terminal-line${gap ? ' terminal-line--gap' : ''}`;

  if (prefix) {
    const prefixNode = document.createElement('span');
    prefixNode.className = prefixClass || '';
    prefixNode.textContent = prefix;
    line.append(prefixNode, document.createTextNode(' '));
  }

  const textNode = document.createElement('span');
  if (textClass) textNode.className = textClass;
  line.append(textNode);

  terminalCode.append(line);
  return { line, textNode };
}

/**
 * Имитирует печать текста человеком и временно показывает мигающий курсор.
 * Небольшая случайность в задержке делает движение менее механическим.
 */
async function typeTerminalText(target, text, speed) {
  const cursor = document.createElement('span');
  cursor.className = 'terminal-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  target.after(cursor);

  for (const char of text) {
    target.textContent += char;
    await sleep(speed + Math.random() * 18);
  }

  await sleep(180);
  cursor.remove();
}

/** Добавляет строку целиком и выдерживает паузу перед следующим действием. */
async function showTerminalLine(options, pause = 0) {
  const { textNode } = appendTerminalLine(options);
  textNode.textContent = options.text;
  await sleep(pause);
}

/** Добавляет строку и печатает её посимвольно. */
async function typeTerminalLine(options, pause = 0) {
  const { textNode } = appendTerminalLine(options);
  await typeTerminalText(textNode, options.text, options.speed);
  await sleep(pause);
}

/**
 * Проигрывает демонстрационную сессию ровно один раз.
 *
 * data-animated защищает от повторного запуска, если IntersectionObserver
 * вызовет callback больше одного раза или функция будет вызвана вручную.
 */
async function runTerminalDemo() {
  if (!terminalCode || !terminalPanel || terminalPanel.dataset.animated === 'true') return;

  terminalPanel.dataset.animated = 'true';
  terminalPanel.classList.add('is-running');
  terminalCode.innerHTML = '';

  await sleep(220);
  await typeTerminalLine({
    prefix: 'YOU ›',
    prefixClass: 'prompt',
    text: 'ADD STEP: Добавить экспорт отчётов в PDF',
    speed: 28,
  }, 420);

  await typeTerminalLine({
    prefix: 'HARNESS ›',
    prefixClass: 'muted',
    textClass: 'muted',
    text: 'проверяю REQ / ADR / зависимости…',
    speed: 18,
  }, 520);

  await showTerminalLine({ textClass: 'pass', text: 'CREATED › STEP-024' }, 180);
  await showTerminalLine({ text: 'Границы · Вне границ · Критерии приёмки · Проверки' }, 720);

  await typeTerminalLine({
    prefix: 'YOU ›',
    prefixClass: 'prompt',
    text: 'RUN STEP-024',
    speed: 34,
    gap: true,
  }, 460);

  await typeTerminalLine({
    textClass: 'command',
    text: 'PLAN → IMPLEMENT → VERIFY → REVIEW',
    speed: 24,
  }, 560);

  await showTerminalLine({
    textClass: 'pass',
    text: 'RESULT › доказательства выполнения + отчёт ревью',
  });

  terminalPanel.classList.remove('is-running');
  terminalPanel.classList.add('is-complete');
}

// Анимация стартует только когда пользователь действительно дошёл до терминала.
// Для prefers-reduced-motion оставляем статический HTML и ничего не анимируем.
if (terminalPanel && !reduceMotion) {
  if ('IntersectionObserver' in window) {
    const terminalObserver = new IntersectionObserver((entries, observer) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        runTerminalDemo();
      }
    }, { threshold: 0.35 });

    terminalObserver.observe(terminalPanel);
  } else {
    // Старые браузеры без IntersectionObserver получают рабочую анимацию сразу.
    runTerminalDemo();
  }
}

// -----------------------------------------------------------------------------
// Копирование команд и исполняемых блоков кода
// -----------------------------------------------------------------------------

const COPY_RESET_DELAY = 1600;

// Команды Harness распознаём отдельно от обычного кода. Это позволяет добавить
// кнопку к блоку с INIT PROJECT / RUN STEP и не показывать её, например, рядом
// с архитектурной ASCII-схемой, которая не предназначена для выполнения.
const HARNESS_COMMAND_PATTERN = /^(?:INIT PROJECT|ADD STEP|PLAN STEP|NEXT STEP|STATUS PROJECT|IMPLEMENT STEP|REVIEW STEP|FIX STEP|RUN STEP|AUDIT STEP|RECONCILE PROJECT|RELEASE CHECK|QUICK FIX|FIND SKILL|INSTALL SKILL|CREATE SKILL|GENERATE GITHUB TEMPLATES|CHECK HARNESS UPDATE|UPDATE HARNESS|GIT CHECK|COMMIT|PUSH|PR|SYNC)(?:\b|:|\s|$)/i;

// Набор намеренно ограничен общеупотребимыми CLI-командами, которые реально
// встречаются или могут появиться в документации сайта. Не пытаемся объявить
// любой <pre> «терминалом»: схемы и конфиги должны оставаться без кнопки Copy.
const SHELL_COMMAND_PATTERN = /^(?:cd|cp|mv|rm|mkdir|touch|cat|chmod|export|git|yarn|npm|npx|node|python|python3|docker|curl|wget)\b/i;

/**
 * Нормализует копируемый блок: убирает пустые строки по краям, но сохраняет
 * внутренние переводы строк и отступы, чтобы многострочную команду можно было
 * вставить обратно в терминал без искажений.
 */
function copyTextOf(node) {
  return (node?.textContent || '').replace(/\u00a0/g, ' ').trim();
}

/**
 * Определяет, является ли code-block исполняемым.
 *
 * Явный data-copy="terminal" всегда имеет приоритет. В остальных случаях
 * достаточно хотя бы одной значимой строки, начинающейся с команды Harness или
 * известной shell-команды. Комментарии и пустые строки при проверке пропускаем.
 */
function isExecutableCodeBlock(code) {
  const container = code.closest('.code-block');
  if (!container) return false;
  if (container.dataset.copy === 'terminal') return true;
  if (container.dataset.copy === 'false') return false;

  const lines = copyTextOf(code)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  return lines.some((line) => (
    HARNESS_COMMAND_PATTERN.test(line)
    || SHELL_COMMAND_PATTERN.test(line)
  ));
}

/**
 * Записывает текст в системный буфер обмена.
 *
 * В HTTPS/localhost используем современный Clipboard API. Fallback через
 * временный textarea нужен для окружений, где Clipboard API недоступен или
 * заблокирован политикой браузера. Временный элемент сразу удаляется.
 */
async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();

  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Браузер не разрешил копирование в буфер обмена');
}

/** Создаёт одну унифицированную кнопку копирования для команды или code-block. */
function createCopyButton({ getText, ariaLabel }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-button';
  button.textContent = 'Копировать';
  button.setAttribute('aria-label', ariaLabel);

  let resetTimer = null;

  button.addEventListener('click', async () => {
    const text = getText();
    if (!text) return;

    try {
      await writeClipboard(text);
      button.textContent = 'Скопировано';
      button.classList.add('is-copied');

      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        button.textContent = 'Копировать';
        button.classList.remove('is-copied');
      }, COPY_RESET_DELAY);
    } catch (error) {
      // Ошибка не должна ломать страницу. Даём короткую визуальную обратную
      // связь и оставляем подробность в console для диагностики.
      button.textContent = 'Не удалось';
      button.classList.add('is-error');
      console.error('Не удалось скопировать текст', error);

      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        button.textContent = 'Копировать';
        button.classList.remove('is-error');
      }, COPY_RESET_DELAY);
    }
  });

  return button;
}

/**
 * Подключает стили кнопок динамически вместе с поведением. Такой подход не
 * требует добавлять отдельный <link> на каждую HTML-страницу и при этом сами
 * стили всё равно живут в общем каталоге /css.
 */
function installCopyStyles() {
  if (document.querySelector('link[data-copy-styles]')) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `/css/copy.css?v=${ASSET_REVISION}`;
  link.dataset.copyStyles = 'true';
  document.head.append(link);
}

/**
 * Добавляет Copy UI только к действительно копируемым элементам.
 *
 * 1. На странице справочника каждая .command-item получает кнопку рядом с
 *    названием команды.
 * 2. В обычной документации кнопка появляется только у распознанных исполняемых
 *    .code-block. Архитектурные схемы и прочие демонстрационные блоки не трогаем.
 */
function installCopyButtons() {
  const commandItems = [...document.querySelectorAll('.command-item')];
  const executableBlocks = [...document.querySelectorAll('.code-block pre code')]
    .filter(isExecutableCodeBlock);

  if (!commandItems.length && !executableBlocks.length) return;
  installCopyStyles();

  for (const commandItem of commandItems) {
    if (commandItem.querySelector('.copy-button')) continue;

    const heading = commandItem.querySelector('h3');
    const code = heading?.querySelector('code');
    if (!heading || !code) continue;

    const commandText = copyTextOf(code);
    heading.classList.add('copyable-heading');
    heading.append(createCopyButton({
      getText: () => copyTextOf(code),
      ariaLabel: `Копировать команду ${commandText}`,
    }));
  }

  for (const code of executableBlocks) {
    const block = code.closest('.code-block');
    if (!block || block.querySelector(':scope > .copy-button')) continue;

    block.classList.add('is-copyable');
    block.append(createCopyButton({
      getText: () => copyTextOf(code),
      ariaLabel: 'Копировать блок команд',
    }));
  }
}

installCopyButtons();
