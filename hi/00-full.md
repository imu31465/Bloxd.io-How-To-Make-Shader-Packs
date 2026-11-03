<!-- Auto-generated from the 6-category structure. Edit individual pages instead. -->

## Bloxd.io शेडर पैक दस्तावेज़ीकरण

Bloxd.io के WebGPU रेंडरर के लिए शेडर पैक पर एक अनौपचारिक गाइड — निर्माण, कार्यान्वयन, सत्यापन और वितरण से लेकर API विनिर्देश और इंजन-इंटर्नल शोध तक।

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


## भाग VIII: API Version 2 माइग्रेशन गाइड


लक्ष्य बिल्ड: `6qxffk.main.5912a15f.js` (2026-10-16 का उत्पादन परिनियोजन)। इस पुस्तक के भाग I–VII v2 आधार पर पुनः लिखे जा चुके हैं; यह भाग VIII v1 से प्रवासन बिंदु व v2 नई सुविधाएँ समेटता है। नई सुविधा कोड उदाहरण v2 कंपाइलर द्वारा 8/8 वेरिएंट सत्यापन व ब्राउज़र WGSL कंपाइलर (Tint) सत्यापन (§38) उत्तीर्ण हैं, पर विद्यमान रेसिपी v2 रूपांतरण यांत्रिक पहचानकर्ता प्रतिस्थापन है, अतः वितरण पूर्व वास्तविक-मशीन कंपाइल से अवश्य सत्यापित करें।

### 31. v1 पैकों का भाग्य (पहले निष्कर्ष)

खेल manifest `apiVersion` **ठीक-ठीक 2 मिलान** माँगता है। v1 पैक लोड `This pack is for shader pack API version 1. Bloxd supports version 2.` (i18n कुजी `shaderPack:loadWrongApiVersion`) से अस्वीकृत होता है। v1/v2 **समानांतर समर्थन नहीं**। इंजन संरक्षित पैकों का `validation.headerVersion` (शीर्ष पूर्ण पाठ हैश) पुनः जाँचता है, अतः इंजन अद्यतन पर संरक्षित पैक स्वतः "पुनः जाँच आवश्यक" होने की व्यवस्था v1 समान है।

### 32. पहचानकर्ता पूर्ण पुनर्नामकरण (संगति तालिका)

v2 में अंडरस्कोर नामकरण कैमलकेस में एकीकृत हुआ। **पुराने नाम सर्वथा अप्रयोज्य।**

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
| `bloxd_packInputs` (आंतरिक uniform) | `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) |

हुक प्रकार (vertex / surface / light × terrain / liquid 6) व `pack.json` रूप (`apiVersion` / `name` / `author`) अपरिवर्तित। लोडर सीमाएँ भी अपरिवर्तित (zip 32MB / प्रविष्टि 1024 / `.wgsl` 256 फाइलें / कुल 256KB / manifest 64KB)।

### 33. हटाए फ़ील्डों का नया ठिकाना

v1 में `time` / `eyePosition` / `sunDirection` / `originOffset` संरचना फ़ील्ड थे। v2 में **ये फ़ील्ड हटाए गए; बदले में इंजन uniform (`bloxdPackInputs`) पढ़ने वाले शीर्ष फ़ंक्शन** प्रयोग करें। फ़ंक्शन uniform सीधे पढ़ते हैं, अतः **हुक बाहर मॉड्यूल-स्कोप फ़ंक्शन व vertex हुकों से भी बुलाए जा सकते हैं**।

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` से विश्व निर्देशांक रूपांतरण | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

### 34. नई सुविधा ①: `blockId` (खंड-विशिष्ट शेडिंग)

तीनों संरचनाओं `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` में `blockId: u32` जोड़ा गया। यह **फलक के स्वामी खंड का ID** (0–65535) है और उसी फलक में स्थिर रहता है (`@interpolate(flat)` से पारित)। टेक्सचर रंग पर निर्भर बिना खंड-प्रकार पहचानने में प्रयोग कर सकते हैं। पर ID-खंड-प्रकार संगति तालिका इंजन के भीतर है और पैक से दिखाई नहीं देती, अतः **कौन ID किस खंड का है, यह दुनिया में मापकर या नीचे दिए संदर्भ डेटा से जाँचना आवश्यक है**। भीतर यह ID शीर्ष-रंग के α (निचले 8bit) और अभिलंब के w (ऊपरी 8bit) के कुल 16bit में पकाकर ले जाई जाती है; 65535 की सीमा इसी पथ-चौड़ाई से आती है। blockId तंत्र स्वयं केवल सक्रिय शेडर-पैक होने पर सक्रिय होता है (बिना पैक wire का गंतव्य padding ही रहता है, पर भाग II की संरचना-परिभाषा से यह अंतर दिखता नहीं)।

**संदर्भ**: लेखक गेम-प्रविष्टि सूची [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) पर प्रकाशित करता है (`entries.json`: id ↔ खंड-नाम तालिका; `Furnace|meta|rot2` जैसे घूर्णन/meta रूप भी पृथक ID हैं)। मिलान गेम अपडेट से बदल सकते हैं — पक्की जांच वास्तविक गेम में करें।

अकसर प्रयुक्त खंडों के उदाहरण (entries.json से, 2026-10-18 तक। केवल कम id वाले टेरेन-प्रकार चुने गए):

| ID | खंड नाम | ID | खंड नाम |
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

entries.json में औज़ार आदि गैर-खंड प्रविष्टियाँ भी हैं, पर टेरेन व तरल हुक तक खंड-प्रकार की id ही पहुँचती हैं।

#### R-F. blockId से खंड प्रकार रंगत

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // जैसे: प्रस्तर परिवार (id उच्च बिट प्रतिरूप) शीतल झुकाएँ
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

#### R-G. blockId का वास्तविक मापन — bit-समतल प्रदर्शन पैक

संगति तालिका में न होने वाले खंड की id दुनिया में जाँचने की डिबग रेसिपी। शुरुआत का `plane` `0, 1, 2, …` बदलते हुए जाँचने वाले खंड के फलक का रंग पढ़ें।

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

फलक का रंग blockId के 3 bit सीधे RGB में दिखाता है (काला = 0 / लाल = 1 / हरा = 2 / पीला = 3 / नीला = 4 / मैजेंटा = 5 / सियान = 6 / श्वेत = 7)। एक बार देखने पर octal का 1 अंक पढ़ा जाता है। p0 → p3 क्रम में 3, 2, 7, 2 पढ़ा जाए तो ऊपरी अंकों से बना octal 2723 = 1491 id है (Lava)। कम id वाले टेरेन हेतु p0 व p1 की 2 बार ही पर्याप्त। केवल surface हुक से बना है, अतः strict शीर्षक में भी चलता है।

#### R-H. केवल पत्तियों को झुलाना — blockId द्वारा vertex हुक सीमित करना

R7 की पवन रेसिपी ([भाग III](../recipes/)) पूरे टेरेन को लहराती है, पर vertex हुक में भी `blockId` पढ़ा जा सकता है, अतः लक्ष्य केवल पत्ती-खंडों तक सीमित किया जा सकता है। id सूची व WGSL हेतु array इस प्रकार है (2026-10-18 के वास्तविक मापन पर। Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / फल-रूप / Autumn Aspen के 22 प्रकार):

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// vertex हुक strict शीर्षक में स्वतः निष्क्रिय (§36 देखें)
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
        // विस्थापन विश्व-स्थिति का सुचारु फ़ंक्शन रखें। विश्व पर वही स्थान दर्शाने वाले
        // साझा शीर्ष समान मान से हिलते हैं, अतः फलक नहीं उखड़ते ([भाग III](../recipes/) R7 भी यही सिद्धांत)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- id सूची इंजन अपडेट से बढ़ती है (मापन में भी नए बिल्ड में 50 प्रकार के खंड जुड़े)। निरंतर प्रयोग हेतु [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) या R-G का bit-समतल प्रदर्शन से अतिरिक्त id जाँचकर array में जोड़ें
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) ज़मीन पर बिछने वाली अठोस पत्तियाँ हैं। हिलाने पर ज़मीन से उठती दिखती हैं, अतः array से हटाकर छोड़ देना भी एक विकल्प है
- strict शीर्षक में vertex हुक पूरी तरह निष्क्रिय होता है, पर ऊपर का guard हो तो "हिलना बस रुकता है", fragment पक्ष के प्रभाव जीवित रहते हैं

### 35. नई सुविधा ②: `BLOXD_SCENE_DEPTH` व `bloxdOpaqueBehind()` (मुख्य)

v1 में संरचनात्मक असंभव गहराई पहुच **केवल तरल (liquid) प्रोग्रामों हेतु** खुली। वर्ण नहीं, पर **पीछे अपारदर्शी फलक दूरी व स्थिति ज्यामिति उपलब्ध**। प्ररूपी उपयोग मापी जल मोटाई से अवशोषण वर्ण परिकलन है।

उपयोग नियम:

| उपयोग | परिणाम |
|---|---|
| `bloxdLiquidSurface` / `bloxdLiquidLight` में अरक्षित आह्वान | ठीक (तरल वेरिएंटों में सदा परिभाषित) |
| `bloxdTerrainSurface` में अरक्षित आह्वान | त्रुटि। `#ifdef BLOXD_SCENE_DEPTH` से लपेटें |
| vertex हुकों में आह्वान | त्रुटि (केवल surface / light हुक) |

टेरेन हुकों में भी गहराई चाहें तो `#ifdef BLOXD_SCENE_DEPTH` से लपेटें (टेरेन हुक तरल प्रोग्रामों में पुनः प्रयुक्त होते हैं, अतः गहराई केवल तरल पक्ष जीवित)।

#### R-E. जल मोटाई अवशोषण (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // जल स्तंभ लंबाई = यहाँ से पीछे अपारदर्शी फलक तक
        let thickness = distance(behind.position, surface.position);
        // Beer-Lambert अवशोषण: लाल शीघ्र गिरता, नीला दूर पहुचता
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // पीछे आकाश = गहरे जल नील की ओर खींचें
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

अनुप्रयोग: मोटाई आधारित अवशोषण/प्रकीर्णन, `behind.position` से तल विश्व निर्देशांक से तरंग-कास्टिक-ढंग पैटर्न प्रक्षेपण, `found=false` से आकाश व अवरोध भेद से जलपृष्ठ आकाश परावर्तन, गहराई से झाग व मैलापन चरणबद्ध। गहराई प्रतिलिपि पाइपलाइन निर्माण विफल हो तो "पीछे कुछ नहीं" सुरक्षित अवनति। गहराई टेक्सचर की तैयारी पेज के रेंडरर निर्माण के समय "सक्रिय पैक गहराई पढ़ता है या नहीं" से तय होती है, अतः **गहराई पढ़ने वाले पैक के प्रयोग में हमेशा पेज पुनः लोड करें**। पैक सक्रिय रखकर बिना पुनः लोड गहराई माँगी जाए तो कंसोल में एक बार `…reads scene depth on a page that didn't turn it on` चेतावनी आती है और गहराई 1×1 विकल्प टेक्सचर से बदल जाती है, इसलिए `bloxdOpaqueBehind()` सदा `found = false` लौटाता है।

### 36. अन्य v2 परिवर्तन

- **हुक फॉलबैक**: `bloxdLiquidXxx` अपरिभाषित हो तो तरल प्रोग्राम टेरेन हुकों पर गिरते हैं। **केवल टेरेन हुक पैक जल पर भी ज्यों का त्यों असर करता है**। अनभीष्ट हो तो तरल पक्ष हुक स्पष्ट परिभाषित करें।
- **`BLOXD_LIGHTING` फ़ील्ड रक्षक अनावश्यक**: `blockLight` आदि सभी वेरिएंटों में हैं, अलिट में डिफ़ॉल्ट (0 / 1 / श्वेत / 0) रहते हैं। केवल प्रकाश परीक्षण हेतु `#ifdef BLOXD_LIGHTING` प्रयोग करें। विद्यमान रक्षक रखने से कुछ नहीं बदलता।
- **`BLOXD_ALPHA` परिभाषा शर्त बदली**: गैर-strict टेरेन वेरिएंटों व सभी तरल वेरिएंटों में परिभाषित, strict × टेरेन में अपरिभाषित। टेरेन हुकों में alpha लिखें तो रक्षक रखें।
- **संरचना सीधा निर्माण निषिद्ध**: `BloxdLight(...)` जैसे निर्माता आह्वान स्थैतिक सत्यापन में अस्वीकृत। सदा `bloxdDefault*` से बदलें या निवेश प्रतिलिपि प्रयोग करें।
- **`let _ =` से `_ =`**: WGSL त्याग समनुदेशन `_ = f();` वैध, पर `let _ = f();` अस्वीकृत।
- **offInStrict**: vertex हुक की परिभाषा, या surface / light हुक से पहुँच योग्य `discard` हो तो त्रुटि नहीं, पूरा पैक strict खेलों में स्वतः अक्षम (सेटिंग UI में `shaderPack:offInStrict`; allow खेलों में चलता है)। vertex हुक व `discard` `#ifndef BLOXD_STRICT` से लपेटें। साथ ही आधिकारिक सेटिंग UI संदेश स्वयं कहता है "strict में चलाने हेतु शेष को `#ifndef BLOXD_STRICT` में लपेटें", अतः यह तरीका केवल परंपरा नहीं, आधिकारिक अनुशंसा है।
- **फ़ॉग विस्तार**: फ़ॉग परिकलन LINEAR / EXP / EXP2 विधाएँ कार्यान्वित, पर खेल सेटिंग अब भी सदा LINEAR, अतः विद्यमान फ़ॉग विनिर्देश ज्यों के त्यों चलते हैं। `fogColour` अर्थ अब आधिकारिक दस्तावेज़ित (केवल पूर्णतः फ़ॉगहीन दृश्यों में काला)।
- **अपरिवर्तित**: लिफ्ट वक्र, 35% चैनल तल, heldLight क्षय (`pow(lightDist, 0.75)`) व परिवेश बढ़त, सूर्य/चंद्र दिशा विनिर्देश, डिफ़ॉल्ट फ़ॉग वर्ण, काल लपेटन (3600 सेकंड), दिशात्मक प्रकाश (अधिकतम 4), केवल Lite (WebGPU), संरक्षण तंत्र (IndexedDB), `mod` आरक्षित शब्द।

### 37. v1 → v2 प्रवासन जाँच सूची

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **पहचानकर्ता**: §32 तालिका से सब बदलें (हुक नाम, संरचना नाम, default फ़ंक्शन नाम)
3. **हटाए फ़ील्ड स्थानांतरण**: §33 तालिका से शीर्ष फ़ंक्शनों में (`s.time` → `bloxdTime()` आदि)
4. **`fogFactor` → `fogVisibility`** पुनर्नामकरण
5. **संरचना सीधा निर्माण हटाएँ**
6. **`let _ =` से `_ =`** सुधारें
7. **vertex हुक व discard `#ifndef BLOXD_STRICT` से लपेटें**
8. **जल भी टेरेन हुक प्रभाव अनुभव करता है** सत्यापित करें; अनभीष्ट हो तो liquid हुक स्पष्ट परिभाषित करें
9. (वैकल्पिक) `litColour` से स्वयं फ़ॉग प्रबंधित करें / `bloxdOpaqueBehind()` से जल मोटाई अवशोषण जोड़ें / `blockId` से खंड-विशिष्ट अभिव्यक्ति
10. **दूसरा चरण (ब्राउज़र Tint) भी सत्यापित करें** — विशेषतः `^` `&` `|` `<<` `>>` वाले व्यंजकों के कोष्ठक। स्थैतिक सत्यापन उत्तीर्ण फिर भी ब्राउज़र में अस्वीकृत कोड संभव है (§38)

### 38. दूसरा सत्यापन चरण — ब्राउज़र WGSL कंपाइलर अंतर्निहित पार्सर से कठोर है

खेल का पैक सत्यापन **2-चरण** है। पहला चरण स्थैतिक सत्यापन (इंजन-अंतर्निहित JS पार्सर। हुक हस्ताक्षर, निषिद्ध वाक्यरचना, sceneDepth उपयोग आदि पैक-विशिष्ट नियमों का निरीक्षण) है, दूसरा चरण ब्राउज़र सत्यापन (संकलन परिणाम में संलग्न स्टब का वास्तविक WebGPU कार्यान्वयन से संकलन, त्रुटियों का पैक मूल फ़ाइल पंक्तियों पर प्रतिलोम-मैपिंग सहित प्रदर्शन। UI का "Saved, but it won't run until you fix these errors" यही चरण) है। त्रुटि प्रदर्शन अंत के `(only in terrain)` आदि प्रत्यय "उस त्रुटि वाले वेरिएंट की program किस्म" हैं।

अंतर्निहित पार्सर WGSL संक्रियक बंधन (Binding) नियम लागू नहीं करता, अतः **स्थैतिक सत्यापन उत्तीर्ण होकर भी ब्राउज़र में अस्वीकृत होता है**। क्षति-प्रवण नियत पूर्णांक-हैश प्रतिरूप हैं:

| संक्रियक | परिणाम |
|---|---|
| `<<` `>>` | केवल एकल स्तर तक सीधे बंध सकते हैं। `a + b << c` त्रुटि है |
| `&` `^` `\|` | केवल एकल स्तर तक सीधे बंध सकते हैं। `a * b ^ c` त्रुटि है |
| `&&` `\|\|` | मिश्रण असंभव। `a && b \|\| c` त्रुटि है |

#### कोष्ठक लगाने की विधि (NG / OK)

