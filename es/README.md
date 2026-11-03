# Documentación de shader packs de Bloxd.io

Una guía no oficial sobre shader packs para el renderizador WebGPU de Bloxd.io — desde la creación, implementación, validación y distribución hasta la especificación de la API y la investigación de las interioridades del motor.

## Especificación vigente

- API actual: **5** (`pack.json` debe declarar `apiVersion: 5`)
- Objetivo: renderizador WebGPU
- Última verificación: 2026-11-03
- Build objetivo: `ab90qa.main.6188124c.js` (producción y preprod idénticos — verificado por md5 `fc3322212d15be2445c0e8dfc9733fcc`)
- Hooks de sombreado: 9 (Terrain / Liquid / Model × Vertex / Surface / Light)

¿Nuevo con los shader packs? Empieza por [Getting Started](getting-started/) (en inglés). ¿Consultas de API? Mira [API Reference](api/) (en inglés).

> Esta documentación no es un recurso oficial de los desarrolladores. Las interioridades del motor pueden cambiar con las actualizaciones — comprueba el build objetivo y el estado de verificación de cada página.
>
> Esta guía se creó con asistencia de IA; la exactitud no está garantizada. Verifícalo contra el comportamiento real del juego.
>
> La función de shader packs es una función oficial accesible desde la interfaz del juego, y los packs son WGSL puro (sin ejecución de JS ni red), así que nada peligroso ocurre con código normal.

## Entradas por objetivo

| Objetivo | Categoría | Público |
|---|---|---|
| Crear tu primer pack | [Getting Started](getting-started/) | principiantes |
| Consultar funciones y campos de la API | [API Reference](api/) | autores en plena implementación |
| Implementar un efecto (luz, agua, modelos…) | [Guides & Recipes](guides/) | cualquiera que construya un look |
| Corregir un error | [Troubleshooting](troubleshooting/) | cualquiera con un pack roto |
| Investigar interioridades del motor | [Engine Internals & Research](internals/) | analistas del motor |
| Consultar versiones antiguas (v1–v5) | [Version History](history/) | quien migra packs antiguos |

## Estructura de la documentación

- **[Getting Started](getting-started/)** — visión general, inicio rápido, estructura del pack, pack.json, los 9 hooks, variantes, validación, distribución.
- **[API Reference](api/)** — la especificación sistemática de la v5: hooks, flags, estructuras de entrada/salida, todas las funciones, iluminación, API de texturas, constantes, preprocesador, restricciones, compatibilidad y el catálogo de 896 nombres.
- **[Guides](guides/)** · **[Recipes](recipes/)** · **[Troubleshooting](troubleshooting/)** · **[Engine Internals & Research](internals/)** · **[Version History](history/)**

> Nota: Getting Started / API Reference / Troubleshooting y las páginas nuevas de v5 en Guides, Recipes e Internals se ofrecen actualmente **en inglés** (misma estructura que las páginas traducidas de esta edición). El contenido ya traducido se conserva íntegramente.

## Estados de verificación

| Etiqueta | Significado |
|---|---|
| Verified | verificado en el build objetivo |
| Analyzed | confirmado analizando la implementación interna |
| Partially Verified | confirmado solo parcialmente |
| Experimental | experimental / sin consolidar |
| Historical | material de una versión pasada |
