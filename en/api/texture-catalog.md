# Texture catalog

> Target API: 5 · Target build: `v98qt8` (verified in production and preprod 2026-11-08) · Status: Verified (extracted by re-running the engine's own registry builder)

The complete catalog of usable texture-name constants (`bloxdTextureId*`). **906 names**, alphabetical.

**Live-build note (v98qt8, 2026-11-08):** this build ships a texture-constant regression — the engine's animated-texture table is keyed by spelling where the folding code expects slot indices, so the 43 animation-family base names below (`lava`, every `*_portal`, `smoke`, `radar_screen`, `trading_terminal_front`, …) currently **fail validation** with "There's no texture called bloxdTextureIdLava. Did you mean bloxdTextureIdLava0?" while the 196 frame spellings (`lava0`…`lava7`) resolve as individual constants. The intended API (documented here, and what the code's own fold logic computes when fed slot-keyed data) is the folded view. Details and byte-level evidence: [Engine Internals: Texture Registry](../internals/texture-registry.md#the-v98qt8-folding-regression).

## How to read

The **name** column is the registry name — the handle you actually write. Constant spelling CamelCases the file name: `grass_top` → `bloxdTextureIdGrassTop`, `lava` → `bloxdTextureIdLava`. **Case and underscores are not distinguished** (`bloxdTextureId_grass_top` resolves identically to `bloxdTextureIdGrassTop`). Names are the API — the loader re-resolves them against the live registry at load, so names survive registry drift ([Texture API](texture-api.md)).

The **id** column is the value the constant compares against — measured on `v98qt8` (atlas layer + 1). Use it to decode `surface.textureId` dumps and to cross-check debug output against the day's build. **Never write ids into WGSL** — they are a snapshot of one build's atlas order (see the drift measurements below).

The **notes** column marks the two folding families. "anim (N frames)" means sampling this name automatically returns the current animation frame — **never write the frame suffix** (`lava0` is a known alias with a dedicated diagnostic). "rotation family (4 copies)" means the texture exists only as pre-rotated slots — the name refers to the root and `bloxdTexel` re-applies the rotation. Exactly one name (`radar_screen`) carries both notes.

Deliberately **not** listed: the remaining registry spellings — 196 frame aliases and 228 rotation aliases — which are not usable constants; writing them draws dedicated engine error messages. The underlying 1,227-row layer table (including 171 pre-rotated slots) is engine-internal and covered in [Engine Internals: Texture Registry](../internals/texture-registry.md).

### How the numbers relate

The counts name different sets, so they do not sum naively:

| Count | What it counts |
|---|---|
| **906** | usable named constants — texture names you can write as `bloxdTextureId*` |
| **424** | alias names (196 frame + 228 rotation) — recognized spellings that are *rejected* with guidance to the base name; they are names, not constants, and add no ids |
| **1,227** | atlas entries — the actual slots in the texture atlas (ids 1–1227) |

Every one of the 906 names maps to one distinct atlas entry. The remaining **321 entries** are extra animation frames (150) and pre-rotated copies (171) with no usable name — packs never reference them directly, because `bloxdTexel` animates frames and applies rotation automatically. The first frame of each animation family and the root of each rotation family *are* named, which is why some entries count as both "named" and "frame/rotation base". For comparison: v4 had 905 usable names, the v5 launch build 896, the next day's build 906, `bny9u` 911; this build has 906 — the 10 names removed at the v5 launch (double-chest ×8, mob-spawner side ×2) came back on `xkg8x` alongside the earlier +1 `scorpion_eggs`, `bny9u` added the Trading Terminal (×3) and Stone Generator (×2) textures, and `v98qt8` swaps six model-converted block textures for `hay_block_top` — 864 of the 906 `xkg8x` survivors changed id on `bny9u`, and another 716 of 905 on `v98qt8`.

## The catalog

All usable names, alphabetically. The id column is the `bloxdTextureId*` value — measured on `v98qt8` (2026-11-08). **Ids are snapshots; treat names as the API**: between the v4 build (cnty9) and the v5 launch build (ab90qa) 334 surviving names changed id, another 376 between ab90qa and `xkg8x`, and another 864 between `xkg8x` and this build (see the drift measurements below).

| Name | id (v98qt8) | Notes |
|---|---|---|
| `alloy_kiln_back` | 1093 |  |
| `alloy_kiln_front` | 1087 |  |
| `alloy_kiln_side` | 1088 |  |
| `alloy_kiln_side_running` | 33 | anim (4 frames) |
| `alloy_kiln_top` | 1089 | rotation family (4 copies) |
| `andesite_brick` | 466 |  |
| `apple_block_bottom` | 442 |  |
| `apple_block_side` | 440 |  |
| `apple_block_top` | 441 |  |
| `armour_lucky_block` | 997 |  |
| `armour_lucky_block_rare` | 999 |  |
| `armour_lucky_block_super` | 1001 |  |
| `ash` | 1033 |  |
| `auto_bench_back` | 1108 |  |
| `auto_bench_front` | 1102 |  |
| `auto_bench_side` | 1103 |  |
| `auto_bench_side_running` | 35 | anim (4 frames) |
| `auto_bench_top` | 1104 | rotation family (4 copies) |
| `autocrafter_bottom` | 964 |  |
| `autocrafter_lunite_bottom` | 975 |  |
| `autocrafter_lunite_side` | 974 |  |
| `autocrafter_side` | 962 |  |
| `banana_block_side` | 900 |  |
| `banana_block_top` | 901 |  |
| `beacon` | 338 |  |
| `bedrock` | 342 |  |
| `beetroot_block_bottom` | 926 |  |
| `beetroot_block_side` | 924 |  |
| `beetroot_block_top` | 925 |  |
| `belt_drop_side` | 1187 |  |
| `belt_drop_top` | 1186 |  |
| `belt_lift_side` | 1185 |  |
| `belt_lift_top` | 1184 |  |
| `belt_loader_slab_front` | 1112 |  |
| `belt_loader_top` | 1111 |  |
| `belt_tunnel_back` | 1201 |  |
| `belt_tunnel_exit_top` | 1202 | rotation family (4 copies) |
| `belt_tunnel_mouth` | 1195 |  |
| `belt_tunnel_side` | 1196 |  |
| `belt_tunnel_top` | 1197 | rotation family (4 copies) |
| `black_concrete` | 281 |  |
| `black_glazed_terracotta` | 430 | rotation family (4 copies) |
| `black_planks` | 369 |  |
| `black_portal` | 2 | anim (4 frames) |
| `black_spawn_block_side` | 761 |  |
| `black_spawn_block_top` | 757 | rotation family (4 copies) |
| `block_destroyer_tnt_side` | 1019 |  |
| `block_destroyer_tnt_top` | 1020 |  |
| `blue_concrete` | 282 |  |
| `blue_gen_spawn_coal` | 775 |  |
| `blue_gen_spawn_iron` | 776 |  |
| `blue_gen_spawn_top` | 774 |  |
| `blue_glazed_terracotta` | 414 | rotation family (4 copies) |
| `blue_lucky_block` | 996 |  |
| `blue_lucky_block_rare` | 998 |  |
| `blue_lucky_block_super` | 1000 |  |
| `blue_planks` | 365 |  |
| `blue_portal` | 3 | anim (4 frames) |
| `blue_spawn_block_side` | 756 |  |
| `blue_spawn_block_top` | 752 | rotation family (4 copies) |
| `bone_block_side` | 819 |  |
| `bone_block_top` | 820 |  |
| `bookshelf` | 565 |  |
| `bookshelf_1` | 567 |  |
| `bookshelf_2` | 568 |  |
| `bookshelf_3` | 569 |  |
| `bookshelf_4` | 570 |  |
| `bookshelf_5` | 571 |  |
| `bookshelf_empty` | 566 |  |
| `bouncy_bomb_block` | 592 |  |
| `bowling_alley_floor` | 980 |  |
| `bread_block_back` | 436 |  |
| `bread_block_front` | 435 |  |
| `bread_block_side` | 437 |  |
| `bread_block_top` | 438 |  |
| `brick` | 323 |  |
| `brown_concrete` | 283 |  |
| `brown_glazed_terracotta` | 418 | rotation family (4 copies) |
| `brown_mushroom_block` | 537 |  |
| `brown_planks` | 366 |  |
| `brown_portal` | 4 | anim (4 frames) |
| `brown_spawn_block_side` | 751 |  |
| `brown_spawn_block_top` | 747 | rotation family (4 copies) |
| `building_lucky_block` | 991 |  |
| `building_lucky_block_rare` | 993 |  |
| `building_lucky_block_super` | 995 |  |
| `burner_drill_back` | 1050 |  |
| `burner_drill_bottom` | 1049 |  |
| `burner_drill_front` | 1043 |  |
| `burner_drill_side` | 1044 |  |
| `burner_drill_side_running` | 27 | anim (4 frames) |
| `burner_drill_top` | 1045 | rotation family (4 copies) |
| `cactus_dry` | 353 |  |
| `cactus_top` | 352 |  |
| `carrot_block_bottom` | 922 |  |
| `carrot_block_side` | 920 |  |
| `carrot_block_top` | 921 |  |
| `carved_messy_stone` | 828 |  |
| `carved_pumpkin` | 544 |  |
| `chalk` | 840 |  |
| `chalk_black` | 856 |  |
| `chalk_blue` | 855 |  |
| `chalk_bricks_black` | 872 |  |
| `chalk_bricks_blue` | 871 |  |
| `chalk_bricks_brown` | 870 |  |
| `chalk_bricks_cyan` | 869 |  |
| `chalk_bricks_gray` | 868 |  |
| `chalk_bricks_green` | 867 |  |
| `chalk_bricks_light_blue` | 866 |  |
| `chalk_bricks_light_gray` | 865 |  |
| `chalk_bricks_lime` | 864 |  |
| `chalk_bricks_magenta` | 863 |  |
| `chalk_bricks_orange` | 862 |  |
| `chalk_bricks_pink` | 861 |  |
| `chalk_bricks_purple` | 860 |  |
| `chalk_bricks_red` | 859 |  |
| `chalk_bricks_slab_side_black` | 888 |  |
| `chalk_bricks_slab_side_blue` | 887 |  |
| `chalk_bricks_slab_side_brown` | 886 |  |
| `chalk_bricks_slab_side_cyan` | 885 |  |
| `chalk_bricks_slab_side_gray` | 884 |  |
| `chalk_bricks_slab_side_green` | 883 |  |
| `chalk_bricks_slab_side_light_blue` | 882 |  |
| `chalk_bricks_slab_side_light_gray` | 881 |  |
| `chalk_bricks_slab_side_lime` | 880 |  |
| `chalk_bricks_slab_side_magenta` | 879 |  |
| `chalk_bricks_slab_side_orange` | 878 |  |
| `chalk_bricks_slab_side_pink` | 877 |  |
| `chalk_bricks_slab_side_purple` | 876 |  |
| `chalk_bricks_slab_side_red` | 875 |  |
| `chalk_bricks_slab_side_white` | 874 |  |
| `chalk_bricks_slab_side_yellow` | 873 |  |
| `chalk_bricks_white` | 858 |  |
| `chalk_bricks_yellow` | 857 |  |
| `chalk_brown` | 854 |  |
| `chalk_cyan` | 853 |  |
| `chalk_gray` | 852 |  |
| `chalk_green` | 851 |  |
| `chalk_light_blue` | 850 |  |
| `chalk_light_gray` | 849 |  |
| `chalk_lime` | 848 |  |
| `chalk_magenta` | 847 |  |
| `chalk_orange` | 846 |  |
| `chalk_pink` | 845 |  |
| `chalk_purple` | 844 |  |
| `chalk_red` | 843 |  |
| `chalk_white` | 842 |  |
| `chalk_yellow` | 841 |  |
| `charge_vault_side` | 1116 |  |
| `charge_vault_top` | 1115 |  |
| `charging_pad_side` | 1161 |  |
| `charging_pad_top` | 1160 |  |
| `checkpoint_block` | 762 | rotation family (4 copies) |
| `cherry_block_bottom` | 591 |  |
| `cherry_block_side` | 589 |  |
| `cherry_block_top` | 590 |  |
| `chest_back` | 350 |  |
| `chest_double_back_hi` | 1221 |  |
| `chest_double_back_lo` | 1220 |  |
| `chest_double_front_hi` | 1215 |  |
| `chest_double_front_lo` | 1214 |  |
| `chest_double_top_1_hi` | 1217 |  |
| `chest_double_top_1_lo` | 1216 |  |
| `chest_double_top_2_hi` | 1219 |  |
| `chest_double_top_2_lo` | 1218 |  |
| `chest_front` | 344 |  |
| `chest_side` | 345 |  |
| `chest_top` | 346 | rotation family (4 copies) |
| `chili_pepper_block_bottom` | 679 |  |
| `chili_pepper_block_side` | 677 |  |
| `chili_pepper_block_top` | 678 |  |
| `chiseled_red_sandstone` | 457 |  |
| `chiseled_sandstone` | 333 |  |
| `clay` | 203 |  |
| `coal_block` | 241 |  |
| `coal_deposit` | 1034 |  |
| `coal_ore` | 235 |  |
| `coarse_dirt` | 199 |  |
| `coconut_block_bottom` | 523 |  |
| `coconut_block_side` | 521 |  |
| `coconut_block_top` | 522 |  |
| `code_block` | 680 |  |
| `comet_heart` | 1172 |  |
| `comet_ore` | 1171 |  |
| `compressed_messy_stone` | 531 |  |
| `conveyor_belt_bottom` | 1083 |  |
| `conveyor_belt_slab_side` | 1082 |  |
| `conveyor_belt_top` | 1081 |  |
| `conveyor_belt_turn_left` | 1173 |  |
| `conveyor_belt_turn_right` | 1174 |  |
| `copper_deposit` | 1037 |  |
| `copper_ore` | 1042 |  |
| `corn_block_bottom` | 595 |  |
| `corn_block_side` | 593 |  |
| `corn_block_top` | 594 |  |
| `crafting_table_top` | 963 |  |
| `crate` | 919 |  |
| `crop_harvester_back` | 1194 |  |
| `crop_harvester_back_running` | 45 | anim (4 frames) |
| `crop_harvester_front` | 1188 |  |
| `crop_harvester_side` | 1189 |  |
| `crop_harvester_side_running` | 44 | anim (4 frames) |
| `crop_harvester_top` | 1190 | rotation family (4 copies) |
| `crusher_back` | 1057 |  |
| `crusher_front` | 1051 |  |
| `crusher_side` | 1052 |  |
| `crusher_side_running` | 28 | anim (4 frames) |
| `crusher_top` | 1053 | rotation family (4 copies) |
| `crystal_block` | 1031 |  |
| `crystal_vat_back` | 1168 |  |
| `crystal_vat_front` | 1162 |  |
| `crystal_vat_side` | 1163 |  |
| `crystal_vat_side_running` | 42 | anim (4 frames) |
| `crystal_vat_top` | 1164 | rotation family (4 copies) |
| `custom_lobby_block_side` | 770 |  |
| `custom_lobby_block_top` | 766 | rotation family (4 copies) |
| `cut_red_sandstone` | 458 |  |
| `cut_sandstone` | 454 |  |
| `cyan_concrete` | 284 |  |
| `cyan_gen_spawn_coal` | 784 |  |
| `cyan_gen_spawn_iron` | 785 |  |
| `cyan_gen_spawn_top` | 783 |  |
| `cyan_glazed_terracotta` | 406 | rotation family (4 copies) |
| `cyan_planks` | 363 |  |
| `cyan_portal` | 5 | anim (4 frames) |
| `cyan_spawn_block_side` | 746 |  |
| `cyan_spawn_block_top` | 742 | rotation family (4 copies) |
| `dark_green_bricks` | 461 |  |
| `darkstone` | 1208 |  |
| `darkstone_bricks` | 1209 |  |
| `darkstone_bricks_cracked` | 1210 |  |
| `darkstone_bricks_lava` | 1211 |  |
| `darkstone_engraved` | 1212 |  |
| `darkstone_smooth` | 1213 |  |
| `deep_drill_back` | 1142 |  |
| `deep_drill_bottom` | 1141 |  |
| `deep_drill_front` | 1135 |  |
| `deep_drill_side` | 1136 |  |
| `deep_drill_side_running` | 39 | anim (4 frames) |
| `deep_drill_top` | 1137 | rotation family (4 copies) |
| `diamond_block` | 343 |  |
| `diamond_gen_spawn_side` | 808 |  |
| `diamond_gen_spawn_top` | 807 |  |
| `diamond_ore` | 240 |  |
| `diorite_brick` | 464 |  |
| `dirt` | 198 |  |
| `drop_location_block_side` | 815 |  |
| `drop_location_block_top` | 814 |  |
| `drop_pad` | 1040 |  |
| `dry_grass_block` | 982 |  |
| `dry_grass_block_side` | 981 |  |
| `electric_drill_back` | 1101 |  |
| `electric_drill_bottom` | 1100 |  |
| `electric_drill_front` | 1094 |  |
| `electric_drill_side` | 1095 |  |
| `electric_drill_side_running` | 34 | anim (4 frames) |
| `electric_drill_top` | 1096 | rotation family (4 copies) |
| `emerald_block` | 245 |  |
| `emerald_ore` | 239 |  |
| `end_stone` | 234 |  |
| `engraved_andesite` | 465 |  |
| `engraved_diorite` | 463 |  |
| `engraved_granite` | 467 |  |
| `evil_lucky_block` | 1024 |  |
| `evil_lucky_block_face` | 1025 |  |
| `explosive_paint_black_side` | 627 |  |
| `explosive_paint_black_top` | 628 |  |
| `explosive_paint_blue_side` | 625 |  |
| `explosive_paint_blue_top` | 626 |  |
| `explosive_paint_brown_side` | 623 |  |
| `explosive_paint_brown_top` | 624 |  |
| `explosive_paint_cyan_side` | 621 |  |
| `explosive_paint_cyan_top` | 622 |  |
| `explosive_paint_gray_side` | 619 |  |
| `explosive_paint_gray_top` | 620 |  |
| `explosive_paint_green_side` | 617 |  |
| `explosive_paint_green_top` | 618 |  |
| `explosive_paint_light_blue_side` | 615 |  |
| `explosive_paint_light_blue_top` | 616 |  |
| `explosive_paint_light_gray_side` | 613 |  |
| `explosive_paint_light_gray_top` | 614 |  |
| `explosive_paint_lime_side` | 611 |  |
| `explosive_paint_lime_top` | 612 |  |
| `explosive_paint_magenta_side` | 609 |  |
| `explosive_paint_magenta_top` | 610 |  |
| `explosive_paint_orange_side` | 607 |  |
| `explosive_paint_orange_top` | 608 |  |
| `explosive_paint_pink_side` | 605 |  |
| `explosive_paint_pink_top` | 606 |  |
| `explosive_paint_purple_side` | 603 |  |
| `explosive_paint_purple_top` | 604 |  |
| `explosive_paint_quick_black` | 644 |  |
| `explosive_paint_quick_blue` | 643 |  |
| `explosive_paint_quick_brown` | 642 |  |
| `explosive_paint_quick_cyan` | 641 |  |
| `explosive_paint_quick_gray` | 640 |  |
| `explosive_paint_quick_green` | 639 |  |
| `explosive_paint_quick_light_blue` | 638 |  |
| `explosive_paint_quick_light_gray` | 637 |  |
| `explosive_paint_quick_lime` | 636 |  |
| `explosive_paint_quick_magenta` | 635 |  |
| `explosive_paint_quick_orange` | 634 |  |
| `explosive_paint_quick_pink` | 633 |  |
| `explosive_paint_quick_purple` | 632 |  |
| `explosive_paint_quick_red` | 631 |  |
| `explosive_paint_quick_white` | 630 |  |
| `explosive_paint_quick_yellow` | 629 |  |
| `explosive_paint_red_side` | 601 |  |
| `explosive_paint_red_top` | 602 |  |
| `explosive_paint_seeking_black` | 660 |  |
| `explosive_paint_seeking_blue` | 659 |  |
| `explosive_paint_seeking_brown` | 658 |  |
| `explosive_paint_seeking_cyan` | 657 |  |
| `explosive_paint_seeking_gray` | 656 |  |
| `explosive_paint_seeking_green` | 655 |  |
| `explosive_paint_seeking_light_blue` | 654 |  |
| `explosive_paint_seeking_light_gray` | 653 |  |
| `explosive_paint_seeking_lime` | 652 |  |
| `explosive_paint_seeking_magenta` | 651 |  |
| `explosive_paint_seeking_orange` | 650 |  |
| `explosive_paint_seeking_pink` | 649 |  |
| `explosive_paint_seeking_purple` | 648 |  |
| `explosive_paint_seeking_red` | 647 |  |
| `explosive_paint_seeking_white` | 646 |  |
| `explosive_paint_seeking_yellow` | 645 |  |
| `explosive_paint_sticky_black` | 676 |  |
| `explosive_paint_sticky_blue` | 675 |  |
| `explosive_paint_sticky_brown` | 674 |  |
| `explosive_paint_sticky_cyan` | 673 |  |
| `explosive_paint_sticky_gray` | 672 |  |
| `explosive_paint_sticky_green` | 671 |  |
| `explosive_paint_sticky_light_blue` | 670 |  |
| `explosive_paint_sticky_light_gray` | 669 |  |
| `explosive_paint_sticky_lime` | 668 |  |
| `explosive_paint_sticky_magenta` | 667 |  |
| `explosive_paint_sticky_orange` | 666 |  |
| `explosive_paint_sticky_pink` | 665 |  |
| `explosive_paint_sticky_purple` | 664 |  |
| `explosive_paint_sticky_red` | 663 |  |
| `explosive_paint_sticky_white` | 662 |  |
| `explosive_paint_sticky_yellow` | 661 |  |
| `explosive_paint_white_side` | 599 |  |
| `explosive_paint_white_top` | 600 |  |
| `explosive_paint_yellow_side` | 597 |  |
| `explosive_paint_yellow_top` | 598 |  |
| `extra_compressed_messy_stone` | 532 |  |
| `fallen_cherry_leaves_side` | 587 |  |
| `fallen_maple_leaves_side` | 479 |  |
| `farmland` | 434 |  |
| `fast_belt_slab_side` | 1159 |  |
| `fast_belt_top` | 1158 |  |
| `fast_belt_turn_left` | 1175 |  |
| `fast_belt_turn_right` | 1176 |  |
| `fertilised_soil` | 927 |  |
| `finish_block` | 813 |  |
| `fireball_block` | 540 |  |
| `food_lucky_block` | 1009 |  |
| `food_lucky_block_rare` | 1011 |  |
| `food_lucky_block_super` | 1013 |  |
| `forge_hopper_top` | 1170 |  |
| `generator_side` | 1065 |  |
| `generator_side_running` | 30 | anim (4 frames) |
| `generator_top` | 1066 |  |
| `ghost_chest_back` | 957 |  |
| `ghost_chest_front` | 954 |  |
| `ghost_chest_side` | 955 |  |
| `ghost_chest_top` | 956 |  |
| `ghost_lucky_block` | 958 |  |
| `ghost_mystery_block` | 959 |  |
| `glass` | 302 |  |
| `glass_black` | 303 |  |
| `glass_blue` | 304 |  |
| `glass_brown` | 305 |  |
| `glass_cyan` | 306 |  |
| `glass_gray` | 307 |  |
| `glass_green` | 309 |  |
| `glass_light_blue` | 310 |  |
| `glass_light_gray` | 308 |  |
| `glass_lime` | 311 |  |
| `glass_magenta` | 312 |  |
| `glass_orange` | 313 |  |
| `glass_pink` | 314 |  |
| `glass_purple` | 315 |  |
| `glass_red` | 316 |  |
| `glass_silver` | 319 |  |
| `glass_white` | 317 |  |
| `glass_yellow` | 318 |  |
| `glowstone` | 339 |  |
| `gold_block` | 243 |  |
| `gold_deposit` | 1038 |  |
| `gold_ore` | 237 |  |
| `granite_brick` | 468 |  |
| `grass_block_side` | 200 |  |
| `grass_top` | 201 |  |
| `gravel` | 204 |  |
| `gray_concrete` | 279 |  |
| `gray_gen_spawn_coal` | 793 |  |
| `gray_gen_spawn_iron` | 794 |  |
| `gray_gen_spawn_top` | 792 |  |
| `gray_glazed_terracotta` | 398 | rotation family (4 copies) |
| `gray_planks` | 361 |  |
| `gray_portal` | 6 | anim (4 frames) |
| `gray_spawn_block_side` | 741 |  |
| `gray_spawn_block_top` | 737 | rotation family (4 copies) |
| `green_bricks` | 460 |  |
| `green_concrete` | 293 |  |
| `green_glazed_terracotta` | 422 | rotation family (4 copies) |
| `green_lucky_block` | 1008 |  |
| `green_lucky_block_rare` | 1010 |  |
| `green_lucky_block_super` | 1012 |  |
| `green_planks` | 367 |  |
| `green_portal` | 7 | anim (4 frames) |
| `green_spawn_block_side` | 736 |  |
| `green_spawn_block_top` | 732 | rotation family (4 copies) |
| `green_stone` | 459 |  |
| `grenade_block` | 582 |  |
| `grey_portal` | 8 | anim (4 frames) |
| `gun_lucky_block` | 953 |  |
| `hardened_clay` | 262 |  |
| `hardened_clay_stained_black` | 278 |  |
| `hardened_clay_stained_blue` | 274 |  |
| `hardened_clay_stained_brown` | 275 |  |
| `hardened_clay_stained_cyan` | 272 |  |
| `hardened_clay_stained_gray` | 270 |  |
| `hardened_clay_stained_green` | 276 |  |
| `hardened_clay_stained_light_blue` | 266 |  |
| `hardened_clay_stained_lime` | 268 |  |
| `hardened_clay_stained_magenta` | 265 |  |
| `hardened_clay_stained_orange` | 264 |  |
| `hardened_clay_stained_pink` | 269 |  |
| `hardened_clay_stained_purple` | 273 |  |
| `hardened_clay_stained_red` | 277 |  |
| `hardened_clay_stained_silver` | 271 |  |
| `hardened_clay_stained_white` | 263 |  |
| `hardened_clay_stained_yellow` | 267 |  |
| `harvester_bottom` | 971 |  |
| `harvester_lunite_bottom` | 979 |  |
| `harvester_lunite_side_0` | 976 |  |
| `harvester_lunite_side_1` | 977 |  |
| `harvester_lunite_top` | 978 |  |
| `harvester_side0` | 968 |  |
| `harvester_side1` | 969 |  |
| `harvester_top` | 970 |  |
| `hay_block_side` | 336 |  |
| `hay_block_top` | 1227 |  |
| `homestead_core` | 1039 |  |
| `homestead_core_cap` | 1124 |  |
| `homestead_core_crown` | 1123 |  |
| `homestead_core_mid` | 26 | anim (4 frames) |
| `hyper_compressed_messy_stone` | 534 |  |
| `ice` | 334 |  |
| `ice_brick` | 469 |  |
| `iceball_block` | 541 |  |
| `invisible_solid` | 322 |  |
| `iron_block` | 242 |  |
| `iron_chest_back` | 918 |  |
| `iron_chest_front` | 912 |  |
| `iron_chest_side` | 913 |  |
| `iron_chest_top` | 914 | rotation family (4 copies) |
| `iron_deposit` | 1035 |  |
| `iron_ore` | 236 |  |
| `iron_watermelon_side` | 547 |  |
| `iron_watermelon_top` | 548 |  |
| `jungle_grass_block` | 890 |  |
| `jungle_grass_block_side` | 889 |  |
| `lapis_block` | 244 |  |
| `lapis_ore` | 238 |  |
| `lava` | 1 | anim (8 frames) |
| `leather_block_side` | 909 |  |
| `leather_block_top` | 910 |  |
| `leaves_aspen` | 296 |  |
| `leaves_aspen_autumn` | 911 |  |
| `leaves_cedar` | 471 |  |
| `leaves_cherry` | 586 |  |
| `leaves_cherry_fruity` | 907 |  |
| `leaves_jungle` | 298 |  |
| `leaves_mango` | 895 |  |
| `leaves_mango_fruity` | 908 |  |
| `leaves_maple` | 297 |  |
| `leaves_maple_autumn` | 478 |  |
| `leaves_maple_fruity` | 902 |  |
| `leaves_palm` | 472 |  |
| `leaves_palm_fruity` | 905 |  |
| `leaves_pear` | 526 |  |
| `leaves_pear_fruity` | 906 |  |
| `leaves_pine` | 295 |  |
| `leaves_pine_cone` | 903 |  |
| `leaves_plum` | 470 |  |
| `leaves_plum_fruity` | 904 |  |
| `leaves_spectral` | 832 |  |
| `light_blue_concrete` | 285 |  |
| `light_blue_glazed_terracotta` | 382 | rotation family (4 copies) |
| `light_blue_lucky_block` | 934 |  |
| `light_blue_planks` | 357 |  |
| `light_blue_spawn_block_side` | 731 |  |
| `light_blue_spawn_block_top` | 727 | rotation family (4 copies) |
| `light_gray_concrete` | 280 |  |
| `light_gray_glazed_terracotta` | 402 | rotation family (4 copies) |
| `light_gray_planks` | 362 |  |
| `light_gray_spawn_block_side` | 726 |  |
| `light_gray_spawn_block_top` | 722 | rotation family (4 copies) |
| `lightblue_portal` | 9 | anim (4 frames) |
| `lightgray_portal` | 10 | anim (4 frames) |
| `lime_concrete` | 286 |  |
| `lime_gen_spawn_coal` | 778 |  |
| `lime_gen_spawn_iron` | 779 |  |
| `lime_gen_spawn_top` | 777 |  |
| `lime_glazed_terracotta` | 390 | rotation family (4 copies) |
| `lime_planks` | 359 |  |
| `lime_portal` | 11 | anim (4 frames) |
| `lime_spawn_block_side` | 721 |  |
| `lime_spawn_block_top` | 717 | rotation family (4 copies) |
| `log_ancient_maple` | 1023 |  |
| `log_aspen` | 210 |  |
| `log_cedar` | 209 |  |
| `log_cherry` | 583 |  |
| `log_jungle` | 211 |  |
| `log_mango` | 892 |  |
| `log_maple` | 206 |  |
| `log_palm` | 473 |  |
| `log_pear` | 524 |  |
| `log_pine` | 207 |  |
| `log_plum` | 208 |  |
| `log_spectral` | 829 |  |
| `lucky_block_pink_question` | 960 |  |
| `lucky_block_pink_question_rare` | 1015 |  |
| `lucky_block_pink_question_super` | 1017 |  |
| `lunite_block` | 973 |  |
| `lunite_ore` | 972 |  |
| `machine_bench_side` | 1117 |  |
| `machine_bench_top` | 1118 |  |
| `machine_side` | 1041 |  |
| `magenta_concrete` | 287 |  |
| `magenta_glazed_terracotta` | 378 | rotation family (4 copies) |
| `magenta_planks` | 356 |  |
| `magenta_portal` | 12 | anim (4 frames) |
| `magenta_spawn_block_side` | 716 |  |
| `magenta_spawn_block_top` | 712 | rotation family (4 copies) |
| `magma` | 452 |  |
| `mailbox_front` | 572 |  |
| `mailbox_front_full` | 574 |  |
| `mailbox_side` | 573 |  |
| `mango_block_bottom` | 899 |  |
| `mango_block_side` | 897 |  |
| `mango_block_top` | 898 |  |
| `mega_compressed_messy_stone` | 536 |  |
| `melon_side` | 545 |  |
| `melon_top` | 546 |  |
| `melting_ice` | 596 |  |
| `messy_stone` | 224 |  |
| `mob_spawner_block_empty_side` | 824 |  |
| `mob_spawner_block_top` | 822 |  |
| `mob_spawner_hostile_block_side` | 823 |  |
| `mob_spawner_neutral_block_side` | 839 |  |
| `mob_spawner_passive_block_side` | 821 |  |
| `moonstone_block` | 451 |  |
| `moonstone_chest_back` | 450 |  |
| `moonstone_chest_front` | 444 |  |
| `moonstone_chest_side` | 445 |  |
| `moonstone_chest_top` | 446 | rotation family (4 copies) |
| `moonstone_explosive_side` | 340 |  |
| `moonstone_explosive_top` | 341 |  |
| `moonstone_gen_spawn_side` | 810 |  |
| `moonstone_gen_spawn_top` | 809 |  |
| `moonstone_ore` | 443 |  |
| `mossy_cobblestone` | 439 |  |
| `mushroom_stem` | 539 |  |
| `mystery_block` | 579 |  |
| `neon_black` | 952 |  |
| `neon_blue` | 951 |  |
| `neon_brown` | 950 |  |
| `neon_cyan` | 949 |  |
| `neon_gray` | 948 |  |
| `neon_green` | 947 |  |
| `neon_light_blue` | 946 |  |
| `neon_light_gray` | 945 |  |
| `neon_lime` | 944 |  |
| `neon_magenta` | 943 |  |
| `neon_orange` | 942 |  |
| `neon_pink` | 941 |  |
| `neon_purple` | 940 |  |
| `neon_red` | 939 |  |
| `neon_white` | 938 |  |
| `neon_yellow` | 937 |  |
| `nether_brick` | 325 |  |
| `netherrack` | 326 |  |
| `obby_absorb_block` | 817 |  |
| `obby_absorb_death_block` | 818 |  |
| `obby_death_block` | 816 |  |
| `obsidian` | 335 |  |
| `orange_concrete` | 288 |  |
| `orange_glazed_terracotta` | 374 | rotation family (4 copies) |
| `orange_lucky_block` | 1002 |  |
| `orange_lucky_block_rare` | 1004 |  |
| `orange_lucky_block_super` | 1006 |  |
| `orange_planks` | 355 |  |
| `orange_portal` | 13 | anim (4 frames) |
| `orange_spawn_block_side` | 711 |  |
| `orange_spawn_block_top` | 707 | rotation family (4 copies) |
| `ore_gen_spawn_side` | 812 |  |
| `ore_gen_spawn_top` | 811 |  |
| `packed_snow` | 827 |  |
| `parts_bench_side` | 1119 |  |
| `parts_bench_top` | 1120 |  |
| `patterned_glass_black` | 549 |  |
| `patterned_glass_blue` | 550 |  |
| `patterned_glass_brown` | 551 |  |
| `patterned_glass_cyan` | 552 |  |
| `patterned_glass_gray` | 553 |  |
| `patterned_glass_green` | 555 |  |
| `patterned_glass_light_blue` | 556 |  |
| `patterned_glass_light_gray` | 554 |  |
| `patterned_glass_lime` | 557 |  |
| `patterned_glass_magenta` | 558 |  |
| `patterned_glass_orange` | 559 |  |
| `patterned_glass_pink` | 560 |  |
| `patterned_glass_purple` | 561 |  |
| `patterned_glass_red` | 562 |  |
| `patterned_glass_white` | 563 |  |
| `patterned_glass_yellow` | 564 |  |
| `pear_block_bottom` | 530 |  |
| `pear_block_side` | 528 |  |
| `pear_block_top` | 529 |  |
| `pet_lucky_block` | 961 |  |
| `pine_cone_block_side` | 837 |  |
| `pine_cone_block_top` | 838 |  |
| `pine_grass_block` | 835 |  |
| `pine_grass_block_side` | 834 |  |
| `pink_concrete` | 289 |  |
| `pink_gen_spawn_coal` | 790 |  |
| `pink_gen_spawn_iron` | 791 |  |
| `pink_gen_spawn_top` | 789 |  |
| `pink_glazed_terracotta` | 394 | rotation family (4 copies) |
| `pink_planks` | 360 |  |
| `pink_portal` | 14 | anim (4 frames) |
| `pink_spawn_block_side` | 706 |  |
| `pink_spawn_block_top` | 702 | rotation family (4 copies) |
| `planks_aspen` | 213 |  |
| `planks_cedar` | 217 |  |
| `planks_cherry` | 585 |  |
| `planks_jungle` | 215 |  |
| `planks_mango` | 894 |  |
| `planks_maple` | 212 |  |
| `planks_palm` | 474 |  |
| `planks_pear` | 525 |  |
| `planks_pine` | 216 |  |
| `planks_plum` | 214 |  |
| `planks_spectral` | 831 |  |
| `plum_block_bottom` | 520 |  |
| `plum_block_side` | 518 |  |
| `plum_block_top` | 519 |  |
| `podzol_top` | 453 |  |
| `potato_block` | 923 |  |
| `potion_lucky_block` | 1014 |  |
| `potion_lucky_block_rare` | 1016 |  |
| `potion_lucky_block_super` | 1018 |  |
| `press_back` | 1073 |  |
| `press_front` | 1067 |  |
| `press_side` | 1068 |  |
| `press_side_running` | 31 | anim (4 frames) |
| `press_top` | 1069 | rotation family (4 copies) |
| `protector` | 351 |  |
| `protector_faction` | 576 |  |
| `protector_tribe` | 575 |  |
| `pumpkin_face_on` | 299 |  |
| `pumpkin_side` | 542 |  |
| `pumpkin_top` | 543 |  |
| `pure_coal_ore` | 1026 |  |
| `pure_copper_ore` | 1206 |  |
| `pure_diamond_ore` | 1029 |  |
| `pure_gold_ore` | 1028 |  |
| `pure_iron_ore` | 1027 |  |
| `pure_moonstone_ore` | 1030 |  |
| `pure_voltite_ore` | 1207 |  |
| `purple_concrete` | 290 |  |
| `purple_glazed_terracotta` | 410 | rotation family (4 copies) |
| `purple_lucky_block` | 990 |  |
| `purple_lucky_block_rare` | 992 |  |
| `purple_lucky_block_super` | 994 |  |
| `purple_planks` | 364 |  |
| `purple_portal` | 15 | anim (4 frames) |
| `purple_spawn_block_side` | 701 |  |
| `purple_spawn_block_top` | 697 | rotation family (4 copies) |
| `quartz_block_chiseled` | 328 |  |
| `quartz_block_side` | 327 |  |
| `radar_bottom` | 930 |  |
| `radar_screen` | 19 | anim (16 frames) rotation family (4 copies) |
| `radar_side_active` | 928 |  |
| `radar_side_inactive` | 931 |  |
| `radar_top_active` | 929 |  |
| `radar_top_inactive` | 932 |  |
| `recycler_back` | 1183 |  |
| `recycler_front` | 1177 |  |
| `recycler_side` | 1178 |  |
| `recycler_side_running` | 43 | anim (4 frames) |
| `recycler_top` | 1179 | rotation family (4 copies) |
| `red_concrete` | 291 |  |
| `red_gen_spawn_coal` | 772 |  |
| `red_gen_spawn_iron` | 773 |  |
| `red_gen_spawn_top` | 771 |  |
| `red_glazed_terracotta` | 426 | rotation family (4 copies) |
| `red_lucky_block` | 935 |  |
| `red_lucky_block_rare` | 986 |  |
| `red_lucky_block_super` | 988 |  |
| `red_mushroom_block` | 538 |  |
| `red_planks` | 368 |  |
| `red_portal` | 16 | anim (4 frames) |
| `red_sand` | 475 |  |
| `red_sandstone` | 455 |  |
| `red_sandstone_brick` | 476 |  |
| `red_sandstone_top` | 456 |  |
| `red_spawn_block_side` | 696 |  |
| `red_spawn_block_top` | 692 | rotation family (4 copies) |
| `redstone_lamp_off` | 321 |  |
| `redstone_lamp_on` | 320 |  |
| `rocket_block` | 580 |  |
| `rocky_dirt` | 477 |  |
| `rope_block` | 1032 |  |
| `sand` | 202 |  |
| `sandstone_brick` | 462 |  |
| `sandstone_normal` | 233 |  |
| `sandstone_top` | 332 |  |
| `scorpion_eggs` | 1222 |  |
| `shatter_mill_back` | 1149 |  |
| `shatter_mill_front` | 1143 |  |
| `shatter_mill_side` | 1144 |  |
| `shatter_mill_side_running` | 40 | anim (4 frames) |
| `shatter_mill_top` | 1145 | rotation family (4 copies) |
| `shop_trader_spawn_face` | 800 |  |
| `shop_trader_spawn_side` | 799 |  |
| `shop_trader_spawn_top` | 795 | rotation family (4 copies) |
| `shop_wizard_spawn_face` | 806 |  |
| `shop_wizard_spawn_side` | 805 |  |
| `shop_wizard_spawn_top` | 801 | rotation family (4 copies) |
| `sky_tap_back` | 1157 |  |
| `sky_tap_bottom` | 1156 |  |
| `sky_tap_front` | 1150 |  |
| `sky_tap_side` | 1151 |  |
| `sky_tap_side_running` | 41 | anim (4 frames) |
| `sky_tap_top` | 1152 | rotation family (4 copies) |
| `slab_andesite_brick_side` | 499 |  |
| `slab_aspen_side` | 484 |  |
| `slab_brick_side` | 516 |  |
| `slab_cedar_side` | 483 |  |
| `slab_cherry_side` | 588 |  |
| `slab_chiseled_red_sandstone_side` | 513 |  |
| `slab_chiseled_sandstone_side` | 509 |  |
| `slab_cobblestone_side` | 489 |  |
| `slab_cut_red_sandstone_side` | 514 |  |
| `slab_cut_sandstone_side` | 510 |  |
| `slab_diorite_brick_side` | 503 |  |
| `slab_dirt_side` | 487 |  |
| `slab_dry_grass_top_side` | 983 |  |
| `slab_engraved_andesite_side` | 498 |  |
| `slab_engraved_diorite_side` | 502 |  |
| `slab_engraved_granite_side` | 506 |  |
| `slab_granite_brick_side` | 507 |  |
| `slab_grass_top_side` | 488 |  |
| `slab_ice_brick_side` | 517 |  |
| `slab_jungle_grass_top_side` | 891 |  |
| `slab_jungle_side` | 485 |  |
| `slab_mango_side` | 896 |  |
| `slab_maple_side` | 480 |  |
| `slab_mossy_cobblestone_side` | 494 |  |
| `slab_palm_side` | 486 |  |
| `slab_pear_side` | 527 |  |
| `slab_pine_grass_top_side` | 836 |  |
| `slab_pine_side` | 481 |  |
| `slab_plum_side` | 482 |  |
| `slab_red_sandstone_brick_side` | 515 |  |
| `slab_red_sandstone_side` | 512 |  |
| `slab_sandstone_brick_side` | 511 |  |
| `slab_sandstone_normal_side` | 508 |  |
| `slab_smooth_stone_side` | 491 |  |
| `slab_spectral_side` | 833 |  |
| `slab_stone_andesite_side` | 496 |  |
| `slab_stone_andesite_smooth_side` | 497 |  |
| `slab_stone_diorite_side` | 500 |  |
| `slab_stone_diorite_smooth_side` | 501 |  |
| `slab_stone_granite_side` | 504 |  |
| `slab_stone_granite_smooth_side` | 505 |  |
| `slab_stone_side` | 490 |  |
| `slab_stonebrick_carved_side` | 492 |  |
| `slab_stonebrick_mossy_side` | 495 |  |
| `slab_stonebrick_side` | 493 |  |
| `smelter_back` | 1064 |  |
| `smelter_front` | 1058 |  |
| `smelter_side` | 1059 |  |
| `smelter_side_running` | 29 | anim (4 frames) |
| `smelter_top` | 1060 | rotation family (4 copies) |
| `smoke` | 23 | anim (4 frames) |
| `smooth_stone` | 226 |  |
| `snow` | 205 |  |
| `snowy_messy_stone` | 825 |  |
| `snowy_messy_stone_side` | 826 |  |
| `solar_panel_bottom` | 967 |  |
| `solar_panel_side` | 965 |  |
| `solar_panel_top` | 966 |  |
| `sorting_gate_slab_side` | 1110 |  |
| `sorting_gate_top` | 1109 |  |
| `splitter_slab_side` | 1085 |  |
| `splitter_top` | 1084 |  |
| `sponge` | 337 |  |
| `starframe` | 1169 |  |
| `stone` | 225 |  |
| `stone_andesite` | 229 |  |
| `stone_andesite_smooth` | 230 |  |
| `stone_deposit` | 1036 |  |
| `stone_diorite` | 227 |  |
| `stone_diorite_smooth` | 228 |  |
| `stone_generator_side` | 1225 |  |
| `stone_generator_top` | 1226 |  |
| `stone_granite` | 231 |  |
| `stone_granite_smooth` | 232 |  |
| `stonebrick` | 324 |  |
| `stonebrick_carved` | 329 |  |
| `stonebrick_cracked` | 331 |  |
| `stonebrick_mossy` | 330 |  |
| `storage_silo_side` | 1114 |  |
| `storage_silo_top` | 1113 |  |
| `stripped_aspen_log` | 219 |  |
| `stripped_cedar_log` | 223 |  |
| `stripped_cherry_log` | 584 |  |
| `stripped_jungle_log` | 221 |  |
| `stripped_mango_log` | 893 |  |
| `stripped_maple_log` | 218 |  |
| `stripped_palm_log` | 577 |  |
| `stripped_pear_log` | 578 |  |
| `stripped_pine_log` | 222 |  |
| `stripped_plum_log` | 220 |  |
| `stripped_spectral_log` | 830 |  |
| `super_compressed_messy_stone` | 533 |  |
| `super_rocket_block` | 581 |  |
| `tool_bench_side` | 1121 |  |
| `tool_bench_top` | 1122 |  |
| `tools_lucky_block` | 1003 |  |
| `tools_lucky_block_rare` | 1005 |  |
| `tools_lucky_block_super` | 1007 |  |
| `toxic_waste` | 25 | anim (8 frames) |
| `toxic_waste_barrel_bottom` | 1022 |  |
| `toxic_waste_barrel_side` | 1021 |  |
| `toxic_waste_barrel_top` | 24 | anim (4 frames) |
| `toxin_ball_block` | 681 |  |
| `trading_terminal_front` | 46 | anim (8 frames) |
| `trading_terminal_side` | 1223 |  |
| `trading_terminal_top` | 1224 |  |
| `tree_cutter_back` | 1131 |  |
| `tree_cutter_back_running` | 37 | anim (4 frames) |
| `tree_cutter_front` | 1125 |  |
| `tree_cutter_side` | 1126 |  |
| `tree_cutter_side_running` | 36 | anim (4 frames) |
| `tree_cutter_top` | 1127 | rotation family (4 copies) |
| `ultra_compressed_messy_stone` | 535 |  |
| `unloaded` | 197 |  |
| `volt_engine_side` | 1133 |  |
| `volt_engine_side_running` | 38 | anim (4 frames) |
| `volt_engine_top` | 1134 |  |
| `voltite_deposit` | 1132 |  |
| `voltite_ore` | 1086 |  |
| `watermelon_side` | 300 |  |
| `watermelon_top` | 301 |  |
| `weapon_lucky_block` | 936 |  |
| `weapon_lucky_block_rare` | 987 |  |
| `weapon_lucky_block_super` | 989 |  |
| `white_concrete` | 292 |  |
| `white_gen_spawn_coal` | 787 |  |
| `white_gen_spawn_iron` | 788 |  |
| `white_gen_spawn_top` | 786 |  |
| `white_glazed_terracotta` | 370 | rotation family (4 copies) |
| `white_planks` | 354 |  |
| `white_portal` | 17 | anim (4 frames) |
| `white_spawn_block_side` | 691 |  |
| `white_spawn_block_top` | 687 | rotation family (4 copies) |
| `wire_mill_back` | 1080 |  |
| `wire_mill_front` | 1074 |  |
| `wire_mill_side` | 1075 |  |
| `wire_mill_side_running` | 32 | anim (4 frames) |
| `wire_mill_top` | 1076 | rotation family (4 copies) |
| `wool_colored_black` | 261 |  |
| `wool_colored_blue` | 257 |  |
| `wool_colored_brown` | 258 |  |
| `wool_colored_cyan` | 255 |  |
| `wool_colored_gray` | 253 |  |
| `wool_colored_green` | 259 |  |
| `wool_colored_light_blue` | 249 |  |
| `wool_colored_light_grey` | 254 |  |
| `wool_colored_lime` | 251 |  |
| `wool_colored_magenta` | 248 |  |
| `wool_colored_orange` | 247 |  |
| `wool_colored_pink` | 252 |  |
| `wool_colored_purple` | 256 |  |
| `wool_colored_red` | 260 |  |
| `wool_colored_white` | 246 |  |
| `wool_colored_yellow` | 250 |  |
| `yellow_concrete` | 294 |  |
| `yellow_gen_spawn_coal` | 781 |  |
| `yellow_gen_spawn_iron` | 782 |  |
| `yellow_gen_spawn_top` | 780 |  |
| `yellow_glazed_terracotta` | 386 | rotation family (4 copies) |
| `yellow_lucky_block` | 933 |  |
| `yellow_lucky_block_rare` | 984 |  |
| `yellow_lucky_block_super` | 985 |  |
| `yellow_planks` | 358 |  |
| `yellow_portal` | 18 | anim (4 frames) |
| `yellow_spawn_block_side` | 686 |  |
| `yellow_spawn_block_top` | 682 | rotation family (4 copies) |

### Rotation families (57 roots)

These textures exist only as pre-rotated copies (`name[rot[1..4`). The registry folds them to the root below, and `bloxdTexel` re-applies the rotation at sample time — reference the root, never the copies. Writing a `[rot[N` spelling draws the dedicated rotation diagnostic.
- `alloy_kiln_top` (id 1089)
- `auto_bench_top` (id 1104)
- `belt_tunnel_exit_top` (id 1202)
- `belt_tunnel_top` (id 1197)
- `black_glazed_terracotta` (id 430)
- `black_spawn_block_top` (id 757)
- `blue_glazed_terracotta` (id 414)
- `blue_spawn_block_top` (id 752)
- `brown_glazed_terracotta` (id 418)
- `brown_spawn_block_top` (id 747)
- `burner_drill_top` (id 1045)
- `checkpoint_block` (id 762)
- `chest_top` (id 346)
- `crop_harvester_top` (id 1190)
- `crusher_top` (id 1053)
- `crystal_vat_top` (id 1164)
- `custom_lobby_block_top` (id 766)
- `cyan_glazed_terracotta` (id 406)
- `cyan_spawn_block_top` (id 742)
- `deep_drill_top` (id 1137)
- `electric_drill_top` (id 1096)
- `gray_glazed_terracotta` (id 398)
- `gray_spawn_block_top` (id 737)
- `green_glazed_terracotta` (id 422)
- `green_spawn_block_top` (id 732)
- `iron_chest_top` (id 914)
- `light_blue_glazed_terracotta` (id 382)
- `light_blue_spawn_block_top` (id 727)
- `light_gray_glazed_terracotta` (id 402)
- `light_gray_spawn_block_top` (id 722)
- `lime_glazed_terracotta` (id 390)
- `lime_spawn_block_top` (id 717)
- `magenta_glazed_terracotta` (id 378)
- `magenta_spawn_block_top` (id 712)
- `moonstone_chest_top` (id 446)
- `orange_glazed_terracotta` (id 374)
- `orange_spawn_block_top` (id 707)
- `pink_glazed_terracotta` (id 394)
- `pink_spawn_block_top` (id 702)
- `press_top` (id 1069)
- `purple_glazed_terracotta` (id 410)
- `purple_spawn_block_top` (id 697)
- `radar_screen` (id 19)
- `recycler_top` (id 1179)
- `red_glazed_terracotta` (id 426)
- `red_spawn_block_top` (id 692)
- `shatter_mill_top` (id 1145)
- `shop_trader_spawn_top` (id 795)
- `shop_wizard_spawn_top` (id 801)
- `sky_tap_top` (id 1152)
- `smelter_top` (id 1060)
- `tree_cutter_top` (id 1127)
- `white_glazed_terracotta` (id 370)
- `white_spawn_block_top` (id 687)
- `wire_mill_top` (id 1076)
- `yellow_glazed_terracotta` (id 386)
- `yellow_spawn_block_top` (id 682)
| `alloy_kiln_side_running` | 33 | 250 ms |
| `auto_bench_side_running` | 35 | 250 ms |
| `black_portal` | 2 | 300 ms |
| `blue_portal` | 3 | 300 ms |
| `brown_portal` | 4 | 300 ms |
| `burner_drill_side_running` | 27 | 250 ms |
| `crop_harvester_back_running` | 45 | 250 ms |
| `crop_harvester_side_running` | 44 | 250 ms |
| `crusher_side_running` | 28 | 250 ms |
| `crystal_vat_side_running` | 42 | 250 ms |
| `cyan_portal` | 5 | 300 ms |
| `deep_drill_side_running` | 39 | 250 ms |
| `electric_drill_side_running` | 34 | 250 ms |
| `generator_side_running` | 30 | 250 ms |
| `gray_portal` | 6 | 300 ms |
| `green_portal` | 7 | 300 ms |
| `grey_portal` | 8 | 300 ms |
| `homestead_core_mid` | 26 | 250 ms |
| `lava` | 1 | 200 ms |
| `lightblue_portal` | 9 | 300 ms |
| `lightgray_portal` | 10 | 300 ms |
| `lime_portal` | 11 | 300 ms |
| `magenta_portal` | 12 | 300 ms |
| `orange_portal` | 13 | 300 ms |
| `pink_portal` | 14 | 300 ms |
| `press_side_running` | 31 | 250 ms |
| `purple_portal` | 15 | 300 ms |
| `radar_screen` | 19 | None ms |
| `recycler_side_running` | 43 | 250 ms |
| `red_portal` | 16 | 300 ms |
| `shatter_mill_side_running` | 40 | 250 ms |
| `sky_tap_side_running` | 41 | 250 ms |
| `smelter_side_running` | 29 | 250 ms |
| `smoke` | 23 | 250 ms |
| `toxic_waste` | 25 | 200 ms |
| `toxic_waste_barrel_top` | 24 | 300 ms |
| `trading_terminal_front` | 46 | 250 ms |
| `tree_cutter_back_running` | 37 | 250 ms |
| `tree_cutter_side_running` | 36 | 250 ms |
| `volt_engine_side_running` | 38 | 250 ms |
| `white_portal` | 17 | 300 ms |
| `wire_mill_side_running` | 32 | 250 ms |
| `yellow_portal` | 18 | 300 ms |

Structural note visible in the raw data: the atlas holds 46 animation roots, not 43 — `radar_screen`'s four pre-rotated copies each carry their own 4-frame ladder, which is also why `radar_screen` is the only name carrying both family notes.
## Measured drift (cnty9 → ab90qa)

The registry is build-shipped content and moves with every block update. v4 build (`cnty9`, 2026-10-27) → v5 build (`ab90qa`, 2026-11-03):

- atlas entries: 1,219 → 1,210
- rotation families (turned spellings): 57 (228) → 57 (228) — **unchanged**
- animation families (frame spellings): 42 (188) → 42 (188) — **unchanged**
- usable named constants: 905 → **896**
- id changes among surviving names: **334 of 905**

The complete drift (11 names):

- **added (1):** `scorpion_eggs`.
- **removed (10):** `chest_double_back_hi`, `chest_double_back_lo`, `chest_double_front_hi`, `chest_double_front_lo`, `chest_double_top_1_hi`, `chest_double_top_1_lo`, `chest_double_top_2_hi`, `chest_double_top_2_lo`, `mob_spawner_hostile_block_side`, `mob_spawner_neutral_block_side` — the double chest (8 faces) left the game data (the single-chest `chest_*` family survives intact), and spawners keep `mob_spawner_block_top` while the variant side textures are gone.

**Names are the API; ids are snapshots.** Between the two builds, 334 of 905 surviving names changed id — write `bloxdTextureIdStone`, not `351`. The engine resolves names at validation, so name-written packs survive drift; raw-id packs do not.

## Measured drift (ab90qa → xkg8x)

The registry moved again one day after the v5 launch — `ab90qa` (2026-11-03) → `xkg8x` (2026-11-04, live on production; preprod `2lcqcl` measured identical on every shader-pack surface):

- atlas entries: 1,210 → 1,220
- rotation families (turned spellings): 57 (228) → 57 (228) — **unchanged**
- animation families (frame spellings): 42 (188) → 42 (188) — **unchanged**
- usable named constants: 896 → **906**
- id changes among surviving names: **376 of 896**

The complete drift (10 names — every v5-launch removal is back):

- **added (10):** `chest_double_back_hi`, `chest_double_back_lo`, `chest_double_front_hi`, `chest_double_front_lo`, `chest_double_top_1_hi`, `chest_double_top_1_lo`, `chest_double_top_2_hi`, `chest_double_top_2_lo`, `mob_spawner_hostile_block_side`, `mob_spawner_neutral_block_side` — the double chest returned to the game data and the spawner side variants are back.
- **removed:** none.

The same doctrine applies with more force: 376 of the 896 survivors changed id in this step alone.

## Measured drift (xkg8x → bny9u)

The registry moved again the next day — `xkg8x` (2026-11-04) → `bny9u` (2026-11-05, live on production and preprod as the same byte-identical bundle):

- atlas entries: 1,220 → 1,232
- rotation families (turned spellings): 57 (228) → 57 (228) — **unchanged**
- animation families (frame spellings): 42 (188) → **43 (196)** — the new `trading_terminal_front` runs an 8-frame / 250 ms ladder
- usable named constants: 906 → **911**
- id changes among surviving names: **864 of 906** (95%)

The complete drift (5 names — two new blocks):

- **added (5):** `stone_generator_side`, `stone_generator_top`, `trading_terminal_front` (anim, 8 frames), `trading_terminal_side`, `trading_terminal_top` — the Trading Terminal and Stone Generator blocks joined the game data.
- **removed:** none.

The doctrine lands harder with every step: 864 of the 906 survivors changed id in this step alone — roughly nineteen in twenty.

## Measured drift (bny9u → v98qt8)

The registry moved again over the weekend — `bny9u` (2026-11-05) → `v98qt8` (2026-11-08, production and preprod serving the same byte-identical bundle, md5 `7458fd47ff88331d9f451d1456ff48ac`):

- atlas entries: 1,232 → 1,227
- rotation families (turned spellings): 57 (228) → 57 (228) — unchanged
- animation families (frame spellings): 43 (196) → 43 (196) — unchanged
- usable named constants: 911 → **906**
- id changes among survivors: **716 of 905** (79%)

The complete drift (7 names — three blocks became models):

- **added (1):** `hay_block_top` — the hay block family gained a distinct top texture.
- **removed (6):** `artisan_table_side`, `artisan_table_top`, `crafting_table_side`, `furnace_front`, `furnace_side`, `furnace_top` — the Furnace, the Workbench (crafting table) and the Artisan Bench left the terrain-textured blocks and became block models, so their terrain textures left the registry (the Workbench kept `crafting_table_top` — its top face is still terrain-textured).

Same principle as ever: 716 of the 905 survivors changed id on this single step — write `bloxdTextureIdStone`, not a raw number.

## Related

- [Texture API](texture-api.md) · [Engine Internals: Texture Registry](../internals/texture-registry.md) · [Version History: v4](../history/v4.md)

