# Hooks de sombreado

> API objetivo: 5 · Build objetivo: `xkg8x` (2026-11-04, producción) · Estado: Verified

Un paquete puede enchufarse en **9 hooks**: 3 objetivos de render (Terrain / Liquid / Model) × 3 etapas del pipeline (Vertex / Surface / Light). Todos son opcionales — un hook indefinido cae en el valor por defecto del motor.

## Los hooks

| Hook | Etapa | Qué hace |
|---|---|---|
| `bloxdTerrainVertex` | terrain · vertex | Animación de vértices del terreno. **No puede correr en juegos strict** |
| `bloxdTerrainSurface` | terrain · surface | Color, alpha, emisión, encantamiento y superposición del terreno |
| `bloxdTerrainLight` | terrain · light | Color final del terreno — la última etapa del fragmento |
| `bloxdLiquidVertex` | liquid · vertex | Animación de vértices del agua. **Requiere guarda frente a strict** |
| `bloxdLiquidSurface` | liquid · surface | Color, alpha y emisión del agua |
| `bloxdLiquidLight` | liquid · light | Color final del agua |
| `bloxdModelVertex` | model · vertex | Animación de vértices de modelos de bloque / ítems / entidades. **Requiere guarda frente a strict** |
| `bloxdModelSurface` | model · surface | Color, alpha, emisión, encantamiento y superposición del modelo |
| `bloxdModelLight` | model · light | Color final del modelo |

Firmas (los tipos deben coincidir exactamente; los nombres de parámetros son libres):

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex;
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight;
// bloxdLiquid* / bloxdModel* take the same types
```

## Reparto de objetivos de render

- **Terrain** — todo bloque salvo el agua y los modelos de bloque
- **Liquid** — el agua
- **Model** — modelos de bloque (losas, escaleras, plantas de planos cruzados), ítems sujetos/caídos/en vuelo, jugadores, mobs, NPC, armaduras, cosmética

**Importante**: si un paquete no define ningún hook de Liquid, **tampoco corre ningún hook de Terrain sobre el agua** (el agua la manejan solos los hooks de Liquid). Esto difiere del comportamiento anterior a v4, donde el líquido caía en los hooks de terreno.

## Fallbacks y compartición de código

- Un hook indefinido significa que esa etapa usa el valor por defecto del motor (mismo comportamiento que `bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **Para compartir código entre hooks**, define una función de ámbito de módulo y llámala desde ambos:

```wgsl
fn applyWarmth(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.04, 1.0, 0.96);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}
```

## El paquete por defecto (plantilla oficial de 9 hooks)

La plantilla de partida ahora incluye los hooks de luz. 1.683 bytes tal como se distribuye, literal:

```wgsl
// Every hook here returns its engine default. Modify the return values to start
// building a shader pack. If you delete a hook, the default is used instead.

// All blocks but water and block models use terrain hooks.
#ifndef BLOXD_STRICT
// Strict games keep terrain where it is. Without the #ifndef, this hook would
// turn the whole shader pack off there.
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Water uses liquid hooks. To share code with another hook, define a function
// and call it from both places.
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Models: block models such as slabs and plants, items, players and mobs.
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

Los comentarios de la plantilla son la guía de diseño: modifica los valores de retorno para empezar a construir; borrar un hook restaura el valor por defecto; los juegos strict mantienen el terreno donde está; comparte código mediante funciones.

## Convenciones de escritura

- **Nunca construyas las estructuras de salida directamente** (`BloxdSurface(...)` falla la validación). Parte siempre de `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` y muta campos. El primer argumento del hook de light ya es del tipo de salida, así que `var out = s;` también funciona
- Un `var x: BloxdSurface;` desnudo (solo anotación de tipo) también es un error de validación
- Los parámetros de los hooks son de **solo lectura**. Copia primero (`var sv = s;`)
- No puedes usar identificadores que empiecen por `bloxd` (sin distinguir mayúsculas), salvo los 9 nombres de funciones hook
- Escribe las constantes como `const` (`#define` no toma valor)

Para cada campo que cada hook puede leer y escribir, ver [Estructuras](../api/structures.md).
