# How to Make Bloxd.io Shader Packs (Complete Guide)

A self-contained guide to creating and distributing shader packs for Bloxd.io (WebGPU renderer only).
Based on the spec at `apiVersion: 2`. Includes a recipe collection and API reference, so you can go from zero to distribution with this single file. v1 packs cannot be loaded by the current game (v1 `apiVersion` values and old identifiers are rejected). For migrating from v1, see Part VIII.

> This is an unofficial guide and does not represent the views of the developers. The API may change without notice.  
> This guide was created with AI assistance; accuracy is not guaranteed. Verify against actual in-game behavior.  
> Last reviewed: 2026-10-15 (fog application order, real fog settings, and underwater rendering verified against renderer implementation). Since no public official WGSL API reference could be found, keep verifying API descriptions and recipes against the loader screen and in-game compilation.  
> The shader pack feature itself is an official feature accessible from the in-game UI, and packs are pure WGSL  
> (no JS execution or networking), so nothing dangerous happens with normal code.

## Contents

- [Part I: Making packs](#part-i-making-packs)
- [Part II: API reference](#part-ii-api-reference)
- [Part III: Recipe collection](#part-iii-recipe-collection)
- [Part IV: Realism guide](#part-iv-realism-guide)
- [Part V: Troubleshooting & notes](#part-v-troubleshooting--notes)
- [Part VI: Important implementation notes](#part-vi-important-implementation-notes)
- [Part VII: Internals supplement](#part-vii-internals-supplement)
- [Part VIII: API Version 2 migration guide](#part-viii-api-version-2-migration-guide)

---

# Part I: Making packs

## 1. Overview and prerequisites

- Shader packs are **WebGPU renderer only**. While a pack is installed, the WebGPU renderer is force-enabled in settings
- Packs are written in a **restricted subset of WGSL**. They affect only the look of **terrain and liquids**
- What you can do: change colors, transparency, and emission; rebuild lighting; projected-style shadows (R9.12); vertex animation (only in certain games)
- What you cannot do: add/sample textures, post-processing (bloom etc.), pixel-accurate shadows that rotate with the sun (shadow maps) or real reflections (SSR), or affect the sky and entities
- What you can do (but is easy to miss): **projected-style shadows using `skyLight` (voxel sky occlusion)** — you can clearly darken areas under trees and roofs (R9.12). Breaking blocks makes LightEngine recalculate immediately, so shadows follow in real time
- **Most games run in strict mode** (no vertex animation, no `discard`). Design packs for general distribution to work in strict mode

## 2. Quick start

1. Create a folder and place `pack.json` and `.wgsl` files in it
2. Load the zip or folder from the game settings → Shader Pack
3. Fix any errors and reload (see Part V)
4. Test in supported games
5. Zip it up when done and distribute it

## 3. Pack structure

- **Distribution format**: a single `.zip`, or a folder (folder loading is desktop browsers only)
- **Contents**: one `pack.json` (placed at the top level of the pack; case-insensitive) + 1–256 `.wgsl` files
- Multiple `.wgsl` files are concatenated and treated as one module, so splitting and subdirectories are free. No constraints on file names. Non-`.wgsl` files (READMEs etc.) are ignored
- Zipping tip: if a zip stores everything under one common root folder, that prefix is stripped automatically (zips made with macOS "Compress" work as-is). But stray files at the root level break top-level detection, so the safest method is to go inside the folder and zip `pack.json` and the `.wgsl` files directly (verify `pack.json` ends up at the ZIP root)

| Item | Limit |
|---|---|
| zip size / entry count | 32MB / 1024 |
| pack.json size | 64KB, UTF-8 |
| total .wgsl size | 256KB, UTF-8 |
| zip format | zip64, split, and encrypted zips are rejected |

## 4. pack.json

```json
{
  "apiVersion": 2,
  "name": "My Pack",
  "author": "your name"
}
```

| Field | Required | Description |
|---|---|---|
| `apiVersion` | required | Must match `2` exactly. Packs with `1` are rejected with `shaderPack:loadWrongApiVersion` |
| `name` | required | Must not be empty. Shown in the settings UI |
| `author` | optional | May be omitted. Non-string values (numbers etc.) are errors |

Other fields are ignored.

## 5. Minimal template

A working pack with just `pack.json` (section 4) and this `pack.wgsl`:

```wgsl
// Minimal pack with a slight warm tint
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

Rules to follow:

- Never **construct output structs directly** (`BloxdSurface(...)` is an error). Always start from `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` and modify fields. Exception: the light hook's first parameter (`s: BloxdSurface`) has the output type, so `var out = s;` also works
- Uninitialized `var x: BloxdSurface;` (type annotation only) is also an error
- Hook parameters are **read-only**. To change them, copy first, e.g. `var sv = s;`
- You cannot use the `bloxd_` prefix for your own identifiers (except the 6 hook names)
- Write constants with `const` (`#define` cannot hold values)

## 6. The 6 hooks

All optional. Signatures must match exactly in types (parameter names are free).

| Hook | Role |
|---|---|
| `fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex` | Terrain vertex animation. **Not available in strict mode** |
| `fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface` | Terrain color, transparency, emission. `s.colour` is texture × vertex color |
| `fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight` | Terrain final color. Called at the **final stage of the fragment**, and its return value becomes the final color as-is |
| `fn bloxdLiquidVertex / bloxdLiquidSurface / bloxdLiquidLight` (same shapes) | Liquid versions. `alpha` acts as liquid transparency |

Fallback rules:

- If a liquid hook is undefined, **the terrain hook of the same name is used** (not vice versa). Writing only surface applies the same effect to liquids
- If no light hook is defined, the default behavior (`engineColour + emission × fogVisibility`) is used
- If you discard `engineColour` and rebuild from the base color, re-apply fog yourself: `mix(l.fogColour, col, l.fogVisibility)`. When adding emission, multiply it by `fogVisibility` first

## 7. 8 variants and guards

You write one piece of code, but it must compile in all **8 combinations of {strict, allow} × {lighting on, lighting off} × {terrain, liquid}**.
Only `#define` (flag only, no values) / `#ifdef` / `#ifndef` / `#else` / `#endif` are available. `#` must start its line (allowed inside functions too).

| Guard | Meaning | Use |
|---|---|---|
| `#ifndef BLOXD_STRICT` | Only outside strict (allow) | Wrap the whole vertex hook and `discard` |
| `#ifdef BLOXD_LIGHTING` | Only when lighting is on | Wrap code touching `blockLight`, `skyLight`, `ambientLightColour`, etc. **Wrap shared helper functions (module-scope fns) as whole functions** (guarding only the call site is not enough) |
| `#ifdef BLOXD_ALPHA` | When the `alpha` field exists (always for liquids, terrain only in allow) | Wrap code touching `alpha` |

## 8. Available language features and prohibitions

Available:

- WGSL built-in functions (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select`, etc.)
- Your own `fn` / `struct` / `const` / `alias` / `var<private>`, plus `let` and control flow (if/for/while/switch etc.) inside functions
- Derivatives (`dpdx` / `dpdy` / `fwidth`) only in surface/light hooks (fragment stage). Not in vertex hooks
- `const` arrays (e.g. color palette LUTs), pointers (`ptr<function, T>`), matrices (`mat3x3f` etc.)
- Flag definitions `#define NAME` + `#ifdef` branching

Prohibited / caution:

- **No textures**: `texture_*` / `sampler` types are unusable. Build surface detail procedurally with hash noise etc.
- **`discard` is prohibited in strict mode** (wrap with `#ifndef BLOXD_STRICT`)
- `@attribute` / `enable` / `requires` / `override` are prohibited. Since `enable f16;` cannot be written, **f16 types are effectively unusable**
- `@builtin` attributes are also prohibited, so `fragCoord` (screen coordinates) and `vertex_index` cannot be read
- **Do not use module-scope `let`** (use `const` or `var`)
- `atomic` is unusable
- Coordinates are noa-local. Add `bloxdOriginOffset()` for world coordinates. Block coordinates are `bloxdFaceBlock(position, normal)`

## 9. Validation, testing, and distribution

Loading runs these checks in order:

1. Loader limit checks (section 3 caps)
2. Static compilation (all 8 variants)
3. Real compilation check in the browser WebGPU (static validation does not fully type-check, so some code only fails here — avoid the section 8 traps)

Steps:

1. Load the zip / folder from settings → Shader Pack
2. Check the status. Success is "Ready to use". For "Saved, but it won't run until you fix these errors...", fix the listed errors (file:line + variant) and reload
3. Reload the page to activate. Remove any renderer overrides in URL parameters or localStorage first, or the pack will refuse to start
4. Test in lenient games first, then in strict games (the majority). Vertex animation only works in allow games
5. For distribution, zip with `pack.json` at the top (within section 3 caps). Re-loading the same screen replaces the pack; Remove Pack deletes it. Re-validation after game updates runs automatically on page load

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
- `bloxdSunDirection()` is a unit vector only while a sun exists; zero when the sky has no sun. **The moon is always `-bloxdSunDirection()`** (the engine computes the moon position as the exact opposite of the sun). But in default worlds the sun is static, so the moon is static too — a moving moon only matters in worlds implementing a day/night cycle (see Part VII, section 24)
- ※Note: previously written as "cannot be reused as the moon direction when zero". Direction itself is available via `-bloxdSunDirection()`, but packs for external distribution should branch on `sunPresent` with zero as the premise (see R2 for the blue-ambient pseudo look, Part VII R-A for directional moonlight)
- `emission` is added after the lighting calculation, attenuated by **`fogVisibility`** (the defaultLight implementation `engineColour + emission × fogVisibility`. Emission also disappears in fully fogged distance)
- **Fog application order**: fragment processing runs ① lighting/emission composition → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ light hook call → ⑤ return. So **engineColour arrives already fogged**, and **the light hook's return value becomes the final color as-is** (no fog re-applied after the hook)
- **fogVisibility source**: view-space distance (computed per-vertex, interpolated). In linear mode `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **When fogMode == 0**: `fogColour` arrives as `vec3f(0.0)` (black). Code estimating time-of-day from fogColour tint should be careful
- **Real fog settings in current builds**: **linear fixed**. `fogStart` = chunk render distance, `fogEnd` = +1 chunk (horizon only). With fog off it is set to 100 / 101 chunks, effectively disabling. Default fog color is RGB(183, 191, 195)
- The `bloxdPackInputs` uniform (`@group(3) @binding(0)`, 64B) is for **header-function use only**. Do not reference it from packs directly. Stage visibility is VERTEX|FRAGMENT, so header functions can also be called from module-scope functions outside hooks and from vertex hooks. The depth texture (binding 1) is FRAGMENT-only, so `bloxdOpaqueBehind()` is limited to surface / light hooks
- **`skyLight` / `blockLight` / `heldLight` arrive after a "lift curve"**. The `tone-mapped` in the header comments refers to this: the engine always applies `y = 1-(1-x/(3-2x))³` (an S-curve lifting dark areas) to fragments before handing them to packs. Values are not raw voxel values (n/15); e.g. under a tree (raw 0.87) arrives lifted to **0.97**
- `skyLight` is essentially voxel occlusion data of "whether sky is visible from here" (= a shadow map), not just a brightness parameter (see section 15, "The truth about shadows")
- **`litColour` works as a starting point**: in v1 only fogged `engineColour` existed, so custom atmosphere tended to double-fog. In v2 start from pre-fog, pre-emission `litColour` and re-apply fog at your own pace with `bloxdApplyFog()`
- **`blockId` tells block types apart**: identification independent of texture color. But the ID-to-block-type table lives inside the engine, so which ID is which block must be measured in-world (see Part VIII)
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

---

# Part III: Recipe collection

> **Important:** the recipes below are individual examples, not meant to be concatenated top to bottom. Pasting multiple definitions of the same hook name (`bloxdTerrainLight` etc.) or the same helper function name causes duplicate definitions in one module and fails compilation. To combine effects, merge them into one function per hook type.

## R1. Color recipes (surface)

### Single tint (most basic)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Saturation boost / desaturate

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 for vivid / -1.0 for full monochrome
```

### Color temperature (warm ⇄ cool)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = warm (strong red), -1.0 = cold (strong blue)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### Vintage / sepia

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### Altitude gradient (warm lowlands)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 1..0 over height 0..50
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Paint by face direction (up = bright, walls = dark)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // floor 1 / wall 0 / ceiling -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // walls and ceilings slightly darker
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Posterize (fewer colors)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. Lighting recipes (light)

### Contrast S-curve

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### Distance haze (custom fog)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // add 0..0.35 of custom fog from 64 to 192 blocks
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### Night (skyLight-driven blue shift + lamp protection)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
    #endif
    return out;
}
```

### Pitch-dark caves (darken skyless areas further)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    out.colour *= mix(1.0, 0.35, underground * underground);
    #endif
    return out;
}
```

> `skyLight` arrives post-lift (section 10), so shallow occlusion (e.g. under trees: raw 0.87 → lifted 0.97) barely darkens with this method. It works for caves (raw 0). To sharpen "tree shade", use the lift-inversion + threshold method in R9.12.

### Blue night ambience (pseudo look without moon direction)

> In this API, `bloxdSunDirection()` is zero when the sky has no sun. The following is not directional moonlight, just a faint blue ambient added when the sky is dark. Moon direction itself is available via `-bloxdSunDirection()` (day/night-cycle worlds only. Part VII R-A).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let upward = clamp(l.normal.y, 0.0, 1.0);
    out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
    #endif
    return out;
}
```

### Sunset warmth (tint by sun elevation)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 at horizon / 0 overhead
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### Full engine-output replacement (simplest relighting)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // NOTE: direct BloxdLight(...) construction is prohibited; rewrite colour from default
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // discard engineColour (the engine lighting result) and use "base color × self-computed brightness"
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // discarded engineColour, so fog redo is required
    out.colour = col + s.emission * l.fogVisibility;   // add emission yourself too (required)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. Emission recipes

> `emission` is added after the lighting calculation, but the default process **attenuates it with `fogVisibility`. In fully fogged distance, emission disappears too. To keep glowing at distance, don't add to emission — add directly as `out.colour += ...` inside the light hook** (engineColour is already fogged, so light lands on top of fog color at distance)

### Pulsing lamps (breathing torches)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(bloxdTime() * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### Glowing-ore look (bright materials emit)

```wgsl
// surface side: the brighter (whiter) the material, the more emission
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### Firefly-swarm look (drifting light points over time)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // a few "light orbs" drifting slowly; glow by inverse distance
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. Coordinate recipes (world / block / view)

### World coordinates

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### Block coordinates

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
```

### Checkerboard (per block)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 or 1
out.colour *= mix(0.96, 1.04, checker);
```

### Per-block pseudo random (hash)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// uses: grass color variation, stone mottling, etc.
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### View vector and rim light

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### View angle (fresnel look — for liquids)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 head-on / 0 grazing
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. Time recipes (animation)

> `bloxdTime()` wraps every 3600 seconds (1 hour). Note this is shader elapsed time and is not guaranteed to sync with the in-game sun/day-night. Use it for visual periodic animation, but prefer `bloxdSunDirection()` and lighting inputs for actual night detection.

### Day-night cycle (1 day per hour)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 one-hour period; not necessarily synced with in-game day/night
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### Wobble (layered sines)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### Flowing aurora bands / fluorescent stripes

```wgsl
// blend 3 colors by XZ position and time
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

## R6. Liquid recipes

### Rippling surface (color shimmer)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid always has BLOXD_ALPHA — guard kept as habit
    #endif
    return out;
}
```

### Pseudo depth-based transparency by height (not a real shallows test)

> In v1, scene depth and the water bottom position could not be referenced, so true water depth could not be computed with that API alone. In v2, liquid-only `bloxdOpaqueBehind()` measures the thickness to the opaque face behind (Part VIII R-E). The following is the old pseudo styling without it: `s.position.y` is a local coordinate, so using it raw shifts the effect as the chunk origin changes. Convert with `bloxdWorldPosition()` for world height. The following only varies alpha by world height — a pseudo effect, not shoreline/bottom-aware shallows. Adjust `packWaterReferenceY` to your world height.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // thinner at low altitude, closer to base alpha up high; verify direction in game
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### Underwater murk from inside

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### Liquids-only pack (terrain untouched)

```wgsl
// write no terrain_* hooks at all. Then:
//  - terrain variants = no hooks = engine defaults for terrain
//  - liquid variants  = only liquid_* hooks take effect
```

## R7. Vertex recipes (allow only)

> Wrap everything in `#ifndef BLOXD_STRICT`.

### Grass swaying in wind (move only the tops)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // vertical faces only
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### Liquid surface waves (top faces only)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdTime() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdTime() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### Breathing terrain

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // slight expand/contract along normals
    return out;
}
#endif
```

### Rolling terrain (giant sine waves)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdTime() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdTime() * 0.7) * 0.3;
    return out;
}
#endif
```

## R8. Math tricks

```wgsl
// smooth quantization of 0..1 (n steps)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 2-level threshold (toon shadow)
let shadow = smoothstep(0.35, 0.37, level);   // ±0.02 around the threshold makes steps

// 3-level toon
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// luma (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// smooth pulse
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// triangle wave (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// seconds → "slow phase" (for effects that ignore the 3600 s wrap)
let phase = t * 0.15;
```

## R9. Realistic recipes

> Physical recipes for "rebuilding vanilla's look from materials". Read these premises first:
>
> 1. **The light hook is called at the final fragment stage**. Its returned colour becomes the final colour as-is. **You must re-apply fog yourself** (R9.10)  
> 2. **The engine's default lighting is multiplication only**. Specular / fresnel / warm-cool separation / hemisphere ambient can all be built from zero  
> 3. `l.engineColour` is the finished color (already fogged). Rebuilding from `s.colour` (albedo) is the full-fledged approach  
> 4. Textures are prohibited → all detail must be **procedural** (hash/noise) (R9.8)

### R9.1 Warm torches × cool skylight

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // intermediate clamp
    col = mix(l.fogColour, col, l.fogVisibility);                    // fog redo
    out.colour = col + s.emission * l.fogVisibility;                 // emission re-add
    #endif
    return out;
}
```

### R9.2 Sun specular (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);          // half vector
        let ndh = max(dot(n, h), 0.0);
        let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
        let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
        out.colour += spec * vec3f(1.0, 0.97, 0.90);
    }
    #endif
    return out;
}
```

### R9.3 Schlick fresnel

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // faint edge brightness
    #endif
    return out;
}
```

### R9.4 Hemisphere ambient (sky above / ground bounce below)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // below: bounce
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // above: skylight
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // intermediate clamp
    col = mix(l.fogColour, col, l.fogVisibility);                           // fog redo
    out.colour = col + s.emission * l.fogVisibility;                        // emission re-add
    #endif
    return out;
}
```

### R9.5 ACES filmic (Narkowicz approximation)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = exposure
    return out;
}
```

### R9.6 Aerial perspective ("atmosphere" via distance desaturation)

> Unlike fog (color replacement), layering "distance desaturation" makes distant views much more realistic.  
> Caution: only reduce saturation — never touch luminance.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // falloff (~30% at 100blk / ~75% at 400blk)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // reduce saturation only (luminance unchanged)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 Wave normals + sun glitter ("sun road" on water)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // height h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // dh/dx
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // dh/dz
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = bloxdWorldPosition(l.position);
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdTime()), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);
        let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
        out.colour += glint * vec3f(1.0);
    }
    #endif
    return out;
}
```

### R9.8 Procedural micro-bump (texture-ban workaround)

```wgsl
fn pack_hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}
fn pack_bumpNormal(p: vec3f, n: vec3f, strength: f32) -> vec3f {
    let e = 0.15;
    let h0 = pack_hash(p);
    let hx = pack_hash(p + vec3f(e, 0.0, 0.0));
    let hz = pack_hash(p + vec3f(0.0, 0.0, e));
    let tangentX = normalize(cross(vec3f(0.0, 1.0, 0.0), n) + vec3f(0.0001, 0.0, 0.0));
    let tangentZ = normalize(cross(n, tangentX));
    return normalize(n + tangentX * (hx - h0) * strength + tangentZ * (hz - h0) * strength);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // in-block local coords
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lam = clamp(dot(n, sunDir), 0.0, 1.0);
        let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
        out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
    }
    #endif
    return out;
}
```

### R9.9 Nonlinear cave darkening + lamp protection

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let keep = 0.12 + 0.88 * blockInt;          // lift lamp-lit spots
    out.colour *= mix(keep, 1.0, sky * sky);     // nonlinear (squared) darkening
    #endif
    return out;
}
```

### R9.10 Re-applying fog (required when discarding engineColour)

> Setting a floor like `max(l.fogVisibility, 0.25)` caps "no denser than this"
> (0.0 = engine-accurate / 0.3–0.5 = clearer distance).
> Note the engine fog is a horizon-only linear fog (near render distance only); mid-distance haze must be built pack-side.
> Real fog settings (implementation-verified): linear fixed / `fogStart` = chunk render distance / `fogEnd` = +1 chunk / effectively disabled at 100–101 chunks when fog is off / default color RGB(183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // fog redo (0.15 = light floor)
    col += s.emission * l.fogVisibility;            // emission also fogged
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 Cinema grade (cool shadows / warm highlights / night desaturation)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;  // night only when sun direction is zero; no dusk gradient
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 Projected shadows — lift inversion + threshold cut (definitive)

> **Premise recheck (section 10)**: `l.skyLight` is not the raw voxel value (n/15) but the value after the engine's "lift curve"  
> `y = 1-(1-x/(3-2x))³` (an S-curve lifting dark areas).
>
> | Place | raw voxel | lifted (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | open sky | 1.00 | 1.00 | 1.00 |  
> | under tree (radius 2) | 0.87 | **0.97** | **0.86** ← nearly untouched |  
> | radius 3 | 0.80 | **0.92** | 0.66 |  
> | radius 5 | 0.67 | 0.78 | 0.29 |
>
> **This is the proven root cause of "shadows won't deepen no matter the gamma"**. But the curve is monotonic, so it can be inverted algebraically:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. After restoring raw values, just binarize with a threshold cut (`smoothstep`).  
> LightEngine's BFS lateral spread is "1 block = -1", so the threshold `th = 1 - r/15` directly dials  
> "occlusion of radius r or more counts as shadow". Breaking blocks moves shadows instantly (LightEngine recalculates in real time).  
> Limitation: shadows are "upward sky" based, so they don't rotate with the sun (section 15, "The truth about shadows").

```wgsl
// Invert the engine lift exactly to restore raw voxel skyLight (n/15)
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // no cbrt in WGSL, use pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // shadow radius dial: th = 1 - r/15 (0.87 = radius 2+ is shadow)
const shSoft = 0.04;   // edge softness (0.02 = hard / 0.08 = soft)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. restore raw values (skipping this never yields shadows)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. threshold cut — cleanly separates sunlit=1 / shadow=0
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // sun Lambert (fall back to l.directional when there is no sun)
    let sunLen = length(bloxdSunDirection());
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                      sunLen > 0.5);
    // the essence of projection: direct sun only reaches where sky is visible
    let lit = sunL * sky;
    // shadow side: tinted sky blue, not black + minimum ambient
    let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
    var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
    // torch light pierces shadows (blockLight is also lifted, restore together)
    let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                         sh_unlift(l.blockLight.g),
                         sh_unlift(l.blockLight.b));
    let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
    col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
    // re-apply fog (discarded engineColour's share)
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // don't forget emission (fogged)
    #endif
    return out;
}
```

> Tuning guide: **shadow area is set by `shTh` alone** — `0.93` = radius 1.5+ / `0.87` = radius 2 / `0.80` = radius 3 / `0.67` = radius 5.  
> Edge hardness is `shSoft` (0.02 = hard / 0.08 = soft). Shadow core darkness is the two-point shift of `0.09` (minimum ambient) and `0.16` (sky scatter).  
> To widen shadows at dusk, add `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (long-dusk-shadow approximation.  
> `sunDir` is `bloxdSunDirection() / length(bloxdSunDirection())`). For bluer shadows raise the B of `vec3f(0.72, 0.82, 1.05)`.
>
> ⚠️ "Deepen contrast with `pow(skyLight, γ)`" **applied gamma to lifted values** and never affected under-tree areas (0.97). Use this method instead.

