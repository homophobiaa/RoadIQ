# RoadIQ

Лична уеб-апликация за тренировка на български листовки. Пускаш скрийншоти на
сгрешени/трудни листовки в папка, а RoadIQ ги разчита автоматично в браузъра
(OCR + image processing) и генерира случайни тестове. **Само frontend — без
backend, без база данни, без ръчно писане на въпроси.**

## Маршрути (React Router)

Реални URL адреси — refresh, back/forward и директно отваряне работят:

```txt
/                          Табло (тестове)
/test /results /review     Тестов поток (изисква активен тест в паметта)
/debug                     Debug Studio (корекции)
/cheatsheets               Справочник (хъб)
/cheatsheets/speed-limits  Ограничения на скоростта
/cheatsheets/categories    Категории превозни средства (?category=B1)
```

### SPA fallback при деплой

Приложението е single-page app — сървърът трябва да връща `index.html` за всички
пътища. Включени са готови конфигурации:

- **Netlify** — `public/_redirects` (`/* /index.html 200`)
- **Vercel** — `vercel.json` (rewrite към `/index.html`)
- **GitHub Pages / друг static host** — настрой SPA fallback към `index.html`
  (напр. копие на `index.html` като `404.html`).

## Стартиране

```bash
npm install
npm run dev   # http://localhost:4321 (портът е фиксиран заради Windows reserved range)
```

После:

1. Сложи скрийншоти в `public/screenshots/` (`.png`, `.jpg`, `.jpeg`, `.webp`).
   Един екран = един въпрос (пълен резултатен екран от Avtoizpit/листовки).
2. Отвори приложението и натисни **„Зареди въпросите“**.
3. Изчакай OCR-а (прогрес бар; първото зареждане сваля езиков модел).
4. Започни тест, отговаряй с multi-select, навигирай от страничната лента.
5. Предай (само след като всички въпроси имат отговор) → оценка с праг 70%.
6. Прегледай грешките или започни нов тест.

## Как работи разчитането

Pipeline (виж [src/parser/](src/parser/)):

- `loadScreenshotSources()` — намира файловете чрез `import.meta.glob`.
- `detectLayout()` — **layout-based**, не OCR на цялата снимка:
  - row-profile на зелени/червени пиксели → редове с отговори
    (работи както за check/X икони, така и за тонирани редове);
  - брой зелени редове = брой верни отговори;
  - photo-richness профил → зона на ситуационната снимка;
  - текст над снимката/отговорите → заглавие.
- Crop на всяка зона + `runOcrOnRegion()` (Tesseract `bul+eng`).
- `normalizeBulgarianText()` — чисти OCR шума, latin→cyrillic корекции.
- `buildQuestionModel()` — сглобява `ParsedQuestion` с увереност + предупреждения.

Разчитането е евристично и зависи от оформлението. При неуспех въпросът **не
чупи** теста — маркира се с ниска увереност и се показва в **Debug** режима
(с overlay на откритите рамки, OCR изхода и предупрежденията).

## Стек

React · Vite · TypeScript · Tailwind CSS · Framer Motion · Tesseract.js · Canvas API
