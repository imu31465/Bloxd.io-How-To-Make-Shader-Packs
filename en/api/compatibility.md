# Compatibility

> Target API: 5 · Type: API reference

This page explains which shader-pack API versions the current game accepts and how older saved packs are handled.

## Accepted API version

The current game accepts packs whose manifest contains the numeric value `5` in `apiVersion`. The string `"5"` is not accepted. Packs created for API v1–v4 must be migrated before they can load.

## Load-time messages

- `pack.json needs "apiVersion": {{version}}.` — the `apiVersion` key is missing
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — the specified version does not match the current version

## Previously saved packs

A pack saved for an older API version will not run in the current game. The shader-pack settings screen reports that the pack is for an unsupported version. Update the pack using the relevant migration guide.

## Saved-pack revalidation

Saved packs are revalidated when engine-provided headers or texture-name definitions change. Revalidation runs automatically when the game loads. In pack code, refer to textures by named constants rather than numeric IDs that may change.

## Runtime compatibility

- **WebGPU:** Shader packs require a WebGPU renderer.
- **Mobile:** Shader packs are unavailable in environments without WebGPU support ([Requirements](../getting-started/requirements.md)).
- **Texture access:** In renderer configurations that do not use the texture atlas, `bloxdTexel` and `bloxdTextureSize` do not provide normal atlas-texture access ([Texture API](texture-api.md)).

## API version support

| API version | Current-game support |
|---|---|
| v1 | Rejected at load |
| v2 | Rejected at load |
| v3 | Rejected at load |
| v4 | Rejected at load |
| **v5** | **Current** |

## Related

- [Migrating from v4 to v5](../history/v5.md)
- [Version history](../history/)
