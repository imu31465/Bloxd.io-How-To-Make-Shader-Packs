# Estructuras de entrada y salida

> API objetivo: 5 · Build objetivo: `xkg8x` · Estado: Analyzed (restaurado literalmente de la cabecera en vivo)

Siete estructuras son legibles/escribibles por los paquetes. Abajo se listan todos los campos (los campos `#ifdef` son condicionales). La cabecera completa está en [Interior del motor](../internals/engine-header.md).

## BloxdVertexIn (entrada del hook de vértice)

```wgsl
struct BloxdVertexIn {
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `position` | `vec3f` | posición en espacio de render (espacio de mundo vía `bloxdWorldPosition()`) |
| `normal` | `vec3f` | vector unitario que apunta fuera de la cara |
| `localPosition` | `vec3f` | coordenadas locales del modelo; **`vec3f(0.0)` para terreno y líquido**; para el brazo de un jugador, una espada en mano o las aspas de un molino gira con el modelo |
| `flags` | `BloxdFlags` | clase de cara ([Flags](flags.md)) |

## BloxdVertex (salida del hook de vértice)

```wgsl
struct BloxdVertex {
    position: vec3f,      // The render position output.
}
```

## BloxdSurfaceIn (entrada del hook de surface)

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

| Campo | Tipo | Descripción |
|---|---|---|
| `colour` | `vec3f` | RGB = textura × tinte × AO, horneado por el mesher |
| `alpha` | `f32` | opacidad |
| `enchantTier` | `u32` | nivel de encantamiento 1–5; 0 para todo lo no encantado |
| `enchantColour` | `vec4f` | RGB de encantamiento más un alfa **animado** (`.a`) — leer `.a` por fragmento da un patrón en movimiento gratis; todo cero en caras no encantadas |
| `enchantSpeed` | `f32` | velocidad del patrón de encantamiento («faster at higher tiers») |
| `overlayColour` | `vec4f` | superposición de entidad (destello de daño etc.) RGB + alfa; 0 fuera de jugadores/mobs; la mezcla `bloxdLitColour` antes de la iluminación |
| `position` / `normal` / `localPosition` / `flags` | — | mismos significados que en `BloxdVertexIn`, **después del hook de vértice** (siguen a los vértices movidos) |
| `textureId` | `u32` | la textura de esta cara; compárala con `bloxdTextureId*`; **0 cuando la cara no tiene textura** — la mayoría de los modelos usan textureId 0 (texturas propias del modelo, pieles de jugador) |
| `textureRotation` | `u32` | cuartos de giro en sentido horario (0–3), aplicados por `bloxdTexel` |
| `uv` | `vec2f` | la textura abarca 0–1; se dibuja `fract(uv)` (los pasos enteros teselan) |
| `mipLevel` | `f32` | nivel de mipmap: 0 = tamaño completo, 1 = mitad… |

## BloxdSurface (salida del hook de surface)

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

| Campo | Tipo | Condición | Descripción |
|---|---|---|---|
| `colour` | `vec3f` | siempre | salida RGB |
| `alpha` | `f32` | `#ifdef BLOXD_ALPHA` (todo líquido + terreno/modelo no strict) | salida de opacidad |
| `emission` | `vec3f` | siempre | RGB emisivo — **añadido tras la iluminación, antes de la niebla** |
| `enchantColour` | `vec4f` | siempre | salida de encantamiento, mezclada por `bloxdLitColour` |
| `overlayColour` | `vec4f` | siempre | salida de superposición, mezclada por `bloxdLitColour` |

`bloxdDefaultSurface` pasa `enchantColour` / `overlayColour` sin cambios, así que el aspecto por defecto coincide con el comportamiento interno del motor de v4. Pon `out.enchantColour` a cero para quitar el brillo bajo iluminación propia; amplifica `out.overlayColour.a` para destacar el destello de daño.

## BloxdLightIn (entrada del hook de light)

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

Significado campo por campo y papel en la matemática de iluminación: ver [Iluminación](lighting.md).

**Frente a versiones antiguas de la API**: `fogVisibility` (v2–v4) es ahora `fogAlpha` con la semántica invertida (0 = sin niebla); `engineColour` es ahora `litColour`; la redacción de niveles de luz es «0 when !bloxdLit()». Los cambios de campo por versión, completos: [Historial de versiones](../history/).

## BloxdLight (salida del hook de light)

```wgsl
struct BloxdLight {
    colour: vec3f, // RGB colour output.
}
```

## BloxdOpaqueBehind (retorno de la función especial)

```wgsl
struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}
```

Valor de retorno de `bloxdOpaqueBehind()`. Úsalo en variantes de líquido tras una guarda `#ifdef BLOXD_SCENE_DEPTH` (el campo era `found: bool` en v2).

## Campos condicionales ↔ macros

| Campo | Existe cuando | Nota |
|---|---|---|
| `BloxdSurface.alpha` | `#ifdef BLOXD_ALPHA` | todas las variantes de líquido + terreno/modelo no strict |
| llamada a `bloxdOpaqueBehind()` | `#ifdef BLOXD_SCENE_DEPTH` | todas las variantes de líquido |

`BLOXD_STRICT` controla la **existencia de hooks** (los de vértice), no la forma de las estructuras. Ver [Preprocesador](preprocessor.md).

## Convenciones de escritura (recapitulación)

- Nunca construyas las estructuras de salida directamente — parte de `bloxdDefault*`; en hooks de light `var out = s;` también funciona
- Un `var x: BloxdSurface;` desnudo es un error de validación
- Los parámetros de los hooks son de solo lectura — cópialos antes de mutarlos

## Relacionado

- [Iluminación](lighting.md) · [Flags](flags.md) · [API de texturas](texture-api.md)