```wgsl
// NG — स्थैतिक सत्यापन उत्तीर्ण पर ब्राउज़र (Tint) अस्वीकृत:
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — प्रत्येक गुणन कोष्ठकबद्ध (एक ही संक्रियक की श्रृंखला A ^ B ^ C स्वयं वाम-साहचर्य से वैध)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

इस पुस्तक प्रकाशित कोड में यह प्रतिरूप नहीं है (`pack_hash3` का `+`/`*` मिश्रण व `h ^ (h >> 16u)` कोष्ठकबद्ध होने से विनिर्देश-अनुरूप)। पैक लिखें तो पहला व दूसरा दोनों चरण उत्तीर्ण कराएँ।

### 39. स्वतंत्रतः समान सामग्री विषयक

लगभग समान सामग्री वाली समुदाय सामग्री विद्यमान है: [GlitchHunterCoder/Bloxd-Essay का Shader](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader)। इस गाइड से पहले प्रकाशित, पर **इस गाइड सामग्री glm के Bloxd वास्तविक बंडल फ़ाइलों (webpack खंड समुच्चय) के स्वतंत्र विश्लेषण से है — प्रतिलिपि नहीं**। दोनों मिलते हैं क्योंकि एक ही कार्यान्वयन की स्वतंत्र जाँच समान निष्कर्ष लाती है।

---

शोधकर्ता: ltf_ahel (glm के साथ शोधित)

---


## भाग IX: API Version 3 माइग्रेशन गाइड

> **2026-10-26 को प्रतिस्थापित: लाइव API अब संस्करण 5 है** — v3 पैक यहाँ v2 के लिए बताए गए तरीके से ही लोड पर अस्वीकृत होते हैं। इस भाग को लागू करें *और फिर* [भाग X](../history/v4.md) (v3 → v4: टेक्सचर API, `fogAlpha` नाम-बदलाव, `bloxdFragmentBlockPosition`, `hit`)। फिर [भाग XII](../history/v5.md) (v4 → v5) भी लागू करें।

लक्ष्य बिल्ड: `3ymzdd.main.fae4743f.js` — **2026-10-19 से लाइव प्रोडक्शन बिल्ड**। bloxd.io जो बंडल प्रोडक्शन में परोसता है, वह उस प्री-प्रोडक्शन डिप्लॉय से बाइट-दर-बाइट समान है (md5 से जाँचा गया — मुख्य बंडल और शेडर-पैक चंक दोनों), जिस पर यह भाग मूल रूप से शोध किया गया था; इसलिए यहाँ सब कुछ उत्पादन पर जैसा है वैसा ही लागू होता है। पैक मॉडल अपना v2 स्वरूप बनाए रखता है (वही `pack.json` फ़ील्ड, वही लोडर सीमाएँ, वही uniform लेआउट)।

इस गाइड के भाग I–VII अभी भी v2 आधार पर लिखे गए हैं। यह भाग [भाग VIII](../history/v2.md) के उसी क्रम में v2 → v3 प्रवासन बिंदु और नई v3 सुविधाएँ एकत्र करता है। रूपांतरण अधिकतर यांत्रिक है (§47), पर केवल एक परिवर्तन वास्तव में व्यवहार बदलता है — डिफ़ॉल्ट प्रकाश अब फ़ॉग से emission को क्षीण करता है (§43) — तथा `blockId` को पूरी तरह `blockFlags` से बदल दिया गया है (§42), इसलिए वितरण से पहले हमेशा इन-गेम कंपाइल से सत्यापित करें।

इस संस्करण में नया: अनुभाग **§49–§54** प्रवासन से आगे बढ़कर प्रोडक्शन बिल्ड से पुनः प्राप्त इंजन आंतरिक विवरण देते हैं — Lite रेंडरर वास्तव में आपके हुक कैसे बुलाता है, असली चार-मोड फ़ॉग फ़ंक्शन, `bloxdOpaqueBehind()` का सटीक कार्यान्वयन, ब्लॉक पंजीकरण से आपके हुक तक blockFlags की पूरी डिलीवरी पथ, और मापे गए हेडर हैश सहित सत्यापन पाइपलाइन। ये पैक सिस्टम के बारे में अब तक के सबसे गहरे सार्वजनिक रूप से प्रलेखित तथ्य हैं, और ये कई ऐसे प्रश्नों का समाधान करते हैं जिन्हें अन्य गाइड अभी भी खुले के रूप में सूचीबद्ध करते हैं।

### 40. v2 पैकों का भाग्य (पहले निष्कर्ष)

**अद्यतन 2026-10-19: v3 ने प्री-प्रोडक्शन छोड़ दिया और अब लाइव साइट यही परोसती है।** रोलआउट से पहले सहेजा गया हर v2 पैक — v2 के रूप में वितरित हर पैक सहित — अब उत्पादन पर ठीक वैसे ही विफल होता है जैसा नीचे वर्णित है, इसलिए आज पैक वितरित करने वाले किसी भी व्यक्ति के लिए §47 प्रवासन वैकल्पिक नहीं रह गया है।

यह बिल्ड मैनिफ़ेस्ट `apiVersion` को **ठीक 3 से मेल खाना** आवश्यक बनाता है, और **समानांतर v2/v3 समर्थन नहीं है**। v2 पैक लोड पर "गलत API संस्करण" संदेशों के साथ अस्वीकृत होता है (i18n कुंजियाँ, प्लेसहोल्डर टेक्स्ट):

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>

सहेजे गए पैक v2 जीवनचक्र बनाए रखते हैं ([भाग VIII](../history/v2.md) §31): हर बिल्ड अपने इंजन हेडर का हैश बनाता है, इंजन अद्यतन सहेजे गए पैक को स्वतः "needs re-check" चिह्नित करते हैं, और जिस सहेजे गए पैक का `apiVersion` वर्तमान के अलावा कोई भी संस्करण हो वह त्रुटि देने के बजाय won't-run चिह्नित होता है (ऊपर का स्टेटस संदेश प्रतिस्थापन की ओर इंगित करता है)।

### 41. pack.json और uniform बफ़र (क्या अपरिवर्तित रहता है)

- आवश्यक मैनिफ़ेस्ट फ़ील्ड अपरिवर्तित हैं: `{ apiVersion, name, author }`।
- लोडर सीमाएँ अपरिवर्तित हैं: 32MB zip / 1024 प्रविष्टियाँ / 256 `.wgsl` फ़ाइलें / कुल 256KB कोड / 64KB मैनिफ़ेस्ट।
- इंजन uniform ब्लॉक का आकार अपरिवर्तित है: `@group(3) @binding(0)`, 64 B, जिसमें घोषणा क्रम में समय, render offset, सूर्य दिशा और eye position रखे हैं। लेआउट `minBindingSize: 64` के साथ पंजीकृत है, और सटीक फ़ील्ड लेआउट है `seconds: f32` @ byte 0, `renderOffset: vec3i` @ 16, `sunDirection: vec3f` @ 32, `eyePosition: vec3f` @ 48। दो आंतरिक फ़ील्ड नाम बदले: `time` → `seconds`, `originOffset` → `renderOffset`। **बाइट लेआउट v2 जैसा ही है**, और पैक कोड के लिए वैसे भी कुछ नहीं बदलता, क्योंकि पैक uniform को सीधे नाम नहीं दे सकते (इंजन हेडर इसे engine-provided और read-only चिह्नित करता है, "which packs can't name"); हेडर फ़ंक्शन `bloxdSeconds()` / `bloxdRenderOffset()` से ही काम करते रहें।
- पैक के group 3 में एक प्रलेखित दूसरा स्थान जुड़ा: `@group(3) @binding(1)` वह scene-depth texture है जिसे `bloxdOpaqueBehind()` पढ़ता है (पूरा कार्यान्वयन §51 में)। 64 B का uniform binding 0 पर ही रहता है; पैक अभी भी दोनों binding को नाम नहीं दे सकते।

### 42. blockId से blockFlags: प्रति-ब्लॉक सामग्री बिट फ़्लैग के रूप में (मुख्य)

तीनों हुक इनपुट संरचनाओं (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`) में v2 फ़ील्ड `blockId: u32` को **बदलकर** `blockFlags: u32` कर दिया गया है। फ़ील्ड पर इंजन टेक्स्ट: *"What kind of block this face is: `bloxdBlockFlag*` bits, the same across the face."* अब इंजन सामग्री डेटा स्वयं भेजता है, इसलिए संख्यात्मक id श्रेणियों से सामग्री अनुमान लगाने या दुनिया में id तालिकाएँ बनाए रखने का v2 तरीका ([भाग VIII](../history/v2.md) §34) अब आवश्यक नहीं है।

बिट्स नामित स्थिरांक के रूप में उपलब्ध हैं:

```wgsl
// इसका परीक्षण (blockFlags & bloxdBlockFlagRock) != 0 से करें।
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| मान | स्थिरांक | अर्थ (इंजन नोट्स, संक्षिप्त) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | पूरी तरह अपारदर्शी — पत्ते और बर्फ़ भी शामिल। काँच, पानी, लावा, spawners, या ghost और invisible ब्लॉक नहीं। |
| 2 | `bloxdBlockFlagEmissive` | ब्लॉक प्रकाश देता है, जैसे neon, portals, lamps, Lava और Beacon देते हैं। चमकते अयस्क भी गिने जाते हैं, चाहे कितने ही मंद हों। |
| 4 | `bloxdBlockFlagVegetation` | पत्ते, और घास-ब्लॉकों पर की घास — जो dirt भी हैं। कैक्टस, मशरूम ब्लॉक या hay नहीं। |
| 8 | `bloxdBlockFlagDirt` | Dirt और soil, घास-ब्लॉक सहित। Rocky Dirt rock भी है। |
| 16 | `bloxdBlockFlagSand` | Sand, Red Sand, और हर sandstone — जो rock भी है। |
| 32 | `bloxdBlockFlagRock` | Stone और उसके प्रकार, andesite, diorite, granite, gravel, ores, sandstone, Rocky Dirt, bedrock, obsidian और magma। |

कई सामग्रियों से बना ब्लॉक **हर** मेल खाता flag रखता है (इंजन का अपना उदाहरण: sandstone sand और rock दोनों है, इसलिए उसे दोनों मिलते हैं)। पत्ते vegetation हैं पर dirt नहीं; घास-ब्लॉक एक साथ vegetation और dirt हैं।

vegetation / dirt / sand / rock flags ब्लॉक के पंजीकृत **प्रदर्शित नाम (display name)** से असाइन होते हैं (opaque / emissive इसके बजाय इंजन के अपने opacity और emission डेटा से आते हैं): `Leaves` पर समाप्त होने वाले नाम, या `Grass Block`, vegetation हैं; `Dirt` / `Soil` नाम (और हर `Grass Block`) dirt हैं; ठीक `Sand` और `Red Sand`, साथ ही `Sandstone` वाला कोई भी नाम sand हैं; `Stone` / `Andesite` / `Diorite` / `Granite` वाले नाम, कोई भी `Ore`, साथ ही Yellowstone, Gravel, Bedrock, Obsidian, Magma, Rocky Dirt (और sandstone) rock हैं।


#### सटीक नाम-नियम (किसी भी ब्लॉक के flags स्वयं निकालें)

चार सामग्री बिट ब्लॉक के पंजीकृत प्रदर्शित नाम पर एक निश्चित वर्गीकरणकर्ता से आते हैं। पहले वेरिएंट नाम (`|` के बाद का सब कुछ) हटा दिए जाते हैं, इसलिए वेरिएंट आधार ब्लॉक के flags विरासत में लेते हैं। फिर:

| बिट | नियम (छीनें गए नाम पर लागू) |
|---|---|
| vegetation | नाम **` Leaves` पर समाप्त** होता है, या **` Grass Block` पर समाप्त** होता है |
| dirt | नाम **ठीक `Dirt` है**, **` Dirt` या ` Soil` पर समाप्त** होता है, या **` Grass Block` पर समाप्त** होता है |
| sand | नाम **ठीक `Sand` या `Red Sand` है**, या **`Sandstone` शामिल** है |
| rock | नाम **ठीक इनमें से एक है** `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt`, **`Sandstone` शामिल** है, **` Ore` पर समाप्त** होता है, या `Stone` / `Andesite` / `Diorite` / `Granite` को अलग शब्द के रूप में शामिल करता है |

Yellowstone स्पष्ट रूप से सूचीबद्ध है क्योंकि `Yellowstone` के भीतर `Stone` अलग शब्द नहीं है। Opaque और emissive नाम से **नहीं** आते — वे इंजन के अपने opacity और block-light-emission डेटा से आते हैं, इसलिए इन नियमों से उन्हें निकाला नहीं जा सकता।

स्रोत: इंजन का नाम वर्गीकरणकर्ता (module 28537, बंडल `3ymzdd`); सभी 7,861 नामित ब्लॉकों के विरुद्ध सत्यापित, 2026-10-20।

उदाहरण — सामग्री के अनुसार प्रति-ब्लॉक टिंट:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

v2 रेसिपी पर प्रभाव: R-H की 22-प्रविष्टि leaf-id सरणी ([भाग VIII](../history/v2.md) §34) सिकुड़कर `(blockFlags & bloxdBlockFlagVegetation) != 0` रह जाती है। [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) पर id ↔ block-name संदर्भ गैर-शेडर उद्देश्यों के लिए उपयोगी रहता है, पर सामग्री स्टाइलिंग के लिए अब दुनिया में lookup की आवश्यकता नहीं।

#### घास के बिना पत्ते (वह प्रश्न जो सब पूछते हैं)

`vegetation` अकेला पत्तों **और** घास-ब्लॉकों की घास दोनों से मेल खाता है, जो `dirt` भी रखते हैं। केवल पत्ते हिलाने के लिए dirt को बाहर रखें — यही भेद इंजन के अपने फ़ील्ड नोट्स में स्पष्ट है:

```wgsl
// केवल पत्ते: dirt के बिना vegetation। घास-ब्लॉक vegetation AND dirt हैं।
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// केवल घास-ब्लॉक (टेरेन surface के घास वाले फलक):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

लाइव रजिस्ट्री के विरुद्ध सत्यापित (2026-10-20, बंडल `3ymzdd`): `vegetation && !dirt` ठीक 45 leaf registrations से मेल खाता है (22 आधार प्रकार — वही 22 जो v2 R-H id सरणी ने मापे थे); `vegetation && dirt` ठीक 8 grass blocks से मेल खाता है। किसी भी दिशा में कोई अपवाद नहीं — रजिस्ट्री गणनाएँ उस बिल्ड के अनुसार; नए ब्लॉक संख्याएँ बढ़ाते हैं, नियम नहीं बदलते। फलक चुनने के लिए `vertex.normal` (up/down) के साथ जोड़ें, जैसे केवल घास-ब्लॉक के ऊपरी फलक।

### 43. फ़ंक्शन पुनर्नामकरण और अर्थगत परिवर्तन

| v2 | v3 | टिप्पणियाँ |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | पेज लोड होने के बाद से सेकंड (नीचे f32 परिशुद्धता नोट) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | वही मात्रा: render position + यह = world position |
| `const bloxdTimeWrap: f32 = 3600` | **हटाया गया** | अवधि पैक पक्ष पर स्वयं परिभाषित करें |
| `engineColour` (`BloxdLightIn` में) | **हटाया गया** (14 → 13 फ़ील्ड) | `litColour` + फ़ॉग से पुनर्निर्माण करें |
| हुक पैरामीटर `v` / `s` / `l` | `vertex` / `surface` / `light` | टेम्पलेट वर्तनी; हस्ताक्षर अपरिवर्तित |

- **`bloxdSeconds()`** — पेज लोड होने के बाद से सेकंड। f32 में यह पहले 4.5 घंटे तक 1 ms से कम के चरणों में गिनता है, और 9 से 18 घंटे तक लगभग 4 ms के चरणों में। हेडर `bloxdSeconds() % period` मुहावरा सुझाता है, जो 0 से `period` तक गिनकर फिर शुरू हो जाता है — हटाए गए wrap स्थिरांक का साफ़ प्रतिस्थापन।
- **`bloxdRenderOffset()`** — पूरे ब्लॉक: "a render position plus this is a world position." यह खिलाड़ी के यात्रा करने पर बदलता है, इसलिए render positions खिलाड़ी के पास रहते हैं — और इसलिए सटीक। पूरी गाइड में, जिसे v2 पाठ noa-local offset कहता था, अब लगातार **render position** / render offset कहा जाता है; यह वही मात्रा है जो `bloxdOriginOffset()` लौटाता था।
- **`bloxdTimeWrap` हटाया गया** — जो पैक 3600 s पर समय wrap करता था, अब अपना स्थिरांक घोषित करे, जैसे `const timeWrap: f32 = 3600.0;` और `% timeWrap`.
- **डिफ़ॉल्ट प्रकाश अर्थ-विज्ञान** — v2 का डिफ़ॉल्ट `engineColour + emission × fogVisibility` था; v3 डिफ़ॉल्ट इसे `bloxdApplyFog(litColour + emission, light)` के रूप में बनाता है — **अब डिफ़ॉल्ट के भीतर emission को फ़ॉग क्षीण करता है**, इसलिए संयुक्त आउटपुट एक साथ फ़ॉग blend से गुजरता है। पोर्ट तालिका:

  | v2 अभिव्यक्ति | v3 पोर्ट |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // v2 पठन `l.engineColour + s.emission * l.fogVisibility` का v3 पोर्ट:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **नाम और अर्थ में अपरिवर्तित**: `bloxdEyePosition()`, `bloxdSunDirection()`, `bloxdFaceBlock()`, `bloxdApplyFog()`, `bloxdWorldPosition()`.

### 44. नए हेडर स्थिरांक: `bloxdPi` और `bloxdTau`

```wgsl
// आधा घुमाव और पूरा घुमाव, रेडियन में।
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

त्रिकोणमिति जादू के लिए उपयोगी, और इसलिए भी कि पैकों को अब π हार्डकोड नहीं करना पड़ता। नाम पुनःउपयोग पर ध्यान दें: उसी नाम का पैक-लोकल स्थिरांक अब हेडर के duplicate-identifier जाँच से टकराता है — अपने कोड में कोई भी `bloxdPi` / `bloxdTau` पुनःघोषणा हटाएँ या नाम बदलें।

### 45. छह-हुक टेम्पलेट (liquid हुक आधिकारिक रूप से दिखाए गए)

बिल्ड के साथ प्रकाशित डिफ़ॉल्ट पैक टेक्स्ट अब **सभी छह हुक** शामिल करता है — terrain / liquid × vertex / surface / light — और प्रत्येक अपना इंजन डिफ़ॉल्ट लौटाता है। इंजन टिप्पणियाँ इसे इस तरह पेश करती हैं: *"Every hook returns its engine default. Copy a hook and change its output to start a shader pack."*

```wgsl
// हर हुक अपना इंजन डिफ़ॉल्ट लौटाता है। शेडर पैक शुरू करने के लिए
// हुक को कॉपी करें और उसका आउटपुट बदलें।

// Strict गेम टेरेन को वहीं रखते हैं: बिना guard के यह हुक वहाँ
// पूरा शेडर पैक बंद कर देगा।
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

// पानी इनका उपयोग करता है। हटाने पर पानी आपके terrain हुक का उपयोग करता है।
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

- हुकों की टिप्पणियाँ liquid नियम सीधे बताती हैं: **पानी को तीनों की आवश्यकता है; इसे हटाएँ और पानी आपके terrain हुक का पुनः उपयोग करता है** (v2 से ज्ञात fallback व्यवहार, [भाग VIII](../history/v2.md) §36, अब टेम्पलेट में ही लिखा हुआ)।
- `bloxdLiquidVertex` वही `#ifndef BLOXD_STRICT` guard में है जो `bloxdTerrainVertex` में — बिना guard यह strict गेम में पूरा पैक बंद कर देगा, ठीक वैसे ही जैसे terrain-side vertex प्रभाव करते हैं।
- टेम्पलेट वर्तनी अब पूरे पैरामीटर नाम `vertex` / `surface` / `light` हैं (v2 टेम्पलेट छोटे `v` / `s` / `l` वाले थे)। आपके कोड के पैरामीटर नाम स्वतंत्र हैं — केवल हस्ताक्षर मायने रखते हैं।

### 46. वेरिएंट मैट्रिक्स: प्रोग्राम अक्ष और मैक्रो परिवर्तन

