# Visión general y requisitos previos

## Qué es un shader pack

Un shader pack de Bloxd.io cambia el aspecto del **renderizador WebGPU** del juego, y solo de él. Los paquetes se escriben en un **subconjunto restringido de WGSL** y se cargan desde los ajustes del juego → pantalla Shader Pack como zip o carpeta. Mientras un paquete está instalado, el renderizador WebGPU queda activado por la fuerza en los ajustes.

El código del pack se valida y compila como WGSL. Desde el WGSL del pack no se puede ejecutar JavaScript ni realizar solicitudes de red.

## Qué puedes cambiar

Un paquete se engancha al **pipeline de 3 etapas por cara** del renderizador. Los objetivos de render se dividen en tres programas con un total de **9 hooks**:

| Objetivo | Hooks (Vertex / Surface / Light) | Qué se dibuja |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | Todos los bloques salvo el agua y los modelos de bloque |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | El agua |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | Modelos de bloque (losas, escaleras, plantas), ítems, jugadores, mobs, NPC, armaduras, cosmética |

- **Se puede**: cambiar colores, transparencia y emisión; reconstruir la iluminación ([API de iluminación](../api/lighting.md)); usar las sombras solares y lunares calculadas por el motor (`bloxdShadow()`, `bloxdAirShadow(t)`, `bloxdShadowDirection()`); usar la oclusión del cielo por vóxeles (`skyLight`); muestrear texturas con `bloxdTexel`; crear efectos por modelo con `flags`; animar vértices en juegos allow
- **No se puede**: añadir texturas propias (para eso está el sistema de paquetes de texturas); aplicar postprocesado al fotograma final (bloom, etc.); acceder a la profundidad del mapa de sombras o generar un mapa de sombras propio; añadir reflejos reales (SSR); modificar el cielo, las nubes o el disco solar
- **Cómo elegir el método de sombras**: usa `bloxdShadow()` para las sombras del motor que siguen al sol y la luna. `skyLight` es un método anterior para oscurecer zonas bajo árboles y tejados; no sigue el movimiento del sol ni de la luna. Consulta [Sombras](../guides/shadows.md).

## Modos strict y allow

Cada juego tiene una política de shader packs (`shaderPackPolicy`), y **la mayoría de los juegos corre en modo strict** (sin animación de vértices, sin `discard`). Los paquetes para distribución general deben funcionar en modo strict. Ver [Variantes](variants.md) y la [referencia de política](../internals/policy.md).

## Supuestos de esta documentación

- El juego actual solo acepta paquetes `apiVersion: 5`; los paquetes v1–v4 se rechazan al cargar (los guardados quedan inactivos en silencio — [Compatibilidad](../api/compatibility.md))
- ¿Migras un paquete escrito para una versión antigua? Ver [Historial de versiones](../history/)
