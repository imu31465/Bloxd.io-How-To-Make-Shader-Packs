# Hooks de sombreado

> API objetivo: 5 · Build objetivo: `ab90qa` · Estado: Verified

Los paquetes pueden definir **9 hooks** — 3 objetivos de render (programas) × 3 etapas del pipeline, todos opcionales (indefinido significa valor por defecto del motor).

## Comparación de los 9 hooks

| Hook | Programa | Etapa | Argumentos | Devuelve | Condición de ejecución |
|---|---|---|---|---|---|
| `bloxdTerrainVertex` | Terrain | vertex | `BloxdVertexIn` | `BloxdVertex` | solo variantes allow (**definirlo en strict es en sí un error**) |
| `bloxdTerrainSurface` | Terrain | surface | `BloxdSurfaceIn` | `BloxdSurface` | siempre |
| `bloxdTerrainLight` | Terrain | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | siempre |
| `bloxdLiquidVertex` | Liquid | vertex | `BloxdVertexIn` | `BloxdVertex` | solo allow |
| `bloxdLiquidSurface` | Liquid | surface | `BloxdSurfaceIn` | `BloxdSurface` | siempre |
| `bloxdLiquidLight` | Liquid | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | siempre |
| `bloxdModelVertex` | Model | vertex | `BloxdVertexIn` | `BloxdVertex` | solo allow |
| `bloxdModelSurface` | Model | surface | `BloxdSurfaceIn` | `BloxdSurface` | siempre |
| `bloxdModelLight` | Model | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | siempre |

## Qué dibuja cada programa

| Programa | Dibuja | Agua cuando no existe hook de Liquid |
|---|---|---|
| **Terrain** | todo bloque salvo el agua y los modelos de bloque | — |
| **Liquid** | el agua | **tampoco corre ningún hook de Terrain sobre el agua** (el agua conserva su aspecto por defecto) |
| **Model** | modelos de bloque (losas, escaleras, plantas, cultivos, telarañas), ítems sujetos/caídos/en vuelo, jugadores, mobs, NPC, armaduras, cosmética | — |

## Papeles de las etapas

- **Vertex** — mueve posiciones de vértices (vaivén de hierba, olas). La animación de vértices desactiva el paquete entero en juegos strict, así que `#ifndef BLOXD_STRICT` es obligatorio
- **Surface** — la salida del material: `colour` / `alpha` (condicional) / `emission` / `enchantColour` / `overlayColour`
- **Light** — el color final; recibe la salida de surface más `BloxdLightIn`. Su valor de retorno es el color en pantalla

## Firmas

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
// bloxdLiquid* / bloxdModel* take the same argument and return types
```

## Restricciones de llamada a funciones especiales

El validador del motor restringe qué hooks pueden alcanzar ciertas funciones (las infracciones fallan con diagnósticos dedicados de «reaches»):

| Función | Llamable desde | Guarda |
|---|---|---|
| `bloxdTexel` | solo hooks surface / light | — |
| `bloxdTextureSize` | solo hooks surface / light | — |
| `bloxdOpaqueBehind` | hooks surface / light (con sentido en variantes de líquido) | `#ifdef BLOXD_SCENE_DEPTH` |

> `bloxdFragmentBlockPosition` ya no está en la cabecera documentada, pero el motor la sigue inyectando y aceptando — ver [Funciones: bloxdFragmentBlockPosition](functions.md#bloxdfragmentblockposition--indocumentado-pero-sigue-inyectado). Era la única función especial llamable desde hooks de vértice; para código nuevo prefiere `flags` para «qué bloque es este».

## Fallbacks y compartición

- Hook indefinido → esa etapa se comporta como el valor por defecto del motor (`bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **Comparte el procesamiento entre hooks** con una función de ámbito de módulo llamada desde ambos:

```wgsl
fn sharedSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}
```

## Relacionado

- Plantilla oficial de 9 hooks → [Primeros pasos: hooks de sombreado](../getting-started/hooks.md)
- Cada campo de cada estructura → [Estructuras](structures.md)
- Interioridades de la invocación de hooks → [Interior del motor](../internals/hook-invocation.md)
