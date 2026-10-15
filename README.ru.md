# Создание шейдер-паков для Bloxd.io (Полное руководство)

Самодостаточное руководство по созданию и распространению шейдер-паков для Bloxd.io (только WebGPU-рендер).
Основано на спецификации `apiVersion: 1`. Включает рецепты и справочник API: с одним этим файлом можно пройти путь от нуля до публикации.

> Это неофициальное руководство, оно не выражает позицию разработчиков. API может измениться без предупреждения.
> Последняя проверка: 2026-10-15. Поскольку публичного официального справочника по WGSL API найти не удалось, продолжайте сверять описания и рецепты с экраном загрузки и компиляцией в игре.
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
  "apiVersion": 1,
  "name": "My Pack",
  "author": "your name"
}
```

| Поле | Обязательно | Описание |
|---|---|---|
| `apiVersion` | обязательно | Должно в точности совпадать с `1` |
| `name` | обязательно | Непустое. Показывается в интерфейсе настроек |
| `author` | необязательно | Можно опустить. Нестроковые значения (числа и т.п.) — ошибка |

Остальные поля игнорируются.

## 5. Минимальный шаблон

Рабочий пак только из `pack.json` (раздел 4) и этого `pack.wgsl`:

```wgsl
// Минимальный пак с лёгким тёплым оттенком
const packWarmth = 0.18;

fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

Правила:

- Никогда **не конструируйте выходные структуры напрямую** (`bloxd_Surface(...)` — ошибка). Всегда начинайте с `bloxd_defaultSurface(s)` / `bloxd_defaultLight(s, l)` / `bloxd_defaultVertex(v)` и меняйте поля
- Параметры хуков — **только для чтения**. Чтобы менять, сначала скопируйте, напр. `var sv = s;`
- Префикс `bloxd_` запрещён в собственных идентификаторах (кроме 6 имён хуков)
- Константы пишите через `const` (`#define` значений не держит)

## 6. Шесть хуков

Все необязательны. Сигнатуры должны совпадать в точности по типам (имена параметров свободны).

| Хук | Роль |
|---|---|
| `fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex` | Анимация вершин террейна. **В strict-режиме недоступен** |
| `fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface` | Цвет, прозрачность и свечение террейна. `s.colour` — текстура × цвет вершины |
| `fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light` | Итоговый цвет террейна. Вызывается на **финальной стадии фрагмента**, возврат становится итоговым цветом как есть |
| `fn bloxd_liquid_vertex / _surface / _light` (те же формы) | Версии для жидкостей. `alpha` работает как прозрачность жидкости |

Правила fallback:

- Без жидкостного хука **используется одноимённый хук террейна** (наоборот — нет). Один surface даст тот же эффект и жидкостям
- Без light-хука действует поведение по умолчанию (`engineColour + emission × fogFactor`)
- Отбросив `engineColour` ради пересборки из базового цвета, наложите туман сами: `mix(l.fogColour, col, l.fogFactor)`. Добавляя emission, сначала умножайте его на `fogFactor`

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
- Координаты — noa-локальные. Для мировых прибавляйте `originOffset`. Координаты блока: `vec3i(floor(position - normal * 0.5)) + originOffset`

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
// Engine-provided and read-only to packs. apiVersion 1.
struct bloxd_VertexIn {
    position: vec3f,     // noa-local world space (world minus originOffset)
    normal: vec3f,
    originOffset: vec3i, // whole blocks
    time: f32,           // seconds, wrapped every 3600 s (part of the API)
}

#ifndef BLOXD_STRICT
struct bloxd_Vertex {
    position: vec3f,     // noa-local
}
#endif

struct bloxd_SurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher in v1)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    originOffset: vec3i, // a face's world block is vec3i(floor(position - normal * 0.5)) + originOffset
    eyePosition: vec3f,  // noa-local
    time: f32,
    sunDirection: vec3f, // unit, towards the sun, in world orientation; zero when the sky has no sun
}

