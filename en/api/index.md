# API Reference

This page documents the current API v5. The primary source for API definitions is the engine header automatically prepended to each pack (see [Engine Internals](../internals/engine-header.md) for the full header).

## Map

| Page | Contents |
|---|---|
| [Pack format](pack-format.md) | every `pack.json` field, loader limits, uniform layout |
| [Shader hooks](hooks.md) | 9-hook comparison: signatures, targets, run conditions |
| [Flags](flags.md) | all 14 `BloxdFlags` fields |
| [Structures](structures.md) | every field of every struct (incl. conditional fields) |
| [Functions](functions.md) | all frame/default/special function signatures |
| [Lighting](lighting.md) | the lighting API and the processing order |
| [Texture API](texture-api.md) | `bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*` and naming |
| [Constants](constants.md) | `bloxdPi` / `bloxdTau` / `bloxdChunkSize` |
| [Preprocessor](preprocessor.md) | `BLOXD_STRICT` / `BLOXD_ALPHA` / `BLOXD_SCENE_DEPTH` |
| [Restrictions](restrictions.md) | language limits, reserved identifiers |
| [Compatibility](compatibility.md) | old-version packs, saved-pack re-validation |
| [Texture catalog](texture-catalog.md) | 1,017 available named constants (searchable) |

> Target API: 5 · Status: Analyzed (reconstructed from the engine header and validator)

Migrating from v4? See [Version History: v5](../history/v5.md).
