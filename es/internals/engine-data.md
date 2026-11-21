# Ledger de datos del motor

> API objetivo: 5 · Build objetivo: `bbb6l5` (verificado en producción y preprod el 2026-11-20) · Estado: Verified

Este ledger reúne los valores confirmados de la API visible para los shader packs en el build actual. Los detalles internos del bundle, como IDs de módulos y chunks, no forman parte de la especificación y se omiten aquí.

## Especificación actual

| Elemento | Valor |
|---|---|
| `apiVersion` | `5` (comparación estricta con un número) |
| Cabecera del motor | 216 líneas; texto completo en [Cabecera del motor](engine-header.md) |
| Hooks | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| Variantes | 6 (strict × terrain / liquid / model) |
| Macros | `BLOXD_STRICT`, `BLOXD_ALPHA`, `BLOXD_SCENE_DEPTH`; `BLOXD_LIGHTING` fue eliminado en v5 |
| Uniform del pack | 80 bytes: `seconds` @0, `lit` @4, `renderOffset` @16, `sunDirection` @32, `eyePosition` @48, `shadowDirection` @64 |
| Binding del pack | `@group(3) @binding(0)`; `minBindingSize` 80 |
| Flags | `BloxdFlags`, estructura con 14 campos booleanos |
| Atlas de texturas | 1.650 capas; 1.017 nombres; 776 alias |
| Familias de textura | 64 de rotación y 71 de animación |
| Identificadores reservados | nombres que coinciden con `/^bloxd/i` y 88 símbolos internos `bloxdSp*` |
| Definiciones de juegos | 119 |
| Política de shader packs | 12 títulos permitidos, 28 entradas; ver [Política por juego](policy.md) |
| Plantilla de pack predeterminada | 1.633 bytes |
| Límites del cargador | 256 archivos WGSL / 256 KB de código / 64 KB para `pack.json` / ZIP de 32 MB / 1.024 entradas |

## Cambios de bbb6l5

`bbb6l5` mantiene `apiVersion: 5`, pero amplía la API visible para los packs:

- `bloxdShadow()`, `bloxdAirShadow(t)` y `bloxdShadowDirection()` exponen el sistema de sombras del sol y la luna calculado por el motor.
- El uniform incorpora `shadowDirection: vec3f` en el desplazamiento 64 y aumenta de 64 a 80 bytes.
- `pack.json` admite el booleano opcional `keepCircleShadows` para conservar las antiguas sombras circulares.
- El atlas crece de 1.227 a 1.650 capas y pasa de 906 a 1.017 nombres disponibles.
- Se corrige la regresión de plegado de constantes de textura introducida en `v98qt8`.

La explicación y la evidencia de estas mediciones están en el [Registro de investigación](research-log.md) y en [Internas del registro de texturas](texture-registry.md).

## Versiones anteriores

- [Historial de versiones](../history/) — cambios y migraciones de las API anteriores
- [Registro de investigación](research-log.md) — método y referencias de las mediciones

## Relacionado

- [Cabecera del motor](engine-header.md) — texto completo de la cabecera
- [Política por juego](policy.md) — títulos con política allow / strict
- [Registro de texturas](texture-registry.md) — nombres y asignación de IDs