struct bloxd_Surface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct bloxd_LightIn {
    engineColour: vec3f, // the engine's result for this fragment, from the surface hook's colour
    directional: f32,    // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,      // the material's ambient times the scene's
#ifdef BLOXD_LIGHTING
    blockLight: vec3f,   // voxel block light, tone-mapped
    skyLight: f32,       // voxel sky light, tone-mapped
    ambientLightColour: vec3f,
    skyLightColour: vec3f,
    heldLight: vec3f,    // held light here, tone-mapped like blockLight, before the ambient boost; 0 out of reach
#endif
    fogColour: vec3f,
    fogFactor: f32,      // 1 = no fog, 0 = fully fogged
    position: vec3f,     // as in bloxd_SurfaceIn
    normal: vec3f,
    originOffset: vec3i,
    eyePosition: vec3f,
    time: f32,
    sunDirection: vec3f,
}

struct bloxd_Light {
    colour: vec3f,
}

#ifndef BLOXD_STRICT
fn bloxd_defaultVertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    return bloxd_Vertex(v.position);
}
#endif

fn bloxd_defaultSurface(s: bloxd_SurfaceIn) -> bloxd_Surface {
#ifdef BLOXD_ALPHA
    return bloxd_Surface(s.colour, s.alpha, vec3f(0.0));
#else
    return bloxd_Surface(s.colour, vec3f(0.0));
#endif
}

fn bloxd_defaultLight(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    return bloxd_Light(l.engineColour + s.emission * l.fogFactor);
}
```

Ключевые моменты:

- `time` заворачивается каждые 3600 секунд, это прошедшее время. Синхронизация с внутриигровыми часами дня/ночи не гарантируется.
- `sunDirection` — единичный вектор, пока есть солнце; ноль, когда в небе нет солнца. Данных о направлении луны во входах этого API нет, так что при нуле переиспользовать как лунное направление нельзя.
- `emission` добавляется после расчёта освещения, затем на него ложится туман
- Внутри движка существует uniform `bloxd_packInputs`, но **паки не могут обращаться к нему напрямую**. Значения берите через поля входов хуков (`s.time` и т.д.)
- **`skyLight` / `blockLight` / `heldLight` приходят после «lift-кривой»**. `tone-mapped` в комментариях заголовка — про это: движок всегда применяет `y = 1-(1-x/(3-2x))³` (S-кривая, поднимающая тёмные места) к фрагментам перед передачей пакам. Это не сырые воксельные значения (n/15); напр. под деревом (сырое 0.87) приходит поднятым до **0.97**
- `skyLight` по сути — воксельные данные затенения «видно ли отсюда небо» (= карта теней), а не просто параметр яркости (см. раздел 15 «Правда о тенях»)

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

Формы структур заголовка тоже меняются по вариантам (нет `bloxd_Vertex` в strict, нет `blockLight` и др. в unlit, нет `alpha` в strict-террейне).

## 12. Шпаргалка-скелет

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);          // прямое конструирование запрещено; всегда начинайте с default
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // у террейна alpha есть только в allow
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);         // engineColour + emission*fogFactor
    #ifdef BLOXD_LIGHTING                       // защищайте только lighting-входы
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex всегда с этим guard'ом
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    out.position.y += sin(v.time) * 0.05;
    return out;
}
#endif
```

Пять вещей, которые держите в уме всегда: чисто компилироваться во всех 8 вариантах / strict-игры — большинство / без текстур / параметры хуков только для чтения / никакого `let` на уровне модуля.

---

# Часть III: Сборник рецептов

> **Важно:** рецепты ниже — отдельные примеры, не для склейки сверху вниз. Вставка нескольких определений одного имени хука (`bloxd_terrain_light` и т.п.) или одного имени helper-функции дублирует определения в одном модуле и роняет компиляцию. Для объединения эффектов сливайте их в одну функцию на тип хука.

## R1. Рецепты цвета (surface)

