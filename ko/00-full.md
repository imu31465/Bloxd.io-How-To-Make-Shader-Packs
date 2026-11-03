<!-- Auto-generated from the 6-category structure. Edit individual pages instead. -->

## Bloxd.io 셰이더 팩 개발 문서

Bloxd.io의 WebGPU 렌더러를 위한 셰이더 팩에 대한 비공식 가이드 — 제작·구현·검증·배포부터 API 사양과 엔진 내부 연구까지.

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


## 제8부: API Version 2 마이그레이션 가이드


대상 빌드: `6qxffk.main.5912a15f.js` (2026-10-16 시점의 정식 배포). 이 책의 제1부~제7부는 v2 기준으로 다시 쓴 상태이며, 이 제8부는 v1에서의 이전 포인트와 v2의 새로운 기능을 모은 것이다. 새 기능의 코드 예제는 v2 컴파일러에 의한 8/8 베리언트 검증과 브라우저 WGSL 컴파일러 (Tint) 검증 (§38)을 통과한 것이며, 기존 레시피의 v2 변환은 기계적인 식별자 교체이므로, 배포 전에는 반드시 실기 컴파일로 확인할 것.

### 31. v1 팩의 운명 (먼저 결론)

게임은 manifest의 `apiVersion` 이 **2와 엄밀히 일치할 것**을 요구한다. v1 팩을 읽히면 `This pack is for shader pack API version 1. Bloxd supports version 2.` (i18n 키 `shaderPack:loadWrongApiVersion`) 로 거부된다. v1/v2 **병행 지원은 존재하지 않는다**. 또 엔진은 저장된 팩의 `validation.headerVersion` (헤더 전체의 해시) 을 재검사하므로, 엔진 업데이트 때 저장 팩이 자동으로 「재확인 필요」 가 되는 구조는 v1과 같다.

### 32. 식별자의 전면 개명 (대응표)

v2에서는 언더스코어 명명에서 캐멜케이스로 통일됐다. **구명은 일절 쓸 수 없다.**

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
| `bloxd_packInputs` (내부 uniform) | `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) |

훅의 종류 (vertex / surface / light · terrain / liquid 6종) 와 `pack.json` 형식 (`apiVersion` / `name` / `author`) 에는 변경이 없다. 로더 제한도 불변 (zip 32MB / 엔트리 1024 / `.wgsl` 256개 / 합계 256KB / manifest 64KB).

### 33. 삭제 필드의 이식처

v1에서는 `time` / `eyePosition` / `sunDirection` / `originOffset` 이 구조체의 필드였다. v2에서는 **이들 필드는 삭제되고, 대신 엔진 uniform (`bloxdPackInputs`) 을 읽는 헤더 함수**를 쓴다. 함수는 uniform을 직접 읽으므로, **훅 밖의 모듈스코프 함수나 vertex 훅에서도 호출할 수 있다**.

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` 에 의한 월드 좌표화 | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

### 34. 새 기능 ①: `blockId` (블록 고유 셰이딩)

`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` 3개 구조체 모두에 `blockId: u32` 가 추가됐다. **면이 속한 블록의 ID** (0~65535) 로, 같은 면 안에서는 일정 (`@interpolate(flat)` 으로 전달). 텍스처 색에 의존하지 않는 블록 종류 식별에 쓴다. 단 ID와 블록 종류의 대응표는 엔진 내부에 있어 팩에서는 참조할 수 없으므로, **어느 ID가 무슨 블록인지는 월드 안에서 실측하거나 아래의 참고 자료로 확인**한다. 내부에서는 이 ID 는 정점색의 α (하위 8bit) 와 법선의 w (상위 8bit) 의 합계 16bit 에 각인되어 운반되며, 상한 65535 는 이 경로 폭에 유래한다. blockId 시스템 자체는 액티브한 셰이더 팩이 존재할 때에만 유효화된다 (팩 없이는 와이어의 목적지는 패딩인 채이지만, 제2부의 구조체 정의상 이 차이는 관측할 수 없다).

**참고**: 필자가 게임 내 엔트리 목록을 [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data)에 공개했다 (`entries.json`: id ↔ 블록 이름 대응표. `Furnace|meta|rot2` 같은 회전/meta 변종도 별개 ID로 수록). 대응은 게임 업데이트로 바뀔 수 있으므로 최종 확정은 실기기에서 확인할 것.

자주 쓰는 블록의 예 (entries.json 에서, 2026-10-18 시점. id 가 낮은 지형계만 발췌):

| ID | 블록 이름 | ID | 블록 이름 |
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

entries.json 에는 도구 등의 비블록 항목도 수록되어 있지만, 지형·액체의 훅에 닿는 것은 블록계 id 이다.

#### R-F. blockId에 의한 블록 종류 틴트

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // 예: 돌 계열 (id 상위 비트 패턴) 을 한색으로 기울이기
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

#### R-G. blockId 의 실측 — 비트 평면 표시 팩

대응표에 실리지 않은 블록의 id 를 월드 안에서 조사하는 디버그 레시피. 선두의 `plane` 을 `0, 1, 2, …` 로 바꿔 가며, 조사하고 싶은 블록의 면 색을 읽는다.

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

면의 색은 blockId 의 3비트를 그대로 RGB 로 나타낸다 (흑 = 0 / 적 = 1 / 녹 = 2 / 황 = 3 / 청 = 4 / 마젠타 = 5 / 시안 = 6 / 백 = 7). 1회의 관찰로 8진수 1자리를 읽을 수 있다. p0 → p3 순으로 3, 2, 7, 2 로 읽혔다면, 위 자리부터 나열한 8진 2723 = 1491 이 id 가 된다 (Lava). id 가 낮은 지형계는 p0 과 p1 의 2회로 족하다. surface 훅만으로 구성되어 있으므로, strict 타이틀에서도 움직인다.

#### R-H. 잎만 흔들기 — blockId 에 의한 vertex 훅의 한정

R7 의 바람 레시피 ([제3부](../recipes/)) 는 지형 전체를 물결치게 하지만, vertex 훅에서도 `blockId` 를 읽을 수 있으므로, 대상을 잎 블록만으로 한정할 수 있다. id 일람과 WGSL 용 배열은 다음과 같다 (2026-10-18 시점의 실측. Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / 과실 변종 / Autumn Aspen 의 22종):

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// vertex 훅은 strict 타이틀에서 자동 무효 (§36 참조)
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
        // 변위는 월드 위치의 매끄러운 함수로 한다. 월드 위의 같은 지점을 가리키는
        // 공유 정점이 같은 값으로 움직이므로, 면이 뜯기지 않는다 ([제3부](../recipes/) R7 도 같은 원리)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- id 일람은 엔진의 갱신으로 늘어난다 (실측에서도 새 빌드로 50종의 블록이 추가됐다). 계속 쓰는 경우는 [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) 나 R-G 의 비트 평면 표시로 추가분을 조사해 배열에 더할 것
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) 는 지면에 까는 비고체의 깔개 잎이다. 흔들면 지면에서 뜨는 것처럼 보이므로, 배열에서 빼서 제외하는 것도 하나의 선택
- strict 타이틀에서는 vertex 훅이 통째로 무효가 되지만, 위의 가드가 있으면 「흔들림이 멎을 뿐」 이고, 프래그먼트 측의 효과는 계속 산다

### 35. 새 기능 ②: `BLOXD_SCENE_DEPTH` 와 `bloxdOpaqueBehind()` (본명)

v1에서 구조적으로 불가능했던 깊이 액세스가 **액체 (liquid) 프로그램에 한해** 풀렸다. 색은 얻을 수 없지만, **안쪽 불투명면까지의 거리와 위치라는 기하 정보를 얻을 수 있다**. 전형적인 용법은 물의 두께를 잰 흡수색 계산이다.

사용 규칙:

| 용법 | 결과 |
|---|---|
| `bloxdLiquidSurface` / `bloxdLiquidLight` 안에서 가드 없이 호출 | OK (액체 베리언트에서는 항상 정의) |
| `bloxdTerrainSurface` 안에서 가드 없이 호출 | ERROR. `#ifdef BLOXD_SCENE_DEPTH` 로 감싼다 |
| vertex 훅 안에서 호출 | ERROR (surface / light 훅 한정) |

지형 훅에서도 깊이를 쓰고 싶으면 `#ifdef BLOXD_SCENE_DEPTH` 로 감싼다 (지형 훅은 액체 프로그램에도 함께 쓰이므로, 액체 측에서만 깊이가 유효해진다).

#### R-E. 물의 두께 흡수 (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // 물기둥의 길이 = 현재 위치에서 안쪽 불투명면까지
        let thickness = distance(behind.position, surface.position);
        // Beer-Lambert 흡수: 빨강은 빨리 떨어지고, 파랑은 멀리까지 닿는다
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // 안쪽이 하늘 = 깊은 물색으로 기울이기
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

응용: 두께 기반 흡수·산란, `behind.position` 에서의 바닥 월드 좌표에 의한 물결·코스틱풍 무늬 투영, `found=false` 에서의 하늘과 가림 구별에 의한 수면의 하늘 반사, 깊이에 의한 거품과 탁함의 단계 부여. 참고로 깊이 복사 파이프라인 구축에 실패한 경우는 「안쪽에 아무것도 없음」 으로 안전하게 열화된다. 깊이 텍스처는 페이지의 렌더러 생성시에 「액티브한 팩이 깊이를 읽는가」 로 준비가 확정되므로, **깊이를 읽는 팩을 쓸 때는 반드시 페이지 재읽기를 끼운다**. 팩을 유효화한 채 재읽지 않고 깊이가 요구된 경우, 콘솔에 `…reads scene depth on a page that didn't turn it on` 이라는 경고가 1회만 나오고, 깊이는 1×1 의 대체 텍스처로 바뀌므로 `bloxdOpaqueBehind()` 는 항상 `found = false` 를 반환한다.

### 36. 그 밖의 v2 변경점

- **훅의 폴백**: 액체 프로그램은 `bloxdLiquidXxx` 가 미정의일 때 지형 훅으로 폴백한다. **지형 훅뿐인 팩은 수면에도 그대로 통한다**. 의도하지 않으면 liquid 측 훅을 명시 정의한다.
- **`BLOXD_LIGHTING` 의 필드 가드는 불필요하게**: 전 베리언트에 `blockLight` 등이 존재하며, 조명off에서는 기본값 (0 / 1 / 흰색 / 0) 이 들어간다. 조명 판정을 하고 싶을 때만 `#ifdef BLOXD_LIGHTING` 을 쓴다. 기존 가드를 남겨도 동작은 바뀌지 않는다.
- **`BLOXD_ALPHA` 의 정의 조건이 변화**: 비 strict 지형 베리언트와 전 액체 베리언트에서 정의되며, strict · terrain에서는 정의되지 않는다. 지형 훅에서 alpha를 쓸 경우는 가드를 남길 것.
- **구조체의 직접 구축은 금지**: `BloxdLight(...)` 등의 생성자 호출은 정적 검증에서 거부된다. 반드시 `bloxdDefault*` 에서 변경하거나, 입력의 복사를 쓴다.
- **`let _ =` 는 `_ =` 로**: WGSL의 파기 대입 `_ = f();` 는 유효하지만 `let _ = f();` 는 거부된다.
- **offInStrict**: vertex 훅의 정의, 또는 surface / light 훅에서 도달 가능한 `discard` 가 있으면, 에러가 아니라 팩 전체가 strict 게임에서 자동 비활성화된다 (설정 UI에 `shaderPack:offInStrict` 표시, allow 게임에서는 동작). vertex 훅과 `discard` 는 `#ifndef BLOXD_STRICT` 로 감싼다.
- **포그의 확장**: 포그 계산에 LINEAR / EXP / EXP2 3가지 모드가 구현됐지만, 게임 측 설정은 종래대로 항상 LINEAR이므로, 기존 포그 사양은 그대로 쓸 수 있다. `fogColour` 의 의미도 공식적으로 명문화됐다 (완전히 포그 없는 씬에서만 흑).
- **바뀌지 않은 것**: 리프트 곡선·35% 채널 바닥·heldLight 감쇠 (`pow(lightDist, 0.75)`) 와 환경광 부스트·태양과 달의 방향 사양·기존 포그색·time 감김 (3600초)·방향광 (최대 4개)·Lite (WebGPU) 전용·저장 구조 (IndexedDB)·`mod` 예약어.

### 37. v1 → v2 이전 체크리스트

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **식별자**: §32 대응표로 전부 교체 (훅명·구조체명·default 함수명)
3. **삭제 필드의 이식**: §33 표에 따라 헤더 함수로 (`s.time` → `bloxdTime()` 등)
4. **`fogFactor` → `fogVisibility`** 로 개명
5. **구조체 직접 구축을 제거**
6. **`let _ =` 을 `_ =` 로** 수정
7. **vertex 훅과 discard는 `#ifndef BLOXD_STRICT` 로 감싼다**
8. **수면도 지형 훅의 효과를 받음**을 확인하고, 의도하지 않으면 liquid 훅을 명시 정의
9. (임의) `litColour` 를 기점으로 포그를 직접 관리 / `bloxdOpaqueBehind()` 로 물의 두께 흡수를 추가 / `blockId` 로 블록 고유 표현
10. **제2단계 (브라우저 Tint) 도 검증한다** — 특히 `^` `&` `|` `<<` `>>` 를 포함한 식의 괄호. 정적 검증을 통과해도 브라우저에서 거부되는 코드가 존재한다 (§38)

### 38. 제2검증단계 — 브라우저의 WGSL 컴파일러는 내장 파서보다 엄격하다