---

# Part IV: Realism guide

## 13. Engine default lighting and headroom for realism

Engine default lighting is "multiplication only" — no specular, fresnel, warm/cool separation, or hemisphere ambient exists. The following can be rebuilt:

| Feature | Default | Buildable in packs? |
|---|---|---|
| Diffuse (Lambert) | Scalar sum of directional lights only | ◎ Custom with `bloxdSunDirection()` (wrapped falloff etc.) |
| Specular | None | ◎ Blinn-Phong (R9.2) |
| Fresnel | None | ◎ Schlick approximation (R9.3) |
| Warm-torch / cool-sky separation | Uncolored | ◎ (R9.1) |
| Hemisphere ambient | Directionless only | ◎ Sky above / ground below (R9.4) |
| Tone mapping | None (clamp only) | ◎ ACES filmic (R9.5) |
| Aerial perspective | Fog (color replacement) only | ◎ Distance desaturation (R9.6) |
| Surface detail | Texture resolution only | △ Procedural hash-noise micro-bump (R9.8) |
| Vertex waves (water) | None (flat) | ◎ Allow only (R7) |
| Wave normals / sun glitter | None | ◎ (R9.7) |
| Night moonlight | Sky color just darkens | △ No moon direction input, so only pseudo looks (blue ambient in R2 / desaturation in R9.11) |
| Shadows (sky-occlusion) | Gently blended via `mix(ambient, sky, skyLight)` only | ◎ Lift inversion + threshold cut + sun gate (R9.12). Tree shade and under-roof areas drop clearly, following block edits in real time |

