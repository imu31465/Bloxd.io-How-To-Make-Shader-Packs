# Texturkatalog

> Ziel-API: 5 · Ziel-Build: `bny9u` (2026-11-05, Produktion) · Status: Verified (extrahiert durch erneutes Ausführen des Registry-Builders der Engine)

Der vollständige Katalog der benutzbaren Textur-Namenskonstanten (`bloxdTextureId*`). **911 Namen**, alphabetisch.

## Wie zu lesen

Die Spalte **name** ist der Registry-Name — das Handle, das du tatsächlich schreibst. Die Schreibweise der Konstante CamelCaset den Dateinamen: `grass_top` → `bloxdTextureIdGrassTop`, `lava` → `bloxdTextureIdLava`. **Groß/Klein und Unterstriche werden nicht unterschieden** (`bloxdTextureId_grass_top` löst identisch zu `bloxdTextureIdGrassTop` auf). Namen sind die API — der Loader löst sie beim Laden gegen die Live-Registry neu auf, daher überstehen Namen Registry-Drift ([Textur-API](texture-api.md)).

Die Spalte **id** ist der Wert, gegen den die Konstante vergleicht — gemessen auf `bny9u` (Atlas-Layer + 1). Nutze sie, um `surface.textureId`-Dumps zu dekodieren und Debug-Ausgaben gegen den Build des Tages abzugleichen. **Ids nie in WGSL schreiben** — sie sind eine Momentaufnahme der Atlas-Reihenfolge eines Builds (siehe die Drift-Messungen unten).

Die Spalte **notes** markiert die beiden Faltungs-Familien. „anim (N Frames)“ bedeutet: Dieser Name zu sampeln liefert automatisch den aktuellen Animationsrahmen — **niemals das Rahmen-Suffix schreiben** (`lava0` ist ein bekannter Alias mit eigener Diagnose). „Rotationsfamilie (4 Kopien)“ bedeutet: Die Textur existiert nur als vor-rotierte Slots — der Name verweist auf die Wurzel, und `bloxdTexel` wendet die Rotation erneut an. Genau ein Name (`radar_screen`) trägt beide Hinweise.

Bewusst **nicht** gelistet: die übrigen Registry-Schreibweisen — 196 Rahmen-Aliasse und 228 Rotations-Aliasse —, die keine benutzbaren Konstanten sind; sie zu schreiben zieht eigene Engine-Fehlermeldungen nach sich. Die zugrunde liegende 1.232-zeilige Layer-Tabelle (einschließlich 171 vor-rotierter Slots) ist engine-intern und in [Engine-Interna: Textur-Registry](../internals/texture-registry.md) abgedeckt.

### Wie die Zahlen zusammenhängen

Die Zählungen benennen verschiedene Mengen, sie summieren sich also nicht naiv:

| Zählung | Was sie zählt |
|---|---|
| **911** | benutzbare benannte Konstanten — Texturnamen, die du als `bloxdTextureId*` schreiben kannst |
| **424** | Alias-Namen (196 Rahmen + 228 Rotation) — erkannte Schreibweisen, die *abgelehnt* werden mit einem Hinweis auf den Basisnamen; sie sind Namen, keine Konstanten, und fügen keine ids hinzu |
| **1.232** | Atlas-Einträge — die tatsächlichen Slots im Textur-Atlas (ids 1–1232) |

Jeder der 911 Namen bildet auf einen eigenen Atlas-Eintrag ab. Die übrigen **321 Einträge** sind zusätzliche Animationsrahmen (150) und vor-rotierte Kopien (171) ohne benutzbaren Namen — Pakete referenzieren sie nie direkt, weil `bloxdTexel` Rahmen animiert und Rotation automatisch anwendet. Der erste Rahmen jeder Animationsfamilie und die Wurzel jeder Rotationsfamilie *sind* benannt, weshalb manche Einträge sowohl als „benannt“ als auch als „Rahmen-/Rotations-Basis“ zählen. Zum Vergleich: v4 hatte 905 benutzbare Namen, der v5-Start-Build 911; dieser Build hat 911 — die 10 beim v5-Start entfernten Namen (Double-Chest ×8, Mob-Spawner-Seite ×2) sind zurück (neben dem früheren +1 `scorpion_eggs`), und 864 der 906 v5-Start-Überlebenden änderten die id.

## Der Katalog

Alle benutzbaren Namen, alphabetisch. Die id-Spalte ist der `bloxdTextureId*`-Wert — gemessen auf `bny9u` (2026-11-05). **Ids sind Momentaufnahmen; behandle Namen als die API**: Zwischen dem v4-Build (cnty9) und dem v5-Start-Build (ab90qa) änderten 334 überlebende Namen die id, und zwischen ab90qa und `bny9u` weitere 376, zwischen `bny9u` und diesem Build weitere 864 (siehe die Drift-Messungen unten).

