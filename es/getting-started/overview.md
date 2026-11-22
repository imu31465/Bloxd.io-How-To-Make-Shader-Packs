# Visión general y requisitos previos

> API: 5 · Estado: Verified

## Qué es un shader pack

Un shader pack de Bloxd.io cambia el aspecto del **renderizador WebGPU** del juego, y solo de él. Los paquetes se escriben en un **subconjunto restringido de WGSL** y se cargan desde los ajustes del juego → pantalla Shader Pack como zip o carpeta. Mientras un paquete está instalado, el renderizador WebGPU queda activado por la fuerza en los ajustes.

El código del pack se valida y compila como WGSL. Desde el WGSL del pack no se puede ejecutar JavaScript ni realizar solicitudes de red.

## Qué puedes cambiar

Un paquete se integra en el **pipeline de renderizado de cada cara, que consta de tres etapas**. Los objetivos de renderizado se reparten entre tres programas con un total de **9 hooks**:

| Objetivo | Hooks (Vertex / Surface / Light) | Qué se dibuja |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | Todos los bloques salvo el agua y los modelos de bloque |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | El agua |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | Modelos de bloque (losas, escaleras, plantas), objetos, jugadores, mobs, NPC, armaduras y objetos cosméticos |

- **Se puede**: cambiar colores, transparencia y emisión; ajustar la iluminación (la [API de iluminación](../api/lighting.md)); muestrear texturas con `bloxdTexel`; crear efectos por modelo mediante `flags`; animar vértices (solo en juegos con modo allow)
- **No se puede**: añadir texturas propias; crear efectos de posprocesado como bloom; generar un mapa de sombras propio ni acceder a sus datos de profundidad; crear reflejos reales (SSR); ni aplicar sombreado al cielo, las nubes o el disco solar
- **Sombras**: `bloxdShadow()` proporciona el factor de sombra solar/lunar calculado por el motor, y `bloxdShadowDirection()` indica la dirección en la que viaja la luz que proyecta la sombra. `bloxdAirShadow(t)` evalúa un punto entre la cámara y el fragmento. También sigue disponible el método anterior de oclusión del cielo por vóxeles mediante `skyLight` ([Guía de sombras](../guides/shadows.md))

## Modos strict y allow

Cada juego tiene una política de shader packs (`shaderPackPolicy`), y **la mayoría de los juegos funciona en modo strict** (sin animación de vértices, sin `discard`). Los paquetes para distribución general deben funcionar en modo strict. Ver [Variantes](variants.md) y la [referencia de política](../internals/policy.md).

## Supuestos de esta documentación

- El juego actual solo acepta paquetes `apiVersion: 5`; los paquetes v1–v4 se rechazan al cargar (los guardados quedan inactivos en silencio — [Compatibilidad](../api/compatibility.md))
- ¿Migras un paquete escrito para una versión antigua? Ver [Historial de versiones](../history/)
- Las descripciones de los mecanismos internos del motor son material de referencia; consulta la referencia de la API para conocer el contrato compatible
