# Сверка публичного сайта с Harness

Дата сверки: 29 октября 2026. Задача: [website #21](https://github.com/ai-development-harness/website/issues/21).

Основа: опубликованный `main` Harness Template, SHA `318bb21a840b1bcf1c97b575566afc255f2137b7`, релиз `v0.15.1`. Удалённый `main` проверен через Git; локальный шаблон подтянут до того же SHA. Это служебная фиксация источника, а не номер текущей версии в пользовательском тексте сайта.

Исходный сайт: `566531e8b6519804a2ddd90b475b64c2c8a3e87e`. Изменения сайта подготовлены в `codex/issue-21-harness-docs`, без коммита и публикации по указанию пользователя.

## Карта страниц и проверок

Все пути источников ниже относятся к [Harness Template на зафиксированном SHA](https://github.com/ai-development-harness/ai-development-harness-template/tree/318bb21a840b1bcf1c97b575566afc255f2137b7), а не к репозиторию сайта. Настройки путей проекта берутся из manifest; `planning/**` и `docs/**` в примерах — стандартные значения.

| Публичный маршрут | Источники Harness | Изменение и регрессионные проверки |
| --- | --- | --- |
| `/` | `README.md`, `.harness/docs/COMMANDS.md` | Проверены CTA создания репозитория из шаблона и основной цикл; способ установки сохранён. `tests/home/`, общие проверки контента |
| `/getting-started/` | `UPDATES.md`, `COMMANDS.md` в `.harness/docs/` | Прямая установка, отдельная приёмка проекта, планирование выбранного STEP. `tests/docs/pages.spec.js`, `tests/content/reliability.spec.js` |
| `/commands/` | `.harness/command-transitions.json`, `.harness/docs/{COMMANDS,UPDATES,LOCAL_CLEANUP,PORTABLE_RESUME,INCREMENTAL_REVIEW,INCREMENTAL_VERIFICATION,EXECUTION_STATUS}.md` | Все 34 команды, мини-схемы и интерактивные развилки; новые границы UPDATE/CLEANUP/RESUME/REVIEW. `tests/commands/`, `tests/docs/commands-workflows.spec.js`, `tests/content/reliability.spec.js` |
| `/workflow/` | `.harness/docs/{COMMANDS,EXECUTION_STATUS,PORTABLE_RESUME,INCREMENTAL_REVIEW,INCREMENTAL_VERIFICATION}.md` | Планирование по требованию, перенос, набор изменений FIX, свежесть Evidence и поздние дефекты. `tests/content/harness-current.spec.js`, `tests/content/reliability.spec.js` |
| `/architecture/` | `.harness/docs/{DECISION_ARCHAEOLOGY,HIGH_RIGOR,SKILL_CONTRACT_MATRIX}.md`, `.agents/skills/` | 33 базовых навыка, исследование причин решений, необязательные Arena/Interrogate. Сохранены границы deterministic/semantic. `tests/content/harness-current.spec.js`, общие проверки документации |
| `/runtimes/` | `.harness/runtime-adapter-contract.json`, `.codex/config.toml`, `.claude/agents/` | Проверены общий протокол и адаптеры; новых обещаний о средах исполнения нет. `tests/content/harness-current.spec.js` |
| `/repository/` | `.harness/docs/{PORTABLE_RESUME,LOCAL_CLEANUP,EXECUTION_STATUS}.md` | Каталог обновлений обозначен как источник latest; переносимые факты отделены от локального состояния. `tests/content/reliability.spec.js` |
| `/validators/` | `.harness/docs/{INCREMENTAL_REVIEW,INCREMENTAL_VERIFICATION}.md`, `.harness/tools/{verification,fix_delta,review_gates}.py` | Полный прогон по умолчанию, проектная карта, подтверждение происхождения, ограничения проверки полноты входных данных. `tests/content/reliability.spec.js` |
| `/maintenance/` | `.harness/docs/{UPDATES,LOCAL_CLEANUP}.md` | Одна транзакция, установка без проверки продуктовых документов, откат, старые установщики и безопасная очистка. `tests/content/harness-current.spec.js`, `tests/content/reliability.spec.js` |
| `/faq/` | `.harness/docs/{UPDATES,PORTABLE_RESUME,INCREMENTAL_REVIEW,INCREMENTAL_VERIFICATION,LOCAL_CLEANUP,COMMANDS}.md` | Прямые ответы о target, переносе, поздних дефектах, картах и очистке. `tests/docs/pages.spec.js`, общие проверки ссылок |
| `/articles/` | Перечень существующих и новых публикаций | Новые карточки в адаптивной сетке. `tests/content/articles-reliability.spec.js` |
| `/articles/what-is-ai-coding-harness/` | `README.md`, `.harness/docs/COMMANDS.md` | Проверена понятийная статья; прежний URL и основной текст сохранены |
| `/articles/persistent-context-codex-claude-code/` | `.harness/docs/{PORTABLE_RESUME,EXECUTION_STATUS}.md` | Добавлена граница между сменой сессии и новым клоном, ссылка на практическую статью |
| `/articles/codex-claude-code-workflow/` | `.harness/runtime-adapter-contract.json`, `.harness/docs/EXECUTION_PROTOCOL.md` | Проверена совместная модель артефактов и адаптеров; URL сохранён |
| `/articles/harness-development-lifecycle/` | `.harness/docs/{COMMANDS,EXECUTION_PROTOCOL}.md` | Проверена общая схема жизненного цикла; подробные актуальные правила находятся в связанном справочнике |
| `/articles/deterministic-core-vs-llm/` | `.harness/command-transitions.json`, `.harness/reasoning-boundaries.json` | Проверена граница вычислимых фактов и смысловой работы; статья не дублируется |
| `/articles/portable-handoff/` | `.harness/docs/PORTABLE_RESUME.md` | Новый пошаговый пример двух клонов с явным получением удалённых изменений и новым PLAN |
| `/articles/incremental-review-verification/` | `.harness/docs/{INCREMENTAL_REVIEW,INCREMENTAL_VERIFICATION}.md` | Новая статья: точный набор изменений, отдельный контракт выборочных тестов, возврат к полному прогону |
| `/articles/late-defects-after-review/` | Раздел о поздних дефектах в `.harness/docs/INCREMENTAL_VERIFICATION.md` | Новая статья: активный STEP и отдельный корректирующий STEP, сохранение исторического PASS |

Для трёх новых статей применяются `tests/content/articles-reliability.spec.js` и общие проверки из `tests/helpers/site.js`: доступность страниц, заголовки, оглавления, внутренние ссылки, sitemap, SEO, семантика, адаптивность, клавиатура и поиск. Список резервных маршрутов поиска также обновлён.

## Защита от расхождения команд

`tests/fixtures/harness-commands.json` содержит все 34 канонические формы и режимы reasoning из CTS указанного SHA. Локальные тесты не читают соседний checkout и не обращаются к GitHub. При следующей сверке необходимо обновить основу и снимок совместно с публичными схемами; снимок не является автоматически синхронизируемым реестром Harness.

При изменении JS заменён единый случайный `?v=` на всех HTML-страницах. Поиск наследует revision для динамического CSS, его кэш перестраивается при изменении revision.

## Редакционные границы

Три P1-статьи подготовлены по разным практическим сценариям. Отдельная P2-статья про Decision Archaeology отложена: краткое описание и первоисточники уже добавлены в архитектуру, отдельный материал стоит строить на конкретной истории ADR/Git, чтобы не повторить существующую статью о детерминированном слое и LLM. High-Rigor описан кратко, без отдельного нового маршрута.

CLI/Core, альтернативная установка, новый фреймворк и редизайн не добавлялись. Номера релизов не внесены в обычный публичный текст. Исторические v0.6.0/v0.7.0 оставлены только в разделе восстановления известных ошибочных snapshots.

Для будущей публикации сохраняется порядок задачи: сначала корректность UPDATE/CLEANUP/команд, затем восстановление и P1-статьи. PR в этой работе не создаётся: владелец сначала проверяет изменения локально.

## Локальная проверка

Команда полного прогона: `yarn test --workers=4 --reporter=line` (Yarn 1.22.22). Используются все три профиля из `playwright.config.js`: настольный Chromium, планшетный WebKit, мобильный Chromium. Ограничено только число параллельных процессов; повторные попытки и таймауты не менялись. CI использует тот же набор `yarn test`; удалённый CI без публикации ветки не запускался.

Результат полного прогона: **2205 успешных проверок, 6 пропусков, 0 ошибок**, код завершения 0, 11,6 минуты. Шесть пропусков заданы существующими условиями профилей: мобильная навигация проверяется вне настольного профиля, поведение пиктограмм главной — в соответствующем размере экрана. Новых пропусков или повторных попыток не добавлено.

После последних уточнений схем UPDATE/RESUME и исключения демонстрационных схем из копирования выполнен целевой прогон на всех трёх профилях:

```bash
yarn test tests/commands tests/content/reliability.spec.js tests/content/articles-reliability.spec.js tests/docs/commands-workflows.spec.js tests/infrastructure/assets.spec.js tests/infrastructure/preconnect.spec.js tests/copy --workers=4 --reporter=line
```

Результат: **204 успешные проверки, 0 ошибок**, код завершения 0, 1,3 минуты. Полный буквальный вывод прогонов сохранён локально в `/tmp/website-21-full.log` и `/tmp/website-21-final-targeted.log`; здесь приведена сводка наблюдённых результатов, а не реконструкция терминального вывода.

Дополнительно: `git diff --check` и `node --check www/js/command-diagrams.js` успешны. Все 34 формы и режимы reasoning совпали с CTS; 71 упомянутый файл Harness существует; проверены все 33 базовых навыка по наличию `SKILL.md`. Все 11 сохранённых файлов основы побайтно совпали с подтянутым checkout указанного SHA. Каталог статей и новая статья просмотрены на ширинах 1440 и 390 px; переполнение, ссылки, метаданные и клавиатура также покрыты общим прогоном.


## Корректировка языка публичных текстов

По замечанию владельца переписаны пояснения на всех 19 публичных страницах и в интерактивных схемах. Используются русские формулировки для передачи работы, контрольных записей, границ задачи, проверок, доказательств, отпечатков и восстановления. Названия продуктов, канонические команды, статусы, реальные имена полей и пути сохранены. Переведены поясняющие подписи схем и дерева репозитория; исполняемые команды и поля конфигурации не переводились.

В `tests/content/terminology.spec.js` добавлена проверка прежних посторонних английских вставок в поясняющем тексте. Она исключает `code/pre`, скрипты и стили, чтобы не запрещать технические идентификаторы.

Набор проверок содержания, документации, схем, поиска, метаданных и инфраструктуры содержит 1248 случаев на трёх профилях. При первом прогоне прошли 1242; шесть проверок обнаружили затронутые заменой адреса Open Graph. Адреса восстановлены; все шесть случаев повторно прошли после исправления. Автоматические повторные попытки не включались. Вывод: `/tmp/website-language-final-tests.log`, `/tmp/website-language-recheck.log`.

Отдельно сверены все ссылки и подключения с состоянием до языковых правок, а однострочные значения `code` — побайтно. Отличия многострочных примеров ограничены русскими подписями схем и пояснениями дерева файлов. Визуально просмотрены статья о переносе работы и схема REVIEW на настольной и мобильной ширине.

Дополнительный прогон главной страницы, адаптивности и доступности: **498 успешных проверок, 0 ошибок**, код завершения 0. Проверены все три профиля; вывод сохранён в `/tmp/website-language-layout.log`. Проверки `git diff --check` и синтаксиса `www/js/command-diagrams.js` также успешны. Коммиты и публикация не выполнялись.


## Полный прогон после языковых правок

Команда: `yarn test --workers=4 --reporter=line`. Результат: **2262 успешные проверки, 6 штатных пропусков, 0 ошибок**, код завершения 0, 11 минут. Проверены все три профиля: настольный Chromium, планшетный WebKit и мобильный Chromium.

Полный буквальный вывод сохранён в `/tmp/website-21-full-after-language.log`. До запуска и после завершения сверено содержимое 80 файлов сайта, тестов и настроек: SHA-256 совпадает (`de2b7ea697ac7291fd09205d9b00a8621847637ae2c0e29c6dfec8248a1ad57f`). Проверяемые файлы во время полного прогона не менялись. Исправлений по результатам этого прогона не потребовалось; повторные попытки не включались.