게임의 팩 검증은 **2단계**가 있다. 제1단계는 정적 검증 (엔진 내장 JS 파서. 훅 서명·금지 구문·sceneDepth 이용 등 팩 고유 규칙을 검사) 이며, 제2단계는 브라우저 검증 (컴파일 결과에 동봉되는 스텁을 진짜 WebGPU 구현으로 컴파일하고, 에러를 팩의 원본 파일 행으로 역매핑해 표시한다. UI의 「Saved, but it won't run until you fix these errors」가 이 단계) 이다. 에러 표시 말미의 `(only in terrain)` 등의 접미사는 「그 에러가 난 베리언트의 program 종」이다.

내장 파서는 WGSL의 연산자 결합 (Binding) 규칙을 구현하지 않아, **정적 검증을 통과해도 브라우저에서 거부된다**. 피해가 나기 쉬운 것은 정수 해시의 정석 패턴이다:

| 연산자 | 결과 |
|---|---|
| `<<` `>>` | 단항 레벨까지만 직접 결합할 수 없다. `a + b << c` 는 에러 |
| `&` `^` `\|` | 단항 레벨까지만 직접 결합할 수 없다. `a * b ^ c` 는 에러 |
| `&&` `\|\|` | 혼합 불가. `a && b \|\| c` 는 에러 |

#### 괄호 다는 법 (NG / OK)

```wgsl
// NG — 정적 검증은 통과하지만 브라우저 (Tint) 가 거부:
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — 각 곱셈을 묶는다 (같은 연산자의 연속 A ^ B ^ C 자체는 좌결합으로 합법)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

이 책의 게재 코드는 이 패턴을 포함하지 않는다 (`pack_hash3` 의 `+`/`*` 혼재와 `h ^ (h >> 16u)` 는 괄호 처리되어 있어 사양 적합). 팩을 쓰면 제1단계와 제2단계를 둘 다 통과시킬 것.

### 39. 독립적인 유사 자료에 대하여

내용이 거의 같은 커뮤니티 자료가 존재한다: [GlitchHunterCoder/Bloxd-Essay 의 Shader](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader). 이 가이드보다 먼저 공개되었지만, **이 가이드 내용은 glm 이 Bloxd 의 실제 번들 파일 (webpack 청크 묶음) 을 독자 해석한 것으로 — 베끼기가 아니다**. 둘이 일치하는 것은, 같은 구현을 독자 조사하면 같은 결론에 이르기 때문이다.

---

조사: ltf_ahel (glm 을 사용해 조사)

---


## 제9부: API Version 3 마이그레이션 가이드

> **2026-10-26 대체됨: 현행 API는 버전 5** — v3 팩은 여기서 v2에 대해 서술한 것과 똑같이 로드 시 거부된다. 이 부를 적용한 뒤 [제10부](../history/v4.md) (v3 → v4: 텍스처 API, `fogAlpha` 개명, `bloxdFragmentBlockPosition`, `hit`) 를 적용할 것. 이어서 [제12부](../history/v5.md) (v4 → v5)도 적용할 것.

대상 빌드: `3ymzdd.main.fae4743f.js` — **2026-10-19부터 정식 프로덕션 빌드**. bloxd.io가 프로덕션에서 제공하는 번들은 이 부를 처음 조사할 때 사용한 프리프로드 배포와 바이트 단위로 동일하다 (md5로 확인했으며, 메인 번들과 셰이더 팩 청크 모두 그러하다). 따라서 여기 적힌 내용은 그대로 프로덕션에 적용된다. 팩 모델은 v2 형태를 유지한다 (`pack.json` 필드, 로더 제한, uniform 레이아웃이 모두 같다).

이 가이드의 제1부~제7부는 여전히 v2 기준으로 작성되어 있다. 이 부는 [제8부](../history/v2.md)와 같은 순서로 v2 → v3 이전 포인트와 v3의 새 기능을 모은다. 변환은 대부분 기계적이지만 (§47), 실제 동작을 바꾸는 변경은 하나뿐이다 — 기본 light가 이제 emission을 포그로 감쇠시킨다 (§43) — 그리고 `blockId`가 `blockFlags`로 전면 교체되었으므로 (§42), 배포 전에는 반드시 게임 내 컴파일로 확인할 것.

이번 개정에서 새로 추가된 **§49–§54**는 이전 자체를 넘어 프로덕션 빌드에서 복원한 엔진 내부로 들어간다 — Lite 렌더러가 실제로 훅을 호출하는 방식, 실제 4모드 포그 함수, `bloxdOpaqueBehind()`의 정확한 구현, 블록 등록에서 훅까지 이어지는 blockFlags의 완전한 전달 경로, 그리고 실측 헤더 해시가 포함된 검증 파이프라인이다. 이는 현재까지 팩 시스템에 관해 공개된 가장 깊은 사실이며, 다른 가이드가 아직 미해결로 남겨 둔 여러 질문에 답한다.

### 40. v2 팩의 운명 (먼저 결론)

**2026-10-19 업데이트: v3가 프리프로드를 떠나 이제 정식 사이트가 제공하는 버전이 되었다.** v2로 배포된 모든 팩을 포함해, 롤아웃 전에 저장된 모든 v2 팩은 아래 설명대로 프로덕션에서 실패한다. 따라서 오늘 팩을 배포하는 사람에게 §47의 이전은 더 이상 선택이 아니다.

이 빌드는 manifest의 `apiVersion`이 **3과 엄밀히 일치**할 것을 요구하며, **v2/v3 병행 지원은 없다**. v2 팩은 로드 시 「API 버전 불일치」 메시지로 거부된다 (i18n 키와 플레이스홀더 텍스트):

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>

저장된 팩은 v2 라이프사이클을 그대로 따른다 ([제8부](../history/v2.md) §31): 모든 빌드는 엔진 헤더의 해시를 계산하고, 엔진 업데이트는 저장된 팩을 자동으로 「재확인 필요」로 표시하며, `apiVersion`이 현재 버전이 아닌 저장 팩은 오류를 내는 대신 실행되지 않음으로 표시된다 (위 상태 메시지가 대체 팩을 가리킨다).

### 41. pack.json과 uniform 버퍼 (변하지 않는 부분)

- 필수 manifest 필드는 그대로다: `{ apiVersion, name, author }`.
- 로더 제한도 그대로다: 32MB zip / 1024개 항목 / `.wgsl` 파일 256개 / 코드 총량 256KB / manifest 64KB.
- 엔진 uniform 블록의 형태는 그대로다: `@group(3) @binding(0)`, 64 B, 선언 순서대로 시간, 렌더 오프셋, 태양 방향, 눈 위치를 담는다. 레이아웃은 `minBindingSize: 64`로 등록되며, 정확한 필드 배치는 `seconds: f32` @ 바이트 0, `renderOffset: vec3i` @ 16, `sunDirection: vec3f` @ 32, `eyePosition: vec3f` @ 48이다. 내부 필드 이름 두 개가 바뀌었다: `time` → `seconds`, `originOffset` → `renderOffset`. **바이트 레이아웃은 v2와 동일**하며, 팩 코드에는 어차피 영향이 없다. 팩은 이 uniform을 직접 이름 붙일 수 없기 때문이다 (엔진 헤더가 엔진 제공·읽기 전용으로 표시하며, 「팩은 이름을 붙일 수 없다」). 계속 헤더 함수 `bloxdSeconds()` / `bloxdRenderOffset()`을 사용할 것.
- 팩의 group 3에는 문서화된 두 번째 점유자가 생겼다: `@group(3) @binding(1)`은 `bloxdOpaqueBehind()`가 읽는 씬 깊이 텍스처다 (전체 구현은 §51). 64 B uniform은 binding 0에 그대로 있으며, 팩은 여전히 어느 binding도 이름 붙일 수 없다.

### 42. blockId가 blockFlags로: 블록별 머티리얼을 비트 플래그로 (핵심)

세 훅 입력 구조체 모두에서 (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`) v2 필드 `blockId: u32`가 `blockFlags: u32`로 **교체**되었다. 이 필드에 대한 엔진 설명: *「이 면이 어떤 종류의 블록인지: `bloxdBlockFlag*` 비트이며, 면 전체에서 같다.」* 이제 엔진이 머티리얼 데이터를 직접 제공하므로, 숫자 id 범위로 머티리얼을 추측하거나 월드 내 id 표를 유지하던 v2 방식 ([제8부](../history/v2.md) §34)은 필요 없다.

비트는 이름 있는 상수로 공개된다:

```wgsl
// (blockFlags & bloxdBlockFlagRock) != 0 으로 검사한다.
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| 값 | 상수 | 의미 (엔진 주석 요약) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | 완전히 불투명 — 나뭇잎과 얼음도 포함. 유리, 물, 용암, 스포너, 고스트·투명 블록은 제외. |
| 2 | `bloxdBlockFlagEmissive` | 네온, 포털, 램프, 용암, 비컨처럼 블록 광을 낸다. 빛나는 광석도 아무리 약해도 포함. |
| 4 | `bloxdBlockFlagVegetation` | 나뭇잎, 그리고 잔디 블록의 잔디 — 잔디 블록은 흙이기도 하다. 선인장, 버섯 블록, 건초는 제외. |
| 8 | `bloxdBlockFlagDirt` | 흙과 토양, 잔디 블록 포함. Rocky Dirt는 암석이기도 하다. |
| 16 | `bloxdBlockFlagSand` | 모래, 붉은 모래, 그리고 모든 사암 — 사암은 암석이기도 하다. |
| 32 | `bloxdBlockFlagRock` | 돌과 그 종류, 안산암, 섬록암, 화강암, 자갈, 광석, 사암, Rocky Dirt, 기반암, 흑요석, 마그마. |

여러 머티리얼로 이루어진 블록은 **각각** 일치하는 플래그를 모두 가진다 (엔진 자신의 예: 사암은 모래이자 암석이므로 둘 다 가진다). 나뭇잎은 vegetation이지만 dirt는 아니고, 잔디 블록은 vegetation과 dirt를 동시에 가진다.

vegetation / dirt / sand / rock 플래그는 블록의 등록된 **표시명**으로부터 부여된다 (opaque / emissive는 대신 엔진 자체의 불투명도·발광 데이터에서 온다): 이름이 `Leaves`로 끝나거나 `Grass Block`인 것은 vegetation; `Dirt` / `Soil` 이름 (그리고 모든 `Grass Block`)은 dirt; 정확히 `Sand`와 `Red Sand`, 그리고 `Sandstone`을 포함하는 모든 이름은 sand; `Stone` / `Andesite` / `Diorite` / `Granite`를 포함하는 이름, 모든 `Ore`, 그리고 Yellowstone, Gravel, Bedrock, Obsidian, Magma, Rocky Dirt (와 사암)는 rock이다.


#### 정확한 이름 규칙 (모든 블록의 플래그를 직접 도출하기)

네 머티리얼 비트는 블록의 등록된 표시명에 대한 고정 분류기에서 나온다. 베리언트 이름(`|` 뒤의 모든 것)은 먼저 잘라내므로, 베리언트는 기본 블록의 플래그를 물려받는다. 그다음:

| 비트 | 규칙 (잘라낸 이름에 대해 평가) |
|---|---|
| vegetation | 이름이 ` Leaves`로 **끝나거나**, ` Grass Block`으로 **끝난다** |
| dirt | 이름이 정확히 `Dirt`이거나, ` Dirt` 또는 ` Soil`로 **끝나거나**, ` Grass Block`으로 **끝난다** |
| sand | 이름이 정확히 `Sand` 또는 `Red Sand`이거나, `Sandstone`을 **포함한다** |
| rock | 이름이 정확히 `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt` 중 하나이거나, `Sandstone`을 **포함하거나**, ` Ore`로 **끝나거나**, `Stone` / `Andesite` / `Diorite` / `Granite`를 독립 단어로 포함한다 |

Yellowstone이 명시된 이유는 `Stone`이 `Yellowstone` 안에서 독립 단어가 아니기 때문이다. Opaque와 emissive는 이름에서 오지 **않는다** — 엔진 자체의 불투명도와 블록 광 방출 데이터에서 오므로, 이 규칙으로는 도출할 수 없다.

출처: 엔진의 이름 분류기 (모듈 28537, 번들 `3ymzdd`); 이름이 있는 7,861개 블록 전체에 대해 검증했다, 2026-10-20.

예 — 머티리얼별로 블록에 색을 입힌다:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

v2 레시피에 미치는 영향: R-H의 22개 항목 나뭇잎 id 배열 ([제8부](../history/v2.md) §34)은 `(blockFlags & bloxdBlockFlagVegetation) != 0`으로 줄어든다. [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data)의 id ↔ 블록 이름 대응표는 셰이더 이외의 용도에는 여전히 유용하지만, 머티리얼 스타일링을 위해 월드 내에서 조회할 필요는 없어졌다.

#### 잔디 없는 나뭇잎 (모두가 묻는 질문)

`vegetation`만 사용하면 나뭇잎**과** 잔디 블록의 잔디를 모두 일치시킨다. 잔디 블록은 `dirt`도 가지기 때문이다. dirt를 제외하면 나뭇잎만 흔들 수 있다 — 엔진의 필드 주석이 명시하는 판별식은 다음과 같다:

```wgsl
// 나뭇잎만: dirt가 없는 vegetation. 잔디 블록은 vegetation AND dirt.
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// 잔디 블록만 (지형 표면의 잔디 면):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

실제 레지스트리로 확인했다 (2026-10-20, 번들 `3ymzdd`):
`vegetation && !dirt`는 정확히 45개의 나뭇잎 등록 (22개 기본 타입 —
v2 R-H id 배열이 측정한 것과 같은 22개)과 일치하고, `vegetation && dirt`는 정확히
8개의 잔디 블록과 일치한다. 어느 방향으로도 예외는 없다 — 레지스트리 집계는 해당 빌드 시점 기준이며, 새 블록이 추가되면 규칙은 그대로인 채 숫자만 늘어난다. `vertex.normal`
(위/아래)과 조합하면 면을 고를 수 있다. 예를 들어 잔디 블록의 윗면만 고른다.

### 43. 함수 이름 변경과 의미 변화

| v2 | v3 | 비고 |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | 페이지 로드 후 경과 초 (f32 정밀도 주의는 아래) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | 같은 양: 렌더 위치 + 이 값 = 월드 위치 |
| `const bloxdTimeWrap: f32 = 3600` | **삭제** | 주기는 팩 쪽에서 직접 정의한다 |
| `engineColour` (`BloxdLightIn` 안) | **삭제** (14 → 13 필드) | `litColour` + 포그로 다시 구성한다 |
| 훅 매개변수 `v` / `s` / `l` | `vertex` / `surface` / `light` | 템플릿 표기이며 시그니처는 그대로 |

- **`bloxdSeconds()`** — 페이지 로드 후 경과 초. f32에서는 처음 4.5시간 동안 1ms보다 작은 단위로, 9~18시간 구간에서는 약 4ms 단위로 증가한다. 헤더는 `bloxdSeconds() % period` 관용구를 권장한다. 이는 0에서 `period`까지 세다가 다시 시작하므로, 삭제된 wrap 상수를 깔끔하게 대체한다.
- **`bloxdRenderOffset()`** — 블록 단위: 「렌더 위치에 이 값을 더하면 월드 위치가 된다.」 플레이어가 이동하면 이 값도 바뀌므로 렌더 위치는 플레이어 가까이에 유지되고, 그만큼 정밀하다. 가이드 전체에서 v2 문장에서 「noa 로컬 오프셋」이라고 부르던 값은 이제 일관되게 **렌더 위치** / 렌더 오프셋이라고 부른다. `bloxdOriginOffset()`이 반환하던 것과 같은 양이다.
- **`bloxdTimeWrap` 삭제** — 3600초에서 시간을 wrap하던 팩은 이제 자체 상수를 선언한다. 예: `const timeWrap: f32 = 3600.0;` 그리고 `% timeWrap`.
- **기본 light의 의미 변화** — v2의 기본값은 `engineColour + emission × fogVisibility`였고, v3의 기본값은 `bloxdApplyFog(litColour + emission, light)`로 구성된다. **이제 기본값 안에서 emission이 포그로 감쇠**되므로, 합성된 출력 전체가 함께 포그 블렌드를 통과한다. 이전 표:

  | v2 식 | v3 이전 |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // v2의 `l.engineColour + s.emission * l.fogVisibility`를 v3로 이전:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **이름과 의미가 그대로인 것**: `bloxdEyePosition()`, `bloxdSunDirection()`, `bloxdFaceBlock()`, `bloxdApplyFog()`, `bloxdWorldPosition()`.

### 44. 새 헤더 상수: `bloxdPi`와 `bloxdTau`

```wgsl
// 반 바퀴와 한 바퀴, 라디안 단위.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

삼각함수 계산에 유용하고, 팩이 더 이상 π를 하드코딩할 필요도 없다. 이름 재사용에 주의할 것: 같은 이름의 팩 로컬 상수는 이제 헤더의 중복 식별자 검사와 충돌한다. 코드에서 `bloxdPi` / `bloxdTau`를 다시 선언한 부분이 있으면 삭제하거나 이름을 바꿀 것.

### 45. 6훅 템플릿 (액체 훅 공식 공개)

빌드와 함께 공개된 기본 팩 텍스트는 이제 **여섯 훅 모두**를 제공한다 — terrain / liquid × vertex / surface / light이며, 각각 엔진 기본값을 반환한다. 엔진 주석이 소개한다: *「모든 훅은 엔진 기본값을 반환한다. 훅을 복사해 출력을 바꾸면 셰이더 팩을 만들 수 있다.」*

```wgsl
// 모든 훅은 엔진 기본값을 반환한다. 훅을 복사해
// 출력을 바꾸면 셰이더 팩을 만들 수 있다.

// strict 게임은 지형을 그대로 둔다. 가드가 없으면 이 훅은
// 그런 게임에서 셰이더 팩 전체를 꺼 버린다.
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

// 물은 이 훅들을 사용한다. 삭제하면 물은 대신 terrain 훅을 사용한다.
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

- 훅 주석이 액체 규칙을 직접 말한다: **물에는 세 훅이 필요하며, 삭제하면 물은 terrain 훅을 재사용한다** (v2에서 알려진 폴백 동작이며, 이제 [제8부](../history/v2.md) §36의 내용이 템플릿 자체에 적혀 있다).
- `bloxdLiquidVertex`는 `bloxdTerrainVertex`와 같은 `#ifndef BLOXD_STRICT` 가드 안에 있다 — 가드가 없으면 terrain 쪽 vertex 효과와 마찬가지로 strict 게임에서 팩 전체를 꺼 버린다.
- 템플릿 표기는 이제 전체 매개변수 이름 `vertex` / `surface` / `light`를 쓴다 (v2 템플릿은 짧은 `v` / `s` / `l`이었다). 자신의 코드에서 매개변수 이름은 자유이며, 시그니처만 중요하다.

### 46. 베리언트 매트릭스: 프로그램 축과 매크로 변화

베리언트는 **strict × lighting × program** 매트릭스 위에서 생성된다 — v2와 같은 8가지 조합이지만, 이제 terrain / liquid가 매트릭스의 명시적 축이다. 베리언트 이름은 `allow|strict · unlit|lit · terrain|liquid`로 이를 드러내며, UI에서는 ``terrain`` / `liquid`, `strict` / `non-strict`, `lighting on` / `lighting off`로 표시된다 (오류 표시에는 `"(only in {{variants}})"`가 덧붙을 수 있다).

