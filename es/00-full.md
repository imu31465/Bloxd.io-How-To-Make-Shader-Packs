<!-- Auto-generated from the 6-category structure. Edit individual pages instead. -->

## Documentación de shader packs de Bloxd.io

Una guía no oficial sobre shader packs para el renderizador WebGPU de Bloxd.io — desde la creación, implementación, validación y distribución hasta la especificación de la API y la investigación de las interioridades del motor.

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


## Parte VIII: Guía de migración a API Version 2


Build objetivo: `6qxffk.main.5912a15f.js` (despliegue en producción a 2026-10-16). Las Partes I–VII de esta guía ya están reescritas a la base v2; esta Parte VIII recoge los puntos de migración desde v1 y las novedades de v2. Los ejemplos de código de novedades pasan la validación de 8/8 variantes en el compilador v2 y la validación del compilador WGSL del navegador (Tint) (§38), pero la conversión v2 de recetas existentes es sustitución mecánica de identificadores — verifica siempre con compilación en juego antes de distribuir.

### 31. Destino de los paquetes v1 (conclusión primero)

El juego exige que el `apiVersion` del manifiesto **coincida estrictamente con 2**. Cargar un paquete v1 se rechaza con `This pack is for shader pack API version 1. Bloxd supports version 2.` (clave i18n `shaderPack:loadWrongApiVersion`). **No hay soporte paralelo v1/v2**. El motor también re-verifica el `validation.headerVersion` de paquetes guardados (hash del texto completo de la cabecera): el mecanismo que marca paquetes guardados "a re-verificar" en actualizaciones del motor es igual que en v1.

### 32. Renombrado total de identificadores (tabla de correspondencia)

v2 unifica el nombrado con guiones bajos a camelCase. **Los nombres viejos son totalmente inutilizables.**

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
| `bloxd_packInputs` (uniform interno) | `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) |

Los tipos de hook (vertex / surface / light × terrain / liquid, 6 en total) y el formato `pack.json` (`apiVersion` / `name` / `author`) no cambian. Los límites del cargador tampoco (zip 32MB / 1024 entradas / 256 archivos `.wgsl` / 256KB total / 64KB manifiesto).

### 33. Destino de los campos eliminados

En v1, `time` / `eyePosition` / `sunDirection` / `originOffset` eran campos de structs. En v2 **esos campos se eliminan; en su lugar se usan funciones de cabecera que leen el uniform del motor (`bloxdPackInputs`)**. Como las funciones leen el uniform directamente, **pueden llamarse desde funciones de ámbito de módulo fuera de los hooks y desde hooks vertex**.

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` para conversión a coordenadas de mundo | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

### 34. Novedad ①: `blockId` (sombreado por bloque)

Los tres structs `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` ganan `blockId: u32`. Es el **ID del bloque dueño** (0–65535), uniforme en toda la cara (pasado con `@interpolate(flat)`). Úsalo para identificar tipos de bloque sin depender del color de textura. Pero la tabla ID-tipo vive dentro del motor y es invisible desde paquetes: **qué ID es qué bloque se puede medir en el mundo o consultar en la referencia de abajo**. Internamente este ID viaja cocinado en el alfa del color de vértice (8 bits bajos) y en la w de la normal (8 bits altos) — 16 bits en total, de ahí el tope de 65535. El sistema blockId en sí se activa solo mientras existe un paquete de sombreadores activo (sin paquete los cables guardan sus objetivos de relleno, pero dentro de las definiciones de struct de la Parte II esta diferencia es inobservable).

**Referencia**: el autor publica una lista de entradas del juego en [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (`entries.json`: tabla id ↔ nombre de bloque; las variantes de rotación/meta como `Furnace|meta|rot2` figuran como IDs separados). Las correspondencias pueden cambiar con las actualizaciones del juego; lo definitivo se confirma en el juego real.

Ejemplos de bloques comunes (de entries.json a fecha de 2026-10-18; solo las familias de terreno de id bajo):

| ID | Nombre de bloque | ID | Nombre de bloque |
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

entries.json también lista ítems que no son bloques (herramientas etc.), pero solo los ids de familia de bloque llegan a los hooks de terreno / líquido.

#### R-F. Tinte por tipo de bloque vía blockId

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // p. ej. inclina ids pétreos (patrón de bits altos) al frío
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

#### R-G. Medir blockId en el mundo — el pack de plano de bits

Receta de debug para consultar en el mundo los ids de bloques ausentes de la tabla de correspondencias. Cambia la constante `plane` inicial por `0, 1, 2, …` mientras lees el color de la cara del bloque que quieres identificar.

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

El color de la cara codifica 3 bits de blockId directamente como RGB (negro = 0 / rojo = 1 / verde = 2 / amarillo = 3 / azul = 4 / magenta = 5 / cian = 6 / blanco = 7). Una observación lee un dígito octal. Si p0 → p3 leen 3, 2, 7, 2, el octal 2723 = 1491 leído desde el dígito superior es el id (Lava). Las familias de terreno de id bajo se completan con dos observaciones (p0, p1). Usa solo el hook surface, así que corre también en títulos strict.

#### R-H. Hacer ondear solo las hojas — acotar el hook vertex por blockId

La receta de viento R7 ([Parte III](../recipes/)) ondea todo el terreno, pero el hook vertex también puede leer `blockId`, así que se puede acotar el objetivo a bloques de hoja. La lista de ids y el array WGSL (medidos a fecha de 2026-10-18; 22 variedades — Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / variantes con fruta / Autumn Aspen):

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// los hooks vertex se auto-desactivan en títulos strict (ver sección 36)
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
        // el desplazamiento es una función suave de la posición en el mundo. Los vértices compartidos que apuntan
        // al mismo punto del mundo se mueven igual, así que las caras nunca se desgarran ([Parte III](../recipes/) R7 - mismo principio)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- La lista de ids crece con las actualizaciones del motor (solo durante la medición, un build nuevo añadió 50 clases de bloque). Para seguir usándola, consulta los añadidos vía [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) o mídelos con el display de plano de bits de R-G, y extiende el array
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) son esterillas de hoja no sólidas sobre el suelo. El ondeo las hace parecer que se despegan del suelo, con lo que excluirlas del array es una opción
- En títulos strict el hook vertex se desactiva en bloque, pero con la guardia de arriba el paquete simplemente "deja de ondear" — los efectos del lado fragment siguen funcionando

### 35. Novedad ②: `BLOXD_SCENE_DEPTH` y `bloxdOpaqueBehind()` (la principal)

El acceso a profundidad, estructuralmente imposible en v1, se desbloquea **solo para programas liquid**. Sin color, pero **la geometría — distancia y posición de la cara opaca trasera — está disponible**. El uso típico es calcular color de absorción desde el grosor de agua medido.

Reglas de uso:

| Uso | Resultado |
|---|---|
| Llamado sin guardia en `bloxdLiquidSurface` / `bloxdLiquidLight` | OK (siempre definido en variantes liquid) |
| Llamado sin guardia en `bloxdTerrainSurface` | ERROR. Envuelve con `#ifdef BLOXD_SCENE_DEPTH` |
| Llamado en hooks vertex | ERROR (solo hooks surface / light) |

Para usar profundidad también en hooks de terreno, envuelve con `#ifdef BLOXD_SCENE_DEPTH` (los hooks de terreno se reutilizan en programas liquid: la profundidad solo vive del lado liquid).

#### R-E. Absorción por grosor de agua (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // longitud de columna de agua = de aquí a la cara opaca trasera
        let thickness = distance(behind.position, surface.position);
        // absorción Beer-Lambert: el rojo cae rápido, el azul llega lejos
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // nada detrás = tinta hacia azul de agua profunda
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

Aplicaciones: absorción/dispersión por grosor, proyección de ondas tipo cáustica desde coordenadas de mundo del fondo vía `behind.position`, distinción cielo-oclusión con `found=false` para reflejo de cielo en agua, turbidez por etapas según profundidad. Si el pipeline de copia de profundidad no se construye, degrada con seguridad a "nada detrás". La preparación de la textura de profundidad se decide una sola vez, al crear el renderizador de la página, según "si el paquete activo lee profundidad" — así que **recarga siempre la página al usar un paquete que lea profundidad**. Si se pide profundidad con paquete activo pero la página no fue recargada, la consola muestra una advertencia única `…reads scene depth on a page that didn't turn it on` y la textura de profundidad se reemplaza por un fallback de 1×1, con lo que `bloxdOpaqueBehind()` devuelve siempre `found = false`.

### 36. Otros cambios de v2

- **Fallback de hooks**: los programas liquid usan el hook de terreno si `bloxdLiquidXxx` no está definido. **Los paquetes solo-terreno afectan al agua tal cual**. Define hooks del lado liquid explícitos si no lo quieres.
- **Sin guardias `BLOXD_LIGHTING` para campos**: `blockLight` etc. existen en todas las variantes, con defectos en unlit (0 / 1 / blanco / 0). Usa `#ifdef BLOXD_LIGHTING` solo para detectar iluminación. Mantener las guardias existentes no cambia nada.
- **Cambia la condición de `BLOXD_ALPHA`**: definido en variantes de terreno no estrictas y en todas las liquid, indefinido en strict × terrain. Mantén la guardia al escribir alpha en hooks de terreno.
- **Construcción directa de structs prohibida**: llamadas de constructor como `BloxdLight(...)` se rechazan en validación estática. Modifica siempre desde `bloxdDefault*` o usa una copia de la entrada.
- **`let _ =` pasa a `_ =`**: la asignación de descarte WGSL `_ = f();` vale, pero `let _ = f();` se rechaza.
- **offInStrict**: definir un hook vertex, o un `discard` alcanzable desde hooks surface / light, autodesactiva todo el paquete en juegos estrictos en vez de error (la UI muestra `shaderPack:offInStrict`; sigue corriendo en juegos allow). Envuelve hooks vertex y `discard` con `#ifndef BLOXD_STRICT`. Ojo: el propio mensaje de la UI oficial de ajustes instruye "envuelve lo restante con `#ifndef BLOXD_STRICT`" — esta práctica es recomendación oficial, no convención.
- **Extensiones de niebla**: modos LINEAR / EXP / EXP2 implementados, pero los ajustes del juego siguen siempre en LINEAR: las specs de niebla existentes siguen valiendo. La semántica de `fogColour` queda documentada oficialmente (negro solo en escenas sin niebla).
- **Sin cambios**: curva de realce, suelo de canal 35%, caída de heldLight (`pow(lightDist, 0.75)`) y boost ambiental, spec de direcciones sol/luna, color de niebla por defecto, wrap de tiempo (3600 s), luces direccionales (máx 4), solo Lite (WebGPU), mecanismo de guardado (IndexedDB), `mod` palabra reservada.

### 37. Lista de migración v1 → v2

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **Identificadores**: reemplaza todo según la tabla §32 (nombres de hook, structs, funciones default)
3. **Porte de campos eliminados**: a funciones de cabecera según la tabla §33 (`s.time` → `bloxdTime()` etc.)
4. **Renombra `fogFactor` → `fogVisibility`**
5. **Quita la construcción directa de structs**
6. **Corrige `let _ =` a `_ =`**
7. **Envuelve hooks vertex y discard con `#ifndef BLOXD_STRICT`**
8. **Confirma que el agua también siente los efectos de hooks de terreno**; define hooks liquid explícitos si no lo quieres
9. (Opcional) Gestiona niebla desde `litColour` / añade absorción por grosor con `bloxdOpaqueBehind()` / estilizado por bloque con `blockId`
10. **Valida también la segunda etapa (Tint del navegador)** — pon paréntesis en expresiones con `^` `&` `|` `<<` `>>` sobre todo. Hay código que pasa la validación estática y el navegador lo rechaza (§38)

### 38. Segunda etapa de validación — el compilador WGSL del navegador es más estricto que el analizador interno

