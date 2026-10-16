[← Previous part](internals.md)·[Back to the manual](README.md)

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