## 14. Two implementation schools

**School A: additive fixes (from defaultLight)** — use `engineColour` (finished color) as the base and add warm glow or rim. Easy and safe, but the lighting model stays default.

**School B: full relighting (from s.colour)** — discard `l.engineColour` and rebuild lighting from `s.colour` (albedo) and raw LightIn materials. The real path to realism. Four rules:

1. **Re-apply fog**: the light hook runs post-fog, so apply `mix(l.fogColour, col, l.fogVisibility)` yourself (R9.10). When fog is too dense, floor it with `max(l.fogVisibility, 0.3)`. Conversely, mixing more fog color onto engineColour-based packs double-fogs into white distance
2. **Unlit fallback**: pass through to `defaultLight` outside `#ifdef BLOXD_LIGHTING`
3. **Guard whole shared functions**: wrap shared functions taking `BloxdLightIn` in `#ifdef BLOXD_LIGHTING` as entire functions (guarding only call sites is not enough)
4. **When there is no sun direction**: if `bloxdSunDirection()` is zero, don't compute directional specular. `l.directional` is a light-amount scalar, not a direction vector, so it cannot restore highlight direction. Switch to weak directionless ambient as needed. Moon direction is available via `-bloxdSunDirection()` (only moves in day/night-cycle worlds. Part VII R-A)

