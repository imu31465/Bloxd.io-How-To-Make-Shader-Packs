# テクスチャカタログ

> 対象API: 5 · 対象ビルド: `bny9u` (2026-11-05 本番確認) · 検証状況: Verified (エンジンのレジストリ構築器を再現実行して抽出)

利用可能なテクスチャ名定数 (`bloxdTextureId*`) の完全カタログです。**911 名**、アルファベット順。

## 読み方

**名前**列がレジストリ名 — 実際に書くハンドルです。定数の綴りはファイル名を CamelCase 化します: `grass_top` → `bloxdTextureIdGrassTop`、`lava` → `bloxdTextureIdLava`。**大小文字とアンダースコアは区別されません** (`bloxdTextureId_grass_top` は `bloxdTextureIdGrassTop` と同一に解決)。名前こそ API であり、ローダが読み込み時に生レジストリへ再解決するため、レジストリの drift を生き延びます ([テクスチャAPI](texture-api.md))。

**id** 列はその定数が比較対象とする値 — `bny9u` 実測値 (アトラス層 + 1)。`surface.textureId` のダンプ解読やデバッグ出力の確認に使います。**WGSL に直接書き込んではなりません** — これは 1 ビルドのアトラス順序のスナップショットです (下部のドリフト実測を参照)。

**備考**列は 2 つの畳み込み族を示します。「アニメ (Nフレーム)」はこの名前をサンプルすると現在のアニメーションフレームが自動で返る意味 — **フレーム接尾辞を書いてはなりません** (`lava0` は専用診断の出る既知エイリアス)。「回転族 (4コピー)」はテクスチャが事前回転スロットとしてのみ存在する意味 — 名前は root を指し、`bloxdTexel` が回転を再適用します。両方の備考を持つ名前は 1 つだけ (`radar_screen`) です。

意図的に**載せない**もの: 残りのレジストリ綴り — フレームエイリアス 196 個と回転エイリアス 228 個 — は使用可能な定数ではなく、書こうとするとエンジンがそれぞれ専用のエラーメッセージで説明します。背後にある 1,232 行のレイヤ表 (事前回転 171 スロットを含む) はエンジン内部のもので [エンジン内部: Texture Registry](../internals/texture-registry.md) で扱っています。

### 数値の関係

これらの件数は異なる集合を数えているため、単純な足し算にはなりません:

| 件数 | 何を数えているか |
|---|---|
| **911** | 利用可能な名前付き定数 — `bloxdTextureId*` として書けるテクスチャ名 |
| **424** | エイリアス名 (フレーム 196 + 回転 228) — 認識はされるが元の名前への案内エラーで*拒否*される綴り。定数ではなく、id も持たない |
| **1,232** | アトラスエントリ — テクスチャアトラスの実際のスロット数 (id 1〜1232) |

911 名はそれぞれ異なるアトラスエントリ 1 つに対応します。残りの **321 エントリ**は名前を持たない追加のアニメーションフレーム (150) と事前回転コピー (171) で、パックが直接参照することはありません — `bloxdTexel` がフレームのアニメーションと回転を自動で処理するからです。アニメーション族の最初のフレームと回転族の root は名前を持つため、一部のエントリは「名前付き」と「族の基点」の両方に数えられます。比較: v4 は 905 の利用可能名、v5 初回ビルドは 911、現ビルドは 911 です — v5 初回に除去された 10 名 (double-chest×8、mob-spawner 側面×2) が復活し (従来の +1 `scorpion_eggs` に加えて)、v5 初回からの生存名 906 名のうち 864 名が id を変えました。

## カタログ本体

使用可能な全名前をアルファベット順に掲載します。id 列は `bloxdTextureId*` の値 — `bny9u` 実測値 (2026-11-05)。**id はスナップショット、名前こそ API として扱うこと**: v4 ビルド (cnty9) から v5 初回ビルド (ab90qa) への移行で生存名の 334 名が、さらに ab90qa から xkg8x への間で 376 名が、xkg8x からこのビルドへの間で 864 名が id を変えました (下部のドリフト実測を参照)。

