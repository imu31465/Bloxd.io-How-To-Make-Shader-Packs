[← Previous part](08-apiv2.md)·[Back to the manual](README.md)

# Part IX: API version 3 (preprod) migration guide

Target build: `3ymzdd.main.fae4743f.js` (**preprod** deploy as of 2026-10-19). At this date production has not switched yet — the live game still runs API version 2, so packs with `"apiVersion": 3` load only on preprod. The pack model keeps its v2 shape (same `pack.json` fields, same loader limits, same uniform layout).

Parts I–VII of this guide are still written on the v2 baseline. This part collects, in the same order as [Part VIII](08-apiv2.md), the v2 → v3 migration points and the new v3 features. Conversion is mostly mechanical (§47), but two changes actually alter behavior — the default light now attenuates emission with fog (§43), and `BLOXD_ALPHA` is no longer defined in liquid variants (§46) — and `blockId` is replaced wholesale by `blockFlags` (§42), so always verify with an in-game compile before distribution.

## 40. Fate of v2 packs (conclusion first)

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
- The engine uniform block is unchanged in shape: `@group(3) @binding(0)`, 64 B, holding — in declaration order — the time, the render offset, the sun direction, and the eye position. Two internal field names changed: `time` → `seconds`, `originOffset` → `renderOffset`. The **byte layout is identical to v2**, and nothing changes for pack code anyway, because packs are not allowed to name the uniform directly (the engine header marks it engine-provided and read-only, "which packs can't name"); keep going through the header functions `bloxdSeconds()` / `bloxdRenderOffset()`.

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
| `BLOXD_ALPHA` | non-strict **terrain** variants only |
| `BLOXD_SCENE_DEPTH` | **all liquid variants** |

Two things change for authors versus the v2 rules ([Part VIII](08-apiv2.md) §36):

- **`BLOXD_ALPHA` is no longer defined in liquid variants.** In v2 it was defined in all liquid variants too; in v3 liquid-side `#ifdef BLOXD_ALPHA` code simply never compiles in — alpha-gated logic needs to live in terrain hooks, or rely on liquid variants not having an alpha-forcing flag.
- **`BLOXD_SCENE_DEPTH` is always defined in liquid variants**, so depth use stays unguarded-OK there, exactly as in v2 (§35); in terrain hooks it keeps needing the `#ifdef BLOXD_SCENE_DEPTH` wrap.

## 47. v2 to v3 migration checklist

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** in all three input structs; express material styling as bit tests against `bloxdBlockFlag*` constants (§42); drop id-range heuristics from v2
3. **`bloxdTime()` → `bloxdSeconds()`**; declare your own period instead of the removed `bloxdTimeWrap` (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **Rebuild light math from `engineColour` onto `litColour` + fog** per the §43 table; note the default now attenuates emission with fog
6. **Liquid hooks**: define `bloxdLiquid*` explicitly when you want water handled differently; omit them to fall back to your terrain hooks
7. **Audit `BLOXD_ALPHA` guards** — the flag is gone from liquid variants (§46); liquid-side alpha-gated code is dead there
8. **Use `bloxdPi` / `bloxdTau`** where trig-related constants were hardcoded; remove pack-local re-declarations that now duplicate the header
9. **Keep strict guards**: vertex hooks and `discard` stay wrapped in `#ifndef BLOXD_STRICT`; the template guards `bloxdLiquidVertex` the same way as terrain
10. **Validate on preprod** — production still serves API version 2 as of 2026-10-19, so `apiVersion: 3` packs only load there

## 48. Other v3 changes and notes

- **Validation stays two-stage** ([Part VIII](08-apiv2.md) §38): static validation first, then the browser's real WebGPU compilation through generated stub snippets that call your hooks, with errors mapped back to source files / lines, and diagnostics restore the original names of engine-side identifiers through a mapping.
- **Strict diagnostics name the reason**: a vertex hook moving terrain reports "… moves terrain, which strict games prevent." and `discard` in surface / light hooks reports "discard makes terrain see-through, which strict games prevent."; the settings UI keeps the "wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`." guidance (`offInStrict`).
- **Loader messages**: error kinds and limits are unchanged; "Zip64 archives aren't supported." is surfaced as a UI message (`loadZip64`).
- **In-game editor**: the shader editor was overhauled to a CodeMirror-based editor with WGSL-aware highlighting, bracket matching, and diagnostics spans.
- **Hardware gate**: Lite requires a driver supporting the `shader-f16` WebGPU feature; too-old drivers are rejected with a message like "Intel driver too old for Lite (no shader-f16)".
- **Wording**: text about games that accept shader packs now reads "in games that **support** them".
- **Scope of titles**: the set of games where packs run is unchanged from the previous build.

---

Researched by ltf_ahel (researched with glm)

[← Previous part](08-apiv2.md)·[Back to the manual](README.md)