वेरिएंट **strict × lighting × program** के मैट्रिक्स पर बनते हैं — v2 जैसे ही 8 संयोजन, पर अब terrain / liquid मैट्रिक्स का स्पष्ट अक्ष है। वेरिएंट नाम इसे `allow|strict · unlit|lit · terrain|liquid` के रूप में लिखते हैं, और UI में ``terrain`` / `liquid`, `strict` / `non-strict`, `lighting on` / `lighting off` के रूप में दिखते हैं (और त्रुटि प्रदर्शन "(only in {{variants}})" जोड़ सकते हैं)।

| मैक्रो | कहाँ परिभाषित |
|---|---|
| `BLOXD_STRICT` | strict वेरिएंट (दोनों प्रोग्राम) |
| `BLOXD_LIGHTING` | lighting-on वेरिएंट (दोनों प्रोग्राम) |
| `BLOXD_ALPHA` | **सभी liquid वेरिएंट** तथा non-strict **terrain** वेरिएंट |
| `BLOXD_SCENE_DEPTH` | **सभी liquid वेरिएंट** |

लेखकों के लिए v2 नियमों की तुलना में दो बातें बदलती हैं ([भाग VIII](../history/v2.md) §36):

- **`BLOXD_ALPHA` v2 से अपरिवर्तित है।** वेरिएंट जनरेटर में शाब्दिक पंक्ति `"liquid"!==program&&strict||push("BLOXD_ALPHA")` है — JS ऑपरेटर प्राथमिकता के कारण *(terrain **और** strict)* ही एकमात्र ऐसा मामला है जो push छोड़ता है, इसलिए मैक्रो **हर liquid वेरिएंट (strict या non-strict) और non-strict terrain** में परिभाषित है; केवल strict terrain इसे छोड़ता है। Liquid-side `#ifdef BLOXD_ALPHA` कोड ठीक वैसे ही संकलित होता है जैसे हमेशा होता था, और §49 का alpha write-back (liquid प्रोग्राम या non-strict वेरिएंट के लिए splice) इस सेट से ठीक मेल खाता है।
- **`BLOXD_SCENE_DEPTH` liquid वेरिएंट में हमेशा परिभाषित है**, इसलिए वहाँ depth उपयोग बिना guard ठीक है, ठीक v2 (§35) की तरह; terrain हुक में इसे अभी भी `#ifdef BLOXD_SCENE_DEPTH` में लपेटना होगा।

### 47. v2 से v3 प्रवासन जाँच सूची

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** तीनों इनपुट संरचनाओं में; सामग्री स्टाइलिंग को `bloxdBlockFlag*` स्थिरांकों के विरुद्ध बिट परीक्षणों के रूप में लिखें (§42); v2 के id-श्रेणी अनुमान हटाएँ
3. **`bloxdTime()` → `bloxdSeconds()`**; हटाए गए `bloxdTimeWrap` के बजाय अपनी अवधि घोषित करें (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **प्रकाश गणित को `engineColour` से `litColour` + फ़ॉग पर पुनर्निर्मित करें** §43 की तालिका के अनुसार; ध्यान दें कि डिफ़ॉल्ट अब emission को फ़ॉग से क्षीण करता है
6. **Liquid हुक**: जब आप पानी को अलग तरह से संभालना चाहें तब `bloxdLiquid*` स्पष्ट रूप से परिभाषित करें; छोड़ने पर आपके terrain हुक पर fallback होता है
7. **`BLOXD_ALPHA` audit की आवश्यकता नहीं** — इसका वेरिएंट सेट v2 से अपरिवर्तित है: सभी liquid वेरिएंट तथा non-strict terrain इसे परिभाषित करते हैं, केवल strict terrain इसे छोड़ता है (§46)
8. **`bloxdPi` / `bloxdTau` का उपयोग करें** जहाँ त्रिकोणमिति-संबंधी स्थिरांक हार्डकोड थे; अब हेडर की नकल करने वाली पैक-लोकल पुनःघोषणाएँ हटाएँ
9. **Strict guards रखें**: vertex हुक और `discard` `#ifndef BLOXD_STRICT` में लिपटे रहें; टेम्पलेट `bloxdLiquidVertex` को terrain की तरह ही guard करता है
10. **इन-गेम सत्यापित करें** — जिस खेल में शेडर पैक समर्थित हों उसमें पैक को कंपाइल और परखें

### 48. अन्य v3 परिवर्तन और टिप्पणियाँ

- **सत्यापन दो-चरणीय रहता है** ([भाग VIII](../history/v2.md) §38): पहले स्थिर सत्यापन, फिर ब्राउज़र का असली WebGPU कंपाइल, जो आपके हुक बुलाने वाले उत्पन्न स्टब स्निपेट के ज़रिए होता है; त्रुटियाँ स्रोत फ़ाइलों / पंक्तियों पर मैप होती हैं, और डायग्नोस्टिक्स मैपिंग के ज़रिए इंजन-पक्ष के पहचानकर्ताओं के मूल नाम बहाल करते हैं।
- **Strict डायग्नोस्टिक्स कारण बताते हैं**: terrain हिलाने वाला vertex हुक रिपोर्ट करता है "… moves terrain, which strict games prevent." और surface / light हुक में `discard` रिपोर्ट करता है "discard makes terrain see-through, which strict games prevent."; सेटिंग्स UI मार्गदर्शन "wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`." (`offInStrict`) बनाए रखता है।
- **लोडर संदेश**: त्रुटि प्रकार और सीमाएँ अपरिवर्तित; "Zip64 archives aren't supported." UI संदेश (`loadZip64`) के रूप में सामने आता है। पैक-UI स्ट्रिंग सूची में कुल 57 `shaderPack:*` कुंजियाँ हैं; load-चरण त्रुटियों में `loadNoWgsl` (शून्य `.wgsl` फ़ाइलों वाला zip) और `loadNotZip` (zip end-of-archive signature के बिना फ़ाइल) सेट पूरा करते हैं।
- **पैक UI के साथ कोई इन-गेम WGSL संपादक नहीं आता।** सेटिंग्स स्क्रीन कोई शेडर कोड संपादक नहीं देती — पैक खेल के बाहर zip फ़ाइलों के रूप में लिखे जाते हैं। (बंडल में CodeMirror संपादक मौजूद है, पर वह कस्टम-गेम स्क्रिप्टिंग UI का JavaScript संपादक है; उसमें WGSL समर्थन नहीं है और पैक सिस्टम से कोई संबंध नहीं।)
- **हार्डवेयर गेट**: Lite के लिए `shader-f16` WebGPU सुविधा समर्थित ड्राइवर चाहिए; बहुत पुराने ड्राइवर "Intel driver too old for Lite (no shader-f16)" जैसे संदेश से अस्वीकृत होते हैं।
- **प्रकाश सेटिंग बदलने पर सहेजे पैक पुनः सत्यापित होते हैं**: रन टाइम पर lighting सेटिंग बदलने पर इंजन पैक जाँच पुनः चलाता है (`changed → recheck`); replay देखना उसी हुक को `changed: false` के साथ बुलाता है और पुनः-जाँच छोड़ देता है।
- **शब्दावली**: शेडर पैक स्वीकार करने वाले खेलों के बारे में टेक्स्ट अब "in games that **support** them" पढ़ता है।
- **टाइटल का दायरा**: जिन खेलों में पैक चलते हैं, उनका सेट पिछले बिल्ड से अपरिवर्तित है।

### 49. इंजन आंतरिक: Lite रेंडरर आपके हुक कैसे बुलाता है

§40–§48 का सब कुछ वही है जो लोडर और हेडर आपको बताते हैं। यह अनुभाग और इसके बाद के चार, यह प्रलेखित करते हैं कि इंजन रन टाइम पर वास्तव में क्या करता है, जो प्रोडक्शन बंडल से बहाल किया गया है (Lite रेंडरर — 175 KB का चंक; integration स्रोत फ़ाइल का असली नाम `lite/terrainShaderPack.ts` उसके error strings के भीतर बचा है)। इसमें से कुछ भी आप जो लिखते हैं उसे नहीं बदलता, पर यह इस अनुमान को हटाता है कि आपके हुक क्या प्राप्त करते हैं — और यह कई ऐसे प्रश्नों को सुलझाता है जिन्हें अन्य सामुदायिक गाइड अभी भी खुले के रूप में सूचीबद्ध करते हैं।

रेंडरर JavaScript से आपके हुक "कॉल" नहीं करता। जब पैक सत्यापन पास करता है, इंजन अपने shader टेक्स्ट की fixed anchor lines बदलकर आपके हुक कॉल को अपने ही terrain WGSL में **splice** करता है। एक anchor ठीक एक बार मेल खाना चाहिए — शून्य या एक से अधिक मैच `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)` के साथ abort करते हैं।

| चरण | इंजन shader में anchor पंक्ति | क्या splice होता है |
|---|---|---|
| vertex | `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` से `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);` तक का चार-पंक्ति ब्लॉक | `BloxdVertexIn` बनाएँ, आपका vertex हुक बुलाएँ, `worldPos` वापस लिखें — splice `let worldPos` को `var worldPos` में भी बदलता है |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | `BloxdSurfaceIn` बनाएँ, आपका surface हुक बुलाएँ, `baseColor` / `alpha` वापस लिखें |
| lit colour | `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` से ठीक पहले | `let bloxdSpLitColour = color.rgb;` — फ़ॉग-पूर्व रंग कैप्चर करता है |
| light | fragment shader की अंतिम `return color;` पंक्ति | `BloxdLightIn` बनाएँ, आपका light हुक बुलाएँ, `color` वापस लिखें — फ़ॉग mix के बाद |

splice किया गया कोड, भेजे गए बंडल से बहाल (light-level sample expressions संक्षिप्त जहाँ इंजन की अपनी formatting लंबी चलती है):

```wgsl
// vertex चरण — vertex हुक वाले non-strict वेरिएंट
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* your bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// fragment चरण — surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* your surface hook */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // केवल तब splice होता है जब प्रोग्राम liquid हो या वेरिएंट non-strict हो
```

```wgsl
// fragment चरण — light
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
               uniforms.vFogInfos.x != 0.0),     // fogColour — केवल तब काला जब बिल्कुल फ़ॉग न हो
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* your light hook */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

इस splicing से चार प्रवर्तन-तथ्य सीधे निकलते हैं:

- **Strict terrain surface-हुक alpha परिवर्तनों को अनदेखा करता है।** `alpha = bloxdSpSurface.alpha` write-back केवल liquid प्रोग्राम या non-strict वेरिएंट के लिए splice होता है — यही §46 की मैक्रो तालिका के पीछे का कार्यान्वयन है। (strict terrain में आपका `#ifdef BLOXD_ALPHA` कोड वैसे भी संकलित नहीं होता; अब यह भी पुष्ट है कि बिना guard वाले alpha writes वहाँ गिरा दिए जाते हैं।)
- **जो strict वेरिएंट अभी भी vertex हुक घोषित करता है, उसे कभी नहीं चलाया जाता** — इंजन build time पर रिपोर्ट करता है: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. इसीलिए आधिकारिक टेम्पलेट (§45) `bloxdLiquidVertex` को उसके terrain जुड़वाँ की तरह उसी `#ifndef BLOXD_STRICT` में लपेटता है।
- `bloxdSp*` पहचानकर्ता — **कुल 14**: `bloxdSpVertexIn`, `bloxdSpVertex`, `bloxdSpSurfaceIn`, `bloxdSpSurface`, `bloxdSpLightIn`, `bloxdSpLight`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, `bloxdSpPositionW`, `bloxdSpZ`, `bloxdSpEye`, `bloxdSpScale`, `bloxdSpBehind` — इंजन-पक्ष temporaries हैं। आपका कोड उन्हें कभी नहीं देखता, पर वे diagnostics और किसी के भी reverse-engineering output में सामने आते हैं, इसलिए उन्हें देखते ही पहचानना उपयोगी है।
- **डिफ़ॉल्ट-surface शॉर्टकट।** जब किसी वेरिएंट का surface हुक शाब्दिक रूप से `bloxdDefaultSurface` हो, तो इंजन `baseColor` / `alpha` write-back पंक्तियाँ splice करना पूरी तरह छोड़ देता है — डिफ़ॉल्ट वे मान पहले ही पैदा करता है, इसलिए assignment मृत कोड होता। असंशोधित हुक शृंखलाओं पर कोई लागत नहीं।

**`BloxdLightIn` को वास्तव में क्या भेजता है** — splice किए गए कोड से, फ़ील्ड दर फ़ील्ड:

| फ़ील्ड | इंजन-पक्ष स्रोत |
|---|---|
| `litColour` | फ़ॉग mix से ठीक पहले कैप्चर किया गया fragment रंग (`bloxdSpLitColour` anchor) — "before emission and fog", जैसा हेडर कहता है |
| `directional` | `vTerrainLambert` — scene के दिशात्मक प्रकाशों पर `max(0, dot(normal, lightDirection)) × intensity` का vertex-interpolated योग (§54 में सूत्र); scene में कोई न हो तो 0 |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — प्रति सामग्री, प्रति फ़्रेम |
| `blockLight` | decoded light-level varying का `.rgb` (§54 में decode) |
| `skyLight` | उसी light-level varying का sky channel — *"Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING"* (हेडर टेक्स्ट) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | हस्त-प्रकाश पद, जो light-level varying के w चैनल और `uHeldLightPos` / `uHeldLightColour` फ़्रेम uniform से बनता है ([भाग VII](../internals/) §26 falloff और channel-floor व्यवहार प्रलेखित करता है) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **केवल ऐसे scene में काला जहाँ बिल्कुल फ़ॉग नहीं** (मोड 0, §50) |
| `fogVisibility` | clamp किया गया फ़ॉग गुणांक — ठीक वही मान जो §50 का फ़ंक्शन लौटाता है |
| `position` / `normal` | `vPositionW` / `vNormalW` varyings (normal प्रति fragment पुनः सामान्यीकृत) |
| `blockFlags` | `vBlockFlags` flat varying — §52 का पूरा delivery path |

पुरानी सामग्री पढ़ते समय दिशा-निर्देश के लिए: वही splicing architecture v2 रेंडरर में मौजूद थी, और v3 के केवल integration अंतर `vBlockId` → `vBlockFlags` और जोड़े गए liquid वेरिएंट हैं। हुक सिस्टम v2 → v3 break के पार architectural रूप से स्थिर है।

### 50. फ़ॉग फ़ंक्शन: चार मोड, एक फ़ील्ड

प्रोडक्शन terrain shader से शब्दशः बहाल:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // रैखिक
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // चरघातांकी
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // चरघातांकी वर्ग
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = फ़ॉग बंद (गुणांक 1.0 रहता है)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)` — एक vec4 सब कुछ नियंत्रित करता है।
- **शेडर में चार मोड मौजूद हैं: 0 = बंद, 1 = चरघातांकी, 2 = चरघातांकी-वर्ग, 3 = रैखिक।** `fogVisibility` clamp किया गया गुणांक है, चाहे कोई भी मोड चले — ठीक एक फ़ील्ड है, और कोई mode flag कभी पैकों को उजागर नहीं होता।
- Bloxd के अपने टाइटल मोड 3 (रैखिक) को [भाग VII](../internals/) §25 में वर्णित 32-ब्लॉक पट्टी के साथ चलाते हैं (`fogStart = 32 × D`, `fogEnd = 32 × (D + 1)`), इसलिए उस भाग का "सदा रैखिक" अवलोकन अभी भी भेजे गए गेमप्ले का वर्णन करता है। पर exponential मोड असली, जीवित इंजन कोड हैं — कोई टाइटल `vFogInfos.x` बदलकर बिना किसी क्लाइंट अपडेट के रैंप बदल सकता है। दूरी-आधारित लुक लिखने का मज़बूत तरीका वे दूरी रेसिपी हैं जो `distance(l.position, bloxdEyePosition())` स्वयं गिनती हैं (रेसिपी R-B), क्योंकि मोड बदलने से उन्हें हिलाया नहीं जा सकता।
- यह स्रोत से ही "इंजन वास्तव में कौन-सा फ़ॉग रैंप उपयोग करता है" प्रश्न तय कर देता है: चारों कार्यान्वित हैं; भेजे गए टाइटल रैखिक उपयोग करते हैं। (यही फ़ंक्शन हेडर की fogColour टिप्पणी भी समझाता है — मोड 0 ही एकमात्र स्थिति है जहाँ `fogColour` काला आता है, और Bloxd के खेल कभी मोड 0 नहीं भेजते; वे इसके बजाय फ़ॉग को बहुत दूर धकेल देते हैं, [भाग VII](../internals/) §25।)

### 51. bloxdOpaqueBehind(): सटीक कार्यान्वयन

पूरा फ़ंक्शन, प्रोडक्शन बिल्ड से शब्दशः बहाल:

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

- **Depth texture `@group(3) @binding(1)` पर रहती है** — group 3 पैक का अपना group है: binding 0 64 B का `bloxdPackInputs` uniform है (§41), binding 1 यह depth texture है। दोनों इंजन-प्रदत्त हैं और आपकी ओर से अनाम हैं।
- **Depth texture एक unfilterable-float, केवल-fragment संसाधन है।** bind-group लेआउट इसे `texture: { sampleType: "unfilterable-float" }` के रूप में केवल `GPUShaderStage.FRAGMENT` दृश्यता के साथ पंजीकृत करता है — इसीलिए `bloxdOpaqueBehind()` `textureSample` के बजाय `textureLoad` (स्पष्ट texel निर्देशांक, mip level 0) पर बना है: इस texture पर हार्डवेयर फ़िल्टरिंग उपलब्ध ही नहीं है।
- `z ≤ 0` का अर्थ है depth सैंपल को कुछ नहीं मिला (far plane / आकाश): `found = false`, और `position` / `distance` का कोई अर्थ नहीं — हमेशा पहले `found` जाँचें।
- लौटाई गई स्थिति एक **ray-scale प्रतिच्छेद** है: अपारदर्शी सतह `eye + (fragment − eye) × max(z / viewDepth, 1)` पर रखी जाती है। `distance` आँख से उस बिंदु तक मापी जाती है — पानी-सतह पैकों के लिए यह व्यावहारिक रूप से "किरण ठोस चीज़ से टकराने से पहले कितना पानी पार कर चुकी है" है, और यही गहराई-रंग वाली पानी रेसिपी को बिना दूसरे depth buffer के काम करने देता है।

### 52. blockFlags एंड-टू-एंड: पंजीकरण से आपके हुक तक

§42 बताता है कि बिट्स का अर्थ क्या है। यह अनुभाग वह पूरा पथ है जो एक flag बिट ब्लॉक पंजीकरण से आपके हुक तक तय करता है — हर चरण प्रोडक्शन स्रोत से पुष्ट, जो हेडर के "the same across the face" को बाइट स्तर तक सिद्ध करता है।

**1. पंजीकरण (block-definition डेटाबेस)।** हर ब्लॉक के flags पंजीकरण के समय एक बार गिने जाते हैं:

```js
flags[id] = nameFlags                     // display-name नियम (§42): vegetation / dirt / sand / rock
          | (definition.opaque === true ? 1 : 0)   // opaque बिट — इंजन opacity डेटा
          | (anyFaceEmission >= 1       ? 2 : 0);  // emissive बिट — block-light emission डेटा
