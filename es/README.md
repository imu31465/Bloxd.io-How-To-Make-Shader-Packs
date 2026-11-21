# Documentación de shader packs de Bloxd.io

Guía no oficial sobre los shader packs del renderizador WebGPU de Bloxd.io. Cubre todo el proceso —desde la creación y las pruebas hasta la referencia de la API y el análisis del funcionamiento interno del motor—.

## Especificación vigente

- API actual: **5** (`pack.json` debe declarar `apiVersion: 5`)
- Objetivo: renderizador WebGPU
- Hooks de sombreado: 9 (Terrain / Liquid / Model × Vertex / Surface / Light)

¿Es tu primer shader pack? Empieza por [Primeros pasos](getting-started/). ¿Buscas una función o un campo? Consulta la [Referencia de la API](api/).

> Esta documentación no es un recurso oficial de los desarrolladores del juego. Los mecanismos internos del motor son detalles de implementación y pueden cambiar con las actualizaciones; consulta la referencia de la API para conocer el comportamiento compatible.
>
> Esta guía se preparó con ayuda de IA. Comprueba el comportamiento en el juego, ya que los detalles internos pueden cambiar.
>
> Los packs se escriben únicamente en WGSL: no ejecutan JavaScript ni realizan solicitudes de red.

## Entradas por objetivo

| Objetivo | Categoría | Público |
|---|---|---|
| Crear tu primer shader pack | [Primeros pasos](getting-started/) | autores primerizos de packs |
| Consultar funciones y campos de la API | [Referencia de la API](api/) | autores en plena implementación |
| Implementar un efecto (luz, agua, modelos…) | [Guías](guides/) · [Recetas](recipes/) | quienes quieran implementar un estilo visual |
| Corregir un error | [Solución de problemas](troubleshooting/) | cualquiera con un pack roto |
| Entender el funcionamiento interno del motor | [Funcionamiento interno del motor](internals/) | lectores técnicos |
| Consultar versiones antiguas (v1–v5) | [Historial de versiones](history/) | quien migra packs antiguos |

## Mapa de la documentación

- **[Primeros pasos](getting-started/)** — visión general, inicio rápido, estructura del pack, pack.json, los 9 hooks, variantes, validación, distribución.
- **[Referencia de la API](api/)** — la especificación sistemática de la v5: hooks, flags, estructuras de entrada/salida, todas las funciones, iluminación, API de texturas, constantes, preprocesador, restricciones, compatibilidad y el catálogo de 1.017 identificadores de textura.
- **[Guías](guides/)** — cómo funciona la iluminación, sombras, agua, noche, renderizado de modelos, rendimiento, conceptos de realismo.
- **[Recetas](recipes/)** — ejemplos de código orientados a objetivo: colores, iluminación, emisión, coordenadas, animación, líquidos, vértices, matemáticas, realismo, sombreadores de modelo, efectos de encantamiento.
- **[Solución de problemas](troubleshooting/)** — resolución de errores por síntoma: carga, versión de API, compilación, validación, variantes, visual, texturas, iluminación, modelos, rendimiento.
- **[Funcionamiento interno del motor](internals/)** — canalización de renderizado, invocación de hooks, cabecera del motor, detalles internos del validador y del compilador, identificadores reservados, mecanismos internos de iluminación y niebla, muestreo y registro de texturas, renderizado de modelos, datos medidos.
- **[Historial de versiones](history/)** — de v1 a v5: cambios por versión, pasos de migración, API eliminadas.

## Estados de verificación

Cada página indica la versión de API que cubre y el estado de verificación de su contenido.

| Etiqueta | Significado |
|---|---|
| Verified | verificado mediante el juego |
| Analyzed | confirmado analizando la implementación interna |
| Partially Verified | confirmado solo parcialmente |
| Experimental | experimental / sin consolidar |
| Historical | material de una versión pasada |

Los datos extraídos del motor (cabecera, registro y mediciones) están disponibles en [Funcionamiento interno del motor](internals/); la metodología y los registros se recogen en el [registro de investigación](internals/research-log.md).
