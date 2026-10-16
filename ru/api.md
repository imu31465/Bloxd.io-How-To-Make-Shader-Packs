[← Предыдущая часть](making.md)·[Вернуться к руководству](README.md)·[Следующая часть →](recipes.md)

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
- `bloxdSunDirection()` — единичный вектор, пока есть солнце; ноль, когда в небе нет солнца. **Луна всегда `-bloxdSunDirection()`** (движок считает позицию луны точной противоположностью солнца). Но в дефолтных мирах солнце статично, и луна тоже — движущаяся луна важна лишь в мирах с циклом день/ночь (см. [часть VII](internals.md), раздел 24)
- ※Дополнение: раньше писалось «при нуле переиспользовать как лунное направление нельзя». Само направление доступно через `-bloxdSunDirection()`, но дистрибутивные паки должны ветвиться через `sunPresent` исходя из нуля (про синий ambient-псевдовид см. R2, про направленный лунный свет — [часть VII](internals.md) R-A)
- `emission` добавляется после расчёта освещения, ослабляясь на **`fogVisibility`** (реализация defaultLight `engineColour + emission × fogVisibility`. В полностью затуманенной дали свечение тоже гаснет)
- **Порядок наложения тумана**: обработка фрагмента идёт ① компоновка освещения/эмиссии → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ вызов light-хука → ⑤ return. Значит **engineColour приходит уже затуманенным**, а **возврат light-хука становится итоговым цветом как есть** (после хука туман не накладывается заново)
- **Источник fogVisibility**: дистанция в пространстве вида (считается повершинно, интерполируется). В linear-режиме `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **При fogMode == 0**: `fogColour` приходит как `vec3f(0.0)` (чёрный). Код, оценивающий время суток по оттенку fogColour, пусть осторожничает
- **Реальные настройки тумана текущих сборок**: **linear фиксирован**. `fogStart` = дистанция чанков, `fogEnd` = +1 чанк (только горизонт). При выключенном тумане выставлено 100 / 101 чанков, фактически выключен. Дефолтный цвет тумана RGB(183, 191, 195)
- Uniform `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) — **только для использования через функции заголовка**. Напрямую из паков не ссылайтесь. Stage-видимость — VERTEX|FRAGMENT, поэтому функции заголовка можно вызывать и из функций уровня модуля вне хуков, и из vertex-хуков. Текстура глубины (binding 1) — только FRAGMENT, поэтому `bloxdOpaqueBehind()` ограничен хуками surface / light
- **`skyLight` / `blockLight` / `heldLight` приходят после «lift-кривой»**. `tone-mapped` в комментариях заголовка — про это: движок всегда применяет `y = 1-(1-x/(3-2x))³` (S-кривая, поднимающая тёмные места) к фрагментам перед передачей пакам. Это не сырые воксельные значения (n/15); напр. под деревом (сырое 0.87) приходит поднятым до **0.97**
- `skyLight` по сути — воксельные данные затенения «видно ли отсюда небо» (= карта теней), а не просто параметр яркости (см. раздел 15 «Правда о тенях»)
- **Можно стартовать с `litColour`**: в v1 был лишь готовый затуманенный `engineColour`, и свои атмосферные эффекты давали двойной туман. В v2 стартуйте с до-туманного, до-эмиссионного `litColour` и накладывайте туман своим темпом через `bloxdApplyFog()`
- **`blockId` различает типы блоков**: идентификация независимо от цвета текстуры. Но таблица соответствия ID и типов блоков — внутри движка, так что какой ID какому блоку — измеряйте в мире (см. [часть VIII](apiv2.md))
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
