# Создание шейдер-паков для Bloxd.io (Полное руководство)

Самодостаточное руководство по созданию и распространению шейдер-паков для Bloxd.io (только WebGPU-рендер).

> Это неофициальное руководство, оно не выражает позицию разработчиков. API может измениться без предупреждения.  
> Последняя проверка: 2026-10-27 (раскатка v4 подтверждена — билд `cnty9`, продакшн и предпродакшн идентичны; см. часть X. продакшн-раскатка v3 подтверждена сравнением бандлов; вызов хуков, туман, глубина и внутрянка `blockFlags` восстановлены из продакшн-билда — часть IX §49–§54). Полный справочный материал встроен как Часть XI (`11-reference.md`) — дословно восстановленный заголовок движка и полный измеренный каталог всех 905 доступных имён текстур; тем не менее продолжайте сверять рецепты с экраном загрузки и компиляцией в игре.  
> Функция шейдер-паков — официальная функция из интерфейса игры, а паки — чистый WGSL  
> (без выполнения JS и сети), так что обычный код безопасен.  
> Руководство создано при помощи ИИ; точность не гарантируется. Проверяйте по фактическому поведению в игре.

[Вернуться к руководству](README.md)·[Следующая часть →](02-api.md)

# Часть I: Создание паков

> Текущая игра требует `apiVersion: 4` с 2026-10-26 и отклоняет паки v1/v2/v3 при загрузке — приведённое ниже написано по спецификации v2. Перед распространением см. [часть IX](09-apiv3.md) и [часть X](10-apiv4.md) для миграции.

## 1. Обзор и требования

- Шейдер-паки работают **только на WebGPU-рендере**. Пока пак установлен, WebGPU-рендер принудительно включается в настройках
- Паки пишутся на **ограниченном подмножестве WGSL**. Они влияют только на вид **террейна и жидкостей**
- Что можно: менять цвета, прозрачность и свечение; перестраивать освещение; тени в стиле проекции (R9.12); анимация вершин (только в некоторых играх)
- Что нельзя: добавлять собственные текстуры, постобработка (блум и т.п.), попиксельные тени, вращающиеся за солнцем (карты теней) и настоящие отражения (SSR), влияние на небо и сущностей (чтение существующего атласа блочных текстур **стало возможным в v4** — `bloxdTexel`, [часть X](10-apiv4.md) §57)
- Что можно (но легко упустить): **тени в стиле проекции через `skyLight` (воксельное затенение неба)** — можно заметно затемнять места под деревьями и крышами (R9.12). Разрушение блоков заставляет LightEngine мгновенно пересчитывать, так что тени следуют в реальном времени
- **Большинство игр работает в строгом (strict) режиме** (без анимации вершин, без `discard`). Паки для широкого распространения проектируйте под strict-режим

## 2. Быстрый старт

1. Создайте папку, положите в неё `pack.json` и `.wgsl`-файлы
2. Загрузите zip или папку через настройки игры → Shader Pack
3. Исправьте ошибки и загрузите снова (см. [часть V](05-troubleshooting.md))
4. Проверьте в поддерживаемых играх
5. Когда готово, упакуйте в zip и распространяйте

## 3. Структура пака

- **Форма распространения**: один `.zip` или папка (загрузка папки — только десктопные браузеры)
- **Содержимое**: один `pack.json` (в корне пака; регистр не важен) + 1–256 файлов `.wgsl`
- Несколько `.wgsl` склеиваются и считаются одним модулем, так что разбиение и подпапки свободны. Ограничений на имена нет. Склейка — в лексикографическом порядке путей (объявления уровня модуля от порядка не зависят, так что обычно неважно; но играет роль, если полагаться на порядок инициализации `var`). Не-`.wgsl` файлы (README и т.п.) игнорируются
- Совет по упаковке: если в zip всё лежит под одной общей корневой папкой, этот префикс снимается автоматически (zip из macOS «Сжать» работают как есть; `__MACOSX`, файлы, начинающиеся с `._`, и OS-мусор вроде `.DS_Store` отбрасываются автоматически). Но лишние файлы в корне ломают определение верхнего уровня; надёжнее зайти внутрь папки и упаковать `pack.json` и `.wgsl` напрямую (убедитесь, что `pack.json` в корне ZIP)

| Пункт | Лимит |
|---|---|
| размер zip / число записей | 32MB / 1024 |
| размер pack.json | 64KB, UTF-8 |
| суммарный размер .wgsl | 256KB, UTF-8 |
| формат zip | zip64, многотомные и шифрованные — нельзя. Сжатие только store / deflate, дубликаты путей — нельзя |

## 4. pack.json

```json
{
  "apiVersion": 3,
  "name": "My Pack",
  "author": "your name"
}
```

| Поле | Обязательно | Описание |
|---|---|---|
| `apiVersion` | обязательно | Должно в точности совпадать с `3`. Паки с `1`/`2` отклоняются при загрузке с `shaderPack:loadWrongApiVersion` — для миграции см. [часть IX](09-apiv3.md) |
| `name` | обязательно | Непустое. Показывается в интерфейсе настроек |
| `author` | необязательно | Можно опустить. Нестроковые значения (числа и т.п.) — ошибка |

Остальные поля игнорируются.

## 5. Минимальный шаблон

Рабочий пак только из `pack.json` (раздел 4) и этого `pack.wgsl`:

```wgsl
// Минимальный пак с лёгким тёплым оттенком
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

Правила:

- Никогда **не конструируйте выходные структуры напрямую** (`BloxdSurface(...)` — ошибка). Всегда начинайте с `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` и меняйте поля. Исключение: первый параметр light-хука (`s: BloxdSurface`) имеет выходной тип, так что `var out = s;` тоже годится
- Неинициализированный `var x: BloxdSurface;` (только аннотация типа) — тоже ошибка
- Параметры хуков — **только для чтения**. Чтобы менять, сначала скопируйте, напр. `var sv = s;`
- Префикс `bloxd_` запрещён в собственных идентификаторах (кроме 6 имён хуков)
- Константы пишите через `const` (`#define` значений не держит)

## 6. Шесть хуков

Все необязательны. Сигнатуры должны совпадать в точности по типам (имена параметров свободны).

| Хук | Роль |
|---|---|
| `fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex` | Анимация вершин террейна. **В strict-режиме недоступен** |
| `fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface` | Цвет, прозрачность и свечение террейна. `s.colour` — текстура × цвет вершины |
| `fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight` | Итоговый цвет террейна. Вызывается на **финальной стадии фрагмента**, возврат становится итоговым цветом как есть |
| `fn bloxdLiquidVertex / bloxdLiquidSurface / bloxdLiquidLight` (те же формы) | Версии для жидкостей. `alpha` работает как прозрачность жидкости |

Правила fallback:

- Без жидкостного хука **используется одноимённый хук террейна** (наоборот — нет). Один surface даст тот же эффект и жидкостям
- Без light-хука действует поведение по умолчанию (`engineColour + emission × fogVisibility`)
- Отбросив `engineColour` ради пересборки из базового цвета, наложите туман сами: `mix(l.fogColour, col, l.fogVisibility)`. Добавляя emission, сначала умножайте его на `fogVisibility`

## 7. Восемь вариантов и guard'ы

Код пишется один, но обязан компилироваться во всех **8 комбинациях {strict, allow} × {свет вкл, свет выкл} × {террейн, жидкость}**.
Доступны только `#define` (только флаг, без значений) / `#ifdef` / `#ifndef` / `#else` / `#endif`. `#` обязан начинать строку (и внутри функций тоже можно).

| Guard | Смысл | Применение |
|---|---|---|
| `#ifndef BLOXD_STRICT` | Только вне strict (allow) | Оборачивает весь vertex-хук и `discard` |
| `#ifdef BLOXD_LIGHTING` | Только при включённом свете | Оборачивает код, трогающий `blockLight`, `skyLight`, `ambientLightColour` и т.д. **Общие helper-функции (fn уровня модуля) оборачивайте целиком** (защитить только место вызова недостаточно) |
| `#ifdef BLOXD_ALPHA` | Когда поле `alpha` существует (жидкости всегда, террейн только в allow) | Оборачивает код, трогающий `alpha` |

## 8. Доступные возможности языка и запреты

Доступно:

- Встроенные функции WGSL (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select` и др.)
- Свои `fn` / `struct` / `const` / `alias` / `var<private>`, а также `let` и управление потоком (if/for/while/switch и др.) внутри функций
- Производные (`dpdx` / `dpdy` / `fwidth`) — только в surface/light-хуках (стадия фрагмента). В vertex нельзя
- `const`-массивы (напр. LUT палитры), указатели (`ptr<function, T>`), матрицы (`mat3x3f` и др.)
- Определения флагов `#define ИМЯ` + ветвление `#ifdef`

Запрещено / осторожно:

- **Без текстур**: типы `texture_*` / `sampler` неиспользуемы. Детали стройте процедурно через hash-шум и т.п.
- **`discard` запрещён в strict-режиме** (оборачивайте `#ifndef BLOXD_STRICT`)
- `@атрибуты` / `enable` / `requires` / `override` запрещены. Так как `enable f16;` написать нельзя, **типы f16 фактически неиспользуемы**
- `@builtin`-атрибуты тоже запрещены, поэтому `fragCoord` (экранные координаты) и `vertex_index` прочитать нельзя
- **Не используйте `let` на уровне модуля** (используйте `const` или `var`)
- `atomic` неиспользуем
- Координаты — noa-локальные. Для мировых прибавляйте `bloxdOriginOffset()`. Координаты блока: `bloxdFaceBlock(position, normal)`

## 9. Проверка, тестирование и распространение

При загрузке выполняются проверки по порядку:

1. Проверки лимитов загрузчика (лимиты раздела 3)
2. Статическая компиляция (все 8 вариантов)
3. Настоящая компиляция в браузерном WebGPU (статическая проверка типизирует не полностью; часть кода падает только здесь — избегайте ловушек раздела 8)

Шаги:

1. Загрузите zip / папку через настройки → Shader Pack
2. Проверьте статус. Сразу после выбора показывается «Ready. Reload the page to use it.», а после перезагрузки страницы «Ready to use» — успех. При «Saved, but it won't run until you fix these errors...» исправьте перечисленные ошибки (файл:строка + вариант) и загрузите снова
3. Если загрузилось — активируйте перезагрузкой страницы. Если в URL-параметрах или localStorage остались override'ы рендера, пак откажется стартовать — уберите их и перезагрузите
4. Сначала проверьте в permissive-играх, затем в strict-играх (их большинство). Анимация вершин работает только в allow-играх
5. Для распространения упакуйте в zip с `pack.json` наверху (в пределах лимитов раздела 3). Замена пака — чтением заново на том же экране, но для применения нужна перезагрузка страницы (шаги 2-3). Удаление — Remove Pack. Перепроверка после обновлений игры выполняется сама при загрузке страницы

[Вернуться к руководству](README.md)·[Следующая часть →](02-api.md)

[← Предыдущая часть](01-making.md)·[Вернуться к руководству](README.md)·[Следующая часть →](03-recipes.md)

# Часть II: Справочник API

> Текущая игра требует `apiVersion: 4` с 2026-10-26 и отклоняет паки v1/v2/v3 при загрузке — приведённое ниже написано по спецификации v2. Перед распространением см. [часть IX](09-apiv3.md) и [часть X](10-apiv4.md) для миграции.

## 10. Заголовок движка (автоматически добавляется перед кодом пака)

Движок автоматически вставляет код ниже перед кодом пака (паки не могут его переобъявлять). Секции в `#ifdef` различаются по вариантам.

```wgsl
// Engine-provided and read-only to packs. apiVersion 2.
const bloxdTimeWrap: f32 = 3600.0;   // seconds until time wraps to 0

fn bloxdTime() -> f32;               // seconds. wraps to 0 every 3600 s
fn bloxdOriginOffset() -> vec3i;     // whole blocks. noa-local + this = world coords
fn bloxdEyePosition() -> vec3f;      // camera position (noa-local)
fn bloxdSunDirection() -> vec3f;     // sun direction (unit vector, non-zero only with earth skybox)
fn bloxdWorldPosition(position: vec3f) -> vec3f;  // noa-local -> world coords
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i;  // world block coords of this face
fn bloxdApplyFog(colour: vec3f, l: BloxdLightIn) -> vec3f;   // mix(l.fogColour, colour, l.fogVisibility)

struct BloxdVertexIn {
    position: vec3f,   // noa-local world space (world minus bloxdOriginOffset())
    normal: vec3f,
    blockId: u32,      // owning block id (flat-interpolated, uniform across the face)
}

#ifndef BLOXD_STRICT
struct BloxdVertex {
    position: vec3f,     // noa-local
}
#endif

struct BloxdSurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    blockId: u32,        // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct BloxdLightIn {
    litColour: vec3f,          // engine lighting result (before emission and fog)
    engineColour: vec3f,       // post-fog = bloxdApplyFog(litColour, l). excludes emission
    directional: f32,          // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,            // the material's ambient times the scene's
    blockLight: vec3f,         // voxel block light, tone-mapped (all variants; 0 when unlit)
    skyLight: f32,             // voxel sky light, tone-mapped (all variants; 1 when unlit)
    ambientLightColour: vec3f, // present in all variants (white when unlit)
    skyLightColour: vec3f,     // present in all variants (white when unlit)
    heldLight: vec3f,          // held light here (all variants; 0 when unlit/out of range)
    fogColour: vec3f,
    fogVisibility: f32,        // 1 = no fog, 0 = fully fogged (renamed from v1 fogFactor)
    position: vec3f,           // as in BloxdSurfaceIn
    normal: vec3f,
    blockId: u32,              // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdLight {
    colour: vec3f,
}

// liquid variants, surface / light hooks only
struct BloxdOpaqueBehind {
    found: bool,       // false when no opaque face behind (sky)
    position: vec3f,   // opaque face position behind (noa-local)
    distance: f32,     // distance from the eye
}
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind;

#ifndef BLOXD_STRICT
fn bloxdDefaultVertex(v: BloxdVertexIn) -> BloxdVertex;
#endif

fn bloxdDefaultSurface(s: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdDefaultLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight;
```

Ключевые моменты:

- `bloxdTime()` — прошедшее время, заворачивающееся каждые 3600 секунд (`bloxdTimeWrap`). Синхронизация с внутриигровыми часами дня/ночи не гарантируется. Поскольку stage-видимость bind group — VERTEX|FRAGMENT, **его можно вызывать и из vertex-хуков**
- `bloxdSunDirection()` — единичный вектор, пока есть солнце; ноль, когда в небе нет солнца. **Луна всегда `-bloxdSunDirection()`** (движок считает позицию луны точной противоположностью солнца). В текущих сборках реализации цикла день/ночь нет: солнце, луна и звёзды не двигаются во время игры (включение/выключение показа — только настройки прозрачности вроде `dayNightSunOpacity`). На дефолтном земном небе солнце стоит почти в `(−0.56, 0.81, −0.18)` (высота ~54°). **Не передавайте нулевой вектор в `normalize`** — проверяйте отсутствие солнца через `dot(d, d) < 1e-8` и откатывайтесь на константное направление (см. [часть VII](07-internals.md) §28)
- ※Дополнение: раньше писалось «при нуле переиспользовать как лунное направление нельзя». Само направление доступно через `-bloxdSunDirection()`, но дистрибутивные паки должны ветвиться через `sunPresent` исходя из нуля (про синий ambient-псевдовид см. R2, про направленный лунный свет — [часть VII](07-internals.md) R-A)
- `emission` добавляется после расчёта освещения, ослабляясь на **`fogVisibility`** (реализация defaultLight `engineColour + emission × fogVisibility`. В полностью затуманенной дали свечение тоже гаснет)
- **Порядок наложения тумана**: обработка фрагмента идёт ① компоновка освещения/эмиссии → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ вызов light-хука → ⑤ return. Значит **engineColour приходит уже затуманенным**, а **возврат light-хука становится итоговым цветом как есть** (после хука туман не накладывается заново)
- **Источник fogVisibility**: дистанция в пространстве вида (считается повершинно, интерполируется). В linear-режиме `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **При fogMode == 0**: `fogColour` приходит как `vec3f(0.0)` (чёрный). Код, оценивающий время суток по оттенку fogColour, пусть осторожничает
- **Реальные настройки тумана текущих сборок**: **linear фиксирован**. `fogStart` = дистанция чанков, `fogEnd` = +1 чанк (только горизонт). При выключенном тумане выставлено 100 / 101 чанков, фактически выключен. Дефолтный цвет тумана RGB (183, 191, 195)
- Uniform `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) — **только для использования через функции заголовка**. Напрямую из паков не ссылайтесь. Stage-видимость — VERTEX|FRAGMENT, поэтому функции заголовка можно вызывать и из функций уровня модуля вне хуков, и из vertex-хуков. Текстура глубины (binding 1) — только FRAGMENT, поэтому `bloxdOpaqueBehind()` ограничен хуками surface / light
- **`skyLight` / `blockLight` / `heldLight` приходят после «lift-кривой»**. `tone-mapped` в комментариях заголовка — про это: движок всегда применяет `y = 1-(1-x/(3-2x))³` (S-кривая, поднимающая тёмные места) к фрагментам перед передачей пакам. Это не сырые воксельные значения (n/15); напр. под деревом (сырое 0.87) приходит поднятым до **0.97**. Для плавных градаций оставьте как есть, но **если хотите отделить день/тень порогом, сначала восстановите сырые значения обратным преобразованием `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`** (R9.12)
- `skyLight` по сути — воксельные данные затенения «видно ли отсюда небо» (= карта теней), а не просто параметр яркости (см. раздел 15 «Правда о тенях»)
- **Можно стартовать с `litColour`**: в v1 был лишь готовый затуманенный `engineColour`, и свои атмосферные эффекты давали двойной туман. В v2 стартуйте с до-туманного, до-эмиссионного `litColour` и накладывайте туман своим темпом через `bloxdApplyFog()`
- **`blockId` различает типы блоков**: идентификация независимо от цвета текстуры. Но таблица соответствия ID и типов блоков — внутри движка, так что какой ID какому блоку — измеряйте в мире; готовая таблица есть в [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (см. [часть VIII](08-apiv2.md))
- **Прямое конструирование структур запрещено**: вызовы конструкторов вроде `BloxdLight(...)` отклоняются статической проверкой. Всегда меняйте от `bloxdDefault*` или используйте копию входа

## 11. Таблица вариантов

| Вариант | BLOXD_STRICT | BLOXD_LIGHTING | BLOXD_ALPHA |
|---|---|---|---|
| allow + unlit + террейн | – | – | ✓ |
| allow + unlit + жидкость | – | – | ✓ |
| allow + lit + террейн | – | ✓ | ✓ |
| allow + lit + жидкость | – | ✓ | ✓ |
| strict + unlit + террейн | ✓ | – | – |
| strict + unlit + жидкость | ✓ | – | ✓ |
| strict + lit + террейн | ✓ | ✓ | – |
| strict + lit + жидкость | ✓ | ✓ | ✓ |

Формы структур заголовка тоже меняются по вариантам (нет `BloxdVertex` в strict, нет `blockLight` и др. в unlit, нет `alpha` в strict-террейне).

Официально определённых символов четыре (3 из таблицы выше + `BLOXD_SCENE_DEPTH` — [часть VIII](08-apiv2.md), раздел 35). Различие террейн/жидкость — не символ, а **отдельная программа**, поэтому ветвления вроде `#ifdef BLOXD_TERRAIN` писать нельзя. Сверка имён флагов не различает регистр. Если написать в `#ifdef` неправильное имя, текст ошибки покажет канонический список из 4 имён. Функции-хуки внедряются тоже только в 2 программы — террейн и жидкость; пак не может влиять на другие отрисовки (сущности, частицы и т.д.).

## 12. Шпаргалка-скелет

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);          // прямое конструирование запрещено; всегда начинайте с default
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // у террейна alpha есть только в allow
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);         // engineColour + emission*fogVisibility
    #ifdef BLOXD_LIGHTING                       // защищайте только lighting-входы
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex всегда с этим guard'ом
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdTime()) * 0.05;
    return out;
}
#endif
```

Пять вещей, которые держите в уме всегда: чисто компилироваться во всех 8 вариантах / strict-игры — большинство / без текстур / параметры хуков только для чтения / никакого `let` на уровне модуля.

[← Предыдущая часть](01-making.md)·[Вернуться к руководству](README.md)·[Следующая часть →](03-recipes.md)

[← Предыдущая часть](02-api.md)·[Вернуться к руководству](README.md)·[Следующая часть →](04-realism.md)

# Часть III: Сборник рецептов

> Текущая игра требует `apiVersion: 4` с 2026-10-26 и отклоняет паки v1/v2/v3 при загрузке — приведённое ниже написано по спецификации v2. Перед распространением см. [часть IX](09-apiv3.md) и [часть X](10-apiv4.md) для миграции.

- [R1. Рецепты цвета (surface)](#r1-рецепты-цвета-surface)
- [R2. Рецепты освещения (light)](#r2-рецепты-освещения-light)
- [R3. Рецепты свечения (emission)](#r3-рецепты-свечения-emission)
- [R4. Рецепты координат (мир / блок / взгляд)](#r4-рецепты-координат-мир--блок--взгляд)
- [R5. Рецепты времени (анимация)](#r5-рецепты-времени-анимация)
- [R6. Рецепты жидкостей](#r6-рецепты-жидкостей)
- [R7. Рецепты вершин (только allow)](#r7-рецепты-вершин-только-allow)
- [R8. Математические трюки](#r8-математические-трюки)
- [R9. Реалистичные рецепты](#r9-реалистичные-рецепты)

---

> **Важно:** рецепты ниже — отдельные примеры, не для склейки сверху вниз. Вставка нескольких определений одного имени хука (`bloxdTerrainLight` и т.п.) или одного имени helper-функции дублирует определения в одном модуле и роняет компиляцию. Для объединения эффектов сливайте их в одну функцию на тип хука.

## R1. Рецепты цвета (surface)

### Один оттенок (самое базовое)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Буст / срез насыщенности

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 живее / -1.0 полный монохром
```

### Цветовая температура (тёплый ⇄ холодный)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = тепло (сильнее красный), -1.0 = холод (сильнее синий)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### Винтаж / сепия

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### Градиент высоты (тёплые низины)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 1..0 на высоте 0..50
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Покраска по ориентации грани (верх = светлее, стены = темнее)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // пол 1 / стена 0 / потолок -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // стены и потолки чуть темнее
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Постеризация (меньше цветов)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. Рецепты освещения (light)

### S-кривая контраста

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### Дальняя дымка (свой туман)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 0..0.35 своего тумана с 64 до 192 блоков
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### Ночь (синий сдвиг по skyLight + защита ламп)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
    #endif
    return out;
}
```

### Пещеры впотьмах (дожимаем места без skyLight)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    out.colour *= mix(1.0, 0.35, underground * underground);
    #endif
    return out;
}
```

> `skyLight` приходит пост-лифт (раздел 10): лёгкое затенение (под деревьями: сырое 0.87 → поднятое 0.97) этим методом почти не темнеет. Годится для пещер (сырое 0). Чтобы подчеркнуть «тень деревьев», используйте инверсию лифта + порог из R9.12.

### Синее ночное окружение (псевдо-вид без направления луны)

> В этом API `bloxdSunDirection()` равен нулю, когда в небе нет солнца. Ниже — не направленный лунный свет, лишь слабое синее окружение, когда небо тёмное. Само лунное направление доступно через `-bloxdSunDirection()` (только миры с циклом день/ночь. [Часть VII](07-internals.md) R-A).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let upward = clamp(l.normal.y, 0.0, 1.0);
    out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
    #endif
    return out;
}
```

### Закатное тепло (оттенок по высоте солнца)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 у горизонта / 0 в зените
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### Полная замена вывода движка (простейшее переосвещение)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // ПРИМЕЧАНИЕ: прямая конструкция BloxdLight(...) запрещена; переписывайте colour от default
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // отбрасываем engineColour (результат освещения движка) и ставим «базовый цвет × своя яркость»
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // engineColour отброшен: туман заново обязателен
    out.colour = col + s.emission * l.fogVisibility;   // emission тоже добавьте сами (обязательно)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. Рецепты свечения (emission)

> `emission` добавляется после расчёта освещения, но штатная обработка **ослабляет его на `fogVisibility`. В полностью затуманенной дали свечение тоже гаснет. Чтобы светилось издалека, не добавляйте в emission — добавляйте напрямую как `out.colour += ...` внутри light-хука** (engineColour уже затуманен, так что вдали свет ложится поверх цвета тумана)

### Пульсирующие лампы (дышащие факелы)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(bloxdTime() * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### Светящаяся руда (светлые материалы светятся)

```wgsl
// сторона surface: чем светлее (белее) материал, тем больше emission
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### Рой светлячков (дрейфующие светящиеся точки)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // несколько медленно дрейфующих «световых шаров»; свечение по обратной дистанции
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. Рецепты координат (мир / блок / взгляд)

