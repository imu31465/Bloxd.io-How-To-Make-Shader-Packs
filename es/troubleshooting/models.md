# Problemas de modelos

> API objetivo: 5 · Build objetivo: `xkg8x` · Estado: Analyzed (territorio nuevo de v5)

Problemas en torno a los nuevos hooks de Model de v5.

## Jugadores/mobs sin efecto

- **Causa**: las entidades (jugadores, mobs, NPC, armaduras, cosmética) las dibuja el **programa Model** — los hooks de terreno no las tocan
- **Corrección**: añade hooks de Model ([la guía de modelos](../guides/models.md))

## Losas, escaleras, plantas sin efecto

- **Causa**: los modelos de bloque (`slab` / `stairs` / `flat`) también son geometría del programa Model, nunca terreno
- **Corrección**: usa hooks de Model con `flags.slab` / `flags.stairs` / `flags.flat` ([Flags](../api/flags.md))

## Agua sin efecto

- **Causa**: el agua es solo de hooks de Liquid; **sin hooks de Liquid, tampoco corre ningún hook de Terrain sobre el agua** (cambio de v5)
- **Corrección**: define `bloxdLiquidSurface` / `bloxdLiquidLight` ([Problemas de variantes](variants.md))

## Quieres cambiar solo los ítems en mano pero cambia todo

- **Corrección**: selecciona con `surface.flags.held` ([recetas de sombreadores de modelo](../recipes/model-shaders.md))

## Las comprobaciones de flags no se comportan

- **Causas probables**:
  1. **tratar los flags como un enum de elección única** — se combinan libremente («sandstone is sand and rock», «possibly even none») ([Flags](../api/flags.md#los-flags-se-combinan-libremente))
  2. leer `else` como «todo lo demás» — el else de `flags.rock` es meramente «no roca», posiblemente todavía arena
- **Corrección**: combina los flags de material (`opaque`…) con independencia de los de forma/estado (`slab`/`held`…)

## El brillo de encantamiento desapareció

- **Corrección**: pasa `enchantColour` o usa `bloxdLitColour()` ([Efectos de encantamiento](../recipes/enchant-effects.md))

## El destello de daño desapareció / demasiado fuerte

- **Corrección**: pasa `overlayColour` o ajusta `out.overlayColour.a` ([Efectos de encantamiento](../recipes/enchant-effects.md))

## localPosition siempre lee 0

- **Es de diseño**: `localPosition` es `vec3f(0.0)` en caras de terreno y líquido — **ahí no hay modelo**
- **Corrección**: léelo en hooks de Model ([recetas de modelo](../recipes/model-shaders.md))

## bloxdTexel devuelve blanco en los modelos

- **Es de diseño**: `textureId: 0` (pieles) muestrea como blanco
- **Corrección**: selecciona con `surface.textureId != 0u` o trabaja desde `surface.colour` ([Problemas de texturas](textures.md))

## Quieres cambios solo de armadura / solo cosméticos

- **Límite**: ningún flag dice «armadura»; `flags.lifeform` incluye armaduras y cosmética
- **Aproximación**: combina con `localPosition` (colocación) o la presencia de `overlayColour` ([recetas de modelo](../recipes/model-shaders.md))

## Relacionado

- [Guía de modelos](../guides/models.md) · [Recetas de sombreadores de modelo](../recipes/model-shaders.md) · [Flags](../api/flags.md)
