<!-- Auto-generated from the 6-category structure. Edit individual pages instead. -->

## Документация по шейдер-пакам Bloxd.io

Неофициальное руководство по шейдер-пакам для WebGPU-рендерера Bloxd.io — от создания, реализации, валидации и распространения до спецификации API и исследования внутренностей движка.

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


## Часть VIII: руководство по миграции на API Version 2


Целевая сборка: `6qxffk.main.5912a15f.js` (продакшн-деплой на 2026-10-16). Части I–VII этого руководства уже переписаны на базу v2; эта часть VIII собирает миграционные моменты с v1 и новые возможности v2. Примеры кода новых возможностей проходят валидацию 8/8 вариантов на компиляторе v2 и проверку браузерным WGSL-компилятором (Tint) (§38), а v2-конверсия существующих рецептов — механическая подстановка идентификаторов, поэтому перед распространением обязательно проверяйте живой компиляцией в игре.

### 31. Судьба v1-паков (сначала вывод)

Игра требует, чтобы `apiVersion` манифеста **строго совпадал с 2**. Загрузка v1-пака отклоняется с `This pack is for shader pack API version 1. Bloxd supports version 2.` (ключ i18n `shaderPack:loadWrongApiVersion`). **Параллельной поддержки v1/v2 нет**. Движок также перепроверяет у сохранённых паков `validation.headerVersion` (хеш всего текста заголовка), так что механизм автопометки сохранённых паков «нужна перепроверка» при обновлениях движка — тот же, что в v1.

### 32. Полное переименование идентификаторов (таблица соответствия)

В v2 подчёркивания унифицированы в camelCase. **Старые имена полностью неиспользуемы.**

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
| `bloxd_packInputs` (внутренний uniform) | `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) |

Виды хуков (vertex / surface / light × terrain / liquid, всего 6) и формат `pack.json` (`apiVersion` / `name` / `author`) не изменились. Лимиты загрузчика тоже неизменны (zip 32MB / 1024 записи / 256 файлов `.wgsl` / 256KB суммарно / 64KB манифест).

### 33. Куда переехали удалённые поля

В v1 `time` / `eyePosition` / `sunDirection` / `originOffset` были полями структур. В v2 **эти поля удалены; вместо них — функции заголовка, читающие uniform движка (`bloxdPackInputs`)**. Поскольку функции читают uniform напрямую, **их можно вызывать из функций уровня модуля вне хуков и из vertex-хуков**.

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` для перевода в мировые координаты | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

### 34. Новое ①: `blockId` (шейдинг по блокам)

Все три структуры `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` получили `blockId: u32`. Это **ID владеющего блока** (0–65535), единый по всей грани (передаётся с `@interpolate(flat)`). Применяется для идентификации типа блока независимо от цвета текстуры. Но таблица соответствия ID и типов блоков — внутри движка и из паков не видна, так что **какой ID какому блоку — измеряется в мире или берётся из справочника ниже**. Внутри ID гравируется в 16 бит: младшие 8 бит — α цвета вершины, старшие 8 бит — w нормали; лимит 65535 — следствие этой ширины канала. Сама система blockId активируется только когда есть активный шейдер-пак (без пака провод ведёт в паддинг, но на уровне структур из части II эта разница ненаблюдаема).

**Справочник**: автор публикует список игровых записей в [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (`entries.json`: таблица id ↔ имя блока; варианты поворота/meta вроде `Furnace|meta|rot2` перечислены отдельными ID). Соответствия могут меняться с обновлениями игры — окончательно проверяйте в реальной игре.

Часто используемые блоки (по entries.json на 2026-10-18; только низкие id террейна):

| ID | Блок | ID | Блок |
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

В entries.json есть и неблочные записи (инструменты и т.п.), но до хуков террейна/жидкостей дотягиваются только блочные id.

#### R-F. Тинт по типу блока через blockId

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // напр.: каменные id (старший битовый паттерн) — в холодный
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

#### R-G. blockId на практике — пак отображения битовых плоскостей

Рецепт для выяснения id блоков, которых нет в таблице соответствий, прямо в мире. Меняйте `plane` в начале как `0, 1, 2, …` и читайте цвет грани интересующего блока.

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

Цвет грани показывает 3 бита blockId как есть в RGB (чёрный = 0 / красный = 1 / зелёный = 2 / жёлтый = 3 / синий = 4 / маджента = 5 / циан = 6 / белый = 7). Одно наблюдение даёт одну восьмеричную цифру. Если по p0 → p3 вышло 3, 2, 7, 2, то id = восьмеричное 2723 = 1491 (Lava). Для низких id террейна хватает двух наблюдений p0 и p1. Состоит только из surface-хуков, так что работает и в strict-титулах.

#### R-H. Качание только листвы — ограничение vertex-хука по blockId

Рецепт ветра R7 ([часть III](../recipes/)) волнует весь террейн, но vertex-хук тоже читает `blockId`, поэтому можно ограничить цель только блоками листвы. Список id и массив для WGSL (замер на 2026-10-18; 22 вида: Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / фруктовые варианты / Autumn Aspen):

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// vertex-хуки в strict-титулах автоматически неактивны (§36)
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
        // смещение — гладкая функция мировой позиции: общие вершины, указывающие
        // на одну точку мира, двигаются одинаково, и грани не рвутся (R7 из [части III](../recipes/) — тот же принцип)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- Список id растёт с обновлениями движка (в замеренном обновлении добавилось 50 блоков). Для длительного использования проверяйте добавления через [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) или R-G и дополняйте массив
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) — некусаемые коврики-листья на земле. При качании выглядит, будто они отрываются от земли, так что имеет смысл исключить их из массива
- В strict-титулах vertex-хук отключается целиком, но с гардом выше «просто замирает качание», а эффекты фрагментной стороны продолжают работать

### 35. Новое ②: `BLOXD_SCENE_DEPTH` и `bloxdOpaqueBehind()` (главное)

Доступ к глубине, структурно невозможный в v1, разблокирован **только для liquid-программ**. Цвета нет, но **геометрия — дистанция и позиция непрозрачной грани позади — доступна**. Типовое применение — расчёт цвета поглощения по измеренной толщине воды.

Правила использования:

| Использование | Результат |
|---|---|
| Вызов без guard'а в `bloxdLiquidSurface` / `bloxdLiquidLight` | OK (в жидкостных вариантах всегда определён) |
| Вызов без guard'а в `bloxdTerrainSurface` | ERROR. Оберните в `#ifdef BLOXD_SCENE_DEPTH` |
| Вызов в vertex-хуках | ERROR (только хуки surface / light) |

Чтобы использовать глубину и в хуках террейна, оборачивайте в `#ifdef BLOXD_SCENE_DEPTH` (хуки террейна переиспользуются liquid-программами, так что глубина жива только на жидкостной стороне).

#### R-E. Поглощение по толщине воды (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // длина столба воды = отсюда до непрозрачной грани позади
        let thickness = distance(behind.position, surface.position);
        // поглощение Beer-Lambert: красный гаснет быстро, синий идёт далеко
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // позади небо = тянуть к глубокому синему
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

Применения: поглощение/рассеяние по толщине, проекция ряби-«каустики» из мировых координат дна через `behind.position`, небесное отражение на воде с различением неба и затенения через `found=false`, ступенчатая муть по глубине. Если построение пайплайна копирования глубины не удалось — безопасная деградация к «позади ничего». Готовность depth-текстуры фиксируется при создании рендерера страницы по признаку «читает ли активный пак глубину», поэтому **при использовании паков, читающих глубину, обязательно перезагружайте страницу**. Если глубина запрошена без перезагрузки с активным паком, в консоли единожды появится предупреждение `…reads scene depth on a page that didn't turn it on`, глубина подменяется текстурой 1×1, и `bloxdOpaqueBehind()` всегда возвращает `found = false`.

### 36. Прочие изменения v2

- **Fallback хуков**: без `bloxdLiquidXxx` liquid-программы падают на хуки террейна. **Пак с одними хуками террейна действует и на воду как есть**. При нежелательности явно определяйте хуки жидкостной стороны.
- **Guard'ы полей `BLOXD_LIGHTING` больше не нужны**: `blockLight` и др. есть во всех вариантах, в unlit лежат дефолты (0 / 1 / белый / 0). Используйте `#ifdef BLOXD_LIGHTING` лишь для проверки света. Сохранение старых guard'ов ничего не меняет.
- **Условие определённости `BLOXD_ALPHA` изменилось**: определён в не-strict вариантах террейна и во всех жидкостных вариантах, не определён в strict × террейн. Пишете alpha в хуках террейна — guard оставляйте.
- **Прямое конструирование структур запрещено**: вызовы конструкторов вроде `BloxdLight(...)` отклоняются статической проверкой. Всегда меняйте от `bloxdDefault*` или используйте копию входа.
- **`let _ =` становится `_ =`**: отбрасывающее присваивание WGSL `_ = f();` валидно, а `let _ = f();` отклоняется.
- **offInStrict**: определение vertex-хука или достижимый из surface / light-хуков `discard` вместо ошибки автодеактивируют весь пак в strict-играх (в UI настроек `shaderPack:offInStrict`; в allow-играх работает). Оборачивайте vertex-хуки и `discard` в `#ifndef BLOXD_STRICT`.
- **Расширение тумана**: режимы расчёта LINEAR / EXP / EXP2 реализованы, но настройки игры по-прежнему всегда LINEAR, так что старые спеки тумана работают как есть. Семантика `fogColour` теперь официально задокументирована (чёрный только в полностью бестуманных сценах).
- **Без изменений**: lift-кривая, 35%-пол каналов, затухание heldLight (`pow(lightDist, 0.75)`) и ambient-буст, спека направлений солнца/луны, дефолтный цвет тумана, цикл time (3600 с), направленные света (макс. 4), только Lite (WebGPU), механизм сохранений (IndexedDB), зарезервированность `mod`.

### 37. Чек-лист миграции v1 → v2

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **Идентификаторы**: заменить все по таблице §32 (имена хуков, имена структур, default-функции)
3. **Перенос удалённых полей**: в функции заголовка по таблице §33 (`s.time` → `bloxdTime()` и т.д.)
4. **Переименовать `fogFactor` → `fogVisibility`**
5. **Убрать прямое конструирование структур**
6. **Исправить `let _ =` на `_ =`**
7. **Обернуть vertex-хуки и discard в `#ifndef BLOXD_STRICT`**
8. **Проверить, что вода тоже чувствует эффекты хуков террейна**; при нежелательности явно определить liquid-хуки
9. (Опционально) Вести туман самим от `litColour` / добавить поглощение по толщине воды через `bloxdOpaqueBehind()` / поблочную стилизацию через `blockId`
10. **Проверяйте и вторую ступень (браузерный Tint)** — особенно скобки в выражениях с `^` `&` `|` `<<` `>>`. Существует код, проходящий статическую проверку, но отклоняемый браузером (§38)

### 38. Вторая ступень проверки — браузерный WGSL-компилятор строже встроенного парсера

