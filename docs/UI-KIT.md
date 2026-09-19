# AI Development Harness Website — UI Kit

Этот файл — визуальный source of truth промо-сайта `ai-development-harness.ru`.

## 1. Принципы

- Тёмный инженерный интерфейс, а не типичный SaaS landing.
- Высокая читаемость важнее декоративной плотности.
- Основной акцент: cyan → blue → violet.
- Компоненты строятся обычным HTML/CSS; сложная графика не должна ломать responsive layout.
- Содержательный текст не уменьшается ради эстетики.
- Графика и иконки — собственные SVG/CSS/типографические знаки; сторонние stock assets не используются.

## 2. Цвета

| Token | Значение | Назначение |
|---|---|---|
| `--bg` | `#050B14` | основной фон |
| `--bg-deep` | `#030812` | самый тёмный фон |
| `--bg-elevated` | `#081321` | поднятые поверхности |
| `--surface` | `#0B1726` | карточки |
| `--surface-hover` | `#101F31` | hover |
| `--text` | `#F5F7FB` | основной текст |
| `--text-secondary` | `#A7B4C5` | вторичный текст |
| `--text-muted` | `#718198` | подписи и metadata |
| `--cyan` | `#00D7F5` | акцент |
| `--blue` | `#2585FF` | акцент |
| `--violet` | `#8A52FF` | акцент |
| `--success` | `#30D890` | success |
| `--warning` | `#FFB84A` | warning |
| `--error` | `#FF5364` | error |
| `--border` | `rgba(105, 155, 205, .22)` | обычная граница |
| `--border-strong` | `rgba(59, 169, 255, .45)` | акцентная граница |

Accent gradient:

```css
linear-gradient(110deg, #00D7F5, #2585FF 52%, #8A52FF)
```

Не добавлять почти одинаковые акцентные оттенки без функциональной причины.

## 3. Типографика

Используется system font stack без внешней зависимости:

```css
Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Если `Inter` отсутствует локально, браузер использует системный sans-serif.

Шкала:

- body: `18px`, line-height `1.65`;
- body small: `15–16px`;
- caption / metadata: `13–14px`;
- navigation: `15px`;
- button: `15–16px`;
- eyebrow: `13px`, uppercase, expanded tracking;
- H1 landing: `clamp(44px, 5.35vw, 82px)`;
- H1 docs: `clamp(42px, 5vw, 70px)`;
- H2: `36–58px` через `clamp()`;
- H3: обычно `19–24px`.

Контентные подписи меньше `13px` не использовать.

## 4. Spacing

Базовый scale:

```text
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128
```

CSS tokens: `--space-1`, `--space-2`, `--space-3`, `--space-4`, `--space-6`, `--space-8`, `--space-12`, `--space-16`, `--space-24`, `--space-32`.

## 5. Layout

- основной container: максимум `1440px`;
- ширина article content: около `780px`;
- section vertical spacing: `76–116px` на desktop, `68px` на mobile;
- sticky header: около `78px` desktop / `70px` tablet;
- article layout desktop: content + `280px` TOC;
- ultrawide: контент всегда остаётся внутри max-width.

Основные breakpoints:

- `1180px`: hero и сложные split layouts переходят в одну колонку;
- `940px`: desktop navigation скрывается, появляется mobile menu; article TOC скрывается;
- `760px`: карточки и article grids переходят в одну колонку;
- `460px`: compact brand и полноширинные CTA.

## 6. Header

Brand состоит из:

1. `assets/mark.svg` как знака;
2. HTML-текста `AI Development Harness`.

Нельзя использовать мелкий текст внутри SVG как единственный brand label.

Desktop header содержит основные публичные разделы, GitHub и CTA. На mobile используется кнопка с `aria-expanded` и `aria-controls`.

## 7. Buttons и links

### Primary

- accent gradient;
- минимум `48px` высоты;
- radius `13px`;
- заметный `:focus-visible`.

### Secondary / ghost

- тёмная полупрозрачная поверхность;
- `--border-strong`;
- тот же размер touch target.

### Text link

- cyan;
- semibold/bold;
- без декоративной иконки, если направление и так очевидно из текста.

## 8. Cards

### Feature / problem / documentation card

- radius `18px`;
- `1px solid --border`;
- тёмный gradient/surface;
- заголовок не мельче `19px`;
- описание `15–16px`.

### Callout

- акцентная левая или внешняя граница;
- цвет используется вместе с текстовым смыслом, а не вместо него.

## 9. Hero workflow

Hero workflow — DOM/CSS timeline, не координатный SVG.

Desktop row:

```text
number | icon | title + description | outcome
```

Mobile:

```text
number | title + description
       | outcome
```

Вертикальный connector строится CSS pseudo-element. Количество шагов — шесть: Brief, PROJECT INIT, STEP ADD, STEP RUN, Review & Evidence, Git.

## 10. Article pages

Обязательные элементы:

- breadcrumbs;
- один H1;
- вводный lead;
- `article` с H2/H3;
- sticky TOC на desktop;
- code blocks с horizontal scroll;
- callouts;
- previous/next navigation;
- общий footer.

Breadcrumbs и TOC не заменяют основную навигацию.

## 11. Code blocks и inline code

- monospace system stack;
- code block фон темнее surface;
- horizontal overflow вместо переноса длинных command/path;
- inline code имеет лёгкую рамку и не должен визуально доминировать над текстом.

## 12. FAQ

Используется native `details/summary` без JS. Вопрос должен быть понятен без раскрытого ответа. Keyboard interaction предоставляет браузер.

## 13. Accessibility

- контраст текста проверяется на реальных background tokens;
- `:focus-visible` обязателен;
- touch targets около `44px` и больше;
- один H1 на страницу;
- heading levels идут последовательно;
- смысловые `img` получают `alt`, декоративные — `alt=""`;
- информация не кодируется только цветом;
- есть skip-link к `main`;
- motion отключается через `prefers-reduced-motion`;
- длинные code/path не должны создавать horizontal overflow страницы.

## 14. Motion

Допустимы только короткие hover/focus transitions. UI не зависит от анимации. При `prefers-reduced-motion: reduce` transitions фактически отключаются.

## 15. SEO / semantic contract

Каждая страница должна иметь:

- уникальные `title` и `meta description`;
- canonical absolute HTTPS URL;
- `meta robots`;
- Open Graph / Twitter metadata;
- один H1;
- семантические `header`, `nav`, `main`, `article`, `section`, `footer`;
- внутренние ссылки на связанные страницы;
- BreadcrumbList для внутренних страниц.

## 16. Что не делать

- не подключать frontend framework для статической страницы;
- не добавлять библиотеку иконок ради нескольких пиктограмм;
- не строить responsive workflow через абсолютные SVG-линии;
- не использовать текст 9–11px для значимой информации;
- не растягивать content на всю ultrawide ширину;
- не создавать стороннюю font dependency без необходимости;
- не использовать stock images/stock icons.