| 매크로 | 정의되는 곳 |
|---|---|
| `BLOXD_STRICT` | strict 베리언트 (두 프로그램 모두) |
| `BLOXD_LIGHTING` | lighting-on 베리언트 (두 프로그램 모두) |
| `BLOXD_ALPHA` | **모든 액체 베리언트**에 더해 non-strict **terrain** 베리언트 |
| `BLOXD_SCENE_DEPTH` | **모든 액체 베리언트** |

v2 규칙 ([제8부](../history/v2.md) §36)과 비교해 작성자에게 바뀌는 점은 두 가지다:

- **`BLOXD_ALPHA`는 v2에서 그대로다.** 베리언트 생성기는 `"liquid"!==program&&strict||push("BLOXD_ALPHA")`라는 줄을 그대로 담고 있다 — JS 연산자 우선순위상 push를 건너뛰는 경우는 *(terrain **이면서** strict)* 하나뿐이므로, 매크로는 **모든 액체 베리언트 (strict든 non-strict든)와 non-strict terrain**에 정의되고, strict terrain만 이를 생략한다. 액체 쪽 `#ifdef BLOXD_ALPHA` 코드는 예전과 똑같이 컴파일되며, §49의 alpha 되쓰기 (liquid 프로그램이나 non-strict 베리언트에 이어 붙는다)가 이 집합과 정확히 일치한다.
- **`BLOXD_SCENE_DEPTH`는 액체 베리언트에서 항상 정의된다.** 따라서 깊이 사용은 v2와 똑같이 액체 쪽에서 가드 없이 괜찮고 (§35), terrain 훅에서는 계속 `#ifdef BLOXD_SCENE_DEPTH`로 감싸야 한다.

### 47. v2 → v3 마이그레이션 체크리스트

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`**: 세 입력 구조체 모두에서 바꾸고, 머티리얼 스타일링을 `bloxdBlockFlag*` 상수에 대한 비트 검사로 표현한다 (§42). v2의 id 범위 휴리스틱은 버린다.
3. **`bloxdTime()` → `bloxdSeconds()`**: 삭제된 `bloxdTimeWrap` 대신 자체 주기를 선언한다 (`% period`).
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **light 계산을 `engineColour`에서 `litColour` + 포그로 재구성한다**: §43 표에 따라. 기본값이 이제 emission을 포그로 감쇠시킨다는 점에 주의.
6. **액체 훅**: 물을 다르게 처리하려면 `bloxdLiquid*`를 명시적으로 정의한다. 생략하면 terrain 훅으로 폴백한다.
7. **`BLOXD_ALPHA` 점검은 필요 없다** — 베리언트 집합은 v2와 그대로다: 모든 액체 베리언트와 non-strict terrain에 정의되고, strict terrain만 생략한다 (§46)
8. **`bloxdPi` / `bloxdTau` 사용**: 삼각함수 관련 상수를 하드코딩하던 곳에서 사용하고, 이제 헤더와 중복되는 팩 로컬 재선언은 삭제한다.
9. **strict 가드 유지**: vertex 훅과 `discard`는 계속 `#ifndef BLOXD_STRICT`로 감싼다. 템플릿은 `bloxdLiquidVertex`도 terrain 쪽과 같은 방식으로 가드한다.
10. **게임 내 검증**: 셰이더 팩을 지원하는 게임에서 팩을 컴파일하고 테스트한다.

### 48. 기타 v3 변경과 주의사항

- **검증은 여전히 2단계**다 ([제8부](../history/v2.md) §38): 먼저 정적 검증, 그 다음 훅을 호출하는 생성 스텁 스니펫을 통한 브라우저의 실제 WebGPU 컴파일. 오류는 원본 파일 / 줄로 매핑되고, 진단은 매핑을 통해 엔진 쪽 식별자의 원래 이름을 복원한다.
- **strict 진단은 이유를 말한다**: 지형을 움직이는 vertex 훅은 「… moves terrain, which strict games prevent.」를 보고하고, surface / light 훅의 `discard`는 「discard makes terrain see-through, which strict games prevent.」를 보고한다. 설정 UI는 「wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`.」 안내를 유지한다 (`offInStrict`).
- **로더 메시지**: 오류 종류와 제한은 그대로다. "Zip64 archives aren't supported."는 UI 메시지로 표시된다 (`loadZip64`). 팩 UI 문자열 인벤토리는 총 57개의 `shaderPack:*` 키다. 로드 단계 오류로는 `.wgsl` 파일이 하나도 없는 zip을 뜻하는 `loadNoWgsl`과 zip 종료 시그니처가 없는 파일을 뜻하는 `loadNotZip`이 이 집합을 마무리한다.
- **게임 내 WGSL 에디터는 팩 UI에 포함되지 않는다.** 설정 화면에는 셰이더 코드 에디터가 없다 — 팩은 게임 밖에서 zip 파일로 작성한다. (번들 안에 CodeMirror 에디터가 존재하기는 하지만, 그것은 커스텀 게임 스크립팅 UI의 JavaScript 에디터이며 WGSL 지원도, 팩 시스템과의 연결도 없다.)
- **하드웨어 게이트**: Lite는 `shader-f16` WebGPU 기능을 지원하는 드라이버를 요구한다. 너무 오래된 드라이버는 "Intel driver too old for Lite (no shader-f16)" 같은 메시지로 거부된다.
- **lighting 변경은 저장된 팩을 재검증한다**: 실행 중 lighting 설정이 바뀌면 엔진은 팩 검사를 다시 실행한다 (`changed → recheck`); 리플레이 시청은 같은 훅을 `changed: false`로 호출하고 재검사를 건너뛴다.
- **문구**: 셰이더 팩을 받아들이는 게임에 대한 문장이 이제 「in games that **support** them」으로 표기된다.
- **적용 범위**: 팩이 동작하는 게임의 범위는 이전 빌드와 같다.

### 49. 엔진 내부: Lite 렌더러가 훅을 호출하는 방식

§40–§48은 로더와 헤더가 알려 주는 내용이다. 이 절과 뒤따르는 절들은 엔진이 실행 시 실제로 하는 일을 프로덕션 번들에서 복원해 기록한다 (Lite 렌더러는 175 KB 청크이며, 통합 소스 파일의 실제 이름 `lite/terrainShaderPack.ts`가 오류 문자열 안에 남아 있다). 이 중 어느 것도 작성하는 코드를 바꾸지는 않지만, 훅이 무엇을 받는지에 대한 추측을 없애고, 다른 커뮤니티 가이드가 아직 미해결로 남겨 둔 여러 질문을 정리한다.

렌더러는 JavaScript에서 훅을 「호출」하지 않는다. 팩이 검증을 통과하면 엔진은 셰이더 텍스트의 고정 앵커 줄을 교체해 **훅 호출을 자체 terrain WGSL에 이어 붙인다**. 앵커는 정확히 한 번만 일치해야 한다 — 0회 또는 여러 회 일치하면 `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`로 중단한다.

| 단계 | 엔진 셰이더의 앵커 줄 | 이어 붙는 내용 |
|---|---|---|
| vertex | `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);`부터 `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);`까지의 네 줄 블록 | `BloxdVertexIn`을 만들고 vertex 훅을 호출한 뒤 `worldPos`를 다시 쓴다 — 이어 붙이기는 `let worldPos`를 `var worldPos`로도 바꾼다 |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | `BloxdSurfaceIn`을 만들고 surface 훅을 호출한 뒤 `baseColor` / `alpha`를 다시 쓴다 |
| lit colour | `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` 바로 앞 | `let bloxdSpLitColour = color.rgb;` — 포그 전 색을 캡처한다 |
| light | fragment 셰이더의 마지막 `return color;` 줄 | `BloxdLightIn`을 만들고 light 훅을 호출한 뒤 `color`를 다시 쓴다 — 포그 블렌드 이후 |

출하된 번들에서 복원한, 훅을 이어 붙이는 코드 (엔진 자체 서식이 길어지는 light-level 샘플 식은 축약):

```wgsl
// vertex 단계 — vertex 훅을 가진 non-strict 베리언트
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* your bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// fragment 단계 — surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* your surface hook */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // 프로그램이 liquid이거나 베리언트가 non-strict일 때만 이어 붙는다
```

```wgsl
// fragment 단계 — light
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
               uniforms.vFogInfos.x != 0.0),     // fogColour — 포그가 전혀 없을 때만 검정
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* your light hook */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

이 이어 붙이는 코드에서 곧바로 나오는 네 가지 강제 사실:

- **strict terrain은 surface 훅의 alpha 변경을 무시한다.** `alpha = bloxdSpSurface.alpha` 되쓰기는 liquid 프로그램이나 non-strict 베리언트에만 이어 붙는다 — §46 매크로 표의 구현이다. (strict terrain에서는 `#ifdef BLOXD_ALPHA` 코드가 어차피 컴파일 대상에서 빠지며, 이제 가드 없는 alpha 쓰기도 거기서 버려진다는 점이 확인되었다.)
- **vertex 훅을 선언한 strict 베리언트는 그 훅을 절대 실행하지 않는다** — 엔진은 빌드 시점에 `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`를 보고한다. 공식 템플릿 (§45)이 `bloxdLiquidVertex`를 terrain 쪽과 같은 `#ifndef BLOXD_STRICT`로 감싸는 이유다.
- `bloxdSp*` 식별자 — **총 14개**: `bloxdSpVertexIn`, `bloxdSpVertex`, `bloxdSpSurfaceIn`, `bloxdSpSurface`, `bloxdSpLightIn`, `bloxdSpLight`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, `bloxdSpPositionW`, `bloxdSpZ`, `bloxdSpEye`, `bloxdSpScale`, `bloxdSpBehind` — 는 엔진 쪽 임시 변수다. 작성하는 코드에는 보이지 않지만 진단과 누군가의 리버스 엔지니어링 출력에 나타나므로, 보는 즉시 알아볼 가치가 있다.
- **기본 surface 지름길.** 베리언트의 surface 훅이 문자 그대로 `bloxdDefaultSurface`이면, 엔진은 `baseColor` / `alpha` 되쓰기 줄을 아예 이어 붙이지 않는다 — 기본값이 이미 그 값들을 만들어 내므로 대입은 죽은 코드가 된다. 수정하지 않은 훅 체인은 비용이 들지 않는다.

**`BloxdLightIn`에 실제로 들어가는 값** — 이어 붙는 코드 기준, 필드별:

| 필드 | 엔진 쪽 공급원 |
|---|---|
| `litColour` | 포그 블렌드 직전에 캡처한 프래그먼트 색 (`bloxdSpLitColour` 앵커) — 헤더가 말하는 「emission과 포그 전」 |
| `directional` | `vTerrainLambert` — 씬의 방향광에 대한 `max(0, dot(normal, lightDirection)) × intensity` 합을 vertex에서 보간한 값 (식은 §54); 씬에 방향광이 없으면 0 |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — 머티리얼별, 프레임별 |
| `blockLight` | 디코드된 light-level varying의 `.rgb` (디코드는 §54) |
| `skyLight` | 같은 light-level varying의 스카이 채널 — *「Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING」* (헤더 텍스트) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | light-level varying의 w 채널과 프레임 uniform `uHeldLightPos` / `uHeldLightColour`로 만든 held-light 항 ([제7부](../internals/) §26이 감쇠와 채널 하한 동작을 기록한다) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **포그가 전혀 없는 씬에서만 검정** (모드 0, §50) |
| `fogVisibility` | 클램프된 포그 계수 — §50 함수가 반환하는 정확한 값 |
| `position` / `normal` | `vPositionW` / `vNormalW` varying (normal은 프래그먼트마다 다시 정규화) |
| `blockFlags` | `vBlockFlags` flat varying — §52의 전체 전달 경로 |

오래된 자료를 읽을 때 방향을 잡기 위해: 동일한 이어 붙이기 구조는 v2 렌더러에도 있었고, v3의 통합 차이는 `vBlockId` → `vBlockFlags`와 액체 베리언트 추가뿐이다. 훅 시스템은 v2 → v3 단절을 거쳐도 구조적으로 안정적이다.

### 50. 포그 함수: 네 가지 모드, 하나의 필드

프로덕션 terrain 셰이더에서 그대로 복원:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // 선형
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // 지수
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // 지수 제곱
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = 포그 꺼짐 (계수는 1.0 유지)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)` — 하나의 vec4가 모든 것을 구동한다.
- **셰이더에는 네 가지 모드가 있다: 0 = 꺼짐, 1 = 지수, 2 = 지수 제곱, 3 = 선형.** 어느 모드가 실행되든 `fogVisibility`는 클램프된 계수다 — 필드는 정확히 하나뿐이고, 모드 플래그는 팩에 노출되지 않는다.
- Bloxd 자체 타이틀은 [제7부](../internals/) §25에 설명된 32블록 대역으로 모드 3 (선형)을 구동하므로 (`fogStart = 32 × D`, `fogEnd = 32 × (D + 1)`), 그 부의 「항상 선형」 관찰은 여전히 출하된 게임플레이를 설명한다. 그러나 지수 모드도 실제로 살아 있는 엔진 코드다 — 타이틀은 클라이언트 업데이트 없이 `vFogInfos.x`를 바꿔 램프를 바꿀 수 있다. 거리 기반 레시피에서 `distance(l.position, bloxdEyePosition())`를 직접 계산하는 방식 (레시피 R-B)은 모드 전환에 영향을 받지 않으므로 거리 기반 외형을 쓰는 견고한 방법이다.
- 이로써 「엔진이 실제로 어느 포그 램프를 쓰는가」라는 질문이 소스로 정리된다: 네 가지가 모두 구현되어 있고, 출하된 타이틀은 선형을 쓴다. (같은 함수가 헤더의 fogColour 주석도 설명한다 — 모드 0은 `fogColour`가 검정으로 도착하는 유일한 경우이며, Bloxd 게임은 모드 0을 출하하지 않고 대신 포그를 멀리 밀어낸다, [제7부](../internals/) §25.)

### 51. bloxdOpaqueBehind(): 정확한 구현

프로덕션 빌드에서 그대로 복원한 함수 전체:

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

- **깊이 텍스처는 `@group(3) @binding(1)`에 있다** — group 3은 팩 자신의 그룹이다: binding 0은 64 B `bloxdPackInputs` uniform (§41), binding 1은 이 깊이 텍스처다. 둘 다 엔진이 제공하며 팩 쪽에서는 이름을 붙일 수 없다.
- **깊이 텍스처는 unfilterable-float, fragment 전용 리소스다.** 바인드 그룹 레이아웃은 이를 `texture: { sampleType: "unfilterable-float" }`로 등록하며 가시성은 `GPUShaderStage.FRAGMENT`뿐이다 — `bloxdOpaqueBehind()`가 `textureSample` 대신 `textureLoad` (명시적 텍셀 좌표, 밉 레벨 0)로 구현된 이유가 바로 이것이다: 이 텍스처에는 하드웨어 필터링이 아예 없다.
- `z ≤ 0`은 깊이 샘플이 아무것도 맞히지 못했다는 뜻이다 (원거리 평면 / 하늘): `found = false`이며 `position` / `distance`는 의미가 없다 — 항상 `found`를 먼저 확인할 것.
- 반환되는 위치는 **광선 스케일 교차점**이다: 불투명 표면은 `eye + (fragment − eye) × max(z / viewDepth, 1)`에 놓인다. `distance`는 눈에서 그 점까지의 거리다 — 물 표면 팩에서는 「광선이 단단한 표면에 닿기 전에 물을 얼마나 통과했는가」가 되며, 이것이 두 번째 깊이 버퍼 없이 깊이 틴트 물 레시피를 가능하게 한다.

### 52. blockFlags 전달 경로: 등록에서 훅까지

§42는 비트의 의미를 설명한다. 이 절은 플래그 비트가 블록 등록에서 훅까지 이동하는 완전한 경로다 — 모든 단계는 프로덕션 소스에서 확인했으며, 헤더의 「면 전체에서 같다」가 바이트 수준에서도 성립함을 증명한다.

**1. 등록 (블록 정의 데이터베이스).** 각 블록의 플래그는 등록 시 한 번 계산된다:

```js
flags[id] = nameFlags                     // 표시명 규칙 (§42): vegetation / dirt / sand / rock
          | (definition.opaque === true ? 1 : 0)   // 불투명 비트 — 엔진 불투명도 데이터
          | (anyFaceEmission >= 1       ? 2 : 0);  // 발광 비트 — 블록 광 방출 데이터
