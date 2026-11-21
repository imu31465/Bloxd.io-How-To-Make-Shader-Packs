# Engine data

> Target API: 5 · Purpose: specification summary

This page summarizes the API exposed to shader packs and the limits that matter when creating a pack. See the individual references for definitions and examples.

## API overview

| Item | Specification |
|---|---|
| API version | `5` |
| Hooks | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| Variants | 6 (allow / strict × terrain / liquid / model) |
| Macros | `BLOXD_STRICT`, `BLOXD_ALPHA`, and `BLOXD_SCENE_DEPTH`. `BLOXD_LIGHTING` is not available |
| Pack uniform | 80 bytes. See [Pack format](../api/pack-format.md) for field offsets |
| Textures | Use named constants in the `bloxdTextureId<Name>` form. Never hard-code numeric IDs |
| Reserved names | Identifiers beginning with `bloxd` are reserved for the engine |

## Pack limits

| Item | Limit |
|---|---:|
| WGSL files | 256 |
| Total WGSL source | 256 KB |
| `pack.json` | 64 KB |
| ZIP archive | 32 MB |
| ZIP entries | 1,024 |

Place exactly one manifest at the ZIP root and save files as UTF-8. Duplicate paths and unsupported ZIP formats are not accepted. See [Pack format](../api/pack-format.md) for details.

## Main API v5 features

- `bloxdShadow()` and `bloxdAirShadow(t)` expose shadow information from sunlight and moonlight.
- `bloxdShadowDirection()` returns the direction of the light casting the shadow.
- Set the optional `keepCircleShadows` field in `pack.json` to `true` to retain the traditional circular shadows while using the shadow API.
- Check lighting at runtime with `bloxdLit()`; `BLOXD_LIGHTING` is not a supported macro.

## Related

- [API reference](../api/) — functions, structures, and constants
- [Pack format](../api/pack-format.md) — manifest, uniform, and loader limits
- [Texture catalog](../api/texture-catalog.md) — available texture names
- [Per-game policy](policy.md) — allow / strict coverage
- [API v4 migration guide](../history/v4.md) — migrating from the previous version
