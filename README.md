# AI Development Harness Website

Статический промо-сайт проекта AI Development Harness.

## Локальная разработка

Требования: Node.js 22+ и Yarn 1.22.22.

Если Yarn ещё не активирован через Corepack:

```bash
corepack enable
corepack prepare yarn@1.22.22 --activate
```

Установка зависимостей и запуск:

```bash
yarn install
yarn playwright install chromium webkit
yarn dev
```

`yarn dev` запускает статический сервер на `http://localhost:5173` и автоматически открывает сайт в браузере.

## Тесты

Полный прогон Playwright:

```bash
yarn test
```

Интерактивный UI runner:

```bash
yarn test:ui
```

Запуск с видимым браузером:

```bash
yarn test:headed
```

HTML-отчёт последнего прогона:

```bash
yarn test:report
```

Тесты разбиты по смысловым каталогам в `tests/`:

- `home/` — первый экран, ключевые секции и анимированный терминал;
- `docs/` — структура и навигация документации;
- `navigation/` — шапка, мобильное меню, внутренние и внешние ссылки;
- `responsive/` — геометрия и отсутствие переполнения на разных размерах экрана;
- `accessibility/` — семантика, основные области страницы и клавиатурная навигация;
- `seo/` — канонические URL, метаданные, JSON-LD, sitemap и robots.txt;
- `analytics/` — локальное отключение Яндекс Метрики;
- `runtime/` — статические ресурсы, ошибки JavaScript и ошибочные HTTP-ответы;
- `content/` — русская терминология и сохранение технических имён команд;
- `infrastructure/` — Yarn, lockfile, Playwright и CI-инварианты.

Все названия test case и test suite пишутся по-русски.

Полный набор тестов запускается во всех трёх профилях:

- `desktop-chromium` — Chromium, 1440×1000;
- `tablet-webkit` — WebKit в профиле iPad Pro 11;
- `mobile-chromium` — Chromium в профиле Pixel 7.

Таким образом, одни и те же функциональные, SEO-, контентные и инфраструктурные инварианты проверяются вместе с реальной адаптивностью в разных браузерных движках и размерах экрана. Для намеренно различающегося поведения используются отдельные явные проверки, например скрытие пиктограмм процесса на узком мобильном экране.

## CI

`.github/workflows/ci.yml` использует Yarn 1.22.22, устанавливает зависимости через `yarn install --frozen-lockfile` и запускает Playwright на `push` в `main` и на каждый Pull Request. Для полного набора тестов job имеет лимит 25 минут. При любом результате HTML-report сохраняется как GitHub Actions artifact.

## Production

Публикуемая директория — `www/`. Сайт не требует build-step и может отдаваться любым статическим web server/CDN.
