# Internas del motor

Esta categoría explica el funcionamiento interno del motor y puede ayudar a comprender cómo se ejecutan los shader packs. Estos detalles de implementación pueden cambiar; para las reglas de uso estables y las API disponibles, consulta la [Referencia de API](../api/).

## Contenido

| Página | Contenido |
|---|---|
| [Canalización de renderizado](rendering-pipeline.md) | posición del alphaTest, montaje de 2 luces, realidad del uniform, greedy meshing |
| [Invocación de hooks](hook-invocation.md) | cómo se empalman los hooks en el WGSL del motor |
| [Encabezado del motor](engine-header.md) | Declaraciones WGSL que se añaden a los shader packs |
| [Validación de sombreadores](shader-validation.md) | funcionamiento interno del analizador, la tabla de firmas, HEADER_VERSION |
| [Compilación de WGSL](wgsl-compilation.md) | la compilación real de etapa 2 y los stubs de validación |
| [Identificadores reservados](reserved-identifiers.md) | los 46 símbolos `bloxdSp*` |
| [Internas de iluminación](lighting-internals.md) | estructura de blockLight / heldLight |
| [Internas de niebla](fog-internals.md) | solo lineal, la franja de atenuación de 32 bloques |
| [Muestreo de texturas](texture-sampling.md) | la generación de código de texturas de 3 variantes |
| [Registro de texturas](texture-registry.md) | Resolución de nombres y nombres de animación y orientación |
| [Renderizado de modelos](model-rendering.md) | el programa Model de v5 |
| [Datos del motor](engine-data.md) | Funciones de API v5 y límites de los packs |
| [Factores de prueba](testing-factors.md) | qué ajustes de mundo/jugador cambian los valores visibles para los paquetes |
| [Política](policy.md) | shaderPackPolicy — los 12 títulos allow |
| [El sol y la luna](sun-and-moon.md) | qué alimenta a bloxdSunDirection |
| [Depuración](debugging.md) | parámetros de URL, paneles de estadísticas |


Los detalles internos no constituyen un contrato de API estable. Al crear packs, da prioridad a la [Referencia de API](../api/).
