<!-- Auto-generated from the 6-category structure. Edit individual pages instead. -->

## Bloxd.io 着色器包开发文档

关于 Bloxd.io 的 WebGPU 渲染器着色器包的非官方文档——从创建、实现、验证、分发，到 API 规格与引擎内部研究。

---

## Getting Started

A single-track tutorial for first-time shader pack authors, from overview to distribution. It teaches the completed API v5 form directly (there is no need to read older versions first — that is [Version History](../history/)'s job).

### The track

1. [Overview & prerequisites](overview.md) — what shader packs can and cannot do
2. [Requirements](requirements.md) — browser and renderer requirements
3. [Quick start](quick-start.md) — your first pack in 5 minutes
4. [Pack structure](pack-structure.md) — zip contents and size limits
5. [pack.json](manifest.md) — every manifest field
6. [Shader hooks](hooks.md) — the roles of the 9 hooks
7. [Variants](variants.md) — the 6 variants and macro guards
8. [Validation](validation.md) — the 3-stage load check and on-device testing
9. [Distribution](distribution.md) — zipping and release hygiene

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Verified/Analyzed

When you need the full specification, continue to [API Reference](../api/); for ready-made effects see [Recipes](../recipes/).

---

## Overview & prerequisites

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Verified

### What a shader pack is

A Bloxd.io shader pack changes the look of the game's **WebGPU renderer only**. Packs are written in a **restricted subset of WGSL** and loaded from the in-game settings → Shader Pack screen as a zip or folder. While a pack is installed, the WebGPU renderer is force-enabled in settings.

Packs are validated and compiled as pure WGSL — no JavaScript execution, no networking. Nothing dangerous can happen with normal code.

### What you can change (v5)

A pack plugs into the renderer's **3-stage per-face pipeline**. The render targets split into three programs with a total of **9 hooks**:

| Target | Hooks (Vertex / Surface / Light) | What is drawn |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | All blocks except water and block models |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | Water |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | Block models (slabs, stairs, plants), items, players, mobs, NPCs, armour, cosmetics |

- **Can do**: change colors, transparency and emission; rebuild lighting (published as the v5 [Lighting API](../api/lighting.md)); projected-style shadows (via `skyLight`); sample textures (`bloxdTexel` — reading the existing block-texture atlas); per-model effects (v5's `flags` tell you "this is a held item", "this is a player"); vertex animation (allow games only)
- **Cannot do**: add your own textures (that is the texture-pack system's job); post-processing (bloom etc.); shadow-map shadows that rotate with the sun; true reflections (SSR); affect the sky, clouds or the sun disc itself
- **Easy to miss but powerful**: **projected-style shadows using `skyLight` (voxel sky occlusion)** — clearly darken areas under trees and roofs. Breaking blocks makes LightEngine recalculate immediately, so shadows follow in real time

### strict and allow modes

Every game has a shader-pack policy (`shaderPackPolicy`), and **most games run in strict mode** (no vertex animation, no `discard`). Packs for general distribution must work in strict mode. See [Variants](variants.md) and the [policy reference](../internals/policy.md).

### Assumptions in this documentation

- The current game only accepts `apiVersion: 5` packs; v1–v4 packs are rejected at load (saved packs become silently inactive — [Compatibility](../api/compatibility.md))
- Migrating a pack written for an older version? See [Version History](../history/)
- Engine internals may change with updates, so every page names its target build

---

## Requirements

> Target API: 5 · Status: Verified

### Browser

Shader packs are WebGPU-renderer only. You need a WebGPU-capable browser:

- Chromium-based browsers (Chrome / Edge / Opera etc.) — stable on desktop
- Safari 17+ / Firefox (WebGPU support varies by period)
- **Mobile**: WebGPU support may be limited on iOS / Android. Mention this on your pack's release page

While a pack is installed, the game setting for the WebGPU renderer is force-enabled.

### Development environment

No special tooling is required, though these help:

- A text editor (WGSL syntax highlighting is a plus)
- A zip tool for distribution; during development you can use folder loading (desktop browsers only)
- Browser developer tools — compile errors show in the in-game UI and also in the console

### On-device verification environments

Before distribution, verify on ([Validation](validation.md)):

1. An allow-mode game (mandatory if you use vertex animation)
2. A strict-mode game (most games are strict)
3. A page reload (saved packs re-validate automatically)

### URL parameter caveat

Leftover renderer overrides in URL parameters or localStorage make packs refuse to start — clear them and reload.

---

## Quick start

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Verified

Your first pack in five minutes.

### 1. Create the files

Make a folder with `pack.json` and `pack.wgsl`:

**`pack.json`**:

```json
{
  "apiVersion": 5,
  "name": "My First Pack",
  "author": "your name"
}
```

**`pack.wgsl`** — a minimal warm-tint pack:

```wgsl
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    return out;
}
```

> The engine header (constants, structures, functions) is prepended to every pack automatically at load — you never write it yourself. The full header is reproduced in [Engine Internals](../internals/engine-header.md).

### 2. Load it in the game

1. Open settings → Shader Pack and load the zip or folder (folder loading is desktop browsers only)
2. Check the status: right after selecting it you'll see "Ready. Reload the page to use it." — after a **page reload**, "Ready to use" means success
3. If you see "Saved, but it won't run until you fix these errors...", fix the listed errors (file:line + variant) and reload

### 3. Verify

1. Test in a permissive game first
2. Then in a strict-mode game (most games are strict)
3. Vertex animation only works in games marked allow

### 4. Distribute

Zip it up — see [Distribution](distribution.md).

### Stuck?

- What errors mean → [Troubleshooting](../troubleshooting/)
- How to write hooks → [Shader hooks](hooks.md)
- The full 9-hook template is in the next page, [Shader hooks](hooks.md)

---

## Pack structure

> Target API: 5 · Target build: `ab90qa` · Status: Verified

### Distribution format

- **Format**: a single `.zip`, or a folder (folder loading is desktop browsers only)
- **Contents**: one `pack.json` (at the top level of the pack; case-insensitive) + 1–256 `.wgsl` files
- Multiple `.wgsl` files are concatenated into one module, so splitting and subdirectories are free. No constraints on file names. Concatenation happens in **dictionary order by path name** (module-scope declarations are order-independent, so this only matters for code depending on `var` initialization order). Non-`.wgsl` files (READMEs etc.) are ignored

### Size and format limits

| Item | Limit | Message when exceeded |
|---|---|---|
| zip size | 32 MB | `The zip is over 32 MB.` |
| zip entries | 1,024 | `The zip has more than 1024 entries.` |
| `pack.json` size | 64 KB (UTF-8) | `pack.json is over 64 KB.` |
| `.wgsl` file count | 256 | `The pack has more than 256 .wgsl files.` |
| total `.wgsl` source | 256 KB (UTF-8) | `The pack's .wgsl files are over 256 KB in total.` |
| zip shape | no zip64 / split / encrypted; store or deflate; no duplicate paths | each rejected with its own message |

All files must be valid UTF-8.

### Zipping tips

A zip that stores everything under one common root folder has that prefix stripped automatically (macOS "Compress" works as-is; `__MACOSX`, `._`-prefixed files and `.DS_Store` are excluded automatically). Stray files at the root level break top-level detection, so the safest method is to zip `pack.json` and the `.wgsl` files directly (verify `pack.json` ends up at the zip root).

---

## pack.json (manifest)

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Verified

`pack.json` is the pack manifest — exactly one JSON object at the zip root.

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

### Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `apiVersion` | number | required | Must **exactly equal `5`** (strict `===`). A string `"5"` or any other type fails, reported with the JSON spelling |
| `name` | string | required | Non-empty after trimming. Shown in the settings UI |
| `author` | string | optional | May be omitted; must be a string if present |

All other fields are ignored by the loader.

### What happens on version mismatch

The loader compares `manifest.apiVersion !== 5` strictly and **fails at the instant of load**. Messages, verbatim from the live i18n dictionary:

- `pack.json needs "apiVersion": {{version}}.` — the key is missing entirely
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — the key exists but isn't 5

Previously-saved older packs don't throw exceptions; they resolve to `{kind: "none", reason: "otherApiVersion"}` and become **silently inactive**. The shader-pack settings tab explains why:

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

For migrating from v1–v4, see [Version History](../history/).

---

## Shader hooks

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Verified

A pack can plug in **9 hooks**: 3 render targets (Terrain / Liquid / Model) × 3 pipeline stages (Vertex / Surface / Light). All are optional — an undefined hook falls back to the engine default.

### The hooks

| Hook | Stage | What it does |
|---|---|---|
| `bloxdTerrainVertex` | terrain · vertex | Terrain vertex animation. **Cannot run in strict games** |
| `bloxdTerrainSurface` | terrain · surface | Terrain color, alpha, emission, enchant, overlay |
| `bloxdTerrainLight` | terrain · light | Terrain final color — the last stage of the fragment |
| `bloxdLiquidVertex` | liquid · vertex | Water vertex animation. **strict-only guard required** |
| `bloxdLiquidSurface` | liquid · surface | Water color, alpha, emission |
| `bloxdLiquidLight` | liquid · light | Water final color |
| `bloxdModelVertex` | model · vertex | Block models / items / entities vertex animation. **strict-only guard required** |
| `bloxdModelSurface` | model · surface | Model color, alpha, emission, enchant, overlay |
| `bloxdModelLight` | model · light | Model final color |

Signatures (types must match exactly; parameter names are free):

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex;
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight;
// bloxdLiquid* / bloxdModel* take the same types
```

### Render-target split

- **Terrain** — every block except water and block models
- **Liquid** — water
- **Model** — block models (slabs, stairs, crossed-plane plants), held/dropped/thrown items, players, mobs, NPCs, armour, cosmetics

**Important**: if a pack defines no Liquid hook, **no Terrain hook runs on water either** (water is handled by Liquid hooks alone). This differs from pre-v4 behavior where liquid fell back to terrain hooks.

### Fallbacks and code sharing

- An undefined hook means that stage uses the engine default (same behavior as `bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **To share code across hooks**, define a module-scope function and call it from both:

```wgsl
fn applyWarmth(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.04, 1.0, 0.96);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}
```

### The default pack (official 9-hook template)

The starting template now includes the light hooks. 1,683 bytes as shipped, verbatim:

```wgsl
// Every hook here returns its engine default. Modify the return values to start
// building a shader pack. If you delete a hook, the default is used instead.

// All blocks but water and block models use terrain hooks.
#ifndef BLOXD_STRICT
// Strict games keep terrain where it is. Without the #ifndef, this hook would
// turn the whole shader pack off there.
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

// Water uses liquid hooks. To share code with another hook, define a function
// and call it from both places.
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

// Models: block models such as slabs and plants, items, players and mobs.
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

The template's comments are the design guidance: modify return values to start building; deleting a hook restores the default; strict games keep terrain where it is; share code via functions.

### Writing conventions

- **Never construct output structs directly** (`BloxdSurface(...)` fails validation). Always start from `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` and mutate fields. The light hook's first argument is already the output type, so `var out = s;` also works
- A bare `var x: BloxdSurface;` (type annotation only) is also a validation error
- Hook parameters are **read-only**. Copy first (`var sv = s;`)
- You cannot use identifiers starting with `bloxd` (case-insensitive), except the 9 hook function names
- Write constants as `const` (`#define` takes no value)

For every field each hook can read and write, see [Structures](../api/structures.md).

---

## Variants and guards

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Analyzed

### 6 variants

You write one body of code, but it must compile in all **6 variants**: `{strict, allow} × {terrain, liquid, model}`. The loader validates all six at load time.

The v4-and-earlier "lighting on/off" axis is gone (v4 had 8 variants). Lighting state is now a runtime question for [`bloxdLit()`](../api/lighting.md), not a compile-time branch.

| Variant | Example | Macros defined |
|---|---|---|
| `allow.terrain` | terrain in an allow game | `BLOXD_ALPHA` |
| `allow.liquid` | water in an allow game | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | models in an allow game | `BLOXD_ALPHA` |
| `strict.terrain` | terrain in a strict game | — |
| `strict.liquid` | water in a strict game | `BLOXD_SCENE_DEPTH` |
| `strict.model` | models in a strict game | — |

### Conditionals

Only `#define NAME` (no value) / `#ifdef` / `#ifndef` / `#else` / `#endif` are available. The `#` goes at the start of a line (inside functions is fine).

| Guard | Meaning | Typical use |
|---|---|---|
| `#ifndef BLOXD_STRICT` | non-strict (allow) variants only | wrap whole vertex hooks, wrap `discard` |
| `#ifdef BLOXD_ALPHA` | variants where `alpha` exists (all liquid + non-strict terrain/model) | wrap alpha-touching code |
| `#ifdef BLOXD_SCENE_DEPTH` | all liquid variants | wrap `bloxdOpaqueBehind()` calls |

`BLOXD_LIGHTING` was **removed in v5**. Using it fails validation with: *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

### The strict-games contract

Most games are strict (no vertex animation, no `discard`). An unguarded vertex hook reports `<hook> moves terrain, which strict games prevent.` and a reachable `discard` reports `discard makes terrain see-through, which strict games prevent.` — both disable **all hooks** in that strict game. Always wrap vertex hooks in `#ifndef BLOXD_STRICT`.

For per-game policy internals, see [Engine Internals: policy](../internals/policy.md).

---

## Validation

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Verified

### The 3-stage load check

1. **Loader limits** — size, shape, manifest validity (see [Pack structure](pack-structure.md))
2. **Static validation (analyzer)** — syntax, types, reserved names, strict contract, across all 6 variants
3. **Real WebGPU compilation in the browser** — static validation's type-checking is incomplete, so some mistakes only surface here

For reading each error, see [Troubleshooting](../troubleshooting/) (organized by symptom).

### Procedure

1. Load the zip or folder from settings → Shader Pack
2. Check status: "Ready. Reload the page to use it." right after selecting; **after a page reload**, "Ready to use" means success
3. On "Saved, but it won't run until you fix these errors...", fix the listed errors (file:line + variant) and reload
4. Test in a permissive game first, then a strict-mode game (most games). Vertex animation works only in allow games
5. Replacing a pack reloads from the same screen; changes need a page reload
6. Remove with Remove Pack. After game updates, saved packs re-validate automatically on page load (header/registry changes mark them "needs re-check")

### On-device test checklist

See the [testing guide](../guides/testing.md) for the full checklist and the complete list of factors that change what a pack sees.

---

## Distribution

> Target API: 5 · Status: Verified

### Release format

1. Zip with `pack.json` at the root, within the size limits ([Pack structure](pack-structure.md))
2. Verify `pack.json` sits at the zip root (a single common root folder is stripped automatically)
3. Polish `name` / `author` for release

### Pre-release checklist

- [ ] `apiVersion: 5` (number, not string)
- [ ] All 6 variants pass validation (empty error list on the loader screen)
- [ ] Verified visually in both an allow game and a strict game
- [ ] Vertex-animation / `discard` packs clearly marked allow-only
- [ ] Tested games and date noted in the release notes (builds change)

### After release

- Player-saved packs re-validate automatically when engine header or texture registry change with a game update
- **Packs distributed as v1–v4 become silently inactive** on v5 (see [pack.json](manifest.md)) — players only see the status line, so publish and announce an updated version
- When the API updates, follow [Version History](../history/) migration steps, bump, and re-release

---

## API Reference

The systematic specification of the current API v5. Everything here is measured from target build `ab90qa` (2026-11-03; production and preprod identical). The engine header prepended to every pack (reproduced in [Engine Internals](../internals/engine-header.md)) is the primary source.

### Map

| Page | Contents |
|---|---|
| [Pack format](pack-format.md) | every `pack.json` field, loader limits, uniform layout |
| [Shader hooks](hooks.md) | 9-hook comparison: signatures, targets, run conditions |
| [Flags](flags.md) | all 14 `BloxdFlags` fields |
| [Structures](structures.md) | every field of every struct (incl. conditional fields) |
| [Functions](functions.md) | all frame/default/special function signatures |
| [Lighting](lighting.md) | the lighting API and the processing order |
| [Texture API](texture-api.md) | `bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*` and naming |
| [Constants](constants.md) | `bloxdPi` / `bloxdTau` / `bloxdChunkSize` |
| [Preprocessor](preprocessor.md) | `BLOXD_STRICT` / `BLOXD_ALPHA` / `BLOXD_SCENE_DEPTH` |
| [Restrictions](restrictions.md) | language limits, reserved identifiers |
| [Compatibility](compatibility.md) | old-version packs, saved-pack re-validation |
| [Texture catalog](texture-catalog.md) | all 896 usable names (searchable) |

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Analyzed (restored verbatim from header & validator)

Migrating from v4? See [Version History: v5](../history/v5.md).

---

## Pack format

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Verified (re-measured on the live loader)

The whole pack model on one page — manifest, loader limits, per-frame uniform. For the step-by-step version see [Getting Started](../getting-started/manifest.md).

### pack.json

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `apiVersion` | number | required | **must strictly equal `5`** (`===`). A string `"5"` fails and is reported with its JSON spelling |
| `name` | string | required | non-empty after trimming; shown in settings |
| `author` | string | optional | must be a string if present |

Everything else in the manifest is ignored. `pack.json` must be exactly one JSON object at the zip root.

### Loader limits (re-measured on live c53)

| Limit | Value | Message when exceeded |
|---|---|---|
| `.wgsl` files per pack | 256 | `The pack has more than 256 .wgsl files.` |
| total `.wgsl` source | 256 KB | `The pack's .wgsl files are over 256 KB in total.` |
| `pack.json` size | 64 KB | `pack.json is over 64 KB.` |
| zip size | 32 MB | `The zip is over 32 MB.` |
| zip entries | 1,024 | `The zip has more than 1024 entries.` |
| zip shape | — | split zip / zip64 / encrypted / unsupported compression each rejected with its own message; all files valid UTF-8; exactly one `pack.json`; no duplicate paths |

### API-version check

The loader compares `manifest.apiVersion !== 5` with JavaScript strict `!==`. The version constant `5` and the header template live in the same module (c55 / module 29836), so validation and the header it assumes move together. Mismatch messages: see [Compatibility](compatibility.md).

### Per-frame uniform: bloxdPackInputs

`@group(3) @binding(0) var<uniform> bloxdPackInputs: BloxdPackInputs` — still 64 bytes, but v5 added one member (from the live uniform-layout module):

| Offset | Field | Type | Note |
|---|---|---|---|
| 0 | `seconds` | `f32` | backs `bloxdSeconds()` |
| 4 | `lit` | `u32` | **new in v5** — 1 when block/sky lighting is on; backs `bloxdLit()` |
| 16 | `renderOffset` | `vec3i` | backs `bloxdRenderOffset()` |
| 32 | `sunDirection` | `vec3f` | backs `bloxdSunDirection()` |
| 48 | `eyePosition` | `vec3f` | backs `bloxdEyePosition()` |

`lit` fit into the padding v4 already had between `seconds` and `renderOffset` (offsets 4–15 were alignment gaps; `vec3i` needs 16-byte alignment so `renderOffset` stays at 16). Total size and all other offsets are unchanged. The engine writes it with a single `setUint32(4, lit ? 1 : 0)` — it is a flag, not a light level (v4's JS-side names `terrainLightLevels` / `terrainHeldLight` are gone from the bundle entirely).

**Never reference the uniform directly from a pack.** Use it through the header functions (`bloxdSeconds()` etc.). Stage visibility is VERTEX|FRAGMENT, so header functions work from module-scope functions and vertex hooks too.

### Bind-group layout

| binding | Contents |
|---|---|
| 0 | `bloxdPackInputs` uniform (64 B) |
| 1 | scene-depth texture (liquid variants) |
| 2 | `bloxdSpTextureLayers` storage buffer |

`minBindingSize` remains 64. The depth texture (binding 1) is FRAGMENT-only, which is why `bloxdOpaqueBehind()` is surface/light-hook only.

### wgsl concatenation

Multiple `.wgsl` files are concatenated into one module in **dictionary order by path name**. Module-scope declarations are order-independent; only `var` initialization order can matter. Non-`.wgsl` files are ignored.

---

## Shader hooks

> Target API: 5 · Target build: `ab90qa` · Status: Verified

Packs can define **9 hooks** — 3 render targets (programs) × 3 pipeline stages, all optional (undefined means engine default).

### 9-hook comparison

| Hook | Program | Stage | Arguments | Returns | Run condition |
|---|---|---|---|---|---|
| `bloxdTerrainVertex` | Terrain | vertex | `BloxdVertexIn` | `BloxdVertex` | allow variants only (**defining it in strict is itself an error**) |
| `bloxdTerrainSurface` | Terrain | surface | `BloxdSurfaceIn` | `BloxdSurface` | always |
| `bloxdTerrainLight` | Terrain | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | always |
| `bloxdLiquidVertex` | Liquid | vertex | `BloxdVertexIn` | `BloxdVertex` | allow only |
| `bloxdLiquidSurface` | Liquid | surface | `BloxdSurfaceIn` | `BloxdSurface` | always |
| `bloxdLiquidLight` | Liquid | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | always |
| `bloxdModelVertex` | Model | vertex | `BloxdVertexIn` | `BloxdVertex` | allow only |
| `bloxdModelSurface` | Model | surface | `BloxdSurfaceIn` | `BloxdSurface` | always |
| `bloxdModelLight` | Model | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | always |

### What each program draws

| Program | Draws | Water when no Liquid hook exists |
|---|---|---|
| **Terrain** | every block except water and block models | — |
| **Liquid** | water | **no Terrain hook runs on water either** (water keeps its default look) |
| **Model** | block models (slabs, stairs, plants, crops, cobwebs), held/dropped/thrown items, players, mobs, NPCs, armour, cosmetics | — |

### Stage roles

- **Vertex** — move vertex positions (grass sway, waves). Vertex animation disables the whole pack in strict games, so `#ifndef BLOXD_STRICT` is mandatory
- **Surface** — the material output: `colour` / `alpha` (conditional) / `emission` / `enchantColour` / `overlayColour`
- **Light** — the final color; takes the surface output plus `BloxdLightIn`. Its return value is the on-screen color

### Signatures

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
// bloxdLiquid* / bloxdModel* take the same argument and return types
```

### Special-function call restrictions

The engine's validator restricts which hooks may reach certain functions (violations fail with dedicated "reaches" diagnostics):

| Function | Callable from | Guard |
|---|---|---|
| `bloxdTexel` | surface / light hooks only | — |
| `bloxdTextureSize` | surface / light hooks only | — |
| `bloxdOpaqueBehind` | surface / light hooks (meaningful in liquid variants) | `#ifdef BLOXD_SCENE_DEPTH` |

> `bloxdFragmentBlockPosition` was removed in v5 (it was the only special function callable from vertex hooks through v4). There is no replacement — use `flags` when you need "which block is this".

### Fallbacks and sharing

- Undefined hook → that stage behaves as the engine default (`bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **Share processing across hooks** with a module-scope function called from both:

```wgsl
fn sharedSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}
```

### Related

- Official 9-hook template → [Getting Started: Shader hooks](../getting-started/hooks.md)
- Every struct field → [Structures](structures.md)
- Hook invocation internals → [Engine Internals](../internals/hook-invocation.md)

---

## Flags (BloxdFlags)

> Target API: 5 · Target build: `ab90qa` · Status: Analyzed (restored verbatim from the live header)

v5 identifies faces with a named boolean struct. The v4 `blockFlags: u32` bitmask and its 6 `bloxdBlockFlag*` constants are gone.

### Definition (verbatim from the header)

```wgsl
// What kind of block, item or lifeform a face is. Any number of flags may be
// set, possibly even none. For example, sandstone is sand and rock.
struct BloxdFlags {
    opaque: bool,     // Opaque blocks, i.e. full cubes with no gaps or holes.
    emissive: bool,   // Blocks that emit light, e.g. lava and glowing ores.
    vegetation: bool, // Leaves, grass blocks and leafy plants, e.g. tall grass.
    dirt: bool,       // Soil, grass blocks included. Rocky Dirt is rock too.
    sand: bool,       // Sand, Red Sand and every sandstone, which is rock too.
    rock: bool,       // Stone variants, and more, e.g. gravel, ores and magma.

    // Drawn as block models, so never part of terrain or flagged as opaque.
    slab: bool,       // Half blocks.
    stairs: bool,     // Stairs and corner stairs.
    flat: bool,       // Planes, e.g. tall grass, flowers, crops and cobwebs.

    placed: bool,     // Blocks placed as part of chunks. Not items or vehicles.
    held: bool,       // Items in a hand, in first or third person.
    dropped: bool,    // Dropped items, on the ground, on a belt or in a pipe.
    thrown: bool,     // Items in flight, e.g. snowballs, arrows and rockets.

    lifeform: bool,   // Players, mobs and NPCs. Includes armour and cosmetics.
}
```

### Field reference

| Field | Class | Meaning | Typical objects | Hooks |
|---|---|---|---|---|
| `opaque` | material | full cube without gaps or holes | stone, dirt, solid wood | all 9 |
| `emissive` | material | blocks that emit light | lava, glowing ores | all 9 |
| `vegetation` | material | leaves, grass blocks, leafy plants | leaves, tall grass | all 9 |
| `dirt` | material | soil (grass blocks included) | dirt, grass block, Rocky Dirt (also rock) | all 9 |
| `sand` | material | sand & sandstone family | sand, red sand, every sandstone (also rock) | all 9 |
| `rock` | material | stone family (+ gravel, ores, magma) | stone variants, gravel, ores | all 9 |
| `slab` | shape | half blocks | slabs | Model hooks |
| `stairs` | shape | stairs & corner stairs | stairs | Model hooks |
| `flat` | shape | planes (incl. crossed planes) | tall grass, flowers, crops, cobwebs | Model hooks |
| `placed` | placement | geometry placed as part of chunks | world blocks | Model hooks (not items/vehicles) |
| `held` | placement | items held in a hand (1st/3rd person) | held items, armour | Model hooks |
| `dropped` | placement | items on ground / belt / pipe | dropped items | Model hooks |
| `thrown` | placement | items in flight | snowballs, arrows, rockets | Model hooks |
| `lifeform` | target | players, mobs, NPCs (armour & cosmetics included) | entities | Model hooks |

### Flags combine freely

**Flags are not a single-choice enum.** Any number may be true at once — possibly none (the header itself says *"Any number of flags may be set, possibly even none"*).

Examples the header itself gives:

- **sandstone is both `sand` and `rock`**
- **Rocky Dirt is both `dirt` and `rock`**
- A slab can be `slab` and (depending on material) `rock` at the same time

Reading the `else` branch of one flag as "everything else" is a bug. Material flags (`opaque`/`emissive`/…) combine **independently** with shape/state flags (`slab`/`held`/…).

### Usage

`flags` is a same-named field on all three input structs (`BloxdVertexIn`, `BloxdSurfaceIn`, `BloxdLightIn`):

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.vegetation) {
        out.colour *= vec3f(1.0, 1.08, 0.9);
    }
    if (surface.flags.emissive) {
        out.emission += vec3f(0.05);
    }
    return out;
}
```

In the model pipeline, flags answer "what am I looking at":

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;   // lift world entities, exclude the hand
    }
    if (surface.flags.held) {
        out.colour *= 1.15;   // brighten the local player's held items
    }
    return out;
}
```

### Migrating from v4 (mechanical)

| v4 | v5 |
|---|---|
| `(surface.blockFlags & bloxdBlockFlagOpaque) != 0u` | `surface.flags.opaque` |
| `(surface.blockFlags & bloxdBlockFlagEmissive) != 0u` | `surface.flags.emissive` |
| `(surface.blockFlags & bloxdBlockFlagVegetation) != 0u` | `surface.flags.vegetation` |
| `(surface.blockFlags & bloxdBlockFlagDirt) != 0u` | `surface.flags.dirt` |
| `(surface.blockFlags & bloxdBlockFlagSand) != 0u` | `surface.flags.sand` |
| `(surface.blockFlags & bloxdBlockFlagRock) != 0u` | `surface.flags.rock` |

Remaining references to the `bloxdBlockFlag*` constants fail the analyzer's reserved-name diagnostic (the constants are deleted).

### Edge cases (exhaustive, from the header)

- «Rocky Dirt is rock too»
- «every sandstone, which is rock too»
- «Drawn as block models, so never part of terrain or flagged as opaque» — `slab`/`stairs`/`flat` faces never enter the Terrain program and never set `opaque`
- «Includes armour and cosmetics» — `lifeform` covers player equipment too
- «Not items or vehicles» — `placed` excludes vehicles

### Related

- Full v4 migration → [Version History: v5](../history/v5.md)
- Flag delivery internals → [Engine Internals](../internals/rendering-pipeline.md)

---

## Input & output structures

> Target API: 5 · Target build: `ab90qa` · Status: Analyzed (restored verbatim from the live header)

Seven structs are readable/writable by packs. Every field is listed below (`#ifdef` fields are conditional). The full header is in [Engine Internals](../internals/engine-header.md).

### BloxdVertexIn (vertex hook input)

```wgsl
struct BloxdVertexIn {
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
}
```

| Field | Type | Description |
|---|---|---|
| `position` | `vec3f` | render-space position (world space via `bloxdWorldPosition()`) |
| `normal` | `vec3f` | unit vector pointing away from the face |
| `localPosition` | `vec3f` | model-local coordinates; **`vec3f(0.0)` for terrain and liquid**; for a player's arm, a held sword or windmill blades this rotates with the model |
| `flags` | `BloxdFlags` | face kind ([Flags](flags.md)) |

### BloxdVertex (vertex hook output)

```wgsl
struct BloxdVertex {
    position: vec3f,      // The render position output.
}
```

### BloxdSurfaceIn (surface hook input)

```wgsl
struct BloxdSurfaceIn {
    colour: vec3f,        // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,           // Opacity.

    // Enchanted items and armour only, all 0 for anything else.
    enchantTier: u32,     // 1-5 for Tier 1-5.
    enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
    enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.

    // Players and mobs only, 0 for anything else: RGB overlay colour, e.g. the
    // red flash when hurt, and its alpha. bloxdLitColour mixes it into colour.
    overlayColour: vec4f,

    // These mean the same as in BloxdVertexIn, after the vertex hook.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.

    // These are all 0 if the face has no texture. Most models use textureId 0.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

| Field | Type | Description |
|---|---|---|
| `colour` | `vec3f` | RGB = texture × tint × AO, baked by the mesher |
| `alpha` | `f32` | opacity |
| `enchantTier` | `u32` | enchant tier 1–5; 0 for anything not enchanted |
| `enchantColour` | `vec4f` | enchant RGB plus an **animated** alpha (`.a`) — reading `.a` per fragment gives a moving pattern for free; all zero on unenchanted faces |
| `enchantSpeed` | `f32` | enchant pattern speed («faster at higher tiers») |
| `overlayColour` | `vec4f` | entity overlay (hurt flash etc.) RGB + alpha; 0 outside players/mobs; mixed in by `bloxdLitColour` before lighting |
| `position` / `normal` / `localPosition` / `flags` | — | same meanings as `BloxdVertexIn`, **after the vertex hook** (they follow moved vertices) |
| `textureId` | `u32` | this face's texture; compare with `bloxdTextureId*`; **0 when the face has no texture** — most models use textureId 0 (model-owned textures, player skins) |
| `textureRotation` | `u32` | quarter turns clockwise (0–3), applied by `bloxdTexel` |
| `uv` | `vec2f` | the texture spans 0–1; `fract(uv)` is drawn (integer steps tile) |
| `mipLevel` | `f32` | mipmap level: 0 = full size, 1 = half… |

### BloxdSurface (surface hook output)

```wgsl
struct BloxdSurface {
    colour: vec3f,        // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,           // Opacity output.
#endif
    emission: vec3f,      // Emissive RGB, added after lighting, before fog.
    enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
    overlayColour: vec4f, // Overlay output, mixed in by bloxdLitColour.
}
```

| Field | Type | Condition | Description |
|---|---|---|---|
| `colour` | `vec3f` | always | RGB output |
| `alpha` | `f32` | `#ifdef BLOXD_ALPHA` (all liquid + non-strict terrain/model) | opacity output |
| `emission` | `vec3f` | always | emissive RGB — **added after lighting, before fog** |
| `enchantColour` | `vec4f` | always | enchant output, mixed in by `bloxdLitColour` |
| `overlayColour` | `vec4f` | always | overlay output, mixed in by `bloxdLitColour` |

`bloxdDefaultSurface` passes `enchantColour` / `overlayColour` through unchanged, so the default look matches v4's engine-internal behavior. Zero `out.enchantColour` to remove the glint under custom lighting; amplify `out.overlayColour.a` to emphasize the hurt flash.

### BloxdLightIn (light hook input)

```wgsl
struct BloxdLightIn {
    litColour: vec3f,  // Lit and enchanted RGB colour, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 if none.
    diffuse: vec3f,    // The material's RGB response to directional light.
    emissive: vec3f,   // The material's RGB glow, added to directional light.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 when !bloxdLit().
    skyLight: f32,     // Sky light; 1 when !bloxdLit().
    ambientLightColour: vec3f, // Minimum RGB light; 1 when !bloxdLit().
    skyLightColour: vec3f, // RGB colour of skyLight; 1 when !bloxdLit().
    heldLight: vec3f,  // RGB held light; 0 when !bloxdLit() or no light held.
    fogColour: vec3f,  // The game's RGB fog colour; 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.

    // These are the same as in BloxdSurfaceIn.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

Field-by-field meaning and role in lighting math: see [Lighting](lighting.md).

**Versus v4**:

- `fogVisibility: f32` (1 = no fog) was renamed **`fogAlpha: f32` (0 = no fog, 1 = only fogColour)** — semantics inverted
- `diffuse` / `emissive` are new in v5 (v4 had only `directional` and `ambient`) — `bloxdShading()` can now rebuild the material response
- `engineColour` (v2–v4) is gone; `litColour` is «Lit and enchanted RGB colour, before emission and fog»
- light-level wording changed from «0 without BLOXD_LIGHTING» to «0 when !bloxdLit()» — the same facts in v5 vocabulary

### BloxdLight (light hook output)

```wgsl
struct BloxdLight {
    colour: vec3f, // RGB colour output.
}
```

### BloxdOpaqueBehind (special-function return)

```wgsl
struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}
```

Return value of `bloxdOpaqueBehind()`. Use in liquid variants behind an `#ifdef BLOXD_SCENE_DEPTH` guard (the field was `found: bool` in v2).

### Conditional fields ↔ macros

| Field | Exists when | Note |
|---|---|---|
| `BloxdSurface.alpha` | `#ifdef BLOXD_ALPHA` | all liquid variants + non-strict terrain/model |
| `bloxdOpaqueBehind()` call | `#ifdef BLOXD_SCENE_DEPTH` | all liquid variants |

`BLOXD_STRICT` controls **hook existence** (vertex hooks), not struct shape. See [Preprocessor](preprocessor.md).

### Writing conventions (recap)

- Never construct output structs directly — start from `bloxdDefault*`; in light hooks `var out = s;` also works
- A bare `var x: BloxdSurface;` is a validation error
- Hook parameters are read-only — copy before mutating

### Related

- [Lighting](lighting.md) · [Flags](flags.md) · [Texture API](texture-api.md)

---

## Functions

> Target API: 5 · Target build: `ab90qa` · Status: Analyzed (restored verbatim from the live header)

Every header function. The texture API (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`) is covered in [Texture API](texture-api.md), along with `bloxdOpaqueBehind`.

### Frame functions (same value for the entire frame)

Header note: *"These functions return the same value for the entire frame."* They read the `bloxdPackInputs` uniform, so they are callable from vertex hooks and module-scope functions too.

#### bloxdEyePosition

```wgsl
fn bloxdEyePosition() -> vec3f
```

- **Returns**: the camera's render position
- **Callable from**: all 9 hooks + module scope
- **Uses**: view vectors (`normalize(l.position - bloxdEyePosition())`), rim light, distances

#### bloxdRenderOffset

```wgsl
fn bloxdRenderOffset() -> vec3i
```

- **Returns**: integer block offset; **render position + this offset = world position**
- Changes as the player travels (keeps render positions near 0,0,0)
- Used internally by `bloxdWorldPosition()`

#### bloxdSunDirection

```wgsl
fn bloxdSunDirection() -> vec3f
```

- **Returns**: unit vector toward the sun in world orientation; **zero vector when there is no sun**
- **Facts**:
  - **the moon is always at `-bloxdSunDirection()`** (the engine places it opposite the sun)
  - **never pass the zero vector to `normalize`** — guard with `dot(d, d) < 1e-8` and fall back to a constant direction
  - the current build has no day-night cycle; sun, moon and stars do not move during a session (only opacity toggles). In the default earth sky the sun sits near `(−0.56, 0.81, −0.18)` (elevation ≈ 54°)
- **Uses**: color temperature, light direction, sun gating, pseudo moonlight

#### bloxdSeconds

```wgsl
fn bloxdSeconds() -> f32
```

- **Returns**: seconds since the page loaded (no wrap — f32 keeps sub-millisecond precision for the first 4.5 hours)
- **Uses**: animation; recurring timers via `bloxdSeconds() % period`
- **Note**: unlike v2's `bloxdTime()` (which wrapped at 3600s), it does not wrap

#### bloxdLit

```wgsl
// Whether block and sky lighting is on. When it's off, BloxdLightIn's
// blockLight and heldLight are 0, and its skyLight and light colours are 1.
fn bloxdLit() -> bool
```

- **Returns**: whether block & sky lighting is enabled
- **New in v5**: replaces v4's `#ifdef BLOXD_LIGHTING` compile-time branch with a runtime check
- **Guarantees when off** (header note): `blockLight` and `heldLight` are 0; `skyLight` and the light colors (`ambientLightColour` / `skyLightColour`) are 1
- **Use**: gate lighting-dependent code:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    // ... lighting-enabled processing
    return out;
}
```

Using `BLOXD_LIGHTING` produces *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

### Coordinate conversion

#### bloxdWorldPosition

```wgsl
// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f
```

- **Returns**: `position + vec3f(bloxdRenderOffset())`
- **Note**: f32 precision limits mean far coordinates can be inexact (header: *"with possible f32 inaccuracy"*)

#### bloxdFragmentBlockPosition — removed

`bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i` (existed through v4) was **removed in v5 with no replacement**. It reconstructed a fragment's block position from position and normal, but nothing remained that needed it between `uv`, `flags` and the model inputs; continuous values are covered by `bloxdWorldPosition()`. Delete call sites.

### Default functions (engine behavior)

#### bloxdDefaultVertex

```wgsl
fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex
// impl: return BloxdVertex(vertex.position);
```

#### bloxdDefaultSurface

```wgsl
fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface
```

Passes `colour` through, passes `enchantColour` / `overlayColour` unchanged, zeroes `emission` (and passes `alpha` in `BLOXD_ALPHA` variants). **Output structs can only be built via this function.**

#### bloxdDefaultLight

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight
// impl:
//   let lit = bloxdLitColour(surface, light);
//   return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
```

Literally "apply the engine's recipe, then fog the emission-added result".

### Lighting recipe functions (published in v5)

What v4 authors kept re-deriving by hand is now documented as callable WGSL. Explanations and the flow diagram: [Lighting](lighting.md).

| Function | Signature | Role |
|---|---|---|
| `bloxdShading` | `(light: BloxdLightIn) -> vec3f` | how the face's material & angle light it (Lambert × diffuse + emissive + ambient, clamped 0–1) |
| `bloxdWorldLight` | `(light: BloxdLightIn) -> vec3f` | the world's light here (brightest of block/sky/held, floored by `ambientLightColour`) |
| `bloxdLitColour` | `(surface: BloxdSurface, light: BloxdLightIn) -> vec3f` | the surface's color lit as the engine does (before emission and fog) |
| `bloxdApplyFog` | `(colour: vec3f, light: BloxdLightIn) -> vec3f` | apply this fragment's fog (`mix(colour, fogColour, fogAlpha)`) |

### Special functions

#### bloxdOpaqueBehind

```wgsl
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind
```

- **Returns**: `BloxdOpaqueBehind` (`hit: bool`, `position: vec3f`, `distance: f32`)
- **Callable from**: surface / light hooks only (the depth texture is FRAGMENT-only)
- **Guard**: `#ifdef BLOXD_SCENE_DEPTH` (defined in liquid variants)
- **Meaning**: the opaque face behind this fragment (terrain seen through water); `hit == false` for sky
- **Rename from v2**: `found` → `hit`
- **Deep dive**: [Version History: v3](../history/v3.md) and [Engine Internals](../internals/rendering-pipeline.md)

### Related

- [Lighting](lighting.md) · [Texture API](texture-api.md) · [Pack format](pack-format.md)

---

## Lighting

> Target API: 5 · Target build: `ab90qa` · Status: Analyzed (restored verbatim from the live header)

v5 published the lighting API. What the engine did internally (building `litColour`) is now callable from packs. This page covers the lighting inputs, functions, and processing order as a system.

### The full pipeline

The complete color chain, as the default light-stage implementation (`bloxdDefaultLight`) shows it:

```
surface.colour
    │  mix with overlayColour (mix(colour, overlay.rgb, overlay.a))
    ▼
overlaid
    │  multiply by bloxdShading(light) — material & angle response
    ▼
shaded
    │  mix with enchantColour (mix(shaded, enchant.rgb, enchant.a))
    ▼
enchanted
    │  multiply by bloxdWorldLight(light) — world light (brightest of block/sky/held)
    ▼
lit = bloxdLitColour(surface, light)   ← the color "before emission and fog"
    │  + surface.emission               ← emission added after lighting
    ▼
    │  bloxdApplyFog(colour, light)      ← mix(colour, fogColour, fogAlpha)
    ▼
BloxdLight.colour (final color)
```

`bloxdLitColour()` order (header summary: *"mixed with overlayColour, then bloxdShading, then mixed with enchantColour, then bloxdWorldLight"*):

1. apply `overlayColour`
2. shade with `bloxdShading()`
3. apply `enchantColour`
4. apply world light with `bloxdWorldLight()`

Emission and fog order: **emission is added after lighting and before fog**, and fog sinks emission too (`bloxdDefaultLight` = `bloxdApplyFog(lit + emission, light)`).

### Functions

#### bloxdLit() — the gate

```wgsl
fn bloxdLit() -> bool
```

Whether block & sky lighting is on. **Guarantees when off**:

| Field | Value when off |
|---|---|
| `blockLight` / `heldLight` | `0` |
| `skyLight` | `1` |
| `ambientLightColour` / `skyLightColour` | `1` (white) |

v4's `#ifdef BLOXD_LIGHTING` is gone. Replace with `if (!bloxdLit()) { return bloxdDefaultLight(...); }`.

#### bloxdShading() — material & angle response

```wgsl
fn bloxdShading(light: BloxdLightIn) -> vec3f {
    let diffuse = light.directional * light.diffuse;
    return saturate(diffuse + light.emissive + light.ambient);
}
```

- multiplies `directional` (summed Lambert) by `diffuse` (material RGB response), adds `emissive` (material glow) and `ambient` (RGB ambient), clamps to 0–1
- **the new v5 inputs `diffuse` / `emissive`** let you swap just the Lambert term while keeping the engine's material response

#### bloxdWorldLight() — the world's light

```wgsl
fn bloxdWorldLight(light: BloxdLightIn) -> vec3f {
    let ambientLight = light.ambientLightColour;
    let blockLight = ambientLight + light.blockLight * (1.0 - ambientLight);
    let skyLight = mix(ambientLight, light.skyLightColour, light.skyLight);
    let heldLight = ambientLight + light.heldLight * (1.0 - ambientLight);
    return max(max(blockLight, skyLight), heldLight);
}
```

- shapes each of the three channels (block / sky / held) with `ambientLightColour` as the floor, then takes the **brightest**
- `skyLight` interpolates from `ambientLightColour` toward `skyLightColour` by the sky-light amount

#### bloxdLitColour() — the engine recipe

```wgsl
fn bloxdLitColour(surface: BloxdSurface, light: BloxdLightIn) -> vec3f {
    let overlay = surface.overlayColour;
    let overlaid = mix(surface.colour, overlay.rgb, overlay.a);
    let shaded = bloxdShading(light) * overlaid;
    let enchant = surface.enchantColour;
    let enchanted = mix(shaded, enchant.rgb, enchant.a);
    return max(enchanted * bloxdWorldLight(light), vec3f(0.0));
}
```

#### bloxdApplyFog() — fog

```wgsl
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}
```

- `fogAlpha`: **0 = no fog, 1 = only fogColour** (inverted from v4's `fogVisibility`)
- `fogColour` is the game's fog RGB; **`vec3f(0.0)` when the game has no fog**

#### bloxdDefaultLight() — the whole default

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

### Input fields (BloxdLightIn)

| Field | Type | Meaning | Note |
|---|---|---|---|
| `litColour` | `vec3f` | lit & enchanted RGB (before emission and fog) | a result value, not a source |
| `directional` | `f32` | summed Lambert from directional lights | 0 when no directional lights |
| `diffuse` | `vec3f` | material RGB response to directional light | new in v5 |
| `emissive` | `vec3f` | material RGB glow (added to directional) | new in v5 |
| `ambient` | `vec3f` | RGB ambient (added to directional) | |
| `blockLight` | `vec3f` | RGB block light | 0 when `!bloxdLit()` |
| `skyLight` | `f32` | sky light | 1 when `!bloxdLit()` |
| `ambientLightColour` | `vec3f` | minimum RGB light (floor) | 1 when `!bloxdLit()` |
| `skyLightColour` | `vec3f` | RGB color of skyLight | 1 when `!bloxdLit()` |
| `heldLight` | `vec3f` | RGB held light | 0 when `!bloxdLit()` or nothing held |
| `fogColour` | `vec3f` | game fog RGB | 0 with no fog |
| `fogAlpha` | `f32` | 0 = no fog, 1 = only fogColour | inverted from v4 `fogVisibility` |

### Light-level physics (background, skippable)

- **`blockLight` / `skyLight` / `heldLight` arrive mapped to 0–1**: the 0–15 levels through an ease-out curve (e.g. `6 → 0.45`, `12 → 0.92`). All exclude `ambientLightColour`
- **Lift curve**: `skyLight` is really "can this position see the sky" — voxel occlusion data, i.e. a shadow map. Threshold-based sun/shade separation may need the inverse transform (see the [realism guide](../guides/realism.md))
- **Fog internals**: in linear mode `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)` (clamped 0..1), computed per vertex in view space. The current build is linear-only (details in [Engine Internals: Fog Internals](../internals/fog-internals.md))

### Recipes

#### Custom shading + the engine's world light

What v4 authors approximated by scaling `litColour` can now be written exactly:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let nDotL = light.directional; // already summed Lambert
    let wrapped = nDotL * 0.5 + 0.5;
    let shaded = saturate(wrapped * light.diffuse + light.emissive + light.ambient);
    let colour = max(shaded * bloxdWorldLight(light), vec3f(0.0));
    return BloxdLight(bloxdApplyFog(colour + surface.emission, light));
}
```

#### Keep the engine's world light, boost emission only

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission * 2.0, light));
}
```

#### Night blue shift (skyLight-driven)

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    let night = 1.0 - light.skyLight;
    out.colour = mix(out.colour, out.colour * vec3f(0.75, 0.82, 1.15), night * 0.6);
    return out;
}
```

### Related

- [Functions](functions.md) · [Guides: lighting](../guides/lighting.md) · [Engine Internals: Lighting Internals](../internals/lighting-internals.md)

---

## Texture API

> Target API: 5 · Target build: `ab90qa` · Status: Verified (API unchanged since v4, re-confirmed on the v5 build)

The API for reading the block-texture atlas, introduced in v4 and carried into v5 unchanged. Two functions, a named-constant family, and four input fields. The header's own one-liner: *"This face's texture. Compare with `bloxdTextureId*`."*

### bloxdTexel

```wgsl
fn bloxdTexel(textureId: u32, uv: vec2f, mipLevel: f32) -> vec4f
```

- **Callable from**: **surface / light hooks only** (reaching it from a vertex hook fails with a "reaches" diagnostic)

Samples the block-texture atlas **exactly as the engine's own sampler does** — same `texture_2d_array<f32>` atlas, same sampler, `textureSampleLevel` at `round(mipLevel)` — so the texel you read structurally matches the texel the engine drew.

Semantics:

- **`textureId == 0` returns `vec4f(1.0)` (white).** That is the "no texture" id; texture-less faces carry 0 in all four input fields, so `bloxdTexel(surface.textureId, ...)` is always safe to call
- **Animated textures automatically return the current frame.** Frames advance on the game's animation clock — you cannot stop or step them, and never need to
- **`mipLevel` clamps exactly like the engine's own**: `clamp(round(mipLevel), 0, textureNumLevels(textureAtlas0) - 1)`; out-of-range mips saturate rather than error
- **The fragment's own `textureRotation` is applied to the uv you pass** (see below)

`textureId` is **1-based**: `bloxdTextureIdGrassTop` is the id, and the atlas layer the engine samples for it is `id - 1`. Ids are stable per texture *name*, not per atlas slot — the engine reshuffles the atlas across builds, but the named comparison keeps its meaning.

### bloxdTextureSize

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

### Model-owned textures (textureId: 0)

**`bloxdTexel()` can also read model-owned textures** — most notably via `textureId: 0`:

- **Player skins** and other non-atlas model textures (mobs etc.) use `textureId: 0`
- Header note: *"These are all 0 if the face has no texture. **Most models use textureId 0.**"* — most models bypass the atlas
- Passing 0 to `bloxdTexel()` returns white `vec4f(1.0)`, never an error. Atlas-reading code takes effect only on faces with `textureId != 0u`:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        // only faces whose texture lives in the atlas (block models)
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

- **Skins vs the atlas**: the atlas maps texture *names* to layers and is comparable via `bloxdTextureId*`. Model-owned textures (skins) are not in that namespace and arrive as id 0. `surface.colour` already contains skin × tint, so work from it
- **`bloxdTextureSize()`** still reports the *atlas* size on model faces (not the model texture's size)

### bloxdTextureId*: named texture constants

Every usable texture name becomes a comparable `const`. **Spelling is the file name CamelCased**:

| Texture file | Constant | Note |
|---|---|---|
| `grass_top.png` | `bloxdTextureIdGrassTop` | the engine's own example |
| `lava0.png` (frames `lava0`–`lava7`) | `bloxdTextureIdLava` | animation family: frame suffixes drop from the canonical name |
| `black_portal0.png` (frames 0–3) | `bloxdTextureIdBlackPortal` | same rule |
| `radar_screen0` (turned copies `[rot[1`–`[rot[4`) | `bloxdTextureIdRadarScreen0` | rotation family: folds to the root name |

#### Spelling rules and naming freedom

- **Generation rule** (restored from the validator): split the name on non-alphanumeric runs, capitalize each part, concatenate after the `bloxdTextureId` prefix
- **Case and underscores are not distinguished**: reverse matching (the name a pack wrote → registry name) folds both your spelling and the engine's, so e.g. `bloxdTextureIdGrassTop` and `bloxdTextureId_grass_top` resolve to **the same constant**
- **Animated textures take no frame number**: `lava` is the name; `lava0` is a dedicated error
- **Rotation families use the root name**: writing a turned-copy spelling produces a dedicated message

#### Name-resolution errors (verbatim from the validator)

> **Prefix misspelling / case:** `bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?`
>
> **Animation frame:** `...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates.`
>
> **Turned copy:** `...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, which bloxdTexel turns as each face shows it.`
>
> **Ambiguous after folding:** `...could name X and Y, which differ only by case or underscores, so it can't be used.`
>
> **Not found (with suggestion):** `There's no texture called X. Did you mean bloxdTextureIdY?` — suggestion threshold is Levenshtein distance `max(2, floor(len/4)) + 1` (new in v5)
>
> **Not found (no suggestion):** `There's no texture called X. Texture names are the file names texture packs use, as in bloxdTextureIdGrassTop for grass_top.png; BLOCK_TEXTURES.md lists them.`

#### Only referenced constants are emitted

The header's `bloxdTextureId*` block is generated **per pack** from the names it actually references — a pack using 3 constants gets 3 `const` lines, not ~900.

### Input fields

The four texture fields on `BloxdSurfaceIn` / `BloxdLightIn`:

| Field | Type | Description |
|---|---|---|
| `textureId` | `u32` | this face's texture; compare with `bloxdTextureId*`; 0 = none |
| `textureRotation` | `u32` | quarter turns clockwise (0–3), applied by `bloxdTexel` |
| `uv` | `vec2f` | the texture spans 0–1; `fract(uv)` is drawn |
| `mipLevel` | `f32` | mip level: 0 = full size, 1 = half… |

### The rotation subtlety — a neutral sampler

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

### Worked examples

#### Emission from texel luminance

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

#### Texture-specific effects

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

#### Depth-of-field-style distance blur

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

### Where the texture API can't go

- **Not callable from vertex hooks** — "reaches" diagnostics reject it
- **You cannot add textures** — the atlas is the engine's; the API only reads it. Custom textures remain the texture-pack system's job
- **Non-atlas renderer configurations degrade to stubs** — `bloxdTextureSize() -> vec2u(1u)` and `bloxdTexel(...) -> vec4f(1.0)`, with the four inputs flowing `0u, 0u, vec2f(0.0), 0.0`. Code written for the real atlas still compiles and runs — it just sees white texels and a 1×1 size. Code that tolerates `textureId == 0` tolerates this too

### Related

- **All 896 usable names** → [Texture catalog](texture-catalog.md)
- [Engine Internals: Texture Registry](../internals/texture-registry.md) · [Texture Sampling](../internals/texture-sampling.md)

---

## Constants

> Target API: 5 · Target build: `ab90qa` · Status: Analyzed (restored verbatim from the live header)

The header provides three constants (texture name constants `bloxdTextureId*` are covered in [Texture API](texture-api.md)).

```wgsl
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Blocks along each side of a chunk.
const bloxdChunkSize: i32 = 32;
```

| Constant | Type | Value | Description |
|---|---|---|---|
| `bloxdPi` | `f32` | 3.1415926535898 | pi |
| `bloxdTau` | `f32` | 6.2831853071796 | 2π (handy for periods) |
| `bloxdChunkSize` | `i32` | 32 | blocks along each side of a chunk (**new in v5**) |

### Usage

#### bloxdPi / bloxdTau

Declared for you — no need to define your own pi. `bloxdTau` is convenient for periodic animation:

```wgsl
fn sway(worldPos: vec3f, time: f32) -> f32 {
    let phase = dot(worldPos, vec3f(1.0, 0.5, 0.8));
    return sin(time * bloxdTau / 3.0 + phase);
}
```

#### bloxdChunkSize — new in v5

The engine's former magic number "chunks are 32 blocks wide" is now a named constant you can branch on. Useful for chunk-periodic effects (checkerboards, chunk-border accents):

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    let p = bloxdWorldPosition(light.position);
    let chunk = floor(p / f32(bloxdChunkSize));
    let parity = (chunk.x + chunk.z) % 2.0;
    out.colour *= mix(1.0, 0.96, parity);
    return out;
}
```

Note: `bloxdChunkSize` is `i32` — cast with `f32(bloxdChunkSize)` when mixing with floats.

### Related

- [Functions](functions.md) · [Version History: v3](../history/v3.md) (where `bloxdPi` / `bloxdTau` arrived)

---

## Preprocessor

> Target API: 5 · Target build: `ab90qa` · Status: Analyzed (restored from the live validator)

Conditional compilation supports only `#define NAME` (no value) / `#ifdef` / `#ifndef` / `#else` / `#endif`. The `#` goes at the start of a line (inside functions is fine). Flag-name matching is case-insensitive; a wrong `#ifdef` name makes the error message list the official set.

### Defined macros (3)

| Macro | Defined in | Typical use |
|---|---|---|
| `BLOXD_STRICT` | strict-game variants (strict.terrain / strict.liquid / strict.model) | `#ifndef BLOXD_STRICT` around whole vertex hooks and `discard` |
| `BLOXD_ALPHA` | variants where `BloxdSurface.alpha` exists — all liquid + non-strict terrain/model | wrap alpha-touching code |
| `BLOXD_SCENE_DEPTH` | all liquid variants | wrap `bloxdOpaqueBehind()` calls |

### Macro × variant matrix

| Variant | `BLOXD_STRICT` | `BLOXD_ALPHA` | `BLOXD_SCENE_DEPTH` |
|---|---|---|---|
| `allow.terrain` | – | ✓ | – |
| `allow.liquid` | – | ✓ | ✓ |
| `allow.model` | – | ✓ | – |
| `strict.terrain` | ✓ | – | – |
| `strict.liquid` | ✓ | ✓ | ✓ |
| `strict.model` | ✓ | – | – |

Terrain / liquid / model differences are **separate programs, not macros** — `#ifdef BLOXD_TERRAIN` does not exist.

### Removed macros

- **`BLOXD_LIGHTING`** — removed in v5. Lighting state is a runtime question for [`bloxdLit()`](lighting.md#bloxdlit--the-gate), not a compile branch. Using it fails validation with:

> *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

v4 migration pattern:

```wgsl
// v4 (fails validation on v5)
#ifdef BLOXD_LIGHTING
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight { ... }
#endif

// v5 (migrated)
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    // ... lighting-enabled processing
}
```

### Example

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // terrain has alpha only in allow
    out.alpha = s.alpha;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex hooks always need this guard
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdSeconds()) * 0.05;
    return out;
}
#endif
```

### Macros shape the structs

- `BloxdSurface.alpha` exists only inside `#ifdef BLOXD_ALPHA`
- `bloxdOpaqueBehind()` is callable only inside `#ifdef BLOXD_SCENE_DEPTH`

See [Structures](structures.md#conditional-fields--macros).

### Related

- [Getting Started: Variants](../getting-started/variants.md) · [Engine Internals: Shader Validation](../internals/shader-validation.md)

---

## Restrictions & reserved names

> Target API: 5 · Target build: `ab90qa` · Status: Verified (v4 limits re-confirmed byte-identical on v5)

What packs may write, and the complete name-reservation rules.

### Allowed

- WGSL built-ins (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select`, …)
- your own `fn` / `struct` / `const` / `alias` / `var<private>`, in-function `let` and control flow (if/for/while/switch…)
- derivatives (`dpdx` / `dpdy` / `fwidth`) in surface/light hooks (fragment stage) only — not in vertex hooks
- `const` arrays (color LUTs etc.), pointers (`ptr<function, T>`), matrices (`mat3x3f` etc.)
- flag definitions `#define NAME` (no value) + `#ifdef` conditionals

### Forbidden / caveats

- **No direct textures**: you cannot declare `texture_*` / `sampler` types; atlas reads go through [`bloxdTexel`](texture-api.md) only. *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- **`discard` is forbidden in strict** — wrap in `#ifndef BLOXD_STRICT`
- `@attributes` / `enable` / `requires` / `override` are forbidden — no `enable f16;`, so **no f16 types**
- no `@builtin`, so `fragCoord` / `vertex_index` are unreachable
- **no module-scope `let`** — use `const` or `var`
- no `atomic`
- **never construct output structs directly**: `BloxdLight(...)` fails static validation; start from `bloxdDefault*`
- a bare `var x: BloxdSurface;` is a validation error
- hook parameters are read-only — copy before mutating
- `#define` takes no value (names only)

### Reserved names

#### The bloxd prefix (general rule)

**Every identifier matching `/^bloxd/i` (case-insensitive) is reserved.** The only exceptions are the 9 hook function names.

Validator wording, verbatim:

> *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*

#### The bloxdSp* namespace (46 symbols)

Symbols the code generator may inject and therefore cannot be redeclared (grown from 27 to 46 in v5):

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

The new names map directly to v5 features: `bloxdSpFlags` (flag struct delivery), `bloxdSpEnchant` / `bloxdSpItemLocalPosition` (new inputs), the cell-sampling texture-pack path, the rotation chain, and extended-hook locals. **The pack-level reservation rule is broader than this list** (everything matching `/^bloxd/i`), so you don't need to memorize it — just never start your own names with `bloxd`.

#### Texture names

Identifiers starting `bloxdTextureId` are resolved as texture-name constants ([Texture API](texture-api.md#bloxdtextureid-named-texture-constants)).

### Auto-rewrite introduced in v5

- **Y-derivative sign flip**: the analyzer rewrites every call to `dpdy`, `dpdyCoarse` and `dpdyFine` as `(-dpdy(...))` (measured in the validator's token-rewrite pass; the dpdy family is explicitly enumerated as the inversion set). Screen-space y points down, so this inversion makes "rate of change upward" match intuition. Write `dpdy(h)` with the intent "how does h change as I go up" and the emitted code carries the flip. `dpdx` and the `fwidth` family are untouched

### Diagnostics you'll actually see

- *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*
- *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- *"X reaches bloxdTexel, which only surface and light hooks can use."*
- *"X reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and Y doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH."*
- *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

### Related

- [Troubleshooting: compilation](../troubleshooting/compilation.md) · [Engine Internals: Shader Validation](../internals/shader-validation.md)

---

## Compatibility

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Verified

How the current game and old-version packs interoperate.

### Accepted versions

**Only `apiVersion: 5`.** The loader compares `manifest.apiVersion !== 5` strictly and v1/v2/v3/v4 packs **fail at the instant of load**. No multi-version acceptance exists.

### Load-time messages (verbatim from the live i18n dictionary)

- `pack.json needs "apiVersion": {{version}}.` — the `apiVersion` key is missing
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — the key exists but isn't 5

### Saved old packs (no exceptions — silent inactivation)

Previously-saved v1–v4 packs don't throw. The saved-pack result resolves to:

```
{kind: "none", reason: "otherApiVersion"}
```

and the pack becomes **silently inactive**. Only the shader-pack settings tab explains why:

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

### The nature of the v4 → v5 conversion

The conversion is mostly mechanical (full checklist in [the v5 migration guide](../history/v5.md)):

- `blockFlags & bloxdBlockFlagX != 0u` → `flags.x` (a 1:1 rename)
- `#ifdef BLOXD_LIGHTING` → `if (bloxdLit()) { ... } else { return bloxdDefaultLight(...); }`
- delete `bloxdFragmentBlockPosition` call sites (no replacement)
- bump `pack.json` to `"apiVersion": 5`

The quiet trap this time: packs that keep reading `blockFlags` or wrapping light hooks in `#ifdef BLOXD_LIGHTING` **fail validation with dedicated messages** (the analyzer now explains both cases), so nothing misbehaves silently — they just stay refused until migrated.

### Saved-pack re-validation ("needs re-check")

`HEADER_VERSION` is `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` (the leading integer went from v4's 8 to 9). When the engine's header or texture registry changes (common with game updates), saved packs are marked "needs re-check" and re-validate automatically on page load.

A measured example of registry movement (two builds, 10 days apart): entries 1200 → 1219 (98 added, 79 removed), and of the names that kept their spelling, **779 of 1121 changed id**. In other words:

- **packs written with names (`bloxdTextureIdLava`) survive drift** (the loader re-resolves against the live registry)
- **packs written with raw ids (`19`) break on re-validation**

Details: [Engine Internals: Texture Registry](../internals/texture-registry.md).

### Runtime environments

- **WebGPU-renderer only**: installing a pack force-enables the WebGPU renderer
- **Mobile**: WebGPU-limited environments can't run packs at all ([Requirements](../getting-started/requirements.md))
- **Non-atlas renderer configurations**: `bloxdTexel` / `bloxdTextureSize` degrade to stubs (white texels, 1×1); code still compiles and runs ([Texture API](texture-api.md#where-the-texture-api-cant-go))

### Version support summary

| API version | Live since | Treatment by the current game |
|---|---|---|
| v1 | — | rejected at load (migrate via [v2](../history/v2.md)) |
| v2 | — | rejected at load |
| v3 | 2026-10-19 | rejected at load |
| v4 | 2026-10-26 | rejected at load |
| **v5** | **2026-11-03** | **current** |

### Related

- [v5 migration checklist](../history/v5.md) · [Version History](../history/)

---

## Texture catalog

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Verified (extracted by re-running the engine's own registry builder)

The complete catalog of usable texture-name constants (`bloxdTextureId*`). **896 names**, alphabetical.

### How to read

The **name** column is the registry name — the handle you actually write. Constant spelling CamelCases the file name: `grass_top` → `bloxdTextureIdGrassTop`, `lava` → `bloxdTextureIdLava`. **Case and underscores are not distinguished** (`bloxdTextureId_grass_top` resolves identically to `bloxdTextureIdGrassTop`). Names are the API — the loader re-resolves them against the live registry at load, so names survive registry drift ([Texture API](texture-api.md)).

The **id** column is the value the constant compares against — measured on `ab90qa` (atlas layer + 1). Use it to decode `surface.textureId` dumps and to cross-check debug output against the day's build. **Never write ids into WGSL** — they are a snapshot of one build's atlas order (see the drift measurements below).

The **notes** column marks the two folding families. "anim (N frames)" means sampling this name automatically returns the current animation frame — **never write the frame suffix** (`lava0` is a known alias with a dedicated diagnostic). "rotation family (4 copies)" means the texture exists only as pre-rotated slots — the name refers to the root and `bloxdTexel` re-applies the rotation. Exactly one name (`radar_screen`) carries both notes.

Deliberately **not** listed: the remaining registry spellings — 188 frame aliases and 228 rotation aliases — which are not usable constants; writing them draws dedicated engine error messages. The underlying 1,210-row layer table (including 171 pre-rotated slots) is engine-internal and covered in [Engine Internals: Texture Registry](../internals/texture-registry.md).

### The catalog

All usable names, alphabetically. The id column is the `bloxdTextureId*` value — measured on `ab90qa` (2026-11-03). **Ids are snapshots; treat names as the API**: even between the v4 build (cnty9) and this build, 334 of the names that kept their spelling changed id (see the drift measurements below).

| Name | id (ab90qa) | Notes |
|---|---|---|
| `alloy_kiln_back` | 1089 |  |
| `alloy_kiln_front` | 1083 |  |
| `alloy_kiln_side` | 1084 |  |
| `alloy_kiln_side_running` | 33 | anim (4 frames) |
| `alloy_kiln_top` | 1085 | rotation family (4 copies) |
| `andesite_brick` | 465 |  |
| `apple_block_bottom` | 441 |  |
| `apple_block_side` | 439 |  |
| `apple_block_top` | 440 |  |
| `armour_lucky_block` | 993 |  |
| `armour_lucky_block_rare` | 995 |  |
| `armour_lucky_block_super` | 997 |  |
| `artisan_table_side` | 367 |  |
| `artisan_table_top` | 368 |  |
| `ash` | 1029 |  |
| `auto_bench_back` | 1104 |  |
| `auto_bench_front` | 1098 |  |
| `auto_bench_side` | 1099 |  |
| `auto_bench_side_running` | 35 | anim (4 frames) |
| `auto_bench_top` | 1100 | rotation family (4 copies) |
| `autocrafter_bottom` | 960 |  |
| `autocrafter_lunite_bottom` | 971 |  |
| `autocrafter_lunite_side` | 970 |  |
| `autocrafter_side` | 959 |  |
| `banana_block_side` | 897 |  |
| `banana_block_top` | 898 |  |
| `beacon` | 330 |  |
| `bedrock` | 334 |  |
| `beetroot_block_bottom` | 923 |  |
| `beetroot_block_side` | 921 |  |
| `beetroot_block_top` | 922 |  |
| `belt_drop_side` | 1183 |  |
| `belt_drop_top` | 1182 |  |
| `belt_lift_side` | 1181 |  |
| `belt_lift_top` | 1180 |  |
| `belt_loader_slab_front` | 1108 |  |
| `belt_loader_top` | 1107 |  |
| `belt_tunnel_back` | 1197 |  |
| `belt_tunnel_exit_top` | 1198 | rotation family (4 copies) |
| `belt_tunnel_mouth` | 1191 |  |
| `belt_tunnel_side` | 1192 |  |
| `belt_tunnel_top` | 1193 | rotation family (4 copies) |
| `black_concrete` | 273 |  |
| `black_glazed_terracotta` | 429 | rotation family (4 copies) |
| `black_planks` | 366 |  |
| `black_portal` | 2 | anim (4 frames) |
| `black_spawn_block_side` | 760 |  |
| `black_spawn_block_top` | 756 | rotation family (4 copies) |
| `block_destroyer_tnt_side` | 1015 |  |
| `block_destroyer_tnt_top` | 1016 |  |
| `blue_concrete` | 274 |  |
| `blue_gen_spawn_coal` | 774 |  |
| `blue_gen_spawn_iron` | 775 |  |
| `blue_gen_spawn_top` | 773 |  |
| `blue_glazed_terracotta` | 413 | rotation family (4 copies) |
| `blue_lucky_block` | 992 |  |
| `blue_lucky_block_rare` | 994 |  |
| `blue_lucky_block_super` | 996 |  |
| `blue_planks` | 362 |  |
| `blue_portal` | 3 | anim (4 frames) |
| `blue_spawn_block_side` | 755 |  |
| `blue_spawn_block_top` | 751 | rotation family (4 copies) |
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
| `bowling_alley_floor` | 976 |  |
| `bread_block_back` | 435 |  |
| `bread_block_front` | 434 |  |
| `bread_block_side` | 436 |  |
| `bread_block_top` | 437 |  |
| `brick` | 315 |  |
| `brown_concrete` | 275 |  |
| `brown_glazed_terracotta` | 417 | rotation family (4 copies) |
| `brown_mushroom_block` | 536 |  |
| `brown_planks` | 363 |  |
| `brown_portal` | 4 | anim (4 frames) |
| `brown_spawn_block_side` | 750 |  |
| `brown_spawn_block_top` | 746 | rotation family (4 copies) |
| `building_lucky_block` | 987 |  |
| `building_lucky_block_rare` | 989 |  |
| `building_lucky_block_super` | 991 |  |
| `burner_drill_back` | 1046 |  |
| `burner_drill_bottom` | 1045 |  |
| `burner_drill_front` | 1039 |  |
| `burner_drill_side` | 1040 |  |
| `burner_drill_side_running` | 27 | anim (4 frames) |
| `burner_drill_top` | 1041 | rotation family (4 copies) |
| `cactus_dry` | 350 |  |
| `cactus_top` | 349 |  |
| `carrot_block_bottom` | 919 |  |
| `carrot_block_side` | 917 |  |
| `carrot_block_top` | 918 |  |
| `carved_messy_stone` | 826 |  |
| `carved_pumpkin` | 543 |  |
| `chalk` | 837 |  |
| `chalk_black` | 853 |  |
| `chalk_blue` | 852 |  |
| `chalk_bricks_black` | 869 |  |
| `chalk_bricks_blue` | 868 |  |
| `chalk_bricks_brown` | 867 |  |
| `chalk_bricks_cyan` | 866 |  |
| `chalk_bricks_gray` | 865 |  |
| `chalk_bricks_green` | 864 |  |
| `chalk_bricks_light_blue` | 863 |  |
| `chalk_bricks_light_gray` | 862 |  |
| `chalk_bricks_lime` | 861 |  |
| `chalk_bricks_magenta` | 860 |  |
| `chalk_bricks_orange` | 859 |  |
| `chalk_bricks_pink` | 858 |  |
| `chalk_bricks_purple` | 857 |  |
| `chalk_bricks_red` | 856 |  |
| `chalk_bricks_slab_side_black` | 885 |  |
| `chalk_bricks_slab_side_blue` | 884 |  |
| `chalk_bricks_slab_side_brown` | 883 |  |
| `chalk_bricks_slab_side_cyan` | 882 |  |
| `chalk_bricks_slab_side_gray` | 881 |  |
| `chalk_bricks_slab_side_green` | 880 |  |
| `chalk_bricks_slab_side_light_blue` | 879 |  |
| `chalk_bricks_slab_side_light_gray` | 878 |  |
| `chalk_bricks_slab_side_lime` | 877 |  |
| `chalk_bricks_slab_side_magenta` | 876 |  |
| `chalk_bricks_slab_side_orange` | 875 |  |
| `chalk_bricks_slab_side_pink` | 874 |  |
| `chalk_bricks_slab_side_purple` | 873 |  |
| `chalk_bricks_slab_side_red` | 872 |  |
| `chalk_bricks_slab_side_white` | 871 |  |
| `chalk_bricks_slab_side_yellow` | 870 |  |
| `chalk_bricks_white` | 855 |  |
| `chalk_bricks_yellow` | 854 |  |
| `chalk_brown` | 851 |  |
| `chalk_cyan` | 850 |  |
| `chalk_gray` | 849 |  |
| `chalk_green` | 848 |  |
| `chalk_light_blue` | 847 |  |
| `chalk_light_gray` | 846 |  |
| `chalk_lime` | 845 |  |
| `chalk_magenta` | 844 |  |
| `chalk_orange` | 843 |  |
| `chalk_pink` | 842 |  |
| `chalk_purple` | 841 |  |
| `chalk_red` | 840 |  |
| `chalk_white` | 839 |  |
| `chalk_yellow` | 838 |  |
| `charge_vault_side` | 1112 |  |
| `charge_vault_top` | 1111 |  |
| `charging_pad_side` | 1157 |  |
| `charging_pad_top` | 1156 |  |
| `checkpoint_block` | 761 | rotation family (4 copies) |
| `cherry_block_bottom` | 590 |  |
| `cherry_block_side` | 588 |  |
| `cherry_block_top` | 589 |  |
| `chest_back` | 347 |  |
| `chest_front` | 341 |  |
| `chest_side` | 342 |  |
| `chest_top` | 343 | rotation family (4 copies) |
| `chili_pepper_block_bottom` | 678 |  |
| `chili_pepper_block_side` | 676 |  |
| `chili_pepper_block_top` | 677 |  |
| `chiseled_red_sandstone` | 456 |  |
| `chiseled_sandstone` | 325 |  |
| `clay` | 195 |  |
| `coal_block` | 233 |  |
| `coal_deposit` | 1030 |  |
| `coal_ore` | 227 |  |
| `coarse_dirt` | 191 |  |
| `coconut_block_bottom` | 522 |  |
| `coconut_block_side` | 520 |  |
| `coconut_block_top` | 521 |  |
| `code_block` | 679 |  |
| `comet_heart` | 1168 |  |
| `comet_ore` | 1167 |  |
| `compressed_messy_stone` | 530 |  |
| `conveyor_belt_bottom` | 1079 |  |
| `conveyor_belt_slab_side` | 1078 |  |
| `conveyor_belt_top` | 1077 |  |
| `conveyor_belt_turn_left` | 1169 |  |
| `conveyor_belt_turn_right` | 1170 |  |
| `copper_deposit` | 1033 |  |
| `copper_ore` | 1038 |  |
| `corn_block_bottom` | 594 |  |
| `corn_block_side` | 592 |  |
| `corn_block_top` | 593 |  |
| `crafting_table_side` | 338 |  |
| `crafting_table_top` | 339 |  |
| `crate` | 916 |  |
| `crop_harvester_back` | 1190 |  |
| `crop_harvester_back_running` | 45 | anim (4 frames) |
| `crop_harvester_front` | 1184 |  |
| `crop_harvester_side` | 1185 |  |
| `crop_harvester_side_running` | 44 | anim (4 frames) |
| `crop_harvester_top` | 1186 | rotation family (4 copies) |
| `crusher_back` | 1053 |  |
| `crusher_front` | 1047 |  |
| `crusher_side` | 1048 |  |
| `crusher_side_running` | 28 | anim (4 frames) |
| `crusher_top` | 1049 | rotation family (4 copies) |
| `crystal_block` | 1027 |  |
| `crystal_vat_back` | 1164 |  |
| `crystal_vat_front` | 1158 |  |
| `crystal_vat_side` | 1159 |  |
| `crystal_vat_side_running` | 42 | anim (4 frames) |
| `crystal_vat_top` | 1160 | rotation family (4 copies) |
| `custom_lobby_block_side` | 769 |  |
| `custom_lobby_block_top` | 765 | rotation family (4 copies) |
| `cut_red_sandstone` | 457 |  |
| `cut_sandstone` | 453 |  |
| `cyan_concrete` | 276 |  |
| `cyan_gen_spawn_coal` | 783 |  |
| `cyan_gen_spawn_iron` | 784 |  |
| `cyan_gen_spawn_top` | 782 |  |
| `cyan_glazed_terracotta` | 405 | rotation family (4 copies) |
| `cyan_planks` | 360 |  |
| `cyan_portal` | 5 | anim (4 frames) |
| `cyan_spawn_block_side` | 745 |  |
| `cyan_spawn_block_top` | 741 | rotation family (4 copies) |
| `dark_green_bricks` | 460 |  |
| `darkstone` | 1204 |  |
| `darkstone_bricks` | 1205 |  |
| `darkstone_bricks_cracked` | 1206 |  |
| `darkstone_bricks_lava` | 1207 |  |
| `darkstone_engraved` | 1208 |  |
| `darkstone_smooth` | 1209 |  |
| `deep_drill_back` | 1138 |  |
| `deep_drill_bottom` | 1137 |  |
| `deep_drill_front` | 1131 |  |
| `deep_drill_side` | 1132 |  |
| `deep_drill_side_running` | 39 | anim (4 frames) |
| `deep_drill_top` | 1133 | rotation family (4 copies) |
| `diamond_block` | 340 |  |
| `diamond_gen_spawn_side` | 807 |  |
| `diamond_gen_spawn_top` | 806 |  |
| `diamond_ore` | 232 |  |
| `diorite_brick` | 463 |  |
| `dirt` | 190 |  |
| `drop_location_block_side` | 814 |  |
| `drop_location_block_top` | 813 |  |
| `drop_pad` | 1036 |  |
| `dry_grass_block` | 978 |  |
| `dry_grass_block_side` | 977 |  |
| `electric_drill_back` | 1097 |  |
| `electric_drill_bottom` | 1096 |  |
| `electric_drill_front` | 1090 |  |
| `electric_drill_side` | 1091 |  |
| `electric_drill_side_running` | 34 | anim (4 frames) |
| `electric_drill_top` | 1092 | rotation family (4 copies) |
| `emerald_block` | 237 |  |
| `emerald_ore` | 231 |  |
| `end_stone` | 226 |  |
| `engraved_andesite` | 464 |  |
| `engraved_diorite` | 462 |  |
| `engraved_granite` | 466 |  |
| `evil_lucky_block` | 1020 |  |
| `evil_lucky_block_face` | 1021 |  |
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
| `fast_belt_slab_side` | 1155 |  |
| `fast_belt_top` | 1154 |  |
| `fast_belt_turn_left` | 1171 |  |
| `fast_belt_turn_right` | 1172 |  |
| `fertilised_soil` | 924 |  |
| `finish_block` | 812 |  |
| `fireball_block` | 539 |  |
| `food_lucky_block` | 1005 |  |
| `food_lucky_block_rare` | 1007 |  |
| `food_lucky_block_super` | 1009 |  |
| `forge_hopper_top` | 1166 |  |
| `furnace_front` | 335 |  |
| `furnace_side` | 336 |  |
| `furnace_top` | 337 |  |
| `generator_side` | 1061 |  |
| `generator_side_running` | 30 | anim (4 frames) |
| `generator_top` | 1062 |  |
| `ghost_chest_back` | 954 |  |
| `ghost_chest_front` | 951 |  |
| `ghost_chest_side` | 952 |  |
| `ghost_chest_top` | 953 |  |
| `ghost_lucky_block` | 955 |  |
| `ghost_mystery_block` | 956 |  |
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
| `gold_deposit` | 1034 |  |
| `gold_ore` | 229 |  |
| `granite_brick` | 467 |  |
| `grass_block_side` | 192 |  |
| `grass_top` | 193 |  |
| `gravel` | 196 |  |
| `gray_concrete` | 271 |  |
| `gray_gen_spawn_coal` | 792 |  |
| `gray_gen_spawn_iron` | 793 |  |
| `gray_gen_spawn_top` | 791 |  |
| `gray_glazed_terracotta` | 397 | rotation family (4 copies) |
| `gray_planks` | 358 |  |
| `gray_portal` | 6 | anim (4 frames) |
| `gray_spawn_block_side` | 740 |  |
| `gray_spawn_block_top` | 736 | rotation family (4 copies) |
| `green_bricks` | 459 |  |
| `green_concrete` | 285 |  |
| `green_glazed_terracotta` | 421 | rotation family (4 copies) |
| `green_lucky_block` | 1004 |  |
| `green_lucky_block_rare` | 1006 |  |
| `green_lucky_block_super` | 1008 |  |
| `green_planks` | 364 |  |
| `green_portal` | 7 | anim (4 frames) |
| `green_spawn_block_side` | 735 |  |
| `green_spawn_block_top` | 731 | rotation family (4 copies) |
| `green_stone` | 458 |  |
| `grenade_block` | 581 |  |
| `grey_portal` | 8 | anim (4 frames) |
| `gun_lucky_block` | 950 |  |
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
| `harvester_bottom` | 967 |  |
| `harvester_lunite_bottom` | 975 |  |
| `harvester_lunite_side_0` | 972 |  |
| `harvester_lunite_side_1` | 973 |  |
| `harvester_lunite_top` | 974 |  |
| `harvester_side0` | 964 |  |
| `harvester_side1` | 965 |  |
| `harvester_top` | 966 |  |
| `hay_block_side` | 328 |  |
| `homestead_core` | 1035 |  |
| `homestead_core_cap` | 1120 |  |
| `homestead_core_crown` | 1119 |  |
| `homestead_core_mid` | 26 | anim (4 frames) |
| `hyper_compressed_messy_stone` | 533 |  |
| `ice` | 326 |  |
| `ice_brick` | 468 |  |
| `iceball_block` | 540 |  |
| `invisible_solid` | 314 |  |
| `iron_block` | 234 |  |
| `iron_chest_back` | 915 |  |
| `iron_chest_front` | 909 |  |
| `iron_chest_side` | 910 |  |
| `iron_chest_top` | 911 | rotation family (4 copies) |
| `iron_deposit` | 1031 |  |
| `iron_ore` | 228 |  |
| `iron_watermelon_side` | 546 |  |
| `iron_watermelon_top` | 547 |  |
| `jungle_grass_block` | 887 |  |
| `jungle_grass_block_side` | 886 |  |
| `lapis_block` | 236 |  |
| `lapis_ore` | 230 |  |
| `lava` | 1 | anim (8 frames) |
| `leather_block_side` | 906 |  |
| `leather_block_top` | 907 |  |
| `leaves_aspen` | 288 |  |
| `leaves_aspen_autumn` | 908 |  |
| `leaves_cedar` | 470 |  |
| `leaves_cherry` | 585 |  |
| `leaves_cherry_fruity` | 904 |  |
| `leaves_jungle` | 290 |  |
| `leaves_mango` | 892 |  |
| `leaves_mango_fruity` | 905 |  |
| `leaves_maple` | 289 |  |
| `leaves_maple_autumn` | 477 |  |
| `leaves_maple_fruity` | 899 |  |
| `leaves_palm` | 471 |  |
| `leaves_palm_fruity` | 902 |  |
| `leaves_pear` | 525 |  |
| `leaves_pear_fruity` | 903 |  |
| `leaves_pine` | 287 |  |
| `leaves_pine_cone` | 900 |  |
| `leaves_plum` | 469 |  |
| `leaves_plum_fruity` | 901 |  |
| `leaves_spectral` | 830 |  |
| `light_blue_concrete` | 277 |  |
| `light_blue_glazed_terracotta` | 381 | rotation family (4 copies) |
| `light_blue_lucky_block` | 931 |  |
| `light_blue_planks` | 354 |  |
| `light_blue_spawn_block_side` | 730 |  |
| `light_blue_spawn_block_top` | 726 | rotation family (4 copies) |
| `light_gray_concrete` | 272 |  |
| `light_gray_glazed_terracotta` | 401 | rotation family (4 copies) |
| `light_gray_planks` | 359 |  |
| `light_gray_spawn_block_side` | 725 |  |
| `light_gray_spawn_block_top` | 721 | rotation family (4 copies) |
| `lightblue_portal` | 9 | anim (4 frames) |
| `lightgray_portal` | 10 | anim (4 frames) |
| `lime_concrete` | 278 |  |
| `lime_gen_spawn_coal` | 777 |  |
| `lime_gen_spawn_iron` | 778 |  |
| `lime_gen_spawn_top` | 776 |  |
| `lime_glazed_terracotta` | 389 | rotation family (4 copies) |
| `lime_planks` | 356 |  |
| `lime_portal` | 11 | anim (4 frames) |
| `lime_spawn_block_side` | 720 |  |
| `lime_spawn_block_top` | 716 | rotation family (4 copies) |
| `log_ancient_maple` | 1019 |  |
| `log_aspen` | 202 |  |
| `log_cedar` | 201 |  |
| `log_cherry` | 582 |  |
| `log_jungle` | 203 |  |
| `log_mango` | 889 |  |
| `log_maple` | 198 |  |
| `log_palm` | 472 |  |
| `log_pear` | 523 |  |
| `log_pine` | 199 |  |
| `log_plum` | 200 |  |
| `log_spectral` | 827 |  |
| `lucky_block_pink_question` | 957 |  |
| `lucky_block_pink_question_rare` | 1011 |  |
| `lucky_block_pink_question_super` | 1013 |  |
| `lunite_block` | 969 |  |
| `lunite_ore` | 968 |  |
| `machine_bench_side` | 1113 |  |
| `machine_bench_top` | 1114 |  |
| `machine_side` | 1037 |  |
| `magenta_concrete` | 279 |  |
| `magenta_glazed_terracotta` | 377 | rotation family (4 copies) |
| `magenta_planks` | 353 |  |
| `magenta_portal` | 12 | anim (4 frames) |
| `magenta_spawn_block_side` | 715 |  |
| `magenta_spawn_block_top` | 711 | rotation family (4 copies) |
| `magma` | 451 |  |
| `mailbox_front` | 571 |  |
| `mailbox_front_full` | 573 |  |
| `mailbox_side` | 572 |  |
| `mango_block_bottom` | 896 |  |
| `mango_block_side` | 894 |  |
| `mango_block_top` | 895 |  |
| `mega_compressed_messy_stone` | 535 |  |
| `melon_side` | 544 |  |
| `melon_top` | 545 |  |
| `melting_ice` | 595 |  |
| `messy_stone` | 216 |  |
| `mob_spawner_block_empty_side` | 822 |  |
| `mob_spawner_block_top` | 821 |  |
| `mob_spawner_passive_block_side` | 820 |  |
| `moonstone_block` | 450 |  |
| `moonstone_chest_back` | 449 |  |
| `moonstone_chest_front` | 443 |  |
| `moonstone_chest_side` | 444 |  |
| `moonstone_chest_top` | 445 | rotation family (4 copies) |
| `moonstone_explosive_side` | 332 |  |
| `moonstone_explosive_top` | 333 |  |
| `moonstone_gen_spawn_side` | 809 |  |
| `moonstone_gen_spawn_top` | 808 |  |
| `moonstone_ore` | 442 |  |
| `mossy_cobblestone` | 438 |  |
| `mushroom_stem` | 538 |  |
| `mystery_block` | 578 |  |
| `neon_black` | 949 |  |
| `neon_blue` | 948 |  |
| `neon_brown` | 947 |  |
| `neon_cyan` | 946 |  |
| `neon_gray` | 945 |  |
| `neon_green` | 944 |  |
| `neon_light_blue` | 943 |  |
| `neon_light_gray` | 942 |  |
| `neon_lime` | 941 |  |
| `neon_magenta` | 940 |  |
| `neon_orange` | 939 |  |
| `neon_pink` | 938 |  |
| `neon_purple` | 937 |  |
| `neon_red` | 936 |  |
| `neon_white` | 935 |  |
| `neon_yellow` | 934 |  |
| `nether_brick` | 317 |  |
| `netherrack` | 318 |  |
| `obby_absorb_block` | 816 |  |
| `obby_absorb_death_block` | 817 |  |
| `obby_death_block` | 815 |  |
| `obsidian` | 327 |  |
| `orange_concrete` | 280 |  |
| `orange_glazed_terracotta` | 373 | rotation family (4 copies) |
| `orange_lucky_block` | 998 |  |
| `orange_lucky_block_rare` | 1000 |  |
| `orange_lucky_block_super` | 1002 |  |
| `orange_planks` | 352 |  |
| `orange_portal` | 13 | anim (4 frames) |
| `orange_spawn_block_side` | 710 |  |
| `orange_spawn_block_top` | 706 | rotation family (4 copies) |
| `ore_gen_spawn_side` | 811 |  |
| `ore_gen_spawn_top` | 810 |  |
| `packed_snow` | 825 |  |
| `parts_bench_side` | 1115 |  |
| `parts_bench_top` | 1116 |  |
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
| `pet_lucky_block` | 958 |  |
| `pine_cone_block_side` | 835 |  |
| `pine_cone_block_top` | 836 |  |
| `pine_grass_block` | 833 |  |
| `pine_grass_block_side` | 832 |  |
| `pink_concrete` | 281 |  |
| `pink_gen_spawn_coal` | 789 |  |
| `pink_gen_spawn_iron` | 790 |  |
| `pink_gen_spawn_top` | 788 |  |
| `pink_glazed_terracotta` | 393 | rotation family (4 copies) |
| `pink_planks` | 357 |  |
| `pink_portal` | 14 | anim (4 frames) |
| `pink_spawn_block_side` | 705 |  |
| `pink_spawn_block_top` | 701 | rotation family (4 copies) |
| `planks_aspen` | 205 |  |
| `planks_cedar` | 209 |  |
| `planks_cherry` | 584 |  |
| `planks_jungle` | 207 |  |
| `planks_mango` | 891 |  |
| `planks_maple` | 204 |  |
| `planks_palm` | 473 |  |
| `planks_pear` | 524 |  |
| `planks_pine` | 208 |  |
| `planks_plum` | 206 |  |
| `planks_spectral` | 829 |  |
| `plum_block_bottom` | 519 |  |
| `plum_block_side` | 517 |  |
| `plum_block_top` | 518 |  |
| `podzol_top` | 452 |  |
| `potato_block` | 920 |  |
| `potion_lucky_block` | 1010 |  |
| `potion_lucky_block_rare` | 1012 |  |
| `potion_lucky_block_super` | 1014 |  |
| `press_back` | 1069 |  |
| `press_front` | 1063 |  |
| `press_side` | 1064 |  |
| `press_side_running` | 31 | anim (4 frames) |
| `press_top` | 1065 | rotation family (4 copies) |
| `protector` | 348 |  |
| `protector_faction` | 575 |  |
| `protector_tribe` | 574 |  |
| `pumpkin_face_on` | 291 |  |
| `pumpkin_side` | 541 |  |
| `pumpkin_top` | 542 |  |
| `pure_coal_ore` | 1022 |  |
| `pure_copper_ore` | 1202 |  |
| `pure_diamond_ore` | 1025 |  |
| `pure_gold_ore` | 1024 |  |
| `pure_iron_ore` | 1023 |  |
| `pure_moonstone_ore` | 1026 |  |
| `pure_voltite_ore` | 1203 |  |
| `purple_concrete` | 282 |  |
| `purple_glazed_terracotta` | 409 | rotation family (4 copies) |
| `purple_lucky_block` | 986 |  |
| `purple_lucky_block_rare` | 988 |  |
| `purple_lucky_block_super` | 990 |  |
| `purple_planks` | 361 |  |
| `purple_portal` | 15 | anim (4 frames) |
| `purple_spawn_block_side` | 700 |  |
| `purple_spawn_block_top` | 696 | rotation family (4 copies) |
| `quartz_block_chiseled` | 320 |  |
| `quartz_block_side` | 319 |  |
| `radar_bottom` | 927 |  |
| `radar_screen` | 19 | anim (4 frames) rotation family (4 copies) |
| `radar_side_active` | 925 |  |
| `radar_side_inactive` | 928 |  |
| `radar_top_active` | 926 |  |
| `radar_top_inactive` | 929 |  |
| `recycler_back` | 1179 |  |
| `recycler_front` | 1173 |  |
| `recycler_side` | 1174 |  |
| `recycler_side_running` | 43 | anim (4 frames) |
| `recycler_top` | 1175 | rotation family (4 copies) |
| `red_concrete` | 283 |  |
| `red_gen_spawn_coal` | 771 |  |
| `red_gen_spawn_iron` | 772 |  |
| `red_gen_spawn_top` | 770 |  |
| `red_glazed_terracotta` | 425 | rotation family (4 copies) |
| `red_lucky_block` | 932 |  |
| `red_lucky_block_rare` | 982 |  |
| `red_lucky_block_super` | 984 |  |
| `red_mushroom_block` | 537 |  |
| `red_planks` | 365 |  |
| `red_portal` | 16 | anim (4 frames) |
| `red_sand` | 474 |  |
| `red_sandstone` | 454 |  |
| `red_sandstone_brick` | 475 |  |
| `red_sandstone_top` | 455 |  |
| `red_spawn_block_side` | 695 |  |
| `red_spawn_block_top` | 691 | rotation family (4 copies) |
| `redstone_lamp_off` | 313 |  |
| `redstone_lamp_on` | 312 |  |
| `rocket_block` | 579 |  |
| `rocky_dirt` | 476 |  |
| `rope_block` | 1028 |  |
| `sand` | 194 |  |
| `sandstone_brick` | 461 |  |
| `sandstone_normal` | 225 |  |
| `sandstone_top` | 324 |  |
| `scorpion_eggs` | 1210 |  |
| `shatter_mill_back` | 1145 |  |
| `shatter_mill_front` | 1139 |  |
| `shatter_mill_side` | 1140 |  |
| `shatter_mill_side_running` | 40 | anim (4 frames) |
| `shatter_mill_top` | 1141 | rotation family (4 copies) |
| `shop_trader_spawn_face` | 799 |  |
| `shop_trader_spawn_side` | 798 |  |
| `shop_trader_spawn_top` | 794 | rotation family (4 copies) |
| `shop_wizard_spawn_face` | 805 |  |
| `shop_wizard_spawn_side` | 804 |  |
| `shop_wizard_spawn_top` | 800 | rotation family (4 copies) |
| `sky_tap_back` | 1153 |  |
| `sky_tap_bottom` | 1152 |  |
| `sky_tap_front` | 1146 |  |
| `sky_tap_side` | 1147 |  |
| `sky_tap_side_running` | 41 | anim (4 frames) |
| `sky_tap_top` | 1148 | rotation family (4 copies) |
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
| `slab_dry_grass_top_side` | 979 |  |
| `slab_engraved_andesite_side` | 497 |  |
| `slab_engraved_diorite_side` | 501 |  |
| `slab_engraved_granite_side` | 505 |  |
| `slab_granite_brick_side` | 506 |  |
| `slab_grass_top_side` | 487 |  |
| `slab_ice_brick_side` | 516 |  |
| `slab_jungle_grass_top_side` | 888 |  |
| `slab_jungle_side` | 484 |  |
| `slab_mango_side` | 893 |  |
| `slab_maple_side` | 479 |  |
| `slab_mossy_cobblestone_side` | 493 |  |
| `slab_palm_side` | 485 |  |
| `slab_pear_side` | 526 |  |
| `slab_pine_grass_top_side` | 834 |  |
| `slab_pine_side` | 480 |  |
| `slab_plum_side` | 481 |  |
| `slab_red_sandstone_brick_side` | 514 |  |
| `slab_red_sandstone_side` | 511 |  |
| `slab_sandstone_brick_side` | 510 |  |
| `slab_sandstone_normal_side` | 507 |  |
| `slab_smooth_stone_side` | 490 |  |
| `slab_spectral_side` | 831 |  |
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
| `smelter_back` | 1060 |  |
| `smelter_front` | 1054 |  |
| `smelter_side` | 1055 |  |
| `smelter_side_running` | 29 | anim (4 frames) |
| `smelter_top` | 1056 | rotation family (4 copies) |
| `smoke` | 23 | anim (4 frames) |
| `smooth_stone` | 218 |  |
| `snow` | 197 |  |
| `snowy_messy_stone` | 823 |  |
| `snowy_messy_stone_side` | 824 |  |
| `solar_panel_bottom` | 963 |  |
| `solar_panel_side` | 961 |  |
| `solar_panel_top` | 962 |  |
| `sorting_gate_slab_side` | 1106 |  |
| `sorting_gate_top` | 1105 |  |
| `splitter_slab_side` | 1081 |  |
| `splitter_top` | 1080 |  |
| `sponge` | 329 |  |
| `starframe` | 1165 |  |
| `stone` | 217 |  |
| `stone_andesite` | 221 |  |
| `stone_andesite_smooth` | 222 |  |
| `stone_deposit` | 1032 |  |
| `stone_diorite` | 219 |  |
| `stone_diorite_smooth` | 220 |  |
| `stone_granite` | 223 |  |
| `stone_granite_smooth` | 224 |  |
| `stonebrick` | 316 |  |
| `stonebrick_carved` | 321 |  |
| `stonebrick_cracked` | 323 |  |
| `stonebrick_mossy` | 322 |  |
| `storage_silo_side` | 1110 |  |
| `storage_silo_top` | 1109 |  |
| `stripped_aspen_log` | 211 |  |
| `stripped_cedar_log` | 215 |  |
| `stripped_cherry_log` | 583 |  |
| `stripped_jungle_log` | 213 |  |
| `stripped_mango_log` | 890 |  |
| `stripped_maple_log` | 210 |  |
| `stripped_palm_log` | 576 |  |
| `stripped_pear_log` | 577 |  |
| `stripped_pine_log` | 214 |  |
| `stripped_plum_log` | 212 |  |
| `stripped_spectral_log` | 828 |  |
| `super_compressed_messy_stone` | 532 |  |
| `super_rocket_block` | 580 |  |
| `tool_bench_side` | 1117 |  |
| `tool_bench_top` | 1118 |  |
| `tools_lucky_block` | 999 |  |
| `tools_lucky_block_rare` | 1001 |  |
| `tools_lucky_block_super` | 1003 |  |
| `toxic_waste` | 25 | anim (8 frames) |
| `toxic_waste_barrel_bottom` | 1018 |  |
| `toxic_waste_barrel_side` | 1017 |  |
| `toxic_waste_barrel_top` | 24 | anim (4 frames) |
| `toxin_ball_block` | 680 |  |
| `tree_cutter_back` | 1127 |  |
| `tree_cutter_back_running` | 37 | anim (4 frames) |
| `tree_cutter_front` | 1121 |  |
| `tree_cutter_side` | 1122 |  |
| `tree_cutter_side_running` | 36 | anim (4 frames) |
| `tree_cutter_top` | 1123 | rotation family (4 copies) |
| `ultra_compressed_messy_stone` | 534 |  |
| `unloaded` | 189 |  |
| `volt_engine_side` | 1129 |  |
| `volt_engine_side_running` | 38 | anim (4 frames) |
| `volt_engine_top` | 1130 |  |
| `voltite_deposit` | 1128 |  |
| `voltite_ore` | 1082 |  |
| `watermelon_side` | 292 |  |
| `watermelon_top` | 293 |  |
| `weapon_lucky_block` | 933 |  |
| `weapon_lucky_block_rare` | 983 |  |
| `weapon_lucky_block_super` | 985 |  |
| `white_concrete` | 284 |  |
| `white_gen_spawn_coal` | 786 |  |
| `white_gen_spawn_iron` | 787 |  |
| `white_gen_spawn_top` | 785 |  |
| `white_glazed_terracotta` | 369 | rotation family (4 copies) |
| `white_planks` | 351 |  |
| `white_portal` | 17 | anim (4 frames) |
| `white_spawn_block_side` | 690 |  |
| `white_spawn_block_top` | 686 | rotation family (4 copies) |
| `wire_mill_back` | 1076 |  |
| `wire_mill_front` | 1070 |  |
| `wire_mill_side` | 1071 |  |
| `wire_mill_side_running` | 32 | anim (4 frames) |
| `wire_mill_top` | 1072 | rotation family (4 copies) |
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
| `yellow_glazed_terracotta` | 385 | rotation family (4 copies) |
| `yellow_lucky_block` | 930 |  |
| `yellow_lucky_block_rare` | 980 |  |
| `yellow_lucky_block_super` | 981 |  |
| `yellow_planks` | 355 |  |
| `yellow_portal` | 18 | anim (4 frames) |
| `yellow_spawn_block_side` | 685 |  |
| `yellow_spawn_block_top` | 681 | rotation family (4 copies) |

#### Rotation families (57 roots)

These textures exist only as pre-rotated copies (`name[rot[1..4`). The registry folds them to the root below, and `bloxdTexel` re-applies the rotation at sample time — reference the root, never the copies. Writing a `[rot[N` spelling draws the dedicated rotation diagnostic.

- `alloy_kiln_top` (id 1085)
- `auto_bench_top` (id 1100)
- `belt_tunnel_exit_top` (id 1198)
- `belt_tunnel_top` (id 1193)
- `black_glazed_terracotta` (id 429)
- `black_spawn_block_top` (id 756)
- `blue_glazed_terracotta` (id 413)
- `blue_spawn_block_top` (id 751)
- `brown_glazed_terracotta` (id 417)
- `brown_spawn_block_top` (id 746)
- `burner_drill_top` (id 1041)
- `checkpoint_block` (id 761)
- `chest_top` (id 343)
- `crop_harvester_top` (id 1186)
- `crusher_top` (id 1049)
- `crystal_vat_top` (id 1160)
- `custom_lobby_block_top` (id 765)
- `cyan_glazed_terracotta` (id 405)
- `cyan_spawn_block_top` (id 741)
- `deep_drill_top` (id 1133)
- `electric_drill_top` (id 1092)
- `gray_glazed_terracotta` (id 397)
- `gray_spawn_block_top` (id 736)
- `green_glazed_terracotta` (id 421)
- `green_spawn_block_top` (id 731)
- `iron_chest_top` (id 911)
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
- `press_top` (id 1065)
- `purple_glazed_terracotta` (id 409)
- `purple_spawn_block_top` (id 696)
- `radar_screen` (id 19)
- `recycler_top` (id 1175)
- `red_glazed_terracotta` (id 425)
- `red_spawn_block_top` (id 691)
- `shatter_mill_top` (id 1141)
- `shop_trader_spawn_top` (id 794)
- `shop_wizard_spawn_top` (id 800)
- `sky_tap_top` (id 1148)
- `smelter_top` (id 1056)
- `tree_cutter_top` (id 1123)
- `white_glazed_terracotta` (id 369)
- `white_spawn_block_top` (id 686)
- `wire_mill_top` (id 1072)
- `yellow_glazed_terracotta` (id 385)
- `yellow_spawn_block_top` (id 681)

#### Animation families (42 names)

Sampling these names automatically returns the current animation frame. The engine advances frames at a fixed interval per family — measured values are only 3: **200 ms** (3 families), **250 ms** (21 families), **300 ms** (18 families). Packs never write frame suffixes (`lava0` is an error; `lava` is the name).

| Name | Frames | Interval |
|---|---|---|
| `alloy_kiln_side_running` | 4 | 250 ms |
| `auto_bench_side_running` | 4 | 250 ms |
| `black_portal` | 4 | 300 ms |
| `blue_portal` | 4 | 300 ms |
| `brown_portal` | 4 | 300 ms |
| `burner_drill_side_running` | 4 | 250 ms |
| `crop_harvester_back_running` | 4 | 250 ms |
| `crop_harvester_side_running` | 4 | 250 ms |
| `crusher_side_running` | 4 | 250 ms |
| `crystal_vat_side_running` | 4 | 250 ms |
| `cyan_portal` | 4 | 300 ms |
| `deep_drill_side_running` | 4 | 250 ms |
| `electric_drill_side_running` | 4 | 250 ms |
| `generator_side_running` | 4 | 250 ms |
| `gray_portal` | 4 | 300 ms |
| `green_portal` | 4 | 300 ms |
| `grey_portal` | 4 | 300 ms |
| `homestead_core_mid` | 4 | 250 ms |
| `lava` | 8 | 200 ms |
| `lightblue_portal` | 4 | 300 ms |
| `lightgray_portal` | 4 | 300 ms |
| `lime_portal` | 4 | 300 ms |
| `magenta_portal` | 4 | 300 ms |
| `orange_portal` | 4 | 300 ms |
| `pink_portal` | 4 | 300 ms |
| `press_side_running` | 4 | 250 ms |
| `purple_portal` | 4 | 300 ms |
| `radar_screen` | 4 | 200 ms |
| `recycler_side_running` | 4 | 250 ms |
| `red_portal` | 4 | 300 ms |
| `shatter_mill_side_running` | 4 | 250 ms |
| `sky_tap_side_running` | 4 | 250 ms |
| `smelter_side_running` | 4 | 250 ms |
| `smoke` | 4 | 250 ms |
| `toxic_waste` | 8 | 200 ms |
| `toxic_waste_barrel_top` | 4 | 300 ms |
| `tree_cutter_back_running` | 4 | 250 ms |
| `tree_cutter_side_running` | 4 | 250 ms |
| `volt_engine_side_running` | 4 | 250 ms |
| `white_portal` | 4 | 300 ms |
| `wire_mill_side_running` | 4 | 250 ms |
| `yellow_portal` | 4 | 300 ms |

Structural note visible in the raw data: the atlas holds 45 animation roots, not 42 — `radar_screen`'s four pre-rotated copies each carry their own 4-frame ladder, which is also why `radar_screen` is the only name carrying both family notes.

### Measured drift (cnty9 → ab90qa)

The registry is build-shipped content and moves with every block update. v4 build (`cnty9`, 2026-10-27) → v5 build (`ab90qa`, 2026-11-03):

- atlas entries: 1,219 → 1,210
- rotation families (turned spellings): 57 (228) → 57 (228) — **unchanged**
- animation families (frame spellings): 42 (188) → 42 (188) — **unchanged**
- usable named constants: 905 → **896**
- id changes among surviving names: **334 of 905**

The complete drift (11 names):

- **added (1):** `scorpion_eggs`.
- **removed (10):** `chest_double_back_hi`, `chest_double_back_lo`, `chest_double_front_hi`, `chest_double_front_lo`, `chest_double_top_1_hi`, `chest_double_top_1_lo`, `chest_double_top_2_hi`, `chest_double_top_2_lo`, `mob_spawner_hostile_block_side`, `mob_spawner_neutral_block_side` — the double chest (8 faces) left the game data (the single-chest `chest_*` family survives intact), and spawners keep `mob_spawner_block_top` while the variant side textures are gone.

**Names are the API; ids are snapshots.** Between the two builds, 334 of 905 surviving names changed id — write `bloxdTextureIdStone`, not `351`. The engine resolves names at validation, so name-written packs survive drift; raw-id packs do not.

### Related

- [Texture API](texture-api.md) · [Engine Internals: Texture Registry](../internals/texture-registry.md) · [Version History: v4](../history/v4.md)

---

## Troubleshooting

Errors and visual problems, findable **by symptom**. Pages follow the structure: symptom → cause → how to check → fix → prevention.

### Symptom index

| Symptom | Page |
|---|---|
| Pack won't load / zip & pack.json errors | [Loading errors](loading.md) |
| `apiVersion` messages / old packs not running | [API version errors](api-version.md) |
| Won't compile / `must be declared as` / WGSL syntax | [Compilation errors](compilation.md) |
| Validation errors (reserved names, strict contract, `reaches`) | [Validation errors](validation.md) |
| Fails only in some variants / dropped in strict games | [Variant-specific issues](variants.md) |
| Looks wrong (white haze, no shadows, odd night) | [Visual issues](visual.md) |
| Texture-name errors / `did you mean` | [Texture issues](textures.md) |
| Brightness / shadow / fog problems | [Lighting issues](lighting.md) |
| Model / entity / enchant problems | [Model issues](models.md) |
| Slow / dropped by the on-device check | [Performance](performance.md) |
| Legal, safety, common questions | [FAQ](faq.md) |

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Verified (messages recorded verbatim from the live validator & loader)

### Where errors appear

1. **Settings → Shader Pack status line** — loader-stage errors (IDs are `shaderPack:load*`)
2. **The loader screen's error list** — validation & compilation (file:line + variant)
3. **Browser devtools console** — runtime & stage-2 (browser WGSL compiler) errors

The 3-stage load check is detailed in [Getting Started: Validation](../getting-started/validation.md).

---

## Loading errors

> Target API: 5 · Status: Verified

Errors rejected at the **loader stage** (the first gate), shown in the settings status line with `shaderPack:load*` IDs.

### "There's no pack.json at the top of the pack."

- **Cause**: no `pack.json` at the zip root (e.g. the folder was zipped with an extra nesting level)
- **Check**: open the zip — `pack.json` at the top level (or directly under one common root folder)
- **Fix**: zip `pack.json` and the `.wgsl` files directly. A single common root folder is stripped automatically ([Pack structure](../getting-started/pack-structure.md))
- **Prevention**: keep your zipping procedure fixed; macOS "Compress" works as-is (OS junk is auto-excluded)

### `loadDuplicateManifest` on zip load

- **Cause**: two `pack.json` files (including case differences)
- **Fix**: keep exactly one

### Size & count limits

| Message | Limit |
|---|---|
| `The zip is over 32 MB.` | zip 32 MB |
| `The zip has more than 1024 entries.` | 1,024 entries |
| `The pack has more than 256 .wgsl files.` | 256 `.wgsl` files |
| `The pack's .wgsl files are over 256 KB in total.` | 256 KB total |
| `pack.json is over 64 KB.` | 64 KB manifest |

- **Fix**: drop unneeded `.wgsl` files / merge files / trim comments
- **Prevention**: these limits are also practical compile-time ceilings — treat growth as a refactoring signal

### Format problems

Split zips, zip64, encrypted entries and unsupported compression are each rejected with dedicated messages. All files must be valid UTF-8.

### Loader error-ID reference

| ID | Meaning |
|---|---|
| `loadZipTooBig` | zip over 32MB |
| `loadTooManyZipEntries` | over 1024 entries |
| `loadTooManyWgsl` | over 256 `.wgsl` |
| `loadSourceTooBig` | over 256KB total (streamed per-file check) |
| `loadManifestTooBig` | `pack.json` over 64KB |
| `loadManifestNotJson` / `loadManifestNotObject` | not JSON / not an object |
| `loadNoApiVersion` / `loadWrongApiVersion` | missing / not `5` ([API version errors](api-version.md)) |
| `loadNoName` / `loadAuthorNotString` | missing `name` / non-string `author` |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | unsupported compression / zip64 / split / encrypted |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | duplicate path / non-UTF-8 / decompress failure / damaged zip |
| `loadNoManifest` / `loadDuplicateManifest` | manifest position / duplication |

### "Ready. Reload the page to use it." but nothing changes

- **Cause**: packs need a **page reload** to activate
- **Fix**: reload after selecting; status should become `Ready to use`
- **Note**: leftover renderer overrides (`?renderer=`, localStorage `bloxdRenderer`) make packs refuse to start — clear them and reload

### Related

- [API version errors](api-version.md) · [Pack structure](../getting-started/pack-structure.md) · [Pack format](../api/pack-format.md)

---

## API version errors

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Verified (verbatim from the live i18n dictionary)

Errors around `apiVersion`. The current game accepts **only `5`**.

### "pack.json needs "apiVersion": {{version}}."

- **Symptom**: this message right after load (`loadNoApiVersion`)
- **Cause**: the `apiVersion` key is missing entirely
- **Fix**: add `"apiVersion": 5` — a **number** (the string `"5"` fails)
- **Prevention**: start from the [pack.json](../getting-started/manifest.md) template

### "This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}."

- **Symptom**: `loadWrongApiVersion`
- **Cause**: `apiVersion` exists but isn't 5 (a v1–v4 pack)
- **Fix**: apply the matching migration ([Version History](../history/)):
  - v4 → v5: [the v5 guide](../history/v5.md) — mostly mechanical (flags · `bloxdLit()` · removing `bloxdFragmentBlockPosition`)
  - v3 → v5: apply [v4](../history/v4.md) first
  - v2 or earlier → v5: step through v3 → v4 → v5
- **Prevention**: after any API update, check [Compatibility](../api/compatibility.md) and the matching migration guide

### The string "5" is rejected

- **Cause**: the loader compares `manifest.apiVersion !== 5` **strictly** (`===`); a JSON string `"5"` is not the number 5
- **Fix**: `"apiVersion": 5` (unquoted)

### A saved old pack silently stopped working

- **Symptom**: a previously-working v1–v4 pack is unresponsive, with no exception
- **Cause**: saved packs resolve to `{kind: "none", reason: "otherApiVersion"}` and become **silently inactive**
- **Check**: the settings-tab status line: `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`
- **Fix**: load a migrated replacement from the same screen
- **Prevention**: after API updates, re-release a bumped version and announce it ([Distribution](../getting-started/distribution.md))

### A migrated v4 pack fails validation

The three typical patterns (full steps in the [v5 migration guide](../history/v5.md)):

| Validation message | Cause | Fix |
|---|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | `#ifdef BLOXD_LIGHTING` usage | rewrite as `if (bloxdLit()) { ... } else { return bloxdDefaultLight(s, l); }` |
| `bloxdBlockFlagRock isn't part of the shader pack API...` (reserved-name diagnostic) | leftover bit-constant references | use `surface.flags.rock` etc. (1:1 table in [Flags](../api/flags.md)) |
| `bloxdFragmentBlockPosition` missing | removed in v5 | delete call sites (no replacement — use `flags`) |

### Related

- [Compatibility](../api/compatibility.md) · [Version History](../history/) · [pack.json](../getting-started/manifest.md)

---

## Compilation errors

> Target API: 5 · Status: Verified

Errors that pass static validation but fail as WGSL, or fail only in the browser's WGSL compiler (stage 2).

### "bloxdTerrainVertex must be declared as: fn ..."

- **Cause**: hook signature mismatch (argument/return types)
- **Fix**: rewrite to the declaration shown in the message (parameter names are free; types must match exactly)
- **Prevention**: start from the [hook comparison table](../api/hooks.md)

### "mixing '*' and '^' requires parenthesis (only in ...)"

- **Cause**: WGSL requires parentheses when mixing `^` `&` `|` `<<` `>>` with other operators
- **Fix**: parenthesize the operands

### "... can only be a function's parameter or return type, ..."

- **Cause**: `var x: BloxdSurface;` — bare type-annotated declarations are rejected because header structs gain fields
- **Fix**: `var out = bloxdDefaultSurface(s);` (or `var out = s;` in light hooks)
- **Prevention**: always build outputs from `bloxdDefault*` ([conventions](../api/structures.md#writing-conventions-recap))

### "_ can only be the target of a phony assignment, as in _ = f();"

- **Cause**: `let _ = f();` is invalid WGSL
- **Fix**: write `_ = f();`

### "Lite: …reads scene depth on a page that didn't turn it on"

- **Cause**: a depth-reading pack (`bloxdOpaqueBehind`) was active when the page was generated; depth availability is decided at page generation
- **Fix**: reload the page with the pack active

### dpdy sign looks inverted

- **This is by design**: v5's analyzer auto-rewrites every `dpdy` / `dpdyCoarse` / `dpdyFine` call to `(-dpdy(...))` (screen-space y points down)
- **Fix**: nothing — write `dpdy(h)` with the intent "how does h change going up" and the emitted code carries the flip ([Restrictions](../api/restrictions.md#auto-rewrite-introduced-in-v5))
- `dpdx` and `fwidth` are untouched

### Pack gets dropped on game join / the on-device check never finishes

- **Cause**: the on-device check failed, or hit the 60-second forced timeout (`skipped`) — common on low-spec devices and heavy worlds
- **Fix**: reduce heavy vertex work and complex loops; see [Performance](performance.md)

### Related

- [Validation errors](validation.md) · [Engine Internals: WGSL Compilation](../internals/wgsl-compilation.md) · [Restrictions](../api/restrictions.md)

---

## Validation errors

> Target API: 5 · Status: Verified (messages recorded verbatim from the live validator)

Static-validation (analyzer, stage 1) errors — mostly reserved names, the strict contract, and cross-hook call restrictions.

### "Packs can't construct BloxdSurface directly" / "Packs can't construct BloxdLight directly, since header structs gain fields; ..."

- **Cause**: calling constructors like `BloxdSurface(...)`
- **Fix**: start from `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` and mutate fields (`var out = s;` works in light hooks)

### "Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"

- **Cause**: an identifier starting with `bloxd` (case-insensitive)
- **Fix**: rename (e.g. `packTint`). Only the 9 hook names are allowed
- **Prevention**: prefix your own names with `pack` / `my` etc.

### "bloxdPackInputs isn't part of the bloxd_ header"

- **Cause**: referencing the uniform directly
- **Fix**: use it via the header functions ([Pack format](../api/pack-format.md#per-frame-uniform-bloxdpackinputs))

### "... reaches bloxdTexel, which only surface and light hooks can use."

- **Cause**: called from a vertex hook (or a function reachable from one) — "reaches" means **the call path**
- **Fix**: move the call to a surface / light hook

### "... reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and <program> doesn't define it; ..."

- **Cause**: `bloxdOpaqueBehind()` needs `BLOXD_SCENE_DEPTH`, defined only in all-liquid variants; sharing the call from terrain/model-hook code creates uncompilable variants
- **Fix**: wrap the call in `#ifdef BLOXD_SCENE_DEPTH`
- **Prevention**: isolate depth reads as liquid-only processing

### The strict contract

| Message | Meaning |
|---|---|
| `<hook> moves terrain, which strict games prevent.` | unguarded vertex hook |
| `discard makes terrain see-through, which strict games prevent.` | reachable `discard` |

- **Important**: these are not compile errors — strict games **auto-disable the whole pack** (`shaderPack:offInStrict`)
- **Fix**: wrap vertex hooks and `discard` in `#ifndef BLOXD_STRICT` ([Variants](../getting-started/variants.md))

### v5 additions/changes

| Message | Action |
|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | migrate `#ifdef BLOXD_LIGHTING` → `if (bloxdLit())` ([Lighting](../api/lighting.md#bloxdlit--the-gate)) |
| `bloxdBlockFlagRock isn't part of the shader pack API...` | leftover bit constant → `flags.rock` ([Flags](../api/flags.md)) |
| `bloxdSpLitColour isn't part of the shader pack API...` | v4 internal symbol → use the public `bloxdLitColour()` |

v5's analyzer gives **dedicated messages** to packs that keep reading `blockFlags` or wrapping light hooks in `#ifdef BLOXD_LIGHTING`, so nothing misbehaves silently ([v5 migration](../history/v5.md)).

Texture-name resolution errors (spelling suggestions, frame/rotation spellings) live in [Texture issues](textures.md).

### Related

- [Restrictions & reserved names](../api/restrictions.md) · [Engine Internals: Shader Validation](../internals/shader-validation.md) · [Variant-specific issues](variants.md)

---

## Variant-specific issues

> Target API: 5 · Status: Verified

Problems that occur in only some of the 6 variants (`strict|allow` × `terrain|liquid|model`). v5 removed the lighting axis (the old `BLOXD_LIGHTING`) and the loader validates **all 6 variants at once** on load.

### Loads only in non-strict games / dropped in strict

- **Cause**: an unguarded vertex hook or a reachable `discard`; strict games forbid both and violate = **whole-pack auto-disable** (`shaderPack:offInStrict`)
- **Check**: the loader screen shows `<hook> moves terrain, which strict games prevent.` / `discard makes terrain see-through, which strict games prevent.`
- **Fix**: wrap vertex hooks and `discard` in `#ifndef BLOXD_STRICT`
- **Prevention**: always start vertex hooks from the guarded template ([Variants](../getting-started/variants.md))

### ".alpha is undefined"

- **Cause**: `alpha` exists only behind `#ifdef BLOXD_ALPHA` (all liquid + non-strict terrain/model)
- **Fix**: wrap alpha-touching code in `#ifdef BLOXD_ALPHA` ([Preprocessor](../api/preprocessor.md#macro--variant-matrix))

### "BloxdVertex only exists when BLOXD_STRICT isn't defined"

- **Cause**: strict variants have no vertex hooks at all, so no `BloxdVertex` either; vertex code is reachable from strict variants
- **Fix**: guard the vertex hook

### bloxdOpaqueBehind fails in only some variants

- **Cause**: `BLOXD_SCENE_DEPTH` is defined only in all-liquid variants
- **Fix**: `#ifdef BLOXD_SCENE_DEPTH` ([Validation errors](validation.md))

### Water ignores the pack (Liquid)

- **Symptom**: terrain hooks written, water unchanged
- **Cause**: **in v5, if a pack defines no Liquid hook, no Terrain hook runs on water either** (the pre-v4 "liquid falls back to terrain" behavior is gone)
- **Fix**: write Liquid hooks ([hook split](../api/hooks.md#what-each-program-draws))

### Models (entities, block models) unaffected

- **Cause**: out of scope before v5; now requires `bloxdModel*` hooks
- **Fix**: define `bloxdModelSurface` / `bloxdModelLight` ([Models guide](../guides/models.md))

### About the 6-variant validation

The loader validates **all 6 variants at once** at load (the lighting axis is no longer compiled separately). Even if a game uses only some conditions, distributed packs must anticipate all six.

| Variant | Macros defined |
|---|---|
| `allow.terrain` | `BLOXD_ALPHA` |
| `allow.liquid` | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | `BLOXD_ALPHA` |
| `strict.terrain` | — |
| `strict.liquid` | `BLOXD_SCENE_DEPTH` |
| `strict.model` | — |

### Related

- [Variants](../getting-started/variants.md) · [Preprocessor](../api/preprocessor.md) · [Policy](../internals/policy.md)

---

## Visual issues

> Target API: 5 · Status: Verified

Compiles fine but looks wrong.

### Distance turns white/hazy

- **Cause**: double fog. The default light-hook output is **already fogged** (`bloxdApplyFog(lit + emission, light)`), so mixing more fog color on top doubles it
- **Fix**: keep custom fog subtle; consider saturation-only aerial perspective ([realism recipes](../recipes/realism.md))
- **Prevention**: understand `fogAlpha` semantics (0 = no fog, 1 = only fogColour) and the [pipeline](../api/lighting.md#the-full-pipeline) before writing fog

### pow(l.skyLight, γ) never darkens shadows

- **Cause**: `skyLight` arrives post-lift-curve (raw 0.87 arrives as 0.97); gamma mathematically cannot compete
- **Fix**: switch to lift inversion + threshold ([Shadows](../guides/shadows.md))

### Blocks turn almost pure white

- **Cause**: the light-hook output exceeds 1.0 (no clamp exists past the output)
- **Fix**: append `clamp(col, vec3f(0.0), vec3f(1.0))`

### White without additions

- **Cause**: un-fog inversion by division
- **Fix**: drop the un-fog; rebuild from `s.colour` and apply fog exactly once at the end (or via `bloxdApplyFog`)

### Glowing blocks don't glow (rebuilding packs)

- **Cause**: missing emission re-add — dropping the default output means adding emission yourself
- **Fix**: add `+ s.emission * (1.0 - l.fogAlpha)`; on v5 the `bloxdLitColour()` + emission + `bloxdApplyFog` composition is safest ([Lighting](../api/lighting.md))

### Waves/patterns cut off at chunk or origin switches

- **Cause**: using render-space positions directly — the origin moves with the player
- **Fix**: use `bloxdWorldPosition(position)` for world-dependent effects ([Coordinates](../recipes/coordinates.md)); note f32 precision limits far from origin

### Water-surface patterns misalign on rotated faces

- **Cause**: `bloxdTexel` applies the fragment's own `textureRotation` to your uv ([the rotation subtlety](../api/texture-api.md#the-rotation-subtlety--a-neutral-sampler))
- **Fix**: pre-rotate with the `texelNeutral` helper

### Enchant glint / hurt flash disappeared

- **Cause**: custom lighting rebuilt without passing `enchantColour` / `overlayColour` through
- **Fix**: pass them through or use `bloxdLitColour()` ([Enchant effects](../recipes/enchant-effects.md))
- **v5**: `bloxdDefaultSurface` passes both through unchanged, so defaults never lose them

### Sky, clouds or the sun disc unaffected

- **By design**: hooks cover terrain / liquid / model only ([Unreachable effects](../guides/constraints.md))

### Related

- [Lighting issues](lighting.md) · [Debugging tips](../guides/debugging.md) · [Fog Internals](../internals/fog-internals.md)

---

## Texture issues

> Target API: 5 · Target build: `ab90qa` · Status: Verified (messages recorded verbatim from the live validator)

Problems around `bloxdTextureId*` / `bloxdTexel`. Search all 896 names in the [texture catalog](../api/texture-catalog.md).

### "There's no texture called X. Did you mean bloxdTextureIdY?"

- **Cause**: a misspelling; v5's validator has **Levenshtein suggestions** (threshold `max(2, floor(len/4)) + 1`)
- **Fix**: accept the suggestion; cross-check the [catalog](../api/texture-catalog.md)
- **Prevention**: copy-paste names from the catalog

### "...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates."

- **Cause**: writing a **frame number** on an animated texture (`lava0` etc.)
- **Fix**: use the base name — sampling returns the current frame automatically
- **Prevention**: never write frame suffixes for the 42 animation families ([naming](../api/texture-api.md#spelling-rules-and-naming-freedom))

### "...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, ..."

- **Cause**: writing a rotation-family turned-copy spelling (`[rot[N`)
- **Fix**: use the root name — `bloxdTexel` re-applies the rotation

### "...could name X and Y, which differ only by case or underscores, so it can't be used."

- **Cause**: the case/underscore-insensitive fold left the name **ambiguous**
- **Fix**: disambiguate the spelling

### "bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?"

- **Cause**: prefix misspelling (e.g. `bloxdTextureID`, `bloxdtextureid`)
- **Fix**: start names with exactly `bloxdTextureId`

### "Case and underscores are not distinguished" — how do both rules coexist?

Name resolution folds case and `_`, so `bloxdTextureId_grass_top` and `bloxdTextureIdGrassTop` resolve to the **same** constant. Only when the fold leaves multiple candidates does the dedicated ambiguity error fire ([naming rules](../api/texture-api.md#spelling-rules-and-naming-freedom)).

### bloxdTexel always returns white on models

- **By design**: most models use `textureId: 0` (no texture — player skins etc.); `bloxdTexel(0, ...)` returns `vec4f(1.0)`
- **Fix**: select with `surface.textureId != 0u` ([model-owned textures](../api/texture-api.md#model-owned-textures-textureid-0))

### Wanting to add textures

- **Limit**: the shader-pack API only **reads** the atlas; adding textures is the texture-pack system's job ([combinations](../guides/combinations.md))

### "Packs can't use X: the engine binds every texture and sampler..."

- **Cause**: declaring `texture_*` / `sampler` types directly
- **Fix**: go through `bloxdTexel()` ([Restrictions](../api/restrictions.md))

### Raw ids broke after a game update

- **Cause**: **ids are snapshots** — measured, 334 of 905 surviving names changed id between two builds
- **Fix**: write `bloxdTextureIdLava`, not `19` ([names are the API](../api/texture-catalog.md#measured-drift-cnty9--ab90qa))

### Related

- [Texture API](../api/texture-api.md) · [Texture catalog](../api/texture-catalog.md) · [Texture Registry internals](../internals/texture-registry.md)

---

## Lighting issues

> Target API: 5 · Status: Verified

Brightness, shadow and fog problems.

### Caves too bright

- **Cause**: insufficient non-linearity on `skyLight`
- **Fix**: the cave-darkening recipes in [lighting recipes](../recipes/lighting.md) and [realism recipes](../recipes/realism.md)

### Lit faces too bright at night

- **Cause**: only shadow colors were darkened — the finished color keeps its daytime brightness
- **Fix**: attenuate the whole finished color at night and relax only local light (`blockLight` / `heldLight`) — [the night guide](../guides/night.md)

### Night too dark

- **Fix**: guarantee a minimum ambient; with a zero `bloxdSunDirection()` the true moon direction is unknown, so use pseudo blue ambient ([the night recipe](../recipes/lighting.md)). The moon direction itself is `-bloxdSunDirection()` (day-night-cycle worlds only)

### Daytime blows out

- **Fix**: lower the exposure before ACES ([ACES](../recipes/realism.md))

### Torch surroundings saturated orange

- **Fix**: lower the warm blend ratio ([warm torch × cool sky](../recipes/realism.md))

### Want to keep the engine's world light exactly

- **v5 solution**: call `bloxdWorldLight(light)` — identical math to the engine's "brightest of block/sky/held, floored by ambientLightColour" ([Lighting](../api/lighting.md#bloxdworldlight--the-worlds-light))
- **Note**: `blockLight` / `heldLight` are 0 and sky-related fields are 1 when `!bloxdLit()` (header guarantee)

### Looks wrong in lighting-disabled games

- **Cause**: lighting-only inputs (`blockLight` etc.) used unguarded. v5 has no `#ifdef BLOXD_LIGHTING` — branch on **runtime `bloxdLit()`**
- **Fix**: early return `if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }` ([Lighting](../api/lighting.md#bloxdlit--the-gate))

### "LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk"

- **Cause**: dense glowing-block regions overflow the light seed queue and the chunk's light computation is cut short. **Not pack-caused**, but light gaps near glowing clusters trace to this
- **Fix**: spread light sources in the world

### Want the theory?

- Shadows: [Shadows](../guides/shadows.md) (skyLight = voxel shadow map)
- Fog: [Engine Internals: Fog Internals](../internals/fog-internals.md)

### Related

- [Lighting](../api/lighting.md) · [Visual issues](visual.md) · [Lighting Internals](../internals/lighting-internals.md)

---

## Model issues

> Target API: 5 · Target build: `ab90qa` · Status: Analyzed (new v5 territory)

Issues around the new v5 Model hooks.

### Players/mobs unaffected

- **Cause**: entities (players, mobs, NPCs, armour, cosmetics) are drawn by the **Model program** — terrain hooks don't touch them
- **Fix**: add Model hooks ([the models guide](../guides/models.md))

### Slabs, stairs, plants unaffected

- **Cause**: block models (`slab` / `stairs` / `flat`) are also Model-program geometry, never terrain
- **Fix**: use Model hooks with `flags.slab` / `flags.stairs` / `flags.flat` ([Flags](../api/flags.md))

### Water unaffected

- **Cause**: water is Liquid-hook-only; **without Liquid hooks, no Terrain hook runs on water either** (v5 change)
- **Fix**: define `bloxdLiquidSurface` / `bloxdLiquidLight` ([Variant issues](variants.md))

### Want to change only held items but everything changes

- **Fix**: select with `surface.flags.held` ([model shader recipes](../recipes/model-shaders.md))

### Flag checks don't behave

- **Likely causes**:
  1. **treating flags as a single-choice enum** — they combine freely («sandstone is sand and rock», «possibly even none») ([Flags](../api/flags.md#flags-combine-freely))
  2. reading `else` as "everything else" — the else of `flags.rock` is merely "not rock", possibly still sand
- **Fix**: combine material flags (`opaque`…) independently of shape/state flags (`slab`/`held`…)

### Enchant glint disappeared

- **Fix**: pass `enchantColour` through or use `bloxdLitColour()` ([Enchant effects](../recipes/enchant-effects.md))

### Hurt flash disappeared / too strong

- **Fix**: pass `overlayColour` through or adjust `out.overlayColour.a` ([Enchant effects](../recipes/enchant-effects.md))

### localPosition always reads 0

- **By design**: `localPosition` is `vec3f(0.0)` on terrain and liquid faces — **no model there**
- **Fix**: read it in Model hooks ([model recipes](../recipes/model-shaders.md))

### bloxdTexel returns white on models

- **By design**: `textureId: 0` (skins) samples as white
- **Fix**: select with `surface.textureId != 0u` or work from `surface.colour` ([Texture issues](textures.md))

### Want armour-only / cosmetics-only changes

- **Limit**: no flag says "armour"; `flags.lifeform` includes armour and cosmetics
- **Approximation**: combine with `localPosition` (placement) or the presence of `overlayColour` ([model recipes](../recipes/model-shaders.md))

### Related

- [Models guide](../guides/models.md) · [Model shader recipes](../recipes/model-shaders.md) · [Flags](../api/flags.md)

---

## Performance

> Target API: 5 · Status: Verified

Speed problems and their fixes.

### The on-device check never finishes and drops the pack

- **Cause**: the check has a **60-second forced timeout** (excess is treated as `skipped`) — common on low-spec devices and heavy worlds
- **Fix**: reduce heavy vertex work and complex loops, then retry
- **Prevention**: follow the [performance guide](../guides/performance.md)

### Frame rate drops

- **Check**: compare FPS with and without the pack; measure terrain-heavy scenes and water separately
- **Typical causes**: heavy effects on every face unconditionally (no flag/distance selection); high-frequency hash noise; large `pow` exponents
- **Fixes** ([the guide](../guides/performance.md)):
  - gate effects to the faces that need them via `flags`
  - early-out by distance (`distance(surface.position, bloxdEyePosition())`)
  - sample one mip up for cheaper `bloxdTexel` reads
- **Prevention**: add detail incrementally and compare FPS ([testing](../guides/testing.md))

### Slow only on mobile

- **Cause**: packs run on the WebGPU renderer; mobile GPUs can be tens of times slower than desktop
- **Fix**: reduce effect strength/frequency, strengthen distance culling — or clearly mark mobile as unsupported ([Requirements](../getting-started/requirements.md))

### Approaching the 256 KB pack limit

- **Fix**: trim comments, factor shared code into functions, drop unused recipes ([Pack structure](../getting-started/pack-structure.md))

### Related

- [Performance guide](../guides/performance.md) · [Testing](../guides/testing.md)

---

## FAQ & legal notes

> Status: Verified

### Frequently asked questions

#### Q. Are shader packs an official feature?

The shader-pack feature is accessible from the in-game UI and pack-making appears to be an intended activity. No public official documentation has been found, though — this guide is an unofficial, analysis-based document.

#### Q. Can packs do anything dangerous?

Packs are pure WGSL — **JS execution and network access are impossible by design**. Only code that passes validation and compilation runs ([Restrictions](../api/restrictions.md)).

#### Q. Which games do packs work in?

Most games run in strict mode (no vertex animation, no `discard`). Vertex animation works only in allow-listed games. The per-title list is in [Engine Internals: policy](../internals/policy.md).

#### Q. Do packs work on mobile?

Only on WebGPU-capable environments ([Requirements](../getting-started/requirements.md)).

#### Q. Can I ship my own textures?

Not in a shader pack (the atlas is read-only). That is the texture-pack system's job ([combinations](../guides/combinations.md)).

#### Q. Can I keep using an old-version pack?

The current game accepts only `apiVersion: 5`; older packs are silently deactivated ([Compatibility](../api/compatibility.md)). Migrate via [Version History](../history/).

#### Q. Will the API change again?

Engine internals may change with updates — every page names its target build. Saved packs re-validate automatically when the header or registry changes ([Compatibility](../api/compatibility.md#saved-pack-re-validation-needs-re-check)).

#### Q. What about "cinematic shader" distributions?

A community "cinematic shader" distribution we analyzed turned out to be a texture pack (128×128 textures, no `pack.json` / `.wgsl`). Most "shadowy shader-like" looks are texture-side craft ([combinations](../guides/combinations.md)).

### Legal & notes

- This is an unofficial guide and does not represent the developers' views. The API may change without notice
- Created with AI assistance; accuracy is not guaranteed. Verify against actual in-game behavior
- Measured values (texture ids etc.) are snapshots of specific builds and change between builds ([names are the API](../api/texture-catalog.md#measured-drift-cnty9--ab90qa))

### Related

- [Documentation entry](../) · [Version History](../history/)

---

## Version History

Changes, migration steps and removed APIs for v1 through v5. For migrating legacy packs and for the preserved per-era specifications.

### Timeline

| Version | Live since | Guide | Highlights |
|---|---|---|---|
| v1 | (initial) | [v1](v1.md) | first shader-pack API. 6 hooks (terrain/liquid × vertex/surface); `bloxdTime` / `bloxdOriginOffset` / `bloxdFaceBlock` / `engineColour` / `fogFactor` vocabulary |
| v2 | — | [v2](v2.md) | full identifier rename, `blockId`, `BLOXD_SCENE_DEPTH` and `bloxdOpaqueBehind()` |
| v3 | 2026-10-19 | [v3](v3.md) | `blockId` → `blockFlags` bit flags, `bloxdPi` / `bloxdTau`, official liquid hooks, hook-invocation internals |
| v4 | 2026-10-26 | [v4](v4.md) | texture API (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`), the strict contract, engine header & registry analysis |
| **v5** | **2026-11-03** | [v5](v5.md) | **current** — `BloxdFlags` struct (14 bools), Model hooks (9 total), the `bloxdLit()` / `bloxdLitColour()` lighting API, `localPosition`, enchant/overlay inputs & outputs, 6 variants |

### The shared preface

The current game accepts only `apiVersion: 5` and **old-version packs fail at the instant of load** (saved packs are silently deactivated — [Compatibility](../api/compatibility.md)). Each guide covers "previous → next". Crossing several versions? Apply them oldest-first.

### Fast path to a checklist

- v4 pack → [v5 guide](v5.md) §77 (mostly mechanical)
- v3 pack → [v4](v4.md) §61 → [v5](v5.md) §77
- v2 pack → [v3](v3.md) §47 → v4 → v5
- v1 pack → start at [v2](v2.md) §37

> For the current spec itself see [API Reference](../api/); for current-build internals see [Engine Internals](../internals/).

---

## API v1

> Status: **Historical** — the first era of the shader-pack mechanism. Every v1 pack is rejected by the current game.

v1 was the first shader-pack API. v2 renamed the identifiers wholesale ([v2 guide](v2.md) §32's table), so the main value of knowing v1 vocabulary is **reading old distributions and old community guides**.

### v1 vocabulary (renamed in v2)

| v1 | v2 onward |
|---|---|
| `bloxdTime()` | same (became `bloxdSeconds()` in v3) |
| `bloxdOriginOffset()` | same (became `bloxdRenderOffset()` in v3) |
| `bloxdFaceBlock(position, normal)` | same (removed in v3) |
| `fogFactor` | `fogVisibility` (became `fogAlpha` in v5, inverted) |
| `engineColour` | same (removed in v5 — restructured into `litColour` and `bloxdLitColour()`) |
| — | `blockId` (added in v2, became `blockFlags` in v3) |

Hooks were terrain / liquid × vertex / surface — **6 hooks**, no light hooks (light hooks only became part of the default template in v5). Block identification was texture-color guessing only; `blockId` / `blockFlags` / `flags` did not exist yet.

### Migrating v1 → v2

The wholesale rename means it is not a mechanical conversion. Read the [v2 migration guide](v2.md) from the top:

1. [§31 The fate of v1 packs](v2.md)
2. [§32 Identifier renames (the table)](v2.md)
3. [§33 Where removed fields moved](v2.md)
4. [§37 v1 → v2 checklist](v2.md)

Then apply v3 → v4 → v5 in order ([the fast path](index.md#fast-path-to-a-checklist)).

### Related

- [API v2 migration guide](v2.md) · [Compatibility](../api/compatibility.md)

---


## 第八部分: API Version 2 迁移指南


目标构建：`6qxffk.main.5912a15f.js` (2026-10-16 时点的正式部署)。本书第一至第七部分已按 v2 基准改写完毕，本第八部分汇总 v1 迁移点与 v2 新功能。新功能代码例已通过 v2 编译器的 8/8 变体检验证与浏览器 WGSL 编译器 (Tint) 验证 (§38)，既有配方的 v2 转换为机械的标识符替换，分发前务必以实机编译确认。

### 31. v1 包的命运 (先说结论)

游戏要求 manifest 的 `apiVersion` 与 **2 严格一致**。加载 v1 包会被 `This pack is for shader pack API version 1. Bloxd supports version 2.` (i18n 键 `shaderPack:loadWrongApiVersion`) 拒绝。v1/v2 **不存在并行支持**。引擎还会重验已保存包的 `validation.headerVersion` (标头全文哈希)，因此引擎更新时已保存包自动变为「待重验」的机制与 v1 相同。

### 32. 标识符全面改名 (对照表)

v2 将下划线命名统一为驼峰。**旧名一律不可用**。

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
| `bloxd_packInputs` (内部 uniform) | `bloxdPackInputs` (`@group(3) @binding(0)`，64B) |

钩子种类 (vertex / surface / light × terrain / liquid 共 6 种) 与 `pack.json` 格式 (`apiVersion` / `name` / `author`) 不变。加载器限制亦不变 (zip 32MB / 条目 1024 / `.wgsl` 256 个 / 合计 256KB / manifest 64KB)。

### 33. 删除字段的移植去向

v1 中 `time` / `eyePosition` / `sunDirection` / `originOffset` 为结构体字段。v2 中**这些字段已删除，改用读取引擎 uniform (`bloxdPackInputs`) 的标头函数**。函数直接读 uniform，因此**也可从钩子外的模块级函数与 vertex 钩子调用**。

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` 的世界坐标化 | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

### 34. 新功能 ①: `blockId` (按方块着色)

`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` 三个结构体均新增 `blockId: u32`。为面所属方块的 ID (0–65535)，同一面全域恒定 (以 `@interpolate(flat)` 传递)。用于不依赖纹理颜色的方块种类识别。但 ID 与方块种类的对应表在引擎内部，包无法引用，因此哪一 ID 对应何种方块，可在世界内实测，或查阅下述参考数据。内部上该 ID 被烘焙进顶点颜色的 alpha (低 8 位) 与法线的 w (高 8 位)——合计 16 位，故上限为 65535。blockId 系统本身只在有着色器包激活期间启用 (无包时接线保留其填充目标，但在第二部分的结构体定义中该差异不可观测)。

**参考**：作者在 [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) 公开了游戏内条目清单 (`entries.json`：id ↔ 方块名对应表，`Furnace|meta|rot2` 之类的旋转/meta 变种也作为独立 ID 收录)。对应关系可能随游戏更新变化，最终确认请在实机进行。

常用方块示例 (据 2026-10-18 的 entries.json；仅列出低 ID 的地形家族)：

| ID | 方块名 | ID | 方块名 |
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

entries.json 也收录非方块条目 (工具等)，但只有方块家族的 ID 能到达地形 / 液体钩子。

#### R-F. 按方块种类着色 (blockId)

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // 例：石系 (id 高位比特模式) 向冷色偏移
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

#### R-G. 在世界内测量 blockId——位平面显示包

用于在世界内识别「对应表未收录」的方块 ID 的调试配方。在读取想识别方块的面色时，同时改动顶部的 `plane` 常量 (`0, 1, 2, …`)。

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

面的颜色直接以 RGB 编码 blockId 的 3 位 (黑 = 0 / 红 = 1 / 绿 = 2 / 黄 = 3 / 蓝 = 4 / 品红 = 5 / 青 = 6 / 白 = 7)。一次观测读取一个八进制位。若 p0 → p3 依次读到 3, 2, 7, 2，则从最高位起读出的八进制 2723 = 1491 即该 ID (Lava)。低 ID 的地形家族用 2 次观测 (p0, p1) 就够了。本包只用 surface 钩子，因此在 strict 游戏中也运行。

#### R-H. 只摇摆树叶——按 blockId 限定 vertex 钩子

R7 的风配方 ([第三部分](../recipes/)) 会让整个地形起伏，但 vertex 钩子也能读取 `blockId`——可以只让树叶摇摆。ID 列表与 WGSL 数组 (据 2026-10-18 实测；共 22 种——Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / 果实变种 / Autumn Aspen)：

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// vertex 钩子在 strict 游戏中自动禁用 (见 §36)
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
        // 位移是随世界坐标变化的平滑函数。指向同一世界点的共享顶点
        // 移动相同，因此面永远不会撕裂 ([第三部分](../recipes/) R7 遵循同一原理)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- ID 列表随引擎更新增长 (仅在实测期间就有 50 种方块新增于新构建)。要继续使用，请经由 [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) 或 R-G 的位平面显示找出新增项，再扩展数组
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) 是地上的非固体落叶层。摆动它们会像从地面剥离；把它们从数组中排除也是一个选择
- 在 strict 游戏中 vertex 钩子会被整体禁用，但有上面的守卫，包只是「停止摇摆」——片元侧效果继续工作

### 35. 新功能 ②: `BLOXD_SCENE_DEPTH` 与 `bloxdOpaqueBehind()` (核心)

v1 中结构上不可能的深度访问，**仅限液体 (liquid) 程序解禁**。取不到颜色，但**可取得后方不透明面的距离与位置等几何信息**。典型用法是以测得的水体厚度计算吸收色。

使用规则：

| 用法 | 结果 |
|---|---|
| 在 `bloxdLiquidSurface` / `bloxdLiquidLight` 内无守卫调用 | 可 (液体变体恒有定义) |
| 在 `bloxdTerrainSurface` 内无守卫调用 | 报错。以 `#ifdef BLOXD_SCENE_DEPTH` 包裹 |
| 在 vertex 钩子内调用 | 报错 (仅 surface / light 钩子可用) |

地形钩子也想用深度时，以 `#ifdef BLOXD_SCENE_DEPTH` 包裹 (地形钩子会被液体程序复用，仅液体侧深度有效)。

#### R-E. 水体厚度吸收 (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // 水柱长度 = 从当前位置到后方不透明面
        let thickness = distance(behind.position, surface.position);
        // Beer-Lambert 吸收：红色迅速衰减，蓝色传得更远
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // 后方为空 = 向深水蓝色偏移
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

应用：基于厚度的吸收/散射、经 `behind.position` 的底面世界坐标做波纹/焦散风投影、以 `found=false` 区分天空与遮蔽做水面空反射、按深度分级加泡与浑浊。深度拷贝管线构建失败时会安全降级为「后方空无一物」。深度纹理的就绪状态只在页面渲染器生成时决定一次——标准是「当前激活的包是否读取深度」。**使用读取深度的包时，请务必重新加载页面**。在包激活状态下请求深度而页面未重新加载时，控制台会显示一次 `…reads scene depth on a page that didn't turn it on` 警告，深度纹理被替换为 1×1 回退，导致 `bloxdOpaqueBehind()` 恒返回 `found = false`。

### 36. 其他 v2 变更

- **钩子回退**：液体程序在 `bloxdLiquidXxx` 未定义时回退到地形钩子。**仅地形钩子的包会原样作用于水面**。不希望时请显式定义 liquid 侧钩子。
- **`BLOXD_LIGHTING` 字段守卫不再必要**：全变体存在 `blockLight` 等，无光照时填默认值 (0 / 1 / 白 / 0)。仅在判定光照时使用 `#ifdef BLOXD_LIGHTING`。保留既有守卫动作不变。
- **`BLOXD_ALPHA` 定义条件变化**：非 strict 地形变体与全液体变体有定义，strict × terrain 无定义。地形钩子写 alpha 时请保留守卫。
- **禁止直接构造结构体**：`BloxdLight(...)` 等构造器调用会被静态检查拒绝。务必从 `bloxdDefault*` 改写，或使用输入的拷贝。
- **`let _ =` 改为 `_ =`**：WGSL 的弃置赋值 `_ = f();` 有效，但 `let _ = f();` 会被拒绝。
- **offInStrict**：定义 vertex 钩子，或 surface / light 钩子可达的 `discard`，不会报错而是整个包在 strict 游戏中自动禁用 (设置 UI 显示 `shaderPack:offInStrict`，allow 游戏仍可运行)。vertex 钩子与 `discard` 以 `#ifndef BLOXD_STRICT` 包裹。注意设置画面自身的警告也要求把剩余部分以 `#ifndef BLOXD_STRICT` 包裹——这是官方建议，而非单纯的惯例。
- **雾的扩展**：雾计算实现了 LINEAR / EXP / EXP2 三种模式，但游戏侧设置恒为 LINEAR，既有雾规格可照用。`fogColour` 含义也正式明确 (仅在完全无雾的场景为黑)。
- **未变之物**：提升曲线、35% 通道地板、heldLight 衰减 (`pow(lightDist, 0.75)`) 与环境光助推、太阳与月亮方向规格、默认雾色、time 回绕 (3600 秒)、方向光 (最多 4 盏)、Lite (WebGPU) 专用、保存机制 (IndexedDB)、`mod` 保留字。

### 37. v1 → v2 迁移清单

1. **pack.json**：`"apiVersion": 1` → `"apiVersion": 2`
2. **标识符**：按 §32 对照表全部替换 (钩子名、结构体名、default 函数名)
3. **删除字段的移植**：按 §33 表格改用标头函数 (`s.time` → `bloxdTime()` 等)
4. **`fogFactor` → `fogVisibility`** 改名
5. **去除结构体直接构造**
6. **`let _ =` 改为 `_ =`**
7. **vertex 钩子与 discard 以 `#ifndef BLOXD_STRICT` 包裹**
8. **确认水面同样受到地形钩子影响**，不希望时显式定义 liquid 钩子
9. (可选) 以 `litColour` 为起点自管雾 / 以 `bloxdOpaqueBehind()` 加水体厚度吸收 / 以 `blockId` 做按方块表现
10. **第二阶段 (浏览器 Tint) 也要验证** — 尤其含 `^` `&` `|` `<<` `>>` 的表达式括号。存在通过静态验证却被浏览器拒绝的代码 (§38)

### 38. 第二验证阶段 — 浏览器的 WGSL 编译器比内置解析器更严格

游戏包验证分 **2 阶段**。第 1 阶段是静态验证 (引擎内置 JS 解析器。检查钩子签名、禁用语法、sceneDepth 使用等包专有规则)，第 2 阶段是浏览器验证 (将编译结果附带的子模块以真正的 WebGPU 实现编译，错误逆映射到包原始文件行显示。UI 的「Saved, but it won't run until you fix these errors」即此阶段)。错误显示末尾的 `(only in terrain)` 等后缀表示「出现该错误的变体的 program 种类」。

内置解析器未实现 WGSL 的运算符结合 (Binding) 规则，**存在通过静态验证却被浏览器拒绝的代码**。易受害的是整数哈希的经典写法：

| 运算符 | 后果 |
|---|---|
| `<<` `>>` | 只能直接结合到一元级。`a + b << c` 报错 |
| `&` `^` `\|` | 只能直接结合到一元级。`a * b ^ c` 报错 |
| `&&` `\|\|` | 不可混用。`a && b \|\| c` 报错 |

#### 加括号方法 (NG / OK)

```wgsl
// NG — 通过静态验证，但浏览器 (Tint) 拒绝：
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — 每个乘法加括号 (同一运算符连锁 A ^ B ^ C 本身左结合合法)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

本书刊载代码不含此写法 (`pack_hash3` 的 `+`/`*` 混用与 `h ^ (h >> 16u)` 已加括号，故符合规范)。写完包后，第 1 阶段与第 2 阶段都要通过。

### 39. 关于独立相似资料

存在内容几乎相同的社区资料：[GlitchHunterCoder/Bloxd-Essay 的 Shader](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader)。它比本指南先公开，但**本指南内容出自 glm 对 Bloxd 实际包文件 (webpack chunk 集) 的独立解析——并非复制粘贴**。两者一致是因为独立调查同一实现必得同一结论。

---

调查：ltf_ahel (使用 glm 调查)

---


## 第九部分: API Version 3 迁移指南

> **已于 2026-10-26 被取代: 现行 API 为版本 5** —— v3 包在加载时被拒绝，方式与本文对 v2 的描述完全相同。请先应用本部分，*再*应用 [第十部分](../history/v4.md) (v3 → v4: 纹理 API、`fogAlpha` 改名、`bloxdFragmentBlockPosition`、`hit`)。 然后也应用 [第十二部分](../history/v5.md)（v4 → v5）。

目标构建: `3ymzdd.main.fae4743f.js` — **自 2026-10-19 起的正式生产构建**。bloxd.io 在生产环境提供的 bundle 与本部分最初调查所用的预发布部署逐字节一致 (已核对 md5，主 bundle 与着色器包 chunk 均如此)，因此这里的内容原样适用于生产环境。包模型保持 v2 形态 (相同的 `pack.json` 字段、相同的加载器限制、相同的 uniform 布局)。

本指南第一至第七部分仍以 v2 为基准撰写。本部分按与[第八部分](../history/v2.md)相同的顺序，汇总 v2 → v3 的迁移点与 v3 新功能。转换大多是机械性的 (§47)，但只有一项变更会实际改变行为——默认光照现在会让自发光随雾衰减 (§43)——另外 `blockId` 已整体替换为 `blockFlags` (§42)，因此分发前务必在游戏内编译验证。

本修订新增: **§49–§54** 越出迁移本身，深入从生产构建复原的引擎内部——Lite 渲染器实际如何调用你的钩子、真实的四模式雾函数、`bloxdOpaqueBehind()` 的精确实现、blockFlags 从方块注册到钩子的完整传递路径，以及带实测标头哈希的验证管线。这些是迄今关于包系统最深入的公开记录事实，也解答了其他指南仍列为未决的若干问题。

### 40. v2 包的命运 (先说结论)

**2026-10-19 更新: v3 已离开预发布环境，现在由正式站点提供。** 上线前保存的每个 v2 包——包括所有以 v2 分发的包——现在都会在生产环境按下文所述失败，因此对今天分发包的任何人来说，§47 的迁移不再可选。

该构建要求 manifest 的 `apiVersion` **精确匹配 3**，且**不并行支持 v2/v3**。v2 包在加载时会被「API 版本不符」消息拒绝 (i18n 键与占位文本):

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>

已保存的包沿用 v2 生命周期 ([第八部分](../history/v2.md) §31): 每个构建都会计算其引擎标头的哈希，引擎更新会自动把已保存包标记为「需要重新检查」，而 `apiVersion` 不是当前版本的已保存包会被标记为不会运行 (并用上述状态消息指向替代包)，而不是报错。

### 41. pack.json 与 uniform 缓冲 (不变的部分)

- 必需的 manifest 字段不变: `{ apiVersion, name, author }`。
- 加载器限制不变: 32MB zip / 1024 个条目 / 256 个 `.wgsl` 文件 / 代码总量 256KB / manifest 64KB。
- 引擎 uniform 块的形状不变: `@group(3) @binding(0)`，64 B，按声明顺序存放时间、渲染偏移、太阳方向与眼睛位置。该布局以 `minBindingSize: 64` 注册，精确字段布局为 `seconds: f32` @ 字节 0、`renderOffset: vec3i` @ 16、`sunDirection: vec3f` @ 32、`eyePosition: vec3f` @ 48。有两个内部字段名改变: `time` → `seconds`，`originOffset` → `renderOffset`。**字节布局与 v2 完全相同**，而且包代码本来就不会受影响，因为包不能直接命名该 uniform (引擎标头将其标记为由引擎提供且只读，包无法命名它)；继续通过标头函数 `bloxdSeconds()` / `bloxdRenderOffset()` 使用即可。
- 包的 group 3 增加了一个有文档记录的第二个占用者: `@group(3) @binding(1)` 是 `bloxdOpaqueBehind()` 读取的场景深度纹理 (完整实现见 §51)。64 B uniform 仍在 binding 0；包仍然不能命名任一 binding。

### 42. blockId 变成 blockFlags: 每方块材质以位标志表示 (核心)

在三个钩子输入结构体 (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`) 中，v2 字段 `blockId: u32` 都被**替换**为 `blockFlags: u32`。引擎对该字段的说明: *「这个面是什么种类的方块: `bloxdBlockFlag*` 位，整个面一致。」* 引擎现在直接提供材质数据，因此 v2 中根据数字 id 范围猜测材质、或在世界内维护 id 表的方法 ([第八部分](../history/v2.md) §34) 不再需要。

这些位以具名常量公开:

```wgsl
// 用 (blockFlags & bloxdBlockFlagRock) != 0 测试。
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| 值 | 常量 | 含义 (引擎注释摘要) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | 完全不透明——树叶与冰也算。不包括玻璃、水、岩浆、刷怪笼，以及幽灵与隐形方块。 |
| 2 | `bloxdBlockFlagEmissive` | 发出方块光，如霓虹、传送门、灯、岩浆与信标。发光的矿石也算，无论多微弱。 |
| 4 | `bloxdBlockFlagVegetation` | 树叶，以及草方块上的草——草方块同时也属于泥土。不包括仙人掌、蘑菇方块或干草。 |
| 8 | `bloxdBlockFlagDirt` | 泥土与土壤，包括草方块。Rocky Dirt 同时也属于岩石。 |
| 16 | `bloxdBlockFlagSand` | 沙子、红沙，以及所有砂岩——砂岩同时也属于岩石。 |
| 32 | `bloxdBlockFlagRock` | 石头及其种类、安山岩、闪长岩、花岗岩、砂砾、矿石、砂岩、Rocky Dirt、基岩、黑曜石与岩浆。 |

由多种材质构成的方块会携带**每一项**匹配标志 (引擎自己的例子: 砂岩属于沙与岩石，因此两者都有)。树叶属于植被但不属于泥土；草方块同时属于植被与泥土。

植被 / 泥土 / 沙 / 岩石标志由方块注册的**显示名**分配 (不透明 / 自发光则来自引擎自身的不透明度与发光数据): 以 `Leaves` 结尾或名为 `Grass Block` 的是植被；`Dirt` / `Soil` 名称 (以及所有 `Grass Block`) 是泥土；正好为 `Sand` 与 `Red Sand`，以及任何包含 `Sandstone` 的名称是沙；包含 `Stone` / `Andesite` / `Diorite` / `Granite` 的名称、任何 `Ore`，以及 Yellowstone、Gravel、Bedrock、Obsidian、Magma、Rocky Dirt (和砂岩) 是岩石。

#### 精确名称规则 (自行推导任意方块的标志)

四个材质位来自对方块注册显示名的固定分类器。变体名 (`|` 之后的内容) 会先被剥离，因此变体继承基础方块的标志。然后:

| 位 | 规则 (在剥离后的名称上求值) |
|---|---|
| 植被 | 名称**以** ` Leaves` **结尾**，或**以** ` Grass Block` **结尾** |
| 泥土 | 名称**正好是** `Dirt`、**以** ` Dirt` 或 ` Soil` **结尾**，或**以** ` Grass Block` **结尾** |
| 沙 | 名称**正好是** `Sand` 或 `Red Sand`，或**包含** `Sandstone` |
| 岩石 | 名称**正好是** `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt` 之一、**包含** `Sandstone`、**以** ` Ore` **结尾**，或以独立单词形式包含 `Stone` / `Andesite` / `Diorite` / `Granite` |

Yellowstone 被显式列出，因为 `Stone` 在 `Yellowstone` 中不是独立单词。不透明与自发光**不**来自名称——它们来自引擎自身的不透明度与方块光发射数据，因此无法用这些规则推导。

来源: 引擎的名称分类器 (模块 28537，bundle `3ymzdd`)；已对照全部 7,861 个具名方块验证，2026-10-20。

示例——按材质给每个方块着色:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

对 v2 配方的影响: R-H 的 22 项树叶 id 数组 ([第八部分](../history/v2.md) §34) 可缩减为 `(blockFlags & bloxdBlockFlagVegetation) != 0`。id ↔ 方块名对照表 [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) 在非着色器用途上仍然有用，但已不需要为了材质样式在世界内查找。

#### 不带草的树叶 (大家都会问的问题)

单独的 `vegetation` 会同时匹配树叶**和**草方块上的草，而草方块还带有 `dirt`。排除泥土即可只影响树叶——这正是引擎自身字段注释写明的判别方式:

```wgsl
// 仅树叶: 不带泥土的植被。草方块是植被 AND 泥土。
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// 仅草方块 (地形表面的草面):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

已对照实时注册表验证 (2026-10-20，bundle `3ymzdd`):
`vegetation && !dirt` 精确匹配 45 个树叶注册项 (22 个基础类型——正是 v2 R-H id 数组测得的 22 个)；`vegetation && dirt` 精确匹配 8 个草方块。两个方向都没有例外——注册表计数以该构建为准；新方块会增加数字，但不会改变规则。可配合 `vertex.normal` (上/下) 选取面，例如只选草方块顶面。

### 43. 函数改名与语义变化

| v2 | v3 | 说明 |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | 页面加载后的秒数 (下方 f32 精度说明) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | 同一量: 渲染位置 + 此值 = 世界位置 |
| `const bloxdTimeWrap: f32 = 3600` | **已删除** | 在包侧自行定义周期 |
| `engineColour` (`BloxdLightIn` 中) | **已删除** (14 → 13 个字段) | 由 `litColour` + 雾重建 |
| 钩子参数 `v` / `s` / `l` | `vertex` / `surface` / `light` | 模板写法；签名不变 |

- **`bloxdSeconds()`** — 页面加载后的秒数。在 f32 中，前 4.5 小时以不足 1 ms 的步长计数，9 到 18 小时约为 4 ms。标头推荐 `bloxdSeconds() % period` 写法：从 0 计到 `period` 后重新开始——可干净替代已删除的回绕常量。
- **`bloxdRenderOffset()`** — 以整方块为单位: 「渲染位置加上此值即为世界位置。」它会随玩家移动而变化，因此渲染位置始终靠近玩家——也就更精确。全指南中，v2 文本所称的 noa 局部偏移现已统一称为**渲染位置** / 渲染偏移；它与 `bloxdOriginOffset()` 返回的是同一个量。
- **`bloxdTimeWrap` 已删除** — 原先以 3600 秒回绕时间的包，现在自行声明常量，例如 `const timeWrap: f32 = 3600.0;` 并使用 `% timeWrap`。
- **默认光照语义** — v2 默认值为 `engineColour + emission × fogVisibility`；v3 默认改为 `bloxdApplyFog(litColour + emission, light)`——**自发光现在会在默认实现内部随雾衰减**，因此合成输出会一起经过雾混合。移植表:

  | v2 表达式 | v3 移植 |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // v2 读取 `l.engineColour + s.emission * l.fogVisibility` 的 v3 移植:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **名称与含义不变**: `bloxdEyePosition()`、`bloxdSunDirection()`、`bloxdFaceBlock()`、`bloxdApplyFog()`、`bloxdWorldPosition()`。

### 44. 新标头常量: `bloxdPi` 与 `bloxdTau`

```wgsl
// 半圈与整圈，单位为弧度。
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

无论是三角函数技巧，还是为了避免在包内硬编码 π，都很有用。注意名称复用: 包内同名常量现在会与标头的重复标识符检查冲突——删除或重命名代码中任何 `bloxdPi` / `bloxdTau` 重声明。

### 45. 六钩子模板 (官方展示液体钩子)

随构建发布的默认包文本现在包含**全部六个钩子**——地形 / 液体 × vertex / surface / light——各自返回其引擎默认值。引擎注释如此介绍: *「每个钩子都返回其引擎默认值。复制一个钩子并修改其输出，即可开始制作着色器包。」*

```wgsl
// 每个钩子都返回其引擎默认值。复制一个钩子并修改其
// 输出，即可开始制作着色器包。

// 严格游戏会保持地形原位: 若不加守卫，这个钩子会在那里
// 关闭整个着色器包。
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

// 水使用这些钩子。若删除，水会改用你的地形钩子。
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

- 钩子的注释直接写明液体规则: **水需要这一组三个钩子；删除后水会复用你的地形钩子** (v2 已知的回退行为，[第八部分](../history/v2.md) §36，现已写入模板本身)。
- `bloxdLiquidVertex` 与 `bloxdTerrainVertex` 位于同一个 `#ifndef BLOXD_STRICT` 守卫内——若不加守卫，它会像地形侧顶点效果一样，在严格游戏中关闭整个包。
- 模板写法现使用完整参数名 `vertex` / `surface` / `light` (v2 模板使用短名 `v` / `s` / `l`)。你自己代码中的参数名是自由的——只有签名重要。

### 46. 变体矩阵: 程序轴与宏的变化

变体由 **严格 × 光照 × 程序** 矩阵生成——与 v2 相同的 8 种组合，但地形 / 液体现在是矩阵的显式轴。变体名写作 `allow|strict · unlit|lit · terrain|liquid`，在 UI 中显示为 `terrain` / `liquid`、`strict` / `non-strict`、`lighting on` / `lighting off` (错误显示可能追加 "(only in {{variants}})")。

| 宏 | 定义于 |
|---|---|
| `BLOXD_STRICT` | 严格变体 (两种程序) |
| `BLOXD_LIGHTING` | 开启光照的变体 (两种程序) |
| `BLOXD_ALPHA` | **所有液体变体**，外加非严格**地形**变体 |
| `BLOXD_SCENE_DEPTH` | **所有液体变体** |

与 v2 规则相比 ([第八部分](../history/v2.md) §36)，作者侧有两项变化:

- **`BLOXD_ALPHA` 与 v2 相同。** 变体生成器带有字面行 `"liquid"!==program&&strict||push("BLOXD_ALPHA")`——JS 运算符优先级使 *(地形 **且** 严格)* 成为唯一跳过 push 的情况，因此该宏在**所有液体变体 (严格或非严格) 与非严格地形**中定义；只有严格地形省略它。液体侧的 `#ifdef BLOXD_ALPHA` 代码编译情况与以往完全一致，§49 的 alpha 回写 (为液体程序或非严格变体拼接) 与这一集合精确吻合。
- **`BLOXD_SCENE_DEPTH` 在液体变体中始终定义**，因此那里可以不加守卫地使用深度，与 v2 完全一致 (§35)；在地形钩子中仍需 `#ifdef BLOXD_SCENE_DEPTH` 包裹。

### 47. v2 → v3 迁移清单

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`**：三个输入结构体全部修改；用针对 `bloxdBlockFlag*` 常量的位测试表达材质样式 (§42)；去掉 v2 的 id 区间启发式
3. **`bloxdTime()` → `bloxdSeconds()`**；自行声明周期，替代已删除的 `bloxdTimeWrap` (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **按 §43 的表把光照数学从 `engineColour` 重建为 `litColour` + 雾**；注意默认实现现在会让自发光随雾衰减
6. **液体钩子**: 想让水得到不同处理时，显式定义 `bloxdLiquid*`；省略则回退到地形钩子
7. **无需审查 `BLOXD_ALPHA`**——其变体集合与 v2 相同: 所有液体变体与非严格地形都定义它，只有严格地形省略 (§46)
8. **使用 `bloxdPi` / `bloxdTau`**，替代硬编码的三角相关常量；删除现在与标头重复的包内重声明
9. **保留严格守卫**: vertex 钩子与 `discard` 仍包在 `#ifndef BLOXD_STRICT` 内；模板对 `bloxdLiquidVertex` 也采用与地形相同的守卫
10. **在游戏内验证**——在支持着色器包的游戏里编译并测试

### 48. 其他 v3 变更与注意事项

- **验证仍为两阶段** ([第八部分](../history/v2.md) §38): 先静态验证，再通过生成的桩片段调用你的钩子，交给浏览器真实 WebGPU 编译；错误会映射回源文件 / 行，诊断还会通过映射还原引擎侧标识符的原始名称。
- **严格诊断会说明原因**: 移动地形的 vertex 钩子会报告 "… moves terrain, which strict games prevent."，surface / light 钩子中的 `discard` 会报告 "discard makes terrain see-through, which strict games prevent."；设置 UI 保留 "wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`." 的说明 (`offInStrict`)。
- **加载器消息**: 错误类型与限制不变；"Zip64 archives aren't supported." 会作为 UI 消息显示 (`loadZip64`)。包 UI 的字符串清单共 57 个 `shaderPack:*` 键；在加载阶段错误中，`loadNoWgsl` (zip 中没有任何 `.wgsl` 文件) 与 `loadNotZip` (文件缺少 zip 归档结束签名) 补全了这一集合。
- **包 UI 不附带游戏内 WGSL 编辑器。** 设置画面不提供着色器代码编辑器——包在游戏外以 zip 文件编写。(bundle 中确实存在 CodeMirror 编辑器，但那是 Custom Game 脚本 UI 的 JavaScript 编辑器；它不支持 WGSL，也与包系统毫无关联。)
- **硬件门槛**: Lite 要求驱动支持 `shader-f16` WebGPU 功能；过旧的驱动会被拒绝，消息类似 "Intel driver too old for Lite (no shader-f16)"。
- **光照变更会重新验证已保存的包**: 运行时光照设置改变时，引擎会重新运行包检查 (`changed → recheck`)；回放观看以 `changed: false` 调用同一钩子，并跳过重新检查。
- **措辞**: 关于接受着色器包的游戏，文本现在写作 "in games that **support** them"。
- **标题范围**: 包可运行的游戏集合与上一构建相同。

### 49. 引擎内部: Lite 渲染器如何调用你的钩子

§40–§48 是加载器与标头告诉你的一切。本节及随后四节记录引擎在运行时实际做了什么，均从生产 bundle 复原 (Lite 渲染器——175 KB 的 chunk；集成源文件的真实名称 `lite/terrainShaderPack.ts` 仍保留在其错误字符串中)。这些不改变你要写的代码，但能消除关于钩子收到什么的猜测——并解决其他社区指南仍列为未决的若干问题。

渲染器并不会从 JavaScript「调用」你的钩子。包通过验证后，引擎通过替换其着色器文本中的固定锚点行，**把你的钩子调用拼接进它自己的地形 WGSL**。每个锚点必须恰好匹配一次——零次或多次匹配都会以 `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)` 中止。

| 阶段 | 引擎着色器中的锚点行 | 拼接内容 |
|---|---|---|
| vertex | 从 `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` 到 `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);` 的四行代码块 | 构建 `BloxdVertexIn`，调用你的 vertex 钩子，写回 `worldPos`——拼接还会把 `let worldPos` 改写为 `var worldPos` |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | 构建 `BloxdSurfaceIn`，调用你的 surface 钩子，写回 `baseColor` / `alpha` |
| lit colour | 就在 `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` 之前 | `let bloxdSpLitColour = color.rgb;`——捕获雾前颜色 |
| light | 片元着色器最后的 `return color;` 行 | 构建 `BloxdLightIn`，调用你的 light 钩子，写回 `color`——在雾混合之后 |

拼接后的代码，从正式发布的 bundle 复原 (光照等级采样表达式在引擎自身格式过长处作了缩写):

```wgsl
// 顶点阶段——带顶点钩子的非严格变体
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* 你的 bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// 片元阶段——surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* 你的 surface 钩子 */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // 仅当程序为液体或变体为非严格时拼接
```

```wgsl
// 片元阶段——light
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // directional
        ambient,                                 // ambient
        /* 光照等级 varying */.rgb,              // blockLight
        /* 同一 varying 的天空通道 */,           // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* 手持光项 (见下) */,                   // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour——仅在完全没有雾时为黑色
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* 你的 light 钩子 */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

从这次拼接可直接得出四条执行事实:

- **严格地形会忽略 surface 钩子的 alpha 变更。** `alpha = bloxdSpSurface.alpha` 回写只会为液体程序或非严格变体拼接——这正是 §46 宏表背后的实现。(在严格地形中，你的 `#ifdef BLOXD_ALPHA` 代码本来就不会编译进来；现在也确认了未加守卫的 alpha 写入在那里会被丢弃。)
- **仍声明 vertex 钩子的严格变体永远不会运行它**——引擎在构建时报告: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`。这就是官方模板 (§45) 为何把 `bloxdLiquidVertex` 与地形版本一样包在 `#ifndef BLOXD_STRICT` 中。
- `bloxdSp*` 标识符——**共 14 个**: `bloxdSpVertexIn`、`bloxdSpVertex`、`bloxdSpSurfaceIn`、`bloxdSpSurface`、`bloxdSpLightIn`、`bloxdSpLight`、`bloxdSpLitColour`、`bloxdSpSceneDepth`、`bloxdSpPixel`、`bloxdSpPositionW`、`bloxdSpZ`、`bloxdSpEye`、`bloxdSpScale`、`bloxdSpBehind`——是引擎侧临时变量。你的代码永远不会看到它们，但它们会出现在诊断和任何人的逆向输出中，因此值得一眼认出。
- **默认 surface 捷径。** 当变体的 surface 钩子字面就是 `bloxdDefaultSurface` 时，引擎完全跳过拼接 `baseColor` / `alpha` 回写行——默认实现已经产生这些值，赋值只会是死代码。未修改的钩子链不付出任何代价。

**`BloxdLightIn` 实际由什么填充**——逐字段，来自拼接代码:

| 字段 | 引擎侧来源 |
|---|---|
| `litColour` | 雾混合前刚捕获的片元颜色 (`bloxdSpLitColour` 锚点)——正如标头所说，「在自发光与雾之前」 |
| `directional` | `vTerrainLambert`——场景方向光上 `max(0, dot(normal, lightDirection)) × intensity` 的顶点插值和 (公式见 §54)；场景没有方向光时为 0 |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient`——每材质、每帧 |
| `blockLight` | 解码后的光照等级 varying 的 `.rgb` (解码见 §54) |
| `skyLight` | 同一光照等级 varying 的天空通道——*「体素天空光，经色调映射；无 BLOXD_LIGHTING 时为 1」* (标头文本) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | 手持光项，由光照等级 varying 的 w 通道与 `uHeldLightPos` / `uHeldLightColour` 帧 uniform 构成 ([第七部分](../internals/) §26 记录了衰减与通道地板行为) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)`——**仅在完全没有雾的场景中为黑色** (模式 0，§50) |
| `fogVisibility` | 钳制后的雾系数——§50 函数返回的精确值 |
| `position` / `normal` | `vPositionW` / `vNormalW` varying (法线逐片元重新归一化) |
| `blockFlags` | `vBlockFlags` flat varying——§52 的完整传递路径 |

阅读旧资料时的定位参考: 相同的拼接架构在 v2 渲染器中已存在，v3 的集成差异只有 `vBlockId` → `vBlockFlags` 以及新增的液体变体。跨越 v2 → v3 的断裂，钩子系统架构保持稳定。

### 50. 雾函数: 四种模式，一个字段

从生产地形着色器逐字复原:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // 线性
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // 指数
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // 指数平方
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = 雾关闭 (系数保持 1.0)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)`——一个 vec4 驱动一切。
- **着色器中存在四种模式: 0 = 关闭，1 = 指数，2 = 指数平方，3 = 线性。** 无论运行哪种模式，`fogVisibility` 都是钳制后的系数——只有一个字段，且从不向包暴露模式标志。
- Bloxd 自家标题使用模式 3 (线性)，采用[第七部分](../internals/) §25 所述的 32 方块雾带 (`fogStart = 32 × D`，`fogEnd = 32 × (D + 1)`)，因此第七部分的「始终线性」观察仍描述已发布玩法。但指数模式是真实、活跃的引擎代码——标题可以切换 `vFogInfos.x`，在客户端不更新的情况下改变渐变。自行计算 `distance(l.position, bloxdEyePosition())` 的距离配方 (配方 R-B) 是编写距离驱动外观的稳健方式，因为它们不会被模式切换移动。
- 这从源码层面解决了「引擎实际使用哪种雾渐变」的问题: 四种都已实现；已发布标题使用线性。(同一函数也解释了标头的 fogColour 注释——模式 0 是 `fogColour` 以黑色到达的唯一情况，而 Bloxd 的游戏从不发布模式 0；它们改为把雾推得很远，[第七部分](../internals/) §25。)

### 51. bloxdOpaqueBehind(): 精确实现

整个函数，从生产构建逐字复原:

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

- **深度纹理位于 `@group(3) @binding(1)`**——group 3 是包自己的组: binding 0 是 64 B 的 `bloxdPackInputs` uniform (§41)，binding 1 是这个深度纹理。两者都由引擎提供，包侧无法命名。
- **深度纹理是不可过滤浮点 (unfilterable-float)、仅片元的资源。** bind group 布局将其注册为 `texture: { sampleType: "unfilterable-float" }`，可见性仅为 `GPUShaderStage.FRAGMENT`——这正是 `bloxdOpaqueBehind()` 建立在 `textureLoad` (显式 texel 坐标，mip 级别 0) 而非 `textureSample` 上的原因: 硬件过滤在这张纹理上根本不可用。
- `z ≤ 0` 表示深度采样没有命中任何东西 (远平面 / 天空): `found = false`，而 `position` / `distance` 无意义——永远先检查 `found`。
- 返回的位置是**射线缩放交点**: 不透明表面放在 `eye + (fragment − eye) × max(z / viewDepth, 1)`。`distance` 从眼睛量到该点——对水面包来说，这实际上就是「射线在撞到实体前穿过了多少水」，这也正是深度着色水面配方无需第二个深度缓冲就能工作的原因。

### 52. blockFlags 全链路: 从注册到钩子

§42 说明了各位的含义。本节给出标志位从方块注册到钩子的完整路径——每一跳都已从生产源码确认，这也把标头的「面上一致」证明到字节级。

**1. 注册 (方块定义数据库)。** 每个方块的标志在注册时计算一次:

```js
flags[id] = nameFlags                     // 显示名规则 (§42): 植被 / 泥土 / 沙 / 岩石
          | (definition.opaque === true ? 1 : 0)   // 不透明位——引擎不透明度数据
          | (anyFaceEmission >= 1       ? 2 : 0);  // 自发光位——方块光发射数据
```

显示名规则只覆盖四个材质位；两个物理位来自独立的引擎数据——`opaque` 直接来自方块定义，`emissive` 来自逐面方块光发射数组。标头所说「发光的矿石也算，无论多微弱」是字面意思: 任何面发射 ≥ 1 都会置位。

**2. 逐方块 → 逐材质 (mesher 初始化)。** 地形按*材质*绘制，而不是按方块 id，因此标志会重新制表为材质表 (`Uint16Array`，以材质 id 索引，每个材质取其所属方块第一个面的标志)。该表会送到 meshing Web Worker——但**只在启用包管线的配置中**；否则表为 `null`，且永远不会写入任何标志字节。没有包的玩家按构造付出零开销。

**3. 进入顶点字节 (mesher worker)。** 标志搭载在现有交错顶点数据的两个空闲字节上:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // 低 8 位 → 颜色属性的 alpha 字节
        buffer[o + normalOffset + 3] = flags >> 8;    // 高 8 位 → 法线属性的 w 字节
    }
}
```

一个面的四个顶点都收到相同值——这就是「面上一致」在实现层的含义。

**4. GPU 侧解码 (Lite 地形着色器)。** 这两个字节作为 `blockFlagWords: vec2u` 顶点属性传输 (location 7，仅在包管线开启时存在)，并在顶点阶段重组:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags` 声明为 `@interpolate(flat)`——逐面常量一直传到片元阶段，因此 §42 的位测试在面内稳定，绝不会产生面内混合。

- 管线保留 **16 位**容量 (该解码会重组两个完整字节)，而 v3 只定义了 6 位——未来新增标志无需再次修改顶点格式或提升 API 版本。
- 在 packed 顶点模式下，同样两个字节搭载于 `packed.y` 与颜色字的高字节中，而不是专用属性——值相同，容器不同。
- 关于这些标志最常被问到的树叶与草之分，见 §42 下的[不带草的树叶](#不带草的树叶-大家都会问的问题)。

### 53. 验证内部: HEADER_VERSION、签名、保留名

**实测标头哈希。** 每次包验证都会盖上引擎的 `HEADER_VERSION`。直接执行生产验证模块 (§54 末尾的 harness 说明) 可测得:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← 从正式生产 bundle 实测
```

它是一个 FNV-1a-32 哈希 (前缀 `6.`)，对五个输入计算: 按**每个变体**预处理并分词的引擎标头 (8 个变体各一项)、解析器完整的 WGSL 词法宇宙、四个宏名、特殊函数映射，以及 `BloxdPackInputs` 声明连同其 `@group(3) @binding(0)` uniform 行。对作者有两点后果:

- **任何引擎侧标头修改都会重新哈希**——这正是引擎更新后已保存包自动收到「需要重新检查」标记的机制 ([第八部分](../history/v2.md) §31)。
- 哈希覆盖的是*引擎标头*，不是你的代码。在引擎更新后仍能加载的包并不代表「仍然有效」——只是尚未触发标头变更。你的 manifest 参与的唯一版本检查是 `apiVersion` 闸门 (§40)。

**钩子签名检查: 类型逐 token 精确，名称自由。** 验证器为每个钩子槽保存一个签名:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

匹配是**逐 token** 的: 参数类型名必须完全一致，`->` 与返回类型必须完全一致，并检查参数数量和逗号位置。参数*名称*自由——参数位置接受任意标识符，因此你的 `fn bloxdTerrainLight(s, l)` 即使模板写作 `(surface, light)` 也能编译。light 钩子恰好接受两个参数。

**保留名。** 规则是单个正则: `/^bloxd/i`。任何以 `bloxd` 开头的标识符都保留——所有 `bloxd*` 都由引擎提供，包不能声明进该命名空间 (这也是 §44 的 `bloxdPi` / `bloxdTau` 重声明会冲突的原因)。

**特殊函数。** v3 中恰好注册了一个:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

「特殊」意味着*与宏绑定*——可用性取决于变体符号的引擎函数。两条守卫诊断会强制正确使用:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.`——vertex 钩子调用了仅 surface / light 钩子可用的函数。
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.`——例如地形侧调用 `bloxdOpaqueBehind()` 却没有 `#ifdef BLOXD_SCENE_DEPTH` 包裹。

**引擎标头 (prelude)，已钉住。** v3 标头是一个 5,637 字节字符串，开头为 `// Engine-provided and read-only, prepended to all packs. apiVersion 3.`。它带有 `#if` / `#ifdef` 指令，由引擎自己的 WGSL 预处理器逐变体求值——引擎确实会执行 `#if` 表达式求值，格式错误的表达式会报 `Cannot evaluate #if ...`。本指南中的每个结构体、函数签名与引用注释都来自这段渲染文本，因此指南与随附标头不会漂移。 全文已在 §54 末尾逐字给出。

**给作者的解析器说明。**

- 包侧函数在合并进引擎着色器时会加上 `pack_` 前缀 (避免冲突)；诊断会把它们映射回你的原始名称——与[第八部分](../history/v2.md) §38 所述第二验证阶段的机制相同。
- 未声明标识符消息为 `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`；`_ can only be the target of a phony assignment, as in _ = f();` 与 `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.` 补全了新确认的消息集合。
- 解析器的词法宇宙包含**并非标准 WGSL** 的标识符: `bufferView`、`bufferArrayView`、`bufferLength`、`atomicStoreMax`、`atomicStoreMin`。引擎将它们视为内置，但给定浏览器是否提供并不保证——绝不要基于它们构建分发包。

### 54. 已确认的常量、限制与布局

地形程序的完整资源布局，直接来自生产 Lite 渲染器:

| Binding | 内容 |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms`——`viewProjection` mat4x4f、`view` mat4x4f、`vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms`——`uHeldLightColour` / `uHeldLightPos`、`uSkyLightColour`、`uAmbientLightColour`、**`vFogInfos`**、`vFogColor`、`outputHeight`、`sceneAmbient`、**`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: storage `array<vec4f>`——xyz = 到渲染帧的平移，w = 淡入可见度 |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`、`ambientAndCutoff`、`emissiveAndLevel`、`anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs`——包 uniform (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth`——深度纹理 (§51) |

- **方向光硬上限为四盏。** 场景尝试注册更多时，渲染器会以 `Terrain supports 4 directional lights, not ${n}` 报错。`l.directional` 是实际存在数量的 Lambert 之和 (0–4；Bloxd 自家场景使用 2 盏——[第七部分](../internals/) §27)。地形还会对其无法满足的光源发出警告，原文如下: 延迟加入的光源——`Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`；带色调的光源——`Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`；以及过滤网格的光源——`Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **地形程序命名**: 管线缓存键为 `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}`——包以 `-sp{variant}` 后缀出现，每个 §46 变体对应一个程序。监视器 (`watchPipelineFailures`) 将活动管线名与 `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/` 匹配，并在管线编译失败时重新检查对应的包变体；GPU 设备丢失 (`device.lost`) 会跳过该检查。
- **`BLOXD_TERRAIN_DIRECTIONAL` 是引擎内部宏** (dirLightCount > 0 时定义)。它*不是* prelude 四个宏之一，也永远不会到达包代码——但它会出现在引擎自身着色器的 WGSL dump 中，认得它可以避免混淆。
- **光照等级解码**: `aPackedLightLevels` 顶点属性是一个 f32，打包四个 nibble，各除以 15: rgb = 彩色方块光，a = 天空 / 手持通道。顶点阶段将其解码到 `vLightLevels` varying；`blockLight` 读取 `.rgb`，天空 / 手持通道读取 `.w`。引擎在插值前会把 rgb 通道抬到最亮通道的 35% 下限——这是[第七部分](../internals/) §26 从玩法侧记录的提升在引擎侧的锚点。
- **`vTerrainLambert`** (`directional` 的来源，§49) 由活动方向光求和生成: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`，受 `BLOXD_TERRAIN_DIRECTIONAL` 守卫。
- **索引缓冲在首个大网格处转为 32 位。** Lite 渲染器只在所有索引值 ≤ 65,534 时选用 `Uint16Array` 索引——一旦任何索引达到 65,535，缓冲区就变为 `Uint32Array` (以 `is32Bits` 标志逐缓冲跟踪)。实际影响: 顶点数至多 65,535 的区块网格可用 16 位索引；恰好 65,536 个顶点的网格必然产生 65,535 的索引，并让整个缓冲区切换到 32 位。
- **Manifest 加载细节**: `__MACOSX/` 下的 zip 条目、以 `._` 开头的文件与 `.DS_Store` 会被过滤 (macOS 归档噪声)；`pack.json` 通过小写路径比较定位——零个匹配 → `loadNoManifest`，两个或更多 → `loadDuplicateManifest`；manifest 读取上限为 65,536 字节。
- **以上内容的验证方式**: 生产 bundle 的模块被复原 (165 个 chunk；webpack 注册表在此 bundle 中计得 4,951 个模块——模块数会因是否包含异步子依赖而浮动几个，因此请把确切数字视为该 bundle 专有)，并在 Node.js 下于兼容 webpack 的 harness 中执行。实测的 `HEADER_VERSION` (§53)、渲染出的 5,637 字节标头、变体表的标准顺序与特殊函数映射都来自*运行随附代码*，而不是读取字符串。同一 harness 很适合作为社区 `pack_check` v6 的核心——对包执行引擎自己的验证器可精确复现其判定。
#### v3 引擎头文件全文 (逐字)

钉住的 5,637 字节 (127 行) 文本本身——即上方 §53 所描述的那件材料——从本部所针对的 v3 生产构建 `3ymzdd` 逐字复原。它是[第十一部分](../api/texture-catalog.md) §67 v4 头文件的 v3 对应物,基于同样的理由完整内嵌:让 v3 包能够拿引擎实际前置的确切文本来调试,并让每一处 v3 → v4 差异 ([第十部分](../history/v4.md) §58–§59) 可以从两份文本并排直接读出。

```wgsl

// Engine-provided and read-only, prepended to all packs. apiVersion 3.

// Half a turn and a full turn, in radians.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Per frame: the same for every vertex and fragment of a frame. The functions read bloxdPackInputs, the engine's
// uniforms, which packs can't name. Any function can call them, not only a hook.

// Seconds since the page loaded. In f32, so it counts in steps of under 1 ms for the first 4.5 hours, and of about
// 4 ms from 9 to 18 hours. bloxdSeconds() % period counts from 0 up to period, then starts again.
fn bloxdSeconds() -> f32 {
    return bloxdPackInputs.seconds;
}

// Whole blocks: a render position plus this is a world position. It changes as the player travels, so render positions
// stay close to the player, and so precise.
fn bloxdRenderOffset() -> vec3i {
    return bloxdPackInputs.renderOffset;
}

// The camera's render position.
fn bloxdEyePosition() -> vec3f {
    return bloxdPackInputs.eyePosition;
}

// Unit, towards the sun, in world orientation; zero when the sky has no sun.
fn bloxdSunDirection() -> vec3f {
    return bloxdPackInputs.sunDirection;
}

// A render position's world position. In f32, so it loses fine detail far from the world's origin.
fn bloxdWorldPosition(position: vec3f) -> vec3f {
    return position + vec3f(bloxdRenderOffset());
}

// The world block the face at a fragment's position and normal belongs to, exact anywhere: half a block back inside it.
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i {
    return vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset();
}

// Bits of the hook inputs' blockFlags: what a face's block is and what it's made of. A block made of several materials
// has each, as sandstone is sand and rock, so leaves are vegetation and not dirt. Test one with
// (blockFlags & bloxdBlockFlagRock) != 0.
const bloxdBlockFlagOpaque: u32 = 1;     // Fully opaque, leaves and ice included. Not glass, water, lava, spawners, or ghost and invisible blocks.
const bloxdBlockFlagEmissive: u32 = 2;   // Gives off block light, as neon, portals, lamps, Lava and Beacon do. Glowing ores count, however faint.
const bloxdBlockFlagVegetation: u32 = 4; // Leaves, and the grass on grass blocks, which are dirt too. Not cacti, mushroom blocks or hay.
const bloxdBlockFlagDirt: u32 = 8;       // Dirt and soil, grass blocks included. Rocky Dirt is rock too.
const bloxdBlockFlagSand: u32 = 16;      // Sand, Red Sand, and every sandstone, which is rock too.
const bloxdBlockFlagRock: u32 = 32;      // Stone and its kinds, andesite, diorite, granite, gravel, ores, sandstone, Rocky Dirt, bedrock, obsidian and magma.

struct BloxdVertexIn {
    position: vec3f,     // A render position: world minus bloxdRenderOffset().
    normal: vec3f,
    blockFlags: u32,     // What kind of block this face is: bloxdBlockFlag* bits, the same across the face.
}

struct BloxdVertex {
    position: vec3f,     // A render position.
}

struct BloxdSurfaceIn {
    colour: vec3f,       // Texture * vertex colour (tint * AO).
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // A render position; see bloxdWorldPosition and bloxdFaceBlock.
    blockFlags: u32,     // As in BloxdVertexIn.
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // Added after lighting, then fogged.
}

struct BloxdLightIn {
    litColour: vec3f,    // The engine's lit result for this fragment, from the surface hook's colour: before emission and fog.
    directional: f32,    // Summed Lambert from the scene's directional lights (0 when off).
    ambient: vec3f,      // Ambient light, added to directional.
    blockLight: vec3f,   // Voxel block light, tone-mapped; 0 without BLOXD_LIGHTING.
    skyLight: f32,       // Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING.
    ambientLightColour: vec3f, // White without BLOXD_LIGHTING.
    skyLightColour: vec3f,     // White without BLOXD_LIGHTING.
    heldLight: vec3f,    // Held light here, tone-mapped like blockLight, before the ambient boost; 0 out of reach
                         // or without BLOXD_LIGHTING.
    fogColour: vec3f,    // The game's fog colour. Bloxd's games always have fog, pushed far out when the player
                         // turns it off; black only in a scene with no fog at all.
    fogVisibility: f32,  // 1 = no fog, 0 = fully fogged.
    position: vec3f,     // As in BloxdSurfaceIn.
    normal: vec3f,
    blockFlags: u32,     // As in BloxdVertexIn.
}

struct BloxdLight {
    colour: vec3f,
}

// Returned by bloxdOpaqueBehind(), which surface and light hooks may call where BLOXD_SCENE_DEPTH is defined.
struct BloxdOpaqueBehind {
    found: bool,         // False where nothing opaque is behind (sky).
    position: vec3f,     // A render position; meaningless when !found.
    distance: f32,       // From the eye; meaningless when !found.
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

// Fogs colour as the engine fogs this fragment.
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(light.fogColour, colour, light.fogVisibility);
}

fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return BloxdLight(bloxdApplyFog(light.litColour + surface.emission, light));
}
```

---

调查：ltf_ahel (使用 glm 调查)

---


## 第十部分: API Version 4 迁移指南 (2026-10-26, 摘要)

> **已于 2026-11-03 被取代: 现行 API 为版本 5** —— v4 包在加载时被拒绝，方式与本文对 v3 的描述完全相同。请先应用本部分，*再*应用 [第十二部分](../history/v5.md)（v4 → v5：`BloxdFlags` 结构体取代 `blockFlags`、`bloxdLit()` 与公开的光照配方、附魔/覆盖输入、9 钩子默认包）。本部分的内部细节（§56–§66）对其测量时所基于的 v4 构建仍然准确。

> 本文是该语言的简短摘要。包含全部细节、示例配方与复原的引擎内部实现 (§55–§66) 的完整版位于[英文版](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md)与[日文版](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md)。

目标构建: `cnty9.main.669f8081.js` —— **自 2026-10-26 起同时在生产与预发布环境上线** (两者逐字节一致)。包模型保持形态: 相同的 `pack.json` 字段、相同的加载器限制、相同的 64 B uniform、相同的 6 个钩子。

已在 `tcwczu.main.357faec1.js`(2026-10-30,正式服与 preprod 再次逐字节一致)上复核:**v4 API 全貌无变化** — 引擎头、默认 pack 模板、27 个 `bloxdSp*` 符号、加载器限制和 12 个 allow 标题都与本文档的 `cnty9` 基准逐字节一致。捆绑包布局又有调整(如管线簇移至 c51–c56),但对 pack 完全不可见;纹理名称注册表未重新测量(名称仍是稳定的 API)。

### 变更内容

- `pack.json` 要求 `"apiVersion": 4` (严格 `===`，数字) —— v3 包在加载时被拒绝。
- **全新纹理 API (本次亮点):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` 以与引擎本身完全相同的方式采样方块纹理图集 (id 0 = 白色；动画纹理自动返回当前帧)，`bloxdTextureSize(mipLevel) -> vec2u`，以及命名常量 `bloxdTextureId*` (由文件名转 CamelCase，如 `grass_top` → `bloxdTextureIdGrassTop`；全部 905 个可用名称的完整名录已作为 §68 嵌入第十一部分 (`11-reference.md`))。
- `BloxdSurfaceIn` *与* `BloxdLightIn` 新增 **4 个输入字段**: `textureId`、`textureRotation` (顺时针四分之一转，由 `bloxdTexel` 应用)、`uv` (以方块为单位；绘制 `fract(uv)`)、`mipLevel`。
- **伴随含义变化的改名:** `fogVisibility` → `fogAlpha`，含义**反转** (`0 = 无雾，1 = 仅有 fogColour`；移植: `l.fogVisibility` → `1.0 - l.fogAlpha`)；`bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (函数体一致)；`BloxdOpaqueBehind.found` → `hit`。
- **严格游戏现在由内置验证器强制执行:** 未加保护的顶点钩子或可达的 `discard` 会报 `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...`，并在严格游戏中禁用**全部**钩子。使用 `#ifndef BLOXD_STRICT` 包裹后 surface/light 仍可运行。
- 其余全部冻结: 6 个钩子、`blockFlags` 位 (1/2/4/8/16/32)、uniform 布局、加载器限制、变体矩阵、12 个 allow 标题 (2026-10-27 在 `cnty9` 上复确认不变)。

### 快速迁移

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (数字) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` 或 `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| 未保护的顶点钩子 | `#ifndef BLOXD_STRICT ... #endif` |

完整参考材料现在已是本指南的一部分：完整复原的引擎头文件与含全部 905 个可用名称的完整纹理目录见第十一部分 (`11-reference.md`)。完整细节 —— `bloxdTexel` 的旋转细节、复原的采样 WGSL、名称注册表、带注册表哈希的新 `HEADER_VERSION` 结构 —— 见英文与日文完整版。



---

### 67. 完整的 v4 引擎头文件（逐字）

引擎在每个包前拼接的 6,021 字节（150 行）头文件 —— 首行为 `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.` 不包含：按渲染器配置生成的 `bloxdTexel`/`bloxdTextureSize` 函数对（§63.1）与 27 个 `bloxdSp*` 符号（§63.4）。`#ifdef BLOXD_ALPHA` 门由引擎预处理器按变体解析。


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

---


## 第十二部分：API 版本 5 迁移指南（2026-11-03，摘要）

> 本文是该语言的简短摘要。包含全部细节、示例配方、完整复原的 v5 头文件以及引擎内部实现的完整版本位于[英文版](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/12-apiv5.md)和[日文版](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/12-apiv5.md)。

目标构建：`ab90qa.main.6188124c.js` — **自 2026-11-03 测量起同时在生产与 preprod 环境上线**，两个捆绑包逐字节一致（md5 已验证）。这是 v3 以来最大的 API 修订：引擎头文件从 6,021 增长到 **8,954 解码字节**，几乎所有结构体都新增了字段。

### 变更内容

- `pack.json` 要求 `"apiVersion": 5`（严格 `===`，数字）— v4 包在加载时被拒绝；已存储的 v4 包静默失效。
- **`blockFlags` 被结构体取代（核心变更）：** 六个位常量 `bloxdBlockFlag*` 消失，取而代之的是 **`flags: BloxdFlags`** — 14 个命名的 bool 字段（六个是旧位的新名称，八个是新增）：**`slab` `stairs` `flat` `placed` `held` `dropped` `thrown` `lifeform`**。模型、手持物品和生物现在可以与地形区分。
- **`#ifdef BLOXD_LIGHTING` 被移除：** 编译期开关改为用新头文件函数 **`bloxdLit()`** 做运行时判断；uniform 新增 `lit: u32`（偏移 4，总大小仍为 64 B）。变体矩阵从 8 缩减为 6（`strict|allow` × `terrain|liquid|model`）。
- **引擎的光照配方公开：** 三个新函数 — **`bloxdShading(light)`**、**`bloxdWorldLight(light)`**、**`bloxdLitColour(surface, light)`** — 以及 `BloxdLightIn` 的两个新输入（`diffuse`、`emissive`）。
- **新输入：** 所有输入结构体都有 `localPosition: vec3f`（模型坐标，地形上为 0）；Surface/Light 上有 `enchantTier` / `enchantColour` / `enchantSpeed` / `overlayColour`（附魔与受击闪光）；`BloxdSurface` 上有**新输出** `enchantColour` / `overlayColour`，由 `bloxdLitColour` 混合。
- **已移除：** `bloxdFragmentBlockPosition()`（无替代）、`bloxdBlockFlag*` 常量、`bloxdSpLitColour`。
- **默认包模板现在包含全部 9 个钩子**（包括 light 钩子，1,122 → 1,683 字节），新注释说明了删除模型：*"If you delete a hook, the default is used instead."*
- 头文件新增常量：`const bloxdChunkSize: i32 = 32;`。Y 导数自动取反：`dpdy`/`dpdyCoarse`/`dpdyFine` 被改写为 `(-dpdy(...))`。`HEADER_VERSION` 升级为 `9.<hash>.<hash>`。
- `bloxdSp*` 命名空间从 27 增长到 **46 个符号**；纹理名注册表现为 **896 个可用名称**（+1 `scorpion_eggs`，−10 — 包括 `chest_double_*` 家族与 `mob_spawner_*_block_side`）— 名称是 API，id 只是快照。
- 其余全部冻结：加载器限制（256 个 `.wgsl` / 256 KB / 64 KB / 32 MB / 1,024 条目）、钩子名称、strict 契约（12 个 allow 标题）、group-3 绑定。

### 迁移速览

| v4 | v5 |
|---|---|
| `"apiVersion": 4` | `"apiVersion": 5`（数字） |
| `(s.blockFlags & bloxdBlockFlagVegetation) != 0u` | `s.flags.vegetation` |
| `#ifdef BLOXD_LIGHTING … #endif` | `if (bloxdLit()) { … } else { return bloxdDefaultLight(s, l); }` |
| `bloxdFragmentBlockPosition(p, n)` | 已移除 — 使用 `bloxdWorldPosition()` / `flags` |
|（原先没有） | `s.flags.held`、`s.flags.lifeform`、`s.localPosition`、`s.enchantTier` … |

完整复原的 v5 引擎头文件（8,954 字节，逐字）与纹理名漂移的完整清单位于英文和日文完整版（§82 与 §80）。

---

## Guides

"Mechanism and mindset" material. Goal-oriented code examples live in [Recipes](../recipes/).

### Map

| Page | Contents |
|---|---|
| [How lighting works](lighting.md) | what the engine's default lighting does, and how far you can rebuild it |
| [Shadows](shadows.md) | skyLight as a voxel shadow map; the lift inversion |
| [Water](water.md) | the integrated water recipe and the 3-layer underwater reality |
| [Night](night.md) | the "dark shadows but bright surfaces" problem |
| [Models](models.md) | what the v5 Model program draws and reads |
| [Realism](realism.md) | the additive and full-re-lighting schools |
| [Unreachable effects](constraints.md) | v5's ceilings, plus what v5 newly unlocked |
| [Performance](performance.md) | cost table and practical guidance |
| [Testing](testing.md) | the pre-release checklist |
| [Combinations](combinations.md) | pairing with texture packs |
| [Debugging tips](debugging.md) | symptom → cause diagnostics |

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03)

---

## 引擎默认光照与写实余地



引擎默认光照只有「乘法」，不存在高光、菲涅尔、暖冷分离、半球环境光。以下为可重建范围：

| 功能 | 默认 | 包可否实现? |
|---|---|---|
| 漫反射 (Lambert) | 仅方向光标量总和 | ◎ 用 `bloxdSunDirection()` 自行实现 (包裹光源等) |
| 高光 (镜面反射) | 皆无 | ◎ Blinn-Phong (R9.2) |
| 菲涅尔 | 皆无 | ◎ Schlick 近似 (R9.3) |
| 暖色火把 / 冷色空光分离 | 无色 | ◎ (R9.1) |
| 半球环境光 | 无方向 | ◎ 上=天空色 / 下=地面反弹 (R9.4) |
| 色调映射 | 无 (仅 clamp) | ◎ ACES 胶片化 (R9.5) |
| 大气透视 | 仅雾 (颜色替换) | ◎ 距离去饱和 (R9.6) |
| 表面细节 | 仅纹理解析度 | △ 哈希噪声程序化微凹凸 (R9.8) |
| 顶点波 (水面) | 皆无 (平面) | ◎ 仅 allow (R7) |
| 波法线 / 太阳闪光 | 皆无 | ◎ (R9.7) |
| 夜晚月光处理 | 仅空色变暗 | △ 月亮方向在 `-bloxdSunDirection()`：拟似表现 (R2 蓝色环境光 / R9.11) 加方向性月光 (R-A，仅昼夜循环) |
| 阴影 (天空遮蔽) | 仅 `mix(环境色, 空色, skyLight)` 轻混 | ◎ 提升逆变换 + 阈值切割 + 太阳门控 (R9.12)。树荫、屋檐下明确压暗，方块编辑实时跟随 |

---

## Shadows

> Target API: 5 · Target build: `ab90qa` · Status: Verified (LightEngine behavior unchanged since v4 measurement)

The three ways to make "shadows" in a shader pack, and their limits.

### Can / cannot

| Effect | Possible? | How |
|---|---|---|
| Clearly darken under trees/roofs (projected-style) | ◎ | `skyLight` lift inversion + threshold cut (below) |
| Shadows follow block edits in real time | ◎ | LightEngine recalculates immediately — automatic |
| Color shadows cool / sunlit warm | ◎ | two-color shift |
| Shadows rotating with the sun (shadow map) | ✕ | depth is liquid-only; light-ray occlusion is not an input |
| Physical penumbra | ✕ | capped by voxel-resolution BFS spread |
| Real-time AO (SSAO) | ✕ | only the AO baked into vertex colors |

### skyLight is a voxel shadow map

`l.skyLight` is not just a brightness parameter. The mesher's LightEngine computes Minecraft-style **"can this position see the sky" voxel occlusion data — a shadow map**:

1. **Column scan**: each (x,z) column top-down; sky light starts at 15, hits 0 at opaque blocks, attenuates by `lightFilter` (air 1 / water 3 / opaque 15)
2. **BFS flood fill**: spreads horizontally to 6 neighbors (-1 per block) — this softens shadow edges. Under an occluder of radius r the raw value is (15-r)/15
3. blockLight (torches) is a separate RGB 3-channel (4-bit packed) BFS

Under trees, roofs and inside buildings the value is already low and interpolates smoothly per-vertex. Placing or breaking a block recalculates immediately — **real-time-following shadows**.

### The lift-curve trap

`l.skyLight` arrives **post-lift-curve** (`y = 1-(1-x/(3-2x))³`, an S-curve that lifts dark values):

| Place | Raw voxel | Lifted (= l.skyLight) | pow(·, 5.0) |
|---|---|---|---|
| open sky | 1.00 | 1.00 | 1.00 |
| under tree (radius 2) | 0.87 | **0.97** | **0.86** ← nearly kept |
| radius 3 | 0.80 | **0.92** | 0.66 |
| radius 5 | 0.67 | 0.78 | 0.29 |

**This is the proven root cause of "gamma doesn't darken shadows"** — even γ=5 only takes under-tree 0.97 down to 0.86.

### The fix: lift inversion + threshold cut

The curve is monotonic and inverts exactly: `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Restore the raw value, then binarize with a **`smoothstep` threshold**. LightEngine's BFS spread is "-1 per adjacent block", so `th = 1 - r/15` is directly the "occlusion radius counted as shadow" dial.

The complete implementation (sun gating + warm/cool split + blockLight passthrough) is in [realism recipes](../recipes/realism.md). Key steps:

```wgsl
// 1. restore the raw value (skipping this means shadows never appear)
let skyRaw = sh_unlift(l.skyLight);
// 2. threshold-cut — sunlit 1 / shadow 0
let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
// the essence of projection: direct sun only reaches places that see the sky
let lit = sunL * sky;
```

Dials: **area** = `shTh` (0.93→radius 1.5 / 0.87→2 / 0.80→3 / 0.67→5); **edge softness** = `shSoft`; **core darkness** = the minimum ambient and sky-scatter two-point shift; long evening shadows ≈ `thEff = shTh + 0.10 * (1 - clamp(sunDir.y, 0.0, 1.0))`.

### Honest limits

- Shadows reference the **upward sky**, so they **do not rotate with the sun** (voxel resolution; soft edges come from BFS spread)
- The engine's lighting template retains an unused `var shadow: f32 = 1.;` (always 1.0 = disabled) — a plausible "future plans" trace for pixel-accurate rotating shadows
- Pixel-accurate rotating shadows are outside the current API ([Unreachable effects](constraints.md))

### Related

- [realism recipes](../recipes/realism.md) (the full projected-shadow recipe) · [Lighting Internals](../internals/lighting-internals.md) · [Debugging tips](debugging.md)

---

## 让水自然的水体统合配方



本 API 采样不到场景色，因此**是以菲涅尔风颜色混合与太阳高光的拟似表现，而非真实的反射/折射** (水深计算在 v2 中经 `bloxdOpaqueBehind()` 已可能实现，分离至[第八部分](../history/v2.md) R-E)。下例保留基色，掠角混入近空色，仅有太阳时加小闪光。

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
    if (bloxdLit()) {
        let worldPos = bloxdWorldPosition(l.position);
        let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
        let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdSeconds()), topness));
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let halfDir = normalize(viewDir + sunDir);
            let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
            out.colour += vec3f(1.0, 0.97, 0.90) * glint;
        }
}
    return out;
}
```

调整参考：

- 水发白/过亮：调低 `fresnel * 0.38` 的 `0.38` 与闪光的 `0.55`。
- 水过浓：稍调高 `fakeSkyReflection` 混合比。但过高会像塑料。
- 水面出现线条或规则条纹：调低波频率与闪光强度。本代码没有水面网格顶点位移。
- 想要真实映景：本 API 输入没有屏幕色，只混色成不了真反射 (深度为液体限定可取。[第八部分](../history/v2.md) R-E)。

该配方**替换**既有 `bloxdLiquidLight`。勿与 R9.7 同名波法线函数或其他同名钩子重复粘贴。


### 水中与着色器包的实情



水中的外观由 3 层构成：

| 层 | 内容 | 包可否操作? |
|---|---|---|
| ① 地形/液体绘制 | 钩子可加工。light 钩子在水下也照常调用 | 可 (在幕之下生效) |
| ② 液体定义色幕 | 相机所在液体方块定义 color/alpha 的 emissive 全屏 quad，绘制在最前面。游戏设置 `cameraTint` 有则优先 | 不可 (颜色浓度都改不了) |
| ③ cameraTint | 游戏设置 | 不可 |

实用要点：包在水下也继续工作 / 幕去不掉 / 水下不可分支 (fogStart / fogEnd / fogColour 在水下不变，fogVisibility 也检测不到)。

---

## 修复夜间「影黑了面却亮」



只压暗阴影，太阳缺席时引擎完成色 (`engineColour`) 依然偏亮，面影落差会显得不自然。应对完成色整体施加衰减。

下例以 `bloxdSunDirection()` 为零判夜、有方向判昼，对夜间地形完成色衰减。`blockLight` 与 `heldLight` 强处减弱衰减，尽量保留火把等近光。`0.52` 为可调值，想更暗请调小。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    if (bloxdLit()) {
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
        let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
        let protectLocalLight = smoothstep(0.03, 0.35, localLight);
        scale = mix(nightDim, 1.0, protectLocalLight);
}
    // 完成色衰减，材质 emission 按默认经雾叠加
    out.colour = l.engineColour * scale + s.emission * (1.0 - l.fogAlpha);
    return out;
}
```

**该处理的局限：** 若 `bloxdSunDirection()` 为「有太阳=单位方向、无=零」二值，可分昼夜但无法连续推定黄昏薄明。且因衰减完成色，会把引擎昼光与环境光一并削弱，并非完整的时间带再现。液体同样处理时请确认液体钩子的回退关系。

---

## Models and textures

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Analyzed (restored from header & validator)

What the new v5 Model hooks draw and read.

### What the Model program draws

- **Block models**: half blocks (`slab`), stairs (`stairs`), crossed-plane plants — tall grass, flowers, crops, cobwebs (`flat`)
- **Items**: held (`held`), dropped (`dropped`), thrown (`thrown` — snowballs, arrows, rockets)
- **Entities**: players, mobs, NPCs (`lifeform`) — **including armour and cosmetics**

Terrain (full blocks) and Liquid (water) never enter this program.

### What reads differently

Model faces carry three things terrain faces never have:

| Information | Field | Value on terrain |
|---|---|---|
| model-local coordinates | `localPosition: vec3f` | `vec3f(0.0)` (no model) |
| enchant state | `enchantTier` / `enchantColour` / `enchantSpeed` | all 0 |
| entity overlay | `overlayColour` | 0 |

And **textures mean something different**: terrain faces carry atlas `textureId`s, but **most models use `textureId: 0`** ("no texture") — player skins and mob textures are not in the atlas namespace. `surface.colour` already contains skin × tint, so work from it ([model-owned textures](../api/texture-api.md#model-owned-textures-textureid-0)).

`flags`'s `held` / `dropped` / `thrown` / `lifeform` / `placed` are meaningful only on model faces ([Flags](../api/flags.md)).

### localPosition

The model-instance-local position **before** world placement; `vec3f(0.0)` for terrain/liquid.

- For a player's arm, a held sword or windmill blades it rotates with the model
- **Keyed per-part animation and bending effects** become a one-field write — "how far up the blade am I" is directly `localPosition.y`
- In light structs it is the **post-vertex-hook** value (header: *"the same as in BloxdVertexIn, after the vertex hook"*)

### Selection patterns

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;   // lift world entities, exclude the hand
    }
    if (surface.flags.held) {
        out.colour *= 1.15;   // brighten the local player's held items
    }
    return out;
}
```

Full examples: [model shader recipes](../recipes/model-shaders.md) and [enchant effects](../recipes/enchant-effects.md).

### Terrain / Liquid / Model cheat sheet

| Want to affect | Hooks | Selection fields |
|---|---|---|
| full-block look | `bloxdTerrain*` | material flags (`opaque` / `rock`…) |
| water | `bloxdLiquid*` | always Liquid (no Liquid hooks = water untouched) |
| plants, slabs, stairs | `bloxdModel*` | `flags.flat` / `slab` / `stairs` |
| held items | `bloxdModel*` | `flags.held` |
| dropped items | `bloxdModel*` | `flags.dropped` |
| thrown items | `bloxdModel*` | `flags.thrown` |
| players & mobs | `bloxdModel*` | `flags.lifeform` |

### Lighting

`bloxdModelLight` takes the same `BloxdSurface` / `BloxdLightIn` and works with `bloxdDefaultLight` / `bloxdLitColour()`. The enchant glint (`enchantColour`) and hurt flash (`overlayColour`) mix inside `bloxdLitColour`, so **defaults preserve both looks automatically**; to control them see [enchant effects](../recipes/enchant-effects.md).

### Internals

How models render and how flags/enchant inputs flow: [Engine Internals: Model Rendering](../internals/model-rendering.md); generated symbols like `bloxdSpItemLocalPosition` and `bloxdSpEnchant` are listed in [restrictions](../api/restrictions.md).

---

## 写实化的实现流派 —— 两种



**流派 A：加算修正 (defaultLight 起点)** —— 以 `engineColour` (完成色) 为底，叠加暖色辉光或轮廓光。轻便安全，但光照模型仍是默认。

**流派 B：完全重光照 (s.colour 起点)** —— 丢弃 `l.engineColour`，从 `s.colour` (反照率) 与 LightIn 原生素材重组光照。写实化的正统。遵守 4 点：

1. **重打雾**：light 钩子在雾之后调用，请自行施加 `mix(l.fogColour, col, (1.0 - l.fogAlpha))` (R9.10)。雾太浓时用 `min(l.fogAlpha, 0.70)` 设下限。反之在 engineColour 起点的包上再混雾色会导致双重雾发白
2. **无光照变体回退**：`#ifdef BLOXD_LIGHTING` 之外直接返回 `defaultLight`
3. **共用函数整体守卫**：以 `BloxdLightIn` 为参数的共用函数须整个 fn 用 `#ifdef BLOXD_LIGHTING` 包裹 (仅守卫调用处不够)
4. **无太阳方向时**：`bloxdSunDirection()` 为零则不计算方向性高光。`l.directional` 是光量标量而非方向向量，无法恢复高光方向。必要时切换为无方向弱环境光。月亮方向经 `-bloxdSunDirection()` 可得 (只在昼夜循环世界移动。第七部 R-A)

---

## 达不到的表现 (写实化的「天花板」)



| 表现 | 原因 |
|---|---|
| 阴影贴图 (随太阳旋转的影、半影) | 深度纹理不可引用 (液体限定的 `bloxdOpaqueBehind()` 仅为几何信息，不能用作阴影贴图)。光线遮蔽判定也不输入钩子 |
| SSAO | 无法访问场景深度 (仅网格烘焙的顶点 AO。液体限定的深度不能用于 SSAO) |
| SSR (反射) | 场景色取不到。仅以菲涅尔混空色的拟似 |
| 泛光 / 眩光 | 无挂钩后处理的钩子 |
| 景深、色散、颗粒 | 需要全屏后处理 |
| 体积光 (上帝光) | 同上 |
| PBR 纹理 | 纹理采样禁止。仅从颜色亮度拟似推定 |
| 水下折射 | 场景色取不到。液体限定的深度 (`bloxdOpaqueBehind()`) 可做厚度吸收与底面投影 ([第八部分](../history/v2.md) R-E) |
| 水下幕 (蓝色) 去除与变更 | 幕为「相机所在液体方块定义 color/alpha」生成的 emissive 全屏 quad，在钩子管线之外 (最前面) 绘制，包改不了颜色也改不了浓度 |
| 水下直接检测 | 无表示相机入水的字段，水下 fogStart / fogEnd / fogColour 不变，因此也没有从 fogVisibility 等推定的可靠方法 |

### 阴影的真相 —— 「树影」做得出来

上表中不可能的只是**随太阳旋转的像素级阴影贴图**。引擎从一开始就在算「影」，那就是 `skyLight`。网格侧 LightEngine 运行类 Minecraft 算法：

1. **纵列扫描**：每 (x,z) 列自上而下扫描。天空来光从 15 开始，**不透明方块处归 0**，以降按 `lightFilter` (空气 1 / 水 3 / 不透明 15) 衰减下降
2. **BFS 泛洪**：向 6 邻横向扩散 (每格 -1) —— 这正是影缘变软的正体。半径 r 遮蔽物下的原始值为 (15-r)/15
3. blockLight (火把等) 为 RGB 3 通道 (4bit 打包) 的另一路 BFS

于是 `l.skyLight` 不是单纯的亮度参数，而是**「该处能否看见天空」的体素分辨率遮蔽数据 = 阴影贴图**。树下、屋檐下、室内数值本已偏低，经顶点插值平滑到达。放置/破坏方块即刻重算 = **实时跟随的阴影**。原版仅以 `mix(环境色, 空色, skyLight)` 「轻混」使用。

正确的工具是 R9.12 的两步 (**提升逆变换恢复原始值 → 阈值 `smoothstep` 二值化**。`th = 1 - r/15` 直接拨定「视为阴影的遮蔽半径」) 加上**太阳直射光以 sky 门控** (太阳只到达看得见天空之处 = 投影的正体)，再以向阳=暖色 / 阴影=冷色染色构成。

**如实声明限制**：该阴影以「上方天空」为基准，**不随太阳移动旋转**。分辨率为方块级 (柔边来自 BFS 扩散)。引擎光照模板仍残留闭合的 `var shadow: f32 = 1.;` 阴影贴图桩 (恒为 1.0 = 无效)，可解读为「计划中的像素级旋转阴影」痕迹。若非要像素级旋转阴影，只剩 API 之外路线 (如 userscript GLSL 注入，有规则风险)。

### 水中的正体

水中的外观由 3 层构成：

| 层 | 内容 | 包可否操作? |
|---|---|---|
| ① 地形/液体绘制 | 钩子可加工。light 钩子在水下也照常调用 | 可 (在幕之下生效) |
| ② 液体定义色幕 | 相机所在液体方块定义 color/alpha 的 emissive 全屏 quad，绘制在最前面。游戏设置 `cameraTint` 有则优先 | 不可 (颜色浓度都改不了) |
| ③ cameraTint | 游戏设置 | 不可 |

实用要点：包在水下也继续工作 / 幕去不掉 / 水下不可分支 (fogStart / fogEnd / fogColour 在水下不变，fogVisibility 也检测不到)。

---

## Performance-aware implementation

> Target API: 5 · Target build: `ab90qa` · Status: Verified (measurement-based practice)

Pack hooks run on every fragment (all pixels of terrain / liquid / model), so style choices move frame rate significantly.

### First facts

- **The light hook is the final stage**: it runs for every drawn pixel of terrain, liquid and model — most of the screen
- **Packs run on WebGPU**: evaluate cost assuming a range of GPUs including mobile
- The loader's size cap (256 KB of `.wgsl`) is also a practical **compile-time** ceiling

### Cost ladder (cheap → expensive)

| Operation | Cost | Note |
|---|---|---|
| `mix` / `clamp` / arithmetic | ◎ minimal | |
| input reads (`l.skyLight`…) | ◎ | uniform/vertex-attribute sourced |
| `smoothstep` / `pow` | ○ | `pow` varies by exponent |
| `sin` / `cos` | ○ | animation staple |
| `dot` / `normalize` | ○ | |
| `bloxdTexel()` (texture sample) | △ | cheaper at higher mips |
| `dpdx` / `dpdy` / `fwidth` | △ | surface/light hooks only |
| branching (`if`) | △ | WGSL may evaluate both sides; uniform-ish conditions (flag checks) are cheap |
| hash noise (many `sin`/`fract`) | △ | gate micro-bump effects by distance |

### Practice

1. **Gate effects to the faces that need them** — `flags` selection beats "+20% everywhere"
2. **Drop detail with distance** — early-out when `distance(surface.position, bloxdEyePosition())` exceeds a threshold
3. **Use mips** — `bloxdTexel(id, uv, mipLevel + 1.0)` is a ¼-resolution average ([worked examples](../api/texture-api.md#worked-examples))
4. **Prefer surface hooks for color tweaks** — the light hook is the all-pixels final stage
5. **Add detail incrementally and compare FPS** ([testing](testing.md))
6. **`#ifdef` guards don't save runtime** — variants are compile units; runtime savings come from flags and distance

### Measuring

- Compare FPS with/without the pack via browser devtools (performance panel / WebGPU stats)
- Measure terrain-heavy scenes (shadow-rich forest) and water (liquid hooks) separately
- Check mobile hardware — it can be tens of times slower

### Related

- [Testing](testing.md) · [Rendering Pipeline](../internals/rendering-pipeline.md) · [Texture API](../api/texture-api.md)

---

## 实机测试清单



编译成功与「好看」是两回事。请按顺序确认：

1. **加载：** `pack.json` 位于 ZIP 根目录。选中后立即显示 `Ready. Reload the page to use it.`，包在**页面重新加载后**激活；随后确认 `Ready to use`。已保存的包会在下次页面加载时自动重验证：每当引擎侧规格标头更新时，都会对标头内容做指纹检查 (通过 = 原样保留 / 失败 = 显示为已阻止)，损坏的旧包绝不会静默保持激活。
2. **8 变体：** strict / allow、光照开 / 关、地形 / 液体各条件无类型守卫遗漏。即使游戏只用部分条件，分发包也要按 8 种设想。
3. **白天：** 草、石、沙、木等材质颜色无溢出，顶面与侧面明暗过渡自然。
4. **夜晚：** 对比曾受光处的同材质、阴影、火把附近。仅受光面残亮则调曝光衰减，整体过暗则调局部光保护。
5. **水：** 俯视、掠角、岸边、水下、夜晚分别查看。alpha 行为与水下观感依赖游戏合成方式，勿凭单一视角判断。水下液体定义色幕按[第七部分](../internals/)所述罩在前面，包的差异主要看水面与幕透出的地形。
6. **边界与远景：** 区块/原点切换处波形花纹无跳变，远景无双重雾与白色霾。
7. **性能：** 逐片元哈希/三角/`pow` 重效果取最小。逐步加细节并对比 FPS。

### 已知约束为前提

- 包限于地形/液体钩子，同一代码不处理天空、实体与 UI。
- 无添加阴影贴图、屏幕空间反射、折射、泛光等的输入 (场景深度为液体限定以 `bloxdOpaqueBehind()` 解禁。见[第八部分](../history/v2.md))。
- `bloxdSeconds()` 为动画时间，不保证关联游戏内昼夜。
- `bloxdSunDirection()` 为零则真月亮方向未知，是氛围近似而非「月光物理」。方向性月光经 `-bloxdSunDirection()` 制作 (仅昼夜循环世界。第七部 R-A)。
- `s.position` / `l.position` 为局部坐标，世界相关效果请加 `bloxdRenderOffset()`。方块内局部花纹则有意用局部坐标。

---

## 着色器到极限时的组合



着色器包不能添加或采样纹理，材质细微凹凸与天空图像不要只靠着色器解决。Bloxd.io 公开纹理包仓库 [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) 以另一方式处理纹理、天空盒、模型等。

参考：社区流传的「cinematic shader」发行物经分析实为纹理包 (128x128 纹理，不含 `pack.json` / `.wgsl`)。

现实做法是，**光照与颜色用着色器调，材质与天空用配套资源包补**。但并用可行性与加载顺序请按游戏实现与设置确认。

纹理包有独立规格 (供参考)：大小上限为 25MB，按 base64 编码后 JSON 字符串的长度计算；PNG 经 base64 编码膨胀 +33%，因此原始图片的实际上限约为 18–19MB。CSS 由简单正则解析器处理——避免嵌套与注释。

---

## 调试技巧



- 洞穴过亮 → `skyLight` 非线性曲线不足 (R2 洞穴配方 / R9.9)
- 白天过曝 → 降低 ACES 前曝光
- 夜晚黑到看不见 → 确保最低环境光 (夜晚 `skyLightColour` 按前提近乎全黑)
- 远景霾太重 → 调低大气系数
- 火把周围一片橙 → 调低暖色混合比 (保留部分原始染色光)
- 方块几乎全白 → light 钩子输出合计超 1.0 (下游无 clamp)。末尾加 `clamp(col, vec3f(0.0), vec3f(1.0))`
- 无叠加却发白 → fogVisibility 除法 un-fog 逆算所致。去掉 un-fog，改从 `s.colour` 起重建、雾最后一次性 `mix`
- 发光方块不亮 → 重建系漏加 emission。补 `+ s.emission * (1.0 - l.fogAlpha)`
- 夜晚只剩受光面偏亮 → 别只压暗阴影，对完成色 (`engineColour`) 整体施加夜间衰减。保留局部灯光时用 `blockLight` / `heldLight` 减弱衰减 ([第六部分](../guides/) 19 节)
- `pow(skyLight, γ)` 怎么也压不黑影 → `l.skyLight` 为提升后之值 (第 10 章)。切换 R9.12 逆变换 + 阈值切割
- 想调阴影面积/浓度 → 看 R9.12 调整指南 (面积=阈值 `shTh` / 边缘=`shSoft` / 影芯暗度=最低环境光与天空散射光的两点偏移)

---

## Recipes

Goal-oriented code examples. The "how it works" side lives in [Guides](../guides/). Everything here is ported to v5 vocabulary (`flags` / `bloxdLit()` / `fogAlpha` / `bloxdSeconds()`) and guarded to pass the 6 variants (strict × terrain / liquid / model).

### Map

| Page | Contents |
|---|---|
| [Color recipes](colors.md) | tint, saturation, color temperature, sepia, altitude gradients |
| [Lighting recipes](lighting.md) | S-curves, custom fog, night, caves, sunset |
| [Emission recipes](emission.md) | pulsing lights, glowing ores, fireflies |
| [Coordinate recipes](coordinates.md) | world/block coords, checkers, hashes, view vectors |
| [Animation recipes](animation.md) | day cycles, wobble, aurora |
| [Liquid recipes](liquids.md) | ripples, alpha, underwater murk |
| [Vertex recipes (allow only)](vertices.md) | grass sway, waves, pulsing terrain |
| [Math toolbox](math.md) | smoothstep, triangle waves, luma |
| [Realism recipes](realism.md) | warm×cool, specular, ACES, projected shadows |
| [Model shaders](model-shaders.md) | v5 — held items, skins, plant sway |
| [Enchant effects](enchant-effects.md) | v5 — removing, boosting, recoloring the glint |

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Verified (v5 ports of the original recipes — still verify with in-game compilation before distributing)

---

## 颜色配方 (surface)



### 单色 tint (最基础)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 饱和度提升 / 去饱和

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 变鲜艳 / -1.0 全单色
```

### 色温 (暖色 ⇄ 冷色)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = 暖 (偏红), -1.0 = 冷 (偏蓝)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### 复古 / 棕褐

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### 高度渐变 (低地偏暖)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 高度 0..50 对应 1..0
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 按面朝向分涂 (朝上=亮、墙=暗)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // 地面 1 / 墙 0 / 顶 -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // 墙与顶稍暗
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 色调分离 (减色数)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

---

## 光照配方 (light)



### 对比 S 曲线

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### 距离霾 (自制雾)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 64~192 格叠加 0..0.35 的自制雾
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### 夜晚 (skyLight 驱动偏蓝 + 灯光保护)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
}
    return out;
}
```

### 洞穴压黑 (无 skyLight 处更暗)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        out.colour *= mix(1.0, 0.35, underground * underground);
}
    return out;
}
```

> `skyLight` 为提升后之值 (第 10 章)，浅遮蔽 (树下：原始 0.87 → 提升后 0.97) 用此法几乎压不暗。对洞穴 (原始 0) 有效。「树荫」要明显请用 R9.12 的提升逆变换 + 阈值法。

### 夜晚蓝色环境光 (无月亮方向的拟似表现)

> 本 API 中无太阳的天空 `bloxdSunDirection()` 为零。这不是方向性月光，只是天空暗时极弱的蓝色环境光。月亮方向本身经 `-bloxdSunDirection()` 可得 (仅昼夜循环世界。第七部 R-A)。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let upward = clamp(l.normal.y, 0.0, 1.0);
        out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
}
    return out;
}
```

### 黄昏暖化 (随太阳高度偏色)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 地平线 1 / 正上方 0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### 引擎输出完全替换 (最简单的重光照)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    if (bloxdLit()) {
        // ※ BloxdLight(...) 直接构造禁止。从 default 出发改写 colour
        var out = bloxdDefaultLight(s, l);
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let level = clamp(sky * 0.7 + block, 0.0, 1.0);
        // 丢弃 engineColour (引擎光照结果)，换成「材质色 × 自算亮度」
        var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));   // 丢弃 engineColour，重打雾必需
        out.colour = col + s.emission * (1.0 - l.fogAlpha);   // emission 自己加 (必需)
        return out;
} else {
        return bloxdDefaultLight(s, l);
}
}
```

---

## 自发光配方 (emission)



> `emission` 在光照计算后叠加，但默认处理以 **`fogVisibility` 衰减。完全沉雾的远景发光也消失。远景也想发光的成分不要加到 emission，在 light 钩子内以 `out.colour += ...` 直接叠加** (engineColour 已打雾，远景光落在雾色之上)

### 灯光脉动 (火把呼吸)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let pulse = 0.5 + 0.5 * sin(bloxdSeconds() * 2.3 + l.position.x * 0.8);
        out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
}
    return out;
}
```

### 发光矿石感 (亮材质发光)

```wgsl
// surface 侧：材质越亮 (越白) emission 越强
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### 萤火虫群感 (随时间漂移的光点)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // 数个缓慢移动的「光球」，按距离倒数发光
    let t = bloxdSeconds() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdSeconds() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

---

## 坐标配方 (世界/方块/视线)



### 世界坐标

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### 方块坐标

```wgsl
let worldBlock = vec3i(floor(bloxdWorldPosition(l.position)));
```

### 棋盘格 (按方块)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 或 1
out.colour *= mix(0.96, 1.04, checker);
```

### 按方块伪随机 (哈希)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// 用途：草色变化、石头色斑等
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### 视线向量与轮廓光

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### 视线角度 (菲涅尔感 —— 液体用)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 正对 1 / 掠角 0
let fresnel = pow(1.0 - facing, 3.0);
```

---

## 时间配方 (动画)



> `bloxdSeconds()` 每 3600 秒 (1 小时) 回绕。但这是着色器流逝时间，不保证与游戏内太阳/昼夜同步。视觉周期动画可用，实际夜晚判定优先用 `bloxdSunDirection()` 与光照输入。

### 昼夜循环 (1 小时 1 天)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdSeconds() * 6.2831853 / 3600.0);   // 0..1 的 1 小时周期，不保证与游戏内昼夜同步
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### 摇摆 (多 sin 叠加)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### 流動极光带 / 荧光带

```wgsl
// 以 XZ 位置与时间混合 3 色
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

---

## 液体配方



### 水面涟漪 (颜色明灭)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdRenderOffset().x);
    let worldZ = s.position.z + f32(bloxdRenderOffset().z);
    let ripple = sin(bloxdSeconds() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid 恒有 BLOXD_ALPHA —— 守卫作习惯保留
    #endif
    return out;
}
```

### 高度伪透明度 (非真正的浅滩判定)

> v1 中场景深度与水底位置无法引用，仅凭本 API 算不出真实水深。v2 中经液体限定的 `bloxdOpaqueBehind()` 可测得至后方不透明面的厚度 ([第八部分](../history/v2.md) R-E)。以下为不使用它的旧式拟似演出：`s.position.y` 是局部坐标，直接用会随区块原点漂移。以下仅按世界高度改变 alpha 的拟似演出，非沿岸线/水底的浅滩表现。`packWaterReferenceY` 请按世界高度调整。

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // 低处更透、高处接近原 alpha，方向请在游戏中确认
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### 水下浑浊感

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### 纯液体包 (地形无损构成)

```wgsl
// 完全不写 terrain_* 钩子。于是：
//  - 地形变体 = 无钩子 = 引擎默认原样
//  - 液体变体 = 仅 liquid_* 钩子生效
```

---

## 顶点配方 (仅 allow)



> 全部用 `#ifndef BLOXD_STRICT` 包裹。
> 关于执行条件 (allow 标题一览; Custom Games 为 strict) 的细节参见本篇 §30 → [§30 每个游戏的适用模式](../internals/)

### 草随风摆 (只动上端)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdSeconds() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // 仅垂直面
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### 液面波 (仅上表面)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdSeconds() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdSeconds() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### 脉动地形

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdSeconds() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // 沿法线轻微胀缩
    return out;
}
#endif
```

### 波浪地形 (巨大 sin 波)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdSeconds() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdSeconds() * 0.7) * 0.3;
    return out;
}
#endif
```

---

## 数学小技巧



```wgsl
// 0..1 平滑分级 (n 级)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 二级阈值 (卡通阴影)
let shadow = smoothstep(0.35, 0.37, level);   // 阈值 ±0.02 形成台阶

// 三级卡通
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// 亮度 (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// 平滑脉冲
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// 三角波 (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// 秒 → 「缓慢相位」换算 (无视 3600 秒回绕的演出用)
let phase = t * 0.15;
```

---

## 写实系配方



> 「把原版外观从材质重新组装」的物理系配方集。前提：
>
> 1. **light 钩子在片元最后阶段调用**。返回的 colour 原样成为最终颜色。**必须自行重打雾** (R9.10)  
> 2. **引擎默认光照只有乘法**。高光 / 菲涅尔 / 暖冷分离 / 半球环境光都要从零制作  
> 3. `l.engineColour` 是完成色 (已打雾)。丢弃改从 `s.colour` (反照率) 重建才是正统  
> 4. 纹理禁止 → 细节必须全部**程序化** (哈希/噪声) 打入 (R9.8)

### R9.1 暖色火把 × 冷色空光

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
        let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
        let voxel   = max(torch, sky);
        var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // 中间 clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                    // 重打雾
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                 // emission 重加
}
    return out;
}
```

### R9.2 太阳高光 (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);          // 半向量
            let ndh = max(dot(n, h), 0.0);
            let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
            let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
            out.colour += spec * vec3f(1.0, 0.97, 0.90);
        }
}
    return out;
}
```

### R9.3 Schlick 菲涅尔

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let F = pack_schlick(dot(n, viewDir), 0.02);
        out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // 边缘微亮
}
    return out;
}
```

### R9.4 半球环境光 (上=天空 / 下=地面反弹)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let upness = n.y * 0.5 + 0.5;
        let ground = l.ambientLightColour * 0.55;                          // 下：反弹
        let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // 上：空光
        let hemi = vec3f(0.25) + mix(ground, skyH, upness);
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // 中间 clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                           // 重打雾
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                        // emission 重加
}
    return out;
}
```

### R9.5 ACES 胶片化 (Narkowicz 近似)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = 曝光
    return out;
}
```

### R9.6 大气透视 (随距离降饱和的「空气感」)

> 与雾 (颜色替换) 不同，再叠「随距离去饱和」会让远景真实得多。  
> 注意：只降饱和度，不动亮度。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // 衰减 (100 格约 30% / 400 格约 75%)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // 只降饱和 (亮度不变)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 波法线 + 太阳闪光 (水面「太阳之路」)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // 高度 h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // ∂h/∂x
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // ∂h/∂z
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let baseN = normalize(l.normal);
        let worldPos = bloxdWorldPosition(l.position);
        let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdSeconds()), clamp(baseN.y * 2.0, 0.0, 1.0)));
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);
            let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
            out.colour += glint * vec3f(1.0);
        }
}
    return out;
}
```

### R9.8 程序化微凹凸 (纹理禁止的绕行法)

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
    if (bloxdLit()) {
        let local = fract(l.position - l.normal * 0.5);   // 方块内局部坐标
        let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let lam = clamp(dot(n, sunDir), 0.0, 1.0);
            let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
            out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
        }
}
    return out;
}
```

### R9.9 洞穴非线性压黑 + 灯光保护

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let keep = 0.12 + 0.88 * blockInt;          // 有灯处抬起
        out.colour *= mix(keep, 1.0, sky * sky);     // 非线性 (平方) 压暗
}
    return out;
}
```

### R9.10 重打雾 (丢弃 engineColour 时必需)

> `(1.0 - l.fogAlpha)` 加 `min(l.fogAlpha, 0.75)` 式下限可实现「不再更浓」  
> (0.0 = 引擎一致 / 0.3–0.5 = 远景更透)。
> 注意引擎雾为地平线专用线性雾 (仅绘制距离附近)，中距离霾需包内自制。
> 实际雾设置 (实现已对照)：linear 固定 / `fogStart` = 绘制区块距离 / `fogEnd` = +1 区块 / 雾关闭时 100–101 区块实际无效 / 默认色 RGB(183, 191, 195)。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = s.colour * (voxel * 1.1 + vec3f(0.05));
        col = clamp(col, vec3f(0.0), vec3f(1.0));
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));  // 雾重现 (0.15=偏薄下限)
        col += s.emission * (1.0 - l.fogAlpha);            // emission 同样打雾
        out.colour = col;
}
    return out;
}
```

### R9.11 电影级 (阴影偏冷 / 高光偏暖 / 夜晚去饱和)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let lum = pack_luma(out.colour);
        out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;  // 仅太阳方向为零时算夜，不表现暮色渐变
        out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
}
    return out;
}
```

### R9.12 投影风阴影 —— 提升逆变换 + 阈值切割 (决定版)

> **前提复核 (第 10 章)**：`l.skyLight` 不是体素原始值 (n/15)，而是引擎「提升曲线」  
> `y = 1-(1-x/(3-2x))³` (提亮暗部的 S 曲线) 之后的值。
>
> | 位置 | 体素原始 | 提升后 (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | 开阔天空 | 1.00 | 1.00 | 1.00 |  
> | 树下 (半径2) | 0.87 | **0.97** | **0.86** ← 几乎无伤 |  
> | 半径3 | 0.80 | **0.92** | 0.66 |  
> | 半径5 | 0.67 | 0.78 | 0.29 |
>
> **这就是「加伽马也压不黑阴影」的真因** (数值证明)。但曲线单调，可代数严格逆变换：  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`。恢复原始值后，只需阈值切割 (`smoothstep`) 二值化。  
> LightEngine 的 BFS 横向扩散为「相邻 1 格 = -1」，阈值 `th = 1 - r/15` 直接成为  
> 「r 格以上遮蔽视为阴影」的旋钮。破坏方块阴影即刻移动 (LightEngine 实时重算)。  
> 限制：阴影以「上方天空」为基准，不随太阳旋转 (第 15 章「阴影的真相」)。

```wgsl
// 严格逆变换引擎提升，恢复体素原始 skyLight (n/15)
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // WGSL 无 cbrt，用 pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // 阴影半径旋钮：th = 1 - r/15 (0.87=半径2以上为影)
const shSoft = 0.04;   // 边缘柔度 (0.02=硬 / 0.08=软)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // 1. 恢复原始值 (跳过则永无阴影)
        let skyRaw = sh_unlift(l.skyLight);
        // 2. 阈值切割 —— 向阳=1 / 阴影=0 确实分离
        let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
        // 太阳 Lambert (无太阳时回退 l.directional)
        let sunLen = length(bloxdSunDirection());
        let sunL = select(clamp(l.directional, 0.0, 1.0),
                          clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                          sunLen > 0.5);
        // 投影的正体：直射太阳只到达看得见天空之处
        let lit = sunL * sky;
        // 阴影侧：染天空蓝而非黑 + 最低环境光
        let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
        var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
        // 火把光穿透阴影 (blockLight 同样被提升，一并恢复)
        let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                             sh_unlift(l.blockLight.g),
                             sh_unlift(l.blockLight.b));
        let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
        col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
        // 重打雾 (丢弃 engineColour 的份)
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));
        out.colour = clamp(col + s.emission * (1.0 - l.fogAlpha), vec3f(0.0), vec3f(1.0));   // emission 别忘了 (打雾后叠加)
}
    return out;
}
```

> 调整指南：**阴影面积只由 `shTh` 决定** —— `0.93`=半径1.5以上 / `0.87`=半径2 / `0.80`=半径3 / `0.67`=半径5。  
> 边缘硬度为 `shSoft` (0.02=硬 / 0.08=软)。影芯暗度由 `0.09` (最低环境光) 与 `0.16` (天空散射光)  
> 的两点偏移决定。黄昏想扩大阴影请加  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (长暮影近似。  
> `sunDir` 为 `bloxdSunDirection() / length(bloxdSunDirection())`)。阴影偏蓝请调高 `vec3f(0.72, 0.82, 1.05)` 的 B。

---

## Model shader recipes

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Analyzed (written against the v5 header spec)

Recipes using the v5 Model hooks and new flags for **"what am I looking at" selections that were impossible before v5**. Basics: [Models and textures](../guides/models.md).

### Held-item glow

What first-person shader authors wanted since v1, in two lines:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

### Splitting the world from the hand

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;
    }
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

### Glowing blade tips (localPosition)

`localPosition` rotates with the model — "where on the model am I" without world-space guesswork:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        let tipness = clamp(surface.localPosition.y * 0.5 + 0.5, 0.0, 1.0);
        out.emission += vec3f(0.3, 0.4, 0.6) * tipness * tipness * 0.6;
    }
    return out;
}
```

Note: actual `localPosition` ranges vary per model — verify on-device and `clamp` defensively.

### Highlighting dropped items

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.dropped) {
        let pulse = 0.5 + 0.5 * sin(bloxdSeconds() * 2.0
            + surface.localPosition.x * 3.0);
        out.emission += vec3f(0.08, 0.10, 0.06) * pulse;
    }
    return out;
}
```

### Cool rim on player skins (lifeform)

Most models use `textureId: 0` (skins); `surface.colour` already has skin × tint:

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.flags.lifeform) {
        let viewDir = normalize(bloxdEyePosition() - light.position);
        let rim = pow(1.0 - clamp(dot(viewDir, normalize(light.normal)), 0.0, 1.0), 2.5);
        out.colour += vec3f(0.4, 0.5, 0.7) * rim * 0.25;
    }
    return out;
}
```

### Swaying plants in the wind (allow only)

Plants (`flags.flat`) are drawn as models — sway via the vertex hook:

```wgsl
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(vertex);
    if (vertex.flags.flat) {
        let sway = sin(bloxdSeconds() * 1.8
            + bloxdWorldPosition(vertex.position).x * 0.7);
        let tipness = clamp(vertex.localPosition.y + 0.5, 0.0, 1.0);
        out.position.x += sway * 0.08 * tipness;
    }
    return out;
}
#endif
```

(Vegetation is also `flags.vegetation`: `flat` = "drawn as a crossed plane", `vegetation` = "is a plant" — grass and flowers are both.)

### Atlas-textured model faces only

Block-model faces (slabs, stairs…) carry atlas `textureId`s; select with `textureId != 0u`:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

`textureId: 0` faces (skins) sample as white — no error ([model-owned textures](../api/texture-api.md#model-owned-textures-textureid-0)).

### Armour vs the rest

`flags.lifeform` includes armour and cosmetics ([Flags](../api/flags.md)). No finer-grained input exists; combine `localPosition` (placement) or `overlayColour` presence as practical approximations.

### Sharing with terrain

Uniform grading across full blocks and block models:

```wgsl
fn applyGrade(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02, 1.0, 0.98);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}
```

The shared-function pattern is what the default pack template itself recommends ([hooks](../getting-started/hooks.md#fallbacks-and-code-sharing)).

### Related

- [Models and textures](../guides/models.md) · [Enchant effects](enchant-effects.md) · [Flags](../api/flags.md) · [Structures](../api/structures.md)

---

## Enchant effects

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Analyzed (restored from the live header)

v5 opened the enchant pipeline on both inputs and outputs. Recipes for controlling the glint of enchanted items and armour while preserving the engine's math.

### Inputs & outputs

**Inputs** (`BloxdSurfaceIn` / `BloxdLightIn` — enchanted items and armour only, all 0 otherwise):

```wgsl
enchantTier: u32,     // 1-5 for Tier 1-5.
enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.
```

**Output** (`BloxdSurface`):

```wgsl
enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
```

The engine mixes it inside [`bloxdLitColour()`](../api/lighting.md) — right after shading, before world light. `bloxdDefaultSurface` passes the input through unchanged, so **the default look matches v4's engine-internal behavior**.

### Understanding the defaults

Input `enchantColour.a` is an **animated** alpha — the engine animates the glint sweep, so reading `.a` per fragment yields a moving pattern for free. `enchantTier` and `enchantSpeed` are consistent by construction («faster at higher tiers»).

Unenchanted faces carry `enchantTier == 0`, `enchantColour == vec4f(0.0)`, `enchantSpeed == 0.0`.

### Recipe 1: no-glint realism (two lines)

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.enchantColour = vec4f(0.0);
    return out;
}
```

### Recipe 2: stronger glint by tier

`enchantTier` gives the classic "tier-scaled glint" without parsing colors:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        let tierBoost = 1.0 + f32(surface.enchantTier) * 0.12;
        out.enchantColour.a = clamp(surface.enchantColour.a * tierBoost, 0.0, 1.0);
        out.enchantColour.rgb = surface.enchantColour.rgb;
    }
    return out;
}
```

### Recipe 3: recoloring the glint

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        var e = surface.enchantColour;
        e.rgb = mix(vec3f(0.35, 0.8, 1.0), vec3f(0.9, 0.5, 1.0),
                    f32(surface.enchantTier) / 5.0);   // low tiers blue, high purple
        out.enchantColour = e;
    }
    return out;
}
```

### Recipe 4: enchantSpeed-driven sweep

Turn `enchantSpeed` into a phase for a custom sweep:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        let band = 0.5 + 0.5 * sin(surface.localPosition.y * 6.0
                                   - bloxdSeconds() * surface.enchantSpeed * 2.0);
        var e = surface.enchantColour;
        e.a = clamp(e.a * (0.4 + 0.6 * band), 0.0, 1.0);
        out.enchantColour = e;
    }
    return out;
}
```

### Recipe 5: amplifying the hurt flash (overlayColour)

`overlayColour` (players/mobs only; hurt flash etc.) mixes before lighting in `bloxdLitColour`:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.overlayColour.a = clamp(surface.overlayColour.a * 1.6, 0.0, 1.0);
    return out;
}
```

Harmless on non-entities (`overlayColour` is 0 there).

### Combining with custom lighting

Using `bloxdLitColour()` keeps the enchant/overlay mixing automatic:

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

### Notes

- Enchant inputs arrive **only on enchanted items and armour** — all 0 on terrain, water and unenchanted faces
- Changing the `enchantColour` output never touches `colour` directly — mixing happens in `bloxdLitColour` / `bloxdDefaultLight`
- Outside the model pipeline the enchant inputs are always 0

### Related

- [Lighting](../api/lighting.md) · [Structures](../api/structures.md) · [Model shader recipes](model-shaders.md)

---

## Engine Internals & Research

Internal specifications restored by analyzing the engine's implementation. Everything here was recovered directly from the JavaScript of the current production build (`ab90qa`). Separated from the public-API documentation ([API Reference](../api/)) to preserve exact internal behavior and analysis results.

### Map

| Page | Contents |
|---|---|
| [Rendering pipeline](rendering-pipeline.md) | alphaTest position, 2-light setup, uniform reality, greedy meshing |
| [Hook invocation](hook-invocation.md) | how hooks are spliced into the engine's WGSL |
| [Engine header](engine-header.md) | the full v5 header (verbatim, 8,954B) |
| [Shader validation](shader-validation.md) | analyzer internals, the signature table, HEADER_VERSION |
| [WGSL compilation](wgsl-compilation.md) | the stage-2 real compilation and validation stubs |
| [Reserved identifiers](reserved-identifiers.md) | the 46 `bloxdSp*` symbols |
| [Lighting internals](lighting-internals.md) | blockLight / heldLight structure |
| [Fog internals](fog-internals.md) | linear-only, the 32-block gradient band |
| [Texture sampling](texture-sampling.md) | the 3-variant texture codegen |
| [Texture registry](texture-registry.md) | name→id resolution, 896 names, measured drift |
| [Model rendering](model-rendering.md) | the v5 Model program |
| [Engine data](engine-data.md) | the v5 constants/limits/layout ledger |
| [Testing factors](testing-factors.md) | what world/player settings change pack-visible values |
| [Policy](policy.md) | shaderPackPolicy — the 12 allow titles |
| [Sun & moon](sun-and-moon.md) | what feeds bloxdSunDirection |
| [Debugging](debugging.md) | URL parameters, stats panels |
| [Research log](research-log.md) | methodology, build history, unverified items |

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03)

Internals are not a stable API contract — they may change with engine updates, and each page names its evidence build ([research log](research-log.md)).

---

## 管线细节



- **surface 钩子在 alphaTest 「之前」跑**：`out.alpha` 直接喂给丢弃判定。镂空材质 (草、叶) 可做溶解式抖动特效 (配方 R-C)。液体 (混合) 中 `out.alpha` 为真实透明度 (配方 R-D)。通常不透明地形无效果——勿误解
- **`l.ambient` 内容**为 `material.ambient × sceneAmbient`，按材质各异。场景侧直连图形设置「Ambient Lighting Intensity」(默认 0.5)，切勿写死默认值
- **场景的方向光为 2 灯组合**：主光 (方向来自天空设置中的太阳位置，强度 1.0) 与补光 (方向 `[-0.5, -1, -1]`，强度 0.35) 的 Lambert 之和到达 `l.directional`。补光朝下，因此对朝上的面没有贡献，而会照到朝下的表面 (洞穴顶等)。地形只考虑 `_initScene` 中追加的光；启动后追加的光对地形与方块模型被忽略 (官方有一则此意的警告消息)
- **`bloxdSeconds()` 正体为 `performance.now()`**：`time() { return performance.now() / 1e3 % 3600 }`，为浏览器启动流逝时间按 1 小时回绕。与游戏内昼夜及世界流逝时间无关。想做与游戏时钟同步的动画，在昼夜循环世界由 `bloxdSunDirection()` 方位角推定时间比较现实
- **标头函数读取同一个 uniform**：引擎在 `@group(3) @binding(0)` 放置 64 字节 uniform (4 槽——time / originOffset / sunDirection / eyePosition，little-endian)，`bloxdSeconds()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` 对应读取这些槽。`originOffset` 在当前构建恒为 `[0, 0, 0]` (为浮点世界坐标预留的槽)。包无法写入该 uniform，且包与引擎的 WGSL 合并为同一模块，自行声明相同 group/binding 也不可能。(v3 中两个槽位改名——`seconds` / `renderOffset`，并作为 `bloxdSeconds()` / `bloxdRenderOffset()` 公开——另外 `@group(3) @binding(1)` 增加了场景深度纹理；见[第九部分](../history/v3.md) §41 与 §51)
- **顶点数据由 mesher (Web Worker) 构建**：方块地形以每顶点 28 字节交织 (开启 atlas 时 32 字节)——position = float32×3 / normal = 8 位有符号整数×4 / colour = 8 位归一化整数×4 (`s.colour` 的本体——tint × AO 在 mesher 阶段烘焙为 8 位，包侧分离或还原原理上不可能) / UV = float32×2 / atlasIndex = float32。只有光照等级走另外 4 字节的顶点缓冲 ([第七部分](../internals/) §26、[第二部分](../api/) §11)。顶点按区块实例化绘制
- 加载时区块边界的细棋盘格为引擎屏幕空间 Bayer 4×4 抖动的区块淡入，非包 bug (可用图形设置 `chunkFadeIn` 关闭)
- **`mod` 为保留字**：以 `pack.wgsl:3 'mod' is a reserved word in WGSL.` 拒绝。求余用 `%` 运算符书写

### R-C. Bayer 抖动溶解 — out.alpha 控制 discard

复现引擎区块淡入所用的**同一 Bayer 4×4 表**，由低方块起按抖动做「熔解」镂空。alphaTest 材质 (草、叶) 触发 discard，液体则为混合透明度。

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod 为保留字：用 % 运算符
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
    // 由低方块起熔解，dissolve 越高残留越多
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. 水的相机近接淡入 — 液体 alpha 保障视野

液体钩子的 `out.alpha` 直连混合。仅透过相机正下方水面，保障潜水·水上相机的视野。

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 格由全透明到通常
    #endif
    return out;
}
```

---

## Hook invocation internals

> Target API: 5 · Target build: `ab90qa` · Status: Analyzed (restored from the production bundle — the Lite renderer; the integrated source file `lite/terrainShaderPack.ts` survives in error strings)

How the engine calls hooks at runtime. This changes nothing about the code you write, but removes the guesswork about what hooks receive.

### The splice architecture

The renderer does not "call" hooks from JavaScript. Once a pack passes validation, the engine **grafts your hook invocations into its terrain WGSL by replacing fixed anchor lines in the shader text**. Each anchor must match exactly once — zero or multiple matches abort with `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Stage | Anchor in the engine shader | What is grafted |
|---|---|---|
| vertex | the `let worldPos = …` through `vertexOutputs.vNormalW = …` block | build `BloxdVertexIn`, call the vertex hook, write `worldPos` back (also rewriting `let worldPos` to `var worldPos`) |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | build `BloxdSurfaceIn`, call the surface hook, write `baseColor` / `alpha` back |
| lit color | just before the fog mix | captures the pre-fog color (v3 used the `bloxdSpLitColour` temporary — v5 promotes this role into the public `bloxdLitColour()` header function) |
| light | the `return color;` at the fragment shader's end | build `BloxdLightIn`, call the light hook, write `color` back — after the fog mix |

### What the splice forces

- **strict terrain ignores surface-hook alpha changes.** The `alpha = bloxdSpSurface.alpha` write-back is grafted only for the liquid program or non-strict variants — the implementation behind the macro table ([Preprocessor](../api/preprocessor.md))
- **A strict variant that declares a vertex hook never runs it.** The engine reports at build time: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. Hence the template's `#ifndef BLOXD_STRICT`
- **`bloxdSp*` identifiers** are engine temporaries — invisible to your code but present in diagnostics and reverse-engineering output ([Reserved identifiers](reserved-identifiers.md) — 46 in v5)
- **The default-surface shortcut.** If a variant's surface hook is literally `bloxdDefaultSurface`, the engine omits the `baseColor` / `alpha` write-back graft entirely — the default already produces those values, so the assignments are dead code. **Unmodified hook chains cost nothing**

### What changed in v5

The splice architecture existed in the v2 renderer and stayed stable across v2 → v3 (v3 only changed `vBlockId` → `vBlockFlags` and added the liquid variant). v5's changes:

- `vBlockFlags` (bits) → the **`BloxdFlags` struct** (delivered via `bloxdSpFlags`)
- the `litColour` capture went from engine-internal to **public API** (`bloxdLitColour()` — v4's `bloxdSpLitColour` promoted)
- `BloxdLightIn` gained `diffuse` / `emissive`, and `bloxdShading()` rebuilds the material response ([Lighting](../api/lighting.md))
- delivery of `localPosition` (`bloxdSpItemLocalPosition`), enchant inputs (`bloxdSpEnchant`) and `overlayColour` ([Model rendering](model-rendering.md))
- `fogVisibility` → **`fogAlpha`** (inverted)
- the Model program joined the variant matrix (3 programs × 2 modes = 6 variants)

### What feeds BloxdLightIn (per field)

| Field | Engine-side source |
|---|---|
| `litColour` | the fragment color captured just before the fog mix — "before emission and fog" in header terms |
| `directional` | the vertex-interpolated sum of per-directional-light Lambert (2-light setup in [Rendering pipeline](rendering-pipeline.md)) |
| `diffuse` / `emissive` | the material's directional RGB response / RGB glow (new in v5) |
| `ambient` | `material.ambient × sceneAmbient` — per material, per frame |
| `blockLight` / `skyLight` | the decoded light-level varyings ([Lighting internals](lighting-internals.md)) |
| `ambientLightColour` / `skyLightColour` | the corresponding uniforms |
| `heldLight` | built from the light-level varying and held-light uniforms (cone falloff in [Lighting internals](lighting-internals.md)) |
| `fogColour` | black only in entirely fog-less scenes (mode 0) |
| `fogAlpha` | the clamped fog factor ([Fog internals](fog-internals.md)) |
| `position` / `normal` / `localPosition` / `flags` / `textureId` / `textureRotation` / `uv` / `mipLevel` | varyings and flat-interpolated values (same as `BloxdSurfaceIn` — post-vertex-hook values) |

### Related

- [Shader hooks](../api/hooks.md) · [Rendering pipeline](rendering-pipeline.md) · [Reserved identifiers](reserved-identifiers.md) · [Version History: v3](../history/v3.md)

---

## The engine header (v5, verbatim)

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Analyzed (restored from the live production bundle)

The exact text the loader prepends to every pack. Restored from the live production bundle (`ab90qa`, chunk c55, rendering the template with its 6 live interpolations — `apiVersion` and the 5 uniform reads via `bloxdPackInputs`). 8,954 bytes decoded, 208 lines. No paraphrase anywhere.

Reading guide:
- Field-by-field explanations → [Structures](../api/structures.md)
- Function-by-function → [Functions](../api/functions.md) / [Lighting](../api/lighting.md)
- Flags (BloxdFlags) → [Flags](../api/flags.md)
- The `bloxdTextureId*` block is **not** in this header — it is generated per pack from referenced names ([Texture API](../api/texture-api.md))
- `#ifdef BLOXD_ALPHA` marks conditional fields ([Preprocessor](../api/preprocessor.md))
- Differences from the v4 header (6,021B) → [Version History: v5](../history/v5.md)
- How the header is validated (HEADER_VERSION) → [Shader Validation](shader-validation.md)

```wgsl

// The Bloxd shader pack API, apiVersion 5. Read-only, prepended to all packs.

const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Blocks along each side of a chunk.
const bloxdChunkSize: i32 = 32;

// These functions return the same value for the entire frame.

// The camera's render position.
fn bloxdEyePosition() -> vec3f {
    return bloxdPackInputs.eyePosition;
}

// Integer distance, in blocks: render position + this offset = world position.
// Changes as the player travels, so render positions stay close to 0,0,0.
// See bloxdWorldPosition for one way to use it.
fn bloxdRenderOffset() -> vec3i {
    return bloxdPackInputs.renderOffset;
}

// The unit vector towards the sun, in world orientation; 0 when there's no sun.
fn bloxdSunDirection() -> vec3f {
    return bloxdPackInputs.sunDirection;
}

// Seconds since the page loaded. As an f32, it has sub-millisecond precision
// for the first 4.5 hours. Get a recurring timer using bloxdSeconds() % period.
fn bloxdSeconds() -> f32 {
    return bloxdPackInputs.seconds;
}

// Whether block and sky lighting is on. When it's off, BloxdLightIn's
// blockLight and heldLight are 0, and its skyLight and light colours are 1.
fn bloxdLit() -> bool {
    return bloxdPackInputs.lit != 0u;
}

// What kind of block, item or lifeform a face is. Any number of flags may be
// set, possibly even none. For example, sandstone is sand and rock.
struct BloxdFlags {
    opaque: bool,     // Opaque blocks, i.e. full cubes with no gaps or holes.
    emissive: bool,   // Blocks that emit light, e.g. lava and glowing ores.
    vegetation: bool, // Leaves, grass blocks and leafy plants, e.g. tall grass.
    dirt: bool,       // Soil, grass blocks included. Rocky Dirt is rock too.
    sand: bool,       // Sand, Red Sand and every sandstone, which is rock too.
    rock: bool,       // Stone variants, and more, e.g. gravel, ores and magma.

    // Drawn as block models, so never part of terrain or flagged as opaque.
    slab: bool,       // Half blocks.
    stairs: bool,     // Stairs and corner stairs.
    flat: bool,       // Planes, e.g. tall grass, flowers, crops and cobwebs.

    placed: bool,     // Blocks placed as part of chunks. Not items or vehicles.
    held: bool,       // Items in a hand, in first or third person.
    dropped: bool,    // Dropped items, on the ground, on a belt or in a pipe.
    thrown: bool,     // Items in flight, e.g. snowballs, arrows and rockets.

    lifeform: bool,   // Players, mobs and NPCs. Includes armour and cosmetics.
}

// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f {
    return position + vec3f(bloxdRenderOffset());
}

struct BloxdVertexIn {
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
}

struct BloxdVertex {
    position: vec3f,      // The render position output.
}

struct BloxdSurfaceIn {
    colour: vec3f,        // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,           // Opacity.

    // Enchanted items and armour only, all 0 for anything else.
    enchantTier: u32,     // 1-5 for Tier 1-5.
    enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
    enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.

    // Players and mobs only, 0 for anything else: RGB overlay colour, e.g. the
    // red flash when hurt, and its alpha. bloxdLitColour mixes it into colour.
    overlayColour: vec4f,

    // These mean the same as in BloxdVertexIn, after the vertex hook.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.

    // These are all 0 if the face has no texture. Most models use textureId 0.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}

struct BloxdSurface {
    colour: vec3f,        // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,           // Opacity output.
#endif
    emission: vec3f,      // Emissive RGB, added after lighting, before fog.
    enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
    overlayColour: vec4f, // Overlay output, mixed in by bloxdLitColour.
}

// blockLight, skyLight and heldLight are 0-1, from the 0-15 light levels on an
// ease-out curve, e.g. 6->0.45, 12->0.92. They all exclude ambientLightColour.
// bloxdLitColour lights a surface from these as the engine does.
struct BloxdLightIn {
    litColour: vec3f,  // Lit and enchanted RGB colour, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 if none.
    diffuse: vec3f,    // The material's RGB response to directional light.
    emissive: vec3f,   // The material's RGB glow, added to directional light.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 when !bloxdLit().
    skyLight: f32,     // Sky light; 1 when !bloxdLit().
    ambientLightColour: vec3f, // Minimum RGB light; 1 when !bloxdLit().
    skyLightColour: vec3f, // RGB colour of skyLight; 1 when !bloxdLit().
    heldLight: vec3f,  // RGB held light; 0 when !bloxdLit() or no light held.
    fogColour: vec3f,  // The game's RGB fog colour; 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.

    // These are the same as in BloxdSurfaceIn.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
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
    return BloxdSurface(
        surface.colour,
#ifdef BLOXD_ALPHA
        surface.alpha,
#endif
        vec3f(0.0),
        surface.enchantColour,
        surface.overlayColour,
    );
}

// Apply this fragment's fog to colour, as the engine does.
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}

// How the face's material and angle light it: directional light on its
// diffuse colour, plus its emissive and ambient terms, clamped to 0-1.
fn bloxdShading(light: BloxdLightIn) -> vec3f {
    let diffuse = light.directional * light.diffuse;
    return saturate(diffuse + light.emissive + light.ambient);
}

// The world's light at this fragment: the brightest of block, sky and held
// light, none below ambientLightColour.
fn bloxdWorldLight(light: BloxdLightIn) -> vec3f {
    let ambientLight = light.ambientLightColour;
    let blockLight = ambientLight + light.blockLight * (1.0 - ambientLight);
    let skyLight = mix(ambientLight, light.skyLightColour, light.skyLight);
    let heldLight = ambientLight + light.heldLight * (1.0 - ambientLight);
    return max(max(blockLight, skyLight), heldLight);
}

// The surface's colour lit as the engine does, before emission and fog:
// mixed with overlayColour, then bloxdShading, then mixed with
// enchantColour, then bloxdWorldLight.
fn bloxdLitColour(surface: BloxdSurface, light: BloxdLightIn) -> vec3f {
    let overlay = surface.overlayColour;
    let overlaid = mix(surface.colour, overlay.rgb, overlay.a);
    let shaded = bloxdShading(light) * overlaid;
    let enchant = surface.enchantColour;
    let enchanted = mix(shaded, enchant.rgb, enchant.a);
    return max(enchanted * bloxdWorldLight(light), vec3f(0.0));
}

fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

### Related

- [API Reference](../api/) — the annotated version of this header
- [Shader Validation](shader-validation.md) — HEADER_VERSION and saved-pack re-validation
- [Engine Data](engine-data.md) — the measurement ledger

---

## Shader validation internals

> Target API: 5 · Target build: `ab90qa` · Status: Analyzed (restored from the live validator)

The static validation (analyzer, stage 1 of the load check). User-facing fixes: [Validation errors](../troubleshooting/validation.md).

### The stages

1. **Loader limits** (zip / pack.json shape) → [Pack format](../api/pack-format.md)
2. **Static validation (analyzer)** — this page; syntax, types, reserved names, hook contracts across all 6 variants
3. **Real browser compilation** → [WGSL compilation](wgsl-compilation.md)
4. **Runtime re-validation on game join** — actually compiles every existing terrain material (stricter than the settings-screen check); failing it drops the pack for that game

### The special-function signature table

The validator keeps a table in module 29849 and checks cross-hook call restrictions:

```js
const Jq = new Map([
  ["bloxdFragmentBlockPosition", { params: "position: vec3f, normal: vec3f", returns: "vec3i", symbol: null, vertex: true }],
  ["bloxdOpaqueBehind", { params: "", returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }],
  ["bloxdTexel", { params: "textureId: u32, uv: vec2f, mipLevel: f32", returns: "vec4f", symbol: null }],
  ["bloxdTextureSize", { params: "mipLevel: f32", returns: "vec2u", symbol: null }],
]);
```

Restored logic:

- calling a non-`vertex: true` special function from a vertex hook → *"X reaches Y, which only surface and light hooks can use."*
- a function with a `symbol` (`bloxdOpaqueBehind` → `BLOXD_SCENE_DEPTH`) reached from a variant that doesn't define that macro → *"X reaches Y, which needs BLOXD_SCENE_DEPTH, and Z doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH."*

Note: `bloxdFragmentBlockPosition` is gone from v5's header generation but its old definition remains in this table (observed on the v5 build). Calls are rejected by validation.

### Reserved-name diagnostics

- **the `/^bloxd/i` general rule**: *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*
- **direct texture/sampler declarations**: *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*

### Texture-name resolution & diagnostics

`bloxdTextureId*` resolution has a dedicated path ([the messages](../api/texture-api.md#name-resolution-errors-verbatim-from-the-validator)):

- **folding**: split on non-alphanumerics, CamelCase, prefix with `bloxdTextureId`; reverse matching is case/underscore-insensitive
- **spelling suggestions** (new in v5): unmatched names get Levenshtein proposals at threshold `max(2, floor(len/4)) + 1`
- dedicated messages for frame spellings and turned-copy spellings
- post-fold ambiguous names are unusable

### v5's new diagnostics

- *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."* — names the removed macro
- packs reading `blockFlags` or referencing `bloxdBlockFlag*` fail the reserved-name diagnostic — **no pack misbehaves silently**

### The Y-derivative rewrite

The analyzer's token-rewrite pass rewrites every `dpdy` / `dpdyCoarse` / `dpdyFine` call to `(-dpdy(...))` (the dpdy family is explicitly enumerated as the inversion set). `dpdx` and `fwidth` are untouched ([Restrictions](../api/restrictions.md#auto-rewrite-introduced-in-v5)).

### Header & texture-constant generation

- the header is prepended read-only ([Engine header](engine-header.md))
- the `bloxdTextureId*` block is generated **per pack** from referenced names

### HEADER_VERSION

`HEADER_VERSION` is `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` (leading integer 8 → 9 from v4). The two fnv1a32 suffixes fingerprint the header material and the sorted name-id registry. Saved-pack re-validation uses this fingerprint to decide "needs re-check" ([Compatibility](../api/compatibility.md#saved-pack-re-validation-needs-re-check)).

### Validation stubs

Code that passes static validation gets stub code synthesized before the real browser-WGSL check: `var<private> bloxdValidationP: vec4f` plus `bloxdValidateVertex` / `bloxdValidateFragment` — the type-stub table (`bool` → `p.x > 0.0`, `vec3f` → `p.xyz`, …) builds input structs and invokes the hooks. Details: [WGSL compilation](wgsl-compilation.md).

### Related

- [Validation errors](../troubleshooting/validation.md) · [WGSL compilation](wgsl-compilation.md) · [Texture registry](texture-registry.md) · [Engine data](engine-data.md)

---

## WGSL compilation internals

> Target API: 5 · Target build: `ab90qa` · Status: Analyzed (restored from the live bundle)

The second validation stage — real compilation through the browser's WGSL compiler — and v5's validation stubs.

### Why two stages

Static validation's type-checking is incomplete, so some mistakes only surface here (e.g. WGSL operator-precedence requirements like `mixing '*' and '^' requires parenthesis`). Errors surface in-game with the variant name ([Compilation errors](../troubleshooting/compilation.md)).

### Validation-stub generation

The engine synthesizes stubs for code that passed static validation (restored from module 29866):

- the type-stub table:

| Type | Stub value |
|---|---|
| `bool` | `p.x > 0.0` |
| `f32` | `p.x` |
| `vec2f` | `p.xy` |
| `vec3f` | `p.xyz` |
| `vec4f` | `p` |
| `i32` / `vec2i` / `vec3i` / `vec4i` | `i32(p.x)` etc. |
| `u32` / `vec2u` / `vec3u` / `vec4u` | `u32(p.x)` etc. |

- structs build recursively — each field filled with stub values (nested structs recurse)
- the synthesized entry points:

```wgsl
var<private> bloxdValidationP: vec4f;

fn <special fn>(<params>) -> <returns> {
    let p = bloxdValidationP;
    return <stub value>;
}

@vertex
fn bloxdValidateVertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    let p = vec4f(f32(i));
    let o = <vertexHook>(BloxdVertexIn(<stubs>));
    return vec4f(o.position, 1.0);
}

@fragment
fn bloxdValidateFragment(@builtin(position) p: vec4f) -> @location(0) vec4f {
    bloxdValidationP = p;
    let s = <surfaceHook or bloxdDefaultSurface>(BloxdSurfaceIn(<stubs>));
    let o = <lightHook or bloxdDefaultLight>(s, BloxdLightIn(<stubs>));
    return vec4f(o.colour, 1.0);
}
```

Validation literally compiles "WGSL that calls your hooks with stub inputs" in the browser, surfacing syntax, type and language-feature violations.

### Error-message name restoration

When splicing hook calls the engine keeps an identifier mapping (`originalNames`). Identifiers in browser errors are mapped **back to your original names**, and `sourceOf(lineNum)` maps spliced line numbers back to (file, line) — you read errors against your own code, not the transformed text.

### Runtime re-validation on join

`checkCompilation` runs per game join and actually compiles every existing terrain material (stricter than the settings-screen check). Failing drops the pack for that game. The check has a 60-second forced timeout ([Performance](../troubleshooting/performance.md)).

### Related

- [Compilation errors](../troubleshooting/compilation.md) · [Shader validation](shader-validation.md) · [Getting Started: Validation](../getting-started/validation.md)

---

## Reserved identifier internals

> Target API: 5 · Target build: `ab90qa` · Status: Analyzed (restored from the live bundle's generators)

The `bloxdSp*` namespace — symbols the generators may inject and packs therefore cannot redeclare. The pack-author summary: [Restrictions](../api/restrictions.md).

### The 46 symbols

Grown from v4's 27 to **46** (20 added, 1 retired — `bloxdSpLitColour`, promoted into the public `bloxdLitColour()`):

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

### New names ↔ v5 features

- `bloxdSpFlags` — delivery of the `BloxdFlags` struct
- `bloxdSpEnchant` / `bloxdSpItemLocalPosition` — the new inputs (enchant, model-local position)
- `bloxdSpAcross` / `bloxdSpAt` / `bloxdSpCell` / `bloxdSpCellAt` / `bloxdSpCellIndex` / `bloxdSpSize` / `bloxdSpLevel` / `bloxdSpOwnTexel` — the cell-sampling texture-pack path
- `bloxdSpQuarterTurns` — the rotation chain ([Texture sampling](texture-sampling.md))
- `bloxdSpNormal` / `bloxdSpPosition` / `bloxdSpColour` / `bloxdSpOut` / `bloxdSpWord` / `bloxdSpIndex` / `bloxdSpDown` / `bloxdSpInside` — extended-hook locals

### The pack-level rule

Broader than this namespace: **everything matching `/^bloxd/i` (case-insensitive)**. Only the 9 hook function names may be declared ([Validation errors](../troubleshooting/validation.md)).

`bloxdTextureId`-prefixed identifiers resolve as texture names with their dedicated error family ([Texture issues](../troubleshooting/textures.md)).

### Related

- [Restrictions](../api/restrictions.md) · [Texture sampling](texture-sampling.md) · [Version History: v5](../history/v5.md)

---

## blockLight / heldLight 内部构造



`blockLight` 是**三通道 RGB 彩色光**。各发光方块定义有发射色 `[R, G, B]` (各 0–15)，该色原样成为光色 (普通火把 = 暖白 (14,14,12) / 岩浆 = 橙 (14,8,2) / 信标 = 青 (5,14,14) / 白色火把 = (15,15,15) 等)。到顶点阶段时，它以 4 nibble——r / g / b / sky——打包进一个 float 属性到达。在 light 钩子内分通道处理，即可实现彩色局部照明——暖色火把配方 (R9.1) 正是以该行为为基准校准的。

解码 `aPackedLightLevels` 时，引擎给每通道铺 **RGB 最亮通道 35% 的下限「35% 通道地板」**。如「纯红光源」在顶点先抬为 (1.00, 0.35, 0) 再经插值·提升。火把橙在游戏中显「白粉而非红」正缘于此，暖色火把配方 (R9.1) 饱和度以此默认行为为基准调整为好。

光照合成不是加法。内部上，引擎取方块光 (经 35% 通道地板后) 与按 `mix(环境色, 天空色, skyLight)` 构成的天空光的**最大值**，再与手持光 (经环境光助推后) 取 max。该合成中的通道值是**提升后**的值——引擎从与到达钩子输入相同的提升后光照等级 (`terrainLightLevels`，经提升曲线后) 合成，v2 与 v3 均如此。因此 `blockLight` 与 `skyLight` 不会相互抵消——较暗一侧的贡献被直接丢弃——削弱天空光也几乎压不暗由方块光主导的地方。请围绕此结构设计曝光/衰减配方 ([第六部分](../guides/) §19 的局部光保护正为此补偿)。

手持光 (`heldLight`) 范围由最亮光色通道定 (最大 15 格)，经 `dist^0.75` 预处理，同 35% 通道地板，`l.heldLight` 为环境光助推**前**之值。圆锥衰减从引擎光照模块复原如下: 光束的角度衰减为 `1 − 0.5 × (smoothstep(0.12, 0.65, t) + smoothstep(0.62, 0.95, t))`，其中 `t` 是距圆锥轴线的归一化角度 (0 = 中心，1 = 边缘)；射程为 `(rangeOverride > 0 ? rangeOverride : 最亮通道) × 圆锥衰减`，`rangeOverride` 取自手持光颜色的 alpha；射程内，覆盖值按 `(range − dist) / range` 衰减，而默认路径按通道减去 (预处理后的) 距离；随后是 35% 通道地板、除以 15、提升曲线，最后是环境光助推。自定义物品可设 `spotlightRange` (射程) 与圆锥角——「持握时出光束」模式，其圆锥跟随相机。包无法得知光束方向。

自定义方块可带 `skyLightEmission` (0–15)，**向 skyLight 通道本身注入，与 blockLight BFS 分开**。R9.12 式以 skyLight 阈值判向阳/阴影的包，在人工光源抬高 skyLight 的世界会误判。分发包与 blockLight 组合判定更稳健。

---

## 雾的内部规格



雾计算恒为 LINEAR 模式 (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`，clamp 0..1)，`fogStart = 32 × D`，`fogEnd = 32 × (D + 1)` (D = 雾距离设置；仅 D = 0 特例 fogEnd = 5)。**雾渐变带仅 32 格宽**，`(1.0 - l.fogAlpha)` 与其说是「距离雾」，不如说是**到已加载世界边缘的归一化距离**指标。随玩家加载距离变化，距离系演出应自行计算 `distance(l.position, bloxdEyePosition())` (配方 R-B)。(v3 注记: 渲染器的雾函数实际实现了 **off / exponential / exponential-squared / linear 四种模式**，正式发布的游戏驱动的是 linear；复原源码与稳健性讨论见[第九部分](../history/v3.md) §50。)

默认雾色 `rgb(183, 191, 195)` (淡青灰)。世界作者经 `fogColourOverride` (hex) 变更。雾模式 0 (NONE) 时 **fogColour 以黑到达**。标准形 `mix(l.fogColour, col, (1.0 - l.fogAlpha))` 安全，因为 fogVisibility 为 1 时不用雾色。脚本 API 还提供两个选项：`fogChunkDistanceOverride` 与 `fogOnSkybox`——Custom Game 可分别独立调整雾距 (D 值) 与雾对天空盒的应用。默认天空盒不受雾影响 (只有开启 `fogOnSkybox` 的游戏会让天空盒也染上雾色)。

玩家侧 `showFog` 关则雾推至 3200–3232 格，实际无效 (`fogVisibility ≈ 1` 持续返回)。

### R-B. 加载边界带 — fogVisibility 作「世界边缘」用

仅 32 格加载边界带悄悄染冷色，淡化世界尽头 (或作为演出强调)。不自行算距离，自动跟随玩家加载距离设置是优点。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = 内侧 (到边界有余裕), 0 = 即将出边界
    let edge = 1.0 - (1.0 - l.fogAlpha);
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

---

## Texture sampling internals

> Target API: 5 · Target build: `ab90qa` · Status: Analyzed (restored from the live generator, c56)

How `bloxdTexel` / `bloxdTextureSize` actually compile — the 3-variant texture codegen. The user side: [Texture API](../api/texture-api.md).

### The three variants

#### Variant 1 — texture pack inactive (stubs)

```wgsl
fn bloxdTextureSize(bloxdSpMipLevel: f32) -> vec2u {
        return vec2u(1u);
}
fn bloxdTexel(bloxdSpTextureId: u32, bloxdSpUv: vec2f, bloxdSpMipLevel: f32) -> vec4f {
        return vec4f(1.0);
}
```

Code written for the real atlas still compiles and runs here — it just sees white texels and a 1×1 size.

#### Variant 2 — the atlas path (the game default)

`bloxdTextureSize` returns `textureDimensions(textureAtlas0, u32(clamp(round(bloxdSpMipLevel), 0.0, f32(textureNumLevels(textureAtlas0) - 1u))))`. `bloxdTexel` applies the face's quarter-turn before the load — the rotation trap written as the generated `bloxdSpTurned` if-chain:

```wgsl
        // Each quarter turn clockwise the face shows its texture at reads the unturned texture at (v, 1 - u)
        var bloxdSpTurned = bloxdSpUv;
        if (bloxdSpTextureRotation == 1u) {
                bloxdSpTurned = vec2f(bloxdSpUv.y, 1.0 - bloxdSpUv.x);
        } else if (bloxdSpTextureRotation == 2u) {
                bloxdSpTurned = 1.0 - bloxdSpUv;
        } else if (bloxdSpTextureRotation == 3u) {
                bloxdSpTurned = vec2f(1.0 - bloxdSpUv.y, bloxdSpUv.x);
        }
```

(`bloxdSpTextureRotation` is the engine's own storage of the input field `textureRotation`.)

#### Variant 3 — custom texture-pack textures

`textureLoad(<atlas>, min(bloxdSpCellAt * bloxdSpSize + bloxdSpAt, <dims> - 1u), bloxdSpLevel)` samples the layered atlas's per-texture cell; the pack's own texels go through the `bloxdSpOwnTexel` path.

### The animation frame ladder

Animated textures (42 families) advance at fixed per-family intervals (200 / 250 / 300 ms — the interval column in the [texture catalog](../api/texture-catalog.md#animation-families-42-names)). Passing an animation-family id to `bloxdTexel` samples the current frame.

### Sampler settings

The block textures are a `texture_2d_array`; the terrain sampler is nearest + repeat.

### Greedy meshing & UV

The mesher merges faces with matching material/AO/light into single rectangles (**greedy meshing**), so vertex UVs can exceed tile width on merged faces (0.0015 inset at edges). Hardware repeat addressing handles the tiling, so merged faces look seamless — but procedural detail keyed to `uv` can discontinuity across merge boundaries; key world-dependent effects to `bloxdWorldPosition(position)` instead.

### Related

- [Texture API](../api/texture-api.md) · [Texture registry](texture-registry.md) · [Rendering pipeline](rendering-pipeline.md)

---

## Texture registry internals

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Verified (extracted by re-running the engine's own registry builder)

The name→id resolution machinery and measured registry drift. The user-facing catalog: [Texture catalog](../api/texture-catalog.md).

### Methodology

We ran the engine's own registry-building module (29833 on this build, coordinating modules 1371 / 1391 / 1384 / 219) against the shipped block registry's texture data inside a mini webpack harness and recorded its output — these numbers are **the production bundle's own computation**, not a re-implementation.

### Output structure

| Output | v5 measured | Meaning |
|---|---|---|
| `named` | **896** | names referable as `bloxdTextureId<Name>` |
| `aliases` | 416 | folded spellings — 188 frame aliases (`lava0`…) and 228 rotation aliases (`chest_top[rot[1`…) |
| `layers` | 228 | the layer table — including 171 pre-rotated slots (57 roots × 4 rotations) |

### Folding rules

- **animation families** (42): frame spellings (`lava0`–`lava7`) fold to the base name (`lava`); `bloxdTexel` returns the current frame at sample time
- **rotation families** (57): turned slots (`[rot[1..4`) fold to the root name; `bloxdTexel` re-applies per-face `textureRotation`
- `radar_screen` is the only name in both families (its four pre-rotated copies each carry their own 4-frame ladder — hence 45 animation roots on the atlas, not 42)

### Drift (cnty9 → ab90qa)

| Measurement | cnty9 (v4) | ab90qa (v5) |
|---|---|---|
| atlas entries | 1,219 | **1,210** |
| rotation families (turned spellings) | 57 (228) | **57 (228) — unchanged** |
| animation families (frame spellings) | 42 (188) | **42 (188) — unchanged** |
| usable named constants | 905 | **896** |
| id changes among surviving names | — | **334 of 905** |

The complete drift (11 names): added (1) `scorpion_eggs`; removed (10) the eight double-chest textures plus `mob_spawner_hostile_block_side` / `mob_spawner_neutral_block_side` (the double chest left the game data; spawners keep `mob_spawner_block_top`).

### Effect on HEADER_VERSION

The registry-hash suffix bakes in ids, so this drift marks **every saved pack "needs re-check"** (auto re-validated on page load). Name-written packs survive re-resolution; raw-id packs break ([Compatibility](../api/compatibility.md)).

### Past drift records

October's two-build comparison (sjr0p7 → cnty9, 10 days): entries 1200 → 1219 (98 added, 79 removed); 779 of 1121 unchanged names changed id (69%); a naming-convention migration (`_rot1..4` suffixes → `[rot[1..4` slots); the double chest appearing. The full record lives in [Version History: v4](../history/v4.md).

### Related

- [Texture catalog](../api/texture-catalog.md) · [Shader validation](shader-validation.md) · [Research log](research-log.md)

---

## Model rendering internals

> Target API: 5 · Target build: `ab90qa` · Status: Analyzed (restored from the live bundle)

The internals of the v5 Model program. The user-facing guide: [Models and textures](../guides/models.md).

### What the Model program is

Before v5, packs could only plug into terrain / liquid; block models (slabs, stairs, plants) and entities (players, mobs, items) were **outside pack jurisdiction**. v5 added model as the third program, drawing:

- blocks drawn as block models (header note: *"Drawn as block models, so never part of terrain or flagged as opaque"*)
- held / dropped / thrown items
- players, mobs, NPCs (armour and cosmetics included)

### Flag & input delivery

- **`bloxdSpFlags`** — the delivery path for the `BloxdFlags` struct; the 8 new fields (`slab` / `stairs` / `flat` / `placed` / `held` / `dropped` / `thrown` / `lifeform`) carry values meaningful only on model faces
- **`bloxdSpItemLocalPosition`** — delivery of `localPosition`; `vec3f(0.0)` on terrain/liquid
- **`bloxdSpEnchant`** — delivery of the enchant inputs (`enchantTier` / `enchantColour` / `enchantSpeed`)

### Enchant computation

The engine animates the glint sweep and delivers it as `enchantColour.a` to the surface/light hooks ([Enchant effects](../recipes/enchant-effects.md)). The mixing happens inside `bloxdLitColour()` — right after shading, before world light ([Lighting](../api/lighting.md#the-full-pipeline)).

### The overlay (hurt flash etc.)

`overlayColour` carries entity state color (damage flash etc.) as RGB + alpha. `bloxdLitColour` mixes it **before lighting**, so state expression rides without breaking the base color. The processing existed internally in v4 and was opened to inputs/outputs in v5.

### The texture path

Most model faces use `textureId: 0` (no texture) — player skins and mob textures are not in the block-texture-atlas namespace. `surface.colour` arrives with skin × tint baked in, so model-face processing starts from `colour` ([model-owned textures](../api/texture-api.md#model-owned-textures-textureid-0)).

### Variants

The Model program forms one axis of the variant matrix: `strict.model` / `allow.model`. `BLOXD_ALPHA` is defined only in allow.model ([Preprocessor](../api/preprocessor.md#macro--variant-matrix)); strict.model has no vertex hooks.

### Related

- [Models and textures](../guides/models.md) · [Model shader recipes](../recipes/model-shaders.md) · [Flags](../api/flags.md) · [Rendering pipeline](rendering-pipeline.md)

---

## Engine data ledger (v5 measurements)

> Target API: 5 · Target build: `ab90qa` (2026-11-03; production = preprod, byte-identical) · Status: Verified

The documentation's v5 measurement ledger — every confirmed value, all measured on `ab90qa`.

### The ledger

| Item | Value |
|---|---|
| `apiVersion` | `5` (strict `===`, number) |
| engine header | 8,954 B decoded / 208 lines (9,125 B as shipped, 6 interpolations). First line `// The Bloxd shader pack API, apiVersion 5. Read-only, prepended to all packs.` — full text in [Engine header](engine-header.md) |
| hooks | 9 (terrain/liquid/model × vertex/surface/light). Names unchanged; the default template bundles all 9 |
| variants | 6 (strict × program). Names `strict\|allow.terrain\|liquid\|model` — the lighting axis is gone |
| macros | `BLOXD_STRICT` (strict) · `BLOXD_ALPHA` (all liquid + non-strict terrain/model) · `BLOXD_SCENE_DEPTH` (all liquid) · ~~`BLOXD_LIGHTING`~~ **removed** |
| pack uniform | `@group(3) @binding(0)`, 64 B: seconds@0, **lit@4 (u32, new)**, renderOffset@16, sunDirection@32, eyePosition@48 |
| pack bindings | group 3: 0 uniform · 1 scene depth (liquid) · 2 `bloxdSpTextureLayers` storage |
| flags | the `BloxdFlags` struct, 14 bools; v4's bit values retired |
| loader limits | 256 `.wgsl` / 256 KB source / 64 KB `pack.json` / 32 MB zip / 1,024 entries; UTF-8; one manifest; unique paths — all unchanged |
| texture registry | 1,210 entries → **896 usable names**; drift vs cnty9 +1/−10 ([Texture registry](texture-registry.md)) |
| light curve | 0–15 levels → 0–1, ease-out (`6 → 0.45`, `12 → 0.92`) — in the header, unchanged |
| lift curve | `1 - (1 - x / (3 - 2x))^3` — unchanged (currently chunk c9) |
| directional cone | `0.12 / 0.65 / 0.62 / 0.95` — unchanged (chunk c9) |
| fog color | `vec3f(183/255, 191/255, 195/255)` — unchanged |
| reserved names | `/^bloxd/i` (case-insensitive) + the 46 `bloxdSp*` engine symbols ([Reserved identifiers](reserved-identifiers.md)) |
| HEADER_VERSION | `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` |
| strict titles | everything except the 12 allow titles in [Policy](policy.md) (re-verified on ab90qa, unchanged) |
| header/registry builders | chunk c55 (module 29833 + 1371 + 1391 + 1384 + 219 coordinating) |
| default pack template | chunk c116 (moved from v4's c124), 1,683 B |

### Bundle layout (for re-surveyors)

The shader-pipeline cluster: loader/persistence c51–c53, validator/header/registry builder c55, WebGPU/codegen c56, fog c9. **The default pack template is c116** (c124 in v4).

Chunk-format note: every chunk is an ES module (`export const modules = {...}`) — c53 carries both c52's and c53's modules — so plain-text search of the bundle remains meaningful (module id `1371` lives in *main*'s sparse module array, in no chunk).

The main bundle is 3.39 MB (+115 KB vs the v4 build); the chunk map has 195 IDs (188 emitted, 7 known gaps).

### Past ledgers

- v4 (cnty9, 2026-10-27) → [Version History: v4](../history/v4.md)
- v3 (3ymzdd, 2026-10-19) → [Version History: v3](../history/v3.md)

### Related

- [Research log](research-log.md) · [Engine header](engine-header.md) · [Policy](policy.md)

---

## 包可见值变化之物 — 测试清单



同一包因**世界与玩家设置**渲染各异。分发前至少在以下 3 环境确认外观：

1. **通常世界** (默认天空盒、无覆盖) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`、默认色
2. **太空系天空盒世界** — bloxdSunDirection() = 0。`sunPresent` 分支的外观
3. **设 `visionMinLightColour` / `skyLightColourOverride` 的自定义世界** — 暗部与颜色被抬高的情形

主要变动源：`lightingOverride` (强制光照) / `skyLightColourOverride`、`ambientLightColourOverride` (hex 替换) / `visionMinLightColour` (「可见最暗色」。实现为对 `uSkyLightColour` 与 `uAmbientLightColour` 二者按分量取 max；Night Vision 在用——「洞穴全黑」系包达不到预想之暗，天空色本身也被垫高) / `heldLightColourOverride`、`Range`、`ConeAngle` / `fogChunkDistanceOverride`、`fogColourOverride`、`fogOnSkybox` / `skyBox` (bloxdSunDirection() 有无)。`uSkyLightColour` 默认 = (1,1,1) 白，`uAmbientLightColour` 默认 = (0.25,0.25,0.30)。`l.ambient` 场景成分 = 图形设置「Ambient Lighting Intensity」(默认 0.5)。`(1.0 - l.fogAlpha)` 跟随玩家雾/区块距离设置。另有 `cameraTint` (覆盖全屏的 RGBA 色染) 与 `proximityFadeDistance` / `proximityFadeMinOpacity` (相机对实体的接近淡出) 两种世界侧变动源——`cameraTint` 尤其是叠加在包输出**之上**的最终通道。多数设置也可经脚本 API (`serverOption`) 定义并在对局中更新。

---

## 每个游戏的适用模式 (`shaderPackPolicy`)



这里把 §7 的「allow / strict」在标题层面的语义确证下来。只有游戏定义中显式写着 `shaderPackPolicy: "allow"` 的标题才以完整模式运行 (vertex 钩子、`discard`、地形 `alpha`)；未指定 (或 allow 以外的值) 的标题视为 strict — 定义 `BLOXD_STRICT`，守卫内的代码自动失效。这个判定不在包一侧可控，因此弄清哪些标题跑什么内容是发布的前提。

- 依据构建: `szby6g.main.94a7596c.js` (2026-10-17 时点的正式部署)。静态解析全部 111 个游戏定义的结果为 **allow 26 条目 (12 个标题) / strict 85 条目**。同样的 12 个 allow 字面量及其 12 个标题已在 v3 生产 bundle (`3ymzdd`，2026-10-20) 上再次确认未变——下方列表原样沿用至 v3。
- 在 `shaderPackPolicy` 之上还有分发渠道闸门 (大致 `canUseShaderPacks`)：经外部 portal (如 Coolmath Games 构建) 时，着色器包系统本身可能在 `shaderPackPolicy` 被查看之前就被禁用。下文的 allow/strict 分析基于 bloxd.io 主 Web 构建。
- allow 共在 12 处声明: 游戏定义内的直接书写 8 处与基底变量 (`tb` / `kz` / `cb` / `Fb`) 的 4 处，变体通过 spread 继承 (`{...tb,...}`)。按变体的个别覆写目前不存在 (也不存在 父 allow·子 strict 的逆模式)。

allow 的 12 个标题 (合计 26 条目):

- **Test Gym** — 本体 + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (合计 11 条目)
- **Doodle Cube** — 本体 + Solos / Duos (合计 3)
- **Rocket Obby** — 本体 + Sheep / January (合计 3)
- **9 个独立标题**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

strict 侧特别容易误解的点:

- **Superflat Creative (classic_creativeFlat) 是 strict**。名字虽含「Creative」，但 classic 家族中 allow 的只有普通的 Creative (`classic_creative`)。Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns 等也全部 strict
- **Custom Games (customGames) 是 strict**。自制的自定义游戏中 vertex 钩子系效果不会发动。用于验证工作的话，用 Test Gym 最稳妥
- bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) 系等主要 PvP·服务器系标题全部 strict

另外，strict 标题中包的加载与编译本身照常进行，surface / light 等片元侧配方也正常工作。受到约束的是 vertex 钩子 (`bloxdTerrainVertex` / `bloxdLiquidVertex`)、`discard` 与地形 `alpha` (液体恒有)。

此一览为上述构建时点的静态解析结果；引擎更新会改变 allow/strict 的分布。新版发布时请再确认。

---

## 太阳与月亮的正体



`bloxdSunDirection()` 之源是仅在天空盒种类变化时改写的天空方向缓冲，判定基准不是「天空有无太阳」而是**「天空盒是否为 earth 型」**。

| 天空盒 | `bloxdSunDirection()` |
|---|---|
| `default` (程序天空) | 非零 (默认值见下) |
| `gloomy` / `interstellar` / `space_*` (立方体纹理) | **恒为 (0,0,0)** |

**月亮恒为 `-bloxdSunDirection()`** (引擎将月亮位置算作太阳的严格反方向)。夜晚按太阳高度判定——`bloxdSunDirection().y < 0` (太阳在地平线下) 时月亮在上。但默认世界太阳静止，月亮也静止，只有实现昼夜循环的世界才看得到月动。

默认世界太阳方向约为 `(-0.56, 0.81, -0.18)` (由 inclination = −0.2 / azimuth = 0.55 算出的单位向量，静止)。测试分发包时可在纸面预测高光方向的实用基准值。

昼夜循环并未内置于引擎——inclination 是静态数值，有昼夜移动的世界由游戏侧更新。每次更新 `bloxdSunDirection()` 也改写跟随。

地形方向光仅为场景启动时生成的 2 盏，**方向强度固定，昼夜不变**。总之**决定地形亮度的要素都不随时间，昼夜「观感」只来自天空盒与 bloxdSunDirection()**，夜间想压暗地形的包只能自行由 bloxdSunDirection() 推定时间带 (§19 的 `sunPresent` 手法)。

### R-A. 方向性月光 — moonDir = −bloxdSunDirection()

仅月亮在上时叠加青白色 Lambert 与弱高光。`moonUp` 在默认静止太阳世界为 0，那里什么都不发生——**只在昼夜循环世界触发的安全月光**。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // 月亮恒为太阳严格反方向；白天经 moonDir.y < 0 自动熄灭
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
}
    return out;
}
```

---

## 调试手段



- URL 参数 `?renderer=lite` — 强制 Lite (WebGPU) 渲染器 (`?renderer=webgl2` / `babylon` 亦可；`babylon` 是 webgl2 的旧名)。优先级：URL 参数 > localStorage `bloxdRenderer` > 设置画面 > 默认 (webgl2)。无效值附带警告忽略。URL 或 localStorage 中残留的覆盖会使需要 WebGPU (lite) 的场景以「needs the new WebGPU renderer, so remove the renderer override...」出错 ([第五部分](../troubleshooting/) §17)
- URL 参数 `?vconsole` — 屏幕内控制台 (VConsole)。手机实机验证趁手
- URL 参数 `?drawcalls=1` — 追加绘制统计调试面板。可从调试控制台拾取游戏对象，或用 `drawCalls()` / `why()` / `configureDrawCallWatching()` 查看大型机制 (包内外) 的重绘与每一次绘制逼近约 65,000 顶点上限的情况——很适合定位性能瓶颈
- 控制台输出 `noa-engine v0.33.0` 与 `Renderer: lite from <来源>` — 先确认以防渲染路径误诊
- WebGPU 渲染器在包适用中锁定「强制 ON」。「Disable Block Texture Atlas」设置也锁定 (Atlas 保持 ON)，无 WebGPU 环境包根本无法适用。在分发页写「需要 WebGPU 浏览器」的根据在此
- 方块纹理为二维数组纹理 (`texture_2d_array`)，地形采样器为 nearest + repeat。mesher 还会将材质 / AO / 光照一致的面合并为一个矩形 (**greedy meshing**)，因此合并面的 UV 可能超过单个 tile 宽 (边缘内缩 0.0015)。平铺由硬件 repeat 寻址处理，合并面看起来无缝。注意依附 `vUV` 的程序化细节会在合并面边界断裂——请改为依附世界坐标 (`s.position` + `bloxdRenderOffset()`)
- 每次进游戏运行时重验证 (`checkCompilation`)，以浏览器 WebGPU 实编全部地形材质 (比设置画面静态验证更严)。此处失败的包被逐出该游戏

---

## Research log

> Status: Verified — how this documentation's measurements were obtained

The technical statements here rest not on official developer documentation but on **production-bundle analysis**. This page records methodology and evidence so future builds can be re-verified.

### Core principles

1. **Direct production-bundle retrieval** — raw main.js and chunks fetched from both production and preprod, identity verified by md5
2. **Verbatim respect** — headers, error messages and i18n strings are **quoted as-is**, never paraphrased
3. **Reproduced measurement** — derived values like the registry are recomputed by running the engine's own modules in a harness (real output, not a lookalike re-implementation)
4. **Named builds** — every measurement carries a build id and date

### Build history referenced by this documentation

| Build | API | Date | Note |
|---|---|---|---|
| `szby6g` | v3-era | 2026-10-17 | first allow/strict static analysis (111 game definitions) |
| `3ymzdd` | v3 | 2026-10-20 | the v3 guide's evidence build |
| `sjr0p7` | v3-era | 2026-10-17 | drift-comparison baseline |
| `cnty9` | v4 | 2026-10-27 | v4 guide & 905-name catalog evidence |
| `6pf78` / `tcwczu` | v4 | 2026-10-31 | v4 freeze confirmation (Halloween event + Skyblock rework) |
| `ab90qa` | **v5** | 2026-11-03 | **current**; this documentation's baseline. prod = preprod (md5 `fc3322212d15be2445c0e8dfc9733fcc`) |

### Key methodology

#### Engine-header restoration

Rendering the c55 header template with its live interpolations (`${vC}` = apiVersion, the 5 uniform reads via `${Gq.j}`) — 6 interpolations on v5 ([Engine header](engine-header.md)).

#### Texture-registry recomputation

Running the engine's registry-building modules (29833 + 1371 + 1391 + 1384 + 219) against the shipped block registry's texture data in a mini webpack harness; recording the output (named 896 / aliases 416 / layers 228) ([Texture registry](texture-registry.md)).

Animation intervals come from the `animDataPerTex`-style table (per-layer `numAnimStates` / `animationInterval`) — only three interval values exist: 200 / 250 / 300 ms ([the catalog](../api/texture-catalog.md#animation-families-42-names)).

#### Error-message capture

Loader messages verbatim from the live i18n dictionary; validator messages from the validation module's string literals.

#### allow / strict static analysis

Statically analyzing all 111 game definitions: `shaderPackPolicy` `"allow"` literals — 8 direct + 4 base-variable = 12 titles (26 entries), spread-inheritance (`{...tb,...}`) tracked too ([Policy](policy.md)).

#### Uniform / pipeline restoration

The `BloxdPackInputs` field layout from the uniform-layout module (29838); the texture 3-variant codegen from the WebGPU generator (c56) ([Texture sampling](texture-sampling.md)).

### Drift observations

| Comparison | Period | Result |
|---|---|---|
| sjr0p7 → cnty9 | 10 days | 98 added, 79 removed; 779/1121 names changed id (69%) |
| cnty9 → ab90qa | 7 days | +1 (scorpion_eggs), −10 (double chest ×8, spawner sides ×2); 334/905 names changed id |

### Unverified / speculative

- Pixel-accurate shadow maps as "future plans" is an **interpretation** (inferred from the unused `var shadow: f32 = 1.;` in the lighting template)
- The allow/strict split can change per build (12-title identity re-confirmed on ab90qa; future games unknown)
- Why `bloxdFragmentBlockPosition` remains in the signature table (removed from v5's header) is unanalyzed — plausibly an un-cleaned leftover, but unconfirmed

### When to re-verify

On detecting a game update (a new main.js hash): re-check the header (9,125B), the apiVersion constant, recompute the registry, and re-confirm the allow/strict list. Detailed monitoring methodology is outside this documentation's scope, but the module locations above (c55 / c116 / c56) are the starting points.

### Related

- [Engine data](engine-data.md) · [Texture registry](texture-registry.md) · [Version History](../history/)