## 15. Unreachable looks (the realism "ceiling")

| Look | Reason |
|---|---|
| Pixel-accurate shadow maps (sun-tracking shadows, penumbra) | Depth textures cannot be referenced (liquid-only `bloxdOpaqueBehind()` is geometry-only and unusable as a shadow map). Light-ray occlusion is not fed into hooks |
| SSAO | No scene-depth access (only mesher-baked vertex AO; liquid-only depth is unusable for SSAO) |
| SSR (reflections) | No scene color. Only pseudo looks blending sky color via fresnel |
| Bloom / glare | No hook into post-processing |
| Depth of field, chromatic aberration, grain | Full-screen post-processing required |
| Volumetric light (god rays) | Same |
| PBR textures | Texture reads prohibited. Only pseudo estimation from color luminance |
| Underwater refraction | No scene color. Liquid-only depth (`bloxdOpaqueBehind()`) enables thickness absorption and bottom projection (Part VIII R-E) |
| Underwater veil (blue tint) removal / change | The veil is an emissive fullscreen quad generated from the liquid block definition color/alpha the camera is in, drawn outside hook pipelines (frontmost), so packs can change neither its color nor density |
| Direct underwater detection | No input indicates camera submersion, and fogStart / fogEnd / fogColour don't change underwater, so there is no reliable way to estimate underwater from fogVisibility etc. |

### The truth about shadows — "tree shadows" are buildable

Only **sun-tracking pixel-accurate shadow maps** are impossible in the table above. The engine already computes "shadows" from the start, and that is `skyLight`. The mesh-side LightEngine runs a Minecraft-style algorithm:

1. **Column scan**: scan each (x,z) column top to bottom. Light from the sky starts at 15, becomes **0 at opaque blocks**, dimming down with `lightFilter` (air 1 / water 3 / opaque 15)
2. **BFS flood fill**: spreads sideways to 6 neighbors (-1 per block) — this is what softens shadow edges. Raw value under radius-r occlusion is (15-r)/15
3. blockLight (torches etc.) is a separate BFS of RGB 3 channels (4bit packed)

So `l.skyLight` is not a mere brightness parameter but **voxel-resolution occlusion data of "whether sky is visible from here" = a shadow map**. Under trees, under roofs, and indoors it is already numerically low, arriving smoothed by vertex interpolation. Placing/breaking blocks recalculates immediately = **real-time-tracking shadows**. Vanilla only uses it "gently" via `mix(ambient, sky, skyLight)`.

The right tools are R9.12's two steps (**restore raw values via lift inversion → binarize with threshold `smoothstep`**. `th = 1 - r/15` directly dials "occlusion radius treated as shadow") plus **gating direct sun by sky** (sun only reaches where sky is visible = the essence of projection), composed with warm sunlit / cool shadow tinting.

**Honest limits**: these shadows are "upward sky" based, so **they don't rotate as the sun moves over time**. Resolution is per block (soft edges come from BFS spread). The engine lighting template still contains a closed `var shadow: f32 = 1.;` stub for shadow maps (always 1.0 = disabled) — interpreted as a trace of "planned" pixel-accurate rotating shadows. If pixel-accurate rotating shadows are a must, only out-of-API approaches remain (e.g. userscript GLSL injection, with policy risk).

### Underwater reality

Underwater looks consist of 3 layers:

| Layer | Content | Operable from packs? |
|---|---|---|
| ① Terrain/liquid rendering | Hook-processable. Light hooks are called normally underwater | Yes (works "under the veil") |
| ② Liquid-definition veil | Emissive fullscreen quad from the liquid block definition color/alpha at the camera position, drawn frontmost. The game setting `cameraTint` wins if set | No (neither color nor density changeable) |
| ③ cameraTint | Game setting | No |

Practical points: packs keep working underwater / the veil cannot be removed / underwater cannot be branched on (fogStart / fogEnd / fogColour don't change underwater, so fogVisibility can't detect it either).

## 16. Debugging tips

- Caves too bright → missing nonlinear `skyLight` curve (R2 cave recipe / R9.9)
- Blown-out days → lower pre-ACES exposure
- Nights too dark to see → secure minimum ambient (night `skyLightColour` is nearly black by premise)
- Over-hazed distance → lower aerial coefficients
- Torch surroundings all orange → lower the warm blend ratio (keep some raw tinted light)
- Blocks almost all white → light hook output total exceeds 1.0 (no clamp downstream). End with `clamp(col, vec3f(0.0), vec3f(1.0))`
- White without additions → un-fog inversion via fogVisibility division. Drop un-fog; rebuild from `s.colour` and `mix` fog once at the end
- Emissive blocks don't glow → missing emission re-add in rebuild recipes. Add `+ s.emission * l.fogVisibility`
- Night looks wrong only on lit faces → don't darken just shadow colors; decay the whole engine finished color (`engineColour`) at night. To keep local lamps, weaken decay with `blockLight` / `heldLight` (Part VI, section 19)
- Shade won't deepen no matter the `pow(skyLight, γ)` → `l.skyLight` is post-lift (section 10). Switch to R9.12 inversion + threshold cut
- Tuning shadow area/density → see the R9.12 tuning guide (area = threshold `shTh` / edge = `shSoft` / core darkness = two-point shift of minimum ambient and sky scatter)

---

# Part V: Troubleshooting & notes

## 17. Common errors and fixes

| Symptom | Fix |
|---|---|
| Won't load in strict games | Wrap the vertex hook in `#ifndef BLOXD_STRICT` |
| `.alpha` reported undefined | Wrap in `#ifdef BLOXD_ALPHA` |
| `blockLight` reported undefined | Wrap in `#ifdef BLOXD_LIGHTING`. Wrap shared helper functions **as whole functions** (fields exist in all variants in v2, so this normally does not happen. Keep guards used for detection) |
| `Packs can't construct BloxdSurface directly` | Start from `bloxdDefaultSurface(s)` |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | Wrap in `#ifndef BLOXD_STRICT` |
| White hazy distance | Often double fogging. The finished color is already fogged, so keep custom haze subtle and prefer saturation-only reduction |
| Pack excluded when joining a game | Failing the in-game live compile check. Re-check guard omissions |
| `pack.json needs "apiVersion": 2.` | Missing `apiVersion` or not `2`. Use numeric `2` (string `"2"` is rejected). v1 packs are rejected with `shaderPack:loadWrongApiVersion` |
| `There's no pack.json at the top of the pack.` | No `pack.json` at the ZIP root. Check you didn't zip the folder itself |
| `bloxdTerrainVertex must be declared as: fn ...` | Signature mismatch. Rewrite exactly as shown |
| `bloxdTerrainVertex can't run in strict games...` | Wrap the vertex hook in `#ifndef BLOXD_STRICT` |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | Wrap in `#ifdef BLOXD_LIGHTING` (fields exist in all variants in v2, so this normally does not happen) |
| Raising `pow(l.skyLight, γ)` never deepens shadows | `skyLight` is a post-lift-curve value (raw 0.87 arrives as 0.97). Switch to R9.12 lift inversion + threshold cut (section 10) |
| `... can only be a function's parameter or return type, ...` | Uninitialized `var x: BloxdSurface;` is rejected. Build from `bloxdDefault*` |
| `bloxdPackInputs isn't part of the bloxd_ header` | The PackInputs uniform cannot be referenced from packs directly. Use it via header functions like `bloxdTime()` |
| `Packs can't declare bloxd_ names...` | Strip the `bloxd_` prefix from your identifiers. Only the 6 hook names may be defined |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` is rejected. Write `_ = f();` |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | Wrap `bloxdOpaqueBehind()` calls in terrain hooks with `#ifdef BLOXD_SCENE_DEPTH` |
| `...only surface and light hooks can use.` | Remove `bloxdOpaqueBehind()` from vertex hooks (surface / light only) |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Not an error but auto-disable in strict games (`shaderPack:offInStrict`). Wrap vertex hooks and `discard` with `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Second-stage (browser Tint) error. Parenthesise operands of `^` `&` `\|` `<<` `>>` (§38) |
| `loadDuplicateManifest` on zip load | Two `pack.json` files (including case variants). Keep one |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Rewrite from `bloxdDefaultSurface(s)`. Starting from a copy of the light hook's first parameter (`var out = s;`) also works |

## 18. Rights and notes

- The shader pack feature itself is an official feature loadable from the in-game UI, and creating packs is considered intended use. But no public official documentation has been confirmed
- Packs are pure WGSL — JS execution and network access are impossible by design
- This is an unofficial guide, not the developers' official position. The API may change without notice

---

# Part VI: Important implementation notes

## 19. Fixing "shadows dark but surfaces bright" at night

Darkening only shadows leaves the engine finished color (`engineColour`) bright when there is no sun, making the face/shadow gap unnatural. Decay the whole finished color instead.

The example below treats zero `bloxdSunDirection()` as night and directional sun as day, decaying terrain finished colors at dark hours. Where `blockLight` and `heldLight` are strong, decay weakens to preserve nearby lamps like torches. `0.52` is a tuning value — lower it for darker nights.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    #ifdef BLOXD_LIGHTING
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
    let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
    let protectLocalLight = smoothstep(0.03, 0.35, localLight);
    scale = mix(nightDim, 1.0, protectLocalLight);
    #endif
    // decay the finished color; add material emission through fog as default
    out.colour = l.engineColour * scale + s.emission * l.fogVisibility;
    return out;
}
```