| Name | id (bny9u) | Hinweise |
|---|---|---|
| `alloy_kiln_back` | 1099 |  |
| `alloy_kiln_front` | 1093 |  |
| `alloy_kiln_side` | 1094 |  |
| `alloy_kiln_side_running` | 33 | anim (4 Frames) |
| `alloy_kiln_top` | 1095 | Rotationsfamilie (4 Kopien) |
| `andesite_brick` | 473 |  |
| `apple_block_bottom` | 449 |  |
| `apple_block_side` | 447 |  |
| `apple_block_top` | 448 |  |
| `armour_lucky_block` | 1003 |  |
| `armour_lucky_block_rare` | 1005 |  |
| `armour_lucky_block_super` | 1007 |  |
| `artisan_table_side` | 375 |  |
| `artisan_table_top` | 376 |  |
| `ash` | 1039 |  |
| `auto_bench_back` | 1114 |  |
| `auto_bench_front` | 1108 |  |
| `auto_bench_side` | 1109 |  |
| `auto_bench_side_running` | 35 | anim (4 Frames) |
| `auto_bench_top` | 1110 | Rotationsfamilie (4 Kopien) |
| `autocrafter_bottom` | 970 |  |
| `autocrafter_lunite_bottom` | 981 |  |
| `autocrafter_lunite_side` | 980 |  |
| `autocrafter_side` | 969 |  |
| `banana_block_side` | 907 |  |
| `banana_block_top` | 908 |  |
| `beacon` | 338 |  |
| `bedrock` | 342 |  |
| `beetroot_block_bottom` | 933 |  |
| `beetroot_block_side` | 931 |  |
| `beetroot_block_top` | 932 |  |
| `belt_drop_side` | 1193 |  |
| `belt_drop_top` | 1192 |  |
| `belt_lift_side` | 1191 |  |
| `belt_lift_top` | 1190 |  |
| `belt_loader_slab_front` | 1118 |  |
| `belt_loader_top` | 1117 |  |
| `belt_tunnel_back` | 1207 |  |
| `belt_tunnel_exit_top` | 1208 | Rotationsfamilie (4 Kopien) |
| `belt_tunnel_mouth` | 1201 |  |
| `belt_tunnel_side` | 1202 |  |
| `belt_tunnel_top` | 1203 | Rotationsfamilie (4 Kopien) |
| `black_concrete` | 281 |  |
| `black_glazed_terracotta` | 437 | Rotationsfamilie (4 Kopien) |
| `black_planks` | 374 |  |
| `black_portal` | 2 | anim (4 Frames) |
| `black_spawn_block_side` | 768 |  |
| `black_spawn_block_top` | 764 | Rotationsfamilie (4 Kopien) |
| `block_destroyer_tnt_side` | 1025 |  |
| `block_destroyer_tnt_top` | 1026 |  |
| `blue_concrete` | 282 |  |
| `blue_gen_spawn_coal` | 782 |  |
| `blue_gen_spawn_iron` | 783 |  |
| `blue_gen_spawn_top` | 781 |  |
| `blue_glazed_terracotta` | 421 | Rotationsfamilie (4 Kopien) |
| `blue_lucky_block` | 1002 |  |
| `blue_lucky_block_rare` | 1004 |  |
| `blue_lucky_block_super` | 1006 |  |
| `blue_planks` | 370 |  |
| `blue_portal` | 3 | anim (4 Frames) |
| `blue_spawn_block_side` | 763 |  |
| `blue_spawn_block_top` | 759 | Rotationsfamilie (4 Kopien) |
| `bone_block_side` | 826 |  |
| `bone_block_top` | 827 |  |
| `bookshelf` | 572 |  |
| `bookshelf_1` | 574 |  |
| `bookshelf_2` | 575 |  |
| `bookshelf_3` | 576 |  |
| `bookshelf_4` | 577 |  |
| `bookshelf_5` | 578 |  |
| `bookshelf_empty` | 573 |  |
| `bouncy_bomb_block` | 599 |  |
| `bowling_alley_floor` | 986 |  |
| `bread_block_back` | 443 |  |
| `bread_block_front` | 442 |  |
| `bread_block_side` | 444 |  |
| `bread_block_top` | 445 |  |
| `brick` | 323 |  |
| `brown_concrete` | 283 |  |
| `brown_glazed_terracotta` | 425 | Rotationsfamilie (4 Kopien) |
| `brown_mushroom_block` | 544 |  |
| `brown_planks` | 371 |  |
| `brown_portal` | 4 | anim (4 Frames) |
| `brown_spawn_block_side` | 758 |  |
| `brown_spawn_block_top` | 754 | Rotationsfamilie (4 Kopien) |
| `building_lucky_block` | 997 |  |
| `building_lucky_block_rare` | 999 |  |
| `building_lucky_block_super` | 1001 |  |
| `burner_drill_back` | 1056 |  |
| `burner_drill_bottom` | 1055 |  |
| `burner_drill_front` | 1049 |  |
| `burner_drill_side` | 1050 |  |
| `burner_drill_side_running` | 27 | anim (4 Frames) |
| `burner_drill_top` | 1051 | Rotationsfamilie (4 Kopien) |
| `cactus_dry` | 358 |  |
| `cactus_top` | 357 |  |
| `carrot_block_bottom` | 929 |  |
| `carrot_block_side` | 927 |  |
| `carrot_block_top` | 928 |  |
| `carved_messy_stone` | 835 |  |
| `carved_pumpkin` | 551 |  |
| `chalk` | 847 |  |
| `chalk_black` | 863 |  |
| `chalk_blue` | 862 |  |
| `chalk_bricks_black` | 879 |  |
| `chalk_bricks_blue` | 878 |  |
| `chalk_bricks_brown` | 877 |  |
| `chalk_bricks_cyan` | 876 |  |
| `chalk_bricks_gray` | 875 |  |
| `chalk_bricks_green` | 874 |  |
| `chalk_bricks_light_blue` | 873 |  |
| `chalk_bricks_light_gray` | 872 |  |
| `chalk_bricks_lime` | 871 |  |
| `chalk_bricks_magenta` | 870 |  |
| `chalk_bricks_orange` | 869 |  |
| `chalk_bricks_pink` | 868 |  |
| `chalk_bricks_purple` | 867 |  |
| `chalk_bricks_red` | 866 |  |
| `chalk_bricks_slab_side_black` | 895 |  |
| `chalk_bricks_slab_side_blue` | 894 |  |
| `chalk_bricks_slab_side_brown` | 893 |  |
| `chalk_bricks_slab_side_cyan` | 892 |  |
| `chalk_bricks_slab_side_gray` | 891 |  |
| `chalk_bricks_slab_side_green` | 890 |  |
| `chalk_bricks_slab_side_light_blue` | 889 |  |
| `chalk_bricks_slab_side_light_gray` | 888 |  |
| `chalk_bricks_slab_side_lime` | 887 |  |
| `chalk_bricks_slab_side_magenta` | 886 |  |
| `chalk_bricks_slab_side_orange` | 885 |  |
| `chalk_bricks_slab_side_pink` | 884 |  |
| `chalk_bricks_slab_side_purple` | 883 |  |
| `chalk_bricks_slab_side_red` | 882 |  |
| `chalk_bricks_slab_side_white` | 881 |  |
| `chalk_bricks_slab_side_yellow` | 880 |  |
| `chalk_bricks_white` | 865 |  |
| `chalk_bricks_yellow` | 864 |  |
| `chalk_brown` | 861 |  |
| `chalk_cyan` | 860 |  |
| `chalk_gray` | 859 |  |
| `chalk_green` | 858 |  |
| `chalk_light_blue` | 857 |  |
| `chalk_light_gray` | 856 |  |
| `chalk_lime` | 855 |  |
| `chalk_magenta` | 854 |  |
| `chalk_orange` | 853 |  |
| `chalk_pink` | 852 |  |
| `chalk_purple` | 851 |  |
| `chalk_red` | 850 |  |
| `chalk_white` | 849 |  |
| `chalk_yellow` | 848 |  |
| `charge_vault_side` | 1122 |  |
| `charge_vault_top` | 1121 |  |
| `charging_pad_side` | 1167 |  |
| `charging_pad_top` | 1166 |  |
| `checkpoint_block` | 769 | Rotationsfamilie (4 Kopien) |
| `cherry_block_bottom` | 598 |  |
| `cherry_block_side` | 596 |  |
| `cherry_block_top` | 597 |  |
| `chest_back` | 355 |  |
| `chest_double_back_hi` | 1227 |  |
| `chest_double_back_lo` | 1226 |  |
| `chest_double_front_hi` | 1221 |  |
| `chest_double_front_lo` | 1220 |  |
| `chest_double_top_1_hi` | 1223 |  |
| `chest_double_top_1_lo` | 1222 |  |
| `chest_double_top_2_hi` | 1225 |  |
| `chest_double_top_2_lo` | 1224 |  |
| `chest_front` | 349 |  |
| `chest_side` | 350 |  |
| `chest_top` | 351 | Rotationsfamilie (4 Kopien) |
| `chili_pepper_block_bottom` | 686 |  |
| `chili_pepper_block_side` | 684 |  |
| `chili_pepper_block_top` | 685 |  |
| `chiseled_red_sandstone` | 464 |  |
| `chiseled_sandstone` | 333 |  |
| `clay` | 203 |  |
| `coal_block` | 241 |  |
| `coal_deposit` | 1040 |  |
| `coal_ore` | 235 |  |
| `coarse_dirt` | 199 |  |
| `coconut_block_bottom` | 530 |  |
| `coconut_block_side` | 528 |  |
| `coconut_block_top` | 529 |  |
| `code_block` | 687 |  |
| `comet_heart` | 1178 |  |
| `comet_ore` | 1177 |  |
| `compressed_messy_stone` | 538 |  |
| `conveyor_belt_bottom` | 1089 |  |
| `conveyor_belt_slab_side` | 1088 |  |
| `conveyor_belt_top` | 1087 |  |
| `conveyor_belt_turn_left` | 1179 |  |
| `conveyor_belt_turn_right` | 1180 |  |
| `copper_deposit` | 1043 |  |
| `copper_ore` | 1048 |  |
| `corn_block_bottom` | 602 |  |
| `corn_block_side` | 600 |  |
| `corn_block_top` | 601 |  |
| `crafting_table_side` | 346 |  |
| `crafting_table_top` | 347 |  |
| `crate` | 926 |  |
| `crop_harvester_back` | 1200 |  |
| `crop_harvester_back_running` | 45 | anim (4 Frames) |
| `crop_harvester_front` | 1194 |  |
| `crop_harvester_side` | 1195 |  |
| `crop_harvester_side_running` | 44 | anim (4 Frames) |
| `crop_harvester_top` | 1196 | Rotationsfamilie (4 Kopien) |
| `crusher_back` | 1063 |  |
| `crusher_front` | 1057 |  |
| `crusher_side` | 1058 |  |
| `crusher_side_running` | 28 | anim (4 Frames) |
| `crusher_top` | 1059 | Rotationsfamilie (4 Kopien) |
| `crystal_block` | 1037 |  |
| `crystal_vat_back` | 1174 |  |
| `crystal_vat_front` | 1168 |  |
| `crystal_vat_side` | 1169 |  |
| `crystal_vat_side_running` | 42 | anim (4 Frames) |
| `crystal_vat_top` | 1170 | Rotationsfamilie (4 Kopien) |
| `custom_lobby_block_side` | 777 |  |
| `custom_lobby_block_top` | 773 | Rotationsfamilie (4 Kopien) |
| `cut_red_sandstone` | 465 |  |
| `cut_sandstone` | 461 |  |
| `cyan_concrete` | 284 |  |
| `cyan_gen_spawn_coal` | 791 |  |
| `cyan_gen_spawn_iron` | 792 |  |
| `cyan_gen_spawn_top` | 790 |  |
| `cyan_glazed_terracotta` | 413 | Rotationsfamilie (4 Kopien) |
| `cyan_planks` | 368 |  |
| `cyan_portal` | 5 | anim (4 Frames) |
| `cyan_spawn_block_side` | 753 |  |
| `cyan_spawn_block_top` | 749 | Rotationsfamilie (4 Kopien) |
| `dark_green_bricks` | 468 |  |
| `darkstone` | 1214 |  |
| `darkstone_bricks` | 1215 |  |
| `darkstone_bricks_cracked` | 1216 |  |
| `darkstone_bricks_lava` | 1217 |  |
| `darkstone_engraved` | 1218 |  |
| `darkstone_smooth` | 1219 |  |
| `deep_drill_back` | 1148 |  |
| `deep_drill_bottom` | 1147 |  |
| `deep_drill_front` | 1141 |  |
| `deep_drill_side` | 1142 |  |
| `deep_drill_side_running` | 39 | anim (4 Frames) |
| `deep_drill_top` | 1143 | Rotationsfamilie (4 Kopien) |
| `diamond_block` | 348 |  |
| `diamond_gen_spawn_side` | 815 |  |
| `diamond_gen_spawn_top` | 814 |  |
| `diamond_ore` | 240 |  |
| `diorite_brick` | 471 |  |
| `dirt` | 198 |  |
| `drop_location_block_side` | 822 |  |
| `drop_location_block_top` | 821 |  |
| `drop_pad` | 1046 |  |
| `dry_grass_block` | 988 |  |
| `dry_grass_block_side` | 987 |  |
| `electric_drill_back` | 1107 |  |
| `electric_drill_bottom` | 1106 |  |
| `electric_drill_front` | 1100 |  |
| `electric_drill_side` | 1101 |  |
| `electric_drill_side_running` | 34 | anim (4 Frames) |
| `electric_drill_top` | 1102 | Rotationsfamilie (4 Kopien) |
| `emerald_block` | 245 |  |
| `emerald_ore` | 239 |  |
| `end_stone` | 234 |  |
| `engraved_andesite` | 472 |  |
| `engraved_diorite` | 470 |  |
| `engraved_granite` | 474 |  |
| `evil_lucky_block` | 1030 |  |
| `evil_lucky_block_face` | 1031 |  |
| `explosive_paint_black_side` | 634 |  |
| `explosive_paint_black_top` | 635 |  |
| `explosive_paint_blue_side` | 632 |  |
| `explosive_paint_blue_top` | 633 |  |
| `explosive_paint_brown_side` | 630 |  |
| `explosive_paint_brown_top` | 631 |  |
| `explosive_paint_cyan_side` | 628 |  |
| `explosive_paint_cyan_top` | 629 |  |
| `explosive_paint_gray_side` | 626 |  |
| `explosive_paint_gray_top` | 627 |  |
| `explosive_paint_green_side` | 624 |  |
| `explosive_paint_green_top` | 625 |  |
| `explosive_paint_light_blue_side` | 622 |  |
| `explosive_paint_light_blue_top` | 623 |  |
| `explosive_paint_light_gray_side` | 620 |  |
| `explosive_paint_light_gray_top` | 621 |  |
| `explosive_paint_lime_side` | 618 |  |
| `explosive_paint_lime_top` | 619 |  |
| `explosive_paint_magenta_side` | 616 |  |
| `explosive_paint_magenta_top` | 617 |  |
| `explosive_paint_orange_side` | 614 |  |
| `explosive_paint_orange_top` | 615 |  |
| `explosive_paint_pink_side` | 612 |  |
| `explosive_paint_pink_top` | 613 |  |
| `explosive_paint_purple_side` | 610 |  |
| `explosive_paint_purple_top` | 611 |  |
| `explosive_paint_quick_black` | 651 |  |
| `explosive_paint_quick_blue` | 650 |  |
| `explosive_paint_quick_brown` | 649 |  |
| `explosive_paint_quick_cyan` | 648 |  |
| `explosive_paint_quick_gray` | 647 |  |
| `explosive_paint_quick_green` | 646 |  |
| `explosive_paint_quick_light_blue` | 645 |  |
| `explosive_paint_quick_light_gray` | 644 |  |
| `explosive_paint_quick_lime` | 643 |  |
| `explosive_paint_quick_magenta` | 642 |  |
| `explosive_paint_quick_orange` | 641 |  |
| `explosive_paint_quick_pink` | 640 |  |
| `explosive_paint_quick_purple` | 639 |  |
| `explosive_paint_quick_red` | 638 |  |
| `explosive_paint_quick_white` | 637 |  |
| `explosive_paint_quick_yellow` | 636 |  |
| `explosive_paint_red_side` | 608 |  |
| `explosive_paint_red_top` | 609 |  |
| `explosive_paint_seeking_black` | 667 |  |
| `explosive_paint_seeking_blue` | 666 |  |
| `explosive_paint_seeking_brown` | 665 |  |
| `explosive_paint_seeking_cyan` | 664 |  |
| `explosive_paint_seeking_gray` | 663 |  |
| `explosive_paint_seeking_green` | 662 |  |
| `explosive_paint_seeking_light_blue` | 661 |  |
| `explosive_paint_seeking_light_gray` | 660 |  |
| `explosive_paint_seeking_lime` | 659 |  |
| `explosive_paint_seeking_magenta` | 658 |  |
| `explosive_paint_seeking_orange` | 657 |  |
| `explosive_paint_seeking_pink` | 656 |  |
| `explosive_paint_seeking_purple` | 655 |  |
| `explosive_paint_seeking_red` | 654 |  |
| `explosive_paint_seeking_white` | 653 |  |
| `explosive_paint_seeking_yellow` | 652 |  |
| `explosive_paint_sticky_black` | 683 |  |
| `explosive_paint_sticky_blue` | 682 |  |
| `explosive_paint_sticky_brown` | 681 |  |
| `explosive_paint_sticky_cyan` | 680 |  |
| `explosive_paint_sticky_gray` | 679 |  |
| `explosive_paint_sticky_green` | 678 |  |
| `explosive_paint_sticky_light_blue` | 677 |  |
| `explosive_paint_sticky_light_gray` | 676 |  |
| `explosive_paint_sticky_lime` | 675 |  |
| `explosive_paint_sticky_magenta` | 674 |  |
| `explosive_paint_sticky_orange` | 673 |  |
| `explosive_paint_sticky_pink` | 672 |  |
| `explosive_paint_sticky_purple` | 671 |  |
| `explosive_paint_sticky_red` | 670 |  |
| `explosive_paint_sticky_white` | 669 |  |
| `explosive_paint_sticky_yellow` | 668 |  |
| `explosive_paint_white_side` | 606 |  |
| `explosive_paint_white_top` | 607 |  |
| `explosive_paint_yellow_side` | 604 |  |
| `explosive_paint_yellow_top` | 605 |  |
| `extra_compressed_messy_stone` | 539 |  |
| `fallen_cherry_leaves_side` | 594 |  |
| `fallen_maple_leaves_side` | 486 |  |
| `farmland` | 441 |  |
| `fast_belt_slab_side` | 1165 |  |
| `fast_belt_top` | 1164 |  |
| `fast_belt_turn_left` | 1181 |  |
| `fast_belt_turn_right` | 1182 |  |
| `fertilised_soil` | 934 |  |
| `finish_block` | 820 |  |
| `fireball_block` | 547 |  |
| `food_lucky_block` | 1015 |  |
| `food_lucky_block_rare` | 1017 |  |
| `food_lucky_block_super` | 1019 |  |
| `forge_hopper_top` | 1176 |  |
| `furnace_front` | 343 |  |
| `furnace_side` | 344 |  |
| `furnace_top` | 345 |  |
| `generator_side` | 1071 |  |
| `generator_side_running` | 30 | anim (4 Frames) |
| `generator_top` | 1072 |  |
| `ghost_chest_back` | 964 |  |
| `ghost_chest_front` | 961 |  |
| `ghost_chest_side` | 962 |  |
| `ghost_chest_top` | 963 |  |
| `ghost_lucky_block` | 965 |  |
| `ghost_mystery_block` | 966 |  |
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
| `gold_deposit` | 1044 |  |
| `gold_ore` | 237 |  |
| `granite_brick` | 475 |  |
| `grass_block_side` | 200 |  |
| `grass_top` | 201 |  |
| `gravel` | 204 |  |
| `gray_concrete` | 279 |  |
| `gray_gen_spawn_coal` | 800 |  |
| `gray_gen_spawn_iron` | 801 |  |
| `gray_gen_spawn_top` | 799 |  |
| `gray_glazed_terracotta` | 405 | Rotationsfamilie (4 Kopien) |
| `gray_planks` | 366 |  |
| `gray_portal` | 6 | anim (4 Frames) |
| `gray_spawn_block_side` | 748 |  |
| `gray_spawn_block_top` | 744 | Rotationsfamilie (4 Kopien) |
| `green_bricks` | 467 |  |
| `green_concrete` | 293 |  |
| `green_glazed_terracotta` | 429 | Rotationsfamilie (4 Kopien) |
| `green_lucky_block` | 1014 |  |
| `green_lucky_block_rare` | 1016 |  |
| `green_lucky_block_super` | 1018 |  |
| `green_planks` | 372 |  |
| `green_portal` | 7 | anim (4 Frames) |
| `green_spawn_block_side` | 743 |  |
| `green_spawn_block_top` | 739 | Rotationsfamilie (4 Kopien) |
| `green_stone` | 466 |  |
| `grenade_block` | 589 |  |
| `grey_portal` | 8 | anim (4 Frames) |
| `gun_lucky_block` | 960 |  |
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
| `harvester_bottom` | 977 |  |
| `harvester_lunite_bottom` | 985 |  |
| `harvester_lunite_side_0` | 982 |  |
| `harvester_lunite_side_1` | 983 |  |
| `harvester_lunite_top` | 984 |  |
| `harvester_side0` | 974 |  |
| `harvester_side1` | 975 |  |
| `harvester_top` | 976 |  |
| `hay_block_side` | 336 |  |
| `homestead_core` | 1045 |  |
| `homestead_core_cap` | 1130 |  |
| `homestead_core_crown` | 1129 |  |
| `homestead_core_mid` | 26 | anim (4 Frames) |
| `hyper_compressed_messy_stone` | 541 |  |
| `ice` | 334 |  |
| `ice_brick` | 476 |  |
| `iceball_block` | 548 |  |
| `invisible_solid` | 322 |  |
| `iron_block` | 242 |  |
| `iron_chest_back` | 925 |  |
| `iron_chest_front` | 919 |  |
| `iron_chest_side` | 920 |  |
| `iron_chest_top` | 921 | Rotationsfamilie (4 Kopien) |
| `iron_deposit` | 1041 |  |
| `iron_ore` | 236 |  |
| `iron_watermelon_side` | 554 |  |
| `iron_watermelon_top` | 555 |  |
| `jungle_grass_block` | 897 |  |
| `jungle_grass_block_side` | 896 |  |
| `lapis_block` | 244 |  |
| `lapis_ore` | 238 |  |
| `lava` | 1 | anim (8 Frames) |
| `leather_block_side` | 916 |  |
| `leather_block_top` | 917 |  |
| `leaves_aspen` | 296 |  |
| `leaves_aspen_autumn` | 918 |  |
| `leaves_cedar` | 478 |  |
| `leaves_cherry` | 593 |  |
| `leaves_cherry_fruity` | 914 |  |
| `leaves_jungle` | 298 |  |
| `leaves_mango` | 902 |  |
| `leaves_mango_fruity` | 915 |  |
| `leaves_maple` | 297 |  |
| `leaves_maple_autumn` | 485 |  |
| `leaves_maple_fruity` | 909 |  |
| `leaves_palm` | 479 |  |
| `leaves_palm_fruity` | 912 |  |
| `leaves_pear` | 533 |  |
| `leaves_pear_fruity` | 913 |  |
| `leaves_pine` | 295 |  |
| `leaves_pine_cone` | 910 |  |
| `leaves_plum` | 477 |  |
| `leaves_plum_fruity` | 911 |  |
| `leaves_spectral` | 839 |  |
| `light_blue_concrete` | 285 |  |
| `light_blue_glazed_terracotta` | 389 | Rotationsfamilie (4 Kopien) |
| `light_blue_lucky_block` | 941 |  |
| `light_blue_planks` | 362 |  |
| `light_blue_spawn_block_side` | 738 |  |
| `light_blue_spawn_block_top` | 734 | Rotationsfamilie (4 Kopien) |
| `light_gray_concrete` | 280 |  |
| `light_gray_glazed_terracotta` | 409 | Rotationsfamilie (4 Kopien) |
| `light_gray_planks` | 367 |  |
| `light_gray_spawn_block_side` | 733 |  |
| `light_gray_spawn_block_top` | 729 | Rotationsfamilie (4 Kopien) |
| `lightblue_portal` | 9 | anim (4 Frames) |
| `lightgray_portal` | 10 | anim (4 Frames) |
| `lime_concrete` | 286 |  |
| `lime_gen_spawn_coal` | 785 |  |
| `lime_gen_spawn_iron` | 786 |  |
| `lime_gen_spawn_top` | 784 |  |
| `lime_glazed_terracotta` | 397 | Rotationsfamilie (4 Kopien) |
| `lime_planks` | 364 |  |
| `lime_portal` | 11 | anim (4 Frames) |
| `lime_spawn_block_side` | 728 |  |
| `lime_spawn_block_top` | 724 | Rotationsfamilie (4 Kopien) |
| `log_ancient_maple` | 1029 |  |
| `log_aspen` | 210 |  |
| `log_cedar` | 209 |  |
| `log_cherry` | 590 |  |
| `log_jungle` | 211 |  |
| `log_mango` | 899 |  |
| `log_maple` | 206 |  |
| `log_palm` | 480 |  |
| `log_pear` | 531 |  |
| `log_pine` | 207 |  |
| `log_plum` | 208 |  |
| `log_spectral` | 836 |  |
| `lucky_block_pink_question` | 967 |  |
| `lucky_block_pink_question_rare` | 1021 |  |
| `lucky_block_pink_question_super` | 1023 |  |
| `lunite_block` | 979 |  |
| `lunite_ore` | 978 |  |
| `machine_bench_side` | 1123 |  |
| `machine_bench_top` | 1124 |  |
| `machine_side` | 1047 |  |
| `magenta_concrete` | 287 |  |
| `magenta_glazed_terracotta` | 385 | Rotationsfamilie (4 Kopien) |
| `magenta_planks` | 361 |  |
| `magenta_portal` | 12 | anim (4 Frames) |
| `magenta_spawn_block_side` | 723 |  |
| `magenta_spawn_block_top` | 719 | Rotationsfamilie (4 Kopien) |
| `magma` | 459 |  |
| `mailbox_front` | 579 |  |
| `mailbox_front_full` | 581 |  |
| `mailbox_side` | 580 |  |
| `mango_block_bottom` | 906 |  |
| `mango_block_side` | 904 |  |
| `mango_block_top` | 905 |  |
| `mega_compressed_messy_stone` | 543 |  |
| `melon_side` | 552 |  |
| `melon_top` | 553 |  |
| `melting_ice` | 603 |  |
| `messy_stone` | 224 |  |
| `mob_spawner_block_empty_side` | 831 |  |
| `mob_spawner_block_top` | 829 |  |
| `mob_spawner_hostile_block_side` | 830 |  |
| `mob_spawner_neutral_block_side` | 846 |  |
| `mob_spawner_passive_block_side` | 828 |  |
| `moonstone_block` | 458 |  |
| `moonstone_chest_back` | 457 |  |
| `moonstone_chest_front` | 451 |  |
| `moonstone_chest_side` | 452 |  |
| `moonstone_chest_top` | 453 | Rotationsfamilie (4 Kopien) |
| `moonstone_explosive_side` | 340 |  |
| `moonstone_explosive_top` | 341 |  |
| `moonstone_gen_spawn_side` | 817 |  |
| `moonstone_gen_spawn_top` | 816 |  |
| `moonstone_ore` | 450 |  |
| `mossy_cobblestone` | 446 |  |
| `mushroom_stem` | 546 |  |
| `mystery_block` | 586 |  |
| `neon_black` | 959 |  |
| `neon_blue` | 958 |  |
| `neon_brown` | 957 |  |
| `neon_cyan` | 956 |  |
| `neon_gray` | 955 |  |
| `neon_green` | 954 |  |
| `neon_light_blue` | 953 |  |
| `neon_light_gray` | 952 |  |
| `neon_lime` | 951 |  |
| `neon_magenta` | 950 |  |
| `neon_orange` | 949 |  |
| `neon_pink` | 948 |  |
| `neon_purple` | 947 |  |
| `neon_red` | 946 |  |
| `neon_white` | 945 |  |
| `neon_yellow` | 944 |  |
| `nether_brick` | 325 |  |
| `netherrack` | 326 |  |
| `obby_absorb_block` | 824 |  |
| `obby_absorb_death_block` | 825 |  |
| `obby_death_block` | 823 |  |
| `obsidian` | 335 |  |
| `orange_concrete` | 288 |  |
| `orange_glazed_terracotta` | 381 | Rotationsfamilie (4 Kopien) |
| `orange_lucky_block` | 1008 |  |
| `orange_lucky_block_rare` | 1010 |  |
| `orange_lucky_block_super` | 1012 |  |
| `orange_planks` | 360 |  |
| `orange_portal` | 13 | anim (4 Frames) |
| `orange_spawn_block_side` | 718 |  |
| `orange_spawn_block_top` | 714 | Rotationsfamilie (4 Kopien) |
| `ore_gen_spawn_side` | 819 |  |
| `ore_gen_spawn_top` | 818 |  |
| `packed_snow` | 834 |  |
| `parts_bench_side` | 1125 |  |
| `parts_bench_top` | 1126 |  |
| `patterned_glass_black` | 556 |  |
| `patterned_glass_blue` | 557 |  |
| `patterned_glass_brown` | 558 |  |
| `patterned_glass_cyan` | 559 |  |
| `patterned_glass_gray` | 560 |  |
| `patterned_glass_green` | 562 |  |
| `patterned_glass_light_blue` | 563 |  |
| `patterned_glass_light_gray` | 561 |  |
| `patterned_glass_lime` | 564 |  |
| `patterned_glass_magenta` | 565 |  |
| `patterned_glass_orange` | 566 |  |
| `patterned_glass_pink` | 567 |  |
| `patterned_glass_purple` | 568 |  |
| `patterned_glass_red` | 569 |  |
| `patterned_glass_white` | 570 |  |
| `patterned_glass_yellow` | 571 |  |
| `pear_block_bottom` | 537 |  |
| `pear_block_side` | 535 |  |
| `pear_block_top` | 536 |  |
| `pet_lucky_block` | 968 |  |
| `pine_cone_block_side` | 844 |  |
| `pine_cone_block_top` | 845 |  |
| `pine_grass_block` | 842 |  |
| `pine_grass_block_side` | 841 |  |
| `pink_concrete` | 289 |  |
| `pink_gen_spawn_coal` | 797 |  |
| `pink_gen_spawn_iron` | 798 |  |
| `pink_gen_spawn_top` | 796 |  |
| `pink_glazed_terracotta` | 401 | Rotationsfamilie (4 Kopien) |
| `pink_planks` | 365 |  |
| `pink_portal` | 14 | anim (4 Frames) |
| `pink_spawn_block_side` | 713 |  |
| `pink_spawn_block_top` | 709 | Rotationsfamilie (4 Kopien) |
| `planks_aspen` | 213 |  |
| `planks_cedar` | 217 |  |
| `planks_cherry` | 592 |  |
| `planks_jungle` | 215 |  |
| `planks_mango` | 901 |  |
| `planks_maple` | 212 |  |
| `planks_palm` | 481 |  |
| `planks_pear` | 532 |  |
| `planks_pine` | 216 |  |
| `planks_plum` | 214 |  |
| `planks_spectral` | 838 |  |
| `plum_block_bottom` | 527 |  |
| `plum_block_side` | 525 |  |
| `plum_block_top` | 526 |  |
| `podzol_top` | 460 |  |
| `potato_block` | 930 |  |
| `potion_lucky_block` | 1020 |  |
| `potion_lucky_block_rare` | 1022 |  |
| `potion_lucky_block_super` | 1024 |  |
| `press_back` | 1079 |  |
| `press_front` | 1073 |  |
| `press_side` | 1074 |  |
| `press_side_running` | 31 | anim (4 Frames) |
| `press_top` | 1075 | Rotationsfamilie (4 Kopien) |
| `protector` | 356 |  |
| `protector_faction` | 583 |  |
| `protector_tribe` | 582 |  |
| `pumpkin_face_on` | 299 |  |
| `pumpkin_side` | 549 |  |
| `pumpkin_top` | 550 |  |
| `pure_coal_ore` | 1032 |  |
| `pure_copper_ore` | 1212 |  |
| `pure_diamond_ore` | 1035 |  |
| `pure_gold_ore` | 1034 |  |
| `pure_iron_ore` | 1033 |  |
| `pure_moonstone_ore` | 1036 |  |
| `pure_voltite_ore` | 1213 |  |
| `purple_concrete` | 290 |  |
| `purple_glazed_terracotta` | 417 | Rotationsfamilie (4 Kopien) |
| `purple_lucky_block` | 996 |  |
| `purple_lucky_block_rare` | 998 |  |
| `purple_lucky_block_super` | 1000 |  |
| `purple_planks` | 369 |  |
| `purple_portal` | 15 | anim (4 Frames) |
| `purple_spawn_block_side` | 708 |  |
| `purple_spawn_block_top` | 704 | Rotationsfamilie (4 Kopien) |
| `quartz_block_chiseled` | 328 |  |
| `quartz_block_side` | 327 |  |
| `radar_bottom` | 937 |  |
| `radar_screen` | 19 | anim (4 Frames) Rotationsfamilie (4 Kopien) |
| `radar_side_active` | 935 |  |
| `radar_side_inactive` | 938 |  |
| `radar_top_active` | 936 |  |
| `radar_top_inactive` | 939 |  |
| `recycler_back` | 1189 |  |
| `recycler_front` | 1183 |  |
| `recycler_side` | 1184 |  |
| `recycler_side_running` | 43 | anim (4 Frames) |
| `recycler_top` | 1185 | Rotationsfamilie (4 Kopien) |
| `red_concrete` | 291 |  |
| `red_gen_spawn_coal` | 779 |  |
| `red_gen_spawn_iron` | 780 |  |
| `red_gen_spawn_top` | 778 |  |
| `red_glazed_terracotta` | 433 | Rotationsfamilie (4 Kopien) |
| `red_lucky_block` | 942 |  |
| `red_lucky_block_rare` | 992 |  |
| `red_lucky_block_super` | 994 |  |
| `red_mushroom_block` | 545 |  |
| `red_planks` | 373 |  |
| `red_portal` | 16 | anim (4 Frames) |
| `red_sand` | 482 |  |
| `red_sandstone` | 462 |  |
| `red_sandstone_brick` | 483 |  |
| `red_sandstone_top` | 463 |  |
| `red_spawn_block_side` | 703 |  |
| `red_spawn_block_top` | 699 | Rotationsfamilie (4 Kopien) |
| `redstone_lamp_off` | 321 |  |
| `redstone_lamp_on` | 320 |  |
| `rocket_block` | 587 |  |
| `rocky_dirt` | 484 |  |
| `rope_block` | 1038 |  |
| `sand` | 202 |  |
| `sandstone_brick` | 469 |  |
| `sandstone_normal` | 233 |  |
| `sandstone_top` | 332 |  |
| `scorpion_eggs` | 1228 |  |
| `shatter_mill_back` | 1155 |  |
| `shatter_mill_front` | 1149 |  |
| `shatter_mill_side` | 1150 |  |
| `shatter_mill_side_running` | 40 | anim (4 Frames) |
| `shatter_mill_top` | 1151 | Rotationsfamilie (4 Kopien) |
| `shop_trader_spawn_face` | 807 |  |
| `shop_trader_spawn_side` | 806 |  |
| `shop_trader_spawn_top` | 802 | Rotationsfamilie (4 Kopien) |
| `shop_wizard_spawn_face` | 813 |  |
| `shop_wizard_spawn_side` | 812 |  |
| `shop_wizard_spawn_top` | 808 | Rotationsfamilie (4 Kopien) |
| `sky_tap_back` | 1163 |  |
| `sky_tap_bottom` | 1162 |  |
| `sky_tap_front` | 1156 |  |
| `sky_tap_side` | 1157 |  |
| `sky_tap_side_running` | 41 | anim (4 Frames) |
| `sky_tap_top` | 1158 | Rotationsfamilie (4 Kopien) |
| `slab_andesite_brick_side` | 506 |  |
| `slab_aspen_side` | 491 |  |
| `slab_brick_side` | 523 |  |
| `slab_cedar_side` | 490 |  |
| `slab_cherry_side` | 595 |  |
| `slab_chiseled_red_sandstone_side` | 520 |  |
| `slab_chiseled_sandstone_side` | 516 |  |
| `slab_cobblestone_side` | 496 |  |
| `slab_cut_red_sandstone_side` | 521 |  |
| `slab_cut_sandstone_side` | 517 |  |
| `slab_diorite_brick_side` | 510 |  |
| `slab_dirt_side` | 494 |  |
| `slab_dry_grass_top_side` | 989 |  |
| `slab_engraved_andesite_side` | 505 |  |
| `slab_engraved_diorite_side` | 509 |  |
| `slab_engraved_granite_side` | 513 |  |
| `slab_granite_brick_side` | 514 |  |
| `slab_grass_top_side` | 495 |  |
| `slab_ice_brick_side` | 524 |  |
| `slab_jungle_grass_top_side` | 898 |  |
| `slab_jungle_side` | 492 |  |
| `slab_mango_side` | 903 |  |
| `slab_maple_side` | 487 |  |
| `slab_mossy_cobblestone_side` | 501 |  |
| `slab_palm_side` | 493 |  |
| `slab_pear_side` | 534 |  |
| `slab_pine_grass_top_side` | 843 |  |
| `slab_pine_side` | 488 |  |
| `slab_plum_side` | 489 |  |
| `slab_red_sandstone_brick_side` | 522 |  |
| `slab_red_sandstone_side` | 519 |  |
| `slab_sandstone_brick_side` | 518 |  |
| `slab_sandstone_normal_side` | 515 |  |
| `slab_smooth_stone_side` | 498 |  |
| `slab_spectral_side` | 840 |  |
| `slab_stone_andesite_side` | 503 |  |
| `slab_stone_andesite_smooth_side` | 504 |  |
| `slab_stone_diorite_side` | 507 |  |
| `slab_stone_diorite_smooth_side` | 508 |  |
| `slab_stone_granite_side` | 511 |  |
| `slab_stone_granite_smooth_side` | 512 |  |
| `slab_stone_side` | 497 |  |
| `slab_stonebrick_carved_side` | 499 |  |
| `slab_stonebrick_mossy_side` | 502 |  |
| `slab_stonebrick_side` | 500 |  |
| `smelter_back` | 1070 |  |
| `smelter_front` | 1064 |  |
| `smelter_side` | 1065 |  |
| `smelter_side_running` | 29 | anim (4 Frames) |
| `smelter_top` | 1066 | Rotationsfamilie (4 Kopien) |
| `smoke` | 23 | anim (4 Frames) |
| `smooth_stone` | 226 |  |
| `snow` | 205 |  |
| `snowy_messy_stone` | 832 |  |
| `snowy_messy_stone_side` | 833 |  |
| `solar_panel_bottom` | 973 |  |
| `solar_panel_side` | 971 |  |
| `solar_panel_top` | 972 |  |
| `sorting_gate_slab_side` | 1116 |  |
| `sorting_gate_top` | 1115 |  |
| `splitter_slab_side` | 1091 |  |
| `splitter_top` | 1090 |  |
| `sponge` | 337 |  |
| `starframe` | 1175 |  |
| `stone` | 225 |  |
| `stone_andesite` | 229 |  |
| `stone_andesite_smooth` | 230 |  |
| `stone_deposit` | 1042 |  |
| `stone_diorite` | 227 |  |
| `stone_diorite_smooth` | 228 |  |
| `stone_generator_side` | 1231 |  |
| `stone_generator_top` | 1232 |  |
| `stone_granite` | 231 |  |
| `stone_granite_smooth` | 232 |  |
| `stonebrick` | 324 |  |
| `stonebrick_carved` | 329 |  |
| `stonebrick_cracked` | 331 |  |
| `stonebrick_mossy` | 330 |  |
| `storage_silo_side` | 1120 |  |
| `storage_silo_top` | 1119 |  |
| `stripped_aspen_log` | 219 |  |
| `stripped_cedar_log` | 223 |  |
| `stripped_cherry_log` | 591 |  |
| `stripped_jungle_log` | 221 |  |
| `stripped_mango_log` | 900 |  |
| `stripped_maple_log` | 218 |  |
| `stripped_palm_log` | 584 |  |
| `stripped_pear_log` | 585 |  |
| `stripped_pine_log` | 222 |  |
| `stripped_plum_log` | 220 |  |
| `stripped_spectral_log` | 837 |  |
| `super_compressed_messy_stone` | 540 |  |
| `super_rocket_block` | 588 |  |
| `tool_bench_side` | 1127 |  |
| `tool_bench_top` | 1128 |  |
| `tools_lucky_block` | 1009 |  |
| `tools_lucky_block_rare` | 1011 |  |
| `tools_lucky_block_super` | 1013 |  |
| `toxic_waste` | 25 | anim (8 Frames) |
| `toxic_waste_barrel_bottom` | 1028 |  |
| `toxic_waste_barrel_side` | 1027 |  |
| `toxic_waste_barrel_top` | 24 | anim (4 Frames) |
| `toxin_ball_block` | 688 |  |
| `trading_terminal_front` | 46 | anim (8 Frames) |
| `trading_terminal_side` | 1229 |  |
| `trading_terminal_top` | 1230 |  |
| `tree_cutter_back` | 1137 |  |
| `tree_cutter_back_running` | 37 | anim (4 Frames) |
| `tree_cutter_front` | 1131 |  |
| `tree_cutter_side` | 1132 |  |
| `tree_cutter_side_running` | 36 | anim (4 Frames) |
| `tree_cutter_top` | 1133 | Rotationsfamilie (4 Kopien) |
| `ultra_compressed_messy_stone` | 542 |  |
| `unloaded` | 197 |  |
| `volt_engine_side` | 1139 |  |
| `volt_engine_side_running` | 38 | anim (4 Frames) |
| `volt_engine_top` | 1140 |  |
| `voltite_deposit` | 1138 |  |
| `voltite_ore` | 1092 |  |
| `watermelon_side` | 300 |  |
| `watermelon_top` | 301 |  |
| `weapon_lucky_block` | 943 |  |
| `weapon_lucky_block_rare` | 993 |  |
| `weapon_lucky_block_super` | 995 |  |
| `white_concrete` | 292 |  |
| `white_gen_spawn_coal` | 794 |  |
| `white_gen_spawn_iron` | 795 |  |
| `white_gen_spawn_top` | 793 |  |
| `white_glazed_terracotta` | 377 | Rotationsfamilie (4 Kopien) |
| `white_planks` | 359 |  |
| `white_portal` | 17 | anim (4 Frames) |
| `white_spawn_block_side` | 698 |  |
| `white_spawn_block_top` | 694 | Rotationsfamilie (4 Kopien) |
| `wire_mill_back` | 1086 |  |
| `wire_mill_front` | 1080 |  |
| `wire_mill_side` | 1081 |  |
| `wire_mill_side_running` | 32 | anim (4 Frames) |
| `wire_mill_top` | 1082 | Rotationsfamilie (4 Kopien) |
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
| `yellow_gen_spawn_coal` | 788 |  |
| `yellow_gen_spawn_iron` | 789 |  |
| `yellow_gen_spawn_top` | 787 |  |
| `yellow_glazed_terracotta` | 393 | Rotationsfamilie (4 Kopien) |
| `yellow_lucky_block` | 940 |  |
| `yellow_lucky_block_rare` | 990 |  |
| `yellow_lucky_block_super` | 991 |  |
| `yellow_planks` | 363 |  |
| `yellow_portal` | 18 | anim (4 Frames) |
| `yellow_spawn_block_side` | 693 |  |
| `yellow_spawn_block_top` | 689 | Rotationsfamilie (4 Kopien) |