### Мировые координаты

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### Координаты блока

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
```

### Шахматка (поблочно)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 или 1
out.colour *= mix(0.96, 1.04, checker);
```

### Поблочный псевдорандом (hash)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// применения: вариации травы, пятнистость камня и т.д.
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### Вектор взгляда и rim-подсветка

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### Угол взгляда (доморощенный френель — для жидкостей)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 в лоб / 0 по касательной
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. Рецепты времени (анимация)

> `bloxdTime()` заворачивается каждые 3600 секунд (1 час). Это прошедшее время шейдера без гарантии синхронизации с солнцем/днём-ночью игры. Для видимой периодической анимации годится, но для определения настоящей ночи предпочитайте `bloxdSunDirection()` и lighting-входы.

### Цикл день-ночь (1 сутки в час)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 часовой период; не обязательно синхронен с днём/ночью игры
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### Покачивание (наложенные синусы)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### Плывущие полосы авроры / флуоресцентные ленты

```wgsl
// смешиваем 3 цвета по XZ-позиции и времени
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

## R6. Рецепты жидкостей

### Рябая поверхность (мерцание цвета)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // у liquid всегда BLOXD_ALPHA — guard по привычке
    #endif
    return out;
}
```

### Псевдопрозрачность по высоте (не настоящий тест мели)

> В v1 глубину сцены и положение дна запросить было нельзя: настоящая глубина воды одним этим API не вычислялась. В v2 только для жидкостей `bloxdOpaqueBehind()` меряет толщину до непрозрачной грани позади ([часть VIII](08-apiv2.md) R-E). Ниже — старый псевдоэффект без него: `s.position.y` — локальная координата, и в сыром виде эффект уплывёт вместе с origin чанка. Ниже — лишь изменение alpha по мировой высоте, псевдоэффект, а не мелководье по берегам/дну. `packWaterReferenceY` подгоните под высоту своего мира.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // ниже — тоньше, выше — ближе к базовой alpha; направление проверьте в игре
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### Подводная муть изнутри

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### Пак только-жидкости (террейн нетронут)

```wgsl
// вообще не пишите terrain_*-хуки. Тогда:
//  - варианты terrain = без хуков = дефолты движка
//  - варианты liquid  = действуют только liquid_*-хуки
```

## R7. Рецепты вершин (только allow)

> Всё оборачивайте в `#ifndef BLOXD_STRICT`.
> Подробности условий (список allow-игр; Custom Games — strict) в §30: [§30 Режимы применения по играм](07-internals.md#30-режимы-применения-по-играм-shaderpackpolicy)

### Трава на ветру (шевелим только верхушки)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // только вертикальные грани
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### Волны жидкости (только верхние грани)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdTime() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdTime() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### Пульсирующий террейн

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // лёгкое расширение/сжатие вдоль нормалей
    return out;
}
#endif
```

### Волнующийся террейн (гигантские синусы)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdTime() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdTime() * 0.7) * 0.3;
    return out;
}
#endif
```

## R8. Математические трюки

```wgsl
// мягкое квантование 0..1 (n ступеней)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// двухуровневый порог (toon-тень)
let shadow = smoothstep(0.35, 0.37, level);   // ±0.02 вокруг порога дают ступени

// трёхуровневый toon
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// luma (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// мягкий пульс
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// треугольная волна (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// секунды → «медленная фаза» (для эффектов, игнорирующих цикл 3600 с)
let phase = t * 0.15;
```

## R9. Реалистичные рецепты

> Физические рецепты для «пересборки ванильного вида из материалов». Сначала предпосылки:
>
> 1. **Light-хук вызывается на финальной стадии фрагмента**. Возвращённый цвет становится итоговым как есть. **Туман накладывайте сами** (R9.10)  
> 2. **Штатное освещение движка — только умножение**. Спекуляр / френель / тепло-холодное разделение / полусферическое окружение строятся с нуля  
> 3. `l.engineColour` — готовый цвет (уже с туманом). Пересборка из `s.colour` (альбедо) — основательный путь  
> 4. Текстуры запрещены → все детали только **процедурные** (hash/шум) (R9.8)

### R9.1 Тёплые факелы × холодный небесный свет

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // промежуточный clamp
    col = mix(l.fogColour, col, l.fogVisibility);                    // туман заново
    out.colour = col + s.emission * l.fogVisibility;                 // emission досложить
    #endif
    return out;
}
```

### R9.2 Солнечный спекуляр (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);          // половинный вектор
        let ndh = max(dot(n, h), 0.0);
        let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
        let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
        out.colour += spec * vec3f(1.0, 0.97, 0.90);
    }
    #endif
    return out;
}
```

### R9.3 Френель Шлика

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // тонкая яркость кромок
    #endif
    return out;
}
```

### R9.4 Полусферическое окружение (небо сверху / отскок земли снизу)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // снизу: отскок
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // сверху: небесный свет
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // промежуточный clamp
    col = mix(l.fogColour, col, l.fogVisibility);                           // туман заново
    out.colour = col + s.emission * l.fogVisibility;                        // emission досложить
    #endif
    return out;
}
```

### R9.5 ACES filmic (аппроксимация Нарковича)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = экспозиция
    return out;
}
```

### R9.6 Воздушная перспектива («воздух» через обесцвечивание вдаль)

> Осторожно: если применить к цвету дымки обработку, поднимающую яркость (`normalize` и т.п.), в тёмных сценах всплывает «яркий белый туман»,  
> а добавление цвета тумана поверх engineColour (уже с туманом) даёт двойной туман и белесость. **«Воздух» выражайте только снижением насыщенности** — это безопасно.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // затухание (~30% на 100blk / ~75% на 400blk)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // только saturation вниз (luminance цел)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 Волновые нормали + солнечный глиттер («солнечная дорожка» на воде)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // высота h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // dh/dx
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // dh/dz
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = bloxdWorldPosition(l.position);
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdTime()), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);
        let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
        out.colour += glint * vec3f(1.0);
    }
    #endif
    return out;
}
```

### R9.8 Процедурный микробамп (обход запрета текстур)

```wgsl
fn pack_hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}
fn pack_bumpNormal(p: vec3f, n: vec3f, strength: f32) -> vec3f {
    let e = 0.15;
    let h0 = pack_hash(p);
    let hx = pack_hash(p + vec3f(e, 0.0, 0.0));
    let hz = pack_hash(p + vec3f(0.0, 0.0, e));
    let tangentX = normalize(cross(vec3f(0.0, 1.0, 0.0), n) + vec3f(0.0001, 0.0, 0.0));
    let tangentZ = normalize(cross(n, tangentX));
    return normalize(n + tangentX * (hx - h0) * strength + tangentZ * (hz - h0) * strength);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // локальные координаты блока
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lam = clamp(dot(n, sunDir), 0.0, 1.0);
        let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
        out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
    }
    #endif
    return out;
}
```

### R9.9 Нелинейное затемнение пещер + защита ламп

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let keep = 0.12 + 0.88 * blockInt;          // приподнимаем места с лампами
    out.colour *= mix(keep, 1.0, sky * sky);     // нелинейное (квадратичное) затемнение
    #endif
    return out;
}
```

### R9.10 Переналожение тумана (обязательно при отбросе engineColour)

> Полом вида `max(l.fogVisibility, 0.25)` задаёт «плотнее этого не будет»  
> (0.0 = как у движка / 0.3–0.5 = дали чище).  
> Учтите: туман движка — линейный только у горизонта (вблизи дальности прорисовки); среднюю дымку стройте паком.
> Реальные настройки тумана (сверены с реализацией): linear фиксирован / `fogStart` = дистанция чанков / `fogEnd` = +1 чанк / при выключенном тумане 100–101 чанков, фактически выключен / дефолтный цвет RGB (183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // туман заново (0.15 = лёгкий пол)
    col += s.emission * l.fogVisibility;            // emission тоже с туманом
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 Кино-грейд (холодные тени / тёплые света / ночное обесцвечивание)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;  // ночь только при нулевом направлении солнца; сумеречного градиента нет
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 Проекционные тени — инверсия лифта + пороговый срез (финал)

> **Перепроверка предпосылки (раздел 10)**: `l.skyLight` — не сырое воксельное значение (n/15), а значение после движковой «lift-кривой»  
> `y = 1-(1-x/(3-2x))³` (S-кривая, поднимающая тёмные места).
>
> | Место | сырой воксель | поднятое (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | открытое небо | 1.00 | 1.00 | 1.00 |  
> | под деревом (радиус 2) | 0.87 | **0.97** | **0.86** ← почти цело |  
> | радиус 3 | 0.80 | **0.92** | 0.66 |  
> | радиус 5 | 0.67 | 0.78 | 0.29 |
>
> **Это доказанная первопричина «тени не углубляются никакой гаммой»**. Но кривая монотонна, значит алгебраически строго обратима:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Восстановив сырые значения, остаётся лишь бинаризовать пороговым срезом (`smoothstep`).  
> BFS-распространение LightEngine — «1 блок = -1», так что порог `th = 1 - r/15` напрямую крутит  
> «затенение радиуса r и больше считать тенью». Ломаете блоки — тени двигаются сразу (LightEngine пересчитывает в реальном времени).  
> Ограничение: тени опираются на «небо сверху», поэтому за солнцем не вращаются (раздел 15 «Правда о тенях»).

```wgsl
// Точно инвертируем лифт движка, восстанавливаем сырой воксельный skyLight (n/15)
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // cbrt в WGSL нет, берём pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // крутилка радиуса тени: th = 1 - r/15 (0.87 = радиус 2+ это тень)
const shSoft = 0.04;   // мягкость кромки (0.02 = жёстко / 0.08 = мягко)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. восстанавливаем сырые значения (пропустите — теней не будет никогда)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. пороговый срез — чисто разделяем солнце=1 / тень=0
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // солнечный Ламберт (без солнца — fallback на l.directional)
    let sunLen = length(bloxdSunDirection());
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                      sunLen > 0.5);
    // суть проекции: прямое солнце достаёт только туда, где видно небо
    let lit = sunL * sky;
    // теневая сторона: подкрашена небом, не чёрная + минимальный ambient
    let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
    var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
    // свет факела пробивает тени (blockLight тоже поднят: восстанавливаем вместе)
    let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                         sh_unlift(l.blockLight.g),
                         sh_unlift(l.blockLight.b));
    let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
    col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
    // туман заново (доля отброшенного engineColour)
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // emission тоже не забудьте (с туманом)
    #endif
    return out;
}
```

> Гайд по настройке: **площадь тени решает только `shTh`** — `0.93` = радиус 1.5+ / `0.87` = радиус 2 / `0.80` = радиус 3 / `0.67` = радиус 5.  
> Жёсткость кромки — это `shSoft` (0.02 = жёстко / 0.08 = мягко). Темнота ядра — двухточечный сдвиг `0.09` (минимальный ambient) и `0.16` (рассеянный свет неба).  
> Чтобы расширить тени к вечеру, добавьте `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (приближение длинных вечерних теней.  
> `sunDir` — это `bloxdSunDirection() / length(bloxdSunDirection())`). Для более синих теней поднимите B в `vec3f(0.72, 0.82, 1.05)`.
>

[← Предыдущая часть](02-api.md)·[Вернуться к руководству](README.md)·[Следующая часть →](04-realism.md)

[← Предыдущая часть](03-recipes.md)·[Вернуться к руководству](README.md)·[Следующая часть →](05-troubleshooting.md)

# Часть IV: Руководство по реализму

> Текущая игра требует `apiVersion: 4` с 2026-10-26 и отклоняет паки v1/v2/v3 при загрузке — приведённое ниже написано по спецификации v2. Перед распространением см. [часть IX](09-apiv3.md) и [часть X](10-apiv4.md) для миграции.

## 13. Штатное освещение движка и запас под реализм

Штатное освещение движка — «только умножение»: specular, fresnel, тепло-холодного разделения и полусферического окружения нет. Перестраивается вот что:

| Функция | По умолчанию | Строится в паках? |
|---|---|---|
| Диффуз (Ламберт) | Только скалярная сумма направленного | ◎ Своё через `bloxdSunDirection()` (обёртки и т.д.) |
| Спекуляр | Нет | ◎ Blinn-Phong (R9.2) |
| Френель | Нет | ◎ Аппроксимация Шлика (R9.3) |
| Разделение тёплый факел / холодное небо | Бесцветно | ◎ (R9.1) |
| Полусферическое окружение | Без направления | ◎ Небо сверху / земля снизу (R9.4) |
| Тонемаппинг | Нет (только clamp) | ◎ ACES filmic (R9.5) |
| Воздушная перспектива | Только туман (замена цвета) | ◎ Обесцвечивание вдаль (R9.6) |
| Детали поверхности | Только разрешение текстур | △ Процедурный hash-микробамп (R9.8) |
| Волны вершин (вода) | Нет (плоско) | ◎ Только allow (R7) |
| Волновые нормали / солнечный глиттер | Нет | ◎ (R9.7) |
| Ночной лунный свет | Цвет неба просто темнеет | △ Лунное направление в `-bloxdSunDirection()`: псевдо-виды (синее окружение в R2 / обесцвечивание в R9.11) плюс направленный лунный свет (R-A, лишь цикл день/ночь) |
| Тени (небесное затенение) | Лишь мягкий микс `mix(ambient, sky, skyLight)` | ◎ Инверсия лифта + пороговый срез + солнечный гейт (R9.12). Тень деревьев и подкровельная падают чётко, за правками блоков следуют в реальном времени |

## 14. Две школы реализации

**Школа A: аддитивные правки (от defaultLight)** — берём `engineColour` (готовый цвет) за основу и добавляем тёплое свечение или rim. Легко и безопасно, но модель освещения остаётся штатной.

**Школа B: полное переосвещение (от s.colour)** — отбрасываем `l.engineColour` и пересобираем свет из `s.colour` (альбедо) и сырого LightIn-материала. Настоящий путь к реализму. Четыре правила:

1. **Накладывайте туман заново**: light-хук идёт после тумана; применяйте `mix(l.fogColour, col, l.fogVisibility)` сами (R9.10). При густом тумане кладите пол `max(l.fogVisibility, 0.3)`. И наоборот: домешивать цвет тумана в паки на engineColour — белый двойной туман
2. **Unlit-фолбэк**: вне `#ifdef BLOXD_LIGHTING` — сквозной проход в `defaultLight`
3. **Общие функции — целиком в guard**: общие функции с параметром `BloxdLightIn` оборачивайте в `#ifdef BLOXD_LIGHTING` целой fn (защитить только вызовы недостаточно)
4. **Без направления солнца**: при нулевом `bloxdSunDirection()` направленный спекуляр не считайте. `l.directional` — скаляр количества света, а не вектор направления: направление блика не восстановит. При нужде переключайтесь на слабый ненаправленный ambient. Лунное направление доступно через `-bloxdSunDirection()` (движется лишь в мирах с циклом день/ночь. [Часть VII](07-internals.md) R-A)

## 15. Недостижимые виды («потолок» реализма)

| Вид | Причина |
|---|---|
| Попиксельные карты теней (тени, вращающиеся за солнцем, полутень) | Текстуры глубины не сослаться (жидкостный `bloxdOpaqueBehind()` — лишь геометрия, для карт теней непригоден). Затенение лучей в хуки не подаётся |
| SSAO | Нет доступа к глубине сцены (только запечённая вершинная AO мешера; жидкостная глубина для SSAO непригодна) |
| SSR (отражения) | Цвета сцены нет. Только псевдо-виды с подмесом цвета неба через френель |
| Блум / глэр | Нет хука в постобработку |
| Глубина резкости, хроматическая аберрация, зерно | Нужен полноэкранный постпроцессинг |
| Объёмный свет (god rays) | То же |
| PBR-текстуры | Чтения текстур запрещены. Только псевдо-оценка по яркости цвета |
| Подводная рефракция | Цвета сцены нет. Жидкостная глубина (`bloxdOpaqueBehind()`) даёт поглощение по толщине и проекцию дна ([часть VIII](08-apiv2.md) R-E) |
| Подводная вуаль (синий тинт): снятие / изменение | Вуаль — эмиссивный фулскрин-квад из definition-цвета/альфы жидкостного блока камеры, рисуемый вне пайплайнов хуков (самым передним), так что пак не меняет ни цвет, ни плотность |
| Прямое подводное детектирование | Нет поля, показывающего погружение камеры, и fogStart / fogEnd / fogColour под водой не меняются: надёжного способа оценить и из fogVisibility и др. тоже нет |

### Правда о тенях — «тени деревьев» делаются

В таблице невозможны только **вращающиеся за солнцем попиксельные карты теней**. Движок считает «тени» с самого начала, и это `skyLight`. Меш-сторона LightEngine работает по майнкрафт-образному алгоритму:

1. **Сканирование столбцов**: каждый столбец (x,z) сверху вниз. Свет неба стартует с 15, на непрозрачных блоках становится **0**, спускаясь с затуханием по `lightFilter` (воздух 1 / вода 3 / непрозрачное 15)
2. **BFS-заливка**: растекается вбок на 6 соседей (-1 за блок) — вот что смягчает кромки теней. Сырое значение под затенением радиуса r равно (15-r)/15
3. blockLight (факелы и т.п.) — отдельный BFS из 3 RGB-каналов (4bit-пак)

То есть `l.skyLight` — не просто параметр яркости, а **воксельные данные затенения «видно ли отсюда небо» = карта теней**. Под деревьями, под крышами и внутри она численно уже низкая и приходит сглаженной вершинной интерполяцией. Ставите/ломаете блоки — мгновенный пересчёт = **тени, следующие в реальном времени**. Ванилла использует её лишь «мягко» через `mix(ambient, sky, skyLight)`.

Правильные инструменты — два шага R9.12 (**восстановить сырые значения инверсией лифта → бинаризовать пороговым `smoothstep`**. `th = 1 - r/15` напрямую крутит «радиус затенения, считаемый тенью») плюс **открыть прямое солнце через sky** (солнце достаёт только туда, где видно небо = суть проекции), с тёплым солнцем / холодной тенью в окраске.

**Честные ограничения**: эти тени опираются на «небо сверху», поэтому **за солнцем не вращаются**. Разрешение — поблочное (мягкие кромки — от BFS-рассеивания). В шаблоне освещения до сих пор лежит закрытый стаб `var shadow: f32 = 1.;` под карты теней (всегда 1.0 = выключен) — читается как след «запланированных» попиксельных вращающихся теней. Если такие тени кровь из носу нужны, остаются лишь вне-API пути (напр. GLSL-инъекция юзерскриптом, с риском по правилам).

### Подводная реальность

Подводные виды состоят из 3 слоёв:

| Слой | Содержимое | Управляется из паков? |
|---|---|---|
| ① Рендер террейна/жидкости | Обрабатывается хуками. Light-хуки под водой вызываются штатно | Да (работает «под вуалью») |
| ② Вуаль definition-жидкости | Эмиссивный фулскрин-квад из definition-цвета/альфы жидкостного блока камеры, рисуемый вне пайплайнов хуков (самым передним). Игровая настройка `cameraTint` побеждает, если задана | Нет (ни цвет, ни плотность не меняются) |
| ③ cameraTint | Настройка игры | Нет |

Практические пункты: паки продолжают работать под водой / вуаль не снять / под водой не разветвиться (fogStart / fogEnd / fogColour под водой не меняются: fogVisibility её тоже не детектирует).

## 16. Советы по отладке