```

표시명 규칙은 네 가지 머티리얼 비트만 담당하고, 두 물리 비트는 별도 엔진 데이터에서 온다 — `opaque`는 블록 정의에서 곧바로, `emissive`는 면별 블록 광 방출 배열에서 온다. 헤더의 「빛나는 광석도 아무리 약해도 포함」은 문자 그대로다: 방출이 1 이상인 면이 있으면 비트가 설정된다.

**2. 블록별 → 머티리얼별 (메셔 초기화).** 지형은 블록 id가 아니라 *머티리얼* 단위로 그려지므로, 플래그는 머티리얼 표로 다시 정리된다 (머티리얼 id로 인덱스하는 `Uint16Array`이며, 각 머티리얼은 소유 블록의 첫 면 플래그를 가진다). 이 표는 메싱 Web Worker로 전달되지만 — **팩 파이프라인이 활성화된 구성에서만** 그렇다. 그 외에는 표가 `null`이고 플래그 바이트가 전혀 기록되지 않는다. 팩이 없는 플레이어는 구조적으로 오버헤드가 0이다.

**3. 정점 바이트로 (메셔 워커).** 플래그는 기존 인터리브 정점 데이터의 여유 바이트 두 개를 탄다:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // 하위 8비트 → color 속성의 alpha 바이트
        buffer[o + normalOffset + 3] = flags >> 8;    // 상위 8비트 → normal 속성의 w 바이트
    }
}
```

면의 네 정점 모두 같은 값을 받는다 — 「면 전체에서 같다」의 구현 수준 의미다.

**4. GPU 쪽 디코드 (Lite terrain 셰이더).** 두 바이트는 `blockFlagWords: vec2u` 정점 속성 (location 7, 팩 파이프라인이 켜졌을 때만 존재)으로 이동하고 vertex 단계에서 재조립된다:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags`는 `@interpolate(flat)`으로 선언된다 — 면마다 일정한 값이 fragment 단계까지 이어지므로, §42의 비트 검사가 면 안에서 안정적이고 면 중간 블렌드가 생길 수 없다.

- 파이프라인은 **16비트** 용량을 예약하지만 (위 디코드는 두 바이트 전체를 재조립한다) v3는 6비트만 정의한다 — 향후 플래그가 정점 형식 변경이나 API 범프 없이 등장할 수 있다.
- packed-vertex 모드에서는 같은 두 바이트가 전용 속성 대신 `packed.y`와 color 워드의 상위 바이트 안에 들어간다 — 값은 같고 컨테이너만 다르다.
- 이 플래그에 가장 자주 묻는 나뭇잎 대 잔디 질문은 §42 아래의 [잔디 없는 나뭇잎](#잔디-없는-나뭇잎-모두가-묻는-질문)을 참조.

### 53. 검증 내부: HEADER_VERSION, 서명, 예약 이름

**실측 헤더 해시.** 모든 팩 검증에는 엔진의 `HEADER_VERSION`이 찍힌다. 프로덕션 검증 모듈을 직접 실행하면 (§54 끝의 하네스 주석 참조) 다음과 같이 측정된다:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← 라이브 프로덕션 번들에서 측정
```

FNV-1a-32 해시이며 (`6.` 접두사), 다섯 입력을 해시한다: 베리언트별로 전처리·토큰화한 엔진 헤더 (8개 베리언트 각각 한 항목), 파서의 전체 WGSL 어휘 우주, 네 매크로 이름, 특수 함수 맵, 그리고 `BloxdPackInputs` 선언과 그 `@group(3) @binding(0)` uniform 줄. 작성자에게 중요한 두 가지 결과:

- **엔진 쪽 헤더가 바뀌면 해시도 바뀐다** — 엔진 업데이트 후 저장 팩이 받는 자동 「재확인 필요」 플래그의 메커니즘이다 ([제8부](../history/v2.md) §31).
- 해시는 *엔진 헤더*를 덮으며 작성하는 코드는 덮지 않는다. 엔진 업데이트를 넘겨 계속 로드되는 팩이 「여전히 유효」한 것은 아니다 — 아직 헤더 변경에 걸리지 않았을 뿐이다. manifest가 참여하는 유일한 버전 검사는 `apiVersion` 게이트다 (§40).

**훅 시그니처 검사: 타입은 토큰 단위로 엄밀, 이름은 자유.** 검증기는 훅 슬롯마다 시그니처 하나를 가진다:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

일치는 **토큰 단위**다: 매개변수 타입 이름이 정확히 일치해야 하고, `->`와 반환 타입도 정확히 일치해야 하며, 매개변수 개수와 쉼표 위치도 검사한다. 매개변수 *이름*은 자유다 — 매개변수 자리에 어떤 식별자든 허용되므로, 템플릿이 `(surface, light)`라고 써도 `fn bloxdTerrainLight(s, l)`이 컴파일된다. light 훅은 정확히 매개변수 두 개를 받는다.

**예약 이름.** 규칙은 정규식 하나다: `/^bloxd/i`. `bloxd`로 시작하는 모든 식별자는 예약된다 — `bloxd*`는 모두 엔진 제공이며, 팩은 그 네임스페이스에 선언할 수 없다 (그래서 §44의 `bloxdPi` / `bloxdTau` 재선언이 충돌한다).

**특수 함수.** v3에는 정확히 하나가 등록되어 있다:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

「특수」는 *매크로에 묶였다*는 뜻이다 — 가용성이 베리언트 심볼에 달린 엔진 함수다. 올바른 사용을 강제하는 가드 진단은 두 가지다:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — vertex 훅이 surface/light 전용 함수에 닿은 경우.
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — 예를 들어 `#ifdef BLOXD_SCENE_DEPTH`로 감싸지 않은 terrain 쪽 `bloxdOpaqueBehind()`.

**엔진 헤더 (프렐류드), 고정.** v3 헤더는 `// Engine-provided and read-only, prepended to all packs. apiVersion 3.`로 시작하는 5,637바이트 문자열이다. 엔진 자체 WGSL 전처리기가 베리언트별로 평가하는 `#if` / `#ifdef` 지시문을 담는다 — 엔진은 실제로 `#if` 식 평가를 실행하며, 잘못된 식은 `Cannot evaluate #if ...`로 오류를 낸다. 이 가이드의 모든 구조체, 함수 시그니처, 인용 주석은 이 렌더링된 텍스트에서 나왔으므로, 가이드와 출하 헤더가 어긋날 수 없다. 전문은 §54 끝에 그대로 실린다.

**작성자를 위한 파서 주의사항.**

- 팩 쪽 함수는 엔진 셰이더에 병합될 때 `pack_` 접두사로 이름이 바뀐다 (충돌 회피). 진단은 이를 원래 이름으로 되돌린다 — [제8부](../history/v2.md) §38이 설명하는 제2 검증 단계와 같은 메커니즘이다.
- 미선언 식별자 메시지는 `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`다. `_ can only be the target of a phony assignment, as in _ = f();`와 `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.`가 새로 확인된 메시지 집합을 이룬다.
- 파서의 어휘 우주에는 **표준 WGSL이 아닌** 식별자도 들어 있다: `bufferView`, `bufferArrayView`, `bufferLength`, `atomicStoreMax`, `atomicStoreMin`. 엔진은 이를 내장으로 알지만, 특정 브라우저의 WGSL 구현이 이를 제공한다고 보장할 수 없다 — 배포용 팩을 이것들에 기대어 만들지 말 것.

### 54. 확인된 상수, 제한, 레이아웃

프로덕션 Lite 렌더러에서 그대로 가져온 terrain 프로그램의 전체 리소스 레이아웃:

| Binding | 내용 |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms` — `viewProjection` mat4x4f, `view` mat4x4f, `vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`, `uSkyLightColour`, `uAmbientLightColour`, **`vFogInfos`**, `vFogColor`, `outputHeight`, `sceneAmbient`, **`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: storage `array<vec4f>` — xyz = 렌더 프레임으로의 평행 이동, w = 페이드인 가시성 |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`, `ambientAndCutoff`, `emissiveAndLevel`, `anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — 팩 uniform (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — 깊이 텍스처 (§51) |

- **방향광은 최대 네 개로 하드 캡된다.** 씬이 더 등록하려 하면 렌더러는 `Terrain supports 4 directional lights, not ${n}`으로 오류를 낸다. `l.directional`은 존재하는 만큼 (0–4개, Bloxd 자체 씬은 2개 사용 — [제7부](../internals/) §27)의 Lambert 합이다. terrain은 또한 처리할 수 없는 light에 대해 다음과 같이 경고한다, 그대로 옮기면: 늦게 추가된 light — `Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`; 색이 입혀진 light — `Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`; 메시 필터링 light — `Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **terrain 프로그램 이름**: 파이프라인 캐시 키는 `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}`로 읽힌다 — 팩은 `-sp{variant}` 접미사로 나타나며, §46 베리언트마다 프로그램 하나다. 감시자 (`watchPipelineFailures`)는 살아 있는 파이프라인 이름을 `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/`와 대조해 파이프라인 컴파일이 실패하면 일치하는 팩 베리언트를 다시 검사한다; GPU 장치 손실 (`device.lost`)은 검사를 건너뛴다.
- **`BLOXD_TERRAIN_DIRECTIONAL`은 엔진 내부 매크로**다 (dirLightCount > 0일 때 정의). 프렐류드의 네 매크로 중 하나가 아니며 팩 코드에 절대 도달하지 않지만, 엔진 자체 셰이더의 WGSL 덤프에는 나타나므로 알아 두면 혼동을 줄일 수 있다.
- **light-level 디코드**: `aPackedLightLevels` 정점 속성은 니블 네 개를 담은 f32 하나이며, 각각 15로 나뉜다: rgb = 유색 블록 광, a = 스카이 / held 채널. vertex 단계는 이를 `vLightLevels` varying으로 디코드하고, `blockLight`는 `.rgb`를, 스카이 / held 채널은 `.w`를 읽는다. 엔진은 보간 전에 rgb 채널을 가장 밝은 채널의 35%로 바닥 처리한다 — [제7부](../internals/) §26이 게임플레이에서 기록한 리프트의 엔진 쪽 기준점이다.
- **`vTerrainLambert`** (`directional`의 공급원, §49)는 활성 방향광에 대한 합으로 생성된다: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, `BLOXD_TERRAIN_DIRECTIONAL`로 가드된다.
- **인덱스 버퍼는 첫 대형 메시에서 32비트가 된다.** Lite 렌더러는 모든 인덱스 값이 65,534 이하로 유지되는 동안만 `Uint16Array` 인덱스를 고른다 — 어떤 인덱스든 65,535에 도달하는 순간 버퍼는 `Uint32Array`가 된다 (버퍼마다 `is32Bits` 플래그로 추적한다). 실제로는: 정점이 최대 65,535개인 청크 메시는 16비트 인덱스에 들어가고, 정확히 65,536개인 메시는 반드시 인덱스 65,535를 내보내 버퍼 전체가 32비트로 전환된다.
- **manifest 로딩 세부**: `__MACOSX/` 아래 zip 항목, `._` 접두사 파일, `.DS_Store`는 필터링된다 (macOS 아카이브 노이즈). `pack.json`은 소문자 경로 비교로 찾는다 — 0개 일치 → `loadNoManifest`, 2개 이상 → `loadDuplicateManifest`; manifest 읽기는 65,536바이트로 제한된다.
- **이 모든 것을 어떻게 검증했는가**: 프로덕션 번들의 모듈을 복원하고 (165개 청크; 이 번들의 webpack 레지스트리는 4,951개 모듈을 세지만 — 비동기 자식 의존성을 포함하는지에 따라 모듈 수는 몇 개씩 달라지므로 정확한 숫자는 번들별로 다루는 것이 좋다) Node.js의 webpack 호환 하네스에서 실행했다. 측정된 `HEADER_VERSION` (§53), 렌더링된 5,637바이트 헤더, 베리언트 표의 정규 순서, 특수 함수 맵은 모두 문자열을 읽은 것이 아니라 *출하된 코드를 실행*해 얻은 것이다. 같은 하네스는 커뮤니티 `pack_check` v6의 자연스러운 핵심이다 — 엔진 자체 검증기를 팩에 대해 실행하면 판정을 정확히 재현한다.
#### v3 엔진 헤더, 그대로

고정된 5,637바이트 (127줄) 텍스트 자체 — 위 §53이 설명한 그 유물이다 — 이 부분이 대상으로 하는 v3 프로덕션 빌드 `3ymzdd`에서 그대로 복원했다. [제11부](../api/texture-catalog.md) §67의 v4 헤더에 대한 v3 대응물이며, 같은 이유로 전체를 싣는다: v3 팩을 엔진이 실제로 앞에 붙인 바로 그 텍스트 기준으로 디버깅하고, 모든 v3 → v4 차이 ([제10부](../history/v4.md) §58–§59)를 두 텍스트를 나란히 놓고 직접 읽을 수 있게 하기 위함이다.

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

조사: ltf_ahel (glm 을 사용해 조사)

---


## 제10부: API Version 4 마이그레이션 가이드 (2026-10-26, 요약)

> **2026-11-03 대체됨: 현행 API는 버전 5** — v4 팩은 여기서 v3에 대해 서술한 것과 똑같이 로드 시 거부된다. 이 부를 적용한 뒤 [제12부](../history/v5.md)를 적용하라 (v4 → v5: `BloxdFlags` 구조체가 `blockFlags`를 대체, `bloxdLit()`와 공개 조명 레시피, 인챈트/오버레이 입력, 9-훅 기본 팩). 이 부의 내부 사항 (§56–§66)은 측정 대상이었던 v4 빌드에 대해 정확한 상태로 남는다.

> 이 문서는 이 언어용 간략 요약이다. 모든 세부사항·예제 레시피·복원된 엔진 내부 (§55–§66)를 담은 완전판은 [영어](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md) 와 [일본어](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md) 판에 있다.

대상 빌드: `cnty9.main.669f8081.js` — **2026-10-26부터 프로덕션과 프리프로드에 동시 적용** (양쪽 모두 바이트 동일). 팩 모델은 형태를 유지한다: 같은 `pack.json` 필드, 같은 로더 제한, 같은 64 B uniform, 같은 6개 훅.

`tcwczu.main.357faec1.js`(2026-10-30, 프로덕션과 preprod가 다시 바이트 동일)로 재검증: **v4 API 전체는 변화 없음** — 헤더, 기본 팩 템플릿, 27개 `bloxdSp*` 심볼, 로더 제한, allow 12 타이틀이 모두 이 문서의 `cnty9` 기준과 바이트 단위로 동일하다. 번들 구성은 또다시 바뀌었지만(예: 클러스터가 이제 c51–c56) 팩에는 아무 영향이 없다; 텍스처 이름 레지스트리는 재측정하지 않았다(이름이 여전히 안정적인 API다).

### 바뀌는 것

- `pack.json`은 `"apiVersion": 4` 를 요구 (엄격 `===`, 숫자) — v3 팩은 로드 시 거부.
- **새 텍스처 API (핵심):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` 는 블록 텍스처 아틀라스를 엔진 자신과 정확히 같은 방식으로 샘플링한다 (id 0 = 흰색; 애니메이션 텍스처는 자동으로 현재 프레임 반환), `bloxdTextureSize(mipLevel) -> vec2u`, 그리고 명명 상수 `bloxdTextureId*` (파일명의 CamelCase, 예: `grass_top` → `bloxdTextureIdGrassTop`; 905개 사용 가능 이름 전체의 카탈로그가 제11부 (`11-reference.md`) §68에 내장되어 있다).
- `BloxdSurfaceIn` *과* `BloxdLightIn` 에 **4개的新 입력 필드**: `textureId`, `textureRotation` (시계방향 4분회전, `bloxdTexel` 이 적용), `uv` (블록 단위; `fract(uv)` 가 그려짐), `mipLevel`.
- **의미가 바뀌는 개명:** `fogVisibility` → `fogAlpha`, 의미 **반전** (`0 = 포그 없음, 1 = fogColour 만`; 포팅: `l.fogVisibility` → `1.0 - l.fogAlpha`); `bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (본체 동일); `BloxdOpaqueBehind.found` → `hit`.
- **strict 게임이 번들 내장 검증기로 강제됨:** 가드 없는 버텍스 훅이나 도달 가능한 `discard` 는 `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...` 를 내고 strict 게임에서 **모든** 훅을 비활성화한다. `#ifndef BLOXD_STRICT` 랩을 쓰면 surface/light 는 계속 동작.
- 나머지는 동결: 6 훅, `blockFlags` 비트 (1/2/4/8/16/32), uniform 레이아웃, 로더 제한, 배리언트 행렬, 12개 allow 타이틀 (`cnty9` 에서 2026-10-27 불변 재확인).