La validación de paquetes en el juego tiene **2 etapas**. La primera etapa es la validación estática (analizador JS interno del motor. Revisa reglas propias de paquetes como firmas de hook, sintaxis prohibida, uso de sceneDepth), y la segunda etapa es la validación de navegador (compila stubs incluidos en el resultado de compilación con una implementación WebGPU real, remapeando errores a las líneas del archivo fuente del paquete para mostrarlos. El «Saved, but it won't run until you fix these errors» de la UI es esta etapa). Un sufijo como `(only in terrain)` al final de un error es «la clase de program de la variante donde ocurrió ese error».

El analizador interno no implementa las reglas de ligadura (Binding) de operadores de WGSL: **hasta el código que pasa la validación estática puede ser rechazado por el navegador**. La víctima típica es el patrón clásico del hash entero:

| Operador | Consecuencia |
|---|---|
| `<<` `>>` | Solo pueden ligarse directamente a nivel unario. `a + b << c` es error |
| `&` `^` `\|` | Solo pueden ligarse directamente a nivel unario. `a * b ^ c` es error |
| `&&` `\|\|` | No pueden mezclarse. `a && b \|\| c` es error |

#### Cómo poner paréntesis (NG / OK)

```wgsl
// NG — pasa la validación estática pero el navegador (Tint) lo rechaza:
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — pon paréntesis en cada multiplicación (una cadena del mismo operador A ^ B ^ C es legal por asociatividad izquierda)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

El código publicado en esta guía no contiene este patrón (la mezcla `+`/`*` de `pack_hash3` y `h ^ (h >> 16u)` ya van entre paréntesis, luego conformes). Cuando escribas un paquete, pasa la primera y la segunda etapa.

### 39. Sobre materiales independientemente similares

Existe un material comunitario de contenido casi igual: [Shader de GlitchHunterCoder/Bloxd-Essay](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader). Se publicó antes que esta guía, pero **el contenido de esta guía viene del análisis propio de glm sobre los archivos bundle reales de Bloxd (conjunto de chunks webpack) — no es copiar-pegar**. Ambos coinciden porque investigar independientemente la misma implementación lleva a las mismas conclusiones.

---

Investigado por ltf_ahel (investigado con glm)

---


## Parte IX: Guía de migración a API Version 3

> **Sustituida el 2026-10-26: la API actual es la versión 5** — los paquetes v3 se rechazan al cargar tal como se describe aquí para v2. Aplica esta parte *y después* la [Parte X](../history/v4.md) (v3 → v4: API de texturas, cambio de nombre a `fogAlpha`, `bloxdFragmentBlockPosition`, `hit`). Aplica también la [Parte XII](../history/v5.md) (v4 → v5).

Build objetivo: `3ymzdd.main.fae4743f.js` — **el build de producción activo desde el 2026-10-19**. El bundle que bloxd.io sirve en producción es idéntico byte a byte (verificado con md5, tanto el bundle principal como los chunks de paquetes de sombreadores) al despliegue de preproducción contra el que se investigó originalmente esta parte, así que todo lo que sigue se aplica a producción tal cual. El modelo de paquetes conserva su forma de v2 (mismos campos de `pack.json`, mismos límites del cargador, mismo diseño de uniform).

Las partes I–VII de esta guía siguen escritas sobre la base v2. Esta parte reúne, en el mismo orden que la [Parte VIII](../history/v2.md), los puntos de migración de v2 → v3 y las nuevas funciones de v3. La conversión es en su mayoría mecánica (§47), pero solo un cambio altera realmente el comportamiento — la luz predeterminada ahora atenúa la emisión con la niebla (§43) — y `blockId` se sustituye por completo por `blockFlags` (§42), así que verifica siempre con una compilación en el juego antes de distribuir.

Novedad en esta revisión: las secciones **§49–§54** van más allá de la migración y entran en interioridades del motor restauradas del build de producción — cómo invoca realmente el renderizador Lite tus hooks, la función de niebla real de cuatro modos, la implementación exacta de `bloxdOpaqueBehind()`, la ruta completa de entrega de blockFlags desde el registro del bloque hasta tu hook, y el pipeline de validación con su hash de cabecera medido. Son los hechos documentados públicamente más profundos sobre el sistema de paquetes hasta la fecha, y resuelven varias preguntas que otras guías todavía listan como abiertas.

### 40. Destino de los paquetes v2 (conclusión primero)

**Actualización 2026-10-19: v3 salió de preproducción y es ahora lo que sirve el sitio activo.** Todo paquete v2 guardado antes del despliegue — incluido todo paquete distribuido como v2 — falla ahora en producción exactamente como se describe abajo, así que la migración de §47 ya no es opcional para quien distribuya paquetes hoy.

El build exige que el `apiVersion` del manifiesto **coincida exactamente con 3**, y **no hay soporte paralelo de v2/v3**. Un paquete v2 se rechaza al cargar con los mensajes de «versión de API incorrecta» (claves i18n, texto de marcador):

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>

Los paquetes guardados conservan el ciclo de vida de v2 ([Parte VIII](../history/v2.md) §31): cada build hashea su cabecera del motor, las actualizaciones del motor marcan automáticamente los paquetes guardados como «necesita revisión», y un paquete guardado cuyo `apiVersion` sea cualquier versión distinta de la actual se marca como no ejecutable (con el mensaje de estado de arriba que apunta al reemplazo) en lugar de dar error.

### 41. pack.json y el búfer uniform (lo que no cambia)

- Los campos obligatorios del manifiesto no cambian: `{ apiVersion, name, author }`.
- Los límites del cargador no cambian: zip de 32 MB / 1024 entradas / 256 archivos `.wgsl` / 256 KB de código total / 64 KB de manifiesto.
- El bloque uniform del motor no cambia de forma: `@group(3) @binding(0)`, 64 B, con — en orden de declaración — el tiempo, el desplazamiento de render, la dirección del sol y la posición del ojo. El diseño se registra con `minBindingSize: 64`, y la disposición exacta de campos es `seconds: f32` @ byte 0, `renderOffset: vec3i` @ 16, `sunDirection: vec3f` @ 32, `eyePosition: vec3f` @ 48. Dos nombres de campo internos cambiaron: `time` → `seconds`, `originOffset` → `renderOffset`. El **diseño de bytes es idéntico al de v2**, y de todos modos nada cambia para el código del paquete, porque los paquetes no pueden nombrar el uniform directamente (la cabecera del motor lo marca como proporcionado por el motor y de solo lectura, «which packs can't name»); sigue usando las funciones de cabecera `bloxdSeconds()` / `bloxdRenderOffset()`.
- El grupo 3 del paquete ganó un segundo ocupante documentado: `@group(3) @binding(1)` es la textura de profundidad de escena que lee `bloxdOpaqueBehind()` (implementación completa en §51). El uniform de 64 B permanece en el binding 0; los paquetes siguen sin poder nombrar ninguno de los dos bindings.

### 42. blockId pasa a blockFlags: materiales por bloque como bits (lo principal)

En las tres estructuras de entrada de hooks (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`), el campo v2 `blockId: u32` se **sustituye** por `blockFlags: u32`. Texto del motor sobre el campo: *«What kind of block this face is: `bloxdBlockFlag*` bits, the same across the face.»* El motor ahora entrega los datos de material en sí, así que la forma v2 de adivinar materiales a partir de rangos de ids numéricos o de mantener tablas de ids en el mundo ([Parte VIII](../history/v2.md) §34) ya no es necesaria.

Los bits se exponen como constantes con nombre:

```wgsl
// Prueba uno con (blockFlags & bloxdBlockFlagRock) != 0.
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| Valor | Constante | Significado (notas del motor, condensadas) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | Totalmente opaco — hojas y hielo incluidos. No vidrio, agua, lava, generadores, ni bloques fantasma o invisibles. |
| 2 | `bloxdBlockFlagEmissive` | Emite luz de bloque, como hacen el neón, los portales, las lámparas, la lava y el faro. Los minerales brillantes cuentan, por tenues que sean. |
| 4 | `bloxdBlockFlagVegetation` | Hojas, y la hierba de los bloques de hierba — que también son tierra. No cactus, bloques de champiñón ni heno. |
| 8 | `bloxdBlockFlagDirt` | Tierra y suelo, con los bloques de hierba incluidos. La `Rocky Dirt` también es roca. |
| 16 | `bloxdBlockFlagSand` | Arena, arena roja y toda arenisca — que también es roca. |
| 32 | `bloxdBlockFlagRock` | Piedra y sus variantes, andesita, diorita, granito, grava, minerales, arenisca, `Rocky Dirt`, bedrock, obsidiana y magma. |

Un bloque compuesto de varios materiales lleva **cada** flag que corresponda (el ejemplo del propio motor: la arenisca es arena y roca, así que recibe ambos). Las hojas son vegetación pero no tierra; los bloques de hierba son vegetación y tierra a la vez.

Los flags de vegetación / tierra / arena / roca se asignan a partir del **nombre visible** registrado del bloque (opaco / emisivo vienen en cambio de los datos de opacidad y emisión del propio motor): los nombres que terminan en `Leaves`, o `Grass Block`, son vegetación; los nombres `Dirt` / `Soil` (y todo `Grass Block`) son tierra; exactamente `Sand` y `Red Sand`, más cualquier nombre que contenga `Sandstone`, son arena; los nombres que contengan `Stone` / `Andesite` / `Diorite` / `Granite`, cualquier `Ore`, más Yellowstone, Gravel, Bedrock, Obsidian, Magma, Rocky Dirt (y arenisca) son roca.

#### Las reglas exactas de nombres (deriva los flags de cualquier bloque tú mismo)

Los cuatro bits de material provienen de un clasificador fijo sobre el nombre visible registrado del bloque. Primero se eliminan los nombres de variante (todo lo que va tras `|`), así que las variantes heredan los flags del bloque base. Después:

| Bit | Regla (evaluada sobre el nombre sin variante) |
|---|---|
| vegetación | el nombre **termina en** ` Leaves`, o **termina en** ` Grass Block` |
| tierra | el nombre **es exactamente** `Dirt`, **termina en** ` Dirt` o ` Soil`, o **termina en** ` Grass Block` |
| arena | el nombre **es exactamente** `Sand` o `Red Sand`, o **contiene** `Sandstone` |
| roca | el nombre **es exactamente** uno de `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt`, **contiene** `Sandstone`, **termina en** ` Ore`, o contiene `Stone` / `Andesite` / `Diorite` / `Granite` como palabra independiente |

Yellowstone aparece listado explícitamente porque `Stone` no es una palabra independiente dentro de `Yellowstone`. Opaco y emisivo **no** provienen del nombre — vienen de los datos de opacidad y de emisión de luz de bloque del propio motor, así que no pueden derivarse con estas reglas.

Fuente: el clasificador de nombres del motor (módulo 28537, bundle `3ymzdd`); verificado contra los 7.861 bloques con nombre, 2026-10-20.

Ejemplo — tinte por bloque según el material:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

Efecto sobre las recetas de v2: el array de 22 ids de hojas de R-H ([Parte VIII](../history/v2.md) §34) se reduce a `(blockFlags & bloxdBlockFlagVegetation) != 0`. La referencia de id ↔ nombre de bloque en [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) sigue siendo útil para fines ajenos a los sombreadores, pero ya no necesita búsquedas en el mundo para el estilo de materiales.

#### Hojas sin la hierba (la pregunta que todos hacen)

`vegetation` por sí solo coincide con las hojas **y** con la hierba de los bloques de hierba, que además llevan `dirt`. Excluye dirt para afectar solo a las hojas — el discriminador que detallan las propias notas de campo del motor:

```wgsl
// Solo hojas: vegetación sin tierra. Los bloques de hierba son vegetación Y tierra.
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// Solo bloques de hierba (las caras verdes de la superficie del terreno):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

Verificado contra el registro activo (2026-10-20, bundle `3ymzdd`):
`vegetation && !dirt` coincide exactamente con los 45 registros de hojas (22 tipos base —
los mismos 22 que midió el array de ids de R-H en v2); `vegetation && dirt` coincide exactamente
con los 8 bloques de hierba. No hay excepciones en ninguna dirección — recuentos del registro a fecha de ese build; los bloques nuevos hacen crecer las cifras sin cambiar la regla. Combínalo con `vertex.normal`
(arriba/abajo) para elegir caras, por ejemplo solo las caras superiores de los bloques de hierba.

### 43. Renombrados de funciones y cambios semánticos

| v2 | v3 | Notas |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | Segundos desde que se cargó la página (nota de precisión f32 abajo) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | Misma cantidad: posición de render + esto = posición de mundo |
| `const bloxdTimeWrap: f32 = 3600` | **eliminada** | Define los periodos tú mismo en el paquete |
| `engineColour` (en `BloxdLightIn`) | **eliminado** (14 → 13 campos) | Reconstruye desde `litColour` + niebla |
| parámetros de hook `v` / `s` / `l` | `vertex` / `surface` / `light` | Nombres de la plantilla; firmas sin cambios |

- **`bloxdSeconds()`** — segundos desde que se cargó la página. En f32 cuenta en pasos de menos de 1 ms durante las primeras 4,5 horas, y de unos 4 ms de las 9 a las 18 horas. La cabecera recomienda el idioma `bloxdSeconds() % period`, que cuenta de 0 a `period` y vuelve a empezar — un reemplazo limpio de la constante de envoltura eliminada.
- **`bloxdRenderOffset()`** — bloques enteros: «a render position plus this is a world position». Cambia a medida que el jugador viaja, así que las posiciones de render se mantienen cerca del jugador — y por tanto son precisas. En toda la guía, lo que el texto v2 llamaba el offset local de noa ahora se llama de forma consistente **posición de render** / desplazamiento de render; es la misma cantidad que devolvía `bloxdOriginOffset()`.
- **`bloxdTimeWrap` eliminada** — un paquete que envolvía el tiempo a 3600 s declara ahora su propia constante, por ejemplo `const timeWrap: f32 = 3600.0;` y `% timeWrap`.
- **Semántica de la luz predeterminada** — el valor predeterminado de v2 era `engineColour + emission × fogVisibility`; el de v3 lo compone como `bloxdApplyFog(litColour + emission, light)` — **la emisión se atenúa con la niebla dentro del valor predeterminado**, así que la salida combinada pasa por la mezcla de niebla en conjunto. Tabla de traslado:

  | Expresión v2 | Traslado a v3 |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // traslado a v3 de la lectura v2 `l.engineColour + s.emission * l.fogVisibility`:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **Sin cambios de nombre ni de significado**: `bloxdEyePosition()`, `bloxdSunDirection()`, `bloxdFaceBlock()`, `bloxdApplyFog()`, `bloxdWorldPosition()`.

### 44. Nuevas constantes de cabecera: `bloxdPi` y `bloxdTau`

```wgsl
// Media vuelta y una vuelta completa, en radianes.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

Son útiles tanto para trucos de trigonometría como porque los paquetes ya no necesitan escribir π a mano. Ojo con la reutilización de nombres: una constante local del paquete con el mismo nombre ahora choca con la comprobación de identificadores duplicados de la cabecera — elimina o renombra cualquier redeclaración de `bloxdPi` / `bloxdTau` en tu código.

### 45. La plantilla de seis hooks (hooks de líquido mostrados oficialmente)

El texto de paquete predeterminado publicado con el build ahora incluye **los seis hooks** — terreno / líquido × vértice / superficie / luz — y cada uno devuelve su valor predeterminado del motor. Los comentarios del motor lo presentan así: *«Every hook returns its engine default. Copy a hook and change its output to start a shader pack.»*

```wgsl
// Cada hook devuelve su valor predeterminado del motor. Copia un hook y cambia
// su salida para empezar un paquete de sombreadores.

// Los juegos estrictos dejan el terreno donde está: sin guardia, este hook
// desactivaría todo el paquete de sombreadores allí.
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

// El agua usa estos. Si se eliminan, el agua usa tus hooks de terreno.
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

- Los comentarios de los hooks enuncian directamente las reglas de líquido: **el agua necesita el trío; elimínalo y el agua reutiliza tus hooks de terreno** (el comportamiento de reserva conocido de v2, [Parte VIII](../history/v2.md) §36, ahora escrito en la propia plantilla).
- `bloxdLiquidVertex` está dentro de la misma guardia `#ifndef BLOXD_STRICT` que `bloxdTerrainVertex` — sin guardia, desactivaría todo el paquete en juegos estrictos igual que hacen los efectos de vértice del lado del terreno.
- Los nombres de la plantilla son ahora los nombres completos de parámetro `vertex` / `surface` / `light` (la plantilla de v2 usaba los cortos `v` / `s` / `l`). Los nombres de parámetro de tu propio código son libres — solo importan las firmas.

