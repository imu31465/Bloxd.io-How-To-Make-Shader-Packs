# Variantes y guardas

> API objetivo: 5 · Build objetivo: `v98qt8` (2026-11-08, producción y preprod) · Estado: Analyzed

## 6 variantes

Escribes un único cuerpo de código, pero debe compilar en las **6 variantes**: `{strict, allow} × {terrain, liquid, model}`. El cargador valida las seis en el momento de la carga.

El eje «iluminación sí/no» de v4 y anteriores ha desaparecido (v4 tenía 8 variantes). El estado de iluminación es ahora una pregunta en tiempo de ejecución para [`bloxdLit()`](../api/lighting.md), no una ramificación de compilación.

| Variante | Ejemplo | Macros definidas |
|---|---|---|
| `allow.terrain` | terreno en un juego allow | `BLOXD_ALPHA` |
| `allow.liquid` | agua en un juego allow | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | modelos en un juego allow | `BLOXD_ALPHA` |
| `strict.terrain` | terreno en un juego strict | — |
| `strict.liquid` | agua en un juego strict | `BLOXD_SCENE_DEPTH` |
| `strict.model` | modelos en un juego strict | — |

## Condicionales

Solo están disponibles `#define NAME` (sin valor) / `#ifdef` / `#ifndef` / `#else` / `#endif`. La `#` va al inicio de línea (dentro de funciones está bien).

| Guarda | Significado | Uso típico |
|---|---|---|
| `#ifndef BLOXD_STRICT` | solo variantes no strict (allow) | envolver hooks de vértice enteros, envolver `discard` |
| `#ifdef BLOXD_ALPHA` | variantes donde existe `alpha` (todo líquido + terreno/modelo no strict) | envolver el código que toca alpha |
| `#ifdef BLOXD_SCENE_DEPTH` | todas las variantes de líquido | envolver las llamadas a `bloxdOpaqueBehind()` |

`BLOXD_LIGHTING` fue **eliminada en v5**. Usarla falla la validación con: *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## El contrato de los juegos strict

La mayoría de los juegos son strict (sin animación de vértices, sin `discard`). Un hook de vértice sin guarda informa `<hook> moves terrain, which strict games prevent.` y un `discard` alcanzable informa `discard makes terrain see-through, which strict games prevent.` — ambos desactivan **todos los hooks** en ese juego strict. Envuelve siempre los hooks de vértice en `#ifndef BLOXD_STRICT`.

Para las interioridades de la política por juego, ver [Interior del motor: política](../internals/policy.md).
