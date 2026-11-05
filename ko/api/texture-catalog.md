# 텍스처 카탈로그

> 대상 API: 5 · 대상 빌드: `bny9u` (2026-11-05, 프로덕션 확인) · 상태: Verified (엔진 자신의 레지스트리 빌더를 재실행해 추출)

사용 가능한 텍스처 이름 상수 (`bloxdTextureId*`) 의 완전한 카탈로그. **911 이름**, 알파벳순.

## 읽는 법

**이름** 열이 레지스트리명 — 실제로 코드에 쓰는 핸들이다. 상수 철자는 파일명의 CamelCase 다: `grass_top` → `bloxdTextureIdGrassTop`, `lava` → `bloxdTextureIdLava`. **대소문자와 언더스코어는 구별되지 않는다** (`bloxdTextureId_grass_top` 은 `bloxdTextureIdGrassTop` 과 똑같이 해석된다). 이름이 API 다 — 로더가 로드 시 라이브 레지스트리에 대해 다시 해석하므로, 이름은 레지스트리 드리프트를 견딘다 ([텍스처 API](texture-api.md)).

**id** 열은 상수가 비교되는 값 — `bny9u` 에서 실측 (아틀라스 레이어 + 1). `surface.textureId` 덤프를 해독하고, 그날의 빌드에 대해 디버그 출력을 교차 확인하는 데 쓴다. **WGSL 에 id 를 절대 쓰지 마라** — id 는 한 빌드의 아틀라스 순서 스냅샷이다 (아래 드리프트 실측 참조).

**비고** 열은 두 접기 계열을 표시한다. 「애니메이션(4프레임)」은 이 이름을 샘플하면 현재 애니메이션 프레임이 자동으로 반환된다는 뜻이다 — **프레임 접미사를 절대 쓰지 마라** (`lava0` 은 전용 진단이 붙은 알려진 별명이다). 「회전 계열(4사본)」은 그 텍스처가 미리 회전된 슬롯으로만 존재한다는 뜻이다 — 이름은 루트를 가리키고 `bloxdTexel` 이 회전을 다시 적용한다. 정확히 한 이름 (`radar_screen`) 만이 두 비고를 모두 가진다.

일부러 싣지 **않은** 것: 나머지 레지스트리 철자 — 프레임 별명 196개와 회전 별명 228개 — 는 사용 가능한 상수가 아니다. 쓰면 전용 엔진 오류 메시지가 나온다. 기반이 되는 1,232행 레이어 표 (미리 회전된 슬롯 171개 포함) 는 엔진 내부물로 [엔진 내부와 연구: 텍스처 레지스트리](../internals/texture-registry.md) 에서 다룬다.

### 수치의 관계

이 숫자들은 서로 다른 집합을 세므로, 단순 합산되지 않는다:

| 개수 | 세는 것 |
|---|---|
| **911** | 사용 가능한 이름 상수 — `bloxdTextureId*` 로 쓸 수 있는 텍스처 이름 |
| **424** | 별명 (프레임 196 + 회전 228) — 인식은 되지만 기본명 안내와 함께 *거부*되는 철자. 상수가 아니라 이름이며, id 를 추가하지 않는다 |
| **1,232** | 아틀라스 엔트리 — 텍스처 아틀라스의 실제 슬롯 (id 1–1232) |

911 이름은 각각 하나의 고유한 아틀라스 엔트리에 대응한다. 나머지 **321 엔트리**는 사용 가능한 이름 없는 추가 애니메이션 프레임 (150) 과 미리 회전된 사본 (171) 이다 — 팩은 그것을 직접 참조하지 않는다. `bloxdTexel` 이 프레임 애니메이션과 회전을 자동으로 처리하기 때문이다. 각 애니메이션 계열의 첫 프레임과 각 회전 계열의 루트는 이름을 *가진다*. 그래서 어떤 엔트리는 「이름 있음」과 「프레임/회전 기반」 양쪽으로 세진다. 비교: v4 는 905개 사용 가능 이름, v5 출시 빌드는 911, 이 빌드는 911 이다 — v5 출시 때 제거된 10 이름 (더블 체스트 ×8, 몹 스포너 옆면 ×2) 이 돌아왔고 (기존 +1 `scorpion_eggs` 에 더해), 출시 빌드의 생존 이름 906개 중 864개가 id 를 바꿨다.