```

display-name नियम केवल चार सामग्री बिट कवर करते हैं; दो भौतिकी बिट अलग इंजन डेटा से आते हैं — `opaque` सीधे block definition से, `emissive` प्रति-फलक block-light emission सरणी से। हेडर का "Glowing ores count, however faint" शब्दशः सच है: emission ≥ 1 वाला कोई भी फलक बिट सेट करता है।

**2. प्रति-ब्लॉक → प्रति-सामग्री (mesher initialization)।** टेरेन प्रति *सामग्री* खींचा जाता है, प्रति ब्लॉक id नहीं, इसलिए flags को material तालिका में पुनः सारणीबद्ध किया जाता है (एक `Uint16Array` जो material id से अनुक्रमित है, और हर सामग्री अपने स्वामी ब्लॉक के पहले फलक के flags लेती है)। तालिका meshing Web Worker तक जाती है — पर **केवल उन configurations में जहाँ पैक पाइपलाइन सक्षम है**; अन्यथा तालिका `null` रहती है और कोई flag बाइट कभी नहीं लिखी जाती। बिना पैक वाले खिलाड़ी संरचना से ही शून्य overhead देते हैं।

**3. Vertex बाइट्स में (mesher worker)।** flags मौजूदा interleaved vertex डेटा के दो खाली बाइट में सवार होते हैं:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // निम्न 8 बिट → रंग गुण का alpha बाइट
        buffer[o + normalOffset + 3] = flags >> 8;    // उच्च 8 बिट → normal गुण का w बाइट
    }
}
```

किसी फलक के चारों vertices को वही मान मिलता है — "the same across the face" का कार्यान्वयन-स्तरीय अर्थ।

**4. GPU-पक्ष decode (Lite terrain shader)।** दोनों बाइट `blockFlagWords: vec2u` vertex attribute के रूप में यात्रा करते हैं (location 7, केवल तब मौजूद जब पैक पाइपलाइन चालू हो) और vertex चरण में पुनः जोड़े जाते हैं:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags` को `@interpolate(flat)` घोषित किया गया है — fragment चरण तक प्रति-फलक स्थिर, इसीलिए §42 के बिट परीक्षण एक फलक के भीतर स्थिर रहते हैं और कभी मध्य-फलक blend नहीं बना सकते।

- पाइपलाइन **16 बिट** क्षमता आरक्षित रखती है (वह decode दो पूरे बाइट पुनः जोड़ता है) जबकि v3 केवल 6 परिभाषित करता है — भविष्य के flags बिना दूसरे vertex-format परिवर्तन या API bump के आ सकते हैं।
- Packed-vertex मोड में वही दो बाइट समर्पित attribute के बजाय `packed.y` और रंग शब्द के ऊपरी बाइट के भीतर सवार होते हैं — वही मान, अलग container।
- पत्ते-बनाम-घास के उस प्रश्न के लिए जिसके बारे में ये flags सबसे अधिक पूछे जाते हैं, §42 के अंतर्गत [घास के बिना पत्ते](#घास-के-बिना-पत्ते-वह-प्रश्न-जो-सब-पूछते-हैं) देखें।

### 53. सत्यापन आंतरिक: HEADER_VERSION, हस्ताक्षर, आरक्षित नाम

**मापा गया हेडर हैश।** हर पैक सत्यापन पर इंजन का `HEADER_VERSION` अंकित होता है। प्रोडक्शन validation मॉड्यूल को सीधे चलाकर (§54 के अंत में हार्नेस नोट देखें) इसे मापा जाता है:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← लाइव प्रोडक्शन बंडल से मापा गया
```

यह पाँच इनपुटों पर एक FNV-1a-32 हैश है (`6.` उपसर्ग के साथ): इंजन हेडर जो **प्रति वेरिएंट** प्रीप्रोसेस और टोकनाइज़ होता है (आठ में से हर वेरिएंट के लिए एक प्रविष्टि), पार्सर का पूरा WGSL लेक्सिकल यूनिवर्स, चार मैक्रो नाम, विशेष-फ़ंक्शन मैप, और `BloxdPackInputs` घोषणा उसकी `@group(3) @binding(0)` uniform पंक्ति के साथ। लेखकों के लिए दो परिणाम:

- **इंजन-पक्ष का कोई भी हेडर संपादन इसे पुनः हैश करता है** — यही इंजन अद्यतन के बाद सहेजे गए पैकों को मिलने वाले स्वतः "needs re-check" flag के पीछे का तंत्र है ([भाग VIII](../history/v2.md) §31)।
- हैश *इंजन हेडर* को कवर करता है, आपके कोड को नहीं। जो पैक इंजन अद्यतन के पार लोड होता रहता है वह "अभी भी वैध" नहीं है — उसने बस अभी तक हेडर परिवर्तन नहीं छुआ है। आपका मैनिफ़ेस्ट केवल `apiVersion` गेट में ही संस्करण जाँच में भाग लेता है (§40)।

**हुक हस्ताक्षर जाँच: प्रकारों पर टोकन-सटीक, नामों पर मुक्त।** Validator हर हुक स्लॉट के लिए एक हस्ताक्षर रखता है:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

मिलान **टोकन दर टोकन** होता है: पैरामीटर प्रकार नाम ठीक मेल खाने चाहिए, `->` और रिटर्न प्रकार ठीक मेल खाने चाहिए, और पैरामीटर संख्या तथा comma की स्थिति जाँची जाती है। पैरामीटर *नाम* स्वतंत्र हैं — पैरामीटर स्थिति में कोई भी पहचानकर्ता स्वीकार्य है, इसीलिए आपका `fn bloxdTerrainLight(s, l)` संकलित होता है, चाहे टेम्पलेट इसे `(surface, light)` लिखता हो। light हुक ठीक दो पैरामीटर लेता है।

**आरक्षित नाम।** नियम एक ही regex है: `/^bloxd/i`. `bloxd` से शुरू होने वाला कोई भी पहचानकर्ता आरक्षित है — हर `bloxd*` इंजन-प्रदत्त है, और पैक उस namespace में घोषणा नहीं कर सकता (यही कारण है कि §44 की `bloxdPi` / `bloxdTau` पुनःघोषणाएँ टकराती हैं)।

**विशेष फ़ंक्शन।** v3 में ठीक एक पंजीकृत है:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

"विशेष" का अर्थ है *किसी मैक्रो से बंधा* — ऐसा इंजन फ़ंक्शन जिसकी उपलब्धता वेरिएंट प्रतीक पर निर्भर है। सही उपयोग के लिए दो guard डायग्नोस्टिक्स हैं:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — surface/light-केवल फ़ंक्शन तक पहुँचता vertex हुक।
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — उदाहरण के लिए `#ifdef BLOXD_SCENE_DEPTH` में लिपेटे बिना terrain-side `bloxdOpaqueBehind()`।

**इंजन हेडर (प्रील्यूड), स्थिर।** v3 हेडर 5,637 बाइट का स्ट्रिंग है जो `// Engine-provided and read-only, prepended to all packs. apiVersion 3.` से शुरू होता है। इसमें `#if` / `#ifdef` directives हैं जिन्हें इंजन का अपना WGSL प्रीप्रोसेसर प्रति वेरिएंट मूल्यांकित करता है — इंजन वास्तव में `#if` अभिव्यक्ति मूल्यांकन चलाता है, और खराब अभिव्यक्ति `Cannot evaluate #if ...` के साथ त्रुटि देती है। इस गाइड की हर संरचना, फ़ंक्शन हस्ताक्षर और उद्धृत टिप्पणी इसी रेंडर किए गए टेक्स्ट से आती है, इसलिए गाइड और भेजा गया हेडर एक-दूसरे से अलग नहीं हो सकते। पूरा पाठ §54 के अंत में शब्दशः दिया गया है।

**लेखकों के लिए पार्सर नोट्स।**

- इंजन shader में मिलाते समय पैक-पक्ष फ़ंक्शनों का नाम `pack_` उपसर्ग के साथ बदला जाता है (टकराव से बचाव); डायग्नोस्टिक्स उन्हें आपके मूल नामों पर वापस मैप करते हैं — वही तंत्र जिसे [भाग VIII](../history/v2.md) §38 दूसरे सत्यापन चरण के लिए वर्णित करता है।
- undeclared-identifier संदेश है `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`; `_ can only be the target of a phony assignment, as in _ = f();` और `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.` नए पुष्ट सेट को पूरा करते हैं।
- पार्सर के लेक्सिकल यूनिवर्स में ऐसे पहचानकर्ता हैं जो **मानक WGSL नहीं हैं**: `bufferView`, `bufferArrayView`, `bufferLength`, `atomicStoreMax`, `atomicStoreMin`। इंजन इन्हें built-ins के रूप में जानता है, पर किसी दिए गए ब्राउज़र का WGSL कार्यान्वयन उन्हें प्रदान करता है या नहीं, इसकी गारंटी नहीं — वितरण पैक कभी इन पर न बनाएँ।

### 54. पुष्ट स्थिरांक, सीमाएँ और लेआउट

terrain प्रोग्राम का पूरा संसाधन लेआउट, सीधे प्रोडक्शन Lite रेंडरर से:

| Binding | सामग्री |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms` — `viewProjection` mat4x4f, `view` mat4x4f, `vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`, `uSkyLightColour`, `uAmbientLightColour`, **`vFogInfos`**, `vFogColor`, `outputHeight`, `sceneAmbient`, **`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: storage `array<vec4f>` — xyz = render frame में translation, w = fade-in visibility |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`, `ambientAndCutoff`, `emissiveAndLevel`, `anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — पैक uniform (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — depth texture (§51) |

- **दिशात्मक प्रकाश अधिकतम चार तक सीमित हैं।** अगर कोई scene अधिक पंजीकृत करने की कोशिश करता है तो रेंडरर `Terrain supports 4 directional lights, not ${n}` के साथ त्रुटि देता है। `l.directional` जितने भी मौजूद हों (0–4; Bloxd के अपने scene 2 उपयोग करते हैं — [भाग VII](../internals/) §27) उन सब पर योग किया गया Lambert है। Terrain उन प्रकाशों के बारे में भी चेतावनी देता है जिन्हें वह मान नहीं सकता, शब्दशः: देर से जोड़ा गया प्रकाश — `Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`; रंगा हुआ प्रकाश — `Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`; और mesh-फ़िल्टर करने वाला — `Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **Terrain प्रोग्राम नामकरण**: पाइपलाइन कैश कुंजियाँ `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}` पढ़ती हैं — पैक `-sp{variant}` प्रत्यय के रूप में दिखता है, §46 के प्रति वेरिएंट एक प्रोग्राम। एक watcher (`watchPipelineFailures`) live pipeline नामों को `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/` से मिलाता है और pipeline compilation विफल होने पर मेल खाते पैक वेरिएंट को पुनः जाँचता है; GPU device loss (`device.lost`) जाँच छोड़ देता है।
- **`BLOXD_TERRAIN_DIRECTIONAL` एक इंजन-आंतरिक मैक्रो है** (dirLightCount > 0 होने पर परिभाषित)। यह प्रील्यूड के चार में से *नहीं* है और कभी पैक कोड तक नहीं पहुँचता — पर यह इंजन के अपने shaders के WGSL dumps में दिखता है, इसलिए इसे पहचानना भ्रम बचाता है।
- **Light-level decode**: `aPackedLightLevels` vertex attribute एक f32 है जो चार निबल पैक करता है, प्रत्येक 15 से विभाजित: rgb = रंगीन ब्लॉक प्रकाश, a = sky/held चैनल। Vertex चरण इसे `vLightLevels` varying में decode करता है; `blockLight` `.rgb` पढ़ता है, sky/held चैनल `.w` पढ़ता है। इंजन इंटरपोलेशन से पहले rgb चैनलों को सबसे चमकीले चैनल के 35% पर floor करता है — [भाग VII](../internals/) §26 जिस lift को गेमप्ले से प्रलेखित करता है उसका इंजन-पक्ष anchor यही है।
- **`vTerrainLambert`** (`directional` का स्रोत, §49) सक्रिय दिशात्मक प्रकाशों पर योग के रूप में बनता है: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, जो `BLOXD_TERRAIN_DIRECTIONAL` से guard है।
- **सबसे बड़े पहले mesh पर index buffers 32-बिट हो जाते हैं।** Lite रेंडरर `Uint16Array` indices तभी चुनता है जब तक हर index मान ≤ 65,534 रहे — जैसे ही कोई index 65,535 तक पहुँचता है, buffer `Uint32Array` बन जाता है (प्रति buffer `is32Bits` flag से ट्रैक)। व्यवहार में: अधिकतम 65,535 vertices वाला chunk mesh 16-बिट indices में फ़िट होता है; ठीक 65,536 vertices वाला अनिवार्य रूप से 65,535 index निकालता है और पूरा buffer 32-बिट पर स्विच कर देता है।
- **मैनिफ़ेस्ट लोडिंग विवरण**: `__MACOSX/` के नीचे zip entries, `._` उपसर्ग वाली फ़ाइलें, और `.DS_Store` फ़िल्टर हो जाते हैं (macOS संग्रह शोर); `pack.json` path की lowercased तुलना से पाया जाता है — शून्य मैच → `loadNoManifest`, दो या अधिक → `loadDuplicateManifest`; मैनिफ़ेस्ट पठन 65,536 बाइट तक सीमित है।
- **यह सब कैसे सत्यापित हुआ**: प्रोडक्शन बंडल के modules बहाल किए गए (165 चंक; इस बंडल में webpack registry 4,951 modules गिनता है — async child dependencies शामिल हैं या नहीं, इसके अनुसार module गिनती कुछ इकाइयों से बदलती है, इसलिए सटीक संख्या को bundle-specific मानें) और Node.js के नीचे webpack-संगत हार्नेस में चलाए गए। मापा गया `HEADER_VERSION` (§53), रेंडर किया गया 5,637-बाइट हेडर, वेरिएंट तालिका का canonical क्रम, और विशेष-फ़ंक्शन मैप सब *भेजे गए कोड को चलाने* से आते हैं, strings पढ़ने से नहीं। वही हार्नेस सामुदायिक `pack_check` v6 का स्वाभाविक कोर है — पैक के विरुद्ध इंजन के अपने validator को चलाने से उसके निर्णय ठीक वैसे ही पुनरुत्पन्न होते हैं।
#### v3 इंजन हेडर, शब्दशः

स्थिर 5,637-बाइट (127-पंक्ति) पाठ स्वयं — वही अनुशंसित टुकड़ा जिसका वर्णन ऊपर §53 करता है — बिल्ड `3ymzdd` (इस भाग का v3 प्रोडक्शन बिल्ड) से शब्दशः पुनर्स्थापित। यह [भाग XI](../api/texture-catalog.md) §67 के v4 हेडर का v3 समकक्ष है और उसी कारण पूरा अंतर्निहित है: v3 पैक को इंजन द्वारा अग्रयोजित ठीक उसी पाठ के विरुद्ध डिबग किया जा सके, और हर v3 → v4 अंतर ([भाग X](../history/v4.md) §58–§59) दोनों पाठों को साथ रखकर सीधे पढ़ा जा सके।

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

शोध: ltf_ahel (glm के साथ शोध)

---


## भाग X: API Version 4 माइग्रेशन गाइड (2026-10-26, सारांश)

> **2026-11-03 को प्रतिस्थापित: लाइव API अब संस्करण 5 है** — v4 पैक यहाँ v3 के लिए बताए गए तरीके से लोड पर अस्वीकृत होते हैं। इस भाग को लागू करें *और फिर* [भाग XII](../history/v5.md) (v4 → v5: `BloxdFlags` संरचना `blockFlags` को बदलती है, `bloxdLit()` और सार्वजनिक प्रकाशन रेसिपी, एनचांट/ओवरले इनपुट, 9-हुक डिफ़ॉल्ट पैक)। इस भाग के आंतरिक विवरण (§56–§66) जिन v4 बिल्ड पर मापे गए थे उनके लिए सही बने रहते हैं।

> यह इस भाषा में संक्षिप्त सारांश है। सभी विवरणों, उदाहरण रेसिपी और पुनर्स्थापित इंजन-आंतरिक तथ्यों (§55–§66) सहित पूर्ण संस्करण [अंग्रेज़ी](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md) और [जापानी](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md) में है।

लक्ष्य बिल्ड: `cnty9.main.669f8081.js` — **2026-10-26 से उत्पादन और preprod दोनों में एक साथ लाइव** (दोनों बाइट-समान)। पैक मॉडल अपना स्वरूप बनाए रखता है: वही `pack.json` फ़ील्ड, वही लोडर सीमाएँ, वही 64 B uniform, वही 6 हुक।

`tcwczu.main.357faec1.js` (2026-10-30, प्रोडक्शन और preprod फिर से बाइट-समान) पर पुनः सत्यापित: **v4 API का पूरा पृष्ठ अपरिवर्तित है** — हेडर, डिफ़ॉल्ट पैक टेम्पलेट, 27 `bloxdSp*` सिंबल, लोडर सीमाएँ और 12 अनुमतित शीर्षक सब यहाँ प्रलेखित `cnty9` आधार के समान बाइट-दर-बाइट हैं। बंडल लेआउट फिर बदला (जैसे क्लस्टर अब c51–c56 पर है), पर पैक को कुछ दिखता नहीं; टेक्सचर-नाम रजिस्ट्री दोबारा नहीं मापा गया (नाम ही स्थिर API हैं)।

### क्या बदलता है

- `pack.json` में `"apiVersion": 4` चाहिए (सख़्त `===`, संख्या) — v3 पैक लोड पर अस्वीकृत।
- **नया टेक्सचर API (मुख्य आकर्षण):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` ब्लॉक-टेक्सचर एटलस को ठीक वैसे ही सैंपल करता है जैसे इंजन स्वयं करता है (id 0 = सफ़ेद; एनिमेटेड टेक्सचर स्वतः वर्तमान फ़्रेम देते हैं), `bloxdTextureSize(mipLevel) -> vec2u`, और नामित स्थिरांक `bloxdTextureId*` (फ़ाइल-नाम से CamelCase, जैसे `grass_top` → `bloxdTextureIdGrassTop`; सभी 905 प्रयोज्य नामों का पूर्ण कैटलॉग भाग XI (`11-reference.md`) के §68 में अंतर्निहित है)।
- `BloxdSurfaceIn` *और* `BloxdLightIn` में **चार नए इनपुट फ़ील्ड**: `textureId`, `textureRotation` (दक्षिणावर्त चौथाई घुमाव, जिसे `bloxdTexel` लागू करता है), `uv` (ब्लॉक में; `fract(uv)` अंकित होता है), `mipLevel`।
- **अर्थ-बदलाव के साथ पुनर्नामकरण:** `fogVisibility` → `fogAlpha` **उलटे** अर्थ के साथ (`0 = कोई फ़ॉग नहीं, 1 = केवल fogColour`; पोर्ट: `l.fogVisibility` → `1.0 - l.fogAlpha`); `bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (काय समान); `BloxdOpaqueBehind.found` → `hit`।
- **strict गेम अब बंडल के वैलिडेटर से लागू होते हैं:** असुरक्षित वर्टेक्स हुक या पहुँच-योग्य `discard` पर `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...` संदेश आता है और strict गेमों में **सभी** हुक निष्क्रिय हो जाते हैं। `#ifndef BLOXD_STRICT` रैपर से surface/light चलते रहते हैं।
- बाकी सब जमा हुआ: 6 हुक, `blockFlags` बिट (1/2/4/8/16/32), uniform लेआउट, लोडर सीमाएँ, वेरिएंट मैट्रिक्स, 12 allow शीर्षक (`cnty9` पर 2026-10-27 को अपरिवर्तित पुष्ट)।

