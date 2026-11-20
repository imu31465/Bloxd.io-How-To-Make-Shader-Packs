# Texture catalog

> Target API: 5 · Target build: `bbb6l5` (verified in production and preprod 2026-11-20) · Status: Verified (extracted by re-running the engine's own registry builder)

The complete catalog of usable texture-name constants (`bloxdTextureId*`). **1,017 names**, alphabetical.

**Folding status (`bbb6l5`, 2026-11-20):** the animation-constant folding regression that `v98qt8` shipped is **fixed** — the animated-texture table is slot-keyed again, so the animation-family base names below (`lava`, every `*_portal`, `smoke`, `radar_screen`, `trading_terminal_front`, …) validate normally and sampling them returns the current frame. The catalog below is the folded (intended) view, re-measured on the live build.

## How to read

The **name** column is the registry name — the handle you actually write. Constant spelling CamelCases the file name: `grass_top` → `bloxdTextureIdGrassTop`, `lava` → `bloxdTextureIdLava`. **Case and underscores are not distinguished** (`bloxdTextureId_grass_top` resolves identically to `bloxdTextureIdGrassTop`). Names are the API — the loader re-resolves them against the live registry at load, so names survive registry drift ([Texture API](texture-api.md)).

The **id** column is the value the constant compares against — measured on `bbb6l5` (atlas layer + 1). Use it to decode `surface.textureId` dumps and to cross-check debug output against the day's build. **Never write ids into WGSL** — they are a snapshot of one build's atlas order (see the drift measurements below).

The **notes** column marks the two folding families. "anim (N frames)" means sampling this name automatically returns the current animation frame — **never write the frame suffix** (`lava0` is a known alias with a dedicated diagnostic). "rotation family (4 copies)" means the texture exists only as pre-rotated slots — the name refers to the root and `bloxdTexel` re-applies the rotation. Exactly one name (`radar_screen`) carries both notes.

Deliberately **not** listed: the remaining registry spellings — 776 alias names (520 frame spellings and 256 rotation spellings) — which are not usable constants; writing them draws dedicated engine error messages. The underlying 1,650-row layer table is engine-internal and covered in [Engine Internals: Texture Registry](../internals/texture-registry.md).

### How the numbers relate

The counts name different sets, so they do not sum naively:

| Count | What it counts |
|---|---|
| **1,017** | usable named constants — texture names you can write as `bloxdTextureId*` |
| **776** | alias names (520 frame + 256 rotation) — recognized spellings that are *rejected* with guidance to the base name; they are names, not constants, and add no ids |
| **1,650** | atlas entries — the actual slots in the texture atlas (ids 1–1650) |

The `bbb6l5` registry has 1,017 usable names, 111 more than `v98qt8`. Texture IDs can change between builds, so use the named constants and never hard-code numeric IDs in WGSL.

## The catalog

All 1,017 usable names are listed alphabetically. The id column shows values measured on `bbb6l5`; IDs can change between builds, so reference textures by name in WGSL.

| Name | id (bbb6l5) | Notes |
|---|---|---|
| `alloy_kiln_back` | 1413 |  |
| `alloy_kiln_front` | 1407 |  |
| `alloy_kiln_side` | 1408 |  |
| `alloy_kiln_side_running` | 33 | anim (8 frames) |
| `alloy_kiln_top` | 1409 | rotation family (4 copies) |
| `andesite_brick` | 786 |  |
| `apple_block_bottom` | 762 |  |
| `apple_block_side` | 760 |  |
| `apple_block_top` | 761 |  |
| `armour_lucky_block` | 1317 |  |
| `armour_lucky_block_rare` | 1319 |  |
| `armour_lucky_block_super` | 1321 |  |
| `ash` | 1353 |  |
| `atomic_bench_side` | 1550 |  |
| `atomic_bench_top` | 1551 |  |
| `atomic_bomb_side` | 1595 |  |
| `atomic_bomb_top` | 1596 |  |
| `atomic_spire` | 1631 |  |
| `auto_bench_back` | 1428 |  |
| `auto_bench_front` | 1422 |  |
| `auto_bench_side` | 1423 |  |
| `auto_bench_side_running` | 35 | anim (8 frames) |
| `auto_bench_top` | 1424 | rotation family (4 copies) |
| `autocrafter_bottom` | 1284 |  |
| `autocrafter_lunite_bottom` | 1295 |  |
| `autocrafter_lunite_side` | 1294 |  |
| `autocrafter_side` | 1282 |  |
| `banana_block_side` | 1220 |  |
| `banana_block_top` | 1221 |  |
| `battery_casing` | 1598 |  |
| `battery_cell` | 1599 |  |
| `battery_cell_bottom` | 1601 |  |
| `battery_cell_running` | 66 | anim (8 frames) |
| `battery_cell_top` | 1600 |  |
| `battery_controller_front` | 1597 |  |
| `battery_controller_front_running` | 65 | anim (8 frames) |
| `beacon` | 658 |  |
| `bedrock` | 662 |  |
| `beetroot_block_bottom` | 1246 |  |
| `beetroot_block_side` | 1244 |  |
| `beetroot_block_top` | 1245 |  |
| `belt_drop_side` | 1507 |  |
| `belt_drop_top` | 1506 |  |
| `belt_lift_side` | 1505 |  |
| `belt_lift_top` | 1504 |  |
| `belt_loader_slab_front` | 1432 |  |
| `belt_loader_top` | 1431 |  |
| `belt_tunnel_back` | 1521 |  |
| `belt_tunnel_exit_top` | 1522 | rotation family (4 copies) |
| `belt_tunnel_mouth` | 1515 |  |
| `belt_tunnel_side` | 1516 |  |
| `belt_tunnel_top` | 1517 | rotation family (4 copies) |
| `black_concrete` | 601 |  |
| `black_glazed_terracotta` | 750 | rotation family (4 copies) |
| `black_planks` | 689 |  |
| `black_portal` | 2 | anim (4 frames) |
| `black_spawn_block_side` | 1081 |  |
| `black_spawn_block_top` | 1077 | rotation family (4 copies) |
| `block_destroyer_tnt_side` | 1339 |  |
| `block_destroyer_tnt_top` | 1340 |  |
| `blue_concrete` | 602 |  |
| `blue_gen_spawn_coal` | 1095 |  |
| `blue_gen_spawn_iron` | 1096 |  |
| `blue_gen_spawn_top` | 1094 |  |
| `blue_glazed_terracotta` | 734 | rotation family (4 copies) |
| `blue_lucky_block` | 1316 |  |
| `blue_lucky_block_rare` | 1318 |  |
| `blue_lucky_block_super` | 1320 |  |
| `blue_planks` | 685 |  |
| `blue_portal` | 3 | anim (4 frames) |
| `blue_spawn_block_side` | 1076 |  |
| `blue_spawn_block_top` | 1072 | rotation family (4 copies) |
| `bone_block_side` | 1139 |  |
| `bone_block_top` | 1140 |  |
| `bookshelf` | 885 |  |
| `bookshelf_1` | 887 |  |
| `bookshelf_2` | 888 |  |
| `bookshelf_3` | 889 |  |
| `bookshelf_4` | 890 |  |
| `bookshelf_5` | 891 |  |
| `bookshelf_empty` | 886 |  |
| `bouncy_bomb_block` | 912 |  |
| `bowling_alley_floor` | 1300 |  |
| `bread_block_back` | 756 |  |
| `bread_block_front` | 755 |  |
| `bread_block_side` | 757 |  |
| `bread_block_top` | 758 |  |
| `brick` | 643 |  |
| `brown_concrete` | 603 |  |
| `brown_glazed_terracotta` | 738 | rotation family (4 copies) |
| `brown_mushroom_block` | 857 |  |
| `brown_planks` | 686 |  |
| `brown_portal` | 4 | anim (4 frames) |
| `brown_spawn_block_side` | 1071 |  |
| `brown_spawn_block_top` | 1067 | rotation family (4 copies) |
| `building_lucky_block` | 1311 |  |
| `building_lucky_block_rare` | 1313 |  |
| `building_lucky_block_super` | 1315 |  |
| `burner_drill_back` | 1370 |  |
| `burner_drill_bottom` | 1369 |  |
| `burner_drill_front` | 1363 |  |
| `burner_drill_side` | 1364 |  |
| `burner_drill_side_running` | 27 | anim (8 frames) |
| `burner_drill_top` | 1365 | rotation family (4 copies) |
| `cactus_dry` | 673 |  |
| `cactus_top` | 672 |  |
| `carrot_block_bottom` | 1242 |  |
| `carrot_block_side` | 1240 |  |
| `carrot_block_top` | 1241 |  |
| `carved_messy_stone` | 1148 |  |
| `carved_pumpkin` | 864 |  |
| `centrifuge_back` | 1570 |  |
| `centrifuge_back_running` | 53 | anim (8 frames) |
| `centrifuge_bottom` | 1569 |  |
| `centrifuge_side` | 1564 |  |
| `centrifuge_side_flip` | 1571 |  |
| `centrifuge_side_flip_running` | 54 | anim (8 frames) |
| `centrifuge_side_running` | 52 | anim (8 frames) |
| `centrifuge_top` | 1565 | rotation family (4 copies) |
| `chalk` | 1160 |  |
| `chalk_black` | 1176 |  |
| `chalk_blue` | 1175 |  |
| `chalk_bricks_black` | 1192 |  |
| `chalk_bricks_blue` | 1191 |  |
| `chalk_bricks_brown` | 1190 |  |
| `chalk_bricks_cyan` | 1189 |  |
| `chalk_bricks_gray` | 1188 |  |
| `chalk_bricks_green` | 1187 |  |
| `chalk_bricks_light_blue` | 1186 |  |
| `chalk_bricks_light_gray` | 1185 |  |
| `chalk_bricks_lime` | 1184 |  |
| `chalk_bricks_magenta` | 1183 |  |
| `chalk_bricks_orange` | 1182 |  |
| `chalk_bricks_pink` | 1181 |  |
| `chalk_bricks_purple` | 1180 |  |
| `chalk_bricks_red` | 1179 |  |
| `chalk_bricks_slab_side_black` | 1208 |  |
| `chalk_bricks_slab_side_blue` | 1207 |  |
| `chalk_bricks_slab_side_brown` | 1206 |  |
| `chalk_bricks_slab_side_cyan` | 1205 |  |
| `chalk_bricks_slab_side_gray` | 1204 |  |
| `chalk_bricks_slab_side_green` | 1203 |  |
| `chalk_bricks_slab_side_light_blue` | 1202 |  |
| `chalk_bricks_slab_side_light_gray` | 1201 |  |
| `chalk_bricks_slab_side_lime` | 1200 |  |
| `chalk_bricks_slab_side_magenta` | 1199 |  |
| `chalk_bricks_slab_side_orange` | 1198 |  |
| `chalk_bricks_slab_side_pink` | 1197 |  |
| `chalk_bricks_slab_side_purple` | 1196 |  |
| `chalk_bricks_slab_side_red` | 1195 |  |
| `chalk_bricks_slab_side_white` | 1194 |  |
| `chalk_bricks_slab_side_yellow` | 1193 |  |
| `chalk_bricks_white` | 1178 |  |
| `chalk_bricks_yellow` | 1177 |  |
| `chalk_brown` | 1174 |  |
| `chalk_cyan` | 1173 |  |
| `chalk_gray` | 1172 |  |
| `chalk_green` | 1171 |  |
| `chalk_light_blue` | 1170 |  |
| `chalk_light_gray` | 1169 |  |
| `chalk_lime` | 1168 |  |
| `chalk_magenta` | 1167 |  |
| `chalk_orange` | 1166 |  |
| `chalk_pink` | 1165 |  |
| `chalk_purple` | 1164 |  |
| `chalk_red` | 1163 |  |
| `chalk_white` | 1162 |  |
| `chalk_yellow` | 1161 |  |
| `charge_vault_side` | 1436 |  |
| `charge_vault_top` | 1435 |  |
| `charging_pad_side` | 1481 |  |
| `charging_pad_top` | 1480 |  |
| `checkpoint_block` | 1082 | rotation family (4 copies) |
| `cherry_block_bottom` | 911 |  |
| `cherry_block_side` | 909 |  |
| `cherry_block_top` | 910 |  |
| `chest_back` | 670 |  |
| `chest_double_back_hi` | 1541 |  |
| `chest_double_back_lo` | 1540 |  |
| `chest_double_front_hi` | 1535 |  |
| `chest_double_front_lo` | 1534 |  |
| `chest_double_top_1_hi` | 1537 |  |
| `chest_double_top_1_lo` | 1536 |  |
| `chest_double_top_2_hi` | 1539 |  |
| `chest_double_top_2_lo` | 1538 |  |
| `chest_front` | 664 |  |
| `chest_side` | 665 |  |
| `chest_top` | 666 | rotation family (4 copies) |
| `chili_pepper_block_bottom` | 999 |  |
| `chili_pepper_block_side` | 997 |  |
| `chili_pepper_block_top` | 998 |  |
| `chiseled_red_sandstone` | 777 |  |
| `chiseled_sandstone` | 653 |  |
| `clay` | 523 |  |
| `coal_block` | 561 |  |
| `coal_deposit` | 1354 |  |
| `coal_ore` | 555 |  |
| `coarse_dirt` | 519 |  |
| `coconut_block_bottom` | 843 |  |
| `coconut_block_side` | 841 |  |
| `coconut_block_top` | 842 |  |
| `code_block` | 1000 |  |
| `collider_bottom` | 1607 |  |
| `collider_side_off` | 1602 |  |
| `collider_side_running` | 67 | anim (32 frames) |
| `collider_top` | 1603 | rotation family (4 copies) |
| `comet_heart` | 1492 |  |
| `comet_ore` | 1491 |  |
| `compressed_messy_stone` | 851 |  |
| `condenser_back` | 1562 |  |
| `condenser_back_running` | 50 | anim (8 frames) |
| `condenser_bottom` | 1561 |  |
| `condenser_side` | 1556 |  |
| `condenser_side_flip` | 1563 |  |
| `condenser_side_flip_running` | 51 | anim (8 frames) |
| `condenser_side_running` | 49 | anim (8 frames) |
| `condenser_top` | 1557 | rotation family (4 copies) |
| `conveyor_belt_bottom` | 1403 |  |
| `conveyor_belt_slab_side` | 1402 |  |
| `conveyor_belt_top` | 1401 |  |
| `conveyor_belt_turn_left` | 1493 |  |
| `conveyor_belt_turn_right` | 1494 |  |
| `coolant_channel` | 64 | anim (8 frames) |
| `coolant_mixer_back` | 1640 |  |
| `coolant_mixer_back_running` | 69 | anim (8 frames) |
| `coolant_mixer_bottom` | 1639 |  |
| `coolant_mixer_side` | 1634 |  |
| `coolant_mixer_side_flip` | 1641 |  |
| `coolant_mixer_side_flip_running` | 70 | anim (8 frames) |
| `coolant_mixer_side_running` | 68 | anim (8 frames) |
| `coolant_mixer_top` | 1635 | rotation family (4 copies) |
| `copper_block` | 1647 |  |
| `copper_deposit` | 1357 |  |
| `copper_ore` | 1362 |  |
| `corn_block_bottom` | 915 |  |
| `corn_block_side` | 913 |  |
| `corn_block_top` | 914 |  |
| `crafting_table_top` | 1283 |  |
| `crate` | 1239 |  |
| `crop_harvester_back` | 1514 |  |
| `crop_harvester_back_running` | 45 | anim (4 frames) |
| `crop_harvester_front` | 1508 |  |
| `crop_harvester_side` | 1509 |  |
| `crop_harvester_side_running` | 44 | anim (4 frames) |
| `crop_harvester_top` | 1510 | rotation family (4 copies) |
| `crusher_back` | 1377 |  |
| `crusher_front` | 1371 |  |
| `crusher_side` | 1372 |  |
| `crusher_side_running` | 28 | anim (4 frames) |
| `crusher_top` | 1373 | rotation family (4 copies) |
| `crystal_block` | 1351 |  |
| `crystal_vat_back` | 1488 |  |
| `crystal_vat_front` | 1482 |  |
| `crystal_vat_side` | 1483 |  |
| `crystal_vat_side_running` | 42 | anim (8 frames) |
| `crystal_vat_top` | 1484 | rotation family (4 copies) |
| `custom_lobby_block_side` | 1090 |  |
| `custom_lobby_block_top` | 1086 | rotation family (4 copies) |
| `cut_red_sandstone` | 778 |  |
| `cut_sandstone` | 774 |  |
| `cyan_concrete` | 604 |  |
| `cyan_gen_spawn_coal` | 1104 |  |
| `cyan_gen_spawn_iron` | 1105 |  |
| `cyan_gen_spawn_top` | 1103 |  |
| `cyan_glazed_terracotta` | 726 | rotation family (4 copies) |
| `cyan_planks` | 683 |  |
| `cyan_portal` | 5 | anim (4 frames) |
| `cyan_spawn_block_side` | 1066 |  |
| `cyan_spawn_block_top` | 1062 | rotation family (4 copies) |
| `dark_green_bricks` | 781 |  |
| `darkstone` | 1528 |  |
| `darkstone_bricks` | 1529 |  |
| `darkstone_bricks_cracked` | 1530 |  |
| `darkstone_bricks_lava` | 1531 |  |
| `darkstone_engraved` | 1532 |  |
| `darkstone_smooth` | 1533 |  |
| `deep_drill_back` | 1462 |  |
| `deep_drill_bottom` | 1461 |  |
| `deep_drill_front` | 1455 |  |
| `deep_drill_side` | 1456 |  |
| `deep_drill_side_running` | 39 | anim (8 frames) |
| `deep_drill_top` | 1457 | rotation family (4 copies) |
| `dense_silo_side` | 1618 |  |
| `dense_silo_top` | 1617 |  |
| `diamond_block` | 663 |  |
| `diamond_gen_spawn_side` | 1128 |  |
| `diamond_gen_spawn_top` | 1127 |  |
| `diamond_ore` | 560 |  |
| `diorite_brick` | 784 |  |
| `dirt` | 518 |  |
| `drop_location_block_side` | 1135 |  |
| `drop_location_block_top` | 1134 |  |
| `drop_pad` | 1360 |  |
| `dry_grass_block` | 1302 |  |
| `dry_grass_block_side` | 1301 |  |
| `electric_drill_back` | 1421 |  |
| `electric_drill_bottom` | 1420 |  |
| `electric_drill_front` | 1414 |  |
| `electric_drill_side` | 1415 |  |
| `electric_drill_side_running` | 34 | anim (8 frames) |
| `electric_drill_top` | 1416 | rotation family (4 copies) |
| `emerald_block` | 565 |  |
| `emerald_ore` | 559 |  |
| `end_stone` | 554 |  |
| `engraved_andesite` | 785 |  |
| `engraved_diorite` | 783 |  |
| `engraved_granite` | 787 |  |
| `evil_lucky_block` | 1344 |  |
| `evil_lucky_block_face` | 1345 |  |
| `explosive_paint_black_side` | 947 |  |
| `explosive_paint_black_top` | 948 |  |
| `explosive_paint_blue_side` | 945 |  |
| `explosive_paint_blue_top` | 946 |  |
| `explosive_paint_brown_side` | 943 |  |
| `explosive_paint_brown_top` | 944 |  |
| `explosive_paint_cyan_side` | 941 |  |
| `explosive_paint_cyan_top` | 942 |  |
| `explosive_paint_gray_side` | 939 |  |
| `explosive_paint_gray_top` | 940 |  |
| `explosive_paint_green_side` | 937 |  |
| `explosive_paint_green_top` | 938 |  |
| `explosive_paint_light_blue_side` | 935 |  |
| `explosive_paint_light_blue_top` | 936 |  |
| `explosive_paint_light_gray_side` | 933 |  |
| `explosive_paint_light_gray_top` | 934 |  |
| `explosive_paint_lime_side` | 931 |  |
| `explosive_paint_lime_top` | 932 |  |
| `explosive_paint_magenta_side` | 929 |  |
| `explosive_paint_magenta_top` | 930 |  |
| `explosive_paint_orange_side` | 927 |  |
| `explosive_paint_orange_top` | 928 |  |
| `explosive_paint_pink_side` | 925 |  |
| `explosive_paint_pink_top` | 926 |  |
| `explosive_paint_purple_side` | 923 |  |
| `explosive_paint_purple_top` | 924 |  |
| `explosive_paint_quick_black` | 964 |  |
| `explosive_paint_quick_blue` | 963 |  |
| `explosive_paint_quick_brown` | 962 |  |
| `explosive_paint_quick_cyan` | 961 |  |
| `explosive_paint_quick_gray` | 960 |  |
| `explosive_paint_quick_green` | 959 |  |
| `explosive_paint_quick_light_blue` | 958 |  |
| `explosive_paint_quick_light_gray` | 957 |  |
| `explosive_paint_quick_lime` | 956 |  |
| `explosive_paint_quick_magenta` | 955 |  |
| `explosive_paint_quick_orange` | 954 |  |
| `explosive_paint_quick_pink` | 953 |  |
| `explosive_paint_quick_purple` | 952 |  |
| `explosive_paint_quick_red` | 951 |  |
| `explosive_paint_quick_white` | 950 |  |
| `explosive_paint_quick_yellow` | 949 |  |
| `explosive_paint_red_side` | 921 |  |
| `explosive_paint_red_top` | 922 |  |
| `explosive_paint_seeking_black` | 980 |  |
| `explosive_paint_seeking_blue` | 979 |  |
| `explosive_paint_seeking_brown` | 978 |  |
| `explosive_paint_seeking_cyan` | 977 |  |
| `explosive_paint_seeking_gray` | 976 |  |
| `explosive_paint_seeking_green` | 975 |  |
| `explosive_paint_seeking_light_blue` | 974 |  |
| `explosive_paint_seeking_light_gray` | 973 |  |
| `explosive_paint_seeking_lime` | 972 |  |
| `explosive_paint_seeking_magenta` | 971 |  |
| `explosive_paint_seeking_orange` | 970 |  |
| `explosive_paint_seeking_pink` | 969 |  |
| `explosive_paint_seeking_purple` | 968 |  |
| `explosive_paint_seeking_red` | 967 |  |
| `explosive_paint_seeking_white` | 966 |  |
| `explosive_paint_seeking_yellow` | 965 |  |
| `explosive_paint_sticky_black` | 996 |  |
| `explosive_paint_sticky_blue` | 995 |  |
| `explosive_paint_sticky_brown` | 994 |  |
| `explosive_paint_sticky_cyan` | 993 |  |
| `explosive_paint_sticky_gray` | 992 |  |
| `explosive_paint_sticky_green` | 991 |  |
| `explosive_paint_sticky_light_blue` | 990 |  |
| `explosive_paint_sticky_light_gray` | 989 |  |
| `explosive_paint_sticky_lime` | 988 |  |
| `explosive_paint_sticky_magenta` | 987 |  |
| `explosive_paint_sticky_orange` | 986 |  |
| `explosive_paint_sticky_pink` | 985 |  |
| `explosive_paint_sticky_purple` | 984 |  |
| `explosive_paint_sticky_red` | 983 |  |
| `explosive_paint_sticky_white` | 982 |  |
| `explosive_paint_sticky_yellow` | 981 |  |
| `explosive_paint_white_side` | 919 |  |
| `explosive_paint_white_top` | 920 |  |
| `explosive_paint_yellow_side` | 917 |  |
| `explosive_paint_yellow_top` | 918 |  |
| `express_belt_slab_side` | 1620 |  |
| `express_belt_top` | 1619 |  |
| `express_belt_turn_left` | 1621 |  |
| `express_belt_turn_right` | 1622 |  |
| `extra_compressed_messy_stone` | 852 |  |
| `fallen_cherry_leaves_side` | 907 |  |
| `fallen_maple_leaves_side` | 799 |  |
| `farmland` | 754 |  |
| `fast_belt_slab_side` | 1479 |  |
| `fast_belt_top` | 1478 |  |
| `fast_belt_turn_left` | 1495 |  |
| `fast_belt_turn_right` | 1496 |  |
| `fast_loader_slab_front` | 1624 |  |
| `fast_loader_top` | 1623 |  |
| `fertilised_soil` | 1247 |  |
| `finish_block` | 1133 |  |
| `fireball_block` | 860 |  |
| `fluid_tank` | 1587 |  |
| `fluid_tank_fill1` | 71 | anim (8 frames) |
| `fluid_tank_fill2` | 72 | anim (8 frames) |
| `fluid_tank_fill3` | 73 | anim (8 frames) |
| `fluid_tank_fill4` | 74 | anim (8 frames) |
| `food_lucky_block` | 1329 |  |
| `food_lucky_block_rare` | 1331 |  |
| `food_lucky_block_super` | 1333 |  |
| `forge_hopper_top` | 1490 |  |
| `fuel_port` | 1591 |  |
| `fuel_rod` | 63 | anim (8 frames) |
| `generator_side` | 1385 |  |
| `generator_side_running` | 30 | anim (8 frames) |
| `generator_top` | 1386 |  |
| `ghost_chest_back` | 1277 |  |
| `ghost_chest_front` | 1274 |  |
| `ghost_chest_side` | 1275 |  |
| `ghost_chest_top` | 1276 |  |
| `ghost_lucky_block` | 1278 |  |
| `ghost_mystery_block` | 1279 |  |
| `glass` | 622 |  |
| `glass_black` | 623 |  |
| `glass_blue` | 624 |  |
| `glass_brown` | 625 |  |
| `glass_cyan` | 626 |  |
| `glass_gray` | 627 |  |
| `glass_green` | 629 |  |
| `glass_light_blue` | 630 |  |
| `glass_light_gray` | 628 |  |
| `glass_lime` | 631 |  |
| `glass_magenta` | 632 |  |
| `glass_orange` | 633 |  |
| `glass_pink` | 634 |  |
| `glass_purple` | 635 |  |
| `glass_red` | 636 |  |
| `glass_silver` | 639 |  |
| `glass_white` | 637 |  |
| `glass_yellow` | 638 |  |
| `glow_lamp` | 1629 |  |
| `glowstone` | 659 |  |
| `gold_block` | 563 |  |
| `gold_deposit` | 1358 |  |
| `gold_ore` | 557 |  |
| `granite_brick` | 788 |  |
| `graphite` | 1593 |  |
| `graphite_block` | 1593 |  |
| `grass_block_side` | 520 |  |
| `grass_top` | 521 |  |
| `gravel` | 524 |  |
| `gray_concrete` | 599 |  |
| `gray_gen_spawn_coal` | 1113 |  |
| `gray_gen_spawn_iron` | 1114 |  |
| `gray_gen_spawn_top` | 1112 |  |
| `gray_glazed_terracotta` | 718 | rotation family (4 copies) |
| `gray_planks` | 681 |  |
| `gray_portal` | 6 | anim (4 frames) |
| `gray_spawn_block_side` | 1061 |  |
| `gray_spawn_block_top` | 1057 | rotation family (4 copies) |
| `green_bricks` | 780 |  |
| `green_concrete` | 613 |  |
| `green_glazed_terracotta` | 742 | rotation family (4 copies) |
| `green_lucky_block` | 1328 |  |
| `green_lucky_block_rare` | 1330 |  |
| `green_lucky_block_super` | 1332 |  |
| `green_planks` | 687 |  |
| `green_portal` | 7 | anim (4 frames) |
| `green_spawn_block_side` | 1056 |  |
| `green_spawn_block_top` | 1052 | rotation family (4 copies) |
| `green_stone` | 779 |  |
| `grenade_block` | 902 |  |
| `grey_portal` | 8 | anim (4 frames) |
| `gun_lucky_block` | 1273 |  |
| `hardened_clay` | 582 |  |
| `hardened_clay_stained_black` | 598 |  |
| `hardened_clay_stained_blue` | 594 |  |
| `hardened_clay_stained_brown` | 595 |  |
| `hardened_clay_stained_cyan` | 592 |  |
| `hardened_clay_stained_gray` | 590 |  |
| `hardened_clay_stained_green` | 596 |  |
| `hardened_clay_stained_light_blue` | 586 |  |
| `hardened_clay_stained_lime` | 588 |  |
| `hardened_clay_stained_magenta` | 585 |  |
| `hardened_clay_stained_orange` | 584 |  |
| `hardened_clay_stained_pink` | 589 |  |
| `hardened_clay_stained_purple` | 593 |  |
| `hardened_clay_stained_red` | 597 |  |
| `hardened_clay_stained_silver` | 591 |  |
| `hardened_clay_stained_white` | 583 |  |
| `hardened_clay_stained_yellow` | 587 |  |
| `harvester_bottom` | 1291 |  |
| `harvester_lunite_bottom` | 1299 |  |
| `harvester_lunite_side_0` | 1296 |  |
| `harvester_lunite_side_1` | 1297 |  |
| `harvester_lunite_top` | 1298 |  |
| `harvester_side0` | 1288 |  |
| `harvester_side1` | 1289 |  |
| `harvester_top` | 1290 |  |
| `hay_block_side` | 656 |  |
| `hay_block_top` | 1547 |  |
| `homestead_core` | 1359 |  |
| `homestead_core_cap` | 1444 |  |
| `homestead_core_crown` | 1443 |  |
| `homestead_core_mid` | 26 | anim (8 frames) |
| `hyper_compressed_messy_stone` | 854 |  |
| `ice` | 654 |  |
| `ice_brick` | 789 |  |
| `iceball_block` | 861 |  |
| `invisible_solid` | 642 |  |
| `iron_block` | 562 |  |
| `iron_chest_back` | 1238 |  |
| `iron_chest_front` | 1232 |  |
| `iron_chest_side` | 1233 |  |
| `iron_chest_top` | 1234 | rotation family (4 copies) |
| `iron_deposit` | 1355 |  |
| `iron_ore` | 556 |  |
| `iron_watermelon_side` | 867 |  |
| `iron_watermelon_top` | 868 |  |
| `isotope_comet_heart` | 1633 |  |
| `isotope_comet_ore` | 1632 |  |
| `jetpack_back` | 1630 |  |
| `jungle_grass_block` | 1210 |  |
| `jungle_grass_block_side` | 1209 |  |
| `lapis_block` | 564 |  |
| `lapis_ore` | 558 |  |
| `laser_back` | 1610 |  |
| `laser_front` | 1608 |  |
| `laser_side` | 1609 |  |
| `lava` | 1 | anim (16 frames) |
| `leather_block_side` | 1229 |  |
| `leather_block_top` | 1230 |  |
| `leaves_aspen` | 616 |  |
| `leaves_aspen_autumn` | 1231 |  |
| `leaves_cedar` | 791 |  |
| `leaves_cherry` | 906 |  |
| `leaves_cherry_fruity` | 1227 |  |
| `leaves_jungle` | 618 |  |
| `leaves_mango` | 1215 |  |
| `leaves_mango_fruity` | 1228 |  |
| `leaves_maple` | 617 |  |
| `leaves_maple_autumn` | 798 |  |
| `leaves_maple_fruity` | 1222 |  |
| `leaves_palm` | 792 |  |
| `leaves_palm_fruity` | 1225 |  |
| `leaves_pear` | 846 |  |
| `leaves_pear_fruity` | 1226 |  |
| `leaves_pine` | 615 |  |
| `leaves_pine_cone` | 1223 |  |
| `leaves_plum` | 790 |  |
| `leaves_plum_fruity` | 1224 |  |
| `leaves_spectral` | 1152 |  |
| `light_blue_concrete` | 605 |  |
| `light_blue_glazed_terracotta` | 702 | rotation family (4 copies) |
| `light_blue_lucky_block` | 1254 |  |
| `light_blue_planks` | 677 |  |
| `light_blue_spawn_block_side` | 1051 |  |
| `light_blue_spawn_block_top` | 1047 | rotation family (4 copies) |
| `light_gray_concrete` | 600 |  |
| `light_gray_glazed_terracotta` | 722 | rotation family (4 copies) |
| `light_gray_planks` | 682 |  |
| `light_gray_spawn_block_side` | 1046 |  |
| `light_gray_spawn_block_top` | 1042 | rotation family (4 copies) |
| `lightblue_portal` | 9 | anim (4 frames) |
| `lightgray_portal` | 10 | anim (4 frames) |
| `lime_concrete` | 606 |  |
| `lime_gen_spawn_coal` | 1098 |  |
| `lime_gen_spawn_iron` | 1099 |  |
| `lime_gen_spawn_top` | 1097 |  |
| `lime_glazed_terracotta` | 710 | rotation family (4 copies) |
| `lime_planks` | 679 |  |
| `lime_portal` | 11 | anim (4 frames) |
| `lime_spawn_block_side` | 1041 |  |
| `lime_spawn_block_top` | 1037 | rotation family (4 copies) |
| `log_ancient_maple` | 1343 |  |
| `log_aspen` | 530 |  |
| `log_cedar` | 529 |  |
| `log_cherry` | 903 |  |
| `log_jungle` | 531 |  |
| `log_mango` | 1212 |  |
| `log_maple` | 526 |  |
| `log_palm` | 793 |  |
| `log_pear` | 844 |  |
| `log_pine` | 527 |  |
| `log_plum` | 528 |  |
| `log_spectral` | 1149 |  |
| `lucky_block_pink_question` | 1280 |  |
| `lucky_block_pink_question_rare` | 1335 |  |
| `lucky_block_pink_question_super` | 1337 |  |
| `lunite_block` | 1293 |  |
| `lunite_ore` | 1292 |  |
| `machine_bench_side` | 1437 |  |
| `machine_bench_top` | 1438 |  |
| `machine_side` | 1361 |  |
| `magenta_concrete` | 607 |  |
| `magenta_glazed_terracotta` | 698 | rotation family (4 copies) |
| `magenta_planks` | 676 |  |
| `magenta_portal` | 12 | anim (4 frames) |
| `magenta_spawn_block_side` | 1036 |  |
| `magenta_spawn_block_top` | 1032 | rotation family (4 copies) |
| `magma` | 772 |  |
| `mailbox_front` | 892 |  |
| `mailbox_front_full` | 894 |  |
| `mailbox_side` | 893 |  |
| `mango_block_bottom` | 1219 |  |
| `mango_block_side` | 1217 |  |
| `mango_block_top` | 1218 |  |
| `mega_compressed_messy_stone` | 856 |  |
| `melon_side` | 865 |  |
| `melon_top` | 866 |  |
| `melting_ice` | 916 |  |
| `messy_stone` | 544 |  |
| `mob_farm_back` | 1586 |  |
| `mob_farm_front` | 1580 |  |
| `mob_farm_side` | 1581 |  |
| `mob_farm_side_running` | 58 | anim (8 frames) |
| `mob_farm_top` | 1582 | rotation family (4 copies) |
| `mob_spawner_block_empty_side` | 1144 |  |
| `mob_spawner_block_top` | 1142 |  |
| `mob_spawner_hostile_block_side` | 1143 |  |
| `mob_spawner_neutral_block_side` | 1159 |  |
| `mob_spawner_passive_block_side` | 1141 |  |
| `moonstone_block` | 771 |  |
| `moonstone_chest_back` | 770 |  |
| `moonstone_chest_front` | 764 |  |
| `moonstone_chest_side` | 765 |  |
| `moonstone_chest_top` | 766 | rotation family (4 copies) |
| `moonstone_explosive_side` | 660 |  |
| `moonstone_explosive_top` | 661 |  |
| `moonstone_gen_spawn_side` | 1130 |  |
| `moonstone_gen_spawn_top` | 1129 |  |
| `moonstone_ore` | 763 |  |
| `mossy_cobblestone` | 759 |  |
| `mushroom_stem` | 859 |  |
| `mystery_block` | 899 |  |
| `neon_black` | 1272 |  |
| `neon_blue` | 1271 |  |
| `neon_brown` | 1270 |  |
| `neon_cyan` | 1269 |  |
| `neon_gray` | 1268 |  |
| `neon_green` | 1267 |  |
| `neon_light_blue` | 1266 |  |
| `neon_light_gray` | 1265 |  |
| `neon_lime` | 1264 |  |
| `neon_magenta` | 1263 |  |
| `neon_orange` | 1262 |  |
| `neon_pink` | 1261 |  |
| `neon_purple` | 1260 |  |
| `neon_red` | 1259 |  |
| `neon_white` | 1258 |  |
| `neon_yellow` | 1257 |  |
| `nether_brick` | 645 |  |
| `netherrack` | 646 |  |
| `nova_bomb_side` | 1649 |  |
| `nova_bomb_top` | 1650 |  |
| `obby_absorb_block` | 1137 |  |
| `obby_absorb_death_block` | 1138 |  |
| `obby_death_block` | 1136 |  |
| `obsidian` | 655 |  |
| `orange_concrete` | 608 |  |
| `orange_glazed_terracotta` | 694 | rotation family (4 copies) |
| `orange_lucky_block` | 1322 |  |
| `orange_lucky_block_rare` | 1324 |  |
| `orange_lucky_block_super` | 1326 |  |
| `orange_planks` | 675 |  |
| `orange_portal` | 13 | anim (4 frames) |
| `orange_spawn_block_side` | 1031 |  |
| `orange_spawn_block_top` | 1027 | rotation family (4 copies) |
| `ore_gen_spawn_side` | 1132 |  |
| `ore_gen_spawn_top` | 1131 |  |
| `output` | 1555 |  |
| `packed_snow` | 1147 |  |
| `parts_bench_side` | 1439 |  |
| `parts_bench_top` | 1440 |  |
| `patterned_glass_black` | 869 |  |
| `patterned_glass_blue` | 870 |  |
| `patterned_glass_brown` | 871 |  |
| `patterned_glass_cyan` | 872 |  |
| `patterned_glass_gray` | 873 |  |
| `patterned_glass_green` | 875 |  |
| `patterned_glass_light_blue` | 876 |  |
| `patterned_glass_light_gray` | 874 |  |
| `patterned_glass_lime` | 877 |  |
| `patterned_glass_magenta` | 878 |  |
| `patterned_glass_orange` | 879 |  |
| `patterned_glass_pink` | 880 |  |
| `patterned_glass_purple` | 881 |  |
| `patterned_glass_red` | 882 |  |
| `patterned_glass_white` | 883 |  |
| `patterned_glass_yellow` | 884 |  |
| `pear_block_bottom` | 850 |  |
| `pear_block_side` | 848 |  |
| `pear_block_top` | 849 |  |
| `pet_lucky_block` | 1281 |  |
| `pine_cone_block_side` | 1157 |  |
| `pine_cone_block_top` | 1158 |  |
| `pine_grass_block` | 1155 |  |
| `pine_grass_block_side` | 1154 |  |
| `pink_concrete` | 609 |  |
| `pink_gen_spawn_coal` | 1110 |  |
| `pink_gen_spawn_iron` | 1111 |  |
| `pink_gen_spawn_top` | 1109 |  |
| `pink_glazed_terracotta` | 714 | rotation family (4 copies) |
| `pink_planks` | 680 |  |
| `pink_portal` | 14 | anim (4 frames) |
| `pink_spawn_block_side` | 1026 |  |
| `pink_spawn_block_top` | 1022 | rotation family (4 copies) |
| `planks_aspen` | 533 |  |
| `planks_cedar` | 537 |  |
| `planks_cherry` | 905 |  |
| `planks_jungle` | 535 |  |
| `planks_mango` | 1214 |  |
| `planks_maple` | 532 |  |
| `planks_palm` | 794 |  |
| `planks_pear` | 845 |  |
| `planks_pine` | 536 |  |
| `planks_plum` | 534 |  |
| `planks_spectral` | 1151 |  |
| `plum_block_bottom` | 840 |  |
| `plum_block_side` | 838 |  |
| `plum_block_top` | 839 |  |
| `podzol_top` | 773 |  |
| `potato_block` | 1243 |  |
| `potion_lucky_block` | 1334 |  |
| `potion_lucky_block_rare` | 1336 |  |
| `potion_lucky_block_super` | 1338 |  |
| `press_back` | 1393 |  |
| `press_front` | 1387 |  |
| `press_side` | 1388 |  |
| `press_side_running` | 31 | anim (4 frames) |
| `press_top` | 1389 | rotation family (4 copies) |
| `protector` | 671 |  |
| `protector_faction` | 896 |  |
| `protector_tribe` | 895 |  |
| `pump_bottom` | 1554 |  |
| `pump_side` | 1552 |  |
| `pump_side_running` | 48 | anim (8 frames) |
| `pump_top` | 1553 |  |
| `pumpkin_face_on` | 619 |  |
| `pumpkin_side` | 862 |  |
| `pumpkin_top` | 863 |  |
| `pure_coal_ore` | 1346 |  |
| `pure_copper_ore` | 1526 |  |
| `pure_diamond_ore` | 1349 |  |
| `pure_gold_ore` | 1348 |  |
| `pure_iron_ore` | 1347 |  |
| `pure_moonstone_ore` | 1350 |  |
| `pure_uranium_ore` | 1646 |  |
| `pure_voltite_ore` | 1527 |  |
| `purple_concrete` | 610 |  |
| `purple_glazed_terracotta` | 730 | rotation family (4 copies) |
| `purple_lucky_block` | 1310 |  |
| `purple_lucky_block_rare` | 1312 |  |
| `purple_lucky_block_super` | 1314 |  |
| `purple_planks` | 684 |  |
| `purple_portal` | 15 | anim (4 frames) |
| `purple_spawn_block_side` | 1021 |  |
| `purple_spawn_block_top` | 1017 | rotation family (4 copies) |
| `quartz_block_chiseled` | 648 |  |
| `quartz_block_side` | 647 |  |
| `radar_bottom` | 1250 |  |
| `radar_screen` | 19 | anim (8 frames); rotation family (4 copies) |
| `radar_side_active` | 1248 |  |
| `radar_side_inactive` | 1251 |  |
| `radar_top_active` | 1249 |  |
| `radar_top_inactive` | 1252 |  |
| `reactor_base` | 1642 |  |
| `reactor_base_top` | 1643 |  |
| `reactor_casing` | 1589 |  |
| `reactor_controller_green` | 59 | anim (4 frames) |
| `reactor_controller_orange` | 61 | anim (4 frames) |
| `reactor_controller_red` | 62 | anim (4 frames) |
| `reactor_controller_yellow` | 60 | anim (4 frames) |
| `reactor_frame` | 1588 |  |
| `reactor_glass` | 1590 |  |
| `reactor_slag` | 1594 |  |
| `recycler_back` | 1503 |  |
| `recycler_front` | 1497 |  |
| `recycler_side` | 1498 |  |
| `recycler_side_running` | 43 | anim (8 frames) |
| `recycler_top` | 1499 | rotation family (4 copies) |
| `red_concrete` | 611 |  |
| `red_gen_spawn_coal` | 1092 |  |
| `red_gen_spawn_iron` | 1093 |  |
| `red_gen_spawn_top` | 1091 |  |
| `red_glazed_terracotta` | 746 | rotation family (4 copies) |
| `red_lucky_block` | 1255 |  |
| `red_lucky_block_rare` | 1306 |  |
| `red_lucky_block_super` | 1308 |  |
| `red_mushroom_block` | 858 |  |
| `red_planks` | 688 |  |
| `red_portal` | 16 | anim (4 frames) |
| `red_sand` | 795 |  |
| `red_sandstone` | 775 |  |
| `red_sandstone_brick` | 796 |  |
| `red_sandstone_top` | 776 |  |
| `red_spawn_block_side` | 1016 |  |
| `red_spawn_block_top` | 1012 | rotation family (4 copies) |
| `redstone_lamp_off` | 641 |  |
| `redstone_lamp_on` | 640 |  |
| `rocket_block` | 900 |  |
| `rocky_dirt` | 797 |  |
| `rope_block` | 1352 |  |
| `sand` | 522 |  |
| `sandstone_brick` | 782 |  |
| `sandstone_normal` | 553 |  |
| `sandstone_top` | 652 |  |
| `scaffolding` | 1644 |  |
| `scorpion_eggs` | 1542 |  |
| `shatter_mill_back` | 1469 |  |
| `shatter_mill_front` | 1463 |  |
| `shatter_mill_side` | 1464 |  |
| `shatter_mill_side_running` | 40 | anim (4 frames) |
| `shatter_mill_top` | 1465 | rotation family (4 copies) |
| `shop_trader_spawn_face` | 1120 |  |
| `shop_trader_spawn_side` | 1119 |  |
| `shop_trader_spawn_top` | 1115 | rotation family (4 copies) |
| `shop_wizard_spawn_face` | 1126 |  |
| `shop_wizard_spawn_side` | 1125 |  |
| `shop_wizard_spawn_top` | 1121 | rotation family (4 copies) |
| `sky_spring` | 47 | anim (8 frames) |
| `sky_tap_back` | 1477 |  |
| `sky_tap_bottom` | 1476 |  |
| `sky_tap_front` | 1470 |  |
| `sky_tap_side` | 1471 |  |
| `sky_tap_side_running` | 41 | anim (8 frames) |
| `sky_tap_top` | 1472 | rotation family (4 copies) |
| `slab_andesite_brick_side` | 819 |  |
| `slab_aspen_side` | 804 |  |
| `slab_brick_side` | 836 |  |
| `slab_cedar_side` | 803 |  |
| `slab_cherry_side` | 908 |  |
| `slab_chiseled_red_sandstone_side` | 833 |  |
| `slab_chiseled_sandstone_side` | 829 |  |
| `slab_cobblestone_side` | 809 |  |
| `slab_cut_red_sandstone_side` | 834 |  |
| `slab_cut_sandstone_side` | 830 |  |
| `slab_diorite_brick_side` | 823 |  |
| `slab_dirt_side` | 807 |  |
| `slab_dry_grass_top_side` | 1303 |  |
| `slab_engraved_andesite_side` | 818 |  |
| `slab_engraved_diorite_side` | 822 |  |
| `slab_engraved_granite_side` | 826 |  |
| `slab_granite_brick_side` | 827 |  |
| `slab_grass_top_side` | 808 |  |
| `slab_ice_brick_side` | 837 |  |
| `slab_jungle_grass_top_side` | 1211 |  |
| `slab_jungle_side` | 805 |  |
| `slab_mango_side` | 1216 |  |
| `slab_maple_side` | 800 |  |
| `slab_mossy_cobblestone_side` | 814 |  |
| `slab_palm_side` | 806 |  |
| `slab_pear_side` | 847 |  |
| `slab_pine_grass_top_side` | 1156 |  |
| `slab_pine_side` | 801 |  |
| `slab_plum_side` | 802 |  |
| `slab_red_sandstone_brick_side` | 835 |  |
| `slab_red_sandstone_side` | 832 |  |
| `slab_sandstone_brick_side` | 831 |  |
| `slab_sandstone_normal_side` | 828 |  |
| `slab_smooth_stone_side` | 811 |  |
| `slab_spectral_side` | 1153 |  |
| `slab_stone_andesite_side` | 816 |  |
| `slab_stone_andesite_smooth_side` | 817 |  |
| `slab_stone_diorite_side` | 820 |  |
| `slab_stone_diorite_smooth_side` | 821 |  |
| `slab_stone_granite_side` | 824 |  |
| `slab_stone_granite_smooth_side` | 825 |  |
| `slab_stone_side` | 810 |  |
| `slab_stonebrick_carved_side` | 812 |  |
| `slab_stonebrick_mossy_side` | 815 |  |
| `slab_stonebrick_side` | 813 |  |
| `smelter_back` | 1384 |  |
| `smelter_front` | 1378 |  |
| `smelter_side` | 1379 |  |
| `smelter_side_running` | 29 | anim (8 frames) |
| `smelter_top` | 1380 | rotation family (4 copies) |
| `smoke` | 23 | anim (8 frames) |
| `smooth_stone` | 546 |  |
| `snow` | 525 |  |
| `snowy_messy_stone` | 1145 |  |
| `snowy_messy_stone_side` | 1146 |  |
| `solar_panel_bottom` | 1287 |  |
| `solar_panel_side` | 1285 |  |
| `solar_panel_top` | 1286 |  |
| `sorting_gate_slab_side` | 1430 |  |
| `sorting_gate_top` | 1429 |  |
| `sorting_gate_top_right` | 1627 |  |
| `splitter_slab_side` | 1405 |  |
| `splitter_top` | 1404 |  |
| `splitter_top_front_right` | 1626 |  |
| `splitter_top_left_front` | 1625 |  |
| `sponge` | 657 |  |
| `starframe` | 1489 |  |
| `stone` | 545 |  |
| `stone_andesite` | 549 |  |
| `stone_andesite_smooth` | 550 |  |
| `stone_deposit` | 1356 |  |
| `stone_diorite` | 547 |  |
| `stone_diorite_smooth` | 548 |  |
| `stone_generator_side` | 1545 |  |
| `stone_generator_top` | 1546 |  |
| `stone_granite` | 551 |  |
| `stone_granite_smooth` | 552 |  |
| `stonebrick` | 644 |  |
| `stonebrick_carved` | 649 |  |
| `stonebrick_cracked` | 651 |  |
| `stonebrick_mossy` | 650 |  |
| `storage_silo_side` | 1434 |  |
| `storage_silo_top` | 1433 |  |
| `stripped_aspen_log` | 539 |  |
| `stripped_cedar_log` | 543 |  |
| `stripped_cherry_log` | 904 |  |
| `stripped_jungle_log` | 541 |  |
| `stripped_mango_log` | 1213 |  |
| `stripped_maple_log` | 538 |  |
| `stripped_palm_log` | 897 |  |
| `stripped_pear_log` | 898 |  |
| `stripped_pine_log` | 542 |  |
| `stripped_plum_log` | 540 |  |
| `stripped_spectral_log` | 1150 |  |
| `super_compressed_messy_stone` | 853 |  |
| `super_rocket_block` | 901 |  |
| `synthesizer_back` | 1578 |  |
| `synthesizer_back_running` | 56 | anim (8 frames) |
| `synthesizer_bottom` | 1577 |  |
| `synthesizer_side` | 1572 |  |
| `synthesizer_side_flip` | 1579 |  |
| `synthesizer_side_flip_running` | 57 | anim (4 frames) |
| `synthesizer_side_running` | 55 | anim (4 frames) |
| `synthesizer_top` | 1573 | rotation family (4 copies) |
| `tool_bench_side` | 1441 |  |
| `tool_bench_top` | 1442 |  |
| `tools_lucky_block` | 1323 |  |
| `tools_lucky_block_rare` | 1325 |  |
| `tools_lucky_block_super` | 1327 |  |
| `toxic_waste` | 25 | anim (16 frames) |
| `toxic_waste_barrel_bottom` | 1342 |  |
| `toxic_waste_barrel_side` | 1341 |  |
| `toxic_waste_barrel_top` | 24 | anim (8 frames) |
| `toxin_ball_block` | 1001 |  |
| `trading_terminal_front` | 46 | anim (8 frames) |
| `trading_terminal_side` | 1543 |  |
| `trading_terminal_top` | 1544 |  |
| `tree_cutter_back` | 1451 |  |
| `tree_cutter_back_running` | 37 | anim (4 frames) |
| `tree_cutter_front` | 1445 |  |
| `tree_cutter_side` | 1446 |  |
| `tree_cutter_side_running` | 36 | anim (8 frames) |
| `tree_cutter_top` | 1447 | rotation family (4 copies) |
| `ultra_compressed_messy_stone` | 855 |  |
| `unloaded` | 517 |  |
| `uranium_block` | 1645 |  |
| `uranium_deposit` | 1549 |  |
| `uranium_glass` | 1628 |  |
| `uranium_ore` | 1548 |  |
| `volt_engine_side` | 1453 |  |
| `volt_engine_side_running` | 38 | anim (8 frames) |
| `volt_engine_top` | 1454 |  |
| `voltite_block` | 1648 |  |
| `voltite_deposit` | 1452 |  |
| `voltite_ore` | 1406 |  |
| `water_port` | 1592 |  |
| `watermelon_side` | 620 |  |
| `watermelon_top` | 621 |  |
| `weapon_lucky_block` | 1256 |  |
| `weapon_lucky_block_rare` | 1307 |  |
| `weapon_lucky_block_super` | 1309 |  |
| `white_concrete` | 612 |  |
| `white_gen_spawn_coal` | 1107 |  |
| `white_gen_spawn_iron` | 1108 |  |
| `white_gen_spawn_top` | 1106 |  |
| `white_glazed_terracotta` | 690 | rotation family (4 copies) |
| `white_planks` | 674 |  |
| `white_portal` | 17 | anim (4 frames) |
| `white_spawn_block_side` | 1011 |  |
| `white_spawn_block_top` | 1007 | rotation family (4 copies) |
| `wire_mill_back` | 1400 |  |
| `wire_mill_front` | 1394 |  |
| `wire_mill_side` | 1395 |  |
| `wire_mill_side_running` | 32 | anim (8 frames) |
| `wire_mill_top` | 1396 | rotation family (4 copies) |
| `wireless_terminal_bottom` | 1616 |  |
| `wireless_terminal_front` | 1611 |  |
| `wireless_terminal_top` | 1612 | rotation family (4 copies) |
| `wool_colored_black` | 581 |  |
| `wool_colored_blue` | 577 |  |
| `wool_colored_brown` | 578 |  |
| `wool_colored_cyan` | 575 |  |
| `wool_colored_gray` | 573 |  |
| `wool_colored_green` | 579 |  |
| `wool_colored_light_blue` | 569 |  |
| `wool_colored_light_grey` | 574 |  |
| `wool_colored_lime` | 571 |  |
| `wool_colored_magenta` | 568 |  |
| `wool_colored_orange` | 567 |  |
| `wool_colored_pink` | 572 |  |
| `wool_colored_purple` | 576 |  |
| `wool_colored_red` | 580 |  |
| `wool_colored_white` | 566 |  |
| `wool_colored_yellow` | 570 |  |
| `yellow_concrete` | 614 |  |
| `yellow_gen_spawn_coal` | 1101 |  |
| `yellow_gen_spawn_iron` | 1102 |  |
| `yellow_gen_spawn_top` | 1100 |  |
| `yellow_glazed_terracotta` | 706 | rotation family (4 copies) |
| `yellow_lucky_block` | 1253 |  |
| `yellow_lucky_block_rare` | 1304 |  |
| `yellow_lucky_block_super` | 1305 |  |
| `yellow_planks` | 678 |  |
| `yellow_portal` | 18 | anim (4 frames) |
| `yellow_spawn_block_side` | 1006 |  |
| `yellow_spawn_block_top` | 1002 | rotation family (4 copies) |

### Rotation families (64 roots)

These textures exist only as pre-rotated copies (`name[rot[1..4`). The registry folds them to the root below, and `bloxdTexel` re-applies the rotation at sample time — reference the root, never the copies. Writing a `[rot[N` spelling draws the dedicated rotation diagnostic.
- `alloy_kiln_top` (id 1409)
- `auto_bench_top` (id 1424)
- `belt_tunnel_exit_top` (id 1522)
- `belt_tunnel_top` (id 1517)
- `black_glazed_terracotta` (id 750)
- `black_spawn_block_top` (id 1077)
- `blue_glazed_terracotta` (id 734)
- `blue_spawn_block_top` (id 1072)
- `brown_glazed_terracotta` (id 738)
- `brown_spawn_block_top` (id 1067)
- `burner_drill_top` (id 1365)
- `centrifuge_top` (id 1565)
- `checkpoint_block` (id 1082)
- `chest_top` (id 666)
- `collider_top` (id 1603)
- `condenser_top` (id 1557)
- `coolant_mixer_top` (id 1635)
- `crop_harvester_top` (id 1510)
- `crusher_top` (id 1373)
- `crystal_vat_top` (id 1484)
- `custom_lobby_block_top` (id 1086)
- `cyan_glazed_terracotta` (id 726)
- `cyan_spawn_block_top` (id 1062)
- `deep_drill_top` (id 1457)
- `electric_drill_top` (id 1416)
- `gray_glazed_terracotta` (id 718)
- `gray_spawn_block_top` (id 1057)
- `green_glazed_terracotta` (id 742)
- `green_spawn_block_top` (id 1052)
- `iron_chest_top` (id 1234)
- `light_blue_glazed_terracotta` (id 702)
- `light_blue_spawn_block_top` (id 1047)
- `light_gray_glazed_terracotta` (id 722)
- `light_gray_spawn_block_top` (id 1042)
- `lime_glazed_terracotta` (id 710)
- `lime_spawn_block_top` (id 1037)
- `magenta_glazed_terracotta` (id 698)
- `magenta_spawn_block_top` (id 1032)
- `mob_farm_top` (id 1582)
- `moonstone_chest_top` (id 766)
- `orange_glazed_terracotta` (id 694)
- `orange_spawn_block_top` (id 1027)
- `pink_glazed_terracotta` (id 714)
- `pink_spawn_block_top` (id 1022)
- `press_top` (id 1389)
- `purple_glazed_terracotta` (id 730)
- `purple_spawn_block_top` (id 1017)
- `radar_screen` (id 19)
- `recycler_top` (id 1499)
- `red_glazed_terracotta` (id 746)
- `red_spawn_block_top` (id 1012)
- `shatter_mill_top` (id 1465)
- `shop_trader_spawn_top` (id 1115)
- `shop_wizard_spawn_top` (id 1121)
- `sky_tap_top` (id 1472)
- `smelter_top` (id 1380)
- `synthesizer_top` (id 1573)
- `tree_cutter_top` (id 1447)
- `white_glazed_terracotta` (id 690)
- `white_spawn_block_top` (id 1007)
- `wire_mill_top` (id 1396)
- `wireless_terminal_top` (id 1612)
- `yellow_glazed_terracotta` (id 706)
- `yellow_spawn_block_top` (id 1002)

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

The registry moved again over the weekend — `bny9u` (2026-11-05) → `v98qt8` (2026-11-08):

- atlas entries: 1,232 → 1,227
- rotation families (turned spellings): 57 (228) → 57 (228) — unchanged
- animation families (frame spellings): 43 (196) → 43 (196) — unchanged
- usable named constants: 911 → **906**
- id changes among survivors: **716 of 905** (79%)

The complete drift (7 names — three blocks became models):

- **added (1):** `hay_block_top` — the hay block family gained a distinct top texture.
- **removed (6):** `artisan_table_side`, `artisan_table_top`, `crafting_table_side`, `furnace_front`, `furnace_side`, `furnace_top` — the Furnace, the Workbench (crafting table) and the Artisan Bench left the terrain-textured blocks and became block models, so their terrain textures left the registry (the Workbench kept `crafting_table_top` — its top face is still terrain-textured).

Same principle as ever: 716 of the 905 survivors changed id on this single step — write `bloxdTextureIdStone`, not a raw number.

## Measured drift (v98qt8 → bbb6l5)

The registry moved the most it ever has in one step — `v98qt8` (2026-11-08) → `bbb6l5` (2026-11-20, production and preprod):

- atlas entries: 1,227 → **1,650** (+423)
- rotation families (turned spellings): 57 (228) → **64 (256)** — +7 roots
- animation families (frame spellings): 43 (196) → **71 (520)** — +28 families, including the 208 new `a~b~interval` transition spellings
- usable named constants: 906 → **1,017**
- id changes among survivors: **863 of 906** (95%)
- **the `v98qt8` folding regression is fixed** — animation-family base names validate again

The complete drift (+423 names, none removed — pure addition):

- **added (111 usable + 204 aliases):** the **Atomic Age content pack** — reactor machinery (`pump`, `condenser`, `centrifuge`, `synthesizer`, `mob_farm`, `coolant_mixer`, `laser`, `wireless_terminal`, `dense_silo`, `express_belt`, `fast_loader`, `splitter`, `sorting_gate`, `fluid_tank` and their `*_running` animation families), uranium & materials (`uranium_ore`, `uranium_deposit`, `uranium_block`, `pure_uranium_ore`, `uranium_glass`, `reactor_*`, `fuel_rod`, `fuel_port`, `water_port`, `graphite`, `graphite_block`, `voltite_block`, `copper_block`, `scaffolding`, `reactor_slag`), batteries (`battery_casing`, `battery_cell`, `battery_controller_front`), bombs & specials (`atomic_bomb`, `nova_bomb`, `atomic_bench`, `atomic_spire`, `isotope_comet_ore`, `isotope_comet_heart`, `jetpack_back`, `glow_lamp`, `collider`, `reactor_controller_*`, `sky_spring`) — plus 204 `frameA~frameB~interval` **transition spellings** (pre-blended cross-fade slots, e.g. `lava0~lava1~50`), a new atlas feature that fills the gaps between animation frames.
- **removed:** none.

The 111 new usable names all resolve today — and 863 of the 906 old survivors changed id in the same step. The doctrine is unchanged: write `bloxdTextureIdStone`, never a raw number.

## Related

- [Texture API](texture-api.md) · [Engine Internals: Texture Registry](../internals/texture-registry.md) · [Version History: v4](../history/v4.md)

