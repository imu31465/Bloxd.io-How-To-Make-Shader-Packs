[← Previous part](07-internals.md)·[Back to the manual](README.md)

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