## 카탈로그

사용 가능한 모든 이름, 알파벳순. id 열은 `bloxdTextureId*` 값 — `bny9u` (2026-11-05) 에서 실측. **id 는 스냅샷, 이름을 API 로 다뤄라**: v4 빌드 (cnty9) 와 v5 출시 빌드 (ab90qa) 사이에서 생존 이름 334개가, ab90qa 와 xkg8x 사이에서 376개가, xkg8x 와 이 빌드 사이에서는 다시 864개가 id 를 바꿨다 (아래 드리프트 실측 참조).

| 이름 | id (bny9u) | 비고 |
|---|---|---|
| `alloy_kiln_back` | 1099 |  |
| `alloy_kiln_front` | 1093 |  |
| `alloy_kiln_side` | 1094 |  |
| `alloy_kiln_side_running` | 33 | 애니메이션(4프레임) |
| `alloy_kiln_top` | 1095 | 회전 계열(4사본) |
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
| `auto_bench_side_running` | 35 | 애니메이션(4프레임) |
| `auto_bench_top` | 1110 | 회전 계열(4사본) |
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
| `belt_tunnel_exit_top` | 1208 | 회전 계열(4사본) |
| `belt_tunnel_mouth` | 1201 |  |
| `belt_tunnel_side` | 1202 |  |
| `belt_tunnel_top` | 1203 | 회전 계열(4사본) |
| `black_concrete` | 281 |  |
| `black_glazed_terracotta` | 437 | 회전 계열(4사본) |
| `black_planks` | 374 |  |
| `black_portal` | 2 | 애니메이션(4프레임) |
| `black_spawn_block_side` | 768 |  |
| `black_spawn_block_top` | 764 | 회전 계열(4사본) |
| `block_destroyer_tnt_side` | 1025 |  |
| `block_destroyer_tnt_top` | 1026 |  |
| `blue_concrete` | 282 |  |
| `blue_gen_spawn_coal` | 782 |  |
| `blue_gen_spawn_iron` | 783 |  |
| `blue_gen_spawn_top` | 781 |  |
| `blue_glazed_terracotta` | 421 | 회전 계열(4사본) |
| `blue_lucky_block` | 1002 |  |
| `blue_lucky_block_rare` | 1004 |  |
| `blue_lucky_block_super` | 1006 |  |
| `blue_planks` | 370 |  |
| `blue_portal` | 3 | 애니메이션(4프레임) |
| `blue_spawn_block_side` | 763 |  |
| `blue_spawn_block_top` | 759 | 회전 계열(4사본) |
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
| `brown_glazed_terracotta` | 425 | 회전 계열(4사본) |
| `brown_mushroom_block` | 544 |  |
| `brown_planks` | 371 |  |
| `brown_portal` | 4 | 애니메이션(4프레임) |
| `brown_spawn_block_side` | 758 |  |
| `brown_spawn_block_top` | 754 | 회전 계열(4사본) |
| `building_lucky_block` | 997 |  |
| `building_lucky_block_rare` | 999 |  |
| `building_lucky_block_super` | 1001 |  |
| `burner_drill_back` | 1056 |  |
| `burner_drill_bottom` | 1055 |  |
| `burner_drill_front` | 1049 |  |
| `burner_drill_side` | 1050 |  |
| `burner_drill_side_running` | 27 | 애니메이션(4프레임) |
| `burner_drill_top` | 1051 | 회전 계열(4사본) |
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
| `checkpoint_block` | 769 | 회전 계열(4사본) |
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
| `chest_top` | 351 | 회전 계열(4사본) |
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
| `crop_harvester_back_running` | 45 | 애니메이션(4프레임) |
| `crop_harvester_front` | 1194 |  |
| `crop_harvester_side` | 1195 |  |
| `crop_harvester_side_running` | 44 | 애니메이션(4프레임) |
| `crop_harvester_top` | 1196 | 회전 계열(4사본) |
| `crusher_back` | 1063 |  |
| `crusher_front` | 1057 |  |
| `crusher_side` | 1058 |  |
| `crusher_side_running` | 28 | 애니메이션(4프레임) |
| `crusher_top` | 1059 | 회전 계열(4사본) |
| `crystal_block` | 1037 |  |
| `crystal_vat_back` | 1174 |  |
| `crystal_vat_front` | 1168 |  |
| `crystal_vat_side` | 1169 |  |
| `crystal_vat_side_running` | 42 | 애니메이션(4프레임) |
| `crystal_vat_top` | 1170 | 회전 계열(4사본) |
| `custom_lobby_block_side` | 777 |  |
| `custom_lobby_block_top` | 773 | 회전 계열(4사본) |
| `cut_red_sandstone` | 465 |  |
| `cut_sandstone` | 461 |  |
| `cyan_concrete` | 284 |  |
| `cyan_gen_spawn_coal` | 791 |  |
| `cyan_gen_spawn_iron` | 792 |  |
| `cyan_gen_spawn_top` | 790 |  |
| `cyan_glazed_terracotta` | 413 | 회전 계열(4사본) |
| `cyan_planks` | 368 |  |
| `cyan_portal` | 5 | 애니메이션(4프레임) |
| `cyan_spawn_block_side` | 753 |  |
| `cyan_spawn_block_top` | 749 | 회전 계열(4사본) |
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
| `deep_drill_side_running` | 39 | 애니메이션(4프레임) |
| `deep_drill_top` | 1143 | 회전 계열(4사본) |
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
| `electric_drill_side_running` | 34 | 애니메이션(4프레임) |
| `electric_drill_top` | 1102 | 회전 계열(4사본) |
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
| `generator_side_running` | 30 | 애니메이션(4프레임) |
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
| `gray_glazed_terracotta` | 405 | 회전 계열(4사본) |
| `gray_planks` | 366 |  |
| `gray_portal` | 6 | 애니메이션(4프레임) |
| `gray_spawn_block_side` | 748 |  |
| `gray_spawn_block_top` | 744 | 회전 계열(4사본) |
| `green_bricks` | 467 |  |
| `green_concrete` | 293 |  |
| `green_glazed_terracotta` | 429 | 회전 계열(4사본) |
| `green_lucky_block` | 1014 |  |
| `green_lucky_block_rare` | 1016 |  |
| `green_lucky_block_super` | 1018 |  |
| `green_planks` | 372 |  |
| `green_portal` | 7 | 애니메이션(4프레임) |
| `green_spawn_block_side` | 743 |  |
| `green_spawn_block_top` | 739 | 회전 계열(4사본) |
| `green_stone` | 466 |  |
| `grenade_block` | 589 |  |
| `grey_portal` | 8 | 애니메이션(4프레임) |
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
| `homestead_core_mid` | 26 | 애니메이션(4프레임) |
| `hyper_compressed_messy_stone` | 541 |  |
| `ice` | 334 |  |
| `ice_brick` | 476 |  |
| `iceball_block` | 548 |  |
| `invisible_solid` | 322 |  |
| `iron_block` | 242 |  |
| `iron_chest_back` | 925 |  |
| `iron_chest_front` | 919 |  |
| `iron_chest_side` | 920 |  |
| `iron_chest_top` | 921 | 회전 계열(4사본) |
| `iron_deposit` | 1041 |  |
| `iron_ore` | 236 |  |
| `iron_watermelon_side` | 554 |  |
| `iron_watermelon_top` | 555 |  |
| `jungle_grass_block` | 897 |  |
| `jungle_grass_block_side` | 896 |  |
| `lapis_block` | 244 |  |
| `lapis_ore` | 238 |  |
| `lava` | 1 | 애니메이션(8프레임) |
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
| `light_blue_glazed_terracotta` | 389 | 회전 계열(4사본) |
| `light_blue_lucky_block` | 941 |  |
| `light_blue_planks` | 362 |  |
| `light_blue_spawn_block_side` | 738 |  |
| `light_blue_spawn_block_top` | 734 | 회전 계열(4사본) |
| `light_gray_concrete` | 280 |  |
| `light_gray_glazed_terracotta` | 409 | 회전 계열(4사본) |
| `light_gray_planks` | 367 |  |
| `light_gray_spawn_block_side` | 733 |  |
| `light_gray_spawn_block_top` | 729 | 회전 계열(4사본) |
| `lightblue_portal` | 9 | 애니메이션(4프레임) |
| `lightgray_portal` | 10 | 애니메이션(4프레임) |
| `lime_concrete` | 286 |  |
| `lime_gen_spawn_coal` | 785 |  |
| `lime_gen_spawn_iron` | 786 |  |
| `lime_gen_spawn_top` | 784 |  |
| `lime_glazed_terracotta` | 397 | 회전 계열(4사본) |
| `lime_planks` | 364 |  |
| `lime_portal` | 11 | 애니메이션(4프레임) |
| `lime_spawn_block_side` | 728 |  |
| `lime_spawn_block_top` | 724 | 회전 계열(4사본) |
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
| `magenta_glazed_terracotta` | 385 | 회전 계열(4사본) |
| `magenta_planks` | 361 |  |
| `magenta_portal` | 12 | 애니메이션(4프레임) |
| `magenta_spawn_block_side` | 723 |  |
| `magenta_spawn_block_top` | 719 | 회전 계열(4사본) |
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
| `moonstone_chest_top` | 453 | 회전 계열(4사본) |
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
| `orange_glazed_terracotta` | 381 | 회전 계열(4사본) |
| `orange_lucky_block` | 1008 |  |
| `orange_lucky_block_rare` | 1010 |  |
| `orange_lucky_block_super` | 1012 |  |
| `orange_planks` | 360 |  |
| `orange_portal` | 13 | 애니메이션(4프레임) |
| `orange_spawn_block_side` | 718 |  |
| `orange_spawn_block_top` | 714 | 회전 계열(4사본) |
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
| `pink_glazed_terracotta` | 401 | 회전 계열(4사본) |
| `pink_planks` | 365 |  |
| `pink_portal` | 14 | 애니메이션(4프레임) |
| `pink_spawn_block_side` | 713 |  |
| `pink_spawn_block_top` | 709 | 회전 계열(4사본) |
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
| `press_side_running` | 31 | 애니메이션(4프레임) |
| `press_top` | 1075 | 회전 계열(4사본) |
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
| `purple_glazed_terracotta` | 417 | 회전 계열(4사본) |
| `purple_lucky_block` | 996 |  |
| `purple_lucky_block_rare` | 998 |  |
| `purple_lucky_block_super` | 1000 |  |
| `purple_planks` | 369 |  |
| `purple_portal` | 15 | 애니메이션(4프레임) |
| `purple_spawn_block_side` | 708 |  |
| `purple_spawn_block_top` | 704 | 회전 계열(4사본) |
| `quartz_block_chiseled` | 328 |  |
| `quartz_block_side` | 327 |  |
| `radar_bottom` | 937 |  |
| `radar_screen` | 19 | 애니메이션(4프레임) 회전 계열(4사본) |
| `radar_side_active` | 935 |  |
| `radar_side_inactive` | 938 |  |
| `radar_top_active` | 936 |  |
| `radar_top_inactive` | 939 |  |
| `recycler_back` | 1189 |  |
| `recycler_front` | 1183 |  |
| `recycler_side` | 1184 |  |
| `recycler_side_running` | 43 | 애니메이션(4프레임) |
| `recycler_top` | 1185 | 회전 계열(4사본) |
| `red_concrete` | 291 |  |
| `red_gen_spawn_coal` | 779 |  |
| `red_gen_spawn_iron` | 780 |  |
| `red_gen_spawn_top` | 778 |  |
| `red_glazed_terracotta` | 433 | 회전 계열(4사본) |
| `red_lucky_block` | 942 |  |
| `red_lucky_block_rare` | 992 |  |
| `red_lucky_block_super` | 994 |  |
| `red_mushroom_block` | 545 |  |
| `red_planks` | 373 |  |
| `red_portal` | 16 | 애니메이션(4프레임) |
| `red_sand` | 482 |  |
| `red_sandstone` | 462 |  |
| `red_sandstone_brick` | 483 |  |
| `red_sandstone_top` | 463 |  |
| `red_spawn_block_side` | 703 |  |
| `red_spawn_block_top` | 699 | 회전 계열(4사본) |
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
| `shatter_mill_side_running` | 40 | 애니메이션(4프레임) |
| `shatter_mill_top` | 1151 | 회전 계열(4사본) |
| `shop_trader_spawn_face` | 807 |  |
| `shop_trader_spawn_side` | 806 |  |
| `shop_trader_spawn_top` | 802 | 회전 계열(4사본) |
| `shop_wizard_spawn_face` | 813 |  |
| `shop_wizard_spawn_side` | 812 |  |
| `shop_wizard_spawn_top` | 808 | 회전 계열(4사본) |
| `sky_tap_back` | 1163 |  |
| `sky_tap_bottom` | 1162 |  |
| `sky_tap_front` | 1156 |  |
| `sky_tap_side` | 1157 |  |
| `sky_tap_side_running` | 41 | 애니메이션(4프레임) |
| `sky_tap_top` | 1158 | 회전 계열(4사본) |
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
| `smelter_side_running` | 29 | 애니메이션(4프레임) |
| `smelter_top` | 1066 | 회전 계열(4사본) |
| `smoke` | 23 | 애니메이션(4프레임) |
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
| `toxic_waste` | 25 | 애니메이션(8프레임) |
| `toxic_waste_barrel_bottom` | 1028 |  |
| `toxic_waste_barrel_side` | 1027 |  |
| `toxic_waste_barrel_top` | 24 | 애니메이션(4프레임) |
| `toxin_ball_block` | 688 |  |
| `trading_terminal_front` | 46 | 애니메이션(8프레임) |
| `trading_terminal_side` | 1229 |  |
| `trading_terminal_top` | 1230 |  |
| `tree_cutter_back` | 1137 |  |
| `tree_cutter_back_running` | 37 | 애니메이션(4프레임) |
| `tree_cutter_front` | 1131 |  |
| `tree_cutter_side` | 1132 |  |
| `tree_cutter_side_running` | 36 | 애니메이션(4프레임) |
| `tree_cutter_top` | 1133 | 회전 계열(4사본) |
| `ultra_compressed_messy_stone` | 542 |  |
| `unloaded` | 197 |  |
| `volt_engine_side` | 1139 |  |
| `volt_engine_side_running` | 38 | 애니메이션(4프레임) |
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
| `white_glazed_terracotta` | 377 | 회전 계열(4사본) |
| `white_planks` | 359 |  |
| `white_portal` | 17 | 애니메이션(4프레임) |
| `white_spawn_block_side` | 698 |  |
| `white_spawn_block_top` | 694 | 회전 계열(4사본) |
| `wire_mill_back` | 1086 |  |
| `wire_mill_front` | 1080 |  |
| `wire_mill_side` | 1081 |  |
| `wire_mill_side_running` | 32 | 애니메이션(4프레임) |
| `wire_mill_top` | 1082 | 회전 계열(4사본) |
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
| `yellow_glazed_terracotta` | 393 | 회전 계열(4사본) |
| `yellow_lucky_block` | 940 |  |
| `yellow_lucky_block_rare` | 990 |  |
| `yellow_lucky_block_super` | 991 |  |
| `yellow_planks` | 363 |  |
| `yellow_portal` | 18 | 애니메이션(4프레임) |
| `yellow_spawn_block_side` | 693 |  |
| `yellow_spawn_block_top` | 689 | 회전 계열(4사본) |