### Rotationsfamilien (57 Wurzeln)

Diese Texturen existieren nur als vor-rotierte Kopien (`name[rot[1..4`). Die Registry faltet sie auf die unten stehende Wurzel, und `bloxdTexel` wendet die Rotation zur Sample-Zeit erneut an — die Wurzel referenzieren, nie die Kopien. Eine `[rot[N`-Schreibweise zu schreiben zieht die eigene Rotationsdiagnose nach sich.

- `alloy_kiln_top` (id 1087)
- `auto_bench_top` (id 1102)
- `belt_tunnel_exit_top` (id 1200)
- `belt_tunnel_top` (id 1195)
- `black_glazed_terracotta` (id 429)
- `black_spawn_block_top` (id 756)
- `blue_glazed_terracotta` (id 413)
- `blue_spawn_block_top` (id 751)
- `brown_glazed_terracotta` (id 417)
- `brown_spawn_block_top` (id 746)
- `burner_drill_top` (id 1043)
- `checkpoint_block` (id 761)
- `chest_top` (id 343)
- `crop_harvester_top` (id 1188)
- `crusher_top` (id 1051)
- `crystal_vat_top` (id 1162)
- `custom_lobby_block_top` (id 765)
- `cyan_glazed_terracotta` (id 405)
- `cyan_spawn_block_top` (id 741)
- `deep_drill_top` (id 1135)
- `electric_drill_top` (id 1094)
- `gray_glazed_terracotta` (id 397)
- `gray_spawn_block_top` (id 736)
- `green_glazed_terracotta` (id 421)
- `green_spawn_block_top` (id 731)
- `iron_chest_top` (id 913)
- `light_blue_glazed_terracotta` (id 381)
- `light_blue_spawn_block_top` (id 726)
- `light_gray_glazed_terracotta` (id 401)
- `light_gray_spawn_block_top` (id 721)
- `lime_glazed_terracotta` (id 389)
- `lime_spawn_block_top` (id 716)
- `magenta_glazed_terracotta` (id 377)
- `magenta_spawn_block_top` (id 711)
- `moonstone_chest_top` (id 445)
- `orange_glazed_terracotta` (id 373)
- `orange_spawn_block_top` (id 706)
- `pink_glazed_terracotta` (id 393)
- `pink_spawn_block_top` (id 701)
- `press_top` (id 1067)
- `purple_glazed_terracotta` (id 409)
- `purple_spawn_block_top` (id 696)
- `radar_screen` (id 19)
- `recycler_top` (id 1177)
- `red_glazed_terracotta` (id 425)
- `red_spawn_block_top` (id 691)
- `shatter_mill_top` (id 1143)
- `shop_trader_spawn_top` (id 794)
- `shop_wizard_spawn_top` (id 800)
- `sky_tap_top` (id 1150)
- `smelter_top` (id 1058)
- `tree_cutter_top` (id 1125)
- `white_glazed_terracotta` (id 369)
- `white_spawn_block_top` (id 686)
- `wire_mill_top` (id 1074)
- `yellow_glazed_terracotta` (id 385)
- `yellow_spawn_block_top` (id 681)

