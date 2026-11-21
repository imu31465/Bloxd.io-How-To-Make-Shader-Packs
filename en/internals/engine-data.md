# Engine data ledger

> Target API: 5 · Status: Analyzed

This page summarizes the API surface available to shader packs. See the [API reference](../api/) for usage details.

## API surface

| Item | Specification |
|---|---|
| API version | `5` |
| Engine header | 216 lines; see the [engine header](engine-header.md) |
| Hooks | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| Variants | 6 (strict × terrain / liquid / model) |
| Macros | `BLOXD_STRICT`, `BLOXD_ALPHA`, `BLOXD_SCENE_DEPTH` |
| Pack uniform | 80 bytes; see [Pack format](../api/pack-format.md) |
| Uniform fields | `seconds` @0, `lit` @4, `renderOffset` @16, `sunDirection` @32, `eyePosition` @48, `shadowDirection` @64 |
| Texture names | Usable named constants are listed in the [texture catalog](../api/texture-catalog.md) |

## Shadow API

- `bloxdShadow()` returns the engine-computed sun/moon shadow factor.
- `bloxdAirShadow(t)` evaluates shadow at a point between the camera and the fragment.
- `bloxdShadowDirection()` returns the direction of the light that casts the shadow.
- `keepCircleShadows` is an optional `pack.json` field that preserves the legacy circular shadows.

## Related

- [API reference](../api/) — APIs available to packs
- [Pack format](../api/pack-format.md) — manifest, uniform, and loader limits
- [Game policies](policy.md) — per-game restrictions
