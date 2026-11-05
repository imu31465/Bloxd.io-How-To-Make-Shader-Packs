# What changes pack-visible values

> Target API: 5 · Target build: `bny9u` (2026-11-05, production) · Status: Analyzed (production-bundle JavaScript analysis)
The same pack renders differently across **world and player settings**. Check at least these 3 environments before distribution:

1. **Normal world** (default skybox, no overrides) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, default colors
2. **Space-skybox world** — bloxdSunDirection() = 0. The `sunPresent` branch look
3. **Custom world with `visionMinLightColour` / `skyLightColourOverride`** — lifted darks and colors

Main variance sources: `lightingOverride` (forced lighting) / `skyLightColourOverride`, `ambientLightColourOverride` (hex swaps) / `visionMinLightColour` ("darkest visible color". Implemented as a per-component max against both `uSkyLightColour` and `uAmbientLightColour`; Night Vision uses it — "pitch-dark cave" packs won't get as dark as intended, and the sky color itself is lifted) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (bloxdSunDirection() presence). `uSkyLightColour` default = (1,1,1) white, `uAmbientLightColour` default = (0.25,0.25,0.30). `l.ambient` scene component = graphics setting "Ambient Lighting Intensity" (default 0.5). `(1.0 - l.fogAlpha)` follows player fog/chunk distance settings. Also `cameraTint` (RGBA tint over the whole screen) and `proximityFadeDistance` / `proximityFadeMinOpacity` (camera proximity fade for entities) are world-setting variance factors — `cameraTint` in particular is a final pass composited **over** pack output. Many of these can also be set via the script API (`serverOption`) and updated while the game runs.