### Animationsfamilien (43 Namen)

Diese Namen zu sampeln liefert automatisch den aktuellen Animationsrahmen. Die Engine rückt die Rahmen pro Familie in einem festen Intervall weiter — gemessene Werte sind nur 3: **200 ms** (3 Familien), **250 ms** (22 Familien), **300 ms** (18 Familien). Pakete schreiben nie Rahmen-Suffixe (`lava0` ist ein Fehler; `lava` ist der Name).

| Name | id | Intervall |
|---|---|---|
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
| `radar_screen` | 19 | 200 ms |
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

Strukturhinweis, sichtbar in den Rohdaten: Der Atlas hält 46 Animationswurzeln, nicht 43 — die vier vor-rotierten Kopien von `radar_screen` tragen jeweils ihre eigene 4-Rahmen-Leiter, was auch der Grund ist, warum `radar_screen` der einzige Name mit beiden Familien-Hinweisen ist.

## Gemessener Drift (cnty9 → ab90qa)

Die Registry ist mit dem Build ausgelieferter Inhalt und bewegt sich mit jedem Block-Update. v4-Build (`cnty9`, 2026-10-27) → v5-Build (`ab90qa`, 2026-11-03):

- Atlas-Einträge: 1.219 → 1.210
- Rotationsfamilien (gedrehte Schreibweisen): 57 (228) → 57 (228) — **unverändert**
- Animationsfamilien (Rahmen-Schreibweisen): 42 (188) → 42 (188) — **unverändert**
- benutzbare benannte Konstanten: 905 → **896**
- id-Änderungen unter überlebenden Namen: **334 von 905**

