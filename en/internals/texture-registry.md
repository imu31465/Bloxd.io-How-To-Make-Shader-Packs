# Texture registry internals

> Target API: 5 · Target build: `v98qt8` (verified in production and preprod 2026-11-08) · Status: Verified (extracted by re-running the engine's own registry builder)

The name→id resolution machinery and measured registry drift. The user-facing catalog: [Texture catalog](../api/texture-catalog.md).

## Methodology

We ran the engine's own registry-building machinery against the shipped block registry's texture data (data module 1351 in the main bundle) inside a mini webpack harness and recorded its output — these numbers are **the production bundle's own computation**, not a re-implementation. On the current build the classifier is module 30048 (carried identically by chunks c59/c60/c61/c9); on `bny9u` it was 29815 in chunk c56, and the atlas-side builder is module 28312 in chunk c49 (29812 in chunks c52–c54 on `bny9u`).

## Output structure

| Output | v5 intended | v5 as shipped on v98qt8 | Meaning |
|---|---|---|---|
| `named` | **906** | 1,047 (folding broken — see below) | names referable as `bloxdTextureId<Name>` |
| `aliases` | 424 | 240 (all rotation) | folded spellings — 196 frame aliases (`lava0`…) and 228 rotation aliases (`chest_top[rot[1`…) |
| `layers` | 1,227 | 1,227 | the full atlas layer table — 906 named roots, 150 extra animation frames, 171 pre-rotated slots |

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

## Drift (bny9u → v98qt8)

| Measurement | bny9u (v5) | v98qt8 (v5, current) |
|---|---|---|
| atlas entries | 1,232 | **1,227** |
| rotation families (turned spellings) | 57 (228) | **57 (228) — unchanged** |
| animation families (frame spellings) | 43 (196) | **43 (196) — unchanged** |
| usable named constants | 911 | **906** |
| id changes among surviving names | — | **716 of 905** (79%) |

The complete drift (7 names): added (1) `hay_block_top`; removed (6) `artisan_table_side` / `artisan_table_top` / `crafting_table_side` / `furnace_front` / `furnace_side` / `furnace_top` — the Furnace, Workbench (crafting table) and Artisan Bench were converted from terrain-textured blocks to block models, so their terrain textures left the registry (the Workbench kept `crafting_table_top` — its top face is still terrain-textured). Production and preprod serve the same byte-identical bundle (md5 `7458fd47ff88331d9f451d1456ff48ac`).

## The v98qt8 folding regression

`v98qt8` ships a byte-verified regression in the texture-constant folding. The data module (1351) now builds `animatedBlockTextures` as a **name-keyed Array** (`Yi[pii[0]] ??= {numAnimStates, animStartIdx, …}` — hexdump-verified in the live main bundle), while the classifier (module 30048) still expects a **slot-keyed array** in two places:

1. `hii.forEach((value, key))` — `Array.prototype.forEach` never visits string keys, so the extra-frame slot→base map stays empty
2. `hii[Qi]` with `Qi` = the atlas slot — bracket access with a slot index never hits a name key, so the base-spelling fold (`lava0` → `lava`) never fires

Consequences, all measured by running the production classifier and resolver verbatim in Node:

- the 43 animation-family base names (`lava`, every `*_portal`, `smoke`, `radar_screen`, `trading_terminal_front`, the 19 `*_running` machine textures, …) **fail validation**: `bloxdTextureIdLava` → "There's no texture called bloxdTextureIdLava. Did you mean bloxdTextureIdLava0?"
- the 196 frame spellings (`lava0`–`lava7`, …) resolve as **individual usable constants** (sampling the base frame only — no animation)
- the dedicated "names a frame of the animated texture" diagnostic can never fire (no frame aliases exist)
- the engine's runtime `named` set is 1,047 rows, so the registry hash the engine computes for `HEADER_VERSION` is `694df62c` — not the intended `df6c1915` (folded) — which additionally forces **every saved pack to re-validate** on this build

Control experiment: feeding the same classifier a slot-keyed array (what the code's own fold logic expects, and what `bny9u`'s data module produced) reproduces the documented folded output exactly — 906 named with `lava` at id 1, `lava0`–`lava7` as frame aliases, 424 aliases, 1,227 layers. The folding rules below describe that intended API.


## Effect on HEADER_VERSION

The registry-hash suffix bakes in ids, so this drift marks **every saved pack "needs re-check"** (auto re-validated on page load). Name-written packs survive re-resolution; raw-id packs break ([Compatibility](../api/compatibility.md)).

## Past drift records

October's two-build comparison (sjr0p7 → cnty9, 10 days): entries 1200 → 1219 (98 added, 79 removed); 779 of 1121 unchanged names changed id (69%); a naming-convention migration (`_rot1..4` suffixes → `[rot[1..4` slots); the double chest appearing. The full record lives in [Version History: v4](../history/v4.md).

November 4 (ab90qa → xkg8x, 1 day): entries 1,210 → 1,220 (+10, all returning names — the v5-launch removals reversed); 376 of 896 names changed id (42%); no removals; both folding families unchanged. The double chest is back.

November 5 (xkg8x → bny9u, 1 day): entries 1,220 → 1,232 (+5: the Trading Terminal ×3 and Stone Generator ×2 textures); 864 of 906 names changed id (95%); no removals; rotation families unchanged, animation families 42 → 43 (`trading_terminal_front`, 8 frames at 250 ms). Production and preprod serve the same byte-identical bundle.

November 8 (bny9u → v98qt8, 3 days): entries 1,232 → 1,227 (+1 `hay_block_top`, −6 model-converted block textures: Furnace, Workbench, Artisan Bench); 716 of 905 names changed id (79%); rotation families unchanged, animation families unchanged (43/196). Production and preprod serve the same byte-identical bundle — and the build carries the folding regression documented above.

## Related

- [Texture catalog](../api/texture-catalog.md) · [Shader validation](shader-validation.md) · [Research log](research-log.md)