### संक्षिप्त माइग्रेशन

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (संख्या) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` या `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| असुरक्षित वर्टेक्स हुक | `#ifndef BLOXD_STRICT ... #endif` |

संपूर्ण संदर्भ सामग्री अब गाइड का हिस्सा है: पूर्ण रूप से पुनर्स्थापित इंजन हेडर और सभी 905 प्रयोज्य नामों वाला पूर्ण टेक्सचर कैटलॉग भाग XI (`11-reference.md`) में है। पूर्ण विवरण — `bloxdTexel` की रोटेशन-बारीकी, पुनर्स्थापित सैंपलिंग WGSL, नाम-रजिस्ट्री, रजिस्ट्री-हैश सहित नया `HEADER_VERSION` — अंग्रेज़ी और जापानी पूर्ण संस्करण में हैं।



---

### 67. संपूर्ण v4 इंजन हेडर, शब्दशः

वह 6,021-बाइट (150-पंक्ति) हेडर जो इंजन हर पैक के आगे जोड़ता है — पहली पंक्ति `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.` इसमें सम्मिलित नहीं: प्रति रेंडरर-कॉन्फ़िगरेशन जनरेट होने वाली `bloxdTexel`/`bloxdTextureSize` जोड़ी (§63.1) और 27 `bloxdSp*` प्रतीक (§63.4)। `#ifdef BLOXD_ALPHA` गेट इंजन का प्रीप्रोसेसर प्रति वेरिएंट हल करता है।


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


## भाग XII: API संस्करण 5 माइग्रेशन गाइड (2026-11-03, सारांश)

> यह पाठ इस भाषा के लिए संक्षिप्त सारांश है। सभी विवरणों, उदाहरण-रेसिपियों, पूर्ण रूप से पुनर्स्थापित v5 हेडर और इंजन-आंतरिक तथ्यों (§69–§82) के साथ पूर्ण संस्करण [अंग्रेज़ी](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/12-apiv5.md) और [जापानी](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/12-apiv5.md) में उपलब्ध है।

लक्ष्य बिल्ड: `ab90qa.main.6188124c.js` — **2026-11-03 को मापी गई, प्रोडक्शन और preprod दोनों पर एक साथ लाइव**, दोनों बंडल बाइट-समान (md5 सत्यापित)। v3 के बाद से यह सबसे बड़ा API संशोधन है: इंजन हेडर 6,021 से बढ़कर **8,954 डिकोडेड बाइट** हुआ और लगभग हर संरचना को नए फ़ील्ड मिले।

### क्या बदलता है

- `pack.json` अब `"apiVersion": 5` माँगता है (सख्त `===`, संख्या) — v4 पैक लोड पर अस्वीकृत; संग्रहीत v4 पैक मौन रूप से निष्क्रिय।
- **`blockFlags` की जगह संरचना (मुख्य बदलाव):** छह बिट-स्थिरांक `bloxdBlockFlag*` समाप्त; अब **`flags: BloxdFlags`** — 14 नामित bool फ़ील्ड (छह पुराने बिट नए नाम से, आठ नए): **`slab` `stairs` `flat` `placed` `held` `dropped` `thrown` `lifeform`**। मॉडल, हाथ में पकड़े आइटम और जीव अब टेरेन से अलग पहचाने जा सकते हैं।
- **`#ifdef BLOXD_LIGHTING` हटा दिया गया:** कंपाइल-टाइम स्विच की जगह नए हेडर फ़ंक्शन **`bloxdLit()`** से रन-टाइम परीक्षण; uniform में `lit: u32` (offset 4, कुल अब भी 64 B)। वेरिएंट मैट्रिक्स 8 से घटकर 6 (`strict|allow` × `terrain|liquid|model`)।
- **इंजन की लाइटिंग रेसिपी सार्वजनिक:** तीन नए फ़ंक्शन — **`bloxdShading(light)`**, **`bloxdWorldLight(light)`**, **`bloxdLitColour(surface, light)`** — साथ ही `BloxdLightIn` के दो नए इनपुट (`diffuse`, `emissive`)।
- **नए इनपुट:** हर जगह `localPosition: vec3f` (मॉडल निर्देशांक, टेरेन पर 0); Surface/Light पर `enchantTier` / `enchantColour` / `enchantSpeed` / `overlayColour` (एनचांट और चोट की चमक); `BloxdSurface` पर **नए आउटपुट** `enchantColour` / `overlayColour`, जिन्हें `bloxdLitColour` मिलाता है।
- **हटाए गए:** `bloxdFragmentBlockPosition()` (कोई विकल्प नहीं), `bloxdBlockFlag*` स्थिरांक, `bloxdSpLitColour`।
- **डिफ़ॉल्ट पैक टेम्पलेट अब सभी 9 हुक लेकर आता है** (लाइट हुक सहित, 1,122 → 1,683 बाइट) और नया कमेंट मिटाने के नियम को बताता है: *"If you delete a hook, the default is used instead."*
- हेडर में नया स्थिरांक: `const bloxdChunkSize: i32 = 32;`। Y-डेरिवेटिव स्वतः चिह्न-पलटे जाते हैं: `dpdy`/`dpdyCoarse`/`dpdyFine` को `(-dpdy(...))` रूप में फिर से लिखा जाता है। `HEADER_VERSION` अब `9.<hash>.<hash>`।
- `bloxdSp*` नेमस्पेस 27 से बढ़कर **46 सिंबल**; टेक्सचर रजिस्ट्री अब **896 प्रयोज्य नाम** (+1 `scorpion_eggs`, −10 — `chest_double_*` परिवार और `mob_spawner_*_block_side` सहित) — नाम ही API हैं, ids केवल स्नैपशॉट।
- बाकी सब जमा हुआ: लोडर सीमाएँ (256 `.wgsl` / 256 KB / 64 KB / 32 MB / 1,024 प्रविष्टियाँ), हुक नाम, strict अनुबंध (allow 12 शीर्षक), group-3 बाइंडिंग।

### संक्षेप में माइग्रेशन

| v4 | v5 |
|---|---|
| `"apiVersion": 4` | `"apiVersion": 5` (संख्या) |
| `(s.blockFlags & bloxdBlockFlagVegetation) != 0u` | `s.flags.vegetation` |
| `#ifdef BLOXD_LIGHTING … #endif` | `if (bloxdLit()) { … } else { return bloxdDefaultLight(s, l); }` |
| `bloxdFragmentBlockPosition(p, n)` | हटाया गया — `bloxdWorldPosition()` / `flags` उपयोग करें |
| (पहले नहीं था) | `s.flags.held`, `s.flags.lifeform`, `s.localPosition`, `s.enchantTier` … |

पूर्ण पुनर्स्थापित v5 इंजन हेडर (8,954 बाइट, शब्दशः) और टेक्सचर-नाम ड्रिफ्ट की पूरी सूची अंग्रेज़ी और जापानी पूर्ण संस्करणों (§82 और §80) में है।

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

## इंजन डिफ़ॉल्ट प्रकाश व यथार्थ गुंजाइश



इंजन डिफ़ॉल्ट प्रकाश केवल "गुणन" है, स्पेक्युलर, फ्रेनेल, उष्ण-शीत पृथक्करण, अर्धगोल परिवेश मौजूद नहीं। पुनर्निर्माण योग्य सीमा:

| कार्य | डिफ़ॉल्ट | पैक में संभव? |
|---|---|---|
| विसरित (Lambert) | केवल दिशात्मक अदिश योग | ◎ `bloxdSunDirection()` से स्वयं कार्यान्वित (आवरण स्रोत आदि) |
| स्पेक्युलर (दर्पण परावर्तन) | कुछ नहीं | ◎ Blinn-Phong (R9.2) |
| फ्रेनेल | कुछ नहीं | ◎ Schlick सन्निकटन (R9.3) |
| उष्ण मशाल / शीत आकाशप्रकाश पृथक्करण | अवर्ण | ◎ (R9.1) |
| अर्धगोल परिवेश | अदिश | ◎ ऊपर=आकाश वर्ण / नीचे=भूमि प्रतिक्षेप (R9.4) |
| तान मानचित्रण | नहीं (केवल clamp) | ◎ ACES फ़िल्मिक (R9.5) |
| वायुमंडलीय परिप्रेक्ष्य | केवल फ़ॉग (रंग प्रतिस्थापन) | ◎ दूरी विसंतृप्ति (R9.6) |
| पृष्ठ विवरण | केवल टेक्सचर विभेदन | △ हैश शोर प्रक्रियात्मक सूक्ष्म उभार (R9.8) |
| शीर्ष तरंग (जलपृष्ठ) | कुछ नहीं (समतल) | ◎ केवल allow (R7) |
| तरंग अभिलंब / सूर्य चमक | कुछ नहीं | ◎ (R9.7) |
| रात्रि चंद्रप्रकाश निरूपण | केवल आकाशवर्ण अंधेरा | △ चंद्र दिशा `-bloxdSunDirection()` में: छद्म अभिव्यक्ति (R2 नीला परिवेश / R9.11) संग दिशात्मक चांदनी (R-A, केवल दिन-रात चक्र) |
| छाया (आकाश अवरोध) | केवल `mix(परिवेश वर्ण, आकाश वर्ण, skyLight)` हल्का मिश्रण | ◎ लिफ्ट व्युत्क्रम + देहली कट + सूर्य गेट (R9.12)। वृक्ष छाया, छज्जा नीचे स्पष्ट अवनमन, ब्लॉक संपादन वास्तविक-समय अनुगमन |

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

## जल प्राकृतिक दिखाने वाली जल समेकित रेसिपी



यह API दृश्य वर्ण नमूना नहीं ले सकता, अतः **फ्रेनेल पवन वर्ण मिश्रण व सूर्य झलक छद्म अभिव्यक्ति है, वास्तविक परावर्तन/अपवर्तन नहीं** (जल गहराई परिकलन v2 `bloxdOpaqueBehind()` से संभव होकर [भाग VIII](../history/v2.md) R-E में पृथक)। नीचे आधार वर्ण रखते हुए, छिछले दृष्टिकोण निकट-आकाश वर्ण मिलाकर, केवल सूर्य रहते छोटी चमक जोड़ने का नमूना है।

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

समायोजन संदर्भ:

- जल श्वेत/अति उजला: `fresnel * 0.38` का `0.38` व चमक `0.55` घटाएँ।
- जल अति सघन: `fakeSkyReflection` मिश्रण अनुपात थोड़ा बढ़ाएँ। पर अधिक प्लास्टिक जैसा।
- जलपृष्ठ रेखा व नियमित धारी दिखे: तरंग आवृत्ति व चमक तीव्रता घटाएँ। इस कोड में जलपृष्ठ जाल शीर्ष विस्थापन नहीं।
- वास्तविक दृश्य प्रतिबिंब चाहिए: इस API निवेश में परदा वर्ण नहीं, केवल वर्ण मिश्रण से सत्य परावर्तन नहीं (गहराई तरल सीमित उपलब्ध। [भाग VIII](../history/v2.md) R-E)।

यह रेसिपी **विद्यमान `bloxdLiquidLight` प्रतिस्थापित** करती है। R9.7 समनाम तरंग अभिलंब फ़ंक्शन व अन्य समनाम हुकों से दुहरा चिपकाएँ नहीं।


### शेडर पैकों सहित जलांत सत्य



जलांत दृश्य 3 परतों का है:

| परत | सामग्री | पैकों से प्रचाल्य? |
|---|---|---|
| ① टेरेन/तरल रेंडर | हुक निरूप्य। Light हुक जलांत में सामान्यतः बुलाए जाते हैं | हाँ ("आवरण नीचे" कार्य करता है) |
| ② तरल परिभाषा आवरण | कैमरा तरल खंड परिभाषा color/alpha का emissive पूर्ण-परदा quad, हुक पाइपलाइन बाहर (सबसे आगे) चित्रित। खेल सेटिंग `cameraTint` हो तो वही जीतती है | नहीं (न वर्ण न सघनता बदल सकते) |
| ③ cameraTint | खेल सेटिंग | नहीं |

व्यावहारिक बिंदु: पैक जलांत में भी चलते रहते हैं / आवरण हटता नहीं / जलांत में शाखा नहीं होती (fogStart / fogEnd / fogColour जलांत में अपरिवर्तित अतः fogVisibility भी संसूचित नहीं करता)।

---

## रात्रि "छाया काली फलक उजला" सुधारें



केवल छाया दबाने से, सूर्य अनुपस्थिति में इंजन पूर्ण रंग (`engineColour`) अब भी उजला रहता है, फलक-छाया अंतर अप्राकृतिक दिखता है। पूर्ण रंग समग्र क्षय लगाकर उत्तर दें।

नीचे उदाहरण `bloxdSunDirection()` शून्य रात्रि निर्णय, दिशायुक्त दिन निर्णय मान, रात्रि टेरेन पूर्ण रंग क्षय करता है। `blockLight` व `heldLight` प्रबल स्थल क्षय घटाकर, मशाल आदि निकट प्रकाश यथासंभव रखें। `0.52` समायोज्य मान है, अधिक अंधेरा चाहिए तो घटाएँ।

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
    // पूर्ण रंग क्षय, सामग्री emission डिफ़ॉल्ट अनुसार फ़ॉग सहित योग
    out.colour = l.engineColour * scale + s.emission * (1.0 - l.fogAlpha);
    return out;
}
```

**इस निरूपण की सीमा:** यदि `bloxdSunDirection()` "सूर्य=इकाई दिशा, नहीं=शून्य" द्विमान हो, दिन-रात पृथक् संभव पर संध्या क्षीण सतत अनुमान असंभव। और पूर्ण रंग क्षय से, इंजन दिन-प्रकाश व परिवेश एक साथ क्षीण होते हैं, पूर्ण कालपट्टी पुनरुत्पादन नहीं। तरल भी वही निरूपण चाहिए तो तरल हुक वापसी संबंध जाँचें।

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

## यथार्थवाद कार्यान्वयन पंथ —— दो



**पंथ A: योगात्मक संशोधन (defaultLight आरंभ)** —— `engineColour` (पूर्ण रंग) आधार मान, उष्ण दीप्ति व रिम प्रकाश जोड़ें। हल्का व सुरक्षित, पर प्रकाश प्रतिरूप डिफ़ॉल्ट ही रहता है।

**पंथ B: पूर्ण पुनःप्रकाशन (s.colour आरंभ)** —— `l.engineColour` त्यागकर, `s.colour` (एल्बिडो) व LightIn कच्ची सामग्री से प्रकाश पुनर्गठित करें। यथार्थवाद का प्रामाणिक मार्ग। 4 नियम मानें:

1. **फ़ॉग पुनः लगाएँ**: light हुक फ़ॉग के बाद चलता है, स्वयं `mix(l.fogColour, col, (1.0 - l.fogAlpha))` लगाएँ (R9.10)। घने फ़ॉग में `min(l.fogAlpha, 0.70)` निम्नसीमा रखें। उल्टा engineColour-आधारित पैकों में और फ़ॉग रंग मिलाने से श्वेत द्वि-फ़ॉग बनता है
2. **अप्रकाशित वेरिएंट वापसी**: `#ifdef BLOXD_LIGHTING` के बाहर सीधे `defaultLight` लौटाएँ
3. **साझा फ़ंक्शन समग्र रक्षा**: `BloxdLightIn` पैरामीटर वाले साझा फ़ंक्शन पूरे fn सहित `#ifdef BLOXD_LIGHTING` में लपेटें (केवल कॉल-स्थल अपर्याप्त)
4. **सूर्य दिशा अनुपस्थिति पर**: `bloxdSunDirection()` शून्य हो तो दिशात्मक स्पेक्युलर न गिनें। `l.directional` प्रकाश-मात्रा अदिश है, दिशा सदिश नहीं; झलक दिशा पुनः प्राप्त नहीं होती। आवश्यक हो तो अदिशात्मक मंद परिवेश पर जाएँ। चंद्र दिशा `-bloxdSunDirection()` से उपलब्ध (केवल दिन-रात चक्र दुनियाओं में गतिशील। [भाग VII](../internals/) R-A)

---

## अप्राप्य रूप (यथार्थवाद की "छत")



| रूप | कारण |
|---|---|
| पिक्सेल-सटीक छाया मानचित्र (सूर्य संग घूमती छाया, उपच्छाया) | गहराई टेक्सचर संदर्भ असंभव (तरल सीमित `bloxdOpaqueBehind()` केवल ज्यामिति सूचना, शैडो मानचित्र में अप्रयोज्य)। किरण अवरोध निर्णय हुकों में निवेश नहीं |
| SSAO | दृश्य गहराई अगम्य (केवल जाल सेकी वर्टेक्स AO। तरल सीमित गहराई SSAO में अप्रयोज्य) |
| SSR (परावर्तन) | दृश्य वर्ण अप्राप्य। केवल फ्रेनेल मिश्रित आकाश वर्ण छद्म |
| ब्लूम / चकाचौंध | पश्च-प्रक्रमण में हुक नहीं |
| क्षेत्र गहराई, वर्ण विपथन, दाना | पूर्ण-परदा पश्च-प्रक्रमण आवश्यक |
| आयतन प्रकाश (god rays) | वही |
| PBR टेक्सचर | टेक्सचर पठन निषिद्ध। केवल वर्ण चमक छद्म अनुमान |
| जलांत अपवर्तन | दृश्य वर्ण अप्राप्य। तरल सीमित गहराई (`bloxdOpaqueBehind()`) से मोटाई अवशोषण व तल प्रक्षेपण संभव ([भाग VIII](../history/v2.md) R-E) |
| जलांत आवरण (नीला रंगत) हटाव / बदलाव | आवरण "कैमरा तरल खंड परिभाषा color/alpha" जनित emissive पूर्ण-परदा quad है, हुक पाइपलाइन बाहर (सबसे आगे) चित्रित, अतः पैक न वर्ण न सघनता बदल सकता |
| जलांत सीधा संसूचन | कैमरा निमज्जन दर्शाने वाला निवेश नहीं, जलांत में fogStart / fogEnd / fogColour अपरिवर्तित अतः fogVisibility आदि से अनुमान की विश्वसनीय विधि भी नहीं |

### छाया का सत्य —— "वृक्ष छाया" बनती है