### Один оттенок (самое базовое)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
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
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldY = s.position.y + f32(s.originOffset.y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 1..0 на высоте 0..50
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Покраска по ориентации грани (верх = светлее, стены = темнее)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
    // 0..0.35 своего тумана с 64 до 192 блоков
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### Ночь (синий сдвиг по skyLight + защита ламп)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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

> В этом API `sunDirection` равен нулю, когда в небе нет солнца. Данных о направлении луны нет, так что поверхности к луне определить нельзя. Это не направленный лунный свет — лишь слабое синее окружение, когда небо тёмное.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 у горизонта / 0 в зените
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### Полная замена вывода движка (простейшее переосвещение)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    #ifdef BLOXD_LIGHTING
    // ПРИМЕЧАНИЕ: прямая конструкция bloxd_Light(...) запрещена; переписывайте colour от default
    var out = bloxd_defaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // отбрасываем engineColour (результат освещения движка) и ставим «базовый цвет × своя яркость»
    out.colour = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    return out;
    #else
    return bloxd_defaultLight(s, l);
    #endif
}
```

## R3. Рецепты свечения (emission)

> `emission` добавляется после расчёта освещения, затем на него ложится туман. Умножайте на `fogFactor` свечение, которое должно быть видно издалека.

### Пульсирующие лампы (дышащие факелы)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(l.time * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### Светящаяся руда (светлые материалы светятся)

```wgsl
// сторона surface: чем светлее (белее) материал, тем больше emission
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### Рой светлячков (дрейфующие светящиеся точки)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let world = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    // несколько медленно дрейфующих «световых шаров»; свечение по обратной дистанции
    let t = l.time * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(l.time * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. Рецепты координат (мир / блок / взгляд)

### Мировые координаты

```wgsl
let worldPos = s.position + vec3f(f32(s.originOffset.x), f32(s.originOffset.y), f32(s.originOffset.z));
```

### Координаты блока

```wgsl
let worldBlock = vec3i(floor(l.position - l.normal * 0.5)) + l.originOffset;
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
let viewDir = normalize(l.eyePosition - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### Угол взгляда (доморощенный френель — для жидкостей)

```wgsl
let viewDir = normalize(s.eyePosition - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 в лоб / 0 по касательной
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. Рецепты времени (анимация)

> `time` заворачивается каждые 3600 секунд (1 час). Это прошедшее время шейдера без гарантии синхронизации с днём/ночью игры. Для видимой периодической анимации годится, но для определения настоящей ночи предпочитайте `sunDirection` и lighting-входы.

### Цикл день-ночь (1 сутки в час)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let day = 0.5 + 0.5 * sin(l.time * 6.2831853 / 3600.0);   // 0..1 часовой период; не обязательно синхронен с днём/ночью игры
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
fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldX = s.position.x + f32(s.originOffset.x);
    let worldZ = s.position.z + f32(s.originOffset.z);
    let ripple = sin(s.time * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // у liquid всегда BLOXD_ALPHA — guard по привычке
    #endif
    return out;
}
```

### Псевдопрозрачность по высоте (не настоящий тест мели)

> Глубину сцены и положение дна запросить нельзя: настоящая глубина воды одним этим API не вычисляется. `s.position.y` — локальная координата, и в сыром виде эффект уплывёт вместе с origin чанка. Ниже — лишь изменение alpha по мировой высоте, псевдоэффект, а не мелководье по берегам/дну. `packWaterReferenceY` подгоните под высоту своего мира.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldY = s.position.y + f32(s.originOffset.y);
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
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
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
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let sway = sin(v.time * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // только вертикальные грани
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### Волны жидкости (только верхние грани)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_liquid_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + v.time * 1.6) * 0.5
              + sin(v.position.z * 1.2 + v.time * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### Пульсирующий террейн

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let pulse = sin(v.time * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // лёгкое расширение/сжатие вдоль нормалей
    return out;
}
#endif
```

### Волнующийся террейн (гигантские синусы)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + v.time * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - v.time * 0.7) * 0.3;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    out.colour = s.colour * voxel;
    #endif
    return out;
}
```

### R9.2 Солнечный спекуляр (Blinn-Phong)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // тонкая яркость кромок
    #endif
    return out;
}
```

### R9.4 Полусферическое окружение (небо сверху / отскок земли снизу)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // снизу: отскок
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // сверху: небесный свет
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    out.colour = s.colour * voxel * hemi;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = экспозиция
    return out;
}
```

### R9.6 Воздушная перспектива («воздух» через обесцвечивание вдаль)

> В отличие от тумана (замена цвета), наслоение «обесцвечивания вдаль» делает дали куда реалистичнее.
> Осторожно: снижайте только насыщенность — яркость не трогайте.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
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
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, l.time), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(l.eyePosition - l.position);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // локальные координаты блока
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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

> Полом вида `max(l.fogFactor, 0.25)` задаёт «плотнее этого не будет»
> (0.0 = как у движка / 0.3–0.5 = дали чище).
> Учтите: туман движка — линейный только у горизонта (вблизи дальности прорисовки); среднюю дымку стройте паком.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogFactor, 0.15));  // туман заново (0.15 = лёгкий пол)
    col += s.emission * l.fogFactor;            // emission тоже с туманом
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 Кино-грейд (холодные тени / тёплые света / ночное обесцвечивание)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. восстанавливаем сырые значения (пропустите — теней не будет никогда)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. пороговый срез — чисто разделяем солнце=1 / тень=0
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // солнечный Ламберт (без солнца — fallback на l.directional)
    let sunLen = length(l.sunDirection);
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), l.sunDirection / sunLen), 0.0, 1.0),
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
    col = mix(l.fogColour, col, max(l.fogFactor, 0.15));
    out.colour = clamp(col, vec3f(0.0), vec3f(1.0));
    #endif
    return out;
}
```

