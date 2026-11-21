# Texture registry internals

> Target API: 5 · Status: Analyzed

This page explains how texture names are resolved and referenced by shader packs. For the names available to pack authors, see the [texture catalog](../api/texture-catalog.md).

## Named constants

Packs should use named constants in the `bloxdTextureId*` form. Texture names are resolved against the registry when a pack is loaded, so packs do not need to hard-code numeric IDs.

**Treat names as the API; do not rely on numeric IDs.** Atlas layout and IDs are implementation details that may change.

## Animated textures

Reference animated textures by their family base name, not by a frame number. The engine selects the current frame when sampling, so the pack does not need to advance animation frames itself.

Frame spellings are not separate named constants for general use. Use the base names listed in the catalog.

## Rotated textures

Per-face rotation is applied during texture sampling. Packs do not need to select internal pre-rotated atlas slots directly.

## Sampling notes

- Choose names from the [texture catalog](../api/texture-catalog.md).
- Avoid depending on numeric IDs or internal atlas layout.
- In general, let the engine's sampling path handle animation and face rotation.

## Related

- [Texture API](../api/texture-api.md) — `bloxdTexel` and named constants
- [Texture catalog](../api/texture-catalog.md) — usable texture names
- [Research log](research-log.md) — how to read the investigation notes
