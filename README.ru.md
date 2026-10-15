# Создание шейдер-паков для Bloxd.io (Полное руководство)

Самодостаточное руководство по созданию и распространению шейдер-паков для Bloxd.io (только WebGPU-рендер).
Основано на спецификации `apiVersion: 2`. Включает рецепты и справочник API: с одним этим файлом можно пройти путь от нуля до публикации. Паки v1 текущей игрой не загружаются (значения `apiVersion` v1 и старые идентификаторы отклоняются). Миграцию с v1 см. в части VIII.

> Это неофициальное руководство, оно не выражает позицию разработчиков. API может измениться без предупреждения.  
> Последняя проверка: 2026-10-15 (порядок наложения тумана, реальные настройки тумана и подводный рендеринг сверены с реализацией рендера). Поскольку публичного официального справочника по WGSL API найти не удалось, продолжайте сверять описания и рецепты с экраном загрузки и компиляцией в игре.  
> Функция шейдер-паков — официальная функция из интерфейса игры, а паки — чистый WGSL  
> (без выполнения JS и сети), так что обычный код безопасен.  
> Руководство создано при помощи ИИ; точность не гарантируется. Проверяйте по фактическому поведению в игре.

## Содержание

- [Часть I: Создание паков](#часть-i-создание-паков)
- [Часть II: Справочник API](#часть-ii-справочник-api)
- [Часть III: Сборник рецептов](#часть-iii-сборник-рецептов)
- [Часть IV: Руководство по реализму](#часть-iv-руководство-по-реализму)
- [Часть V: Решение проблем и замечания](#часть-v-решение-проблем-и-замечания)
- [Часть VI: Важные замечания по реализации](#часть-vi-важные-замечания-по-реализации)
- [Часть VII: Приложение по внутрянке](#часть-vii-приложение-по-внутрянке)
- [Часть VIII: руководство по миграции на API Version 2](#часть-viii-руководство-по-миграции-на-api-version-2)

---

# Часть I: Создание паков

## 1. Обзор и требования

- Шейдер-паки работают **только на WebGPU-рендере**. Пока пак установлен, WebGPU-рендер принудительно включается в настройках
- Паки пишутся на **ограниченном подмножестве WGSL**. Они влияют только на вид **террейна и жидкостей**
- Что можно: менять цвета, прозрачность и свечение; перестраивать освещение; тени в стиле проекции (R9.12); анимация вершин (только в некоторых играх)
- Что нельзя: добавлять/читать текстуры, постобработка (блум и т.п.), попиксельные тени, вращающиеся за солнцем (карты теней) и настоящие отражения (SSR), влияние на небо и сущностей
- Что можно (но легко упустить): **тени в стиле проекции через `skyLight` (воксельное затенение неба)** — можно заметно затемнять места под деревьями и крышами (R9.12). Разрушение блоков заставляет LightEngine мгновенно пересчитывать, так что тени следуют в реальном времени
- **Большинство игр работает в строгом (strict) режиме** (без анимации вершин, без `discard`). Паки для широкого распространения проектируйте под strict-режим

## 2. Быстрый старт

1. Создайте папку, положите в неё `pack.json` и `.wgsl`-файлы
2. Загрузите zip или папку через настройки игры → Shader Pack
3. Исправьте ошибки и загрузите снова (см. часть V)
4. Проверьте в поддерживаемых играх
5. Когда готово, упакуйте в zip и распространяйте

## 3. Структура пака

- **Форма распространения**: один `.zip` или папка (загрузка папки — только десктопные браузеры)
- **Содержимое**: один `pack.json` (в корне пака; регистр не важен) + 1–256 файлов `.wgsl`
- Несколько `.wgsl` склеиваются и считаются одним модулем, так что разбиение и подпапки свободны. Ограничений на имена нет. Не-`.wgsl` файлы (README и т.п.) игнорируются
- Совет по упаковке: если в zip всё лежит под одной общей корневой папкой, этот префикс снимается автоматически (zip из macOS «Сжать» работают как есть). Но лишние файлы в корне ломают определение верхнего уровня; надёжнее зайти внутрь папки и упаковать `pack.json` и `.wgsl` напрямую (убедитесь, что `pack.json` в корне ZIP)

| Пункт | Лимит |
|---|---|
| размер zip / число записей | 32MB / 1024 |
| размер pack.json | 64KB, UTF-8 |
| суммарный размер .wgsl | 256KB, UTF-8 |
| формат zip | zip64, многотомные и шифрованные отклоняются |

## 4. pack.json

```json
{
  "apiVersion": 2,
  "name": "My Pack",
  "author": "your name"
}
```

| Поле | Обязательно | Описание |
|---|---|---|
| `apiVersion` | обязательно | Должно в точности совпадать с `2`. Паки с `1` отклоняются с `shaderPack:loadWrongApiVersion` |
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
2. Проверьте статус. Успех — "Ready to use". При "Saved, but it won't run until you fix these errors..." исправьте перечисленные ошибки (файл:строка + вариант) и загрузите снова
3. Перезагрузите страницу для активации. Предварительно уберите override'ы рендера из URL-параметров и localStorage, иначе пак откажется стартовать
4. Сначала проверьте в permissive-играх, затем в strict-играх (их большинство). Анимация вершин работает только в allow-играх
5. Для распространения упакуйте с `pack.json` наверху (в лимитах раздела 3). Перезагрузка того же экрана заменяет пак; Remove Pack удаляет. Перепроверка после обновлений игры запускается сама при загрузке страницы

# Часть II: Справочник API

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
- `bloxdSunDirection()` — единичный вектор, пока есть солнце; ноль, когда в небе нет солнца. **Луна всегда `-bloxdSunDirection()`** (движок считает позицию луны точной противоположностью солнца). Но в дефолтных мирах солнце статично, и луна тоже — движущаяся луна важна лишь в мирах с циклом день/ночь (см. часть VII, раздел 24)
- ※Дополнение: раньше писалось «при нуле переиспользовать как лунное направление нельзя». Само направление доступно через `-bloxdSunDirection()`, но дистрибутивные паки должны ветвиться через `sunPresent` исходя из нуля (про синий ambient-псевдовид см. R2, про направленный лунный свет — часть VII R-A)
- `emission` добавляется после расчёта освещения, ослабляясь на **`fogVisibility`** (реализация defaultLight `engineColour + emission × fogVisibility`. В полностью затуманенной дали свечение тоже гаснет)
- **Порядок наложения тумана**: обработка фрагмента идёт ① компоновка освещения/эмиссии → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ вызов light-хука → ⑤ return. Значит **engineColour приходит уже затуманенным**, а **возврат light-хука становится итоговым цветом как есть** (после хука туман не накладывается заново)
- **Источник fogVisibility**: дистанция в пространстве вида (считается повершинно, интерполируется). В linear-режиме `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **При fogMode == 0**: `fogColour` приходит как `vec3f(0.0)` (чёрный). Код, оценивающий время суток по оттенку fogColour, пусть осторожничает
- **Реальные настройки тумана текущих сборок**: **linear фиксирован**. `fogStart` = дистанция чанков, `fogEnd` = +1 чанк (только горизонт). При выключенном тумане выставлено 100 / 101 чанков, фактически выключен. Дефолтный цвет тумана RGB(183, 191, 195)
- Uniform `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) — **только для использования через функции заголовка**. Напрямую из паков не ссылайтесь. Stage-видимость — VERTEX|FRAGMENT, поэтому функции заголовка можно вызывать и из функций уровня модуля вне хуков, и из vertex-хуков. Текстура глубины (binding 1) — только FRAGMENT, поэтому `bloxdOpaqueBehind()` ограничен хуками surface / light
- **`skyLight` / `blockLight` / `heldLight` приходят после «lift-кривой»**. `tone-mapped` в комментариях заголовка — про это: движок всегда применяет `y = 1-(1-x/(3-2x))³` (S-кривая, поднимающая тёмные места) к фрагментам перед передачей пакам. Это не сырые воксельные значения (n/15); напр. под деревом (сырое 0.87) приходит поднятым до **0.97**
- `skyLight` по сути — воксельные данные затенения «видно ли отсюда небо» (= карта теней), а не просто параметр яркости (см. раздел 15 «Правда о тенях»)
- **Можно стартовать с `litColour`**: в v1 был лишь готовый затуманенный `engineColour`, и свои атмосферные эффекты давали двойной туман. В v2 стартуйте с до-туманного, до-эмиссионного `litColour` и накладывайте туман своим темпом через `bloxdApplyFog()`
- **`blockId` различает типы блоков**: идентификация независимо от цвета текстуры. Но таблица соответствия ID и типов блоков — внутри движка, так что какой ID какому блоку — измеряйте в мире (см. часть VIII)
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

---

# Часть III: Сборник рецептов

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

> В этом API `bloxdSunDirection()` равен нулю, когда в небе нет солнца. Ниже — не направленный лунный свет, лишь слабое синее окружение, когда небо тёмное. Само лунное направление доступно через `-bloxdSunDirection()` (только миры с циклом день/ночь. Часть VII R-A).

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

> В v1 глубину сцены и положение дна запросить было нельзя: настоящая глубина воды одним этим API не вычислялась. В v2 только для жидкостей `bloxdOpaqueBehind()` меряет толщину до непрозрачной грани позади (часть VIII R-E). Ниже — старый псевдоэффект без него: `s.position.y` — локальная координата, и в сыром виде эффект уплывёт вместе с origin чанка. Ниже — лишь изменение alpha по мировой высоте, псевдоэффект, а не мелководье по берегам/дну. `packWaterReferenceY` подгоните под высоту своего мира.

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

> В отличие от тумана (замена цвета), наслоение «обесцвечивания вдаль» делает дали куда реалистичнее.  
> Осторожно: снижайте только насыщенность — яркость не трогайте.

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
> Реальные настройки тумана (сверены с реализацией): linear фиксирован / `fogStart` = дистанция чанков / `fogEnd` = +1 чанк / при выключенном тумане 100–101 чанков, фактически выключен / дефолтный цвет RGB(183, 191, 195).

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
> ⚠️ «Углубить контраст через `pow(skyLight, γ)`» **применяло гамму к поднятым значениям** и никогда не трогало места под деревьями (0.97). Используйте этот метод вместо него.

---

# Часть IV: Руководство по реализму

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
4. **Без направления солнца**: при нулевом `bloxdSunDirection()` направленный спекуляр не считайте. `l.directional` — скаляр количества света, а не вектор направления: направление блика не восстановит. При нужде переключайтесь на слабый ненаправленный ambient. Лунное направление доступно через `-bloxdSunDirection()` (движется лишь в мирах с циклом день/ночь. Часть VII R-A)

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
| Подводная рефракция | Цвета сцены нет. Жидкостная глубина (`bloxdOpaqueBehind()`) даёт поглощение по толщине и проекцию дна (часть VIII R-E) |
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
- Ночью остаются только освещённые грани → затемняйте не только тени; гасите весь готовый цвет (`engineColour`) ночью. Локальные лампы щадите слабее через `blockLight` / `heldLight` (часть VI, раздел 19)
- Тень не углубляется через `pow(skyLight, γ)` → `l.skyLight` пост-кривая (раздел 10). Переходите на инверсию + порог R9.12
- Настроить площадь/плотность тени → гайд настройки R9.12 (площадь = порог `shTh` / кромка = `shSoft` / темнота ядра = двухточечный сдвиг минимального ambient и небесного рассеяния)

---

# Часть V: Решение проблем и замечания

## 17. Частые ошибки и фиксы

| Симптом | Фикс |
|---|---|
| Не грузится в strict-играх | Оберните vertex-хук в `#ifndef BLOXD_STRICT` |
| `.alpha` заявлен как неопределённый | Оберните в `#ifdef BLOXD_ALPHA` |
| `blockLight` заявлен как неопределённый | Оберните в `#ifdef BLOXD_LIGHTING`. Общие helper-функции оборачивайте **целыми функциями** (в v2 поля есть всегда, так что обычно не случается. Guard'ы для детектирования оставляйте) |
| `Packs can't construct BloxdSurface directly` | Начинайте с `bloxdDefaultSurface(s)` |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | Оберните в `#ifndef BLOXD_STRICT` |
| Белая молочная даль | Чаще двойной туман. Готовый цвет уже с туманом: свой держите сдержанно и лучше снижайте только saturation |
| Пак исключили при входе в игру | Падает live-проверка игры. Проверьте пропуски guard'ов |
| `pack.json needs "apiVersion": 2.` | Нет `apiVersion` или не `2`. Впишите число `2` (строка `"2"` отклоняется). Паки v1 отклоняются с `shaderPack:loadWrongApiVersion` |
| `There's no pack.json at the top of the pack.` | Нет `pack.json` в корне ZIP. Проверьте, не упаковали ли саму папку |
| `bloxdTerrainVertex must be declared as: fn ...` | Сигнатура отличается. Перепишите в точности как показано |
| `bloxdTerrainVertex can't run in strict games...` | Оберните vertex-хук в `#ifndef BLOXD_STRICT` |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | Оберните в `#ifdef BLOXD_LIGHTING` (в v2 поля есть всегда, так что обычно не случается) |
| Крутите `pow(l.skyLight, γ)` — тени не углубляются никогда | `skyLight` — значение пост-кривой (сырое 0.87 приходит как 0.97). Переходите на инверсию лифта + порог R9.12 (раздел 10) |
| `... can only be a function's parameter or return type, ...` | Неинициализированный `var x: BloxdSurface;` отклоняется. Стройте от `bloxdDefault*` |
| `bloxdPackInputs isn't part of the bloxd_ header` | Uniform PackInputs нельзя ссылать из паков напрямую. Используйте через функции заголовка вроде `bloxdTime()` |
| `Packs can't declare bloxd_ names...` | Уберите префикс `bloxd_` из своих идентификаторов. Определять можно лишь 6 имён хуков |
| `loadDuplicateManifest` при загрузке zip | Два `pack.json` (включая регистровые варианты). Оставьте один |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Переписывайте от `bloxdDefaultSurface(s)` и т.д. Старт с копии первого параметра light-хука (`var out = s;`) тоже годится |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` невозможен. Пишите `_ = f();` |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | Оборачивайте вызовы `bloxdOpaqueBehind()` в хуках террейна в `#ifdef BLOXD_SCENE_DEPTH` |
| `...only surface and light hooks can use.` | Уберите `bloxdOpaqueBehind()` из vertex-хуков (только surface / light) |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Не ошибка, а автодеактивация в strict-играх (`shaderPack:offInStrict`). Оборачивайте vertex-хуки и `discard` в `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Ошибка второй ступени (браузерный Tint). Операнды `^` `&` `\|` `<<` `>>` берите в скобки (§38) |

## 18. Права и замечания

- Функция шейдер-паков — официальная функция, загружаемая из интерфейса игры, и создание паков считается предусмотренным использованием. Но подтверждённой публичной официальной документации нет
- Паки — чистый WGSL: выполнение JS и доступ к сети невозможны по конструкции
- Это неофициальное руководство, а не официальная позиция разработчиков. API может измениться без уведомления

---

# Часть VI: Важные замечания по реализации

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

Этот API не умеет сэмплить цвет сцены: это **псевдо-стилизация смешением цвета по френелю и солнечными бликами, а не настоящее отражение/преломление** (математика глубины стала возможна в v2 с `bloxdOpaqueBehind()`, вынесена в часть VIII R-E). Сэмпл сохраняет базовый цвет, подмешивает немного к небесному на скользящих углах и добавляет маленький глиттер только при солнце.

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
- Хотите настоящие отражения пейзажа: во входах этого API нет цвета экрана, смешением цветов настоящее отражение не получить (глубина доступна только для жидкостей. Часть VIII R-E).

Этот рецепт **заменяет** существующий `bloxdLiquidLight`. Не клейте его рядом с одноимённой волновой функцией из R9.7 и другими одноимёнными хуками.

## 21. Чеклист тестов в игре

Успех компиляции и «красивый вид» — разные вещи. Проверяйте в этом порядке:

1. **Загрузка:** `pack.json` в корне ZIP; настройки показывают `Ready to use`.
2. **8 вариантов:** без пропусков типовых guard'ов в strict / allow, свет вкл / выкл, террейн / жидкость. Даже если игра использует лишь часть условий, дистрибутивные паки должны исходить из всех 8.
3. **День:** цвета по материалам не выжжены (трава, камень, песок, дерево); естественный свето-теневой перепад верхов и боков.
4. **Ночь:** сравните те же материалы при былом свете, тени и близость факелов. Остаются только освещённые грани — крутите затухание экспозиции; всё темно — крутите защиту локального света.
5. **Вода:** смотрите сверху, под скользящими углами, берега, из-под воды и ночью по отдельности. Поведение alpha и подводный вид зависят от композита игры — никогда не судите с одной точки зрения. Под водой вуаль definition-жидкости кроет спереди, как выше: различия пака видны в основном на поверхности и террейне сквозь вуаль.
6. **Границы и даль:** без скачков волн/узоров на переходах чанков / origin; без двойного тумана и белой дымки вдали.
7. **Производительность:** тяжёлые по hash/тригонометрии/`pow` на фрагмент эффекты — по минимуму. Добавляйте детали постепенно и сравнивайте FPS.

### Известные ограничения как premises

- Паки ограничены хуками террейна / жидкостей — небо, сущности и UI тем же кодом не обрабатываются.
- Нет входов, чтобы добавить карты теней, screen-space-отражения, рефракцию, блум и т.д. (глубина сцены разблокирована только для жидкостей как `bloxdOpaqueBehind()`. См. часть VIII).
- `bloxdTime()` — время анимации без гарантированной связи с днём/ночью игры.
- При нулевом `bloxdSunDirection()` истинное направление луны неизвестно, не «лунная физика» а приближение настроения. Направленный лунный свет строится из `-bloxdSunDirection()` (лишь миры с циклом день/ночь. Часть VII R-A).
- `s.position` / `l.position` — локальные координаты: прибавляйте `bloxdOriginOffset()` для эффектов, зависящих от мира. Для внутриблочных локальных узоров локальные координаты — осознанный инструмент.

## 22. Комбинирование с другими паками, когда один шейдер упёрся в предел

Так как паки не могут добавлять или сэмплить текстуры, не пытайтесь решить мелкие рельефы материалов или картинки неба одними шейдерами. Публичный репозиторий текстурных паков для Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) ведёт текстуры, скайбоксы, модели и т.д. другим путём.

Для справки: разобранные в одном случае «cinematic shader»-раздачи сообщества оказались текстурными паками (текстуры 128x128 без `pack.json` / `.wgsl`).

На практике **свет и цвет крутите шейдерами, а материалы и небо закрывайте парным ресурс-паком**. Но со-использование и порядок загрузки сверяйте с реализацией игры и настройками.

На практике **свет и цвет крутите шейдерами, а материалы и небо закрывайте парным ресурс-паком**. Но со-использование и порядок загрузки сверяйте с реализацией игры и настройками.

## 23. Подводная реальность с шейдер-паками

Подводные виды состоят из 3 слоёв:

| Слой | Содержимое | Управляется из паков? |
|---|---|---|
| ① Рендер террейна/жидкости | Обрабатывается хуками. Light-хуки под водой вызываются штатно | Да (работает «под вуалью») |
| ② Вуаль definition-жидкости | Эмиссивный фулскрин-квад из definition-цвета/альфы жидкостного блока камеры, рисуемый вне пайплайнов хуков (самым передним). Игровая настройка `cameraTint` побеждает, если задана | Нет (ни цвет, ни плотность не меняются) |
| ③ cameraTint | Настройка игры | Нет |

Практические пункты: паки продолжают работать под водой / вуаль не снять / под водой не разветвиться (fogStart / fogEnd / fogColour под водой не меняются: fogVisibility её тоже не детектирует).

---

# Часть VII: Приложение по внутрянке

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

Расчёт тумана всегда LINEAR-режим (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), при `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = настройка тумана; лишь D = 0 особенный с fogEnd = 5). **Градиентная полоса лишь 32 блока**, и `l.fogVisibility` — меньше «дымка по дистанции», а **нормированная дистанция до края загруженного мира**. Варьируется от игрока с дистанцией загрузки: дистанционные эффекты пусть сами считают `distance(l.position, bloxdEyePosition())` (рецепт R-B).

Дефолтный цвет тумана `rgb(183, 191, 195)` (бледный сине-серый). Создатели миров меняют его через `fogColourOverride` (hex). При режиме тумана 0 (NONE) **fogColour приходит чёрным**. Стандартная форма `mix(l.fogColour, col, l.fogVisibility)` безопасна, ибо цвет тумана при fogVisibility 1 не используется.

Выставление `showFog` в false отгоняет туман на 3200–3328 блоков, фактически выключая (`fogVisibility ≈ 1` продолжает приходить).

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

При декодировании `aPackedLightLevels` движок кладёт на каждый канал **пол в 35% ярчайшего RGB-канала**. Напр. «чисто красный свет» в вершинах поднимается до (1.00, 0.35, 0) до интерполяции и лифта. Оранжевый факелов, выглядящий «розовато-белым, а не красным», — отсюда: насыщенность тёплых факелов (R9.1) крутите против этого дефолта.

Ручной свет (`heldLight`) с дальностью по ярчайшему каналу (макс 15 блоков) с препроцессом `dist^0.75`, тем же полом 35%, а `l.heldLight` — значение **до** ambient-буста. Кастомные предметы могут фиксировать `spotlightRange` и угол конуса — режим «луч, пока держишь», чей конус следует за камерой. Паки узнать направление луча не могут.

Кастомные блоки могут нести `skyLightEmission` (0–15), который **инжектит в сам канал skyLight, отдельно от BFS blockLight**. Паки в духе R9.12, судящие солнце/тень по порогу skyLight, могут мазать в мирах с искусственно поднятым skyLight. Дистрибутивные паки судят надёжнее в связке с blockLight.

## 27. Детали пайплайна

- **Surface-хуки идут «до» alphaTest**: `out.alpha` кормит тест отброса напрямую. Cutout-материалы (трава, листья) позволяют эффекты растворения типа dither (рецепт R-C). В жидкостях (смешивание) `out.alpha` — настоящая прозрачность (рецепт R-D). На обычном непрозрачном террейне эффекта нет — не перепутайте
- **Содержимое `l.ambient`**: `material.ambient × sceneAmbient`, разное по материалам. Сценовая сторона привязана к графической настройке «Ambient Lighting Intensity» (дефолт 0.5) — никогда не программируйте фиксированные дефолты
- **`bloxdTime()` — реально `performance.now()`**: аптайм браузера, завёрнутый на 1 час. Без связи с днём/ночью игры и прошедшим временем мира. Для анимации, синхронной с игровыми часами, оценивайте время по азимуту `bloxdSunDirection()` в мирах с циклом день/ночь
- Мелкие шахматки на границах чанков при загрузке — чанк-фейд screen-space Bayer 4×4 dither движка, а не баги пака
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

1. **Обычный мир** (дефолтный скайбокс, без оверрайдов) — bloxdSunDirection() есть, дефолтные цвета
2. **Мир со space-скайбоксом** — bloxdSunDirection() = 0. Вид ветки `sunPresent`
3. **Кастомный мир с `visionMinLightColour` / `skyLightColourOverride`** — поднятые темноты и цвета

Главные источники вариации: `lightingOverride` (принудительный свет) / `skyLightColourOverride`, `ambientLightColourOverride` (hex-замены) / `visionMinLightColour` (пол «самого тёмного видимого цвета» на sky и ambient; Night Vision его использует — паки «кромешная пещера» не темнеют как задумано) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (наличие bloxdSunDirection()). `uSkyLightColour` дефолт = (1,1,1) белый, `uAmbientLightColour` дефолт = (0.25,0.25,0.30). `l.ambient` сценовая сторона = графическая настройка «Ambient Lighting Intensity» (дефолт 0.5). `l.fogVisibility` следует настройкам тумана/дистанции чанков игрока.

## 29. Средства отладки

- URL-параметр `?renderer=lite` — форсирует Lite-рендер (`?renderer=webgl2` / `babylon` тоже годятся)
- URL-параметр `?vconsole` — экранная консоль (VConsole). Удобно для проверки на реальном мобильном
- В консоли видны `noa-engine v0.33.0` и `Renderer: lite from <источник>` — проверьте их первым делом, чтобы не ошибиться с трактом рендера
- WebGPU-рендер лочится «форсированно ВКЛ», пока применён пак. Настройка «Disable Block Texture Atlas» тоже лочится (атлас остаётся ВКЛ), а без WebGPU пак вообще не применяется. Основание писать «нужен WebGPU-браузер» на страницах распространения
- Рантайм-перепроверка при каждом входе (`checkCompilation`) компилирует настоящие террейн-материалы в браузерном WebGPU (строже статической проверки настроек). Паки, падающие здесь, исключаются из этой игры

# Часть VIII: руководство по миграции на API Version 2

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

Все три структуры `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` получили `blockId: u32`. Это **ID владеющего блока** (0–65535), единый по всей грани (передаётся с `@interpolate(flat)`). Применяется для идентификации типа блока независимо от цвета текстуры. Но таблица соответствия ID и типов блоков — внутри движка и из паков не видна, так что **какой ID какому блоку — измеряется только в мире**.

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

Применения: поглощение/рассеяние по толщине, проекция ряби-«каустики» из мировых координат дна через `behind.position`, небесное отражение на воде с различением неба и затенения через `found=false`, ступенчатая муть по глубине. Если построение пайплайна копирования глубины не удалось — безопасная деградация к «позади ничего».

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
