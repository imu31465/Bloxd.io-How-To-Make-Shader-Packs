# Preprocesador

> API objetivo: 5 · Build objetivo: `v98qt8` · Estado: Analyzed (restaurado del validador en vivo)

La compilación condicional solo soporta `#define NAME` (sin valor) / `#ifdef` / `#ifndef` / `#else` / `#endif`. La `#` va al inicio de línea (dentro de funciones está bien). La coincidencia de nombres de flag no distingue mayúsculas; un nombre erróneo en `#ifdef` hace que el mensaje de error liste el conjunto oficial.

## Macros definidas (3)

| Macro | Definida en | Uso típico |
|---|---|---|
| `BLOXD_STRICT` | variantes de juego strict (strict.terrain / strict.liquid / strict.model) | `#ifndef BLOXD_STRICT` alrededor de hooks de vértice enteros y de `discard` |
| `BLOXD_ALPHA` | variantes donde existe `BloxdSurface.alpha` — todo líquido + terreno/modelo no strict | envolver el código que toca alpha |
| `BLOXD_SCENE_DEPTH` | todas las variantes de líquido | envolver las llamadas a `bloxdOpaqueBehind()` |

## Matriz de macros × variantes

| Variante | `BLOXD_STRICT` | `BLOXD_ALPHA` | `BLOXD_SCENE_DEPTH` |
|---|---|---|---|
| `allow.terrain` | – | ✓ | – |
| `allow.liquid` | – | ✓ | ✓ |
| `allow.model` | – | ✓ | – |
| `strict.terrain` | ✓ | – | – |
| `strict.liquid` | ✓ | ✓ | ✓ |
| `strict.model` | ✓ | – | – |

Las diferencias terreno / líquido / modelo son **programas separados, no macros** — `#ifdef BLOXD_TERRAIN` no existe.

## Macros eliminadas

- **`BLOXD_LIGHTING`** — eliminada en v5. El estado de iluminación es una pregunta en tiempo de ejecución para [`bloxdLit()`](lighting.md#bloxdlit--la-compuerta), no una ramificación de compilación. Usarla falla la validación con:

> *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

Patrón de migración de v4:

```wgsl
// v4 (fails validation on v5)
#ifdef BLOXD_LIGHTING
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight { ... }
#endif

// v5 (migrated)
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    // ... lighting-enabled processing
}
```

## Ejemplo

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // terrain has alpha only in allow
    out.alpha = s.alpha;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex hooks always need this guard
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdSeconds()) * 0.05;
    return out;
}
#endif
```

## Las macros moldean las estructuras

- `BloxdSurface.alpha` existe solo dentro de `#ifdef BLOXD_ALPHA`
- `bloxdOpaqueBehind()` es llamable solo dentro de `#ifdef BLOXD_SCENE_DEPTH`

Ver [Estructuras](structures.md#campos-condicionales--macros).

## Relacionado

- [Primeros pasos: variantes](../getting-started/variants.md) · [Interior del motor: validación de sombreadores](../internals/shader-validation.md)
