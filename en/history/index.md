# Version history

> Type: Historical · API v1–v5 migration guides

This section preserves the changes, migration steps, and removed APIs from versions v1 through v5, with an emphasis on API behavior and migration paths.

## Versions

| Version | Migration guide | Main changes |
|---|---|---|
| v1 | [v1](v1.md) | Initial shader-pack API |
| v2 | [v2](v2.md) | Identifier renames, `blockId`, and scene-depth access |
| v3 | [v3](v3.md) | `blockFlags`, `bloxdPi` / `bloxdTau`, and liquid hooks |
| v4 | [v4](v4.md) | Texture API and strict-game restrictions |
| **v5** | [v5](v5.md) | **Current** — `BloxdFlags`, Model hooks, lighting API, and shadow API |

## How older versions are handled

The current game accepts only packs with `apiVersion: 5`. Older packs cannot be loaded unchanged. When migrating across multiple versions, apply each guide in order, starting with the oldest version.

## Migration paths

- v4 pack → [v5 migration guide](v5.md)
- v3 pack → [v4](v4.md) → [v5](v5.md)
- v2 pack → [v3](v3.md) → [v4](v4.md) → [v5](v5.md)
- v1 pack → [v2](v2.md) → [v3](v3.md) → [v4](v4.md) → [v5](v5.md)

For the current API, see the [API reference](../api/).
