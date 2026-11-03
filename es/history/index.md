# Historial de versiones

> Estado: Historical — registros versión por versión; cada guía indica su propio build objetivo

Cambios, pasos de migración y API eliminadas de v1 a v5. Para migrar paquetes antiguos y para las especificaciones conservadas de cada época.

## Cronología

| Versión | En producción desde | Guía | Lo esencial |
|---|---|---|---|
| v1 | (inicial) | [v1](v1.md) | primera API de shader packs. 6 hooks (terrain/liquid × vertex/surface); vocabulario `bloxdTime` / `bloxdOriginOffset` / `bloxdFaceBlock` / `engineColour` / `fogFactor` |
| v2 | — | [v2](v2.md) | renombrado total de identificadores, `blockId`, `BLOXD_SCENE_DEPTH` y `bloxdOpaqueBehind()` |
| v3 | 2026-10-19 | [v3](v3.md) | `blockId` → `blockFlags` (bits), `bloxdPi` / `bloxdTau`, hooks de líquido oficiales, interioridades de la invocación de hooks |
| v4 | 2026-10-26 | [v4](v4.md) | API de texturas (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`), el contrato strict, análisis de cabecera y registro del motor |
| **v5** | **2026-11-03** | [v5](v5.md) | **actual** — estructura `BloxdFlags` (14 bools), hooks de Model (9 en total), la API de iluminación `bloxdLit()` / `bloxdLitColour()`, `localPosition`, entradas y salidas de encantamiento/superposición, 6 variantes |

## El prefacio común

El juego actual solo acepta `apiVersion: 5` y **los paquetes de versiones antiguas fallan en el instante mismo de la carga** (los guardados quedan inactivos en silencio — [Compatibilidad](../api/compatibility.md)). Cada guía cubre «anterior → siguiente». ¿Cruzas varias versiones? Aplícalas de la más antigua a la más nueva.

## Camino rápido a una lista de comprobación

- paquete v4 → [guía de v5](v5.md) §77 (casi todo mecánico)
- paquete v3 → [v4](v4.md) §61 → [v5](v5.md) §77
- paquete v2 → [v3](v3.md) §47 → v4 → v5
- paquete v1 → empieza por [v2](v2.md) §37

> Para la especificación vigente en sí ver [Referencia de la API](../api/); para las interioridades del build vigente ver [Interior del motor](../internals/).