| 名前 | id (bny9u) | 備考 |
|---|---|---|
| `alloy_kiln_back` | 1099 |  |
| `alloy_kiln_front` | 1093 |  |
| `alloy_kiln_side` | 1094 |  |
| `alloy_kiln_side_running` | 33 | アニメ (4フレーム) |
| `alloy_kiln_top` | 1095 | 回転族 (4コピー) |
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
| `auto_bench_side_running` | 35 | アニメ (4フレーム) |
| `auto_bench_top` | 1110 | 回転族 (4コピー) |
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
| `belt_tunnel_exit_top` | 1208 | 回転族 (4コピー) |
| `belt_tunnel_mouth` | 1201 |  |
| `belt_tunnel_side` | 1202 |  |
| `belt_tunnel_top` | 1203 | 回転族 (4コピー) |
| `black_concrete` | 281 |  |
| `black_glazed_terracotta` | 437 | 回転族 (4コピー) |
| `black_planks` | 374 |  |
| `black_portal` | 2 | アニメ (4フレーム) |
| `black_spawn_block_side` | 768 |  |
| `black_spawn_block_top` | 764 | 回転族 (4コピー) |
| `block_destroyer_tnt_side` | 1025 |  |
| `block_destroyer_tnt_top` | 1026 |  |
| `blue_concrete` | 282 |  |
| `blue_gen_spawn_coal` | 782 |  |
| `blue_gen_spawn_iron` | 783 |  |
| `blue_gen_spawn_top` | 781 |  |
| `blue_glazed_terracotta` | 421 | 回転族 (4コピー) |
| `blue_lucky_block` | 1002 |  |
| `blue_lucky_block_rare` | 1004 |  |
| `blue_lucky_block_super` | 1006 |  |
| `blue_planks` | 370 |  |
| `blue_portal` | 3 | アニメ (4フレーム) |
| `blue_spawn_block_side` | 763 |  |
| `blue_spawn_block_top` | 759 | 回転族 (4コピー) |
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
| `brown_glazed_terracotta` | 425 | 回転族 (4コピー) |
| `brown_mushroom_block` | 544 |  |
| `brown_planks` | 371 |  |
| `brown_portal` | 4 | アニメ (4フレーム) |
| `brown_spawn_block_side` | 758 |  |
| `brown_spawn_block_top` | 754 | 回転族 (4コピー) |
| `building_lucky_block` | 997 |  |
| `building_lucky_block_rare` | 999 |  |
| `building_lucky_block_super` | 1001 |  |
| `burner_drill_back` | 1056 |  |
| `burner_drill_bottom` | 1055 |  |
| `burner_drill_front` | 1049 |  |
| `burner_drill_side` | 1050 |  |
| `burner_drill_side_running` | 27 | アニメ (4フレーム) |
| `burner_drill_top` | 1051 | 回転族 (4コピー) |
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
| `checkpoint_block` | 769 | 回転族 (4コピー) |
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
| `chest_top` | 351 | 回転族 (4コピー) |
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
| `crop_harvester_back_running` | 45 | アニメ (4フレーム) |
| `crop_harvester_front` | 1194 |  |
| `crop_harvester_side` | 1195 |  |
| `crop_harvester_side_running` | 44 | アニメ (4フレーム) |
| `crop_harvester_top` | 1196 | 回転族 (4コピー) |
| `crusher_back` | 1063 |  |
| `crusher_front` | 1057 |  |
| `crusher_side` | 1058 |  |
| `crusher_side_running` | 28 | アニメ (4フレーム) |
| `crusher_top` | 1059 | 回転族 (4コピー) |
| `crystal_block` | 1037 |  |
| `crystal_vat_back` | 1174 |  |
| `crystal_vat_front` | 1168 |  |
| `crystal_vat_side` | 1169 |  |
| `crystal_vat_side_running` | 42 | アニメ (4フレーム) |
| `crystal_vat_top` | 1170 | 回転族 (4コピー) |
| `custom_lobby_block_side` | 777 |  |
| `custom_lobby_block_top` | 773 | 回転族 (4コピー) |
| `cut_red_sandstone` | 465 |  |
| `cut_sandstone` | 461 |  |
| `cyan_concrete` | 284 |  |
| `cyan_gen_spawn_coal` | 791 |  |
| `cyan_gen_spawn_iron` | 792 |  |
| `cyan_gen_spawn_top` | 790 |  |
| `cyan_glazed_terracotta` | 413 | 回転族 (4コピー) |
| `cyan_planks` | 368 |  |
| `cyan_portal` | 5 | アニメ (4フレーム) |
| `cyan_spawn_block_side` | 753 |  |
| `cyan_spawn_block_top` | 749 | 回転族 (4コピー) |
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
| `deep_drill_side_running` | 39 | アニメ (4フレーム) |
| `deep_drill_top` | 1143 | 回転族 (4コピー) |
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
| `electric_drill_side_running` | 34 | アニメ (4フレーム) |
| `electric_drill_top` | 1102 | 回転族 (4コピー) |
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
| `generator_side_running` | 30 | アニメ (4フレーム) |
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
| `gray_glazed_terracotta` | 405 | 回転族 (4コピー) |
| `gray_planks` | 366 |  |
| `gray_portal` | 6 | アニメ (4フレーム) |
| `gray_spawn_block_side` | 748 |  |
| `gray_spawn_block_top` | 744 | 回転族 (4コピー) |
| `green_bricks` | 467 |  |
| `green_concrete` | 293 |  |
| `green_glazed_terracotta` | 429 | 回転族 (4コピー) |
| `green_lucky_block` | 1014 |  |
| `green_lucky_block_rare` | 1016 |  |
| `green_lucky_block_super` | 1018 |  |
| `green_planks` | 372 |  |
| `green_portal` | 7 | アニメ (4フレーム) |
| `green_spawn_block_side` | 743 |  |
| `green_spawn_block_top` | 739 | 回転族 (4コピー) |
| `green_stone` | 466 |  |
| `grenade_block` | 589 |  |
| `grey_portal` | 8 | アニメ (4フレーム) |
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
| `homestead_core_mid` | 26 | アニメ (4フレーム) |
| `hyper_compressed_messy_stone` | 541 |  |
| `ice` | 334 |  |
| `ice_brick` | 476 |  |
| `iceball_block` | 548 |  |
| `invisible_solid` | 322 |  |
| `iron_block` | 242 |  |
| `iron_chest_back` | 925 |  |
| `iron_chest_front` | 919 |  |
| `iron_chest_side` | 920 |  |
| `iron_chest_top` | 921 | 回転族 (4コピー) |
| `iron_deposit` | 1041 |  |
| `iron_ore` | 236 |  |
| `iron_watermelon_side` | 554 |  |
| `iron_watermelon_top` | 555 |  |
| `jungle_grass_block` | 897 |  |
| `jungle_grass_block_side` | 896 |  |
| `lapis_block` | 244 |  |
| `lapis_ore` | 238 |  |
| `lava` | 1 | アニメ (8フレーム) |
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
| `light_blue_glazed_terracotta` | 389 | 回転族 (4コピー) |
| `light_blue_lucky_block` | 941 |  |
| `light_blue_planks` | 362 |  |
| `light_blue_spawn_block_side` | 738 |  |
| `light_blue_spawn_block_top` | 734 | 回転族 (4コピー) |
| `light_gray_concrete` | 280 |  |
| `light_gray_glazed_terracotta` | 409 | 回転族 (4コピー) |
| `light_gray_planks` | 367 |  |
| `light_gray_spawn_block_side` | 733 |  |
| `light_gray_spawn_block_top` | 729 | 回転族 (4コピー) |
| `lightblue_portal` | 9 | アニメ (4フレーム) |
| `lightgray_portal` | 10 | アニメ (4フレーム) |
| `lime_concrete` | 286 |  |
| `lime_gen_spawn_coal` | 785 |  |
| `lime_gen_spawn_iron` | 786 |  |
| `lime_gen_spawn_top` | 784 |  |
| `lime_glazed_terracotta` | 397 | 回転族 (4コピー) |
| `lime_planks` | 364 |  |
| `lime_portal` | 11 | アニメ (4フレーム) |
| `lime_spawn_block_side` | 728 |  |
| `lime_spawn_block_top` | 724 | 回転族 (4コピー) |
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
| `magenta_glazed_terracotta` | 385 | 回転族 (4コピー) |
| `magenta_planks` | 361 |  |
| `magenta_portal` | 12 | アニメ (4フレーム) |
| `magenta_spawn_block_side` | 723 |  |
| `magenta_spawn_block_top` | 719 | 回転族 (4コピー) |
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
| `moonstone_chest_top` | 453 | 回転族 (4コピー) |
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
| `orange_glazed_terracotta` | 381 | 回転族 (4コピー) |
| `orange_lucky_block` | 1008 |  |
| `orange_lucky_block_rare` | 1010 |  |
| `orange_lucky_block_super` | 1012 |  |
| `orange_planks` | 360 |  |
| `orange_portal` | 13 | アニメ (4フレーム) |
| `orange_spawn_block_side` | 718 |  |
| `orange_spawn_block_top` | 714 | 回転族 (4コピー) |
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
| `pink_glazed_terracotta` | 401 | 回転族 (4コピー) |
| `pink_planks` | 365 |  |
| `pink_portal` | 14 | アニメ (4フレーム) |
| `pink_spawn_block_side` | 713 |  |
| `pink_spawn_block_top` | 709 | 回転族 (4コピー) |
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
| `press_side_running` | 31 | アニメ (4フレーム) |
| `press_top` | 1075 | 回転族 (4コピー) |
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
| `purple_glazed_terracotta` | 417 | 回転族 (4コピー) |
| `purple_lucky_block` | 996 |  |
| `purple_lucky_block_rare` | 998 |  |
| `purple_lucky_block_super` | 1000 |  |
| `purple_planks` | 369 |  |
| `purple_portal` | 15 | アニメ (4フレーム) |
| `purple_spawn_block_side` | 708 |  |
| `purple_spawn_block_top` | 704 | 回転族 (4コピー) |
| `quartz_block_chiseled` | 328 |  |
| `quartz_block_side` | 327 |  |
| `radar_bottom` | 937 |  |
| `radar_screen` | 19 | アニメ (4フレーム) 回転族 (4コピー) |
| `radar_side_active` | 935 |  |
| `radar_side_inactive` | 938 |  |
| `radar_top_active` | 936 |  |
| `radar_top_inactive` | 939 |  |
| `recycler_back` | 1189 |  |
| `recycler_front` | 1183 |  |
| `recycler_side` | 1184 |  |
| `recycler_side_running` | 43 | アニメ (4フレーム) |
| `recycler_top` | 1185 | 回転族 (4コピー) |
| `red_concrete` | 291 |  |
| `red_gen_spawn_coal` | 779 |  |
| `red_gen_spawn_iron` | 780 |  |
| `red_gen_spawn_top` | 778 |  |
| `red_glazed_terracotta` | 433 | 回転族 (4コピー) |
| `red_lucky_block` | 942 |  |
| `red_lucky_block_rare` | 992 |  |
| `red_lucky_block_super` | 994 |  |
| `red_mushroom_block` | 545 |  |
| `red_planks` | 373 |  |
| `red_portal` | 16 | アニメ (4フレーム) |
| `red_sand` | 482 |  |
| `red_sandstone` | 462 |  |
| `red_sandstone_brick` | 483 |  |
| `red_sandstone_top` | 463 |  |
| `red_spawn_block_side` | 703 |  |
| `red_spawn_block_top` | 699 | 回転族 (4コピー) |
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
| `shatter_mill_side_running` | 40 | アニメ (4フレーム) |
| `shatter_mill_top` | 1151 | 回転族 (4コピー) |
| `shop_trader_spawn_face` | 807 |  |
| `shop_trader_spawn_side` | 806 |  |
| `shop_trader_spawn_top` | 802 | 回転族 (4コピー) |
| `shop_wizard_spawn_face` | 813 |  |
| `shop_wizard_spawn_side` | 812 |  |
| `shop_wizard_spawn_top` | 808 | 回転族 (4コピー) |
| `sky_tap_back` | 1163 |  |
| `sky_tap_bottom` | 1162 |  |
| `sky_tap_front` | 1156 |  |
| `sky_tap_side` | 1157 |  |
| `sky_tap_side_running` | 41 | アニメ (4フレーム) |
| `sky_tap_top` | 1158 | 回転族 (4コピー) |
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
| `smelter_side_running` | 29 | アニメ (4フレーム) |
| `smelter_top` | 1066 | 回転族 (4コピー) |
| `smoke` | 23 | アニメ (4フレーム) |
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
| `toxic_waste` | 25 | アニメ (8フレーム) |
| `toxic_waste_barrel_bottom` | 1028 |  |
| `toxic_waste_barrel_side` | 1027 |  |
| `toxic_waste_barrel_top` | 24 | アニメ (4フレーム) |
| `toxin_ball_block` | 688 |  |
| `trading_terminal_front` | 46 | アニメ (8フレーム) |
| `trading_terminal_side` | 1229 |  |
| `trading_terminal_top` | 1230 |  |
| `tree_cutter_back` | 1137 |  |
| `tree_cutter_back_running` | 37 | アニメ (4フレーム) |
| `tree_cutter_front` | 1131 |  |
| `tree_cutter_side` | 1132 |  |
| `tree_cutter_side_running` | 36 | アニメ (4フレーム) |
| `tree_cutter_top` | 1133 | 回転族 (4コピー) |
| `ultra_compressed_messy_stone` | 542 |  |
| `unloaded` | 197 |  |
| `volt_engine_side` | 1139 |  |
| `volt_engine_side_running` | 38 | アニメ (4フレーム) |
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
| `white_glazed_terracotta` | 377 | 回転族 (4コピー) |
| `white_planks` | 359 |  |
| `white_portal` | 17 | アニメ (4フレーム) |
| `white_spawn_block_side` | 698 |  |
| `white_spawn_block_top` | 694 | 回転族 (4コピー) |
| `wire_mill_back` | 1086 |  |
| `wire_mill_front` | 1080 |  |
| `wire_mill_side` | 1081 |  |
| `wire_mill_side_running` | 32 | アニメ (4フレーム) |
| `wire_mill_top` | 1082 | 回転族 (4コピー) |
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
| `yellow_glazed_terracotta` | 393 | 回転族 (4コピー) |
| `yellow_lucky_block` | 940 |  |
| `yellow_lucky_block_rare` | 990 |  |
| `yellow_lucky_block_super` | 991 |  |
| `yellow_planks` | 363 |  |
| `yellow_portal` | 18 | アニメ (4フレーム) |
| `yellow_spawn_block_side` | 693 |  |
| `yellow_spawn_block_top` | 689 | 回転族 (4コピー) |

