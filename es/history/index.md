# Historial de versiones

> Tipo: histórico · Guías de migración de API v1–v5

Esta sección conserva los cambios, los pasos de migración y las API retiradas de las versiones v1 a v5. Se centra en el comportamiento de la API y las rutas de migración, no en identificadores de builds ni fechas de verificación.

## Versiones

| Versión | Guía de migración | Cambios principales |
|---|---|---|
| v1 | [v1](v1.md) | API inicial de shader packs |
| v2 | [v2](v2.md) | Renombrado de identificadores, `blockId` y acceso a la profundidad de escena |
| v3 | [v3](v3.md) | `blockFlags`, `bloxdPi` / `bloxdTau` y hooks Liquid |
| v4 | [v4](v4.md) | API de texturas y restricciones de juegos strict |
| **v5** | [v5](v5.md) | **Actual** — `BloxdFlags`, hooks Model y API de iluminación y sombras |

## Cómo se tratan las versiones anteriores

El juego actual solo acepta packs con `apiVersion: 5`. Los packs antiguos no se pueden cargar sin cambios. Para migrar entre varias versiones, aplica las guías en orden, empezando por la versión más antigua.

## Rutas de migración

- Pack v4 → [guía de migración a v5](v5.md)
- Pack v3 → [v4](v4.md) → [v5](v5.md)
- Pack v2 → [v3](v3.md) → [v4](v4.md) → [v5](v5.md)
- Pack v1 → [v2](v2.md) → [v3](v3.md) → [v4](v4.md) → [v5](v5.md)

Para consultar la API actual, visita la [Referencia de API](../api/).
