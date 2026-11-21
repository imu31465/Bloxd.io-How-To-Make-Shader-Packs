# Datos del motor

> API objetivo: 5 · Uso: resumen de especificaciones

Esta página resume la API disponible para los shader packs y los límites importantes al crear uno. Consulta las referencias específicas para ver definiciones y ejemplos.

## Resumen de la API

| Elemento | Especificación |
|---|---|
| Versión de API | `5` |
| Hooks | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| Variantes | 6 (allow / strict × terrain / liquid / model) |
| Macros | `BLOXD_STRICT`, `BLOXD_ALPHA` y `BLOXD_SCENE_DEPTH`. `BLOXD_LIGHTING` no está disponible |
| Uniform del pack | 80 bytes. Consulta [Formato del pack](../api/pack-format.md) para ver los offsets |
| Texturas | Usa constantes con nombre en formato `bloxdTextureId<Name>`. No fijes IDs numéricos |
| Nombres reservados | Los identificadores que empiezan por `bloxd` están reservados para el motor |

## Límites del pack

| Elemento | Límite |
|---|---:|
| Archivos WGSL | 256 |
| Total de código fuente WGSL | 256 KB |
| `pack.json` | 64 KB |
| Archivo ZIP | 32 MB |
| Entradas ZIP | 1.024 |

Coloca un único manifiesto en la raíz del ZIP y guarda los archivos en UTF-8. No se aceptan rutas duplicadas ni formatos ZIP no compatibles. Consulta [Formato del pack](../api/pack-format.md) para más detalles.

## Funciones principales de API v5

- `bloxdShadow()` y `bloxdAirShadow(t)` exponen información de las sombras del sol y la luna.
- `bloxdShadowDirection()` devuelve la dirección de la luz que proyecta la sombra.
- Establece el campo opcional `keepCircleShadows` de `pack.json` en `true` para conservar las sombras circulares tradicionales al usar la API de sombras.
- Comprueba la iluminación en tiempo de ejecución con `bloxdLit()`; la macro `BLOXD_LIGHTING` no está disponible.

## Relacionado

- [Referencia de API](../api/) — funciones, estructuras y constantes
- [Formato del pack](../api/pack-format.md) — manifiesto, uniform y límites del cargador
- [Catálogo de texturas](../api/texture-catalog.md) — nombres de texturas disponibles
- [Política por juego](policy.md) — cobertura allow / strict
- [Guía de migración de API v4](../history/v4.md) — migración desde la versión anterior