### 46. Matriz de variantes: el eje de programa y los cambios de macros

Las variantes se generan sobre una matriz de **estricto × iluminación × programa** — las mismas 8 combinaciones que en v2, pero con terreno / líquido ahora como un eje explícito de la matriz. Los nombres de variante lo deletrean como `allow|strict · unlit|lit · terrain|liquid`, y se muestran en la interfaz como ``terrain`` / `liquid`, `strict` / `non-strict`, `lighting on` / `lighting off` (y las pantallas de error pueden añadir «(only in {{variants}})»).

| Macro | Definida en |
|---|---|
| `BLOXD_STRICT` | variantes estrictas (ambos programas) |
| `BLOXD_LIGHTING` | variantes con iluminación activada (ambos programas) |
| `BLOXD_ALPHA` | **todas las variantes de líquido** más las variantes de **terreno** no estrictas |
| `BLOXD_SCENE_DEPTH` | **todas las variantes de líquido** |

Dos cosas cambian para los autores respecto a las reglas de v2 ([Parte VIII](../history/v2.md) §36):

- **`BLOXD_ALPHA` no cambia respecto a v2.** El generador de variantes lleva la línea literal `"liquid"!==program&&strict||push("BLOXD_ALPHA")` — la precedencia de operadores de JS hace que *(terreno **y** estricto)* sea el único caso que omite el push, así que la macro está definida en **todas las variantes de líquido (estrictas o no) y en terreno no estricto**; solo el terreno estricto la omite. El código de líquido bajo `#ifdef BLOXD_ALPHA` se compila exactamente como siempre lo hizo, y la escritura de vuelta de alfa de §49 (empalmada para programas de líquido o variantes no estrictas) coincide con este conjunto con precisión.
- **`BLOXD_SCENE_DEPTH` está siempre definido en las variantes de líquido**, así que el uso de profundidad sigue estando bien sin guardia allí, exactamente como en v2 (§35); en hooks de terreno sigue necesitando el envoltorio `#ifdef BLOXD_SCENE_DEPTH`.

### 47. Lista de migración de v2 a v3

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** en las tres estructuras de entrada; expresa el estilo de material como pruebas de bits contra las constantes `bloxdBlockFlag*` (§42); elimina las heurísticas de rangos de ids de v2
3. **`bloxdTime()` → `bloxdSeconds()`**; declara tu propio periodo en lugar de la eliminada `bloxdTimeWrap` (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **Reconstruye las matemáticas de luz desde `engineColour` sobre `litColour` + niebla** según la tabla de §43; ten en cuenta que el valor predeterminado ahora atenúa la emisión con la niebla
6. **Hooks de líquido**: define `bloxdLiquid*` explícitamente cuando quieras que el agua se trate de forma distinta; omítelos para recaer en tus hooks de terreno
7. **No hace falta auditar `BLOXD_ALPHA`** — su conjunto de variantes no cambia respecto a v2: todas las variantes de líquido y el terreno no estricto la definen, solo el terreno estricto la omite (§46)
8. **Usa `bloxdPi` / `bloxdTau`** donde se escribieran constantes trigonométricas a mano; elimina las redeclaraciones locales que ahora dupliquen la cabecera
9. **Mantén las guardias estrictas**: los hooks de vértice y `discard` siguen envueltos en `#ifndef BLOXD_STRICT`; la plantilla protege `bloxdLiquidVertex` igual que su gemelo de terreno
10. **Valida en el juego** — compila y prueba el paquete en un juego compatible con paquetes de sombreadores

### 48. Otros cambios y notas de v3

- **La validación sigue siendo de dos etapas** ([Parte VIII](../history/v2.md) §38): primero la validación estática, luego la compilación real de WebGPU del navegador mediante fragmentos stub generados que llaman a tus hooks, con los errores asignados de vuelta a los archivos / líneas de origen, y los diagnósticos restauran los nombres originales de los identificadores del lado del motor mediante una asignación.
- **Los diagnósticos estrictos nombran el motivo**: un hook de vértice que mueve el terreno informa «… moves terrain, which strict games prevent.» y `discard` en hooks de superficie / luz informa «discard makes terrain see-through, which strict games prevent.»; la interfaz de ajustes mantiene la guía «wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`.» (`offInStrict`).
- **Mensajes del cargador**: los tipos de error y los límites no cambian; «Zip64 archives aren't supported.» se muestra como mensaje de la interfaz (`loadZip64`). El inventario de cadenas de la interfaz de paquetes suma 57 claves `shaderPack:*`; entre los errores de la etapa de carga, `loadNoWgsl` (un zip sin ningún archivo `.wgsl`) y `loadNotZip` (un archivo sin la firma de fin de archivo zip) completan el conjunto.
- **La interfaz de paquetes no incluye ningún editor WGSL en el juego.** La pantalla de ajustes no ofrece editor de código de sombreadores — los paquetes se escriben como archivos zip fuera del juego. (En el bundle sí existe un editor CodeMirror, pero es el editor de JavaScript de la interfaz de scripting de juegos personalizados; no tiene soporte de WGSL ni conexión alguna con el sistema de paquetes.)
- **Requisito de hardware**: Lite necesita un controlador compatible con la función `shader-f16` de WebGPU; los controladores demasiado antiguos se rechazan con un mensaje como «Intel driver too old for Lite (no shader-f16)».
- **Los cambios de iluminación revalidan los paquetes guardados**: cuando el ajuste de iluminación cambia en tiempo de ejecución, el motor vuelve a ejecutar la comprobación del paquete (`changed → recheck`); la reproducción de repeticiones llama al mismo hook con `changed: false` y se salta la recomprobación.
- **Redacción**: el texto sobre juegos que aceptan paquetes de sombreadores ahora dice «in games that **support** them».
- **Alcance de los títulos**: el conjunto de juegos donde se ejecutan los paquetes no cambia respecto al build anterior.

### 49. Interioridades del motor: cómo el renderizador Lite invoca tus hooks

Todo lo de §40–§48 es lo que te dicen el cargador y la cabecera. Esta sección y las siguientes documentan lo que el motor hace realmente en tiempo de ejecución, restaurado del bundle de producción (el renderizador Lite — un chunk de 175 KB; el nombre real del archivo fuente de integración `lite/terrainShaderPack.ts` sobrevive dentro de sus cadenas de error). Nada de esto cambia lo que escribes, pero elimina las conjeturas sobre lo que reciben tus hooks — y resuelve varias preguntas que otras guías de la comunidad todavía listan como abiertas.

El renderizador no «llama» a tus hooks desde JavaScript. Cuando un paquete pasa la validación, el motor **empalma las llamadas a tus hooks en su propio WGSL de terreno** reemplazando líneas ancla fijas en su texto de shader. Un ancla debe coincidir exactamente una vez — cero o varias coincidencias abortan con `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Etapa | Línea ancla en el shader del motor | Qué se empalma |
|---|---|---|
| vértice | un bloque de cuatro líneas desde `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` hasta `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);` | construye `BloxdVertexIn`, llama a tu hook de vértice, reescribe `worldPos` — el empalme también cambia `let worldPos` por `var worldPos` |
| superficie | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | construye `BloxdSurfaceIn`, llama a tu hook de superficie, reescribe `baseColor` / `alpha` |
| color iluminado | justo antes de `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` | `let bloxdSpLitColour = color.rgb;` — captura el color previo a la niebla |
| luz | la línea final `return color;` del fragment shader | construye `BloxdLightIn`, llama a tu hook de luz, reescribe `color` — después de la mezcla de niebla |

El código empalmado, restaurado del bundle distribuido (las expresiones de muestra del nivel de luz se abrevian donde el formato propio del motor se extiende demasiado):

```wgsl
// etapa de vértice — variantes no estrictas con un hook de vértice
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* tu bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// etapa de fragmento — superficie
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* tu hook de superficie */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // solo se empalma cuando el programa es líquido o la variante no es estricta
```

```wgsl
// etapa de fragmento — luz
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // directional
        ambient,                                 // ambient
        /* varying de nivel de luz */.rgb,       // blockLight
        /* canal de cielo de la misma varying */, // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* término de luz sostenida (ver abajo) */, // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour — negro solo sin niebla alguna
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* tu hook de luz */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

Cuatro hechos de aplicación se desprenden directamente de este empalme:

- **El terreno estricto ignora los cambios de alfa del hook de superficie.** La escritura de vuelta `alpha = bloxdSpSurface.alpha` solo se empalma para programas de líquido o variantes no estrictas — la implementación detrás de la tabla de macros de §46. (En terreno estricto tu código `#ifdef BLOXD_ALPHA` no se compila de todos modos; ahora también está confirmado que las escrituras de alfa sin guardia se descartan allí.)
- **Una variante estricta que todavía declara un hook de vértice nunca lo ejecuta** — el motor lo informa en tiempo de build: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. Por eso la plantilla oficial (§45) envuelve `bloxdLiquidVertex` en el mismo `#ifndef BLOXD_STRICT` que su gemelo de terreno.
- Los identificadores `bloxdSp*` — **14 en total**: `bloxdSpVertexIn`, `bloxdSpVertex`, `bloxdSpSurfaceIn`, `bloxdSpSurface`, `bloxdSpLightIn`, `bloxdSpLight`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, `bloxdSpPositionW`, `bloxdSpZ`, `bloxdSpEye`, `bloxdSpScale`, `bloxdSpBehind` — son temporales del lado del motor. Tu código nunca los ve, pero aparecen en los diagnósticos y en la salida de ingeniería inversa de cualquiera, así que merece la pena reconocerlos a primera vista.
- **El atajo de superficie predeterminada.** Cuando el hook de superficie de una variante es literalmente `bloxdDefaultSurface`, el motor se salta por completo el empalme de las líneas de escritura de vuelta de `baseColor` / `alpha` — el valor predeterminado ya produce esos valores, así que la asignación sería código muerto. Las cadenas de hooks sin modificar no cuestan nada.

**Qué alimenta realmente `BloxdLightIn`** — campo por campo, del código empalmado:

| Campo | Origen del lado del motor |
|---|---|
| `litColour` | el color del fragmento capturado justo antes de la mezcla de niebla (el ancla `bloxdSpLitColour`) — «before emission and fog», como dice la cabecera |
| `directional` | `vTerrainLambert` — una suma interpolada por vértice de `max(0, dot(normal, lightDirection)) × intensity` sobre las luces direccionales de la escena (fórmula en §54); 0 cuando la escena no tiene ninguna |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — por material, por fotograma |
| `blockLight` | el `.rgb` de la varying de nivel de luz ya decodificada (decodificación en §54) |
| `skyLight` | el canal de cielo de esa misma varying de nivel de luz — *«Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING»* (texto de la cabecera) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | el término de luz sostenida, construido a partir del canal w de la varying de nivel de luz junto con los uniforms de fotograma `uHeldLightPos` / `uHeldLightColour` (la [Parte VII](../internals/) §26 documenta la caída y el comportamiento del piso de canal) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **negro solo en una escena sin niebla alguna** (modo 0, §50) |
| `fogVisibility` | el coeficiente de niebla limitado — el valor exacto que devuelve la función de §50 |
| `position` / `normal` | las varyings `vPositionW` / `vNormalW` (la normal se renormaliza por fragmento) |
| `blockFlags` | la varying plana `vBlockFlags` — la ruta de entrega completa de §52 |

Para orientarte al leer material antiguo: la arquitectura de empalme idéntica existía en el renderizador v2, y las únicas diferencias de integración de v3 son `vBlockId` → `vBlockFlags` y la adición de las variantes de líquido. El sistema de hooks es arquitectónicamente estable a través del corte v2 → v3.

### 50. La función de niebla: cuatro modos, un campo

Restaurada literalmente del shader de terreno de producción:

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

- `vFogInfos = vec4f(mode, start, end, density)` — un solo vec4 lo controla todo.
- **En el shader existen cuatro modos: 0 = apagado, 1 = exponencial, 2 = exponencial al cuadrado, 3 = lineal.** `fogVisibility` es el coeficiente limitado sea cual sea el modo que se ejecute — hay exactamente un campo, y nunca se expone un flag de modo a los paquetes.
- Los títulos propios de Bloxd usan el modo 3 (lineal) con la banda de 32 bloques descrita en la [Parte VII](../internals/) §25 (`fogStart = 32 × D`, `fogEnd = 32 × (D + 1)`), así que la observación «siempre lineal» de esa parte sigue describiendo el gameplay publicado. Los modos exponenciales son código real y activo del motor, sin embargo — un título puede cambiar `vFogInfos.x` y alterar la rampa sin ninguna actualización del cliente. Las recetas de distancia que calculan `distance(l.position, bloxdEyePosition())` por su cuenta (receta R-B) son la forma robusta de escribir looks basados en distancia, ya que un cambio de modo no puede moverlas.
- Esto resuelve desde el código la pregunta «qué rampa de niebla usa realmente el motor»: las cuatro están implementadas; los títulos publicados usan la lineal. (La misma función también explica el comentario de `fogColour` de la cabecera — el modo 0 es el único caso en que `fogColour` llega negro, y los juegos de Bloxd nunca publican el modo 0; en su lugar empujan la niebla muy lejos, [Parte VII](../internals/) §25.)

### 51. bloxdOpaqueBehind(): la implementación exacta

La función completa, restaurada literalmente del build de producción:

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

- **La textura de profundidad vive en `@group(3) @binding(1)`** — el grupo 3 es el grupo propio del paquete: el binding 0 es el uniform `bloxdPackInputs` de 64 B (§41), el binding 1 es esta textura de profundidad. Ambos los proporciona el motor y no tienen nombre desde tu lado.
- **La textura de profundidad es un recurso no filtrable, solo de fragmento.** La entrada del bind group la registra como `texture: { sampleType: "unfilterable-float" }` con visibilidad únicamente `GPUShaderStage.FRAGMENT`; por eso `bloxdOpaqueBehind()` usa `textureLoad` (texel exacto, nivel de mip 0) en vez de `textureSample` — el filtrado por hardware no está disponible en esta textura.
- `z ≤ 0` significa que la muestra de profundidad no alcanzó nada (plano lejano / cielo): `found = false`, y `position` / `distance` no tienen significado — comprueba `found` primero, siempre.
- La posición devuelta es una **intersección escalada a lo largo del rayo**: la superficie opaca se coloca en `eye + (fragment − eye) × max(z / viewDepth, 1)`. `distance` se mide desde el ojo hasta ese punto — para paquetes de superficie de agua esto es efectivamente «cuánta agua atravesó el rayo antes de golpear algo sólido», que es lo que hace funcionar las recetas de agua teñida por profundidad sin un segundo búfer de profundidad.

### 52. blockFlags de extremo a extremo: del registro a tu hook

§42 te dice qué significan los bits. Esta sección es la ruta completa que recorre un bit de flag desde el registro del bloque hasta tu hook — cada salto confirmado desde el código de producción, que también demuestra el «the same across the face» de la cabecera hasta el nivel de byte.

**1. Registro (base de datos de definiciones de bloques).** Los flags de cada bloque se calculan una vez, en el registro:

```js
flags[id] = nameFlags                     // reglas de nombre visible (§42): vegetación / tierra / arena / roca
          | (definition.opaque === true ? 1 : 0)   // bit opaco — datos de opacidad del motor
          | (anyFaceEmission >= 1       ? 2 : 0);  // bit emisivo — datos de emisión de luz de bloque
```

Las reglas de nombre visible cubren solo los cuatro bits de material; los dos bits de física vienen de datos separados del motor — `opaque` directamente de la definición del bloque, `emissive` del array de emisión de luz por cara. El «Glowing ores count, however faint» de la cabecera es literal: cualquier cara con emisión ≥ 1 activa el bit.

**2. Por bloque → por material (inicialización del mesher).** El terreno se dibuja por *material*, no por id de bloque, así que los flags se retabulan en una tabla de materiales (un `Uint16Array` indexado por id de material, donde cada material toma los flags de la primera cara de su bloque propietario). La tabla se envía al Web Worker de mallado — pero **solo en configuraciones donde el pipeline de paquetes está habilitado**; de lo contrario la tabla es `null` y nunca se escriben bytes de flags. Los jugadores sin paquetes no pagan sobrecarga alguna, por construcción.

**3. A los bytes de vértice (worker del mesher).** Los flags viajan en dos bytes libres de los datos de vértice intercalados existentes:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // 8 bits bajos → byte alfa del atributo de color
        buffer[o + normalOffset + 3] = flags >> 8;    // 8 bits altos → byte w del atributo de normal
    }
}
```

Los cuatro vértices de una cara reciben el mismo valor — el significado a nivel de implementación de «the same across the face».

**4. Decodificación en la GPU (shader de terreno Lite).** Los dos bytes viajan como el atributo de vértice `blockFlagWords: vec2u` (location 7, presente solo cuando el pipeline de paquetes está activo) y se reensamblan en la etapa de vértice:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags` se declara `@interpolate(flat)` — constante por cara hasta la etapa de fragmento, por lo que las pruebas de bits de §42 son estables dentro de una cara y nunca pueden producir una mezcla a mitad de cara.

