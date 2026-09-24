/*
 * Интерактивные схемы выполнения команд Harness.
 *
 * Статическая мини-схема уже хранится рядом с каждой командой в HTML.
 * Этот модуль намеренно не дублирует её целиком: он считывает звенья из DOM,
 * добавляет общую границу dispatcher и накладывает только правила развилок.
 * Благодаря этому обычная документация остаётся читаемой без JavaScript,
 * а интерактивное представление развивается поверх того же содержания.
 */

const COMMAND_KEYS = [
  'HARNESS UPDATE CHECK',
  'HARNESS UPDATE APPLY',
  'PROJECT QUICK FIX:',
  'GITHUB GENERATE TEMPLATES',
  'STEP IMPLEMENT STEP-NNN',
  'STEP REVIEW STEP-NNN',
  'STEP PLAN STEP-NNN',
  'STEP SHOW STEP-NNN',
  'STEP FIX STEP-NNN',
  'STEP RUN STEP-NNN',
  'STEP AUDIT STEP-NNN',
  'SKILL INSTALL:',
  'SKILL CREATE:',
  'SKILL FIND:',
  'GIT PR FINISH',
  'GIT COMMIT',
  'PROJECT RECONCILE',
  'PROJECT STATUS',
  'PROJECT INIT',
  'STEP ADD:',
  'STEP LIST',
  'STEP NEXT',
  'RELEASE CHECK',
  'HARNESS HELP',
  'HARNESS STATUS',
  'HARNESS RESUME',
  'HARNESS DOCTOR',
  'HARNESS CONFIG',
  'GIT CHECK',
  'GIT PUSH',
  'GIT PR',
  'GIT SYNC',
];

const DETERMINISTIC_COMMANDS = new Set([
  'PROJECT STATUS',
  'STEP LIST',
  'STEP SHOW STEP-NNN',
  'STEP NEXT',
  'HARNESS HELP',
  'HARNESS STATUS',
  'HARNESS RESUME',
  'HARNESS DOCTOR',
  'HARNESS CONFIG',
  'HARNESS UPDATE CHECK',
  'HARNESS UPDATE APPLY',
  'GIT CHECK',
  'GIT PR FINISH',
  'GIT SYNC',
]);

const CONDITIONAL_MODEL_COMMANDS = new Set([
  'STEP RUN STEP-NNN',
  'GIT PUSH',
]);

const MUTATING_COMMANDS = new Set([
  'PROJECT INIT',
  'PROJECT RECONCILE',
  'PROJECT QUICK FIX:',
  'STEP ADD:',
  'STEP PLAN STEP-NNN',
  'STEP IMPLEMENT STEP-NNN',
  'STEP REVIEW STEP-NNN',
  'STEP FIX STEP-NNN',
  'STEP RUN STEP-NNN',
  'STEP AUDIT STEP-NNN',
  'SKILL INSTALL:',
  'SKILL CREATE:',
  'GITHUB GENERATE TEMPLATES',
  'HARNESS UPDATE APPLY',
  'GIT COMMIT',
  'GIT PUSH',
  'GIT PR',
  'GIT PR FINISH',
  'GIT SYNC',
]);

const NODE_TYPE_LABELS = {
  input: 'Вход',
  contract: 'Контракт',
  decision: 'Развилка',
  action: 'Действие',
  agent: 'Модель',
  gate: 'Проверка',
  artifact: 'Артефакт',
  success: 'Результат',
  user: 'Пользователь',
  dispatcher: 'Диспетчер',
};

const option = (label, effect = 'continue', status = null, result = null) => ({
  label,
  effect,
  status,
  result,
});

/*
 * Здесь перечислены только смысловые развилки, которые нельзя корректно
 * вывести из одного CSS-класса узла. Для обычной обязательной проверки
 * достаточно общего правила PASS / BLOCKED.
 */
