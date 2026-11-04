# Modelos y texturas

> API objetivo: 5 · Build objetivo: `xkg8x` (2026-11-04, producción) · Estado: Analyzed (restaurado de la cabecera y el validador)

Qué dibujan y qué leen los nuevos hooks de Model de v5.

## Qué dibuja el programa Model

- **Modelos de bloque**: medios bloques (`slab`), escaleras (`stairs`), plantas de planos cruzados — hierba alta, flores, cultivos, telarañas (`flat`)
- **Ítems**: en mano (`held`), caídos (`dropped`), en vuelo (`thrown` — bolas de nieve, flechas, cohetes)
- **Entidades**: jugadores, mobs, NPC (`lifeform`) — **incluyendo armaduras y cosmética**

El terreno (bloques completos) y el líquido (agua) nunca entran en este programa.

## Qué se lee distinto

Las caras de modelo llevan tres cosas que las caras de terreno nunca tienen:

| Información | Campo | Valor en terreno |
|---|---|---|
| coordenadas locales del modelo | `localPosition: vec3f` | `vec3f(0.0)` (sin modelo) |
| estado de encantamiento | `enchantTier` / `enchantColour` / `enchantSpeed` | todo 0 |
| superposición de entidad | `overlayColour` | 0 |

Y **las texturas significan algo distinto**: las caras de terreno llevan `textureId` del atlas, pero **la mayoría de los modelos usan `textureId: 0`** («sin textura») — las pieles de jugador y las texturas de mobs no están en el espacio de nombres del atlas. `surface.colour` ya contiene piel × tinte, así que trabaja desde ahí ([texturas propias del modelo](../api/texture-api.md#texturas-propias-del-modelo-textureid-0)).

Los flags `held` / `dropped` / `thrown` / `lifeform` / `placed` de `flags` solo tienen significado en caras de modelo ([Flags](../api/flags.md)).

## localPosition

La posición local a la instancia del modelo **antes** de la colocación en mundo; `vec3f(0.0)` para terreno/líquido.

- Para el brazo de un jugador, una espada en mano o las aspas de un molino, gira con el modelo
- **Animación y efectos de flexión con clave por parte** se vuelven una escritura de un solo campo — «a qué altura de la hoja estoy» es directamente `localPosition.y`
- En las estructuras de light es el valor **posterior al hook de vértice** (cabecera: *"the same as in BloxdVertexIn, after the vertex hook"*)

## Patrones de selección

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;   // lift world entities, exclude the hand
    }
    if (surface.flags.held) {
        out.colour *= 1.15;   // brighten the local player's held items
    }
    return out;
}
```

Ejemplos completos: [recetas de sombreadores de modelo](../recipes/model-shaders.md) y [efectos de encantamiento](../recipes/enchant-effects.md).

## Chuleta de Terrain / Liquid / Model

| Quieres afectar a | Hooks | Campos de selección |
|---|---|---|
| el aspecto de bloques completos | `bloxdTerrain*` | flags de material (`opaque` / `rock`…) |
| el agua | `bloxdLiquid*` | siempre Liquid (sin hooks de Liquid = agua intacta) |
| plantas, losas, escaleras | `bloxdModel*` | `flags.flat` / `slab` / `stairs` |
| ítems en mano | `bloxdModel*` | `flags.held` |
| ítems caídos | `bloxdModel*` | `flags.dropped` |
| ítems en vuelo | `bloxdModel*` | `flags.thrown` |
| jugadores y mobs | `bloxdModel*` | `flags.lifeform` |

## Iluminación

`bloxdModelLight` recibe los mismos `BloxdSurface` / `BloxdLightIn` y funciona con `bloxdDefaultLight` / `bloxdLitColour()`. El brillo de encantamiento (`enchantColour`) y el destello de daño (`overlayColour`) se mezclan dentro de `bloxdLitColour`, así que **los valores por defecto conservan ambos looks automáticamente**; para controlarlos ver [efectos de encantamiento](../recipes/enchant-effects.md).

## Interioridades

Cómo se renderizan los modelos y cómo fluyen las entradas de flags/encantamiento: [Interior del motor: renderizado de modelos](../internals/model-rendering.md); los símbolos generados como `bloxdSpItemLocalPosition` y `bloxdSpEnchant` están listados en [restricciones](../api/restrictions.md).