- El pipeline reserva **16 bits** de capacidad (esa decodificación reensambla dos bytes completos) mientras que v3 solo define 6 — pueden aparecer flags futuros sin otro cambio de formato de vértice ni subida de versión de API.
- En el modo de vértices empaquetados, esos mismos dos bytes viajan dentro de `packed.y` y del byte superior de la palabra de color en lugar de un atributo dedicado — mismos valores, distinto contenedor.
- Para la pregunta de hojas frente a hierba, que es para lo que más se consultan estos flags, consulta [Hojas sin la hierba](#hojas-sin-la-hierba-la-pregunta-que-todos-hacen) en §42.

### 53. Interioridades de la validación: HEADER_VERSION, firmas y nombres reservados

**El hash de cabecera medido.** Toda validación de paquete se sella con el `HEADER_VERSION` del motor. Ejecutar directamente el módulo de validación de producción (ver la nota del arnés al final de §54) lo mide:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← medido del bundle de producción activo
```

Es un hash FNV-1a-32 (prefijado `6.`) sobre cinco entradas: la cabecera del motor preprocesada y tokenizada **por variante** (una entrada por cada una de las 8 variantes), el universo léxico WGSL completo del analizador, los cuatro nombres de macro, el mapa de funciones especiales, y la declaración `BloxdPackInputs` junto con su línea uniform `@group(3) @binding(0)`. Dos consecuencias para los autores:

- **Cualquier edición de la cabecera del lado del motor la vuelve a hashear** — este es el mecanismo detrás del flag automático «necesita revisión» que reciben los paquetes guardados tras las actualizaciones del motor ([Parte VIII](../history/v2.md) §31).
- El hash cubre la *cabecera del motor*, no tu código. Un paquete que sigue cargando tras una actualización del motor no está «todavía válido» — simplemente aún no ha activado un cambio de cabecera. La única comprobación de versión en la que participa tu manifiesto es la puerta de `apiVersion` (§40).

**Comprobación de firmas de hooks: exacta por token en los tipos, libre en los nombres.** El validador mantiene una firma por ranura de hook:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

La coincidencia es **token por token**: los nombres de tipo de los parámetros deben coincidir exactamente, `->` y el tipo de retorno deben coincidir exactamente, y se comprueban el número de parámetros y la colocación de las comas. Los *nombres* de los parámetros son libres — se acepta cualquier identificador en la posición del parámetro, por eso tu `fn bloxdTerrainLight(s, l)` compila aunque la plantilla lo escriba `(surface, light)`. El hook de luz toma exactamente dos parámetros.

**Nombres reservados.** La regla es una sola expresión regular: `/^bloxd/i`. Cualquier identificador que empiece por `bloxd` está reservado — todo lo `bloxd*` lo proporciona el motor, y un paquete no puede declarar en ese espacio de nombres (por eso también chocan las redeclaraciones de `bloxdPi` / `bloxdTau` de §44).

**Funciones especiales.** En v3 hay registrada exactamente una:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

«Especial» significa *ligado a una macro* — una función del motor cuya disponibilidad depende de un símbolo de variante. Dos diagnósticos de guardia imponen el uso correcto:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — un hook de vértice que alcanza una función exclusiva de superficie / luz.
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — por ejemplo, `bloxdOpaqueBehind()` del lado del terreno sin un envoltorio `#ifdef BLOXD_SCENE_DEPTH`.

**La cabecera del motor (preludio), fijada.** La cabecera de v3 es una cadena de 5.637 bytes que comienza `// Engine-provided and read-only, prepended to all packs. apiVersion 3.` Lleva directivas `#if` / `#ifdef` que el preprocesador WGSL del propio motor evalúa por variante — el motor ejecuta de verdad la evaluación de expresiones `#if`, y una expresión mal formada da error con `Cannot evaluate #if ...`. Cada estructura, firma de función y comentario citado en esta guía proviene de este texto renderizado, así que la guía y la cabecera distribuida no pueden divergir. El texto completo sigue, verbatim, al final de §54.

**Notas del analizador para autores.**

- Las funciones del lado del paquete se renombran con el prefijo `pack_` al fusionarse en el shader del motor (para evitar colisiones); los diagnósticos las asignan de vuelta a tus nombres originales — el mismo mecanismo que describe la [Parte VIII](../history/v2.md) §38 para la segunda etapa de validación.
- El mensaje de identificador no declarado dice `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`; `_ can only be the target of a phony assignment, as in _ = f();` y `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.` completan el conjunto recién confirmado.
- El universo léxico del analizador incluye identificadores que **no son WGSL estándar**: `bufferView`, `bufferArrayView`, `bufferLength`, `atomicStoreMax`, `atomicStoreMin`. El motor los conoce como integrados, pero no está garantizado que la implementación WGSL de un navegador concreto los proporcione — nunca bases un paquete de distribución en ellos.

### 54. Constantes, límites y diseños confirmados

El diseño de recursos completo del programa de terreno, directamente del renderizador Lite de producción:

| Binding | Contenido |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms` — `viewProjection` mat4x4f, `view` mat4x4f, `vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`, `uSkyLightColour`, `uAmbientLightColour`, **`vFogInfos`**, `vFogColor`, `outputHeight`, `sceneAmbient`, **`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: storage `array<vec4f>` — xyz = traslación al fotograma de render, w = visibilidad del fundido de entrada |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`, `ambientAndCutoff`, `emissiveAndLevel`, `anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — el uniform del paquete (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — la textura de profundidad (§51) |

- **Las luces direccionales tienen un tope estricto de cuatro.** El renderizador falla con `Terrain supports 4 directional lights, not ${n}` si una escena intenta registrar más. `l.directional` es la suma Lambert sobre las que existan (0–4; las escenas propias de Bloxd usan 2 — [Parte VII](../internals/) §27). El terreno también avisa sobre las luces que no puede respetar, literalmente: una luz añadida tarde — `Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`; una luz con tinte — `Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`; y una que filtra mallas — `Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **Nombres del programa de terreno**: las claves de caché de pipeline dicen `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}` — un paquete aparece como el sufijo `-sp{variant}`, un programa por variante de §46. Un watcher (`watchPipelineFailures`) compara los nombres de pipeline en vivo con `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/` y vuelve a comprobar la variante de paquete correspondiente cuando falla la compilación de un pipeline; se salta la pérdida del dispositivo GPU (`device.lost`).
- **`BLOXD_TERRAIN_DIRECTIONAL` es una macro interna del motor** (definida cuando dirLightCount > 0). *No* es una de las cuatro del preludio y nunca llega al código del paquete — pero aparece en los volcados WGSL de los shaders propios del motor, así que reconocerla ahorra confusión.
- **Decodificación del nivel de luz**: el atributo de vértice `aPackedLightLevels` es un f32 que empaqueta cuatro nibbles, cada uno dividido por 15: rgb = la luz de bloque coloreada, a = el canal de cielo / luz sostenida. La etapa de vértice lo decodifica en la varying `vLightLevels`; `blockLight` lee `.rgb`, y el canal de cielo / luz sostenida lee `.w`. El motor fija un piso del 35 % del canal más brillante para los canales rgb antes de interpolar — el ancla del lado del motor de la elevación que la [Parte VII](../internals/) §26 documenta desde el gameplay.
- **`vTerrainLambert`** (la fuente de `directional`, §49) se genera como una suma sobre las luces direccionales activas: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, protegida por `BLOXD_TERRAIN_DIRECTIONAL`.
- **Los búferes de índices pasan a 32 bits con la primera malla grande.** El renderizador Lite elige índices `Uint16Array` solo mientras todos los valores de índice se mantienen ≤ 65.534; en cuanto cualquier índice llega a 65.535, el búfer pasa a ser un `Uint32Array` (se rastrea por búfer con un flag `is32Bits`). En la práctica: una malla de chunk con como máximo 65.535 vértices cabe en índices de 16 bits; una con exactamente 65.536 vértices emite necesariamente un índice 65.535 y cambia todo el búfer a 32 bits.
- **Detalles de carga del manifiesto**: se filtran las entradas zip bajo `__MACOSX/`, los archivos con prefijo `._` y `.DS_Store` (ruido de archivo de macOS); `pack.json` se localiza por comparación de ruta en minúsculas — cero coincidencias → `loadNoManifest`, dos o más → `loadDuplicateManifest`; la lectura del manifiesto está limitada a 65.536 bytes.
- **Cómo se verificó todo esto**: los módulos del bundle de producción se restauraron (165 chunks; el registro webpack de este bundle cuenta 4.951 módulos — la cifra varía en unas pocas unidades según se incluyan o no las dependencias hijas asíncronas, así que trátala como específica de este bundle) y se ejecutaron en un arnés compatible con webpack bajo Node.js. El `HEADER_VERSION` medido (§53), la cabecera renderizada de 5.637 bytes, el orden canónico de la tabla de variantes y el mapa de funciones especiales provienen de *ejecutar el código distribuido*, no de leer cadenas. El mismo arnés es el núcleo natural para un `pack_check` v6 comunitario — ejecutar el validador propio del motor contra un paquete reproduce sus veredictos exactamente.
#### La cabecera del motor v3, verbatim

El texto fijado de 5.637 bytes (127 líneas) en sí — el artefacto que §53 arriba describe — restaurado verbatim del build `3ymzdd`, el build de producción v3 que cubre esta parte. Es la contraparte v3 de la cabecera v4 de [Parte XI](../api/texture-catalog.md) §67, incrustada completa por la misma razón: un pack v3 puede depurarse contra exactamente lo que la engine anteponía, y cada diferencia v3 → v4 ([Parte X](../history/v4.md) §58–§59) puede leerse de los dos textos lado a lado.

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

Investigado por ltf_ahel (investigado con glm)

---


## Parte X: Guía de migración a API Version 4 (2026-10-26, resumen)

> **Sustituida el 2026-11-03: la API actual es la versión 5** — los paquetes v4 se rechazan al cargar exactamente como se describe aquí para v3. Aplica esta parte *y después* la [Parte XII](../history/v5.md) (v4 → v5: la estructura `BloxdFlags` sustituye a `blockFlags`, `bloxdLit()` y la receta de iluminación pública, las entradas de encantamiento/superposición, el paquete por defecto de 9 ganchos). Los internos de esta parte (§56–§66) siguen siendo exactos para los builds v4 en que se midieron.

> Este texto es el resumen breve en este idioma. La versión completa con todos los detalles, recetas de ejemplo e interioridades del motor restauradas (§55–§66) está en [inglés](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md) y [japonés](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md).

Build objetivo: `cnty9.main.669f8081.js` — **en producción y preprod simultáneamente desde el 2026-10-26** (ambas byte a byte idénticas). El modelo de paquetes conserva su forma: mismos campos de `pack.json`, mismos límites del cargador, mismo uniform de 64 B, los mismos 6 hooks.

Reverificado en `tcwczu.main.357faec1.js` (2026-10-30, producción y preprod de nuevo idénticas byte a byte): **toda la API v4 sigue sin cambios** — la cabecera, la plantilla del pack por defecto, los 27 símbolos `bloxdSp*`, los límites del cargador y los 12 títulos permitidos son idénticos byte a byte con la base `cnty9` documentada aquí. La disposición del bundle volvió a cambiar (p. ej. el clúster ahora está en c51–c56), pero nada de eso es visible para un pack; el registro de nombres de texturas no se ha vuelto a medir (los nombres siguen siendo la API estable).

### Qué cambia

- `pack.json` exige `"apiVersion": 4` (igualdad `===` estricta, número) — los paquetes v3 se rechazan al cargar.
- **Nueva API de texturas (la novedad principal):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` muestrea el atlas de texturas de bloques exactamente como lo hace la propia engine (id 0 = blanco; las texturas animadas devuelven automáticamente el fotograma actual), `bloxdTextureSize(mipLevel) -> vec2u`, y constantes con nombre `bloxdTextureId*` (CamelCase a partir del nombre de archivo, p. ej. `grass_top` → `bloxdTextureIdGrassTop`; el catálogo completo de los 905 nombres utilizables está incrustado como §68 en la Parte XI (`11-reference.md`)).
- **Cuatro campos nuevos de entrada** en `BloxdSurfaceIn` *y* `BloxdLightIn`: `textureId`, `textureRotation` (cuartos de giro en sentido horario, que `bloxdTexel` aplica), `uv` (en bloques; se dibuja `fract(uv)`), `mipLevel`.
- **Renombres con cambio de significado:** `fogVisibility` → `fogAlpha` con significado **invertido** (`0 = sin niebla, 1 = solo fogColour`; portado: `l.fogVisibility` → `1.0 - l.fogAlpha`); `bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (cuerpo idéntico); `BloxdOpaqueBehind.found` → `hit`.
- **Los juegos estrictos ahora los impone el validador incluido:** un hook de vértice sin proteger o un `discard` alcanzable informa `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...` y desactiva **todos** los hooks en juegos estrictos. Con envoltorios `#ifndef BLOXD_STRICT`, surface/light siguen funcionando.
- Todo lo demás queda congelado: 6 hooks, bits de `blockFlags` (1/2/4/8/16/32), diseño del uniform, límites del cargador, matriz de variantes, los 12 títulos allow (reconfirmados sin cambios en `cnty9` el 2026-10-27).

### Migración rápida

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (número) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` o `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| Hooks de vértice sin protección | `#ifndef BLOXD_STRICT ... #endif` |

El material de referencia completo ya forma parte de la guía: la cabecera del motor restaurada íntegra y el catálogo completo de texturas con los 905 nombres utilizables están en la Parte XI (`11-reference.md`). Los detalles completos — la sutileza de rotación de `bloxdTexel`, el WGSL de muestreo restaurado, el registro de nombres, la nueva estructura de `HEADER_VERSION` con hash del registro — están en la versión completa en inglés y japonés.



---

### 67. La cabecera completa del motor v4, verbatim

La cabecera de 6.021 bytes (150 líneas) que el motor antepone a cada pack — empieza con `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.` No incluye: el par `bloxdTexel`/`bloxdTextureSize` generado por configuración de render (§63.1) ni los 27 símbolos `bloxdSp*` (§63.4). La compuerta `#ifdef BLOXD_ALPHA` la resuelve el preprocesador del motor por variante.


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


## Parte XII: Guía de migración a API versión 5 (2026-11-03, resumen)

> Este texto es el resumen breve para este idioma. La versión completa con todos los detalles, recetas de ejemplo, la cabecera v5 restaurada íntegra y los internos del motor (§69–§82) está en [inglés](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/12-apiv5.md) y [japonés](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/12-apiv5.md).

Build objetivo: `ab90qa.main.6188124c.js` — **en producción y preprod simultáneamente (medido 2026-11-03)**, ambos idénticos byte a byte (md5 verificado). Es la mayor revisión de la API desde v3: la cabecera del motor crece de 6,021 a **8,954 bytes descodificados** y casi toda estructura gana campos.

### Qué cambia

- `pack.json` exige `"apiVersion": 5` (estricto `===`, número) — los paquetes v4 se rechazan al cargar; los v4 guardados quedan inactivos en silencio.
- **`blockFlags` se sustituye por una estructura (el cambio estrella):** desaparecen las seis constantes de bits `bloxdBlockFlag*`; en su lugar **`flags: BloxdFlags`** con 14 campos bool con nombre — seis son los bits antiguos renombrados y ocho son nuevos: **`slab` `stairs` `flat` `placed` `held` `dropped` `thrown` `lifeform`**. Los modelos, los ítems en mano y los seres vivos ya se distinguen del terreno.
- **`#ifdef BLOXD_LIGHTING` desaparece:** el interruptor de compilación se sustituye por la comprobación en ejecución con la nueva función **`bloxdLit()`**; el uniform gana `lit: u32` (offset 4, sigue siendo de 64 B). La matriz de variantes pasa de 8 a 6 (`strict|allow` × `terrain|liquid|model`).
- **La receta de iluminación del motor se hace pública:** tres funciones nuevas — **`bloxdShading(light)`**, **`bloxdWorldLight(light)`**, **`bloxdLitColour(surface, light)`** — más dos entradas nuevas en `BloxdLightIn` (`diffuse`, `emissive`).
- **Entradas nuevas:** `localPosition: vec3f` (coordenadas de modelo, 0 en terreno) en todas; `enchantTier` / `enchantColour` / `enchantSpeed` / `overlayColour` (encantamiento y destello de daño) en Surface/Light; **salidas nuevas** `enchantColour` / `overlayColour` en `BloxdSurface`, mezcladas por `bloxdLitColour`.
- **Eliminado:** `bloxdFragmentBlockPosition()` (sin sustituto), las constantes `bloxdBlockFlag*`, `bloxdSpLitColour`.
- **La plantilla del paquete por defecto incluye ahora los 9 ganchos** (también los de luz, 1,122 → 1,683 bytes) y su comentario documenta el borrado: *«If you delete a hook, the default is used instead.»*
- Nueva constante de cabecera: `const bloxdChunkSize: i32 = 32;`. Las derivadas Y se negan automáticamente: `dpdy`/`dpdyCoarse`/`dpdyFine` se reescriben como `(-dpdy(...))`. `HEADER_VERSION` pasa a `9.<hash>.<hash>`.
- El espacio `bloxdSp*` crece de 27 a **46 símbolos**; el registro de texturas mide ahora **896 nombres utilizables** (+1 `scorpion_eggs`, −10, entre ellos la familia `chest_double_*` y `mob_spawner_*_block_side`) — los nombres son la API, los ids solo una instantánea.
- Todo lo demás queda congelado: límites del cargador (256 `.wgsl` / 256 KB / 64 KB / 32 MB / 1,024 entradas), nombres de ganchos, contrato strict (12 títulos allow), bindings del grupo 3.

### Migración en breve

| v4 | v5 |
|---|---|
| `"apiVersion": 4` | `"apiVersion": 5` (número) |
| `(s.blockFlags & bloxdBlockFlagVegetation) != 0u` | `s.flags.vegetation` |
| `#ifdef BLOXD_LIGHTING … #endif` | `if (bloxdLit()) { … } else { return bloxdDefaultLight(s, l); }` |
| `bloxdFragmentBlockPosition(p, n)` | eliminado — usa `bloxdWorldPosition()` / `flags` |
| (no existía) | `s.flags.held`, `s.flags.lifeform`, `s.localPosition`, `s.enchantTier` … |

La cabecera v5 completa restaurada (8,954 bytes, palabra por palabra) y la lista íntegra de deriva de nombres de textura están en las versiones completas en inglés y japonés (§82 y §80).

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

## Iluminación por defecto del motor y margen para el realismo



La iluminación por defecto del motor es "solo multiplicación" — no existen especular, fresnel, separación cálido/frío ni ambiente hemisférico. Lo siguiente se puede reconstruir:

| Función | Por defecto | ¿Construible en paquetes? |
|---|---|---|
| Difuso (Lambert) | Solo suma escalar de direccionales | ◎ Propio con `bloxdSunDirection()` (fuentes envueltas etc.) |
| Especular | Ninguno | ◎ Blinn-Phong (R9.2) |
| Fresnel | Ninguno | ◎ Aproximación de Schlick (R9.3) |
| Separación antorcha cálida / cielo frío | Sin color | ◎ (R9.1) |
| Ambiente hemisférico | Sin dirección | ◎ Cielo arriba / suelo abajo (R9.4) |
| Mapeo de tonos | Ninguno (solo clamp) | ◎ ACES fílmico (R9.5) |
| Perspectiva aérea | Solo niebla (reemplazo de color) | ◎ Desaturación con distancia (R9.6) |
| Detalle de superficie | Solo resolución de textura | △ Micro-relieve procedural con hash (R9.8) |
| Ondas de vértice (agua) | Ninguna (plano) | ◎ Solo allow (R7) |
| Normales de ola / destello solar | Ningunas | ◎ (R9.7) |
| Luz lunar nocturna | El color del cielo solo oscurece | △ La dirección lunar está en `-bloxdSunDirection()`: pseudo looks (ambiente azul en R2 / desaturación en R9.11) más luz lunar direccional (R-A, solo ciclo día/noche) |
| Sombras (oclusión de cielo) | Solo mezcla suave vía `mix(ambiente, cielo, skyLight)` | ◎ Inversión del realce + corte por umbral + puerta solar (R9.12). La sombra de árboles y bajo techos cae claramente, siguiendo ediciones de bloques en tiempo real |

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

## Receta integrada para agua de aspecto natural



Esta API no puede muestrear color de escena: es **estilizado pseudo con mezcla de color fresnel e iluminaciones solares, no reflejo/refracción reales** (el cálculo de profundidad llegó en v2 con `bloxdOpaqueBehind()`, separado en [Parte VIII](../history/v2.md) R-E). La muestra conserva el color base, mezcla un poco hacia un color cielo en ángulos rasantes y añade un pequeño destello solo con sol.

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

Pistas de ajuste:

- Agua blanca/lavada: baja `0.38` en `fresnel * 0.38` y el destello `0.55`.
- Agua muy oscura: mezcla algo más de `fakeSkyReflection`. En exceso parece plástico.
- Líneas o rayas regulares en el agua: baja frecuencias de ola y fuerza de destello. Este código no desplaza vértices de malla.
- Reflejos reales del paisaje: las entradas de esta API no tienen color de pantalla: mezclar colores jamás es reflejo real (profundidad solo limitada a líquidos. [Parte VIII](../history/v2.md) R-E).

Esta receta **reemplaza** un `bloxdLiquidLight` existente. No la pegues junto a la función de ola homónima de R9.7 ni otros hooks homónimos.


### Realidad submarina con paquetes de sombreadores



Los looks submarinos constan de 3 capas:

| Capa | Contenido | Operable desde paquetes? |
|---|---|---|
| ① Render de terreno/líquido | Procesable por hooks. Los hooks light se llaman con normalidad bajo el agua | Sí (funciona "bajo el velo") |
| ② Velo de definición líquida | Quad emissive de pantalla completa del color/alpha de definición del bloque líquido de la cámara, dibujado delante del todo. El ajuste `cameraTint` gana si existe | No (ni color ni densidad cambiables) |
| ③ cameraTint | Ajuste del juego | No |

Puntos prácticos: los paquetes siguen funcionando bajo el agua / el velo no se puede quitar / bajo el agua no se puede ramificar (fogStart / fogEnd / fogColour no cambian bajo el agua: fogVisibility tampoco lo detecta).

---

## Corregir "sombras oscuras pero superficies brillantes" de noche



Oscurecer solo sombras deja el color terminado (`engineColour`) brillante sin sol, y el salto cara/sombra se vuelve antinatural. Atenúa todo el color terminado.

El ejemplo trata `bloxdSunDirection()` cero como noche y sol direccional como día, atenuando los colores terminados del terreno en horas oscuras. Donde `blockLight` y `heldLight` son fuertes, la atenuación se debilita para preservar lámparas cercanas como antorchas. `0.52` es un valor de ajuste — bájalo para noches más oscuras.

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
    // atenúa el color terminado; suma la emisión del material con niebla por defecto
    out.colour = l.engineColour * scale + s.emission * (1.0 - l.fogAlpha);
    return out;
}
```

**Límites de esta corrección:** si `bloxdSunDirection()` se comporta como "dirección unitaria con sol, cero sin él", día/noche se distinguen pero el ocaso no se estima suavemente. Y como atenúa el color terminado, debilita juntos la luz diurna y el ambiente del motor — no es una reproducción total del horario. Para aplicar lo mismo a líquidos, revisa la relación de reserva de hooks de líquido.

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

## Dos escuelas de implementación



**Escuela A: retoques aditivos (desde defaultLight)** — usa `engineColour` (color terminado) como base y suma brillo cálido o rim. Fácil y seguro, pero el modelo de iluminación sigue siendo el por defecto.

**Escuela B: reiluminación total (desde s.colour)** — descarta `l.engineColour` y reconstruye la iluminación desde `s.colour` (albedo) y materiales LightIn crudos. El camino real al realismo. Cuatro reglas:

1. **Reaplica la niebla**: el hook light se ejecuta tras la niebla; aplica `mix(l.fogColour, col, (1.0 - l.fogAlpha))` tú mismo (R9.10). Con niebla densa, pon suelo con `min(l.fogAlpha, 0.70)`. Y al revés: mezclar más color de niebla en paquetes basados en engineColour produce doble niebla blanca
2. **Reserva unlit**: pasa a `defaultLight` fuera de `#ifdef BLOXD_LIGHTING`
3. **Protege funciones compartidas enteras**: envuelve en `#ifdef BLOXD_LIGHTING` como funciones completas las funciones compartidas que toman `BloxdLightIn` (proteger solo llamadas no basta)
4. **Sin dirección solar**: si `bloxdSunDirection()` es cero, no calcules especular direccional. `l.directional` es un escalar de cantidad de luz, no un vector de dirección: no restaura la dirección del brillo. Cambia a ambiente débil sin dirección si hace falta. La dirección lunar está disponible vía `-bloxdSunDirection()` (solo se mueve en mundos con ciclo día/noche. [Parte VII](../internals/) R-A)