const BRANCH_RULES = {
  'HARNESS STATUS': {
    'Возможности GitHub PR': [
      option('Доступны'),
      option('Недоступны — показать ограничение'),
    ],
  },
  'HARNESS RESUME': {
    'Ровно одно продолжение?': [
      option('Да — продолжить'),
      option(
        'Нет или найдено несколько',
        'stop',
        'BLOCKED',
        'Harness не выбирает продолжение наугад. Пользователь получает причину блокировки.'
      ),
    ],
  },
  'HARNESS DOCTOR': {
    'Codex / Claude Code / gh': [
      option('Все доступны'),
      option('Часть необязательных возможностей отсутствует'),
    ],
  },
  'PROJECT INIT': {
    'Архитектура / ADR': [
      option('Решения уже определены'),
      option('Нужны ADR / OQ'),
    ],
  },
  'STEP ADD:': {
    'Поиск дубликатов и пересечений': [
      option('Дубликат не найден'),
      option(
        'Найден дубликат или пересечение',
        'finish',
        'STOP',
        'Новый STEP не создаётся: используется или уточняется существующий канонический артефакт.'
      ),
    ],
    'REQ / ADR / OQ / зависимости': [
      option('Достаточно нового STEP'),
      option('Создать или связать REQ / ADR / OQ'),
    ],
  },
  'STEP PLAN STEP-NNN': {
    'Подход к реализации': [
      option('Контекста достаточно'),
      option(
        'Требуется новое решение или уточнение',
        'stop',
        'BLOCKED',
        'План не фиксируется: сначала нужен ADR, OQ или корректировка контракта STEP.'
      ),
    ],
  },
  'STEP NEXT': {
    'Есть прерванный STEP?': [
      option(
        'Да — продолжить',
        'finish',
        'SUCCESS',
        'Возвращается точная команда RESUME для незавершённого STEP.'
      ),
      option('Нет — выбрать следующую работу'),
    ],
    'Зависимости / приоритет / риск / критический путь': [
      option('Есть доступный STEP'),
      option(
        'Доступной работы нет',
        'finish',
        'BLOCKED',
        'Harness не предлагает STEP, пока зависимости или блокирующие условия не будут сняты.'
      ),
    ],
  },
  'PROJECT STATUS': {
    'Расхождения / блокирующие проблемы': [
      option('Состояние согласовано'),
      option('Есть расхождения или блокировки'),
    ],
  },
  'STEP REVIEW STEP-NNN': {
    'Вердикт': [
      option(
        'PASS',
        'finish',
        'PASS',
        'Проверка пройдена. STEP может быть завершён в соответствии с контрактом.'
      ),
      option(
        'FAIL',
        'finish',
        'FAIL',
        'Найдены исправимые дефекты реализации. Следующая команда — STEP FIX STEP-NNN.'
      ),
      option(
        'BLOCKED',
        'stop',
        'BLOCKED',
        'Проблема находится в контракте, зависимости или обязательном решении. Цикл FIX не запускается.'
      ),
    ],
  },
  'STEP RUN STEP-NNN': {
    'Определить следующую команду': [
      option('Продолжить текущий цикл'),
      option('Возобновить сохранённое выполнение'),
    ],
    'Актуальный план?': [
      option('Да — перейти к реализации'),
      option('Нет — выполнить STEP PLAN'),
    ],
    'STEP PLAN STEP-NNN': [
      option('План нужен'),
      option('План уже актуален'),
    ],
  },
  'STEP AUDIT STEP-NNN': {
    'Нужен корректирующий STEP?': [
      option('Нет — зафиксировать результат'),
      option('Да — предложить отдельный STEP'),
    ],
  },
  'PROJECT QUICK FIX:': {
    'Соответствует критериям малой правки?': [
      option('Да — выполнить минимальную правку'),
      option(
        'Нет — изменение затрагивает контракт',
        'finish',
        'STOP',
        'PROJECT QUICK FIX прекращается. Пользователю предлагается STEP ADD: <описание>.'
      ),
    ],
  },
  'HARNESS UPDATE CHECK': {
    'Маршрут по графу обновлений': [
      option('Маршрут найден'),
      option(
        'Маршрута нет',
        'stop',
        'BLOCKED',
        'Обновление не применяется: целевой релиз недостижим по графу обновлений.'
      ),
    ],
  },
  'GIT CHECK': {
    'Подозрительные / посторонние изменения': [
      option('Не обнаружены'),
      option(
        'Обнаружены',
        'finish',
        'BLOCKED',
        'Проверка останавливается и показывает изменения, которые нельзя безопасно включить автоматически.'
      ),
    ],
  },
  'GIT COMMIT': {
    'Одна логическая группа': [
      option('Да — продолжить'),
      option(
        'Нет — изменения смешаны',
        'stop',
        'BLOCKED',
        'Коммит не создаётся: сначала нужно разделить изменения на логические группы.'
      ),
    ],
    'Тип коммита / политика ветки': [
      option('Политика разрешает коммит'),
      option(
        'Политика запрещает',
        'stop',
        'BLOCKED',
        'Git-policy запрещает создание коммита в текущем состоянии.'
      ),
    ],
  },
  'GIT PUSH': {
    'Политика PR': [
      option('Создать PR после публикации'),
      option('Переиспользовать существующий PR'),
      option('PR не требуется'),
    ],
  },
  'GIT PR': {
    'PR уже существует?': [
      option(
        'Да — переиспользовать',
        'finish',
        'SUCCESS',
        'Существующий PR переиспользуется после проверки опубликованной ревизии.'
      ),
      option('Нет — создать новый'),
    ],
  },
  'GIT SYNC': {
    'Сравнить локальную и удалённую ветки': [
      option(
        'Ветки совпадают',
        'finish',
        'SUCCESS',
        'Синхронизация не требуется.'
      ),
      option(
        'Локальная ветка позади',
        'finish',
        'SUCCESS',
        'В режиме ff-only допускается только безопасный fast-forward.'
      ),
      option(
        'Локальная ветка впереди',
        'finish',
        'SUCCESS',
        'Команда показывает расхождение; публикация выполняется отдельной GIT PUSH.'
      ),
      option(
        'Ветки разошлись',
        'stop',
        'BLOCKED',
        'Автоматическое слияние и rebase не выполняются.'
      ),
    ],
  },
};