### 회전 계열 (57 루트)

이 텍스처들은 미리 회전된 사본 (`name[rot[1..4`) 으로만 존재한다. 레지스트리는 아래 루트로 접고, `bloxdTexel` 이 샘플 시점에 회전을 다시 적용한다 — 사본이 아니라 루트를 참조하라. `[rot[N` 철자를 쓰면 전용 회전 진단이 나온다.

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

### 애니메이션 계열 (43 이름)

이 이름들을 샘플하면 현재 애니메이션 프레임이 자동으로 반환된다. 엔진은 계열마다 고정 간격으로 프레임을 진행한다 — 실측 간격은 3종뿐: **200 ms** (3 계열), **250 ms** (22 계열), **300 ms** (18 계열). 팩은 프레임 접미사를 절대 쓰지 않는다 (`lava0` 은 오류, `lava` 가 이름이다).

| 이름 | id | 간격 |
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

원시 데이터에 보이는 구조적 비고: 아틀라스는 43가 아니라 45개의 애니메이션 루트를 담는다 — `radar_screen` 의 미리 회전된 사본 4개가 각자의 4프레임 사다리를 가지며, 이것이 `radar_screen` 이 유일하게 두 계열 비고를 함께 가지는 이유이기도 하다.

## 실측 드리프트 (cnty9 → ab90qa)

