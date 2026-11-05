# Flags (BloxdFlags)

> API objetivo: 5 · Build objetivo: `bny9u` · Estado: Analyzed (restaurado literalmente de la cabecera en vivo)

v5 identifica las caras con una estructura de booleanos con nombre. La máscara de bits `blockFlags: u32` de v4 y sus 6 constantes `bloxdBlockFlag*` han desaparecido.

## Definición (literal de la cabecera)

```wgsl
// What kind of block, item or lifeform a face is. Any number of flags may be
// set, possibly even none. For example, sandstone is sand and rock.
struct BloxdFlags {
    opaque: bool,     // Opaque blocks, i.e. full cubes with no gaps or holes.
    emissive: bool,   // Blocks that emit light, e.g. lava and glowing ores.
    vegetation: bool, // Leaves, grass blocks and leafy plants, e.g. tall grass.
    dirt: bool,       // Soil, grass blocks included. Rocky Dirt is rock too.
    sand: bool,       // Sand, Red Sand and every sandstone, which is rock too.
    rock: bool,       // Stone variants, and more, e.g. gravel, ores and magma.

    // Drawn as block models, so never part of terrain or flagged as opaque.
    slab: bool,       // Half blocks.
    stairs: bool,     // Stairs and corner stairs.
    flat: bool,       // Planes, e.g. tall grass, flowers, crops and cobwebs.

    placed: bool,     // Blocks placed as part of chunks. Not items or vehicles.
    held: bool,       // Items in a hand, in first or third person.
    dropped: bool,    // Dropped items, on the ground, on a belt or in a pipe.
    thrown: bool,     // Items in flight, e.g. snowballs, arrows and rockets.

    lifeform: bool,   // Players, mobs and NPCs. Includes armour and cosmetics.
}
```

## Referencia de campos

| Campo | Clase | Significado | Objetos típicos | Hooks |
|---|---|---|---|---|
| `opaque` | material | cubo completo sin huecos ni agujeros | piedra, tierra, madera maciza | los 9 |
| `emissive` | material | bloques que emiten luz | lava, menas brillantes | los 9 |
| `vegetation` | material | hojas, bloques de hierba, plantas frondosas | hojas, hierba alta | los 9 |
| `dirt` | material | suelo (bloques de hierba incluidos) | tierra, bloque de hierba, Rocky Dirt (también roca) | los 9 |
| `sand` | material | familia de arena y arenisca | arena, arena roja, toda arenisca (también roca) | los 9 |
| `rock` | material | familia de piedra (+ grava, menas, magma) | variantes de piedra, grava, menas | los 9 |
| `slab` | forma | medios bloques | losas | hooks de Model |
| `stairs` | forma | escaleras y escaleras de esquina | escaleras | hooks de Model |
| `flat` | forma | planos (incl. planos cruzados) | hierba alta, flores, cultivos, telarañas | hooks de Model |
| `placed` | colocación | geometría colocada como parte de chunks | bloques del mundo | hooks de Model (no ítems/vehículos) |
| `held` | colocación | ítems sujetos en la mano (1.ª/3.ª persona) | ítems en mano, armadura | hooks de Model |
| `dropped` | colocación | ítems en el suelo / cinta / tubería | ítems caídos | hooks de Model |
| `thrown` | colocación | ítems en vuelo | bolas de nieve, flechas, cohetes | hooks de Model |
| `lifeform` | objetivo | jugadores, mobs, NPC (armadura y cosmética incluidas) | entidades | hooks de Model |

## Los flags se combinan libremente

**Los flags no son un enum de elección única.** Cualquier número de ellos puede ser true a la vez — e incluso ninguno (la propia cabecera dice *"Any number of flags may be set, possibly even none"*).

Ejemplos que da la propia cabecera:

- **la arenisca es a la vez `sand` y `rock`**
- **Rocky Dirt es a la vez `dirt` y `rock`**
- una losa puede tener `slab` y (según el material) `rock` al mismo tiempo

Leer la rama `else` de un flag como «todo lo demás» es un bug. Los flags de material (`opaque`/`emissive`/…) se combinan **con independencia** de los flags de forma/estado (`slab`/`held`/…).

## Uso

`flags` es un campo con el mismo nombre en las tres estructuras de entrada (`BloxdVertexIn`, `BloxdSurfaceIn`, `BloxdLightIn`):

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.vegetation) {
        out.colour *= vec3f(1.0, 1.08, 0.9);
    }
    if (surface.flags.emissive) {
        out.emission += vec3f(0.05);
    }
    return out;
}
```

En el pipeline de modelo, los flags responden a «qué estoy mirando»:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;   // lift world entities, exclude the hand
    }
    if (surface.flags.held) {
        out.colour *= 1.15;   // brighten the local player's held items
    }
    return out;
}
```

## Migración desde v4 (mecánica)

| v4 | v5 |
|---|---|
| `(surface.blockFlags & bloxdBlockFlagOpaque) != 0u` | `surface.flags.opaque` |
| `(surface.blockFlags & bloxdBlockFlagEmissive) != 0u` | `surface.flags.emissive` |
| `(surface.blockFlags & bloxdBlockFlagVegetation) != 0u` | `surface.flags.vegetation` |
| `(surface.blockFlags & bloxdBlockFlagDirt) != 0u` | `surface.flags.dirt` |
| `(surface.blockFlags & bloxdBlockFlagSand) != 0u` | `surface.flags.sand` |
| `(surface.blockFlags & bloxdBlockFlagRock) != 0u` | `surface.flags.rock` |

Las referencias restantes a las constantes `bloxdBlockFlag*` fallan el diagnóstico de nombres reservados del analizador (las constantes están eliminadas).

## Casos límite (exhaustivo, de la cabecera)

- «Rocky Dirt is rock too»
- «every sandstone, which is rock too»
- «Drawn as block models, so never part of terrain or flagged as opaque» — las caras `slab`/`stairs`/`flat` nunca entran en el programa Terrain y nunca ponen `opaque`
- «Includes armour and cosmetics» — `lifeform` cubre también el equipo del jugador
- «Not items or vehicles» — `placed` excluye los vehículos

## Relacionado

- Migración completa de v4 → [Historial de versiones: v5](../history/v5.md)
- Interioridades de la entrega de flags → [Interior del motor](../internals/rendering-pipeline.md)