Проверка паков в игре — **двухступенчатая**. Первая ступень — статическая проверка (встроенный в движок JS-парсер: сигнатуры хуков, запрещённый синтаксис, использование sceneDepth и другие пак-специфичные правила), а вторая ступень — браузерная проверка (приложенный к результату компиляции стаб компилируется настоящей реализацией WebGPU, а ошибки показываются с обратным маппингом на строки исходных файлов пака; стадия фразы UI «Saved, but it won't run until you fix these errors»). Суффиксы в конце сообщений об ошибках вроде `(only in terrain)` — это «вид program варианта, в котором возникла ошибка».

Встроенный парсер не реализует правила связывания (Binding) операторов WGSL, поэтому **проходящий статическую проверку код может отклоняться браузером**. Чаще всего страдают канонические целочисленные хеш-паттерны:

| Операторы | Следствие |
|---|---|
| `<<` `>>` | Прямо связываются лишь до унарного уровня. `a + b << c` — ошибка |
| `&` `^` `\|` | Прямо связываются лишь до унарного уровня. `a * b ^ c` — ошибка |
| `&&` `\|\|` | Смешивать нельзя. `a && b \|\| c` — ошибка |

#### Как ставить скобки (NG / OK)

```wgsl
// NG — статическую проверку проходит, но браузер (Tint) отклоняет:
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — каждое умножение в скобки (цепочка одного оператора A ^ B ^ C сама по себе левоассоциативна и легальна)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

Опубликованный в руководстве код этого паттерна не содержит (смешение `+`/`*` в `pack_hash3` и `h ^ (h >> 16u)` уже в скобках, т.е. соответствуют спеке). Написанный пак прогоняйте через обе ступени — первую и вторую.

### 39. О независимо похожих материалах

Существует community-материал почти того же содержания: [Шейдер GlitchHunterCoder/Bloxd-Essay](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader). Опубликован раньше этого гайда, но **содержание этого гайда — из собственного анализа glm настоящих bundle-файлов Bloxd (набор webpack-чанков), а не копипаст**. Совпадают оба потому, что независимое исследование одной реализации ведёт к тем же выводам.

---

Исследовано: ltf_ahel (исследовано с glm)

---


## Часть IX: руководство по миграции на API версии 3

> **Заменено 2026-10-26: текущий API — версия 5** — паки v3 отклоняются при загрузке ровно так, как здесь описано для v2. Примените эту часть, *затем* [часть X](../history/v4.md) (v3 → v4: текстурный API, переименование `fogAlpha`, `bloxdFragmentBlockPosition`, `hit`). Затем примените и [Часть XII](../history/v5.md) (v4 → v5).

Целевой билд: `3ymzdd.main.fae4743f.js` — **продакшн-билд, живущий с 2026-10-19**. Бандл, который bloxd.io отдаёт в продакшене, байт-в-байт совпадает (проверено по md5 — и основной бандл, и чанки шейдер-паков) с предпродакшн-деплоем, на котором изначально исследовалась эта часть, так что всё здесь применимо к продакшену как есть. Модель пака сохраняет форму v2 (те же поля `pack.json`, те же лимиты загрузчика, та же раскладка uniform).

Части I–VII этого руководства по-прежнему написаны на базе v2. Эта часть, как и [часть VIII](../history/v2.md), собирает воедино точки миграции v2 → v3 и новые возможности v3. Переход в основном механический (§47), но лишь одно изменение реально меняет поведение — свет по умолчанию теперь ослабляет emission туманом (§43), — и `blockId` целиком заменён на `blockFlags` (§42), поэтому перед распространением всегда проверяйте компиляцией в игре.

Новое в этой редакции: разделы **§49–§54** выходят за рамки миграции и посвящены внутрянке движка, восстановленной из продакшн-билда: тому, как Lite-рендерер на самом деле вызывает ваши хуки; настоящей функции тумана с четырьмя режимами; точной реализации `bloxdOpaqueBehind()`; полному пути доставки `blockFlags` от регистрации блока до вашего хука и конвейеру валидации с измеренным хэшем заголовка. Это самые глубокие публично задокументированные факты о системе паков на сегодня, и они закрывают несколько вопросов, которые другие руководства до сих пор числят открытыми.

### 40. Судьба v2-паков (сначала вывод)

**Обновление 2026-10-19: v3 покинула предпродакшн и теперь её отдаёт живой сайт.** Каждый v2-пак, сохранённый до раскатки — включая все паки, распространявшиеся как v2, — теперь падает в продакшене ровно так, как описано ниже, так что миграция из §47 больше не опциональна ни для кого, кто распространяет паки сегодня.

Сборка требует, чтобы `apiVersion` в манифесте **точно совпадал с 3**, и **параллельной поддержки v2/v3 нет**. v2-пак отклоняется при загрузке сообщениями о «неправильной версии API» (ключи i18n, текст с подстановками):

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>

У сохранённых паков остаётся жизненный цикл v2 ([часть VIII](../history/v2.md) §31): каждая сборка хэширует свой заголовок движка, обновления движка автоматически помечают сохранённые паки как «нужна перепроверка», а сохранённый пак, чей `apiVersion` отличается от текущей версии, помечается как неработающий (причём статусное сообщение выше указывает на замену), а не выдаёт ошибку.

### 41. pack.json и uniform-буфер (что не меняется)

- Обязательные поля манифеста не изменились: `{ apiVersion, name, author }`.
- Лимиты загрузчика не изменились: 32 МБ zip / 1024 записи / 256 файлов `.wgsl` / 256 КБ кода суммарно / 64 КБ манифеста.
- Блок uniform движка не изменился по форме: `@group(3) @binding(0)`, 64 B, содержит — в порядке объявления — время, смещение рендера, направление солнца и позицию глаз. Раскладка зарегистрирована с `minBindingSize: 64`, а точная раскладка полей — `seconds: f32` @ байт 0, `renderOffset: vec3i` @ 16, `sunDirection: vec3f` @ 32, `eyePosition: vec3f` @ 48. Два внутренних имени полей изменились: `time` → `seconds`, `originOffset` → `renderOffset`. **Байтовая раскладка идентична v2**, и для кода пака ничего не меняется, потому что пакам по-прежнему нельзя называть uniform напрямую (заголовок движка помечает его как предоставляемый движком и read-only, «which packs can't name»); продолжайте работать через функции заголовка `bloxdSeconds()` / `bloxdRenderOffset()`.
- В группе 3 пака появился второй задокументированный ресурс: `@group(3) @binding(1)` — текстура глубины сцены, которую читает `bloxdOpaqueBehind()` (полная реализация в §51). 64-байтный uniform остаётся на binding 0; паки по-прежнему не могут называть ни один из биндингов.

### 42. blockId становится blockFlags: материалы блоков как битовые флаги (главное)

Во всех трёх структурах входов хуков (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`) поле v2 `blockId: u32` **заменено** на `blockFlags: u32`. Текст движка о поле: *"What kind of block this face is: `bloxdBlockFlag*` bits, the same across the face."* Движок теперь сам поставляет данные материала, так что подходы v2 — угадывание материалов по диапазонам числовых id или таблицы id в мире ([часть VIII](../history/v2.md) §34) — больше не нужны.

Биты выставлены как именованные константы:

```wgsl
// Проверка: (blockFlags & bloxdBlockFlagRock) != 0.
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| Значение | Константа | Смысл (заметки движка, сокращённо) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | Полностью непрозрачный — включая листву и лёд. Не стекло, вода, лава, спавнеры, призрачные и невидимые блоки. |
| 2 | `bloxdBlockFlagEmissive` | Источает блочный свет, как неон, порталы, лампы, лава и маяк. Светящиеся руды считаются, даже если слабо. |
| 4 | `bloxdBlockFlagVegetation` | Листва и трава на травяных блоках (травяные блоки тоже несут dirt). Не кактусы, грибные блоки и сено. |
| 8 | `bloxdBlockFlagDirt` | Dirt и soil, включая травяные блоки. Rocky Dirt — тоже rock. |
| 16 | `bloxdBlockFlagSand` | Песок, красный песок и любой песчаник — который тоже rock. |
| 32 | `bloxdBlockFlagRock` | Камень и его виды, андезит, диорит, гранит, гравий, руды, песчаник, Rocky Dirt, бедрок, обсидиан и магма. |

Блок из нескольких материалов несёт **каждый** подходящий флаг (пример самого движка: песчаник — это песок и камень, поэтому получает оба). Листва — vegetation, но не dirt; травяные блоки — vegetation и dirt одновременно.

Флаги vegetation / dirt / sand / rock назначаются по зарегистрированному **отображаемому имени** блока (opaque / emissive берутся из собственных данных движка о непрозрачности и свечении): имена, оканчивающиеся на `Leaves`, и имя `Grass Block` — vegetation; имена `Dirt` / `Soil` (и каждый `Grass Block`) — dirt; ровно `Sand` и `Red Sand`, а также любое имя, содержащее `Sandstone`, — sand; имена, содержащие `Stone` / `Andesite` / `Diorite` / `Granite` или `Ore`, а также Yellowstone, Gravel, Bedrock, Obsidian, Magma, Rocky Dirt (и песчаник) — rock.

#### Точные правила имён (выведите флаги любого блока сами)

Четыре материальных бита вычисляет фиксированный классификатор по зарегистрированному отображаемому имени блока. Сначала отбрасывается суффикс варианта (всё после `|`), поэтому варианты наследуют флаги базового блока. Затем:

| Бит | Правило (вычисляется по имени без суффикса) |
|---|---|
| vegetation | имя **оканчивается на** ` Leaves` или **оканчивается на** ` Grass Block` |
| dirt | имя **ровно** `Dirt`, **оканчивается на** ` Dirt` или ` Soil`, либо **оканчивается на** ` Grass Block` |
| sand | имя **ровно** `Sand` или `Red Sand`, либо **содержит** `Sandstone` |
| rock | имя **ровно** одно из `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt`, **содержит** `Sandstone`, **оканчивается на** ` Ore`, либо содержит `Stone` / `Andesite` / `Diorite` / `Granite` как отдельное слово |

Yellowstone перечислен явно, потому что `Stone` не является отдельным словом внутри `Yellowstone`. Opaque и emissive **не** происходят из имени — они берутся из собственных данных движка о непрозрачности и свечении блочного света, поэтому этими правилами их не вывести.

Источник: классификатор имён движка (модуль 28537, бандл `3ymzdd`); проверено по всем 7 861 именованному блоку, 2026-10-20.

Пример — тинт по материалу блока:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

Влияние на рецепты v2: массив из 22 id листвы из R-H ([часть VIII](../history/v2.md) §34) сворачивается до `(blockFlags & bloxdBlockFlagVegetation) != 0`. Справочник id ↔ имя блока в [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) остаётся полезным для не-шейдерных задач, но для стилизации материалов больше не нужен поиск по миру.

#### Листва без травы (вопрос, который задают все)

`vegetation` сам по себе совпадает с листвой **и** травой на травяных блоках, которые также несут `dirt`. Исключите dirt, чтобы затрагивать только листву — именно это различие прямо прописано в заметках движка к полю:

```wgsl
// Только листва: vegetation без dirt. Травяные блоки — это vegetation И dirt.
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// Только травяные блоки (травяные грани поверхности террейна):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

Проверено по живому реестру (2026-10-20, бандл `3ymzdd`): `vegetation && !dirt` совпадает ровно с 45 регистрациями листвы (22 базовых типа — те же 22, что измерял массив id из R-H в v2); `vegetation && dirt` совпадает ровно с 8 травяными блоками. Исключений ни в одну, ни в другую сторону нет — счётчики реестра на момент той сборки; новые блоки увеличивают числа, не меняя правило. В паре с `vertex.normal` (вверх/вниз) можно выбирать грани, например только верхушки травяных блоков.

### 43. Переименования функций и семантические изменения

| v2 | v3 | Заметки |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | Секунды с момента загрузки страницы (о точности f32 ниже) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | Та же величина: позиция рендера + это = мировая позиция |
| `const bloxdTimeWrap: f32 = 3600` | **удалено** | Задавайте периоды сами на стороне пака |
| `engineColour` (в `BloxdLightIn`) | **удалено** (14 → 13 полей) | Собирайте заново из `litColour` + тумана |
| параметры хуков `v` / `s` / `l` | `vertex` / `surface` / `light` | Написание в шаблоне; сигнатуры не изменились |

- **`bloxdSeconds()`** — секунды с момента загрузки страницы. В f32 в первые 4,5 часа шаг счёта меньше 1 мс, а с 9 до 18 часов — около 4 мс. Заголовок рекомендует идиому `bloxdSeconds() % period`, которая считает от 0 до `period`, а затем начинается заново — чистая замена удалённой константы wrap.
- **`bloxdRenderOffset()`** — целые блоки: «a render position plus this is a world position». Он меняется, пока игрок двигается, поэтому позиции рендера остаются близко к игроку — и потому точными. По всему руководству то, что текст v2 называл noa-локальным смещением, теперь последовательно называется **позицией рендера** / смещением рендера; это та же величина, которую возвращал `bloxdOriginOffset()`.
- **`bloxdTimeWrap` удалена** — пак, заворачивавший время на 3600 с, теперь объявляет свою константу, например `const timeWrap: f32 = 3600.0;`, и использует `% timeWrap`.
- **Семантика света по умолчанию** — дефолт v2 был `engineColour + emission × fogVisibility`; дефолт v3 собирает его как `bloxdApplyFog(litColour + emission, light)` — **emission теперь ослабляется туманом внутри дефолта**, так что итоговый выход целиком проходит через смешивание с туманом. Таблица переноса:

  | Выражение v2 | Перенос v3 |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // перенос v2-чтения `l.engineColour + s.emission * l.fogVisibility` в v3:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **Не изменились по имени и смыслу**: `bloxdEyePosition()`, `bloxdSunDirection()`, `bloxdFaceBlock()`, `bloxdApplyFog()`, `bloxdWorldPosition()`.

### 44. Новые константы заголовка: `bloxdPi` и `bloxdTau`

```wgsl
// Пол-оборота и полный оборот, в радианах.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

Они полезны и в тригонометрии, и тем, что избавляют от хардкода π. Следите за повторным использованием имён: локальная константа пака с тем же именем теперь конфликтует с проверкой заголовка на дубликаты идентификаторов — уберите или переименуйте любое повторное объявление `bloxdPi` / `bloxdTau` в своём коде.

### 45. Шаблон из шести хуков (жидкостные хуки официально показаны)

Поставляемый со сборкой текст пака по умолчанию теперь содержит **все шесть хуков** — terrain / liquid × vertex / surface / light — и каждый возвращает свой дефолт движка. Комментарии движка описывают его так: *"Every hook returns its engine default. Copy a hook and change its output to start a shader pack."*

```wgsl
// Каждый хук возвращает свой дефолт движка. Скопируйте хук и измените
// его выход, чтобы начать шейдер-пак.

// Strict-игры оставляют террейн на месте: без guard'а этот хук отключил бы
// весь шейдер-пак там.
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

// Вода использует эти. Если удалить, вода использует ваши террейн-хуки.
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

- Комментарии хуков прямо формулируют правила жидкостей: **воде нужен свой набор из трёх хуков; удалите его, и вода снова использует ваши террейн-хуки** (поведение fallback, известное из v2, [часть VIII](../history/v2.md) §36, теперь прописано в самом шаблоне).
- `bloxdLiquidVertex` находится под тем же guard'ом `#ifndef BLOXD_STRICT`, что и `bloxdTerrainVertex` — без guard'а он отключил бы весь пак в strict-играх так же, как vertex-эффекты террейна.
- В шаблоне теперь используются полные имена параметров `vertex` / `surface` / `light` (шаблон v2 использовал короткие `v` / `s` / `l`). Имена параметров в вашем коде свободны — важны только сигнатуры.

### 46. Матрица вариантов: ось программы и изменения макросов

Варианты генерируются по матрице **strict × lighting × program** — те же 8 комбинаций, что в v2, но terrain / liquid теперь явная ось матрицы. В именах вариантов она записывается как `allow|strict · unlit|lit · terrain|liquid`, а в UI показывается как `terrain` / `liquid`, `strict` / `non-strict`, `lighting on` / `lighting off` (и в сообщениях об ошибках может добавляться «(only in {{variants}})»).

