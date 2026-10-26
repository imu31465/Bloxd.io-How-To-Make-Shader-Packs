[← Parte anterior](09-apiv3.md)·[Volver al manual](README.md)

# Parte X: Guía de migración a API Version 4 (2026-10-26, resumen)

> Este texto es el resumen breve en este idioma. La versión completa con todos los detalles, recetas de ejemplo e interioridades del motor restauradas (§55–§66) está en [inglés](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md) y [japonés](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md).

Build objetivo: `cnty9.main.669f8081.js` — **en producción y preprod simultáneamente desde el 2026-10-26** (ambas byte a byte idénticas). El modelo de paquetes conserva su forma: mismos campos de `pack.json`, mismos límites del cargador, mismo uniform de 64 B, los mismos 6 hooks.

## Qué cambia

- `pack.json` exige `"apiVersion": 4` (igualdad `===` estricta, número) — los paquetes v3 se rechazan al cargar.
- **Nueva API de texturas (la novedad principal):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` muestrea el atlas de texturas de bloques exactamente como lo hace la propia engine (id 0 = blanco; las texturas animadas devuelven automáticamente el fotograma actual), `bloxdTextureSize(mipLevel) -> vec2u`, y constantes con nombre `bloxdTextureId*` (CamelCase a partir del nombre de archivo, p. ej. `grass_top` → `bloxdTextureIdGrassTop`; el catálogo oficial es `BLOCK_TEXTURES.md`).
- **Cuatro campos nuevos de entrada** en `BloxdSurfaceIn` *y* `BloxdLightIn`: `textureId`, `textureRotation` (cuartos de giro en sentido horario, que `bloxdTexel` aplica), `uv` (en bloques; se dibuja `fract(uv)`), `mipLevel`.
- **Renombres con cambio de significado:** `fogVisibility` → `fogAlpha` con significado **invertido** (`0 = sin niebla, 1 = solo fogColour`; portado: `l.fogVisibility` → `1.0 - l.fogAlpha`); `bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (cuerpo idéntico); `BloxdOpaqueBehind.found` → `hit`.
- **Los juegos estrictos ahora los impone el validador incluido:** un hook de vértice sin proteger o un `discard` alcanzable informa `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...` y desactiva **todos** los hooks en juegos estrictos. Con envoltorios `#ifndef BLOXD_STRICT`, surface/light siguen funcionando.
- Todo lo demás queda congelado: 6 hooks, bits de `blockFlags` (1/2/4/8/16/32), diseño del uniform, límites del cargador, matriz de variantes, los 12 títulos allow (reconfirmados sin cambios en `cnty9` el 2026-10-27).

## Migración rápida

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (número) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` o `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| Hooks de vértice sin protección | `#ifndef BLOXD_STRICT ... #endif` |

El material de referencia completo ya forma parte de la guía: la cabecera del motor restaurada íntegra y el catálogo completo de texturas con los 905 nombres utilizables están en la Parte XI (`11-reference.md`). Los detalles completos — la sutileza de rotación de `bloxdTexel`, el WGSL de muestreo restaurado, el registro de nombres, la nueva estructura de `HEADER_VERSION` con hash del registro — están en la versión completa en inglés y japonés.

[← Parte anterior](09-apiv3.md)·[Volver al manual](README.md)