> Гайд по настройке: **площадь тени решает только `shTh`** — `0.93` = радиус 1.5+ / `0.87` = радиус 2 / `0.80` = радиус 3 / `0.67` = радиус 5.
> Жёсткость кромки — это `shSoft` (0.02 = жёстко / 0.08 = мягко). Темнота ядра — двухточечный сдвиг `0.09` (минимальный ambient) и `0.16` (рассеянный свет неба).
> Чтобы расширить тени к вечеру, добавьте `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (приближение длинных вечерних теней.
> `sunDir` — это `l.sunDirection / length(l.sunDirection)`). Для более синих теней поднимите B в `vec3f(0.72, 0.82, 1.05)`.
>
> ⚠️ «Углубить контраст через `pow(skyLight, γ)`» **применяло гамму к поднятым значениям** и никогда не трогало места под деревьями (0.97). Используйте этот метод вместо него.

---

# Часть IV: Руководство по реализму

## 13. Штатное освещение движка и запас под реализм

Штатное освещение движка — «только умножение»: specular, fresnel, тепло-холодного разделения и полусферического окружения нет. Перестраивается вот что:

| Функция | По умолчанию | Строится в паках? |
|---|---|---|
| Диффуз (Ламберт) | Только скалярная сумма направленного | ◎ Своё через `sunDirection` (обёртки и т.д.) |
| Спекуляр | Нет | ◎ Blinn-Phong (R9.2) |
| Френель | Нет | ◎ Аппроксимация Шлика (R9.3) |
| Разделение тёплый факел / холодное небо | Бесцветно | ◎ (R9.1) |
| Полусферическое окружение | Без направления | ◎ Небо сверху / земля снизу (R9.4) |
| Тонемаппинг | Нет (только clamp) | ◎ ACES filmic (R9.5) |
| Воздушная перспектива | Только туман (замена цвета) | ◎ Обесцвечивание вдаль (R9.6) |
| Детали поверхности | Только разрешение текстур | △ Процедурный hash-микробамп (R9.8) |
| Волны вершин (вода) | Нет (плоско) | ◎ Только allow (R7) |
| Волновые нормали / солнечный глиттер | Нет | ◎ (R9.7) |
| Ночной лунный свет | Цвет неба просто темнеет | △ Входа направления луны нет: только псевдо-виды (синее окружение в R2 / обесцвечивание в R9.11) |
| Тени (небесное затенение) | Лишь мягкий микс `mix(ambient, sky, skyLight)` | ◎ Инверсия лифта + пороговый срез + солнечный гейт (R9.12). Тень деревьев и подкровельная падают чётко, за правками блоков следуют в реальном времени |

## 14. Две школы реализации

**Школа A: аддитивные правки (от defaultLight)** — берём `engineColour` (готовый цвет) за основу и добавляем тёплое свечение или rim. Легко и безопасно, но модель освещения остаётся штатной.

**Школа B: полное переосвещение (от s.colour)** — отбрасываем `l.engineColour` и пересобираем свет из `s.colour` (альбедо) и сырого LightIn-материала. Настоящий путь к реализму. Четыре правила:

1. **Накладывайте туман заново**: light-хук идёт после тумана; применяйте `mix(l.fogColour, col, l.fogFactor)` сами (R9.10). При густом тумане кладите пол `max(l.fogFactor, 0.3)`. И наоборот: домешивать цвет тумана в паки на engineColour — белый двойной туман
2. **Unlit-фолбэк**: вне `#ifdef BLOXD_LIGHTING` — сквозной проход в `defaultLight`
3. **Общие функции — целиком в guard**: общие функции с параметром `bloxd_LightIn` оборачивайте в `#ifdef BLOXD_LIGHTING` целой fn (защитить только вызовы недостаточно)
4. **Без направления солнца**: при нулевом `sunDirection` направленный спекуляр не считайте. `l.directional` — скаляр количества света, а не вектор направления: направление блика не восстановит. При нужде переключайтесь на слабый ненаправленный ambient

