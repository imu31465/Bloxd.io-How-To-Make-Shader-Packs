# Model issues

> Target API: 5 · Target build: `xkg8x` · Status: Analyzed (new v5 territory)

Issues around the new v5 Model hooks.

## Players/mobs unaffected

- **Cause**: entities (players, mobs, NPCs, armour, cosmetics) are drawn by the **Model program** — terrain hooks don't touch them
- **Fix**: add Model hooks ([the models guide](../guides/models.md))

## Slabs, stairs, plants unaffected

- **Cause**: block models (`slab` / `stairs` / `flat`) are also Model-program geometry, never terrain
- **Fix**: use Model hooks with `flags.slab` / `flags.stairs` / `flags.flat` ([Flags](../api/flags.md))

## Water unaffected

- **Cause**: water is Liquid-hook-only; **without Liquid hooks, no Terrain hook runs on water either** (v5 change)
- **Fix**: define `bloxdLiquidSurface` / `bloxdLiquidLight` ([Variant issues](variants.md))

## Want to change only held items but everything changes

- **Fix**: select with `surface.flags.held` ([model shader recipes](../recipes/model-shaders.md))

## Flag checks don't behave

- **Likely causes**:
  1. **treating flags as a single-choice enum** — they combine freely («sandstone is sand and rock», «possibly even none») ([Flags](../api/flags.md#flags-combine-freely))
  2. reading `else` as "everything else" — the else of `flags.rock` is merely "not rock", possibly still sand
- **Fix**: combine material flags (`opaque`…) independently of shape/state flags (`slab`/`held`…)

## Enchant glint disappeared

- **Fix**: pass `enchantColour` through or use `bloxdLitColour()` ([Enchant effects](../recipes/enchant-effects.md))

## Hurt flash disappeared / too strong

- **Fix**: pass `overlayColour` through or adjust `out.overlayColour.a` ([Enchant effects](../recipes/enchant-effects.md))

## localPosition always reads 0

- **By design**: `localPosition` is `vec3f(0.0)` on terrain and liquid faces — **no model there**
- **Fix**: read it in Model hooks ([model recipes](../recipes/model-shaders.md))

## bloxdTexel returns white on models

- **By design**: `textureId: 0` (skins) samples as white
- **Fix**: select with `surface.textureId != 0u` or work from `surface.colour` ([Texture issues](textures.md))

## Want armour-only / cosmetics-only changes

- **Limit**: no flag says "armour"; `flags.lifeform` includes armour and cosmetics
- **Approximation**: combine with `localPosition` (placement) or the presence of `overlayColour` ([model recipes](../recipes/model-shaders.md))

## Related

- [Models guide](../guides/models.md) · [Model shader recipes](../recipes/model-shaders.md) · [Flags](../api/flags.md)
