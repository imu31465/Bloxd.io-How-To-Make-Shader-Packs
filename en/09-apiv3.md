[← Previous part](08-apiv2.md)·[Back to the manual](README.md)

# Part IX: API version 3 migration guide

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

Three enforcement facts come straight out of this splicing:

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

Researched by ltf_ahel (researched with glm)

[← Previous part](08-apiv2.md)·[Back to the manual](README.md)
