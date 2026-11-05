# Ограничения и зарезервированные имена

> Целевой API: 5 · Целевой билд: `bny9u` · Статус: Verified (лимиты v4 переподтверждены байт-в-байт на v5)

Что паки могут писать, и полные правила резервирования имён.

## Разрешено

- встроенные функции WGSL (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select`, …)
- собственные `fn` / `struct` / `const` / `alias` / `var<private>`, `let` внутри функций и управляющие конструкции (if/for/while/switch…)
- производные (`dpdx` / `dpdy` / `fwidth`) только в surface/light-хуках (фрагментная стадия) — не в вершинных хуках
- массивы `const` (цветовые LUT и т.п.), указатели (`ptr<function, T>`), матрицы (`mat3x3f` и т.п.)
- определения флагов `#define NAME` (без значения) + условные конструкции `#ifdef`

## Запрещено / предостережения

- **Никаких текстур напрямую**: объявлять типы `texture_*` / `sampler` нельзя; чтение атласа идёт только через [`bloxdTexel`](texture-api.md). *«Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel.»*
- **`discard` запрещён в strict** — оберните в `#ifndef BLOXD_STRICT`
- `@attributes` / `enable` / `requires` / `override` запрещены — нет `enable f16;`, поэтому **нет типов f16**
- нет `@builtin`, поэтому `fragCoord` / `vertex_index` недоступны
- **нет `let` области модуля** — используйте `const` или `var`
- нет `atomic`
- **никогда не конструируйте выходные структуры напрямую**: `BloxdLight(...)` проваливает статическую валидацию; начинайте от `bloxdDefault*`
- голый `var x: BloxdSurface;` — ошибка валидации
- параметры хуков доступны только на чтение — копируйте перед изменением
- `#define` не принимает значения (только имена)

## Зарезервированные имена

### Префикс bloxd (общее правило)

**Каждый идентификатор, совпадающий с `/^bloxd/i` (без учёта регистра), зарезервирован.** Единственные исключения — 9 имён хук-функций.

Формулировка валидатора, дословно:

> *«Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>»*

### Пространство имён bloxdSp* (46 символов)

46 символов, которые генератор кода может вставить и которые поэтому нельзя переобъявлять:

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

Они покрывают доставку структуры флагов (`bloxdSpFlags`), входы зачарования и модельно-локальные входы (`bloxdSpEnchant` / `bloxdSpItemLocalPosition`), путь текстурного пака с сэмплированием по ячейкам, цепочку поворотов и локальные переменные расширенных хуков. **Правило резервирования на уровне пака шире этого списка** (всё, что совпадает с `/^bloxd/i`), так что запоминать его не нужно — просто никогда не начинайте собственные имена с `bloxd`.

### Имена текстур

Идентификаторы, начинающиеся с `bloxdTextureId`, разрешаются как константы имён текстур ([API текстур](texture-api.md#bloxdtextureid-именованные-константы-текстур)).

## Автоматические перезаписи

- **Инверсия знака Y-производной**: анализатор переписывает каждый вызов `dpdy`, `dpdyCoarse` и `dpdyFine` как `(-dpdy(...))` (семейство dpdy явно перечислено как множество инверсии в проходе перезаписи токенов валидатора). Y в экранных координатах направлена вниз, поэтому эта инверсия приводит «скорость изменения вверх» в соответствие с интуицией. Пишите `dpdy(h)` с намерением «как меняется h, когда я поднимаюсь» — и сгенерированный код понесёт эту инверсию. `dpdx` и семейство `fwidth` не затрагиваются

## Диагностики, которые вы реально увидите

- *«Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>»*
- *«Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel.»*
- *«X reaches bloxdTexel, which only surface and light hooks can use.»*
- *«X reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and Y doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH.»*
- *«BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.»*

## См. также

- [Устранение неполадок: компиляция](../troubleshooting/compilation.md) · [Внутренности движка: валидация шейдеров](../internals/shader-validation.md)
