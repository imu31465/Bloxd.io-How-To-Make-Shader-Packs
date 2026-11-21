# Texture registry internals

> Target API: 5 · Target build: `bbb6l5` (verified in production and preprod on 2026-11-20) · Status: Verified

This page explains how texture names resolve to IDs and summarizes the registry changes between builds. For pack authors, the current list of usable names is in the [Texture catalog](../api/texture-catalog.md).

## How it was measured

The registry was recomputed by running the production build's own registry builder against the shipped block-texture data. The resulting fingerprint, `32451195`, matches the prebuilt atlas shipped with `bbb6l5`. These are the engine's own results, not values from a separate reimplementation.

## Current registry

| Output | `bbb6l5` | Meaning |
|---|---:|---|
| `named` | **1,017** | Names available as `bloxdTextureId<Name>` constants |
| `aliases` | **776** | Alternate spellings that resolve to a base name |
| `layers` | **1,650** | Total layers in the texture atlas |
| Atlas strips | **7** | Six full strips and one partial strip |
| Rotation families | **64** | Names with face-rotation variants |
| Animation families | **71** | Names with animated frames |

Animation aliases include the regular frame spellings and the transition spellings used to blend between adjacent frames. `radar_screen` belongs to both the rotation and animation families.

## Name folding

- **Animation:** frame names such as `lava0`–`lava7` resolve to the base name `lava`. `bloxdTexel` selects the current frame when sampling.
- **Rotation:** slots such as `[rot[1`–`[rot[4` resolve to the base texture name. `bloxdTexel` applies the face's `textureRotation`.
- **Transitions:** `frameA~frameB~interval` identifies an atlas slot that blends two adjacent animation frames.

Use the named constants in WGSL. Do not hard-code numeric texture IDs: IDs can change between builds even when the texture name remains available.

## Changes between builds

| Comparison | Atlas layers | Usable names | Main change |
|---|---:|---:|---|
| `sjr0p7` → `cnty9` | 1,200 → 1,219 | — | 98 additions, 79 removals; naming convention for rotated textures changed |
| `cnty9` → `ab90qa` | 1,219 → 1,210 | 905 → 896 | One name added and ten removed |
| `ab90qa` → `xkg8x` | 1,210 → 1,220 | 896 → 906 | The ten names removed at v5 launch returned |
| `xkg8x` → `bny9u` | 1,220 → 1,232 | 906 → 911 | Five names added for Trading Terminal and Stone Generator |
| `bny9u` → `v98qt8` | 1,232 → 1,227 | 911 → 906 | One name added; six block textures left the registry when blocks became models |
| `v98qt8` → `bbb6l5` | 1,227 → 1,650 | 906 → 1,017 | 423 layers added; rotation and animation families grew; the folding regression was fixed |

IDs were reassigned for many names in each update. The name-based constants keep packs independent of those numeric changes.

## The v98qt8 folding regression (fixed)

In `v98qt8`, the engine's animation-texture table used spelling keys while the folding logic expected slot indices. As a result, base names for animated textures failed validation, and frame spellings were exposed as separate constants without animation.

The problem was fixed in `bbb6l5`: the table is slot-keyed again, base animation names validate, and the registry fingerprint matches the shipped atlas. The regression is recorded here for historical reference; it does not describe the current build.

## Effect on HEADER_VERSION

The registry fingerprint contributes to `HEADER_VERSION`. A registry change can therefore trigger pack re-validation. Packs that use names resolve against the new IDs; packs that hard-code raw numeric IDs can break. See [Compatibility](../api/compatibility.md).

## Related

- [Texture catalog](../api/texture-catalog.md) — names available to packs
- [Texture sampling internals](texture-sampling.md) — how textures are sampled
- [Research log](research-log.md) — measurement method and build history