- Слишком светлые пещеры → не хватает нелинейной кривой `skyLight` (рецепт пещер R2 / R9.9)
- Выжженные дни → снижайте экспозицию до ACES
- Слишком тёмные ночи → обеспечьте минимальный ambient (ночной `skyLightColour` по условию почти чёрный)
- Слишком дымные дали → снижайте воздушные коэффициенты
- Всё оранжевое вокруг факелов → снижайте тёплую долю (оставьте часть сырого крашеного света)
- Блоки почти сплошь белые → суммарный выход light-хука выше 1.0 (ниже по потоку clamp'а нет). Заканчивайте `clamp(col, vec3f(0.0), vec3f(1.0))`
- Бело без сложений → un-fog инверсия делением на fogVisibility. Уберите un-fog; пересоберите от `s.colour`, а туман `mix`'ом один раз в конце
- Эмиссивные блоки не светятся → пропущено досложение emission в рецептах пересборки. Добавьте `+ s.emission * l.fogVisibility`
- Ночью остаются только освещённые грани → затемняйте не только тени; гасите весь готовый цвет (`engineColour`) ночью. Локальные лампы щадите слабее через `blockLight` / `heldLight` ([часть VI](06-implementation.md), раздел 19)
- Тень не углубляется через `pow(skyLight, γ)` → `l.skyLight` пост-кривая (раздел 10). Переходите на инверсию + порог R9.12
- Настроить площадь/плотность тени → гайд настройки R9.12 (площадь = порог `shTh` / кромка = `shSoft` / темнота ядра = двухточечный сдвиг минимального ambient и небесного рассеяния)

[← Предыдущая часть](03-recipes.md)·[Вернуться к руководству](README.md)·[Следующая часть →](05-troubleshooting.md)

[← Предыдущая часть](04-realism.md)·[Вернуться к руководству](README.md)·[Следующая часть →](06-implementation.md)

# Часть V: Решение проблем и замечания

> Текущая игра требует `apiVersion: 4` с 2026-10-26 и отклоняет паки v1/v2/v3 при загрузке — приведённое ниже написано по спецификации v2. Перед распространением см. [часть IX](09-apiv3.md) и [часть X](10-apiv4.md) для миграции.

## 17. Частые ошибки и фиксы

| Симптом | Фикс |
|---|---|
| Не грузится в strict-играх | Оберните vertex-хук в `#ifndef BLOXD_STRICT` |
| `.alpha` заявлен как неопределённый | Оберните в `#ifdef BLOXD_ALPHA` |
| `blockLight` заявлен как неопределённый | Оберните в `#ifdef BLOXD_LIGHTING`. Общие helper-функции оборачивайте **целыми функциями** (в v2 поля есть всегда, так что обычно не случается. Guard'ы для детектирования оставляйте) |
| `Packs can't construct BloxdSurface directly` | Начинайте с `bloxdDefaultSurface(s)` |
| `pack.json needs "apiVersion": 3.` | Нет `apiVersion` или не `3`. Впишите число `3` (строка `"3"` отклоняется). Паки v1/v2 отклоняются с `shaderPack:loadWrongApiVersion` |
| `There's no pack.json at the top of the pack.` | Нет `pack.json` в корне ZIP. Проверьте, не упаковали ли саму папку |
| `bloxdTerrainVertex must be declared as: fn ...` | Сигнатура отличается. Перепишите в точности как показано |
| `bloxdTerrainVertex can't run in strict games...` | Оберните vertex-хук в `#ifndef BLOXD_STRICT` |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | Оберните в `#ifdef BLOXD_LIGHTING` (в v2 поля есть всегда, так что обычно не случается) |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | Оберните в `#ifndef BLOXD_STRICT` |
| Крутите `pow(l.skyLight, γ)` — тени не углубляются никогда | `skyLight` — значение пост-кривой (сырое 0.87 приходит как 0.97). Переходите на инверсию лифта + порог R9.12 (раздел 10) |
| `... can only be a function's parameter or return type, ...` | Неинициализированный `var x: BloxdSurface;` отклоняется. Стройте от `bloxdDefault*` |
| `bloxdPackInputs isn't part of the bloxd_ header` | Uniform PackInputs нельзя ссылать из паков напрямую. Используйте через функции заголовка вроде `bloxdTime()` |
| `Packs can't declare bloxd_ names...` | Уберите префикс `bloxd_` из своих идентификаторов. Определять можно лишь 6 имён хуков |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Переписывайте от `bloxdDefaultSurface(s)` и т.д. Старт с копии первого параметра light-хука (`var out = s;`) тоже годится |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` невозможен. Пишите `_ = f();` |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | Оборачивайте вызовы `bloxdOpaqueBehind()` в хуках террейна в `#ifdef BLOXD_SCENE_DEPTH` |
| `...only surface and light hooks can use.` | Уберите `bloxdOpaqueBehind()` из vertex-хуков (только surface / light) |
| `Lite: …reads scene depth on a page that didn't turn it on` | Перезагрузите страницу и откройте заново, пока пак, читающий глубину ([часть VIII](08-apiv2.md) §35), активен. Готовность depth-текстуры фиксируется при создании страницы |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Не ошибка, а автодеактивация в strict-играх (`shaderPack:offInStrict`). Оборачивайте vertex-хуки и `discard` в `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Ошибка второй ступени (браузерный Tint). Операнды `^` `&` `\|` `<<` `>>` берите в скобки (§38) |
| `loadDuplicateManifest` при загрузке zip | Два `pack.json` (включая регистровые варианты). Оставьте один |
| «needs the new WebGPU renderer, so remove the renderer override...» | Уберите `?renderer=` из URL и `bloxdRenderer` из localStorage и перезагрузите ([часть VII](07-internals.md) §29) |
| Белая молочная даль | Чаще двойной туман. Готовый цвет уже с туманом: свой держите сдержанно и лучше снижайте только saturation |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | Предупреждение: очередь сидов блочного света переполнилась (плотные скопления светящихся блоков или через границу зон), расчёт света этого чанка оборвался. Не ошибка пака, но **провалы света у скоплений светящихся блоков — именно эта механика**; лечится разрежением источников на стороне мира |
| Пак исключили при входе в игру | Падает live-проверка игры. Проверьте пропуски guard'ов |
| live-проверка не успевает — `This device couldn't check …`, пак исключён | У проверки жёсткий таймаут 60 секунд (превышение помечается `skipped`). Типично для слабых устройств и тяжёлых миров: сократите нагрузку vertex-обработки и сложные циклы и повторите |

### Список ID ошибок этапа загрузки

Ошибки в экране настроек несут ID вида `shaderPack:load*`. Для поиска по текстам:

| ID | Значение |
|---|---|
| `loadZipTooBig` | zip больше 32MB |
| `loadTooManyZipEntries` | записей zip больше 1024 |
| `loadTooManyWgsl` | файлов `.wgsl` больше 256 |
| `loadSourceTooBig` | суммарный объём `.wgsl` больше 256KB (потоковая проверка пофайлово) |
| `loadManifestTooBig` | `pack.json` больше 64KB |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` — не JSON / не объект |
| `loadNoApiVersion` / `loadWrongApiVersion` | нет `apiVersion` / не `3` (v1/v2 отклоняется) |
| `loadNoName` / `loadAuthorNotString` | нет `name` / `author` не строка |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | неподдерживаемое сжатие / zip64 / многотомный / шифрованный |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | дубликат пути / не UTF-8 / ошибка распаковки / zip повреждён |

`loadNoManifest` / `loadDuplicateManifest` (расположение и дубликат pack.json) — см. соответствующие строки таблицы выше.

## 18. Права и замечания

- Функция шейдер-паков — официальная функция, загружаемая из интерфейса игры, и создание паков считается предусмотренным использованием. Но подтверждённой публичной официальной документации нет
- Паки — чистый WGSL: выполнение JS и доступ к сети невозможны по конструкции
- Это неофициальное руководство, а не официальная позиция разработчиков. API может измениться без уведомления

[← Предыдущая часть](04-realism.md)·[Вернуться к руководству](README.md)·[Следующая часть →](06-implementation.md)

[← Предыдущая часть](05-troubleshooting.md)·[Вернуться к руководству](README.md)·[Следующая часть →](07-internals.md)

# Часть VI: Важные замечания по реализации

> Текущая игра требует `apiVersion: 4` с 2026-10-26 и отклоняет паки v1/v2/v3 при загрузке — приведённое ниже написано по спецификации v2. Перед распространением см. [часть IX](09-apiv3.md) и [часть X](10-apiv4.md) для миграции.

## 19. Чиним «тёмные тени, но светлые поверхности» ночью

Затемнение только теней оставляет готовый цвет движка (`engineColour`) ярким без солнца, и разрыв грань/тень выглядит неестественно. Гасите весь готовый цвет.

Пример трактует нулевой `bloxdSunDirection()` как ночь, а направленное солнце — как день, гася готовые цвета террейна в тёмные часы. Где сильны `blockLight` и `heldLight`, затухание слабеет, чтобы сберечь ближний свет вроде факелов. `0.52` — настроечное значение, для более тёмных ночей снижайте.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    #ifdef BLOXD_LIGHTING
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
    let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
    let protectLocalLight = smoothstep(0.03, 0.35, localLight);
    scale = mix(nightDim, 1.0, protectLocalLight);
    #endif
    // гасим готовый цвет; emission материала добавляем штатно через туман
    out.colour = l.engineColour * scale + s.emission * l.fogVisibility;
    return out;
}
```

**Ограничения этого фикса:** если `bloxdSunDirection()` ведёт себя как «единичное направление при солнце, ноль без него», день/ночь различимы, но сумерки плавно не оценить. А раз гасится готовый цвет, engine-дневной свет и ambient слабеют вместе — не полное воспроизведение времени суток. Чтобы применить то же к жидкостям, проверьте fallback-отношения жидкостных хуков.

## 20. Интегрированный рецепт естественно выглядящей воды

Этот API не умеет сэмплить цвет сцены: это **псевдо-стилизация смешением цвета по френелю и солнечными бликами, а не настоящее отражение/преломление** (математика глубины стала возможна в v2 с `bloxdOpaqueBehind()`, вынесена в [часть VIII](08-apiv2.md) R-E). Сэмпл сохраняет базовый цвет, подмешивает немного к небесному на скользящих углах и добавляет маленький глиттер только при солнце.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = bloxdWorldPosition(l.position);
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdTime()), topness));
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let halfDir = normalize(viewDir + sunDir);
        let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
        out.colour += vec3f(1.0, 0.97, 0.90) * glint;
    }
    #endif
    return out;
}
```

Ориентиры настройки:

- Вода белая/выстиранная: снижайте `0.38` в `fresnel * 0.38` и глиттер `0.55`.
- Вода слишком тёмная: подмешайте чуть больше `fakeSkyReflection`. В переборе выглядит пластиком.
- Линии или регулярные полосы на воде: снижайте частоты волн и силу глиттера. Этот код не двигает вершины меша.
- Хотите настоящие отражения пейзажа: во входах этого API нет цвета экрана, смешением цветов настоящее отражение не получить (глубина доступна только для жидкостей. [Часть VIII](08-apiv2.md) R-E).

Этот рецепт **заменяет** существующий `bloxdLiquidLight`. Не клейте его рядом с одноимённой волновой функцией из R9.7 и другими одноимёнными хуками.

## 21. Чеклист тестов в игре

Успех компиляции и «красивый вид» — разные вещи. Проверяйте в этом порядке:

1. **Загрузка:** `pack.json` в корне ZIP. Сразу после выбора показывается `Ready. Reload the page to use it.`, а **активация происходит перезагрузкой страницы**; после неё проверьте `Ready to use`. Сохранённый пак при обновлении spec-заголовка движка автоматически перепроверяется при следующей загрузке страницы сверкой отпечатка содержимого заголовка (успех — остаётся активным / провал — метка blocked). Сломанный старый пак не остаётся тихо активным.
2. **8 вариантов:** без пропусков типовых guard'ов в strict / allow, свет вкл / выкл, террейн / жидкость. Даже если игра использует лишь часть условий, дистрибутивные паки должны исходить из всех 8.
3. **День:** цвета по материалам не выжжены (трава, камень, песок, дерево); естественный свето-теневой перепад верхов и боков.
4. **Ночь:** сравните те же материалы при былом свете, тени и близость факелов. Остаются только освещённые грани — крутите затухание экспозиции; всё темно — крутите защиту локального света.
5. **Вода:** смотрите сверху, под скользящими углами, берега, из-под воды и ночью по отдельности. Поведение alpha и подводный вид зависят от композита игры — никогда не судите с одной точки зрения. Под водой вуаль definition-жидкости кроет спереди, как выше: различия пака видны в основном на поверхности и террейне сквозь вуаль.
6. **Границы и даль:** без скачков волн/узоров на переходах чанков / origin; без двойного тумана и белой дымки вдали.
7. **Производительность:** тяжёлые по hash/тригонометрии/`pow` на фрагмент эффекты — по минимуму. Добавляйте детали постепенно и сравнивайте FPS.

### Известные ограничения как premises

- Паки ограничены хуками террейна / жидкостей — небо, сущности и UI тем же кодом не обрабатываются.
- Нет входов, чтобы добавить карты теней, screen-space-отражения, рефракцию, блум и т.д. (глубина сцены разблокирована только для жидкостей как `bloxdOpaqueBehind()`. См. [часть VIII](08-apiv2.md)).
- `bloxdTime()` — время анимации без гарантированной связи с днём/ночью игры.
- При нулевом `bloxdSunDirection()` истинное направление луны неизвестно, не «лунная физика» а приближение настроения. Направленный лунный свет строится из `-bloxdSunDirection()` (лишь миры с циклом день/ночь. [Часть VII](07-internals.md) R-A).
- `s.position` / `l.position` — локальные координаты: прибавляйте `bloxdOriginOffset()` для эффектов, зависящих от мира. Для внутриблочных локальных узоров локальные координаты — осознанный инструмент.

## 22. Комбинирование с другими паками, когда один шейдер упёрся в предел

Так как паки не могут добавлять или сэмплить текстуры, не пытайтесь решить мелкие рельефы материалов или картинки неба одними шейдерами. Публичный репозиторий текстурных паков для Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) ведёт текстуры, скайбоксы, модели и т.д. другим путём. Это не официальная спецификация API шейдер-паков — пример ресурсов другой системы, используйте как справку.

Для справки: в разобранном случае «cinematic shader»-раздач сообщества содержимым оказались текстурные паки (текстуры 128x128 без `pack.json` / `.wgsl`). Большая часть вида «шейдер с тенями» — ухищрения на стороне текстур; реалистично комбинировать подход «свет и тень разделяем шейдер-паком» (R9.12) с дополнением на стороне текстур.

На практике **свет и цвет крутите шейдерами, а материалы и небо закрывайте парным ресурс-паком**. Но со-использование и порядок загрузки сверяйте с реализацией игры и настройками.

У текстурных паков тоже есть спецификация (справочно): лимит размера — 25MB по длине JSON-строки после base64-преобразования; base64 раздувает PNG на +33%, так что практический потолок суммы исходных изображений — ~18-19MB. CSS обрабатывается упрощённым разбором через регулярные выражения — без вложенности и комментариев.

## 23. Подводная реальность с шейдер-паками

Подводные виды состоят из 3 слоёв:

| Слой | Содержимое | Управляется из паков? |
|---|---|---|
| ① Рендер террейна/жидкости | Обрабатывается хуками. Light-хуки под водой вызываются штатно | Да (работает «под вуалью») |
| ② Вуаль definition-жидкости | Эмиссивный фулскрин-квад из definition-цвета/альфы жидкостного блока камеры, рисуемый вне пайплайнов хуков (самым передним). Игровая настройка `cameraTint` побеждает, если задана | Нет (ни цвет, ни плотность не меняются) |
| ③ cameraTint | Настройка игры | Нет |

Практические пункты: паки продолжают работать под водой / вуаль не снять / под водой не разветвиться (fogStart / fogEnd / fogColour под водой не меняются: fogVisibility её тоже не детектирует).

[← Предыдущая часть](05-troubleshooting.md)·[Вернуться к руководству](README.md)·[Следующая часть →](07-internals.md)

[← Предыдущая часть](06-implementation.md)·[Вернуться к руководству](README.md)·[Следующая часть →](08-apiv2.md)

# Часть VII: Приложение по внутрянке

> Текущая игра требует `apiVersion: 4` с 2026-10-26 и отклоняет паки v1/v2/v3 при загрузке — приведённое ниже написано по спецификации v2. Перед распространением см. [часть IX](09-apiv3.md) и [часть X](10-apiv4.md) для миграции.

Дополнительные спеки, найденные анализом реализации движка. Всё восстановлено напрямую из JavaScript актуального продакшн-билда.

## 24. Идентичность солнца и луны

Источник `bloxdSunDirection()` — буфер солнечного направления, перезаписываемый лишь при смене типа скайбокса: критерий не «есть ли в небе солнце», а **«скайбокс ли земного типа»**.

| Скайбокс | `bloxdSunDirection()` |
|---|---|
| `default` (процедурное небо) | Ненулевой (дефолты ниже) |
| `gloomy` / `interstellar` / `space_*` (куб-текстуры) | **Всегда (0,0,0)** |

**Луна всегда `-bloxdSunDirection()`** (движок считает позицию луны точной противоположностью солнца). Ночь судится по высоте солнца — луна наверху, когда `bloxdSunDirection().y < 0` (солнце под горизонтом). Но в дефолтных мирах солнце статично, и луна тоже — движущуюся луну видят лишь миры с циклом день/ночь.

Дефолтное солнечное направление около `(-0.56, 0.81, -0.18)` (единичный вектор из inclination = −0.2 / azimuth = 0.55, статичен). Практический референс для предсказания направлений бликов при тестах дистрибутивных паков.

Циклы день/ночь не встроены в движок — inclination статическое число, которое миры с подвижным днём обновляют на стороне игры. `bloxdSunDirection()` следует каждому обновлению.

Направленные огни террейна — лишь 2 лампы, созданные при старте сцены, с **фиксированными направлением и интенсивностью, без смены день/ночь**. Коротко: **ни один фактор яркости террейна не зависит от времени. «Виды» день/ночь идут лишь от скайбокса и bloxdSunDirection()**, так что паки, затемняющие ночью, должны сами оценивать полосу времени из bloxdSunDirection() (техника `sunPresent` из §19).

### R-A. Направленный лунный свет — moonDir = −bloxdSunDirection()

Добавляет бело-голубой Ламберт и слабый спекуляр, лишь пока луна наверху. `moonUp` в дефолтных статично-солнечных мирах равен 0: там ничего не происходит — **лунный свет, срабатывающий лишь в мирах с циклом день/ночь, а значит безопасный**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // луна всегда точно напротив солнца; дневной авто-офф через moonDir.y < 0
    let moonDir = -bloxdSunDirection();
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(bloxdEyePosition() - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. Внутрянка тумана

Расчёт тумана всегда LINEAR-режим (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), при `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = настройка тумана; лишь D = 0 особенный с fogEnd = 5). **Градиентная полоса лишь 32 блока**, и `l.fogVisibility` — меньше «дымка по дистанции», а **нормированная дистанция до края загруженного мира**. Варьируется от игрока с дистанцией загрузки: дистанционные эффекты пусть сами считают `distance(l.position, bloxdEyePosition())` (рецепт R-B). (Замечание v3: функция тумана в рендерере на самом деле реализует **четыре** режима — выключен, экспоненциальный, экспоненциальный в квадрате, линейный; поставляемые игры используют линейный режим. Восстановленный исходный код и обоснование устойчивости — в [части IX](09-apiv3.md) §50.)

- Дефолтный цвет тумана — `rgb(183, 191, 195)` (бледный сине-серый). Создатели миров меняют его через `fogColourOverride` (hex). При режиме тумана 0 (NONE) **fogColour приходит чёрным** (`fogColour = select(vec3f(0.0), uniforms.vFogColor, ...)`). Стандартная форма `mix(l.fogColour, col, l.fogVisibility)` безопасна: при fogVisibility 1 цвет тумана не используется. На стороне скриптового API есть и другие опции: `fogChunkDistanceOverride` и `fogOnSkybox` — кастомные игры могут отдельно настроить дистанцию тумана (значение, соответствующее D) и применение тумана к скайбоксу. По умолчанию скайбокс туманом не затрагивается (скайбокс окрашивается цветом тумана только в играх с включённым `fogOnSkybox`).

Выставление `showFog` в false отгоняет туман на 3200–3232 блоков, фактически выключая (`fogVisibility ≈ 1` продолжает приходить).

### R-B. Полоса края загрузки — fogVisibility как «край мира»

Тихо холодит лишь 32-блочную полосу края загрузки, чтобы заретушировать конец мира (или подчеркнуть как эффект). Без самопосчитанной дистанции: сама следует настройкам дистанции загрузки игрока.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = внутри (запас до края), 0 = вот-вот выход за край
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. Внутрянка blockLight / heldLight

- `blockLight` — **цветной свет** с RGB-каналами. Для каждого светящегося блока определён цвет свечения `[R, G, B]` (0–15), который и становится цветом света (обычный факел = тёплый белый (14,14,12) / лава = оранжевый (14,8,2) / маяк = циан (5,14,14) / белый факел = (15,15,15) и т.д.). На уровне вершин всё приходит в одном float-атрибуте, упакованном в 4 ниббла r / g / b / sky. Внутри light-хука, обрабатывая 3 канала по отдельности, можно делать цветной локальный свет — именно это стоит за поведением «оранжевых факелов» (рецепт R9.1).

При декодировании `aPackedLightLevels` движок кладёт на каждый канал **пол в 35% ярчайшего RGB-канала**. Напр. «чисто красный свет» в вершинах поднимается до (1.00, 0.35, 0) до интерполяции и лифта. Оранжевый факелов, выглядящий «розовато-белым, а не красным», — отсюда: насыщенность тёплых факелов (R9.1) крутите против этого дефолта.
- Композиция света — не сумма. Движок внутри берёт **max** блочного света с полом 35% и небесного света `mix(ambient-цвет, sky-цвет, skyLight)`, а поверх кладёт max ручного света (после ambient-буста). Значения каналов в этой композиции — **после лифта**: движок собирает её из тех же поднятых уровней света, что приходят во входы хуков (`terrainLightLevels` после кривой лифта), и в v2, и в v3. Поэтому `blockLight` и `skyLight` не гасят друг друга: вклад более тёмного отбрасывается — даже если ослабить небесный свет, места, где доминирует блочный свет, почти не темнеют. Рецепты экспозиции и затухания проектируйте с оглядкой на эту структуру (защита локального света в [части VI](06-implementation.md) §19 — компенсация именно этой структуры).


Ручной свет (`heldLight`) с дальностью по ярчайшему каналу (макс 15 блоков) с препроцессом `dist^0.75`, тем же полом 35%, а `l.heldLight` — значение **до** ambient-буста. Затухание конуса, восстановленное из светового модуля движка: угловое ослабление луча — `1 − 0.5 × (smoothstep(0.12, 0.65, t) + smoothstep(0.62, 0.95, t))`, где `t` — нормированный угол от оси конуса (0 = центр, 1 = край); дальность — `(rangeOverride > 0 ? rangeOverride : ярчайший канал) × затухание конуса`, где `rangeOverride` берётся из alpha цвета ручного света; внутри дальности override ослабляет по `(range − dist) / range`, а дефолт вычитает (препроцессированную) дистанцию покомпонентно; затем идут пол 35%, деление на 15, кривая лифта и, наконец, ambient-буст. Кастомные предметы могут фиксировать `spotlightRange` и угол конуса — режим «луч, пока держишь», чей конус следует за камерой. Паки узнать направление луча не могут.

Кастомные блоки могут нести `skyLightEmission` (0–15), который **инжектит в сам канал skyLight, отдельно от BFS blockLight**. Паки в духе R9.12, судящие солнце/тень по порогу skyLight, могут мазать в мирах с искусственно поднятым skyLight. Дистрибутивные паки судят надёжнее в связке с blockLight.

## 27. Детали пайплайна

- **Surface-хуки идут «до» alphaTest**: `out.alpha` кормит тест отброса напрямую. Cutout-материалы (трава, листья) позволяют эффекты растворения типа dither (рецепт R-C). В жидкостях (смешивание) `out.alpha` — настоящая прозрачность (рецепт R-D). На обычном непрозрачном террейне эффекта нет — не перепутайте
- **Содержимое `l.ambient`**: `material.ambient × sceneAmbient`, разное по материалам. Сценовая сторона привязана к графической настройке «Ambient Lighting Intensity» (дефолт 0.5) — никогда не программируйте фиксированные дефолты
- **Сценовый направленный свет — из двух источников**: ламбертова сумма главного (направление из позиции солнца в настройках неба, интенсивность 1.0) и заполняющего (направление `[-0.5, -1, -1]`, интенсивность 0.35) приходит как `l.directional`. Заполняющий направлен вниз, так что верхние грани не трогает, но выцепляет обращённые вниз грани (потолки пещер и т.п.). Террейн учитывает только лампы, добавленные через `_initScene`; лампы, добавленные в сцену после запуска, террейном и блочными моделями игнорируются (есть официальное предупреждение)
- **`bloxdTime()` — реально `performance.now()`**: `time() { return performance.now() / 1e3 % 3600 }` — аптайм браузера, завёрнутый на 1 час. Без связи с днём/ночью игры и прошедшим временем мира. Для анимации, синхронной с игровыми часами, оценивайте время по азимуту `bloxdSunDirection()` в мирах с циклом день/ночь
- **Функции заголовка — алиасы 4 слотов одного 64-байтного uniform (`@group(3) @binding(0)`)**: `bloxdTime()` / `bloxdOriginOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` соответствуют чтению слотов time / originOffset / sunDirection / eyePosition (по 16B, little-endian); `bloxdOriginOffset()` — зарезервированный слот, туда всегда приходит `[0, 0, 0]`. Пак не может перезаписывать этот uniform, а поскольку WGSL пака и движка склеиваются в один модуль, объявить тот же group/binding самостоятельно тоже нельзя. (В v3 два слота переименованы — `seconds` / `renderOffset`, функции называются `bloxdSeconds()` / `bloxdRenderOffset()` — и добавлена текстура глубины сцены на `@group(3) @binding(1)`; см. [часть IX](09-apiv3.md) §41 и §51.)
- **Вершинные данные готовит мешер (Web Worker)**: геометрия блоков складывается в интерливинг по 28 байт на вершину (32 при атласе): позиция = float32×3 / нормаль = 4×8bit знаковых / цвет = 4×8bit unorm (`s.colour` — tint × AO, запечённые мешером в 8 бит; разделить и восстановить в паке принципиально нельзя) / UV = float32×2 / atlasIndex = float32. Уровни света едут отдельным 4-байтным вершинным буфером ([часть VII](07-internals.md) §26, [часть II](02-api.md) §11). Вершины рисуются instancing'ом по чанкам
- Мелкие шахматки на границах чанков при загрузке — чанк-фейд screen-space Bayer 4×4 dither движка, а не баги пака (можно отключить графической настройкой `chunkFadeIn`)
- **`mod` — зарезервированное слово**: отклоняется с `pack.wgsl:3 'mod' is a reserved word in WGSL.` Остатки пишите оператором `%`

### R-C. Bayer-dither растворение — out.alpha управляет discard

Воспроизводит **ту же таблицу Bayer 4×4**, что движок использует в чанк-фейдах, растворяя cutout'ы снизу блоков. discard срабатывает в alphaTest-материалах (трава, листья); в жидкостях это прозрачность смешивания.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod зарезервирован: используйте оператор %
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // растворяется снизу блоков; больший dissolve остаётся
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. Подводный fade у камеры — alpha жидкости держит обзор