/*
 * STEP RUN имеет цикл, который статическая горизонтальная схема показывает
 * компактно. В модальном окне используем чуть более явную последовательность,
 * чтобы пользователь мог руками пройти ветку PASS / FAIL / BLOCKED.
 */
const CUSTOM_FLOWS = {
  'STEP RUN STEP-NNN': [
    { type: 'input', label: 'STEP, блокировки и тип' },
    {
      type: 'decision',
      label: 'Нужен актуальный план?',
      choices: [
        option('Нет — план актуален'),
        option('Да — выполнить STEP PLAN'),
      ],
    },
    { type: 'agent', label: 'STEP PLAN и независимая проверка плана', optional: true },
    { type: 'action', label: 'STEP IMPLEMENT' },
    { type: 'gate', label: 'Машинные проверки реализации' },
    { type: 'agent', label: 'Независимая STEP REVIEW' },
    {
      type: 'decision',
      label: 'Вердикт STEP REVIEW',
      choices: [
        option(
          'PASS',
          'finish',
          'SUCCESS',
          'STEP RUN завершает работу после успешной проверки и финализации состояния.'
        ),
        option('FAIL — перейти к STEP FIX'),
        option(
          'BLOCKED',
          'stop',
          'BLOCKED',
          'Выполнение останавливается: исправление кода не может устранить блокирующую проблему контракта или зависимости.'
        ),
      ],
    },
    { type: 'action', label: 'STEP FIX', onlyWhenPrevious: 'FAIL — перейти к STEP FIX' },
    { type: 'gate', label: 'Повторные машинные проверки', onlyWhenPrevious: 'FAIL — перейти к STEP FIX' },
    {
      type: 'decision',
      label: 'Повторная STEP REVIEW',
      onlyWhenPrevious: 'FAIL — перейти к STEP FIX',
      choices: [
        option(
          'PASS',
          'finish',
          'SUCCESS',
          'Исправления приняты. STEP RUN завершает цикл.'
        ),
        option(
          'FAIL — повторить цикл',
          'finish',
          'FAIL',
          'Цикл STEP FIX ↔ STEP REVIEW повторяется, пока не достигнут настроенный лимит.'
        ),
        option(
          'BLOCKED',
          'stop',
          'BLOCKED',
          'Повторная проверка обнаружила блокирующую проблему. Выполнение прекращается.'
        ),
      ],
    },
  ],
};

