# How the texture registry works

> Target API: 5 · Purpose: using named textures

Shader packs refer to textures through named constants, not numeric IDs. Constants use the `bloxdTextureId<Name>` form. See the [Texture catalog](../api/texture-catalog.md) for available names.

## Name resolution

When a pack is loaded, the loader resolves each named constant against the available texture names. If the internal layout changes while a name remains available, the pack can continue to refer to that texture by name.

**Do not write numeric texture IDs directly in WGSL.** Internal IDs and atlas positions may change as game content is updated. Named constants keep pack code independent of those internal positions.

## Animation and rotation

- **Animation:** Refer to the base name, such as `lava`, rather than frame spellings such as `lava0`–`lava7`. Sampling selects the current frame.
- **Rotation:** Use the base name listed in the catalog instead of internal rotation slots. Sampling applies the face's rotation.
- **Frame transitions:** The engine has internal slots for blending adjacent animation frames. Packs should continue to use the regular named constants.

## Related

- [Texture catalog](../api/texture-catalog.md) — available names and constants
- [Texture API](../api/texture-api.md) — texture lookup and sampling
- [Texture sampling internals](texture-sampling.md) — how sampling works