| Макрос | Где определён |
|---|---|
| `BLOXD_STRICT` | strict-варианты (обе программы) |
| `BLOXD_LIGHTING` | варианты с включённым светом (обе программы) |
| `BLOXD_ALPHA` | **все жидкостные варианты** плюс не-strict **террейн**-варианты |
| `BLOXD_SCENE_DEPTH` | **все жидкостные варианты** |

Для авторов меняются две вещи по сравнению с правилами v2 ([часть VIII](../history/v2.md) §36):

- **`BLOXD_ALPHA` не изменился по сравнению с v2.** Генератор вариантов содержит буквальную строку `"liquid"!==program&&strict||push("BLOXD_ALPHA")` — приоритет операторов JS делает *(террейн **и** strict)* единственным случаем, когда push пропускается, поэтому макрос определён в **каждом жидкостном варианте (strict или не-strict) и в не-strict террейне**; его опускает только strict-террейн. Код `#ifdef BLOXD_ALPHA` на жидкостной стороне компилируется ровно как всегда, и запись alpha из §49 (вставляемая для жидкостных программ или не-strict вариантов) точно соответствует этому набору.
- **`BLOXD_SCENE_DEPTH` всегда определён в жидкостных вариантах**, поэтому использование глубины там остаётся допустимым без guard'а, ровно как в v2 (§35); в террейн-хуках по-прежнему нужен `#ifdef BLOXD_SCENE_DEPTH`.

### 47. Чек-лист миграции v2 → v3

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** во всех трёх входных структурах; выражайте стилизацию материалов битовыми проверками констант `bloxdBlockFlag*` (§42); выбросьте эвристики по диапазонам id из v2
3. **`bloxdTime()` → `bloxdSeconds()`**; объявите свой период вместо удалённой `bloxdTimeWrap` (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **Пересоберите математику света с `engineColour` на `litColour` + туман** по таблице §43; учтите, что дефолт теперь ослабляет emission туманом
6. **Жидкостные хуки**: явно определите `bloxdLiquid*`, если хотите обрабатывать воду иначе; не определяйте их, чтобы вернуться к террейн-хукам
7. **Проверка guard'ов `BLOXD_ALPHA` не нужна** — его набор вариантов не изменился с v2: все жидкостные варианты плюс не-strict террейн определяют его, опускает его только strict-террейн (§46)
8. **Используйте `bloxdPi` / `bloxdTau`** там, где были захардкожены тригонометрические константы; удалите локальные повторные объявления, которые теперь дублируют заголовок
9. **Сохраняйте strict-guard'ы**: vertex-хуки и `discard` остаются обёрнутыми в `#ifndef BLOXD_STRICT`; шаблон защищает `bloxdLiquidVertex` так же, как террейн
10. **Проверяйте в игре** — компилируйте и тестируйте пак в игре, поддерживающей шейдер-паки

### 48. Прочие изменения и заметки v3

- **Валидация остаётся двухступенчатой** ([часть VIII](../history/v2.md) §38): сначала статическая валидация, затем настоящая WebGPU-компиляция браузера через сгенерированные заглушки, вызывающие ваши хуки, с привязкой ошибок обратно к исходным файлам / строкам, а диагностика восстанавливает исходные имена идентификаторов движка через отображение.
- **Strict-диагностика называет причину**: vertex-хук, двигающий террейн, сообщает «… moves terrain, which strict games prevent.», а `discard` в surface / light-хуках — «discard makes terrain see-through, which strict games prevent.»; UI настроек сохраняет указание «wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`.» (`offInStrict`).
- **Сообщения загрузчика**: виды ошибок и лимиты не изменились; «Zip64 archives aren't supported.» выводится как сообщение UI (`loadZip64`). Инвентарь строк UI паков насчитывает 57 ключей `shaderPack:*`; среди ошибок стадии загрузки набор дополняют `loadNoWgsl` (zip без единого файла `.wgsl`) и `loadNotZip` (файл без сигнатуры конца zip-архива).
- **В игровом UI паков нет WGSL-редактора.** Экран настроек не предлагает редактор шейдерного кода — паки пишутся как zip-файлы вне игры. (CodeMirror в бандле есть, но это редактор JavaScript для UI скриптинга кастомных игр; поддержки WGSL у него нет, и с системой паков он не связан.)
- **Аппаратный порог**: Lite требует драйвер с поддержкой функции WebGPU `shader-f16`; слишком старые драйверы отклоняются сообщением вроде «Intel driver too old for Lite (no shader-f16)».
- **Смена освещения перепроверяет сохранённые паки**: когда настройка освещения меняется во время выполнения, движок заново запускает проверку пака (`changed → recheck`); просмотр реплеев вызывает тот же хук с `changed: false` и перепроверку пропускает.
- **Формулировки**: текст об играх, принимающих шейдер-паки, теперь читается как «in games that **support** them».
- **Область действия заголовков**: набор игр, где работают паки, не изменился по сравнению с предыдущей сборкой.

### 49. Внутрянка движка: как Lite-рендерер вызывает ваши хуки

Всё в §40–§48 — это то, что вам сообщают загрузчик и заголовок. Этот и следующие разделы документируют, что движок на самом деле делает во время выполнения; всё это восстановлено из продакшн-бандла (Lite-рендерер — чанк на 175 КБ; настоящее имя исходного файла интеграции `lite/terrainShaderPack.ts` сохранилось в его строках ошибок). Ничто из этого не меняет того, что вы пишете, но убирает догадки о том, что получают ваши хуки — и закрывает несколько вопросов, которые другие руководства сообщества до сих пор числят открытыми.

Рендерер не «вызывает» ваши хуки из JavaScript. Когда пак проходит валидацию, движок **вставляет вызовы ваших хуков в собственный WGSL террейна**, заменяя фиксированные якорные строки в тексте шейдера. Якорь должен совпасть ровно один раз — ноль или несколько совпадений прерывают работу с `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Стадия | Якорная строка в шейдере движка | Что вставляется |
|---|---|---|
| vertex | блок из четырёх строк от `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` до `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);` | собрать `BloxdVertexIn`, вызвать ваш vertex-хук, записать `worldPos` обратно — вставка ещё и переписывает `let worldPos` в `var worldPos` |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | собрать `BloxdSurfaceIn`, вызвать ваш surface-хук, записать `baseColor` / `alpha` обратно |
| lit colour | прямо перед `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` | `let bloxdSpLitColour = color.rgb;` — захватывает цвет до тумана |
| light | финальная строка `return color;` во фрагментном шейдере | собрать `BloxdLightIn`, вызвать ваш light-хук, записать `color` обратно — после смешивания с туманом |

Вставленный код, восстановленный из отгруженного бандла (выражения уровней света местами сокращены, где форматирование движка слишком длинное):

```wgsl
// vertex-стадия — не-strict варианты с vertex-хуком
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* your bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// fragment-стадия — surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* your surface hook */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // вставляется, только если программа жидкостная или вариант не-strict
```

```wgsl
// fragment-стадия — light
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // directional
        ambient,                                 // ambient
        /* varying уровня света */.rgb,          // blockLight
        /* sky-канал того же varying */,         // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* поле ручного света (см. ниже) */,     // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour — чёрный только при полном отсутствии тумана
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* your light hook */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

Из этой вставки напрямую следуют четыре факта о принуждении:

- **Strict-террейн игнорирует изменения alpha из surface-хука.** Запись `alpha = bloxdSpSurface.alpha` вставляется только для жидкостных программ или не-strict вариантов — реализация, стоящая за таблицей макросов из §46. (В strict-террейне ваш код `#ifdef BLOXD_ALPHA` и так не компилируется; теперь ещё подтверждено, что незащищённые записи alpha там отбрасываются.)
- **Strict-вариант, который всё же объявляет vertex-хук, никогда его не запускает** — движок сообщает об этом во время сборки: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. Поэтому официальный шаблон (§45) оборачивает `bloxdLiquidVertex` в тот же `#ifndef BLOXD_STRICT`, что и его террейн-близнеца.
- Идентификаторы `bloxdSp*` — **всего 14**: `bloxdSpVertexIn`, `bloxdSpVertex`, `bloxdSpSurfaceIn`, `bloxdSpSurface`, `bloxdSpLightIn`, `bloxdSpLight`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, `bloxdSpPositionW`, `bloxdSpZ`, `bloxdSpEye`, `bloxdSpScale`, `bloxdSpBehind` — временные переменные движка. Ваш код их никогда не видит, но они всплывают в диагностике и в любых результатах обратной разработки, так что их стоит узнавать с первого взгляда.
- **Сокращение для дефолтного surface.** Когда surface-хук варианта — буквально `bloxdDefaultSurface`, движок вообще не вставляет строки записи `baseColor` / `alpha` — дефолт и так выдаёт эти значения, так что присваивание было бы мёртвым кодом. Неизменённые цепочки хуков ничего не стоят.

**Что на самом деле питает `BloxdLightIn`** — поле за полем, из вставленного кода:

| Поле | Источник на стороне движка |
|---|---|
| `litColour` | цвет фрагмента, захваченный прямо перед смешиванием с туманом (якорь `bloxdSpLitColour`) — «before emission and fog», как говорит заголовок |
| `directional` | `vTerrainLambert` — интерполированная по вершинам сумма `max(0, dot(normal, lightDirection)) × intensity` по направленным светам сцены (формула в §54); 0, если в сцене их нет |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — по материалу, на кадр |
| `blockLight` | `.rgb` декодированного varying уровней света (декодирование в §54) |
| `skyLight` | sky-канал того же varying уровней света — *"Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING"* (текст заголовка) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | поле ручного света, собранное из w-канала varying уровней света вместе с кадровыми uniform `uHeldLightPos` / `uHeldLightColour` ([часть VII](../internals/) §26 документирует затухание и поведение пола каналов) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **чёрный только в сцене без тумана вообще** (режим 0, §50) |
| `fogVisibility` | ограниченный коэффициент тумана — точное значение, которое возвращает функция из §50 |
| `position` / `normal` | varying `vPositionW` / `vNormalW` (нормаль перенормируется на фрагмент) |
| `blockFlags` | flat varying `vBlockFlags` — полный путь доставки из §52 |

Для ориентации при чтении старого материала: идентичная архитектура вставки существовала в рендерере v2, а единственные интеграционные отличия v3 — `vBlockId` → `vBlockFlags` и добавленные жидкостные варианты. Система хуков архитектурно стабильна, несмотря на разрыв между v2 и v3.

### 50. Функция тумана: четыре режима, одно поле

Восстановлено дословно из продакшн-шейдера террейна:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // линейный
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // экспоненциальный
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // экспоненциальный в квадрате
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = туман выключен (коэффициент остаётся 1.0)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)` — один vec4 управляет всем.
- **В шейдере существуют четыре режима: 0 = выкл., 1 = экспоненциальный, 2 = экспоненциальный в квадрате, 3 = линейный.** `fogVisibility` — это ограниченный коэффициент, какой бы режим ни работал — поле ровно одно, и флаг режима никогда не выставляется пакам.
- Собственные заголовки Bloxd используют режим 3 (линейный) с 32-блочной полосой, описанной в [части VII](../internals/) §25 (`fogStart = 32 × D`, `fogEnd = 32 × (D + 1)`), так что наблюдение «всегда линейный» из той части по-прежнему верно для штатных игр. Однако экспоненциальные режимы — настоящий живой код движка: заголовок может переключить `vFogInfos.x` и изменить кривую без обновления клиента. Рецепты дистанции, которые сами считают `distance(l.position, bloxdEyePosition())` (рецепт R-B), — надёжный способ писать завязанный на дистанцию вид, поскольку переключение режима их не сдвинет.
- Это закрывает вопрос «какую кривую тумана движок на самом деле использует» по исходникам: реализованы все четыре; поставляемые заголовки используют линейный. (Та же функция объясняет и комментарий заголовка о fogColour — режим 0 единственный, где `fogColour` приходит чёрным, а игры Bloxd никогда не поставляют режим 0; вместо этого они отодвигают туман далеко, [часть VII](../internals/) §25.)

### 51. bloxdOpaqueBehind(): точная реализация

Вся функция, восстановленная дословно из продакшн-билда:

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

- **Текстура глубины живёт на `@group(3) @binding(1)`** — группа 3 — собственная группа пака: binding 0 — 64-байтный uniform `bloxdPackInputs` (§41), binding 1 — эта текстура глубины. Оба ресурса предоставлены движком, и вы не можете обращаться к ним по имени.
- **Текстура глубины — unfilterable-float, ресурс только для фрагмента.** Раскладка bind-group регистрирует её как `texture: { sampleType: "unfilterable-float" }` с видимостью только `GPUShaderStage.FRAGMENT` — именно поэтому `bloxdOpaqueBehind()` построен на `textureLoad` (явные координаты тексела, mip 0), а не на `textureSample`: аппаратная фильтрация для этой текстуры просто недоступна.
- `z ≤ 0` означает, что выборка глубины ни во что не попала (дальняя плоскость / небо): `found = false`, а `position` / `distance` бессмысленны — всегда сначала проверяйте `found`.
- Возвращаемая позиция — **пересечение с масштабированием луча**: непрозрачная поверхность ставится в `eye + (fragment − eye) × max(z / viewDepth, 1)`. `distance` измеряется от глаза до этой точки — для паков, рисующих воду, это фактически «сколько воды луч прошёл до удара во что-то твёрдое», что и заставляет рецепты воды с тинтом по глубине работать без второго буфера глубины.

### 52. blockFlags от начала до конца: от регистрации до вашего хука

§42 рассказывает, что означают биты. Этот раздел — полный путь, который бит флага проходит от регистрации блока до вашего хука — каждый шаг подтверждён по продакшн-исходнику, что также доказывает «the same across the face» из заголовка вплоть до уровня байтов.

**1. Регистрация (база определений блоков).** Флаги каждого блока вычисляются один раз, при регистрации:

```js
flags[id] = nameFlags                     // правила отображаемого имени (§42): vegetation / dirt / sand / rock
          | (definition.opaque === true ? 1 : 0)   // бит opaque — данные непрозрачности движка
          | (anyFaceEmission >= 1       ? 2 : 0);  // бит emissive — данные свечения блочного света