## 15. Недостижимые виды («потолок» реализма)

| Вид | Причина |
|---|---|
| Попиксельные карты теней (тени, вращающиеся за солнцем, полутень) | Текстуры глубины не сослаться. Затенение лучей в хуки не подаётся |
| SSAO | Нет доступа к глубине сцены (только запечённая вершинная AO мешера) |
| SSR (отражения) | То же. Только псевдо-виды с подмесом цвета неба через френель |
| Блум / глэр | Нет хука в постобработку |
| Глубина резкости, хроматическая аберрация, зерно | Нужен полноэкранный постпроцессинг |
| Объёмный свет (god rays) | То же |
| PBR-текстуры | Чтения текстур запрещены. Только псевдо-оценка по яркости цвета |
| Подводная рефракция | Нет входа глубины сцены |
| Подводное детектирование / снятие вуали | Нет поля, показывающего погружение камеры; синяя вуаль вне пайплайнов хуков (фулскрин-квад + подводный скайбокс): ни детектировать, ни снять |

### Правда о тенях — «тени деревьев» делаются

В таблице невозможны только **вращающиеся за солнцем попиксельные карты теней**. Движок считает «тени» с самого начала, и это `skyLight`. Меш-сторона LightEngine работает по майнкрафт-образному алгоритму:

1. **Сканирование столбцов**: каждый столбец (x,z) сверху вниз. Свет неба стартует с 15, на непрозрачных блоках становится **0**, спускаясь с затуханием по `lightFilter` (воздух 1 / вода 3 / непрозрачное 15)
2. **BFS-заливка**: растекается вбок на 6 соседей (-1 за блок) — вот что смягчает кромки теней. Сырое значение под затенением радиуса r равно (15-r)/15
3. blockLight (факелы и т.п.) — отдельный BFS из 3 RGB-каналов (4bit-пак)

То есть `l.skyLight` — не просто параметр яркости, а **воксельные данные затенения «видно ли отсюда небо» = карта теней**. Под деревьями, под крышами и внутри она численно уже низкая и приходит сглаженной вершинной интерполяцией. Ставите/ломаете блоки — мгновенный пересчёт = **тени, следующие в реальном времени**. Ванилла использует её лишь «мягко» через `mix(ambient, sky, skyLight)`.

