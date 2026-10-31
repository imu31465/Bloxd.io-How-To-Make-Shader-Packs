[← Previous part](09-apiv3.md)·[Back to the manual](README.md)

# Part X: API version 4 migration guide

Target build: `cnty9.main.669f8081.js` — **live on production and preprod simultaneously since 2026-10-26**. Unlike the v3 rollout (a preprod build promoted to production), v4 flipped both environments to the same new bundle in one move, and the two bundles are byte-identical (main and every shader-pack chunk md5-checked), so everything here applies to production as-is. The bundle was also reorganised around this release — the main bundle shrank from 4.73 MB to 3.03 MB (-36%), the chunk count grew from 169 to 193, and the whole shader-pack pipeline (loader, validator, code generator, WebGPU compiler) now lives in a contiguous c49–c54 cluster. The pack model itself keeps its shape: same `pack.json` fields, same loader limits, same 64 B uniform, same six hooks.

**Re-verified on `tcwczu.main.357faec1.js` (2026-10-30, production and preprod again byte-identical): the whole v4 API surface is unchanged.** The engine header (6,021 B decoded), the default pack template (1,122 B as shipped), the 27 `bloxdSp*` symbols, the blockFlags bits, the loader limits, and the 12 allow titles are all byte-identical to the `cnty9` baseline this part documents — the v4 freeze held through the first post-v4 bundle refresh. The bundle layout moved on: the main bundle grew to 3.28 MB, the chunk map now has 202 ids (195 emitted), the shader pipeline cluster sits at c51–c56 with the default pack in c124, and the §66 "chunk c8" references for the lift/cone constants are now c9. None of that is visible to a pack. The one thing this re-verification did *not* re-measure is the texture-name registry (§68): its `cnty9` ids remain a snapshot, and names remain the stable API.

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

`animDataPerTex` (group 2, `array<f32>`) carries one `{mask, startLayer, interval}` triplet per animated texture, frames are **power-of-two counted** (a JS-side build check rejects non-power-of-2 frame counts with `<block> has N animation states, which is not a power of 2`), and the static-sentinel design means non-animated indices resolve through the same arithmetic without a branch. Pack-facing summary, once more: *the id is stable, the frame is automatic.* The intervals are engine content, and measured on `cnty9` they take exactly three values — 200 ms (`lava`, `toxic_waste`, `radar_screen`), 250 ms (`smoke`, `homestead_core_mid`, the machine `*_running` families), 300 ms (the seventeen portals, `toxic_waste_barrel_top`) — the per-family column is §68.4.

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

[← Previous part](09-apiv3.md)·[Back to the manual](README.md)