ऊपर तालिका में असंभव केवल **सूर्य संग घूमते पिक्सेल-सटीक छाया मानचित्र** हैं। इंजन आरंभ से "छाया" गिन रहा है, वही `skyLight` है। जाल-पक्ष LightEngine माइनक्राफ्ट-ढंग कलनविधि चलाता है:

1. **स्तंभ क्रमवीक्षण**: हर (x,z) स्तंभ ऊपर से नीचे क्रम देखें। आकाश आगमन 15 से आरंभ, **अपारदर्शी ब्लॉक पर 0**, बाद `lightFilter` (वायु 1 / जल 3 / अपारदर्शी 15) अनुसार क्षीण उतरता है
2. **BFS बाढ़**: 6 पड़ोस पाश्व प्रसार (हर खंड -1) —— यही किनारा कोमलता का सत्य है। त्रिज्या r अवरोध नीचे कच्चा मान (15-r)/15 होता है
3. blockLight (मशाल आदि) RGB 3 प्रणाली (4bit संवेष्टन) का अन्य BFS है

अतः `l.skyLight` मात्र चमक प्राचल नहीं, **"उस जगह से आकाश दिखता है" का वोक्सेल विभेदन अवरोध डेटा = छाया मानचित्र** है। वृक्ष नीचे, छज्जा नीचे, भीतर अंकतः पहले से निम्न, शीर्ष अंतर्वेशन चिकना पहुँचता है। रखने/तोड़ने पर ब्लॉक तत्काल पुनर्गणना = **वास्तविक-समय अनुगामी छाया**। मूल केवल `mix(परिवेश वर्ण, आकाश वर्ण, skyLight)` "हल्का मिश्रण" प्रयोग करता है।

सही उपकरण R9.12 के दो चरण हैं (**लिफ्ट व्युत्क्रम से कच्चा मान पुनः प्राप्त → देहली `smoothstep` द्विमानीकरण**। `th = 1 - r/15` सीधे "छाया मानने वाला अवरोध त्रिज्या" डायल करता है) साथ **सूर्य सीधी धूप sky गेट सहित** (सूर्य केवल आकाश दिखने वाली जगह पहुँचता है = प्रक्षेपण सार), धूप=उष्ण वर्ण / छाया=शीत वर्ण रंगरोगन रचना सहित।

**सच्ची सीमा कथन**: यह छाया "ऊपरी आकाश" आधार अतः **सूर्य गति से घूमती नहीं**। विभेदन खंड स्तर (कोमल किनारा BFS प्रसार से)। इंजन प्रकाश साँचे में बंद `var shadow: f32 = 1.;` छाया मानचित्र ठूँठ अब भी अवशिष्ट है (सदा 1.0 = अमान्य), "योजित पिक्सेल-सटीक घूर्णी छाया" अवशेष व्याख्येय। पिक्सेल-सटीक घूर्णी छाया ही चाहिए तो API बाह्य मार्ग शेष (जैसे userscript GLSL अंतःक्षेप, नियम जोखिम सहित)।

### जलांत सत्य

जलांत दृश्य 3 परतों का है:

| परत | सामग्री | पैकों से प्रचाल्य? |
|---|---|---|
| ① टेरेन/तरल रेंडर | हुक निरूप्य। Light हुक जलांत में सामान्यतः बुलाए जाते हैं | हाँ ("आवरण नीचे" कार्य करता है) |
| ② तरल परिभाषा आवरण | कैमरा तरल खंड परिभाषा color/alpha का emissive पूर्ण-परदा quad, हुक पाइपलाइन बाहर (सबसे आगे) चित्रित। खेल सेटिंग `cameraTint` हो तो वही जीतती है | नहीं (न वर्ण न सघनता बदल सकते) |
| ③ cameraTint | खेल सेटिंग | नहीं |

व्यावहारिक बिंदु: पैक जलांत में भी चलते रहते हैं / आवरण हटता नहीं / जलांत में शाखा नहीं होती (fogStart / fogEnd / fogColour जलांत में अपरिवर्तित अतः fogVisibility भी संसूचित नहीं करता)।

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

## वास्तविक-मशीन परीक्षण सूची



कंपाइल सफलता व "सुंदर" अलग बातें हैं। क्रम से जाँचें:

1. **लोडिंग:** `pack.json` ZIP मूल में हो। चयन के तुरंत बाद `Ready. Reload the page to use it.` दिखता है और **पेज पुनः लोड करने पर सक्रिय** होता है। पुनः लोड के बाद `Ready to use` की पुष्टि करें। सहेजा गया पैक, इंजन-पक्षीय शीर्षक बदलने पर अगली पेज लोड पर हेडर सामग्री फ़िंगरप्रिंट मिलान से स्वतः पुनः सत्यापित होता है (पास हो तो वैसे ही सक्रिय / फेल हो तो blocked दिखता है)। पुराना पैक टूटा रहकर चुपचाप सक्रिय नहीं रहता।
2. **6 वेरिएंट:** strict / allow, प्रकाश चालू / बंद, टेरेन / तरल हर शर्त प्रकार रक्षक चूक न हो। खेल भले आंशिक शर्त प्रयोग करे, वितरण पैक 8 मानकर चले।
3. **दिन:** घास, पत्थर, बालू, लकड़ी आदि सामग्री वर्ण अनतिबहि, शीर्ष व पार्श्व प्रकाश-छाया संक्रमण प्राकृतिक हो।
4. **रात:** सूर्यप्रकाश स्थल सम सामग्री, छाया, मशाल समीप तुलना करें। केवल प्रदीप्त फलक शेष तो अनावृति क्षय, समग्र अंधेरा तो स्थानीय प्रकाश रक्षा समायोजित करें।
5. **जल:** ठीक ऊपर, छिछला दृष्टिकोण, तट, जलांत, रात अलग-अलग देखें। alpha व्यवहार व जलांत दृश्य खेल संश्लेषण विधि निर्भर, एकल दृष्टिकोण निर्णय न करें। जलांत में [भाग VII](../internals/) के अनुसार तरल परिभाषा रंग का आवरण सबसे आगे ढकता है, अतः पैक होने/न होने का अंतर मुख्यतः पृष्ठ व आवरण पार टेरेन में देखें।
6. **सीमा व दूर:** खंड/मूल संक्रमण पर तरंग पैटर्न उछलता न हो, दूर द्वि-फ़ॉग व श्वेत धुंध न हो।
7. **प्रदर्शन:** प्रति-फ्रैगमेंट हैश/त्रिकोणमिति/`pow` भारी प्रभाव न्यूनतम रखें। विवरण धीरे-धीरे जोड़कर FPS तुलना करें।

### ज्ञात निर्बंध आधार मानकर

- पैक टेरेन/तरल हुक सीमित, एक ही कोड आकाश, एंटिटी व UI निरूपण नहीं।
- छाया मानचित्र जोड़ने, परदा-स्थान परावर्तन, अपवर्तन, ब्लूम आदि निवेश नहीं (दृश्य गहराई तरल सीमित `bloxdOpaqueBehind()` रूप में खुली। [भाग VIII](../history/v2.md) देखें)।
- `bloxdSeconds()` एनिमेशन काल है, खेल दिन-रात संबंध गारंटी नहीं।
- `bloxdSunDirection()` शून्य तो सत्य चंद्र दिशा अज्ञात, वातावरण सन्निकटन "चंद्र भौतिकी" नहीं। दिशात्मक चांदनी `-bloxdSunDirection()` से बनती है (केवल दिन-रात चक्र दुनियाएँ। [भाग VII](../internals/) R-A)।
- `s.position` / `l.position` स्थानीय निर्देशांक, विश्व निर्भर प्रभाव हेतु `bloxdRenderOffset()` जोड़ें। खंड भीतर स्थानीय पैटर्न हेतु सचेत स्थानीय निर्देशांक प्रयोग करें।

---

## शेडर सीमा आने पर संयोजन



शेडर-पैक पक्ष में टेक्सचर जोड़ने/सैंपल करने की सीमा है, अतः सामग्री की बारीक बनावट या आकाश का चित्र बदलना हो तो केवल शेडर से हल करने का प्रयास न करें। Bloxd.io हेतु सार्वजनिक टेक्सचर-पैक रिपॉज़िटरी [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) में टेक्सचर, skybox, मॉडल आदि संभालने की भिन्न विधियों के उदाहरण हैं। यह शेडर-पैक API का आधिकारिक विनिर्देश नहीं, बल्कि भिन्न सिस्टम के संसाधन-उदाहरण के रूप में देखें।

संदर्भ हेतु, समुदाय में "cinematic shader" के रूप में प्रचलित वितरण का विश्लेषण-उदाहरण: भीतर टेक्सचर पैक था (128x128 टेक्सचर, `pack.json` / `.wgsl` बिना)। "छाया-युक्त शेडर जैसा" रूप अधिकतर टेक्सचर-पक्ष की कारीगरी है; शेडर-पैक से प्रकाश व छाया अलग-अलग बनाने (R9.12) की दिशा और टेक्सचर-पक्ष की पूर्ति मिलाकर चलना व्यावहारिक है।

वास्तविकता में, **प्रकाश व वर्ण शेडर से समायोजित कर, सामग्री व आकाश अनुरूप संसाधन पैक से पूरा** करना उत्तम है। पर सहप्रयोग संभावना व पठन क्रम खेल कार्यान्वयन व सेटिंग अनुसार जाँचें।

टेक्सचर-पैक पक्ष का भी विनिर्देश है (संदर्भ): आकार-सीमा base64 रूपांतरण के बाद JSON स्ट्रिंग लंबाई में 25MB है, और PNG का base64 +33% फैलता है, अतः कच्चे चित्रों का कुल ~18-19MB व्यावहारिक सीमा है। CSS सरल regex विश्लेषण से संभाला जाता है, अतः नेस्टिंग या टिप्पणियाँ न लिखें।

---

## दोषमार्जन युक्तियाँ



- गुफा अधिक उजली → `skyLight` अरैखिक वक्र अभाव (R2 गुफा रेसिपी / R9.9)
- दिन अधिक अनावृत → ACES पूर्व अनावृति घटाएँ
- रात अदृश्य अंधेरी → न्यून परिवेश सुनिश्चित करें (रात्रि `skyLightColour` आधारतः निकट-काला)
- दूर धुंध अधिक → वायुमंडल गुणांक घटाएँ
- मशाल चारों ओर नारंगी → उष्ण मिश्रण अनुपात घटाएँ (कच्चा रंजित प्रकाश अंश रखें)
- खंड लगभग पूर्णतः श्वेत → light हुक निर्गम योग 1.0 अधिक (अनुप्रवाह clamp नहीं)। अंत में `clamp(col, vec3f(0.0), vec3f(1.0))` लगाएँ
- योग बिना श्वेत → fogVisibility विभाजन un-fog व्युत्क्रमण कारण। un-fog हटाएँ; पुनर्निर्माण `s.colour` आधार, फ़ॉग अंत में एक बार `mix`
- उत्सर्जक खंड नहीं चमकते → पुनर्निर्माण क्रम में emission पुनर्योग चूक। `+ s.emission * (1.0 - l.fogAlpha)` जोड़ें
- रात केवल प्रदीप्त फलक शेष → केवल छाया न दबाएँ, पूर्ण रंग (`engineColour`) समग्र रात्रि क्षय लगाएँ। स्थानीय दीये रखें तो `blockLight` / `heldLight` से क्षय घटाएँ (छठा भाग 19)
- `pow(skyLight, γ)` कितना भी छाया सघन नहीं → `l.skyLight` लिफ्ट बाद मान (अध्याय 10)। R9.12 व्युत्क्रम + देहली कट पर जाएँ
- छाया क्षेत्र/सघनता समायोजन चाहिए → R9.12 समायोजन मार्ग देखें (क्षेत्र=देहली `shTh` / किनारा=`shSoft` / छाया क्रोड अंधेरा=न्यून परिवेश व आकाश प्रकीर्ण प्रकाश दो-बिंदु विचलन)

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

## रंग रेसिपी (surface)



### एकल रंगत (सबसे बुनियादी)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### संतृप्ति बढ़त / घटाव

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 से चमकीला / -1.0 पूर्ण मोनोक्रोम
```

### वर्ण तापमान (गर्म ⇄ ठंडा)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = गर्म (लाल प्रबल), -1.0 = ठंडा (नीला प्रबल)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### विंटेज / सेपिया

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### ऊँचाई प्रवणता (निचली भूमि गर्म)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // ऊँचाई 0..50 पर 1..0
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### फलक अभिविन्यास से रंगना (ऊपर=उजला, दीवार=गाढ़ा)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // फ़र्श 1 / दीवार 0 / छत -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // दीवार थोड़ी गाढ़ी, छत भी गाढ़ी
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### पोस्टराइज़ेशन (रंग संख्या घटाना)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

---

## प्रकाश रेसिपी (light)



### कंट्रास्ट S वक्र

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### दूरी धुंध (स्वनिर्मित फ़ॉग)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 64 ब्लॉक से 192 ब्लॉक पर 0..0.35 स्वनिर्मित फ़ॉग जोड़ना
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### रात (skyLight नीला झुकाव + दीया रक्षा)

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

### गुफा अंधेरा (skyLight-हीन और गाढ़ा)

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

> `skyLight` लिफ्ट बाद का मान है (अध्याय 10), हल्का अवरोध (पेड़ नीचे: कच्चा 0.87 → लिफ्ट बाद 0.97) इस विधि से लगभग गाढ़ा नहीं होता। गुफा (कच्चा 0) पर असर करता है। "वनछाया" स्पष्ट चाहिए तो R9.12 लिफ्ट व्युत्क्रम + देहली विधि प्रयोग करें।

### रात का नीला परिवेश (चंद्र दिशा बिना छद्म अभिव्यक्ति)

> इस API में सूर्यहीन आकाश का `bloxdSunDirection()` शून्य है। नीचे दिशात्मक चांदनी नहीं, मात्र अंधेरे आकाश में क्षीण नीला परिवेश। चंद्र दिशा स्वयं `-bloxdSunDirection()` से उपलब्ध (केवल दिन-रात चक्र दुनियाएँ। [भाग VII](../internals/) R-A)।

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

### संध्या ताप (सूर्य ऊँचाई से रंग झुकाव)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // क्षितिज 1 / ठीक ऊपर 0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### इंजन निर्गम पूर्ण प्रतिस्थापन (सरलतम पुनःप्रकाशन)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    if (bloxdLit()) {
        // ※ BloxdLight(...) सीधा निर्माण निषिद्ध। default से बनाकर colour बदलें
        var out = bloxdDefaultLight(s, l);
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let level = clamp(sky * 0.7 + block, 0.0, 1.0);
        // engineColour (इंजन प्रकाश परिणाम) त्यागकर 「सामग्री रंग × स्वयं संगणित चमक」 रखें
        var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));   // engineColour छोड़ा, अतः फ़ॉग पुनः लगाएँ (आवश्यक)
        out.colour = col + s.emission * (1.0 - l.fogAlpha);   // emission भी स्वयं जोड़ें (आवश्यक)
        return out;
} else {
        return bloxdDefaultLight(s, l);
}
}
```

---

## उत्सर्जन रेसिपी (emission)



> `emission` प्रकाश गणना बाद जुड़ता है, पर डिफ़ॉल्ट प्रक्रिया **`fogVisibility` से क्षीण करती है। पूर्णतः धुंधली दूरी में उत्सर्जन भी लुप्त होता है। दूर भी चमकाने घटक emission में न जोड़ें, light हुक भीतर `out.colour += ...` सीधे जोड़ें** (engineColour फ़ॉग लगा हुआ अतः दूर धुंध वर्ण ऊपर प्रकाश चढ़ता है)

### दीया स्पंदन (मशाल श्वास)

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

### प्रदीप्त अयस्क भाव (उजली सामग्री चमके)

```wgsl
// surface पक्ष: सामग्री जितनी उजली (श्वेत) emission उतना चढ़ाएँ
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### जुगनू समूह भाव (काल से अंतरिक्ष तैरते प्रकाश बिंदु)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // कुछ 「प्रकाश गोल」 धीमे तैरते हैं। दूरी व्युत्क्रम से चमकाएँ
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

## निर्देशांक रेसिपी (विश्व/ब्लॉक/दृष्टि)



### विश्व निर्देशांक

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### ब्लॉक निर्देशांक (आधिकारिक रेसिपी — शीर्ष टिप्पणी उद्गम)

```wgsl
let worldBlock = vec3i(floor(bloxdWorldPosition(l.position)));
```

### शतरंजी (ब्लॉक इकाई)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 या 1
out.colour *= mix(0.96, 1.04, checker);
```

### ब्लॉक इकाई छद्म यादृच्छिक (हैश)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// उपयोग: घास रंग भिन्नता, पत्थर रंग धब्बा आदि
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### दृष्टि सदिश व रिमप्रकाश

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### दृष्टि कोण (फ्रेनेल भाव — तरल हेतु)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // ठीक ऊपर से 1 / छिछला कोण 0
let fresnel = pow(1.0 - facing, 3.0);
```

---

## काल रेसिपी (एनिमेशन)



> `bloxdSeconds()` हर 3600 सेकंड (1 घंटा) लपेटता है। शेडर बीता काल है, खेल के सूर्य·दिन-रात समन्वय की गारंटी नहीं। दिखावटी आवर्त एनिमेशन प्रयोज्य, वास्तविक रात निर्णय में `bloxdSunDirection()` व प्रकाश निवेश को प्राथमिकता दें।

### दिन-रात चक्र (1 घंटे में 1 दिन)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdSeconds() * 6.2831853 / 3600.0);   // 0..1 एक घंटा आवर्त। खेल के दिन-रात समन्वय की गारंटी नहीं
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### डोलन (बहु sin अध्यारोपण)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### बहती पट्टी अरोरा / प्रतिदीप्त पट्टी

```wgsl
// XZ स्थिति व काल से 3 रंग मिलाएँ
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

---

## तरल रेसिपी



### जलपृष्ठ लहर (रंग झिलमिल)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdRenderOffset().x);
    let worldZ = s.position.z + f32(bloxdRenderOffset().z);
    let ripple = sin(bloxdSeconds() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid सदा BLOXD_ALPHA — गार्ड आदतन
    #endif
    return out;
}
```

### ऊँचाई छद्म पारदर्शिता (सच्चा छिछला निर्णय नहीं)

> v1 में दृश्य गहराई व जलतल स्थिति संदर्भ असंभव था, अतः इस API भर से वास्तविक जल गहराई परिकलित नहीं हो सकती थी। v2 में तरल सीमित `bloxdOpaqueBehind()` से पीछे अपारदर्शी फलक तक मोटाई मापी जा सकती है ([भाग VIII](../history/v2.md) R-E)। नीचे इसका प्रयोग न करने वाला पुराना छद्म प्रदर्शन है, `s.position.y` स्थानीय निर्देशांक, अतः ज्यों का त्यों प्रयोग से खंड मूल विचलन से प्रभाव हटता है। विश्व ऊँचाई प्रयोग करनी हो तो `bloxdWorldPosition()` से रूपांतरित करें। नीचे केवल विश्व ऊँचाई से alpha बदलने का छद्म प्रदर्शन, तटरेखा व जलतल अनुरूप छिछला अभिव्यक्ति नहीं। `packWaterReferenceY` विश्व ऊँचाई अनुरूप समायोजित करें।

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // निम्न ऊँचाई पतला, उच्च ऊँचाई मूल alpha निकट। खेल में दिशा जाँचें।
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### जलांदर से देखा जल धुंध

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### केवल-तरल पैक (टेरेन अक्षत रचना)

```wgsl
// terrain_* हुक बिल्कुल न लिखें। तब:
//  - terrain वेरिएंट = हुकहीन = टेरेन इंजन मूल ज्यों का त्यों
//  - liquid वेरिएंट  = केवल liquid_* हुक प्रभावी
```

---

## वर्टेक्स रेसिपी (केवल allow)



> सब `#ifndef BLOXD_STRICT` से लपेटें।
> सटीक शर्तों (allow शीर्षक सूची; Custom Games strict है) के लिए §30 देखें: [§30 गेम-अनुसार अनुप्रयोग मोड](../internals/)

