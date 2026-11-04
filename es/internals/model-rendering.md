# Internas del renderizado de modelos

> API objetivo: 5 · Build objetivo: `xkg8x` · Estado: Analyzed (restaurado del bundle en vivo)

Las internas del programa Model de v5. La guía orientada al usuario: [Modelos y texturas](../guides/models.md).

## Qué es el programa Model

Antes de v5, los paquetes solo podían engancharse a terreno / líquido; los modelos de bloque (losas, escaleras, plantas) y las entidades (jugadores, mobs, ítems) estaban **fuera de la jurisdicción de los paquetes**. v5 añadió model como tercer programa, dibujando:

- bloques dibujados como modelos de bloque (nota de cabecera: *"Drawn as block models, so never part of terrain or flagged as opaque"*)
- ítems sujetos / caídos / en vuelo
- jugadores, mobs, NPC (armaduras y cosmética incluidas)

## Entrega de flags y entradas

- **`bloxdSpFlags`** — la ruta de entrega de la estructura `BloxdFlags`; los 8 campos nuevos (`slab` / `stairs` / `flat` / `placed` / `held` / `dropped` / `thrown` / `lifeform`) llevan valores con significado solo en caras de modelo
- **`bloxdSpItemLocalPosition`** — entrega de `localPosition`; `vec3f(0.0)` en terreno/líquido
- **`bloxdSpEnchant`** — entrega de las entradas de encantamiento (`enchantTier` / `enchantColour` / `enchantSpeed`)

## El cómputo del encantamiento

El motor anima el barrido del brillo y lo entrega como `enchantColour.a` a los hooks surface/light ([Efectos de encantamiento](../recipes/enchant-effects.md)). La mezcla ocurre dentro de `bloxdLitColour()` — justo tras el sombreado, antes de la luz del mundo ([Iluminación](../api/lighting.md#el-pipeline-completo)).

## La superposición (destello de daño etc.)

`overlayColour` lleva el color de estado de la entidad (destello de daño etc.) como RGB + alfa. `bloxdLitColour` lo mezcla **antes de la iluminación**, así que la expresión de estado va montada sin romper el color base. El procesamiento existía internamente en v4 y se abrió a entradas/salidas en v5.

## La ruta de texturas

La mayoría de las caras de modelo usan `textureId: 0` (sin textura) — las pieles de jugador y las texturas de mobs no están en el espacio de nombres del atlas de texturas de bloque. `surface.colour` llega con piel × tinte horneado, así que el procesamiento de caras de modelo parte de `colour` ([texturas propias del modelo](../api/texture-api.md#texturas-propias-del-modelo-textureid-0)).

## Variantes

El programa Model forma un eje de la matriz de variantes: `strict.model` / `allow.model`. `BLOXD_ALPHA` se define solo en allow.model ([Preprocesador](../api/preprocessor.md#matriz-de-macros--variantes)); strict.model no tiene hooks de vértice.

## Relacionado

- [Modelos y texturas](../guides/models.md) · [Recetas de sombreadores de modelo](../recipes/model-shaders.md) · [Flags](../api/flags.md) · [Canalización de renderizado](rendering-pipeline.md)