Der vollständige Drift (11 Namen):

- **hinzu (1):** `scorpion_eggs`.
- **entfernt (10):** `chest_double_back_hi`, `chest_double_back_lo`, `chest_double_front_hi`, `chest_double_front_lo`, `chest_double_top_1_hi`, `chest_double_top_1_lo`, `chest_double_top_2_hi`, `chest_double_top_2_lo`, `mob_spawner_hostile_block_side`, `mob_spawner_neutral_block_side` — die Doppel-Truhe (8 Flächen) hat die Spieldaten verlassen (die `chest_*`-Familie der einzelnen Truhe überlebt intakt), und Spawner behalten `mob_spawner_block_top`, während die Varianten-Seitentexturen weg sind.

**Namen sind die API; ids sind Momentaufnahmen.** Zwischen den beiden Builds änderten 334 von 905 überlebenden Namen die id — schreibe `bloxdTextureIdStone`, nicht `351`. Die Engine löst Namen bei der Validierung auf, daher überstehen namens-geschriebene Pakete den Drift; Roh-id-Pakete nicht.

## Gemessener Drift (ab90qa → xkg8x)

Die Registry bewegte sich erneut einen Tag nach dem v5-Start — `ab90qa` (2026-11-03) → `xkg8x` (2026-11-04, live in Produktion; Preprod `2lcqcl` auf jeder Shader-Pack-Oberfläche identisch gemessen):

