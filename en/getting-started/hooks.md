# Shader hooks

> Target API: 5 · Target build: `v98qt8` (verified in production and preprod 2026-11-08) · Status: Verified

A pack can plug in **9 hooks**: 3 render targets (Terrain / Liquid / Model) × 3 pipeline stages (Vertex / Surface / Light). All are optional — an undefined hook falls back to the engine default.

## The hooks

| Hook | Stage | What it does |
|---|---|---|
| `bloxdTerrainVertex` | terrain · vertex | Terrain vertex animation. **Cannot run in strict games** |
| `bloxdTerrainSurface` | terrain · surface | Terrain color, alpha, emission, enchant, overlay |
| `bloxdTerrainLight` | terrain · light | Terrain final color — the last stage of the fragment |
| `bloxdLiquidVertex` | liquid · vertex | Water vertex animation. **strict-only guard required** |
| `bloxdLiquidSurface` | liquid · surface | Water color, alpha, emission |
| `bloxdLiquidLight` | liquid · light | Water final color |
| `bloxdModelVertex` | model · vertex | Block models / items / entities vertex animation. **strict-only guard required** |
| `bloxdModelSurface` | model · surface | Model color, alpha, emission, enchant, overlay |
| `bloxdModelLight` | model · light | Model final color |

Signatures (types must match exactly; parameter names are free):

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex;
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight;
// bloxdLiquid* / bloxdModel* take the same types
```

## Render-target split

- **Terrain** — every block except water and block models
- **Liquid** — water
- **Model** — block models (slabs, stairs, crossed-plane plants), held/dropped/thrown items, players, mobs, NPCs, armour, cosmetics

**Important**: if a pack defines no Liquid hook, **no Terrain hook runs on water either** (water is handled by Liquid hooks alone). This differs from pre-v4 behavior where liquid fell back to terrain hooks.

## Fallbacks and code sharing

- An undefined hook means that stage uses the engine default (same behavior as `bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **To share code across hooks**, define a module-scope function and call it from both:

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

## The default pack (official 9-hook template)

The starting template now includes the light hooks. 1,683 bytes as shipped, verbatim:

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

The template's comments are the design guidance: modify return values to start building; deleting a hook restores the default; strict games keep terrain where it is; share code via functions.

## Writing conventions

- **Never construct output structs directly** (`BloxdSurface(...)` fails validation). Always start from `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` and mutate fields. The light hook's first argument is already the output type, so `var out = s;` also works
- A bare `var x: BloxdSurface;` (type annotation only) is also a validation error
- Hook parameters are **read-only**. Copy first (`var sv = s;`)
- You cannot use identifiers starting with `bloxd` (case-insensitive), except the 9 hook function names
- Write constants as `const` (`#define` takes no value)

For every field each hook can read and write, see [Structures](../api/structures.md).