### घास पवन दोलन (शीर्ष ही हिलाएँ)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdSeconds() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // लंब फलक ही
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### द्रव पृष्ठ तरंग (शीर्ष फलक ही)

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

### स्पंदित टेरेन

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdSeconds() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // अभिलंब दिशा में हल्का फैलाव-सिकुड़न
    return out;
}
#endif
```

### लहराता टेरेन (विशाल sin तरंग)

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

## गणित छोटी युक्ति संग्रह



```wgsl
// 0..1 मसृण श्रेणीकरण (n श्रेणी)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 2-स्तरीय देहली (टून छाया)
let shadow = smoothstep(0.35, 0.37, level);   // देहली ±0.02 से सीढ़ी बनती है

// 3-स्तरीय टून
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// लूमा (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// मसृण स्पंदन
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// त्रिभुज तरंग (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// सेकंड → "धीमी कला" रूपांतरण (3600 सेकंड लपेटन अनदेखा करने वाले इफ़ेक्ट हेतु)
let phase = t * 0.15;
```

---

## यथार्थवादी रेसिपी



> "वैनिला रूप सामग्री से पुनर्गठन" भौतिक रेसिपी संग्रह। आधार शर्तें:
>
> 1. **light हुक फ्रैगमेंट अंतिम चरण में बुलाया जाता है**। लौटाया colour ज्यों का त्यों अंतिम रंग। **स्वयं फ़ॉग दोबारा लगाना आवश्यक** (R9.10)  
> 2. **इंजन मूल प्रकाश केवल गुणन** है। स्पेक्युलर / फ्रेनेल / उष्ण-शीत पृथक्करण / अर्धगोल परिवेश शून्य से बनाएँ  
> 3. `l.engineColour` पूर्ण रंग (फ़ॉग लगा हुआ) है। त्यागकर `s.colour` (एल्बिडो) से पुनर्गठन ही प्रामाणिक मार्ग है  
> 4. टेक्सचर निषिद्ध → विवरण सब **प्रक्रियात्मक** (हैश/शोर) डालें (R9.8)

### R9.1 उष्ण मशाल × शीत आकाशप्रकाश

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
        let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
        let voxel   = max(torch, sky);
        var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // मध्यवर्ती clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                    // फ़ॉग पुनः लगाएँ
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                 // emission पुनः जोड़ें
}
    return out;
}
```

### R9.2 सूर्य स्पेक्युलर (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);          // अर्ध सदिश
            let ndh = max(dot(n, h), 0.0);
            let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
            let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
            out.colour += spec * vec3f(1.0, 0.97, 0.90);
        }
}
    return out;
}
```

### R9.3 Schlick फ्रेनेल

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
        out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // किनारे की हल्की चमक
}
    return out;
}
```

### R9.4 अर्धगोल परिवेश (ऊपर=आकाश / नीचे=भूमि उछाल)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let upness = n.y * 0.5 + 0.5;
        let ground = l.ambientLightColour * 0.55;                          // नीचे: उछाल
        let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // ऊपर: आकाशप्रकाश
        let hemi = vec3f(0.25) + mix(ground, skyH, upness);
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // मध्यवर्ती clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                           // फ़ॉग पुनः लगाएँ
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                        // emission पुनः जोड़ें
}
    return out;
}
```

### R9.5 ACES फ़िल्मिक (Narkowicz सन्निकटन)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = अनावृति
    return out;
}
```

### R9.6 वायुमंडलीय परिप्रेक्ष्य (दूरी से संतृप्ति गिरने की 「हवा भावना」)

> ध्यान: धुंध वर्ण पर चमक बढ़ाने वाली प्रक्रिया (`normalize` आदि) लगाने से गाढ़े दृश्य में "चमकीली श्वेत धुंध" तैरती है,  
> और engineColour (फ़ॉग-युक्त) में फिर धुंध वर्ण जोड़ने से दोहरा फ़ॉग श्वेत कर देता है। **वायु भावना केवल संतृप्ति घटाकर** दिखाना सुरक्षित है।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // दूरी क्षय (100blk≈30%/400blk≈75%)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // संतृप्ति ही घटाएँ (चमक अपरिवर्तित)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 तरंग अभिलंब + सूर्य चमक (जल पर 「सूर्य मार्ग」)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // ऊँचाई h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
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

### R9.8 प्रक्रियात्मक सूक्ष्म उभार (टेक्सचर निषेध चकमा)

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
        let local = fract(l.position - l.normal * 0.5);   // ब्लॉक भीतर स्थानीय निर्देशांक
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

### R9.9 गुफा अरैखिक अंधेरा + दीया रक्षा

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let keep = 0.12 + 0.88 * blockInt;          // दीये वाली जगह उठाएँ
        out.colour *= mix(keep, 1.0, sky * sky);     // अंधेरा अरैखिक (वर्ग)
}
    return out;
}
```

### R9.10 फ़ॉग पुनः लगाना (engineColour त्याग पर आवश्यक)

> `(1.0 - l.fogAlpha)` को `min(l.fogAlpha, 0.75)` निम्नसीमा सहित प्रयोग से "इससे सघन नहीं" समायोजन बनता है  
> (0.0 = इंजन अनुरूप / 0.3–0.5 = दूर स्पष्ट)।  
> ध्यान रहे इंजन फ़ॉग क्षितिज समर्पित linear फ़ॉग (आरेखन दूरी समीप ही) है, मध्य दूरी धुंध पैक पक्ष बनाएँ।
> वास्तविक फ़ॉग सेटिंग (कार्यान्वयन मिलान अद्यतित): linear स्थिर / `fogStart` = आरेखन खंड दूरी / `fogEnd` = +1 खंड / फ़ॉग बंद सेटिंग में 100–101 खंड व्यावहारिक अमान्य / डिफ़ॉल्ट फ़ॉग वर्ण RGB(183, 191, 195)।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = s.colour * (voxel * 1.1 + vec3f(0.05));
        col = clamp(col, vec3f(0.0), vec3f(1.0));
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));  // फ़ॉग पुनरुत्पादन (0.15=हल्की निम्नसीमा)
        col += s.emission * (1.0 - l.fogAlpha);            // emission भी फ़ॉग सहित
        out.colour = col;
}
    return out;
}
```

### R9.11 सिनेमा-ग्रेड (छाया शीत / हाइलाइट उष्ण / रात विसंतृप्त)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let lum = pack_luma(out.colour);
        out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;  // सूर्य दिशा शून्य पर ही रात। संध्या सतत परिवर्तन अभिव्यक्त नहीं
        out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
}
    return out;
}
```

### R9.12 प्रक्षेपण छाया —— लिफ्ट व्युत्क्रम + देहली कट (निर्णायक)

> **आधार पुनःपुष्टि (अध्याय 10)**: `l.skyLight` कच्चा voxel मान (n/15) नहीं, बल्कि इंजन "लिफ्ट वक्र"  
> `y = 1-(1-x/(3-2x))³` (अंधेरी जगह उठाने वाला S वक्र) पार करने के बाद का मान।
>
> | स्थान | voxel कच्चा | लिफ्ट बाद (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | खुला आकाश | 1.00 | 1.00 | 1.00 |  
> | पेड़ नीचे (त्रिज्या2) | 0.87 | **0.97** | **0.86** ← लगभग अक्षत |  
> | त्रिज्या3 | 0.80 | **0.92** | 0.66 |  
> | त्रिज्या5 | 0.67 | 0.78 | 0.29 |
>
> **यही "गामा उठाकर भी छाया सघन नहीं" का सिद्ध कारण** है (संख्यात्मक प्रमाण)। पर वक्र एकदिष्ट है अतः बीजीय कठोर व्युत्क्रमण संभव:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`। कच्चा मान पुनः प्राप्त कर, बाद **देहली कट** (`smoothstep`) से द्विमानीकरण मात्र।  
> LightEngine BFS पाश्व प्रसार "सन्निकट 1 ब्लॉक = -1" अतः देहली `th = 1 - r/15` सीधे  
> "r ब्लॉक व अधिक अवरोध छाया मानो" डायल बनता है। ब्लॉक तोड़ते ही छाया चलती है (LightEngine वास्तविक-समय पुनर्गणना)।  
> सीमा: छाया "ऊपरी आकाश" आधार अतः सूर्य गति से घूमती नहीं (अध्याय 15 "छाया का सत्य")।

```wgsl
// ★इंजन लिफ्ट कठोर व्युत्क्रमण, कच्चा voxel skyLight (n/15) पुनः प्राप्त
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // WGSL में cbrt नहीं अतः pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // ★छाया त्रिज्या डायल: th = 1 - r/15 (0.87→त्रिज्या2 व अधिक छाया)
const shSoft = 0.04;   // किनारा कोमलता (0.02=कठोर / 0.08=कोमल)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // 1. कच्चा मान पुनः प्राप्त (छूटा तो कभी छाया नहीं)
        let skyRaw = sh_unlift(l.skyLight);
        // 2. देहली कट — धूप=1 / छाया=0 निश्चयपूर्वक पृथक् करें
        let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
        // सूर्य Lambert (सूर्य न होने पर l.directional पर फॉलबैक)
        let sunLen = length(bloxdSunDirection());
        let sunL = select(clamp(l.directional, 0.0, 1.0),
                          clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                          sunLen > 0.5);
        // ★प्रक्षेपण सार: सूर्य सीधी धूप "आकाश दिखने वाली जगह" पर ही पहुँचती है
        let lit = sunL * sky;
        // छायापक्ष: काला नहीं, आकाश-रंजित + न्यून परिवेश
        let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
        var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
        // मशाल प्रकाश छाया भेदता है (blockLight भी लिफ्ट बाद अतः साथ पुनः प्राप्त)
        let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                             sh_unlift(l.blockLight.g),
                             sh_unlift(l.blockLight.b));
        let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
        col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
        // फ़ॉग पुनः लगाएँ (engineColour त्याग अंश)
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));
        out.colour = clamp(col + s.emission * (1.0 - l.fogAlpha), vec3f(0.0), vec3f(1.0));   // emission भी न भूलें (फ़ॉग-युक्त में जोड़ें)
}
    return out;
}
```

> समायोजन मार्गदर्शिका: **छाया क्षेत्रफल `shTh` ही निर्धारित** — `0.93`=त्रिज्या1.5 ऊपर / `0.87`=त्रिज्या2 / `0.80`=त्रिज्या3 / `0.67`=त्रिज्या5।  
> छाया किनारा कठोरता `shSoft` (0.02=कठोर / 0.08=कोमल)। छाया क्रोड अंधेरा `0.09` (न्यूनतम परिवेश) व `0.16` (आकाश प्रकीर्ण प्रकाश)  
> 2-बिंदु स्थानांतरण से तय होता है। संध्या में छाया फैलानी हो तो  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` जोड़ें (लंबी संध्या छाया सन्निकटन।  
> `sunDir` यानी `bloxdSunDirection() / length(bloxdSunDirection())`)। छाया नीलापन हेतु `vec3f(0.72, 0.82, 1.05)` का B बढ़ाएँ।

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

## पाइपलाइन विवरण



- **surface हुक alphaTest "पूर्व" चलते हैं**: `out.alpha` सीधे त्याग परीक्षण खिलाता है। कटआउट सामग्री (घास, पत्ते) dither-ढंग विलयन प्रभाव अनुमति (रेसिपी R-C)। तरलों (मिश्रण) में `out.alpha` वास्तविक पारदर्शिता है (रेसिपी R-D)। सामान्य अपारदर्शी टेरेन पर प्रभाव नहीं — भ्रमित न हों
- **`l.ambient` सामग्री** `material.ambient × sceneAmbient` है, सामग्री अनुसार भिन्न। दृश्य पक्ष ग्राफिक सेटिंग "Ambient Lighting Intensity" (डिफ़ॉल्ट 0.5) बाँधता है — नियत डिफ़ॉल्ट कभी न प्रोग्राम करें
- **दृश्य की दिशात्मक रोशनी 2 लैंपों की बनी है**: मुख्य लैंप (दिशा आकाश सेटिंग के सूर्य-स्थान से, तीव्रता 1.0) और फ़िल लैंप (दिशा `[-0.5, -1, -1]`, तीव्रता 0.35) का Lambert योग `l.directional` तक पहुँचता है। फ़िल लैंप की दिशा नीचे है, अतः ऊपरी सतह पर योगदान नहीं देता, नीचे मुख वाली सतहों (गुफा की छत आदि) को उठाता है। टेरेन केवल `_initScene` में जोड़े गए लैंप गिनता है; शुरू होने के बाद दृश्य में जोड़े गए लैंप टेरेन व खंड-मॉडल से अनदेखे रहते हैं (आधिकारिक चेतावनी पाठ मौजूद है)
- **`bloxdSeconds()` का वास्तविक रूप `performance.now()` है**: `time() { return performance.now() / 1e3 % 3600 }` — ब्राउज़र के चालू होने से बीता समय, जो 1 घंटे पर लौटता है। खेल के दिन-रात या दुनिया के बीते समय से कोई संबंध नहीं। खेल घड़ी से समकालिक एनिमेशन हेतु दिन-रात चक्र वाली दुनिया में `bloxdSunDirection()` के दिगंश से अनुमान लगाना व्यावहारिक है
- **हेडर फ़ंक्शनों का आधार एक ही uniform है**: इंजन `@group(3) @binding(0)` पर 64 बाइट uniform (time / originOffset / sunDirection / eyePosition के 4 स्लॉट, little-endian) रखता है, और `bloxdSeconds()`, `bloxdRenderOffset()`, `bloxdSunDirection()`, `bloxdEyePosition()` उन्हीं स्लॉट के पठन हैं। `originOffset` वर्तमान बिल्ड में सदा `[0, 0, 0]` है (फ़्लोटिंग-पॉइंट विश्व निर्देशांक हेतु आरक्षित स्लॉट)। पैक इस uniform को बदल नहीं सकता, और पैक व इंजन की WGSL एक ही मॉड्यूल में मिलाई जाती है, अतः वही group/binding स्वयं घोषित करना भी संभव नहीं। (v3 में दो स्लॉट बदले — `seconds` / `renderOffset`; फ़ंक्शन अब `bloxdSeconds()` / `bloxdRenderOffset()` हैं — और `@group(3) @binding(1)` पर दृश्य-गहराई texture जोड़ा गया; [भाग IX](../history/v3.md) §41 व §51 देखें।)
- **शीर्ष डेटा मेशर (Web Worker) बनाता है**: खंड टेरेन को प्रति शीर्ष 28 बाइट (atlas सहित 32 बाइट) इंटरलीव्ड रूप में सजाता है — स्थिति = float32×3 / अभिलंब = 8bit signed int×4 / रंग = 8bit अर्ध-पूर्णांक×4 (`s.colour` का वास्तविक रूप — tint × AO मेशर चरण में ही 8bit में पकाए जाते हैं, पैक से अलग करना/पुनः प्राप्त करना सैद्धांतिक रूप से असंभव) / UV = float32×2 / atlasIndex = float32। केवल लाइट-लेवल अलग 4 बाइट शीर्ष बफ़र में चलते हैं ([भाग VII](../internals/) §26 · [भाग II](../api/) §11)। शीर्ष चंक-इकाई instancing से खींचे जाते हैं
- लोड के समय खंड सीमाओं पर दिखने वाला महीन चेकर पैटर्न इंजन का परदा-अंतरिक्ष Bayer 4×4 dither खंड फ़ेड है, पैक बग नहीं (ग्राफिक सेटिंग में `chunkFadeIn` बंद करने पर अक्षम हो जाता है)
- **`mod` आरक्षित शब्द है**: `pack.wgsl:3 'mod' is a reserved word in WGSL.` से अस्वीकृत। शेष `%` ऑपरेटर से लिखें

### R-C. Bayer dither विलयन — out.alpha त्याग नियंत्रित करता है

इंजन खंड फ़ेड प्रयुक्त **वही Bayer 4×4 तालिका** पुनरुत्पादित कर, निचले खंडों से cutout विलीन करता है। discard alphaTest सामग्री (घास, पत्ते) में छूटता है; तरलों में मिश्रण पारदर्शिता है।

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod आरक्षित है: `%` ऑपरेटर प्रयोग करें
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
    // निचले खंडों से विलीन होता है; अधिक dissolve टिका रहता है
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. जल निकट-कैमरा फ़ेड — तरल alpha दृष्टि स्पष्ट रखता है

तरल हुक `out.alpha` मिश्रण सीधे खिलाता है। कैमरा ठीक नीचे पृष्ठ ही पतला करके, गोता/जलोपरि कैमरा दृष्टि सुनिश्चित करने की रेसिपी।

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 खंड पूर्ण पारदर्शी से सामान्य
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

## blockLight / heldLight आंतरिक



`blockLight` RGB 3 प्रणालियों का **रंगीन प्रकाश** है। प्रत्येक प्रकाश-स्रोत खंड हेतु उत्सर्जन वर्ण `[R, G, B]` (प्रत्येक 0-15) परिभाषित है, जो सीधे प्रकाश वर्ण बनता है (सामान्य मशाल = उष्ण श्वेत (14,14,12) / लावा = नारंगी (14,8,2) / बीकन = सियान (5,14,14) / श्वेत मशाल = (15,15,15) आदि)। शीर्ष चरण में यह एक float गुण में r / g / b / sky के 4 निबल रूप में पैक होकर आता है। लाइट हुक में तीनों प्रणालियाँ अलग संभालकर रंगीन स्थानीय प्रकाश बनाया जा सकता है — उष्ण मशाल रेसिपी (R9.1) का आधार यही व्यवहार है।

`aPackedLightLevels` विकोडन पर इंजन हर प्रणाली **उज्ज्वलतम RGB प्रणाली के 35% का फ़र्श** बिछाता है। जैसे "शुद्ध लाल प्रकाश" शीर्षों में (1.00, 0.35, 0) उठकर अंतर्वेशन·लिफ्ट चढ़ता है। मशाल नारंगी खेल में "लाल से अधिक श्वेत-गुलाबी" दिखना यहीं से है — उष्ण मशाल रेसिपी (R9.1) संतृप्ति इस डिफ़ॉल्ट विरुद्ध समायोजित करें।

प्रकाश संयोजन योगात्मक नहीं है। इंजन भीतर 35% फ़र्श वाले खंड-प्रकाश और `mix(परिवेश वर्ण, आकाश वर्ण, skyLight)` से बने आकाश-प्रकाश का **max** लेता है, फिर हस्त प्रकाश (परिवेश-बूस्ट के बाद) को और max से जोड़ता है। इस संयोजन में प्रयुक्त प्रणाली मान **लिफ्ट-बाद** हैं — इंजन उन्हीं उठे हुए प्रकाश स्तरों से संयोजन करता है जो हुक इनपुट तक पहुँचते हैं (`terrainLightLevels`, लिफ्ट वक्र के बाद), v2 और v3 दोनों में। अतः `blockLight` और `skyLight` एक-दूसरे को नहीं काटते, गाढ़े पक्ष का योगदान छोड़ दिया जाता है — आकाश-प्रकाश घटाने पर भी जहाँ खंड-प्रकाश प्रबल है वहाँ लगभग अंधेरा नहीं होता। एक्सपोज़र व क्षय रेसिपी इसी संरचना पर बनाएँ ([भाग VI](../guides/) §19 की स्थानीय-प्रकाश रक्षा इसी संरचना की भरपाई है)।

हस्त प्रकाश (`heldLight`) परास उज्ज्वलतम प्रकाश वर्ण अनुसार (अधिकतम 15 खंड) `dist^0.75` पूर्व-प्रक्रमण सहित, वही 35% प्रणाली फ़र्श, व `l.heldLight` परिवेश-बूस्ट **पूर्व** मान है। शंकु क्षय, इंजन के प्रकाश मॉड्यूल से बहाल: किरण का कोणीय क्षीणन `1 − 0.5 × (smoothstep(0.12, 0.65, t) + smoothstep(0.62, 0.95, t))` है, जहाँ `t` शंकु अक्ष से प्रसामान्यीकृत कोण है (0 = केंद्र, 1 = किनारा); पहुँच `(rangeOverride > 0 ? rangeOverride : उज्ज्वलतम चैनल) × शंकु क्षय` है, जिसमें `rangeOverride` हस्त-प्रकाश वर्ण के alpha से पढ़ा जाता है; पहुँच के भीतर override `(range − dist) / range` से क्षीण करता है, जबकि डिफ़ॉल्ट (पूर्व-प्रक्रमित) दूरी को प्रणाली-दर-प्रणाली घटाता है; फिर 35% फ़र्श, 15 से विभाजन, लिफ्ट वक्र, और अंत में परिवेश-बूस्ट आता है। अनुकूलित मद `spotlightRange` व शंकु कोण स्थिर कर सकते हैं — "पकड़े रहते किरण" विधा जिसकी शंकु कैमरा अनुगमन करती है। पैक किरण दिशा जान नहीं सकते।

अनुकूलित खंड `skyLightEmission` (0–15) रख सकते हैं, जो **blockLight BFS से अलग skyLight प्रणाली स्वयं अंतःक्षेपित** करता है। R9.12-ढंग पैक सूर्य/छाया skyLight देहली निर्णय कृत्रिम प्रकाशों से उठे skyLight दुनियाओं में चूक सकते हैं। वितरण पैक blockLight संयोजन निर्णय अधिक सुदृढ़ करते हैं।

---

## फ़ॉग आंतरिक



फ़ॉग परिकलन सदा LINEAR विधा (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` सहित (D = फ़ॉग सेटिंग; केवल D = 0 विशेष fogEnd = 5 सहित)। **प्रवणता पट्टी केवल 32 खंड चौड़ी** है, व `(1.0 - l.fogAlpha)` "दूरी धुंध" से कम **लोडेड दुनिया किनारे तक प्रसामान्यीकृत दूरी** है। खिलाड़ी अनुसार लोड दूरी बदलती है, अतः दूरी प्रभाव स्वयं `distance(l.position, bloxdEyePosition())` गिनें (रेसिपी R-B)। (v3 नोट: रेंडरर का फ़ॉग फ़ंक्शन वास्तव में **चार** मोड लागू करता है — बंद / चरघातांकी / चरघातांकी-वर्ग / रैखिक — और जारी खेल रैखिक मोड चलाते हैं; पुनः प्राप्त स्रोत और टिकाऊपन का तर्क [भाग IX](../history/v3.md) §50 में है।)

