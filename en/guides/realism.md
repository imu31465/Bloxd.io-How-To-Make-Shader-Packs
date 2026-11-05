# Realism: two schools

> Target API: 5 · Target build: `bny9u` (2026-11-05, production) · Status: Verified (ported to the current API — on-device re-check recommended)
**School A: additive fixes (from defaultLight)** — use `engineColour` (finished color) as the base and add warm glow or rim. Easy and safe, but the lighting model stays default.

**School B: full relighting (from s.colour)** — discard `l.engineColour` and rebuild lighting from `s.colour` (albedo) and raw LightIn materials. The real path to realism. Four rules:

1. **Re-apply fog**: the light hook runs post-fog, so apply `mix(l.fogColour, col, (1.0 - l.fogAlpha))` yourself (R9.10). When fog is too dense, floor it with `min(l.fogAlpha, 0.70)`. Conversely, mixing more fog color onto engineColour-based packs double-fogs into white distance
2. **Unlit fallback**: pass through to `defaultLight` outside `#ifdef BLOXD_LIGHTING`
3. **Guard whole shared functions**: wrap shared functions taking `BloxdLightIn` in `#ifdef BLOXD_LIGHTING` as entire functions (guarding only call sites is not enough)
4. **When there is no sun direction**: if `bloxdSunDirection()` is zero, don't compute directional specular. `l.directional` is a light-amount scalar, not a direction vector, so it cannot restore highlight direction. Switch to weak directionless ambient as needed. Moon direction is available via `-bloxdSunDirection()` (only moves in day/night-cycle worlds — [The sun and the moon](../internals/sun-and-moon.md))