---

## Looks inalcanzables (el "techo" del realismo)



| Look | Motivo |
|---|---|
| Mapas de sombras pixelados (sombras que rotan con el sol, penumbra) | Las texturas de profundidad no se pueden referenciar (`bloxdOpaqueBehind()` limitado a líquidos es solo geometría y no sirve como mapa de sombras). La oclusión de rayos no llega a los hooks |
| SSAO | Sin acceso a profundidad de escena (solo AO de vértices del mesher; la profundidad limitada a líquidos no sirve para SSAO) |
| SSR (reflejos) | Sin color de escena. Solo pseudo looks mezclando color de cielo vía fresnel |
| Bloom / glare | Sin hook al posprocesado |
| Profundidad de campo, aberración cromática, grano | Requieren posprocesado de pantalla completa |
| Luz volumétrica (god rays) | Igual |
| Texturas PBR | Lecturas de textura prohibidas. Solo pseudo estimación desde luminancia de color |
| Refracción submarina | Sin color de escena. La profundidad limitada a líquidos (`bloxdOpaqueBehind()`) permite absorción por grosor y proyección de fondo ([Parte VIII](../history/v2.md) R-E) |
| Velo submarino (tinte azul): quitar / cambiar | El velo es un quad emissive de pantalla completa generado del color/alpha de definición del bloque líquido de la cámara, dibujado fuera de los pipelines de hook (delante del todo): el paquete no puede cambiar ni color ni densidad |
| Detección directa submarina | Ninguna entrada indica sumersión de cámara, y fogStart / fogEnd / fogColour no cambian bajo el agua: tampoco hay forma fiable de estimarlo desde fogVisibility etc. |

