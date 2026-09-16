const button = document.querySelector('.menu-button');
const menu = document.querySelector('.mobile-nav');
const desktopBreakpoint = 940;

function closeMenu() {
  button?.setAttribute('aria-expanded', 'false');
  if (menu) menu.hidden = true;
}

button?.addEventListener('click', () => {
  const open = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!open));
  if (menu) menu.hidden = open;
});

menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

window.addEventListener('resize', () => {
  if (window.innerWidth > desktopBreakpoint) closeMenu();
});

const terminalCode = document.querySelector('.terminal-panel pre code');
const terminalPanel = terminalCode?.closest('.terminal-panel');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

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

async function showTerminalLine(options, pause = 0) {
  const { textNode } = appendTerminalLine(options);
  textNode.textContent = options.text;
  await sleep(pause);
}

async function typeTerminalLine(options, pause = 0) {
  const { textNode } = appendTerminalLine(options);
  await typeTerminalText(textNode, options.text, options.speed);
  await sleep(pause);
}

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

  await showTerminalLine({ textClass: 'pass', text: 'RESULT › доказательства выполнения + отчёт ревью' });
  terminalPanel.classList.remove('is-running');
  terminalPanel.classList.add('is-complete');
}

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
    runTerminalDemo();
  }
}