### 간단 마이그레이션

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (숫자) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` 또는 `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| 가드 없는 버텍스 훅 | `#ifndef BLOXD_STRICT ... #endif` |

완전한 레퍼런스 자료가 이제 가이드의 일부다: 그대로 복원된 엔진 헤더와 905개 사용 가능 이름 전체를 담은 텍스처 카탈로그가 제11부 (`11-reference.md`)에 있다. 전체 세부사항 — `bloxdTexel` 의 회전 미묘함, 복원된 샘플링 WGSL, 이름 레지스트리, 레지스트리 해시를 포함한 새 `HEADER_VERSION` 구조 — 는 영어·일본어 완전판에 있다.



---

### 67. 완전한 v4 엔진 헤더, 그대로

엔진이 모든 팩 앞에 붙이는 6,021바이트(150줄) 헤더 — 첫 줄은 `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.` 미포함: 렌더러 구성마다 생성되는 `bloxdTexel`/`bloxdTextureSize` 쌍(§63.1)과 27개 `bloxdSp*` 심볼(§63.4). `#ifdef BLOXD_ALPHA` 게이트는 엔진 프리프로세서가 변형별로 해석한다.


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


## 제12부: API 버전 5 마이그레이션 가이드 (2026-11-03, 요약)

> 이 문서는 이 언어용 간략 요약입니다. 모든 세부 사항, 예제 레시피, 전체 복원된 v5 헤더, 엔진 내부 동작(§69–§82)을 담은 전체 버전은 [영어](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/12-apiv5.md)와 [일본어](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/12-apiv5.md)에 있습니다.

대상 빌드: `ab90qa.main.6188124c.js` — **2026-11-03 기준 프로덕션과 preprod에 동시 적용** (두 환경 모두 바이트 동일, md5 검증). v3 이후 가장 큰 API 개정입니다: 엔진 헤더가 6,021바이트에서 **8,954 디코딩 바이트**로 커지고 거의 모든 구조체가 필드를 얻었습니다.

### 무엇이 바뀌는가

- `pack.json`은 `"apiVersion": 5`를 요구 (엄격 `===`, 숫자) — v4 팩은 로드 시 거부되며, 저장된 v4 팩은 조용히 비활성됩니다.
- **`blockFlags`가 구조체로 교체됨 (핵심 변경):** 6개 비트 상수 `bloxdBlockFlag*`는 사라지고 **`flags: BloxdFlags`** — 이름 붙은 14개 bool 필드 (6개는 기존 비트의 개명, 8개는 신규): **`slab` `stairs` `flat` `placed` `held` `dropped` `thrown` `lifeform`**. 모델, 손에 든 아이템, 생명체를 이제 지형과 구별할 수 있습니다.
- **`#ifdef BLOXD_LIGHTING` 제거:** 컴파일 시점 스위치 대신 새 헤더 함수 **`bloxdLit()`**로 런타임 검사; 유니폼에 `lit: u32` 추가 (오프셋 4, 총 크기는 여전히 64 B). 변형 행렬은 8에서 6으로 (`strict|allow` × `terrain|liquid|model`).
- **엔진의 조명 레시피 공개:** 새 함수 3개 — **`bloxdShading(light)`**, **`bloxdWorldLight(light)`**, **`bloxdLitColour(surface, light)`** — 그리고 `BloxdLightIn`의 새 입력 2개 (`diffuse`, `emissive`).
- **새 입력:** 모든 입력 구조체에 `localPosition: vec3f` (모델 좌표, 지형에서는 0); Surface/Light에 `enchantTier` / `enchantColour` / `enchantSpeed` / `overlayColour` (인챈트와 피격 플래시); `BloxdSurface`에 **새 출력** `enchantColour` / `overlayColour` (bloxdLitColour가 혼합).
- **제거됨:** `bloxdFragmentBlockPosition()` (대체 없음), `bloxdBlockFlag*` 상수, `bloxdSpLitColour`.
- **기본 팩 템플릿이 이제 9개 훅 전부를 포함** (라이트 훅 포함, 1,122 → 1,683 바이트)하며, 삭제 모델을 주석으로 설명합니다: *"If you delete a hook, the default is used instead."*
- 헤더에 새 상수: `const bloxdChunkSize: i32 = 32;`. Y-도함수는 자동 부호 반전: `dpdy`/`dpdyCoarse`/`dpdyFine`은 `(-dpdy(...))`로 재작성됩니다. `HEADER_VERSION`은 `9.<hash>.<hash>`로.
- `bloxdSp*` 네임스페이스는 27에서 **46 심볼**로; 텍스처 레지스트리는 **896개 사용 가능 이름** (+1 `scorpion_eggs`, −10 — `chest_double_*` 계열과 `mob_spawner_*_block_side` 포함) — 이름이 API이고 id는 스냅샷일 뿐.
- 나머지는 동결: 로더 제한 (256 `.wgsl` / 256 KB / 64 KB / 32 MB / 1,024 항목), 훅 이름, strict 계약 (allow 12 타이틀), group-3 바인딩.

### 간략 마이그레이션

| v4 | v5 |
|---|---|
| `"apiVersion": 4` | `"apiVersion": 5` (숫자) |
| `(s.blockFlags & bloxdBlockFlagVegetation) != 0u` | `s.flags.vegetation` |
| `#ifdef BLOXD_LIGHTING … #endif` | `if (bloxdLit()) { … } else { return bloxdDefaultLight(s, l); }` |
| `bloxdFragmentBlockPosition(p, n)` | 삭제됨 — `bloxdWorldPosition()` / `flags` 사용 |
| (기존에 없음) | `s.flags.held`, `s.flags.lifeform`, `s.localPosition`, `s.enchantTier` … |

전체 복원된 v5 엔진 헤더 (8,954 바이트, 전문 그대로)와 텍스처 이름 드리프트 전체 목록은 영어·일본어 전체 버전 (§82, §80)에 있습니다.

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

## 엔진 기존 조명과 리얼화의 여지



엔진 기존의 조명은 곱셈뿐이며, 스페큘러·프레넬·난색-냉색 분리·반구 환경광은 존재하지 않는다. 아래가 재구축 가능한 범위이다:

| 기능 | 기존 | 팩으로 가능? |
|---|---|---|
| 확산 (Lambert) | 방향광의 스칼라 총합뿐 | ◎ `bloxdSunDirection()` 으로 직접 구현 (랩광원 등) |
| 스페큘러 (경면 반사) | 전무 | ◎ Blinn-Phong (R9.2) |
| 프레넬 | 전무 | ◎ Schlick 근사 (R9.3) |
| 난색 토치 / 냉색 하늘빛 분리 | 무색 | ◎ (R9.1) |
| 반구 환경광 | 무방향 | ◎ 위=하늘색 / 아래=바닥 튐 (R9.4) |
| 톤맵 | 없음 (clamp 뿐) | ◎ ACES 필믹 (R9.5) |
| 대기 원근법 | 포그 (색 교체) 뿐 | ◎ 거리 디새추레이트 (R9.6) |
| 표면 디테일 | 텍스처 해상도뿐 | △ 해시 노이즈 절차적 마이크로범프 (R9.8) |
| 정점파 (수면) | 전무 (평면) | ◎ allow 한정 (R7) |
| 파법선 / 태양 글린트 | 전무 | ◎ (R9.7) |
| 밤의 달빛 처리 | 하늘색이 어두워질 뿐 | △ 달의 방향은 `-bloxdSunDirection()` 에 있다: 유사 표현 (R2 밤의 파란 환경광 / R9.11) + 방향성 달빛 (R-A, 낮밤 사이클 한정) |
| 그림자 (하늘 가림) | `mix(환경색, 하늘색, skyLight)` 로 살짝 섞을 뿐 | ◎ 리프트 역변환 + 임계값 커트 + 태양 게이트 (R9.12). 나무 그늘·처마 밑이 명확히 떨어지고 블록 편집에 실시간 추종 |

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

## 물을 자연스럽게 보이게 하는 통합 레시피



이 API에서는 씬색을 샘플링할 수 없으므로, **진짜 반사·굴절이 아니라, 프레넬풍의 색 블렌드와 태양 하이라이트에 의한 유사 표현**이 된다 (수심 계산은 v2의 `bloxdOpaqueBehind()` 로 가능해져, [제8부](../history/v2.md) R-E에 분리했다). 아래는 색의 베이스를 남기면서, 얕은 시선 각도로 하늘색에 가까운 색을 조금 섞고, 태양이 있을 때만 작은 글린트를 더하는 샘플.

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

조정 기준:

- 물이 하얗다 / 밝다: `fresnel * 0.38` 의 `0.38` 과 글린트의 `0.55` 를 낮춘다.
- 물이 진하다: `fakeSkyReflection` 의 혼합률을 조금 올린다. 단 올리면 플라스틱처럼 보인다.
- 수면에 선도 규칙적인 줄무늬가 보인다: 파의 주파수나 글린트 강도를 낮춘다. 수면 메시 자체의 정점 변위는 이 코드에는 없다.
- 실제 경치를 비추고 싶다: 이 API 입력에는 화면색이 없으므로, 색을 섞을 뿐 실반사가 안 된다 (깊이는 액체 한정으로 얻을 수 있다. [제8부](../history/v2.md) R-E).

이 레시피는 기존의 `bloxdLiquidLight` 를**바꾼다**는 것. R9.7 의 동명 파법선 함수나 다른 동명 훅과 중복해 붙이지 않는다.


### 셰이더 팩과 수중의 실상



수중 겉모습은 3층으로 되어 있다:

| 층 | 내용 | 팩에서 다룰 수 있는가? |
|---|---|---|
| ① 지형/액체 그리기 | 훅으로 다룰 수 있다. light 훅은 수중에서도 평소처럼 불린다 | 가능 (「베일 밑」 에서 통한다) |
| ② 액체 정의색 베일 | 카메라가 들어간 액체 블록 정의 color/alpha 의 emissive 풀스크린 quad 로, 훅 파이프라인 밖 (최전면) 에 그려진다. 게임 설정 `cameraTint` 이 있으면 그쪽이 우선 | 불가 (색도 농도도 바꿀 수 없다) |
| ③ cameraTint | 게임 설정 | 불가 |

실무 포인트: 팩은 수중에서도 계속 동작한다 / 베일은 없앨 수 없다 / 수중에서는 분기할 수 없다 (fogStart / fogEnd / fogColour 는 수중에서도 변하지 않으므로 fogVisibility 로도 검출할 수 없다).

---

## 야간에 「그림자는 어두운데 표면만 밝다」 를 고친다



그림자만 어둡게 하면, 태양 없을 때 엔진 완성색 (`engineColour`) 이 밝은 채 남아, 면과 그림자의 차이가 부자연스러워질 수 있다. 그림자의 색조가 아니라 완성색 전체에 감쇠를 걸 필요가 있다.

다음 예는 `bloxdSunDirection()` 이 제로면 밤측, 방향이 있으면 낮측으로 보고, 어두운 시간은 지형의 완성색을 감쇠시킨다. 조명 대응 베리언트에서는 `blockLight` 와 `heldLight` 가 강한 장소일수록 감쇠를 약하게 해, 횃불 등의 근거리광을 가급적 남긴다. `0.52` 는 조정값으로, 더 어둡게 하고 싶으면 작게 한다.

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
    // 완성색을 감쇠시키고, 소재의 emission 은 기존대로 포그를 통해 가산한다
    out.colour = l.engineColour * scale + s.emission * (1.0 - l.fogAlpha);
    return out;
}
```

**이 처리의 한계:** `bloxdSunDirection()` 의 동작이 「태양 있음=단위 방향, 태양 없음=제로」 의 두 값이라면, 낮과 밤의 구별은 되어도 노을·박명을 연속적으로 추정할 수 없다. 또 완성색을 감쇠시키므로, 엔진측의 주광·환경광을 함께 약하게 하는 방식이며, 시간대를 완전히 재현하는 것은 아니다. 액체에도 같은 처리를 적용하고 싶으면 액체 훅의 폴백 관계를 확인할 것.

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

## 리얼화의 구현 유파 — 2가지



**유파 A: 가산 수정 (defaultLight 기점)** — `engineColour` (완성색) 를 바탕으로, 난색 글로우나 림을 더한다. 간편하고 안전하지만 조명 모델 자체는 기존 그대로.

**유파 B: 완전 리라이팅 (s.colour 기점)** — `l.engineColour` 을 버리고 `s.colour` (알베도) 와 LightIn 생소재에서 조명을 다시 짠다. 리얼화의 본명. 지킬 4점:

1. **포그를 다시 건다**: light 훅은 최종단 (포그 뒤) 에서 불리므로 `mix(l.fogColour, col, (1.0 - l.fogAlpha))` 를 직접 적용한다 (R9.10). 짙을 때는 `min(l.fogAlpha, 0.70)` 으로 하한을 깐다. 반대로 engineColour 기점 팩에 포그색을 더 섞으면 이중 포그로 원경이 하얗게 뜬다
2. **조명off 베리언트 폴백**: `#ifdef BLOXD_LIGHTING` 밖에서는 `defaultLight` 로 그대로 통과시킨다
3. **공용 함수째 가드한다**: `BloxdLightIn` 을 인수로 취하는 공용 함수는 fn째 `#ifdef BLOXD_LIGHTING` 로 감싼다 (호출측만으로는 불충분)
4. **태양 방향이 없을 때**: `bloxdSunDirection()` 이 제로면 방향성 스페큘러는 계산하지 않는다. `l.directional` 은 광량의 스칼라지 방향 벡터가 아니므로 하이라이트 방향을 복원하는 용도로는 쓸 수 없다. 필요하면 방향성 없는 약한 환경광으로 전환한다. 단 달의 방향은 `-bloxdSunDirection()` 으로 얻을 수 있다 (낮밤 사이클 월드에서만 움직인다. [제7부](../internals/) R-A)

---

## 도달할 수 없는 표현 (리얼화의 「천장」)



| 표현 | 이유 |
|---|---|
| 픽셀 정밀 섀도맵 (태양과 함께 도는 그림자·반음영) | 깊이 텍스처 참조 불가 (액체 한정의 `bloxdOpaqueBehind()` 는 기하 정보뿐이라 섀도맵에 쓸 수 없다). 광선 가림 판정도 훅에 입력되지 않는다 |
| SSAO | 씬 깊이에 접근 불가 (메셔 구운 정점 AO 뿐. 액체 한정의 깊이는 SSAO에 쓸 수 없다) |
| SSR (반사) | 씬색을 얻을 수 없다. 프레넬로 하늘색을 얹는 유사뿐 |
| 블룸 / 글레어 | 포스트프로세스에 훅이 존재하지 않는다 |
| 피사계 심도·색수차·그레인 | 풀스크린 후처리가 필요 |
| 체적광 (god rays) | 마찬가지 |
| PBR 텍스처 | 텍스처 참조 금지. 색의 휘도에서 유사 추정뿐 |
| 수중 굴절 | 씬색을 얻을 수 없다. 액체 한정의 깊이 (`bloxdOpaqueBehind()`) 로 두께 흡수·바닥 투영이 가능 ([제8부](../history/v2.md) R-E) |
| 수중 베일 (파란 틴트) 제거·변경 | 베일은 「카메라가 들어간 액체 블록 정의 color/alpha」 에서 생성되는 emissive 풀스크린 quad 로, 훅 파이프라인 밖 (최전면) 에 그려지므로 팩에서는 색도 농도도 바꿀 수 없다 |
| 수중 직접 검출 | 카메라가 수중인지 나타내는 입력이 없고, 수중에서도 fogStart / fogEnd / fogColour 는 변하지 않으므로 fogVisibility 등에서 수중을 추정하는 믿을 만한 방법도 없다 |

### 그림자의 진실 — 「나무 그림자」 는 만들 수 있다

위 표에서 불가능한 것은 **태양과 함께 도는 픽셀 정밀 섀도맵** 뿐이다. 엔진은 처음부터 「그림자」 를 계산하고 있으며, 그것이 `skyLight` 이다. 메시측 LightEngine 은 마인크래프트식 알고리즘으로 돈다:

1. **종열 스캔**: 각 (x,z) 열을 위에서 아래로 훑는다. 하늘에서 오는 빛은 15 로 시작해, **불투명 블록에서 0** 이 되며, `lightFilter` (공기 1 / 물 3 / 불투명 15) 로 감광하면서 내려간다
2. **BFS 플러드필**: 6근방으로 옆 확산 (1 블록에 -1) — 이것이 그림자 가장자리를 부드럽게 하는 정체. 반경 r 가림물 밑의 생값은 (15-r)/15 가 된다
3. blockLight (횃불 등) 는 RGB 3채널 (4bit 팩) 의 별도 BFS

즉 `l.skyLight` 는 단순한 밝기 파라미터가 아니라 **「그 장소에서 하늘이 보이는가」 의 복셀 분해능 가림 데이터 = 섀도맵** 이다. 나무 밑·처마 밑·실내는 수치로 이미 낮으며, 정점 보간으로 매끄럽게 도착한다. 블록을 두거나 부수면 LightEngine 이 즉시 재계산한다 = **실시간 추종 그림자** 이다. 바닐라는 이것을 `mix(환경색, 하늘색, skyLight)` 로 살짝 쓸 뿐이다.

올바른 도구는 R9.12 의 2단계 (**리프트 역변환으로 생값 복원 → 임계값 `smoothstep` 으로 이값화**. `th = 1 - r/15` 가 직접 「그림자로 간주하는 가림 반경」 다이얼) 에, **태양 직사광을 sky 로 게이트** (태양은 하늘이 보이는 장소에만 닿는다 = 투영의 정체) 를 더해, 낮=난색 / 그림자=냉색으로 물들이는 구성이다.

**솔직한 제한**: 이 그림자는 「위쪽 하늘」 기준이므로, **태양이 시간으로 움직여도 그림자는 돌지 않는다**. 분해능은 블록 단위 (부드러운 가장자리는 BFS 확산에 의한 것). 참고로 엔진 조명 템플릿에는 `var shadow: f32 = 1.;` 라는 섀도맵용 마개가 닫힌 채 남아 있으며 (항상 1.0 = 무효), 픽셀 정밀 회전 그림자는 「장래 구현 예정」 의 흔적으로 해석된다. 픽셀 정밀 회전 그림자가 꼭 필요하면, API 밖 수단 (userscript GLSL 주입 등) 을 검토할 수밖에 없다.

### 수중의 실체

수중 겉모습은 3층으로 되어 있다:

| 층 | 내용 | 팩에서 다룰 수 있는가? |
|---|---|---|
| ① 지형/액체 그리기 | 훅으로 다룰 수 있다. light 훅은 수중에서도 평소처럼 불린다 | 가능 (「베일 밑」 에서 통한다) |
| ② 액체 정의색 베일 | 카메라가 들어간 액체 블록 정의 color/alpha 의 emissive 풀스크린 quad 로, 훅 파이프라인 밖 (최전면) 에 그려진다. 게임 설정 `cameraTint` 이 있으면 그쪽이 우선 | 불가 (색도 농도도 바꿀 수 없다) |
| ③ cameraTint | 게임 설정 | 불가 |

실무 포인트: 팩은 수중에서도 계속 동작한다 / 베일은 없앨 수 없다 / 수중에서는 분기할 수 없다 (fogStart / fogEnd / fogColour 는 수중에서도 변하지 않으므로 fogVisibility 로도 검출할 수 없다).

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

## 실기 테스트 체크리스트



컴파일 성공과 「보기 좋다」 는 별개이므로, 다음 순서로 확인한다.

1. **읽기:** `pack.json` 이 ZIP 직하에 있을 것. 선택 직후는 `Ready. Reload the page to use it.` 이 표시되고, **페이지 재읽기로 유효화**된다. 재읽기 후 `Ready to use` 가 되는지 확인한다. 한번 저장한 팩은, 엔진측의 사양 헤더가 갱신되면 헤더 내용의 지문 대조에 의해 다음 페이지 읽기 때 자동으로 재검증된다 (합격이면 그대로 유효 / 불합격이면 blocked 표시). 낡은 팩이 망가진 채로 조용히 유효한 채 남는 일은 없다.
2. **8 베리언트:** strict / allow, 조명 on / off, terrain / liquid 각 조건에서 타입 가드 누락이 없을 것. 게임이 일부 조건만 쓰더라도, 배포용 팩은 8가지를 전제한다.
3. **주간:** 풀·돌·모래·목재 등 소재마다 색이 날지 않았는가, 윗면과 측면의 명암차가 부자연스럽지 않은가를 본다.
4. **야간:** 해가 비출 때와 같은 소재, 그림자, 횃불 근처를 비교한다. 밝은 면만 남으면 노출 감쇠, 전부가 어두워지면 국소광 보호를 조정한다.
5. **물:** 바로 위·얕은 시선 각도·기슭·수중·밤을 따로 본다. 알파 거동과 수중 보기는 게임측 합성 방식에 의존하므로, 하나의 시점만으로 판단하지 않는다. 수중은 [제7부](../internals/)의 대로 액체 정의색 베일이 최전면에 걸리므로, 팩 유무의 차이는 주로 수면과 베일 너머의 지형에서 확인한다.
6. **경계와 거리:** 청크 / 원점 전환으로 파도나 무늬가 튀지 않는가, 원경에서 이중 포그나 흰 안개가 나오지 않는가를 확인한다.
7. **성능:** 해시·삼각 함수·`pow` 를 남용하는 효과는 필요 최소한으로 한다. 디테일을 조금씩 추가해 FPS를 비교한다.

### 알려진 제약을 전제로 한다

- shader pack 은 terrain / liquid 훅에 한정되며, 하늘·엔티티·UI를 같은 코드로 처리하는 구조가 아니다.
- 섀도맵, 화면 공간 반사, 굴절, 블룸 등을 추가하기 위한 입력은 이 API에 없다 (씬 깊이는 액체 한정으로 `bloxdOpaqueBehind()` 로 풀렸다. [제8부](../history/v2.md) 참조).
- `bloxdSeconds()` 은 애니메이션용 시간으로, 게임 안의 낮밤과 연동된다는 보장은 없다.
- `bloxdSunDirection()` 이 제로면 진짜 달의 방향은 알 수 없으며, 파란 환경광을 더하는 처리는 분위기를 만드는 근사. 방향성 달빛은 `-bloxdSunDirection()` 으로 만든다 (낮밤 사이클 월드 한정. [제7부](../internals/) R-A).
- `s.position` / `l.position` 은 로컬 좌표이므로, 월드 위치에 의존하는 효과에서는 `bloxdRenderOffset()` 을 더한다. 블록 안 로컬 무늬를 만들 경우는, 의도적으로 로컬 좌표를 쓸 수도 있다.

---

## 셰이더 단독으로 한계가 있을 경우의 조합



셰이더 팩측에서 텍스처를 추가·샘플링할 수 없다는 제약이 있으므로, 소재 그 자체의 미세한 요철이나 하늘의 화상을 바꾸고 싶으면 셰이더만으로 해결하려 하지 않는다. Bloxd.io용 공개 텍스처팩 리포지토리 [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) 에는 텍스처, skybox, 모델 등을 다루는 별도 방식이 있다. 이것은 셰이더 팩 API의 공식 사양서가 아니라, 별 시스템의 리소스 예로서 참조한다.

참고로, 커뮤니티에서 「cinematic shader」로 유통되는 배포물을 해석한 사례에서는, 내용은 텍스처팩 (128x128 텍스처로 `pack.json` / `.wgsl` 을 포함하지 않음) 이었다. 「그림자 있는 셰이더풍」의 겉모습 대부분은 텍스처 측의 고안이며, 셰이더 팩으로 빛과 그림자를 나눠 만드는 (R9.12) 방침과, 텍스처 측의 보완을 조합하는 것이 현실적이다.

현실적으로는, **셰이더로 빛과 색을 조정하고, 대응하는 별도 리소스팩으로 소재나 하늘을 보완**하는 방침이 좋다. 단, 별도 팩과의 동시 이용 가능 여부나 읽기 순서는 게임측의 구현·설정으로 확인할 것.

텍스처팩 측에도 사양이 있다 (참고): 크기 상한은 base64 변환 후의 JSON 문자열 길이로 25MB이며, PNG의 base64화는 +33% 팽창하므로, 원본 이미지의 합계는 ~18-19MB가 실질 상한이 된다. CSS는 정규식을 이용한 간이 해석으로 처리되므로, 중첩이나 주석은 쓰지 않는다.

---

## 디버깅 요령



- 동굴이 너무 밝다 → `skyLight` 의 비선형 커브가 부족하다 (R2 동굴 레시피 / R9.9)
- 낮이 하얗게 날린다 → ACES 앞의 노출을 낮춘다
- 밤이 어두워서 아무것도 안 보인다 → 최소 환경광을 확보한다 (밤의 `skyLightColour` 는 거의 흑이 되는 것이 전제)
- 원경이 너무 흐리다 → 대기 계수를 낮춘다
- 횃불 주위가 오렌지투성이 → 난색 블렌드 비율을 낮춘다 (생 날색광을 남긴다)
- 블록이 거의 새하얘진다 → light 훅 출력 합계가 1.0 초과 (출력 뒤에 클램프는 없음). 마지막에 `clamp(col, vec3f(0.0), vec3f(1.0))` 를 넣는다
- 가산이 없는데 하얗다 → fogVisibility 나눗셈 un-fog 역산이 원인. un-fog 를 빼고, 다시 짤 거면 `s.colour` 기점으로 포그는 마지막에 한 번만 `mix`
- 발광 블록이 빛나지 않는다 → 재구축 계열에서 emission 재가산 누락. `+ s.emission * (1.0 - l.fogAlpha)` 를 더한다
- 밤인데 비춰진 면만 밝게 남는다 → 그림자만 어둡게 하지 말고 완성색 (`engineColour`) 전체에 야간 감쇠를 건다. 국소광을 남기려면 `blockLight` / `heldLight` 로 감쇠를 약하게 한다 ([제6부](../guides/) 19절)
- `pow(skyLight, γ)` 를 올려도 그림자가 짙어지지 않는다 → `l.skyLight` 는 리프트 후의 값 (10장). R9.12 의 역변환 + 임계값 커트로 전환한다
- 그림자 면적·농도를 조정하고 싶다 → R9.12 의 조정 가이드 참조 (면적=임계값 `shTh` / 가장자리=`shSoft` / 그림자 심의 어둡기는 최저 환경광과 하늘 산란광의 2점 시프트)

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

## 색 레시피 (surface)



### 단색 틴트 (가장 기본)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 채도 부스트 / 디새추레이트

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 으로 선명하게 / -1.0 으로 완전 모노크롬
```

### 색온도 (따뜻함 ⇄ 차가움)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = 따뜻함 (빨강 강함), -1.0 = 차가움 (파랑 강함)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### 빈티지 / 세피아

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### 고도 그라데이션 (낮은 땅을 따뜻하게)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 고도 0..50 에서 1..0
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 면의 방향으로 칠하기 (위쪽=밝게, 벽=어둡게)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // 바닥 1 / 벽 0 / 천장 -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // 벽은 다소 어둡게 천장도 어둡게
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 포스터리제이션 (색수를 줄이기)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

---

## 조명 레시피 (light)



### 콘트라스트 S자 커브

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### 거리 헤이즈 (독자 포그)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 64 블록에서 192 블록으로 0..0.35 의 포그를 직접 더한다
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### 밤 (skyLight 구동의 파랑 시프트 + 등불 보호)

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

### 동굴을 깜깜하게 (skyLight 없는 곳을 더 어둡게)

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

> `skyLight` 는 리프트 후의 값 (10장) 이므로, 옅은 가림 (나무 밑 등. 생값 0.87 → 리프트 후 0.97) 은 이 방법으로는 거의 어두워지지 않는다. 동굴 (생값 0) 에는 통한다. 「숲그늘」 을 또렷하게 하고 싶으면 R9.12 의 리프트 역변환 + 임계값 방식을 쓴다.

### 밤의 파란 환경광 (달의 방향을 쓰지 않는 유사 표현)

> 이 API에서는 태양 없는 하늘의 `bloxdSunDirection()` 은 제로이다. 방향성 달빛이 아니라, 어두운 하늘에 희미한 파란 환경광을 더할 뿐이다. 단 달의 방향 자체는 `-bloxdSunDirection()` 으로 얻을 수 있다 (낮밤 사이클 월드 한정. [제7부](../internals/) R-A).

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

### 노을의 따뜻함 (태양 고도로 색을 기울이기)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 지평선에서 1 / 바로 위에서 0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### 엔진 출력의 완전 교체 (가장 단순한 재조명)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    if (bloxdLit()) {
        // ※ BloxdLight(...) 의 직접 구축은 금지. default 에서 만들어 colour 를 고친다
        var out = bloxdDefaultLight(s, l);
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let level = clamp(sky * 0.7 + block, 0.0, 1.0);
        // engineColour (엔진의 조명 결과) 를 버리고 「소재의 색 × 직접 계산한 밝기」 로 교체한다
        var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));   // engineColour 를 버렸으므로 포그를 다시 거는 것 (필수)
        out.colour = col + s.emission * (1.0 - l.fogAlpha);   // emission 도 직접 더한다 (필수)
        return out;
} else {
        return bloxdDefaultLight(s, l);
}
}
```

---

## 발광 레시피 (emission)



> `emission` 은 조명 계산 후에 가산되지만, 기존 처리에서는 **`fogVisibility` 가 곱해져 감쇠한다. 즉 완전히 안개에 잠긴 원경에서는 emission 도 사라진다. 원경에서도 빛나게 하고 싶은 성분은 emission 에 더하지 말고, light 훅 안에서 `out.colour += ...` 로 직접 가산한다** (engineColour 는 포그된 상태이므로, 원경에서는 안개색 위에 빛이 얹힌다)

### 등불의 맥동 (횃불이 숨쉰다)

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

### 발광 광석 느낌 (밝은 소재를 빛나게)

```wgsl
// surface 측: 소재가 밝을 (흴) 수록 emission 을 얹는다
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### 반딧불 무리 흉내 (시간으로 공간을 떠도는 광점)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // 몇 개의 「빛의 구슬」 이 천천히 이동한다. distance 의 역수로 빛나게 한다
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

## 좌표 레시피 (월드/블록/시선)



### 월드 좌표

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### 블록 좌표 (공식 레시피 — 헤더 주석 유래)

```wgsl
let worldBlock = vec3i(floor(bloxdWorldPosition(l.position)));
```

### 체크무늬 (블록 단위)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 또는 1
out.colour *= mix(0.96, 1.04, checker);
```

### 블록 단위의 의사 난수 (해시)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// 용도: 풀색의 베리에이션, 돌의 색얼룩 등
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### 시선 벡터와 림라이트

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### 시선 각도 (프레넬 흉내 — 액체용)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 바로 위에서 1 / 얕은 각도 0
let fresnel = pow(1.0 - facing, 3.0);
```

---

## 시간 레시피 (애니메이션)



> `bloxdSeconds()` 은 3600초 (1시간) 에 감긴다. 셰이더 경과 시간이며 게임 안의 태양·낮밤과 동기된다는 보장은 없다. 겉보기 주기 애니메이션에는 쓸 수 있지만 실제 밤 판정에는 `bloxdSunDirection()` 이나 조명 입력을 우선한다.

### 낮밤 사이클 (1시간에 1일)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdSeconds() * 6.2831853 / 3600.0);   // 0..1 의 1시간 주기. 게임 안의 낮밤과 동기되리라는 보장은 없다
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### 흔들림 (복수 sin 의 겹침)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### 밴드가 흐르는 오로라 / 형광 띠

```wgsl
// XZ 위치와 시간으로 3색을 섞는다
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

---

## 액체 레시피



### 수면의 잔물결 (색의 명멸)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdRenderOffset().x);
    let worldZ = s.position.z + f32(bloxdRenderOffset().z);
    let ripple = sin(bloxdSeconds() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid 는 항상 BLOXD_ALPHA — 가드는 습관상
    #endif
    return out;
}
```

### 고도를 사용한 투명도의 유사 변화 (진짜 여울 판정이 아니다)

> v1에서는 씬 깊이나 수중 바닥의 위치를 참조할 수 없어, 이 API만으로는 실제 수심을 계산할 수 없었다. v2에서는 액체 한정으로 `bloxdOpaqueBehind()` 로 안쪽 불투명면까지의 두께를 잴 수 있다 ([제8부](../history/v2.md) R-E). 아래는 그것을 쓰지 않는 종래의 유사 연출이며, `s.position.y` 는 로컬 좌표이므로 그대로 쓰면 청크 원점의 변화로 효과가 어긋난다. 월드 고도로 알파를 바꿀 뿐인 유사 연출이며, 해안선이나 수중 바닥을 따른 여울 표현이 아니다. `packWaterReferenceY` 는 월드 고도에 맞춰 조정한다.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // 낮은 고도에서는 얇게, 높은 고도에서는 원래 알파에 가깝게. 게임 안에서 방향은 확인할 것.
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### 수중에서 본 수중 안개

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### 액체에만 통하는 팩 (지형 무손상 구성)

```wgsl
// terrain_* 훅을 일절 쓰지 않는다. 그러면:
//  - terrain 베리언트 = 훅 없음 = 지형은 엔진 기존 그대로
//  - liquid 베리언트  = liquid_* 훅만 유효
```

---

## 정점 레시피 (allow 한정)



> 전부 `#ifndef BLOXD_STRICT` 로 감쌀 것.
> 실행 조건 (allow 타이틀 일람·Custom Games 는 strict) 의 상세는 본편 §30 참조 → [§30 게임별 적용 모드](../internals/)

