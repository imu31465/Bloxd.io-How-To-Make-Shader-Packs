# Shader hooks

> Target API: 5 · Target build: `ab90qa` · Status: Verified

Packs can define **9 hooks** — 3 render targets (programs) × 3 pipeline stages, all optional (undefined means engine default).

## 9-hook comparison

| Hook | Program | Stage | Arguments | Returns | Run condition |
|---|---|---|---|---|---|
| `bloxdTerrainVertex` | Terrain | vertex | `BloxdVertexIn` | `BloxdVertex` | allow variants only (**defining it in strict is itself an error**) |
| `bloxdTerrainSurface` | Terrain | surface | `BloxdSurfaceIn` | `BloxdSurface` | always |
| `bloxdTerrainLight` | Terrain | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | always |
| `bloxdLiquidVertex` | Liquid | vertex | `BloxdVertexIn` | `BloxdVertex` | allow only |
| `bloxdLiquidSurface` | Liquid | surface | `BloxdSurfaceIn` | `BloxdSurface` | always |
| `bloxdLiquidLight` | Liquid | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | always |
| `bloxdModelVertex` | Model | vertex | `BloxdVertexIn` | `BloxdVertex` | allow only |
| `bloxdModelSurface` | Model | surface | `BloxdSurfaceIn` | `BloxdSurface` | always |
| `bloxdModelLight` | Model | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | always |

## What each program draws

| Program | Draws | Water when no Liquid hook exists |
|---|---|---|
| **Terrain** | every block except water and block models | — |
| **Liquid** | water | **no Terrain hook runs on water either** (water keeps its default look) |
| **Model** | block models (slabs, stairs, plants, crops, cobwebs), held/dropped/thrown items, players, mobs, NPCs, armour, cosmetics | — |

## Stage roles

- **Vertex** — move vertex positions (grass sway, waves). Vertex animation disables the whole pack in strict games, so `#ifndef BLOXD_STRICT` is mandatory
- **Surface** — the material output: `colour` / `alpha` (conditional) / `emission` / `enchantColour` / `overlayColour`
- **Light** — the final color; takes the surface output plus `BloxdLightIn`. Its return value is the on-screen color

## Signatures

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

## Special-function call restrictions

The engine's validator restricts which hooks may reach certain functions (violations fail with dedicated "reaches" diagnostics):

| Function | Callable from | Guard |
|---|---|---|
| `bloxdTexel` | surface / light hooks only | — |
| `bloxdTextureSize` | surface / light hooks only | — |
| `bloxdOpaqueBehind` | surface / light hooks (meaningful in liquid variants) | `#ifdef BLOXD_SCENE_DEPTH` |

> `bloxdFragmentBlockPosition` is no longer in the documented header, but the engine still injects and accepts it — see [Functions: bloxdFragmentBlockPosition](functions.md#bloxdfragmentblockposition--undocumented-but-still-injected). It was the one special function callable from vertex hooks; for new code prefer `flags` for "which block is this".

## Fallbacks and sharing

- Undefined hook → that stage behaves as the engine default (`bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **Share processing across hooks** with a module-scope function called from both:

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

## Related

- Official 9-hook template → [Getting Started: Shader hooks](../getting-started/hooks.md)
- Every struct field → [Structures](structures.md)
- Hook invocation internals → [Engine Internals](../internals/hook-invocation.md)
