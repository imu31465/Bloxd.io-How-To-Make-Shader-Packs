# Texture registry internals

> Target API: 5 · Target build: `bbb6l5` (verified in production and preprod 2026-11-20) · Status: Verified (extracted by re-running the engine's own registry builder; fingerprint match-verified against the shipped pre-built atlas)

The name→id resolution machinery and measured registry drift. The user-facing catalog: [Texture catalog](../api/texture-catalog.md).

## Methodology

We ran the engine's own registry-building machinery against the shipped block registry's texture data inside a mini webpack harness and recorded its output — these numbers are **the production build's own computation**, not a re-implementation. On the current build the computed fingerprint matches the shipped pre-built atlas's `builtTextureIndexFingerprint` (`32451195`), byte-for-byte confirming the measurement is the live registry.

## Output structure

| Output | v5 as shipped on bbb6l5 | Meaning |
|---|---|---|
| `named` | **1,017** | names referable as `bloxdTextureId<Name>` |
| `aliases` | **776** | folded spellings — 520 frame aliases (`lava0`…, including the 208 new `a~b~interval` transition spellings) and 256 rotation aliases (`chest_top[rot[1`…) |
| `layers` | **1,650** | the full atlas layer table — 1,017 named roots, extra animation frames and transition slots, pre-rotated slots |

## Folding rules

- **animation families** (71): frame spellings (`lava0`–`lava7`) fold to the base name (`lava`); `bloxdTexel` returns the current frame at sample time. New on `bbb6l5`: each consecutive frame pair also occupies a **transition slot** (`lava0~lava1~50`) holding a pre-blended cross-fade — the atlas animates between frames without popping
- **rotation families** (64): turned slots (`[rot[1..4`) fold to the root name; `bloxdTexel` re-applies per-face `textureRotation`
- `radar_screen` is the only name in both families (its four pre-rotated copies each carry their own 4-frame ladder — hence 72 animation roots on the atlas, not 71)

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

| Measurement | bny9u (v5) | v98qt8 (v5) |
|---|---|---|
| atlas entries | 1,232 | **1,227** |
| rotation families (turned spellings) | 57 (228) | **57 (228) — unchanged** |
| animation families (frame spellings) | 43 (196) | **43 (196) — unchanged** |
| usable named constants | 911 | **906** |
| id changes among surviving names | — | **716 of 905** (79%) |

The complete drift (7 names): added (1) `hay_block_top`; removed (6) `artisan_table_side` / `artisan_table_top` / `crafting_table_side` / `furnace_front` / `furnace_side` / `furnace_top` — the Furnace, Workbench (crafting table) and Artisan Bench were converted from terrain-textured blocks to block models, so their terrain textures left the registry (the Workbench kept `crafting_table_top` — its top face is still terrain-textured). Production and preprod serve the same bundle. This build shipped the folding regression documented below.

## Drift (v98qt8 → bbb6l5)

| Measurement | v98qt8 (v5) | bbb6l5 (v5, current) |
|---|---|---|
| atlas entries | 1,227 | **1,650** (+423 — the largest step ever measured) |
| atlas strips | 5 | **7** (6×256 + 114 slots) |
| rotation families (turned spellings) | 57 (228) | **64 (256)** |
| animation families (frame spellings) | 43 (196) | **71 (520)** — +28 families and the 208 transition spellings |
| usable named constants | 906 | **1,017** |
| id changes among surviving names | — | **863 of 906** (95%) |
| folding | broken (see below) | **fixed** |

The complete drift (+423, −0 — pure addition):

- **added (111 usable):** the **Atomic Age content pack** — reactor machinery (`pump`, `condenser`, `centrifuge`, `synthesizer`, `mob_farm`, `coolant_mixer`, `laser`, `wireless_terminal`, `dense_silo`, `express_belt`, `fast_loader`, `splitter`, `sorting_gate`, `fluid_tank`, `battery_*`, `collider_*`), uranium & materials (`uranium_ore`, `uranium_deposit`, `uranium_block`, `pure_uranium_ore`, `uranium_glass`, `reactor_*`, `fuel_rod`, `fuel_port`, `water_port`, `graphite`, `graphite_block`, `voltite_block`, `copper_block`, `scaffolding`, `reactor_slag`, `atomic_bench_*`, `atomic_bomb_*`, `atomic_spire`, `nova_bomb_*`, `isotope_comet_*`, `jetpack_back`, `glow_lamp`, `sky_spring`) — most machinery gained `*_running` animation families; 7 new rotatable tops grew the rotation count
- **added (204 alias):** `frameA~frameB~interval` **transition spellings** — pre-blended cross-fade slots between consecutive animation frames (`lava0~lava1~50` = lava0→lava1 over 50 ms), a new atlas feature on top of the 43 pre-existing families
- **removed:** none

The registry fingerprint moved `13d4e18f` → `32451195`, match-verified against the shipped pre-built atlas.

## The v98qt8 folding regression (fixed on bbb6l5)

`v98qt8` shipped a byte-verified regression in the texture-constant folding: the animated-texture table was built as a **name-keyed Array** while the folding code expects a **slot-keyed array**, so the two fold passes silently skipped every animation family:

1. `hii.forEach((value, key))` — `Array.prototype.forEach` never visits string keys, so the extra-frame slot→base map stays empty
2. `hii[Qi]` with `Qi` = the atlas slot — bracket access with a slot index never hits a name key, so the base-spelling fold (`lava0` → `lava`) never fires

Consequences, all measured by running the production classifier and resolver verbatim in Node:

- the 43 animation-family base names (`lava`, every `*_portal`, `smoke`, `radar_screen`, `trading_terminal_front`, the 19 `*_running` machine textures, …) **fail validation**: `bloxdTextureIdLava` → "There's no texture called bloxdTextureIdLava. Did you mean bloxdTextureIdLava0?"
- the 196 frame spellings (`lava0`–`lava7`, …) resolve as **individual usable constants** (sampling the base frame only — no animation)
- the dedicated "names a frame of the animated texture" diagnostic can never fire (no frame aliases exist)
- the engine's runtime `named` set is 1,047 rows, so the registry hash the engine computes for `HEADER_VERSION` is `694df62c` — not the intended `df6c1915` (folded) — which additionally forces **every saved pack to re-validate** on this build

Control experiment: feeding the same classifier a slot-keyed array (what the code's own fold logic expects, and what `bny9u`'s data module produced) reproduces the documented folded output exactly — 906 named with `lava` at id 1, `lava0`–`lava7` as frame aliases, 424 aliases, 1,227 layers.

**Fixed on `bbb6l5` (2026-11-20):** the current build's animated-texture table is slot-keyed again — running the production folding on it yields the intended output (1,017 named, 776 aliases, `lava` at id 1), the 43 pre-existing animation-family base names validate again, and the registry fingerprint is computed over the folded table. The regression section above is retained as the historical record.


## Effect on HEADER_VERSION

The registry-hash suffix bakes in ids, so this drift marks **every saved pack "needs re-check"** (auto re-validated on page load). Name-written packs survive re-resolution; raw-id packs break ([Compatibility](../api/compatibility.md)).

## Past drift records

October's two-build comparison (sjr0p7 → cnty9, 10 days): entries 1200 → 1219 (98 added, 79 removed); 779 of 1121 unchanged names changed id (69%); a naming-convention migration (`_rot1..4` suffixes → `[rot[1..4` slots); the double chest appearing. The full record lives in [Version History: v4](../history/v4.md).

November 4 (ab90qa → xkg8x, 1 day): entries 1,210 → 1,220 (+10, all returning names — the v5-launch removals reversed); 376 of 896 names changed id (42%); no removals; both folding families unchanged. The double chest is back.

November 5 (xkg8x → bny9u, 1 day): entries 1,220 → 1,232 (+5: the Trading Terminal ×3 and Stone Generator ×2 textures); 864 of 906 names changed id (95%); no removals; rotation families unchanged, animation families 42 → 43 (`trading_terminal_front`, 8 frames at 250 ms). Production and preprod serve the same byte-identical bundle.

November 8 (bny9u → v98qt8, 3 days): entries 1,232 → 1,227 (+1 `hay_block_top`, −6 model-converted block textures: Furnace, Workbench, Artisan Bench); 716 of 905 names changed id (79%); rotation families unchanged, animation families unchanged (43/196). Production and preprod serve the same bundle — and the build carried the folding regression documented above.

November 20 (v98qt8 → bbb6l5, 12 days): entries 1,227 → 1,650 (+423, −0 — the Atomic Age content pack and the transition-slot atlas feature); 863 of 906 names changed id (95%); rotation families 57 → 64, animation families 43 → 71 (+208 transition spellings); the folding regression fixed. Production and preprod serve the same build.

## Related

- [Texture catalog](../api/texture-catalog.md) · [Shader validation](shader-validation.md) · [Research log](research-log.md)
