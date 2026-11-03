# Lighting issues

> Target API: 5 · Status: Verified

Brightness, shadow and fog problems.

## Caves too bright

- **Cause**: insufficient non-linearity on `skyLight`
- **Fix**: the cave-darkening recipes in [lighting recipes](../recipes/lighting.md) and [realism recipes](../recipes/realism.md)

## Lit faces too bright at night

- **Cause**: only shadow colors were darkened — the finished color keeps its daytime brightness
- **Fix**: attenuate the whole finished color at night and relax only local light (`blockLight` / `heldLight`) — [the night guide](../guides/night.md)

## Night too dark

- **Fix**: guarantee a minimum ambient; with a zero `bloxdSunDirection()` the true moon direction is unknown, so use pseudo blue ambient ([the night recipe](../recipes/lighting.md)). The moon direction itself is `-bloxdSunDirection()` (day-night-cycle worlds only)

## Daytime blows out

- **Fix**: lower the exposure before ACES ([ACES](../recipes/realism.md))

## Torch surroundings saturated orange

- **Fix**: lower the warm blend ratio ([warm torch × cool sky](../recipes/realism.md))

## Want to keep the engine's world light exactly

- **v5 solution**: call `bloxdWorldLight(light)` — identical math to the engine's "brightest of block/sky/held, floored by ambientLightColour" ([Lighting](../api/lighting.md#bloxdworldlight--the-worlds-light))
- **Note**: `blockLight` / `heldLight` are 0 and sky-related fields are 1 when `!bloxdLit()` (header guarantee)

## Looks wrong in lighting-disabled games

- **Cause**: lighting-only inputs (`blockLight` etc.) used unguarded. v5 has no `#ifdef BLOXD_LIGHTING` — branch on **runtime `bloxdLit()`**
- **Fix**: early return `if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }` ([Lighting](../api/lighting.md#bloxdlit--the-gate))

## "LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk"

- **Cause**: dense glowing-block regions overflow the light seed queue and the chunk's light computation is cut short. **Not pack-caused**, but light gaps near glowing clusters trace to this
- **Fix**: spread light sources in the world

## Want the theory?

- Shadows: [Shadows](../guides/shadows.md) (skyLight = voxel shadow map)
- Fog: [Engine Internals: Fog Internals](../internals/fog-internals.md)

## Related

- [Lighting](../api/lighting.md) · [Visual issues](visual.md) · [Lighting Internals](../internals/lighting-internals.md)
