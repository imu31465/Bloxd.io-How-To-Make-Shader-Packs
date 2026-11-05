# Texture API

> Target API: 5 · Target build: `bny9u` · Status: Verified (API unchanged since v4, re-confirmed on the v5 build)

The API for reading the game's own textures: two functions, a named-constant family, and four input fields. The header's own one-liner: *"This face's texture. Compare with `bloxdTextureId*`."*

## bloxdTexel

```wgsl
fn bloxdTexel(textureId: u32, uv: vec2f, mipLevel: f32) -> vec4f
```

- **Callable from**: **surface / light hooks only** (reaching it from a vertex hook fails with a "reaches" diagnostic)

Reads a texel **the same way the engine's own sampler does** — same `texture_2d_array<f32>` atlas, same sampler, `textureSampleLevel` at `round(mipLevel)` — so the texel you read structurally matches the texel the engine drew.

### What `bloxdTexel` reads depends on the pipeline

The engine generates a different definition of `bloxdTexel` per pipeline, so one function has three behaviors:

| Pipeline | `textureId == 0` | Non-zero `textureId` | Notes |
|---|---|---|---|
| **Atlas pipelines** — terrain, liquid, and block models drawn from the block atlas | `vec4f(1.0)` (white — "no texture") | samples that **atlas entry** | named constants apply; animation and rotation are automatic |
| **Own-texture pipelines** — models whose mesh carries its own diffuse texture (player skins, mob textures, item sprites) | samples **the mesh's own texture** at the uv you pass | `vec4f(1.0)` (white) | exactly one texture is in scope; named constants do not apply |
| **Texture-less pipelines** | white | white | stub; `bloxdTextureSize() -> vec2u(1u)` |

Atlas-pipeline semantics in detail:

- **`textureId == 0` returns `vec4f(1.0)` (white).** That is the "no texture" id; texture-less faces carry 0 in all four input fields, so `bloxdTexel(surface.textureId, ...)` is always safe to call
- **Animated textures automatically return the current frame.** Frames advance on the game's animation clock — you cannot stop or step them, and never need to
- **`mipLevel` clamps exactly like the engine's own**: `clamp(round(mipLevel), 0, textureNumLevels(textureAtlas0) - 1)`; out-of-range mips saturate rather than error
- **The fragment's own `textureRotation` is applied to the uv you pass** (see below)

`textureId` is **1-based** on atlas pipelines: `bloxdTextureIdGrassTop` is the id, and the atlas layer the engine samples for it is `id - 1`. Ids are stable per texture *name*, not per atlas slot — the engine reshuffles the atlas across builds, but the named comparison keeps its meaning.

### The universal call pattern

```wgsl
// Works in every pipeline: on atlas faces it samples the atlas entry;
// on own-texture models textureId is 0 and it samples the model's own texture.
let texel = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
```

`surface.colour` already contains `texture × tint × ambient occlusion` (skins and tints included), so texel reads are for *additional* detail — luminance estimates, per-texture effects — not for rebuilding the base colour.

## bloxdTextureSize

```wgsl
fn bloxdTextureSize(mipLevel: f32) -> vec2u
```

- **Callable from**: surface / light hooks only

`textureDimensions(textureAtlas0, <clamped mip>)`. Each texture occupies one array layer, so this is also *the texel size of any one texture at that mip* (all block textures in an atlas tier are the same square size).

```wgsl
// texel-aligned resampling for a "pixel-art" look
let size = bloxdTextureSize(surface.mipLevel);
let uv = fract(surface.uv);
let texel = bloxdTexel(surface.textureId, uv, surface.mipLevel);
```

## Model-owned textures (textureId: 0)

The header notes: *"These are all 0 if the face has no texture. **Most models use textureId 0.**"* — most model faces have no *atlas* texture, because their meshes carry their own textures:

- **Player skins** and other non-atlas model textures (mobs, item sprites) arrive as `textureId: 0`
- On those pipelines `bloxdTexel(0u, uv, mip)` samples **the mesh's own texture** (see the table above); any non-zero id returns white — there is no atlas in scope
- The header's fields still work as documented: `uv` spans the model texture 0–1, `mipLevel` is the face's mip
- **`bloxdTextureSize()`** reports the size of *the texture the pipeline samples*: the atlas on atlas pipelines, the model's own texture on own-texture pipelines

Effects that only make sense on atlas faces should be guarded:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        // only faces whose texture lives in the block atlas (block models)
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

- **Skins vs the atlas**: the atlas maps texture *names* to layers and is comparable via `bloxdTextureId*`. Model-owned textures (skins) are not in that namespace and arrive as id 0. `surface.colour` already contains skin × tint, so work from it

## bloxdTextureId*: named texture constants

Every usable texture name becomes a comparable `const`. **Spelling is the file name CamelCased**:

| Texture file | Constant | Note |
|---|---|---|
| `grass_top.png` | `bloxdTextureIdGrassTop` | the engine's own example |
| `lava0.png` (frames `lava0`–`lava7`) | `bloxdTextureIdLava` | animation family: frame suffixes drop from the canonical name |
| `black_portal0.png` (frames 0–3) | `bloxdTextureIdBlackPortal` | same rule |
| `radar_screen0` (turned copies `[rot[1`–`[rot[4`) | `bloxdTextureIdRadarScreen0` | rotation family: folds to the root name |

### Spelling rules and naming freedom

- **Generation rule** (restored from the validator): split the name on non-alphanumeric runs, capitalize each part, concatenate after the `bloxdTextureId` prefix
- **Case and underscores are not distinguished**: reverse matching (the name a pack wrote → registry name) folds both your spelling and the engine's, so e.g. `bloxdTextureIdGrassTop` and `bloxdTextureId_grass_top` resolve to **the same constant**
- **Animated textures take no frame number**: `lava` is the name; `lava0` is a dedicated error
- **Rotation families use the root name**: writing a turned-copy spelling produces a dedicated message

