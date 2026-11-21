# Reserved identifier internals

> Target API: 5 · Type: technical reference

The `bloxdSp*` namespace — symbols the generators may inject and packs therefore cannot redeclare. The pack-author summary: [Restrictions](../api/restrictions.md).

## The 88 symbols


`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCasterBlocks` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellFull` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpCrossed` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEntityLight` · `bloxdSpEntityRow` · `bloxdSpExitBox` · `bloxdSpEye` · `bloxdSpFacing` · `bloxdSpFacingDot` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLit` · `bloxdSpLod` · `bloxdSpMarch` · `bloxdSpMaskBit` · `bloxdSpMaskEdge` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpNormalCode` · `bloxdSpOrigin` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpOwnTexture` · `bloxdSpPixel` · `bloxdSpPlaneTolerance` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpRayFresh` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpShadowDz` · `bloxdSpShadowEmissive` · `bloxdSpShadowEntities` · `bloxdSpShadowEntityGrids` · `bloxdSpShadowFirstPerson` · `bloxdSpShadowLight` · `bloxdSpShadowMarch` · `bloxdSpShadowMask` · `bloxdSpShadowNormal` · `bloxdSpShadowPixel` · `bloxdSpShadowPosition` · `bloxdSpShadowSpecial` · `bloxdSpShadowVolume` · `bloxdSpShadowVolumeSampler` · `bloxdSpShadowVoxels` · `bloxdSpShadowZ` · `bloxdSpSize` · `bloxdSpSunShadow` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpT` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpVolumeAt` · `bloxdSpVolumeOpenLit` · `bloxdSpVolumeOut` · `bloxdSpVolumeTexel` · `bloxdSpVolumeWork` · `bloxdSpWindowHas` · `bloxdSpWindowSlot` · `bloxdSpWord` · `bloxdSpZ`


All 42 new symbols come from the engine's sun/moon shadow implementation, which now backs `bloxdShadow()` / `bloxdAirShadow()`:

- `bloxdSpSunShadow` / `bloxdSpShadowVolume` / `bloxdSpShadowVolumeSampler` / `bloxdSpShadowVoxels` — the sun-shadow volume (a 3D texture the engine fills around the player) and its sampler
- `bloxdSpShadowMarch` / `bloxdSpMarch` / `bloxdSpOrigin` / `bloxdSpRayFresh` / `bloxdSpExitBox` — the ray march that resolves a shadow ray (64 steps, stale-box freshness test)
- `bloxdSpShadowMask` / `bloxdSpShadowPixel` / `bloxdSpMaskBit` / `bloxdSpMaskEdge` — the mask texture path (mask-edge-aware sampling)
- `bloxdSpEntityLight` / `bloxdSpShadowEntities` / `bloxdSpShadowEntityGrids` / `bloxdSpEntityRow` / `bloxdSpCasterBlocks` — entity shadow casting (players, mobs, items)
- `bloxdSpShadowPosition` / `bloxdSpShadowNormal` / `bloxdSpShadowEmissive` / `bloxdSpShadowFirstPerson` / `bloxdSpShadowLight` / `bloxdSpShadowDz` / `bloxdSpShadowZ` / `bloxdSpShadowSpecial` — per-fragment shadow context (the emissive and first-person exclusions)
- `bloxdSpVolumeAt` / `bloxdSpVolumeOpenLit` / `bloxdSpVolumeTexel` / `bloxdSpVolumeOut` / `bloxdSpVolumeWork` — volume lookups (`bloxdAirShadow`'s block-only, whole-block-blurred path)
- `bloxdSpLit` / `bloxdSpFacing` / `bloxdSpFacingDot` / `bloxdSpT` / `bloxdSpCrossed` / `bloxdSpNormalCode` / `bloxdSpCellFull` / `bloxdSpWindowHas` / `bloxdSpWindowSlot` / `bloxdSpOwnTexture` / `bloxdSpPlaneTolerance` — supporting locals of the shadow and sampling codegen

## New names ↔ v5 features

- `bloxdSpFlags` — delivery of the `BloxdFlags` struct
- `bloxdSpEnchant` / `bloxdSpItemLocalPosition` — the new inputs (enchant, model-local position)
- `bloxdSpAcross` / `bloxdSpAt` / `bloxdSpCell` / `bloxdSpCellAt` / `bloxdSpCellIndex` / `bloxdSpSize` / `bloxdSpLevel` / `bloxdSpOwnTexel` — the cell-sampling texture-pack path
- `bloxdSpQuarterTurns` — the rotation chain ([Texture sampling](texture-sampling.md))
- `bloxdSpNormal` / `bloxdSpPosition` / `bloxdSpColour` / `bloxdSpOut` / `bloxdSpWord` / `bloxdSpIndex` / `bloxdSpDown` / `bloxdSpInside` — extended-hook locals

## The pack-level rule

Broader than this namespace: **everything matching `/^bloxd/i` (case-insensitive)**. Only the 9 hook function names may be declared ([Validation errors](../troubleshooting/validation.md)).

`bloxdTextureId`-prefixed identifiers resolve as texture names with their dedicated error family ([Texture issues](../troubleshooting/textures.md)).

## Related

- [Restrictions](../api/restrictions.md) · [Texture sampling](texture-sampling.md) · [Version History: v5](../history/v5.md)