Правильные инструменты — два шага R9.12 (**восстановить сырые значения инверсией лифта → бинаризовать пороговым `smoothstep`**. `th = 1 - r/15` напрямую крутит «радиус затенения, считаемый тенью») плюс **открыть прямое солнце через sky** (солнце достаёт только туда, где видно небо = суть проекции), с тёплым солнцем / холодной тенью в окраске.

**Честные ограничения**: эти тени опираются на «небо сверху», поэтому **за солнцем не вращаются**. Разрешение — поблочное (мягкие кромки — от BFS-рассеивания). В шаблоне освещения до сих пор лежит закрытый стаб `var shadow: f32 = 1.;` под карты теней (всегда 1.0 = выключен) — читается как след «запланированных» попиксельных вращающихся теней. Если такие тени кровь из носу нужны, остаются лишь вне-API пути (напр. GLSL-инъекция юзерскриптом, с риском по правилам).

## 16. Советы по отладке

- Слишком светлые пещеры → не хватает нелинейной кривой `skyLight` (рецепт пещер R2 / R9.9)
- Выжженные дни → снижайте экспозицию до ACES
- Слишком тёмные ночи → обеспечьте минимальный ambient (ночной `skyLightColour` по условию почти чёрный)
- Слишком дымные дали → снижайте воздушные коэффициенты
- Всё оранжевое вокруг факелов → снижайте тёплую долю (оставьте часть сырого крашеного света)
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
| `blockLight` заявлен как неопределённый | Оберните в `#ifdef BLOXD_LIGHTING`. Общие helper-функции оборачивайте **целыми функциями** |
| `Packs can't construct bloxd_Surface directly` | Начинайте с `bloxd_defaultSurface(s)` |
| `bloxd_Vertex only exists when BLOXD_STRICT isn't defined` | Оберните в `#ifndef BLOXD_STRICT` |
| Белая молочная даль | Чаще двойной туман. Готовый цвет уже с туманом: свой держите сдержанно и лучше снижайте только saturation |
| Пак исключили при входе в игру | Падает live-проверка игры. Проверьте пропуски guard'ов |
| `pack.json needs "apiVersion": 1.` | Нет `apiVersion`. Добавьте число `1` (строка `"1"` отклоняется) |
| `There's no pack.json at the top of the pack.` | Нет `pack.json` в корне ZIP. Проверьте, не упаковали ли саму папку |
| `bloxd_terrain_vertex must be declared as: fn ...` | Сигнатура отличается. Перепишите в точности как показано |
| `bloxd_terrain_vertex can't run in strict games...` | Оберните vertex-хук в `#ifndef BLOXD_STRICT` |
| `bloxd_LightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | Оберните в `#ifdef BLOXD_LIGHTING` |
| Крутите `pow(l.skyLight, γ)` — тени не углубляются никогда | `skyLight` — значение пост-кривой (сырое 0.87 приходит как 0.97). Переходите на инверсию лифта + порог R9.12 (раздел 10) |

## 18. Права и замечания

- Функция шейдер-паков — официальная функция, загружаемая из интерфейса игры, и создание паков считается предусмотренным использованием. Но подтверждённой публичной официальной документации нет
- Паки — чистый WGSL: выполнение JS и доступ к сети невозможны по конструкции
- Это неофициальное руководство, а не официальная позиция разработчиков. API может измениться без уведомления

---

# Часть VI: Важные замечания по реализации

## 19. Чиним «тёмные тени, но светлые поверхности» ночью

Затемнение только теней оставляет готовый цвет движка (`engineColour`) ярким без солнца, и разрыв грань/тень выглядит неестественно. Гасите весь готовый цвет.

