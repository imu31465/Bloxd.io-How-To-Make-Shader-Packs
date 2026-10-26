# How to Make Bloxd.io Shader Packs (Complete Guide)

A self-contained guide to creating and distributing shader packs for Bloxd.io (WebGPU renderer only).

> This is an unofficial guide and does not represent the views of the developers. The API may change without notice.  
> This guide was created with AI assistance; accuracy is not guaranteed. Verify against actual in-game behavior.  
> Last reviewed: 2026-10-27 (v4 production rollout confirmed by bundle comparison — build `cnty9`, production and preprod identical; texture API, fog rename and strict-games internals restored from the production build — Part X §63–§65). The complete reference material is embedded as Part XI (`11-reference.md`): the engine header restored verbatim and the full measured catalogue of all 905 usable texture names; still verify recipes against the loader screen and in-game compilation.  
> The shader pack feature itself is an official feature accessible from the in-game UI, and packs are pure WGSL  
> (no JS execution or networking), so nothing dangerous happens with normal code.

[Back to the manual](README.md)·[Next part →](02-api.md)

# Part I: Making packs

> The live game has required `apiVersion: 4` since 2026-10-26 and rejects v1/v2/v3 packs at load — the content below is written against the v2 specification; see [Part IX](09-apiv3.md) and [Part X](10-apiv4.md) for migration before you distribute anything.

## 1. Overview and prerequisites

