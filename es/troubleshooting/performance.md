# Performance

> Target API: 5 · Status: Verified

Speed problems and their fixes.

## The on-device check never finishes and drops the pack

- **Cause**: the check has a **60-second forced timeout** (excess is treated as `skipped`) — common on low-spec devices and heavy worlds
- **Fix**: reduce heavy vertex work and complex loops, then retry
- **Prevention**: follow the [performance guide](../guides/performance.md)

## Frame rate drops

- **Check**: compare FPS with and without the pack; measure terrain-heavy scenes and water separately
- **Typical causes**: heavy effects on every face unconditionally (no flag/distance selection); high-frequency hash noise; large `pow` exponents
- **Fixes** ([the guide](../guides/performance.md)):
  - gate effects to the faces that need them via `flags`
  - early-out by distance (`distance(surface.position, bloxdEyePosition())`)
  - sample one mip up for cheaper `bloxdTexel` reads
- **Prevention**: add detail incrementally and compare FPS ([testing](../guides/testing.md))

## Slow only on mobile

- **Cause**: packs run on the WebGPU renderer; mobile GPUs can be tens of times slower than desktop
- **Fix**: reduce effect strength/frequency, strengthen distance culling — or clearly mark mobile as unsupported ([Requirements](../getting-started/requirements.md))

## Approaching the 256 KB pack limit

- **Fix**: trim comments, factor shared code into functions, drop unused recipes ([Pack structure](../getting-started/pack-structure.md))

## Related

- [Performance guide](../guides/performance.md) · [Testing](../guides/testing.md)