레지스트리는 빌드에 동봉되는 콘텐츠로, 블록 업데이트마다 움직인다. v4 빌드 (`cnty9`, 2026-10-27) → v5 빌드 (`ab90qa`, 2026-11-03):

- 아틀라스 엔트리: 1,219 → 1,210
- 회전 계열 (회전 철자): 57 (228) → 57 (228) — **불변**
- 애니메이션 계열 (프레임 철자): 42 (188) → 42 (188) — **불변**
- 사용 가능 이름 상수: 905 → **896**
- 생존 이름 중 id 변화: **905 중 334**

드리프트 전체 (11 이름):

- **추가 (1):** `scorpion_eggs`.
- **삭제 (10):** `chest_double_back_hi`, `chest_double_back_lo`, `chest_double_front_hi`, `chest_double_front_lo`, `chest_double_top_1_hi`, `chest_double_top_1_lo`, `chest_double_top_2_hi`, `chest_double_top_2_lo`, `mob_spawner_hostile_block_side`, `mob_spawner_neutral_block_side` — 더블 체스트 (8면) 가 게임 데이터에서 떠났고 (싱글 체스트 `chest_*` 계열은 온전히 생존), 스포너는 `mob_spawner_block_top` 을 유지한 채 변형 옆면 텍스처가 사라졌다.

