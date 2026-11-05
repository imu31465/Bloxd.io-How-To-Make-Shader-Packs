# Flags (BloxdFlags)

> Ziel-API: 5 · Ziel-Build: `bny9u` · Status: Analyzed (wortwörtlich aus dem Live-Header restauriert)

v5 identifiziert Flächen über eine benannte Boolean-Struktur. Die v4-Bitmaske `blockFlags: u32` und ihre 6 `bloxdBlockFlag*`-Konstanten sind weg.

## Definition (wortwörtlich aus dem Header)

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

## Feld-Referenz

| Feld | Klasse | Bedeutung | Typische Objekte | Hooks |
|---|---|---|---|---|
| `opaque` | Material | voller Würfel ohne Lücken oder Löcher | Stein, Dirt, massives Holz | alle 9 |
| `emissive` | Material | Blöcke, die Licht abgeben | Lava, leuchtende Erze | alle 9 |
| `vegetation` | Material | Blätter, Grasblöcke, blättrige Pflanzen | Blätter, hohes Gras | alle 9 |
| `dirt` | Material | Erde (Grasblöcke eingeschlossen) | Dirt, Grasblock, Rocky Dirt (auch Gestein) | alle 9 |
| `sand` | Material | Sand- und Sandstein-Familie | Sand, Red Sand, jeder Sandstein (auch Gestein) | alle 9 |
| `rock` | Material | Stein-Familie (+ Kies, Erze, Magma) | Stein-Varianten, Kies, Erze | alle 9 |
| `slab` | Form | halbe Blöcke | Stufen | Model-Hooks |
| `stairs` | Form | Treppen und Ecktreppen | Treppen | Model-Hooks |
| `flat` | Form | Ebenen (inkl. gekreuzter Ebenen) | hohes Gras, Blumen, Feldfrüchte, Spinnennetze | Model-Hooks |
| `placed` | Platzierung | als Teil von Chunks platzierte Geometrie | Weltblöcke | Model-Hooks (keine Items/Fahrzeuge) |
| `held` | Platzierung | in einer Hand gehaltene Items (1./3.-Person) | gehaltene Items, Rüstung | Model-Hooks |
| `dropped` | Platzierung | Items am Boden / auf Band / in Röhre | fallengelassene Items | Model-Hooks |
| `thrown` | Platzierung | Items im Flug | Schneebälle, Pfeile, Raketen | Model-Hooks |
| `lifeform` | Ziel | Spieler, Mobs, NPCs (Rüstung & Kosmetik eingeschlossen) | Entities | Model-Hooks |

## Flags kombinieren sich frei

**Flags sind keine Single-Choice-Enumeration.** Beliebig viele können gleichzeitig wahr sein — möglicherweise gar keines (der Header selbst sagt: *"Any number of flags may be set, possibly even none"*).

Beispiele, die der Header selbst gibt:

- **Sandstein ist sowohl `sand` als auch `rock`**
- **Rocky Dirt ist sowohl `dirt` als auch `rock`**
- Eine Stufe kann gleichzeitig `slab` und (je nach Material) `rock` sein

Den `else`-Zweig eines Flags als „alles Übrige“ zu lesen ist ein Bug. Material-Flags (`opaque`/`emissive`/…) kombinieren sich **unabhängig** mit Form-/Zustands-Flags (`slab`/`held`/…).

## Verwendung

`flags` ist ein gleichnamiges Feld in allen drei Eingabe-Strukturen (`BloxdVertexIn`, `BloxdSurfaceIn`, `BloxdLightIn`):

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

In der Model-Pipeline beantworten Flags die Frage „Worauf schaue ich gerade“:

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

## Migration von v4 (mechanisch)

| v4 | v5 |
|---|---|
| `(surface.blockFlags & bloxdBlockFlagOpaque) != 0u` | `surface.flags.opaque` |
| `(surface.blockFlags & bloxdBlockFlagEmissive) != 0u` | `surface.flags.emissive` |
| `(surface.blockFlags & bloxdBlockFlagVegetation) != 0u` | `surface.flags.vegetation` |
| `(surface.blockFlags & bloxdBlockFlagDirt) != 0u` | `surface.flags.dirt` |
| `(surface.blockFlags & bloxdBlockFlagSand) != 0u` | `surface.flags.sand` |
| `(surface.blockFlags & bloxdBlockFlagRock) != 0u` | `surface.flags.rock` |

Verbleibende Referenzen auf die `bloxdBlockFlag*`-Konstanten scheitern an der Reserved-Name-Diagnose des Analyzers (die Konstanten sind gelöscht).

## Grenzfälle (erschöpfend, aus dem Header)

- „Rocky Dirt is rock too“
- „every sandstone, which is rock too“
- „Drawn as block models, so never part of terrain or flagged as opaque“ — `slab`/`stairs`/`flat`-Flächen betreten nie das Terrain-Programm und setzen nie `opaque`
- „Includes armour and cosmetics“ — `lifeform` deckt auch Spieler-Ausrüstung ab
- „Not items or vehicles“ — `placed` schließt Fahrzeuge aus

## Verwandte Seiten

- Vollständige v4-Migration → [Versionsgeschichte: v5](../history/v5.md)
- Interna der Flag-Übergabe → [Engine-Interna](../internals/rendering-pipeline.md)
