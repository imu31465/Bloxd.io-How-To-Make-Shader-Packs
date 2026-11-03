# Visual issues

> Target API: 5 · Status: Verified

Compiles fine but looks wrong.

## Distance turns white/hazy

- **Cause**: double fog. The default light-hook output is **already fogged** (`bloxdApplyFog(lit + emission, light)`), so mixing more fog color on top doubles it
- **Fix**: keep custom fog subtle; consider saturation-only aerial perspective ([realism recipes](../recipes/realism.md))
- **Prevention**: understand `fogAlpha` semantics (0 = no fog, 1 = only fogColour) and the [pipeline](../api/lighting.md#the-full-pipeline) before writing fog

## pow(l.skyLight, γ) never darkens shadows

- **Cause**: `skyLight` arrives post-lift-curve (raw 0.87 arrives as 0.97); gamma mathematically cannot compete
- **Fix**: switch to lift inversion + threshold ([Shadows](../guides/shadows.md))

## Blocks turn almost pure white

- **Cause**: the light-hook output exceeds 1.0 (no clamp exists past the output)
- **Fix**: append `clamp(col, vec3f(0.0), vec3f(1.0))`

## White without additions

- **Cause**: un-fog inversion by division
- **Fix**: drop the un-fog; rebuild from `s.colour` and apply fog exactly once at the end (or via `bloxdApplyFog`)

## Glowing blocks don't glow (rebuilding packs)

- **Cause**: missing emission re-add — dropping the default output means adding emission yourself
- **Fix**: add `+ s.emission * (1.0 - l.fogAlpha)`; on v5 the `bloxdLitColour()` + emission + `bloxdApplyFog` composition is safest ([Lighting](../api/lighting.md))

## Waves/patterns cut off at chunk or origin switches

- **Cause**: using render-space positions directly — the origin moves with the player
- **Fix**: use `bloxdWorldPosition(position)` for world-dependent effects ([Coordinates](../recipes/coordinates.md)); note f32 precision limits far from origin

## Water-surface patterns misalign on rotated faces

- **Cause**: `bloxdTexel` applies the fragment's own `textureRotation` to your uv ([the rotation subtlety](../api/texture-api.md#the-rotation-subtlety--a-neutral-sampler))
- **Fix**: pre-rotate with the `texelNeutral` helper

## Enchant glint / hurt flash disappeared

- **Cause**: custom lighting rebuilt without passing `enchantColour` / `overlayColour` through
- **Fix**: pass them through or use `bloxdLitColour()` ([Enchant effects](../recipes/enchant-effects.md))
- **v5**: `bloxdDefaultSurface` passes both through unchanged, so defaults never lose them

## Sky, clouds or the sun disc unaffected

- **By design**: hooks cover terrain / liquid / model only ([Unreachable effects](../guides/constraints.md))

## Related

- [Lighting issues](lighting.md) · [Debugging tips](../guides/debugging.md) · [Fog Internals](../internals/fog-internals.md)