### La verdad sobre las sombras — las "sombras de árboles" sí se pueden hacer

Solo los **mapas de sombras pixelados que rotan con el sol** son imposibles en la tabla. El motor ya calcula "sombras" desde el inicio, y eso es `skyLight`. El LightEngine del lado de malla usa un algoritmo estilo Minecraft:

1. **Escaneo de columnas**: recorre cada columna (x,z) de arriba abajo. La luz del cielo empieza en 15, se vuelve **0 en bloques opacos**, atenuando al bajar con `lightFilter` (aire 1 / agua 3 / opaco 15)
2. **Relleno BFS**: se expande lateralmente a 6 vecinos (-1 por bloque) — esto suaviza los bordes de sombra. El valor crudo bajo oclusión de radio r es (15-r)/15
3. blockLight (antorchas etc.) es un BFS separado de 3 canales RGB (empaquetado 4bit)

Así que `l.skyLight` no es un mero parámetro de brillo sino **dato de oclusión por vóxeles de "si el cielo es visible desde aquí" = un mapa de sombras**. Bajo árboles, bajo techos e interiores ya es numéricamente bajo, llegando suavizado por interpolación de vértices. Colocar/romper bloques recalcula al instante = **sombras que siguen en tiempo real**. Vanilla solo lo usa "suavemente" vía `mix(ambiente, cielo, skyLight)`.

Las herramientas correctas son los dos pasos de R9.12 (**restaurar valores crudos vía inversión del realce → binarizar con umbral `smoothstep`**. `th = 1 - r/15` marca directamente el "radio de oclusión tratado como sombra") más **abrir el sol directo con sky** (el sol solo llega donde el cielo es visible = la esencia de la proyección), con tinte cálido en sol / frío en sombra.

**Límites honestos**: estas sombras usan como base "el cielo hacia arriba", así que **no rotan cuando el sol se mueve**. La resolución es por bloque (los bordes suaves vienen de la dispersión BFS). La plantilla de iluminación aún contiene un stub cerrado `var shadow: f32 = 1.;` para mapas de sombras (siempre 1.0 = desactivado) — interpretado como rastro de sombras rotatorias pixeladas "planificadas". Si esas sombras son imprescindibles, solo quedan vías fuera de la API (p. ej. inyección GLSL por userscript, con riesgo de política).

### Realidad submarina

Los looks submarinos constan de 3 capas:

| Capa | Contenido | Operable desde paquetes? |
|---|---|---|
| ① Render de terreno/líquido | Procesable por hooks. Los hooks light se llaman con normalidad bajo el agua | Sí (funciona "bajo el velo") |
| ② Velo de definición líquida | Quad emissive de pantalla completa del color/alpha de definición del bloque líquido de la cámara, dibujado delante del todo. El ajuste `cameraTint` gana si existe | No (ni color ni densidad cambiables) |
| ③ cameraTint | Ajuste del juego | No |

Puntos prácticos: los paquetes siguen funcionando bajo el agua / el velo no se puede quitar / bajo el agua no se puede ramificar (fogStart / fogEnd / fogColour no cambian bajo el agua: fogVisibility tampoco lo detecta).

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

## Lista de pruebas en el juego



El éxito de compilación y el "buen aspecto" son cosas distintas. Revisa en este orden:

1. **Carga:** `pack.json` en la raíz del ZIP. Justo tras seleccionar aparece `Ready. Reload the page to use it.` y el paquete se activa **al recargar la página**; confirma después `Ready to use`. Los paquetes guardados se revalidan automáticamente en la siguiente carga de página: desde la parte del motor se comprueba el fingerprint del contenido de la cabecera (pasa = se mantiene tal cual / falla = se marca como bloqueado), así que un paquete antiguo roto nunca queda activo en silencio.
2. **6 variantes:** sin omisiones de guardias de tipos en strict / allow, iluminación on / off, terreno / líquido. Aunque un juego solo use algunas condiciones, los paquetes de distribución deben asumir las 8.
3. **Día:** colores sin reventar por material (hierba, piedra, arena, madera); salto claro/oscuro natural entre caras altas y laterales.
4. **Noche:** compara los mismos materiales a plena luz pasada, sombras y cercanía de antorchas. Si solo quedan caras iluminadas, ajusta la atenuación de exposición; si todo oscurece, ajusta la protección de luz local.
5. **Agua:** mira desde arriba, ángulos rasantes, orillas, bajo el agua y de noche por separado. El comportamiento alpha y el aspecto submarino dependen del compaginado del juego — nunca juzgues desde un solo punto de vista. Bajo el agua el velo del color de definición líquida se aplica al frente tal como se describe en [Parte VII](../internals/): las diferencias del paquete se ven sobre todo en la superficie y el terreno tras el velo.
6. **Bordes y distancia:** sin saltos de olas/patrones en transiciones de chunk / origen; sin doble niebla ni bruma blanca a lo lejos.
7. **Rendimiento:** efectos pesados en hash/trig/`pow` por fragmento al mínimo. Añade detalle poco a poco y compara FPS.

### Restricciones conocidas como premisas

- Los paquetes se limitan a hooks de terreno / líquido — sin manejo de cielo, entidades o UI con el mismo código.
- No existen entradas para añadir mapas de sombras, reflejos en espacio de pantalla, refracción, bloom, etc. (la profundidad de escena se desbloqueó limitada a líquidos como `bloxdOpaqueBehind()`. Ver [Parte VIII](../history/v2.md)).
- `bloxdSeconds()` es tiempo de animación sin vínculo garantizado con el día/noche del juego.
- Con `bloxdSunDirection()` cero la verdadera dirección lunar es desconocida, no "física de luz lunar" sino aproximación de ambiente. La luz lunar direccional se construye desde `-bloxdSunDirection()` (solo mundos con ciclo día/noche. [Parte VII](../internals/) R-A).
- `s.position` / `l.position` son coordenadas locales: suma `bloxdRenderOffset()` para efectos dependientes del mundo. Para patrones locales del bloque, las coordenadas locales son la herramienta intencionada.

---

## Combinar con otros paquetes cuando el sombreador solo llega a su límite



Como los paquetes no pueden añadir ni muestrear texturas, no intentes resolver bultos finos de material o imágenes del cielo solo con sombreadores. El repositorio público de paquetes de texturas para Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) maneja texturas, skybox, modelos, etc. por otra vía.

Como referencia, distribuciones comunitarias "cinematic shader" analizadas en un caso resultaron ser paquetes de texturas (texturas 128x128 sin `pack.json` / `.wgsl`).

En la práctica, **ajusta luz y color con sombreadores y cubre materiales y cielo con un paquete de recursos a juego**. Pero verifica el co-uso y el orden de carga según la implementación y ajustes del juego.

Los paquetes de texturas tienen su propia especificación (a título de referencia): el límite de tamaño es 25MB medido como la longitud de la cadena JSON codificada en base64; y codificar un PNG en base64 infla un +33%, así que el techo práctico en imágenes crudas queda en ~18–19MB. El CSS lo procesa un parser simple basado en regex — evita anidamientos y comentarios.

---

## Consejos de depuración



- Cuevas muy claras → falta curva no lineal de `skyLight` (receta de cuevas R2 / R9.9)
- Días quemados → baja la exposición pre-ACES
- Noches demasiado oscuras → asegura ambiente mínimo (el `skyLightColour` nocturno es casi negro por premisa)
- Distancia con demasiada bruma → baja coeficientes aéreos
- Todo naranja en torno a antorchas → baja la proporción cálida (conserva algo de luz cruda teñida)
- Bloques casi todo blancos → el total de salida del hook light supera 1.0 (sin clamp aguas abajo). Termina con `clamp(col, vec3f(0.0), vec3f(1.0))`
- Blanco sin sumas → inversión un-fog por división con fogVisibility. Quita un-fog; reconstruye desde `s.colour` y `mix` de niebla una sola vez al final
- Bloques emisivos no brillan → falta re-suma de emission en recetas de reconstrucción. Suma `+ s.emission * (1.0 - l.fogAlpha)`
- De noche solo quedan caras iluminadas → no oscurezcas solo sombras; atenúa todo el color terminado (`engineColour`) de noche. Para conservar lámparas locales, atenúa menos con `blockLight` / `heldLight` ([Parte VI](../guides/), sección 19)
- La sombra no se profundiza con `pow(skyLight, γ)` → `l.skyLight` es post-curva (sección 10). Cambia a inversión + umbral de R9.12
- Ajustar área/densidad de sombra → guía de ajuste de R9.12 (área = umbral `shTh` / borde = `shSoft` / oscuridad del núcleo = doble ajuste de ambiente mínimo y dispersión del cielo)

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

## Recetas de color (surface)



### Tinte único (lo más básico)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Subir / bajar saturación

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 vívido / -1.0 monocromo total
```

### Temperatura de color (cálido ⇄ frío)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = cálido (rojo fuerte), -1.0 = frío (azul fuerte)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### Vintage / sepia

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### Gradiente de altitud (tierras bajas cálidas)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 1..0 en altura 0..50
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Pintar por orientación (arriba = claro, paredes = oscuro)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // suelo 1 / pared 0 / techo -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // paredes y techos algo más oscuros
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Posterizar (menos colores)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

---

## Recetas de iluminación (light)



### Curva S de contraste

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### Neblina de distancia (niebla propia)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 0..0.35 de niebla propia de 64 a 192 bloques
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### Noche (tinte azul por skyLight + protección de lámparas)

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

### Cuevas a oscuras (oscurecer más donde no hay skyLight)

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

> `skyLight` llega post-realce (sección 10): la oclusión leve (bajo árboles: crudo 0.87 → realzado 0.97) apenas oscurece con este método. Sirve para cuevas (crudo 0). Para marcar la "sombra de árboles", usa inversión + umbral de R9.12.

### Azul nocturno ambiental (pseudo look sin dirección lunar)

> En esta API, `bloxdSunDirection()` es cero cuando el cielo no tiene sol. Lo siguiente no es luz lunar direccional, solo un tenue ambiente azul cuando el cielo está oscuro. La dirección lunar en sí está disponible vía `-bloxdSunDirection()` (solo mundos con ciclo día/noche. [Parte VII](../internals/) R-A).

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

### Calidez de atardecer (tinte por altura del sol)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 en horizonte / 0 en cenit
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### Reemplazo total de la salida del motor (reiluminación simple)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    if (bloxdLit()) {
        // NOTA: la construcción directa de BloxdLight(...) está prohibida; reescribe colour desde default
        var out = bloxdDefaultLight(s, l);
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let level = clamp(sky * 0.7 + block, 0.0, 1.0);
        // descarta engineColour (el resultado de iluminación del motor) y usa "color base × brillo calculado"
        var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));   // descartado engineColour: rehacer niebla es obligatorio
        out.colour = col + s.emission * (1.0 - l.fogAlpha);   // suma emission tú también (obligatorio)
        return out;
} else {
        return bloxdDefaultLight(s, l);
}
}
```

---

## Recetas de emisión



> `emission` se suma tras el cálculo de iluminación, pero el proceso por defecto **lo atenúa con `fogVisibility`. En distancia totalmente anegada la emisión también desaparece. Para mantener brillo a lo lejos, no sumes a emission — suma directamente como `out.colour += ...` dentro del hook light** (engineColour ya lleva niebla, así que a lo lejos la luz cae sobre el color de niebla)

### Lámparas pulsantes (antorchas que respiran)

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

### Aspecto de mena luminosa (los materiales claros emiten)

```wgsl
// lado surface: cuanto más claro (blanco) el material, más emisión
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### Enjambre de luciérnagas (puntos de luz a la deriva)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // unos "orbes de luz" a la deriva lenta; brillo por inverso de distancia
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

## Recetas de coordenadas (mundo / bloque / vista)



### Coordenadas de mundo

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### Coordenadas de bloque

```wgsl
let worldBlock = vec3i(floor(bloxdWorldPosition(l.position)));
```

### Damero (por bloque)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 o 1
out.colour *= mix(0.96, 1.04, checker);
```

### Pseudoaleatorio por bloque (hash)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// usos: variación de hierba, moteado de piedra, etc.
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### Vector de vista y luz de borde (rim)

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### Ángulo de vista (fresnel casero — para líquidos)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 de frente / 0 rasante
let fresnel = pow(1.0 - facing, 3.0);
```

---

## Recetas de tiempo (animación)



> `bloxdSeconds()` se envuelve cada 3600 segundos (1 hora). Es tiempo transcurrido del sombreador sin garantía de sincronía con el día/noche del juego. Úsalo para animación periódica visual, pero prefiere `bloxdSunDirection()` y las entradas de iluminación para detectar la noche real.

### Ciclo día-noche (1 día por hora)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdSeconds() * 6.2831853 / 3600.0);   // 0..1 período de una hora; no necesariamente sincronizado con el día/noche del juego
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### Oscilación (senos superpuestos)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### Bandas de aurora / franjas fluorescentes

```wgsl
// mezcla 3 colores por posición XZ y tiempo
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