`out.alpha` жидкостного хука кормит смешивание напрямую. Расчищает лишь поверхность под камерой, чтобы держать обзор при нырянии и надводной камере.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 блока от полной прозрачности к норме
    #endif
    return out;
}
```

## 28. Что меняет видимые значения пака — чеклист тестов

Один и тот же пак рендерится по-разному в зависимости от **мира и настроек игрока**. Перед распространением проверьте хотя бы эти 3 окружения:

1. **Обычный мир** (дефолтный скайбокс, без оверрайдов) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, дефолтные цвета
2. **Мир со space-скайбоксом** — bloxdSunDirection() = 0. Вид ветки `sunPresent`
3. **Кастомный мир с `visionMinLightColour` / `skyLightColourOverride`** — поднятые темноты и цвета

Главные источники вариации: `lightingOverride` (принудительный свет) / `skyLightColourOverride`, `ambientLightColourOverride` (hex-замены) / `visionMinLightColour` (минимальный цвет видимости; реализация — покомпонентный max в обе стороны на `uSkyLightColour` и `uAmbientLightColour`; использует Night Vision. Паки «кромешная пещера» темнее задуманного не станут — пол приподнимает и сам цвет неба) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (есть ли bloxdSunDirection()). `uSkyLightColour` дефолт = (1,1,1) белый, `uAmbientLightColour` дефолт = (0.25,0.25,0.30). Сценовая сторона `l.ambient` = графическая настройка «Ambient Lighting Intensity» (дефолт 0.5). `l.fogVisibility` следует настройкам тумана/дистанции чанков игрока. Кроме того, на вариации влияют `cameraTint` (RGBA-тинт всего экрана) и `proximityFadeDistance` / `proximityFadeMinOpacity` (подсвечка fade сущностей у камеры), причём `cameraTint` — финальный слой поверх вывода пака. Многие из них настраиваются и через скриптовый API (`serverOption`) и могут обновляться прямо во время игры.

## 29. Средства отладки

- URL-параметр `?renderer=lite` — форсирует Lite (WebGPU) рендер (`webgl2` / `babylon` тоже годятся; `babylon` — старое имя-алиас webgl2). Приоритет: URL-параметр > `bloxdRenderer` в localStorage > экран настроек > дефолт (webgl2). Невалидные значения игнорируются с предупреждением. Если override остался в URL или localStorage, на этапах, требующих WebGPU (lite), может появиться «needs the new WebGPU renderer, so remove the renderer override...» ([часть V](05-troubleshooting.md) §17)
- URL-параметр `?vconsole` — экранная консоль (VConsole). Удобно для проверки на реальном мобильном
- URL-параметр `?drawcalls=1` — добавляет отладочную панель статистики отрисовки. Через выбор игрового объекта в отладочной консоли или `drawCalls()` / `why()` / `configureDrawCallWatching()` можно поймать избыточные перерисовки (overdraw) крупных механик, не относящихся к паку, и достижение лимита ~65 тыс. вершин на draw call — и отделить причину нехватки производительности
- В консоли видны `noa-engine v0.33.0` и `Renderer: lite from <источник>` — проверьте их первым делом, чтобы не ошибиться с трактом рендера
- WebGPU-рендер лочится «форсированно ВКЛ», пока применён пак. Настройка «Disable Block Texture Atlas» тоже лочится (атлас остаётся ВКЛ), а без WebGPU пак вообще не применяется. Основание писать «нужен WebGPU-браузер» на страницах распространения
- Блочные текстуры — 2D array texture (`texture_2d_array`), сэмплер террейна — nearest и repeat. Мешер к тому же склеивает грани с совпадающими материалом/AO/светом в один полигон (**greedy meshing**), поэтому UV вершин на слитых гранях могут выходить за ширину тайла (инсет по краю 0.0015). Повторяемость обеспечивает аппаратный repeat-адресинг, так что слитые грани выглядят бесшовно. Но если наслаивать процедурные детали по `vUV`, на границах слитых граней возможны разрывы — проектируйте от мировой позиции (`s.position` + `bloxdOriginOffset()`), так надёжнее
- Рантайм-перепроверка при каждом входе (`checkCompilation`) компилирует настоящие террейн-материалы в браузерном WebGPU (строже статической проверки настроек). Паки, падающие здесь, исключаются из этой игры

## 30. Режимы применения по играм (`shaderPackPolicy`)

Здесь фиксируется смысл пары `allow / strict` из §7 на уровне отдельных игр. Только игры, в чьём определении явно стоит `shaderPackPolicy: "allow"`, работают в полном режиме (vertex-хуки, `discard`, `alpha` террейна); игры без указания (или с любым значением, кроме allow) — strict: определяется `BLOXD_STRICT`, охраняемый код автоматически отключается. Со стороны пака это выбрать нельзя, поэтому знание о том, какие игры что исполняют, — предпосылка распространения.

- Опорный билд: `szby6g.main.94a7596c.js` (прод-деплой на 2026-10-17). Статический разбор всех 111 определений игр даёт **26 allow-записей (12 игр) / 85 strict-записей**. Те же 12 allow-литералов в тех же 12 играх были повторно подтверждены без изменений на продакшн-бандле v3 (`3ymzdd`, 2026-10-20) — список ниже переносится в v3 дословно.
- Над `shaderPackPolicy` стоит ещё один рубеж — гейт на стороне дистрибуции (`canUseShaderPacks` и под.): в сборках для внешних порталов (напр., версия Coolmath Games) сам механизм шейдер-паков может быть выключен ещё до проверки `shaderPackPolicy`. Разбор ниже по allow / strict основан на анализе веб-версии bloxd.io.
- «allow» объявляется в 12 местах: 8 прямых записей в определениях игр и 4 базовые переменные (`tb` / `kz` / `cb` / `Fb`); вариации наследуют через спред (`{...tb,...}`). Перезаписей на уровне отдельной вариации (обратная схема «родитель allow — ребёнок strict») сейчас нет.

12 allow-игр (всего 26 записей):

- **Test Gym** — базовая + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (всего 11)
- **Doodle Cube** — базовая + Solos / Duos (3)
- **Rocket Obby** — базовая + Sheep / January (3)
- **9 одиночных игр**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

Самые обманчивые моменты на стороне strict:

- **Superflat Creative (classic_creativeFlat) — strict.** В названии есть «Creative», но в семействе classic allow имеет только обычный Creative (`classic_creative`). Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns и т.д. — все strict
- **Custom Games (customGames) — strict.** В созданных пользователем кастомных играх эффекты vertex-хуков не срабатывают. Для проверки надёжно Test Gym
- Основные PvP-/серверные игры вроде bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) — все strict

При этом в strict-играх пак загружается и компилируется, а рецепты фрагментной стороны вроде surface / light работают как обычно. Ограничения касаются vertex-хуков (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard` и `alpha` террейна (у жидкостей она есть всегда).

Этот список отражает статический анализ указанного билда; обновления движка могут менять распределение allow/strict. При выходе новых версий перепроверяйте.

[← Предыдущая часть](06-implementation.md)·[Вернуться к руководству](README.md)·[Следующая часть →](08-apiv2.md)

[← Предыдущая часть](07-internals.md)·[Вернуться к руководству](README.md)

# Часть VIII: руководство по миграции на API Version 2

> Текущая игра требует `apiVersion: 4` с 2026-10-26 и отклоняет паки v1/v2/v3 при загрузке — приведённое ниже написано по спецификации v2. Перед распространением см. [часть IX](09-apiv3.md) и [часть X](10-apiv4.md) для миграции.

Целевая сборка: `6qxffk.main.5912a15f.js` (продакшн-деплой на 2026-10-16). Части I–VII этого руководства уже переписаны на базу v2; эта часть VIII собирает миграционные моменты с v1 и новые возможности v2. Примеры кода новых возможностей проходят валидацию 8/8 вариантов на компиляторе v2 и проверку браузерным WGSL-компилятором (Tint) (§38), а v2-конверсия существующих рецептов — механическая подстановка идентификаторов, поэтому перед распространением обязательно проверяйте живой компиляцией в игре.

## 31. Судьба v1-паков (сначала вывод)

Игра требует, чтобы `apiVersion` манифеста **строго совпадал с 2**. Загрузка v1-пака отклоняется с `This pack is for shader pack API version 1. Bloxd supports version 2.` (ключ i18n `shaderPack:loadWrongApiVersion`). **Параллельной поддержки v1/v2 нет**. Движок также перепроверяет у сохранённых паков `validation.headerVersion` (хеш всего текста заголовка), так что механизм автопометки сохранённых паков «нужна перепроверка» при обновлениях движка — тот же, что в v1.

## 32. Полное переименование идентификаторов (таблица соответствия)

В v2 подчёркивания унифицированы в camelCase. **Старые имена полностью неиспользуемы.**

| v1 | v2 |
|---|---|
| `bloxd_terrain_vertex` | `bloxdTerrainVertex` |
| `bloxd_terrain_surface` | `bloxdTerrainSurface` |
| `bloxd_terrain_light` | `bloxdTerrainLight` |
| `bloxd_liquid_vertex` | `bloxdLiquidVertex` |
| `bloxd_liquid_surface` | `bloxdLiquidSurface` |
| `bloxd_liquid_light` | `bloxdLiquidLight` |
| `bloxd_defaultVertex` | `bloxdDefaultVertex` |
| `bloxd_defaultSurface` | `bloxdDefaultSurface` |
| `bloxd_defaultLight` | `bloxdDefaultLight` |
| `bloxd_VertexIn` | `BloxdVertexIn` |
| `bloxd_Vertex` | `BloxdVertex` |
| `bloxd_SurfaceIn` | `BloxdSurfaceIn` |
| `bloxd_Surface` | `BloxdSurface` |
| `bloxd_LightIn` | `BloxdLightIn` |
| `bloxd_Light` | `BloxdLight` |
| `bloxd_packInputs` (внутренний uniform) | `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) |

Виды хуков (vertex / surface / light × terrain / liquid, всего 6) и формат `pack.json` (`apiVersion` / `name` / `author`) не изменились. Лимиты загрузчика тоже неизменны (zip 32MB / 1024 записи / 256 файлов `.wgsl` / 256KB суммарно / 64KB манифест).

## 33. Куда переехали удалённые поля

В v1 `time` / `eyePosition` / `sunDirection` / `originOffset` были полями структур. В v2 **эти поля удалены; вместо них — функции заголовка, читающие uniform движка (`bloxdPackInputs`)**. Поскольку функции читают uniform напрямую, **их можно вызывать из функций уровня модуля вне хуков и из vertex-хуков**.

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` для перевода в мировые координаты | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

## 34. Новое ①: `blockId` (шейдинг по блокам)

Все три структуры `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` получили `blockId: u32`. Это **ID владеющего блока** (0–65535), единый по всей грани (передаётся с `@interpolate(flat)`). Применяется для идентификации типа блока независимо от цвета текстуры. Но таблица соответствия ID и типов блоков — внутри движка и из паков не видна, так что **какой ID какому блоку — измеряется в мире или берётся из справочника ниже**. Внутри ID гравируется в 16 бит: младшие 8 бит — α цвета вершины, старшие 8 бит — w нормали; лимит 65535 — следствие этой ширины канала. Сама система blockId активируется только когда есть активный шейдер-пак (без пака провод ведёт в паддинг, но на уровне структур из части II эта разница ненаблюдаема).