### 回転族 (57 root)

これらのテクスチャは事前回転コピー (`name[rot[1..4`) としてのみ存在します。レジストリは以下の root へ畳み込み、`bloxdTexel` がサンプル時に回転を再適用するので、root を参照しコピーは決して参照しません。`[rot[N` 綴りを書くと専用の回転名診断が出ます。

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

### アニメ族 (43 名)

これらの名前をサンプルすると現在のアニメーションフレームが自動的に返ります。エンジンは族ごとに固定された間隔でフレームを進めます — 実測では 3 値のみ: **200 ms** (3 族)、**250 ms** (22 族)、**300 ms** (18 族)。間隔の列を参照。パック側がフレーム接尾辞を書くことはありません (`lava0` はエラー、`lava` が名前)。

| 名前 | id | 間隔 |
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

なお生データから見える構造上の注記: アトラスが保持するアニメーションルートは 43 ではなく 45 個です — `radar_screen` の 4 つの先行回転コピーがそれぞれ独自の 4 フレームラダーを持つためであり、`radar_screen` が両方の族注記を担う唯一の名前である理由でもあります。

## ドリフト実測 (cnty9 → ab90qa)

レジストリはビルド同梱のコンテンツであり、ブロック更新のたびに動きます。v4 ビルド (`cnty9`、2026-10-27) から v5 ビルド (`ab90qa`、2026-11-03) への移動は:

- アトラスエントリ: 1,219 → 1,210
- 回転ファミリ (回転綴り): 57 (228) → 57 (228) — **不変**
- アニメファミリ (フレーム綴り): 42 (188) → 42 (188) — **不変**
- 利用可能な名前付き定数: 905 → **896**
- 生存名の id 変動: **334 名** (905 名中)

ドリフトの全体 (これが完全なリストである — 11 名):

- **追加 (1):** `scorpion_eggs`。
- **削除 (10):** `chest_double_back_hi`, `chest_double_back_lo`, `chest_double_front_hi`, `chest_double_front_lo`, `chest_double_top_1_hi`, `chest_double_top_1_lo`, `chest_double_top_2_hi`, `chest_double_top_2_lo`, `mob_spawner_hostile_block_side`, `mob_spawner_neutral_block_side` — ダブルチェスト (8 面) がゲームデータから消え、シングルチェストの `chest_*` ファミリは無傷で生存。スポナーは `mob_spawner_block_top` を維持し、バリアント側面テクスチャが消滅しました。

**名前こそ API、id はスナップショット。** 2 ビルド間で 905 生存名のうち 334 名が id を変えました — `bloxdTextureIdStone` と書け、`351` と書くな。エンジンは検証時に名前を解決するため、名前で書いたパックはレジストリの drift を生き延びますが、生 id で書いたパックはそうなりません。