```

Правила отображаемого имени покрывают только четыре материальных бита; два физических бита приходят из отдельных данных движка — `opaque` прямо из определения блока, `emissive` из массива свечения блочного света по граням. «Glowing ores count, however faint» из заголовка — буквально: любая грань с излучением ≥ 1 ставит бит.

**2. От блока к материалу (инициализация мешера).** Террейн рисуется по *материалам*, а не по id блоков, поэтому флаги перетабулируются в таблицу материалов (`Uint16Array` с индексацией по id материала, каждый материал берёт флаги первой грани своего блока). Таблица отправляется в Web Worker мешинга — но **только в конфигурациях, где включён конвейер паков**; иначе таблица `null`, и байты флагов не записываются вовсе. Игроки без паков не платят ничего — так устроено конструкцией.

**3. В байты вершин (worker мешера).** Флаги едут в двух свободных байтах существующих интерливинг-данных вершины:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // младшие 8 бит → альфа-байт атрибута цвета
        buffer[o + normalOffset + 3] = flags >> 8;    // старшие 8 бит → w-байт атрибута нормали
    }
}
```

Все четыре вершины грани получают одно и то же значение — смысл «the same across the face» на уровне реализации.

**4. Декодирование на стороне GPU (шейдер террейна Lite).** Два байта едут как вершинный атрибут `blockFlagWords: vec2u` (location 7, присутствует только когда конвейер паков включён) и собираются обратно на vertex-стадии:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags` объявлен `@interpolate(flat)` — константа на грань вплоть до fragment-стадии, поэтому битовые проверки из §42 стабильны внутри грани и никогда не дают смешивания посередине грани.

- Конвейер резервирует **16 бит** ёмкости (декодирование собирает два полных байта), тогда как v3 определяет только 6 — будущие флаги могут появиться без очередного изменения формата вершин или бампа API.
- В режиме упакованных вершин те же два байта едут внутри `packed.y` и старшего байта слова цвета вместо выделенного атрибута — те же значения, другой контейнер.
- О вопросе «листва или трава», который чаще всего задают про эти флаги, см. [Листва без травы](#листва-без-травы-вопрос-который-задают-все) в §42.

### 53. Внутрянка валидации: HEADER_VERSION, сигнатуры, зарезервированные имена

**Измеренный хэш заголовка.** Каждая валидация пака штампуется `HEADER_VERSION` движка. Прямое исполнение продакшн-модуля валидации (см. заметку о стенде в конце §54) даёт измерение:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← измерено из живого продакшн-бандла
```

Это хэш FNV-1a-32 (с префиксом `6.`) от пяти входов: заголовок движка, препроцессированный и токенизированный **по варианту** (одна запись на каждый из 8 вариантов), полный лексический универсум парсера WGSL, четыре имени макросов, карта специальных функций и объявление `BloxdPackInputs` вместе со строкой uniform `@group(3) @binding(0)`. Два следствия для авторов:

- **Любая правка заголовка на стороне движка пересчитывает хэш** — это механизм автоматической пометки «нужна перепроверка», которую сохранённые паки получают после обновлений движка ([часть VIII](../history/v2.md) §31).
- Хэш покрывает *заголовок движка*, а не ваш код. Пак, который продолжает загружаться после обновления движка, не «всё ещё валиден» — просто он пока не задел изменение заголовка. Единственная проверка версии, в которой участвует ваш манифест, — ворота `apiVersion` (§40).

**Проверка сигнатур хуков: точность по токенам в типах, свобода в именах.** Валидатор держит одну сигнатуру на слот хука:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

Сопоставление **токен за токеном**: имена типов параметров должны совпадать точно, `->` и возвращаемый тип должны совпадать точно, а количество параметров и расстановка запятых проверяются. Имена параметров свободны — любой идентификатор на месте параметра принимается, поэтому ваш `fn bloxdTerrainLight(s, l)` компилируется, хотя шаблон пишет его `(surface, light)`. Light-хук принимает ровно два параметра.

**Зарезервированные имена.** Правило — один regex: `/^bloxd/i`. Любой идентификатор, начинающийся с `bloxd`, зарезервирован — все идентификаторы `bloxd*` предоставляет движок, и пак не может объявлять что-то в этом пространстве имён (поэтому же повторные объявления `bloxdPi` / `bloxdTau` из §44 конфликтуют).

**Специальные функции.** В v3 зарегистрирована ровно одна:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

«Специальная» значит *привязанная к макросу* — функция движка, доступность которой зависит от символа варианта. Две диагностики guard'ов обеспечивают правильное использование:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — vertex-хук, дотягивающийся до функции, доступной только surface/light-хукам.
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — например, `bloxdOpaqueBehind()` на стороне террейна без обёртки `#ifdef BLOXD_SCENE_DEPTH`.

**Заголовок движка (прелюдия) закреплён.** Заголовок v3 — строка длиной 5 637 байт, начинающаяся с `// Engine-provided and read-only, prepended to all packs. apiVersion 3.` Он несёт директивы `#if` / `#ifdef`, которые собственный препроцессор движка вычисляет для каждого варианта — движок действительно вычисляет выражения `#if`, а при некорректном выражении возникает ошибка `Cannot evaluate #if ...`. Каждая структура, сигнатура функции и цитируемый комментарий в этом руководстве происходят из этого отрендеренного текста, поэтому руководство и поставляемый заголовок не могут разойтись. Полный текст приведён дословно в конце §54.

**Заметки о парсере для авторов.**

- Функции на стороне пака переименовываются с префиксом `pack_` при слиянии в шейдер движка (избегание коллизий); диагностика отображает их обратно в ваши исходные имена — тот же механизм, который [часть VIII](../history/v2.md) §38 описывает для второй ступени валидации.
- Сообщение о необъявленном идентификаторе читается как `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`; `_ can only be the target of a phony assignment, as in _ = f();` и `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.` дополняют недавно подтверждённый набор.
- Лексический универсум парсера включает идентификаторы, которые **не являются стандартным WGSL**: `bufferView`, `bufferArrayView`, `bufferLength`, `atomicStoreMax`, `atomicStoreMin`. Движок знает их как встроенные, но гарантии, что конкретная реализация WGSL в браузере их предоставляет, нет — никогда не стройте на них распространяемый пак.

### 54. Подтверждённые константы, лимиты и раскладки

Полная раскладка ресурсов террейн-программы, прямо из продакшн-рендерера Lite:

| Binding | Содержимое |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms` — `viewProjection` mat4x4f, `view` mat4x4f, `vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`, `uSkyLightColour`, `uAmbientLightColour`, **`vFogInfos`**, `vFogColor`, `outputHeight`, `sceneAmbient`, **`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: storage `array<vec4f>` — xyz = перенос в кадр рендера, w = видимость при появлении |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`, `ambientAndCutoff`, `emissiveAndLevel`, `anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — uniform пака (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — текстура глубины (§51) |

- **Направленные света жёстко ограничены четырьмя.** Рендерер завершается с ошибкой `Terrain supports 4 directional lights, not ${n}`, если сцена пытается зарегистрировать больше. `l.directional` — суммарный Ламберт по стольким, сколько есть (0–4; собственные сцены Bloxd используют 2 — [часть VII](../internals/) §27). Кроме того, террейн предупреждает о светах, которые не может учесть, дословно: свет, добавленный поздно — `Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`; тонированный — `Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`; и свет с фильтрацией мешей — `Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **Именование террейн-программы**: ключи кэша пайплайна читаются как `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}` — пак обнаруживается по суффиксу `-sp{variant}`, одна программа на вариант из §46. Наблюдатель (`watchPipelineFailures`) сопоставляет имена живых пайплайнов с `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/` и перепроверяет соответствующий вариант пака при сбое компиляции пайплайна; потеря GPU-устройства (`device.lost`) проверку пропускает.
- **`BLOXD_TERRAIN_DIRECTIONAL` — внутренний макрос движка** (определён при dirLightCount > 0). Это *не* один из четырёх макросов прелюдии, и он никогда не доходит до кода пака — но появляется в дампах WGSL собственных шейдеров движка, так что узнавание его экономит путаницу.
- **Декодирование уровней света**: вершинный атрибут `aPackedLightLevels` — один f32, упаковывающий четыре ниббла, каждый делится на 15: rgb = цветной блочный свет, a = канал неба / ручного света. Vertex-стадия декодирует его в varying `vLightLevels`; `blockLight` читает `.rgb`, канал неба / ручного света читает `.w`. Движок поднимает rgb-каналы до пола в 35% ярчайшего канала перед интерполяцией — якорь на стороне движка для подъёма, который [часть VII](../internals/) §26 описывает со стороны геймплея.
- **`vTerrainLambert`** (источник `directional`, §49) генерируется как сумма по активным направленным светам: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, под guard'ом `BLOXD_TERRAIN_DIRECTIONAL`.
- **Индексные буферы становятся 32-битными на первом крупном меше.** Lite-рендерер выбирает индексы `Uint16Array`, только пока каждое значение индекса остаётся ≤ 65 534 — как только любой индекс достигает 65 535, буфер становится `Uint32Array` (отслеживается для каждого буфера флагом `is32Bits`). На практике: меш чанка не более чем с 65 535 вершинами помещается в 16-битные индексы; меш ровно с 65 536 вершинами неизбежно выдаёт индекс 65 535 и переключает весь буфер на 32 бита.
- **Детали загрузки манифеста**: zip-записи под `__MACOSX/`, файлы с префиксом `._` и `.DS_Store` отфильтровываются (шум macOS-архива); `pack.json` ищется сравнением путей в нижнем регистре — ноль совпадений → `loadNoManifest`, два и более → `loadDuplicateManifest`; чтение манифеста ограничено 65 536 байтами.
- **Как всё это проверялось**: модули продакшн-бандла были восстановлены (165 чанков; реестр webpack насчитывает 4 951 модуль в этом бандле — счётчик модулей смещается на несколько штук в зависимости от того, включены ли асинхронные дочерние зависимости, так что точное число стоит считать привязанным к конкретному бандлу) и исполнены в webpack-совместимом стенде под Node.js. Измеренный `HEADER_VERSION` (§53), отрендеренный заголовок на 5 637 байт, канонический порядок таблицы вариантов и карта специальных функций — всё это получено *исполнением отгруженного кода*, а не чтением строк. Тот же стенд — естественное ядро для сообщественного `pack_check` v6: исполнение собственного валидатора движка против пака в точности воспроизводит его вердикты.
#### Заголовок движка v3, дословно

Сам закреплённый текст в 5 637 байт (127 строк) — тот артефакт, который описывает §53 выше — дословно восстановлен из билда `3ymzdd`, v3-продакшн-билда этой части. Это v3-аналог v4-заголовка из [Части XI](../api/texture-catalog.md) §67, приведён целиком по той же причине: v3-пак можно отлаживать ровно против того текста, который движок ему предпосылал, и каждую разницу v3 → v4 ([Часть X](../history/v4.md) §58–§59) можно прочесть прямо, положив два текста рядом.

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

Исследование: ltf_ahel (исследование проведено с помощью glm)

---


## Часть X: руководство по миграции на API версии 4 (2026-10-26, конспект)

> **Заменено 2026-11-03: текущий API — версия 5** — паки v4 отклоняются при загрузке ровно так, как описано здесь для v3. Примените эту часть *и затем* [Часть XII](../history/v5.md) (v4 → v5: структура `BloxdFlags` заменяет `blockFlags`, `bloxdLit()` и публичный рецепт освещения, входы зачарования/оверлея, дефолтный пак с 9 хуками). Внутренности этой части (§56–§66) остаются верными для тех v4-билдов, на которых они были измерены.

> Это краткий конспект на данном языке. Полная версия со всеми деталями, примерами-рецептами и восстановленными внутренностями движка (§55–§66) доступна на [английском](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md) и [японском](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md).

Целевой билд: `cnty9.main.669f8081.js` — **в продакшене и предпродакшене одновременно с 2026-10-26** (оба байт-в-байт совпадают). Модель пака сохраняет форму: те же поля `pack.json`, те же лимиты загрузчика, тот же uniform на 64 Б, те же 6 хуков.

Перепроверено на `tcwczu.main.357faec1.js` (2026-10-30, продакшен и preprod снова побайтово идентичны): **весь API v4 без изменений** — заголовок, шаблон стандартного пака, 27 символов `bloxdSp*`, лимиты загрузчика и 12 разрешённых тайтлов побайтово совпадают с задокументированной здесь базой `cnty9`. Компоновка бандла снова изменилась (например, кластер теперь c51–c56), но для пака это не видно; реестр имён текстур заново не измерялся (имена остаются стабильным API).

### Что меняется

- `pack.json` требует `"apiVersion": 4` (строгое `===`, число) — паки v3 отклоняются при загрузке.
- **Новый текстурный API (главное):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` сэмплит атлас блочных текстур ровно так, как это делает сам движок (id 0 = белый; анимированные текстуры автоматически дают текущий кадр), `bloxdTextureSize(mipLevel) -> vec2u`, и именованные константы `bloxdTextureId*` (CamelCase из имени файла, напр. `grass_top` → `bloxdTextureIdGrassTop`; полный каталог всех 905 доступных имён встроен как §68 в Часть XI (`11-reference.md`)).
- **Четыре новых входных поля** в `BloxdSurfaceIn` *и* `BloxdLightIn`: `textureId`, `textureRotation` (четверти оборота по часовой, применяет `bloxdTexel`), `uv` (в блоках; рисуется `fract(uv)`), `mipLevel`.
- **Переименования со сменой смысла:** `fogVisibility` → `fogAlpha` с **инвертированным** смыслом (`0 = без тумана, 1 = только fogColour`; порт: `l.fogVisibility` → `1.0 - l.fogAlpha`); `bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (тело идентично); `BloxdOpaqueBehind.found` → `hit`.
- **Строгие игры теперь принуждаются встроенным валидатором:** незащищённый вершинный хук или достижимый `discard` даёт `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...` и отключает **все** хуки в строгих играх. С обёртками `#ifndef BLOXD_STRICT` surface/light продолжают работать.
- Всё остальное заморожено: 6 хуков, биты `blockFlags` (1/2/4/8/16/32), раскладка uniform, лимиты загрузчика, матрица вариантов, 12 allow-титулов (переподтверждены без изменений на `cnty9` 2026-10-27).