- Shader packs are **WebGPU renderer only**. While a pack is installed, the WebGPU renderer is force-enabled in settings
- Packs are written in a **restricted subset of WGSL**. They affect only the look of **terrain and liquids**
- What you can do: change colors, transparency, and emission; rebuild lighting; projected-style shadows (R9.12); vertex animation (only in certain games)
- What you cannot do: add textures of your own, post-processing (bloom etc.), pixel-accurate shadows that rotate with the sun (shadow maps) or real reflections (SSR), or affect the sky and entities. (Sampling the existing block-texture atlas **became possible in v4** — `bloxdTexel`, [Part X](10-apiv4.md) §57; adding textures is still the texture-pack system's job)
- What you can do (but is easy to miss): **projected-style shadows using `skyLight` (voxel sky occlusion)** — you can clearly darken areas under trees and roofs (R9.12). Breaking blocks makes LightEngine recalculate immediately, so shadows follow in real time
- **Most games run in strict mode** (no vertex animation, no `discard`). Design packs for general distribution to work in strict mode

## 2. Quick start

1. Create a folder and place `pack.json` and `.wgsl` files in it
2. Load the zip or folder from the game settings → Shader Pack
3. Fix any errors and reload (see [Part V](05-troubleshooting.md))
4. Test in supported games
5. Zip it up when done and distribute it

## 3. Pack structure

- **Distribution format**: a single `.zip`, or a folder (folder loading is desktop browsers only)
- **Contents**: one `pack.json` (placed at the top level of the pack; case-insensitive) + 1–256 `.wgsl` files
- Multiple `.wgsl` files are concatenated and treated as one module, so splitting and subdirectories are free. No constraints on file names. Concatenation happens in **dictionary order by entry (path) name** (module-scope declarations are order-independent so this normally doesn't matter — it only bites code depending on `var` initialization order). Non-`.wgsl` files (READMEs etc.) are ignored
- Zipping tip: if a zip stores everything under one common root folder, that prefix is stripped automatically (zips made with macOS "Compress" work as-is; OS junk such as `__MACOSX`, `._`-prefixed files and `.DS_Store` is excluded automatically). But stray files at the root level break top-level detection, so the safest method is to go inside the folder and zip `pack.json` and the `.wgsl` files directly (verify `pack.json` ends up at the ZIP root)

| Item | Limit |
|---|---|
| zip size / entry count | 32MB / 1024 |
| pack.json size | 64KB, UTF-8 |
| total .wgsl size | 256KB, UTF-8 |
| zip format | zip64, split, and encrypted zips are rejected. Compression: store / deflate only. Duplicate paths not allowed |

## 4. pack.json

```json
{
  "apiVersion": 3,
  "name": "My Pack",
  "author": "your name"
}
```

| Field | Required | Description |
|---|---|---|
| `apiVersion` | required | Must match `3` exactly. Packs with `1`/`2` are rejected at load with `shaderPack:loadWrongApiVersion` — see [Part IX](09-apiv3.md) for migration |
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
2. Check the status. Right after selecting you'll see "Ready. Reload the page to use it." — after reloading the page, "Ready to use" means success. For "Saved, but it won't run until you fix these errors...", fix the listed errors (file:line + variant) and reload
3. Reload the page to activate. Remove any renderer overrides in URL parameters or localStorage first, or the pack will refuse to start
4. Test in lenient games first, then in strict games (the majority). Vertex animation only works in allow games
5. For distribution, zip with `pack.json` at the top (within section 3 caps). Replacing the pack can be done from the same screen, but takes effect only after a page reload (steps 2–3). Remove Pack deletes it. Re-validation after game updates runs automatically on page load

[Back to the manual](README.md)·[Next part →](02-api.md)

[← Previous part](01-making.md)·[Back to the manual](README.md)·[Next part →](03-recipes.md)

# Part II: API reference

> The live game has required `apiVersion: 4` since 2026-10-26 and rejects v1/v2/v3 packs at load — the content below is written against the v2 specification; see [Part IX](09-apiv3.md) and [Part X](10-apiv4.md) for migration before you distribute anything.

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
- `bloxdSunDirection()` is a unit vector only while a sun exists; zero when the sky has no sun. **The moon is always `-bloxdSunDirection()`** (the engine computes the moon position as the exact opposite of the sun). Current builds have no day/night cycle: sun, moon and stars never move during play (only opacity toggles like `dayNightSunOpacity`). In the default earth-like sky the sun sits fixed at ≈ `(−0.56, 0.81, −0.18)` (elevation ~54°). **Never pass a zero vector to `normalize`** — test sun absence with `dot(d, d) < 1e-8` and fall back to a constant direction (see [Part VII](07-internals.md) §28)
- ※Note: previously written as "cannot be reused as the moon direction when zero". Direction itself is available via `-bloxdSunDirection()`, but packs for external distribution should branch on `sunPresent` with zero as the premise (see R2 for the blue-ambient pseudo look, [Part VII](07-internals.md) R-A for directional moonlight)
- `emission` is added after the lighting calculation, attenuated by **`fogVisibility`** (the defaultLight implementation `engineColour + emission × fogVisibility`. Emission also disappears in fully fogged distance)
- **Fog application order**: fragment processing runs ① lighting/emission composition → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ light hook call → ⑤ return. So **engineColour arrives already fogged**, and **the light hook's return value becomes the final color as-is** (no fog re-applied after the hook)
- **fogVisibility source**: view-space distance (computed per-vertex, interpolated). In linear mode `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **When fogMode == 0**: `fogColour` arrives as `vec3f(0.0)` (black). Code estimating time-of-day from fogColour tint should be careful
- **Real fog settings in current builds**: **linear fixed**. `fogStart` = chunk render distance, `fogEnd` = +1 chunk (horizon only). With fog off it is set to 100 / 101 chunks, effectively disabling. Default fog color is RGB(183, 191, 195)
- The `bloxdPackInputs` uniform (`@group(3) @binding(0)`, 64B) is for **header-function use only**. Do not reference it from packs directly. Stage visibility is VERTEX|FRAGMENT, so header functions can also be called from module-scope functions outside hooks and from vertex hooks. The depth texture (binding 1) is FRAGMENT-only, so `bloxdOpaqueBehind()` is limited to surface / light hooks
- **`skyLight` / `blockLight` / `heldLight` arrive after a "lift curve"**. The `tone-mapped` in the header comments refers to this: the engine always applies `y = 1-(1-x/(3-2x))³` (an S-curve lifting dark areas) to fragments before handing them to packs. Values are not raw voxel values (n/15); e.g. under a tree (raw 0.87) arrives lifted to **0.97**
- `skyLight` is essentially voxel occlusion data of "whether sky is visible from here" (= a shadow map), not just a brightness parameter (see section 15, "The truth about shadows")
- **`litColour` works as a starting point**: in v1 only fogged `engineColour` existed, so custom atmosphere tended to double-fog. In v2 start from pre-fog, pre-emission `litColour` and re-apply fog at your own pace with `bloxdApplyFog()`
- **`blockId` tells block types apart**: identification independent of texture color. But the ID-to-block-type table lives inside the engine, so which ID is which block is measured in-world, with a pre-built table in the author's [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (see [Part VIII](08-apiv2.md))
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

The officially defined symbols are only 4 (the 3 above + `BLOXD_SCENE_DEPTH` — [Part VIII](08-apiv2.md) §35). Terrain vs. liquid is not a symbol but a **separate program**, so branches like `#ifdef BLOXD_TERRAIN` are impossible. Flag-name matching is case-insensitive; a wrong name in `#ifdef` makes the error message list all 4 valid ones. Hook functions are injected only into the terrain and liquid programs — packs cannot affect entities, particles, or any other rendering.

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

[← Previous part](01-making.md)·[Back to the manual](README.md)·[Next part →](03-recipes.md)

[← Previous part](02-api.md)·[Back to the manual](README.md)·[Next part →](04-realism.md)

# Part III: Recipe collection

> The live game has required `apiVersion: 4` since 2026-10-26 and rejects v1/v2/v3 packs at load — the content below is written against the v2 specification; see [Part IX](09-apiv3.md) and [Part X](10-apiv4.md) for migration before you distribute anything.

- [R1. Color recipes (surface)](#r1-color-recipes-surface)
- [R2. Lighting recipes (light)](#r2-lighting-recipes-light)
- [R3. Emission recipes](#r3-emission-recipes)
- [R4. Coordinate recipes (world / block / view)](#r4-coordinate-recipes-world--block--view)
- [R5. Time recipes (animation)](#r5-time-recipes-animation)
- [R6. Liquid recipes](#r6-liquid-recipes)
- [R7. Vertex recipes (allow only)](#r7-vertex-recipes-allow-only)
- [R8. Math tricks](#r8-math-tricks)
- [R9. Realistic recipes](#r9-realistic-recipes)

---

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

> In this API, `bloxdSunDirection()` is zero when the sky has no sun. The following is not directional moonlight, just a faint blue ambient added when the sky is dark. Moon direction itself is available via `-bloxdSunDirection()` (day/night-cycle worlds only. [Part VII](07-internals.md) R-A).

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

> In v1, scene depth and the water bottom position could not be referenced, so true water depth could not be computed with that API alone. In v2, liquid-only `bloxdOpaqueBehind()` measures the thickness to the opaque face behind ([Part VIII](08-apiv2.md) R-E). The following is the old pseudo styling without it: `s.position.y` is a local coordinate, so using it raw shifts the effect as the chunk origin changes. Convert with `bloxdWorldPosition()` for world height. The following only varies alpha by world height — a pseudo effect, not shoreline/bottom-aware shallows. Adjust `packWaterReferenceY` to your world height.

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
> For exact conditions (the allow title list; Custom Games being strict) see §30: [§30 Per-game apply modes](07-internals.md#30-per-game-apply-modes-shaderpackpolicy)

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

[← Previous part](02-api.md)·[Back to the manual](README.md)·[Next part →](04-realism.md)

[← Previous part](03-recipes.md)·[Back to the manual](README.md)·[Next part →](05-troubleshooting.md)

# Part IV: Realism guide

> The live game has required `apiVersion: 4` since 2026-10-26 and rejects v1/v2/v3 packs at load — the content below is written against the v2 specification; see [Part IX](09-apiv3.md) and [Part X](10-apiv4.md) for migration before you distribute anything.

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
4. **When there is no sun direction**: if `bloxdSunDirection()` is zero, don't compute directional specular. `l.directional` is a light-amount scalar, not a direction vector, so it cannot restore highlight direction. Switch to weak directionless ambient as needed. Moon direction is available via `-bloxdSunDirection()` (only moves in day/night-cycle worlds. [Part VII](07-internals.md) R-A)

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
| Underwater refraction | No scene color. Liquid-only depth (`bloxdOpaqueBehind()`) enables thickness absorption and bottom projection ([Part VIII](08-apiv2.md) R-E) |
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
- Night looks wrong only on lit faces → don't darken just shadow colors; decay the whole engine finished color (`engineColour`) at night. To keep local lamps, weaken decay with `blockLight` / `heldLight` ([Part VI](06-implementation.md), section 19)
- Shade won't deepen no matter the `pow(skyLight, γ)` → `l.skyLight` is post-lift (section 10). Switch to R9.12 inversion + threshold cut
- Tuning shadow area/density → see the R9.12 tuning guide (area = threshold `shTh` / edge = `shSoft` / core darkness = two-point shift of minimum ambient and sky scatter)

[← Previous part](03-recipes.md)·[Back to the manual](README.md)·[Next part →](05-troubleshooting.md)

[← Previous part](04-realism.md)·[Back to the manual](README.md)·[Next part →](06-implementation.md)

# Part V: Troubleshooting & notes

> The live game has required `apiVersion: 4` since 2026-10-26 and rejects v1/v2/v3 packs at load — the content below is written against the v2 specification; see [Part IX](09-apiv3.md) and [Part X](10-apiv4.md) for migration before you distribute anything.

## 17. Common errors and fixes

| Symptom | Fix |
|---|---|
| Won't load in strict games | Wrap the vertex hook in `#ifndef BLOXD_STRICT` |
| `.alpha` reported undefined | Wrap in `#ifdef BLOXD_ALPHA` |
| `blockLight` reported undefined | Wrap in `#ifdef BLOXD_LIGHTING`. Wrap shared helper functions **as whole functions** (fields exist in all variants in v2, so this normally does not happen. Keep guards used for detection) |
| `Packs can't construct BloxdSurface directly` | Start from `bloxdDefaultSurface(s)` |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | Wrap in `#ifndef BLOXD_STRICT` |
| White hazy distance | Often double fogging. The finished color is already fogged, so keep custom haze subtle and prefer saturation-only reduction |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | Warning that the light seed queue overflowed in high-density emitter regions or across region boundaries, so that chunk's light computation was cut short. Not pack-derived, but **light gaps around emitter concentrations come from this spec** — spreading light sources in the world avoids it |
| Pack excluded when joining a game | Failing the in-game live compile check. Re-check guard omissions |
| The live check never terminates and the pack drops with `This device couldn't check …` etc. | The check has a forced 60-second timeout (excess counts as `skipped`). Common on weak devices / heavy worlds — reduce heavy vertex work and complex loops and retry |
| `pack.json needs "apiVersion": 3.` | Missing `apiVersion` or not `3`. Use numeric `3` (string `"3"` is rejected). v1/v2 packs are rejected with `shaderPack:loadWrongApiVersion` |
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
| `Lite: …reads scene depth on a page that didn't turn it on` | Reload the page and reopen it with the depth-reading pack ([Part VIII](08-apiv2.md) §35) enabled. The depth texture's availability is fixed at page generation |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Not an error but auto-disable in strict games (`shaderPack:offInStrict`). Wrap vertex hooks and `discard` with `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Second-stage (browser Tint) error. Parenthesise operands of `^` `&` `\|` `<<` `>>` (§38) |
| `loadDuplicateManifest` on zip load | Two `pack.json` files (including case variants). Keep one |
| 「needs the new WebGPU renderer, so remove the renderer override...」 | Remove the URL `?renderer=` and localStorage `bloxdRenderer`, then reload ([Part VII](07-internals.md) §29) |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Rewrite from `bloxdDefaultSurface(s)`. Starting from a copy of the light hook's first parameter (`var out = s;`) also works |

### Loader-stage error IDs

Errors from the settings screen carry `shaderPack:load*` IDs. As a message-lookup aid:

| ID | Meaning |
|---|---|
| `loadZipTooBig` | zip over 32MB |
| `loadTooManyZipEntries` | zip entries over 1024 |
| `loadTooManyWgsl` | `.wgsl` over 256 |
| `loadSourceTooBig` | total `.wgsl` over 256KB (streaming check per file) |
| `loadManifestTooBig` | `pack.json` over 64KB |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` is not JSON / not an object |
| `loadNoApiVersion` / `loadWrongApiVersion` | no `apiVersion` / not `3` (v1/v2 packs rejected) |
| `loadNoName` / `loadAuthorNotString` | no `name` / `author` is not a string |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | unsupported compression / zip64 / split / encrypted |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | duplicate paths / non-UTF-8 / decompression failure / zip damaged |

`loadNoManifest` / `loadDuplicateManifest` (pack.json position / duplicates) — see the matching rows in the table above.

## 18. Rights and notes

- The shader pack feature itself is an official feature loadable from the in-game UI, and creating packs is considered intended use. But no public official documentation has been confirmed
- Packs are pure WGSL — JS execution and network access are impossible by design
- This is an unofficial guide, not the developers' official position. The API may change without notice

[← Previous part](04-realism.md)·[Back to the manual](README.md)·[Next part →](06-implementation.md)

[← Previous part](05-troubleshooting.md)·[Back to the manual](README.md)·[Next part →](07-internals.md)

# Part VI: Important implementation notes

> The live game has required `apiVersion: 4` since 2026-10-26 and rejects v1/v2/v3 packs at load — the content below is written against the v2 specification; see [Part IX](09-apiv3.md) and [Part X](10-apiv4.md) for migration before you distribute anything.

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

This API cannot sample scene color, so this is **pseudo styling with fresnel-style color blending and sun highlights, not real reflection/refraction** (depth math became possible in v2 with `bloxdOpaqueBehind()`, split out to [Part VIII](08-apiv2.md) R-E). The sample below keeps the base color, blends slightly toward a sky-like color at grazing view angles, and adds a small glint only when the sun exists.

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
- Want real scenery reflections: this API's inputs have no screen color, so blending colors never becomes real reflection (depth is liquid-only. [Part VIII](08-apiv2.md) R-E).

This recipe **replaces** an existing `bloxdLiquidLight`. Don't paste it alongside R9.7's same-named wave function or other same-named hooks.

## 21. In-game test checklist

Compile success and "good looks" are different things. Check in this order:

1. **Loading:** `pack.json` sits at the ZIP root. Right after selecting, `Ready. Reload the page to use it.` is shown and the pack becomes active **on page reload**; confirm `Ready to use` afterwards. Saved packs are re-validated automatically on the next page load: whenever the engine-side spec header updates, the header content is fingerprint-checked (pass = stays as-is / fail = shown as blocked), so a broken old pack never stays silently active.
2. **8 variants:** no type-guard omissions across strict / allow, lighting on / off, terrain / liquid. Even if a game only uses some conditions, distribution packs should assume all 8.
3. **Daytime:** no blown colors per material (grass, stone, sand, wood); natural bright/dark split between tops and sides.
4. **Night:** compare same materials in former daylight, shadows, and near torches. If only lit faces remain, tune exposure decay; if everything is dark, tune local-light protection.
5. **Water:** look from above, grazing angles, shores, underwater, and night separately. Alpha behavior and underwater looks depend on the game's compositing — never judge from one viewpoint. Underwater, the liquid-definition veil covers frontmost per [Part VII](07-internals.md) discussion, so pack differences show mainly on the surface and terrain through the veil.
6. **Borders and distance:** no popping waves/patterns at chunk / origin transitions; no double fog or white haze in the distance.
7. **Performance:** effects heavy on per-fragment hash/trig/`pow` calls should be minimal. Add detail gradually and compare FPS.

### Known constraints as premises

- Shader packs are limited to terrain / liquid hooks — no same-code handling of sky, entities, or UI.
- No inputs exist for adding shadow maps, screen-space reflections, refraction, bloom, etc. (scene depth is unlocked liquid-only as `bloxdOpaqueBehind()`. See [Part VIII](08-apiv2.md)).
- `bloxdTime()` is animation time with no guaranteed link to in-game day/night.
- Zero `bloxdSunDirection()` means true moon direction is unknown, not "moonlight physics" but a mood approximation. Directional moonlight can be built from `-bloxdSunDirection()` (day/night-cycle worlds only. [Part VII](07-internals.md) R-A).
- `s.position` / `l.position` are local coordinates, so add `bloxdOriginOffset()` for world-dependent effects. For in-block-local patterns, local coordinates are intentionally the tool.

## 22. Combining with other packs when shaders alone hit limits

Since shader packs cannot add or sample textures, don't try to solve fine material bumpiness or sky image changes with shaders alone. The public texture-pack repository for Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) handles textures, skybox, models, etc. through a different system.

For reference, community "cinematic shader" distributions analyzed in one case turned out to be texture packs (128x128 textures with no `pack.json` / `.wgsl`).

In practice, **tune light and color with shaders, and cover materials and sky with a matching resource pack**. But verify co-use and load order against the game's implementation and settings.

Texture packs have their own spec (for reference): the size limit is 25MB measured as the base64-encoded JSON string length; base64-encoding a PNG inflates it by +33%, so the practical ceiling for raw images is ~18–19MB. CSS is processed by a simple regex-based parser — avoid nesting and comments.

## 23. Underwater reality with shader packs

Underwater looks consist of 3 layers:

| Layer | Content | Operable from packs? |
|---|---|---|
| ① Terrain/liquid rendering | Hook-processable. Light hooks are called normally underwater | Yes (works "under the veil") |
| ② Liquid-definition veil | Emissive fullscreen quad from the liquid block definition color/alpha at the camera position, drawn frontmost. The game setting `cameraTint` wins if set | No (neither color nor density changeable) |
| ③ cameraTint | Game setting | No |

Practical points: packs keep working underwater / the veil cannot be removed / underwater cannot be branched on (fogStart / fogEnd / fogColour don't change underwater, so fogVisibility can't detect it either).

[← Previous part](05-troubleshooting.md)·[Back to the manual](README.md)·[Next part →](07-internals.md)

[← Previous part](06-implementation.md)·[Back to the manual](README.md)·[Next part →](08-apiv2.md)

# Part VII: Internals supplement

> The live game has required `apiVersion: 4` since 2026-10-26 and rejects v1/v2/v3 packs at load — the content below is written against the v2 specification; see [Part IX](09-apiv3.md) and [Part X](10-apiv4.md) for migration before you distribute anything.

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

Fog computation is always LINEAR mode (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), with `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = fog distance setting; only D = 0 is special with fogEnd = 5). **The fog gradient band is only 32 blocks wide**, and `l.fogVisibility` is less "distance haze" than a **normalized distance to the edge of the loaded world**. It varies per player with load distance, so distance-based effects should compute `distance(l.position, bloxdEyePosition())` themselves (recipe R-B). (v3 note: the renderer's fog function actually implements **four** modes — off / exponential / exponential-squared / linear — with shipped titles driving the linear one; the restored source and the robustness argument are in [Part IX](09-apiv3.md) §50.)

Default fog color is `rgb(183, 191, 195)` (pale blue-gray). World creators can change it via `fogColourOverride` (hex). With fog mode 0 (NONE), **fogColour arrives black**. The standard `mix(l.fogColour, col, l.fogVisibility)` form is safe since fog color is unused at fogVisibility 1. The script API has two more options, `fogChunkDistanceOverride` and `fogOnSkybox`: custom games can set the fog distance (the D value) and fog application to the skybox independently. By default the skybox is not affected by fog (only in games enabling `fogOnSkybox` does the skybox get tinted by the fog color as well).

Setting player-side `showFog` to false pushes fog to 3200–3232 blocks, effectively disabling it (`fogVisibility ≈ 1` keeps coming back).

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

`blockLight` is **colored light** with three RGB channels. Each light-emitting block defines an emission color `[R, G, B]` (0–15 each) that becomes the light color as-is (regular torch = warm white (14,14,12) / lava = orange (14,8,2) / beacon = cyan (5,14,14) / white torch = (15,15,15), etc.). At the vertex stage it arrives packed as 4 nibbles — r / g / b / sky — in one float attribute. Handling the three channels separately inside the light hook enables colored local lighting — the warm-torch recipe (R9.1) is calibrated against this behavior.

When decoding `aPackedLightLevels`, the engine floors each channel at **35% of the brightest RGB channel**. E.g. a "pure red light" is lifted to (1.00, 0.35, 0) at vertices before interpolation and lift. Torch orange looking "whitish-pink rather than red" in game comes from this — tune warm-torch recipe (R9.1) saturation against this default.

Light composition is not additive. Internally the engine takes the **max** of block light (after the 35% floor) and sky light built as `mix(ambient colour, sky colour, skyLight)`, then takes max again with held light (after ambient boost). The channel values in this composition are the **post-lift** values — the engine composes from the same lifted light levels that reach hook inputs (`terrainLightLevels` after the lift curve), in both v2 and v3. Therefore `blockLight` and `skyLight` never cancel each other out — the darker side's contribution is simply discarded — so weakening sky light barely darkens spots dominated by block light. Design exposure/decay recipes around this structure (the local-light protection in [Part VI](06-implementation.md) §19 exists to compensate for it).

Handheld light (`heldLight`) range follows the brightest light-color channel (max 15 blocks) with `dist^0.75` preprocessing, the same 35% channel floor, and `l.heldLight` is the pre-ambient-boost value. The cone falloff, restored from the engine's light module: the beam's angular attenuation is `1 − 0.5 × (smoothstep(0.12, 0.65, t) + smoothstep(0.62, 0.95, t))` where `t` is the normalized angle from the cone axis (0 = center, 1 = edge); the reach is `(rangeOverride > 0 ? rangeOverride : brightest channel) × cone falloff` with `rangeOverride` read from the held-light colour's alpha; inside the reach, an override attenuates by `(range − dist) / range` while the default subtracts the (preprocessed) distance channel-wise; then comes the 35% floor, division by 15, the lift curve, and finally the ambient boost. Custom items can set `spotlightRange` and cone angle — a "beam while held" mode whose cone position follows the camera. Packs cannot know beam direction.

Custom blocks may carry `skyLightEmission` (0–15), which **injects into the skyLight channel itself, separately from blockLight BFS**. R9.12-style packs judging sun/shadow by skyLight threshold can misjudge in worlds where artificial lights lift skyLight. Distribution packs should judge combined with blockLight to stay robust.

## 27. Pipeline details

- **Surface hooks run "before" alphaTest**: `out.alpha` feeds the discard test directly. Cutout materials (grass, leaves) allow dissolve-style dither effects (recipe R-C). For liquids (blended) `out.alpha` is the real transparency (recipe R-D). No effect on normal opaque terrain — don't misunderstand
- **`l.ambient` content** is `material.ambient × sceneAmbient`, differing per material. The scene side ties to the graphics setting "Ambient Lighting Intensity" (default 0.5) — never hardcode defaults
- **The scene's directional lights are a 2-light setup**: the Lambert sum of the main light (direction from the sky setting's sun position, intensity 1.0) and the fill light (direction `[-0.5, -1, -1]`, intensity 0.35) reaches `l.directional`. The fill light points downward, so it contributes nothing to top faces and picks up downward-facing surfaces (cave ceilings etc.). Terrain considers only lights added in `_initScene`; lights added to the scene after startup are ignored by terrain and block models (an official warning message says so)
- **`bloxdTime()` is really `performance.now()`**: the browser's uptime wrapped at 1 hour. Unrelated to in-game day/night and world elapsed time. To animate synced to a game clock, estimate time from the `bloxdSunDirection()` azimuth in day/night-cycle worlds
- **Header functions read one uniform**: the engine places a 64-byte uniform at `@group(3) @binding(0)` (4 slots — time / originOffset / sunDirection / eyePosition, little-endian), and `bloxdTime()` / `bloxdOriginOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` correspond to reading those slots. `originOffset` is always `[0, 0, 0]` in the current build (a reserved slot for floating-point world coordinates). Packs cannot write this uniform, and since pack and engine WGSL merge into a single module, declaring the same group/binding yourself is also impossible. (v3 renames the two slots — `seconds` / `renderOffset`, exposed as `bloxdSeconds()` / `bloxdRenderOffset()` — and adds the scene-depth texture at `@group(3) @binding(1)`; see [Part IX](09-apiv3.md) §41 and §51)
- **Vertex data is built by the mesher (Web Worker)**: block terrain is interleaved at 28 bytes per vertex (32 bytes when the atlas is on) — position = float32×3 / normal = 8-bit signed integer×4 / colour = 8-bit normalized integer×4 (the substance of `s.colour` — tint × AO is baked into 8-bit at the mesher stage, so separating or restoring it pack-side is impossible in principle) / UV = float32×2 / atlasIndex = float32. Only the light levels travel in a separate 4-byte vertex buffer ([Part VII](07-internals.md) §26, [Part II](02-api.md) §11). Vertices are drawn with per-chunk instancing
- Fine checker patterns at chunk borders during loading are the engine's screen-space Bayer 4×4 dither chunk fade, not pack bugs (disable via the graphics setting `chunkFadeIn`)
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

1. **Normal world** (default skybox, no overrides) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, default colors
2. **Space-skybox world** — bloxdSunDirection() = 0. The `sunPresent` branch look
3. **Custom world with `visionMinLightColour` / `skyLightColourOverride`** — lifted darks and colors

Main variance sources: `lightingOverride` (forced lighting) / `skyLightColourOverride`, `ambientLightColourOverride` (hex swaps) / `visionMinLightColour` ("darkest visible color". Implemented as a per-component max against both `uSkyLightColour` and `uAmbientLightColour`; Night Vision uses it — "pitch-dark cave" packs won't get as dark as intended, and the sky color itself is lifted) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (bloxdSunDirection() presence). `uSkyLightColour` default = (1,1,1) white, `uAmbientLightColour` default = (0.25,0.25,0.30). `l.ambient` scene component = graphics setting "Ambient Lighting Intensity" (default 0.5). `l.fogVisibility` follows player fog/chunk distance settings. Also `cameraTint` (RGBA tint over the whole screen) and `proximityFadeDistance` / `proximityFadeMinOpacity` (camera proximity fade for entities) are world-setting variance factors — `cameraTint` in particular is a final pass composited **over** pack output. Many of these can also be set via the script API (`serverOption`) and updated while the game runs.

## 29. Debug means

- URL parameter `?renderer=lite` — force the Lite (WebGPU) renderer (`webgl2` / `babylon` also work; `babylon` is the old name for webgl2). Priority: URL parameter > localStorage `bloxdRenderer` > settings screen > default (webgl2). Invalid values are ignored with a warning. Overrides left in the URL or localStorage can break scenes that need WebGPU (lite) with "needs the new WebGPU renderer, so remove the renderer override..." ([Part V](05-troubleshooting.md) §17)
- URL parameter `?vconsole` — on-screen console (VConsole). Handy for mobile device verification
- URL parameter `?drawcalls=1` — adds a draw-statistics debug panel. Pick game objects from the debug console, or use `drawCalls()` / `why()` / `configureDrawCallWatching()`, to inspect overdrawing by large mechanisms (pack and otherwise) and approaches to the ~65,000-vertex limit per draw call — useful for isolating performance bottlenecks
- Console shows `noa-engine v0.33.0` and `Renderer: lite from <source>` — check these first to avoid render-path misdiagnosis
- The WebGPU renderer locks "forced ON" while a pack applies. The "Disable Block Texture Atlas" setting also locks (atlas stays ON), and packs can't apply at all on WebGPU-less devices. The basis for writing "needs a WebGPU browser" on distribution pages
- Block textures are a 2D array texture (`texture_2d_array`), and the terrain sampler is nearest + repeat. The mesher also merges faces with matching material / AO / light into one rectangle (**greedy meshing**), so a merged face's UV can exceed one tile width (edges inset by 0.0015). Hardware repeat addressing handles the tiling, so merged faces look seamless. Note that procedural detail keyed to `vUV` can break at merged-face boundaries — key it to world position (`s.position` + `bloxdOriginOffset()`) instead
- Per-game-join runtime re-validation (`checkCompilation`) compiles real terrain materials in browser WebGPU (stricter than settings-screen static validation). Packs failing here are excluded from that game

## 30. Per-game apply modes (`shaderPackPolicy`)

This section pins down what `allow / strict` means at the title level (cf. §7). Only titles whose game definition explicitly carries `shaderPackPolicy: "allow"` run in full mode (vertex hooks, `discard`, terrain `alpha`); titles with no setting (or any non-allow value) are strict — `BLOXD_STRICT` is defined and guarded code is disabled automatically. The pack side cannot choose this, so knowing which titles run what is a prerequisite for distribution.

- Reference build: `szby6g.main.94a7596c.js` (production deploy as of 2026-10-17). Statically enumerating all 111 game definitions gives **26 allow entries (12 titles) / 85 strict entries**. The same 12 allow literals across the same 12 titles were re-confirmed unchanged on the v3 production bundle (`3ymzdd`, 2026-10-20) — the list below carries over verbatim to v3.
- Above `shaderPackPolicy` there is a delivery-channel gate (roughly `canUseShaderPacks`): through external portals (e.g. Coolmath Games builds) the shader pack system itself can be disabled before `shaderPackPolicy` is ever consulted. The allow/strict analysis below is based on the bloxd.io main web build.
- allow is declared in 12 places: 8 direct literals in game definitions and 4 base variables (`tb` / `kz` / `cb` / `Fb`); variants inherit it via spread (`{...tb,...}`). There are currently no per-variant overrides (no parent-allow / child-strict pattern either).

The 12 allow titles (26 entries in total):

- **Test Gym** — base + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (11 entries)
- **Doodle Cube** — base + Solos / Duos (3)
- **Rocket Obby** — base + Sheep / January (3)
- **9 single titles**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

The most misleading strict-side cases:

- **Superflat Creative (classic_creativeFlat) is strict.** The name contains "Creative", but within the classic family only regular Creative (`classic_creative`) is allow. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns etc. are all strict
- **Custom Games (customGames) is strict.** Vertex-hook effects do not fire in user-created custom games. Test Gym is the safe choice for verification work
- Major PvP / server titles such as bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) are all strict

Note that in strict titles the pack itself is still loaded and compiled, and fragment-side recipes such as surface / light run as usual. What is constrained: the vertex hooks (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard`, and terrain `alpha` (liquids always have it).

This list reflects the static analysis of the build above; engine updates can change the allow/strict split. Re-check when a new version ships.

[← Previous part](06-implementation.md)·[Back to the manual](README.md)·[Next part →](08-apiv2.md)

[← Previous part](07-internals.md)·[Back to the manual](README.md)

# Part VIII: API Version 2 migration guide

> The live game has required `apiVersion: 4` since 2026-10-26 and rejects v1/v2/v3 packs at load — the content below is written against the v2 specification; see [Part IX](09-apiv3.md) and [Part X](10-apiv4.md) for migration before you distribute anything.

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

All three structs `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` gained `blockId: u32`. It is the **owning block's ID** (0–65535), uniform across the face (passed with `@interpolate(flat)`). Use it for block-type identification independent of texture color. But the ID-to-block-type table lives inside the engine and is invisible from packs, so **which ID is which block can be measured in-world, or looked up in the reference below**. Internally this ID is carried baked into the vertex color's alpha (lower 8 bits) and the normal's w (upper 8 bits) — 16 bits total, which is where the 65535 cap comes from. The blockId system itself activates only while an active shader pack exists (without a pack the wires keep their padding targets, but within the Part II struct definitions this difference is unobservable).

**Reference**: the author publishes a game-entry listing at [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (`entries.json`: an id ↔ block-name table; rotation/meta variants such as `Furnace|meta|rot2` are listed as separate IDs). Mappings can change with game updates — for anything final, confirm in a live game.

Common-block examples (from entries.json as of 2026-10-18; only the low-id terrain families shown):

| ID | Block name | ID | Block name |
|---|---|---|---|
| 0 | Air | 15 | Maple Wood Planks |
| 1 | Unloaded | 28 | Stone |
| 2 | Dirt | 29 | Messy Stone |
| 3 | Messy Dirt | 31 | Smooth Stone |
| 4 | Grass Block | 126 | Water |
| 5 | Sand | 128 | Bricks |
| 6 | Clay | 139 | Ice |
| 7 | Gravel | 147 | Bedrock |
| 8 | Snow | 149 | Cactus |
| 9 | Maple Log | 1491 | Lava |

entries.json also lists non-block items (tools etc.), but only block-family ids reach the terrain / liquid hooks.

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

### R-G. Measuring blockId in-world — the bit-plane display pack

A debug recipe for looking up ids of blocks missing from the correspondence table in-world. Change the leading `plane` constant through `0, 1, 2, …` while reading the color of the face of the block you want to identify.

```wgsl
const plane: u32 = 0u;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let d = (s.blockId >> (plane * 3u)) & 7u;
    var palette = array<vec3f, 8>(
        vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 1.0, 0.0),
        vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 1.0));
    out.colour = palette[d];
    return out;
}
```

The face color encodes 3 bits of blockId directly as RGB (black = 0 / red = 1 / green = 2 / yellow = 3 / blue = 4 / magenta = 5 / cyan = 6 / white = 7). One observation reads one octal digit. If p0 → p3 read 3, 2, 7, 2, then octal 2723 = 1491 read from the top digit is the id (Lava). Low-id terrain families finish with two observations (p0, p1). Uses only the surface hook, so it also runs in strict titles.

### R-H. Making only leaves sway — narrowing the vertex hook by blockId

The R7 wind recipe ([Part III](03-recipes.md)) ripples the whole terrain, but the vertex hook can read `blockId` too, so targets can be limited to leaf blocks. The id list and the WGSL array (measured as of 2026-10-18; 22 kinds — Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / fruit variants / Autumn Aspen):

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// vertex hooks are auto-disabled in strict titles (see §36)
#ifndef BLOXD_STRICT

fn sp_isLeaf(id: u32) -> bool {
    for (var i = 0u; i < 22u; i++) {
        if (LEAF_IDS[i] == id) { return true; }
    }
    return false;
}

fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    if (sp_isLeaf(v.blockId)) {
        let wp   = bloxdWorldPosition(v.position);
        let t    = bloxdTime();
        // displacement is a smooth function of world position. Shared vertices pointing
        // at the same world point move identically, so faces never tear ([Part III](03-recipes.md) R7 - same principle)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- The id list grows with engine updates (during measurement alone, 50 block kinds were added in a new build). To keep using it, look up additions via [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) or by measuring with R-G's bit-plane display, and extend the array
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) are non-solid ground leaf mats. Swaying makes them look like they lift off the ground, so excluding them from the array is one option
- In strict titles the vertex hook is disabled wholesale, but with the guard above the pack just "stops swaying" — fragment-side effects keep working

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

Applications: thickness-based absorption/scattering, caustics-style ripple projection from bottom world coordinates via `behind.position`, sky-vs-occlusion distinction with `found=false` for sky reflection on water, staged murk by depth. If the depth-copy pipeline fails to build, it safely degrades to "nothing behind". The depth texture's readyness is decided once, when the page's renderer is created, by "does the active pack read depth" — so **always reload the page when using a depth-reading pack**. If depth is requested while a pack is active but the page wasn't reloaded, the console shows a one-time `…reads scene depth on a page that didn't turn it on` warning and the depth texture is replaced with a 1×1 fallback, making `bloxdOpaqueBehind()` always return `found = false`.

## 36. Other v2 changes

- **Hook fallback**: liquid programs fall back to terrain hooks when `bloxdLiquidXxx` is undefined. **Terrain-hook-only packs affect water as-is**. Define liquid-side hooks explicitly when unintended.
- **No more `BLOXD_LIGHTING` field guards**: `blockLight` etc. exist in all variants, holding defaults when unlit (0 / 1 / white / 0). Use `#ifdef BLOXD_LIGHTING` only to test for lighting. Keeping existing guards changes nothing.
- **`BLOXD_ALPHA` defined-condition change**: defined in non-strict terrain variants and all liquid variants, undefined in strict × terrain. Keep the guard when writing alpha in terrain hooks.
- **Direct struct construction prohibited**: constructor calls like `BloxdLight(...)` are rejected by static validation. Always modify from `bloxdDefault*`, or use a copy of the input.
- **`let _ =` becomes `_ =`**: WGSL discard assignment `_ = f();` is valid, but `let _ = f();` is rejected.
- **offInStrict**: defining a vertex hook, or a `discard` reachable from surface / light hooks, auto-disables the whole pack in strict games instead of erroring (settings UI shows `shaderPack:offInStrict`; still runs in allow games). Wrap vertex hooks and `discard` with `#ifndef BLOXD_STRICT`. Note the official settings UI message itself instructs "wrap what remains with `#ifndef BLOXD_STRICT`" — this practice is official recommendation, not convention.
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

[← Previous part](07-internals.md)·[Back to the manual](README.md)

[← Previous part](08-apiv2.md)·[Back to the manual](README.md)

# Part IX: API version 3 migration guide

> **Superseded 2026-10-26: the live API is now version 4** — v3 packs are rejected at load exactly as described here for v2. Apply this part *and then* [Part X](10-apiv4.md) (v3 → v4: the texture API, the `fogAlpha` rename, `bloxdFragmentBlockPosition`, `hit`). This part's internals (§49–§54) remain accurate for the v3 build they were measured on.

Target build: `3ymzdd.main.fae4743f.js` — **the live production build since 2026-10-19**. The bundle bloxd.io serves in production is byte-identical (md5-checked, main bundle and shader-pack chunks alike) to the preprod deploy this part was originally researched against, so everything here applies to production as-is. The pack model keeps its v2 shape (same `pack.json` fields, same loader limits, same uniform layout).

Parts I–VII of this guide are still written on the v2 baseline. This part collects, in the same order as [Part VIII](08-apiv2.md), the v2 → v3 migration points and the new v3 features. Conversion is mostly mechanical (§47), but only one change actually alters behavior — the default light now attenuates emission with fog (§43) — and `blockId` is replaced wholesale by `blockFlags` (§42), so always verify with an in-game compile before distribution.

New in this revision: sections **§49–§54** go past the migration itself into engine internals restored from the production build — how the Lite renderer actually invokes your hooks, the real four-mode fog function, the exact `bloxdOpaqueBehind()` implementation, the complete blockFlags delivery path from block registration to your hook, and the validation pipeline with its measured header hash. These are the deepest publicly documented facts about the pack system to date, and they settle several questions other guides still list as open.

## 40. Fate of v2 packs (conclusion first)

**Update 2026-10-19: v3 left preprod and is now what the live site serves.** Every v2 pack saved before the rollout — including every pack distributed as v2 — now fails on production exactly as described below, so the §47 migration is no longer optional for anyone distributing packs today.

The build requires the manifest `apiVersion` to **match 3 exactly**, and there is **no parallel v2/v3 support**. A v2 pack is rejected at load with the "wrong API version" messages (i18n keys, placeholder text):

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>
> `loadNoApiVersion`: "pack.json needs \"apiVersion\": {{version}}."

Saved packs keep the v2 lifecycle ([Part VIII](08-apiv2.md) §31): every build hashes its engine header, engine updates auto-mark saved packs "needs re-check", and a saved pack whose `apiVersion` is any version other than the current one is flagged won't-run (with the status message above pointing at the replacement) instead of erroring.

## 41. pack.json and the uniform buffer (what stays unchanged)

- Required manifest fields are unchanged: `{ apiVersion, name, author }`.
- Loader limits are unchanged: 32MB zip / 1024 entries / 256 `.wgsl` files / 256KB total code / 64KB manifest.
- The engine uniform block is unchanged in shape: `@group(3) @binding(0)`, 64 B, holding — in declaration order — the time, the render offset, the sun direction, and the eye position. The layout is registered with `minBindingSize: 64`, and the exact field layout is `seconds: f32` @ byte 0, `renderOffset: vec3i` @ 16, `sunDirection: vec3f` @ 32, `eyePosition: vec3f` @ 48. Two internal field names changed: `time` → `seconds`, `originOffset` → `renderOffset`. The **byte layout is identical to v2**, and nothing changes for pack code anyway, because packs are not allowed to name the uniform directly (the engine header marks it engine-provided and read-only, "which packs can't name"); keep going through the header functions `bloxdSeconds()` / `bloxdRenderOffset()`.
- The pack's group 3 gained a documented second occupant: `@group(3) @binding(1)` is the scene-depth texture that `bloxdOpaqueBehind()` reads (full implementation in §51). The 64 B uniform stays at binding 0; packs still cannot name either binding.

## 42. blockId becomes blockFlags: per-block materials as bit flags (the headline)

In all three hook input structs (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`), the v2 field `blockId: u32` is **replaced** by `blockFlags: u32`. Engine text on the field: *"What kind of block this face is: `bloxdBlockFlag*` bits, the same across the face."* The engine now ships the material data itself, so the v2 way of guessing materials from numeric-id ranges or maintaining in-world id tables ([Part VIII](08-apiv2.md) §34) is no longer needed.

The bits are exposed as named constants:

```wgsl
// Test one with (blockFlags & bloxdBlockFlagRock) != 0.
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| Value | Constant | Meaning (engine notes, condensed) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | Fully opaque — leaves and ice included. Not glass, water, lava, spawners, or ghost and invisible blocks. |
| 2 | `bloxdBlockFlagEmissive` | Gives off block light, as neon, portals, lamps, Lava and Beacon do. Glowing ores count, however faint. |
| 4 | `bloxdBlockFlagVegetation` | Leaves, and the grass on grass blocks — which are dirt too. Not cacti, mushroom blocks or hay. |
| 8 | `bloxdBlockFlagDirt` | Dirt and soil, grass blocks included. Rocky Dirt is rock too. |
| 16 | `bloxdBlockFlagSand` | Sand, Red Sand, and every sandstone — which is rock too. |
| 32 | `bloxdBlockFlagRock` | Stone and its kinds, andesite, diorite, granite, gravel, ores, sandstone, Rocky Dirt, bedrock, obsidian and magma. |

A block made of several materials carries **each** matching flag (the engine's own example: sandstone is sand and rock, so it gets both). Leaves are vegetation but not dirt; grass blocks are vegetation and dirt at once.

The vegetation / dirt / sand / rock flags are assigned from the block's registered **display name** (opaque / emissive come from the engine's own opacity and emission data instead): names ending in `Leaves`, or `Grass Block`, are vegetation; `Dirt` / `Soil` names (and every `Grass Block`) are dirt; exactly `Sand` and `Red Sand`, plus any name containing `Sandstone`, are sand; names containing `Stone` / `Andesite` / `Diorite` / `Granite`, any `Ore`, plus Yellowstone, Gravel, Bedrock, Obsidian, Magma, Rocky Dirt (and sandstone) are rock.


### The exact name rules (derive any block's flags yourself)

The four material bits come from a fixed classifier over the block's registered display name. Variant names (anything after `|`) are stripped first, so variants inherit the base block's flags. Then:

| Bit | Rule (evaluated on the stripped name) |
|---|---|
| vegetation | the name **ends with** ` Leaves`, or **ends with** ` Grass Block` |
| dirt | the name **is exactly** `Dirt`, **ends with** ` Dirt` or ` Soil`, or **ends with** ` Grass Block` |
| sand | the name **is exactly** `Sand` or `Red Sand`, or **contains** `Sandstone` |
| rock | the name **is exactly** one of `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt`, **contains** `Sandstone`, **ends with** ` Ore`, or contains `Stone` / `Andesite` / `Diorite` / `Granite` as a standalone word |

Yellowstone is listed explicitly because `Stone` is not a standalone word inside `Yellowstone`. Opaque and emissive do **not** come from the name — they come from the engine's own opacity and block-light-emission data, so they cannot be derived with these rules.

Source: the engine's name classifier (module 28537, bundle `3ymzdd`); verified against all 7,861 named blocks, 2026-10-20.

Example — per-block tint by material:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

Effect on v2 recipes: R-H's 22-entry leaf-id array ([Part VIII](08-apiv2.md) §34) collapses to `(blockFlags & bloxdBlockFlagVegetation) != 0`. The id ↔ block-name reference at [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) stays useful for non-shader purposes, but no longer needs in-world looking-up for material styling.

### Leaves without the grass (the question everyone asks)

`vegetation` alone matches leaves **and** the grass on grass blocks, which also
carry `dirt`. Exclude dirt to sway only leaves — the discriminator the engine's
own field notes spell out:

```wgsl
// Leaves only: vegetation without dirt. Grass blocks are vegetation AND dirt.
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// Grass blocks only (the grassy faces of the terrain surface):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

Verified against the live registry (2026-10-20, bundle `3ymzdd`):
`vegetation && !dirt` matches exactly the 45 leaf registrations (22 base types —
the same 22 the v2 R-H id array measured); `vegetation && dirt` matches exactly
the 8 grass blocks. No exceptions in either direction — registry counts as of that build; new blocks grow the numbers without changing the rule. Pair with `vertex.normal`
(up/down) to pick faces, e.g. grass-block tops only.

## 43. Function renames and semantic changes

| v2 | v3 | Notes |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | Seconds since the page loaded (f32 precision note below) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | Same quantity: render position + this = world position |
| `const bloxdTimeWrap: f32 = 3600` | **removed** | Define periods yourself on the pack side |
| `engineColour` (in `BloxdLightIn`) | **removed** (14 → 13 fields) | Rebuild from `litColour` + fog |
| hook params `v` / `s` / `l` | `vertex` / `surface` / `light` | Template spelling; signatures unchanged |

- **`bloxdSeconds()`** — seconds since the page loaded. In f32 it counts in steps of under 1 ms for the first 4.5 hours, and of about 4 ms from 9 to 18 hours. The header recommends the idiom `bloxdSeconds() % period`, which counts from 0 up to `period`, then starts again — a clean replacement for the removed wrap constant.
- **`bloxdRenderOffset()`** — whole blocks: "a render position plus this is a world position." It changes as the player travels, so render positions stay close to the player — and so precise. Guide-wide, what v2 text called the noa-local offset is now consistently called the **render position** / render offset; it is the same quantity `bloxdOriginOffset()` returned.
- **`bloxdTimeWrap` removed** — a pack that wrapped time at 3600 s declares its own constant now, e.g. `const timeWrap: f32 = 3600.0;` and `% timeWrap`.
- **Default light semantics** — v2's default was `engineColour + emission × fogVisibility`; the v3 default composes it as `bloxdApplyFog(litColour + emission, light)` — **emission is attenuated by fog inside the default** now, so the combined output passes through the fog blend together. Port table:

  | v2 expression | v3 port |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // v3 port of the v2 read `l.engineColour + s.emission * l.fogVisibility`:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **Unchanged in name and meaning**: `bloxdEyePosition()`, `bloxdSunDirection()`, `bloxdFaceBlock()`, `bloxdApplyFog()`, `bloxdWorldPosition()`.

## 44. New header constants: `bloxdPi` and `bloxdTau`

```wgsl
// Half a turn and a full turn, in radians.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

Useful both for trig magic and because packs no longer need to hardcode π. Watch name reuse: a pack-local constant of the same name now collides with the header duplicate-identifier check — drop or rename any `bloxdPi` / `bloxdTau` re-declaration in your code.

## 45. The six-hook template (liquid hooks officially shown)

The default pack text published with the build now ships **all six hooks** — terrain / liquid × vertex / surface / light — each returning its engine default. The engine comments introduce it: *"Every hook returns its engine default. Copy a hook and change its output to start a shader pack."*

```wgsl
// Every hook returns its engine default. Copy a hook and change its
// output to start a shader pack.

// Strict games keep terrain where it is: unguarded, this hook would turn
// the whole shader pack off there.
#ifndef BLOXD_STRICT
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

// Water uses these. If deleted, water uses your terrain hooks instead.
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
```

- The hooks' comments state the liquid rules directly: **water needs the trio; delete it and water reuses your terrain hooks** (the fallback behavior known from v2, [Part VIII](08-apiv2.md) §36, now written into the template itself).
- `bloxdLiquidVertex` sits inside the same `#ifndef BLOXD_STRICT` guard as `bloxdTerrainVertex` — unguarded, it would switch the whole pack off in strict games just like terrain-side vertex effects do.
- Template spellings are now the full parameter names `vertex` / `surface` / `light` (v2's template used the short `v` / `s` / `l`). Your own code's parameter names are free — only signatures matter.

## 46. Variant matrix: the program axis and macro changes

Variants are generated over a matrix of **strict × lighting × program** — the same 8 combinations as v2, but with terrain / liquid now an explicit axis of the matrix. Variant names spell it out as `allow|strict · unlit|lit · terrain|liquid`, surfaced in the UI as ``terrain`` / `liquid`, `strict` / `non-strict`, `lighting on` / `lighting off` (and error displays may append "(only in {{variants}})").

| Macro | Defined in |
|---|---|
| `BLOXD_STRICT` | strict variants (both programs) |
| `BLOXD_LIGHTING` | lighting-on variants (both programs) |
| `BLOXD_ALPHA` | **all liquid variants** plus non-strict **terrain** variants |
| `BLOXD_SCENE_DEPTH` | **all liquid variants** |

Two things change for authors versus the v2 rules ([Part VIII](08-apiv2.md) §36):

- **`BLOXD_ALPHA` is unchanged from v2.** The variant generator carries the literal line `"liquid"!==program&&strict||push("BLOXD_ALPHA")` — JS operator precedence makes *(terrain **and** strict)* the only case that skips the push, so the macro is defined in **every liquid variant (strict or non-strict) and in non-strict terrain**; only strict terrain omits it. Liquid-side `#ifdef BLOXD_ALPHA` code compiles in exactly as it always did, and §49's alpha write-back (spliced for liquid programs or non-strict variants) matches this set precisely.
- **`BLOXD_SCENE_DEPTH` is always defined in liquid variants**, so depth use stays unguarded-OK there, exactly as in v2 (§35); in terrain hooks it keeps needing the `#ifdef BLOXD_SCENE_DEPTH` wrap.

## 47. v2 to v3 migration checklist

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** in all three input structs; express material styling as bit tests against `bloxdBlockFlag*` constants (§42); drop id-range heuristics from v2
3. **`bloxdTime()` → `bloxdSeconds()`**; declare your own period instead of the removed `bloxdTimeWrap` (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **Rebuild light math from `engineColour` onto `litColour` + fog** per the §43 table; note the default now attenuates emission with fog
6. **Liquid hooks**: define `bloxdLiquid*` explicitly when you want water handled differently; omit them to fall back to your terrain hooks
7. **No `BLOXD_ALPHA` audit needed** — its variant set is unchanged from v2: all liquid variants plus non-strict terrain define it, only strict terrain omits it (§46)
8. **Use `bloxdPi` / `bloxdTau`** where trig-related constants were hardcoded; remove pack-local re-declarations that now duplicate the header
9. **Keep strict guards**: vertex hooks and `discard` stay wrapped in `#ifndef BLOXD_STRICT`; the template guards `bloxdLiquidVertex` the same way as terrain
10. **Validate in-game** — compile and test the pack in a game that supports shader packs

## 48. Other v3 changes and notes

- **Validation stays two-stage** ([Part VIII](08-apiv2.md) §38): static validation first, then the browser's real WebGPU compilation through generated stub snippets that call your hooks, with errors mapped back to source files / lines, and diagnostics restore the original names of engine-side identifiers through a mapping.
- **Strict diagnostics name the reason**: a vertex hook moving terrain reports "… moves terrain, which strict games prevent." and `discard` in surface / light hooks reports "discard makes terrain see-through, which strict games prevent."; the settings UI keeps the "wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`." guidance (`offInStrict`).
- **Loader messages**: error kinds and limits are unchanged; "Zip64 archives aren't supported." is surfaced as a UI message (`loadZip64`). The pack-UI string inventory totals 57 `shaderPack:*` keys; among load-stage errors, `loadNoWgsl` (a zip containing zero `.wgsl` files) and `loadNotZip` (a file without a zip end-of-archive signature) round out the set.
- **No in-game WGSL editor ships with the pack UI.** The settings screen offers no shader code editor — packs are authored as zip files outside the game. (A CodeMirror editor does exist in the bundle, but it is the JavaScript editor of the custom-game scripting UI; it has no WGSL support and no connection to the pack system.)
- **Hardware gate**: Lite requires a driver supporting the `shader-f16` WebGPU feature; too-old drivers are rejected with a message like "Intel driver too old for Lite (no shader-f16)".
- **Lighting changes re-validate saved packs**: when the lighting setting changes at run time, the engine re-runs the pack check (`changed → recheck`); replay viewing calls the same hook with `changed: false` and skips the re-check.
- **Wording**: text about games that accept shader packs now reads "in games that **support** them".
- **Scope of titles**: the set of games where packs run is unchanged from the previous build.

## 49. Engine internals: how the Lite renderer invokes your hooks

Everything in §40–§48 is what the loader and the header tell you. This section and the four after it document what the engine actually does at run time, restored from the production bundle (the Lite renderer — a 175 KB chunk; the integration source file's real name `lite/terrainShaderPack.ts` survives inside its error strings). None of it changes what you write, but it removes the guesswork about what your hooks receive — and it settles several questions other community guides still list as open.

The renderer does not "call" your hooks from JavaScript. When a pack passes validation, the engine **splices your hook calls into its own terrain WGSL** by replacing fixed anchor lines in its shader text. An anchor must match exactly once — zero or multiple matches abort with `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Stage | Anchor line in the engine shader | What gets spliced in |
|---|---|---|
| vertex | a four-line block from `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` through `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);` | build `BloxdVertexIn`, call your vertex hook, write `worldPos` back — the splice also rewrites `let worldPos` to `var worldPos` |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | build `BloxdSurfaceIn`, call your surface hook, write `baseColor` / `alpha` back |
| lit colour | just before `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` | `let bloxdSpLitColour = color.rgb;` — captures the pre-fog colour |
| light | the fragment shader's final `return color;` line | build `BloxdLightIn`, call your light hook, write `color` back — after the fog mix |

The spliced code, restored from the shipped bundle (light-level sample expressions abbreviated where the engine's own formatting runs long):

```wgsl
// vertex stage — non-strict variants carrying a vertex hook
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* your bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// fragment stage — surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* your surface hook */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // spliced only when the program is liquid or the variant is non-strict
```

```wgsl
// fragment stage — light
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // directional
        ambient,                                 // ambient
        /* light-level varying */.rgb,           // blockLight
        /* sky channel of the same varying */,   // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* held-light term (see below) */,       // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour — black only with no fog at all
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* your light hook */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

Four enforcement facts come straight out of this splicing:

- **Strict terrain ignores surface-hook alpha changes.** The `alpha = bloxdSpSurface.alpha` write-back is spliced only for liquid programs or non-strict variants — the implementation behind §46's macro table. (In strict terrain your `#ifdef BLOXD_ALPHA` code doesn't compile in anyway; now it is also confirmed that unguarded alpha writes are dropped there.)
- **A strict variant that still declares a vertex hook never runs it** — the engine reports it at build time: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. That is why the official template (§45) wraps `bloxdLiquidVertex` in the same `#ifndef BLOXD_STRICT` as its terrain twin.
- The `bloxdSp*` identifiers — **14 in total**: `bloxdSpVertexIn`, `bloxdSpVertex`, `bloxdSpSurfaceIn`, `bloxdSpSurface`, `bloxdSpLightIn`, `bloxdSpLight`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, `bloxdSpPositionW`, `bloxdSpZ`, `bloxdSpEye`, `bloxdSpScale`, `bloxdSpBehind` — are engine-side temporaries. Your code never sees them, but they surface in diagnostics and in anyone's reverse-engineering output, so they are worth recognizing on sight.
- **The default-surface shortcut.** When a variant's surface hook is literally `bloxdDefaultSurface`, the engine skips splicing the `baseColor` / `alpha` write-back lines entirely — the default already produces those values, so the assignment would be dead code. Unmodified hook chains cost nothing.

**What actually feeds `BloxdLightIn`** — field by field, from the spliced code:

| Field | Engine-side source |
|---|---|
| `litColour` | the fragment colour captured just before the fog mix (the `bloxdSpLitColour` anchor) — "before emission and fog", as the header puts it |
| `directional` | `vTerrainLambert` — a vertex-interpolated sum of `max(0, dot(normal, lightDirection)) × intensity` over the scene's directional lights (formula in §54); 0 when the scene has none |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — per material, per frame |
| `blockLight` | the `.rgb` of the decoded light-level varying (decode in §54) |
| `skyLight` | the sky channel of that same light-level varying — *"Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING"* (header text) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | the held-light term, built from the light-level varying's w channel together with the `uHeldLightPos` / `uHeldLightColour` frame uniforms ([Part VII](07-internals.md) §26 documents the falloff and channel-floor behavior) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **black only in a scene with no fog at all** (mode 0, §50) |
| `fogVisibility` | the clamped fog coefficient — the exact value §50's function returns |
| `position` / `normal` | the `vPositionW` / `vNormalW` varyings (normal re-normalized per fragment) |
| `blockFlags` | the `vBlockFlags` flat varying — §52's full delivery path |

For orientation when reading older material: the identical splicing architecture existed in the v2 renderer, and v3's only integration differences are `vBlockId` → `vBlockFlags` and the added liquid variants. The hook system is architecturally stable across the v2 → v3 break.

## 50. The fog function: four modes, one field

Restored verbatim from the production terrain shader:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // linear
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // exponential
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // exponential squared
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = fog off (coeff stays 1.0)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)` — one vec4 drives everything.
- **Four modes exist in the shader: 0 = off, 1 = exponential, 2 = exponential-squared, 3 = linear.** `fogVisibility` is the clamped coefficient whichever mode runs — there is exactly one field, and no mode flag is ever exposed to packs.
- Bloxd's own titles drive mode 3 (linear) with the 32-block band described in [Part VII](07-internals.md) §25 (`fogStart = 32 × D`, `fogEnd = 32 × (D + 1)`), so that part's "always linear" observation still describes shipped gameplay. The exponential modes are real, live engine code, though — a title can flip `vFogInfos.x` and change the ramp without any client update. Distance recipes that compute `distance(l.position, bloxdEyePosition())` themselves (recipe R-B) are the robust way to write distance-driven looks, since they cannot be moved by a mode switch.
- This settles the "which fog ramp does the engine actually use" question from source: all four are implemented; shipped titles use linear. (The same function also explains the header's fogColour comment — mode 0 is the only case where `fogColour` arrives black, and Bloxd's games never ship mode 0; they push fog far out instead, [Part VII](07-internals.md) §25.)

## 51. bloxdOpaqueBehind(): the exact implementation

The whole function, restored verbatim from the production build:

```wgsl
@group(3) @binding(1) var bloxdSpSceneDepth: texture_2d<f32>;
var<private> bloxdSpPixel: vec2i;
var<private> bloxdSpPositionW: vec3f;

fn bloxdOpaqueBehind() -> BloxdOpaqueBehind {
    let bloxdSpZ = textureLoad(bloxdSpSceneDepth, bloxdSpPixel, 0).r;
    if (bloxdSpZ <= 0.0) {
        return BloxdOpaqueBehind(false, vec3f(0.0), 0.0);
    }
    let bloxdSpEye = bloxdPackInputs.eyePosition;
    let bloxdSpScale = max(bloxdSpZ / (scene.view * vec4f(bloxdSpPositionW, 1.0)).z, 1.0);
    let bloxdSpBehind = bloxdSpEye + (bloxdSpPositionW - bloxdSpEye) * bloxdSpScale;
    return BloxdOpaqueBehind(true, bloxdSpBehind, distance(bloxdSpBehind, bloxdSpEye));
}
```

- **The depth texture lives at `@group(3) @binding(1)`** — group 3 is the pack's own group: binding 0 is the 64 B `bloxdPackInputs` uniform (§41), binding 1 is this depth texture. Both are engine-provided and unnamed from your side.
- **The depth texture is an unfilterable-float, fragment-only resource.** The bind-group layout registers it as `texture: { sampleType: "unfilterable-float" }` with `GPUShaderStage.FRAGMENT` visibility alone — which is exactly why `bloxdOpaqueBehind()` is built on `textureLoad` (explicit texel coordinates, mip level 0) instead of `textureSample`: hardware filtering is simply unavailable on this texture.
- `z ≤ 0` means the depth sample hit nothing (far plane / sky): `found = false`, and `position` / `distance` are meaningless — check `found` first, always.
- The returned position is a **ray-scale intersection**: the opaque surface is placed at `eye + (fragment − eye) × max(z / viewDepth, 1)`. `distance` is measured from the eye to that point — for water-surface packs this is effectively "how much water the ray crossed before hitting something solid", which is what makes depth-tinted water recipes work without a second depth buffer.

## 52. blockFlags end-to-end: from registration to your hook

§42 tells you what the bits mean. This section is the complete path a flag bit travels from block registration to your hook — every hop confirmed from the production source, which also proves the header's "the same across the face" down to the byte level.

**1. Registration (block-definition database).** Each block's flags are computed once, at registration:

```js
flags[id] = nameFlags                     // display-name rules (§42): vegetation / dirt / sand / rock
          | (definition.opaque === true ? 1 : 0)   // opaque bit — engine opacity data
          | (anyFaceEmission >= 1       ? 2 : 0);  // emissive bit — block-light emission data
```

The display-name rules cover only the four material bits; the two physics bits come from separate engine data — `opaque` straight from the block definition, `emissive` from the per-face block-light emission array. The header's "Glowing ores count, however faint" is literal: any face with emission ≥ 1 sets the bit.

**2. Per-block → per-material (mesher initialization).** Terrain is drawn per *material*, not per block id, so the flags are re-tabulated into a material table (a `Uint16Array` indexed by material id, each material taking the flags of its owning block's first face). The table ships to the meshing Web Worker — but **only in configurations where the pack pipeline is enabled**; otherwise the table is `null` and no flag bytes are ever written. Players without packs pay zero overhead, by construction.

**3. Into the vertex bytes (mesher worker).** The flags ride two spare bytes of the existing interleaved vertex data:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // low  8 bits → the colour attribute's alpha byte
        buffer[o + normalOffset + 3] = flags >> 8;    // high 8 bits → the normal attribute's w byte
    }
}
```

All four vertices of a face receive the same value — the implementation-level meaning of "the same across the face".

**4. GPU-side decode (Lite terrain shader).** The two bytes travel as the `blockFlagWords: vec2u` vertex attribute (location 7, present only when the pack pipeline is on) and are reassembled in the vertex stage:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags` is declared `@interpolate(flat)` — per-face constant all the way into the fragment stage, which is why §42's bit tests are stable within a face and can never produce a mid-face blend.

- The pipeline reserves **16 bits** of capacity (that decode reassembles two full bytes) while v3 defines only 6 — future flags can appear without another vertex-format change or API bump.
- In the packed-vertex mode, the same two bytes ride inside `packed.y` and the colour word's upper byte instead of a dedicated attribute — same values, different container.
- For the leaf-vs-grass question these flags are most often asked about, see [Leaves without the grass](#leaves-without-the-grass-the-question-everyone-asks) under §42.

## 53. Validation internals: HEADER_VERSION, signatures, reserved names

**The measured header hash.** Every pack validation is stamped with the engine's `HEADER_VERSION`. Executing the production validation module directly (see the harness note at the end of §54) measures it:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← measured from the live production bundle
```

It is an FNV-1a-32 hash (prefixed `6.`) over five inputs: the engine header preprocessed and tokenized **per variant** (one entry for each of the 8 variants), the parser's full WGSL lexical universe, the four macro names, the special-function map, and the `BloxdPackInputs` declaration together with its `@group(3) @binding(0)` uniform line. Two consequences for authors:

- **Any engine-side header edit re-hashes it** — this is the mechanism behind the automatic "needs re-check" flag saved packs receive after engine updates ([Part VIII](08-apiv2.md) §31).
- The hash covers the *engine header*, not your code. A pack that keeps loading across an engine update isn't "still valid" — it just hasn't tripped a header change yet. The only version check your manifest participates in is the `apiVersion` gate (§40).

**Hook signature checking: token-exact on types, free on names.** The validator holds one signature per hook slot:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

Matching is **token by token**: parameter type names must match exactly, `->` and the return type must match exactly, and parameter count and comma placement are checked. Parameter *names* are free — any identifier in the parameter position is accepted, which is why your `fn bloxdTerrainLight(s, l)` compiles even though the template spells it `(surface, light)`. The light hook takes exactly two parameters.

**Reserved names.** The rule is a single regex: `/^bloxd/i`. Any identifier starting with `bloxd` is reserved — everything `bloxd*` is engine-provided, and a pack cannot declare into that namespace (this is also why §44's `bloxdPi` / `bloxdTau` re-declarations collide).

**Special functions.** Exactly one is registered in v3:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

"Special" means *tied to a macro* — an engine function whose availability depends on a variant symbol. Two guard diagnostics enforce correct use:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — a vertex hook reaching a surface/light-only function.
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — for example terrain-side `bloxdOpaqueBehind()` without an `#ifdef BLOXD_SCENE_DEPTH` wrap.

**The engine header (prelude), pinned.** The v3 header is a 5,637-byte string beginning `// Engine-provided and read-only, prepended to all packs. apiVersion 3.` It carries `#if` / `#ifdef` directives that the engine's own WGSL preprocessor evaluates per variant — the engine genuinely runs `#if` expression evaluation, and a malformed expression errors with `Cannot evaluate #if ...`. Every struct, function signature, and quoted comment in this guide comes from this rendered text, so the guide and the shipping header cannot drift apart.

**Parser notes for authors.**

- Pack-side functions are renamed with a `pack_` prefix when merged into the engine shader (collision avoidance); diagnostics map them back to your original names — the same mechanism [Part VIII](08-apiv2.md) §38 describes for the second validation stage.
- The undeclared-identifier message reads `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`; `_ can only be the target of a phony assignment, as in _ = f();` and `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.` round out the newly confirmed set.
- The parser's lexical universe includes identifiers that are **not standard WGSL**: `bufferView`, `bufferArrayView`, `bufferLength`, `atomicStoreMax`, `atomicStoreMin`. The engine knows them as built-ins, but whether a given browser's WGSL implementation provides them is not guaranteed — never build a distribution pack on them.

## 54. Confirmed constants, limits, and layouts

The terrain program's complete resource layout, straight from the production Lite renderer:

| Binding | Contents |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms` — `viewProjection` mat4x4f, `view` mat4x4f, `vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`, `uSkyLightColour`, `uAmbientLightColour`, **`vFogInfos`**, `vFogColor`, `outputHeight`, `sceneAmbient`, **`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: storage `array<vec4f>` — xyz = translation into the render frame, w = fade-in visibility |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`, `ambientAndCutoff`, `emissiveAndLevel`, `anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — the pack uniform (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — the depth texture (§51) |

- **Directional lights are hard-capped at four.** The renderer errors out with `Terrain supports 4 directional lights, not ${n}` if a scene tries to register more. `l.directional` is the summed Lambert over however many exist (0–4; Bloxd's own scenes use 2 — [Part VII](07-internals.md) §27). Terrain also warns about lights it cannot honour, verbatim: a late-added light — `Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`; a tinted one — `Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`; and a mesh-filtering one — `Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **Terrain program naming**: pipeline cache keys read `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}` — a pack shows up as the `-sp{variant}` suffix, one program per §46 variant. A watcher (`watchPipelineFailures`) matches live pipeline names against `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/` and re-checks the matching pack variant when a pipeline compilation fails; GPU device loss (`device.lost`) skips the check.
- **`BLOXD_TERRAIN_DIRECTIONAL` is an engine-internal macro** (defined when dirLightCount > 0). It is *not* one of the prelude's four and never reaches pack code — but it appears in WGSL dumps of the engine's own shaders, so recognizing it saves confusion.
- **Light-level decode**: the `aPackedLightLevels` vertex attribute is one f32 packing four nibbles, each divided by 15: rgb = the colored block light, a = the sky/held channel. The vertex stage decodes it into the `vLightLevels` varying; `blockLight` reads `.rgb`, the sky/held channel reads `.w`. The engine floors the rgb channels at 35% of the brightest channel before interpolation — the engine-side anchor of the lift [Part VII](07-internals.md) §26 documents from gameplay.
- **`vTerrainLambert`** (the `directional` source, §49) is generated as a sum over the active directional lights: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, guarded by `BLOXD_TERRAIN_DIRECTIONAL`.
- **Index buffers go 32-bit at the first large mesh.** The Lite renderer picks `Uint16Array` indices only while every index value stays ≤ 65,534 — as soon as any index reaches 65,535 the buffer becomes a `Uint32Array` (tracked per buffer with an `is32Bits` flag). In practice: a chunk mesh with at most 65,535 vertices fits in 16-bit indices; one with exactly 65,536 vertices necessarily emits an index of 65,535 and switches the whole buffer to 32-bit.
- **Manifest loading details**: zip entries under `__MACOSX/`, files prefixed `._`, and `.DS_Store` are filtered out (macOS archive noise); `pack.json` is located by lowercased path comparison — zero matches → `loadNoManifest`, two or more → `loadDuplicateManifest`; the manifest read is capped at 65,536 bytes.
- **How all of this was verified**: the production bundle's modules were restored (165 chunks; the webpack registry counts 4,951 modules in this bundle — module counts shift by a few depending on whether async child dependencies are included, so treat the exact number as bundle-specific) and executed in a webpack-compatible harness under Node.js. The measured `HEADER_VERSION` (§53), the rendered 5,637-byte header, the variant table's canonical order, and the special-function map all come from *running the shipped code*, not from reading strings. The same harness is the natural core for a community `pack_check` v6 — executing the engine's own validator against a pack reproduces its verdicts exactly.

---

[← Previous part](09-apiv3.md)·[Back to the manual](README.md)

# Part X: API version 4 migration guide

Target build: `cnty9.main.669f8081.js` — **live on production and preprod simultaneously since 2026-10-26**. Unlike the v3 rollout (a preprod build promoted to production), v4 flipped both environments to the same new bundle in one move, and the two bundles are byte-identical (main and every shader-pack chunk md5-checked), so everything here applies to production as-is. The bundle was also reorganised around this release — the main bundle shrank from 4.73 MB to 3.03 MB (-36%), the chunk count grew from 169 to 193, and the whole shader-pack pipeline (loader, validator, code generator, WebGPU compiler) now lives in a contiguous c49–c54 cluster. The pack model itself keeps its shape: same `pack.json` fields, same loader limits, same 64 B uniform, same six hooks.

One thing changed around this release that is *not* in the bundle: **the engine now cites reference files by name.** Its own error messages point at `bloxd-api.wgsl` (the annotated engine header) and `BLOCK_TEXTURES.md` (the complete texture-name list) — `...BLOCK_TEXTURES.md lists them.` This guide carries the content of both instead of pointing you elsewhere: the complete header, restored verbatim from the live build, and the complete catalogue of all 905 usable texture names are embedded as Part XI (`11-reference.md`). Every pack-facing fact in this part was restored from the production bundle.

The v4 change set in one screen:

| Area | v3 | v4 |
|---|---|---|
| `pack.json` `apiVersion` | `3` (strict) | **`4` (strict)** — v3 packs are rejected at load |
| Texture access | none ("cannot sample textures") | **new texture API**: `bloxdTexel()`, `bloxdTextureSize()`, `bloxdTextureId*` constants |
| Hook inputs | 13/5 fields | **+4 fields each**: `textureId`, `textureRotation`, `uv`, `mipLevel` (surface *and* light) |
| `fogVisibility` | `1 = no fog` | renamed **`fogAlpha`**, meaning **inverted**: `0 = no fog, 1 = only fogColour` |
| `bloxdFaceBlock()` | — | renamed **`bloxdFragmentBlockPosition()`** (same math) |
| `BloxdOpaqueBehind.found` | `found` | renamed **`hit`** |
| Strict games | policy + guards documented | now **enforced by the bundled validator** with exact diagnostics (§60) |
| Everything else | — | frozen: 6 hooks, `blockFlags` bits, uniform layout, loader limits, variant matrix, pack `@group(3)` bindings |

Conversion from v3 is mechanical (§61) except for one silent trap: if you port everything but ignore the `fogAlpha` inversion, your fog-dependent code runs with inverted fog and *compiles fine*. As always, verify with an in-game compile before distributing.

## 55. Fate of v3 packs (conclusion first)

**Every v3 pack — including every pack distributed as v3 — now fails on production exactly at load.** The loader compares `manifest.apiVersion !== 4` with strict JavaScript `!==`, so the comparison is type- and value-exact: the JSON must carry the *number* `4`. A string `"4"` fails and is reported with its JSON spelling (`{{packVersion}}` is `JSON.stringify`-ed, so the settings screen shows `This pack is for shader pack API version "4"...` with quotes — a useful tell that you wrote a string).

The two load-time messages, verbatim from the live i18n dictionary:

> `pack.json needs "apiVersion": {{version}}.` — the key is absent entirely.
>
> `This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — the key is present but doesn't equal 4.

A stored (previously working) v3 pack doesn't throw anything at the player. The stored-pack outcome resolves to `{kind: "none", reason: "otherApiVersion"}`, the pack is silently inactive, and the shader-pack settings tab explains itself with the status line:

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

The manifest rules around `apiVersion` are otherwise unchanged and worth re-stating because the loader enforces them before anything else:

- `pack.json` must be a JSON object at the root of the pack (not an array, not a number).
- `apiVersion` must be present and `=== 4`.
- `name` is required, a string, and non-empty after trimming.
- `author` is optional, but if present it must be a string — explicit `null` is rejected (`pack.json's "author" must be a string.`).
- Everything else in the manifest is ignored by the loader.

## 56. pack.json and the uniform buffer (what stays unchanged)

The whole non-texture pack model carries over from v3 byte-for-byte, so §41 of [Part IX](09-apiv3.md) remains the reference. The v4 re-measurements, from the live loader chunk (c51):

| Limit | Value | Message when exceeded |
|---|---|---|
| `.wgsl` files per pack | 256 | `The pack has more than 256 .wgsl files.` |
| Total `.wgsl` source | 256 KB | `The pack's .wgsl files are over 256 KB in total.` |
| `pack.json` size | 64 KB | `pack.json is over 64 KB.` |
| Zip size | 32 MB | `The zip is over 32 MB.` |
| Zip entries | 1,024 | `The zip has more than 1024 entries.` |
| Zip shape | — | split zips, Zip64, encrypted entries, and unsupported compression methods are each rejected with a dedicated message; every file must be valid UTF-8; exactly one `pack.json`; no duplicate paths |

The per-frame uniform is untouched: `@group(3) @binding(0) var<uniform> bloxdPackInputs: BloxdPackInputs`, 64 bytes, std140-style layout:

| Offset | Field | Type | Note |
|---|---|---|---|
| 0 | `seconds` | `f32` | backs `bloxdSeconds()` |
| 16 | `renderOffset` | `vec3i` | backs `bloxdRenderOffset()` |
| 32 | `sunDirection` | `vec3f` | backs `bloxdSunDirection()` |
| 48 | `eyePosition` | `vec3f` | backs `bloxdEyePosition()` |

The six-hook template ships with only comment polish (1059 → 1122 bytes; the v3 behaviour described in §45 is unchanged). The v4 template, verbatim — still the best starting skeleton, and still the strict-games pattern to copy:

```wgsl
// Every hook here returns its engine default.
// Copy a hook and change its output to start a shader pack.

// Strict games keep terrain where it is. We use #ifndef to define the hook for
// non-strict games, but to disable it in strict games, so our pack can stay on.
#ifndef BLOXD_STRICT
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

// Water uses liquid hooks. If deleted, water uses your terrain hooks instead.
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
```

## 57. The texture API: `bloxdTexel`, `bloxdTextureSize`, `bloxdTextureId*` (the headline)

v3 packs could read a face's *colour* but not its *texture*. v4 opens the block-texture atlas itself: three new engine functions, one named-constant family, and four new input fields (§58). The engine header's own one-line summary of the headline: *"This face's texture. Compare with `bloxdTextureId*`."*

### 57.1 `bloxdTexel(textureId: u32, uv: vec2f, mipLevel: f32) -> vec4f`

Samples the block-texture atlas **exactly as the engine's own sampler does** — the same `texture_2d_array<f32>` atlases, the same `atlasSampler`, `textureSampleLevel` at `round(mipLevel)` — so a texel you read and the texel the engine rendered agree by construction. Semantics, all restored from the generated WGSL (§63 has the verbatim source):

- **`textureId == 0` returns `vec4f(1.0)`** — white. That is the "no texture" id, and it is also what the four input fields carry when a face has no texture, so `bloxdTexel(surface.textureId, ...)` is always safe to call.
- **Animated textures return the current frame, automatically.** The frame advances with the game's animation clock — you cannot freeze or step it, and you don't need to: sampling an animated texture's id *is* sampling its live frame (§63.3 for the frame math).
- **`mipLevel` is clamped the way the engine clamps its own:** `clamp(round(mipLevel), 0, textureNumLevels(textureAtlas0) - 1)`. Out-of-range mips saturate instead of erroring.
- **The current fragment's `textureRotation` is applied to the uv you pass** — see 57.4; this is the one subtlety with real visual consequences.

`textureId` is **1-based**: `bloxdTextureIdGrassTop` is the id, and the atlas layer the engine samples for it is `id - 1`. Ids are stable per texture *name*, not per atlas layout — the engine re-lays-out the atlas freely across builds while your `bloxdTextureId*` comparisons keep meaning "this texture".

### 57.2 `bloxdTextureSize(mipLevel: f32) -> vec2u`

`textureDimensions(textureAtlas0, <clamped mip>)` — the size in texels of the atlas at that mip level. Since every texture occupies one array layer of that atlas, this is also *the texel size of any one texture at that mip* (all block textures in an atlas tier are the same square size). Pair it with `bloxdTexel` when you want texel-grid effects:

```wgsl
// A texel-aligned "pixel art" re-sample of this face's own texture.
let size = bloxdTextureSize(surface.mipLevel);
let uv = fract(surface.uv);
let texel = bloxdTexel(surface.textureId, uv, surface.mipLevel);
```

### 57.3 `bloxdTextureId*`: named texture constants

Every usable texture name becomes a `const` you can compare against — spelled **CamelCase over the texture's file name**:

| Texture file | Constant | Note |
|---|---|---|
| `grass_top.png` | `bloxdTextureIdGrassTop` | the engine's own example |
| `lava0.png` (frames `lava0`–`lava7`) | `bloxdTextureIdLava` | animated family: the frame suffix is dropped from the canonical name |
| `black_portal0.png` (frames 0–3) | `bloxdTextureIdBlackPortal` | same rule |
| `radar_screen0` (turned copies `[rot[1`–`[rot[4`) | `bloxdTextureIdRadarScreen0` | turned family: folds to the root name |

The spelling rule, restored from the validator: split the name on every non-alphanumeric run, capitalise each part, concatenate after the `bloxdTextureId` prefix. Lookup is **case- and underscore-insensitive** in the other direction (the engine folds your spelling the same way before matching), with three dedicated error families when a spelling doesn't resolve — all verbatim from the live validator:

> **Misspelt prefix / wrong case:** `bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?`
>
> **A frame of an animated texture:** `...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates.`
>
> **A turned copy:** `...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, which bloxdTexel turns as each face shows it.`
>
> **Ambiguous after folding:** `...could name X and Y, which differ only by case or underscores, so it can't be used.`
>
> **Not found, with a suggestion:** `There's no texture called X. Did you mean bloxdTextureIdY?` — the suggestion threshold is Levenshtein distance `max(2, floor(len/4)) + 1`.
>
> **Not found, no suggestion:** `There's no texture called X. Texture names are the file names texture packs use, as in bloxdTextureIdGrassTop for grass_top.png; BLOCK_TEXTURES.md lists them.`

That last message points at a file this guide embeds instead: the complete measured catalogue — every one of the 905 usable names with its current id, plus the turned and animated family tables — is §68 (Part XI, `11-reference.md`); §64 has the registry measurement and the folding rules behind it.

### 57.4 The rotation subtlety — and the neutral-sampling helper

`bloxdTexel` un-rotates the uv you pass by the **current fragment's** `textureRotation`, whatever id you hand it. For the two common cases this is exactly right:

- **Re-sampling this face's own texture** with `surface.uv` — the uv is in the face's rotated frame, the un-rotation converts it to the atlas frame, and you get the true texel. This is the intended primary use.
- **Sampling with a uv you computed in *atlas* terms** for a *different* texture on a face whose rotation isn't 0 — the un-rotation still fires, and your sample lands rotated. This is the trap.

The engine has no per-texture rotation to consult (rotation is face geometry data, §63.2), so it always uses the fragment's. To sample another texture rotation-neutrally, pre-rotate your uv by the same quarter-turn — the inverse of the un-rotation — which cancels it:

```wgsl
// Rotation-neutral texel sampling: pre-turn the uv so bloxdTexel's
// un-turn (by this face's textureRotation) cancels out.
// Pass surface.textureRotation as r from your hook.
fn texelNeutral(id: u32, uv: vec2f, mip: f32, r: u32) -> vec4f {
    var turned = uv;
    if (r == 1u) {        // turn: (x,y) -> (1-y, x)
        turned = vec2f(1.0 - uv.y, uv.x);
    } else if (r == 2u) { // (x,y) -> (1-x, 1-y)
        turned = vec2f(1.0 - uv.x, 1.0 - uv.y);
    } else if (r == 3u) { // (x,y) -> (y, 1-x)
        turned = vec2f(uv.y, 1.0 - uv.x);
    }
    return bloxdTexel(id, turned, mip);
}

// usage, inside a surface hook:
//   let t = texelNeutral(bloxdTextureIdLava, fract(surface.uv),
//                        surface.mipLevel, surface.textureRotation);
```

(When `textureRotation == 0` no compensation is needed. In practice most faces carry 0; turned faces are the minority — but a distribution pack should not assume it.)

### 57.5 Worked examples

**Emission from texel luminance.** The engine already multiplies texture × tint × AO into `surface.colour`; here we instead drive emission from the texture's own brightness, sampling one mip *above* the face's for a soft, blocky average that survives distance:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    // +1 mip = quarter resolution: a 4x4-texel average, cheap and stable
    let avg = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + 1.0);
    let lum = dot(avg.rgb, vec3f(0.2126, 0.7152, 0.0722));
    if ((surface.blockFlags & bloxdBlockFlagEmissive) != 0u) {
        // keep the engine look, add a gentle bloom source proportional to the texture itself
        out.emission += avg.rgb * lum * 0.5;
    }
    return out;
}
```

**Texture-specific effects.** Compare `textureId` and act only on chosen textures — the v4 replacement for "guess from colour", and the sanctioned way to make e.g. ores glint:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.textureId == bloxdTextureIdDiamondOre) {
        // sparkle: phase from world position + time
        let p = bloxdWorldPosition(light.position);
        let s = sin(bloxdSeconds() * 3.0 + p.x * 2.7 + p.y * 1.3 + p.z * 4.1);
        out.colour += vec3f(0.35, 0.45, 0.55) * max(0.0, s);
    }
    return out;
}
```

**Depth-of-field-style distance blur on terrain detail** — read a high mip far away, the native mip up close:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let d = distance(surface.position, bloxdEyePosition());
    if (d > 40.0 && surface.textureId != 0u) {
        // the engine's own texel for this face — carries tint and AO with it
        let own = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel);
        if (any(abs(own.rgb - vec3f(0.0)) > vec3f(1e-6))) {          // guard the division
            // blur level rises with distance, up to +3 mips
            let blur = clamp((d - 40.0) / 60.0, 0.0, 3.0);
            let t = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + blur);
            // restore tint & AO by ratio: (t / own) * colour
            out.colour = t.rgb / own.rgb * out.colour;
        }
    }
    return out;
}
```

(The ratio trick keeps the engine's `colour = texture × tint × AO` intact: dividing the blurred texel by the native texel cancels the texture content, leaving a blur factor you multiply back into `surface.colour`. On white `vec4f(1.0)` reads — untextured faces and anti-X-ray-culled faces — the guard skips the effect entirely.)

### 57.6 Where the texture API does *not* reach

- **Vertex hooks cannot call it.** `bloxdTexel` / `bloxdTextureSize` are surface/light-hook functions; a vertex hook reaching them is rejected with the "reaches" diagnostic (§65.3).
- **You cannot add textures.** The atlas is the engine's; the API reads it, nothing more. Custom textures remain the texture-pack system's job, not the shader pack's.
- **Non-atlas renderer configurations degrade to stubs.** On a configuration where the terrain material isn't atlas-based, the engine compiles `bloxdTextureSize() -> vec2u(1u)` and `bloxdTexel(...) -> vec4f(1.0)` and feeds the four input fields as `0u, 0u, vec2f(0.0), 0.0`. Code written against the real atlas still compiles and runs there — it just sees white texels and a 1×1 size. Write such code to tolerate `textureId == 0` and it tolerates this too.

## 58. The four new input fields

Both `BloxdSurfaceIn` and `BloxdLightIn` gain the same four trailing fields, quoted from the v4 header (the light struct carries the same quartet the surface struct does — your light hook can act on the texture without plumbing anything through the surface hook):

```wgsl
    // These are 0 if the face has no texture.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // Texture coordinates in blocks; fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
```

- **`textureId`** — the stable, name-derived id (§57.3). `0` on untextured faces; otherwise never `0`.
- **`textureRotation`** — `0`–`3`, quarter turns **clockwise** as the face *displays* the texture. Comes from geometry/texture-pack overrides (§63.2); same value in both hooks.
- **`uv`** — the interpolated texture coordinate in **block units**: one block of face area maps to one `1.0` of uv span, so `fract(uv)` is the within-block texture tile — the header's own phrasing. On a wall of repeated stone, `uv` grows along the wall while `fract(uv)` tiles.
- **`mipLevel`** — the engine's own choice of mip for this fragment, derived from screen-space derivatives of the texel position and clamped to the atlas' level range (§63.1 has the exact formula). `0` on screen-filling faces, rising with distance/obliquity. It is a *read* — you can't steer the engine's sampling with it, but you can pass it (or `± n`) to `bloxdTexel`.

Recipe idea unique to v4 — **uv-anchored detail patterns that respect the block grid without world coordinates**:

```wgsl
// Fine grid keyed to the texture's own tiling: visible on every textured
// face, stable under camera motion, and free of floating-point world drift.
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let cell = fract(surface.uv * 8.0);               // 8x8 sub-tiles per block
    let edge = min(min(cell.x, 1.0 - cell.x), min(cell.y, 1.0 - cell.y));
    out.colour *= mix(vec3f(0.86), vec3f(1.0), step(0.06, edge));
    return out;
}
```

## 59. Renames and semantic changes

Four renames, one of which inverts its meaning. Everything else in the header — `bloxdPi`, `bloxdTau`, the six `bloxdBlockFlag*` constants and their bits (1/2/4/8/16/32), `bloxdEyePosition` / `bloxdRenderOffset` / `bloxdSunDirection` / `bloxdSeconds`, `bloxdWorldPosition`, the default hooks, the `BLOXD_*` macro matrix, the 8-variant matrix — is unchanged from v3, and the `blockFlags` name-classifier rules of §42 carry over verbatim.

| v3 | v4 | Note |
|---|---|---|
| `l.fogVisibility` | `l.fogAlpha` | **meaning inverted** — port expressions, don't just rename |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` | identical body: `vec3i(floor(pos - nrm * 0.5)) + bloxdRenderOffset()` |
| `behind.found` | `behind.hit` | `BloxdOpaqueBehind` field rename |
| header first line | — | `// Engine-provided and read-only, prepended to all packs. apiVersion 3.` → `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.` |

### 59.1 `fogVisibility` → `fogAlpha`: the inverted one

v3: `fogVisibility: f32, // 1 = no fog, 0 = fully fogged.` v4: `fogAlpha: f32, // 0 = no fog, 1 = only fogColour.` The default fog application flipped with it:

```wgsl
// v3
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(light.fogColour, colour, light.fogVisibility);
}
// v4
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}
```

Port table — every v3 fog idiom has a mechanical v4 replacement:

| v3 expression | v4 port |
|---|---|
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, l.fogVisibility)` | `mix(col, l.fogColour, l.fogAlpha)` (or `bloxdApplyFog(col, l)`) |
| `mix(l.fogColour, col, max(l.fogVisibility, 0.15))` (fog floor) | `mix(col, l.fogColour, min(l.fogAlpha, 0.85))` |
| "fog visibility is 1 up close" | "fogAlpha is 0 up close" |

The fog-*distance* behaviour is unchanged — same curve, same colours; only the field's polarity and name moved. Note also the comment change on `fogColour`: v3 said games "always have fog"; v4 documents `0 when the game has no fog` (and the engine indeed feeds `vec3f(0.0)` when the scene's fog is off) — relevant if you divide by or compare against `fogColour`.

### 59.2 `bloxdFaceBlock` → `bloxdFragmentBlockPosition`

A pure rename — the engine's own doc comment changed from "the world block the face ... belongs to" to "identify the block's world position", the body is byte-identical, and parameter names remain free. Recipe R4 and every `bloxdFaceBlock(l.position, l.normal)` call site ports by search-and-replace.

### 59.3 `found` → `hit`

`bloxdOpaqueBehind()` still returns `BloxdOpaqueBehind`, still compiled only where `BLOXD_SCENE_DEPTH` is defined (liquid programs — §60.4), and its implementation is unchanged apart from the field name. Port `behind.found` → `behind.hit` and re-read the semantics from the v4 header comments: `position` and `distance` are `0` (not "meaningless") when `!hit`. R-E (water absorption) and friends port mechanically.

## 60. The strict-games contract: vertex hooks, `discard`, and X-ray

Strict games are the rule, not the exception: **everything defaults to strict**, and only the 12 allow titles enumerated in §30 opt out (re-verified verbatim on the v4 bundle, 2026-10-27 — the same 12 titles: Test Gym, Doodle Cube, Rocket Obby, Creative, Bloxd Hop, Fishing, Dress Up, Evil Tower, Plots, Test Mode, Tsunami Steal Brainrots, Work at a Restaurant; every other title — survival, bedwars, skywars, custom games, ... — is strict). v4 turns what used to be a documentation-level contract into an **enforced** one: the bundled validator analyses every strict variant and emits dedicated diagnostics.

### 60.1 The two enforced rules and their exact diagnostics

> `bloxdTerrainVertex moves terrain, which strict games prevent.`
>
> `discard makes terrain see-through, which strict games prevent.`

The mechanics, restored from the validator:

- A **vertex hook defined in a strict variant** (i.e. not wrapped in `#ifndef BLOXD_STRICT`) triggers the first message. "Moves terrain" is taken literally: any vertex hook that isn't the exact default passthrough counts (the check is `movesVertices = vertexHook && !isExactDefault` — even a hook that returns the input unchanged but through different spelling counts as movement).
- A **`discard` reachable from the surface or light hooks** triggers the second. `discard` itself is *newly legal* in v4 for non-strict games — the v1–v3 hard prohibition is gone — but strict games treat it as X-ray (see below).
- **One trip disables everything in strict games.** If a strict variant's analysis produces any such diagnostic, the validator nulls *all three* hooks for the strict variants: the pack still loads, still runs in allow games, and in strict games does exactly nothing. An unguarded vertex hook therefore doesn't just lose the sway — it loses your lighting too.
- **Guarded code keeps the rest alive.** With the template's `#ifndef BLOXD_STRICT` wraps, the strict variants define no vertex hook, produce no diagnostic, and your surface/light hooks keep running in strict games. That is the entire point of the template's comment: *"so our pack can stay on."*

The settings UI walks the author through exactly this. The status line, verbatim:

> `Off in strict games. To run any other parts of the pack in them, wrap each one listed below in #ifndef BLOXD_STRICT ... #endif`

…followed by the offending hook list, each entry optionally suffixed `(only in {{variants}})` with the variant axes spelled `strict / non-strict`, `lighting on / off`, `terrain / liquid`. And in-game, when a pack has nothing left to run under the current mode, the chat shows: `Your shader pack is off in this game.`

### 60.2 Why: X-ray

Both rules exist for the same reason — in competitive games, a shader that moves terrain or punches holes in it can reveal buried structures and ores: a vertex hook that pulls occluding blocks aside is a wall-hack, and `discard` on selected fragments is a pinhole X-ray. This is also why the engine's own template guards *only* the vertex hooks: surface/light effects (colour, lighting, emission) can't move geometry, so they're safe everywhere. The community tutorial channel confirms the policy from the player side — grass-sway packs are the canonical "doesn't work in strict games" example, and the anti-X-ray culling that strict games perform also hides some textures from the render path entirely, so even texel reads can come back white there. Design for strict-first: treat allow-games-only effects (sway, holes) as progressive enhancement, never as the headline feature.

### 60.3 What's *not* in v4: the shadow API

The same community channel records the engine author as having a shadow-API draft (a `bloxd-api` companion file) that did **not** ship in this release, with block/grass shadows expected to arrive together with a future shader-pack API update. Nothing shadow-related exists in the v4 bundle (no shadow symbols, no reserved names beyond §63.4's list) — treat shadows as announced-but-unshipped, and don't build distribution packs against them yet. The `skyLight`-based projected-shadow recipes of R9.12 remain the only shadow look available in v4.

### 60.4 Strict recap for liquid authors

The macro matrix is unchanged from §46: `BLOXD_ALPHA` in every liquid variant plus non-strict terrain; `BLOXD_SCENE_DEPTH` in every liquid variant; `BLOXD_STRICT` / `BLOXD_LIGHTING` on their axes. Strict liquid programs still give you alpha and depth — only terrain alpha is strict-gated.

## 61. v3 → v4 migration checklist

1. **`pack.json`**: `"apiVersion": 4` — the number, not a string.
2. **Rename** `bloxdFaceBlock` → `bloxdFragmentBlockPosition` everywhere (arguments unchanged; parameter names free as always).
3. **Port fog** (the silent one — a pack that skips this compiles and looks wrong):
   - every read `l.fogVisibility` → `1.0 - l.fogAlpha`
   - every hand-rolled `mix(l.fogColour, col, VIS)` → `mix(col, l.fogColour, ALPHA)` — or better, replace with `bloxdApplyFog(col, l)` and let the engine own the formula
   - floor/cap idioms invert with the field: `max(VIS, 0.15)` → `min(ALPHA, 0.85)`
4. **Port depth recipes**: `behind.found` → `behind.hit`; `position`/`distance` are `0` when `!hit`.
5. *(Optional)* **Adopt the texture API**: `bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*` and the four new fields (§57–§58). Remember the rotation subtlety (57.4) and that texel code must tolerate `textureId == 0`.
6. **Strict audit** (required for distribution): wrap every vertex hook in `#ifndef BLOXD_STRICT ... #endif`; if you use `discard`, wrap it (or the hook containing it) the same way, or accept that strict games disable the whole pack's hooks.
7. **In-game compile check** across the 8 variants: the loader screen's "Checking the pack..." validates every variant at once — strict/non-strict × lighting on/off × terrain/liquid — so one pass covers it. Then eyeball one allow game (Test Mode is the fastest) and one strict game.
8. **Bump your own version metadata** and re-distribute: stored v3 copies on players' machines are silently inactive (§55) and only the settings tab says why.

### 61.1 A complete v3 → v4 port, before and after

```wgsl
// ---- v3 pack: hot sand shimmer + fog-aware emission ----
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    if ((s.blockFlags & bloxdBlockFlagSand) != 0u) {
        let p = bloxdWorldPosition(s.position);
        out.colour *= 1.0 + 0.04 * sin(p.x * 7.0 + bloxdSeconds() * 2.0);
    }
    return out;
}

fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // v3: keep glowing at distance by adding emission AFTER fog
    let col = mix(l.fogColour, out.colour, l.fogVisibility);
    out.colour = col + s.emission * l.fogVisibility;
    return out;
}
```

```wgsl
// ---- v4 port: same look, plus texel-aware sand and a texture guard ----
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagSand) != 0u) {
        let p = bloxdWorldPosition(surface.position);
        out.colour *= 1.0 + 0.04 * sin(p.x * 7.0 + bloxdSeconds() * 2.0);
    }
    // v4 extra: real texture knowledge — darken fine grain on close faces
    if (surface.textureId != 0u && surface.mipLevel < 1.0) {
        let t = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel);
        let grain = abs(dot(t.rgb, vec3f(0.33)) - 0.5);
        out.colour *= 1.0 - 0.08 * grain;
    }
    return out;
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    // v4: fogAlpha port — emission added after fog, gated by (1 - fogAlpha)
    let col = mix(out.colour, light.fogColour, light.fogAlpha);
    out.colour = col + surface.emission * (1.0 - light.fogAlpha);
    return out;
}
```

Both hooks are surface/light-only, so this pack needs no `#ifndef BLOXD_STRICT` wraps and runs (with its new texel effects) in strict games too. The `textureId != 0u` guard covers untextured faces; for strict games' anti-X-ray culling, style effects should also degrade gracefully if a texel read comes back white despite a non-zero id — branch on ranges and ratios, never on one expected texel value.

## 62. Other v4 changes and notes

- **The bundle reorg** (numbers in the intro) moved the shader pipeline into chunks c49 (loader/persistence), c50–c51 (loader UI + zip), c53 (validator + header + registry builder), c54 (WGSL code generator + Lite renderer). For anyone re-researching the bundle after a v3-era guide: the anchors all moved, the code didn't.
- **The header text was rewritten for clarity** — every doc comment re-worded (terser, second person), no semantic change beyond §59. Size 5,637 → 6,021 bytes, 128 → 150 lines; the first line is now `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.`
- **Emission ordering is now documented in-header**: `emission: vec3f, // Emissive RGB output, added after lighting, before fog.` — v3's §43 finding, now official wording.
- **i18n surface** for the shader-pack feature is 58 keys (v4 build); the loader family (`load*`) is quoted across §55–§56, the status family (`status*`) in §55, the variant labels in §60.1.
- **Reference material, embedded** (intro): the engine's error messages cite `bloxd-api.wgsl` and `BLOCK_TEXTURES.md`; this guide ships their content instead of citing them — the complete restored header (§67) and the complete measured catalogue (§68) — so nothing external is needed to author or debug a pack.
- **Auto-recheck now also fires on texture-registry changes** (§65.1) — a consequence of the registry hash joining HEADER_VERSION. A saved pack can flip to "needs re-check" after an engine update that merely *adds textures*, even when the header text didn't change. This is by design: your `bloxdTextureId*` constants are baked at validation time.
- **`bloxdSp*` reservation expanded to 27 symbols** (§63.4) — the engine-private namespace inside generated shaders. The pack-level reservation rule is unchanged and broader: anything matching `/^bloxd/i` (case-insensitive) is reserved.

## 63. Engine internals: how `bloxdTexel` actually samples

As with §49–§51 for v3, the following is restored verbatim from the production bundle (chunk c54's code generator, build `cnty9`, 2026-10-26) and is the deepest public account of the mechanism. Nothing in §57 goes beyond what these snippets prove.

### 63.1 The generated functions, verbatim

On renderer configurations with the atlas texture mode and no animation, the engine emits exactly:

```wgsl
var<private> bloxdSpTextureRotation: u32;
@group(3) @binding(2) var<storage, read> bloxdSpTextureLayers: array<u32>;

fn bloxdTextureSize(bloxdSpMipLevel: f32) -> vec2u {
    return textureDimensions(textureAtlas0,
        u32(clamp(round(bloxdSpMipLevel), 0.0,
                  f32(textureNumLevels(textureAtlas0) - 1u))));
}

fn bloxdTexel(bloxdSpTextureId: u32, bloxdSpUv: vec2f, bloxdSpMipLevel: f32) -> vec4f {
    if (bloxdSpTextureId == 0u) {
        return vec4f(1.0);
    }
    // Each quarter turn clockwise the face shows its texture at reads the
    // unturned texture at (v, 1 - u)
    var bloxdSpTurned = bloxdSpUv;
    if (bloxdSpTextureRotation == 1u) {
        bloxdSpTurned = vec2f(bloxdSpUv.y, 1.0 - bloxdSpUv.x);
    } else if (bloxdSpTextureRotation == 2u) {
        bloxdSpTurned = 1.0 - bloxdSpUv;
    } else if (bloxdSpTextureRotation == 3u) {
        bloxdSpTurned = vec2f(1.0 - bloxdSpUv.y, bloxdSpUv.x);
    }
    let bloxdSpLayer = bloxdSpTextureId - 1u;
    return textureSampleLevel(textureAtlas0, atlasSampler, bloxdSpTurned,
                              bloxdSpLayer, round(bloxdSpMipLevel));
}
```

With more than one atlas, the tail becomes a layer-window ladder — atlas *k* owns layers `[k * layersPerAtlas, (k+1) * layersPerAtlas)`:

```wgsl
    if (bloxdSpLayer < 2u * layersPerAtlas) {
        return textureSampleLevel(textureAtlas1, atlasSampler, bloxdSpTurned,
                                  bloxdSpLayer - layersPerAtlas, round(bloxdSpMipLevel));
    }
    // ... one rung per atlas, the last one unguarded ...
    return textureSampleLevel(textureAtlasLast, atlasSampler, bloxdSpTurned,
                              bloxdSpLayer - N * layersPerAtlas, round(bloxdSpMipLevel));
```

Note what this proves: `textureId` is the **global 1-based layer index across all atlases** (`bloxdSpLayer = textureId - 1u`), and `bloxdTextureSize` reads atlas 0 only — valid because all atlas tiers share dimensions.

### 63.2 Where the fragment's texture quartet comes from

The per-vertex attribute `texAtlasIndices` (the geometry's texture-slot index) is resolved **through the storage buffer**, not used directly:

```wgsl
// vertex stage (injected):
vertexOutputs.vPackTexture = bloxdSpTextureLayers[
    min(u32(vertexInputs.texAtlasIndices), arrayLength(&bloxdSpTextureLayers) - 1u)];
```

`bloxdSpTextureLayers` is filled on the JS side, one `u32` per slot, packed exactly as:

```js
layers[slot] = (id & 0xffff) | ((rotation & 3) << 16);
```

The fragment stage unpacks both halves before your surface hook runs:

```wgsl
// fragment stage (injected, ahead of the surface hook):
let bloxdSpTexture = fragmentInputs.vPackTexture;
bloxdSpTextureRotation = bloxdSpTexture >> 16u;      // -> textureRotation field
// BloxdSurfaceIn constructor tail:
//   bloxdSpTexture & 0xffffu,        // textureId
//   bloxdSpTextureRotation,          // textureRotation
//   fragmentInputs.vMainUV1,         // uv
//   bloxdSpMipLevel                  // mipLevel (derived below)
```

and the mip is derived exactly as the engine derives its own:

```wgsl
let bloxdSpTexelUV = fragmentInputs.vMainUV1 * atlasWidth;
let bloxdSpDdx = dpdx(bloxdSpTexelUV);
let bloxdSpDdy = dpdy(bloxdSpTexelUV);
let bloxdSpLod = 0.5 * log2(max(max(dot(bloxdSpDdx, bloxdSpDdx),
                                    dot(bloxdSpDdy, bloxdSpDdy)), 1e-10));
let bloxdSpMipLevel = clamp(bloxdSpLod, 0.0,
                            f32(textureNumLevels(textureAtlas0) - 1u));
```

Two consequences worth internalising: the rotation really is **per-slot geometry data** (there is no rotation-per-texture lookup anywhere — which is *why* §57.4's subtlety exists), and the *default* (pack-less) terrain shader samples the atlas differently — it uses the pre-rotated layer copies directly at the raw uv, while the pack path normalises to the unturned layer and re-applies rotation in `bloxdTexel`. Same pixels, two representations.

### 63.3 Animation: the frame ladder

For animated textures the layer assignment grows a frame computation (this is the *entire* difference — sampling, rotation, and mip logic are unchanged):

```wgsl
    let atlasIdxIn = f32(bloxdSpTextureId - 1u);
    let animTick = material.anim.x;               // animation clock
    let animTickStride = material.anim.y;
    let numAnimTextures = material.anim.z;
    let animParamIndex = 3.0 * min(numAnimTextures, floor(atlasIdxIn));
    let animStateMask = animDataPerTex[i32(animParamIndex)];        // frames - 1
    let animTexIndexStart = animDataPerTex[i32(animParamIndex + 1.0)];
    let animInterval = max(animTickStride, animDataPerTex[i32(animParamIndex + 2.0)]);
    let animTickForTex = floor((animTickStride / animInterval) * animTick);
    let animState = animTickForTex
        - (animStateMask + 1.0) * floor(animTickForTex / (animStateMask + 1.0));
    let isAnimTex = min(1.0, animState);
    let bloxdSpFrame = (1.0 - isAnimTex) * atlasIdxIn
                     + isAnimTex * (animTexIndexStart + animState - 1.0);
    let bloxdSpLayer = u32(round(bloxdSpFrame));
```

`animDataPerTex` (group 2, `array<f32>`) carries one `{mask, startLayer, interval}` triplet per animated texture, frames are **power-of-two counted** (a JS-side build check rejects non-power-of-2 frame counts with `<block> has N animation states, which is not a power of 2`), and the static-sentinel design means non-animated indices resolve through the same arithmetic without a branch. Pack-facing summary, once more: *the id is stable, the frame is automatic.*

### 63.4 The `bloxdSp*` namespace — all 27 symbols

Everything the generator can inject into your shader, i.e. everything you cannot redeclare (the pack-level `/^bloxd/i` reservation makes most of this moot, but for engine-source readers this is the complete v4 set, extracted from the generator's templates):

`bloxdSpBehind` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpEye` · `bloxdSpFrame` · `bloxdSpLayer` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLitColour` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpPixel` · `bloxdSpPositionW` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpZ`

### 63.5 The full bind-group layout (Lite renderer, pack variant)

| Group | Binding | Resource | Notes |
|---|---|---|---|
| 0 | 0 | `uniform` scene | `LiteSceneUniforms` — viewProjection / view / vEyePosition |
| 1 | 2–3 | `storage` quads, quadLight | chunk geometry |
| 2 | 0 | `uniform` material | `TerrainMaterialUniforms`; `anim` drives §63.3 |
| 2 | 1+ | `storage` `animDataPerTex` | animated-texture triplets (animated configs only) |
| 2 | next | `textureAtlas0..N-1` | `texture_2d_array<f32>`, one layer per texture |
| 2 | next | `sampler atlasSampler` | the one sampler `bloxdTexel` uses |
| 3 | 0 | `uniform bloxdPackInputs` | the pack's 64 B per-frame uniform (§56) |
| 3 | 1 | `texture_2d<f32>` scene depth | liquid programs; backs `bloxdOpaqueBehind()` (§51) |
| 3 | 2 | `storage bloxdSpTextureLayers` | the id+rotation table (§63.2) |

Group 3 is the pack's group: three engine-provided slots, none of them nameable by pack code.

## 64. The texture name registry

The engine builds the name catalogue once per session from the block registry — the same pipeline that produced the texture-pack system's `textureNameToIndex`. The builder (module 28833 in the bundle), restored as pseudocode:

```
for each (name, index) in textureNameToIndex:           # e.g. ("lava0", 0), ("radar_screen0[rot[2", 19)
    if name matches /(.*)\[rot\[([1-4])$/ :              # a turned copy slot
        turnedSlot → { id: rootUnturnedId, rotation: N-1 }   # §63.2's table entry
        register alias: name  → root,  kind "rotation"
    else if index is an animation frame (not the base):  # via animDataPerTex
        register alias: name  → base,  kind "frame"
    else:
        canonical name = strip trailing "_?0" if this texture is animated
        named[canonical] = index + 1                     # the bloxdTextureId* value
```

The rules that matter to an author, deduplicated:

1. **Usable names are canonical names**: animation bases drop their frame suffix (`lava0` → `lava`), turned families fold to their root (`chest_top[rot[1..4]` → `chest_top`), and the two folds compose (`radar_screen0[rot[1..4]` → `radar_screen`, because that family is animated as well). Every other file name is itself. The constant spelling then CamelCases the canonical name (§57.3).
2. **Frame and turned aliases are known and error-explained** — using one isn't a "did you mean" guess, it gets the specific frame/turned message (§57.3). This is deliberate API shaping: `bloxdTexel` handles both animation and turning for you, so addressing a frame or a turned copy directly is always the wrong move.
3. **Ambiguity kills the name**: two names that fold to the same case/underscore-insensitive key are both unusable (`could name X and Y ... it can't be used`). Rare, but real — if a name you expect isn't in the §68 catalogue, this is one reason.
4. **The id is 1-based and equals "atlas layer + 1"**; the no-texture id 0 is reserved as white.

Measured on the live registry (build `cnty9`, 2026-10-27, by running the engine's own builder module on the shipped data): **1,219 atlas entries**, folding **57 turned families** (228 turned spellings) and **42 animated families** (188 frame spellings), leaving **905 usable named constants** — the complete list, with per-name ids and both family tables, is embedded as §68 (Part XI). The registry-hash mechanism in §65.1 is what keeps baked `bloxdTextureId*` values from silently going stale as those numbers drift.

## 65. Validation internals v4: HEADER_VERSION, the registry hash, special functions

### 65.1 HEADER_VERSION grows a second hash

The v3 format was `6.<fnv1a32>` over five inputs (§53). v4 keeps the same five inputs — per-variant header tokens, the parser's lexical universe, the four macro names, the special-function map, and the `BloxdPackInputs` declaration — but the prefix moves to `8.` **and a second FNV-1a-32 is appended, hashed over the sorted `"<name> <id>"` list of the entire texture registry**:

```
v2 (sjr0p7):   6.bc5e8338
v3 (3ymzdd):   6.5bc26a63
v4 (cnty9):    8.<header-hash>.<registry-hash>     ← format restored from the bundle
```

(The concrete v4 hashes weren't measured for this guide — they're runtime-computed — but the format is exact, and the v2/v3 values above are the previously published measurements. Any pack settings screen after an engine update shows the current one.)

The consequence is the important part: **a stored pack's saved validation now also invalidates when the texture registry changes** — engine adds textures, renames, re-orders — because your `bloxdTextureId*` comparisons were resolved against the old registry. The "needs re-check" flow that v3 triggered on header edits now has a second, content-driven trigger. Authors don't act on this (the engine re-validates automatically); distributors should just expect it.

### 65.2 Reserved names, again, precisely

The rule is the regex `/^bloxd/i` — **case-insensitive**, so `BloxdFoo` is as reserved as `bloxdFoo`, and `bloxdTextureIdAnything` falls under it even when it names nothing (that's why the misspelt-prefix diagnostic in §57.3 exists as its own message family). The 27-symbol `bloxdSp*` set of §63.4 is the engine-side complement inside generated code.

### 65.3 Special functions: now three

The validator's special-function registry grew from v3's one entry to three — the texture API's two functions registered alongside depth:

```js
[
  ["bloxdOpaqueBehind", { params: "", returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }],
  ["bloxdTexel",        { params: "textureId: u32, uv: vec2f, mipLevel: f32", returns: "vec4f", symbol: null }],
  ["bloxdTextureSize",  { params: "mipLevel: f32", returns: "vec2u", symbol: null }]
]
```

`symbol: null` means "no variant gate" — callable wherever the function exists (surface/light hooks). The two "reaches" diagnostics carry over verbatim, now also covering texture misuse:

> `${hook} reaches ${name}, which only surface and light hooks can use.` — e.g. `bloxdTexel` from a vertex hook.
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — e.g. `bloxdOpaqueBehind()` from terrain hooks without the wrap (unchanged from v3 §53).

### 65.4 What else carries over from v3 §53 unchanged

Hook signature checking (token-exact on types, free on names — the three signature entries are byte-identical to v3's), the `pack_`-prefix renaming with diagnostic mapping, the undeclared-identifier message family, the parser's extra lexical universe (`bufferView`, `bufferArrayView`, `bufferLength`, `atomicStoreMax`, `atomicStoreMin` — still not guaranteed in browsers), and the two-stage validation (built-in parser, then the browser's WGSL compiler — still stricter; §38's lessons hold).

## 66. Confirmed constants, limits, and layouts (v4)

The v4 row of the guide's measurement ledger — everything here measured on `cnty9` (2026-10-26, prod = preprod, byte-identical) unless a date is given:

| Item | Value |
|---|---|
| `apiVersion` | `4` (strict `===`, number) |
| Engine header | 6,021 B / 150 lines; first line `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.` — full text embedded in §67 |
| Hooks | 6 (terrain/liquid × vertex/surface/light); template comment-polished only |
| Variants | 8 (strict × lighting × program); names `strict\|allow.lit\|unlit.terrain\|liquid` |
| Macros | `BLOXD_STRICT` (strict) · `BLOXD_LIGHTING` (lit) · `BLOXD_ALPHA` (all liquid + non-strict terrain) · `BLOXD_SCENE_DEPTH` (all liquid) |
| Pack uniform | `@group(3) @binding(0)`, 64 B: seconds@0, renderOffset@16, sunDirection@32, eyePosition@48 |
| Pack bindings | group 3: 0 uniform · 1 scene depth (liquid) · 2 `bloxdSpTextureLayers` storage |
| blockFlags bits | opaque 1 · emissive 2 · vegetation 4 · dirt 8 · sand 16 · rock 32 (unchanged; §42 name rules carry over) |
| Loader limits | 256 `.wgsl` / 256 KB source / 64 KB `pack.json` / 32 MB zip / 1,024 zip entries; UTF-8; one manifest; unique paths |
| Texture registry | 1,219 entries (measured 2026-10-27, build `cnty9`) → 905 usable names; complete catalogue: §68 (Part XI) |
| Light curve | 0–15 levels → 0–1 on the ease-out curve (`6 → 0.45`, `12 → 0.92`) — in-header, unchanged |
| Lift curve | `1 - (1 - x / (3 - 2x))^3` — unchanged, now in chunk c8 |
| Directional cone | `0.12 / 0.65 / 0.62 / 0.95` — unchanged, now in chunk c8 |
| Fog colour | `vec3f(183/255, 191/255, 195/255)` — unchanged; `fogAlpha` is the v4 name (§59.1) |
| Reserved names | `/^bloxd/i` (case-insensitive) + 27 `bloxdSp*` engine symbols |
| HEADER_VERSION | `8.<fnv1a32(header)>.<fnv1a32(texture registry)>` |
| Strict titles | everything except the 12 allow titles of §30 (re-verified 2026-10-27, unchanged) |


---

[← Previous part](10-apiv4.md)·[Back to the manual](README.md)

# Part XI: Complete reference — the engine header and the texture catalogue

Target build: `cnty9.main.669f8081.js` (measured 2026-10-27; production and preprod byte-identical). This part embeds the two reference artefacts *whole*, so the guide is self-contained: nothing outside this repository is needed to write, validate, or debug a v4 pack. §67 is the exact engine header text — every constant, function, and struct the loader prepends to your WGSL — restored verbatim from the production bundle. §68 is the complete texture-name catalogue: all 905 usable `bloxdTextureId*` names with their measured ids, the 57 turned families, the 42 animated families, and the registry-drift measurement that explains why you should write names and never raw ids.

The catalogue is not an approximation re-derived from the folding rules. It was produced by running the engine's *own* registry-builder module (module 28833, the same code that answers `bloxdTextureId*` lookups at validation time) on the live build's shipped `textureNameToIndex` and `animDataPerTex` data, then recording its output. Every id below is therefore the exact value the live engine resolves today, and every alias behaviour (frame folding, turned folding, the error-explained spellings) is the builder's own classification, not this guide's interpretation of it.

Both artefacts drift with builds, in different ways. The header text changes only when the engine team ships an API change (v4's grew a second registry hash and four input fields; §65.1), while the texture registry is *content* — it moves whenever blocks are added or re-textured, which in October alone meant 98 entries added, 79 removed, and 779 of 1,121 unchanged names changing id (§68.5). After a future build update, re-measure the same way this part did; the structure of what follows is the stable part.

## 67. The complete v4 engine header, verbatim

This is the 6,021-byte, 150-line header the engine prepends to every pack, exactly as shipped in `cnty9` — the same text whose first line opens `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.` (§66). It is reproduced here in full because a pack author should never have to wonder what the engine declares on their behalf: every free function you may call, every `const` you may compare against, and both input structs with all their fields and comments are below, in engine order.

Two things are *not* in this text and never were, because they are generated per renderer configuration at compile time rather than prepended per pack: the `bloxdTexel`/`bloxdTextureSize` pair (§63.1 has the verbatim generated WGSL) and the 27 `bloxdSp*` engine symbols (§63.4). The `#ifdef BLOXD_ALPHA` gate you see in `BloxdSurface` and `bloxdDefaultSurface` is resolved by the engine's own preprocessor per variant — the canonical text keeps the gate, and §59.1/§56 explain which variants define it.

```wgsl

// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.

const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// These functions return 1 value per frame, the same for every call site.

// The camera's render position.
fn bloxdEyePosition() -> vec3f {
    return bloxdPackInputs.eyePosition;
}

// Changes as the player travels, so render positions stay close to 0,0,0.
// Integer distance, in blocks. Render position + this offset = world position.
// See bloxdWorldPosition for how this can be used.
fn bloxdRenderOffset() -> vec3i {
    return bloxdPackInputs.renderOffset;
}

// This unit vector points towards the sun, in world orientation; 0 when no sun.
fn bloxdSunDirection() -> vec3f {
    return bloxdPackInputs.sunDirection;
}

// Seconds since the page loaded. As an f32, it has sub-millisecond precision
// for the first 4.5 hours. Get a recurring timer using bloxdSeconds() % period.
fn bloxdSeconds() -> f32 {
    return bloxdPackInputs.seconds;
}

// Each bit of the binary representation of blockFlags is a flag corresponding
// to a collection of blocks. The collections overlap, so blocks can be in 0-2+.
// (blockFlags & bloxdBlockFlagRock) != 0 // The block has this flag.
// (blockFlags & bloxdBlockFlagRock) == 0 // The block doesn't have this flag.

// Opaque blocks, leaves and ice included. Not glass, water, spawners, etc.
const bloxdBlockFlagOpaque: u32 = 1;

// These blocks emit light, e.g. neon, portals, lamps, lava, and glowing ores.
const bloxdBlockFlagEmissive: u32 = 2;

// 'Leafy', e.g. leaves, and grass blocks. Not cacti, mushroom blocks or hay.
const bloxdBlockFlagVegetation: u32 = 4;

// Dirt and soil, grass blocks included. Rocky Dirt is both dirt and rock.
const bloxdBlockFlagDirt: u32 = 8;

// Sand, Red Sand, and every sandstone, which is rock too.
const bloxdBlockFlagSand: u32 = 16;

// Stone variants, and more, e.g. gravel, ores, sandstone, magma and obsidian.
const bloxdBlockFlagRock: u32 = 32;

// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f {
    return position + vec3f(bloxdRenderOffset());
}

// Using a fragment's position and normal, identify the block's world position.
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i {
    return vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset();
}

struct BloxdVertexIn {
    position: vec3f, // Render position.
    normal: vec3f,   // Unit vector direction pointing away from the face.
    blockFlags: u32, // What kind of block. See bloxdBlockFlag*.
}

struct BloxdVertex {
    position: vec3f, // The render position output.
}

struct BloxdSurfaceIn {
    colour: vec3f,   // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,      // Opacity.
    normal: vec3f,   // Unit vector direction pointing away from the face.
    position: vec3f, // Render position.
    blockFlags: u32, // What kind of block. See bloxdBlockFlag*.

    // These are 0 if the face has no texture.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // Texture coordinates in blocks; fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}

struct BloxdSurface {
    colour: vec3f,   // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,      // Opacity output.
#endif
    emission: vec3f, // Emissive RGB output, added after lighting, before fog.
}

// blockLight, skyLight and heldLight are 0-1, from the 0-15 light levels on an
// ease-out curve, e.g. 6->0.45, 12->0.92. They all exclude ambientLightColour.
struct BloxdLightIn {
    litColour: vec3f,  // RGB surface colour, lit, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 when off.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 without BLOXD_LIGHTING.
    skyLight: f32,     // Sky light; 1 without BLOXD_LIGHTING.
    ambientLightColour: vec3f, // Minimum RGB light; 1 without BLOXD_LIGHTING.
    skyLightColour: vec3f, // RGB colour of skyLight; 1 without BLOXD_LIGHTING.
    heldLight: vec3f,  // 0 without BLOXD_LIGHTING. 0 with no light source held.
    fogColour: vec3f,  // The game's RGB fog colour. 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.
    position: vec3f,   // Render position.
    normal: vec3f,     // Unit vector direction pointing away from the face.
    blockFlags: u32,   // What kind of block. See bloxdBlockFlag*.

    // These are 0 if the face has no texture.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // Texture coordinates in blocks; fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}

struct BloxdLight {
    colour: vec3f, // RGB colour output.
}

struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}

fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return BloxdVertex(vertex.position);
}

fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
#ifdef BLOXD_ALPHA
    return BloxdSurface(surface.colour, surface.alpha, vec3f(0.0));
#else
    return BloxdSurface(surface.colour, vec3f(0.0));
#endif
}

// Applies this fragment's fog to colour, as the engine does.
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}

fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return BloxdLight(bloxdApplyFog(light.litColour + surface.emission, light));
}
```

## 68. The complete texture catalogue (905 names, measured)

### 68.1 How to read it

The **Name** column is the registry name — the handle you actually write. The constant spelling then CamelCases it on `_` and `-` boundaries exactly as §57.3 documents: `grass_top` → `bloxdTextureIdGrassTop`, `lava` → `bloxdTextureIdLava`, `chest_double_top_1_lo` → `bloxdTextureIdChestDoubleTop1Lo`. Names are the API; they survive registry drift because the validator re-resolves them against the live registry at load.

The **id** column is what that constant compares equal to — the atlas layer + 1, measured on `cnty9`. Use it to interpret `surface.textureId` dumps and debug output, and to cross-check a misbehaving pack against today's build. Do not hardcode it in WGSL: it is a snapshot of one build's atlas order (§68.5 shows how fast it moves).

The **Notes** column marks the two folded families. `animated (N frames)` means sampling this name returns the current animation frame automatically — never address a frame suffix (`lava0`, `radar_screen2`), those are known aliases with dedicated diagnostics. `turned (4 rotated copies)` means the texture exists only as pre-rotated atlas slots; the name addresses the root and `bloxdTexel` re-applies the rotation (§57.4). One name carries both notes (`radar_screen`).

What is deliberately *absent*: the other 416 registry spellings — 188 frame aliases and 228 turned aliases — are not usable constants, and the engine explains each with its specific error message family when you try them (§57.3). The 1,219-row layer table behind everything (including the 171 pre-rotated slots) is engine-internal and covered in §63.2/§63.4.

### 68.2 The catalogue

Every usable name, alphabetically. The id column is the `bloxdTextureId*` value — the atlas layer + 1, measured on build `cnty9` (2026-10-27). **Treat ids as a snapshot, names as the API**: between the two October builds measured for this guide, 779 of 1121 unchanged names got a different id (§68.5). The engine resolves names at validation time, so a pack written with names survives registry drift; a pack written with raw ids does not.

| Name | id (cnty9) | Notes |
|---|---|---|
| `alloy_kiln_back` | 1091 |  |
| `alloy_kiln_front` | 1085 |  |
| `alloy_kiln_side` | 1086 |  |
| `alloy_kiln_side_running` | 33 | animated (4 frames) |
| `alloy_kiln_top` | 1087 | turned (4 rotated copies) |
| `andesite_brick` | 465 |  |
| `apple_block_bottom` | 441 |  |
| `apple_block_side` | 439 |  |
| `apple_block_top` | 440 |  |
| `armour_lucky_block` | 995 |  |
| `armour_lucky_block_rare` | 997 |  |
| `armour_lucky_block_super` | 999 |  |
| `artisan_table_side` | 367 |  |
| `artisan_table_top` | 368 |  |
| `ash` | 1031 |  |
| `auto_bench_back` | 1106 |  |
| `auto_bench_front` | 1100 |  |
| `auto_bench_side` | 1101 |  |
| `auto_bench_side_running` | 35 | animated (4 frames) |
| `auto_bench_top` | 1102 | turned (4 rotated copies) |
| `autocrafter_bottom` | 962 |  |
| `autocrafter_lunite_bottom` | 973 |  |
| `autocrafter_lunite_side` | 972 |  |
| `autocrafter_side` | 961 |  |
| `banana_block_side` | 899 |  |
| `banana_block_top` | 900 |  |
| `beacon` | 330 |  |
| `bedrock` | 334 |  |
| `beetroot_block_bottom` | 925 |  |
| `beetroot_block_side` | 923 |  |
| `beetroot_block_top` | 924 |  |
| `belt_drop_side` | 1185 |  |
| `belt_drop_top` | 1184 |  |
| `belt_lift_side` | 1183 |  |
| `belt_lift_top` | 1182 |  |
| `belt_loader_slab_front` | 1110 |  |
| `belt_loader_top` | 1109 |  |
| `belt_tunnel_back` | 1199 |  |
| `belt_tunnel_exit_top` | 1200 | turned (4 rotated copies) |
| `belt_tunnel_mouth` | 1193 |  |
| `belt_tunnel_side` | 1194 |  |
| `belt_tunnel_top` | 1195 | turned (4 rotated copies) |
| `black_concrete` | 273 |  |
| `black_glazed_terracotta` | 429 | turned (4 rotated copies) |
| `black_planks` | 366 |  |
| `black_portal` | 2 | animated (4 frames) |
| `black_spawn_block_side` | 760 |  |
| `black_spawn_block_top` | 756 | turned (4 rotated copies) |
| `block_destroyer_tnt_side` | 1017 |  |
| `block_destroyer_tnt_top` | 1018 |  |
| `blue_concrete` | 274 |  |
| `blue_gen_spawn_coal` | 774 |  |
| `blue_gen_spawn_iron` | 775 |  |
| `blue_gen_spawn_top` | 773 |  |
| `blue_glazed_terracotta` | 413 | turned (4 rotated copies) |
| `blue_lucky_block` | 994 |  |
| `blue_lucky_block_rare` | 996 |  |
| `blue_lucky_block_super` | 998 |  |
| `blue_planks` | 362 |  |
| `blue_portal` | 3 | animated (4 frames) |
| `blue_spawn_block_side` | 755 |  |
| `blue_spawn_block_top` | 751 | turned (4 rotated copies) |
| `bone_block_side` | 818 |  |
| `bone_block_top` | 819 |  |
| `bookshelf` | 564 |  |
| `bookshelf_1` | 566 |  |
| `bookshelf_2` | 567 |  |
| `bookshelf_3` | 568 |  |
| `bookshelf_4` | 569 |  |
| `bookshelf_5` | 570 |  |
| `bookshelf_empty` | 565 |  |
| `bouncy_bomb_block` | 591 |  |
| `bowling_alley_floor` | 978 |  |
| `bread_block_back` | 435 |  |
| `bread_block_front` | 434 |  |
| `bread_block_side` | 436 |  |
| `bread_block_top` | 437 |  |
| `brick` | 315 |  |
| `brown_concrete` | 275 |  |
| `brown_glazed_terracotta` | 417 | turned (4 rotated copies) |
| `brown_mushroom_block` | 536 |  |
| `brown_planks` | 363 |  |
| `brown_portal` | 4 | animated (4 frames) |
| `brown_spawn_block_side` | 750 |  |
| `brown_spawn_block_top` | 746 | turned (4 rotated copies) |
| `building_lucky_block` | 989 |  |
| `building_lucky_block_rare` | 991 |  |
| `building_lucky_block_super` | 993 |  |
| `burner_drill_back` | 1048 |  |
| `burner_drill_bottom` | 1047 |  |
| `burner_drill_front` | 1041 |  |
| `burner_drill_side` | 1042 |  |
| `burner_drill_side_running` | 27 | animated (4 frames) |
| `burner_drill_top` | 1043 | turned (4 rotated copies) |
| `cactus_dry` | 350 |  |
| `cactus_top` | 349 |  |
| `carrot_block_bottom` | 921 |  |
| `carrot_block_side` | 919 |  |
| `carrot_block_top` | 920 |  |
| `carved_messy_stone` | 827 |  |
| `carved_pumpkin` | 543 |  |
| `chalk` | 839 |  |
| `chalk_black` | 855 |  |
| `chalk_blue` | 854 |  |
| `chalk_bricks_black` | 871 |  |
| `chalk_bricks_blue` | 870 |  |
| `chalk_bricks_brown` | 869 |  |
| `chalk_bricks_cyan` | 868 |  |
| `chalk_bricks_gray` | 867 |  |
| `chalk_bricks_green` | 866 |  |
| `chalk_bricks_light_blue` | 865 |  |
| `chalk_bricks_light_gray` | 864 |  |
| `chalk_bricks_lime` | 863 |  |
| `chalk_bricks_magenta` | 862 |  |
| `chalk_bricks_orange` | 861 |  |
| `chalk_bricks_pink` | 860 |  |
| `chalk_bricks_purple` | 859 |  |
| `chalk_bricks_red` | 858 |  |
| `chalk_bricks_slab_side_black` | 887 |  |
| `chalk_bricks_slab_side_blue` | 886 |  |
| `chalk_bricks_slab_side_brown` | 885 |  |
| `chalk_bricks_slab_side_cyan` | 884 |  |
| `chalk_bricks_slab_side_gray` | 883 |  |
| `chalk_bricks_slab_side_green` | 882 |  |
| `chalk_bricks_slab_side_light_blue` | 881 |  |
| `chalk_bricks_slab_side_light_gray` | 880 |  |
| `chalk_bricks_slab_side_lime` | 879 |  |
| `chalk_bricks_slab_side_magenta` | 878 |  |
| `chalk_bricks_slab_side_orange` | 877 |  |
| `chalk_bricks_slab_side_pink` | 876 |  |
| `chalk_bricks_slab_side_purple` | 875 |  |
| `chalk_bricks_slab_side_red` | 874 |  |
| `chalk_bricks_slab_side_white` | 873 |  |
| `chalk_bricks_slab_side_yellow` | 872 |  |
| `chalk_bricks_white` | 857 |  |
| `chalk_bricks_yellow` | 856 |  |
| `chalk_brown` | 853 |  |
| `chalk_cyan` | 852 |  |
| `chalk_gray` | 851 |  |
| `chalk_green` | 850 |  |
| `chalk_light_blue` | 849 |  |
| `chalk_light_gray` | 848 |  |
| `chalk_lime` | 847 |  |
| `chalk_magenta` | 846 |  |
| `chalk_orange` | 845 |  |
| `chalk_pink` | 844 |  |
| `chalk_purple` | 843 |  |
| `chalk_red` | 842 |  |
| `chalk_white` | 841 |  |
| `chalk_yellow` | 840 |  |
| `charge_vault_side` | 1114 |  |
| `charge_vault_top` | 1113 |  |
| `charging_pad_side` | 1159 |  |
| `charging_pad_top` | 1158 |  |
| `checkpoint_block` | 761 | turned (4 rotated copies) |
| `cherry_block_bottom` | 590 |  |
| `cherry_block_side` | 588 |  |
| `cherry_block_top` | 589 |  |
| `chest_back` | 347 |  |
| `chest_double_back_hi` | 1219 |  |
| `chest_double_back_lo` | 1218 |  |
| `chest_double_front_hi` | 1213 |  |
| `chest_double_front_lo` | 1212 |  |
| `chest_double_top_1_hi` | 1215 |  |
| `chest_double_top_1_lo` | 1214 |  |
| `chest_double_top_2_hi` | 1217 |  |
| `chest_double_top_2_lo` | 1216 |  |
| `chest_front` | 341 |  |
| `chest_side` | 342 |  |
| `chest_top` | 343 | turned (4 rotated copies) |
| `chili_pepper_block_bottom` | 678 |  |
| `chili_pepper_block_side` | 676 |  |
| `chili_pepper_block_top` | 677 |  |
| `chiseled_red_sandstone` | 456 |  |
| `chiseled_sandstone` | 325 |  |
| `clay` | 195 |  |
| `coal_block` | 233 |  |
| `coal_deposit` | 1032 |  |
| `coal_ore` | 227 |  |
| `coarse_dirt` | 191 |  |
| `coconut_block_bottom` | 522 |  |
| `coconut_block_side` | 520 |  |
| `coconut_block_top` | 521 |  |
| `code_block` | 679 |  |
| `comet_heart` | 1170 |  |
| `comet_ore` | 1169 |  |
| `compressed_messy_stone` | 530 |  |
| `conveyor_belt_bottom` | 1081 |  |
| `conveyor_belt_slab_side` | 1080 |  |
| `conveyor_belt_top` | 1079 |  |
| `conveyor_belt_turn_left` | 1171 |  |
| `conveyor_belt_turn_right` | 1172 |  |
| `copper_deposit` | 1035 |  |
| `copper_ore` | 1040 |  |
| `corn_block_bottom` | 594 |  |
| `corn_block_side` | 592 |  |
| `corn_block_top` | 593 |  |
| `crafting_table_side` | 338 |  |
| `crafting_table_top` | 339 |  |
| `crate` | 918 |  |
| `crop_harvester_back` | 1192 |  |
| `crop_harvester_back_running` | 45 | animated (4 frames) |
| `crop_harvester_front` | 1186 |  |
| `crop_harvester_side` | 1187 |  |
| `crop_harvester_side_running` | 44 | animated (4 frames) |
| `crop_harvester_top` | 1188 | turned (4 rotated copies) |
| `crusher_back` | 1055 |  |
| `crusher_front` | 1049 |  |
| `crusher_side` | 1050 |  |
| `crusher_side_running` | 28 | animated (4 frames) |
| `crusher_top` | 1051 | turned (4 rotated copies) |
| `crystal_block` | 1029 |  |
| `crystal_vat_back` | 1166 |  |
| `crystal_vat_front` | 1160 |  |
| `crystal_vat_side` | 1161 |  |
| `crystal_vat_side_running` | 42 | animated (4 frames) |
| `crystal_vat_top` | 1162 | turned (4 rotated copies) |
| `custom_lobby_block_side` | 769 |  |
| `custom_lobby_block_top` | 765 | turned (4 rotated copies) |
| `cut_red_sandstone` | 457 |  |
| `cut_sandstone` | 453 |  |
| `cyan_concrete` | 276 |  |
| `cyan_gen_spawn_coal` | 783 |  |
| `cyan_gen_spawn_iron` | 784 |  |
| `cyan_gen_spawn_top` | 782 |  |
| `cyan_glazed_terracotta` | 405 | turned (4 rotated copies) |
| `cyan_planks` | 360 |  |
| `cyan_portal` | 5 | animated (4 frames) |
| `cyan_spawn_block_side` | 745 |  |
| `cyan_spawn_block_top` | 741 | turned (4 rotated copies) |
| `dark_green_bricks` | 460 |  |
| `darkstone` | 1206 |  |
| `darkstone_bricks` | 1207 |  |
| `darkstone_bricks_cracked` | 1208 |  |
| `darkstone_bricks_lava` | 1209 |  |
| `darkstone_engraved` | 1210 |  |
| `darkstone_smooth` | 1211 |  |
| `deep_drill_back` | 1140 |  |
| `deep_drill_bottom` | 1139 |  |
| `deep_drill_front` | 1133 |  |
| `deep_drill_side` | 1134 |  |
| `deep_drill_side_running` | 39 | animated (4 frames) |
| `deep_drill_top` | 1135 | turned (4 rotated copies) |
| `diamond_block` | 340 |  |
| `diamond_gen_spawn_side` | 807 |  |
| `diamond_gen_spawn_top` | 806 |  |
| `diamond_ore` | 232 |  |
| `diorite_brick` | 463 |  |
| `dirt` | 190 |  |
| `drop_location_block_side` | 814 |  |
| `drop_location_block_top` | 813 |  |
| `drop_pad` | 1038 |  |
| `dry_grass_block` | 980 |  |
| `dry_grass_block_side` | 979 |  |
| `electric_drill_back` | 1099 |  |
| `electric_drill_bottom` | 1098 |  |
| `electric_drill_front` | 1092 |  |
| `electric_drill_side` | 1093 |  |
| `electric_drill_side_running` | 34 | animated (4 frames) |
| `electric_drill_top` | 1094 | turned (4 rotated copies) |
| `emerald_block` | 237 |  |
| `emerald_ore` | 231 |  |
| `end_stone` | 226 |  |
| `engraved_andesite` | 464 |  |
| `engraved_diorite` | 462 |  |
| `engraved_granite` | 466 |  |
| `evil_lucky_block` | 1022 |  |
| `evil_lucky_block_face` | 1023 |  |
| `explosive_paint_black_side` | 626 |  |
| `explosive_paint_black_top` | 627 |  |
| `explosive_paint_blue_side` | 624 |  |
| `explosive_paint_blue_top` | 625 |  |
| `explosive_paint_brown_side` | 622 |  |
| `explosive_paint_brown_top` | 623 |  |
| `explosive_paint_cyan_side` | 620 |  |
| `explosive_paint_cyan_top` | 621 |  |
| `explosive_paint_gray_side` | 618 |  |
| `explosive_paint_gray_top` | 619 |  |
| `explosive_paint_green_side` | 616 |  |
| `explosive_paint_green_top` | 617 |  |
| `explosive_paint_light_blue_side` | 614 |  |
| `explosive_paint_light_blue_top` | 615 |  |
| `explosive_paint_light_gray_side` | 612 |  |
| `explosive_paint_light_gray_top` | 613 |  |
| `explosive_paint_lime_side` | 610 |  |
| `explosive_paint_lime_top` | 611 |  |
| `explosive_paint_magenta_side` | 608 |  |
| `explosive_paint_magenta_top` | 609 |  |
| `explosive_paint_orange_side` | 606 |  |
| `explosive_paint_orange_top` | 607 |  |
| `explosive_paint_pink_side` | 604 |  |
| `explosive_paint_pink_top` | 605 |  |
| `explosive_paint_purple_side` | 602 |  |
| `explosive_paint_purple_top` | 603 |  |
| `explosive_paint_quick_black` | 643 |  |
| `explosive_paint_quick_blue` | 642 |  |
| `explosive_paint_quick_brown` | 641 |  |
| `explosive_paint_quick_cyan` | 640 |  |
| `explosive_paint_quick_gray` | 639 |  |
| `explosive_paint_quick_green` | 638 |  |
| `explosive_paint_quick_light_blue` | 637 |  |
| `explosive_paint_quick_light_gray` | 636 |  |
| `explosive_paint_quick_lime` | 635 |  |
| `explosive_paint_quick_magenta` | 634 |  |
| `explosive_paint_quick_orange` | 633 |  |
| `explosive_paint_quick_pink` | 632 |  |
| `explosive_paint_quick_purple` | 631 |  |
| `explosive_paint_quick_red` | 630 |  |
| `explosive_paint_quick_white` | 629 |  |
| `explosive_paint_quick_yellow` | 628 |  |
| `explosive_paint_red_side` | 600 |  |
| `explosive_paint_red_top` | 601 |  |
| `explosive_paint_seeking_black` | 659 |  |
| `explosive_paint_seeking_blue` | 658 |  |
| `explosive_paint_seeking_brown` | 657 |  |
| `explosive_paint_seeking_cyan` | 656 |  |
| `explosive_paint_seeking_gray` | 655 |  |
| `explosive_paint_seeking_green` | 654 |  |
| `explosive_paint_seeking_light_blue` | 653 |  |
| `explosive_paint_seeking_light_gray` | 652 |  |
| `explosive_paint_seeking_lime` | 651 |  |
| `explosive_paint_seeking_magenta` | 650 |  |
| `explosive_paint_seeking_orange` | 649 |  |
| `explosive_paint_seeking_pink` | 648 |  |
| `explosive_paint_seeking_purple` | 647 |  |
| `explosive_paint_seeking_red` | 646 |  |
| `explosive_paint_seeking_white` | 645 |  |
| `explosive_paint_seeking_yellow` | 644 |  |
| `explosive_paint_sticky_black` | 675 |  |
| `explosive_paint_sticky_blue` | 674 |  |
| `explosive_paint_sticky_brown` | 673 |  |
| `explosive_paint_sticky_cyan` | 672 |  |
| `explosive_paint_sticky_gray` | 671 |  |
| `explosive_paint_sticky_green` | 670 |  |
| `explosive_paint_sticky_light_blue` | 669 |  |
| `explosive_paint_sticky_light_gray` | 668 |  |
| `explosive_paint_sticky_lime` | 667 |  |
| `explosive_paint_sticky_magenta` | 666 |  |
| `explosive_paint_sticky_orange` | 665 |  |
| `explosive_paint_sticky_pink` | 664 |  |
| `explosive_paint_sticky_purple` | 663 |  |
| `explosive_paint_sticky_red` | 662 |  |
| `explosive_paint_sticky_white` | 661 |  |
| `explosive_paint_sticky_yellow` | 660 |  |
| `explosive_paint_white_side` | 598 |  |
| `explosive_paint_white_top` | 599 |  |
| `explosive_paint_yellow_side` | 596 |  |
| `explosive_paint_yellow_top` | 597 |  |
| `extra_compressed_messy_stone` | 531 |  |
| `fallen_cherry_leaves_side` | 586 |  |
| `fallen_maple_leaves_side` | 478 |  |
| `farmland` | 433 |  |
| `fast_belt_slab_side` | 1157 |  |
| `fast_belt_top` | 1156 |  |
| `fast_belt_turn_left` | 1173 |  |
| `fast_belt_turn_right` | 1174 |  |
| `fertilised_soil` | 926 |  |
| `finish_block` | 812 |  |
| `fireball_block` | 539 |  |
| `food_lucky_block` | 1007 |  |
| `food_lucky_block_rare` | 1009 |  |
| `food_lucky_block_super` | 1011 |  |
| `forge_hopper_top` | 1168 |  |
| `furnace_front` | 335 |  |
| `furnace_side` | 336 |  |
| `furnace_top` | 337 |  |
| `generator_side` | 1063 |  |
| `generator_side_running` | 30 | animated (4 frames) |
| `generator_top` | 1064 |  |
| `ghost_chest_back` | 956 |  |
| `ghost_chest_front` | 953 |  |
| `ghost_chest_side` | 954 |  |
| `ghost_chest_top` | 955 |  |
| `ghost_lucky_block` | 957 |  |
| `ghost_mystery_block` | 958 |  |
| `glass` | 294 |  |
| `glass_black` | 295 |  |
| `glass_blue` | 296 |  |
| `glass_brown` | 297 |  |
| `glass_cyan` | 298 |  |
| `glass_gray` | 299 |  |
| `glass_green` | 301 |  |
| `glass_light_blue` | 302 |  |
| `glass_light_gray` | 300 |  |
| `glass_lime` | 303 |  |
| `glass_magenta` | 304 |  |
| `glass_orange` | 305 |  |
| `glass_pink` | 306 |  |
| `glass_purple` | 307 |  |
| `glass_red` | 308 |  |
| `glass_silver` | 311 |  |
| `glass_white` | 309 |  |
| `glass_yellow` | 310 |  |
| `glowstone` | 331 |  |
| `gold_block` | 235 |  |
| `gold_deposit` | 1036 |  |
| `gold_ore` | 229 |  |
| `granite_brick` | 467 |  |
| `grass_block_side` | 192 |  |
| `grass_top` | 193 |  |
| `gravel` | 196 |  |
| `gray_concrete` | 271 |  |
| `gray_gen_spawn_coal` | 792 |  |
| `gray_gen_spawn_iron` | 793 |  |
| `gray_gen_spawn_top` | 791 |  |
| `gray_glazed_terracotta` | 397 | turned (4 rotated copies) |
| `gray_planks` | 358 |  |
| `gray_portal` | 6 | animated (4 frames) |
| `gray_spawn_block_side` | 740 |  |
| `gray_spawn_block_top` | 736 | turned (4 rotated copies) |
| `green_bricks` | 459 |  |
| `green_concrete` | 285 |  |
| `green_glazed_terracotta` | 421 | turned (4 rotated copies) |
| `green_lucky_block` | 1006 |  |
| `green_lucky_block_rare` | 1008 |  |
| `green_lucky_block_super` | 1010 |  |
| `green_planks` | 364 |  |
| `green_portal` | 7 | animated (4 frames) |
| `green_spawn_block_side` | 735 |  |
| `green_spawn_block_top` | 731 | turned (4 rotated copies) |
| `green_stone` | 458 |  |
| `grenade_block` | 581 |  |
| `grey_portal` | 8 | animated (4 frames) |
| `gun_lucky_block` | 952 |  |
| `hardened_clay` | 254 |  |
| `hardened_clay_stained_black` | 270 |  |
| `hardened_clay_stained_blue` | 266 |  |
| `hardened_clay_stained_brown` | 267 |  |
| `hardened_clay_stained_cyan` | 264 |  |
| `hardened_clay_stained_gray` | 262 |  |
| `hardened_clay_stained_green` | 268 |  |
| `hardened_clay_stained_light_blue` | 258 |  |
| `hardened_clay_stained_lime` | 260 |  |
| `hardened_clay_stained_magenta` | 257 |  |
| `hardened_clay_stained_orange` | 256 |  |
| `hardened_clay_stained_pink` | 261 |  |
| `hardened_clay_stained_purple` | 265 |  |
| `hardened_clay_stained_red` | 269 |  |
| `hardened_clay_stained_silver` | 263 |  |
| `hardened_clay_stained_white` | 255 |  |
| `hardened_clay_stained_yellow` | 259 |  |
| `harvester_bottom` | 969 |  |
| `harvester_lunite_bottom` | 977 |  |
| `harvester_lunite_side_0` | 974 |  |
| `harvester_lunite_side_1` | 975 |  |
| `harvester_lunite_top` | 976 |  |
| `harvester_side0` | 966 |  |
| `harvester_side1` | 967 |  |
| `harvester_top` | 968 |  |
| `hay_block_side` | 328 |  |
| `homestead_core` | 1037 |  |
| `homestead_core_cap` | 1122 |  |
| `homestead_core_crown` | 1121 |  |
| `homestead_core_mid` | 26 | animated (4 frames) |
| `hyper_compressed_messy_stone` | 533 |  |
| `ice` | 326 |  |
| `ice_brick` | 468 |  |
| `iceball_block` | 540 |  |
| `invisible_solid` | 314 |  |
| `iron_block` | 234 |  |
| `iron_chest_back` | 917 |  |
| `iron_chest_front` | 911 |  |
| `iron_chest_side` | 912 |  |
| `iron_chest_top` | 913 | turned (4 rotated copies) |
| `iron_deposit` | 1033 |  |
| `iron_ore` | 228 |  |
| `iron_watermelon_side` | 546 |  |
| `iron_watermelon_top` | 547 |  |
| `jungle_grass_block` | 889 |  |
| `jungle_grass_block_side` | 888 |  |
| `lapis_block` | 236 |  |
| `lapis_ore` | 230 |  |
| `lava` | 1 | animated (8 frames) |
| `leather_block_side` | 908 |  |
| `leather_block_top` | 909 |  |
| `leaves_aspen` | 288 |  |
| `leaves_aspen_autumn` | 910 |  |
| `leaves_cedar` | 470 |  |
| `leaves_cherry` | 585 |  |
| `leaves_cherry_fruity` | 906 |  |
| `leaves_jungle` | 290 |  |
| `leaves_mango` | 894 |  |
| `leaves_mango_fruity` | 907 |  |
| `leaves_maple` | 289 |  |
| `leaves_maple_autumn` | 477 |  |
| `leaves_maple_fruity` | 901 |  |
| `leaves_palm` | 471 |  |
| `leaves_palm_fruity` | 904 |  |
| `leaves_pear` | 525 |  |
| `leaves_pear_fruity` | 905 |  |
| `leaves_pine` | 287 |  |
| `leaves_pine_cone` | 902 |  |
| `leaves_plum` | 469 |  |
| `leaves_plum_fruity` | 903 |  |
| `leaves_spectral` | 831 |  |
| `light_blue_concrete` | 277 |  |
| `light_blue_glazed_terracotta` | 381 | turned (4 rotated copies) |
| `light_blue_lucky_block` | 933 |  |
| `light_blue_planks` | 354 |  |
| `light_blue_spawn_block_side` | 730 |  |
| `light_blue_spawn_block_top` | 726 | turned (4 rotated copies) |
| `light_gray_concrete` | 272 |  |
| `light_gray_glazed_terracotta` | 401 | turned (4 rotated copies) |
| `light_gray_planks` | 359 |  |
| `light_gray_spawn_block_side` | 725 |  |
| `light_gray_spawn_block_top` | 721 | turned (4 rotated copies) |
| `lightblue_portal` | 9 | animated (4 frames) |
| `lightgray_portal` | 10 | animated (4 frames) |
| `lime_concrete` | 278 |  |
| `lime_gen_spawn_coal` | 777 |  |
| `lime_gen_spawn_iron` | 778 |  |
| `lime_gen_spawn_top` | 776 |  |
| `lime_glazed_terracotta` | 389 | turned (4 rotated copies) |
| `lime_planks` | 356 |  |
| `lime_portal` | 11 | animated (4 frames) |
| `lime_spawn_block_side` | 720 |  |
| `lime_spawn_block_top` | 716 | turned (4 rotated copies) |
| `log_ancient_maple` | 1021 |  |
| `log_aspen` | 202 |  |
| `log_cedar` | 201 |  |
| `log_cherry` | 582 |  |
| `log_jungle` | 203 |  |
| `log_mango` | 891 |  |
| `log_maple` | 198 |  |
| `log_palm` | 472 |  |
| `log_pear` | 523 |  |
| `log_pine` | 199 |  |
| `log_plum` | 200 |  |
| `log_spectral` | 828 |  |
| `lucky_block_pink_question` | 959 |  |
| `lucky_block_pink_question_rare` | 1013 |  |
| `lucky_block_pink_question_super` | 1015 |  |
| `lunite_block` | 971 |  |
| `lunite_ore` | 970 |  |
| `machine_bench_side` | 1115 |  |
| `machine_bench_top` | 1116 |  |
| `machine_side` | 1039 |  |
| `magenta_concrete` | 279 |  |
| `magenta_glazed_terracotta` | 377 | turned (4 rotated copies) |
| `magenta_planks` | 353 |  |
| `magenta_portal` | 12 | animated (4 frames) |
| `magenta_spawn_block_side` | 715 |  |
| `magenta_spawn_block_top` | 711 | turned (4 rotated copies) |
| `magma` | 451 |  |
| `mailbox_front` | 571 |  |
| `mailbox_front_full` | 573 |  |
| `mailbox_side` | 572 |  |
| `mango_block_bottom` | 898 |  |
| `mango_block_side` | 896 |  |
| `mango_block_top` | 897 |  |
| `mega_compressed_messy_stone` | 535 |  |
| `melon_side` | 544 |  |
| `melon_top` | 545 |  |
| `melting_ice` | 595 |  |
| `messy_stone` | 216 |  |
| `mob_spawner_block_empty_side` | 823 |  |
| `mob_spawner_block_top` | 821 |  |
| `mob_spawner_hostile_block_side` | 822 |  |
| `mob_spawner_neutral_block_side` | 838 |  |
| `mob_spawner_passive_block_side` | 820 |  |
| `moonstone_block` | 450 |  |
| `moonstone_chest_back` | 449 |  |
| `moonstone_chest_front` | 443 |  |
| `moonstone_chest_side` | 444 |  |
| `moonstone_chest_top` | 445 | turned (4 rotated copies) |
| `moonstone_explosive_side` | 332 |  |
| `moonstone_explosive_top` | 333 |  |
| `moonstone_gen_spawn_side` | 809 |  |
| `moonstone_gen_spawn_top` | 808 |  |
| `moonstone_ore` | 442 |  |
| `mossy_cobblestone` | 438 |  |
| `mushroom_stem` | 538 |  |
| `mystery_block` | 578 |  |
| `neon_black` | 951 |  |
| `neon_blue` | 950 |  |
| `neon_brown` | 949 |  |
| `neon_cyan` | 948 |  |
| `neon_gray` | 947 |  |
| `neon_green` | 946 |  |
| `neon_light_blue` | 945 |  |
| `neon_light_gray` | 944 |  |
| `neon_lime` | 943 |  |
| `neon_magenta` | 942 |  |
| `neon_orange` | 941 |  |
| `neon_pink` | 940 |  |
| `neon_purple` | 939 |  |
| `neon_red` | 938 |  |
| `neon_white` | 937 |  |
| `neon_yellow` | 936 |  |
| `nether_brick` | 317 |  |
| `netherrack` | 318 |  |
| `obby_absorb_block` | 816 |  |
| `obby_absorb_death_block` | 817 |  |
| `obby_death_block` | 815 |  |
| `obsidian` | 327 |  |
| `orange_concrete` | 280 |  |
| `orange_glazed_terracotta` | 373 | turned (4 rotated copies) |
| `orange_lucky_block` | 1000 |  |
| `orange_lucky_block_rare` | 1002 |  |
| `orange_lucky_block_super` | 1004 |  |
| `orange_planks` | 352 |  |
| `orange_portal` | 13 | animated (4 frames) |
| `orange_spawn_block_side` | 710 |  |
| `orange_spawn_block_top` | 706 | turned (4 rotated copies) |
| `ore_gen_spawn_side` | 811 |  |
| `ore_gen_spawn_top` | 810 |  |
| `packed_snow` | 826 |  |
| `parts_bench_side` | 1117 |  |
| `parts_bench_top` | 1118 |  |
| `patterned_glass_black` | 548 |  |
| `patterned_glass_blue` | 549 |  |
| `patterned_glass_brown` | 550 |  |
| `patterned_glass_cyan` | 551 |  |
| `patterned_glass_gray` | 552 |  |
| `patterned_glass_green` | 554 |  |
| `patterned_glass_light_blue` | 555 |  |
| `patterned_glass_light_gray` | 553 |  |
| `patterned_glass_lime` | 556 |  |
| `patterned_glass_magenta` | 557 |  |
| `patterned_glass_orange` | 558 |  |
| `patterned_glass_pink` | 559 |  |
| `patterned_glass_purple` | 560 |  |
| `patterned_glass_red` | 561 |  |
| `patterned_glass_white` | 562 |  |
| `patterned_glass_yellow` | 563 |  |
| `pear_block_bottom` | 529 |  |
| `pear_block_side` | 527 |  |
| `pear_block_top` | 528 |  |
| `pet_lucky_block` | 960 |  |
| `pine_cone_block_side` | 836 |  |
| `pine_cone_block_top` | 837 |  |
| `pine_grass_block` | 834 |  |
| `pine_grass_block_side` | 833 |  |
| `pink_concrete` | 281 |  |
| `pink_gen_spawn_coal` | 789 |  |
| `pink_gen_spawn_iron` | 790 |  |
| `pink_gen_spawn_top` | 788 |  |
| `pink_glazed_terracotta` | 393 | turned (4 rotated copies) |
| `pink_planks` | 357 |  |
| `pink_portal` | 14 | animated (4 frames) |
| `pink_spawn_block_side` | 705 |  |
| `pink_spawn_block_top` | 701 | turned (4 rotated copies) |
| `planks_aspen` | 205 |  |
| `planks_cedar` | 209 |  |
| `planks_cherry` | 584 |  |
| `planks_jungle` | 207 |  |
| `planks_mango` | 893 |  |
| `planks_maple` | 204 |  |
| `planks_palm` | 473 |  |
| `planks_pear` | 524 |  |
| `planks_pine` | 208 |  |
| `planks_plum` | 206 |  |
| `planks_spectral` | 830 |  |
| `plum_block_bottom` | 519 |  |
| `plum_block_side` | 517 |  |
| `plum_block_top` | 518 |  |
| `podzol_top` | 452 |  |
| `potato_block` | 922 |  |
| `potion_lucky_block` | 1012 |  |
| `potion_lucky_block_rare` | 1014 |  |
| `potion_lucky_block_super` | 1016 |  |
| `press_back` | 1071 |  |
| `press_front` | 1065 |  |
| `press_side` | 1066 |  |
| `press_side_running` | 31 | animated (4 frames) |
| `press_top` | 1067 | turned (4 rotated copies) |
| `protector` | 348 |  |
| `protector_faction` | 575 |  |
| `protector_tribe` | 574 |  |
| `pumpkin_face_on` | 291 |  |
| `pumpkin_side` | 541 |  |
| `pumpkin_top` | 542 |  |
| `pure_coal_ore` | 1024 |  |
| `pure_copper_ore` | 1204 |  |
| `pure_diamond_ore` | 1027 |  |
| `pure_gold_ore` | 1026 |  |
| `pure_iron_ore` | 1025 |  |
| `pure_moonstone_ore` | 1028 |  |
| `pure_voltite_ore` | 1205 |  |
| `purple_concrete` | 282 |  |
| `purple_glazed_terracotta` | 409 | turned (4 rotated copies) |
| `purple_lucky_block` | 988 |  |
| `purple_lucky_block_rare` | 990 |  |
| `purple_lucky_block_super` | 992 |  |
| `purple_planks` | 361 |  |
| `purple_portal` | 15 | animated (4 frames) |
| `purple_spawn_block_side` | 700 |  |
| `purple_spawn_block_top` | 696 | turned (4 rotated copies) |
| `quartz_block_chiseled` | 320 |  |
| `quartz_block_side` | 319 |  |
| `radar_bottom` | 929 |  |
| `radar_screen` | 19 | animated (4 frames) · turned (4 rotated copies) |
| `radar_side_active` | 927 |  |
| `radar_side_inactive` | 930 |  |
| `radar_top_active` | 928 |  |
| `radar_top_inactive` | 931 |  |
| `recycler_back` | 1181 |  |
| `recycler_front` | 1175 |  |
| `recycler_side` | 1176 |  |
| `recycler_side_running` | 43 | animated (4 frames) |
| `recycler_top` | 1177 | turned (4 rotated copies) |
| `red_concrete` | 283 |  |
| `red_gen_spawn_coal` | 771 |  |
| `red_gen_spawn_iron` | 772 |  |
| `red_gen_spawn_top` | 770 |  |
| `red_glazed_terracotta` | 425 | turned (4 rotated copies) |
| `red_lucky_block` | 934 |  |
| `red_lucky_block_rare` | 984 |  |
| `red_lucky_block_super` | 986 |  |
| `red_mushroom_block` | 537 |  |
| `red_planks` | 365 |  |
| `red_portal` | 16 | animated (4 frames) |
| `red_sand` | 474 |  |
| `red_sandstone` | 454 |  |
| `red_sandstone_brick` | 475 |  |
| `red_sandstone_top` | 455 |  |
| `red_spawn_block_side` | 695 |  |
| `red_spawn_block_top` | 691 | turned (4 rotated copies) |
| `redstone_lamp_off` | 313 |  |
| `redstone_lamp_on` | 312 |  |
| `rocket_block` | 579 |  |
| `rocky_dirt` | 476 |  |
| `rope_block` | 1030 |  |
| `sand` | 194 |  |
| `sandstone_brick` | 461 |  |
| `sandstone_normal` | 225 |  |
| `sandstone_top` | 324 |  |
| `shatter_mill_back` | 1147 |  |
| `shatter_mill_front` | 1141 |  |
| `shatter_mill_side` | 1142 |  |
| `shatter_mill_side_running` | 40 | animated (4 frames) |
| `shatter_mill_top` | 1143 | turned (4 rotated copies) |
| `shop_trader_spawn_face` | 799 |  |
| `shop_trader_spawn_side` | 798 |  |
| `shop_trader_spawn_top` | 794 | turned (4 rotated copies) |
| `shop_wizard_spawn_face` | 805 |  |
| `shop_wizard_spawn_side` | 804 |  |
| `shop_wizard_spawn_top` | 800 | turned (4 rotated copies) |
| `sky_tap_back` | 1155 |  |
| `sky_tap_bottom` | 1154 |  |
| `sky_tap_front` | 1148 |  |
| `sky_tap_side` | 1149 |  |
| `sky_tap_side_running` | 41 | animated (4 frames) |
| `sky_tap_top` | 1150 | turned (4 rotated copies) |
| `slab_andesite_brick_side` | 498 |  |
| `slab_aspen_side` | 483 |  |
| `slab_brick_side` | 515 |  |
| `slab_cedar_side` | 482 |  |
| `slab_cherry_side` | 587 |  |
| `slab_chiseled_red_sandstone_side` | 512 |  |
| `slab_chiseled_sandstone_side` | 508 |  |
| `slab_cobblestone_side` | 488 |  |
| `slab_cut_red_sandstone_side` | 513 |  |
| `slab_cut_sandstone_side` | 509 |  |
| `slab_diorite_brick_side` | 502 |  |
| `slab_dirt_side` | 486 |  |
| `slab_dry_grass_top_side` | 981 |  |
| `slab_engraved_andesite_side` | 497 |  |
| `slab_engraved_diorite_side` | 501 |  |
| `slab_engraved_granite_side` | 505 |  |
| `slab_granite_brick_side` | 506 |  |
| `slab_grass_top_side` | 487 |  |
| `slab_ice_brick_side` | 516 |  |
| `slab_jungle_grass_top_side` | 890 |  |
| `slab_jungle_side` | 484 |  |
| `slab_mango_side` | 895 |  |
| `slab_maple_side` | 479 |  |
| `slab_mossy_cobblestone_side` | 493 |  |
| `slab_palm_side` | 485 |  |
| `slab_pear_side` | 526 |  |
| `slab_pine_grass_top_side` | 835 |  |
| `slab_pine_side` | 480 |  |
| `slab_plum_side` | 481 |  |
| `slab_red_sandstone_brick_side` | 514 |  |
| `slab_red_sandstone_side` | 511 |  |
| `slab_sandstone_brick_side` | 510 |  |
| `slab_sandstone_normal_side` | 507 |  |
| `slab_smooth_stone_side` | 490 |  |
| `slab_spectral_side` | 832 |  |
| `slab_stone_andesite_side` | 495 |  |
| `slab_stone_andesite_smooth_side` | 496 |  |
| `slab_stone_diorite_side` | 499 |  |
| `slab_stone_diorite_smooth_side` | 500 |  |
| `slab_stone_granite_side` | 503 |  |
| `slab_stone_granite_smooth_side` | 504 |  |
| `slab_stone_side` | 489 |  |
| `slab_stonebrick_carved_side` | 491 |  |
| `slab_stonebrick_mossy_side` | 494 |  |
| `slab_stonebrick_side` | 492 |  |
| `smelter_back` | 1062 |  |
| `smelter_front` | 1056 |  |
| `smelter_side` | 1057 |  |
| `smelter_side_running` | 29 | animated (4 frames) |
| `smelter_top` | 1058 | turned (4 rotated copies) |
| `smoke` | 23 | animated (4 frames) |
| `smooth_stone` | 218 |  |
| `snow` | 197 |  |
| `snowy_messy_stone` | 824 |  |
| `snowy_messy_stone_side` | 825 |  |
| `solar_panel_bottom` | 965 |  |
| `solar_panel_side` | 963 |  |
| `solar_panel_top` | 964 |  |
| `sorting_gate_slab_side` | 1108 |  |
| `sorting_gate_top` | 1107 |  |
| `splitter_slab_side` | 1083 |  |
| `splitter_top` | 1082 |  |
| `sponge` | 329 |  |
| `starframe` | 1167 |  |
| `stone` | 217 |  |
| `stone_andesite` | 221 |  |
| `stone_andesite_smooth` | 222 |  |
| `stone_deposit` | 1034 |  |
| `stone_diorite` | 219 |  |
| `stone_diorite_smooth` | 220 |  |
| `stone_granite` | 223 |  |
| `stone_granite_smooth` | 224 |  |
| `stonebrick` | 316 |  |
| `stonebrick_carved` | 321 |  |
| `stonebrick_cracked` | 323 |  |
| `stonebrick_mossy` | 322 |  |
| `storage_silo_side` | 1112 |  |
| `storage_silo_top` | 1111 |  |
| `stripped_aspen_log` | 211 |  |
| `stripped_cedar_log` | 215 |  |
| `stripped_cherry_log` | 583 |  |
| `stripped_jungle_log` | 213 |  |
| `stripped_mango_log` | 892 |  |
| `stripped_maple_log` | 210 |  |
| `stripped_palm_log` | 576 |  |
| `stripped_pear_log` | 577 |  |
| `stripped_pine_log` | 214 |  |
| `stripped_plum_log` | 212 |  |
| `stripped_spectral_log` | 829 |  |
| `super_compressed_messy_stone` | 532 |  |
| `super_rocket_block` | 580 |  |
| `tool_bench_side` | 1119 |  |
| `tool_bench_top` | 1120 |  |
| `tools_lucky_block` | 1001 |  |
| `tools_lucky_block_rare` | 1003 |  |
| `tools_lucky_block_super` | 1005 |  |
| `toxic_waste` | 25 | animated (8 frames) |
| `toxic_waste_barrel_bottom` | 1020 |  |
| `toxic_waste_barrel_side` | 1019 |  |
| `toxic_waste_barrel_top` | 24 | animated (4 frames) |
| `toxin_ball_block` | 680 |  |
| `tree_cutter_back` | 1129 |  |
| `tree_cutter_back_running` | 37 | animated (4 frames) |
| `tree_cutter_front` | 1123 |  |
| `tree_cutter_side` | 1124 |  |
| `tree_cutter_side_running` | 36 | animated (4 frames) |
| `tree_cutter_top` | 1125 | turned (4 rotated copies) |
| `ultra_compressed_messy_stone` | 534 |  |
| `unloaded` | 189 |  |
| `volt_engine_side` | 1131 |  |
| `volt_engine_side_running` | 38 | animated (4 frames) |
| `volt_engine_top` | 1132 |  |
| `voltite_deposit` | 1130 |  |
| `voltite_ore` | 1084 |  |
| `watermelon_side` | 292 |  |
| `watermelon_top` | 293 |  |
| `weapon_lucky_block` | 935 |  |
| `weapon_lucky_block_rare` | 985 |  |
| `weapon_lucky_block_super` | 987 |  |
| `white_concrete` | 284 |  |
| `white_gen_spawn_coal` | 786 |  |
| `white_gen_spawn_iron` | 787 |  |
| `white_gen_spawn_top` | 785 |  |
| `white_glazed_terracotta` | 369 | turned (4 rotated copies) |
| `white_planks` | 351 |  |
| `white_portal` | 17 | animated (4 frames) |
| `white_spawn_block_side` | 690 |  |
| `white_spawn_block_top` | 686 | turned (4 rotated copies) |
| `wire_mill_back` | 1078 |  |
| `wire_mill_front` | 1072 |  |
| `wire_mill_side` | 1073 |  |
| `wire_mill_side_running` | 32 | animated (4 frames) |
| `wire_mill_top` | 1074 | turned (4 rotated copies) |
| `wool_colored_black` | 253 |  |
| `wool_colored_blue` | 249 |  |
| `wool_colored_brown` | 250 |  |
| `wool_colored_cyan` | 247 |  |
| `wool_colored_gray` | 245 |  |
| `wool_colored_green` | 251 |  |
| `wool_colored_light_blue` | 241 |  |
| `wool_colored_light_grey` | 246 |  |
| `wool_colored_lime` | 243 |  |
| `wool_colored_magenta` | 240 |  |
| `wool_colored_orange` | 239 |  |
| `wool_colored_pink` | 244 |  |
| `wool_colored_purple` | 248 |  |
| `wool_colored_red` | 252 |  |
| `wool_colored_white` | 238 |  |
| `wool_colored_yellow` | 242 |  |
| `yellow_concrete` | 286 |  |
| `yellow_gen_spawn_coal` | 780 |  |
| `yellow_gen_spawn_iron` | 781 |  |
| `yellow_gen_spawn_top` | 779 |  |
| `yellow_glazed_terracotta` | 385 | turned (4 rotated copies) |
| `yellow_lucky_block` | 932 |  |
| `yellow_lucky_block_rare` | 982 |  |
| `yellow_lucky_block_super` | 983 |  |
| `yellow_planks` | 355 |  |
| `yellow_portal` | 18 | animated (4 frames) |
| `yellow_spawn_block_side` | 685 |  |
| `yellow_spawn_block_top` | 681 | turned (4 rotated copies) |

### 68.3 Turned families (57 roots)

These textures exist only as pre-rotated copies (`name[rot[1..4`). The registry folds them to the root below; `bloxdTexel` re-applies the rotation when sampling (§57.4), so you address the root and never the copies. Aliasing one of the `[rot[N` spellings gets the dedicated turned-name diagnostic (§57.3).

- `alloy_kiln_top` (id 1087)
- `auto_bench_top` (id 1102)
- `belt_tunnel_exit_top` (id 1200)
- `belt_tunnel_top` (id 1195)
- `black_glazed_terracotta` (id 429)
- `black_spawn_block_top` (id 756)
- `blue_glazed_terracotta` (id 413)
- `blue_spawn_block_top` (id 751)
- `brown_glazed_terracotta` (id 417)
- `brown_spawn_block_top` (id 746)
- `burner_drill_top` (id 1043)
- `checkpoint_block` (id 761)
- `chest_top` (id 343)
- `crop_harvester_top` (id 1188)
- `crusher_top` (id 1051)
- `crystal_vat_top` (id 1162)
- `custom_lobby_block_top` (id 765)
- `cyan_glazed_terracotta` (id 405)
- `cyan_spawn_block_top` (id 741)
- `deep_drill_top` (id 1135)
- `electric_drill_top` (id 1094)
- `gray_glazed_terracotta` (id 397)
- `gray_spawn_block_top` (id 736)
- `green_glazed_terracotta` (id 421)
- `green_spawn_block_top` (id 731)
- `iron_chest_top` (id 913)
- `light_blue_glazed_terracotta` (id 381)
- `light_blue_spawn_block_top` (id 726)
- `light_gray_glazed_terracotta` (id 401)
- `light_gray_spawn_block_top` (id 721)
- `lime_glazed_terracotta` (id 389)
- `lime_spawn_block_top` (id 716)
- `magenta_glazed_terracotta` (id 377)
- `magenta_spawn_block_top` (id 711)
- `moonstone_chest_top` (id 445)
- `orange_glazed_terracotta` (id 373)
- `orange_spawn_block_top` (id 706)
- `pink_glazed_terracotta` (id 393)
- `pink_spawn_block_top` (id 701)
- `press_top` (id 1067)
- `purple_glazed_terracotta` (id 409)
- `purple_spawn_block_top` (id 696)
- `radar_screen0` (id 19) · also animated
- `recycler_top` (id 1177)
- `red_glazed_terracotta` (id 425)
- `red_spawn_block_top` (id 691)
- `shatter_mill_top` (id 1143)
- `shop_trader_spawn_top` (id 794)
- `shop_wizard_spawn_top` (id 800)
- `sky_tap_top` (id 1150)
- `smelter_top` (id 1058)
- `tree_cutter_top` (id 1125)
- `white_glazed_terracotta` (id 369)
- `white_spawn_block_top` (id 686)
- `wire_mill_top` (id 1074)
- `yellow_glazed_terracotta` (id 385)
- `yellow_spawn_block_top` (id 681)

### 68.4 Animated families (42 names)

Sampling one of these names returns the current animation frame automatically (§63.3's frame ladder). The engine advances frames per-texture at its own interval, so packs never address a frame suffix (`lava0` is an error; `lava` is the name).

| Name | Frames | Registry base |
|---|---|---|
| `lava` | 8 | `lava0` |
| `toxic_waste` | 8 | `toxic_waste0` |
| `alloy_kiln_side_running` | 4 | `alloy_kiln_side_running0` |
| `auto_bench_side_running` | 4 | `auto_bench_side_running0` |
| `black_portal` | 4 | `black_portal0` |
| `blue_portal` | 4 | `blue_portal0` |
| `brown_portal` | 4 | `brown_portal0` |
| `burner_drill_side_running` | 4 | `burner_drill_side_running0` |
| `crop_harvester_back_running` | 4 | `crop_harvester_back_running0` |
| `crop_harvester_side_running` | 4 | `crop_harvester_side_running0` |
| `crusher_side_running` | 4 | `crusher_side_running0` |
| `crystal_vat_side_running` | 4 | `crystal_vat_side_running0` |
| `cyan_portal` | 4 | `cyan_portal0` |
| `deep_drill_side_running` | 4 | `deep_drill_side_running0` |
| `electric_drill_side_running` | 4 | `electric_drill_side_running0` |
| `generator_side_running` | 4 | `generator_side_running0` |
| `gray_portal` | 4 | `gray_portal0` |
| `green_portal` | 4 | `green_portal0` |
| `grey_portal` | 4 | `grey_portal0` |
| `homestead_core_mid` | 4 | `homestead_core_mid0` |
| `lightblue_portal` | 4 | `lightblue_portal0` |
| `lightgray_portal` | 4 | `lightgray_portal0` |
| `lime_portal` | 4 | `lime_portal0` |
| `magenta_portal` | 4 | `magenta_portal0` |
| `orange_portal` | 4 | `orange_portal0` |
| `pink_portal` | 4 | `pink_portal0` |
| `press_side_running` | 4 | `press_side_running0` |
| `purple_portal` | 4 | `purple_portal0` |
| `radar_screen` | 4 | `radar_screen0[rot[1` |
| `recycler_side_running` | 4 | `recycler_side_running0` |
| `red_portal` | 4 | `red_portal0` |
| `shatter_mill_side_running` | 4 | `shatter_mill_side_running0` |
| `sky_tap_side_running` | 4 | `sky_tap_side_running0` |
| `smelter_side_running` | 4 | `smelter_side_running0` |
| `smoke` | 4 | `smoke0` |
| `toxic_waste_barrel_top` | 4 | `toxic_waste_barrel_top0` |
| `tree_cutter_back_running` | 4 | `tree_cutter_back_running0` |
| `tree_cutter_side_running` | 4 | `tree_cutter_side_running0` |
| `volt_engine_side_running` | 4 | `volt_engine_side_running0` |
| `white_portal` | 4 | `white_portal0` |
| `wire_mill_side_running` | 4 | `wire_mill_side_running0` |
| `yellow_portal` | 4 | `yellow_portal0` |

### 68.5 Registry drift, measured (sjr0p7 → cnty9)

The registry is content shipped with the build, so it drifts with block updates. The two builds this guide measured (2026-10-17 and 2026-10-27, ten days apart) show exactly how fast:

- Entries: 1200 → 1219 (98 added, 79 removed)
- Names that kept their spelling: 1121 — of which **779 changed id** (69%)
- A naming convention migrated mid-month: 68 `_rot1..4` suffix names (e.g. `chest_top_rot1`) became `[rot[1..4` slots (e.g. `chest_top[rot[1`), and the double-chest textures (`chest_double_*`, 8 entries) appeared with them
- The usable-name count moved 900 → 905, and the registry hash in `HEADER_VERSION` (§65.1) re-invalidated every saved pack that had baked ids

That last point is the operational lesson: **write `bloxdTextureIdLava`, not `19`** — a name-constant survives every one of those bullets unchanged, because the validator re-resolves it against the live registry at load.

[← Previous part](10-apiv4.md)·[Back to the manual](README.md)

---

Researched by ltf_ahel (researched with glm)