function normalizeCommand(rawCommand) {
  const normalized = rawCommand.replace(/\s+/g, ' ').trim();

  for (const commandKey of COMMAND_KEYS) {
    if (normalized.startsWith(commandKey)) {
      return commandKey;
    }
  }

  return normalized;
}

function commandModelMode(commandKey) {
  if (DETERMINISTIC_COMMANDS.has(commandKey)) {
    return 'Модель не вызывается';
  }

  if (CONDITIONAL_MODEL_COMMANDS.has(commandKey)) {
    return 'Модель зависит от сценария';
  }

  return 'Модель обязательна';
}

function commandMutationMode(commandKey) {
  return MUTATING_COMMANDS.has(commandKey)
    ? 'Команда может изменять состояние'
    : 'Команда работает без изменений проекта';
}

function extractStaticFlow(commandItem) {
  const flow = commandItem.querySelector('.command-flow');
  if (!flow) return [];

  return [...flow.querySelectorAll('.command-flow-node')].map((node) => {
    const typeClass = [...node.classList].find((className) =>
      className.startsWith('command-flow-node--')
    );

    return {
      type: typeClass ? typeClass.replace('command-flow-node--', '') : 'action',
      label: node.textContent.trim(),
    };
  });
}

function choicesForNode(commandKey, node) {
  if (node.choices) return node.choices;

  const commandRules = BRANCH_RULES[commandKey] || {};
  if (commandRules[node.label]) return commandRules[node.label];

  if (node.type === 'gate') {
    return [
      option('PASS'),
      option(
        'BLOCKED',
        'stop',
        'BLOCKED',
        `Выполнение остановлено на этапе «${node.label}». Следующие этапы не запускаются.`
      ),
    ];
  }

  if (node.type === 'decision') {
    return [
      option('Основная ветка'),
      option('Альтернативная ветка'),
    ];
  }

  return null;
}

function getCommandSummary(commandItem) {
  return commandItem.querySelector(':scope > p')?.textContent.trim() || '';
}

function createDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'command-diagram-dialog';
  dialog.setAttribute('aria-labelledby', 'command-diagram-title');

  dialog.innerHTML = `
    <div class="command-diagram-shell">
      <header class="command-diagram-header">
        <div>
          <div class="command-diagram-eyebrow">Интерактивная схема выполнения</div>
          <h2 id="command-diagram-title"></h2>
          <p class="command-diagram-summary"></p>
        </div>
        <button class="command-diagram-close" type="button" aria-label="Закрыть схему">×</button>
      </header>

      <div class="command-diagram-toolbar" aria-label="Готовые сценарии">
        <button type="button" data-diagram-preset="main">Основной путь</button>
        <button type="button" data-diagram-preset="blocked">Пример остановки</button>
      </div>

      <div class="command-diagram-layout">
        <div class="command-diagram-canvas" aria-live="polite">
          <div class="command-diagram-flow"></div>
        </div>

        <aside class="command-diagram-side">
          <section class="command-diagram-panel">
            <h3>Граница выполнения</h3>
            <div class="command-diagram-fact" data-diagram-model></div>
            <div class="command-diagram-fact" data-diagram-mutation></div>
          </section>

          <section class="command-diagram-panel">
            <h3>Текущий результат</h3>
            <div class="command-diagram-result" data-diagram-result></div>
          </section>

          <section class="command-diagram-panel">
            <h3>Обозначения</h3>
            <div class="command-diagram-legend">
              <span><i data-kind="dispatcher"></i>Детерминированный шаг</span>
              <span><i data-kind="agent"></i>Смысловая работа модели</span>
              <span><i data-kind="decision"></i>Развилка</span>
              <span><i data-kind="success"></i>Результат</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  `;

  document.body.append(dialog);
  return dialog;
}