- Atlas-Einträge: 1,210 → 1,220
- Rotationsfamilien (gedrehte Schreibweisen): 57 (228) → 57 (228) — **unverändert**
- Animationsfamilien (Bild-Schreibweisen): 42 (188) → 42 (188) — **unverändert**
- benutzbare benannte Konstanten: 896 → **906**
- id-Änderungen unter überlebenden Namen: **376 von 896**

Die vollständige Drift (10 Namen — jede v5-Start-Entfernung ist zurück):

- **hinzu (10):** `chest_double_back_hi`, `chest_double_back_lo`, `chest_double_front_hi`, `chest_double_front_lo`, `chest_double_top_1_hi`, `chest_double_top_1_lo`, `chest_double_top_2_hi`, `chest_double_top_2_lo`, `mob_spawner_hostile_block_side`, `mob_spawner_neutral_block_side` — die Double-Chest ist in die Spieldaten zurückgekehrt und die Spawner-Seitenvarianten sind wieder da.
- **entfernt:** keine.

Dieselbe Doktrin gilt mit Nachdruck: allein in diesem Schritt änderten 376 der 896 Überlebenden die id.

## Gemessener Drift (xkg8x → bny9u)

Die Registry bewegte sich am nächsten Tag erneut — `xkg8x` (2026-11-04) → `bny9u` (2026-11-05, live in Produktion und Preprod als dasselbe byte-identische Bundle):

