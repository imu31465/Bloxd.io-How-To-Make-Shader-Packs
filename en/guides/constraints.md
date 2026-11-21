# What shader packs can and cannot do

> Target API: 5 · Target build: `bbb6l5` (2026-11-20, production and preprod) · Status: Verified (ported to the current API — on-device re-check recommended)

The realism ceiling of shader packs in one page: what the current API reaches, what it fundamentally cannot, what is conditional, why the limits exist, and the closest substitutes. Scope a look here before building it.

## What the current API can do

- **Colors, transparency and emission, per face** — the three `Surface` hooks return colour (plus conditional alpha and emission) for terrain, liquids and models
- **A full lighting rebuild** — the three `Light` hooks and the lighting API (`bloxdShading()` / `bloxdWorldLight()` / `bloxdLitColour()`) expose the engine's own recipe as composable functions ([Lighting](../api/lighting.md))
- **Sun- and moon-following shadows** — `bloxdShadow()` returns the engine-computed shadow factor; `bloxdAirShadow(t)` samples the shadow along the view ray, and `bloxdShadowDirection()` provides the light direction ([Shadows](shadows.md))
- **Block-level occlusion effects** — `skyLight` can darken areas under trees and roofs, but this older technique does not rotate with the sun ([Shadows](shadows.md))
- **Reading the game's own textures** — `bloxdTexel()` samples the block-texture atlas and model-owned textures exactly as the engine's sampler does ([Texture API](../api/texture-api.md))
- **Per-model effects** — `flags` tells you "this is a held item", "this is a dropped item", "this is a player", "this is a slab" ([Flags](../api/flags.md)); `localPosition` gives model-local coordinates ([Structures](../api/structures.md))
- **Enchant glints and hurt-flash overlays** — `enchantTier` / `enchantColour` / `enchantSpeed` and `overlayColour` are readable and overridable ([Enchant effects](../recipes/enchant-effects.md))
- **Time and animation** — `bloxdSeconds()`, world position, and the sun direction drive motion ([Time & animation](../recipes/animation.md))

## What the current API cannot do

| Look | Reason |
|---|---|
| Custom shadow-map depth / pixel-accurate penumbra | The API exposes the engine-computed final shadow factor through `bloxdShadow()`, but not shadow-map depth or arbitrary occlusion queries. `bloxdAirShadow()` is blurred to whole blocks |
| SSAO | No scene-depth access (only mesher-baked vertex AO; liquid-only depth is unusable for SSAO) |
| SSR (reflections) | No scene color. Only pseudo looks blending sky color via fresnel |
| Bloom / glare | No hook into post-processing |
| Depth of field, chromatic aberration, grain | Full-screen post-processing required |
| Volumetric light (god rays) | Same |
| Custom PBR maps (normal / roughness / metalness textures) | Packs cannot add textures of their own — the API only *reads* the game's existing textures via `bloxdTexel()`, and those are plain color textures with no PBR channels. A pseudo-PBR response can only be estimated from color luminance plus `flags` ([Texture API](../api/texture-api.md)) |
| Underwater refraction | No scene color. Liquid-only depth (`bloxdOpaqueBehind()`) enables thickness absorption and bottom projection ([Making water look natural](water.md)) |
| Underwater veil (blue tint) removal / change | The veil is an emissive fullscreen quad generated from the liquid block definition color/alpha the camera is in, drawn outside hook pipelines (frontmost), so packs can change neither its color nor density |
| Direct underwater detection | No input indicates camera submersion, and fogStart / fogEnd / fogColour don't change underwater, so there is no reliable way to estimate underwater from fogAlpha etc. |
| Changing the sky, clouds or the sun disc itself | Hooks run per-face on terrain / liquid / model geometry; the skybox is not part of any hook pipeline |

## Conditional capabilities

- **Vertex animation and `discard`** — only in games whose definition carries `shaderPackPolicy: "allow"`; everywhere else `BLOXD_STRICT` compiles those hooks out ([Per-game shader-pack policy](../internals/policy.md))
- **Scene depth (`bloxdOpaqueBehind()`)** — liquid hooks only, and it needs `BLOXD_SCENE_DEPTH`; terrain and model hooks have no depth access ([Functions](../api/functions.md))
- **`bloxdTexel()` / `bloxdTextureSize()`** — surface and light hooks only, and only where the pipeline has a texture; texture-less configurations compile them as white-returning stubs ([Texture API](../api/texture-api.md))
- **Terrain alpha (`BLOXD_ALPHA`)** — only where the variant defines it ([Variants and guards](../getting-started/variants.md))

## Why these limits exist

Four inputs a "real" post-processing shader would need are structurally absent:

1. **No scene color** — hooks run while each face is drawn; there is no framebuffer texture to read, so SSR, refraction and anything derived from "what is behind me" cannot be computed
2. **No scene depth** — except the liquid-only `bloxdOpaqueBehind()` geometry probe; SSAO and shadow maps need a full depth buffer
3. **No post-processing stage** — no hook runs after the frame is composed, so bloom, DOF, aberration, grain and god rays have no entry point
4. **No sky access** — the skybox, clouds and sun disc are drawn outside the hook pipelines, and no input describes them beyond `bloxdSunDirection()`

The underwater veil is a special case of the same structure: it is an emissive fullscreen quad drawn frontmost, generated from the liquid block definition the camera is inside — outside every hook pipeline.

## Closest substitutes

| Wanted | Closest pack-side approach |
|---|---|
| Reflections | Fresnel-weighted blend toward a sky-like color + sun glint ([Making water look natural](water.md)) |
| PBR materials | Luminance-based specular/roughness estimation + `flags`-based material classes ([Colors](../recipes/colors.md), [Realism](../recipes/realism.md)) |
| Bloom / glow | Emission output — genuinely additive glow, but per-face, not a post-process blur ([Emission](../recipes/emission.md)) |
| Ambient occlusion | The mesher-baked vertex AO already in `surface.colour`; skyLight darkening doubles as large-scale AO ([Shadows](shadows.md)) |
| Water depth absorption | `bloxdOpaqueBehind()` thickness + bottom projection in liquid hooks ([Liquids](../recipes/liquids.md)) |
| Underwater mood | Accept the veil; style what is visible through it (terrain/liquid still render normally underwater) |

## The `skyLight` fallback

The `skyLight` technique above can darken areas under trees and roofs, but it uses upward sky visibility and does not rotate with the sun. Use `bloxdShadow()` when you need shadows that follow the sun or moon. The step-by-step legacy recipe remains in [Shadows](shadows.md).

## Underwater reality

Underwater looks consist of 3 layers:

| Layer | Content | Operable from packs? |
|---|---|---|
| ① Terrain/liquid rendering | Hook-processable. Light hooks are called normally underwater | Yes (works "under the veil") |
| ② Liquid-definition veil | Emissive fullscreen quad from the liquid block definition color/alpha at the camera position, drawn frontmost. The game setting `cameraTint` wins if set | No (neither color nor density changeable) |
| ③ cameraTint | Game setting | No |

Practical points: packs keep working underwater / the veil cannot be removed / underwater cannot be branched on (fogStart / fogEnd / fogColour don't change underwater, so fogAlpha can't detect it either).

## Related

- [Shadows](shadows.md) — the skyLight shadow technique in full
- [Models and textures](models.md) — what the model pipeline reaches
- [Compatibility](../api/compatibility.md) — how old-version packs behave
- Version-by-version changes to these limits: [Version History](../history/)