**Справочник**: автор публикует список игровых записей в [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (`entries.json`: таблица id ↔ имя блока; варианты поворота/meta вроде `Furnace|meta|rot2` перечислены отдельными ID). Соответствия могут меняться с обновлениями игры — окончательно проверяйте в реальной игре.

Часто используемые блоки (по entries.json на 2026-10-18; только низкие id террейна):

| ID | Блок | ID | Блок |
|---|---|---|---|
| 0 | Air | 15 | Maple Wood Planks |
| 1 | Unloaded | 28 | Stone |
| 2 | Dirt | 29 | Messy Stone |
| 3 | Messy Dirt | 31 | Smooth Stone |
| 4 | Grass Block | 126 | Water |
| 5 | Sand | 128 | Bricks |
| 6 | Clay | 139 | Ice |
| 7 | Gravel | 147 | Bedrock |
| 8 | Snow | 149 | Cactus |
| 9 | Maple Log | 1491 | Lava |

В entries.json есть и неблочные записи (инструменты и т.п.), но до хуков террейна/жидкостей дотягиваются только блочные id.

### R-F. Тинт по типу блока через blockId

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // напр.: каменные id (старший битовый паттерн) — в холодный
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

### R-G. blockId на практике — пак отображения битовых плоскостей

Рецепт для выяснения id блоков, которых нет в таблице соответствий, прямо в мире. Меняйте `plane` в начале как `0, 1, 2, …` и читайте цвет грани интересующего блока.

```wgsl
const plane: u32 = 0u;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let d = (s.blockId >> (plane * 3u)) & 7u;
    var palette = array<vec3f, 8>(
        vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 1.0, 0.0),
        vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 1.0));
    out.colour = palette[d];
    return out;
}
```

Цвет грани показывает 3 бита blockId как есть в RGB (чёрный = 0 / красный = 1 / зелёный = 2 / жёлтый = 3 / синий = 4 / маджента = 5 / циан = 6 / белый = 7). Одно наблюдение даёт одну восьмеричную цифру. Если по p0 → p3 вышло 3, 2, 7, 2, то id = восьмеричное 2723 = 1491 (Lava). Для низких id террейна хватает двух наблюдений p0 и p1. Состоит только из surface-хуков, так что работает и в strict-титулах.

### R-H. Качание только листвы — ограничение vertex-хука по blockId

Рецепт ветра R7 ([часть III](03-recipes.md)) волнует весь террейн, но vertex-хук тоже читает `blockId`, поэтому можно ограничить цель только блоками листвы. Список id и массив для WGSL (замер на 2026-10-18; 22 вида: Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / фруктовые варианты / Autumn Aspen):

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// vertex-хуки в strict-титулах автоматически неактивны (§36)
#ifndef BLOXD_STRICT

fn sp_isLeaf(id: u32) -> bool {
    for (var i = 0u; i < 22u; i++) {
        if (LEAF_IDS[i] == id) { return true; }
    }
    return false;
}

fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    if (sp_isLeaf(v.blockId)) {
        let wp   = bloxdWorldPosition(v.position);
        let t    = bloxdTime();
        // смещение — гладкая функция мировой позиции: общие вершины, указывающие
        // на одну точку мира, двигаются одинаково, и грани не рвутся (R7 из [части III](03-recipes.md) — тот же принцип)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- Список id растёт с обновлениями движка (в замеренном обновлении добавилось 50 блоков). Для длительного использования проверяйте добавления через [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) или R-G и дополняйте массив
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) — некусаемые коврики-листья на земле. При качании выглядит, будто они отрываются от земли, так что имеет смысл исключить их из массива
- В strict-титулах vertex-хук отключается целиком, но с гардом выше «просто замирает качание», а эффекты фрагментной стороны продолжают работать

## 35. Новое ②: `BLOXD_SCENE_DEPTH` и `bloxdOpaqueBehind()` (главное)

Доступ к глубине, структурно невозможный в v1, разблокирован **только для liquid-программ**. Цвета нет, но **геометрия — дистанция и позиция непрозрачной грани позади — доступна**. Типовое применение — расчёт цвета поглощения по измеренной толщине воды.

Правила использования:

| Использование | Результат |
|---|---|
| Вызов без guard'а в `bloxdLiquidSurface` / `bloxdLiquidLight` | OK (в жидкостных вариантах всегда определён) |
| Вызов без guard'а в `bloxdTerrainSurface` | ERROR. Оберните в `#ifdef BLOXD_SCENE_DEPTH` |
| Вызов в vertex-хуках | ERROR (только хуки surface / light) |

Чтобы использовать глубину и в хуках террейна, оборачивайте в `#ifdef BLOXD_SCENE_DEPTH` (хуки террейна переиспользуются liquid-программами, так что глубина жива только на жидкостной стороне).

### R-E. Поглощение по толщине воды (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // длина столба воды = отсюда до непрозрачной грани позади
        let thickness = distance(behind.position, surface.position);
        // поглощение Beer-Lambert: красный гаснет быстро, синий идёт далеко
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // позади небо = тянуть к глубокому синему
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

Применения: поглощение/рассеяние по толщине, проекция ряби-«каустики» из мировых координат дна через `behind.position`, небесное отражение на воде с различением неба и затенения через `found=false`, ступенчатая муть по глубине. Если построение пайплайна копирования глубины не удалось — безопасная деградация к «позади ничего». Готовность depth-текстуры фиксируется при создании рендерера страницы по признаку «читает ли активный пак глубину», поэтому **при использовании паков, читающих глубину, обязательно перезагружайте страницу**. Если глубина запрошена без перезагрузки с активным паком, в консоли единожды появится предупреждение `…reads scene depth on a page that didn't turn it on`, глубина подменяется текстурой 1×1, и `bloxdOpaqueBehind()` всегда возвращает `found = false`.

## 36. Прочие изменения v2

- **Fallback хуков**: без `bloxdLiquidXxx` liquid-программы падают на хуки террейна. **Пак с одними хуками террейна действует и на воду как есть**. При нежелательности явно определяйте хуки жидкостной стороны.
- **Guard'ы полей `BLOXD_LIGHTING` больше не нужны**: `blockLight` и др. есть во всех вариантах, в unlit лежат дефолты (0 / 1 / белый / 0). Используйте `#ifdef BLOXD_LIGHTING` лишь для проверки света. Сохранение старых guard'ов ничего не меняет.
- **Условие определённости `BLOXD_ALPHA` изменилось**: определён в не-strict вариантах террейна и во всех жидкостных вариантах, не определён в strict × террейн. Пишете alpha в хуках террейна — guard оставляйте.
- **Прямое конструирование структур запрещено**: вызовы конструкторов вроде `BloxdLight(...)` отклоняются статической проверкой. Всегда меняйте от `bloxdDefault*` или используйте копию входа.
- **`let _ =` становится `_ =`**: отбрасывающее присваивание WGSL `_ = f();` валидно, а `let _ = f();` отклоняется.
- **offInStrict**: определение vertex-хука или достижимый из surface / light-хуков `discard` вместо ошибки автодеактивируют весь пак в strict-играх (в UI настроек `shaderPack:offInStrict`; в allow-играх работает). Оборачивайте vertex-хуки и `discard` в `#ifndef BLOXD_STRICT`.
- **Расширение тумана**: режимы расчёта LINEAR / EXP / EXP2 реализованы, но настройки игры по-прежнему всегда LINEAR, так что старые спеки тумана работают как есть. Семантика `fogColour` теперь официально задокументирована (чёрный только в полностью бестуманных сценах).
- **Без изменений**: lift-кривая, 35%-пол каналов, затухание heldLight (`pow(lightDist, 0.75)`) и ambient-буст, спека направлений солнца/луны, дефолтный цвет тумана, цикл time (3600 с), направленные света (макс. 4), только Lite (WebGPU), механизм сохранений (IndexedDB), зарезервированность `mod`.

## 37. Чек-лист миграции v1 → v2

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **Идентификаторы**: заменить все по таблице §32 (имена хуков, имена структур, default-функции)
3. **Перенос удалённых полей**: в функции заголовка по таблице §33 (`s.time` → `bloxdTime()` и т.д.)
4. **Переименовать `fogFactor` → `fogVisibility`**
5. **Убрать прямое конструирование структур**
6. **Исправить `let _ =` на `_ =`**
7. **Обернуть vertex-хуки и discard в `#ifndef BLOXD_STRICT`**
8. **Проверить, что вода тоже чувствует эффекты хуков террейна**; при нежелательности явно определить liquid-хуки
9. (Опционально) Вести туман самим от `litColour` / добавить поглощение по толщине воды через `bloxdOpaqueBehind()` / поблочную стилизацию через `blockId`
10. **Проверяйте и вторую ступень (браузерный Tint)** — особенно скобки в выражениях с `^` `&` `|` `<<` `>>`. Существует код, проходящий статическую проверку, но отклоняемый браузером (§38)

## 38. Вторая ступень проверки — браузерный WGSL-компилятор строже встроенного парсера

Проверка паков в игре — **двухступенчатая**. Первая ступень — статическая проверка (встроенный в движок JS-парсер: сигнатуры хуков, запрещённый синтаксис, использование sceneDepth и другие пак-специфичные правила), а вторая ступень — браузерная проверка (приложенный к результату компиляции стаб компилируется настоящей реализацией WebGPU, а ошибки показываются с обратным маппингом на строки исходных файлов пака; стадия фразы UI «Saved, but it won't run until you fix these errors»). Суффиксы в конце сообщений об ошибках вроде `(only in terrain)` — это «вид program варианта, в котором возникла ошибка».

Встроенный парсер не реализует правила связывания (Binding) операторов WGSL, поэтому **проходящий статическую проверку код может отклоняться браузером**. Чаще всего страдают канонические целочисленные хеш-паттерны:

| Операторы | Следствие |
|---|---|
| `<<` `>>` | Прямо связываются лишь до унарного уровня. `a + b << c` — ошибка |
| `&` `^` `\|` | Прямо связываются лишь до унарного уровня. `a * b ^ c` — ошибка |
| `&&` `\|\|` | Смешивать нельзя. `a && b \|\| c` — ошибка |

### Как ставить скобки (NG / OK)

```wgsl
// NG — статическую проверку проходит, но браузер (Tint) отклоняет:
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — каждое умножение в скобки (цепочка одного оператора A ^ B ^ C сама по себе левоассоциативна и легальна)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

Опубликованный в руководстве код этого паттерна не содержит (смешение `+`/`*` в `pack_hash3` и `h ^ (h >> 16u)` уже в скобках, т.е. соответствуют спеке). Написанный пак прогоняйте через обе ступени — первую и вторую.

## 39. О независимо похожих материалах

Существует community-материал почти того же содержания: [Шейдер GlitchHunterCoder/Bloxd-Essay](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader). Опубликован раньше этого гайда, но **содержание этого гайда — из собственного анализа glm настоящих bundle-файлов Bloxd (набор webpack-чанков), а не копипаст**. Совпадают оба потому, что независимое исследование одной реализации ведёт к тем же выводам.

---

Исследовано: ltf_ahel (исследовано с glm)

[← Предыдущая часть](07-internals.md)·[Вернуться к руководству](README.md)

[← Предыдущая часть](08-apiv2.md)·[Вернуться к руководству](README.md)

# Часть IX: руководство по миграции на API версии 3

> **Заменено 2026-10-26: текущий API — версия 4** — паки v3 отклоняются при загрузке ровно так, как здесь описано для v2. Примените эту часть, *затем* [часть X](10-apiv4.md) (v3 → v4: текстурный API, переименование `fogAlpha`, `bloxdFragmentBlockPosition`, `hit`).

Целевой билд: `3ymzdd.main.fae4743f.js` — **продакшн-билд, живущий с 2026-10-19**. Бандл, который bloxd.io отдаёт в продакшене, байт-в-байт совпадает (проверено по md5 — и основной бандл, и чанки шейдер-паков) с предпродакшн-деплоем, на котором изначально исследовалась эта часть, так что всё здесь применимо к продакшену как есть. Модель пака сохраняет форму v2 (те же поля `pack.json`, те же лимиты загрузчика, та же раскладка uniform).

Части I–VII этого руководства по-прежнему написаны на базе v2. Эта часть, как и [часть VIII](08-apiv2.md), собирает воедино точки миграции v2 → v3 и новые возможности v3. Переход в основном механический (§47), но лишь одно изменение реально меняет поведение — свет по умолчанию теперь ослабляет emission туманом (§43), — и `blockId` целиком заменён на `blockFlags` (§42), поэтому перед распространением всегда проверяйте компиляцией в игре.

Новое в этой редакции: разделы **§49–§54** выходят за рамки миграции и посвящены внутрянке движка, восстановленной из продакшн-билда: тому, как Lite-рендерер на самом деле вызывает ваши хуки; настоящей функции тумана с четырьмя режимами; точной реализации `bloxdOpaqueBehind()`; полному пути доставки `blockFlags` от регистрации блока до вашего хука и конвейеру валидации с измеренным хэшем заголовка. Это самые глубокие публично задокументированные факты о системе паков на сегодня, и они закрывают несколько вопросов, которые другие руководства до сих пор числят открытыми.

## 40. Судьба v2-паков (сначала вывод)

**Обновление 2026-10-19: v3 покинула предпродакшн и теперь её отдаёт живой сайт.** Каждый v2-пак, сохранённый до раскатки — включая все паки, распространявшиеся как v2, — теперь падает в продакшене ровно так, как описано ниже, так что миграция из §47 больше не опциональна ни для кого, кто распространяет паки сегодня.

Сборка требует, чтобы `apiVersion` в манифесте **точно совпадал с 3**, и **параллельной поддержки v2/v3 нет**. v2-пак отклоняется при загрузке сообщениями о «неправильной версии API» (ключи i18n, текст с подстановками):

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>
> `loadNoApiVersion`: "pack.json needs \"apiVersion\": {{version}}."

У сохранённых паков остаётся жизненный цикл v2 ([часть VIII](08-apiv2.md) §31): каждая сборка хэширует свой заголовок движка, обновления движка автоматически помечают сохранённые паки как «нужна перепроверка», а сохранённый пак, чей `apiVersion` отличается от текущей версии, помечается как неработающий (причём статусное сообщение выше указывает на замену), а не выдаёт ошибку.

## 41. pack.json и uniform-буфер (что не меняется)

- Обязательные поля манифеста не изменились: `{ apiVersion, name, author }`.
- Лимиты загрузчика не изменились: 32 МБ zip / 1024 записи / 256 файлов `.wgsl` / 256 КБ кода суммарно / 64 КБ манифеста.
- Блок uniform движка не изменился по форме: `@group(3) @binding(0)`, 64 B, содержит — в порядке объявления — время, смещение рендера, направление солнца и позицию глаз. Раскладка зарегистрирована с `minBindingSize: 64`, а точная раскладка полей — `seconds: f32` @ байт 0, `renderOffset: vec3i` @ 16, `sunDirection: vec3f` @ 32, `eyePosition: vec3f` @ 48. Два внутренних имени полей изменились: `time` → `seconds`, `originOffset` → `renderOffset`. **Байтовая раскладка идентична v2**, и для кода пака ничего не меняется, потому что пакам по-прежнему нельзя называть uniform напрямую (заголовок движка помечает его как предоставляемый движком и read-only, «which packs can't name»); продолжайте работать через функции заголовка `bloxdSeconds()` / `bloxdRenderOffset()`.
- В группе 3 пака появился второй задокументированный ресурс: `@group(3) @binding(1)` — текстура глубины сцены, которую читает `bloxdOpaqueBehind()` (полная реализация в §51). 64-байтный uniform остаётся на binding 0; паки по-прежнему не могут называть ни один из биндингов.

## 42. blockId становится blockFlags: материалы блоков как битовые флаги (главное)

Во всех трёх структурах входов хуков (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`) поле v2 `blockId: u32` **заменено** на `blockFlags: u32`. Текст движка о поле: *"What kind of block this face is: `bloxdBlockFlag*` bits, the same across the face."* Движок теперь сам поставляет данные материала, так что подходы v2 — угадывание материалов по диапазонам числовых id или таблицы id в мире ([часть VIII](08-apiv2.md) §34) — больше не нужны.

Биты выставлены как именованные константы:

```wgsl
// Проверка: (blockFlags & bloxdBlockFlagRock) != 0.
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| Значение | Константа | Смысл (заметки движка, сокращённо) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | Полностью непрозрачный — включая листву и лёд. Не стекло, вода, лава, спавнеры, призрачные и невидимые блоки. |
| 2 | `bloxdBlockFlagEmissive` | Источает блочный свет, как неон, порталы, лампы, лава и маяк. Светящиеся руды считаются, даже если слабо. |
| 4 | `bloxdBlockFlagVegetation` | Листва и трава на травяных блоках (травяные блоки тоже несут dirt). Не кактусы, грибные блоки и сено. |
| 8 | `bloxdBlockFlagDirt` | Dirt и soil, включая травяные блоки. Rocky Dirt — тоже rock. |
| 16 | `bloxdBlockFlagSand` | Песок, красный песок и любой песчаник — который тоже rock. |
| 32 | `bloxdBlockFlagRock` | Камень и его виды, андезит, диорит, гранит, гравий, руды, песчаник, Rocky Dirt, бедрок, обсидиан и магма. |

Блок из нескольких материалов несёт **каждый** подходящий флаг (пример самого движка: песчаник — это песок и камень, поэтому получает оба). Листва — vegetation, но не dirt; травяные блоки — vegetation и dirt одновременно.

Флаги vegetation / dirt / sand / rock назначаются по зарегистрированному **отображаемому имени** блока (opaque / emissive берутся из собственных данных движка о непрозрачности и свечении): имена, оканчивающиеся на `Leaves`, и имя `Grass Block` — vegetation; имена `Dirt` / `Soil` (и каждый `Grass Block`) — dirt; ровно `Sand` и `Red Sand`, а также любое имя, содержащее `Sandstone`, — sand; имена, содержащие `Stone` / `Andesite` / `Diorite` / `Granite` или `Ore`, а также Yellowstone, Gravel, Bedrock, Obsidian, Magma, Rocky Dirt (и песчаник) — rock.

### Точные правила имён (выведите флаги любого блока сами)

Четыре материальных бита вычисляет фиксированный классификатор по зарегистрированному отображаемому имени блока. Сначала отбрасывается суффикс варианта (всё после `|`), поэтому варианты наследуют флаги базового блока. Затем:

| Бит | Правило (вычисляется по имени без суффикса) |
|---|---|
| vegetation | имя **оканчивается на** ` Leaves` или **оканчивается на** ` Grass Block` |
| dirt | имя **ровно** `Dirt`, **оканчивается на** ` Dirt` или ` Soil`, либо **оканчивается на** ` Grass Block` |
| sand | имя **ровно** `Sand` или `Red Sand`, либо **содержит** `Sandstone` |
| rock | имя **ровно** одно из `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt`, **содержит** `Sandstone`, **оканчивается на** ` Ore`, либо содержит `Stone` / `Andesite` / `Diorite` / `Granite` как отдельное слово |

Yellowstone перечислен явно, потому что `Stone` не является отдельным словом внутри `Yellowstone`. Opaque и emissive **не** происходят из имени — они берутся из собственных данных движка о непрозрачности и свечении блочного света, поэтому этими правилами их не вывести.

Источник: классификатор имён движка (модуль 28537, бандл `3ymzdd`); проверено по всем 7 861 именованному блоку, 2026-10-20.

Пример — тинт по материалу блока:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

Влияние на рецепты v2: массив из 22 id листвы из R-H ([часть VIII](08-apiv2.md) §34) сворачивается до `(blockFlags & bloxdBlockFlagVegetation) != 0`. Справочник id ↔ имя блока в [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) остаётся полезным для не-шейдерных задач, но для стилизации материалов больше не нужен поиск по миру.

### Листва без травы (вопрос, который задают все)

`vegetation` сам по себе совпадает с листвой **и** травой на травяных блоках, которые также несут `dirt`. Исключите dirt, чтобы затрагивать только листву — именно это различие прямо прописано в заметках движка к полю:

```wgsl
// Только листва: vegetation без dirt. Травяные блоки — это vegetation И dirt.
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// Только травяные блоки (травяные грани поверхности террейна):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

Проверено по живому реестру (2026-10-20, бандл `3ymzdd`): `vegetation && !dirt` совпадает ровно с 45 регистрациями листвы (22 базовых типа — те же 22, что измерял массив id из R-H в v2); `vegetation && dirt` совпадает ровно с 8 травяными блоками. Исключений ни в одну, ни в другую сторону нет — счётчики реестра на момент той сборки; новые блоки увеличивают числа, не меняя правило. В паре с `vertex.normal` (вверх/вниз) можно выбирать грани, например только верхушки травяных блоков.

## 43. Переименования функций и семантические изменения

| v2 | v3 | Заметки |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | Секунды с момента загрузки страницы (о точности f32 ниже) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | Та же величина: позиция рендера + это = мировая позиция |
| `const bloxdTimeWrap: f32 = 3600` | **удалено** | Задавайте периоды сами на стороне пака |
| `engineColour` (в `BloxdLightIn`) | **удалено** (14 → 13 полей) | Собирайте заново из `litColour` + тумана |
| параметры хуков `v` / `s` / `l` | `vertex` / `surface` / `light` | Написание в шаблоне; сигнатуры не изменились |

- **`bloxdSeconds()`** — секунды с момента загрузки страницы. В f32 в первые 4,5 часа шаг счёта меньше 1 мс, а с 9 до 18 часов — около 4 мс. Заголовок рекомендует идиому `bloxdSeconds() % period`, которая считает от 0 до `period`, а затем начинается заново — чистая замена удалённой константы wrap.
- **`bloxdRenderOffset()`** — целые блоки: «a render position plus this is a world position». Он меняется, пока игрок двигается, поэтому позиции рендера остаются близко к игроку — и потому точными. По всему руководству то, что текст v2 называл noa-локальным смещением, теперь последовательно называется **позицией рендера** / смещением рендера; это та же величина, которую возвращал `bloxdOriginOffset()`.
- **`bloxdTimeWrap` удалена** — пак, заворачивавший время на 3600 с, теперь объявляет свою константу, например `const timeWrap: f32 = 3600.0;`, и использует `% timeWrap`.
- **Семантика света по умолчанию** — дефолт v2 был `engineColour + emission × fogVisibility`; дефолт v3 собирает его как `bloxdApplyFog(litColour + emission, light)` — **emission теперь ослабляется туманом внутри дефолта**, так что итоговый выход целиком проходит через смешивание с туманом. Таблица переноса:

  | Выражение v2 | Перенос v3 |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // перенос v2-чтения `l.engineColour + s.emission * l.fogVisibility` в v3:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **Не изменились по имени и смыслу**: `bloxdEyePosition()`, `bloxdSunDirection()`, `bloxdFaceBlock()`, `bloxdApplyFog()`, `bloxdWorldPosition()`.

## 44. Новые константы заголовка: `bloxdPi` и `bloxdTau`

```wgsl
// Пол-оборота и полный оборот, в радианах.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

Они полезны и в тригонометрии, и тем, что избавляют от хардкода π. Следите за повторным использованием имён: локальная константа пака с тем же именем теперь конфликтует с проверкой заголовка на дубликаты идентификаторов — уберите или переименуйте любое повторное объявление `bloxdPi` / `bloxdTau` в своём коде.

## 45. Шаблон из шести хуков (жидкостные хуки официально показаны)

Поставляемый со сборкой текст пака по умолчанию теперь содержит **все шесть хуков** — terrain / liquid × vertex / surface / light — и каждый возвращает свой дефолт движка. Комментарии движка описывают его так: *"Every hook returns its engine default. Copy a hook and change its output to start a shader pack."*

```wgsl
// Каждый хук возвращает свой дефолт движка. Скопируйте хук и измените
// его выход, чтобы начать шейдер-пак.

// Strict-игры оставляют террейн на месте: без guard'а этот хук отключил бы
// весь шейдер-пак там.
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Вода использует эти. Если удалить, вода использует ваши террейн-хуки.
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

- Комментарии хуков прямо формулируют правила жидкостей: **воде нужен свой набор из трёх хуков; удалите его, и вода снова использует ваши террейн-хуки** (поведение fallback, известное из v2, [часть VIII](08-apiv2.md) §36, теперь прописано в самом шаблоне).
- `bloxdLiquidVertex` находится под тем же guard'ом `#ifndef BLOXD_STRICT`, что и `bloxdTerrainVertex` — без guard'а он отключил бы весь пак в strict-играх так же, как vertex-эффекты террейна.
- В шаблоне теперь используются полные имена параметров `vertex` / `surface` / `light` (шаблон v2 использовал короткие `v` / `s` / `l`). Имена параметров в вашем коде свободны — важны только сигнатуры.

## 46. Матрица вариантов: ось программы и изменения макросов

Варианты генерируются по матрице **strict × lighting × program** — те же 8 комбинаций, что в v2, но terrain / liquid теперь явная ось матрицы. В именах вариантов она записывается как `allow|strict · unlit|lit · terrain|liquid`, а в UI показывается как `terrain` / `liquid`, `strict` / `non-strict`, `lighting on` / `lighting off` (и в сообщениях об ошибках может добавляться «(only in {{variants}})»).

| Макрос | Где определён |
|---|---|
| `BLOXD_STRICT` | strict-варианты (обе программы) |
| `BLOXD_LIGHTING` | варианты с включённым светом (обе программы) |
| `BLOXD_ALPHA` | **все жидкостные варианты** плюс не-strict **террейн**-варианты |
| `BLOXD_SCENE_DEPTH` | **все жидкостные варианты** |

Для авторов меняются две вещи по сравнению с правилами v2 ([часть VIII](08-apiv2.md) §36):

- **`BLOXD_ALPHA` не изменился по сравнению с v2.** Генератор вариантов содержит буквальную строку `"liquid"!==program&&strict||push("BLOXD_ALPHA")` — приоритет операторов JS делает *(террейн **и** strict)* единственным случаем, когда push пропускается, поэтому макрос определён в **каждом жидкостном варианте (strict или не-strict) и в не-strict террейне**; его опускает только strict-террейн. Код `#ifdef BLOXD_ALPHA` на жидкостной стороне компилируется ровно как всегда, и запись alpha из §49 (вставляемая для жидкостных программ или не-strict вариантов) точно соответствует этому набору.
- **`BLOXD_SCENE_DEPTH` всегда определён в жидкостных вариантах**, поэтому использование глубины там остаётся допустимым без guard'а, ровно как в v2 (§35); в террейн-хуках по-прежнему нужен `#ifdef BLOXD_SCENE_DEPTH`.

## 47. Чек-лист миграции v2 → v3

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** во всех трёх входных структурах; выражайте стилизацию материалов битовыми проверками констант `bloxdBlockFlag*` (§42); выбросьте эвристики по диапазонам id из v2
3. **`bloxdTime()` → `bloxdSeconds()`**; объявите свой период вместо удалённой `bloxdTimeWrap` (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **Пересоберите математику света с `engineColour` на `litColour` + туман** по таблице §43; учтите, что дефолт теперь ослабляет emission туманом
6. **Жидкостные хуки**: явно определите `bloxdLiquid*`, если хотите обрабатывать воду иначе; не определяйте их, чтобы вернуться к террейн-хукам
7. **Проверка guard'ов `BLOXD_ALPHA` не нужна** — его набор вариантов не изменился с v2: все жидкостные варианты плюс не-strict террейн определяют его, опускает его только strict-террейн (§46)
8. **Используйте `bloxdPi` / `bloxdTau`** там, где были захардкожены тригонометрические константы; удалите локальные повторные объявления, которые теперь дублируют заголовок
9. **Сохраняйте strict-guard'ы**: vertex-хуки и `discard` остаются обёрнутыми в `#ifndef BLOXD_STRICT`; шаблон защищает `bloxdLiquidVertex` так же, как террейн
10. **Проверяйте в игре** — компилируйте и тестируйте пак в игре, поддерживающей шейдер-паки

## 48. Прочие изменения и заметки v3

- **Валидация остаётся двухступенчатой** ([часть VIII](08-apiv2.md) §38): сначала статическая валидация, затем настоящая WebGPU-компиляция браузера через сгенерированные заглушки, вызывающие ваши хуки, с привязкой ошибок обратно к исходным файлам / строкам, а диагностика восстанавливает исходные имена идентификаторов движка через отображение.
- **Strict-диагностика называет причину**: vertex-хук, двигающий террейн, сообщает «… moves terrain, which strict games prevent.», а `discard` в surface / light-хуках — «discard makes terrain see-through, which strict games prevent.»; UI настроек сохраняет указание «wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`.» (`offInStrict`).
- **Сообщения загрузчика**: виды ошибок и лимиты не изменились; «Zip64 archives aren't supported.» выводится как сообщение UI (`loadZip64`). Инвентарь строк UI паков насчитывает 57 ключей `shaderPack:*`; среди ошибок стадии загрузки набор дополняют `loadNoWgsl` (zip без единого файла `.wgsl`) и `loadNotZip` (файл без сигнатуры конца zip-архива).
- **В игровом UI паков нет WGSL-редактора.** Экран настроек не предлагает редактор шейдерного кода — паки пишутся как zip-файлы вне игры. (CodeMirror в бандле есть, но это редактор JavaScript для UI скриптинга кастомных игр; поддержки WGSL у него нет, и с системой паков он не связан.)
- **Аппаратный порог**: Lite требует драйвер с поддержкой функции WebGPU `shader-f16`; слишком старые драйверы отклоняются сообщением вроде «Intel driver too old for Lite (no shader-f16)».
- **Смена освещения перепроверяет сохранённые паки**: когда настройка освещения меняется во время выполнения, движок заново запускает проверку пака (`changed → recheck`); просмотр реплеев вызывает тот же хук с `changed: false` и перепроверку пропускает.
- **Формулировки**: текст об играх, принимающих шейдер-паки, теперь читается как «in games that **support** them».
- **Область действия заголовков**: набор игр, где работают паки, не изменился по сравнению с предыдущей сборкой.

## 49. Внутрянка движка: как Lite-рендерер вызывает ваши хуки

Всё в §40–§48 — это то, что вам сообщают загрузчик и заголовок. Этот и следующие разделы документируют, что движок на самом деле делает во время выполнения; всё это восстановлено из продакшн-бандла (Lite-рендерер — чанк на 175 КБ; настоящее имя исходного файла интеграции `lite/terrainShaderPack.ts` сохранилось в его строках ошибок). Ничто из этого не меняет того, что вы пишете, но убирает догадки о том, что получают ваши хуки — и закрывает несколько вопросов, которые другие руководства сообщества до сих пор числят открытыми.

Рендерер не «вызывает» ваши хуки из JavaScript. Когда пак проходит валидацию, движок **вставляет вызовы ваших хуков в собственный WGSL террейна**, заменяя фиксированные якорные строки в тексте шейдера. Якорь должен совпасть ровно один раз — ноль или несколько совпадений прерывают работу с `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Стадия | Якорная строка в шейдере движка | Что вставляется |
|---|---|---|
| vertex | блок из четырёх строк от `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` до `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);` | собрать `BloxdVertexIn`, вызвать ваш vertex-хук, записать `worldPos` обратно — вставка ещё и переписывает `let worldPos` в `var worldPos` |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | собрать `BloxdSurfaceIn`, вызвать ваш surface-хук, записать `baseColor` / `alpha` обратно |
| lit colour | прямо перед `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` | `let bloxdSpLitColour = color.rgb;` — захватывает цвет до тумана |
| light | финальная строка `return color;` во фрагментном шейдере | собрать `BloxdLightIn`, вызвать ваш light-хук, записать `color` обратно — после смешивания с туманом |

Вставленный код, восстановленный из отгруженного бандла (выражения уровней света местами сокращены, где форматирование движка слишком длинное):

```wgsl
// vertex-стадия — не-strict варианты с vertex-хуком
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* your bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// fragment-стадия — surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* your surface hook */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // вставляется, только если программа жидкостная или вариант не-strict
```

```wgsl
// fragment-стадия — light
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // directional
        ambient,                                 // ambient
        /* varying уровня света */.rgb,          // blockLight
        /* sky-канал того же varying */,         // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* поле ручного света (см. ниже) */,     // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour — чёрный только при полном отсутствии тумана
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* your light hook */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

Из этой вставки напрямую следуют четыре факта о принуждении:

- **Strict-террейн игнорирует изменения alpha из surface-хука.** Запись `alpha = bloxdSpSurface.alpha` вставляется только для жидкостных программ или не-strict вариантов — реализация, стоящая за таблицей макросов из §46. (В strict-террейне ваш код `#ifdef BLOXD_ALPHA` и так не компилируется; теперь ещё подтверждено, что незащищённые записи alpha там отбрасываются.)
- **Strict-вариант, который всё же объявляет vertex-хук, никогда его не запускает** — движок сообщает об этом во время сборки: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. Поэтому официальный шаблон (§45) оборачивает `bloxdLiquidVertex` в тот же `#ifndef BLOXD_STRICT`, что и его террейн-близнеца.
- Идентификаторы `bloxdSp*` — **всего 14**: `bloxdSpVertexIn`, `bloxdSpVertex`, `bloxdSpSurfaceIn`, `bloxdSpSurface`, `bloxdSpLightIn`, `bloxdSpLight`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, `bloxdSpPositionW`, `bloxdSpZ`, `bloxdSpEye`, `bloxdSpScale`, `bloxdSpBehind` — временные переменные движка. Ваш код их никогда не видит, но они всплывают в диагностике и в любых результатах обратной разработки, так что их стоит узнавать с первого взгляда.
- **Сокращение для дефолтного surface.** Когда surface-хук варианта — буквально `bloxdDefaultSurface`, движок вообще не вставляет строки записи `baseColor` / `alpha` — дефолт и так выдаёт эти значения, так что присваивание было бы мёртвым кодом. Неизменённые цепочки хуков ничего не стоят.

**Что на самом деле питает `BloxdLightIn`** — поле за полем, из вставленного кода:

| Поле | Источник на стороне движка |
|---|---|
| `litColour` | цвет фрагмента, захваченный прямо перед смешиванием с туманом (якорь `bloxdSpLitColour`) — «before emission and fog», как говорит заголовок |
| `directional` | `vTerrainLambert` — интерполированная по вершинам сумма `max(0, dot(normal, lightDirection)) × intensity` по направленным светам сцены (формула в §54); 0, если в сцене их нет |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — по материалу, на кадр |
| `blockLight` | `.rgb` декодированного varying уровней света (декодирование в §54) |
| `skyLight` | sky-канал того же varying уровней света — *"Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING"* (текст заголовка) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | поле ручного света, собранное из w-канала varying уровней света вместе с кадровыми uniform `uHeldLightPos` / `uHeldLightColour` ([часть VII](07-internals.md) §26 документирует затухание и поведение пола каналов) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **чёрный только в сцене без тумана вообще** (режим 0, §50) |
| `fogVisibility` | ограниченный коэффициент тумана — точное значение, которое возвращает функция из §50 |
| `position` / `normal` | varying `vPositionW` / `vNormalW` (нормаль перенормируется на фрагмент) |
| `blockFlags` | flat varying `vBlockFlags` — полный путь доставки из §52 |

Для ориентации при чтении старого материала: идентичная архитектура вставки существовала в рендерере v2, а единственные интеграционные отличия v3 — `vBlockId` → `vBlockFlags` и добавленные жидкостные варианты. Система хуков архитектурно стабильна, несмотря на разрыв между v2 и v3.

## 50. Функция тумана: четыре режима, одно поле

Восстановлено дословно из продакшн-шейдера террейна:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // линейный
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // экспоненциальный
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // экспоненциальный в квадрате
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = туман выключен (коэффициент остаётся 1.0)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)` — один vec4 управляет всем.
- **В шейдере существуют четыре режима: 0 = выкл., 1 = экспоненциальный, 2 = экспоненциальный в квадрате, 3 = линейный.** `fogVisibility` — это ограниченный коэффициент, какой бы режим ни работал — поле ровно одно, и флаг режима никогда не выставляется пакам.
- Собственные заголовки Bloxd используют режим 3 (линейный) с 32-блочной полосой, описанной в [части VII](07-internals.md) §25 (`fogStart = 32 × D`, `fogEnd = 32 × (D + 1)`), так что наблюдение «всегда линейный» из той части по-прежнему верно для штатных игр. Однако экспоненциальные режимы — настоящий живой код движка: заголовок может переключить `vFogInfos.x` и изменить кривую без обновления клиента. Рецепты дистанции, которые сами считают `distance(l.position, bloxdEyePosition())` (рецепт R-B), — надёжный способ писать завязанный на дистанцию вид, поскольку переключение режима их не сдвинет.
- Это закрывает вопрос «какую кривую тумана движок на самом деле использует» по исходникам: реализованы все четыре; поставляемые заголовки используют линейный. (Та же функция объясняет и комментарий заголовка о fogColour — режим 0 единственный, где `fogColour` приходит чёрным, а игры Bloxd никогда не поставляют режим 0; вместо этого они отодвигают туман далеко, [часть VII](07-internals.md) §25.)

## 51. bloxdOpaqueBehind(): точная реализация

Вся функция, восстановленная дословно из продакшн-билда:

```wgsl
@group(3) @binding(1) var bloxdSpSceneDepth: texture_2d<f32>;
var<private> bloxdSpPixel: vec2i;
var<private> bloxdSpPositionW: vec3f;

fn bloxdOpaqueBehind() -> BloxdOpaqueBehind {
    let bloxdSpZ = textureLoad(bloxdSpSceneDepth, bloxdSpPixel, 0).r;
    if (bloxdSpZ <= 0.0) {
        return BloxdOpaqueBehind(false, vec3f(0.0), 0.0);
    }
    let bloxdSpEye = bloxdPackInputs.eyePosition;
    let bloxdSpScale = max(bloxdSpZ / (scene.view * vec4f(bloxdSpPositionW, 1.0)).z, 1.0);
    let bloxdSpBehind = bloxdSpEye + (bloxdSpPositionW - bloxdSpEye) * bloxdSpScale;
    return BloxdOpaqueBehind(true, bloxdSpBehind, distance(bloxdSpBehind, bloxdSpEye));
}
```

- **Текстура глубины живёт на `@group(3) @binding(1)`** — группа 3 — собственная группа пака: binding 0 — 64-байтный uniform `bloxdPackInputs` (§41), binding 1 — эта текстура глубины. Оба ресурса предоставлены движком, и вы не можете обращаться к ним по имени.
- **Текстура глубины — unfilterable-float, ресурс только для фрагмента.** Раскладка bind-group регистрирует её как `texture: { sampleType: "unfilterable-float" }` с видимостью только `GPUShaderStage.FRAGMENT` — именно поэтому `bloxdOpaqueBehind()` построен на `textureLoad` (явные координаты тексела, mip 0), а не на `textureSample`: аппаратная фильтрация для этой текстуры просто недоступна.
- `z ≤ 0` означает, что выборка глубины ни во что не попала (дальняя плоскость / небо): `found = false`, а `position` / `distance` бессмысленны — всегда сначала проверяйте `found`.
- Возвращаемая позиция — **пересечение с масштабированием луча**: непрозрачная поверхность ставится в `eye + (fragment − eye) × max(z / viewDepth, 1)`. `distance` измеряется от глаза до этой точки — для паков, рисующих воду, это фактически «сколько воды луч прошёл до удара во что-то твёрдое», что и заставляет рецепты воды с тинтом по глубине работать без второго буфера глубины.

## 52. blockFlags от начала до конца: от регистрации до вашего хука

§42 рассказывает, что означают биты. Этот раздел — полный путь, который бит флага проходит от регистрации блока до вашего хука — каждый шаг подтверждён по продакшн-исходнику, что также доказывает «the same across the face» из заголовка вплоть до уровня байтов.

**1. Регистрация (база определений блоков).** Флаги каждого блока вычисляются один раз, при регистрации:

```js
flags[id] = nameFlags                     // правила отображаемого имени (§42): vegetation / dirt / sand / rock
          | (definition.opaque === true ? 1 : 0)   // бит opaque — данные непрозрачности движка
          | (anyFaceEmission >= 1       ? 2 : 0);  // бит emissive — данные свечения блочного света
```

Правила отображаемого имени покрывают только четыре материальных бита; два физических бита приходят из отдельных данных движка — `opaque` прямо из определения блока, `emissive` из массива свечения блочного света по граням. «Glowing ores count, however faint» из заголовка — буквально: любая грань с излучением ≥ 1 ставит бит.

**2. От блока к материалу (инициализация мешера).** Террейн рисуется по *материалам*, а не по id блоков, поэтому флаги перетабулируются в таблицу материалов (`Uint16Array` с индексацией по id материала, каждый материал берёт флаги первой грани своего блока). Таблица отправляется в Web Worker мешинга — но **только в конфигурациях, где включён конвейер паков**; иначе таблица `null`, и байты флагов не записываются вовсе. Игроки без паков не платят ничего — так устроено конструкцией.

**3. В байты вершин (worker мешера).** Флаги едут в двух свободных байтах существующих интерливинг-данных вершины:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // младшие 8 бит → альфа-байт атрибута цвета
        buffer[o + normalOffset + 3] = flags >> 8;    // старшие 8 бит → w-байт атрибута нормали
    }
}
```

Все четыре вершины грани получают одно и то же значение — смысл «the same across the face» на уровне реализации.

**4. Декодирование на стороне GPU (шейдер террейна Lite).** Два байта едут как вершинный атрибут `blockFlagWords: vec2u` (location 7, присутствует только когда конвейер паков включён) и собираются обратно на vertex-стадии:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags` объявлен `@interpolate(flat)` — константа на грань вплоть до fragment-стадии, поэтому битовые проверки из §42 стабильны внутри грани и никогда не дают смешивания посередине грани.

- Конвейер резервирует **16 бит** ёмкости (декодирование собирает два полных байта), тогда как v3 определяет только 6 — будущие флаги могут появиться без очередного изменения формата вершин или бампа API.
- В режиме упакованных вершин те же два байта едут внутри `packed.y` и старшего байта слова цвета вместо выделенного атрибута — те же значения, другой контейнер.
- О вопросе «листва или трава», который чаще всего задают про эти флаги, см. [Листва без травы](#листва-без-травы-вопрос-который-задают-все) в §42.

## 53. Внутрянка валидации: HEADER_VERSION, сигнатуры, зарезервированные имена

**Измеренный хэш заголовка.** Каждая валидация пака штампуется `HEADER_VERSION` движка. Прямое исполнение продакшн-модуля валидации (см. заметку о стенде в конце §54) даёт измерение:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← измерено из живого продакшн-бандла
```

Это хэш FNV-1a-32 (с префиксом `6.`) от пяти входов: заголовок движка, препроцессированный и токенизированный **по варианту** (одна запись на каждый из 8 вариантов), полный лексический универсум парсера WGSL, четыре имени макросов, карта специальных функций и объявление `BloxdPackInputs` вместе со строкой uniform `@group(3) @binding(0)`. Два следствия для авторов:

- **Любая правка заголовка на стороне движка пересчитывает хэш** — это механизм автоматической пометки «нужна перепроверка», которую сохранённые паки получают после обновлений движка ([часть VIII](08-apiv2.md) §31).
- Хэш покрывает *заголовок движка*, а не ваш код. Пак, который продолжает загружаться после обновления движка, не «всё ещё валиден» — просто он пока не задел изменение заголовка. Единственная проверка версии, в которой участвует ваш манифест, — ворота `apiVersion` (§40).

**Проверка сигнатур хуков: точность по токенам в типах, свобода в именах.** Валидатор держит одну сигнатуру на слот хука:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

Сопоставление **токен за токеном**: имена типов параметров должны совпадать точно, `->` и возвращаемый тип должны совпадать точно, а количество параметров и расстановка запятых проверяются. Имена параметров свободны — любой идентификатор на месте параметра принимается, поэтому ваш `fn bloxdTerrainLight(s, l)` компилируется, хотя шаблон пишет его `(surface, light)`. Light-хук принимает ровно два параметра.

**Зарезервированные имена.** Правило — один regex: `/^bloxd/i`. Любой идентификатор, начинающийся с `bloxd`, зарезервирован — все идентификаторы `bloxd*` предоставляет движок, и пак не может объявлять что-то в этом пространстве имён (поэтому же повторные объявления `bloxdPi` / `bloxdTau` из §44 конфликтуют).

**Специальные функции.** В v3 зарегистрирована ровно одна:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

«Специальная» значит *привязанная к макросу* — функция движка, доступность которой зависит от символа варианта. Две диагностики guard'ов обеспечивают правильное использование:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — vertex-хук, дотягивающийся до функции, доступной только surface/light-хукам.
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — например, `bloxdOpaqueBehind()` на стороне террейна без обёртки `#ifdef BLOXD_SCENE_DEPTH`.

**Заголовок движка (прелюдия) закреплён.** Заголовок v3 — строка длиной 5 637 байт, начинающаяся с `// Engine-provided and read-only, prepended to all packs. apiVersion 3.` Он несёт директивы `#if` / `#ifdef`, которые собственный препроцессор движка вычисляет для каждого варианта — движок действительно вычисляет выражения `#if`, а при некорректном выражении возникает ошибка `Cannot evaluate #if ...`. Каждая структура, сигнатура функции и цитируемый комментарий в этом руководстве происходят из этого отрендеренного текста, поэтому руководство и поставляемый заголовок не могут разойтись.

**Заметки о парсере для авторов.**

- Функции на стороне пака переименовываются с префиксом `pack_` при слиянии в шейдер движка (избегание коллизий); диагностика отображает их обратно в ваши исходные имена — тот же механизм, который [часть VIII](08-apiv2.md) §38 описывает для второй ступени валидации.
- Сообщение о необъявленном идентификаторе читается как `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`; `_ can only be the target of a phony assignment, as in _ = f();` и `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.` дополняют недавно подтверждённый набор.
- Лексический универсум парсера включает идентификаторы, которые **не являются стандартным WGSL**: `bufferView`, `bufferArrayView`, `bufferLength`, `atomicStoreMax`, `atomicStoreMin`. Движок знает их как встроенные, но гарантии, что конкретная реализация WGSL в браузере их предоставляет, нет — никогда не стройте на них распространяемый пак.

## 54. Подтверждённые константы, лимиты и раскладки

Полная раскладка ресурсов террейн-программы, прямо из продакшн-рендерера Lite:

| Binding | Содержимое |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms` — `viewProjection` mat4x4f, `view` mat4x4f, `vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`, `uSkyLightColour`, `uAmbientLightColour`, **`vFogInfos`**, `vFogColor`, `outputHeight`, `sceneAmbient`, **`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: storage `array<vec4f>` — xyz = перенос в кадр рендера, w = видимость при появлении |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`, `ambientAndCutoff`, `emissiveAndLevel`, `anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — uniform пака (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — текстура глубины (§51) |

- **Направленные света жёстко ограничены четырьмя.** Рендерер завершается с ошибкой `Terrain supports 4 directional lights, not ${n}`, если сцена пытается зарегистрировать больше. `l.directional` — суммарный Ламберт по стольким, сколько есть (0–4; собственные сцены Bloxd используют 2 — [часть VII](07-internals.md) §27). Кроме того, террейн предупреждает о светах, которые не может учесть, дословно: свет, добавленный поздно — `Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`; тонированный — `Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`; и свет с фильтрацией мешей — `Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **Именование террейн-программы**: ключи кэша пайплайна читаются как `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}` — пак обнаруживается по суффиксу `-sp{variant}`, одна программа на вариант из §46. Наблюдатель (`watchPipelineFailures`) сопоставляет имена живых пайплайнов с `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/` и перепроверяет соответствующий вариант пака при сбое компиляции пайплайна; потеря GPU-устройства (`device.lost`) проверку пропускает.
- **`BLOXD_TERRAIN_DIRECTIONAL` — внутренний макрос движка** (определён при dirLightCount > 0). Это *не* один из четырёх макросов прелюдии, и он никогда не доходит до кода пака — но появляется в дампах WGSL собственных шейдеров движка, так что узнавание его экономит путаницу.
- **Декодирование уровней света**: вершинный атрибут `aPackedLightLevels` — один f32, упаковывающий четыре ниббла, каждый делится на 15: rgb = цветной блочный свет, a = канал неба / ручного света. Vertex-стадия декодирует его в varying `vLightLevels`; `blockLight` читает `.rgb`, канал неба / ручного света читает `.w`. Движок поднимает rgb-каналы до пола в 35% ярчайшего канала перед интерполяцией — якорь на стороне движка для подъёма, который [часть VII](07-internals.md) §26 описывает со стороны геймплея.
- **`vTerrainLambert`** (источник `directional`, §49) генерируется как сумма по активным направленным светам: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, под guard'ом `BLOXD_TERRAIN_DIRECTIONAL`.
- **Индексные буферы становятся 32-битными на первом крупном меше.** Lite-рендерер выбирает индексы `Uint16Array`, только пока каждое значение индекса остаётся ≤ 65 534 — как только любой индекс достигает 65 535, буфер становится `Uint32Array` (отслеживается для каждого буфера флагом `is32Bits`). На практике: меш чанка не более чем с 65 535 вершинами помещается в 16-битные индексы; меш ровно с 65 536 вершинами неизбежно выдаёт индекс 65 535 и переключает весь буфер на 32 бита.
- **Детали загрузки манифеста**: zip-записи под `__MACOSX/`, файлы с префиксом `._` и `.DS_Store` отфильтровываются (шум macOS-архива); `pack.json` ищется сравнением путей в нижнем регистре — ноль совпадений → `loadNoManifest`, два и более → `loadDuplicateManifest`; чтение манифеста ограничено 65 536 байтами.
- **Как всё это проверялось**: модули продакшн-бандла были восстановлены (165 чанков; реестр webpack насчитывает 4 951 модуль в этом бандле — счётчик модулей смещается на несколько штук в зависимости от того, включены ли асинхронные дочерние зависимости, так что точное число стоит считать привязанным к конкретному бандлу) и исполнены в webpack-совместимом стенде под Node.js. Измеренный `HEADER_VERSION` (§53), отрендеренный заголовок на 5 637 байт, канонический порядок таблицы вариантов и карта специальных функций — всё это получено *исполнением отгруженного кода*, а не чтением строк. Тот же стенд — естественное ядро для сообщественного `pack_check` v6: исполнение собственного валидатора движка против пака в точности воспроизводит его вердикты.

---

# Часть X: руководство по миграции на API версии 4 (2026-10-26, конспект)

> Это краткий конспект на данном языке. Полная версия со всеми деталями, примерами-рецептами и восстановленными внутренностями движка (§55–§66) доступна на [английском](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md) и [японском](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md).

Целевой билд: `cnty9.main.669f8081.js` — **в продакшене и предпродакшене одновременно с 2026-10-26** (оба байт-в-байт совпадают). Модель пака сохраняет форму: те же поля `pack.json`, те же лимиты загрузчика, тот же uniform на 64 Б, те же 6 хуков.

## Что меняется

- `pack.json` требует `"apiVersion": 4` (строгое `===`, число) — паки v3 отклоняются при загрузке.
- **Новый текстурный API (главное):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` сэмплит атлас блочных текстур ровно так, как это делает сам движок (id 0 = белый; анимированные текстуры автоматически дают текущий кадр), `bloxdTextureSize(mipLevel) -> vec2u`, и именованные константы `bloxdTextureId*` (CamelCase из имени файла, напр. `grass_top` → `bloxdTextureIdGrassTop`; официальный каталог — `BLOCK_TEXTURES.md`).
- **Четыре новых входных поля** в `BloxdSurfaceIn` *и* `BloxdLightIn`: `textureId`, `textureRotation` (четверти оборота по часовой, применяет `bloxdTexel`), `uv` (в блоках; рисуется `fract(uv)`), `mipLevel`.
- **Переименования со сменой смысла:** `fogVisibility` → `fogAlpha` с **инвертированным** смыслом (`0 = без тумана, 1 = только fogColour`; порт: `l.fogVisibility` → `1.0 - l.fogAlpha`); `bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (тело идентично); `BloxdOpaqueBehind.found` → `hit`.
- **Строгие игры теперь принуждаются встроенным валидатором:** незащищённый вершинный хук или достижимый `discard` даёт `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...` и отключает **все** хуки в строгих играх. С обёртками `#ifndef BLOXD_STRICT` surface/light продолжают работать.
- Всё остальное заморожено: 6 хуков, биты `blockFlags` (1/2/4/8/16/32), раскладка uniform, лимиты загрузчика, матрица вариантов, 12 allow-титулов (переподтверждены без изменений на `cnty9` 2026-10-27).

## Краткая миграция

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (число) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` или `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| Незащищённые вершинные хуки | `#ifndef BLOXD_STRICT ... #endif` |

Полный справочный материал встроен как Часть XI (`11-reference.md`) — дословно восстановленный заголовок движка и полный измеренный каталог всех 905 доступных имён текстур; тем не менее продолжайте сверять рецепты с экраном загрузки и компиляцией в игре. Полные детали — тонкость поворотов в `bloxdTexel`, восстановленный WGSL сэмплинга, реестр имён с ≈900 доступными константами, новая структура `HEADER_VERSION` с хешем реестра — в полной английской и японской версиях.

[← Предыдущая часть](09-apiv3.md)·[Вернуться к руководству](README.md)

---

# Часть XI: Полный справочник — заголовок движка и каталог текстур

Целевой билд: `cnty9.main.669f8081.js` (измерен 2026-10-27; продакшен и препрод побайтно совпадают). Эта часть вставляет **целиком** оба справочных артефакта, чтобы руководство было самодостаточным. §67 — точный текст заголовка, который движок дописывает перед каждым паком (восстановлен дословно из продакшен-бандла); §68 — полный каталог текстур: все 905 используемых имён `bloxdTextureId*` с измеренными id, 57 повёрнутых семейств, 42 анимированных и измеренный дрейф реестра.

Каталог — не приближение: он получен запуском **собственного** модуля-строителя реестра движка (module 28833 — тот же код, что разрешает `bloxdTextureId*` при валидации) на данных живого билда (`textureNameToIndex`, `animDataPerTex`) с фиксацией его вывода. Имена — это API; id — снимок одного билда, они дрейфуют (§68.5).

Подробные объяснения обоих разделов — в полных английской и японской версиях Части XI; сами данные здесь полны.


## 67. Полный заголовок движка v4, дословно

Заголовок в 6 021 байт (150 строк), который движок дописывает перед каждым паком — первая строка `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.` Не входят: пара `bloxdTexel`/`bloxdTextureSize`, генерируемая по конфигурации рендера (§63.1), и 27 символов `bloxdSp*` (§63.4). Ворот `#ifdef BLOXD_ALPHA` разрешается препроцессором движка по вариантам.


```wgsl

// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.

const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// These functions return 1 value per frame, the same for every call site.

// The camera's render position.
fn bloxdEyePosition() -> vec3f {
    return bloxdPackInputs.eyePosition;
}

// Changes as the player travels, so render positions stay close to 0,0,0.
// Integer distance, in blocks. Render position + this offset = world position.
// See bloxdWorldPosition for how this can be used.
fn bloxdRenderOffset() -> vec3i {
    return bloxdPackInputs.renderOffset;
}

// This unit vector points towards the sun, in world orientation; 0 when no sun.
fn bloxdSunDirection() -> vec3f {
    return bloxdPackInputs.sunDirection;
}

// Seconds since the page loaded. As an f32, it has sub-millisecond precision
// for the first 4.5 hours. Get a recurring timer using bloxdSeconds() % period.
fn bloxdSeconds() -> f32 {
    return bloxdPackInputs.seconds;
}

// Each bit of the binary representation of blockFlags is a flag corresponding
// to a collection of blocks. The collections overlap, so blocks can be in 0-2+.
// (blockFlags & bloxdBlockFlagRock) != 0 // The block has this flag.
// (blockFlags & bloxdBlockFlagRock) == 0 // The block doesn't have this flag.

// Opaque blocks, leaves and ice included. Not glass, water, spawners, etc.
const bloxdBlockFlagOpaque: u32 = 1;

// These blocks emit light, e.g. neon, portals, lamps, lava, and glowing ores.
const bloxdBlockFlagEmissive: u32 = 2;

// 'Leafy', e.g. leaves, and grass blocks. Not cacti, mushroom blocks or hay.
const bloxdBlockFlagVegetation: u32 = 4;

// Dirt and soil, grass blocks included. Rocky Dirt is both dirt and rock.
const bloxdBlockFlagDirt: u32 = 8;

// Sand, Red Sand, and every sandstone, which is rock too.
const bloxdBlockFlagSand: u32 = 16;

// Stone variants, and more, e.g. gravel, ores, sandstone, magma and obsidian.
const bloxdBlockFlagRock: u32 = 32;

// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f {
    return position + vec3f(bloxdRenderOffset());
}

// Using a fragment's position and normal, identify the block's world position.
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i {
    return vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset();
}

struct BloxdVertexIn {
    position: vec3f, // Render position.
    normal: vec3f,   // Unit vector direction pointing away from the face.
    blockFlags: u32, // What kind of block. See bloxdBlockFlag*.
}

struct BloxdVertex {
    position: vec3f, // The render position output.
}

struct BloxdSurfaceIn {
    colour: vec3f,   // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,      // Opacity.
    normal: vec3f,   // Unit vector direction pointing away from the face.
    position: vec3f, // Render position.
    blockFlags: u32, // What kind of block. See bloxdBlockFlag*.

    // These are 0 if the face has no texture.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // Texture coordinates in blocks; fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}

struct BloxdSurface {
    colour: vec3f,   // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,      // Opacity output.
#endif
    emission: vec3f, // Emissive RGB output, added after lighting, before fog.
}

// blockLight, skyLight and heldLight are 0-1, from the 0-15 light levels on an
// ease-out curve, e.g. 6->0.45, 12->0.92. They all exclude ambientLightColour.
struct BloxdLightIn {
    litColour: vec3f,  // RGB surface colour, lit, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 when off.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 without BLOXD_LIGHTING.
    skyLight: f32,     // Sky light; 1 without BLOXD_LIGHTING.
    ambientLightColour: vec3f, // Minimum RGB light; 1 without BLOXD_LIGHTING.
    skyLightColour: vec3f, // RGB colour of skyLight; 1 without BLOXD_LIGHTING.
    heldLight: vec3f,  // 0 without BLOXD_LIGHTING. 0 with no light source held.
    fogColour: vec3f,  // The game's RGB fog colour. 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.
    position: vec3f,   // Render position.
    normal: vec3f,     // Unit vector direction pointing away from the face.
    blockFlags: u32,   // What kind of block. See bloxdBlockFlag*.

    // These are 0 if the face has no texture.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // Texture coordinates in blocks; fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}

struct BloxdLight {
    colour: vec3f, // RGB colour output.
}

struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}

fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return BloxdVertex(vertex.position);
}

fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
#ifdef BLOXD_ALPHA
    return BloxdSurface(surface.colour, surface.alpha, vec3f(0.0));
#else
    return BloxdSurface(surface.colour, vec3f(0.0));
#endif
}

// Applies this fragment's fog to colour, as the engine does.
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}

fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return BloxdLight(bloxdApplyFog(light.litColour + surface.emission, light));
}
```

## 68. Полный каталог текстур (905 имён, измерено)

### 68.1 Как читать

**Имя** — дескриптор реестра; константа получается CamelCase-преобразованием (§57.3): `grass_top` → `bloxdTextureIdGrassTop`. **id** — значение константы (слой атласа + 1, измерено на `cnty9`) — для отладки, не для хардкода. Столбец **Примечания** помечает анимированные семейства (автоматически текущий кадр) и повёрнутые (адресуйте корень; `bloxdTexel` заново применяет поворот).

Чего здесь нет: 416 известных написаний-псевдонимов (188 кадровых, 228 поворотных) — это не константы, у них свои сообщения об ошибках (§57.3).


### 68.2 Каталог

Все используемые имена, по алфавиту. id — снимок `cnty9`; имена переживают дрейф реестра, потому что валидатор заново разрешает их при загрузке.

| Имя | id (cnty9) | Примечания |
|---|---|---|
| `alloy_kiln_back` | 1091 |  |
| `alloy_kiln_front` | 1085 |  |
| `alloy_kiln_side` | 1086 |  |
| `alloy_kiln_side_running` | 33 | animated (4 frames) |
| `alloy_kiln_top` | 1087 | turned (4 rotated copies) |
| `andesite_brick` | 465 |  |
| `apple_block_bottom` | 441 |  |
| `apple_block_side` | 439 |  |
| `apple_block_top` | 440 |  |
| `armour_lucky_block` | 995 |  |
| `armour_lucky_block_rare` | 997 |  |
| `armour_lucky_block_super` | 999 |  |
| `artisan_table_side` | 367 |  |
| `artisan_table_top` | 368 |  |
| `ash` | 1031 |  |
| `auto_bench_back` | 1106 |  |
| `auto_bench_front` | 1100 |  |
| `auto_bench_side` | 1101 |  |
| `auto_bench_side_running` | 35 | animated (4 frames) |
| `auto_bench_top` | 1102 | turned (4 rotated copies) |
| `autocrafter_bottom` | 962 |  |
| `autocrafter_lunite_bottom` | 973 |  |
| `autocrafter_lunite_side` | 972 |  |
| `autocrafter_side` | 961 |  |
| `banana_block_side` | 899 |  |
| `banana_block_top` | 900 |  |
| `beacon` | 330 |  |
| `bedrock` | 334 |  |
| `beetroot_block_bottom` | 925 |  |
| `beetroot_block_side` | 923 |  |
| `beetroot_block_top` | 924 |  |
| `belt_drop_side` | 1185 |  |
| `belt_drop_top` | 1184 |  |
| `belt_lift_side` | 1183 |  |
| `belt_lift_top` | 1182 |  |
| `belt_loader_slab_front` | 1110 |  |
| `belt_loader_top` | 1109 |  |
| `belt_tunnel_back` | 1199 |  |
| `belt_tunnel_exit_top` | 1200 | turned (4 rotated copies) |
| `belt_tunnel_mouth` | 1193 |  |
| `belt_tunnel_side` | 1194 |  |
| `belt_tunnel_top` | 1195 | turned (4 rotated copies) |
| `black_concrete` | 273 |  |
| `black_glazed_terracotta` | 429 | turned (4 rotated copies) |
| `black_planks` | 366 |  |
| `black_portal` | 2 | animated (4 frames) |
| `black_spawn_block_side` | 760 |  |
| `black_spawn_block_top` | 756 | turned (4 rotated copies) |
| `block_destroyer_tnt_side` | 1017 |  |
| `block_destroyer_tnt_top` | 1018 |  |
| `blue_concrete` | 274 |  |
| `blue_gen_spawn_coal` | 774 |  |
| `blue_gen_spawn_iron` | 775 |  |
| `blue_gen_spawn_top` | 773 |  |
| `blue_glazed_terracotta` | 413 | turned (4 rotated copies) |
| `blue_lucky_block` | 994 |  |
| `blue_lucky_block_rare` | 996 |  |
| `blue_lucky_block_super` | 998 |  |
| `blue_planks` | 362 |  |
| `blue_portal` | 3 | animated (4 frames) |
| `blue_spawn_block_side` | 755 |  |
| `blue_spawn_block_top` | 751 | turned (4 rotated copies) |
| `bone_block_side` | 818 |  |
| `bone_block_top` | 819 |  |
| `bookshelf` | 564 |  |
| `bookshelf_1` | 566 |  |
| `bookshelf_2` | 567 |  |
| `bookshelf_3` | 568 |  |
| `bookshelf_4` | 569 |  |
| `bookshelf_5` | 570 |  |
| `bookshelf_empty` | 565 |  |
| `bouncy_bomb_block` | 591 |  |
| `bowling_alley_floor` | 978 |  |
| `bread_block_back` | 435 |  |
| `bread_block_front` | 434 |  |
| `bread_block_side` | 436 |  |
| `bread_block_top` | 437 |  |
| `brick` | 315 |  |
| `brown_concrete` | 275 |  |
| `brown_glazed_terracotta` | 417 | turned (4 rotated copies) |
| `brown_mushroom_block` | 536 |  |
| `brown_planks` | 363 |  |
| `brown_portal` | 4 | animated (4 frames) |
| `brown_spawn_block_side` | 750 |  |
| `brown_spawn_block_top` | 746 | turned (4 rotated copies) |
| `building_lucky_block` | 989 |  |
| `building_lucky_block_rare` | 991 |  |
| `building_lucky_block_super` | 993 |  |
| `burner_drill_back` | 1048 |  |
| `burner_drill_bottom` | 1047 |  |
| `burner_drill_front` | 1041 |  |
| `burner_drill_side` | 1042 |  |
| `burner_drill_side_running` | 27 | animated (4 frames) |
| `burner_drill_top` | 1043 | turned (4 rotated copies) |
| `cactus_dry` | 350 |  |
| `cactus_top` | 349 |  |
| `carrot_block_bottom` | 921 |  |
| `carrot_block_side` | 919 |  |
| `carrot_block_top` | 920 |  |
| `carved_messy_stone` | 827 |  |
| `carved_pumpkin` | 543 |  |
| `chalk` | 839 |  |
| `chalk_black` | 855 |  |
| `chalk_blue` | 854 |  |
| `chalk_bricks_black` | 871 |  |
| `chalk_bricks_blue` | 870 |  |
| `chalk_bricks_brown` | 869 |  |
| `chalk_bricks_cyan` | 868 |  |
| `chalk_bricks_gray` | 867 |  |
| `chalk_bricks_green` | 866 |  |
| `chalk_bricks_light_blue` | 865 |  |
| `chalk_bricks_light_gray` | 864 |  |
| `chalk_bricks_lime` | 863 |  |
| `chalk_bricks_magenta` | 862 |  |
| `chalk_bricks_orange` | 861 |  |
| `chalk_bricks_pink` | 860 |  |
| `chalk_bricks_purple` | 859 |  |
| `chalk_bricks_red` | 858 |  |
| `chalk_bricks_slab_side_black` | 887 |  |
| `chalk_bricks_slab_side_blue` | 886 |  |
| `chalk_bricks_slab_side_brown` | 885 |  |
| `chalk_bricks_slab_side_cyan` | 884 |  |
| `chalk_bricks_slab_side_gray` | 883 |  |
| `chalk_bricks_slab_side_green` | 882 |  |
| `chalk_bricks_slab_side_light_blue` | 881 |  |
| `chalk_bricks_slab_side_light_gray` | 880 |  |
| `chalk_bricks_slab_side_lime` | 879 |  |
| `chalk_bricks_slab_side_magenta` | 878 |  |
| `chalk_bricks_slab_side_orange` | 877 |  |
| `chalk_bricks_slab_side_pink` | 876 |  |
| `chalk_bricks_slab_side_purple` | 875 |  |
| `chalk_bricks_slab_side_red` | 874 |  |
| `chalk_bricks_slab_side_white` | 873 |  |
| `chalk_bricks_slab_side_yellow` | 872 |  |
| `chalk_bricks_white` | 857 |  |
| `chalk_bricks_yellow` | 856 |  |
| `chalk_brown` | 853 |  |
| `chalk_cyan` | 852 |  |
| `chalk_gray` | 851 |  |
| `chalk_green` | 850 |  |
| `chalk_light_blue` | 849 |  |
| `chalk_light_gray` | 848 |  |
| `chalk_lime` | 847 |  |
| `chalk_magenta` | 846 |  |
| `chalk_orange` | 845 |  |
| `chalk_pink` | 844 |  |
| `chalk_purple` | 843 |  |
| `chalk_red` | 842 |  |
| `chalk_white` | 841 |  |
| `chalk_yellow` | 840 |  |
| `charge_vault_side` | 1114 |  |
| `charge_vault_top` | 1113 |  |
| `charging_pad_side` | 1159 |  |
| `charging_pad_top` | 1158 |  |
| `checkpoint_block` | 761 | turned (4 rotated copies) |
| `cherry_block_bottom` | 590 |  |
| `cherry_block_side` | 588 |  |
| `cherry_block_top` | 589 |  |
| `chest_back` | 347 |  |
| `chest_double_back_hi` | 1219 |  |
| `chest_double_back_lo` | 1218 |  |
| `chest_double_front_hi` | 1213 |  |
| `chest_double_front_lo` | 1212 |  |
| `chest_double_top_1_hi` | 1215 |  |
| `chest_double_top_1_lo` | 1214 |  |
| `chest_double_top_2_hi` | 1217 |  |
| `chest_double_top_2_lo` | 1216 |  |
| `chest_front` | 341 |  |
| `chest_side` | 342 |  |
| `chest_top` | 343 | turned (4 rotated copies) |
| `chili_pepper_block_bottom` | 678 |  |
| `chili_pepper_block_side` | 676 |  |
| `chili_pepper_block_top` | 677 |  |
| `chiseled_red_sandstone` | 456 |  |
| `chiseled_sandstone` | 325 |  |
| `clay` | 195 |  |
| `coal_block` | 233 |  |
| `coal_deposit` | 1032 |  |
| `coal_ore` | 227 |  |
| `coarse_dirt` | 191 |  |
| `coconut_block_bottom` | 522 |  |
| `coconut_block_side` | 520 |  |
| `coconut_block_top` | 521 |  |
| `code_block` | 679 |  |
| `comet_heart` | 1170 |  |
| `comet_ore` | 1169 |  |
| `compressed_messy_stone` | 530 |  |
| `conveyor_belt_bottom` | 1081 |  |
| `conveyor_belt_slab_side` | 1080 |  |
| `conveyor_belt_top` | 1079 |  |
| `conveyor_belt_turn_left` | 1171 |  |
| `conveyor_belt_turn_right` | 1172 |  |
| `copper_deposit` | 1035 |  |
| `copper_ore` | 1040 |  |
| `corn_block_bottom` | 594 |  |
| `corn_block_side` | 592 |  |
| `corn_block_top` | 593 |  |
| `crafting_table_side` | 338 |  |
| `crafting_table_top` | 339 |  |
| `crate` | 918 |  |
| `crop_harvester_back` | 1192 |  |
| `crop_harvester_back_running` | 45 | animated (4 frames) |
| `crop_harvester_front` | 1186 |  |
| `crop_harvester_side` | 1187 |  |
| `crop_harvester_side_running` | 44 | animated (4 frames) |
| `crop_harvester_top` | 1188 | turned (4 rotated copies) |
| `crusher_back` | 1055 |  |
| `crusher_front` | 1049 |  |
| `crusher_side` | 1050 |  |
| `crusher_side_running` | 28 | animated (4 frames) |
| `crusher_top` | 1051 | turned (4 rotated copies) |
| `crystal_block` | 1029 |  |
| `crystal_vat_back` | 1166 |  |
| `crystal_vat_front` | 1160 |  |
| `crystal_vat_side` | 1161 |  |
| `crystal_vat_side_running` | 42 | animated (4 frames) |
| `crystal_vat_top` | 1162 | turned (4 rotated copies) |
| `custom_lobby_block_side` | 769 |  |
| `custom_lobby_block_top` | 765 | turned (4 rotated copies) |
| `cut_red_sandstone` | 457 |  |
| `cut_sandstone` | 453 |  |
| `cyan_concrete` | 276 |  |
| `cyan_gen_spawn_coal` | 783 |  |
| `cyan_gen_spawn_iron` | 784 |  |
| `cyan_gen_spawn_top` | 782 |  |
| `cyan_glazed_terracotta` | 405 | turned (4 rotated copies) |
| `cyan_planks` | 360 |  |
| `cyan_portal` | 5 | animated (4 frames) |
| `cyan_spawn_block_side` | 745 |  |
| `cyan_spawn_block_top` | 741 | turned (4 rotated copies) |
| `dark_green_bricks` | 460 |  |
| `darkstone` | 1206 |  |
| `darkstone_bricks` | 1207 |  |
| `darkstone_bricks_cracked` | 1208 |  |
| `darkstone_bricks_lava` | 1209 |  |
| `darkstone_engraved` | 1210 |  |
| `darkstone_smooth` | 1211 |  |
| `deep_drill_back` | 1140 |  |
| `deep_drill_bottom` | 1139 |  |
| `deep_drill_front` | 1133 |  |
| `deep_drill_side` | 1134 |  |
| `deep_drill_side_running` | 39 | animated (4 frames) |
| `deep_drill_top` | 1135 | turned (4 rotated copies) |
| `diamond_block` | 340 |  |
| `diamond_gen_spawn_side` | 807 |  |
| `diamond_gen_spawn_top` | 806 |  |
| `diamond_ore` | 232 |  |
| `diorite_brick` | 463 |  |
| `dirt` | 190 |  |
| `drop_location_block_side` | 814 |  |
| `drop_location_block_top` | 813 |  |
| `drop_pad` | 1038 |  |
| `dry_grass_block` | 980 |  |
| `dry_grass_block_side` | 979 |  |
| `electric_drill_back` | 1099 |  |
| `electric_drill_bottom` | 1098 |  |
| `electric_drill_front` | 1092 |  |
| `electric_drill_side` | 1093 |  |
| `electric_drill_side_running` | 34 | animated (4 frames) |
| `electric_drill_top` | 1094 | turned (4 rotated copies) |
| `emerald_block` | 237 |  |
| `emerald_ore` | 231 |  |
| `end_stone` | 226 |  |
| `engraved_andesite` | 464 |  |
| `engraved_diorite` | 462 |  |
| `engraved_granite` | 466 |  |
| `evil_lucky_block` | 1022 |  |
| `evil_lucky_block_face` | 1023 |  |
| `explosive_paint_black_side` | 626 |  |
| `explosive_paint_black_top` | 627 |  |
| `explosive_paint_blue_side` | 624 |  |
| `explosive_paint_blue_top` | 625 |  |
| `explosive_paint_brown_side` | 622 |  |
| `explosive_paint_brown_top` | 623 |  |
| `explosive_paint_cyan_side` | 620 |  |
| `explosive_paint_cyan_top` | 621 |  |
| `explosive_paint_gray_side` | 618 |  |
| `explosive_paint_gray_top` | 619 |  |
| `explosive_paint_green_side` | 616 |  |
| `explosive_paint_green_top` | 617 |  |
| `explosive_paint_light_blue_side` | 614 |  |
| `explosive_paint_light_blue_top` | 615 |  |
| `explosive_paint_light_gray_side` | 612 |  |
| `explosive_paint_light_gray_top` | 613 |  |
| `explosive_paint_lime_side` | 610 |  |
| `explosive_paint_lime_top` | 611 |  |
| `explosive_paint_magenta_side` | 608 |  |
| `explosive_paint_magenta_top` | 609 |  |
| `explosive_paint_orange_side` | 606 |  |
| `explosive_paint_orange_top` | 607 |  |
| `explosive_paint_pink_side` | 604 |  |
| `explosive_paint_pink_top` | 605 |  |
| `explosive_paint_purple_side` | 602 |  |
| `explosive_paint_purple_top` | 603 |  |
| `explosive_paint_quick_black` | 643 |  |
| `explosive_paint_quick_blue` | 642 |  |
| `explosive_paint_quick_brown` | 641 |  |
| `explosive_paint_quick_cyan` | 640 |  |
| `explosive_paint_quick_gray` | 639 |  |
| `explosive_paint_quick_green` | 638 |  |
| `explosive_paint_quick_light_blue` | 637 |  |
| `explosive_paint_quick_light_gray` | 636 |  |
| `explosive_paint_quick_lime` | 635 |  |
| `explosive_paint_quick_magenta` | 634 |  |
| `explosive_paint_quick_orange` | 633 |  |
| `explosive_paint_quick_pink` | 632 |  |
| `explosive_paint_quick_purple` | 631 |  |
| `explosive_paint_quick_red` | 630 |  |
| `explosive_paint_quick_white` | 629 |  |
| `explosive_paint_quick_yellow` | 628 |  |
| `explosive_paint_red_side` | 600 |  |
| `explosive_paint_red_top` | 601 |  |
| `explosive_paint_seeking_black` | 659 |  |
| `explosive_paint_seeking_blue` | 658 |  |
| `explosive_paint_seeking_brown` | 657 |  |
| `explosive_paint_seeking_cyan` | 656 |  |
| `explosive_paint_seeking_gray` | 655 |  |
| `explosive_paint_seeking_green` | 654 |  |
| `explosive_paint_seeking_light_blue` | 653 |  |
| `explosive_paint_seeking_light_gray` | 652 |  |
| `explosive_paint_seeking_lime` | 651 |  |
| `explosive_paint_seeking_magenta` | 650 |  |
| `explosive_paint_seeking_orange` | 649 |  |
| `explosive_paint_seeking_pink` | 648 |  |
| `explosive_paint_seeking_purple` | 647 |  |
| `explosive_paint_seeking_red` | 646 |  |
| `explosive_paint_seeking_white` | 645 |  |
| `explosive_paint_seeking_yellow` | 644 |  |
| `explosive_paint_sticky_black` | 675 |  |
| `explosive_paint_sticky_blue` | 674 |  |
| `explosive_paint_sticky_brown` | 673 |  |
| `explosive_paint_sticky_cyan` | 672 |  |
| `explosive_paint_sticky_gray` | 671 |  |
| `explosive_paint_sticky_green` | 670 |  |
| `explosive_paint_sticky_light_blue` | 669 |  |
| `explosive_paint_sticky_light_gray` | 668 |  |
| `explosive_paint_sticky_lime` | 667 |  |
| `explosive_paint_sticky_magenta` | 666 |  |
| `explosive_paint_sticky_orange` | 665 |  |
| `explosive_paint_sticky_pink` | 664 |  |
| `explosive_paint_sticky_purple` | 663 |  |
| `explosive_paint_sticky_red` | 662 |  |
| `explosive_paint_sticky_white` | 661 |  |
| `explosive_paint_sticky_yellow` | 660 |  |
| `explosive_paint_white_side` | 598 |  |
| `explosive_paint_white_top` | 599 |  |
| `explosive_paint_yellow_side` | 596 |  |
| `explosive_paint_yellow_top` | 597 |  |
| `extra_compressed_messy_stone` | 531 |  |
| `fallen_cherry_leaves_side` | 586 |  |
| `fallen_maple_leaves_side` | 478 |  |
| `farmland` | 433 |  |
| `fast_belt_slab_side` | 1157 |  |
| `fast_belt_top` | 1156 |  |
| `fast_belt_turn_left` | 1173 |  |
| `fast_belt_turn_right` | 1174 |  |
| `fertilised_soil` | 926 |  |
| `finish_block` | 812 |  |
| `fireball_block` | 539 |  |
| `food_lucky_block` | 1007 |  |
| `food_lucky_block_rare` | 1009 |  |
| `food_lucky_block_super` | 1011 |  |
| `forge_hopper_top` | 1168 |  |
| `furnace_front` | 335 |  |
| `furnace_side` | 336 |  |
| `furnace_top` | 337 |  |
| `generator_side` | 1063 |  |
| `generator_side_running` | 30 | animated (4 frames) |
| `generator_top` | 1064 |  |
| `ghost_chest_back` | 956 |  |
| `ghost_chest_front` | 953 |  |
| `ghost_chest_side` | 954 |  |
| `ghost_chest_top` | 955 |  |
| `ghost_lucky_block` | 957 |  |
| `ghost_mystery_block` | 958 |  |
| `glass` | 294 |  |
| `glass_black` | 295 |  |
| `glass_blue` | 296 |  |
| `glass_brown` | 297 |  |
| `glass_cyan` | 298 |  |
| `glass_gray` | 299 |  |
| `glass_green` | 301 |  |
| `glass_light_blue` | 302 |  |
| `glass_light_gray` | 300 |  |
| `glass_lime` | 303 |  |
| `glass_magenta` | 304 |  |
| `glass_orange` | 305 |  |
| `glass_pink` | 306 |  |
| `glass_purple` | 307 |  |
| `glass_red` | 308 |  |
| `glass_silver` | 311 |  |
| `glass_white` | 309 |  |
| `glass_yellow` | 310 |  |
| `glowstone` | 331 |  |
| `gold_block` | 235 |  |
| `gold_deposit` | 1036 |  |
| `gold_ore` | 229 |  |
| `granite_brick` | 467 |  |
| `grass_block_side` | 192 |  |
| `grass_top` | 193 |  |
| `gravel` | 196 |  |
| `gray_concrete` | 271 |  |
| `gray_gen_spawn_coal` | 792 |  |
| `gray_gen_spawn_iron` | 793 |  |
| `gray_gen_spawn_top` | 791 |  |
| `gray_glazed_terracotta` | 397 | turned (4 rotated copies) |
| `gray_planks` | 358 |  |
| `gray_portal` | 6 | animated (4 frames) |
| `gray_spawn_block_side` | 740 |  |
| `gray_spawn_block_top` | 736 | turned (4 rotated copies) |
| `green_bricks` | 459 |  |
| `green_concrete` | 285 |  |
| `green_glazed_terracotta` | 421 | turned (4 rotated copies) |
| `green_lucky_block` | 1006 |  |
| `green_lucky_block_rare` | 1008 |  |
| `green_lucky_block_super` | 1010 |  |
| `green_planks` | 364 |  |
| `green_portal` | 7 | animated (4 frames) |
| `green_spawn_block_side` | 735 |  |
| `green_spawn_block_top` | 731 | turned (4 rotated copies) |
| `green_stone` | 458 |  |
| `grenade_block` | 581 |  |
| `grey_portal` | 8 | animated (4 frames) |
| `gun_lucky_block` | 952 |  |
| `hardened_clay` | 254 |  |
| `hardened_clay_stained_black` | 270 |  |
| `hardened_clay_stained_blue` | 266 |  |
| `hardened_clay_stained_brown` | 267 |  |
| `hardened_clay_stained_cyan` | 264 |  |
| `hardened_clay_stained_gray` | 262 |  |
| `hardened_clay_stained_green` | 268 |  |
| `hardened_clay_stained_light_blue` | 258 |  |
| `hardened_clay_stained_lime` | 260 |  |
| `hardened_clay_stained_magenta` | 257 |  |
| `hardened_clay_stained_orange` | 256 |  |
| `hardened_clay_stained_pink` | 261 |  |
| `hardened_clay_stained_purple` | 265 |  |
| `hardened_clay_stained_red` | 269 |  |
| `hardened_clay_stained_silver` | 263 |  |
| `hardened_clay_stained_white` | 255 |  |
| `hardened_clay_stained_yellow` | 259 |  |
| `harvester_bottom` | 969 |  |
| `harvester_lunite_bottom` | 977 |  |
| `harvester_lunite_side_0` | 974 |  |
| `harvester_lunite_side_1` | 975 |  |
| `harvester_lunite_top` | 976 |  |
| `harvester_side0` | 966 |  |
| `harvester_side1` | 967 |  |
| `harvester_top` | 968 |  |
| `hay_block_side` | 328 |  |
| `homestead_core` | 1037 |  |
| `homestead_core_cap` | 1122 |  |
| `homestead_core_crown` | 1121 |  |
| `homestead_core_mid` | 26 | animated (4 frames) |
| `hyper_compressed_messy_stone` | 533 |  |
| `ice` | 326 |  |
| `ice_brick` | 468 |  |
| `iceball_block` | 540 |  |
| `invisible_solid` | 314 |  |
| `iron_block` | 234 |  |
| `iron_chest_back` | 917 |  |
| `iron_chest_front` | 911 |  |
| `iron_chest_side` | 912 |  |
| `iron_chest_top` | 913 | turned (4 rotated copies) |
| `iron_deposit` | 1033 |  |
| `iron_ore` | 228 |  |
| `iron_watermelon_side` | 546 |  |
| `iron_watermelon_top` | 547 |  |
| `jungle_grass_block` | 889 |  |
| `jungle_grass_block_side` | 888 |  |
| `lapis_block` | 236 |  |
| `lapis_ore` | 230 |  |
| `lava` | 1 | animated (8 frames) |
| `leather_block_side` | 908 |  |
| `leather_block_top` | 909 |  |
| `leaves_aspen` | 288 |  |
| `leaves_aspen_autumn` | 910 |  |
| `leaves_cedar` | 470 |  |
| `leaves_cherry` | 585 |  |
| `leaves_cherry_fruity` | 906 |  |
| `leaves_jungle` | 290 |  |
| `leaves_mango` | 894 |  |
| `leaves_mango_fruity` | 907 |  |
| `leaves_maple` | 289 |  |
| `leaves_maple_autumn` | 477 |  |
| `leaves_maple_fruity` | 901 |  |
| `leaves_palm` | 471 |  |
| `leaves_palm_fruity` | 904 |  |
| `leaves_pear` | 525 |  |
| `leaves_pear_fruity` | 905 |  |
| `leaves_pine` | 287 |  |
| `leaves_pine_cone` | 902 |  |
| `leaves_plum` | 469 |  |
| `leaves_plum_fruity` | 903 |  |
| `leaves_spectral` | 831 |  |
| `light_blue_concrete` | 277 |  |
| `light_blue_glazed_terracotta` | 381 | turned (4 rotated copies) |
| `light_blue_lucky_block` | 933 |  |
| `light_blue_planks` | 354 |  |
| `light_blue_spawn_block_side` | 730 |  |
| `light_blue_spawn_block_top` | 726 | turned (4 rotated copies) |
| `light_gray_concrete` | 272 |  |
| `light_gray_glazed_terracotta` | 401 | turned (4 rotated copies) |
| `light_gray_planks` | 359 |  |
| `light_gray_spawn_block_side` | 725 |  |
| `light_gray_spawn_block_top` | 721 | turned (4 rotated copies) |
| `lightblue_portal` | 9 | animated (4 frames) |
| `lightgray_portal` | 10 | animated (4 frames) |
| `lime_concrete` | 278 |  |
| `lime_gen_spawn_coal` | 777 |  |
| `lime_gen_spawn_iron` | 778 |  |
| `lime_gen_spawn_top` | 776 |  |
| `lime_glazed_terracotta` | 389 | turned (4 rotated copies) |
| `lime_planks` | 356 |  |
| `lime_portal` | 11 | animated (4 frames) |
| `lime_spawn_block_side` | 720 |  |
| `lime_spawn_block_top` | 716 | turned (4 rotated copies) |
| `log_ancient_maple` | 1021 |  |
| `log_aspen` | 202 |  |
| `log_cedar` | 201 |  |
| `log_cherry` | 582 |  |
| `log_jungle` | 203 |  |
| `log_mango` | 891 |  |
| `log_maple` | 198 |  |
| `log_palm` | 472 |  |
| `log_pear` | 523 |  |
| `log_pine` | 199 |  |
| `log_plum` | 200 |  |
| `log_spectral` | 828 |  |
| `lucky_block_pink_question` | 959 |  |
| `lucky_block_pink_question_rare` | 1013 |  |
| `lucky_block_pink_question_super` | 1015 |  |
| `lunite_block` | 971 |  |
| `lunite_ore` | 970 |  |
| `machine_bench_side` | 1115 |  |
| `machine_bench_top` | 1116 |  |
| `machine_side` | 1039 |  |
| `magenta_concrete` | 279 |  |
| `magenta_glazed_terracotta` | 377 | turned (4 rotated copies) |
| `magenta_planks` | 353 |  |
| `magenta_portal` | 12 | animated (4 frames) |
| `magenta_spawn_block_side` | 715 |  |
| `magenta_spawn_block_top` | 711 | turned (4 rotated copies) |
| `magma` | 451 |  |
| `mailbox_front` | 571 |  |
| `mailbox_front_full` | 573 |  |
| `mailbox_side` | 572 |  |
| `mango_block_bottom` | 898 |  |
| `mango_block_side` | 896 |  |
| `mango_block_top` | 897 |  |
| `mega_compressed_messy_stone` | 535 |  |
| `melon_side` | 544 |  |
| `melon_top` | 545 |  |
| `melting_ice` | 595 |  |
| `messy_stone` | 216 |  |
| `mob_spawner_block_empty_side` | 823 |  |
| `mob_spawner_block_top` | 821 |  |
| `mob_spawner_hostile_block_side` | 822 |  |
| `mob_spawner_neutral_block_side` | 838 |  |
| `mob_spawner_passive_block_side` | 820 |  |
| `moonstone_block` | 450 |  |
| `moonstone_chest_back` | 449 |  |
| `moonstone_chest_front` | 443 |  |
| `moonstone_chest_side` | 444 |  |
| `moonstone_chest_top` | 445 | turned (4 rotated copies) |
| `moonstone_explosive_side` | 332 |  |
| `moonstone_explosive_top` | 333 |  |
| `moonstone_gen_spawn_side` | 809 |  |
| `moonstone_gen_spawn_top` | 808 |  |
| `moonstone_ore` | 442 |  |
| `mossy_cobblestone` | 438 |  |
| `mushroom_stem` | 538 |  |
| `mystery_block` | 578 |  |
| `neon_black` | 951 |  |
| `neon_blue` | 950 |  |
| `neon_brown` | 949 |  |
| `neon_cyan` | 948 |  |
| `neon_gray` | 947 |  |
| `neon_green` | 946 |  |
| `neon_light_blue` | 945 |  |
| `neon_light_gray` | 944 |  |
| `neon_lime` | 943 |  |
| `neon_magenta` | 942 |  |
| `neon_orange` | 941 |  |
| `neon_pink` | 940 |  |
| `neon_purple` | 939 |  |
| `neon_red` | 938 |  |
| `neon_white` | 937 |  |
| `neon_yellow` | 936 |  |
| `nether_brick` | 317 |  |
| `netherrack` | 318 |  |
| `obby_absorb_block` | 816 |  |
| `obby_absorb_death_block` | 817 |  |
| `obby_death_block` | 815 |  |
| `obsidian` | 327 |  |
| `orange_concrete` | 280 |  |
| `orange_glazed_terracotta` | 373 | turned (4 rotated copies) |
| `orange_lucky_block` | 1000 |  |
| `orange_lucky_block_rare` | 1002 |  |
| `orange_lucky_block_super` | 1004 |  |
| `orange_planks` | 352 |  |
| `orange_portal` | 13 | animated (4 frames) |
| `orange_spawn_block_side` | 710 |  |
| `orange_spawn_block_top` | 706 | turned (4 rotated copies) |
| `ore_gen_spawn_side` | 811 |  |
| `ore_gen_spawn_top` | 810 |  |
| `packed_snow` | 826 |  |
| `parts_bench_side` | 1117 |  |
| `parts_bench_top` | 1118 |  |
| `patterned_glass_black` | 548 |  |
| `patterned_glass_blue` | 549 |  |
| `patterned_glass_brown` | 550 |  |
| `patterned_glass_cyan` | 551 |  |
| `patterned_glass_gray` | 552 |  |
| `patterned_glass_green` | 554 |  |
| `patterned_glass_light_blue` | 555 |  |
| `patterned_glass_light_gray` | 553 |  |
| `patterned_glass_lime` | 556 |  |
| `patterned_glass_magenta` | 557 |  |
| `patterned_glass_orange` | 558 |  |
| `patterned_glass_pink` | 559 |  |
| `patterned_glass_purple` | 560 |  |
| `patterned_glass_red` | 561 |  |
| `patterned_glass_white` | 562 |  |
| `patterned_glass_yellow` | 563 |  |
| `pear_block_bottom` | 529 |  |
| `pear_block_side` | 527 |  |
| `pear_block_top` | 528 |  |
| `pet_lucky_block` | 960 |  |
| `pine_cone_block_side` | 836 |  |
| `pine_cone_block_top` | 837 |  |
| `pine_grass_block` | 834 |  |
| `pine_grass_block_side` | 833 |  |
| `pink_concrete` | 281 |  |
| `pink_gen_spawn_coal` | 789 |  |
| `pink_gen_spawn_iron` | 790 |  |
| `pink_gen_spawn_top` | 788 |  |
| `pink_glazed_terracotta` | 393 | turned (4 rotated copies) |
| `pink_planks` | 357 |  |
| `pink_portal` | 14 | animated (4 frames) |
| `pink_spawn_block_side` | 705 |  |
| `pink_spawn_block_top` | 701 | turned (4 rotated copies) |
| `planks_aspen` | 205 |  |
| `planks_cedar` | 209 |  |
| `planks_cherry` | 584 |  |
| `planks_jungle` | 207 |  |
| `planks_mango` | 893 |  |
| `planks_maple` | 204 |  |
| `planks_palm` | 473 |  |
| `planks_pear` | 524 |  |
| `planks_pine` | 208 |  |
| `planks_plum` | 206 |  |
| `planks_spectral` | 830 |  |
| `plum_block_bottom` | 519 |  |
| `plum_block_side` | 517 |  |
| `plum_block_top` | 518 |  |
| `podzol_top` | 452 |  |
| `potato_block` | 922 |  |
| `potion_lucky_block` | 1012 |  |
| `potion_lucky_block_rare` | 1014 |  |
| `potion_lucky_block_super` | 1016 |  |
| `press_back` | 1071 |  |
| `press_front` | 1065 |  |
| `press_side` | 1066 |  |
| `press_side_running` | 31 | animated (4 frames) |
| `press_top` | 1067 | turned (4 rotated copies) |
| `protector` | 348 |  |
| `protector_faction` | 575 |  |
| `protector_tribe` | 574 |  |
| `pumpkin_face_on` | 291 |  |
| `pumpkin_side` | 541 |  |
| `pumpkin_top` | 542 |  |
| `pure_coal_ore` | 1024 |  |
| `pure_copper_ore` | 1204 |  |
| `pure_diamond_ore` | 1027 |  |
| `pure_gold_ore` | 1026 |  |
| `pure_iron_ore` | 1025 |  |
| `pure_moonstone_ore` | 1028 |  |
| `pure_voltite_ore` | 1205 |  |
| `purple_concrete` | 282 |  |
| `purple_glazed_terracotta` | 409 | turned (4 rotated copies) |
| `purple_lucky_block` | 988 |  |
| `purple_lucky_block_rare` | 990 |  |
| `purple_lucky_block_super` | 992 |  |
| `purple_planks` | 361 |  |
| `purple_portal` | 15 | animated (4 frames) |
| `purple_spawn_block_side` | 700 |  |
| `purple_spawn_block_top` | 696 | turned (4 rotated copies) |
| `quartz_block_chiseled` | 320 |  |
| `quartz_block_side` | 319 |  |
| `radar_bottom` | 929 |  |
| `radar_screen` | 19 | animated (4 frames) · turned (4 rotated copies) |
| `radar_side_active` | 927 |  |
| `radar_side_inactive` | 930 |  |
| `radar_top_active` | 928 |  |
| `radar_top_inactive` | 931 |  |
| `recycler_back` | 1181 |  |
| `recycler_front` | 1175 |  |
| `recycler_side` | 1176 |  |
| `recycler_side_running` | 43 | animated (4 frames) |
| `recycler_top` | 1177 | turned (4 rotated copies) |
| `red_concrete` | 283 |  |
| `red_gen_spawn_coal` | 771 |  |
| `red_gen_spawn_iron` | 772 |  |
| `red_gen_spawn_top` | 770 |  |
| `red_glazed_terracotta` | 425 | turned (4 rotated copies) |
| `red_lucky_block` | 934 |  |
| `red_lucky_block_rare` | 984 |  |
| `red_lucky_block_super` | 986 |  |
| `red_mushroom_block` | 537 |  |
| `red_planks` | 365 |  |
| `red_portal` | 16 | animated (4 frames) |
| `red_sand` | 474 |  |
| `red_sandstone` | 454 |  |
| `red_sandstone_brick` | 475 |  |
| `red_sandstone_top` | 455 |  |
| `red_spawn_block_side` | 695 |  |
| `red_spawn_block_top` | 691 | turned (4 rotated copies) |
| `redstone_lamp_off` | 313 |  |
| `redstone_lamp_on` | 312 |  |
| `rocket_block` | 579 |  |
| `rocky_dirt` | 476 |  |
| `rope_block` | 1030 |  |
| `sand` | 194 |  |
| `sandstone_brick` | 461 |  |
| `sandstone_normal` | 225 |  |
| `sandstone_top` | 324 |  |
| `shatter_mill_back` | 1147 |  |
| `shatter_mill_front` | 1141 |  |
| `shatter_mill_side` | 1142 |  |
| `shatter_mill_side_running` | 40 | animated (4 frames) |
| `shatter_mill_top` | 1143 | turned (4 rotated copies) |
| `shop_trader_spawn_face` | 799 |  |
| `shop_trader_spawn_side` | 798 |  |
| `shop_trader_spawn_top` | 794 | turned (4 rotated copies) |
| `shop_wizard_spawn_face` | 805 |  |
| `shop_wizard_spawn_side` | 804 |  |
| `shop_wizard_spawn_top` | 800 | turned (4 rotated copies) |
| `sky_tap_back` | 1155 |  |
| `sky_tap_bottom` | 1154 |  |
| `sky_tap_front` | 1148 |  |
| `sky_tap_side` | 1149 |  |
| `sky_tap_side_running` | 41 | animated (4 frames) |
| `sky_tap_top` | 1150 | turned (4 rotated copies) |
| `slab_andesite_brick_side` | 498 |  |
| `slab_aspen_side` | 483 |  |
| `slab_brick_side` | 515 |  |
| `slab_cedar_side` | 482 |  |
| `slab_cherry_side` | 587 |  |
| `slab_chiseled_red_sandstone_side` | 512 |  |
| `slab_chiseled_sandstone_side` | 508 |  |
| `slab_cobblestone_side` | 488 |  |
| `slab_cut_red_sandstone_side` | 513 |  |
| `slab_cut_sandstone_side` | 509 |  |
| `slab_diorite_brick_side` | 502 |  |
| `slab_dirt_side` | 486 |  |
| `slab_dry_grass_top_side` | 981 |  |
| `slab_engraved_andesite_side` | 497 |  |
| `slab_engraved_diorite_side` | 501 |  |
| `slab_engraved_granite_side` | 505 |  |
| `slab_granite_brick_side` | 506 |  |
| `slab_grass_top_side` | 487 |  |
| `slab_ice_brick_side` | 516 |  |
| `slab_jungle_grass_top_side` | 890 |  |
| `slab_jungle_side` | 484 |  |
| `slab_mango_side` | 895 |  |
| `slab_maple_side` | 479 |  |
| `slab_mossy_cobblestone_side` | 493 |  |
| `slab_palm_side` | 485 |  |
| `slab_pear_side` | 526 |  |
| `slab_pine_grass_top_side` | 835 |  |
| `slab_pine_side` | 480 |  |
| `slab_plum_side` | 481 |  |
| `slab_red_sandstone_brick_side` | 514 |  |
| `slab_red_sandstone_side` | 511 |  |
| `slab_sandstone_brick_side` | 510 |  |
| `slab_sandstone_normal_side` | 507 |  |
| `slab_smooth_stone_side` | 490 |  |
| `slab_spectral_side` | 832 |  |
| `slab_stone_andesite_side` | 495 |  |
| `slab_stone_andesite_smooth_side` | 496 |  |
| `slab_stone_diorite_side` | 499 |  |
| `slab_stone_diorite_smooth_side` | 500 |  |
| `slab_stone_granite_side` | 503 |  |
| `slab_stone_granite_smooth_side` | 504 |  |
| `slab_stone_side` | 489 |  |
| `slab_stonebrick_carved_side` | 491 |  |
| `slab_stonebrick_mossy_side` | 494 |  |
| `slab_stonebrick_side` | 492 |  |
| `smelter_back` | 1062 |  |
| `smelter_front` | 1056 |  |
| `smelter_side` | 1057 |  |
| `smelter_side_running` | 29 | animated (4 frames) |
| `smelter_top` | 1058 | turned (4 rotated copies) |
| `smoke` | 23 | animated (4 frames) |
| `smooth_stone` | 218 |  |
| `snow` | 197 |  |
| `snowy_messy_stone` | 824 |  |
| `snowy_messy_stone_side` | 825 |  |
| `solar_panel_bottom` | 965 |  |
| `solar_panel_side` | 963 |  |
| `solar_panel_top` | 964 |  |
| `sorting_gate_slab_side` | 1108 |  |
| `sorting_gate_top` | 1107 |  |
| `splitter_slab_side` | 1083 |  |
| `splitter_top` | 1082 |  |
| `sponge` | 329 |  |
| `starframe` | 1167 |  |
| `stone` | 217 |  |
| `stone_andesite` | 221 |  |
| `stone_andesite_smooth` | 222 |  |
| `stone_deposit` | 1034 |  |
| `stone_diorite` | 219 |  |
| `stone_diorite_smooth` | 220 |  |
| `stone_granite` | 223 |  |
| `stone_granite_smooth` | 224 |  |
| `stonebrick` | 316 |  |
| `stonebrick_carved` | 321 |  |
| `stonebrick_cracked` | 323 |  |
| `stonebrick_mossy` | 322 |  |
| `storage_silo_side` | 1112 |  |
| `storage_silo_top` | 1111 |  |
| `stripped_aspen_log` | 211 |  |
| `stripped_cedar_log` | 215 |  |
| `stripped_cherry_log` | 583 |  |
| `stripped_jungle_log` | 213 |  |
| `stripped_mango_log` | 892 |  |
| `stripped_maple_log` | 210 |  |
| `stripped_palm_log` | 576 |  |
| `stripped_pear_log` | 577 |  |
| `stripped_pine_log` | 214 |  |
| `stripped_plum_log` | 212 |  |
| `stripped_spectral_log` | 829 |  |
| `super_compressed_messy_stone` | 532 |  |
| `super_rocket_block` | 580 |  |
| `tool_bench_side` | 1119 |  |
| `tool_bench_top` | 1120 |  |
| `tools_lucky_block` | 1001 |  |
| `tools_lucky_block_rare` | 1003 |  |
| `tools_lucky_block_super` | 1005 |  |
| `toxic_waste` | 25 | animated (8 frames) |
| `toxic_waste_barrel_bottom` | 1020 |  |
| `toxic_waste_barrel_side` | 1019 |  |
| `toxic_waste_barrel_top` | 24 | animated (4 frames) |
| `toxin_ball_block` | 680 |  |
| `tree_cutter_back` | 1129 |  |
| `tree_cutter_back_running` | 37 | animated (4 frames) |
| `tree_cutter_front` | 1123 |  |
| `tree_cutter_side` | 1124 |  |
| `tree_cutter_side_running` | 36 | animated (4 frames) |
| `tree_cutter_top` | 1125 | turned (4 rotated copies) |
| `ultra_compressed_messy_stone` | 534 |  |
| `unloaded` | 189 |  |
| `volt_engine_side` | 1131 |  |
| `volt_engine_side_running` | 38 | animated (4 frames) |
| `volt_engine_top` | 1132 |  |
| `voltite_deposit` | 1130 |  |
| `voltite_ore` | 1084 |  |
| `watermelon_side` | 292 |  |
| `watermelon_top` | 293 |  |
| `weapon_lucky_block` | 935 |  |
| `weapon_lucky_block_rare` | 985 |  |
| `weapon_lucky_block_super` | 987 |  |
| `white_concrete` | 284 |  |
| `white_gen_spawn_coal` | 786 |  |
| `white_gen_spawn_iron` | 787 |  |
| `white_gen_spawn_top` | 785 |  |
| `white_glazed_terracotta` | 369 | turned (4 rotated copies) |
| `white_planks` | 351 |  |
| `white_portal` | 17 | animated (4 frames) |
| `white_spawn_block_side` | 690 |  |
| `white_spawn_block_top` | 686 | turned (4 rotated copies) |
| `wire_mill_back` | 1078 |  |
| `wire_mill_front` | 1072 |  |
| `wire_mill_side` | 1073 |  |
| `wire_mill_side_running` | 32 | animated (4 frames) |
| `wire_mill_top` | 1074 | turned (4 rotated copies) |
| `wool_colored_black` | 253 |  |
| `wool_colored_blue` | 249 |  |
| `wool_colored_brown` | 250 |  |
| `wool_colored_cyan` | 247 |  |
| `wool_colored_gray` | 245 |  |
| `wool_colored_green` | 251 |  |
| `wool_colored_light_blue` | 241 |  |
| `wool_colored_light_grey` | 246 |  |
| `wool_colored_lime` | 243 |  |
| `wool_colored_magenta` | 240 |  |
| `wool_colored_orange` | 239 |  |
| `wool_colored_pink` | 244 |  |
| `wool_colored_purple` | 248 |  |
| `wool_colored_red` | 252 |  |
| `wool_colored_white` | 238 |  |
| `wool_colored_yellow` | 242 |  |
| `yellow_concrete` | 286 |  |
| `yellow_gen_spawn_coal` | 780 |  |
| `yellow_gen_spawn_iron` | 781 |  |
| `yellow_gen_spawn_top` | 779 |  |
| `yellow_glazed_terracotta` | 385 | turned (4 rotated copies) |
| `yellow_lucky_block` | 932 |  |
| `yellow_lucky_block_rare` | 982 |  |
| `yellow_lucky_block_super` | 983 |  |
| `yellow_planks` | 355 |  |
| `yellow_portal` | 18 | animated (4 frames) |
| `yellow_spawn_block_side` | 685 |  |
| `yellow_spawn_block_top` | 681 | turned (4 rotated copies) |

### 68.3 Повёрнутые семейства (57 корней)

Эти текстуры существуют только как заранее повёрнутые копии (`name[rot[1..4`); реестр сворачивает их к корню, а `bloxdTexel` заново применяет поворот (§57.4).

- `alloy_kiln_top` (id 1087)
- `auto_bench_top` (id 1102)
- `belt_tunnel_exit_top` (id 1200)
- `belt_tunnel_top` (id 1195)
- `black_glazed_terracotta` (id 429)
- `black_spawn_block_top` (id 756)
- `blue_glazed_terracotta` (id 413)
- `blue_spawn_block_top` (id 751)
- `brown_glazed_terracotta` (id 417)
- `brown_spawn_block_top` (id 746)
- `burner_drill_top` (id 1043)
- `checkpoint_block` (id 761)
- `chest_top` (id 343)
- `crop_harvester_top` (id 1188)
- `crusher_top` (id 1051)
- `crystal_vat_top` (id 1162)
- `custom_lobby_block_top` (id 765)
- `cyan_glazed_terracotta` (id 405)
- `cyan_spawn_block_top` (id 741)
- `deep_drill_top` (id 1135)
- `electric_drill_top` (id 1094)
- `gray_glazed_terracotta` (id 397)
- `gray_spawn_block_top` (id 736)
- `green_glazed_terracotta` (id 421)
- `green_spawn_block_top` (id 731)
- `iron_chest_top` (id 913)
- `light_blue_glazed_terracotta` (id 381)
- `light_blue_spawn_block_top` (id 726)
- `light_gray_glazed_terracotta` (id 401)
- `light_gray_spawn_block_top` (id 721)
- `lime_glazed_terracotta` (id 389)
- `lime_spawn_block_top` (id 716)
- `magenta_glazed_terracotta` (id 377)
- `magenta_spawn_block_top` (id 711)
- `moonstone_chest_top` (id 445)
- `orange_glazed_terracotta` (id 373)
- `orange_spawn_block_top` (id 706)
- `pink_glazed_terracotta` (id 393)
- `pink_spawn_block_top` (id 701)
- `press_top` (id 1067)
- `purple_glazed_terracotta` (id 409)
- `purple_spawn_block_top` (id 696)
- `radar_screen0` (id 19) · also animated
- `recycler_top` (id 1177)
- `red_glazed_terracotta` (id 425)
- `red_spawn_block_top` (id 691)
- `shatter_mill_top` (id 1143)
- `shop_trader_spawn_top` (id 794)
- `shop_wizard_spawn_top` (id 800)
- `sky_tap_top` (id 1150)
- `smelter_top` (id 1058)
- `tree_cutter_top` (id 1125)
- `white_glazed_terracotta` (id 369)
- `white_spawn_block_top` (id 686)
- `wire_mill_top` (id 1074)
- `yellow_glazed_terracotta` (id 385)
- `yellow_spawn_block_top` (id 681)

### 68.4 Анимированные семейства (42 имени)

Сэмплирование этих имён автоматически возвращает текущий кадр анимации (§63.3) — кадровые суффиксы являются ошибкой.

| Имя | Кадры | База реестра |
|---|---|---|
| `lava` | 8 | `lava0` |
| `toxic_waste` | 8 | `toxic_waste0` |
| `alloy_kiln_side_running` | 4 | `alloy_kiln_side_running0` |
| `auto_bench_side_running` | 4 | `auto_bench_side_running0` |
| `black_portal` | 4 | `black_portal0` |
| `blue_portal` | 4 | `blue_portal0` |
| `brown_portal` | 4 | `brown_portal0` |
| `burner_drill_side_running` | 4 | `burner_drill_side_running0` |
| `crop_harvester_back_running` | 4 | `crop_harvester_back_running0` |
| `crop_harvester_side_running` | 4 | `crop_harvester_side_running0` |
| `crusher_side_running` | 4 | `crusher_side_running0` |
| `crystal_vat_side_running` | 4 | `crystal_vat_side_running0` |
| `cyan_portal` | 4 | `cyan_portal0` |
| `deep_drill_side_running` | 4 | `deep_drill_side_running0` |
| `electric_drill_side_running` | 4 | `electric_drill_side_running0` |
| `generator_side_running` | 4 | `generator_side_running0` |
| `gray_portal` | 4 | `gray_portal0` |
| `green_portal` | 4 | `green_portal0` |
| `grey_portal` | 4 | `grey_portal0` |
| `homestead_core_mid` | 4 | `homestead_core_mid0` |
| `lightblue_portal` | 4 | `lightblue_portal0` |
| `lightgray_portal` | 4 | `lightgray_portal0` |
| `lime_portal` | 4 | `lime_portal0` |
| `magenta_portal` | 4 | `magenta_portal0` |
| `orange_portal` | 4 | `orange_portal0` |
| `pink_portal` | 4 | `pink_portal0` |
| `press_side_running` | 4 | `press_side_running0` |
| `purple_portal` | 4 | `purple_portal0` |
| `radar_screen` | 4 | `radar_screen0[rot[1` |
| `recycler_side_running` | 4 | `recycler_side_running0` |
| `red_portal` | 4 | `red_portal0` |
| `shatter_mill_side_running` | 4 | `shatter_mill_side_running0` |
| `sky_tap_side_running` | 4 | `sky_tap_side_running0` |
| `smelter_side_running` | 4 | `smelter_side_running0` |
| `smoke` | 4 | `smoke0` |
| `toxic_waste_barrel_top` | 4 | `toxic_waste_barrel_top0` |
| `tree_cutter_back_running` | 4 | `tree_cutter_back_running0` |
| `tree_cutter_side_running` | 4 | `tree_cutter_side_running0` |
| `volt_engine_side_running` | 4 | `volt_engine_side_running0` |
| `white_portal` | 4 | `white_portal0` |
| `wire_mill_side_running` | 4 | `wire_mill_side_running0` |
| `yellow_portal` | 4 | `yellow_portal0` |

### 68.5 Дрейф реестра, измерено (sjr0p7 → cnty9)

Два билда, измеренных в октябре с интервалом в десять дней:

- Entries: 1,200 → 1,219 (98 added, 79 removed)
- Names that kept their spelling: 1,121 — of which **779 changed id** (69%)
- A naming convention migrated mid-month: 68 `_rot1..4` suffix names became `[rot[1..4` slots, and the double-chest textures (`chest_double_*`, 8 entries) appeared with them
- The usable-name count moved 900 → 905, and the registry hash in `HEADER_VERSION` (§65.1) re-invalidated every saved pack that had baked ids

Write `bloxdTextureIdLava`, not `19` — a name-constant survives every one of those bullets unchanged.

[← Previous part](10-apiv4.md)·[Back to the manual](README.md)