function createFlowNode(node, index, commandKey, state, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'command-diagram-step';
  wrapper.dataset.stepIndex = String(index);

  const card = document.createElement('div');
  card.className = `command-diagram-node command-diagram-node--${node.type}`;

  const type = document.createElement('div');
  type.className = 'command-diagram-node-type';
  type.textContent = NODE_TYPE_LABELS[node.type] || 'Этап';

  const label = document.createElement('div');
  label.className = 'command-diagram-node-label';
  label.textContent = node.label;

  card.append(type, label);

  if (node.detail) {
    const detail = document.createElement('div');
    detail.className = 'command-diagram-node-detail';
    detail.textContent = node.detail;
    card.append(detail);
  }

  const choices = choicesForNode(commandKey, node);
  if (choices?.length) {
    const controls = document.createElement('div');
    controls.className = 'command-diagram-choices';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', `Выбор ветки: ${node.label}`);

    const selectedLabel = state.selections[index] ?? choices[0].label;

    choices.forEach((choice) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = choice.label;
      button.className = 'command-diagram-choice';
      button.classList.toggle('is-selected', choice.label === selectedLabel);
      button.dataset.choiceLabel = choice.label;
      button.addEventListener('click', () => {
        state.selections[index] = choice.label;
        onChange();
      });
      controls.append(button);
    });

    card.append(controls);
  }

  wrapper.append(card);

  if (!node.isLast) {
    const connector = document.createElement('div');
    connector.className = 'command-diagram-connector';
    connector.setAttribute('aria-hidden', 'true');
    wrapper.append(connector);
  }

  return wrapper;
}

function selectedChoice(node, index, commandKey, state) {
  const choices = choicesForNode(commandKey, node);
  if (!choices?.length) return null;

  const selectedLabel = state.selections[index] ?? choices[0].label;
  return choices.find((choice) => choice.label === selectedLabel) || choices[0];
}

function buildBaseNodes(rawCommand, commandKey, commandItem) {
  const commandNodes = CUSTOM_FLOWS[commandKey] || extractStaticFlow(commandItem);

  return [
    {
      type: 'user',
      label: 'Пользователь вводит команду',
      detail: rawCommand,
    },
    {
      type: 'dispatcher',
      label: 'harness-dispatch.py start',
      detail: 'Разбор команды, маршрутизация и регистрация выполнения.',
    },
    {
      type: 'gate',
      label: 'Структурная проверка команды',
      choices: [
        option('PASS'),
        option(
          'BLOCKED',
          'stop',
          'BLOCKED',
          'Команда отклонена до запуска модели, обработчика и любых изменений.'
        ),
      ],
    },
    ...commandNodes,
  ];
}

function defaultResult(nodes) {
  const explicitSuccess = [...nodes].reverse().find((node) => node.type === 'success');
  return explicitSuccess?.label || 'Команда завершена.';
}

function renderDiagram(dialog, context) {
  const { commandKey, nodes, state } = context;
  const flow = dialog.querySelector('.command-diagram-flow');
  const result = dialog.querySelector('[data-diagram-result]');

  let terminalIndex = Number.POSITIVE_INFINITY;
  let terminalStatus = 'SUCCESS';
  let terminalResult = defaultResult(nodes);
  let previousSelectedLabel = null;

  nodes.forEach((node, index) => {
    if (index > terminalIndex) return;

    if (node.onlyWhenPrevious && previousSelectedLabel !== node.onlyWhenPrevious) {
      return;
    }

    const choice = selectedChoice(node, index, commandKey, state);
    if (choice) {
      previousSelectedLabel = choice.label;

      if (choice.effect === 'stop' || choice.effect === 'finish') {
        terminalIndex = index;
        terminalStatus = choice.status || (choice.effect === 'stop' ? 'BLOCKED' : 'SUCCESS');
        terminalResult = choice.result || terminalResult;
      }
    }
  });

  flow.replaceChildren();

  let previousChoiceForVisibility = null;
  nodes.forEach((node, index) => {
    const hiddenByConditional =
      node.onlyWhenPrevious && previousChoiceForVisibility !== node.onlyWhenPrevious;
    const inactive = index > terminalIndex || hiddenByConditional;

    const renderedNode = createFlowNode(
      { ...node, isLast: index === nodes.length - 1 },
      index,
      commandKey,
      state,
      () => renderDiagram(dialog, context)
    );

    renderedNode.classList.toggle('is-inactive', inactive);

    renderedNode.querySelectorAll('button').forEach((button) => {
      button.disabled = inactive;
    });

    flow.append(renderedNode);

    if (!inactive) {
      const choice = selectedChoice(node, index, commandKey, state);
      if (choice) previousChoiceForVisibility = choice.label;
    }
  });

  result.className = 'command-diagram-result';
  result.dataset.status = terminalStatus;
  result.innerHTML = `<strong>${terminalStatus}</strong><span>${terminalResult}</span>`;

  dialog.querySelectorAll('[data-diagram-preset]').forEach((button) => {
    const preset = button.dataset.diagramPreset;
    button.classList.toggle(
      'is-active',
      (preset === 'main' && state.preset === 'main') ||
        (preset === 'blocked' && state.preset === 'blocked')
    );
  });
}

