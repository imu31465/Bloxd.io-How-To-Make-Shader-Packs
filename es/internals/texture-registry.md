# Texture registry internals

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Verified (extracted by re-running the engine's own registry builder)

The name→id resolution machinery and measured registry drift. The user-facing catalog: [Texture catalog](../api/texture-catalog.md).

## Methodology

We ran the engine's own registry-building module (29833 on this build, coordinating modules 1371 / 1391 / 1384 / 219) against the shipped block registry's texture data inside a mini webpack harness and recorded its output — these numbers are **the production bundle's own computation**, not a re-implementation.

## Output structure

| Output | v5 measured | Meaning |
|---|---|---|
| `named` | **896** | names referable as `bloxdTextureId<Name>` |
| `aliases` | 416 | folded spellings — 188 frame aliases (`lava0`…) and 228 rotation aliases (`chest_top[rot[1`…) |
| `layers` | 228 | the layer table — including 171 pre-rotated slots (57 roots × 4 rotations) |

## Folding rules

- **animation families** (42): frame spellings (`lava0`–`lava7`) fold to the base name (`lava`); `bloxdTexel` returns the current frame at sample time
- **rotation families** (57): turned slots (`[rot[1..4`) fold to the root name; `bloxdTexel` re-applies per-face `textureRotation`
- `radar_screen` is the only name in both families (its four pre-rotated copies each carry their own 4-frame ladder — hence 45 animation roots on the atlas, not 42)

## Drift (cnty9 → ab90qa)

| Measurement | cnty9 (v4) | ab90qa (v5) |
|---|---|---|
| atlas entries | 1,219 | **1,210** |
| rotation families (turned spellings) | 57 (228) | **57 (228) — unchanged** |
| animation families (frame spellings) | 42 (188) | **42 (188) — unchanged** |
| usable named constants | 905 | **896** |
| id changes among surviving names | — | **334 of 905** |

The complete drift (11 names): added (1) `scorpion_eggs`; removed (10) the eight double-chest textures plus `mob_spawner_hostile_block_side` / `mob_spawner_neutral_block_side` (the double chest left the game data; spawners keep `mob_spawner_block_top`).

## Effect on HEADER_VERSION

The registry-hash suffix bakes in ids, so this drift marks **every saved pack "needs re-check"** (auto re-validated on page load). Name-written packs survive re-resolution; raw-id packs break ([Compatibility](../api/compatibility.md)).

## Past drift records

October's two-build comparison (sjr0p7 → cnty9, 10 days): entries 1200 → 1219 (98 added, 79 removed); 779 of 1121 unchanged names changed id (69%); a naming-convention migration (`_rot1..4` suffixes → `[rot[1..4` slots); the double chest appearing. The full record lives in [Version History: v4](../history/v4.md).

## Related

- [Texture catalog](../api/texture-catalog.md) · [Shader validation](shader-validation.md) · [Research log](research-log.md)
