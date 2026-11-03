# Errores de validación

> API objetivo: 5 · Estado: Verified (mensajes registrados literalmente del validador en vivo)

Errores de la validación estática (analizador, etapa 1) — en su mayoría nombres reservados, el contrato strict y las restricciones de llamada entre hooks.

## "Packs can't construct BloxdSurface directly" / "Packs can't construct BloxdLight directly, since header structs gain fields; ..."

- **Causa**: llamar a constructores como `BloxdSurface(...)`
- **Corrección**: parte de `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` y muta campos (`var out = s;` funciona en hooks de light)

## "Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"

- **Causa**: un identificador que empieza por `bloxd` (sin distinguir mayúsculas)
- **Corrección**: renómbralo (p. ej. `packTint`). Solo los 9 nombres de hooks están permitidos
- **Prevención**: antepón a tus nombres `pack` / `my` etc.

## "bloxdPackInputs isn't part of the bloxd_ header"

- **Causa**: referenciar el uniform directamente
- **Corrección**: úsalo a través de las funciones de cabecera ([Formato del paquete](../api/pack-format.md#uniform-por-fotograma-bloxdpackinputs))

## "... reaches bloxdTexel, which only surface and light hooks can use."

- **Causa**: llamada desde un hook de vértice (o desde una función alcanzable desde uno) — «reaches» significa **la ruta de llamada**
- **Corrección**: mueve la llamada a un hook surface / light

## "... reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and <program> doesn't define it; ..."

- **Causa**: `bloxdOpaqueBehind()` necesita `BLOXD_SCENE_DEPTH`, definida solo en todas las variantes de líquido; compartir la llamada desde código de hooks de terreno/modelo crea variantes no compilables
- **Corrección**: envuelve la llamada en `#ifdef BLOXD_SCENE_DEPTH`
- **Prevención**: aísla las lecturas de profundidad como procesamiento solo-líquido

## El contrato strict

| Mensaje | Significado |
|---|---|
| `<hook> moves terrain, which strict games prevent.` | hook de vértice sin guarda |
| `discard makes terrain see-through, which strict games prevent.` | `discard` alcanzable |

- **Importante**: no son errores de compilación — los juegos strict **desactivan automáticamente el paquete entero** (`shaderPack:offInStrict`)
- **Corrección**: envuelve los hooks de vértice y el `discard` en `#ifndef BLOXD_STRICT` ([Variantes](../getting-started/variants.md))

## Mensajes de la versión actual

| Mensaje | Acción |
|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | migra `#ifdef BLOXD_LIGHTING` → `if (bloxdLit())` ([Iluminación](../api/lighting.md#bloxdlit--la-compuerta)) |
| `bloxdBlockFlagRock isn't part of the shader pack API...` | constante de bits restante → `flags.rock` ([Flags](../api/flags.md)) |
| `bloxdSpLitColour isn't part of the shader pack API...` | símbolo interno de v4 → usa la pública `bloxdLitColour()` |

El analizador da **mensajes dedicados** a los paquetes que sigan leyendo `blockFlags` o envolviendo hooks de luz en `#ifdef BLOXD_LIGHTING`, así que nada se comporta mal en silencio (los pasos de migración: [migración a v5](../history/v5.md)).

Los errores de resolución de nombres de textura (sugerencias de grafía, grafías de fotograma/rotación) viven en [Problemas de texturas](textures.md).

## Relacionado

- [Restricciones y nombres reservados](../api/restrictions.md) · [Interior del motor: validación de sombreadores](../internals/shader-validation.md) · [Problemas específicos de variantes](variants.md)