**Limits of this fix:** if `bloxdSunDirection()` behaves as "unit direction with sun, zero without", day/night can be told apart but dusk/twilight cannot be smoothly estimated. And since it decays the finished color, it weakens engine daylight and ambient together — not a full time-of-day reproduction. To apply the same to liquids, check the liquid hook fallback relationship.

## 20. Integrated recipe for natural-looking water

This API cannot sample scene color, so this is **pseudo styling with fresnel-style color blending and sun highlights, not real reflection/refraction** (depth math became possible in v2 with `bloxdOpaqueBehind()`, split out to Part VIII R-E). The sample below keeps the base color, blends slightly toward a sky-like color at grazing view angles, and adds a small glint only when the sun exists.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = bloxdWorldPosition(l.position);
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdTime()), topness));
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let halfDir = normalize(viewDir + sunDir);
        let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
        out.colour += vec3f(1.0, 0.97, 0.90) * glint;
    }
    #endif
    return out;
}
```

Tuning pointers:

- Water looks white/washed: lower `0.38` in `fresnel * 0.38` and the glint `0.55`.
- Water looks too dark: blend a bit more `fakeSkyReflection`. Too much looks plasticky.
- Lines or regular stripes on water: lower wave frequencies and glint strength. This code has no mesh vertex displacement.
- Want real scenery reflections: this API's inputs have no screen color, so blending colors never becomes real reflection (depth is liquid-only. Part VIII R-E).

This recipe **replaces** an existing `bloxdLiquidLight`. Don't paste it alongside R9.7's same-named wave function or other same-named hooks.

## 21. In-game test checklist

Compile success and "good looks" are different things. Check in this order:

1. **Loading:** `pack.json` is at the ZIP root; settings show `Ready to use`.
2. **8 variants:** no type-guard omissions across strict / allow, lighting on / off, terrain / liquid. Even if a game only uses some conditions, distribution packs should assume all 8.
3. **Daytime:** no blown colors per material (grass, stone, sand, wood); natural bright/dark split between tops and sides.
4. **Night:** compare same materials in former daylight, shadows, and near torches. If only lit faces remain, tune exposure decay; if everything is dark, tune local-light protection.
5. **Water:** look from above, grazing angles, shores, underwater, and night separately. Alpha behavior and underwater looks depend on the game's compositing — never judge from one viewpoint. Underwater, the liquid-definition veil covers frontmost per Part VII discussion, so pack differences show mainly on the surface and terrain through the veil.
6. **Borders and distance:** no popping waves/patterns at chunk / origin transitions; no double fog or white haze in the distance.
7. **Performance:** effects heavy on per-fragment hash/trig/`pow` calls should be minimal. Add detail gradually and compare FPS.

### Known constraints as premises

- Shader packs are limited to terrain / liquid hooks — no same-code handling of sky, entities, or UI.
- No inputs exist for adding shadow maps, screen-space reflections, refraction, bloom, etc. (scene depth is unlocked liquid-only as `bloxdOpaqueBehind()`. See Part VIII).
- `bloxdTime()` is animation time with no guaranteed link to in-game day/night.
- Zero `bloxdSunDirection()` means true moon direction is unknown, not "moonlight physics" but a mood approximation. Directional moonlight can be built from `-bloxdSunDirection()` (day/night-cycle worlds only. Part VII R-A).
- `s.position` / `l.position` are local coordinates, so add `bloxdOriginOffset()` for world-dependent effects. For in-block-local patterns, local coordinates are intentionally the tool.

## 22. Combining with other packs when shaders alone hit limits

Since shader packs cannot add or sample textures, don't try to solve fine material bumpiness or sky image changes with shaders alone. The public texture-pack repository for Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) handles textures, skybox, models, etc. through a different system.

For reference, community "cinematic shader" distributions analyzed in one case turned out to be texture packs (128x128 textures with no `pack.json` / `.wgsl`).

In practice, **tune light and color with shaders, and cover materials and sky with a matching resource pack**. But verify co-use and load order against the game's implementation and settings.

In practice, **tune light and color with shaders, and cover materials and sky with a matching resource pack**. But verify co-use and load order against the game's implementation and settings.

## 23. Underwater reality with shader packs

Underwater looks consist of 3 layers:

| Layer | Content | Operable from packs? |
|---|---|---|
| ① Terrain/liquid rendering | Hook-processable. Light hooks are called normally underwater | Yes (works "under the veil") |
| ② Liquid-definition veil | Emissive fullscreen quad from the liquid block definition color/alpha at the camera position, drawn frontmost. The game setting `cameraTint` wins if set | No (neither color nor density changeable) |
| ③ cameraTint | Game setting | No |

Practical points: packs keep working underwater / the veil cannot be removed / underwater cannot be branched on (fogStart / fogEnd / fogColour don't change underwater, so fogVisibility can't detect it either).

---

# Part VII: Internals supplement

Extra specs found by engine-implementation analysis. All restored directly from current production-build JavaScript.

## 24. Sun and moon identity

The `bloxdSunDirection()` source is a sun-direction buffer rewritten only when the skybox type changes — the criterion is not "whether the sky has a sun" but **"whether the skybox is the earth type"**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (procedural sky) | Non-zero (defaults below) |
| `gloomy` / `interstellar` / `space_*` (cube textures) | **Always (0,0,0)** |

**The moon is always `-bloxdSunDirection()`** (the engine computes the moon position as the exact opposite of the sun). Night is judged by sun elevation — the moon is up when `bloxdSunDirection().y < 0` (sun below horizon). But in default worlds the sun is static, so the moon is static too; only worlds implementing a day/night cycle see it move.

The default-world sun direction is about `(-0.56, 0.81, -0.18)` (unit vector computed from inclination = −0.2 / azimuth = 0.55, static). A practical reference for predicting highlight directions on paper when testing distribution packs.

Day/night cycles are not built into the engine — inclination is a static number, and worlds with moving day/night update it game-side. `bloxdSunDirection()` follows each update.

Terrain directional lights are just 2 lamps created at scene start with **fixed direction and intensity, unchanging day and night**. In short, **no terrain-brightness factor depends on time. Day/night "looks" come only from the skybox and bloxdSunDirection()**, so packs darkening terrain at night must estimate the time band from bloxdSunDirection() themselves (the §19 `sunPresent` technique).

### R-A. Directional moonlight — moonDir = −bloxdSunDirection()

Adds bluish-white Lambert and weak specular only while the moon is up. `moonUp` is 0 in static-sun default worlds, so nothing happens there — **moonlight that only fires in day/night-cycle worlds, hence safe**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // the moon is always exactly opposite the sun; auto-off in daytime via moonDir.y < 0
    let moonDir = -bloxdSunDirection();
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(bloxdEyePosition() - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. Fog internals

Fog computation is always LINEAR mode (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), with `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = fog distance setting; only D = 0 is special with fogEnd = 5). **The fog gradient band is only 32 blocks wide**, and `l.fogVisibility` is less "distance haze" than a **normalized distance to the edge of the loaded world**. It varies per player with load distance, so distance-based effects should compute `distance(l.position, bloxdEyePosition())` themselves (recipe R-B).

