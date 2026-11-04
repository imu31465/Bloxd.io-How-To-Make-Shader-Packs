# Visión general y requisitos previos

> API objetivo: 5 · Build objetivo: `xkg8x` (2026-11-04, producción) · Estado: Verified

## Qué es un shader pack

Un shader pack de Bloxd.io cambia el aspecto del **renderizador WebGPU** del juego, y solo de él. Los paquetes se escriben en un **subconjunto restringido de WGSL** y se cargan desde los ajustes del juego → pantalla Shader Pack como zip o carpeta. Mientras un paquete está instalado, el renderizador WebGPU queda activado por la fuerza en los ajustes.

Los paquetes se validan y compilan como WGSL puro — sin ejecución de JavaScript ni red. Con código normal no puede ocurrir nada peligroso.

## Qué puedes cambiar

Un paquete se engancha al **pipeline de 3 etapas por cara** del renderizador. Los objetivos de render se dividen en tres programas con un total de **9 hooks**:

| Objetivo | Hooks (Vertex / Surface / Light) | Qué se dibuja |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | Todos los bloques salvo el agua y los modelos de bloque |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | El agua |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | Modelos de bloque (losas, escaleras, plantas), ítems, jugadores, mobs, NPC, armaduras, cosmética |

- **Se puede**: cambiar colores, transparencia y emisión; reconstruir la iluminación (la [API de iluminación](../api/lighting.md)); sombras de estilo proyectado (vía `skyLight`); muestrear texturas (`bloxdTexel` — leer el atlas existente de texturas de bloque); efectos por modelo (`flags` te dicen «esto es un ítem en mano», «esto es un jugador»); animación de vértices (solo juegos allow)
- **No se puede**: añadir texturas propias (eso es tarea del sistema de paquetes de texturas); postprocesado (bloom etc.); sombras con mapa de sombras que giren con el sol; reflejos reales (SSR); afectar al cielo, las nubes o al propio disco solar
- **Fácil de pasar por alto pero potente**: **sombras de estilo proyectado usando `skyLight` (oclusión de cielo por vóxeles)** — oscurece con claridad las zonas bajo árboles y techos. Romper bloques hace que LightEngine recalcule de inmediato, así que las sombras siguen los cambios en tiempo real

## Modos strict y allow

Cada juego tiene una política de shader packs (`shaderPackPolicy`), y **la mayoría de los juegos corre en modo strict** (sin animación de vértices, sin `discard`). Los paquetes para distribución general deben funcionar en modo strict. Ver [Variantes](variants.md) y la [referencia de política](../internals/policy.md).

## Supuestos de esta documentación

- El juego actual solo acepta paquetes `apiVersion: 5`; los paquetes v1–v4 se rechazan al cargar (los guardados quedan inactivos en silencio — [Compatibilidad](../api/compatibility.md))
- ¿Migras un paquete escrito para una versión antigua? Ver [Historial de versiones](../history/)
- Las interioridades del motor pueden cambiar con las actualizaciones, así que cada página nombra su build objetivo
