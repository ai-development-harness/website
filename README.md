# AI Development Harness Website

Статический промо-сайт проекта AI Development Harness.

## Локальная разработка

Требования: Node.js 22+ и npm.

```bash
npm install
npx playwright install chromium
npm run dev
```

`npm run dev` запускает статический сервер на `http://localhost:5173` и автоматически открывает сайт в браузере.

## Тесты

Обычный прогон Playwright во всех поддерживаемых профилях устройств:

```bash
npm test
```

Интерактивный UI runner:

```bash
npm run test:ui
```

Запуск с видимым браузером:

```bash
npm run test:headed
```

HTML-отчёт последнего прогона:

```bash
npm run test:report
```

Тесты запускаются для desktop Chromium, iPad Pro 11 и Pixel 7. Проверяются основной контент, адаптивная навигация, отсутствие горизонтального overflow, anchors, внешние ссылки и базовый accessibility contract.

## CI

`.github/workflows/ci.yml` запускает Playwright на `push` в `main` и на каждый Pull Request. При любом результате HTML-report сохраняется как GitHub Actions artifact.

## Production

Публикуемая директория — `www/`. Сайт не требует build-step и может отдаваться любым статическим web server/CDN.
