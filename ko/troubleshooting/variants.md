# Variant-specific issues

> Target API: 5 · Status: Verified

Problems that occur in only some of the 6 variants (`strict|allow` × `terrain|liquid|model`). v5 removed the lighting axis (the old `BLOXD_LIGHTING`) and the loader validates **all 6 variants at once** on load.

## Loads only in non-strict games / dropped in strict

- **Cause**: an unguarded vertex hook or a reachable `discard`; strict games forbid both and violate = **whole-pack auto-disable** (`shaderPack:offInStrict`)
- **Check**: the loader screen shows `<hook> moves terrain, which strict games prevent.` / `discard makes terrain see-through, which strict games prevent.`
- **Fix**: wrap vertex hooks and `discard` in `#ifndef BLOXD_STRICT`
- **Prevention**: always start vertex hooks from the guarded template ([Variants](../getting-started/variants.md))

## ".alpha is undefined"

- **Cause**: `alpha` exists only behind `#ifdef BLOXD_ALPHA` (all liquid + non-strict terrain/model)
- **Fix**: wrap alpha-touching code in `#ifdef BLOXD_ALPHA` ([Preprocessor](../api/preprocessor.md#macro--variant-matrix))

## "BloxdVertex only exists when BLOXD_STRICT isn't defined"

- **Cause**: strict variants have no vertex hooks at all, so no `BloxdVertex` either; vertex code is reachable from strict variants
- **Fix**: guard the vertex hook

## bloxdOpaqueBehind fails in only some variants

- **Cause**: `BLOXD_SCENE_DEPTH` is defined only in all-liquid variants
- **Fix**: `#ifdef BLOXD_SCENE_DEPTH` ([Validation errors](validation.md))

## Water ignores the pack (Liquid)

- **Symptom**: terrain hooks written, water unchanged
- **Cause**: **in v5, if a pack defines no Liquid hook, no Terrain hook runs on water either** (the pre-v4 "liquid falls back to terrain" behavior is gone)
- **Fix**: write Liquid hooks ([hook split](../api/hooks.md#what-each-program-draws))

## Models (entities, block models) unaffected

- **Cause**: out of scope before v5; now requires `bloxdModel*` hooks
- **Fix**: define `bloxdModelSurface` / `bloxdModelLight` ([Models guide](../guides/models.md))

## About the 6-variant validation

The loader validates **all 6 variants at once** at load (the lighting axis is no longer compiled separately). Even if a game uses only some conditions, distributed packs must anticipate all six.

| Variant | Macros defined |
|---|---|
| `allow.terrain` | `BLOXD_ALPHA` |
| `allow.liquid` | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | `BLOXD_ALPHA` |
| `strict.terrain` | — |
| `strict.liquid` | `BLOXD_SCENE_DEPTH` |
| `strict.model` | — |

## Related

- [Variants](../getting-started/variants.md) · [Preprocessor](../api/preprocessor.md) · [Policy](../internals/policy.md)
