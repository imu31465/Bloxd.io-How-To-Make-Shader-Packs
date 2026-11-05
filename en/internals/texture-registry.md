# Texture registry internals

> Target API: 5 · Target build: `bny9u` (verified in production 2026-11-05) · Status: Verified (extracted by re-running the engine's own registry builder)

The name→id resolution machinery and measured registry drift. The user-facing catalog: [Texture catalog](../api/texture-catalog.md).

## Methodology

We ran the engine's own registry-building module (29812 on this build, carried by chunks 52/53/54) against the shipped block registry's texture data (data module 1351 in the main bundle) inside a mini webpack harness and recorded its output — these numbers are **the production bundle's own computation**, not a re-implementation.

## Output structure

| Output | v5 measured | Meaning |
|---|---|---|
| `named` | **911** | names referable as `bloxdTextureId<Name>` |
| `aliases` | 424 | folded spellings — 196 frame aliases (`lava0`…) and 228 rotation aliases (`chest_top[rot[1`…) |
| `layers` | 1,232 | the full atlas layer table — 911 named roots, 150 extra animation frames, 171 pre-rotated slots |

## Folding rules

- **animation families** (43): frame spellings (`lava0`–`lava7`) fold to the base name (`lava`); `bloxdTexel` returns the current frame at sample time
- **rotation families** (57): turned slots (`[rot[1..4`) fold to the root name; `bloxdTexel` re-applies per-face `textureRotation`
- `radar_screen` is the only name in both families (its four pre-rotated copies each carry their own 4-frame ladder — hence 46 animation roots on the atlas, not 43)

## Drift (cnty9 → ab90qa)

| Measurement | cnty9 (v4) | ab90qa (v5) |
|---|---|---|
| atlas entries | 1,219 | **1,210** |
| rotation families (turned spellings) | 57 (228) | **57 (228) — unchanged** |
| animation families (frame spellings) | 42 (188) | **42 (188) — unchanged** |
| usable named constants | 905 | **896** |
| id changes among surviving names | — | **334 of 905** |

The complete drift (11 names): added (1) `scorpion_eggs`; removed (10) the eight double-chest textures plus `mob_spawner_hostile_block_side` / `mob_spawner_neutral_block_side` (the double chest left the game data; spawners keep `mob_spawner_block_top`).

## Drift (ab90qa → xkg8x)

| Measurement | ab90qa (v5 launch) | xkg8x (v5, current) |
|---|---|---|
| atlas entries | 1,210 | **1,220** |
| rotation families (turned spellings) | 57 (228) | **57 (228) — unchanged** |
| animation families (frame spellings) | 42 (188) | **42 (188) — unchanged** |
| usable named constants | 896 | **906** |
| id changes among surviving names | — | **376 of 896** |

The complete drift (10 names): added (10) the eight double-chest textures plus `mob_spawner_hostile_block_side` / `mob_spawner_neutral_block_side` — every name removed at the v5 launch is back (the double chest returned to the game data; the spawner side variants returned with it). Nothing was removed.


## Drift (xkg8x → bny9u)

| Measurement | xkg8x (v5) | bny9u (v5, current) |
|---|---|---|
| atlas entries | 1,220 | **1,232** |
| rotation families (turned spellings) | 57 (228) | **57 (228) — unchanged** |
| animation families (frame spellings) | 42 (188) | **43 (196)** |
| usable named constants | 906 | **911** |
| id changes among surviving names | — | **864 of 906** |

The complete drift (5 names): added (5) `trading_terminal_front` (anim, 8 frames) / `trading_terminal_side` / `trading_terminal_top` / `stone_generator_side` / `stone_generator_top` — two new blocks (Trading Terminal, Stone Generator) joined the game data. Nothing was removed; the id churn is near-total (95% of survivors).


## Effect on HEADER_VERSION

The registry-hash suffix bakes in ids, so this drift marks **every saved pack "needs re-check"** (auto re-validated on page load). Name-written packs survive re-resolution; raw-id packs break ([Compatibility](../api/compatibility.md)).

## Past drift records

October's two-build comparison (sjr0p7 → cnty9, 10 days): entries 1200 → 1219 (98 added, 79 removed); 779 of 1121 unchanged names changed id (69%); a naming-convention migration (`_rot1..4` suffixes → `[rot[1..4` slots); the double chest appearing. The full record lives in [Version History: v4](../history/v4.md).

November 4 (ab90qa → xkg8x, 1 day): entries 1,210 → 1,220 (+10, all returning names — the v5-launch removals reversed); 376 of 896 names changed id (42%); no removals; both folding families unchanged. The double chest is back.

November 5 (xkg8x → bny9u, 1 day): entries 1,220 → 1,232 (+5: the Trading Terminal ×3 and Stone Generator ×2 textures); 864 of 906 names changed id (95%); no removals; rotation families unchanged, animation families 42 → 43 (`trading_terminal_front`, 8 frames at 250 ms). Production and preprod serve the same byte-identical bundle.

## Related

- [Texture catalog](../api/texture-catalog.md) · [Shader validation](shader-validation.md) · [Research log](research-log.md)
