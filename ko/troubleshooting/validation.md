# Validation errors

> Target API: 5 · Status: Verified (messages recorded verbatim from the live validator)

Static-validation (analyzer, stage 1) errors — mostly reserved names, the strict contract, and cross-hook call restrictions.

## "Packs can't construct BloxdSurface directly" / "Packs can't construct BloxdLight directly, since header structs gain fields; ..."

- **Cause**: calling constructors like `BloxdSurface(...)`
- **Fix**: start from `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` and mutate fields (`var out = s;` works in light hooks)

## "Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"

- **Cause**: an identifier starting with `bloxd` (case-insensitive)
- **Fix**: rename (e.g. `packTint`). Only the 9 hook names are allowed
- **Prevention**: prefix your own names with `pack` / `my` etc.

## "bloxdPackInputs isn't part of the bloxd_ header"

- **Cause**: referencing the uniform directly
- **Fix**: use it via the header functions ([Pack format](../api/pack-format.md#per-frame-uniform-bloxdpackinputs))

## "... reaches bloxdTexel, which only surface and light hooks can use."

- **Cause**: called from a vertex hook (or a function reachable from one) — "reaches" means **the call path**
- **Fix**: move the call to a surface / light hook

## "... reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and <program> doesn't define it; ..."

- **Cause**: `bloxdOpaqueBehind()` needs `BLOXD_SCENE_DEPTH`, defined only in all-liquid variants; sharing the call from terrain/model-hook code creates uncompilable variants
- **Fix**: wrap the call in `#ifdef BLOXD_SCENE_DEPTH`
- **Prevention**: isolate depth reads as liquid-only processing

## The strict contract

| Message | Meaning |
|---|---|
| `<hook> moves terrain, which strict games prevent.` | unguarded vertex hook |
| `discard makes terrain see-through, which strict games prevent.` | reachable `discard` |

- **Important**: these are not compile errors — strict games **auto-disable the whole pack** (`shaderPack:offInStrict`)
- **Fix**: wrap vertex hooks and `discard` in `#ifndef BLOXD_STRICT` ([Variants](../getting-started/variants.md))

## v5 additions/changes

| Message | Action |
|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | migrate `#ifdef BLOXD_LIGHTING` → `if (bloxdLit())` ([Lighting](../api/lighting.md#bloxdlit--the-gate)) |
| `bloxdBlockFlagRock isn't part of the shader pack API...` | leftover bit constant → `flags.rock` ([Flags](../api/flags.md)) |
| `bloxdSpLitColour isn't part of the shader pack API...` | v4 internal symbol → use the public `bloxdLitColour()` |

v5's analyzer gives **dedicated messages** to packs that keep reading `blockFlags` or wrapping light hooks in `#ifdef BLOXD_LIGHTING`, so nothing misbehaves silently ([v5 migration](../history/v5.md)).

Texture-name resolution errors (spelling suggestions, frame/rotation spellings) live in [Texture issues](textures.md).

## Related

- [Restrictions & reserved names](../api/restrictions.md) · [Engine Internals: Shader Validation](../internals/shader-validation.md) · [Variant-specific issues](variants.md)