## ドリフト実測 (ab90qa → xkg8x)

レジストリは v5 開始の翌日に再び動きました — `ab90qa` (2026-11-03) → `xkg8x` (2026-11-04、本番稼働。preprod `2lcqcl` はシェーダーパック関連の全表面で同一と実測):

- アトラスエントリ: 1,210 → 1,220
- 回転族 (回転綴り): 57 (228) → 57 (228) — **変化なし**
- アニメーション族 (フレーム綴り): 42 (188) → 42 (188) — **変化なし**
- 利用可能な名前付き定数: 896 → **906**
- 生存名の id 変化: **896 名中 376 名**

完全なドリフト (10 名 — v5 初回の除去がすべて復活):

- **追加 (10):** `chest_double_back_hi`, `chest_double_back_lo`, `chest_double_front_hi`, `chest_double_front_lo`, `chest_double_top_1_hi`, `chest_double_top_1_lo`, `chest_double_top_2_hi`, `chest_double_top_2_lo`, `mob_spawner_hostile_block_side`, `mob_spawner_neutral_block_side` — double chest がゲームデータに復帰し、スポナー側面のバリアントも戻りました。
- **削除:** なし。

上と同じ原理がさらに強く当てはまります: この 1 ステップだけで生存 896 名中 376 名が id を変えました。