- Atlas-Einträge: 1,220 → 1,232
- Rotationsfamilien (gedrehte Schreibweisen): 57 (228) → 57 (228) — **unverändert**
- Animationsfamilien (Bild-Schreibweisen): 42 (188) → **43 (196)** — das neue `trading_terminal_front` läuft mit einer 8-Bild-Leiter bei 250 ms
- benutzbare benannte Konstanten: 906 → **911**
- id-Änderungen unter überlebenden Namen: **864 von 906** (95%)

Die vollständige Drift (5 Namen — zwei neue Blöcke):

- **hinzu (5):** `stone_generator_side`, `stone_generator_top`, `trading_terminal_front` (anim, 8 Frames), `trading_terminal_side`, `trading_terminal_top` — die Blöcke Trading Terminal und Stone Generator sind in die Spieldaten gekommen.
- **entfernt:** keine.

Die Doktrin trifft mit jedem Schritt härter: allein in diesem Schritt änderten 864 der 906 Überlebenden die id — rund neunzehn von zwanzig.

## Gemessener Drift (xkg8x → bny9u)

Die Registry bewegte sich am nächsten Tag erneut — `xkg8x` (2026-11-04) → `bny9u` (2026-11-05, live in Produktion und Preprod als dasselbe byte-identische Bundle):

