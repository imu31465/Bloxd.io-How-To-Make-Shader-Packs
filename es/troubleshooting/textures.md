# Problemas de texturas

> API objetivo: 5 · Build objetivo: `xkg8x` · Estado: Verified (mensajes registrados literalmente del validador en vivo)

Problemas en torno a `bloxdTextureId*` / `bloxdTexel`. Busca los 896 nombres en el [catálogo de texturas](../api/texture-catalog.md).

## "There's no texture called X. Did you mean bloxdTextureIdY?"

- **Causa**: una errata; el validador tiene **sugerencias Levenshtein** (umbral `max(2, floor(len/4)) + 1`)
- **Corrección**: acepta la sugerencia; contrasta con el [catálogo](../api/texture-catalog.md)
- **Prevención**: copia y pega los nombres del catálogo

## "...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates."

- **Causa**: escribir un **número de fotograma** en una textura animada (`lava0` etc.)
- **Corrección**: usa el nombre base — el muestreo devuelve automáticamente el fotograma actual
- **Prevención**: nunca escribas sufijos de fotograma para las 42 familias de animación ([nombrado](../api/texture-api.md#reglas-de-grafía-y-libertad-de-nombrado))

## "...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, ..."

- **Causa**: escribir la grafía de copia girada de una familia de rotación (`[rot[N`)
- **Corrección**: usa el nombre raíz — `bloxdTexel` reaplica la rotación

## "...could name X and Y, which differ only by case or underscores, so it can't be used."

- **Causa**: el plegado insensible a mayúsculas/guiones bajos dejó el nombre **ambiguo**
- **Corrección**: desambigua la grafía

## "bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?"

- **Causa**: errata en el prefijo (p. ej. `bloxdTextureID`, `bloxdtextureid`)
- **Corrección**: empieza los nombres exactamente por `bloxdTextureId`

## "Case and underscores are not distinguished" — ¿cómo conviven ambas reglas?

La resolución de nombres pliega mayúsculas y `_`, así que `bloxdTextureId_grass_top` y `bloxdTextureIdGrassTop` se resuelven a **la misma** constante. Solo cuando el plegado deja múltiples candidatos se dispara el error dedicado de ambigüedad ([reglas de nombrado](../api/texture-api.md#reglas-de-grafía-y-libertad-de-nombrado)).

## bloxdTexel siempre devuelve blanco en los modelos

- **Es de diseño**: la mayoría de los modelos usan `textureId: 0` (sin textura — pieles de jugador etc.); `bloxdTexel(0, ...)` devuelve `vec4f(1.0)`
- **Corrección**: selecciona con `surface.textureId != 0u` ([texturas propias del modelo](../api/texture-api.md#texturas-propias-del-modelo-textureid-0))

## Querer añadir texturas

- **Límite**: la API de shader packs solo **lee** el atlas; añadir texturas es tarea del sistema de paquetes de texturas ([combinaciones](../guides/combinations.md))

## "Packs can't use X: the engine binds every texture and sampler..."

- **Causa**: declarar tipos `texture_*` / `sampler` directamente
- **Corrección**: pasa por `bloxdTexel()` ([Restricciones](../api/restrictions.md))

## Los ids crudos se rompieron tras una actualización del juego

- **Causa**: **los ids son instantáneas** — medido, 334 de 905 nombres supervivientes cambiaron de id entre dos builds
- **Corrección**: escribe `bloxdTextureIdLava`, no `19` ([los nombres son la API](../api/texture-catalog.md#deriva-medida-cnty9--ab90qa))

## Relacionado

- [API de texturas](../api/texture-api.md) · [Catálogo de texturas](../api/texture-catalog.md) · [Internas del registro de texturas](../internals/texture-registry.md)