Default fog color is `rgb(183, 191, 195)` (pale blue-gray). World creators can change it via `fogColourOverride` (hex). With fog mode 0 (NONE), **fogColour arrives black**. The standard `mix(l.fogColour, col, l.fogVisibility)` form is safe since fog color is unused at fogVisibility 1.

Setting player-side `showFog` to false pushes fog to 3200–3328 blocks, effectively disabling it (`fogVisibility ≈ 1` keeps coming back).

### R-B. Load-border band — fogVisibility as "world edge"

Quietly cools just the 32-block load-border band to de-emphasize the world edge (or emphasize it as an effect). No self-computed distance, so it auto-follows player load-distance settings.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = inside (margin to border), 0 = about to exit the border
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. blockLight / heldLight internals

When decoding `aPackedLightLevels`, the engine floors each channel at **35% of the brightest RGB channel**. E.g. a "pure red light" is lifted to (1.00, 0.35, 0) at vertices before interpolation and lift. Torch orange looking "whitish-pink rather than red" in game comes from this — tune warm-torch recipe (R9.1) saturation against this default.

Handheld light (`heldLight`) range follows the brightest light-color channel (max 15 blocks) with `dist^0.75` preprocessing, the same 35% channel floor, and `l.heldLight` is the pre-ambient-boost value. Custom items can set `spotlightRange` and cone angle — a "beam while held" mode whose cone position follows the camera. Packs cannot know beam direction.

Custom blocks may carry `skyLightEmission` (0–15), which **injects into the skyLight channel itself, separately from blockLight BFS**. R9.12-style packs judging sun/shadow by skyLight threshold can misjudge in worlds where artificial lights lift skyLight. Distribution packs should judge combined with blockLight to stay robust.

## 27. Pipeline details

- **Surface hooks run "before" alphaTest**: `out.alpha` feeds the discard test directly. Cutout materials (grass, leaves) allow dissolve-style dither effects (recipe R-C). For liquids (blended) `out.alpha` is the real transparency (recipe R-D). No effect on normal opaque terrain — don't misunderstand
- **`l.ambient` content** is `material.ambient × sceneAmbient`, differing per material. The scene side ties to the graphics setting "Ambient Lighting Intensity" (default 0.5) — never hardcode defaults
- **`bloxdTime()` is really `performance.now()`**: the browser's uptime wrapped at 1 hour. Unrelated to in-game day/night and world elapsed time. To animate synced to a game clock, estimate time from the `bloxdSunDirection()` azimuth in day/night-cycle worlds
- Fine checker patterns at chunk borders during loading are the engine's screen-space Bayer 4×4 dither chunk fade, not pack bugs
- **`mod` is a reserved word**: rejected with `pack.wgsl:3 'mod' is a reserved word in WGSL.` Write remainders with the `%` operator

### R-C. Bayer dither dissolve — out.alpha drives discard

Reproduces the **same Bayer 4×4 table** the engine uses for chunk fades, dissolving cutouts from low blocks upward. discard fires on alphaTest materials (grass, leaves); in liquids it becomes blend transparency.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod is reserved, so use the % operator
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // dissolve from low blocks upward; higher dissolve persists
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. Near-camera water fade — liquid alpha keeps sightlines

Liquid-hook `out.alpha` feeds blending directly. Fades just the water surface under the camera to keep diving/above-water camera sightlines.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // fully transparent → normal over 0–3 blocks
    #endif
    return out;
}
```

## 28. What changes pack-visible values — test checklist

The same pack renders differently across **world and player settings**. Check at least these 3 environments before distribution:

1. **Normal world** (default skybox, no overrides) — bloxdSunDirection() present, default colors
2. **Space-skybox world** — bloxdSunDirection() = 0. The `sunPresent` branch look
3. **Custom world with `visionMinLightColour` / `skyLightColourOverride`** — lifted darks and colors

Main variance sources: `lightingOverride` (forced lighting) / `skyLightColourOverride`, `ambientLightColourOverride` (hex swaps) / `visionMinLightColour` ("darkest visible color" floor on sky and ambient; Night Vision uses it — "pitch-dark cave" packs won't get as dark as intended) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (bloxdSunDirection() presence). `uSkyLightColour` default = (1,1,1) white, `uAmbientLightColour` default = (0.25,0.25,0.30). `l.ambient` scene component = graphics setting "Ambient Lighting Intensity" (default 0.5). `l.fogVisibility` follows player fog/chunk distance settings.

## 29. Debug means

- URL parameter `?renderer=lite` — force the Lite renderer (`?renderer=webgl2` / `babylon` also work)
- URL parameter `?vconsole` — on-screen console (VConsole). Handy for mobile device verification
- Console shows `noa-engine v0.33.0` and `Renderer: lite from <source>` — check these first to avoid render-path misdiagnosis
- The WebGPU renderer locks "forced ON" while a pack applies. The "Disable Block Texture Atlas" setting also locks (atlas stays ON), and packs can't apply at all on WebGPU-less devices. The basis for writing "needs a WebGPU browser" on distribution pages
- Per-game-join runtime re-validation (`checkCompilation`) compiles real terrain materials in browser WebGPU (stricter than settings-screen static validation). Packs failing here are excluded from that game

---

# Part VIII: API Version 2 migration guide

Target build: `6qxffk.main.5912a15f.js` (production deploy as of 2026-10-16). Parts I–VII of this guide are already rewritten to the v2 baseline; this Part VIII collects the migration points from v1 and the new v2 features. New-feature code examples pass 8/8 variant validation on the v2 compiler and browser WGSL compiler (Tint) validation (§38), but v2 conversion of existing recipes is mechanical identifier substitution — always verify with an in-game compile before distribution.

## 31. Fate of v1 packs (conclusion first)

The game requires the manifest `apiVersion` to **match 2 strictly**. Loading a v1 pack is rejected with `This pack is for shader pack API version 1. Bloxd supports version 2.` (i18n key `shaderPack:loadWrongApiVersion`). There is **no parallel v1/v2 support**. The engine also re-checks saved packs' `validation.headerVersion` (a hash of the full header text), so the mechanism auto-marking saved packs "needs re-check" on engine updates is the same as v1.

## 32. Full identifier renaming (mapping table)

v2 unifies underscore naming into camelCase. **Old names are entirely unusable.**

| v1 | v2 |
|---|---|
| `bloxd_terrain_vertex` | `bloxdTerrainVertex` |
| `bloxd_terrain_surface` | `bloxdTerrainSurface` |
| `bloxd_terrain_light` | `bloxdTerrainLight` |
| `bloxd_liquid_vertex` | `bloxdLiquidVertex` |
| `bloxd_liquid_surface` | `bloxdLiquidSurface` |
| `bloxd_liquid_light` | `bloxdLiquidLight` |
| `bloxd_defaultVertex` | `bloxdDefaultVertex` |
| `bloxd_defaultSurface` | `bloxdDefaultSurface` |
| `bloxd_defaultLight` | `bloxdDefaultLight` |
| `bloxd_VertexIn` | `BloxdVertexIn` |
| `bloxd_Vertex` | `BloxdVertex` |
| `bloxd_SurfaceIn` | `BloxdSurfaceIn` |
| `bloxd_Surface` | `BloxdSurface` |
| `bloxd_LightIn` | `BloxdLightIn` |
| `bloxd_Light` | `BloxdLight` |
| `bloxd_packInputs` (internal uniform) | `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) |