- Atlas-Einträge: 1,220 → 1,232
- Rotationsfamilien (gedrehte Schreibweisen): 57 (228) → 57 (228) — **unverändert**
- Animationsfamilien (Bild-Schreibweisen): 42 (188) → **43 (196)** — das neue `trading_terminal_front` läuft mit einer 8-Bild-Leiter bei 250 ms
- benutzbare benannte Konstanten: 906 → **911**
- id-Änderungen unter überlebenden Namen: **864 von 906** (95%)

Die vollständige Drift (5 Namen — zwei neue Blöcke):

- **hinzu (5):** `stone_generator_side`, `stone_generator_top`, `trading_terminal_front` (anim, 8 Frames), `trading_terminal_side`, `trading_terminal_top` — die Blöcke Trading Terminal und Stone Generator sind in die Spieldaten gekommen.
- **entfernt:** keine.

Die Doktrin trifft mit jedem Schritt härter: allein in diesem Schritt änderten 864 der 906 Überlebenden die id — rund neunzehn von zwanzig.

## Gemessener Drift (xkg8x → bny9u)

Die Registry bewegte sich am nächsten Tag erneut — `xkg8x` (2026-11-04) → `bny9u` (2026-11-05, live in Produktion und Preprod als dasselbe byte-identische Bundle):

- Atlas-Einträge: 1,220 → 1,232
- Rotationsfamilien (gedrehte Schreibweisen): 57 (228) → 57 (228) — **unverändert**
- Animationsfamilien (Bild-Schreibweisen): 42 (188) → **43 (196)** — das neue `trading_terminal_front` läuft mit einer 8-Bild-Leiter bei 250 ms
- benutzbare benannte Konstanten: 906 → **911**
- id-Änderungen unter überlebenden Namen: **864 von 906** (95%)

Die vollständige Drift (5 Namen — zwei neue Blöcke):

- **hinzu (5):** `stone_generator_side`, `stone_generator_top`, `trading_terminal_front` (anim, 8 Frames), `trading_terminal_side`, `trading_terminal_top` — die Blöcke Trading Terminal und Stone Generator sind in die Spieldaten gekommen.
- **entfernt:** keine.

Die Doktrin trifft mit jedem Schritt härter: allein in diesem Schritt änderten 864 der 906 Überlebenden die id — rund neunzehn von zwanzig.

## Verwandte Seiten

- [Textur-API](texture-api.md) · [Engine-Interna: Textur-Registry](../internals/texture-registry.md) · [Versionsgeschichte: v4](../history/v4.md)