### 풀잎이 바람에 흔들린다 (위쪽만 움직인다)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdSeconds() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // 수직면만
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### 액면의 파도 (윗면만)

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

### 맥동하는 지형

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdSeconds() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // 법선 방향으로 미세하게 팽창수축
    return out;
}
#endif
```

### 파도치는 지형 (거대 sin 파)

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

## 수식 잔기술집



```wgsl
// 0..1 을 매끄럽게 단계화 (n 단)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 2단계의 임계값 (툰 그림자)
let shadow = smoothstep(0.35, 0.37, level);   // 임계값±0.02 로 계단을 만든다

// 3단계 툰
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// 루마 (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// 매끄러운 펄스
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// 삼각파 (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// 초 → 「느린 위상」 으로 변환 (3600초 감김을 고려하지 않는 연출용)
let phase = t * 0.15;
```

---

## 리얼계 레시피



> 「바닐라의 겉모습을 소재에서 다시 짜는」 물리계 레시피집. 전제:
>
> 1. **light 훅은 프래그먼트의 최종단에서 불린다**. 반환한 colour 가 그대로 최종색. **직접 포그를 다시 걸 필요가 있다** (R9.10)  
> 2. **엔진 기존의 조명은 곱셈뿐**. 스페큘러 / 프레넬 / 난색-냉색 분리 / 반구 환경광은 제로에서 만든다  
> 3. `l.engineColour` 는 완성색 (포그 완료). 버리고 `s.colour` (알베도) 에서 다시 짜는 것이 본격파  
> 4. 텍스처는 금지 → 디테일은 전부**절차적** (해시/노이즈) 으로 넣는다 (R9.8)

### R9.1 난색 토치 × 냉색 하늘빛

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
        let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
        let voxel   = max(torch, sky);
        var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // 중간 clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                    // 포그 다시 걸기
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                 // emission 재가산
}
    return out;
}
```

### R9.2 태양 스페큘러 (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);          // 하프 벡터
            let ndh = max(dot(n, h), 0.0);
            let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
            let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
            out.colour += spec * vec3f(1.0, 0.97, 0.90);
        }
}
    return out;
}
```

### R9.3 Schlick 프레넬

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
        out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // 가장자리의 옅은 밝기
}
    return out;
}
```

### R9.4 반구 환경광 (위=하늘 / 아래=바닥의 튐)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let upness = n.y * 0.5 + 0.5;
        let ground = l.ambientLightColour * 0.55;                          // 아래: 튐
        let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // 위: 하늘빛
        let hemi = vec3f(0.25) + mix(ground, skyH, upness);
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // 중간 clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                           // 포그 다시 걸기
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                        // emission 재가산
}
    return out;
}
```

### R9.5 ACES 필믹 (Narkowicz 근사)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = 노출
    return out;
}
```

### R9.6 대기 원근법 (거리로 채도가 떨어지는 「공기감」)

> 주의: 안개 색에 휘도를 들어올리는 처리 (`normalize` 등) 를 적용하면, 안개가 어두운 씬에서 「밝은 흰 안개」 가 떠 오르고,  
> engineColour (포그 완료) 에 더해 안개색을 가산하면 이중 포그로 하얗게 된다. **공기감은 채도 저하만으로 표현**하는 것이 안전.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // 거리 감쇠 (100blk≈30%/400blk≈75%)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // 채도만 떨어뜨린다 (휘도는 불변)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 파법선 + 태양 글린트 (수면의 「태양의 길」)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // 높이 h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
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

### R9.8 절차적 마이크로범프 (텍스처 금지의 회피책)

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
        let local = fract(l.position - l.normal * 0.5);   // 블록 안 로컬 좌표
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

### R9.9 동굴의 비선형 암화 + 등불 보호

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let keep = 0.12 + 0.88 * blockInt;          // 등불 있는 곳은 들어올린다
        out.colour *= mix(keep, 1.0, sky * sky);     // 암화는 비선형 (2제곱)
}
    return out;
}
```

### R9.10 포그를 다시 거는 정석 (engineColour 를 버렸을 때 필수)

> `(1.0 - l.fogAlpha)` 를 `min(l.fogAlpha, 0.75)` 처럼 하한과 함께 쓰면 「이 이상 짙어지지 않는다」 조정이 된다  
> (0.0 = 엔진 준수 / 0.3~0.5 = 원경 클리어).  
> 참고로 엔진 포그는 지평선 전용 linear 포그 (그리기 거리 부근만) 이며, 중거리 안개는 팩측에서 만들어야 한다.
> 실포그 설정 (구현 대조 완료): linear 고정 / `fogStart` = 그리기 청크 거리 / `fogEnd` = +1 청크 / 포그 끄기에서는 100~101 청크로 사실상 무효 / 기본 포그색은 RGB (183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = s.colour * (voxel * 1.1 + vec3f(0.05));
        col = clamp(col, vec3f(0.0), vec3f(1.0));
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));  // 포그 재현 (0.15=엷은 하한)
        col += s.emission * (1.0 - l.fogAlpha);            // emission 도 포그 적용으로
        out.colour = col;
}
    return out;
}
```

### R9.11 시네마-grade (그림자는 한색 / 하이라이트는 난색 / 밤은 디새추레이트)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let lum = pack_luma(out.colour);
        out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;  // 태양 방향이 제로일 때만 밤 취급. 노을의 연속 변화는 표현하지 않는다
        out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
}
    return out;
}
```

### R9.12 투영풍 섀도우 — 리프트 역변환 + 임계값 커트 (결정판)

> **전제 재확인 (10장)**: `l.skyLight` 는 생 voxel 값 (n/15) 이 아니라 엔진이 「리프트 곡선」  
> `y = 1-(1-x/(3-2x))³` (어두운 곳을 들어올리는 S 커브) 를 통과시킨 후의 값.
>
> | 장소 | voxel 생값 | 리프트 후 (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | 열린 하늘 | 1.00 | 1.00 | 1.00 |  
> | 나무 밑 (반경2) | 0.87 | **0.97** | **0.86** ← 거의 무손상 |  
> | 반경3 | 0.80 | **0.92** | 0.66 |  
> | 반경5 | 0.67 | 0.78 | 0.29 |
>
> **이것이 「감마를 올려도 그림자가 짙어지지 않는다」 의 원인** (수치로 증명). 그러나 곡선은 단조이므로 대수적으로 엄밀히 역변환할 수 있다:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. 생값을 복원하면, 후는**임계값 커트** (`smoothstep`) 로 이값화할 뿐.  
> LightEngine 의 BFS 옆확산은 「인접 1 블록 = -1」 이므로, 임계값 `th = 1 - r/15` 는 그대로  
> 「r 블록 이상의 가림을 그림자로 간주」 다이얼이 된다. 블록을 부수면 그림자도 즉시 움직인다 (LightEngine 이 실시간 재계산).  
> 제한: 그림자는 「위쪽 하늘」 기준이므로 태양의 이동으로는 돌지 않는다 (15장 「그림자의 진실」).

```wgsl
// ★엔진의 리프트를 엄밀히 역변환해 생 voxel skyLight (n/15) 를 복원
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // WGSL 에 cbrt 는 없으므로 pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // ★그림자 반경 다이얼: th = 1 - r/15 (0.87→반경2 이상이 그림자)
const shSoft = 0.04;   // 가장자리 부드러움 (0.02=딱딱 / 0.08=소프트)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // ① 생값 복원 (이것을 빼먹으면 영원히 그림자가 안 된다)
        let skyRaw = sh_unlift(l.skyLight);
        // ② 임계값 커트 — 낮=1 / 그림자=0 을 확실히 분리할 수 있다
        let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
        // 태양 Lambert (태양 없을 때는 l.directional 로 폴백)
        let sunLen = length(bloxdSunDirection());
        let sunL = select(clamp(l.directional, 0.0, 1.0),
                          clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                          sunLen > 0.5);
        // ★투영의 정체: 태양의 직사광은 「하늘이 보이는 장소」 에만 닿는다
        let lit = sunL * sky;
        // 그림자측: 검정이 아니라 하늘색에 물든다 + 최저 환경광
        let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
        var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
        // 토치광은 그림자를 관통한다 (blockLight 도 리프트 후이므로 함께 복원)
        let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                             sh_unlift(l.blockLight.g),
                             sh_unlift(l.blockLight.b));
        let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
        col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
        // 포그를 다시 건다 (engineColour 를 버린 몫)
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));
        out.colour = clamp(col + s.emission * (1.0 - l.fogAlpha), vec3f(0.0), vec3f(1.0));   // emission 도 잊지 말고 (포그된 상태로 가산)
}
    return out;
}
```

> 조정 가이드: **그림자의 면적은 `shTh`만으로 정해진다** — `0.93`=반경1.5 이상 / `0.87`=반경2 / `0.80`=반경3 / `0.67`=반경5.  
> 그림자 가장자리의 딱딱함은 `shSoft` (0.02=딱딱 / 0.08=소프트). 그림자 심의 어둡기는 `0.09` (최저 환경광) 와 `0.16` (하늘 산란광)  
> 의 2점 시프트로 정해진다. 해 질 녘에 그림자를 넓히고 싶으면  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` 를 더한다 (긴 해 질 녘 그림자의 근사.  
> `sunDir` 은 `bloxdSunDirection() / length(bloxdSunDirection())`). 그림자의 푸름은 `vec3f(0.72, 0.82, 1.05)` 의 B 를 올린다.

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

## 파이프라인 세부



- **surface 훅은 alphaTest 의 「앞」 에서 돈다**: `out.alpha` 가 그대로 discard 판정에 쓰인다. 컷아웃 소재 (풀·잎) 에서는 디더 패턴으로 녹는 듯한 이펙트를 만들 수 있다 (레시피 R-C). 액체 (블렌딩) 에서는 `out.alpha` 가 실제 투명도가 된다 (레시피 R-D). 통상 불투명 지형에서는 alpha 가 끝내 무시된다
- **`l.ambient` 의 내용**은 `material.ambient × sceneAmbient` 로 소재마다 다른 값이다. 씬측은 그래픽 설정 「Ambient Lighting Intensity」 (기본 0.5) 에 직결되어 있으므로, 기본값 때려박기를 하지 않는다
- **씬의 방위광은 2등 구성**: 주광 (방향은 스카이 설정의 태양 위치에 유래·강도 1.0) 과 필광 (방향 `[-0.5, -1, -1]`·강도 0.35) 의 Lambert 합이 `l.directional` 로 도착한다. 필광은 방향이 아래를 향하므로 윗면에는 기여하지 않고, 아래를 향한 면 (동굴 천장 등) 을 집는다. 지형이 고려하는 것은 `_initScene` 으로 추가된 등뿐이며, 기동 후에 씬에 추가한 등은 지형·블록 모델에서 무시된다 (공식 경고 문구가 있다)
- **`bloxdSeconds()` 의 정체는 `performance.now()`**: `time() { return performance.now() / 1e3 % 3600 }` 이며, 브라우저 기동 경과 시간을 1시간으로 감은 값이다. 게임 안 낮밤이나 월드 경과 시간과 무관하다. 게임 안 시계와 동기된 애니메이션을 만들고 싶으면, 낮밤 사이클 구현 월드의 `bloxdSunDirection()` 방위각에서 추정하는 것이 현실적이다
- **헤더 함수는 uniform 하나를 읽는다**: 엔진은 `@group(3) @binding(0)` 에 64바이트 uniform (time / originOffset / sunDirection / eyePosition 의 4슬롯·little-endian) 을 두고 있으며, `bloxdSeconds()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` 은 각 슬롯의 읽기에 해당한다. 팩에서 이 uniform 을 고쳐 쓸 수는 없고, 팩과 엔진의 WGSL은 같은 모듈로 합성되므로, 같은 group/binding 을 자신이 선언할 수도 없다. (v3에서는 두 슬롯의 이름이 바뀌었다 — `seconds` / `renderOffset` 이며 `bloxdSeconds()` / `bloxdRenderOffset()` 으로 노출된다 — 또한 `@group(3) @binding(1)` 에 씬 깊이 텍스처가 추가되었다. [제9부](../history/v3.md) §41과 §51 참조)
- **정점 데이터는 메셔 (Web Worker) 가 만든다**: 블록의 지형을 1정점 28바이트 (아틀라스 있음은 32바이트) 의 인터리브로 정리하고, 위치 = float32×3 / 법선 = 8bit 신호 정수×4 / 색 = 8bit 준정수×4 (`s.colour` 의 실체 — tint × AO 가 메셔 시점에 8bit 로 구워져, 팩에서 분리·복원은 원리적으로 불가) / UV = float32×2 / atlasIndex = float32. 라이트 레벨만은 독립된 4바이트 정점 버퍼로 운반된다 ([제7부](../internals/) §26·[제2부](../api/) §11). 정점은 청크 단위의 instancing 으로 그려진다
- 로딩 때 청크 경계의 미세 체크무늬는 엔진의 화면 공간 Bayer 4×4 디더 청크 페이드이며, 팩 유래 버그가 아니다 (그래픽 설정의 `chunkFadeIn` 을 끄면 무효화할 수 있다)
- **`mod` 는 예약어**: `pack.wgsl:3 'mod' is a reserved word in WGSL.` 로 거부된다. 나머지는 `%` 연산자로 쓴다

### R-C. Bayer 디더 용해 — out.alpha 가 discard 를 제어한다

엔진이 청크 페이드에 쓰는 것과 **같은 Bayer 4×4 테이블**을 재현해, 낮은 블록부터 순서대로 디더로 「녹는」 cutout 을 만든다. alphaTest 소재 (풀·잎) 에서는 discard 가 돌고, 액체에서는 블렌드 투명도가 된다.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod 는 예약어이므로 % 연산자를 쓴다
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
    // 낮은 블록부터 녹는다. dissolve 가 높을수록 남는다
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. 물의 카메라 근접 페이드 — 액체의 alpha 로 시야를 확보한다

액체 훅의 `out.alpha` 는 블렌딩에 직결된다. 카메라 바로 아래 수면만 비워서, 잠수·수상 카메라의 시야를 확보하는 레시피.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0~3 블록에서 완전 투명→통상
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

## blockLight / heldLight 의 내부 구조



- `blockLight` 는 RGB 3채널의 **색 있는 빛**이다. 광원 블록마다 발광색 `[R, G, B]` (각 0-15) 가 정의되어 있고, 그것이 그대로 빛의 색이 된다 (통상 횃불 = 온백 (14,14,12) / 라바 = 오렌지 (14,8,2) / 비콘 = 시안 (5,14,14) / 흰 횃불 = (15,15,15) 등). 정점단에서는 1개의 float 속성에 r / g / b / sky 의 4 니블로 팩되어 도착한다. light 훅 안에서는 3채널을 따로따로 다루는 것으로 색 있는 국소 조명을 만들 수 있다 — 난색 토치 계열 레시피 (R9.1) 가 기준으로 하는 거동의 실체는 이것이다.