## ドリフト実測 (xkg8x → bny9u)

レジストリは翌日また動きました — `xkg8x` (2026-11-04) → `bny9u` (2026-11-05、本番と preprod が同一のバイト同一バンドルとして稼働):

- アトラスエントリ: 1,220 → 1,232
- 回転族 (回転綴り): 57 (228) → 57 (228) — **変化なし**
- アニメーション族 (フレーム綴り): 42 (188) → **43 (196)** — 新参の `trading_terminal_front` は 8 フレーム / 250 ms のラダーで動く
- 利用可能な名前付き定数: 906 → **911**
- 生存名の id 変化: **906 名中 864 名** (95%)

完全なドリフト (5 名 — 新ブロック 2 種):

- **追加 (5):** `stone_generator_side`, `stone_generator_top`, `trading_terminal_front` (アニメ, 8フレーム), `trading_terminal_side`, `trading_terminal_top` — Trading Terminal と Stone Generator のブロックがゲームデータに加わりました。
- **削除:** なし。

この原理は一歩ごとに強く当てはまります: この 1 ステップだけで生存 906 名中 864 名が id を変えました — 20 名中 19 名に相当します。

## ドリフト実測 (xkg8x → bny9u)

レジストリは翌日また動きました — `xkg8x` (2026-11-04) → `bny9u` (2026-11-05、本番と preprod が同一のバイト同一バンドルとして稼働):

