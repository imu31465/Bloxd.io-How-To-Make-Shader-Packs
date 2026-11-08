# Documentación de shader packs de Bloxd.io

Una guía no oficial sobre shader packs para el renderizador WebGPU de Bloxd.io — desde la creación, implementación, validación y distribución hasta la especificación de la API y la investigación de las interioridades del motor.

## Especificación vigente

- API actual: **5** (`pack.json` debe declarar `apiVersion: 5`)
- Objetivo: renderizador WebGPU
- Última verificación: 2026-11-05
- Build objetivo: `v98qt8.main.62d8d238.js` (producción y preprod, verificado el 2026-11-08, bundle idéntico byte a byte, md5 `7458fd47ff88331d9f451d1456ff48ac` — registro, cabecera, hooks y límites remedidos)
- Hooks de sombreado: 9 (Terrain / Liquid / Model × Vertex / Surface / Light)

¿Nuevo con los shader packs? Empieza por [Primeros pasos](getting-started/). ¿Consultas de la API? Mira [Referencia de la API](api/).

> Esta documentación no es un recurso oficial de los desarrolladores del juego. Las interioridades del motor pueden cambiar con las actualizaciones — comprueba el build objetivo y el estado de verificación anotados en cada página.
>
> Esta guía se creó con asistencia de IA; la exactitud no está garantizada. Verifícala contra el comportamiento real del juego. Sigue verificando las recetas contra la pantalla del cargador y la compilación en el juego.
>
> La función de shader packs en sí es una función oficial accesible desde la interfaz del juego, y los packs son WGSL puro (sin ejecución de JS ni red), así que nada peligroso ocurre con código normal.

## Entradas por objetivo

| Objetivo | Categoría | Público |
|---|---|---|
| Crear tu primer shader pack | [Primeros pasos](getting-started/) | autores primerizos de packs |
| Consultar funciones y campos de la API | [Referencia de la API](api/) | autores en plena implementación |
| Implementar un efecto (luz, agua, modelos…) | [Guías](guides/) · [Recetas](recipes/) | cualquiera que construya un look |
| Corregir un error | [Solución de problemas](troubleshooting/) | cualquiera con un pack roto |
| Investigar las interioridades del motor | [Interior del motor e investigación](internals/) | analistas del motor |
| Consultar versiones antiguas (v1–v5) | [Historial de versiones](history/) | quien migra packs antiguos |

## Mapa de la documentación

- **[Primeros pasos](getting-started/)** — visión general, inicio rápido, estructura del pack, pack.json, los 9 hooks, variantes, validación, distribución. Un tutorial de vía única hasta tu primer pack.
- **[Referencia de la API](api/)** — la especificación sistemática de la v5: hooks, flags, estructuras de entrada/salida, todas las funciones, iluminación, API de texturas, constantes, preprocesador, restricciones, compatibilidad y el catálogo de 911 nombres.
- **[Guías](guides/)** — cómo funciona la iluminación, sombras, agua, noche, renderizado de modelos, rendimiento, conceptos de realismo.
- **[Recetas](recipes/)** — ejemplos de código orientados a objetivo: colores, iluminación, emisión, coordenadas, animación, líquidos, vértices, matemáticas, realismo, sombreadores de modelo, efectos de encantamiento.
- **[Solución de problemas](troubleshooting/)** — resolución de errores por síntoma: carga, versión de API, compilación, validación, variantes, visual, texturas, iluminación, modelos, rendimiento.
- **[Interior del motor e investigación](internals/)** — canalización de renderizado, invocación de hooks, cabecera del motor, interioridades de validación y compilación, identificadores reservados, interioridades de iluminación/niebla, muestreo y registro de texturas, renderizado de modelos, datos medidos.
- **[Historial de versiones](history/)** — de v1 a v5: cambios por versión, pasos de migración, API eliminadas.

## Estados de verificación

Cada página anota su versión de API objetivo, build, fecha de última verificación y estado.

| Etiqueta | Significado |
|---|---|
| Verified | verificado en el dispositivo / en el build objetivo |
| Analyzed | confirmado analizando la implementación interna |
| Partially Verified | confirmado solo parcialmente |
| Experimental | experimental / sin consolidar |
| Historical | material de una versión pasada |

Los datos crudos extraídos del motor (cabecera, registro, mediciones) viven en [Interior del motor e investigación](internals/); la metodología y los registros que hay detrás se siguen en el [registro de investigación](internals/research-log.md).