### Краткая миграция

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (число) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` или `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| Незащищённые вершинные хуки | `#ifndef BLOXD_STRICT ... #endif` |

Полный справочный материал теперь входит в руководство: целиком восстановленный заголовок движка и полный каталог текстур со всеми 905 доступными именами находятся в Части XI (`11-reference.md`). Полные детали — тонкость поворотов в `bloxdTexel`, восстановленный WGSL сэмплинга, реестр имён, новая структура `HEADER_VERSION` с хешем реестра — в полной английской и японской версиях.



---

### 67. Полный заголовок движка v4, дословно

Заголовок в 6 021 байт (150 строк), который движок дописывает перед каждым паком — первая строка `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.` Не входят: пара `bloxdTexel`/`bloxdTextureSize`, генерируемая по конфигурации рендера (§63.1), и 27 символов `bloxdSp*` (§63.4). Ворот `#ifdef BLOXD_ALPHA` разрешается препроцессором движка по вариантам.


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


## Часть XII: Руководство по миграции на API версии 5 (2026-11-03, кратко)

> Это краткое резюме для данного языка. Полная версия со всеми деталями, примерами рецептов, полностью восстановленным заголовком v5 и внутренностями движка (§69–§82) доступна на [английском](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/12-apiv5.md) и [японском](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/12-apiv5.md).

Целевой билд: `ab90qa.main.6188124c.js` — **в продакшене и preprod одновременно (измерено 2026-11-03)**, оба бандла идентичны побайтно (md5 проверен). Это крупнейший пересмотр API со времён v3: заголовок движка вырос с 6 021 до **8 954 декодированных байт**, и почти каждая структура получила поля.

### Что меняется

- `pack.json` требует `"apiVersion": 5` (строгое `===`, число) — паки v4 отклоняются при загрузке; сохранённые v4-паки молча неактивны.
- **`blockFlags` заменён структурой (главное изменение):** шесть битовых констант `bloxdBlockFlag*` исчезли; вместо них **`flags: BloxdFlags`** — 14 именованных bool-полей (шесть — старые биты под новыми именами, восемь новых): **`slab` `stairs` `flat` `placed` `held` `dropped` `thrown` `lifeform`**. Модели, предметы в руке и существа теперь отличимы от рельефа.
- **`#ifdef BLOXD_LIGHTING` удалён:** переключатель времени компиляции заменён runtime-проверкой новой функции **`bloxdLit()`**; uniform получил `lit: u32` (смещение 4, суммарно по-прежнему 64 Б). Матрица вариантов сократилась с 8 до 6 (`strict|allow` × `terrain|liquid|model`).
- **Рецепт освещения движка стал публичным:** три новые функции — **`bloxdShading(light)`**, **`bloxdWorldLight(light)`**, **`bloxdLitColour(surface, light)`** — плюс два новых входа `BloxdLightIn` (`diffuse`, `emissive`).
- **Новые входы:** `localPosition: vec3f` (координаты модели, 0 для рельефа) везде; `enchantTier` / `enchantColour` / `enchantSpeed` / `overlayColour` (зачарование и вспышка урона) в Surface/Light; **новые выходы** `enchantColour` / `overlayColour` в `BloxdSurface`, смешивает `bloxdLitColour`.
- **Удалено:** `bloxdFragmentBlockPosition()` (без замены), константы `bloxdBlockFlag*`, `bloxdSpLitColour`.
- **Шаблон дефолтного пака теперь содержит все 9 хуков** (включая light-хуки, 1 122 → 1 683 байт), а новый комментарий документирует модель удаления: *"If you delete a hook, the default is used instead."*
- Новая константа в заголовке: `const bloxdChunkSize: i32 = 32;`. Y-производные автоматически инвертируются: `dpdy`/`dpdyCoarse`/`dpdyFine` переписываются как `(-dpdy(...))`. `HEADER_VERSION` стал `9.<hash>.<hash>`.
- Пространство `bloxdSp*` выросло с 27 до **46 символов**; реестр текстур теперь **896 пригодных имён** (+1 `scorpion_eggs`, −10 — в том числе семейство `chest_double_*` и `mob_spawner_*_block_side`) — имена это API, id лишь снимок.
- Всё остальное заморожено: лимиты загрузчика (256 `.wgsl` / 256 КБ / 64 КБ / 32 МБ / 1 024 записи), имена хуков, strict-контракт (12 allow-титулов), привязки группы 3.

### Миграция кратко

| v4 | v5 |
|---|---|
| `"apiVersion": 4` | `"apiVersion": 5` (число) |
| `(s.blockFlags & bloxdBlockFlagVegetation) != 0u` | `s.flags.vegetation` |
| `#ifdef BLOXD_LIGHTING … #endif` | `if (bloxdLit()) { … } else { return bloxdDefaultLight(s, l); }` |
| `bloxdFragmentBlockPosition(p, n)` | удалён — используйте `bloxdWorldPosition()` / `flags` |
| (раньше не было) | `s.flags.held`, `s.flags.lifeform`, `s.localPosition`, `s.enchantTier` … |

Полностью восстановленный заголовок v5 (8 954 байт, дословно) и полный список дрейфа имён текстур — в полных английской и японской версиях (§82 и §80).

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

## Штатное освещение движка и запас под реализм



Штатное освещение движка — «только умножение»: specular, fresnel, тепло-холодного разделения и полусферического окружения нет. Перестраивается вот что:

| Функция | По умолчанию | Строится в паках? |
|---|---|---|
| Диффуз (Ламберт) | Только скалярная сумма направленного | ◎ Своё через `bloxdSunDirection()` (обёртки и т.д.) |
| Спекуляр | Нет | ◎ Blinn-Phong (R9.2) |
| Френель | Нет | ◎ Аппроксимация Шлика (R9.3) |
| Разделение тёплый факел / холодное небо | Бесцветно | ◎ (R9.1) |
| Полусферическое окружение | Без направления | ◎ Небо сверху / земля снизу (R9.4) |
| Тонемаппинг | Нет (только clamp) | ◎ ACES filmic (R9.5) |
| Воздушная перспектива | Только туман (замена цвета) | ◎ Обесцвечивание вдаль (R9.6) |
| Детали поверхности | Только разрешение текстур | △ Процедурный hash-микробамп (R9.8) |
| Волны вершин (вода) | Нет (плоско) | ◎ Только allow (R7) |
| Волновые нормали / солнечный глиттер | Нет | ◎ (R9.7) |
| Ночной лунный свет | Цвет неба просто темнеет | △ Лунное направление в `-bloxdSunDirection()`: псевдо-виды (синее окружение в R2 / обесцвечивание в R9.11) плюс направленный лунный свет (R-A, лишь цикл день/ночь) |
| Тени (небесное затенение) | Лишь мягкий микс `mix(ambient, sky, skyLight)` | ◎ Инверсия лифта + пороговый срез + солнечный гейт (R9.12). Тень деревьев и подкровельная падают чётко, за правками блоков следуют в реальном времени |

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

## Интегрированный рецепт естественно выглядящей воды



Этот API не умеет сэмплить цвет сцены: это **псевдо-стилизация смешением цвета по френелю и солнечными бликами, а не настоящее отражение/преломление** (математика глубины стала возможна в v2 с `bloxdOpaqueBehind()`, вынесена в [часть VIII](../history/v2.md) R-E). Сэмпл сохраняет базовый цвет, подмешивает немного к небесному на скользящих углах и добавляет маленький глиттер только при солнце.

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

Ориентиры настройки:

- Вода белая/выстиранная: снижайте `0.38` в `fresnel * 0.38` и глиттер `0.55`.
- Вода слишком тёмная: подмешайте чуть больше `fakeSkyReflection`. В переборе выглядит пластиком.
- Линии или регулярные полосы на воде: снижайте частоты волн и силу глиттера. Этот код не двигает вершины меша.
- Хотите настоящие отражения пейзажа: во входах этого API нет цвета экрана, смешением цветов настоящее отражение не получить (глубина доступна только для жидкостей. [Часть VIII](../history/v2.md) R-E).

Этот рецепт **заменяет** существующий `bloxdLiquidLight`. Не клейте его рядом с одноимённой волновой функцией из R9.7 и другими одноимёнными хуками.


### Подводная реальность с шейдер-паками



Подводные виды состоят из 3 слоёв:

| Слой | Содержимое | Управляется из паков? |
|---|---|---|
| ① Рендер террейна/жидкости | Обрабатывается хуками. Light-хуки под водой вызываются штатно | Да (работает «под вуалью») |
| ② Вуаль definition-жидкости | Эмиссивный фулскрин-квад из definition-цвета/альфы жидкостного блока камеры, рисуемый вне пайплайнов хуков (самым передним). Игровая настройка `cameraTint` побеждает, если задана | Нет (ни цвет, ни плотность не меняются) |
| ③ cameraTint | Настройка игры | Нет |

Практические пункты: паки продолжают работать под водой / вуаль не снять / под водой не разветвиться (fogStart / fogEnd / fogColour под водой не меняются: fogVisibility её тоже не детектирует).

---

## Чиним «тёмные тени, но светлые поверхности» ночью



Затемнение только теней оставляет готовый цвет движка (`engineColour`) ярким без солнца, и разрыв грань/тень выглядит неестественно. Гасите весь готовый цвет.

Пример трактует нулевой `bloxdSunDirection()` как ночь, а направленное солнце — как день, гася готовые цвета террейна в тёмные часы. Где сильны `blockLight` и `heldLight`, затухание слабеет, чтобы сберечь ближний свет вроде факелов. `0.52` — настроечное значение, для более тёмных ночей снижайте.

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
    // гасим готовый цвет; emission материала добавляем штатно через туман
    out.colour = l.engineColour * scale + s.emission * (1.0 - l.fogAlpha);
    return out;
}
```

**Ограничения этого фикса:** если `bloxdSunDirection()` ведёт себя как «единичное направление при солнце, ноль без него», день/ночь различимы, но сумерки плавно не оценить. А раз гасится готовый цвет, engine-дневной свет и ambient слабеют вместе — не полное воспроизведение времени суток. Чтобы применить то же к жидкостям, проверьте fallback-отношения жидкостных хуков.

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

## Две школы реализации



**Школа A: аддитивные правки (от defaultLight)** — берём `engineColour` (готовый цвет) за основу и добавляем тёплое свечение или rim. Легко и безопасно, но модель освещения остаётся штатной.

**Школа B: полное переосвещение (от s.colour)** — отбрасываем `l.engineColour` и пересобираем свет из `s.colour` (альбедо) и сырого LightIn-материала. Настоящий путь к реализму. Четыре правила:

1. **Накладывайте туман заново**: light-хук идёт после тумана; применяйте `mix(l.fogColour, col, (1.0 - l.fogAlpha))` сами (R9.10). При густом тумане кладите пол `min(l.fogAlpha, 0.70)`. И наоборот: домешивать цвет тумана в паки на engineColour — белый двойной туман
2. **Unlit-фолбэк**: вне `#ifdef BLOXD_LIGHTING` — сквозной проход в `defaultLight`
3. **Общие функции — целиком в guard**: общие функции с параметром `BloxdLightIn` оборачивайте в `#ifdef BLOXD_LIGHTING` целой fn (защитить только вызовы недостаточно)
4. **Без направления солнца**: при нулевом `bloxdSunDirection()` направленный спекуляр не считайте. `l.directional` — скаляр количества света, а не вектор направления: направление блика не восстановит. При нужде переключайтесь на слабый ненаправленный ambient. Лунное направление доступно через `-bloxdSunDirection()` (движется лишь в мирах с циклом день/ночь. [Часть VII](../internals/) R-A)

---

## Недостижимые виды («потолок» реализма)



| Вид | Причина |
|---|---|
| Попиксельные карты теней (тени, вращающиеся за солнцем, полутень) | Текстуры глубины не сослаться (жидкостный `bloxdOpaqueBehind()` — лишь геометрия, для карт теней непригоден). Затенение лучей в хуки не подаётся |
| SSAO | Нет доступа к глубине сцены (только запечённая вершинная AO мешера; жидкостная глубина для SSAO непригодна) |
| SSR (отражения) | Цвета сцены нет. Только псевдо-виды с подмесом цвета неба через френель |
| Блум / глэр | Нет хука в постобработку |
| Глубина резкости, хроматическая аберрация, зерно | Нужен полноэкранный постпроцессинг |
| Объёмный свет (god rays) | То же |
| PBR-текстуры | Чтения текстур запрещены. Только псевдо-оценка по яркости цвета |
| Подводная рефракция | Цвета сцены нет. Жидкостная глубина (`bloxdOpaqueBehind()`) даёт поглощение по толщине и проекцию дна ([часть VIII](../history/v2.md) R-E) |
| Подводная вуаль (синий тинт): снятие / изменение | Вуаль — эмиссивный фулскрин-квад из definition-цвета/альфы жидкостного блока камеры, рисуемый вне пайплайнов хуков (самым передним), так что пак не меняет ни цвет, ни плотность |
| Прямое подводное детектирование | Нет поля, показывающего погружение камеры, и fogStart / fogEnd / fogColour под водой не меняются: надёжного способа оценить и из fogVisibility и др. тоже нет |

