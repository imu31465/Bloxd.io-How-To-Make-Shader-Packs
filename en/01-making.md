[Back to the manual](README.md)·[Next part →](02-api.md)

# Part I: Making packs

> The live game has required `apiVersion: 4` since 2026-10-26 and rejects v1/v2/v3 packs at load — the content below is written against the v2 specification; see [Part IX](09-apiv3.md) and [Part X](10-apiv4.md) for migration before you distribute anything.

## 1. Overview and prerequisites

- Shader packs are **WebGPU renderer only**. While a pack is installed, the WebGPU renderer is force-enabled in settings
- Packs are written in a **restricted subset of WGSL**. They affect only the look of **terrain and liquids**
- What you can do: change colors, transparency, and emission; rebuild lighting; projected-style shadows (R9.12); vertex animation (only in certain games)
- What you cannot do: add textures of your own, post-processing (bloom etc.), pixel-accurate shadows that rotate with the sun (shadow maps) or real reflections (SSR), or affect the sky and entities. (Sampling the existing block-texture atlas **became possible in v4** — `bloxdTexel`, [Part X](10-apiv4.md) §57; adding textures is still the texture-pack system's job)
- What you can do (but is easy to miss): **projected-style shadows using `skyLight` (voxel sky occlusion)** — you can clearly darken areas under trees and roofs (R9.12). Breaking blocks makes LightEngine recalculate immediately, so shadows follow in real time
- **Most games run in strict mode** (no vertex animation, no `discard`). Design packs for general distribution to work in strict mode

## 2. Quick start

1. Create a folder and place `pack.json` and `.wgsl` files in it
2. Load the zip or folder from the game settings → Shader Pack
3. Fix any errors and reload (see [Part V](05-troubleshooting.md))
4. Test in supported games
5. Zip it up when done and distribute it

## 3. Pack structure

- **Distribution format**: a single `.zip`, or a folder (folder loading is desktop browsers only)
- **Contents**: one `pack.json` (placed at the top level of the pack; case-insensitive) + 1–256 `.wgsl` files
- Multiple `.wgsl` files are concatenated and treated as one module, so splitting and subdirectories are free. No constraints on file names. Concatenation happens in **dictionary order by entry (path) name** (module-scope declarations are order-independent so this normally doesn't matter — it only bites code depending on `var` initialization order). Non-`.wgsl` files (READMEs etc.) are ignored
- Zipping tip: if a zip stores everything under one common root folder, that prefix is stripped automatically (zips made with macOS "Compress" work as-is; OS junk such as `__MACOSX`, `._`-prefixed files and `.DS_Store` is excluded automatically). But stray files at the root level break top-level detection, so the safest method is to go inside the folder and zip `pack.json` and the `.wgsl` files directly (verify `pack.json` ends up at the ZIP root)

| Item | Limit |
|---|---|
| zip size / entry count | 32MB / 1024 |
| pack.json size | 64KB, UTF-8 |
| total .wgsl size | 256KB, UTF-8 |
| zip format | zip64, split, and encrypted zips are rejected. Compression: store / deflate only. Duplicate paths not allowed |

## 4. pack.json

```json
{
  "apiVersion": 3,
  "name": "My Pack",
  "author": "your name"
}
```

| Field | Required | Description |
|---|---|---|
| `apiVersion` | required | Must match `3` exactly. Packs with `1`/`2` are rejected at load with `shaderPack:loadWrongApiVersion` — see [Part IX](09-apiv3.md) for migration |
| `name` | required | Must not be empty. Shown in the settings UI |
| `author` | optional | May be omitted. Non-string values (numbers etc.) are errors |

Other fields are ignored.

## 5. Minimal template

A working pack with just `pack.json` (section 4) and this `pack.wgsl`:

```wgsl
// Minimal pack with a slight warm tint
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

Rules to follow:

- Never **construct output structs directly** (`BloxdSurface(...)` is an error). Always start from `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` and modify fields. Exception: the light hook's first parameter (`s: BloxdSurface`) has the output type, so `var out = s;` also works
- Uninitialized `var x: BloxdSurface;` (type annotation only) is also an error
- Hook parameters are **read-only**. To change them, copy first, e.g. `var sv = s;`
- You cannot use the `bloxd_` prefix for your own identifiers (except the 6 hook names)
- Write constants with `const` (`#define` cannot hold values)

## 6. The 6 hooks

All optional. Signatures must match exactly in types (parameter names are free).

| Hook | Role |
|---|---|
| `fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex` | Terrain vertex animation. **Not available in strict mode** |
| `fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface` | Terrain color, transparency, emission. `s.colour` is texture × vertex color |
| `fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight` | Terrain final color. Called at the **final stage of the fragment**, and its return value becomes the final color as-is |
| `fn bloxdLiquidVertex / bloxdLiquidSurface / bloxdLiquidLight` (same shapes) | Liquid versions. `alpha` acts as liquid transparency |

Fallback rules:

- If a liquid hook is undefined, **the terrain hook of the same name is used** (not vice versa). Writing only surface applies the same effect to liquids
- If no light hook is defined, the default behavior (`engineColour + emission × fogVisibility`) is used
- If you discard `engineColour` and rebuild from the base color, re-apply fog yourself: `mix(l.fogColour, col, l.fogVisibility)`. When adding emission, multiply it by `fogVisibility` first

## 7. 8 variants and guards

You write one piece of code, but it must compile in all **8 combinations of {strict, allow} × {lighting on, lighting off} × {terrain, liquid}**.
Only `#define` (flag only, no values) / `#ifdef` / `#ifndef` / `#else` / `#endif` are available. `#` must start its line (allowed inside functions too).

| Guard | Meaning | Use |
|---|---|---|
| `#ifndef BLOXD_STRICT` | Only outside strict (allow) | Wrap the whole vertex hook and `discard` |
| `#ifdef BLOXD_LIGHTING` | Only when lighting is on | Wrap code touching `blockLight`, `skyLight`, `ambientLightColour`, etc. **Wrap shared helper functions (module-scope fns) as whole functions** (guarding only the call site is not enough) |
| `#ifdef BLOXD_ALPHA` | When the `alpha` field exists (always for liquids, terrain only in allow) | Wrap code touching `alpha` |

## 8. Available language features and prohibitions

Available:

- WGSL built-in functions (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select`, etc.)
- Your own `fn` / `struct` / `const` / `alias` / `var<private>`, plus `let` and control flow (if/for/while/switch etc.) inside functions
- Derivatives (`dpdx` / `dpdy` / `fwidth`) only in surface/light hooks (fragment stage). Not in vertex hooks
- `const` arrays (e.g. color palette LUTs), pointers (`ptr<function, T>`), matrices (`mat3x3f` etc.)
- Flag definitions `#define NAME` + `#ifdef` branching

Prohibited / caution:

- **No textures**: `texture_*` / `sampler` types are unusable. Build surface detail procedurally with hash noise etc.
- **`discard` is prohibited in strict mode** (wrap with `#ifndef BLOXD_STRICT`)
- `@attribute` / `enable` / `requires` / `override` are prohibited. Since `enable f16;` cannot be written, **f16 types are effectively unusable**
- `@builtin` attributes are also prohibited, so `fragCoord` (screen coordinates) and `vertex_index` cannot be read
- **Do not use module-scope `let`** (use `const` or `var`)
- `atomic` is unusable
- Coordinates are noa-local. Add `bloxdOriginOffset()` for world coordinates. Block coordinates are `bloxdFaceBlock(position, normal)`

## 9. Validation, testing, and distribution

Loading runs these checks in order:

1. Loader limit checks (section 3 caps)
2. Static compilation (all 8 variants)
3. Real compilation check in the browser WebGPU (static validation does not fully type-check, so some code only fails here — avoid the section 8 traps)

Steps:

1. Load the zip / folder from settings → Shader Pack
2. Check the status. Right after selecting you'll see "Ready. Reload the page to use it." — after reloading the page, "Ready to use" means success. For "Saved, but it won't run until you fix these errors...", fix the listed errors (file:line + variant) and reload
3. Reload the page to activate. Remove any renderer overrides in URL parameters or localStorage first, or the pack will refuse to start
4. Test in lenient games first, then in strict games (the majority). Vertex animation only works in allow games
5. For distribution, zip with `pack.json` at the top (within section 3 caps). Replacing the pack can be done from the same screen, but takes effect only after a page reload (steps 2–3). Remove Pack deletes it. Re-validation after game updates runs automatically on page load

[Back to the manual](README.md)·[Next part →](02-api.md)