---

## Recetas de líquidos



### Superficie rizada (parpadeo de color)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdRenderOffset().x);
    let worldZ = s.position.z + f32(bloxdRenderOffset().z);
    let ripple = sin(bloxdSeconds() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid siempre tiene BLOXD_ALPHA — guardia por costumbre
    #endif
    return out;
}
```

### Transparencia pseudo por altura (no es una prueba real de bajío)

> En v1, la profundidad de escena y la posición del fondo no se podían consultar: la profundidad real no se calculaba solo con aquella API. En v2, `bloxdOpaqueBehind()` limitado a líquidos mide el grosor hasta la cara opaca trasera ([Parte VIII](../history/v2.md) R-E). Lo que sigue es el viejo pseudo efecto sin ello: `s.position.y` es coordenada local y usarla cruda desplaza el efecto con el origen del chunk. Para altura de mundo convierte con `bloxdWorldPosition()`. El trecho solo varía alpha por altura de mundo — pseudo efecto, no bajío por costa/fondo. Ajusta `packWaterReferenceY` a tu altura de mundo.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // más fino a baja altura, más cerca del alpha base arriba; verifica la dirección en el juego
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### Turbidez submarina desde dentro

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### Paquete solo-líquidos (terreno intacto)

```wgsl
// no escribas ningún hook terrain_*. Entonces:
//  - variantes terrain = sin hooks = valores por defecto del motor
//  - variantes liquid  = solo actúan los hooks liquid_*
```

---

## Recetas de vértices (solo allow)



> Envuelve todo en `#ifndef BLOXD_STRICT`.
> Para las condiciones exactas (lista de títulos allow; Custom Games es estricto) ver §30: [§30 Modos de aplicación por juego](../internals/)

### Hierba al viento (mueve solo las puntas)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdSeconds() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // solo caras verticales
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### Olas en líquido (solo caras superiores)

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

### Terreno pulsante

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdSeconds() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // leve expansión/contracción a lo largo de normales
    return out;
}
#endif
```

### Terreno ondulante (olas seno gigantes)

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

## Trucos matemáticos



```wgsl
// cuantización suave de 0..1 (n pasos)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// umbral de 2 niveles (sombra toon)
let shadow = smoothstep(0.35, 0.37, level);   // ±0.02 en torno al umbral crea escalones

// toon de 3 niveles
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// luma (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// pulso suave
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// onda triangular (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// segundos → "fase lenta" (para efectos que ignoran el ciclo de 3600 s)
let phase = t * 0.15;
```

---

## Recetas realistas



> Recetas físicas para "reconstruir el aspecto vainilla desde los materiales". Lee estas premisas primero:
>
> 1. **El hook light se llama en la etapa final del fragmento**. Su color devuelto se convierte en el color final tal cual. **Debes reaplicar la niebla tú mismo** (R9.10)  
> 2. **La iluminación por defecto del motor es solo multiplicación**. Especular / fresnel / separación cálido-frío / ambiente hemisférico se construyen desde cero  
> 3. `l.engineColour` es el color terminado (ya con niebla). Reconstruir desde `s.colour` (albedo) es el enfoque completo  
> 4. Las texturas están prohibidas → todo el detalle debe ser **procedural** (hash/ruido) (R9.8)

### R9.1 Antorchas cálidas × luz de cielo fría

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
        let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
        let voxel   = max(torch, sky);
        var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // clamp intermedio
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                    // rehacer niebla
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                 // re-sumar emission
}
    return out;
}
```

### R9.2 Especular solar (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);          // vector medio
            let ndh = max(dot(n, h), 0.0);
            let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
            let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
            out.colour += spec * vec3f(1.0, 0.97, 0.90);
        }
}
    return out;
}
```

### R9.3 Fresnel de Schlick

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
        out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // tenue brillo de borde
}
    return out;
}
```

### R9.4 Ambiente hemisférico (cielo arriba / rebote del suelo abajo)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let upness = n.y * 0.5 + 0.5;
        let ground = l.ambientLightColour * 0.55;                          // abajo: rebote
        let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // arriba: luz del cielo
        let hemi = vec3f(0.25) + mix(ground, skyH, upness);
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // clamp intermedio
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                           // rehacer niebla
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                        // re-sumar emission
}
    return out;
}
```

### R9.5 ACES fílmico (aproximación de Narkowicz)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = exposición
    return out;
}
```

### R9.6 Perspectiva aérea ("atmósfera" por desaturación con distancia)

> A diferencia de la niebla (reemplazo de color), superponer "desaturación con distancia" hace las vistas lejanas mucho más realistas.  
> Precaución: reduce solo la saturación — nunca toques la luminancia.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // caída (~30% a 100blk / ~75% a 400blk)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // solo baja saturación (luminancia intacta)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 Normales de ola + destello solar ("camino del sol" en el agua)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // altura h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
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

### R9.8 Micro-relieve procedural (truco ante la prohibición de texturas)

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
        let local = fract(l.position - l.normal * 0.5);   // coords locales del bloque
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

### R9.9 Oscurecimiento no lineal de cuevas + protección de lámparas

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let keep = 0.12 + 0.88 * blockInt;          // levanta focos con lámparas
        out.colour *= mix(keep, 1.0, sky * sky);     // oscurecimiento no lineal (al cuadrado)
}
    return out;
}
```

### R9.10 Reaplicar niebla (obligatorio al descartar engineColour)

> Poner un suelo como `min(l.fogAlpha, 0.75)` limita "no más denso que esto"
> (0.0 = fiel al motor / 0.3–0.5 = distancia más clara).
> Nota: la niebla del motor es lineal solo de horizonte (cerca de la distancia de dibujado); la bruma media debe construirla el paquete.
> Ajustes reales de niebla (verificados en implementación): linear fijo / `fogStart` = distancia de chunks / `fogEnd` = +1 chunk / efectivamente desactivada a 100–101 chunks con niebla off / color por defecto RGB(183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = s.colour * (voxel * 1.1 + vec3f(0.05));
        col = clamp(col, vec3f(0.0), vec3f(1.0));
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));  // rehacer niebla (0.15 = suelo ligero)
        col += s.emission * (1.0 - l.fogAlpha);            // emisión también con niebla
        out.colour = col;
}
    return out;
}
```

### R9.11 Grado cine (sombras frías / altas cálidas / desaturación nocturna)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let lum = pack_luma(out.colour);
        out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;  // noche solo cuando la dirección solar es cero; sin degradado de ocaso
        out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
}
    return out;
}
```

### R9.12 Sombras proyectadas — inversión del realce + corte por umbral (definitivo)

> **Repaso de la premisa (sección 10)**: `l.skyLight` no es el valor de vóxel crudo (n/15) sino el valor tras la "curva de realce" del motor  
> `y = 1-(1-x/(3-2x))³` (una curva S que levanta zonas oscuras).
>
> | Lugar | vóxel crudo | realzado (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | cielo abierto | 1.00 | 1.00 | 1.00 |  
> | bajo árbol (radio 2) | 0.87 | **0.97** | **0.86** ← casi intacto |  
> | radio 3 | 0.80 | **0.92** | 0.66 |  
> | radio 5 | 0.67 | 0.78 | 0.29 |
>
> **Esta es la causa demostrada de "las sombras no se profundizan con gamma"**. Pero la curva es monótona e invertible algebraicamente:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Tras restaurar valores crudos, basta binarizar con un corte por umbral (`smoothstep`).  
> La dispersión BFS de LightEngine es "1 bloque = -1", así que el umbral `th = 1 - r/15` marca directamente  
> "la oclusión de radio r o más cuenta como sombra". Romper bloques mueve las sombras al instante (LightEngine recalcula en tiempo real).  
> Limitación: las sombras usan como base "el cielo hacia arriba", así que no rotan con el sol (sección 15, "La verdad sobre las sombras").

```wgsl
// Invierte exactamente el realce del motor para restaurar el skyLight de vóxel crudo (n/15)
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // sin cbrt en WGSL, usa pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // dial de radio de sombra: th = 1 - r/15 (0.87 = radio 2+ es sombra)
const shSoft = 0.04;   // suavidad de borde (0.02 = duro / 0.08 = suave)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // 1. restaura valores crudos (saltarlo jamás da sombras)
        let skyRaw = sh_unlift(l.skyLight);
        // 2. corte por umbral — separa limpiamente sol=1 / sombra=0
        let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
        // Lambert solar (recurre a l.directional cuando no hay sol)
        let sunLen = length(bloxdSunDirection());
        let sunL = select(clamp(l.directional, 0.0, 1.0),
                          clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                          sunLen > 0.5);
        // la esencia de la proyección: el sol directo solo llega donde el cielo es visible
        let lit = sunL * sky;
        // lado sombra: teñido azul cielo, no negro + ambiente mínimo
        let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
        var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
        // la luz de antorcha atraviesa sombras (blockLight también realzado: restaura junto)
        let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                             sh_unlift(l.blockLight.g),
                             sh_unlift(l.blockLight.b));
        let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
        col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
        // reaplica niebla (la parte del engineColour descartado)
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));
        out.colour = clamp(col + s.emission * (1.0 - l.fogAlpha), vec3f(0.0), vec3f(1.0));   // no olvides emission (con niebla)
}
    return out;
}
```

> Guía de ajuste: **el área de sombra la decide solo `shTh`** — `0.93` = radio 1.5+ / `0.87` = radio 2 / `0.80` = radio 3 / `0.67` = radio 5.  
> La dureza del borde es `shSoft` (0.02 = duro / 0.08 = suave). La oscuridad del núcleo es el doble ajuste de `0.09` (ambiente mínimo) y `0.16` (luz dispersa del cielo).  
> Para ensanchar sombras al atardecer, suma `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (aproximación de sombras largas de tarde.  
> `sunDir` es `bloxdSunDirection() / length(bloxdSunDirection())`). Para sombras más azules sube el B de `vec3f(0.72, 0.82, 1.05)`.
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

## Detalles de pipeline



- **Los hooks surface corren "antes" de alphaTest**: `out.alpha` alimenta el test de descarte directamente. Los materiales cutout (hierba, hojas) permiten efectos de disolución tipo dither (receta R-C). En líquidos (mezclado) `out.alpha` es la transparencia real (receta R-D). Sin efecto en terreno opaco normal — no confundir
- **Contenido de `l.ambient`**: `material.ambient × sceneAmbient`, distinto por material. El lado escena ata al ajuste gráfico "Ambient Lighting Intensity" (defecto 0.5) — nunca programes defectos fijos
- **`bloxdSeconds()` es realmente `performance.now()`**: el uptime del navegador envuelto a 1 hora. Sin relación con día/noche del juego ni tiempo de mundo transcurrido. Para animar sincronizado a un reloj de juego, estima la hora desde el azimut `bloxdSunDirection()` en mundos con ciclo día/noche
- **Las luces direccionales de la escena son un montaje de 2**: la suma Lambert de la luz principal (dirección desde la posición solar del ajuste de cielo, intensidad 1.0) y la luz de relleno (dirección `[-0.5, -1, -1]`, intensidad 0.35) llega a `l.directional`. La luz de relleno apunta hacia abajo, así que no aporta a las caras superiores y recoge las superficies orientadas hacia abajo (techos de cueva etc.). El terreno solo considera las luces añadidas en `_initScene`; las luces añadidas a la escena tras el arranque son ignoradas por terreno y modelos de bloque (un mensaje de advertencia oficial lo dice así)
- **Las funciones de cabecera leen un solo uniform**: el motor coloca un uniform de 64 bytes en `@group(3) @binding(0)` (4 slots — time / originOffset / sunDirection / eyePosition, little-endian), y `bloxdSeconds()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` corresponden a leer esos slots. Los paquetes no pueden escribir este uniform, y como el WGSL del paquete y el del motor se fusionan en un solo módulo, declarar el mismo group/binding por tu cuenta también es imposible. (En v3 los dos slots se renombran a `seconds` / `renderOffset`, expuestos como `bloxdSeconds()` / `bloxdRenderOffset()`, y se añade la textura de profundidad de escena en `@group(3) @binding(1)`; ver [Parte IX](../history/v3.md) §41 y §51.)
- **Los datos de vértice los construye el mesher (Web Worker)**: el terreno de bloques viaja intercalado a 28 bytes por vértice (32 bytes con el atlas activado) — position = float32×3 / normal = enteros de 8 bits con signo ×4 / colour = enteros de 8 bits normalizados ×4 (la sustancia de `s.colour` — tint × AO queda horneado en 8 bits en la etapa del mesher, con lo que separarlo o restaurarlo desde el paquete es imposible en principio) / UV = float32×2 / atlasIndex = float32. Solo los niveles de luz viajan en un buffer de vértice aparte de 4 bytes ([Parte VII](../internals/), sección 26, [Parte II](../api/), sección 11). Los vértices se dibujan con instancing por chunk
- Los finos dameros en bordes de chunk al cargar son el fundido de chunk por dither Bayer 4×4 en espacio de pantalla del motor, no bugs del paquete (desactivable por el ajuste gráfico `chunkFadeIn`)
- **`mod` es palabra reservada**: rechazado con `pack.wgsl:3 'mod' is a reserved word in WGSL.` Escribe restos con el operador `%`

### R-C. Disolución por dither Bayer — out.alpha controla discard

Reproduce la **misma tabla Bayer 4×4** que el motor usa en fundidos de chunk, disolviendo cutouts desde bloques bajos. discard se activa en materiales alphaTest (hierba, hojas); en líquidos es transparencia de mezcla.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod es reservado: usa el operador %
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
    // se disuelve desde bloques bajos; mayor dissolve persiste
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. Fundido de agua cercana a cámara — el alpha líquido despeja la vista

El `out.alpha` del hook líquido alimenta la mezcla directamente. Despeja solo la superficie bajo la cámara para asegurar la vista al bucear o con cámara sobre el agua.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 bloques de transparente total a normal
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

## Interioridades de blockLight / heldLight



