# Входные и выходные структуры

> Целевой API: 5 · Целевой билд: `ab90qa` · Статус: Analyzed (восстановлен дословно из живого заголовка)

Семь структур доступны пакам для чтения и записи. Ниже перечислено каждое поле (поля `#ifdef` — условные). Полный заголовок — в [Внутрянке движка](../internals/engine-header.md).

## BloxdVertexIn (вход вершинного хука)

```wgsl
struct BloxdVertexIn {
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
}
```

| Поле | Тип | Описание |
|---|---|---|
| `position` | `vec3f` | позиция в пространстве рендера (мировые координаты через `bloxdWorldPosition()`) |
| `normal` | `vec3f` | единичный вектор, направленный наружу от грани |
| `localPosition` | `vec3f` | локальные координаты модели; **`vec3f(0.0)` для террейна и жидкости**; для руки игрока, удерживаемого меча или лопастей ветряной мельницы вращается вместе с моделью |
| `flags` | `BloxdFlags` | тип грани ([Флаги](flags.md)) |

## BloxdVertex (выход вершинного хука)

```wgsl
struct BloxdVertex {
    position: vec3f,      // The render position output.
}
```

## BloxdSurfaceIn (вход surface-хука)

```wgsl
struct BloxdSurfaceIn {
    colour: vec3f,        // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,           // Opacity.

    // Enchanted items and armour only, all 0 for anything else.
    enchantTier: u32,     // 1-5 for Tier 1-5.
    enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
    enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.

    // Players and mobs only, 0 for anything else: RGB overlay colour, e.g. the
    // red flash when hurt, and its alpha. bloxdLitColour mixes it into colour.
    overlayColour: vec4f,

    // These mean the same as in BloxdVertexIn, after the vertex hook.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.

    // These are all 0 if the face has no texture. Most models use textureId 0.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

| Поле | Тип | Описание |
|---|---|---|
| `colour` | `vec3f` | RGB = текстура × tint × AO, запекается мешером |
| `alpha` | `f32` | непрозрачность |
| `enchantTier` | `u32` | уровень зачарования 1–5; 0 для всего незачарованного |
| `enchantColour` | `vec4f` | RGB зачарования плюс **анимированная** альфа (`.a`) — чтение `.a` в каждом фрагменте бесплатно даёт движущийся узор; на незачарованных гранях все нули |
| `enchantSpeed` | `f32` | скорость узора зачарования («faster at higher tiers») |
| `overlayColour` | `vec4f` | оверлей сущности (вспышка урона и т.п.): RGB + альфа; 0 вне игроков/мобов; подмешивается `bloxdLitColour` до освещения |
| `position` / `normal` / `localPosition` / `flags` | — | те же значения, что в `BloxdVertexIn`, **после вершинного хука** (следуют за сдвинутыми вершинами) |
| `textureId` | `u32` | текстура этой грани; сравнивайте с `bloxdTextureId*`; **0, когда у грани нет текстуры** — большинство моделей использует textureId 0 (текстуры, принадлежащие моделям, скины игроков) |
| `textureRotation` | `u32` | четверти оборота по часовой стрелке (0–3), применяются `bloxdTexel` |
| `uv` | `vec2f` | текстура покрывает 0–1; рисуется `fract(uv)` (целые шаги тайлятся) |
| `mipLevel` | `f32` | уровень мипа: 0 = полный размер, 1 = половина… |

## BloxdSurface (выход surface-хука)

```wgsl
struct BloxdSurface {
    colour: vec3f,        // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,           // Opacity output.
#endif
    emission: vec3f,      // Emissive RGB, added after lighting, before fog.
    enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
    overlayColour: vec4f, // Overlay output, mixed in by bloxdLitColour.
}
```

| Поле | Тип | Условие | Описание |
|---|---|---|---|
| `colour` | `vec3f` | всегда | RGB-выход |
| `alpha` | `f32` | `#ifdef BLOXD_ALPHA` (вся жидкость + не-strict террейн/модели) | выход непрозрачности |
| `emission` | `vec3f` | всегда | эмиссивный RGB — **добавляется после освещения, до тумана** |
| `enchantColour` | `vec4f` | всегда | выход зачарования, подмешивается `bloxdLitColour` |
| `overlayColour` | `vec4f` | всегда | выход оверлея, подмешивается `bloxdLitColour` |

`bloxdDefaultSurface` передаёт `enchantColour` / `overlayColour` без изменений, поэтому дефолтный вид совпадает с внутренним поведением движка в v4. Обнулите `out.enchantColour`, чтобы убрать блики зачарования при своём освещении; усильте `out.overlayColour.a`, чтобы подчеркнуть вспышку урона.

## BloxdLightIn (вход light-хука)

```wgsl
struct BloxdLightIn {
    litColour: vec3f,  // Lit and enchanted RGB colour, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 if none.
    diffuse: vec3f,    // The material's RGB response to directional light.
    emissive: vec3f,   // The material's RGB glow, added to directional light.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 when !bloxdLit().
    skyLight: f32,     // Sky light; 1 when !bloxdLit().
    ambientLightColour: vec3f, // Minimum RGB light; 1 when !bloxdLit().
    skyLightColour: vec3f, // RGB colour of skyLight; 1 when !bloxdLit().
    heldLight: vec3f,  // RGB held light; 0 when !bloxdLit() or no light held.
    fogColour: vec3f,  // The game's RGB fog colour; 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.

    // These are the same as in BloxdSurfaceIn.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

Значение каждого поля и его роль в математике освещения: см. [Освещение](lighting.md).

**По сравнению со старыми версиями API**: `fogVisibility` (v2–v4) теперь `fogAlpha` с инвертированной семантикой (0 = нет тумана); `engineColour` теперь `litColour`; формулировка уровней света — «0 when !bloxdLit()». Полные изменения полей по версиям: [История версий](../history/).

## BloxdLight (выход light-хука)

```wgsl
struct BloxdLight {
    colour: vec3f, // RGB colour output.
}
```

## BloxdOpaqueBehind (возврат специальной функции)

```wgsl
struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}
```

Возвращаемое значение `bloxdOpaqueBehind()`. Используйте в жидкостных вариантах под guard'ом `#ifdef BLOXD_SCENE_DEPTH` (в v2 поле называлось `found: bool`).

## Условные поля ↔ макросы

| Поле | Существует при | Примечание |
|---|---|---|
| `BloxdSurface.alpha` | `#ifdef BLOXD_ALPHA` | все жидкостные варианты + не-strict террейн/модели |
| вызов `bloxdOpaqueBehind()` | `#ifdef BLOXD_SCENE_DEPTH` | все жидкостные варианты |

`BLOXD_STRICT` управляет **существованием хуков** (вершинных), а не формой структур. См. [Препроцессор](preprocessor.md).

## Соглашения записи (повторение)

- Никогда не конструируйте выходные структуры напрямую — начинайте от `bloxdDefault*`; в light-хуках работает и `var out = s;`
- Голый `var x: BloxdSurface;` — ошибка валидации
- Параметры хуков доступны только для чтения — копируйте перед изменением

## См. также

- [Освещение](lighting.md) · [Флаги](flags.md) · [API текстур](texture-api.md)