`aPackedLightLevels` 를 디코딩할 때, 엔진은 각 채널에 **RGB 가장 밝은 채널의 35% 를 하한으로 까는 「35% 채널 바닥」** 을 깐다. 예를 들어 「순수 빨간 광원」 은 정점에서 (1.00, 0.35, 0) 으로 들려서 보간·리프트를 탄다. 횃불 오렌지가 게임 안에서 「빨강이라기보다 하얀 핑크」 로 보이는 것은 이 때문이다. 난색 토치 계열 레시피 (R9.1) 의 채도는 이 기본 동작을 기준으로 조정하면 좋다.
- 조명의 합성은 가산이 아니다. 엔진 내부에서는, 35% 바닥을 깐 블록 빛과 `mix(앰비언트색, 스카이색, skyLight)` 로 만든 하늘 빛의 **max** 를 취하고, 손에 든 빛 (앰비언트 부스트 적용 후) 를 더 max 로 얹는다. 이 합성에 쓰이는 채널값은 **리프트 후**의 값이다 — 엔진은 훅 입력에 도착하는 것과 같은, 리프트 곡선을 거친 `terrainLightLevels` 로 합성하며, 이는 v2와 v3 모두 마찬가지다. 따라서 `blockLight` 와 `skyLight` 는 서로 상쇄하지 않고, 어두운 쪽의 기여는 버려진다 — 하늘 빛을 약하게 해도 블록 빛이 지배적인 곳은 거의 어두워지지 않는다. 노출이나 감쇠의 레시피는 이 구조를 전제로 설계한다 ([제6부](../guides/) §19 의 국소광 보호는 이 구조에 대한 보상이다).


손에 든 빛 (`heldLight`) 의 범위는 가장 밝은 빛색 채널을 따르며 (최대 15 블록), `dist^0.75` 전처리가 들어가고, 같은 35% 채널 바닥이 적용되며, `l.heldLight` 는 앰비언트 부스트 **전** 값이다. 원뿔 감쇠는 엔진의 light 모듈에서 복원했다: 빔의 각도 감쇠는 `1 − 0.5 × (smoothstep(0.12, 0.65, t) + smoothstep(0.62, 0.95, t))` 이며, 여기서 `t` 는 원뿔 축에서 잰 정규화 각도다 (0 = 중심, 1 = 가장자리). 도달 거리는 `(rangeOverride > 0 ? rangeOverride : 가장 밝은 채널) × 원뿔 감쇠` 이고, `rangeOverride` 는 held-light 색의 alpha에서 읽는다. 도달 거리 안에서 override는 `(range − dist) / range` 로 감쇠하고, 기본값은 (전처리된) 거리를 채널별로 뺀다. 그다음 35% 바닥, 15로 나누기, 리프트 곡선, 마지막으로 앰비언트 부스트가 이어진다. 커스텀 아이템에는 `spotlightRange` (사정) 와 원뿔각을 정할 수 있어, 「들고 있는 동안 지향성 빔을 쏜다」 모드가 존재하며 그 원뿔은 카메라를 따라간다. 팩측에서는 빔 방향을 알 방법이 없다.

커스텀 블록에는 `skyLightEmission` (0~15) 이 달릴 수 있어, **blockLight BFS 와는 별개로 skyLight 채널 자체를 주입할 수 있다**. R9.12 같은 「skyLight 임계값으로 낮/그림자를 판별하는」 팩은, 인공광으로 skyLight 가 들려 있는 월드에서는 오판할 수 있다. 배포 팩은 blockLight 와 조합해 판정하는 편이 견고하다.

---

## 포그의 내부 사양



포그 계산은 항상 LINEAR 모드 (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1) 이며, `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = 포그 거리 설정. D = 0 일 때만 fogEnd = 5 특례) 이다. **포그 기울기대는 고작 32 블록 폭**이며, `(1.0 - l.fogAlpha)` 는 「거리 안개」 라기보다 **「읽힌 월드의 가장자리까지 정규화 거리」** 지표이다. 플레이어마다 읽기 거리가 다르므로, 거리 기반 연출은 직접 `distance(l.position, bloxdEyePosition())` 을 계산해야 한다 (레시피 R-B). (v3 참고: 렌더러의 포그 함수는 실제로 **네 가지** 모드 — 끔 / 지수 / 지수 제곱 / 선형 — 를 구현하며, 출하된 타이틀은 선형을 구동한다. 복원한 소스와 견고성 논의는 [제9부](../history/v3.md) §50에 있다.)

- 기본 포그색은 `rgb(183, 191, 195)` (엷은 청회색). 월드 작성자는 `fogColourOverride` (hex) 로 바꾼다. 포그 모드가 0 (NONE) 인 상태에서는 **fogColour 는 흑으로 도착한다** (`fogColour = select(vec3f(0.0), uniforms.vFogColor, ...)`). 표준형 `mix(l.fogColour, col, (1.0 - l.fogAlpha))` 는 fogVisibility 가 1 일 때 안개색이 쓰이지 않으므로 안전. 스크립트 API 측에는 그 외에 `fogChunkDistanceOverride` 와 `fogOnSkybox` 옵션이 있어, 커스텀 게임은 포그 거리 (D 에 해당하는 값) 와 스카이박스로의 포그 적용을 개별 설정할 수 있다. 기본에서는 스카이박스는 포그의 영향을 받지 않는다 (`fogOnSkybox` 를 유효화한 게임에서만, 스카이박스도 포그색으로 물든다).

플레이어측 `showFog` 를 끄면 포그는 3200~3232 블록으로 밀려나 사실상 무효가 된다 (`fogVisibility ≈ 1` 이 계속 돌아온다).

### R-B. 읽기 경계 밴드 — fogVisibility 를 「월드 가장자리」 로 쓴다

읽기 경계의 32 블록대만 조용히 냉색으로 조여서, 월드 끝을 눈에 띄지 않게 한다 (또는 연출로 강조한다). 거리를 직접 계산하지 않으므로, 플레이어의 읽기 거리 설정에 자동 추종하는 것이 이점.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = 안쪽 (경계까지 여유 있음), 0 = 경계 밖으로 나갈 직전
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

## 팩에 보이는 값을 바꾸는 것 — 테스트 체크리스트



같은 팩도 **월드와 플레이어 설정에 따라** 다르게 보인다. 배포 전에는 적어도 다음 3 환경에서 겉모습을 확인할 것:

1. **통상 월드** (default 스카이박스·오버라이드 없음) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`·기본색
2. **space 계열 스카이박스 월드** — bloxdSunDirection() = 0. `sunPresent` 분기의 겉모습
3. **`visionMinLightColour`·`skyLightColourOverride` 를 정한 커스텀 월드** — 어두운 곳과 색이 들려 있는 경우

- 주된 변동원: `lightingOverride` (조명 강제) / `skyLightColourOverride`·`ambientLightColourOverride` (hex 교체) / `visionMinLightColour` (시인 최암색. 구현은 `uSkyLightColour` 와 `uAmbientLightColour` 쌍방에의 성분별 max 이며, Night Vision 이 사용한다. 「동굴을 깜깜하게」 계열은 예상보다 어두워지지 않고, 하늘색 자체도 바닥 올림이 된다) / `heldLightColourOverride`·`Range`·`ConeAngle` / `fogChunkDistanceOverride`·`fogColourOverride`·`fogOnSkybox` / `skyBox` (bloxdSunDirection() 유무). `uSkyLightColour` 기본 = (1,1,1) 흰색, `uAmbientLightColour` 기본 = (0.25,0.25,0.30). `l.ambient` 의 씬측 = 그래픽 설정 「Ambient Lighting Intensity」 (기본 0.5). `(1.0 - l.fogAlpha)` 는 플레이어의 포그/청크 거리 설정을 따라간다. 그 외에 `cameraTint` (화면 전체로의 RGBA 틴트) 와 `proximityFadeDistance`·`proximityFadeMinOpacity` (엔티티의 카메라 근접 페이드) 도 월드 설정 유래의 변동 요인이며, 특히 `cameraTint` 는 팩 출력 위에 얹히는 최종 처리이다. 이것들의 다수는 스크립트 API (`serverOption`) 경유로도 설정할 수 있어, 게임 실행 중에도 갱신될 수 있다.

---

## 게임별 적용 모드 (`shaderPackPolicy`)



여기서 §7 의 「allow / strict」 가 타이틀 단위 설정임을 확정한다. 게임 정의 측의 `shaderPackPolicy` 이 명시적으로 `"allow"` 인 타이틀만 full 모드 (vertex 훅, `discard`, 지형 `alpha`) 로 움직이고, 지정이 없는 (또는 allow 이외의) 타이틀은 strict 가 된다 — `BLOXD_STRICT` 가 정의되고, 가드 내부의 코드는 자동으로 무효화된다. 이 판정은 팩 측에서 고를 수 없으므로, 어느 타이틀에서 무엇이 움직이는지 아는 것이 배포의 전제가 된다.

- 근거 빌드: `szby6g.main.94a7596c.js` (2026-10-17 시점의 정식 배포). 전체 111 게임 정의를 정적으로 분석한 결과 **allow 26 엔트리 (12 타이틀) / strict 85 엔트리**. 같은 12개의 allow 리터럴이 같은 12개 타이틀에서 v3 프로덕션 번들 (`3ymzdd`, 2026-10-20) 에서도 변경 없이 재확인되었다 — 아래 목록은 v3에도 그대로 적용된다.
- `shaderPackPolicy` 보다 상위의 판정으로서 배포 채널 측의 게이트 (`canUseShaderPacks` 상당) 도 있어, 외부 포털 경유의 배포 (Coolmath Games 판 등) 에서는 `shaderPackPolicy` 의 판정에 이르기 전단에서 셰이더 팩 기구 자체가 무효화될 수 있다. 이하의 allow / strict 의 판별은 bloxd.io 본가 Web판의 해석에 근거한다.
- allow 는 기저 정의의 직서 8 곳과 기저 변수 (`tb` / `kz` / `cb` / `Fb`) 의 4 곳 합계 12 곳에서 선언되고, 베리언트는 스프레드 상속 (`{...tb,...}`) 으로 받는다. 베리언트 단위의 개별 덮어쓰기 (부모 allow·자식 strict 의 역 패턴) 는 현재 제로.

allow 의 12 타이틀 (합계 26 엔트리):

- **Test Gym** — 기본 + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (합계 11 엔트리)
- **Doodle Cube** — 기본 + Solos / Duos (합계 3)
- **Rocket Obby** — 기본 + Sheep / January (합계 3)
- **단독 타이틀 (9)**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

strict 측에서 특히 오해하기 쉬운 점:

- **Superflat Creative (classic_creativeFlat) 은 strict**. 「Creative」 를 이름에 포함하지만, classic 계열에서 allow 인 것은 통상의 Creative (`classic_creative`) 뿐. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns 등도 전부 strict
- **Custom Games (customGames) 은 strict**. 자작 커스텀 게임에서는 vertex 훅 계열의 효과가 발동하지 않는다. 작업용 검증은 Test Gym 을 사용하는 것이 확실
- bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) 계열의 주요 PvP·서버계 타이틀은 전부 strict

한편 strict 타이틀에서도 팩의 로드와 컴파일 자체는 이루어지고, surface / light 등 프래그먼트 측 레시피는 통상대로 움직인다. 제한을 받는 것은 vertex 훅 (`bloxdTerrainVertex` / `bloxdLiquidVertex`) 과 `discard`, 그리고 지형 `alpha` (액체는 항상 존재) 이다.

이 일람은 상기 빌드 시점의 정적 분석 결과이며, 엔진 갱신으로 allow/strict 의 배분은 변할 수 있다. 새판이 나오면 재확인할 것.

---

## 태양과 달의 정체



`bloxdSunDirection()` 의 공급원은 스카이박스 종류가 바뀔 때만 다시 쓰는 태양 방향 버퍼이며, 판단 기준은 「하늘에 태양이 있는가」 가 아니라 **「스카이박스가 earth 타입인가」** 이다.

| 스카이박스 | `bloxdSunDirection()` |
|---|---|
| `default` (절차 하늘) | 0이 아님 (기존값 아래) |
| `gloomy` / `interstellar` / `space_*` (큐브 텍스처) | **항상 (0,0,0)** |

**달은 항상 `-bloxdSunDirection()` 에 있다** (엔진이 달의 위치를 태양의 정반대로 계산하기 때문). 밤낮 판정은 태양 고도로 한다 — `bloxdSunDirection().y < 0` (태양이 지평선 밑) 일 때 달이 위에 있다. 단 기존 월드에서는 태양이 정지해 있으므로 달도 정지해 있으며, 움직이는 달이 의미 있는 것은 낮밤 사이클을 구현한 월드뿐이다.

기존 월드의 태양 방향은 약 `(-0.56, 0.81, -0.18)` (inclination = −0.2 / azimuth = 0.55 에서 계산되는 단위 벡터, 정지). 배포 팩 테스트 때 하이라이트 방향을 미리 예측할 수 있는 실용 기준값이다.

낮밤 사이클은 엔진에 내장되어 있지 않다 — inclination 은 정적인 수치이며, 낮밤이 움직이는 월드는 게임측이 갱신한다. 그 갱신 때마다 `bloxdSunDirection()` 도 다시 쓰이므로 따라간다.

지형의 방향광은 씬 기동시에 만들어지는 2등뿐이며 **방향도 강도도 고정, 낮밤에 변하지 않는다**. 정리하면 **지형 밝기를 정하는 요소는 어느 것도 시간에 의존하지 않는다. 낮밤의 「겉모습」 은 스카이박스와 bloxdSunDirection() 뿐**이며, 밤에 지형을 어둡게 하고 싶은 팩은 bloxdSunDirection() 에서 직접 시간대를 추정할 수밖에 없다 (§19 의 `sunPresent` 수법).

### R-A. 방향성 달빛 — moonDir = −bloxdSunDirection()

달이 위에 있을 때만 푸르스름한 흰 Lambert 와 약한 스페큘러를 더한다. `moonUp` 이 0인 세계 (기존 정지 태양 월드) 에서는 아무 일도 일어나지 않으므로, **낮밤 사이클 있는 월드에서만 발동하는 안전한 달빛**이 된다.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // 달은 항상 태양의 정반대. 낮 동안은 moonDir.y < 0 으로 자동 소등된다
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

## 디버깅 수단



- URL 파라미터 `?renderer=lite` — Lite (WebGPU) 렌더러를 강제 (`webgl2` / `babylon` 도 가능. `babylon` 은 webgl2 의 옛 이름 에일리어스). 우선순위는 URL 파라미터 > localStorage 의 `bloxdRenderer` > 설정 화면 > 기본 (webgl2). 무효값은 경고와 함께 무시된다. URL 이나 localStorage 에 오버라이드가 남아 있으면, WebGPU (lite) 가 필요한 국면에서 실패해 「needs the new WebGPU renderer, so remove the renderer override...」 가 나올 수 있다 ([제5부](../troubleshooting/) §17)
- URL 파라미터 `?vconsole` — 화면 안 콘솔 (VConsole) 기동. 모바일 실기 검증에 요긴하다
- URL 파라미터 `?drawcalls=1` — 그리기 통계의 디버그 패널이 추가된다. 디버그용 콘솔에서 게임 오브젝트를 고르거나, `drawCalls()`·`why()`·`configureDrawCallWatching()` 를 써서, 팩에 한정되지 않은 대규모 기믹의 중복 그리기 (오버드로) 나 1 도면당 약 6.5만 정점의 상한 도달을 확인해, 성능 부족의 원인을 가를 수 있다
- 콘솔에는 `noa-engine v0.33.0` 과 `Renderer: lite from <소스>` 가 나온다 — 그리기 경로 오진단 방지에 먼저 이것을 확인할 것
- WebGPU 렌더러는 팩 적용 중 「강제 ON」 으로 잠긴다. 「Disable Block Texture Atlas」 설정도 잠기며 (아틀라스 ON 유지), WebGPU 미대응 환경에서는 애초 팩이 적용되지 않는다. 배포 페이지에 「WebGPU 대응 브라우저가 필요」 라고 쓰는 근거는 여기이다
- 블록 텍스처의 실체는 2D 배열 텍스처 (`texture_2d_array`) 로, 지형의 샘플러는 nearest 이며 repeat 로 설정되어 있다. 더 나아가 메셔는 재질·AO·라이트가 일치하는 면을 1개의 구형으로 묶는 (**greedy meshing**) 때문에, 정점의 UV는 병합면 위에서는 타일 폭을 넘을 수 있다 (가장자리에 0.0015 의 인셋). 반복 측은 하드의 repeat 어드레싱이 담당하므로, 병합면은 심 없이 보인다. 단 `vUV` 를 기준으로 절차적 디테일을 얹으면, 병합면의 경계에서 불연속이 될 수 있으므로, 월드 위치 (`s.position` + `bloxdRenderOffset()`) 를 기준으로 설계하는 것이 안전하다
- 게임 참가 때마다 런타임 재검증 (`checkCompilation`) 이 돌아, 실재하는 전 지형 소재를 브라우저 WebGPU 로 실컴파일한다 (설정 화면의 정적 검증보다 엄격). 여기서 떨어지면 팩은 그 게임에서 제외된다

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