- アトラスエントリ: 1,220 → 1,232
- 回転族 (回転綴り): 57 (228) → 57 (228) — **変化なし**
- アニメーション族 (フレーム綴り): 42 (188) → **43 (196)** — 新参の `trading_terminal_front` は 8 フレーム / 250 ms のラダーで動く
- 利用可能な名前付き定数: 906 → **911**
- 生存名の id 変化: **906 名中 864 名** (95%)

完全なドリフト (5 名 — 新ブロック 2 種):

- **追加 (5):** `stone_generator_side`, `stone_generator_top`, `trading_terminal_front` (アニメ, 8フレーム), `trading_terminal_side`, `trading_terminal_top` — Trading Terminal と Stone Generator のブロックがゲームデータに加わりました。
- **削除:** なし。

この原理は一歩ごとに強く当てはまります: この 1 ステップだけで生存 906 名中 864 名が id を変えました — 20 名中 19 名に相当します。

## ドリフト実測 (xkg8x → bny9u)

レジストリは翌日また動きました — `xkg8x` (2026-11-04) → `bny9u` (2026-11-05、本番と preprod が同一のバイト同一バンドルとして稼働):

- アトラスエントリ: 1,220 → 1,232
- 回転族 (回転綴り): 57 (228) → 57 (228) — **変化なし**
- アニメーション族 (フレーム綴り): 42 (188) → **43 (196)** — 新参の `trading_terminal_front` は 8 フレーム / 250 ms のラダーで動く
- 利用可能な名前付き定数: 906 → **911**
- 生存名の id 変化: **906 名中 864 名** (95%)

完全なドリフト (5 名 — 新ブロック 2 種):

- **追加 (5):** `stone_generator_side`, `stone_generator_top`, `trading_terminal_front` (アニメ, 8フレーム), `trading_terminal_side`, `trading_terminal_top` — Trading Terminal と Stone Generator のブロックがゲームデータに加わりました。
- **削除:** なし。

この原理は一歩ごとに強く当てはまります: この 1 ステップだけで生存 906 名中 864 名が id を変えました — 20 名中 19 名に相当します。

## 関連

- 名前解決の規則とエラーメッセージ → [テクスチャAPI](texture-api.md)
- レジストリの内部構造と畳み込み規則 → [エンジン内部: Texture Registry](../internals/texture-registry.md)
- v4 カタログ (905 名、cnty9 実測) → [バージョン履歴: v4](../history/v4.md)

