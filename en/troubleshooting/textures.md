# Texture issues

> Target API: 5 · Target build: `v98qt8` (2026-11-08, production and preprod) · Status: Verified (messages recorded verbatim from the live validator)

Problems around `bloxdTextureId*` / `bloxdTexel`. Search all 896 names in the [texture catalog](../api/texture-catalog.md).

## "There's no texture called X. Did you mean bloxdTextureIdY?"

- **Cause**: a misspelling; the validator has **Levenshtein suggestions** (threshold `max(2, floor(len/4)) + 1`)
- **Fix**: accept the suggestion; cross-check the [catalog](../api/texture-catalog.md)
- **Prevention**: copy-paste names from the catalog

## "...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates."

- **Cause**: writing a **frame number** on an animated texture (`lava0` etc.)
- **Fix**: use the base name — sampling returns the current frame automatically
- **Prevention**: never write frame suffixes for the 43 animation families ([naming](../api/texture-api.md#spelling-rules-and-naming-freedom))

## "...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, ..."

- **Cause**: writing a rotation-family turned-copy spelling (`[rot[N`)
- **Fix**: use the root name — `bloxdTexel` re-applies the rotation

## "...could name X and Y, which differ only by case or underscores, so it can't be used."

- **Cause**: the case/underscore-insensitive fold left the name **ambiguous**
- **Fix**: disambiguate the spelling

## "bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?"

- **Cause**: prefix misspelling (e.g. `bloxdTextureID`, `bloxdtextureid`)
- **Fix**: start names with exactly `bloxdTextureId`

## "Case and underscores are not distinguished" — how do both rules coexist?

Name resolution folds case and `_`, so `bloxdTextureId_grass_top` and `bloxdTextureIdGrassTop` resolve to the **same** constant. Only when the fold leaves multiple candidates does the dedicated ambiguity error fire ([naming rules](../api/texture-api.md#spelling-rules-and-naming-freedom)).

## bloxdTexel always returns white on models

- **By design**: most models use `textureId: 0` (no texture — player skins etc.); `bloxdTexel(0, ...)` returns `vec4f(1.0)`
- **Fix**: select with `surface.textureId != 0u` ([model-owned textures](../api/texture-api.md#model-owned-textures-textureid-0))

## Wanting to add textures

- **Limit**: the shader-pack API only **reads** the atlas; adding textures is the texture-pack system's job ([combinations](../guides/combinations.md))

## "Packs can't use X: the engine binds every texture and sampler..."

- **Cause**: declaring `texture_*` / `sampler` types directly
- **Fix**: go through `bloxdTexel()` ([Restrictions](../api/restrictions.md))

## Raw ids broke after a game update

- **Cause**: **ids are snapshots** — measured, 334 of 905 surviving names changed id between two builds
- **Fix**: write `bloxdTextureIdLava`, not `19` ([names are the API](../api/texture-catalog.md#measured-drift-cnty9--ab90qa))

## Related

- [Texture API](../api/texture-api.md) · [Texture catalog](../api/texture-catalog.md) · [Texture Registry internals](../internals/texture-registry.md)