**이름이 API, id 는 스냅샷이다.** 두 빌드 사이에서 생존 이름 905 중 334개가 id 를 바꿨다 — `351` 이 아니라 `bloxdTextureIdStone` 을 써라. 엔진은 검증 시점에 이름을 해석하므로, 이름으로 쓴 팩은 드리프트를 견디고 원시 id 팩은 그렇지 못하다.

## 실측 드리프트 (ab90qa → xkg8x)

레지스트리는 v5 출시 다음 날 다시 움직였다 — `ab90qa` (2026-11-03) → `xkg8x` (2026-11-04, 프로덕션 라이브; preprod `2lcqcl` 은 셰이더 팩의 모든 표면에서 동일하게 실측됨):

- 아틀라스 엔트리: 1,210 → 1,220
- 회전 계열 (회전 철자): 57 (228) → 57 (228) — **변화 없음**
- 애니메이션 계열 (프레임 철자): 42 (188) → 42 (188) — **변화 없음**
- 사용 가능 이름 상수: 896 → **906**
- 생존 이름의 id 변화: **896개 중 376개**

전체 드리프트 (10 이름 — v5 출시 때의 제거가 전부 복귀):

- **추가 (10):** `chest_double_back_hi`, `chest_double_back_lo`, `chest_double_front_hi`, `chest_double_front_lo`, `chest_double_top_1_hi`, `chest_double_top_1_lo`, `chest_double_top_2_hi`, `chest_double_top_2_lo`, `mob_spawner_hostile_block_side`, `mob_spawner_neutral_block_side` — 더블 체스트가 게임 데이터로 돌아왔고 몹 스포너 옆면 변형도 함께 복귀했다.
- **제거:** 없음.

