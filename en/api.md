[← Previous part](making.md)·[Back to the manual](README.md)·[Next part →](recipes.md)

# Part II: API reference

## 10. Engine header (automatically prepended to pack code)

The following code is inserted automatically by the engine ahead of pack code (packs cannot redeclare it). Sections wrapped in `#ifdef` vary by variant.

```wgsl
// Engine-provided and read-only to packs. apiVersion 2.
const bloxdTimeWrap: f32 = 3600.0;   // seconds until time wraps to 0

fn bloxdTime() -> f32;               // seconds. wraps to 0 every 3600 s
fn bloxdOriginOffset() -> vec3i;     // whole blocks. noa-local + this = world coords
fn bloxdEyePosition() -> vec3f;      // camera position (noa-local)
fn bloxdSunDirection() -> vec3f;     // sun direction (unit vector, non-zero only with earth skybox)
fn bloxdWorldPosition(position: vec3f) -> vec3f;  // noa-local -> world coords
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i;  // world block coords of this face
fn bloxdApplyFog(colour: vec3f, l: BloxdLightIn) -> vec3f;   // mix(l.fogColour, colour, l.fogVisibility)

struct BloxdVertexIn {
    position: vec3f,   // noa-local world space (world minus bloxdOriginOffset())
    normal: vec3f,
    blockId: u32,      // owning block id (flat-interpolated, uniform across the face)
}

#ifndef BLOXD_STRICT
struct BloxdVertex {
    position: vec3f,     // noa-local
}
#endif

struct BloxdSurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    blockId: u32,        // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct BloxdLightIn {
    litColour: vec3f,          // engine lighting result (before emission and fog)
    engineColour: vec3f,       // post-fog = bloxdApplyFog(litColour, l). excludes emission
    directional: f32,          // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,            // the material's ambient times the scene's
    blockLight: vec3f,         // voxel block light, tone-mapped (all variants; 0 when unlit)
    skyLight: f32,             // voxel sky light, tone-mapped (all variants; 1 when unlit)
    ambientLightColour: vec3f, // present in all variants (white when unlit)
    skyLightColour: vec3f,     // present in all variants (white when unlit)
    heldLight: vec3f,          // held light here (all variants; 0 when unlit/out of range)
    fogColour: vec3f,
    fogVisibility: f32,        // 1 = no fog, 0 = fully fogged (renamed from v1 fogFactor)
    position: vec3f,           // as in BloxdSurfaceIn
    normal: vec3f,
    blockId: u32,              // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdLight {
    colour: vec3f,
}

// liquid variants, surface / light hooks only
struct BloxdOpaqueBehind {
    found: bool,       // false when no opaque face behind (sky)
    position: vec3f,   // opaque face position behind (noa-local)
    distance: f32,     // distance from the eye
}
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind;

#ifndef BLOXD_STRICT
fn bloxdDefaultVertex(v: BloxdVertexIn) -> BloxdVertex;
#endif

fn bloxdDefaultSurface(s: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdDefaultLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight;
```

Key points:

- `bloxdTime()` is elapsed time wrapping every 3600 seconds (`bloxdTimeWrap`). It is not guaranteed to sync with the in-game day/night clock. Since the bind group's stage visibility is VERTEX|FRAGMENT, it **can also be called from vertex hooks**
- `bloxdSunDirection()` is a unit vector only while a sun exists; zero when the sky has no sun. **The moon is always `-bloxdSunDirection()`** (the engine computes the moon position as the exact opposite of the sun). But in default worlds the sun is static, so the moon is static too — a moving moon only matters in worlds implementing a day/night cycle (see [Part VII](internals.md), section 24)
- ※Note: previously written as "cannot be reused as the moon direction when zero". Direction itself is available via `-bloxdSunDirection()`, but packs for external distribution should branch on `sunPresent` with zero as the premise (see R2 for the blue-ambient pseudo look, [Part VII](internals.md) R-A for directional moonlight)
- `emission` is added after the lighting calculation, attenuated by **`fogVisibility`** (the defaultLight implementation `engineColour + emission × fogVisibility`. Emission also disappears in fully fogged distance)
- **Fog application order**: fragment processing runs ① lighting/emission composition → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ light hook call → ⑤ return. So **engineColour arrives already fogged**, and **the light hook's return value becomes the final color as-is** (no fog re-applied after the hook)
- **fogVisibility source**: view-space distance (computed per-vertex, interpolated). In linear mode `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **When fogMode == 0**: `fogColour` arrives as `vec3f(0.0)` (black). Code estimating time-of-day from fogColour tint should be careful
- **Real fog settings in current builds**: **linear fixed**. `fogStart` = chunk render distance, `fogEnd` = +1 chunk (horizon only). With fog off it is set to 100 / 101 chunks, effectively disabling. Default fog color is RGB(183, 191, 195)
- The `bloxdPackInputs` uniform (`@group(3) @binding(0)`, 64B) is for **header-function use only**. Do not reference it from packs directly. Stage visibility is VERTEX|FRAGMENT, so header functions can also be called from module-scope functions outside hooks and from vertex hooks. The depth texture (binding 1) is FRAGMENT-only, so `bloxdOpaqueBehind()` is limited to surface / light hooks
- **`skyLight` / `blockLight` / `heldLight` arrive after a "lift curve"**. The `tone-mapped` in the header comments refers to this: the engine always applies `y = 1-(1-x/(3-2x))³` (an S-curve lifting dark areas) to fragments before handing them to packs. Values are not raw voxel values (n/15); e.g. under a tree (raw 0.87) arrives lifted to **0.97**
- `skyLight` is essentially voxel occlusion data of "whether sky is visible from here" (= a shadow map), not just a brightness parameter (see section 15, "The truth about shadows")
- **`litColour` works as a starting point**: in v1 only fogged `engineColour` existed, so custom atmosphere tended to double-fog. In v2 start from pre-fog, pre-emission `litColour` and re-apply fog at your own pace with `bloxdApplyFog()`
- **`blockId` tells block types apart**: identification independent of texture color. But the ID-to-block-type table lives inside the engine, so which ID is which block must be measured in-world (see [Part VIII](apiv2.md))
- **Direct struct construction is prohibited**: constructor calls like `BloxdLight(...)` are rejected by static validation. Always modify from `bloxdDefault*`, or use a copy of the input

## 11. Variant table

| Variant | BLOXD_STRICT | BLOXD_LIGHTING | BLOXD_ALPHA |
|---|---|---|---|
| allow + unlit + terrain | – | – | ✓ |
| allow + unlit + liquid | – | – | ✓ |
| allow + lit + terrain | – | ✓ | ✓ |
| allow + lit + liquid | – | ✓ | ✓ |
| strict + unlit + terrain | ✓ | – | – |
| strict + unlit + liquid | ✓ | – | ✓ |
| strict + lit + terrain | ✓ | ✓ | – |
| strict + lit + liquid | ✓ | ✓ | ✓ |

Header struct shapes also change per variant (no `BloxdVertex` in strict, no `blockLight` etc. unlit, no `alpha` in strict terrain).

## 12. Skeleton cheat sheet

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);          // direct construction is prohibited; always start from default
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // terrain only has alpha in allow
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);         // engineColour + emission*fogVisibility
    #ifdef BLOXD_LIGHTING                       // guard lighting-only inputs
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex always with this guard
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdTime()) * 0.05;
    return out;
}
#endif
```

Five things to always keep in mind: compile clean in all 8 variants / strict games are the majority / no textures / hook parameters are read-only / no `let` at module scope.