### Правда о тенях — «тени деревьев» делаются

В таблице невозможны только **вращающиеся за солнцем попиксельные карты теней**. Движок считает «тени» с самого начала, и это `skyLight`. Меш-сторона LightEngine работает по майнкрафт-образному алгоритму:

1. **Сканирование столбцов**: каждый столбец (x,z) сверху вниз. Свет неба стартует с 15, на непрозрачных блоках становится **0**, спускаясь с затуханием по `lightFilter` (воздух 1 / вода 3 / непрозрачное 15)
2. **BFS-заливка**: растекается вбок на 6 соседей (-1 за блок) — вот что смягчает кромки теней. Сырое значение под затенением радиуса r равно (15-r)/15
3. blockLight (факелы и т.п.) — отдельный BFS из 3 RGB-каналов (4bit-пак)

То есть `l.skyLight` — не просто параметр яркости, а **воксельные данные затенения «видно ли отсюда небо» = карта теней**. Под деревьями, под крышами и внутри она численно уже низкая и приходит сглаженной вершинной интерполяцией. Ставите/ломаете блоки — мгновенный пересчёт = **тени, следующие в реальном времени**. Ванилла использует её лишь «мягко» через `mix(ambient, sky, skyLight)`.

Правильные инструменты — два шага R9.12 (**восстановить сырые значения инверсией лифта → бинаризовать пороговым `smoothstep`**. `th = 1 - r/15` напрямую крутит «радиус затенения, считаемый тенью») плюс **открыть прямое солнце через sky** (солнце достаёт только туда, где видно небо = суть проекции), с тёплым солнцем / холодной тенью в окраске.

**Честные ограничения**: эти тени опираются на «небо сверху», поэтому **за солнцем не вращаются**. Разрешение — поблочное (мягкие кромки — от BFS-рассеивания). В шаблоне освещения до сих пор лежит закрытый стаб `var shadow: f32 = 1.;` под карты теней (всегда 1.0 = выключен) — читается как след «запланированных» попиксельных вращающихся теней. Если такие тени кровь из носу нужны, остаются лишь вне-API пути (напр. GLSL-инъекция юзерскриптом, с риском по правилам).

### Подводная реальность

Подводные виды состоят из 3 слоёв:

| Слой | Содержимое | Управляется из паков? |
|---|---|---|
| ① Рендер террейна/жидкости | Обрабатывается хуками. Light-хуки под водой вызываются штатно | Да (работает «под вуалью») |
| ② Вуаль definition-жидкости | Эмиссивный фулскрин-квад из definition-цвета/альфы жидкостного блока камеры, рисуемый вне пайплайнов хуков (самым передним). Игровая настройка `cameraTint` побеждает, если задана | Нет (ни цвет, ни плотность не меняются) |
| ③ cameraTint | Настройка игры | Нет |

Практические пункты: паки продолжают работать под водой / вуаль не снять / под водой не разветвиться (fogStart / fogEnd / fogColour под водой не меняются: fogVisibility её тоже не детектирует).

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

## Чеклист тестов в игре



Успех компиляции и «красивый вид» — разные вещи. Проверяйте в этом порядке:

1. **Загрузка:** `pack.json` в корне ZIP. Сразу после выбора показывается `Ready. Reload the page to use it.`, а **активация происходит перезагрузкой страницы**; после неё проверьте `Ready to use`. Сохранённый пак при обновлении spec-заголовка движка автоматически перепроверяется при следующей загрузке страницы сверкой отпечатка содержимого заголовка (успех — остаётся активным / провал — метка blocked). Сломанный старый пак не остаётся тихо активным.
2. **6 вариантов:** без пропусков типовых guard'ов в strict / allow, свет вкл / выкл, террейн / жидкость. Даже если игра использует лишь часть условий, дистрибутивные паки должны исходить из всех 8.
3. **День:** цвета по материалам не выжжены (трава, камень, песок, дерево); естественный свето-теневой перепад верхов и боков.
4. **Ночь:** сравните те же материалы при былом свете, тени и близость факелов. Остаются только освещённые грани — крутите затухание экспозиции; всё темно — крутите защиту локального света.
5. **Вода:** смотрите сверху, под скользящими углами, берега, из-под воды и ночью по отдельности. Поведение alpha и подводный вид зависят от композита игры — никогда не судите с одной точки зрения. Под водой вуаль definition-жидкости кроет спереди, как выше: различия пака видны в основном на поверхности и террейне сквозь вуаль.
6. **Границы и даль:** без скачков волн/узоров на переходах чанков / origin; без двойного тумана и белой дымки вдали.
7. **Производительность:** тяжёлые по hash/тригонометрии/`pow` на фрагмент эффекты — по минимуму. Добавляйте детали постепенно и сравнивайте FPS.

### Известные ограничения как premises

- Паки ограничены хуками террейна / жидкостей — небо, сущности и UI тем же кодом не обрабатываются.
- Нет входов, чтобы добавить карты теней, screen-space-отражения, рефракцию, блум и т.д. (глубина сцены разблокирована только для жидкостей как `bloxdOpaqueBehind()`. См. [часть VIII](../history/v2.md)).
- `bloxdSeconds()` — время анимации без гарантированной связи с днём/ночью игры.
- При нулевом `bloxdSunDirection()` истинное направление луны неизвестно, не «лунная физика» а приближение настроения. Направленный лунный свет строится из `-bloxdSunDirection()` (лишь миры с циклом день/ночь. [Часть VII](../internals/) R-A).
- `s.position` / `l.position` — локальные координаты: прибавляйте `bloxdRenderOffset()` для эффектов, зависящих от мира. Для внутриблочных локальных узоров локальные координаты — осознанный инструмент.

---

## Комбинирование с другими паками, когда один шейдер упёрся в предел



Так как паки не могут добавлять или сэмплить текстуры, не пытайтесь решить мелкие рельефы материалов или картинки неба одними шейдерами. Публичный репозиторий текстурных паков для Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) ведёт текстуры, скайбоксы, модели и т.д. другим путём. Это не официальная спецификация API шейдер-паков — пример ресурсов другой системы, используйте как справку.

Для справки: в разобранном случае «cinematic shader»-раздач сообщества содержимым оказались текстурные паки (текстуры 128x128 без `pack.json` / `.wgsl`). Большая часть вида «шейдер с тенями» — ухищрения на стороне текстур; реалистично комбинировать подход «свет и тень разделяем шейдер-паком» (R9.12) с дополнением на стороне текстур.

На практике **свет и цвет крутите шейдерами, а материалы и небо закрывайте парным ресурс-паком**. Но со-использование и порядок загрузки сверяйте с реализацией игры и настройками.

У текстурных паков тоже есть спецификация (справочно): лимит размера — 25MB по длине JSON-строки после base64-преобразования; base64 раздувает PNG на +33%, так что практический потолок суммы исходных изображений — ~18-19MB. CSS обрабатывается упрощённым разбором через регулярные выражения — без вложенности и комментариев.

---

## Советы по отладке



- Слишком светлые пещеры → не хватает нелинейной кривой `skyLight` (рецепт пещер R2 / R9.9)
- Выжженные дни → снижайте экспозицию до ACES
- Слишком тёмные ночи → обеспечьте минимальный ambient (ночной `skyLightColour` по условию почти чёрный)
- Слишком дымные дали → снижайте воздушные коэффициенты
- Всё оранжевое вокруг факелов → снижайте тёплую долю (оставьте часть сырого крашеного света)
- Блоки почти сплошь белые → суммарный выход light-хука выше 1.0 (ниже по потоку clamp'а нет). Заканчивайте `clamp(col, vec3f(0.0), vec3f(1.0))`
- Бело без сложений → un-fog инверсия делением на fogVisibility. Уберите un-fog; пересоберите от `s.colour`, а туман `mix`'ом один раз в конце
- Эмиссивные блоки не светятся → пропущено досложение emission в рецептах пересборки. Добавьте `+ s.emission * (1.0 - l.fogAlpha)`
- Ночью остаются только освещённые грани → затемняйте не только тени; гасите весь готовый цвет (`engineColour`) ночью. Локальные лампы щадите слабее через `blockLight` / `heldLight` ([часть VI](../guides/), раздел 19)
- Тень не углубляется через `pow(skyLight, γ)` → `l.skyLight` пост-кривая (раздел 10). Переходите на инверсию + порог R9.12
- Настроить площадь/плотность тени → гайд настройки R9.12 (площадь = порог `shTh` / кромка = `shSoft` / темнота ядра = двухточечный сдвиг минимального ambient и небесного рассеяния)

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

## Рецепты цвета (surface)



### Один оттенок (самое базовое)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Буст / срез насыщенности

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 живее / -1.0 полный монохром
```

### Цветовая температура (тёплый ⇄ холодный)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = тепло (сильнее красный), -1.0 = холод (сильнее синий)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### Винтаж / сепия

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### Градиент высоты (тёплые низины)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 1..0 на высоте 0..50
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Покраска по ориентации грани (верх = светлее, стены = темнее)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // пол 1 / стена 0 / потолок -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // стены и потолки чуть темнее
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Постеризация (меньше цветов)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

---

## Рецепты освещения (light)



### S-кривая контраста

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### Дальняя дымка (свой туман)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 0..0.35 своего тумана с 64 до 192 блоков
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### Ночь (синий сдвиг по skyLight + защита ламп)

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

### Пещеры впотьмах (дожимаем места без skyLight)

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

> `skyLight` приходит пост-лифт (раздел 10): лёгкое затенение (под деревьями: сырое 0.87 → поднятое 0.97) этим методом почти не темнеет. Годится для пещер (сырое 0). Чтобы подчеркнуть «тень деревьев», используйте инверсию лифта + порог из R9.12.

### Синее ночное окружение (псевдо-вид без направления луны)

> В этом API `bloxdSunDirection()` равен нулю, когда в небе нет солнца. Ниже — не направленный лунный свет, лишь слабое синее окружение, когда небо тёмное. Само лунное направление доступно через `-bloxdSunDirection()` (только миры с циклом день/ночь. [Часть VII](../internals/) R-A).

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

### Закатное тепло (оттенок по высоте солнца)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 у горизонта / 0 в зените
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### Полная замена вывода движка (простейшее переосвещение)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    if (bloxdLit()) {
        // ПРИМЕЧАНИЕ: прямая конструкция BloxdLight(...) запрещена; переписывайте colour от default
        var out = bloxdDefaultLight(s, l);
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let level = clamp(sky * 0.7 + block, 0.0, 1.0);
        // отбрасываем engineColour (результат освещения движка) и ставим «базовый цвет × своя яркость»
        var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));   // engineColour отброшен: туман заново обязателен
        out.colour = col + s.emission * (1.0 - l.fogAlpha);   // emission тоже добавьте сами (обязательно)
        return out;
} else {
        return bloxdDefaultLight(s, l);
}
}
```

---

## Рецепты свечения (emission)



> `emission` добавляется после расчёта освещения, но штатная обработка **ослабляет его на `fogVisibility`. В полностью затуманенной дали свечение тоже гаснет. Чтобы светилось издалека, не добавляйте в emission — добавляйте напрямую как `out.colour += ...` внутри light-хука** (engineColour уже затуманен, так что вдали свет ложится поверх цвета тумана)

### Пульсирующие лампы (дышащие факелы)

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

### Светящаяся руда (светлые материалы светятся)

```wgsl
// сторона surface: чем светлее (белее) материал, тем больше emission
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### Рой светлячков (дрейфующие светящиеся точки)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // несколько медленно дрейфующих «световых шаров»; свечение по обратной дистанции
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

## Рецепты координат (мир / блок / взгляд)



### Мировые координаты

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### Координаты блока

```wgsl
let worldBlock = vec3i(floor(bloxdWorldPosition(l.position)));
```

### Шахматка (поблочно)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 или 1
out.colour *= mix(0.96, 1.04, checker);
```

### Поблочный псевдорандом (hash)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// применения: вариации травы, пятнистость камня и т.д.
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### Вектор взгляда и rim-подсветка

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### Угол взгляда (доморощенный френель — для жидкостей)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 в лоб / 0 по касательной
let fresnel = pow(1.0 - facing, 3.0);
```

---

## Рецепты времени (анимация)



> `bloxdSeconds()` заворачивается каждые 3600 секунд (1 час). Это прошедшее время шейдера без гарантии синхронизации с солнцем/днём-ночью игры. Для видимой периодической анимации годится, но для определения настоящей ночи предпочитайте `bloxdSunDirection()` и lighting-входы.

### Цикл день-ночь (1 сутки в час)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdSeconds() * 6.2831853 / 3600.0);   // 0..1 часовой период; не обязательно синхронен с днём/ночью игры
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### Покачивание (наложенные синусы)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### Плывущие полосы авроры / флуоресцентные ленты

```wgsl
// смешиваем 3 цвета по XZ-позиции и времени
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

---

## Рецепты жидкостей



### Рябая поверхность (мерцание цвета)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdRenderOffset().x);
    let worldZ = s.position.z + f32(bloxdRenderOffset().z);
    let ripple = sin(bloxdSeconds() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // у liquid всегда BLOXD_ALPHA — guard по привычке
    #endif
    return out;
}
```

### Псевдопрозрачность по высоте (не настоящий тест мели)

> В v1 глубину сцены и положение дна запросить было нельзя: настоящая глубина воды одним этим API не вычислялась. В v2 только для жидкостей `bloxdOpaqueBehind()` меряет толщину до непрозрачной грани позади ([часть VIII](../history/v2.md) R-E). Ниже — старый псевдоэффект без него: `s.position.y` — локальная координата, и в сыром виде эффект уплывёт вместе с origin чанка. Ниже — лишь изменение alpha по мировой высоте, псевдоэффект, а не мелководье по берегам/дну. `packWaterReferenceY` подгоните под высоту своего мира.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // ниже — тоньше, выше — ближе к базовой alpha; направление проверьте в игре
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### Подводная муть изнутри

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### Пак только-жидкости (террейн нетронут)

```wgsl
// вообще не пишите terrain_*-хуки. Тогда:
//  - варианты terrain = без хуков = дефолты движка
//  - варианты liquid  = действуют только liquid_*-хуки
```

---

## Рецепты вершин (только allow)



> Всё оборачивайте в `#ifndef BLOXD_STRICT`.
> Подробности условий (список allow-игр; Custom Games — strict) в §30: [§30 Режимы применения по играм](../internals/)

### Трава на ветру (шевелим только верхушки)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdSeconds() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // только вертикальные грани
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### Волны жидкости (только верхние грани)

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

### Пульсирующий террейн

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdSeconds() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // лёгкое расширение/сжатие вдоль нормалей
    return out;
}
#endif
```

### Волнующийся террейн (гигантские синусы)

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

## Математические трюки



```wgsl
// мягкое квантование 0..1 (n ступеней)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// двухуровневый порог (toon-тень)
let shadow = smoothstep(0.35, 0.37, level);   // ±0.02 вокруг порога дают ступени

