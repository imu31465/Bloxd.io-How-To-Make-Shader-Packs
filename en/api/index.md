# API Reference

The systematic specification of the current API v5. Everything here is measured from target build `bny9u` (2026-11-05; production and preprod identical). The engine header prepended to every pack (reproduced in [Engine Internals](../internals/engine-header.md)) is the primary source.

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
| [Texture catalog](texture-catalog.md) | all 896 usable names (searchable) |

> Target API: 5 · Target build: `v98qt8` (verified in production and preprod 2026-11-08) · Status: Analyzed (restored verbatim from header & validator)

Migrating from v4? See [Version History: v5](../history/v5.md).
