# 텍스처 카탈로그

> 대상 API: 5 · 대상 빌드: `v98qt8` (2026-11-08, 프로덕션·preprod 확인) · 상태: Verified (엔진 자신의 레지스트리 빌더를 재실행해 추출)

사용 가능한 텍스처 이름 상수 (`bloxdTextureId*`) 의 완전한 카탈로그. **906 이름**, 알파벳순.

**라이브 빌드 참고 (v98qt8, 2026-11-08):** 이 빌드에는 텍스처 상수 회귀가 있습니다 — 엔진의 애니메이션 텍스처 테이블이 스펠링을 키로 구축된 반면 폴딩 코드는 슬롯 인덱스를 기대합니다. 때문에 아래 43개 애니메이션 계열 기본 이름(`lava`, 모든 `*_portal`, `smoke`, `radar_screen`, `trading_terminal_front`, …)이 현재 **검증에 실패**하며("There's no texture called bloxdTextureIdLava. Did you mean bloxdTextureIdLava0?") 196개 프레임 스펠링(`lava0`…`lava7`)이 개별 상수로 풀립니다. 여기에 문서화된 것은 의도된 API(슬롯 키 데이터를 넣었을 때 폴딩 코드 자신이 계산하는 값)입니다. 상세와 바이트 수준 증거: [엔진 내부: 텍스처 레지스트리](../internals/texture-registry.md#the-v98qt8-folding-regression).

## 읽는 법

**이름** 열이 레지스트리명 — 실제로 코드에 쓰는 핸들이다. 상수 철자는 파일명의 CamelCase 다: `grass_top` → `bloxdTextureIdGrassTop`, `lava` → `bloxdTextureIdLava`. **대소문자와 언더스코어는 구별되지 않는다** (`bloxdTextureId_grass_top` 은 `bloxdTextureIdGrassTop` 과 똑같이 해석된다). 이름이 API 다 — 로더가 로드 시 라이브 레지스트리에 대해 다시 해석하므로, 이름은 레지스트리 드리프트를 견딘다 ([텍스처 API](texture-api.md)).

**id** 열은 상수가 비교되는 값 — `v98qt8` 에서 실측 (아틀라스 레이어 + 1). `surface.textureId` 덤프를 해독하고, 그날의 빌드에 대해 디버그 출력을 교차 확인하는 데 쓴다. **WGSL 에 id 를 절대 쓰지 마라** — id 는 한 빌드의 아틀라스 순서 스냅샷이다 (아래 드리프트 실측 참조).

**비고** 열은 두 접기 계열을 표시한다. 「애니메이션(4프레임)」은 이 이름을 샘플하면 현재 애니메이션 프레임이 자동으로 반환된다는 뜻이다 — **프레임 접미사를 절대 쓰지 마라** (`lava0` 은 전용 진단이 붙은 알려진 별명이다). 「회전 계열(4사본)」은 그 텍스처가 미리 회전된 슬롯으로만 존재한다는 뜻이다 — 이름은 루트를 가리키고 `bloxdTexel` 이 회전을 다시 적용한다. 정확히 한 이름 (`radar_screen`) 만이 두 비고를 모두 가진다.

일부러 싣지 **않은** 것: 나머지 레지스트리 철자 — 프레임 별명 196개와 회전 별명 228개 — 는 사용 가능한 상수가 아니다. 쓰면 전용 엔진 오류 메시지가 나온다. 기반이 되는 1,227행 레이어 표 (미리 회전된 슬롯 171개 포함) 는 엔진 내부물로 [엔진 내부와 연구: 텍스처 레지스트리](../internals/texture-registry.md) 에서 다룬다.

### 수치의 관계

이 숫자들은 서로 다른 집합을 세므로, 단순 합산되지 않는다:

| 개수 | 세는 것 |
|---|---|
| **906** | 사용 가능한 이름 상수 — `bloxdTextureId*` 로 쓸 수 있는 텍스처 이름 |
| **424** | 별명 (프레임 196 + 회전 228) — 인식은 되지만 기본명 안내와 함께 *거부*되는 철자. 상수가 아니라 이름이며, id 를 추가하지 않는다 |
| **1,227** | 아틀라스 엔트리 — 텍스처 아틀라스의 실제 슬롯 (id 1–1227) |

906 이름은 각각 하나의 고유한 아틀라스 엔트리에 대응한다. 나머지 **321 엔트리**는 사용 가능한 이름 없는 추가 애니메이션 프레임 (150) 과 미리 회전된 사본 (171) 이다 — 팩은 그것을 직접 참조하지 않는다. `bloxdTexel` 이 프레임 애니메이션과 회전을 자동으로 처리하기 때문이다. 각 애니메이션 계열의 첫 프레임과 각 회전 계열의 루트는 이름을 *가진다*. 그래서 어떤 엔트리는 「이름 있음」과 「프레임/회전 기반」 양쪽으로 세진다. 비교: v4 는 905개 사용 가능 이름, v5 출시 빌드는 896, 다음날 빌드는 906, `bny9u` 는 911, 이 빌드는 906 이다 — v5 출시 때 제거된 10 이름 (더블 체스트 ×8, 몹 스포너 옆면 ×2) 이 `xkg8x` 에서 돌아왔고 (기존 +1 `scorpion_eggs` 에 더해), `bny9u` 가 트레이딩 터미널 (×3) 과 스톤 제너레이터 (×2) 를 더했으며, `v98qt8` 은 모델로 전환된 6개 블록 텍스처를 `hay_block_top` 과 맞바꿨다 — `xkg8x` 의 생존 이름 906개 중 864개가 `bny9u` 에서, 다시 905개 중 716개가 `v98qt8` 에서 id 를 바꿨다.

## 카탈로그

사용 가능한 모든 이름, 알파벳순. id 열은 `bloxdTextureId*` 값 — `v98qt8` (2026-11-08) 에서 실측. **id 는 스냅샷, 이름을 API 로 다뤄라**: v4 빌드 (cnty9) 와 v5 출시 빌드 (ab90qa) 사이에서 생존 이름 334개가, ab90qa 와 xkg8x 사이에서 376개가, xkg8x 와 이 빌드 사이에서는 다시 864개가 id 를 바꿨다 (아래 드리프트 실측 참조).

| 이름 | id (v98qt8) | 비고 |
|---|---|---|
| `alloy_kiln_back` | 1093 |  |
| `alloy_kiln_front` | 1087 |  |
| `alloy_kiln_side` | 1088 |  |
| `alloy_kiln_side_running` | 33 | 애니메이션(4프레임) |
| `alloy_kiln_top` | 1089 | 회전 계열(4사본) |
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
| `auto_bench_side_running` | 35 | 애니메이션(4프레임) |
| `auto_bench_top` | 1104 | 회전 계열(4사본) |
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
| `belt_tunnel_exit_top` | 1202 | 회전 계열(4사본) |
| `belt_tunnel_mouth` | 1195 |  |
| `belt_tunnel_side` | 1196 |  |
| `belt_tunnel_top` | 1197 | 회전 계열(4사본) |
| `black_concrete` | 281 |  |
| `black_glazed_terracotta` | 430 | 회전 계열(4사본) |
| `black_planks` | 369 |  |
| `black_portal` | 2 | 애니메이션(4프레임) |
| `black_spawn_block_side` | 761 |  |
| `black_spawn_block_top` | 757 | 회전 계열(4사본) |
| `block_destroyer_tnt_side` | 1019 |  |
| `block_destroyer_tnt_top` | 1020 |  |
| `blue_concrete` | 282 |  |
| `blue_gen_spawn_coal` | 775 |  |
| `blue_gen_spawn_iron` | 776 |  |
| `blue_gen_spawn_top` | 774 |  |
| `blue_glazed_terracotta` | 414 | 회전 계열(4사본) |
| `blue_lucky_block` | 996 |  |
| `blue_lucky_block_rare` | 998 |  |
| `blue_lucky_block_super` | 1000 |  |
| `blue_planks` | 365 |  |
| `blue_portal` | 3 | 애니메이션(4프레임) |
| `blue_spawn_block_side` | 756 |  |
| `blue_spawn_block_top` | 752 | 회전 계열(4사본) |
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
| `brown_glazed_terracotta` | 418 | 회전 계열(4사본) |
| `brown_mushroom_block` | 537 |  |
| `brown_planks` | 366 |  |
| `brown_portal` | 4 | 애니메이션(4프레임) |
| `brown_spawn_block_side` | 751 |  |
| `brown_spawn_block_top` | 747 | 회전 계열(4사본) |
| `building_lucky_block` | 991 |  |
| `building_lucky_block_rare` | 993 |  |
| `building_lucky_block_super` | 995 |  |
| `burner_drill_back` | 1050 |  |
| `burner_drill_bottom` | 1049 |  |
| `burner_drill_front` | 1043 |  |
| `burner_drill_side` | 1044 |  |
| `burner_drill_side_running` | 27 | 애니메이션(4프레임) |
| `burner_drill_top` | 1045 | 회전 계열(4사본) |
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
| `checkpoint_block` | 762 | 회전 계열(4사본) |
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
| `chest_top` | 346 | 회전 계열(4사본) |
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
| `crop_harvester_back_running` | 45 | 애니메이션(4프레임) |
| `crop_harvester_front` | 1188 |  |
| `crop_harvester_side` | 1189 |  |
| `crop_harvester_side_running` | 44 | 애니메이션(4프레임) |
| `crop_harvester_top` | 1190 | 회전 계열(4사본) |
| `crusher_back` | 1057 |  |
| `crusher_front` | 1051 |  |
| `crusher_side` | 1052 |  |
| `crusher_side_running` | 28 | 애니메이션(4프레임) |
| `crusher_top` | 1053 | 회전 계열(4사본) |
| `crystal_block` | 1031 |  |
| `crystal_vat_back` | 1168 |  |
| `crystal_vat_front` | 1162 |  |
| `crystal_vat_side` | 1163 |  |
| `crystal_vat_side_running` | 42 | 애니메이션(4프레임) |
| `crystal_vat_top` | 1164 | 회전 계열(4사본) |
| `custom_lobby_block_side` | 770 |  |
| `custom_lobby_block_top` | 766 | 회전 계열(4사본) |
| `cut_red_sandstone` | 458 |  |
| `cut_sandstone` | 454 |  |
| `cyan_concrete` | 284 |  |
| `cyan_gen_spawn_coal` | 784 |  |
| `cyan_gen_spawn_iron` | 785 |  |
| `cyan_gen_spawn_top` | 783 |  |
| `cyan_glazed_terracotta` | 406 | 회전 계열(4사본) |
| `cyan_planks` | 363 |  |
| `cyan_portal` | 5 | 애니메이션(4프레임) |
| `cyan_spawn_block_side` | 746 |  |
| `cyan_spawn_block_top` | 742 | 회전 계열(4사본) |
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
| `deep_drill_side_running` | 39 | 애니메이션(4프레임) |
| `deep_drill_top` | 1137 | 회전 계열(4사본) |
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
| `electric_drill_side_running` | 34 | 애니메이션(4프레임) |
| `electric_drill_top` | 1096 | 회전 계열(4사본) |
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
| `generator_side_running` | 30 | 애니메이션(4프레임) |
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
| `gray_glazed_terracotta` | 398 | 회전 계열(4사본) |
| `gray_planks` | 361 |  |
| `gray_portal` | 6 | 애니메이션(4프레임) |
| `gray_spawn_block_side` | 741 |  |
| `gray_spawn_block_top` | 737 | 회전 계열(4사본) |
| `green_bricks` | 460 |  |
| `green_concrete` | 293 |  |
| `green_glazed_terracotta` | 422 | 회전 계열(4사본) |
| `green_lucky_block` | 1008 |  |
| `green_lucky_block_rare` | 1010 |  |
| `green_lucky_block_super` | 1012 |  |
| `green_planks` | 367 |  |
| `green_portal` | 7 | 애니메이션(4프레임) |
| `green_spawn_block_side` | 736 |  |
| `green_spawn_block_top` | 732 | 회전 계열(4사본) |
| `green_stone` | 459 |  |
| `grenade_block` | 582 |  |
| `grey_portal` | 8 | 애니메이션(4프레임) |
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
| `homestead_core_mid` | 26 | 애니메이션(4프레임) |
| `hyper_compressed_messy_stone` | 534 |  |
| `ice` | 334 |  |
| `ice_brick` | 469 |  |
| `iceball_block` | 541 |  |
| `invisible_solid` | 322 |  |
| `iron_block` | 242 |  |
| `iron_chest_back` | 918 |  |
| `iron_chest_front` | 912 |  |
| `iron_chest_side` | 913 |  |
| `iron_chest_top` | 914 | 회전 계열(4사본) |
| `iron_deposit` | 1035 |  |
| `iron_ore` | 236 |  |
| `iron_watermelon_side` | 547 |  |
| `iron_watermelon_top` | 548 |  |
| `jungle_grass_block` | 890 |  |
| `jungle_grass_block_side` | 889 |  |
| `lapis_block` | 244 |  |
| `lapis_ore` | 238 |  |
| `lava` | 1 | 애니메이션(8프레임) |
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
| `light_blue_glazed_terracotta` | 382 | 회전 계열(4사본) |
| `light_blue_lucky_block` | 934 |  |
| `light_blue_planks` | 357 |  |
| `light_blue_spawn_block_side` | 731 |  |
| `light_blue_spawn_block_top` | 727 | 회전 계열(4사본) |
| `light_gray_concrete` | 280 |  |
| `light_gray_glazed_terracotta` | 402 | 회전 계열(4사본) |
| `light_gray_planks` | 362 |  |
| `light_gray_spawn_block_side` | 726 |  |
| `light_gray_spawn_block_top` | 722 | 회전 계열(4사본) |
| `lightblue_portal` | 9 | 애니메이션(4프레임) |
| `lightgray_portal` | 10 | 애니메이션(4프레임) |
| `lime_concrete` | 286 |  |
| `lime_gen_spawn_coal` | 778 |  |
| `lime_gen_spawn_iron` | 779 |  |
| `lime_gen_spawn_top` | 777 |  |
| `lime_glazed_terracotta` | 390 | 회전 계열(4사본) |
| `lime_planks` | 359 |  |
| `lime_portal` | 11 | 애니메이션(4프레임) |
| `lime_spawn_block_side` | 721 |  |
| `lime_spawn_block_top` | 717 | 회전 계열(4사본) |
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
| `magenta_glazed_terracotta` | 378 | 회전 계열(4사본) |
| `magenta_planks` | 356 |  |
| `magenta_portal` | 12 | 애니메이션(4프레임) |
| `magenta_spawn_block_side` | 716 |  |
| `magenta_spawn_block_top` | 712 | 회전 계열(4사본) |
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
| `moonstone_chest_top` | 446 | 회전 계열(4사본) |
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
| `orange_glazed_terracotta` | 374 | 회전 계열(4사본) |
| `orange_lucky_block` | 1002 |  |
| `orange_lucky_block_rare` | 1004 |  |
| `orange_lucky_block_super` | 1006 |  |
| `orange_planks` | 355 |  |
| `orange_portal` | 13 | 애니메이션(4프레임) |
| `orange_spawn_block_side` | 711 |  |
| `orange_spawn_block_top` | 707 | 회전 계열(4사본) |
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
| `pink_glazed_terracotta` | 394 | 회전 계열(4사본) |
| `pink_planks` | 360 |  |
| `pink_portal` | 14 | 애니메이션(4프레임) |
| `pink_spawn_block_side` | 706 |  |
| `pink_spawn_block_top` | 702 | 회전 계열(4사본) |
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
| `press_side_running` | 31 | 애니메이션(4프레임) |
| `press_top` | 1069 | 회전 계열(4사본) |
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
| `purple_glazed_terracotta` | 410 | 회전 계열(4사본) |
| `purple_lucky_block` | 990 |  |
| `purple_lucky_block_rare` | 992 |  |
| `purple_lucky_block_super` | 994 |  |
| `purple_planks` | 364 |  |
| `purple_portal` | 15 | 애니메이션(4프레임) |
| `purple_spawn_block_side` | 701 |  |
| `purple_spawn_block_top` | 697 | 회전 계열(4사본) |
| `quartz_block_chiseled` | 328 |  |
| `quartz_block_side` | 327 |  |
| `radar_bottom` | 930 |  |
| `radar_screen` | 19 | 애니메이션(16프레임) 회전 계열(4사본) |
| `radar_side_active` | 928 |  |
| `radar_side_inactive` | 931 |  |
| `radar_top_active` | 929 |  |
| `radar_top_inactive` | 932 |  |
| `recycler_back` | 1183 |  |
| `recycler_front` | 1177 |  |
| `recycler_side` | 1178 |  |
| `recycler_side_running` | 43 | 애니메이션(4프레임) |
| `recycler_top` | 1179 | 회전 계열(4사본) |
| `red_concrete` | 291 |  |
| `red_gen_spawn_coal` | 772 |  |
| `red_gen_spawn_iron` | 773 |  |
| `red_gen_spawn_top` | 771 |  |
| `red_glazed_terracotta` | 426 | 회전 계열(4사본) |
| `red_lucky_block` | 935 |  |
| `red_lucky_block_rare` | 986 |  |
| `red_lucky_block_super` | 988 |  |
| `red_mushroom_block` | 538 |  |
| `red_planks` | 368 |  |
| `red_portal` | 16 | 애니메이션(4프레임) |
| `red_sand` | 475 |  |
| `red_sandstone` | 455 |  |
| `red_sandstone_brick` | 476 |  |
| `red_sandstone_top` | 456 |  |
| `red_spawn_block_side` | 696 |  |
| `red_spawn_block_top` | 692 | 회전 계열(4사본) |
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
| `shatter_mill_side_running` | 40 | 애니메이션(4프레임) |
| `shatter_mill_top` | 1145 | 회전 계열(4사본) |
| `shop_trader_spawn_face` | 800 |  |
| `shop_trader_spawn_side` | 799 |  |
| `shop_trader_spawn_top` | 795 | 회전 계열(4사본) |
| `shop_wizard_spawn_face` | 806 |  |
| `shop_wizard_spawn_side` | 805 |  |
| `shop_wizard_spawn_top` | 801 | 회전 계열(4사본) |
| `sky_tap_back` | 1157 |  |
| `sky_tap_bottom` | 1156 |  |
| `sky_tap_front` | 1150 |  |
| `sky_tap_side` | 1151 |  |
| `sky_tap_side_running` | 41 | 애니메이션(4프레임) |
| `sky_tap_top` | 1152 | 회전 계열(4사본) |
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
| `smelter_side_running` | 29 | 애니메이션(4프레임) |
| `smelter_top` | 1060 | 회전 계열(4사본) |
| `smoke` | 23 | 애니메이션(4프레임) |
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
| `toxic_waste` | 25 | 애니메이션(8프레임) |
| `toxic_waste_barrel_bottom` | 1022 |  |
| `toxic_waste_barrel_side` | 1021 |  |
| `toxic_waste_barrel_top` | 24 | 애니메이션(4프레임) |
| `toxin_ball_block` | 681 |  |
| `trading_terminal_front` | 46 | 애니메이션(8프레임) |
| `trading_terminal_side` | 1223 |  |
| `trading_terminal_top` | 1224 |  |
| `tree_cutter_back` | 1131 |  |
| `tree_cutter_back_running` | 37 | 애니메이션(4프레임) |
| `tree_cutter_front` | 1125 |  |
| `tree_cutter_side` | 1126 |  |
| `tree_cutter_side_running` | 36 | 애니메이션(4프레임) |
| `tree_cutter_top` | 1127 | 회전 계열(4사본) |
| `ultra_compressed_messy_stone` | 535 |  |
| `unloaded` | 197 |  |
| `volt_engine_side` | 1133 |  |
| `volt_engine_side_running` | 38 | 애니메이션(4프레임) |
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
| `white_glazed_terracotta` | 370 | 회전 계열(4사본) |
| `white_planks` | 354 |  |
| `white_portal` | 17 | 애니메이션(4프레임) |
| `white_spawn_block_side` | 691 |  |
| `white_spawn_block_top` | 687 | 회전 계열(4사본) |
| `wire_mill_back` | 1080 |  |
| `wire_mill_front` | 1074 |  |
| `wire_mill_side` | 1075 |  |
| `wire_mill_side_running` | 32 | 애니메이션(4프레임) |
| `wire_mill_top` | 1076 | 회전 계열(4사본) |
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
| `yellow_glazed_terracotta` | 386 | 회전 계열(4사본) |
| `yellow_lucky_block` | 933 |  |
| `yellow_lucky_block_rare` | 984 |  |
| `yellow_lucky_block_super` | 985 |  |
| `yellow_planks` | 358 |  |
| `yellow_portal` | 18 | 애니메이션(4프레임) |
| `yellow_spawn_block_side` | 686 |  |
| `yellow_spawn_block_top` | 682 | 회전 계열(4사본) |

### 회전 계열 (57 루트)

이 텍스처들은 미리 회전된 사본 (`name[rot[1..4`) 으로만 존재한다. 레지스트리는 아래 루트로 접고, `bloxdTexel` 이 샘플 시점에 회전을 다시 적용한다 — 사본이 아니라 루트를 참조하라. `[rot[N` 철자를 쓰면 전용 회전 진단이 나온다.
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

## 실측 드리프트 (bny9u → v98qt8)

레지스트리는 주말을 지나 또 움직였습니다 — `bny9u` (2026-11-05) → `v98qt8` (2026-11-08, 프로덕션과 preprod가 동일한 바이트-동일 번들을 제공, md5 `7458fd47ff88331d9f451d1456ff48ac`):

- 아틀라스 항목: 1,232 → 1,227
- 회전 계열 (회전 스펠링): 57 (228) → 57 (228) — 불변
- 애니메이션 계열 (프레임 스펠링): 43 (196) → 43 (196) — 불변
- 사용 가능한 명명 상수: 911 → **906**
- 생존명의 id 변화: **905명 중 716명** (79%)

전체 드리프트 (7 이름 — 블록 3종이 모델화):

- **추가 (1):** `hay_block_top` — 건초 블록 계열에 전용 상면 텍스처가 생겼습니다.
- **제거 (6):** `artisan_table_side`, `artisan_table_top`, `crafting_table_side`, `furnace_front`, `furnace_side`, `furnace_top` — Furnace, Workbench(제작대), Artisan Bench가 텍스처 입힌 지형 블록에서 블록 모델로 전환되면서 지형 텍스처가 레지스트리를 떠났습니다 (Workbench 는 `crafting_table_top` 를 유지 — 윗면은 여전히 지형 텍스처).

늘 그렇듯 같은 원리입니다: 이 한 걸음만에 생존 905명 중 716명이 id를 바꿨습니다 — `bloxdTextureIdStone`으로 쓰고 날것 숫자는 쓰지 마세요.

## 관련 문서

- [텍스처 API](texture-api.md) · [엔진 내부와 연구: 텍스처 레지스트리](../internals/texture-registry.md) · [버전 히스토리: v4](../history/v4.md)