Пример трактует нулевой `sunDirection` как ночь, а направленное солнце — как день, гася готовые цвета террейна в тёмные часы. Где сильны `blockLight` и `heldLight`, затухание слабеет, чтобы сберечь ближний свет вроде факелов. `0.52` — настроечное значение, для более тёмных ночей снижайте.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
    out.colour = l.engineColour * scale + s.emission * l.fogFactor;
    return out;
}
```

**Ограничения этого фикса:** если `sunDirection` ведёт себя как «единичное направление при солнце, ноль без него», день/ночь различимы, но сумерки плавно не оценить. А раз гасится готовый цвет, engine-дневной свет и ambient слабеют вместе — не полное воспроизведение времени суток. Чтобы применить то же к жидкостям, проверьте fallback-отношения жидкостных хуков.

## 20. Интегрированный рецепт естественно выглядящей воды

Этот API не умеет сэмплить цвет сцены, глубину и дно: это **псевдо-стилизация смешением цвета по френелю и солнечными бликами, а не настоящая математика отражения/преломления/глубины**. Сэмпл сохраняет базовый цвет, подмешивает немного к небесному на скользящих углах и добавляет маленький глиттер только при солнце.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, l.time), topness));
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
- Хотите настоящие отражения пейзажа: во входах этого API нет цвета экрана и глубины сцены: смешением цветов настоящее отражение не получить.

Этот рецепт **заменяет** существующий `bloxd_liquid_light`. Не клейте его рядом с одноимённой волновой функцией из R9.7 и другими одноимёнными хуками.

## 21. Чеклист тестов в игре

Успех компиляции и «красивый вид» — разные вещи. Проверяйте в этом порядке:

1. **Загрузка:** `pack.json` в корне ZIP; настройки показывают `Ready to use`.
2. **8 вариантов:** без пропусков типовых guard'ов в strict / allow, свет вкл / выкл, террейн / жидкость. Даже если игра использует лишь часть условий, дистрибутивные паки должны исходить из всех 8.
3. **День:** цвета по материалам не выжжены (трава, камень, песок, дерево); естественный свето-теневой перепад верхов и боков.
4. **Ночь:** сравните те же материалы при былом свете, тени и близость факелов. Остаются только освещённые грани — крутите затухание экспозиции; всё темно — крутите защиту локального света.
5. **Вода:** смотрите сверху, под скользящими углами, берега, из-под воды и ночью по отдельности. Поведение alpha и подводный вид зависят от композита игры — никогда не судите с одной точки зрения.
6. **Границы и даль:** без скачков волн/узоров на переходах чанков / origin; без двойного тумана и белой дымки вдали.
7. **Производительность:** тяжёлые по hash/тригонометрии/`pow` на фрагмент эффекты — по минимуму. Добавляйте детали постепенно и сравнивайте FPS.

### Известные ограничения как premises

- Паки ограничены хуками террейна / жидкостей — небо, сущности и UI тем же кодом не обрабатываются.
- Нет входов, чтобы добавить карты теней, screen-space-отражения, глубину сцены, рефракцию, блум и т.д.
- `time` — время анимации без гарантированной связи с днём/ночью игры.
- При нулевом `sunDirection` истинное направление луны неизвестно. Синие ambient-добавки — приближения настроения, а не «лунная физика».
- `s.position` / `l.position` — локальные координаты: прибавляйте `originOffset` для эффектов, зависящих от мира. Для внутриблочных локальных узоров локальные координаты — осознанный инструмент.

## 22. Комбинирование с другими паками, когда один шейдер упёрся в предел

Так как паки не могут добавлять или сэмплить текстуры, не пытайтесь решить мелкие рельефы материалов или картинки неба одними шейдерами. Публичный репозиторий текстурных паков для Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) ведёт текстуры, скайбоксы, модели и т.д. другим путём.

Для справки: разобранные в одном случае «cinematic shader»-раздачи сообщества оказались текстурными паками (текстуры 128x128 без `pack.json` / `.wgsl`).

На практике **свет и цвет крутите шейдерами, а материалы и небо закрывайте парным ресурс-паком**. Но со-использование и порядок загрузки сверяйте с реализацией игры и настройками.

---

Исследовано: ltf_ahel (исследовано с glm)