같은 원칙이 더 큰 힘으로 적용된다: 이 한 단계에서만 생존 896개 중 376개가 id 를 바꿨다.

## 실측 드리프트 (xkg8x → bny9u)

레지스트리는 다음 날 또 움직였다 — `xkg8x` (2026-11-04) → `bny9u` (2026-11-05, 프로덕션과 preprod 가 같은 바이트 동일 번들로 라이브):

- 아틀라스 엔트리: 1,220 → 1,232
- 회전 계열 (회전 철자): 57 (228) → 57 (228) — **변화 없음**
- 애니메이션 계열 (프레임 철자): 42 (188) → **43 (196)** — 새로 온 `trading_terminal_front` 는 8프레임 / 250 ms 사다리를 돈다
- 사용 가능 이름 상수: 906 → **911**
- 생존 이름의 id 변화: **906개 중 864개** (95%)

전체 드리프트 (5 이름 — 새 블록 2종):

- **추가 (5):** `stone_generator_side`, `stone_generator_top`, `trading_terminal_front` (애니메이션, 8프레임), `trading_terminal_side`, `trading_terminal_top` — Trading Terminal 과 Stone Generator 블록이 게임 데이터에 합류했다.
- **제거:** 없음.

같은 원칙은 한 걸음마다 더 세게 적용된다: 이 한 단계에서만 생존 906개 중 864개가 id 를 바꿨다 — 20개 중 19개 꼴이다.

