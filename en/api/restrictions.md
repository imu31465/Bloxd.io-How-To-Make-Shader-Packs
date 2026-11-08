# Restrictions & reserved names

> Target API: 5 · Target build: `v98qt8` (2026-11-08, production and preprod) · Status: Verified (v4 limits re-confirmed byte-identical on v5)

What packs may write, and the complete name-reservation rules.

## Allowed

- WGSL built-ins (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select`, …)
- your own `fn` / `struct` / `const` / `alias` / `var<private>`, in-function `let` and control flow (if/for/while/switch…)
- derivatives (`dpdx` / `dpdy` / `fwidth`) in surface/light hooks (fragment stage) only — not in vertex hooks
- `const` arrays (color LUTs etc.), pointers (`ptr<function, T>`), matrices (`mat3x3f` etc.)
- flag definitions `#define NAME` (no value) + `#ifdef` conditionals

## Forbidden / caveats

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

## Reserved names

### The bloxd prefix (general rule)

**Every identifier matching `/^bloxd/i` (case-insensitive) is reserved.** The only exceptions are the 9 hook function names.

Validator wording, verbatim:

> *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*

### The bloxdSp* namespace (46 symbols)

The 46 symbols the code generator may inject and therefore cannot be redeclared:

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

They cover the flag-struct delivery (`bloxdSpFlags`), the enchant and model-local inputs (`bloxdSpEnchant` / `bloxdSpItemLocalPosition`), the cell-sampling texture-pack path, the rotation chain, and extended-hook locals. **The pack-level reservation rule is broader than this list** (everything matching `/^bloxd/i`), so you don't need to memorize it — just never start your own names with `bloxd`.

### Texture names

Identifiers starting `bloxdTextureId` are resolved as texture-name constants ([Texture API](texture-api.md#bloxdtextureid-named-texture-constants)).

## Automatic rewrites

- **Y-derivative sign flip**: the analyzer rewrites every call to `dpdy`, `dpdyCoarse` and `dpdyFine` as `(-dpdy(...))` (the dpdy family is explicitly enumerated as the inversion set in the validator's token-rewrite pass). Screen-space y points down, so this inversion makes "rate of change upward" match intuition. Write `dpdy(h)` with the intent "how does h change as I go up" and the emitted code carries the flip. `dpdx` and the `fwidth` family are untouched

## Diagnostics you'll actually see

- *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*
- *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- *"X reaches bloxdTexel, which only surface and light hooks can use."*
- *"X reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and Y doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH."*
- *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## Related

- [Troubleshooting: compilation](../troubleshooting/compilation.md) · [Engine Internals: Shader Validation](../internals/shader-validation.md)