function applyMainPreset(context) {
  context.state.selections = {};
  context.state.preset = 'main';
}

function applyBlockedPreset(context) {
  context.state.selections = {};
  context.state.preset = 'blocked';

  for (let index = 0; index < context.nodes.length; index += 1) {
    const node = context.nodes[index];
    const choices = choicesForNode(context.commandKey, node);
    if (!choices) continue;

    const terminalChoice = choices.find(
      (choice) => choice.effect === 'stop' || choice.status === 'BLOCKED'
    );

    if (terminalChoice) {
      context.state.selections[index] = terminalChoice.label;
      return;
    }
  }
}

function enhanceCommandItems() {
  const commandItems = [...document.querySelectorAll('.command-item')];
  if (!commandItems.length) return;

  const dialog = createDialog();
  const title = dialog.querySelector('#command-diagram-title');
  const summary = dialog.querySelector('.command-diagram-summary');
  const modelFact = dialog.querySelector('[data-diagram-model]');
  const mutationFact = dialog.querySelector('[data-diagram-mutation]');
  const closeButton = dialog.querySelector('.command-diagram-close');

  let activeTrigger = null;
  let activeContext = null;

  commandItems.forEach((commandItem) => {
    const commandCode = commandItem.querySelector('h3 code');
    if (!commandCode) return;

    const rawCommand = commandCode.textContent.trim();
    const commandKey = normalizeCommand(rawCommand);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'command-diagram-open';
    button.innerHTML =
      '<span class="command-diagram-open__icon" aria-hidden="true">⌘</span><span>Интерактивная схема</span>';

    const flow = commandItem.querySelector('.command-flow');
    if (flow) {
      flow.insertAdjacentElement('beforebegin', button);
    } else {
      commandItem.append(button);
    }

    button.addEventListener('click', () => {
      activeTrigger = button;

      const nodes = buildBaseNodes(rawCommand, commandKey, commandItem);
      activeContext = {
        commandKey,
        nodes,
        state: {
          selections: {},
          preset: 'main',
        },
      };

      title.innerHTML = `<code>${rawCommand.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`;
      summary.textContent = getCommandSummary(commandItem);
      modelFact.textContent = commandModelMode(commandKey);
      mutationFact.textContent = commandMutationMode(commandKey);

      applyMainPreset(activeContext);
      renderDiagram(dialog, activeContext);
      dialog.showModal();
      closeButton.focus();
    });
  });

  closeButton.addEventListener('click', () => dialog.close());

  dialog.querySelector('[data-diagram-preset="main"]').addEventListener('click', () => {
    if (!activeContext) return;
    applyMainPreset(activeContext);
    renderDiagram(dialog, activeContext);
  });

  dialog.querySelector('[data-diagram-preset="blocked"]').addEventListener('click', () => {
    if (!activeContext) return;
    applyBlockedPreset(activeContext);
    renderDiagram(dialog, activeContext);
  });

  /*
   * Клик по затемнённой области вокруг native dialog ожидаемо воспринимается
   * как закрытие окна. Само содержимое при этом не перехватывается.
   */
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', () => {
    activeTrigger?.focus();
  });
}

enhanceCommandItems();