## 실측 드리프트 (xkg8x → bny9u)

레지스트리는 다음 날 또 움직였다 — `xkg8x` (2026-11-04) → `bny9u` (2026-11-05, 프로덕션과 preprod 가 같은 바이트 동일 번들로 라이브):

- 아틀라스 엔트리: 1,220 → 1,232
- 회전 계열 (회전 철자): 57 (228) → 57 (228) — **변화 없음**
- 애니메이션 계열 (프레임 철자): 42 (188) → **43 (196)** — 새로 온 `trading_terminal_front` 는 8프레임 / 250 ms 사다리를 돈다
- 사용 가능 이름 상수: 906 → **911**
- 생존 이름의 id 변화: **906개 중 864개** (95%)

전체 드리프트 (5 이름 — 새 블록 2종):

- **추가 (5):** `stone_generator_side`, `stone_generator_top`, `trading_terminal_front` (애니메이션, 8프레임), `trading_terminal_side`, `trading_terminal_top` — Trading Terminal 과 Stone Generator 블록이 게임 데이터에 합류했다.
- **제거:** 없음.

같은 원칙은 한 걸음마다 더 세게 적용된다: 이 한 단계에서만 생존 906개 중 864개가 id 를 바꿨다 — 20개 중 19개 꼴이다.

## 실측 드리프트 (xkg8x → bny9u)

레지스트리는 다음 날 또 움직였다 — `xkg8x` (2026-11-04) → `bny9u` (2026-11-05, 프로덕션과 preprod 가 같은 바이트 동일 번들로 라이브):

- 아틀라스 엔트리: 1,220 → 1,232
- 회전 계열 (회전 철자): 57 (228) → 57 (228) — **변화 없음**
- 애니메이션 계열 (프레임 철자): 42 (188) → **43 (196)** — 새로 온 `trading_terminal_front` 는 8프레임 / 250 ms 사다리를 돈다
- 사용 가능 이름 상수: 906 → **911**
- 생존 이름의 id 변화: **906개 중 864개** (95%)

전체 드리프트 (5 이름 — 새 블록 2종):

- **추가 (5):** `stone_generator_side`, `stone_generator_top`, `trading_terminal_front` (애니메이션, 8프레임), `trading_terminal_side`, `trading_terminal_top` — Trading Terminal 과 Stone Generator 블록이 게임 데이터에 합류했다.
- **제거:** 없음.

같은 원칙은 한 걸음마다 더 세게 적용된다: 이 한 단계에서만 생존 906개 중 864개가 id 를 바꿨다 — 20개 중 19개 꼴이다.

## 관련 문서

- [텍스처 API](texture-api.md) · [엔진 내부와 연구: 텍스처 레지스트리](../internals/texture-registry.md) · [버전 히스토리: v4](../history/v4.md)
