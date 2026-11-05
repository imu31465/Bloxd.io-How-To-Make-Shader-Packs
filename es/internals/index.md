# Interior del motor e investigación

Especificaciones internas restauradas analizando la implementación del motor. Todo lo que hay aquí se recuperó directamente del JavaScript del build de producción vigente (`bny9u`). Separado de la documentación de la API pública ([Referencia de la API](../api/)) para preservar el comportamiento interno exacto y los resultados del análisis.

## Mapa

| Página | Contenido |
|---|---|
| [Canalización de renderizado](rendering-pipeline.md) | posición del alphaTest, montaje de 2 luces, realidad del uniform, greedy meshing |
| [Invocación de hooks](hook-invocation.md) | cómo se empalman los hooks en el WGSL del motor |
| [Cabecera del motor](engine-header.md) | la cabecera v5 completa (literal, 8.954 B) |
| [Validación de sombreadores](shader-validation.md) | internas del analizador, la tabla de firmas, HEADER_VERSION |
| [Compilación de WGSL](wgsl-compilation.md) | la compilación real de etapa 2 y los stubs de validación |
| [Identificadores reservados](reserved-identifiers.md) | los 46 símbolos `bloxdSp*` |
| [Internas de iluminación](lighting-internals.md) | estructura de blockLight / heldLight |
| [Internas de niebla](fog-internals.md) | solo lineal, la banda de gradiente de 32 bloques |
| [Muestreo de texturas](texture-sampling.md) | el codegen de texturas de 3 variantes |
| [Registro de texturas](texture-registry.md) | resolución nombre→id, 896 nombres, deriva medida |
| [Renderizado de modelos](model-rendering.md) | el programa Model de v5 |
| [Datos del motor](engine-data.md) | el ledger de constantes/límites/diseños de v5 |
| [Factores de prueba](testing-factors.md) | qué ajustes de mundo/jugador cambian los valores visibles para los paquetes |
| [Política](policy.md) | shaderPackPolicy — los 12 títulos allow |
| [El sol y la luna](sun-and-moon.md) | qué alimenta a bloxdSunDirection |
| [Depuración](debugging.md) | parámetros de URL, paneles de estadísticas |
| [Registro de investigación](research-log.md) | metodología, historia de builds, elementos sin verificar |

> API objetivo: 5 · Build objetivo: `bny9u` (2026-11-05, producción)

Las internas no son un contrato de API estable — pueden cambiar con las actualizaciones del motor, y cada página nombra su build de evidencia ([registro de investigación](research-log.md)).
