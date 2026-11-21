# Referencia de la API

Esta página documenta la API v5 actual. La fuente principal de sus definiciones es la cabecera que el motor añade automáticamente al inicio de cada pack (consulta [Interior del motor](../internals/engine-header.md) para ver la cabecera completa).

## Contenido

| Página | Contenido |
|---|---|
| [Formato del paquete](pack-format.md) | cada campo de `pack.json`, límites del cargador, diseño del uniform |
| [Hooks de sombreado](hooks.md) | comparación de los 9 hooks: firmas, objetivos, condiciones de ejecución |
| [Flags](flags.md) | los 14 campos de `BloxdFlags` |
| [Estructuras](structures.md) | cada campo de cada estructura (incl. campos condicionales) |
| [Funciones](functions.md) | todas las firmas de funciones de fotograma/por defecto/especiales |
| [Iluminación](lighting.md) | la API de iluminación y el orden de procesamiento |
| [API de texturas](texture-api.md) | `bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*` y la nomenclatura |
| [Constantes](constants.md) | `bloxdPi` / `bloxdTau` / `bloxdChunkSize` |
| [Preprocesador](preprocessor.md) | `BLOXD_STRICT` / `BLOXD_ALPHA` / `BLOXD_SCENE_DEPTH` |
| [Restricciones](restrictions.md) | límites del lenguaje, identificadores reservados |
| [Compatibilidad](compatibility.md) | paquetes de versiones antiguas, revalidación de paquetes guardados |
| [Catálogo de texturas](texture-catalog.md) | 1.017 constantes con nombre disponibles (con búsqueda) |

> API: 5 · Estado: Analyzed (reconstruido a partir de la cabecera del motor y el validador)

¿Migras desde v4? Ver [Historial de versiones: v5](../history/v5.md).