Hook kinds (vertex / surface / light × terrain / liquid, 6 total) and the `pack.json` format (`apiVersion` / `name` / `author`) are unchanged. Loader limits are unchanged too (zip 32MB / 1024 entries / 256 `.wgsl` files / 256KB total / 64KB manifest).

## 33. Where removed fields moved

In v1, `time` / `eyePosition` / `sunDirection` / `originOffset` were struct fields. In v2 **these fields are removed; header functions reading the engine uniform (`bloxdPackInputs`)** are used instead. Since the functions read the uniform directly, **they can be called from module-scope functions outside hooks and from vertex hooks**.

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` for world-coordinate conversion | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

## 34. New feature 1: `blockId` (per-block shading)

All three structs `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` gained `blockId: u32`. It is the **owning block's ID** (0–65535), uniform across the face (passed with `@interpolate(flat)`). Use it for block-type identification independent of texture color. But the ID-to-block-type table lives inside the engine and is invisible from packs, so **which ID is which block can only be measured in-world**.

### R-F. Per-block-type tint via blockId

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // e.g. tilt stone-like ids (upper bit pattern) cool
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

## 35. New feature 2: `BLOXD_SCENE_DEPTH` and `bloxdOpaqueBehind()` (the headline)

Depth access, structurally impossible in v1, is unlocked **for liquid programs only**. No color, but **geometry — distance and position of the opaque face behind — is available**. The typical use is absorption-color computation from measured water thickness.

Usage rules:

| Usage | Result |
|---|---|
| Called unguarded in `bloxdLiquidSurface` / `bloxdLiquidLight` | OK (always defined in liquid variants) |
| Called unguarded in `bloxdTerrainSurface` | ERROR. Wrap with `#ifdef BLOXD_SCENE_DEPTH` |
| Called in vertex hooks | ERROR (surface / light hooks only) |

To use depth in terrain hooks too, wrap with `#ifdef BLOXD_SCENE_DEPTH` (terrain hooks are reused by liquid programs, so depth is only live on the liquid side).

### R-E. Water thickness absorption (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // water column length = from here to the opaque face behind
        let thickness = distance(behind.position, surface.position);
        // Beer-Lambert absorption: red falls fast, blue reaches far
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // nothing behind = tint toward deep water blue
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

Applications: thickness-based absorption/scattering, caustics-style ripple projection from bottom world coordinates via `behind.position`, sky-vs-occlusion distinction with `found=false` for sky reflection on water, staged murk by depth. If the depth-copy pipeline fails to build, it safely degrades to "nothing behind".

## 36. Other v2 changes

- **Hook fallback**: liquid programs fall back to terrain hooks when `bloxdLiquidXxx` is undefined. **Terrain-hook-only packs affect water as-is**. Define liquid-side hooks explicitly when unintended.
- **No more `BLOXD_LIGHTING` field guards**: `blockLight` etc. exist in all variants, holding defaults when unlit (0 / 1 / white / 0). Use `#ifdef BLOXD_LIGHTING` only to test for lighting. Keeping existing guards changes nothing.
- **`BLOXD_ALPHA` defined-condition change**: defined in non-strict terrain variants and all liquid variants, undefined in strict × terrain. Keep the guard when writing alpha in terrain hooks.
- **Direct struct construction prohibited**: constructor calls like `BloxdLight(...)` are rejected by static validation. Always modify from `bloxdDefault*`, or use a copy of the input.
- **`let _ =` becomes `_ =`**: WGSL discard assignment `_ = f();` is valid, but `let _ = f();` is rejected.
- **offInStrict**: defining a vertex hook, or a `discard` reachable from surface / light hooks, auto-disables the whole pack in strict games instead of erroring (settings UI shows `shaderPack:offInStrict`; still runs in allow games). Wrap vertex hooks and `discard` with `#ifndef BLOXD_STRICT`.
- **Fog extensions**: LINEAR / EXP / EXP2 fog modes are implemented, but game settings still always use LINEAR, so existing fog specs keep working. `fogColour` semantics are now officially documented (black only in fully fogless scenes).
- **Unchanged**: lift curve, 35% channel floor, heldLight falloff (`pow(lightDist, 0.75)`) and ambient boost, sun/moon direction spec, default fog color, time wrap (3600 s), directional lights (max 4), Lite (WebGPU) only, save mechanism (IndexedDB), `mod` reserved word.

## 37. v1 → v2 migration checklist

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **Identifiers**: replace all per the §32 table (hook names, struct names, default function names)
3. **Removed-field porting**: to header functions per the §33 table (`s.time` → `bloxdTime()` etc.)
4. **Rename `fogFactor` → `fogVisibility`**
5. **Remove direct struct construction**
6. **Fix `let _ =` to `_ =`**
7. **Wrap vertex hooks and discard with `#ifndef BLOXD_STRICT`**
8. **Confirm water also feels terrain-hook effects**; define liquid hooks explicitly when unintended
9. (Optional) Manage fog yourself from `litColour` / add water thickness absorption with `bloxdOpaqueBehind()` / per-block styling with `blockId`
10. **Also validate the second stage (browser Tint)** — parenthesise expressions containing `^` `&` `|` `<<` `>>` especially. Code that passes static validation can still be rejected by the browser (§38)

## 38. Second validation stage — the browser's WGSL compiler is stricter than the built-in parser

Pack validation in the game has **2 stages**. The first stage is static validation (the engine's built-in JS parser. It checks pack-specific rules like hook signatures, prohibited syntax, sceneDepth usage), and the second stage is browser validation (it compiles stubs bundled with the compilation result with a real WebGPU implementation, mapping errors back to the pack's source file lines for display. The UI's "Saved, but it won't run until you fix these errors" is this stage). A suffix like `(only in terrain)` at the end of an error display is "the program kind of the variant where that error occurred".

The built-in parser does not implement WGSL's operator binding rules, so **code that passes static validation can still be rejected by the browser**. The classic victim is the integer-hash idiom:

| Operator | Consequence |
|---|---|
| `<<` `>>` | Can only bind directly at unary level. `a + b << c` is an error |
| `&` `^` `\|` | Can only bind directly at unary level. `a * b ^ c` is an error |
| `&&` `\|\|` | Cannot be mixed. `a && b \|\| c` is an error |

### Parenthesisation (NG / OK)

```wgsl
// NG — passes static validation but the browser (Tint) rejects it:
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — parenthesise each multiplication (a chain of the same operator A ^ B ^ C is itself legal left-assoc)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

The code printed in this guide contains none of this pattern (the `+`/`*` mixing in `pack_hash3` and `h ^ (h >> 16u)` are already parenthesised, hence spec-compliant). When you write a pack, pass both the first and the second stage.

## 39. On independently similar materials

A community material with nearly the same content exists: [GlitchHunterCoder/Bloxd-Essay's Shader](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader). It was published before this guide, but **this guide's content comes from glm's own analysis of Bloxd's actual bundle files (webpack chunk set) — not copy-paste**. Both match because independently investigating the same implementation leads to the same conclusions.

---

Researched by ltf_ahel (researched with glm)
