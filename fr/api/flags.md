# Flags (BloxdFlags)

> Target API: 5 · Target build: `ab90qa` · Status: Analyzed (restored verbatim from the live header)

v5 identifies faces with a named boolean struct. The v4 `blockFlags: u32` bitmask and its 6 `bloxdBlockFlag*` constants are gone.

## Definition (verbatim from the header)

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

## Field reference

| Field | Class | Meaning | Typical objects | Hooks |
|---|---|---|---|---|
| `opaque` | material | full cube without gaps or holes | stone, dirt, solid wood | all 9 |
| `emissive` | material | blocks that emit light | lava, glowing ores | all 9 |
| `vegetation` | material | leaves, grass blocks, leafy plants | leaves, tall grass | all 9 |
| `dirt` | material | soil (grass blocks included) | dirt, grass block, Rocky Dirt (also rock) | all 9 |
| `sand` | material | sand & sandstone family | sand, red sand, every sandstone (also rock) | all 9 |
| `rock` | material | stone family (+ gravel, ores, magma) | stone variants, gravel, ores | all 9 |
| `slab` | shape | half blocks | slabs | Model hooks |
| `stairs` | shape | stairs & corner stairs | stairs | Model hooks |
| `flat` | shape | planes (incl. crossed planes) | tall grass, flowers, crops, cobwebs | Model hooks |
| `placed` | placement | geometry placed as part of chunks | world blocks | Model hooks (not items/vehicles) |
| `held` | placement | items held in a hand (1st/3rd person) | held items, armour | Model hooks |
| `dropped` | placement | items on ground / belt / pipe | dropped items | Model hooks |
| `thrown` | placement | items in flight | snowballs, arrows, rockets | Model hooks |
| `lifeform` | target | players, mobs, NPCs (armour & cosmetics included) | entities | Model hooks |

## Flags combine freely

**Flags are not a single-choice enum.** Any number may be true at once — possibly none (the header itself says *"Any number of flags may be set, possibly even none"*).

Examples the header itself gives:

- **sandstone is both `sand` and `rock`**
- **Rocky Dirt is both `dirt` and `rock`**
- A slab can be `slab` and (depending on material) `rock` at the same time

Reading the `else` branch of one flag as "everything else" is a bug. Material flags (`opaque`/`emissive`/…) combine **independently** with shape/state flags (`slab`/`held`/…).

## Usage

`flags` is a same-named field on all three input structs (`BloxdVertexIn`, `BloxdSurfaceIn`, `BloxdLightIn`):

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

In the model pipeline, flags answer "what am I looking at":

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

## Migrating from v4 (mechanical)

| v4 | v5 |
|---|---|
| `(surface.blockFlags & bloxdBlockFlagOpaque) != 0u` | `surface.flags.opaque` |
| `(surface.blockFlags & bloxdBlockFlagEmissive) != 0u` | `surface.flags.emissive` |
| `(surface.blockFlags & bloxdBlockFlagVegetation) != 0u` | `surface.flags.vegetation` |
| `(surface.blockFlags & bloxdBlockFlagDirt) != 0u` | `surface.flags.dirt` |
| `(surface.blockFlags & bloxdBlockFlagSand) != 0u` | `surface.flags.sand` |
| `(surface.blockFlags & bloxdBlockFlagRock) != 0u` | `surface.flags.rock` |

Remaining references to the `bloxdBlockFlag*` constants fail the analyzer's reserved-name diagnostic (the constants are deleted).

## Edge cases (exhaustive, from the header)

- «Rocky Dirt is rock too»
- «every sandstone, which is rock too»
- «Drawn as block models, so never part of terrain or flagged as opaque» — `slab`/`stairs`/`flat` faces never enter the Terrain program and never set `opaque`
- «Includes armour and cosmetics» — `lifeform` covers player equipment too
- «Not items or vehicles» — `placed` excludes vehicles

## Related

- Full v4 migration → [Version History: v5](../history/v5.md)
- Flag delivery internals → [Engine Internals](../internals/rendering-pipeline.md)