`blockLight` es **luz coloreada** de tres canales RGB. Cada bloque emisor define un color de emisión `[R, G, B]` (0–15 en cada uno) que queda como color de la luz tal cual (antorcha normal = blanco cálido (14,14,12) / lava = naranja (14,8,2) / beacon = cian (5,14,14) / antorcha blanca = (15,15,15), etc.). En la etapa vértice llega empaquetado como 4 nibbles — r / g / b / sky — en un solo atributo float. Tratar los tres canales por separado dentro del hook light habilita una iluminación local coloreada — la receta de antorcha cálida (R9.1) está calibrada contra este comportamiento.

Al decodificar `aPackedLightLevels`, el motor pone a cada canal un **suelo del 35% del canal RGB más brillante**. P. ej. una "luz roja pura" se eleva a (1.00, 0.35, 0) en vértices antes de interpolación y realce. El naranja de antorcha viéndose "rosa blanquecino más que rojo" viene de aquí — ajusta la saturación de recetas de antorcha cálida (R9.1) contra este default.

La composición de la iluminación no es aditiva. Internamente el motor toma el **max** entre la luz de bloque (tras el suelo del 35%) y la luz de cielo construida como `mix(ambientColour, skyColour, skyLight)`, y toma max otra vez con la luz de mano (tras su boost ambiental). Los valores de canal de esta composición son los valores **post-realce** — el motor compone a partir de los mismos niveles de luz realzados que llegan a las entradas del hook (`terrainLightLevels` tras la curva de realce), tanto en v2 como en v3. Por tanto `blockLight` y `skyLight` nunca se anulan entre sí — la contribución del lado más oscuro simplemente se descarta — con lo que debilitar la luz de cielo apenas oscurece los puntos dominados por la luz de bloque. Diseña las recetas de exposición/atenúa sobre esta estructura (la protección de luz local de [Parte VI](../guides/), sección 19 existe para compensarlo).

La luz de mano (`heldLight`) tiene alcance según el canal más brillante (máx 15 bloques) con preproceso `dist^0.75`, el mismo suelo 35%, y `l.heldLight` es el valor **pre**-boost ambiental. La caída del cono, restaurada del módulo de luz del motor: la atenuación angular del haz es `1 − 0.5 × (smoothstep(0.12, 0.65, t) + smoothstep(0.62, 0.95, t))`, donde `t` es el ángulo normalizado respecto al eje del cono (0 = centro, 1 = borde); el alcance es `(rangeOverride > 0 ? rangeOverride : canal más brillante) × caída del cono`, con `rangeOverride` leído del alfa del color de la luz sostenida; dentro del alcance, un override atenúa por `(range − dist) / range`, mientras que el valor predeterminado resta la distancia (preprocesada) canal a canal; después vienen el suelo del 35%, la división por 15, la curva de realce y, por último, el boost ambiental. Los objetos personalizados pueden fijar `spotlightRange` y ángulo de cono — un modo "haz mientras se sostiene" cuyo cono sigue a la cámara. Los paquetes no pueden saber la dirección del haz.

Los bloques personalizados pueden llevar `skyLightEmission` (0–15), que **inyecta al propio canal skyLight, aparte del BFS de blockLight**. Los paquetes estilo R9.12 que juzgan sol/sombra por umbral skyLight pueden fallar en mundos con skyLight elevado por luces artificiales. Los paquetes de distribución juzgan más robusto combinado con blockLight.

---

## Interioridades de la niebla



El cómputo de niebla es siempre modo LINEAR (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), con `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = ajuste de niebla; solo D = 0 es especial con fogEnd = 5). **La banda de gradiente es de solo 32 bloques**, y `(1.0 - l.fogAlpha)` es menos "bruma por distancia" que **distancia normalizada al borde del mundo cargado**. Varía por jugador con la distancia de carga: los efectos por distancia deben calcular `distance(l.position, bloxdEyePosition())` ellos mismos (receta R-B). (Nota de v3: la función de niebla del renderizador implementa en realidad **cuatro** modos — off / exponencial / exponencial al cuadrado / lineal — con los títulos distribuidos activando el lineal; el código fuente restaurado y el argumento de robustez están en la [Parte IX](../history/v3.md) §50.)

Color de niebla por defecto `rgb(183, 191, 195)` (gris azul pálido). Los creadores de mundos lo cambian vía `fogColourOverride` (hex). Con modo niebla 0 (NONE), **fogColour llega negro**. La forma estándar `mix(l.fogColour, col, (1.0 - l.fogAlpha))` es segura pues el color de niebla no se usa a fogVisibility 1. La API de script tiene además dos opciones, `fogChunkDistanceOverride` y `fogOnSkybox`: juegos personalizados pueden fijar a la vez la distancia de niebla (el valor D) y la aplicación de niebla al skybox. Por defecto el skybox no es afectado por la niebla (solo en juegos con `fogOnSkybox` activado el skybox también se tiñe con el color de niebla).

Ajustar `showFog` a false empuja la niebla a 3200–3232 bloques, desactivándola de hecho (`fogVisibility ≈ 1` sigue viniendo).

### R-B. Banda de borde de carga — fogVisibility como "borde del mundo"

Enfría en silencio solo la banda de 32 bloques del borde de carga para disimular el fin del mundo (o enfatizarlo como efecto). Sin distancia autocalculada: sigue auto los ajustes de distancia de carga del jugador.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = dentro (margen al borde), 0 = a punto de salir del borde
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

## Qué cambia los valores visibles del paquete — lista de pruebas



El mismo paquete renderiza distinto según **mundo y ajustes de jugador**. Revisa al menos estos 3 entornos antes de distribuir:

1. **Mundo normal** (skybox default, sin overrides) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, colores por defecto
2. **Mundo con skybox espacial** — bloxdSunDirection() = 0. El look de la rama `sunPresent`
3. **Mundo personalizado con `visionMinLightColour` / `skyLightColourOverride`** — oscuros elevados y colores

Fuentes principales de variación: `lightingOverride` (iluminación forzada) / `skyLightColourOverride`, `ambientLightColourOverride` (cambios hex) / `visionMinLightColour` (suelo "color más oscuro visible". Implementado como max por componentes contra `uSkyLightColour` y `uAmbientLightColour`; Night Vision lo usa — los paquetes "cueva a oscuras" no oscurecen lo previsto, y el color del cielo en sí se eleva) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (presencia de bloxdSunDirection()). `uSkyLightColour` por defecto = (1,1,1) blanco, `uAmbientLightColour` por defecto = (0.25,0.25,0.30). `l.ambient` lado escena = ajuste gráfico "Ambient Lighting Intensity" (defecto 0.5). `(1.0 - l.fogAlpha)` sigue los ajustes de niebla/distancia de chunks del jugador. Además `cameraTint` (tinte RGBA sobre toda la pantalla) y `proximityFadeDistance` / `proximityFadeMinOpacity` (fundido de proximidad de cámara para entidades) son factores de variación por ajustes de mundo — `cameraTint` en particular es un pase de composición final aplicado **sobre** la salida del paquete. Muchos de estos se fijan también vía la API de script (`serverOption`) y pueden actualizarse con la partida en marcha.

---

## Modos de aplicación por juego (`shaderPackPolicy`)



Aquí queda precisado lo que significan `allow / strict` a nivel de título (cf. §7). Solo los títulos cuya definición de juego lleva de forma explícita `shaderPackPolicy: "allow"` funcionan en modo completo (hooks vertex, `discard`, `alpha` de terreno); los títulos sin valor (o con un valor distinto de allow) son estrictos: se define `BLOXD_STRICT` y el código dentro de guardas se desactiva automáticamente. El lado del paquete no puede elegir esto, así que saber qué títulos ejecutan qué es un prerrequisito de la distribución.

- Build de referencia: `szby6g.main.94a7596c.js` (despliegue en producción a fecha de 2026-10-17). Enumerando estáticamente las 111 definiciones de juego: **26 entradas allow (12 títulos) / 85 entradas estrictas**. Los mismos 12 literales allow en los mismos 12 títulos se reconfirmaron sin cambios en el bundle de producción v3 (`3ymzdd`, 2026-10-20) — la lista de abajo se traslada tal cual a v3.
- Encima de `shaderPackPolicy` hay una compuerta por canal de distribución (aprox. `canUseShaderPacks`): en builds de portales externos (Coolmath Games etc.) el sistema de shader packs se puede desactivar antes de llegar siquiera a leer `shaderPackPolicy`. El análisis allow/strict de abajo parte del build web principal de bloxd.io.
- allow se declara en 12 lugares: 8 literales directos en definiciones de juego y 4 variables base (`tb` / `kz` / `cb` / `Fb`); las variantes lo heredan por spread (`{...tb,...}`). Hoy no existe ninguna sobreescritura por variante (tampoco el patrón inverso padre-allow / hijo-estricto).

Los 12 títulos allow (26 entradas en total):

- **Test Gym** — base + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (11 entradas)
- **Doodle Cube** — base + Solos / Duos (3)
- **Rocket Obby** — base + Sheep / January (3)
- **9 títulos individuales**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

En el lado estricto, los casos que más confunden:

- **Superflat Creative (classic_creativeFlat) es estricto.** El nombre contiene "Creative", pero en la familia classic solo el Creative normal (`classic_creative`) es allow. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns etc. son todos estrictos
- **Custom Games (customGames) es estricto.** Los efectos de hooks vertex no se disparan en juegos personalizados creados por el usuario. Para el trabajo de verificación, Test Gym es la opción segura
- Los títulos principales PvP / de servidor como bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) son todos estrictos

En los títulos estrictos el paquete sí se carga y compila, y las recetas del lado fragment como surface / light funcionan con normalidad. Lo restringido: los hooks vertex (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard` y la `alpha` de terreno (en líquidos existe siempre).

Esta lista refleja el análisis estático del build indicado; las actualizaciones del motor pueden cambiar el reparto allow/strict. Vuelve a comprobarlo al salir versiones nuevas.

---

## Identidad del sol y la luna



La fuente de `bloxdSunDirection()` es un búfer de dirección solar reescrito solo cuando cambia el tipo de skybox — el criterio no es "si el cielo tiene sol" sino **"si el skybox es tipo tierra"**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (cielo procedural) | No cero (defectos abajo) |
| `gloomy` / `interstellar` / `space_*` (texturas cubo) | **Siempre (0,0,0)** |

**La luna está siempre en `-bloxdSunDirection()`** (el motor calcula la posición lunar como el opuesto exacto del sol). La noche se juzga por altura solar — hay luna arriba cuando `bloxdSunDirection().y < 0` (sol bajo el horizonte). Pero en mundos por defecto el sol está estático y la luna también — solo los mundos con ciclo día/noche la ven moverse.

La dirección solar por defecto ronda `(-0.56, 0.81, -0.18)` (vector unitario de inclination = −0.2 / azimuth = 0.55, estático). Referencia práctica para predecir direcciones de brillo al probar paquetes de distribución.

Los ciclos día/noche no están integrados en el motor — inclination es un número estático que los mundos con día móvil actualizan lado juego. `bloxdSunDirection()` sigue cada actualización.

Las luces direccionales del terreno son solo 2 lámparas creadas al arrancar escena, de **dirección e intensidad fijas, sin cambio día/noche**. En corto: **ningún factor de brillo del terreno depende del tiempo. Los "looks" día/noche vienen solo del skybox y bloxdSunDirection()**, así que los paquetes que oscurecen de noche deben estimar la franja horaria desde bloxdSunDirection() (la técnica `sunPresent` de §19).

### R-A. Luz lunar direccional — moonDir = −bloxdSunDirection()

Añade Lambert blanco-azulado y especular débil solo mientras la luna está arriba. `moonUp` es 0 en mundos de sol estático por defecto: allí no pasa nada — **luz lunar que solo se activa en mundos con ciclo día/noche, luego segura**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // la luna está siempre exactamente opuesta al sol; auto-off diurno vía moonDir.y < 0
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

## Medios de depuración



- Parámetro URL `?renderer=lite` — fuerza el renderizador Lite (WebGPU) (`webgl2` / `babylon` también valen; `babylon` es el nombre antiguo de webgl2). Prioridad: parámetro URL > localStorage `bloxdRenderer` > pantalla de ajustes > defecto (webgl2). Valores inválidos se ignoran con advertencia. Los overrides dejados en la URL o en localStorage pueden romper escenas que necesitan WebGPU (lite) junto con "needs the new WebGPU renderer, so remove the renderer override..." ([Parte V](../troubleshooting/), sección 17)
- Parámetro URL `?vconsole` — consola en pantalla (VConsole). Útil en verificación móvil real
- Parámetro URL `?drawcalls=1` — añade un panel de debug de estadísticas de draw. Escogiendo objetos del juego desde la consola de debug, o con `drawCalls()` / `why()` / `configureDrawCallWatching()`, sirve para inspeccionar overdrawing por mecanismos grandes (pack o no) y el enfoque al límite de ~65,000 vértices por draw call — útil para aislar cuellos de rendimiento
- La consola muestra `noa-engine v0.33.0` y `Renderer: lite from <fuente>` — revísalos primero para no diagnosticar mal la vía de render
- El renderizador WebGPU se bloquea "forzado ON" con paquete aplicado. El ajuste "Disable Block Texture Atlas" también se bloquea (el atlas queda ON), y en entornos sin WebGPU el paquete ni aplica. Base para escribir "necesita navegador WebGPU" en páginas de distribución
- Las texturas de bloque son una textura en 2D array (`texture_2d_array`) y el sampler del terreno es nearest + repeat. El mesher además fusiona caras con el mismo material / AO / luz en un solo rectángulo (**greedy meshing**), así que el UV de una cara fusionada puede exceder una anchura de tesela (bordes metidos 0.0015). El direccionamiento repeat del hardware sostiene la repetición, por eso las caras fusionadas se ven continuas. Ojo: el detalle procedural anclado a `vUV` se puede romper en los límites de caras fusionadas — anclalo mejor a la posición en el mundo (`s.position` + `bloxdRenderOffset()`)
- La revalidación runtime por partida (`checkCompilation`) compila materiales de terreno reales en WebGPU del navegador (más estricta que la validación estática de ajustes). Los paquetes que fallan aquí se excluyen de ese juego

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
