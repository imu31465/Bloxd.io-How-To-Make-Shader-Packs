# Model rendering internals

> Target API: 5 · Target build: `v98qt8` (2026-11-08, production and preprod) · Status: Analyzed (restored from the live bundle)

The internals of the v5 Model program. The user-facing guide: [Models and textures](../guides/models.md).

## What the Model program is

Before v5, packs could only plug into terrain / liquid; block models (slabs, stairs, plants) and entities (players, mobs, items) were **outside pack jurisdiction**. v5 added model as the third program, drawing:

- blocks drawn as block models (header note: *"Drawn as block models, so never part of terrain or flagged as opaque"*)
- held / dropped / thrown items
- players, mobs, NPCs (armour and cosmetics included)

## Flag & input delivery

- **`bloxdSpFlags`** — the delivery path for the `BloxdFlags` struct; the 8 new fields (`slab` / `stairs` / `flat` / `placed` / `held` / `dropped` / `thrown` / `lifeform`) carry values meaningful only on model faces
- **`bloxdSpItemLocalPosition`** — delivery of `localPosition`; `vec3f(0.0)` on terrain/liquid
- **`bloxdSpEnchant`** — delivery of the enchant inputs (`enchantTier` / `enchantColour` / `enchantSpeed`)

## Enchant computation

The engine animates the glint sweep and delivers it as `enchantColour.a` to the surface/light hooks ([Enchant effects](../recipes/enchant-effects.md)). The mixing happens inside `bloxdLitColour()` — right after shading, before world light ([Lighting](../api/lighting.md#the-full-pipeline)).

## The overlay (hurt flash etc.)

`overlayColour` carries entity state color (damage flash etc.) as RGB + alpha. `bloxdLitColour` mixes it **before lighting**, so state expression rides without breaking the base color. The processing existed internally in v4 and was opened to inputs/outputs in v5.

## The texture path

Most model faces use `textureId: 0` (no texture) — player skins and mob textures are not in the block-texture-atlas namespace. `surface.colour` arrives with skin × tint baked in, so model-face processing starts from `colour` ([model-owned textures](../api/texture-api.md#model-owned-textures-textureid-0)).

## Variants

The Model program forms one axis of the variant matrix: `strict.model` / `allow.model`. `BLOXD_ALPHA` is defined only in allow.model ([Preprocessor](../api/preprocessor.md#macro--variant-matrix)); strict.model has no vertex hooks.

## Related

- [Models and textures](../guides/models.md) · [Model shader recipes](../recipes/model-shaders.md) · [Flags](../api/flags.md) · [Rendering pipeline](rendering-pipeline.md)
