# How to Make Bloxd.io Shader Packs (Complete Guide)

A self-contained guide to creating and distributing shader packs for Bloxd.io (WebGPU renderer only).
Based on the spec at `apiVersion: 1`. Includes a recipe collection and API reference, so you can go from zero to distribution with this single file.

> This is an unofficial guide and does not represent the views of the developers. The API may change without notice.
> Last reviewed: 2026-10-15. Since no public official WGSL API reference could be found, keep verifying API descriptions and recipes against the loader screen and in-game compilation.
> The shader pack feature itself is an official feature accessible from the in-game UI, and packs are pure WGSL
> (no JS execution or networking), so nothing dangerous happens with normal code.

## Contents

- [Part I: Making packs](#part-i-making-packs)
- [Part II: API reference](#part-ii-api-reference)
- [Part III: Recipe collection](#part-iii-recipe-collection)
- [Part IV: Realism guide](#part-iv-realism-guide)
- [Part V: Troubleshooting & notes](#part-v-troubleshooting--notes)
- [Part VI: Important implementation notes](#part-vi-important-implementation-notes)

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
  "apiVersion": 1,
  "name": "My Pack",
  "author": "your name"
}
```

| Field | Required | Description |
|---|---|---|
| `apiVersion` | required | Must match `1` exactly |
| `name` | required | Must not be empty. Shown in the settings UI |
| `author` | optional | May be omitted. Non-string values (numbers etc.) are errors |

Other fields are ignored.

## 5. Minimal template

A working pack with just `pack.json` (section 4) and this `pack.wgsl`:

```wgsl
// Minimal pack with a slight warm tint
const packWarmth = 0.18;

fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

Rules to follow:

- Never **construct output structs directly** (`bloxd_Surface(...)` is an error). Always start from `bloxd_defaultSurface(s)` / `bloxd_defaultLight(s, l)` / `bloxd_defaultVertex(v)` and modify fields
- Hook parameters are **read-only**. To change them, copy first, e.g. `var sv = s;`
- You cannot use the `bloxd_` prefix for your own identifiers (except the 6 hook names)
- Write constants with `const` (`#define` cannot hold values)

## 6. The 6 hooks

All optional. Signatures must match exactly in types (parameter names are free).

| Hook | Role |
|---|---|
| `fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex` | Terrain vertex animation. **Not available in strict mode** |
| `fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface` | Terrain color, transparency, emission. `s.colour` is texture × vertex color |
| `fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light` | Terrain final color. Called at the **final stage of the fragment**, and its return value becomes the final color as-is |
| `fn bloxd_liquid_vertex / _surface / _light` (same shapes) | Liquid versions. `alpha` acts as liquid transparency |

Fallback rules:

- If a liquid hook is undefined, **the terrain hook of the same name is used** (not vice versa). Writing only surface applies the same effect to liquids
- If no light hook is defined, the default behavior (`engineColour + emission × fogFactor`) is used
- If you discard `engineColour` and rebuild from the base color, re-apply fog yourself: `mix(l.fogColour, col, l.fogFactor)`. When adding emission, multiply it by `fogFactor` first

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
- Coordinates are noa-local. Add `originOffset` for world coordinates. Block coordinates are `vec3i(floor(position - normal * 0.5)) + originOffset`

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
// Engine-provided and read-only to packs. apiVersion 1.
struct bloxd_VertexIn {
    position: vec3f,     // noa-local world space (world minus originOffset)
    normal: vec3f,
    originOffset: vec3i, // whole blocks
    time: f32,           // seconds, wrapped every 3600 s (part of the API)
}

#ifndef BLOXD_STRICT
struct bloxd_Vertex {
    position: vec3f,     // noa-local
}
#endif

struct bloxd_SurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher in v1)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    originOffset: vec3i, // a face's world block is vec3i(floor(position - normal * 0.5)) + originOffset
    eyePosition: vec3f,  // noa-local
    time: f32,
    sunDirection: vec3f, // unit, towards the sun, in world orientation; zero when the sky has no sun
}

struct bloxd_Surface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct bloxd_LightIn {
    engineColour: vec3f, // the engine's result for this fragment, from the surface hook's colour
    directional: f32,    // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,      // the material's ambient times the scene's
#ifdef BLOXD_LIGHTING
    blockLight: vec3f,   // voxel block light, tone-mapped
    skyLight: f32,       // voxel sky light, tone-mapped
    ambientLightColour: vec3f,
    skyLightColour: vec3f,
    heldLight: vec3f,    // held light here, tone-mapped like blockLight, before the ambient boost; 0 out of reach
#endif
    fogColour: vec3f,
    fogFactor: f32,      // 1 = no fog, 0 = fully fogged
    position: vec3f,     // as in bloxd_SurfaceIn
    normal: vec3f,
    originOffset: vec3i,
    eyePosition: vec3f,
    time: f32,
    sunDirection: vec3f,
}

struct bloxd_Light {
    colour: vec3f,
}

#ifndef BLOXD_STRICT
fn bloxd_defaultVertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    return bloxd_Vertex(v.position);
}
#endif

fn bloxd_defaultSurface(s: bloxd_SurfaceIn) -> bloxd_Surface {
#ifdef BLOXD_ALPHA
    return bloxd_Surface(s.colour, s.alpha, vec3f(0.0));
#else
    return bloxd_Surface(s.colour, vec3f(0.0));
#endif
}

fn bloxd_defaultLight(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    return bloxd_Light(l.engineColour + s.emission * l.fogFactor);
}
```

Key points:

- `time` wraps every 3600 seconds and is elapsed time. It is not guaranteed to sync with the in-game day/night clock.
- `sunDirection` is a unit vector only while a sun exists; zero when the sky has no sun. Moon direction data is not part of this API's inputs, so it cannot be reused as the moon direction when zero.
- `emission` is added after the lighting calculation, then fogged
- A uniform called `bloxd_packInputs` exists inside the engine, but **packs cannot reference it directly**. Use values via hook input fields (`s.time` etc.)
- **`skyLight` / `blockLight` / `heldLight` arrive after a "lift curve"**. The `tone-mapped` in the header comments refers to this: the engine always applies `y = 1-(1-x/(3-2x))³` (an S-curve lifting dark areas) to fragments before handing them to packs. Values are not raw voxel values (n/15); e.g. under a tree (raw 0.87) arrives lifted to **0.97**
- `skyLight` is essentially voxel occlusion data of "whether sky is visible from here" (= a shadow map), not just a brightness parameter (see section 15, "The truth about shadows")

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

Header struct shapes also change per variant (no `bloxd_Vertex` in strict, no `blockLight` etc. unlit, no `alpha` in strict terrain).

## 12. Skeleton cheat sheet

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);          // direct construction is prohibited; always start from default
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // terrain only has alpha in allow
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);         // engineColour + emission*fogFactor
    #ifdef BLOXD_LIGHTING                       // guard lighting-only inputs
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex always with this guard
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    out.position.y += sin(v.time) * 0.05;
    return out;
}
#endif
```

Five things to always keep in mind: compile clean in all 8 variants / strict games are the majority / no textures / hook parameters are read-only / no `let` at module scope.

---

# Part III: Recipe collection

> **Important:** the recipes below are individual examples, not meant to be concatenated top to bottom. Pasting multiple definitions of the same hook name (`bloxd_terrain_light` etc.) or the same helper function name causes duplicate definitions in one module and fails compilation. To combine effects, merge them into one function per hook type.

## R1. Color recipes (surface)

### Single tint (most basic)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
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
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldY = s.position.y + f32(s.originOffset.y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 1..0 over height 0..50
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Paint by face direction (up = bright, walls = dark)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
    // add 0..0.35 of custom fog from 64 to 192 blocks
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### Night (skyLight-driven blue shift + lamp protection)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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

> In this API, `sunDirection` is zero when the sky has no sun. There is no moon direction data, so moon-facing surfaces cannot be identified. This is not directional moonlight — just a faint blue ambient added when the sky is dark.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 at horizon / 0 overhead
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### Full engine-output replacement (simplest relighting)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    #ifdef BLOXD_LIGHTING
    // NOTE: direct bloxd_Light(...) construction is prohibited; rewrite colour from default
    var out = bloxd_defaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // discard engineColour (the engine lighting result) and use "base color × self-computed brightness"
    out.colour = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    return out;
    #else
    return bloxd_defaultLight(s, l);
    #endif
}
```

## R3. Emission recipes

> `emission` is added after the lighting calculation, then fogged. Multiply distant glow by `fogFactor` yourself.

### Pulsing lamps (breathing torches)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(l.time * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### Glowing-ore look (bright materials emit)

```wgsl
// surface side: the brighter (whiter) the material, the more emission
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### Firefly-swarm look (drifting light points over time)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let world = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    // a few "light orbs" drifting slowly; glow by inverse distance
    let t = l.time * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(l.time * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. Coordinate recipes (world / block / view)

### World coordinates

```wgsl
let worldPos = s.position + vec3f(f32(s.originOffset.x), f32(s.originOffset.y), f32(s.originOffset.z));
```

### Block coordinates

```wgsl
let worldBlock = vec3i(floor(l.position - l.normal * 0.5)) + l.originOffset;
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
let viewDir = normalize(l.eyePosition - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### View angle (fresnel look — for liquids)

```wgsl
let viewDir = normalize(s.eyePosition - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 head-on / 0 grazing
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. Time recipes (animation)

> `time` wraps every 3600 seconds (1 hour). Note this is shader elapsed time and is not guaranteed to sync with the in-game sun/day-night. Use it for visual periodic animation, but prefer `sunDirection` and lighting inputs for actual night detection.

### Day-night cycle (1 day per hour)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let day = 0.5 + 0.5 * sin(l.time * 6.2831853 / 3600.0);   // 0..1 one-hour period; not necessarily synced with in-game day/night
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
fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldX = s.position.x + f32(s.originOffset.x);
    let worldZ = s.position.z + f32(s.originOffset.z);
    let ripple = sin(s.time * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid always has BLOXD_ALPHA — guard kept as habit
    #endif
    return out;
}
```

### Pseudo depth-based transparency by height (not a real shallows test)

> Scene depth and the water bottom position cannot be referenced, so true water depth cannot be computed with this API alone. `s.position.y` is a local coordinate, so using it raw shifts the effect as the chunk origin changes. The following only varies alpha by world height — a pseudo effect, not shoreline/bottom-aware shallows. Adjust `packWaterReferenceY` to your world height.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldY = s.position.y + f32(s.originOffset.y);
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
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
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
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let sway = sin(v.time * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // vertical faces only
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### Liquid surface waves (top faces only)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_liquid_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + v.time * 1.6) * 0.5
              + sin(v.position.z * 1.2 + v.time * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### Breathing terrain

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let pulse = sin(v.time * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // slight expand/contract along normals
    return out;
}
#endif
```

### Rolling terrain (giant sine waves)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + v.time * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - v.time * 0.7) * 0.3;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    out.colour = s.colour * voxel;
    #endif
    return out;
}
```

### R9.2 Sun specular (Blinn-Phong)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // faint edge brightness
    #endif
    return out;
}
```

### R9.4 Hemisphere ambient (sky above / ground bounce below)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // below: bounce
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // above: skylight
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    out.colour = s.colour * voxel * hemi;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = exposure
    return out;
}
```

### R9.6 Aerial perspective ("atmosphere" via distance desaturation)

> Unlike fog (color replacement), layering "distance desaturation" makes distant views much more realistic.
> Caution: only reduce saturation — never touch luminance.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
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
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, l.time), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(l.eyePosition - l.position);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // in-block local coords
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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

> Setting a floor like `max(l.fogFactor, 0.25)` caps "no denser than this"
> (0.0 = engine-accurate / 0.3–0.5 = clearer distance).
> Note the engine fog is a horizon-only linear fog (near render distance only); mid-distance haze must be built pack-side.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogFactor, 0.15));  // fog redo (0.15 = light floor)
    col += s.emission * l.fogFactor;            // emission also fogged
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 Cinema grade (cool shadows / warm highlights / night desaturation)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. restore raw values (skipping this never yields shadows)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. threshold cut — cleanly separates sunlit=1 / shadow=0
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // sun Lambert (fall back to l.directional when there is no sun)
    let sunLen = length(l.sunDirection);
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), l.sunDirection / sunLen), 0.0, 1.0),
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
    col = mix(l.fogColour, col, max(l.fogFactor, 0.15));
    out.colour = clamp(col, vec3f(0.0), vec3f(1.0));
    #endif
    return out;
}
```

> Tuning guide: **shadow area is set by `shTh` alone** — `0.93` = radius 1.5+ / `0.87` = radius 2 / `0.80` = radius 3 / `0.67` = radius 5.
> Edge hardness is `shSoft` (0.02 = hard / 0.08 = soft). Shadow core darkness is the two-point shift of `0.09` (minimum ambient) and `0.16` (sky scatter).
> To widen shadows at dusk, add `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (long-dusk-shadow approximation.
> `sunDir` is `l.sunDirection / length(l.sunDirection)`). For bluer shadows raise the B of `vec3f(0.72, 0.82, 1.05)`.
>
> ⚠️ "Deepen contrast with `pow(skyLight, γ)`" **applied gamma to lifted values** and never affected under-tree areas (0.97). Use this method instead.

---

# Part IV: Realism guide

## 13. Engine default lighting and headroom for realism

Engine default lighting is "multiplication only" — no specular, fresnel, warm/cool separation, or hemisphere ambient exists. The following can be rebuilt:

| Feature | Default | Buildable in packs? |
|---|---|---|
| Diffuse (Lambert) | Scalar sum of directional lights only | ◎ Custom with `sunDirection` (wrapped falloff etc.) |
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

1. **Re-apply fog**: the light hook runs post-fog, so apply `mix(l.fogColour, col, l.fogFactor)` yourself (R9.10). When fog is too dense, floor it with `max(l.fogFactor, 0.3)`. Conversely, mixing more fog color onto engineColour-based packs double-fogs into white distance
2. **Unlit fallback**: pass through to `defaultLight` outside `#ifdef BLOXD_LIGHTING`
3. **Guard whole shared functions**: wrap shared functions taking `bloxd_LightIn` in `#ifdef BLOXD_LIGHTING` as entire functions (guarding only call sites is not enough)
4. **When there is no sun direction**: if `sunDirection` is zero, don't compute directional specular. `l.directional` is a light-amount scalar, not a direction vector, so it cannot restore highlight direction. Switch to weak directionless ambient as needed

## 15. Unreachable looks (the realism "ceiling")

| Look | Reason |
|---|---|
| Pixel-accurate shadow maps (sun-tracking shadows, penumbra) | Depth textures cannot be referenced. Light-ray occlusion is not fed into hooks |
| SSAO | No scene-depth access (only mesher-baked vertex AO) |
| SSR (reflections) | Same. Only pseudo looks blending sky color via fresnel |
| Bloom / glare | No hook into post-processing |
| Depth of field, chromatic aberration, grain | Full-screen post-processing required |
| Volumetric light (god rays) | Same |
| PBR textures | Texture reads prohibited. Only pseudo estimation from color luminance |
| Underwater refraction | No scene-depth input |
| Underwater detection / veil removal | No field indicates camera submersion; the blue veil is outside hook pipelines (fullscreen quad + underwater skybox), so it can be neither detected nor removed |

### The truth about shadows — "tree shadows" are buildable

Only **sun-tracking pixel-accurate shadow maps** are impossible in the table above. The engine already computes "shadows" from the start, and that is `skyLight`. The mesh-side LightEngine runs a Minecraft-style algorithm:

1. **Column scan**: scan each (x,z) column top to bottom. Light from the sky starts at 15, becomes **0 at opaque blocks**, dimming down with `lightFilter` (air 1 / water 3 / opaque 15)
2. **BFS flood fill**: spreads sideways to 6 neighbors (-1 per block) — this is what softens shadow edges. Raw value under radius-r occlusion is (15-r)/15
3. blockLight (torches etc.) is a separate BFS of RGB 3 channels (4bit packed)

So `l.skyLight` is not a mere brightness parameter but **voxel-resolution occlusion data of "whether sky is visible from here" = a shadow map**. Under trees, under roofs, and indoors it is already numerically low, arriving smoothed by vertex interpolation. Placing/breaking blocks recalculates immediately = **real-time-tracking shadows**. Vanilla only uses it "gently" via `mix(ambient, sky, skyLight)`.

The right tools are R9.12's two steps (**restore raw values via lift inversion → binarize with threshold `smoothstep`**. `th = 1 - r/15` directly dials "occlusion radius treated as shadow") plus **gating direct sun by sky** (sun only reaches where sky is visible = the essence of projection), composed with warm sunlit / cool shadow tinting.

**Honest limits**: these shadows are "upward sky" based, so **they don't rotate as the sun moves over time**. Resolution is per block (soft edges come from BFS spread). The engine lighting template still contains a closed `var shadow: f32 = 1.;` stub for shadow maps (always 1.0 = disabled) — interpreted as a trace of "planned" pixel-accurate rotating shadows. If pixel-accurate rotating shadows are a must, only out-of-API approaches remain (e.g. userscript GLSL injection, with policy risk).

## 16. Debugging tips

- Caves too bright → missing nonlinear `skyLight` curve (R2 cave recipe / R9.9)
- Blown-out days → lower pre-ACES exposure
- Nights too dark to see → secure minimum ambient (night `skyLightColour` is nearly black by premise)
- Over-hazed distance → lower aerial coefficients
- Torch surroundings all orange → lower the warm blend ratio (keep some raw tinted light)
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
| `blockLight` reported undefined | Wrap in `#ifdef BLOXD_LIGHTING`. Wrap shared helper functions **as whole functions** |
| `Packs can't construct bloxd_Surface directly` | Start from `bloxd_defaultSurface(s)` |
| `bloxd_Vertex only exists when BLOXD_STRICT isn't defined` | Wrap in `#ifndef BLOXD_STRICT` |
| White hazy distance | Often double fogging. The finished color is already fogged, so keep custom haze subtle and prefer saturation-only reduction |
| Pack excluded when joining a game | Failing the in-game live compile check. Re-check guard omissions |
| `pack.json needs "apiVersion": 1.` | Missing `apiVersion`. Add numeric `1` (string `"1"` is rejected) |
| `There's no pack.json at the top of the pack.` | No `pack.json` at the ZIP root. Check you didn't zip the folder itself |
| `bloxd_terrain_vertex must be declared as: fn ...` | Signature mismatch. Rewrite exactly as shown |
| `bloxd_terrain_vertex can't run in strict games...` | Wrap the vertex hook in `#ifndef BLOXD_STRICT` |
| `bloxd_LightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | Wrap in `#ifdef BLOXD_LIGHTING` |
| Raising `pow(l.skyLight, γ)` never deepens shadows | `skyLight` is a post-lift-curve value (raw 0.87 arrives as 0.97). Switch to R9.12 lift inversion + threshold cut (section 10) |

## 18. Rights and notes

- The shader pack feature itself is an official feature loadable from the in-game UI, and creating packs is considered intended use. But no public official documentation has been confirmed
- Packs are pure WGSL — JS execution and network access are impossible by design
- This is an unofficial guide, not the developers' official position. The API may change without notice

---

# Part VI: Important implementation notes

## 19. Fixing "shadows dark but surfaces bright" at night

Darkening only shadows leaves the engine finished color (`engineColour`) bright when there is no sun, making the face/shadow gap unnatural. Decay the whole finished color instead.

The example below treats zero `sunDirection` as night and directional sun as day, decaying terrain finished colors at dark hours. Where `blockLight` and `heldLight` are strong, decay weakens to preserve nearby lamps like torches. `0.52` is a tuning value — lower it for darker nights.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
    out.colour = l.engineColour * scale + s.emission * l.fogFactor;
    return out;
}
```

**Limits of this fix:** if `sunDirection` behaves as "unit direction with sun, zero without", day/night can be told apart but dusk/twilight cannot be smoothly estimated. And since it decays the finished color, it weakens engine daylight and ambient together — not a full time-of-day reproduction. To apply the same to liquids, check the liquid hook fallback relationship.

## 20. Integrated recipe for natural-looking water

This API cannot sample scene color, depth, or water-bottom depth, so this is **pseudo styling with fresnel-style color blending and sun highlights, not real reflection/refraction/diving-depth math**. The sample below keeps the base color, blends slightly toward a sky-like color at grazing view angles, and adds a small glint only when the sun exists.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, l.time), topness));
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
- Want real scenery reflections: this API's inputs have no screen color or scene depth, so blending colors never becomes real reflection.

This recipe **replaces** an existing `bloxd_liquid_light`. Don't paste it alongside R9.7's same-named wave function or other same-named hooks.

## 21. In-game test checklist

Compile success and "good looks" are different things. Check in this order:

1. **Loading:** `pack.json` is at the ZIP root; settings show `Ready to use`.
2. **8 variants:** no type-guard omissions across strict / allow, lighting on / off, terrain / liquid. Even if a game only uses some conditions, distribution packs should assume all 8.
3. **Daytime:** no blown colors per material (grass, stone, sand, wood); natural bright/dark split between tops and sides.
4. **Night:** compare same materials in former daylight, shadows, and near torches. If only lit faces remain, tune exposure decay; if everything is dark, tune local-light protection.
5. **Water:** look from above, grazing angles, shores, underwater, and night separately. Alpha behavior and underwater looks depend on the game's compositing — never judge from one viewpoint.
6. **Borders and distance:** no popping waves/patterns at chunk / origin transitions; no double fog or white haze in the distance.
7. **Performance:** effects heavy on per-fragment hash/trig/`pow` calls should be minimal. Add detail gradually and compare FPS.

### Known constraints as premises

- Shader packs are limited to terrain / liquid hooks — no same-code handling of sky, entities, or UI.
- No inputs exist for adding shadow maps, screen-space reflections, scene depth, refraction, bloom, etc.
- `time` is animation time with no guaranteed link to in-game day/night.
- Zero `sunDirection` means true moon direction is unknown. Blue-ambient additions are mood approximations, not "moonlight physics".
- `s.position` / `l.position` are local coordinates, so add `originOffset` for world-dependent effects. For in-block-local patterns, local coordinates are intentionally the tool.

## 22. Combining with other packs when shaders alone hit limits

Since shader packs cannot add or sample textures, don't try to solve fine material bumpiness or sky image changes with shaders alone. The public texture-pack repository for Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) handles textures, skybox, models, etc. through a different system.

For reference, community "cinematic shader" distributions analyzed in one case turned out to be texture packs (128x128 textures with no `pack.json` / `.wgsl`).

In practice, **tune light and color with shaders, and cover materials and sky with a matching resource pack**. But verify co-use and load order against the game's implementation and settings.

---

Researched by ltf_ahel (researched with glm)