// трёхуровневый toon
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// luma (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// мягкий пульс
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// треугольная волна (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// секунды → «медленная фаза» (для эффектов, игнорирующих цикл 3600 с)
let phase = t * 0.15;
```

---

## Реалистичные рецепты



> Физические рецепты для «пересборки ванильного вида из материалов». Сначала предпосылки:
>
> 1. **Light-хук вызывается на финальной стадии фрагмента**. Возвращённый цвет становится итоговым как есть. **Туман накладывайте сами** (R9.10)  
> 2. **Штатное освещение движка — только умножение**. Спекуляр / френель / тепло-холодное разделение / полусферическое окружение строятся с нуля  
> 3. `l.engineColour` — готовый цвет (уже с туманом). Пересборка из `s.colour` (альбедо) — основательный путь  
> 4. Текстуры запрещены → все детали только **процедурные** (hash/шум) (R9.8)

### R9.1 Тёплые факелы × холодный небесный свет

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
        let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
        let voxel   = max(torch, sky);
        var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // промежуточный clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                    // туман заново
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                 // emission досложить
}
    return out;
}
```

### R9.2 Солнечный спекуляр (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);          // половинный вектор
            let ndh = max(dot(n, h), 0.0);
            let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
            let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
            out.colour += spec * vec3f(1.0, 0.97, 0.90);
        }
}
    return out;
}
```

### R9.3 Френель Шлика

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
        out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // тонкая яркость кромок
}
    return out;
}
```

### R9.4 Полусферическое окружение (небо сверху / отскок земли снизу)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let upness = n.y * 0.5 + 0.5;
        let ground = l.ambientLightColour * 0.55;                          // снизу: отскок
        let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // сверху: небесный свет
        let hemi = vec3f(0.25) + mix(ground, skyH, upness);
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // промежуточный clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                           // туман заново
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                        // emission досложить
}
    return out;
}
```

### R9.5 ACES filmic (аппроксимация Нарковича)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = экспозиция
    return out;
}
```

### R9.6 Воздушная перспектива («воздух» через обесцвечивание вдаль)

> Осторожно: если применить к цвету дымки обработку, поднимающую яркость (`normalize` и т.п.), в тёмных сценах всплывает «яркий белый туман»,  
> а добавление цвета тумана поверх engineColour (уже с туманом) даёт двойной туман и белесость. **«Воздух» выражайте только снижением насыщенности** — это безопасно.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // затухание (~30% на 100blk / ~75% на 400blk)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // только saturation вниз (luminance цел)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 Волновые нормали + солнечный глиттер («солнечная дорожка» на воде)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // высота h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // dh/dx
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // dh/dz
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

### R9.8 Процедурный микробамп (обход запрета текстур)

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
        let local = fract(l.position - l.normal * 0.5);   // локальные координаты блока
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

### R9.9 Нелинейное затемнение пещер + защита ламп

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let keep = 0.12 + 0.88 * blockInt;          // приподнимаем места с лампами
        out.colour *= mix(keep, 1.0, sky * sky);     // нелинейное (квадратичное) затемнение
}
    return out;
}
```

### R9.10 Переналожение тумана (обязательно при отбросе engineColour)

> Полом вида `min(l.fogAlpha, 0.75)` задаёт «плотнее этого не будет»  
> (0.0 = как у движка / 0.3–0.5 = дали чище).  
> Учтите: туман движка — линейный только у горизонта (вблизи дальности прорисовки); среднюю дымку стройте паком.
> Реальные настройки тумана (сверены с реализацией): linear фиксирован / `fogStart` = дистанция чанков / `fogEnd` = +1 чанк / при выключенном тумане 100–101 чанков, фактически выключен / дефолтный цвет RGB (183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = s.colour * (voxel * 1.1 + vec3f(0.05));
        col = clamp(col, vec3f(0.0), vec3f(1.0));
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));  // туман заново (0.15 = лёгкий пол)
        col += s.emission * (1.0 - l.fogAlpha);            // emission тоже с туманом
        out.colour = col;
}
    return out;
}
```

### R9.11 Кино-грейд (холодные тени / тёплые света / ночное обесцвечивание)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let lum = pack_luma(out.colour);
        out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;  // ночь только при нулевом направлении солнца; сумеречного градиента нет
        out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
}
    return out;
}
```

### R9.12 Проекционные тени — инверсия лифта + пороговый срез (финал)

> **Перепроверка предпосылки (раздел 10)**: `l.skyLight` — не сырое воксельное значение (n/15), а значение после движковой «lift-кривой»  
> `y = 1-(1-x/(3-2x))³` (S-кривая, поднимающая тёмные места).
>
> | Место | сырой воксель | поднятое (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | открытое небо | 1.00 | 1.00 | 1.00 |  
> | под деревом (радиус 2) | 0.87 | **0.97** | **0.86** ← почти цело |  
> | радиус 3 | 0.80 | **0.92** | 0.66 |  
> | радиус 5 | 0.67 | 0.78 | 0.29 |
>
> **Это доказанная первопричина «тени не углубляются никакой гаммой»**. Но кривая монотонна, значит алгебраически строго обратима:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Восстановив сырые значения, остаётся лишь бинаризовать пороговым срезом (`smoothstep`).  
> BFS-распространение LightEngine — «1 блок = -1», так что порог `th = 1 - r/15` напрямую крутит  
> «затенение радиуса r и больше считать тенью». Ломаете блоки — тени двигаются сразу (LightEngine пересчитывает в реальном времени).  
> Ограничение: тени опираются на «небо сверху», поэтому за солнцем не вращаются (раздел 15 «Правда о тенях»).

```wgsl
// Точно инвертируем лифт движка, восстанавливаем сырой воксельный skyLight (n/15)
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // cbrt в WGSL нет, берём pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // крутилка радиуса тени: th = 1 - r/15 (0.87 = радиус 2+ это тень)
const shSoft = 0.04;   // мягкость кромки (0.02 = жёстко / 0.08 = мягко)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // 1. восстанавливаем сырые значения (пропустите — теней не будет никогда)
        let skyRaw = sh_unlift(l.skyLight);
        // 2. пороговый срез — чисто разделяем солнце=1 / тень=0
        let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
        // солнечный Ламберт (без солнца — fallback на l.directional)
        let sunLen = length(bloxdSunDirection());
        let sunL = select(clamp(l.directional, 0.0, 1.0),
                          clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                          sunLen > 0.5);
        // суть проекции: прямое солнце достаёт только туда, где видно небо
        let lit = sunL * sky;
        // теневая сторона: подкрашена небом, не чёрная + минимальный ambient
        let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
        var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
        // свет факела пробивает тени (blockLight тоже поднят: восстанавливаем вместе)
        let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                             sh_unlift(l.blockLight.g),
                             sh_unlift(l.blockLight.b));
        let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
        col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
        // туман заново (доля отброшенного engineColour)
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));
        out.colour = clamp(col + s.emission * (1.0 - l.fogAlpha), vec3f(0.0), vec3f(1.0));   // emission тоже не забудьте (с туманом)
}
    return out;
}
```

> Гайд по настройке: **площадь тени решает только `shTh`** — `0.93` = радиус 1.5+ / `0.87` = радиус 2 / `0.80` = радиус 3 / `0.67` = радиус 5.  
> Жёсткость кромки — это `shSoft` (0.02 = жёстко / 0.08 = мягко). Темнота ядра — двухточечный сдвиг `0.09` (минимальный ambient) и `0.16` (рассеянный свет неба).  
> Чтобы расширить тени к вечеру, добавьте `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (приближение длинных вечерних теней.  
> `sunDir` — это `bloxdSunDirection() / length(bloxdSunDirection())`). Для более синих теней поднимите B в `vec3f(0.72, 0.82, 1.05)`.
>

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

## Детали пайплайна



- **Surface-хуки идут «до» alphaTest**: `out.alpha` кормит тест отброса напрямую. Cutout-материалы (трава, листья) позволяют эффекты растворения типа dither (рецепт R-C). В жидкостях (смешивание) `out.alpha` — настоящая прозрачность (рецепт R-D). На обычном непрозрачном террейне эффекта нет — не перепутайте
- **Содержимое `l.ambient`**: `material.ambient × sceneAmbient`, разное по материалам. Сценовая сторона привязана к графической настройке «Ambient Lighting Intensity» (дефолт 0.5) — никогда не программируйте фиксированные дефолты
- **Сценовый направленный свет — из двух источников**: ламбертова сумма главного (направление из позиции солнца в настройках неба, интенсивность 1.0) и заполняющего (направление `[-0.5, -1, -1]`, интенсивность 0.35) приходит как `l.directional`. Заполняющий направлен вниз, так что верхние грани не трогает, но выцепляет обращённые вниз грани (потолки пещер и т.п.). Террейн учитывает только лампы, добавленные через `_initScene`; лампы, добавленные в сцену после запуска, террейном и блочными моделями игнорируются (есть официальное предупреждение)
- **`bloxdSeconds()` — реально `performance.now()`**: `time() { return performance.now() / 1e3 % 3600 }` — аптайм браузера, завёрнутый на 1 час. Без связи с днём/ночью игры и прошедшим временем мира. Для анимации, синхронной с игровыми часами, оценивайте время по азимуту `bloxdSunDirection()` в мирах с циклом день/ночь
- **Функции заголовка — алиасы 4 слотов одного 64-байтного uniform (`@group(3) @binding(0)`)**: `bloxdSeconds()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` соответствуют чтению слотов time / originOffset / sunDirection / eyePosition (по 16B, little-endian); `bloxdRenderOffset()` — зарезервированный слот, туда всегда приходит `[0, 0, 0]`. Пак не может перезаписывать этот uniform, а поскольку WGSL пака и движка склеиваются в один модуль, объявить тот же group/binding самостоятельно тоже нельзя. (В v3 два слота переименованы — `seconds` / `renderOffset`, функции называются `bloxdSeconds()` / `bloxdRenderOffset()` — и добавлена текстура глубины сцены на `@group(3) @binding(1)`; см. [часть IX](../history/v3.md) §41 и §51.)
- **Вершинные данные готовит мешер (Web Worker)**: геометрия блоков складывается в интерливинг по 28 байт на вершину (32 при атласе): позиция = float32×3 / нормаль = 4×8bit знаковых / цвет = 4×8bit unorm (`s.colour` — tint × AO, запечённые мешером в 8 бит; разделить и восстановить в паке принципиально нельзя) / UV = float32×2 / atlasIndex = float32. Уровни света едут отдельным 4-байтным вершинным буфером ([часть VII](../internals/) §26, [часть II](../api/) §11). Вершины рисуются instancing'ом по чанкам
- Мелкие шахматки на границах чанков при загрузке — чанк-фейд screen-space Bayer 4×4 dither движка, а не баги пака (можно отключить графической настройкой `chunkFadeIn`)
- **`mod` — зарезервированное слово**: отклоняется с `pack.wgsl:3 'mod' is a reserved word in WGSL.` Остатки пишите оператором `%`

### R-C. Bayer-dither растворение — out.alpha управляет discard

Воспроизводит **ту же таблицу Bayer 4×4**, что движок использует в чанк-фейдах, растворяя cutout'ы снизу блоков. discard срабатывает в alphaTest-материалах (трава, листья); в жидкостях это прозрачность смешивания.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod зарезервирован: используйте оператор %
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
    // растворяется снизу блоков; больший dissolve остаётся
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. Подводный fade у камеры — alpha жидкости держит обзор

`out.alpha` жидкостного хука кормит смешивание напрямую. Расчищает лишь поверхность под камерой, чтобы держать обзор при нырянии и надводной камере.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 блока от полной прозрачности к норме
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

## Внутрянка blockLight / heldLight



