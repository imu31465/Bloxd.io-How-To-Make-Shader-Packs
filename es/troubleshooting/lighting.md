# Problemas de iluminación

> API objetivo: 5 · Estado: Verified

Problemas de brillo, sombra y niebla.

## Cuevas demasiado brillantes

- **Causa**: no linealidad insuficiente en `skyLight`
- **Corrección**: las recetas de oscurecimiento de cuevas en [recetas de iluminación](../recipes/lighting.md) y [recetas de realismo](../recipes/realism.md)

## Caras iluminadas demasiado brillantes de noche

- **Causa**: solo se oscurecieron los colores de sombra — el color terminado conserva su brillo diurno
- **Corrección**: atenúa todo el color terminado de noche y relaja solo la luz local (`blockLight` / `heldLight`) — [la guía nocturna](../guides/night.md)

## Noche demasiado oscura

- **Corrección**: garantiza un ambiente mínimo; con un `bloxdSunDirection()` cero la dirección lunar real es desconocida, así que usa ambiente azul pseudo ([la receta nocturna](../recipes/lighting.md)). La dirección lunar en sí es `-bloxdSunDirection()` (solo mundos con ciclo día-noche)

## El día se quema

- **Corrección**: baja la exposición antes de ACES ([ACES](../recipes/realism.md))

## Entorno de antorchas saturado de naranja

- **Corrección**: baja la proporción de mezcla cálida ([antorcha cálida × cielo frío](../recipes/realism.md))

## Quieres conservar exactamente la luz del mundo del motor

- **Solución v5**: llama `bloxdWorldLight(light)` — matemática idéntica a la del motor, «la más brillante de bloque/cielo/en mano, con suelo en ambientLightColour» ([Iluminación](../api/lighting.md#bloxdworldlight--la-luz-del-mundo))
- **Nota**: `blockLight` / `heldLight` valen 0 y los campos relacionados con el cielo valen 1 cuando `!bloxdLit()` (garantía de cabecera)

## Se ve mal en juegos con la iluminación desactivada

- **Causa**: entradas solo de iluminación (`blockLight` etc.) usadas sin guarda. v5 no tiene `#ifdef BLOXD_LIGHTING` — ramifica en el **`bloxdLit()` de ejecución**
- **Corrección**: retorno anticipado `if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }` ([Iluminación](../api/lighting.md#bloxdlit--la-compuerta))

## "LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk"

- **Causa**: las regiones densas de bloques brillantes desbordan la cola de semillas de luz y el cómputo de luz del chunk se corta. **No lo causa el paquete**, pero los huecos de luz cerca de cúmulos brillantes se rastrean a esto
- **Corrección**: reparte las fuentes de luz en el mundo

## ¿Quieres la teoría?

- Sombras: [Sombras](../guides/shadows.md) (skyLight = mapa de sombras por vóxeles)
- Niebla: [Interior del motor: internas de niebla](../internals/fog-internals.md)

## Relacionado

- [Iluminación](../api/lighting.md) · [Problemas visuales](visual.md) · [Internas de iluminación](../internals/lighting-internals.md)