डिफ़ॉल्ट फ़ॉग वर्ण `rgb(183, 191, 195)` (हल्का नील-धूसर)। दुनिया रचयिता `fogColourOverride` (hex) से बदल सकते हैं। फ़ॉग विधा 0 (NONE) पर **fogColour काला आता है** (`fogColour = select(vec3f(0.0), uniforms.vFogColor, ...)`). `mix(l.fogColour, col, (1.0 - l.fogAlpha))` का मानक रूप सुरक्षित है क्योंकि fogVisibility 1 पर फ़ॉग वर्ण अप्रयुक्त रहता है। स्क्रिप्ट API में `fogChunkDistanceOverride` व `fogOnSkybox` विकल्प भी हैं, कस्टम खेल फ़ॉग दूरी (D के बराबर) व स्काईबॉक्स पर फ़ॉग लगाना अलग-अलग सेट कर सकते हैं। डिफ़ॉल्ट में स्काईबॉक्स फ़ॉग से प्रभावित नहीं (`fogOnSkybox` सक्रिय खेलों में ही स्काईबॉक्स भी फ़ॉग वर्ण में रंगता है)।

खिलाड़ी-पक्ष `showFog` बंद करने पर फ़ॉग 3200–3232 खंड की सीमा में धकेल दिया जाता है और व्यावहारिक रूप से अमान्य हो जाता है (fogVisibility ≈ 1 बना रहता है)।

### R-B. लोड-सीमा पट्टी — fogVisibility "दुनिया किनारा" रूप में

लोड-सीमा के निकट की 32-खंड पट्टी को शांत ठंडे रंग में संसाधित करके दुनिया का किनारा अलग से दिखाई नहीं देता। दूरी को अलग से गिने बिना खिलाड़ी की लोड-दूरी सेटिंग का स्वतः अनुसरण होना ही इसका लाभ है।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = भीतर (किनारे तक गुंजाइश), 0 = किनारे बाहर निकलने वाला
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

## पैक दृश्य मान बदलने वाली चीज़ें — परीक्षण सूची



वही पैक **दुनिया व खिलाड़ी सेटिंग के अनुसार `l.*` की सामग्री बदलने** से अलग दिखता है। वितरण से पहले कम से कम इन 3 परिवेशों में रूप देखें:

1. **सामान्य दुनिया** (डिफ़ॉल्ट आकाशपेटी, ओवरराइड नहीं) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, डिफ़ॉल्ट वर्ण
2. **अंतरिक्ष आकाशपेटी दुनिया** — bloxdSunDirection() = 0। `sunPresent` शाखा रूप
3. **अनुकूलित दुनिया `visionMinLightColour` / `skyLightColourOverride` सहित** — उठे अंधेरे व वर्ण

मुख्य भिन्नता स्रोत: `lightingOverride` (बलात् प्रकाश) / `skyLightColourOverride`, `ambientLightColourOverride` (hex अदला-बदली) / `visionMinLightColour` ("दिखने वाला सबसे गाढ़ा वर्ण" — कार्यान्वयन `uSkyLightColour` और `uAmbientLightColour` दोनों पर घटक-वार max; Night Vision प्रयोग करता है — "गुफा घोर अंधेरी" पैक सोचा अंधेरा नहीं करते, आकाश का रंग भी ऊपर उठता है) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (bloxdSunDirection() विद्यमानता)। `uSkyLightColour` डिफ़ॉल्ट = (1,1,1) श्वेत, `uAmbientLightColour` डिफ़ॉल्ट = (0.25,0.25,0.30)। `l.ambient` दृश्य पक्ष = ग्राफिक सेटिंग "Ambient Lighting Intensity" (डिफ़ॉल्ट 0.5)। `(1.0 - l.fogAlpha)` खिलाड़ी फ़ॉग/चंक दूरी सेटिंग का अनुगमन करता है। साथ ही `cameraTint` (पूरे परदे पर RGBA टिंट) और `proximityFadeDistance`, `proximityFadeMinOpacity` (इकाई का कैमरा-निकट फ़ेड) भी दुनिया-सेटिंग से बदलने वाले कारक हैं, विशेषकर `cameraTint` पैक आउटपुट के ऊपर लगने वाली अंतिम प्रक्रिया है। इनमें से अनेक स्क्रिप्ट API (`serverOption`) से भी सेट हो सकते हैं और खेल चलते समय भी बदल सकते हैं।

---

## गेम-अनुसार अनुप्रयोग मोड (`shaderPackPolicy`)



यहाँ §7 की `allow / strict` अवधारणा का शीर्षक-स्तरीय अर्थ निश्चित किया जाता है। केवल वही शीर्षक, जिनकी गेम-परिभाषा में स्पष्ट रूप से `shaderPackPolicy: "allow"` है, पूर्ण मोड (vertex हुक, `discard`, टेरेन `alpha`) में चलते हैं; बिना निर्दिष्ट शीर्षक (या allow के अतिरिक्त मान) strict होते हैं — `BLOXD_STRICT` परिभाषित होता है और गार्ड में लिखा कोड स्वतः निष्क्रिय हो जाता है। यह निर्णय पैके के पक्ष से नहीं चुना जा सकता; अतः किस शीर्षक में क्या चलता है, यह जान लेना वितरण की पूर्वशर्त है।

- संदर्भ-बिल्ड: `szby6g.main.94a7596c.js` (2026-10-17 का प्रोडक्शन-डिप्लॉय)। सभी 111 गेम-परिभाषाओं का स्थैतिक विश्लेषण — परिणाम: **allow 26 प्रविष्टियाँ (12 शीर्षक) / strict 85 प्रविष्टियाँ**। वही 12 allow लिटरल उन्हीं 12 शीर्षकों में v3 प्रोडक्शन बंडल (`3ymzdd`, 2026-10-20) पर अपरिवर्तित पुनः पुष्ट हुए — नीचे की सूची v3 में शब्दशः लागू रहती है।
- `shaderPackPolicy` से भी ऊपर वितरण-चैनल पक्ष का गेट (`canUseShaderPacks` के समान) है; बाहरी पोर्टल से वितरण (Coolmath Games संस्करण आदि) में `shaderPackPolicy` के निर्णय से पहले ही शेडर-पैक तंत्र निष्क्रिय हो सकता है। नीचे का allow / strict वर्गीकरण bloxd.io मूल Web संस्करण के विश्लेषण पर आधारित है।
- allow 12 स्थानों पर घोषित है: गेम-परिभाषाओं में सीधे लिखे गए 8 स्थान और आधार-चर (`tb` / `kz` / `cb` / `Fb`) के 4 स्थान; वेरिएंट्स स्प्रेड विरासत (`{...tb,...}`) से इसे ग्रहण करते हैं। वेरिएंट-स्तरीय अलग ओवरराइड (पिता-allow / पुत्र-strict की उलटी रूपरेखा) अभी कोई नहीं।

12 allow शीर्षक (कुल 26 प्रविष्टियाँ):

- **Test Gym** — मुख्य + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (कुल 11 प्रविष्टियाँ)
- **Doodle Cube** — मुख्य + Solos / Duos (कुल 3)
- **Rocket Obby** — मुख्य + Sheep / January (कुल 3)
- **9 एकल शीर्षक**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

strict पक्ष में विशेष रूप से भ्रामक बिंदु:

- **Superflat Creative (classic_creativeFlat) strict है**। नाम में "Creative" है, पर classic परिवार में allow केवल साधारण Creative (`classic_creative`) है। Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns आदि भी सब strict
- **Custom Games (customGames) strict है**। स्वनिर्मित कस्टम गेम में vertex हुक-धारा के प्रभाव सक्रिय नहीं होते। सत्यापन कार्य के लिए Test Gym ही भरोसेमंद विकल्प है
- bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) जैसे प्रमुख PvP व सर्वर शीर्षक सब strict

इसके अलावा strict शीर्षकों में भी पैक का लोड व कंपाइल होता रहता है, और surface / light जैसी फ़्रैगमेंट-पक्ष की रेसिपी सामान्य रूप से चलती हैं। प्रतिबंध केवल vertex हुक (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard` और टेरेन `alpha` पर हैं (तरल में हमेशा मौजूद)।

यह सूची उपरोक्त बिल्ड के स्थैतिक विश्लेषण का परिणाम है; इंजन-अपडेट से allow/strict का वितरण बदल सकता है। नया संस्करण आने पर पुनः जाँचें।

---

## सूर्य व चंद्रमा अभिज्ञान



`bloxdSunDirection()` स्रोत केवल आकाशपेटी प्रकार बदलने पर पुनर्लिखित सूर्य दिशा बफर है — कसौटी "आकाश में सूर्य है" नहीं, **"आकाशपेटी पृथ्वी प्रकार है"** है।

| आकाशपेटी | `bloxdSunDirection()` |
|---|---|
| `default` (प्रक्रियात्मक आकाश) | अशून्य (डिफ़ॉल्ट नीचे) |
| `gloomy` / `interstellar` / `space_*` (घन टेक्सचर) | **सदा (0,0,0)** |

**चंद्रमा सदा `-bloxdSunDirection()` में है** (इंजन चंद्र स्थिति सूर्य के ठीक विपरीत गिनता है)। रात्रि सूर्य ऊँचाई से जाँची जाती है — `bloxdSunDirection().y < 0` (सूर्य क्षितिज नीचे) पर चंद्रमा ऊपर है। पर डिफ़ॉल्ट दुनियाओं में सूर्य स्थिर, अतः चंद्रमा भी स्थिर — गतिशील चंद्रमा केवल दिन-रात चक्र दुनियाओं में दिखता है।

डिफ़ॉल्ट दुनिया सूर्य दिशा लगभग `(-0.56, 0.81, -0.18)` (inclination = −0.2 / azimuth = 0.55 से संगणित इकाई सदिश, स्थिर)। वितरण पैक परीक्षण में झलक दिशाएँ कागज़ पर भविष्यवाणी का व्यावहारिक संदर्भ मान।

दिन-रात चक्र इंजन में अंतर्निहित नहीं — inclination स्थिर अंक है, गतिशील दिन वाली दुनियाएँ खेल पक्ष अद्यतित करती हैं। हर अद्यतन पर `bloxdSunDirection()` भी पुनर्लिखित अनुगमन करता है।

टेरेन दिशात्मक प्रकाश दृश्य आरंभ निर्मित केवल 2 दीप हैं, **दिशा व तीव्रता स्थिर, दिन-रात अपरिवर्तित**। संक्षेप में **टेरेन चमक का कोई घटक काल निर्भर नहीं। दिन-रात "रूप" केवल आकाशपेटी व bloxdSunDirection() से आते हैं**, अतः रात्रि अवनमन पैकों को समय-पट्टी स्वयं bloxdSunDirection() से अनुमान करनी चाहिए (§19 `sunPresent` तकनीक)।

### R-A. दिशात्मक चांदनी — moonDir = −bloxdSunDirection()

चंद्रमा ऊपर रहते ही नील-श्वेत Lambert व मंद स्पेक्युलर जोड़ता है। `moonUp` डिफ़ॉल्ट स्थिर-सूर्य दुनियाओं में 0 है, वहाँ कुछ नहीं होता — **केवल दिन-रात चक्र दुनियाओं में छूटने वाली सुरक्षित चांदनी**।

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // चंद्रमा सदा सूर्य के ठीक विपरीत; दिन में moonDir.y < 0 से स्वतः बुझता है
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

## दोषमार्जन साधन



- URL पैरामीटर `?renderer=lite` — Lite (WebGPU) रेंडरर बलात् (`webgl2` / `babylon` भी; `babylon` webgl2 का पुराना नाम है)। प्राथमिकता क्रम: URL पैरामीटर > localStorage का `bloxdRenderer` > सेटिंग्स स्क्रीन > डिफ़ॉल्ट (webgl2)। अमान्य मान चेतावनी सहित अनदेखे होते हैं। URL या localStorage में ओवरराइड बचा रहने पर WebGPU (lite) आवश्यक स्थिति में विफलता आती है और "needs the new WebGPU renderer, so remove the renderer override..." दिख सकता है ([भाग V](../troubleshooting/) §17)
- URL प्राचल `?vconsole` — परदा अंतः कंसोल (VConsole)। सचल वास्तविक-मशीन सत्यापन में काम का
- URL पैरामीटर `?drawcalls=1` — ड्रॉ-सांख्यिकी डिबग पैनल जुड़ता है। डिबग कंसोल से गेम-ऑब्जेक्ट चुनकर, या `drawCalls()`, `why()`, `configureDrawCallWatching()` से, पैक ही नहीं बल्कि बड़े गिमिक्स का दोहरा ड्रॉ (ओवरड्रॉ) और प्रति ड्रॉ लगभग 65 हज़ार शीर्ष की सीमा तक पहुँच जाँचकर प्रदर्शन-कमी का कारण अलग कर सकते हैं
- कंसोल `noa-engine v0.33.0` व `Renderer: lite from <स्रोत>` दिखाता है — रेंडर पथ अपनिदान बचने पहले इन्हें देखें
- WebGPU रेंडरर पैक सहित "बलात् चालू" तालाबंद होता है। "Disable Block Texture Atlas" सेटिंग भी तालाबंद (Atlas चालू रहता है), व WebGPU बिना परिवेश पैक बिल्कुल लागू नहीं होता। वितरण पृष्ठों पर "WebGPU ब्राउज़र आवश्यक" लिखने का आधार
- खंड टेक्सचर का वास्तविक रूप 2D array texture (`texture_2d_array`) है, टेरेन का सैंपलर nearest और repeat पर सेट है। साथ ही मेशर समान सामग्री, AO व लाइट वाले फलकों को एक आयत में मिलाता है (**greedy meshing**), अतः मर्ज किए फलकों पर शीर्ष UV टाइल-चौड़ाई से आगे जा सकता है (किनारे पर 0.0015 का इनसेट)। दोहराव हार्डवेयर का repeat addressing संभालता है, इसलिए मर्ज फलक बिना सीम के दिखते हैं। पर `vUV` के आधार पर प्रक्रियात्मक विवरण ऊपर रखने से मर्ज फलक की सीमा पर असंतति आ सकती है, अतः विश्व स्थिति (`s.position` + `bloxdRenderOffset()`) के आधार पर रचना करना सुरक्षित है
- खेल प्रवेश रनटाइम पुनः सत्यापन (`checkCompilation`) ब्राउज़र WebGPU में वास्तविक टेरेन सामग्री संकलित करता है (सेटिंग परदा स्थैतिक सत्यापन से कठोर)। यहाँ गिरने वाले पैक उस खेल से वर्जित होते हैं

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
