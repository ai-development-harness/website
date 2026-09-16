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

Обычный прогон Playwright во всех поддерживаемых профилях устройств:

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

Тесты запускаются для desktop Chromium, iPad Pro 11 и Pixel 7. Проверяются основной контент, адаптивная навигация, отсутствие горизонтального overflow, anchors, внешние ссылки и базовый accessibility contract.

## CI

`.github/workflows/ci.yml` использует Yarn 1.22.22, устанавливает зависимости через `yarn install --frozen-lockfile` и запускает Playwright на `push` в `main` и на каждый Pull Request. При любом результате HTML-report сохраняется как GitHub Actions artifact.

## Production

Публикуемая директория — `www/`. Сайт не требует build-step и может отдаваться любым статическим web server/CDN.