### Name-resolution errors (verbatim from the validator)

> **Prefix misspelling / case:** `bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?`
>
> **Animation frame:** `...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates.`
>
> **Turned copy:** `...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, which bloxdTexel turns as each face shows it.`
>
> **Ambiguous after folding:** `...could name X and Y, which differ only by case or underscores, so it can't be used.`
>
> **Not found (with suggestion):** `There's no texture called X. Did you mean bloxdTextureIdY?` — suggestion threshold is Levenshtein distance `max(2, floor(len/4)) + 1`
>
> **Not found (no suggestion):** `There's no texture called X. Texture names are the file names texture packs use, as in bloxdTextureIdGrassTop for grass_top.png; BLOCK_TEXTURES.md lists them.`

> `BLOCK_TEXTURES.md` in that message is the game's own internal texture-name list, referenced by the engine's validator — it is not a page on this site. The equivalent here is the [Texture catalog](texture-catalog.md).

### Only referenced constants are emitted

The header's `bloxdTextureId*` block is generated **per pack** from the names it actually references — a pack using 3 constants gets 3 `const` lines, not ~900.

## Input fields

The four texture fields on `BloxdSurfaceIn` / `BloxdLightIn`:

| Field | Type | Description |
|---|---|---|
| `textureId` | `u32` | this face's texture; compare with `bloxdTextureId*`; 0 = none |
| `textureRotation` | `u32` | quarter turns clockwise (0–3), applied by `bloxdTexel` |
| `uv` | `vec2f` | the texture spans 0–1; `fract(uv)` is drawn |
| `mipLevel` | `f32` | mip level: 0 = full size, 1 = half… |

## The rotation subtlety — a neutral sampler

`bloxdTexel` counter-rotates the uv you pass by the **current fragment's** `textureRotation` — regardless of which id you passed. Two common cases:

- **Re-sampling this face's own texture** with `surface.uv` — the uv is in the face's rotated frame and the counter-rotation maps back to atlas space; the intended primary use
- **Sampling a different texture** with atlas-space uv while the face is rotated — the counter-rotation still fires and the sample lands rotated. That's the trap

The engine cannot look up per-texture rotation (rotation is face geometry data) and always uses the fragment's value. To sample another texture rotation-neutrally, pre-rotate the uv by the same quarter turn to cancel it:

```wgsl
// Rotation-neutral texel sampling: pre-rotate uv so bloxdTexel's counter-rotation
// (by this face's textureRotation) cancels out. Pass surface.textureRotation as r.
fn texelNeutral(id: u32, uv: vec2f, mip: f32, r: u32) -> vec4f {
    var turned = uv;
    if (r == 1u) {
        turned = vec2f(1.0 - uv.y, uv.x);
    } else if (r == 2u) {
        turned = vec2f(1.0 - uv.x, 1.0 - uv.y);
    } else if (r == 3u) {
        turned = vec2f(uv.y, 1.0 - uv.x);
    }
    return bloxdTexel(id, turned, mip);
}
```

(`textureRotation == 0` needs no correction. Most faces carry 0, but distributed packs must not assume it.)

## Worked examples

### Emission from texel luminance

Sample one mip above the face's for a distance-robust soft blocky average:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let avg = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + 1.0);
    let lum = dot(avg.rgb, vec3f(0.2126, 0.7152, 0.0722));
    if (surface.flags.emissive) {
        out.emission += avg.rgb * lum * 0.5;
    }
    return out;
}
```

### Texture-specific effects

Compare `textureId` to single out chosen textures (the official way to e.g. sparkle ores):

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.textureId == bloxdTextureIdDiamondOre) {
        let p = bloxdWorldPosition(light.position);
        let s = sin(bloxdSeconds() * 3.0 + p.x * 2.7 + p.y * 1.3 + p.z * 4.1);
        out.colour += vec3f(0.35, 0.45, 0.55) * max(0.0, s);
    }
    return out;
}
```

### Depth-of-field-style distance blur

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let d = distance(surface.position, bloxdEyePosition());
    if (d > 40.0 && surface.textureId != 0u) {
        let own = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel);
        if (any(abs(own.rgb - vec3f(0.0)) > vec3f(1e-6))) {          // division guard
            let blur = clamp((d - 40.0) / 60.0, 0.0, 3.0);
            let t = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + blur);
            out.colour = t.rgb / own.rgb * out.colour;
        }
    }
    return out;
}
```

(The ratio trick preserves the engine's `colour = texture × tint × AO`: dividing the blended texel by the native one cancels the texture content, leaving only the blur factor to multiply back into `surface.colour`. White reads — texture-less faces — make the guard skip the effect.)

## Where the texture API can't go

- **Not callable from vertex hooks** — "reaches" diagnostics reject it
- **You cannot add textures** — the atlas is the engine's; the API only reads it. Custom textures remain the texture-pack system's job
- **Non-atlas renderer configurations degrade to stubs** — `bloxdTextureSize() -> vec2u(1u)` and `bloxdTexel(...) -> vec4f(1.0)`, with the four inputs flowing `0u, 0u, vec2f(0.0), 0.0`. Code written for the real atlas still compiles and runs — it just sees white texels and a 1×1 size. Code that tolerates `textureId == 0` tolerates this too

## Related

- **All 896 usable names** → [Texture catalog](texture-catalog.md)
- [Engine Internals: Texture Registry](../internals/texture-registry.md) · [Texture Sampling](../internals/texture-sampling.md)