- `blockLight` — **цветной свет** с RGB-каналами. Для каждого светящегося блока определён цвет свечения `[R, G, B]` (0–15), который и становится цветом света (обычный факел = тёплый белый (14,14,12) / лава = оранжевый (14,8,2) / маяк = циан (5,14,14) / белый факел = (15,15,15) и т.д.). На уровне вершин всё приходит в одном float-атрибуте, упакованном в 4 ниббла r / g / b / sky. Внутри light-хука, обрабатывая 3 канала по отдельности, можно делать цветной локальный свет — именно это стоит за поведением «оранжевых факелов» (рецепт R9.1).

При декодировании `aPackedLightLevels` движок кладёт на каждый канал **пол в 35% ярчайшего RGB-канала**. Напр. «чисто красный свет» в вершинах поднимается до (1.00, 0.35, 0) до интерполяции и лифта. Оранжевый факелов, выглядящий «розовато-белым, а не красным», — отсюда: насыщенность тёплых факелов (R9.1) крутите против этого дефолта.
- Композиция света — не сумма. Движок внутри берёт **max** блочного света с полом 35% и небесного света `mix(ambient-цвет, sky-цвет, skyLight)`, а поверх кладёт max ручного света (после ambient-буста). Значения каналов в этой композиции — **после лифта**: движок собирает её из тех же поднятых уровней света, что приходят во входы хуков (`terrainLightLevels` после кривой лифта), и в v2, и в v3. Поэтому `blockLight` и `skyLight` не гасят друг друга: вклад более тёмного отбрасывается — даже если ослабить небесный свет, места, где доминирует блочный свет, почти не темнеют. Рецепты экспозиции и затухания проектируйте с оглядкой на эту структуру (защита локального света в [части VI](../guides/) §19 — компенсация именно этой структуры).


Ручной свет (`heldLight`) с дальностью по ярчайшему каналу (макс 15 блоков) с препроцессом `dist^0.75`, тем же полом 35%, а `l.heldLight` — значение **до** ambient-буста. Затухание конуса, восстановленное из светового модуля движка: угловое ослабление луча — `1 − 0.5 × (smoothstep(0.12, 0.65, t) + smoothstep(0.62, 0.95, t))`, где `t` — нормированный угол от оси конуса (0 = центр, 1 = край); дальность — `(rangeOverride > 0 ? rangeOverride : ярчайший канал) × затухание конуса`, где `rangeOverride` берётся из alpha цвета ручного света; внутри дальности override ослабляет по `(range − dist) / range`, а дефолт вычитает (препроцессированную) дистанцию покомпонентно; затем идут пол 35%, деление на 15, кривая лифта и, наконец, ambient-буст. Кастомные предметы могут фиксировать `spotlightRange` и угол конуса — режим «луч, пока держишь», чей конус следует за камерой. Паки узнать направление луча не могут.

Кастомные блоки могут нести `skyLightEmission` (0–15), который **инжектит в сам канал skyLight, отдельно от BFS blockLight**. Паки в духе R9.12, судящие солнце/тень по порогу skyLight, могут мазать в мирах с искусственно поднятым skyLight. Дистрибутивные паки судят надёжнее в связке с blockLight.

---

## Внутрянка тумана



Расчёт тумана всегда LINEAR-режим (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), при `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = настройка тумана; лишь D = 0 особенный с fogEnd = 5). **Градиентная полоса лишь 32 блока**, и `(1.0 - l.fogAlpha)` — меньше «дымка по дистанции», а **нормированная дистанция до края загруженного мира**. Варьируется от игрока с дистанцией загрузки: дистанционные эффекты пусть сами считают `distance(l.position, bloxdEyePosition())` (рецепт R-B). (Замечание v3: функция тумана в рендерере на самом деле реализует **четыре** режима — выключен, экспоненциальный, экспоненциальный в квадрате, линейный; поставляемые игры используют линейный режим. Восстановленный исходный код и обоснование устойчивости — в [части IX](../history/v3.md) §50.)

- Дефолтный цвет тумана — `rgb(183, 191, 195)` (бледный сине-серый). Создатели миров меняют его через `fogColourOverride` (hex). При режиме тумана 0 (NONE) **fogColour приходит чёрным** (`fogColour = select(vec3f(0.0), uniforms.vFogColor, ...)`). Стандартная форма `mix(l.fogColour, col, (1.0 - l.fogAlpha))` безопасна: при fogVisibility 1 цвет тумана не используется. На стороне скриптового API есть и другие опции: `fogChunkDistanceOverride` и `fogOnSkybox` — кастомные игры могут отдельно настроить дистанцию тумана (значение, соответствующее D) и применение тумана к скайбоксу. По умолчанию скайбокс туманом не затрагивается (скайбокс окрашивается цветом тумана только в играх с включённым `fogOnSkybox`).

Выставление `showFog` в false отгоняет туман на 3200–3232 блоков, фактически выключая (`fogVisibility ≈ 1` продолжает приходить).

### R-B. Полоса края загрузки — fogVisibility как «край мира»

Тихо холодит лишь 32-блочную полосу края загрузки, чтобы заретушировать конец мира (или подчеркнуть как эффект). Без самопосчитанной дистанции: сама следует настройкам дистанции загрузки игрока.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = внутри (запас до края), 0 = вот-вот выход за край
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

## Что меняет видимые значения пака — чеклист тестов



Один и тот же пак рендерится по-разному в зависимости от **мира и настроек игрока**. Перед распространением проверьте хотя бы эти 3 окружения:

1. **Обычный мир** (дефолтный скайбокс, без оверрайдов) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, дефолтные цвета
2. **Мир со space-скайбоксом** — bloxdSunDirection() = 0. Вид ветки `sunPresent`
3. **Кастомный мир с `visionMinLightColour` / `skyLightColourOverride`** — поднятые темноты и цвета

Главные источники вариации: `lightingOverride` (принудительный свет) / `skyLightColourOverride`, `ambientLightColourOverride` (hex-замены) / `visionMinLightColour` (минимальный цвет видимости; реализация — покомпонентный max в обе стороны на `uSkyLightColour` и `uAmbientLightColour`; использует Night Vision. Паки «кромешная пещера» темнее задуманного не станут — пол приподнимает и сам цвет неба) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (есть ли bloxdSunDirection()). `uSkyLightColour` дефолт = (1,1,1) белый, `uAmbientLightColour` дефолт = (0.25,0.25,0.30). Сценовая сторона `l.ambient` = графическая настройка «Ambient Lighting Intensity» (дефолт 0.5). `(1.0 - l.fogAlpha)` следует настройкам тумана/дистанции чанков игрока. Кроме того, на вариации влияют `cameraTint` (RGBA-тинт всего экрана) и `proximityFadeDistance` / `proximityFadeMinOpacity` (подсвечка fade сущностей у камеры), причём `cameraTint` — финальный слой поверх вывода пака. Многие из них настраиваются и через скриптовый API (`serverOption`) и могут обновляться прямо во время игры.

---

## Режимы применения по играм (`shaderPackPolicy`)



Здесь фиксируется смысл пары `allow / strict` из §7 на уровне отдельных игр. Только игры, в чьём определении явно стоит `shaderPackPolicy: "allow"`, работают в полном режиме (vertex-хуки, `discard`, `alpha` террейна); игры без указания (или с любым значением, кроме allow) — strict: определяется `BLOXD_STRICT`, охраняемый код автоматически отключается. Со стороны пака это выбрать нельзя, поэтому знание о том, какие игры что исполняют, — предпосылка распространения.

- Опорный билд: `szby6g.main.94a7596c.js` (прод-деплой на 2026-10-17). Статический разбор всех 111 определений игр даёт **26 allow-записей (12 игр) / 85 strict-записей**. Те же 12 allow-литералов в тех же 12 играх были повторно подтверждены без изменений на продакшн-бандле v3 (`3ymzdd`, 2026-10-20) — список ниже переносится в v3 дословно.
- Над `shaderPackPolicy` стоит ещё один рубеж — гейт на стороне дистрибуции (`canUseShaderPacks` и под.): в сборках для внешних порталов (напр., версия Coolmath Games) сам механизм шейдер-паков может быть выключен ещё до проверки `shaderPackPolicy`. Разбор ниже по allow / strict основан на анализе веб-версии bloxd.io.
- «allow» объявляется в 12 местах: 8 прямых записей в определениях игр и 4 базовые переменные (`tb` / `kz` / `cb` / `Fb`); вариации наследуют через спред (`{...tb,...}`). Перезаписей на уровне отдельной вариации (обратная схема «родитель allow — ребёнок strict») сейчас нет.

12 allow-игр (всего 26 записей):

- **Test Gym** — базовая + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (всего 11)
- **Doodle Cube** — базовая + Solos / Duos (3)
- **Rocket Obby** — базовая + Sheep / January (3)
- **9 одиночных игр**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

Самые обманчивые моменты на стороне strict:

- **Superflat Creative (classic_creativeFlat) — strict.** В названии есть «Creative», но в семействе classic allow имеет только обычный Creative (`classic_creative`). Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns и т.д. — все strict
- **Custom Games (customGames) — strict.** В созданных пользователем кастомных играх эффекты vertex-хуков не срабатывают. Для проверки надёжно Test Gym
- Основные PvP-/серверные игры вроде bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) — все strict

При этом в strict-играх пак загружается и компилируется, а рецепты фрагментной стороны вроде surface / light работают как обычно. Ограничения касаются vertex-хуков (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard` и `alpha` террейна (у жидкостей она есть всегда).

Этот список отражает статический анализ указанного билда; обновления движка могут менять распределение allow/strict. При выходе новых версий перепроверяйте.

---

## Идентичность солнца и луны



Источник `bloxdSunDirection()` — буфер солнечного направления, перезаписываемый лишь при смене типа скайбокса: критерий не «есть ли в небе солнце», а **«скайбокс ли земного типа»**.

| Скайбокс | `bloxdSunDirection()` |
|---|---|
| `default` (процедурное небо) | Ненулевой (дефолты ниже) |
| `gloomy` / `interstellar` / `space_*` (куб-текстуры) | **Всегда (0,0,0)** |

**Луна всегда `-bloxdSunDirection()`** (движок считает позицию луны точной противоположностью солнца). Ночь судится по высоте солнца — луна наверху, когда `bloxdSunDirection().y < 0` (солнце под горизонтом). Но в дефолтных мирах солнце статично, и луна тоже — движущуюся луну видят лишь миры с циклом день/ночь.

Дефолтное солнечное направление около `(-0.56, 0.81, -0.18)` (единичный вектор из inclination = −0.2 / azimuth = 0.55, статичен). Практический референс для предсказания направлений бликов при тестах дистрибутивных паков.

Циклы день/ночь не встроены в движок — inclination статическое число, которое миры с подвижным днём обновляют на стороне игры. `bloxdSunDirection()` следует каждому обновлению.

Направленные огни террейна — лишь 2 лампы, созданные при старте сцены, с **фиксированными направлением и интенсивностью, без смены день/ночь**. Коротко: **ни один фактор яркости террейна не зависит от времени. «Виды» день/ночь идут лишь от скайбокса и bloxdSunDirection()**, так что паки, затемняющие ночью, должны сами оценивать полосу времени из bloxdSunDirection() (техника `sunPresent` из §19).

### R-A. Направленный лунный свет — moonDir = −bloxdSunDirection()

Добавляет бело-голубой Ламберт и слабый спекуляр, лишь пока луна наверху. `moonUp` в дефолтных статично-солнечных мирах равен 0: там ничего не происходит — **лунный свет, срабатывающий лишь в мирах с циклом день/ночь, а значит безопасный**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // луна всегда точно напротив солнца; дневной авто-офф через moonDir.y < 0
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

## Средства отладки



- URL-параметр `?renderer=lite` — форсирует Lite (WebGPU) рендер (`webgl2` / `babylon` тоже годятся; `babylon` — старое имя-алиас webgl2). Приоритет: URL-параметр > `bloxdRenderer` в localStorage > экран настроек > дефолт (webgl2). Невалидные значения игнорируются с предупреждением. Если override остался в URL или localStorage, на этапах, требующих WebGPU (lite), может появиться «needs the new WebGPU renderer, so remove the renderer override...» ([часть V](../troubleshooting/) §17)
- URL-параметр `?vconsole` — экранная консоль (VConsole). Удобно для проверки на реальном мобильном
- URL-параметр `?drawcalls=1` — добавляет отладочную панель статистики отрисовки. Через выбор игрового объекта в отладочной консоли или `drawCalls()` / `why()` / `configureDrawCallWatching()` можно поймать избыточные перерисовки (overdraw) крупных механик, не относящихся к паку, и достижение лимита ~65 тыс. вершин на draw call — и отделить причину нехватки производительности
- В консоли видны `noa-engine v0.33.0` и `Renderer: lite from <источник>` — проверьте их первым делом, чтобы не ошибиться с трактом рендера
- WebGPU-рендер лочится «форсированно ВКЛ», пока применён пак. Настройка «Disable Block Texture Atlas» тоже лочится (атлас остаётся ВКЛ), а без WebGPU пак вообще не применяется. Основание писать «нужен WebGPU-браузер» на страницах распространения
- Блочные текстуры — 2D array texture (`texture_2d_array`), сэмплер террейна — nearest и repeat. Мешер к тому же склеивает грани с совпадающими материалом/AO/светом в один полигон (**greedy meshing**), поэтому UV вершин на слитых гранях могут выходить за ширину тайла (инсет по краю 0.0015). Повторяемость обеспечивает аппаратный repeat-адресинг, так что слитые грани выглядят бесшовно. Но если наслаивать процедурные детали по `vUV`, на границах слитых граней возможны разрывы — проектируйте от мировой позиции (`s.position` + `bloxdRenderOffset()`), так надёжнее
- Рантайм-перепроверка при каждом входе (`checkCompilation`) компилирует настоящие террейн-материалы в браузерном WebGPU (строже статической проверки настроек). Паки, падающие здесь, исключаются из этой игры

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
