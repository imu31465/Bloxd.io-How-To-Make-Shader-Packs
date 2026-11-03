[← Parte anterior](11-reference.md)·[Volver al manual](README.md)

# Parte XII: Guía de migración a API versión 5 (2026-11-03, resumen)

> Este texto es el resumen breve para este idioma. La versión completa con todos los detalles, recetas de ejemplo, la cabecera v5 restaurada íntegra y los internos del motor (§69–§82) está en [inglés](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/12-apiv5.md) y [japonés](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/12-apiv5.md).

Build objetivo: `ab90qa.main.6188124c.js` — **en producción y preprod simultáneamente (medido 2026-11-03)**, ambos idénticos byte a byte (md5 verificado). Es la mayor revisión de la API desde v3: la cabecera del motor crece de 6,021 a **8,954 bytes descodificados** y casi toda estructura gana campos.

## Qué cambia

- `pack.json` exige `"apiVersion": 5` (estricto `===`, número) — los paquetes v4 se rechazan al cargar; los v4 guardados quedan inactivos en silencio.
- **`blockFlags` se sustituye por una estructura (el cambio estrella):** desaparecen las seis constantes de bits `bloxdBlockFlag*`; en su lugar **`flags: BloxdFlags`** con 14 campos bool con nombre — seis son los bits antiguos renombrados y ocho son nuevos: **`slab` `stairs` `flat` `placed` `held` `dropped` `thrown` `lifeform`**. Los modelos, los ítems en mano y los seres vivos ya se distinguen del terreno.
- **`#ifdef BLOXD_LIGHTING` desaparece:** el interruptor de compilación se sustituye por la comprobación en ejecución con la nueva función **`bloxdLit()`**; el uniform gana `lit: u32` (offset 4, sigue siendo de 64 B). La matriz de variantes pasa de 8 a 6 (`strict|allow` × `terrain|liquid|model`).
- **La receta de iluminación del motor se hace pública:** tres funciones nuevas — **`bloxdShading(light)`**, **`bloxdWorldLight(light)`**, **`bloxdLitColour(surface, light)`** — más dos entradas nuevas en `BloxdLightIn` (`diffuse`, `emissive`).
- **Entradas nuevas:** `localPosition: vec3f` (coordenadas de modelo, 0 en terreno) en todas; `enchantTier` / `enchantColour` / `enchantSpeed` / `overlayColour` (encantamiento y destello de daño) en Surface/Light; **salidas nuevas** `enchantColour` / `overlayColour` en `BloxdSurface`, mezcladas por `bloxdLitColour`.
- **Eliminado:** `bloxdFragmentBlockPosition()` (sin sustituto), las constantes `bloxdBlockFlag*`, `bloxdSpLitColour`.
- **La plantilla del paquete por defecto incluye ahora los 9 ganchos** (también los de luz, 1,122 → 1,683 bytes) y su comentario documenta el borrado: *«If you delete a hook, the default is used instead.»*
- Nueva constante de cabecera: `const bloxdChunkSize: i32 = 32;`. Las derivadas Y se negan automáticamente: `dpdy`/`dpdyCoarse`/`dpdyFine` se reescriben como `(-dpdy(...))`. `HEADER_VERSION` pasa a `9.<hash>.<hash>`.
- El espacio `bloxdSp*` crece de 27 a **46 símbolos**; el registro de texturas mide ahora **896 nombres utilizables** (+1 `scorpion_eggs`, −10, entre ellos la familia `chest_double_*` y `mob_spawner_*_block_side`) — los nombres son la API, los ids solo una instantánea.
- Todo lo demás queda congelado: límites del cargador (256 `.wgsl` / 256 KB / 64 KB / 32 MB / 1,024 entradas), nombres de ganchos, contrato strict (12 títulos allow), bindings del grupo 3.

## Migración en breve

| v4 | v5 |
|---|---|
| `"apiVersion": 4` | `"apiVersion": 5` (número) |
| `(s.blockFlags & bloxdBlockFlagVegetation) != 0u` | `s.flags.vegetation` |
| `#ifdef BLOXD_LIGHTING … #endif` | `if (bloxdLit()) { … } else { return bloxdDefaultLight(s, l); }` |
| `bloxdFragmentBlockPosition(p, n)` | eliminado — usa `bloxdWorldPosition()` / `flags` |
| (no existía) | `s.flags.held`, `s.flags.lifeform`, `s.localPosition`, `s.enchantTier` … |

La cabecera v5 completa restaurada (8,954 bytes, palabra por palabra) y la lista íntegra de deriva de nombres de textura están en las versiones completas en inglés y japonés (§82 y §80).

[← Parte anterior](11-reference.md)·[Volver al manual](README.md)
