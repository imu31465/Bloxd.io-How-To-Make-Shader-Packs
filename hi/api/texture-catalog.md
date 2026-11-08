# टेक्सचर कैटलॉग

> लक्ष्य API: 5 · लक्ष्य बिल्ड: `v98qt8` (प्रोडक्शन में सत्यापित 2026-11-08) · स्थिति: Verified (इंजन के अपने रजिस्ट्री बिल्डर को दोबारा चलाकर निकाला गया)

प्रयोग-योग्य टेक्सचर-नाम स्थिरांकों (`bloxdTextureId*`) का पूरा कैटलॉग। **906 नाम**, वर्णनिक्रम में।

**लाइव-बिल्ड टिप्पणी (v98qt8, 2026-11-08):** इस बिल्ड में टेक्सचर-स्थिरांक प्रतिगमन है — इंजन की एनीमेटेड-टेक्सचर तालिका स्पेलिंग से इंडेक्स है जबकि फ़ोल्डिंग कोड स्लॉट-इंडेक्स चाहता है, इसलिए नीचे के 43 एनीमेशन-परिवार आधार नाम (`lava`, सभी `*_portal`, `smoke`, `radar_screen`, `trading_terminal_front`, …) फिलहाल **सत्यापन में विफल** होते हैं ("There's no texture called bloxdTextureIdLava. Did you mean bloxdTextureIdLava0?") जबकि 196 फ़्रेम स्पेलिंग (`lava0`…`lava7`) अलग-अलग स्थिरांकों के रूप में रिज़ॉल्व हो जाती हैं। यहाँ दस्तावेज़ित API अभिप्रेत है (स्लॉट-इंडेक्स डेटा देने पर फ़ोल्डिंग कोड जो स्वयं गणना करता है)। विवरण और बाइट-स्तरीय साक्ष्य: [इंजन इंटरनल्स: टेक्सचर रजिस्ट्री](../internals/texture-registry.md#the-v98qt8-folding-regression)।

## कैसे पढ़ें

**नाम** कॉलम रजिस्ट्री का नाम है — वह हैंडल जो आप वास्तव में लिखते हैं। स्थिरांक की स्पेलिंग फ़ाइल नाम का CamelCase रूप है: `grass_top` → `bloxdTextureIdGrassTop`, `lava` → `bloxdTextureIdLava`। **केस और अंडरस्कोर का भेद नहीं किया जाता** (`bloxdTextureId_grass_top` वैसे ही रिज़ॉल्व होता है जैसे `bloxdTextureIdGrassTop`)। नाम ही API हैं — लोडर लोड के समय इन्हें लाइव रजिस्ट्री के मुकाबले दोबारा रिज़ॉल्व करता है, इसलिए नाम रजिस्ट्री के ड्रिफ़्ट से बच निकलते हैं ([टेक्सचर API](texture-api.md))।

**id** कॉलम वह मान है जिससे स्थिरांक की तुलना होती है — `v98qt8` पर मापा गया (एटलस लेयर + 1)। इसे `surface.textureId` डंप्स को डिकोड करने और डिबग आउटपुट को उस दिन के बिल्ड से मिलाने के लिए उपयोग करें। **WGSL में कभी id न लिखें** — वे एक बिल्ड के एटलस क्रम का स्नैपशॉट हैं (नीचे ड्रिफ़्ट माप देखें)।

**टिप्पणियाँ** कॉलम दो फ़ोल्डिंग परिवारों को चिह्नित करता है। "anim (N फ़्रेम)" का अर्थ है कि इस नाम को सैंपल करने पर मौजूदा एनीमेशन फ़्रेम अपने आप लौट आता है — **फ़्रेम सफ़िक्स कभी न लिखें** (`lava0` एक ज्ञात उपनाम है जिसके लिए समर्पित डायग्नोस्टिक मिलता है)। "रोटेशन परिवार (4 प्रतियाँ)" का अर्थ है कि टेक्सचर केवल पहले से घुमाई हुई स्लॉटों के रूप में मौजूद है — नाम मूल की ओर इशारा करता है और `bloxdTexel` रोटेशन दोबारा लगाता है। ठीक एक नाम (`radar_screen`) दोनों टिप्पणियाँ ले चलता है।

जान-बूझकर **नहीं** सूचीबद्ध: रजिस्ट्री की बाकी स्पेलिंग — 196 फ़्रेम उपनाम और 228 रोटेशन उपनाम — जो प्रयोग-योग्य स्थिरांक नहीं हैं; इन्हें लिखने पर समर्पित इंजन त्रुटि संदेश मिलते हैं। इसके नीचे पड़ी 1,227-पंक्तियों की लेयर टेबल (171 पहले-घुमाई स्लॉट सहित) इंजन-आंतरिक है और [इंजन इंटरनल्स: टेक्सचर रजिस्ट्री](../internals/texture-registry.md) में कवर की गई है।

### ये संख्याएँ आपस में कैसे जुड़ती हैं

ये संख्याएँ अलग-अलग समुच्चयों को नाम देती हैं, इसलिए इनका सीधा-सादा योग नहीं बैठता:

| संख्या | यह क्या गिनती है |
|---|---|
| **906** | प्रयोग-योग्य नामित स्थिरांक — टेक्सचर नाम जिन्हें आप `bloxdTextureId*` के रूप में लिख सकते हैं |
| **424** | उपनाम नाम (196 फ़्रेम + 228 रोटेशन) — पहचानी जाने वाली स्पेलिंग जो *अस्वीकृत* होकर मूल नाम की ओर राह दिखाती हैं; वे नाम हैं, स्थिरांक नहीं, और कोई id नहीं जोड़तीं |
| **1,227** | एटलस प्रविष्टियाँ — टेक्सचर एटलस के असली स्लॉट (ids 1–1227) |

906 में से हर नाम एक अलग एटलस प्रविष्टि पर मैप होता है। बची हुई **321 प्रविष्टियाँ** बिना प्रयोग-योग्य नाम वाले अतिरिक्त एनीमेशन फ़्रेम (150) और पहले-घुमाई प्रतियाँ (171) हैं — पैक कभी उन्हें सीधे संदर्भित नहीं करते, क्योंकि `bloxdTexel` फ़्रेम चलाता है और रोटेशन अपने आप लगाता है। हर एनीमेशन परिवार का पहला फ़्रेम और हर रोटेशन परिवार का मूल *नाम रखते हैं*, इसीलिए कुछ प्रविष्टियाँ "नामित" और "फ़्रेम/रोटेशन आधार" दोनों गिनती में आती हैं। तुलना के लिए: v4 में 905 प्रयोग-योग्य नाम थे, v5 लॉन्च बिल्ड में 896, अगले दिन के बिल्ड में 906, `bny9u` में 911; इस बिल्ड में 906 हैं — v5 लॉन्च पर हटाए गए 10 नाम `xkg8x` पर लौटे (पहले के +1 `scorpion_eggs` के साथ), `bny9u` ने ट्रेडिंग टर्मिनल (×3) और स्टोन जेनरेटर (×2) जोड़े, और `v98qt8` ने मॉडल-रूपांतरित ब्लॉकों की छह बनावटों के बदले `hay_block_top` जोड़ा — `xkg8x` के 906 जीवित नामों में से 864 का id `bny9u` पर और 905 में से 716 का `v98qt8` पर बदला।

## कैटलॉग

सभी प्रयोग-योग्य नाम, वर्णनिक्रम में। id कॉलम `bloxdTextureId*` का मान है — `v98qt8` (2026-11-08) पर मापा गया। **Id स्नैपशॉट हैं; नामों को ही API मानें**: v4 बिल्ड (cnty9) और v5 लॉन्च बिल्ड (ab90qa) के बीच 334 जीवित नामों का id बदला, ab90qa से `v98qt8` के बीच 376 बदले, और `v98qt8` से इस बिल्ड के बीच 864 बदले (नीचे ड्रिफ़्ट माप देखें)।

| नाम | id (v98qt8) | टिप्पणियाँ |
|---|---|---|
| `alloy_kiln_back` | 1093 |  |
| `alloy_kiln_front` | 1087 |  |
| `alloy_kiln_side` | 1088 |  |
| `alloy_kiln_side_running` | 33 | anim (4 फ़्रेम) |
| `alloy_kiln_top` | 1089 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `auto_bench_side_running` | 35 | anim (4 फ़्रेम) |
| `auto_bench_top` | 1104 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `belt_tunnel_exit_top` | 1202 | रोटेशन परिवार (4 प्रतियाँ) |
| `belt_tunnel_mouth` | 1195 |  |
| `belt_tunnel_side` | 1196 |  |
| `belt_tunnel_top` | 1197 | रोटेशन परिवार (4 प्रतियाँ) |
| `black_concrete` | 281 |  |
| `black_glazed_terracotta` | 430 | रोटेशन परिवार (4 प्रतियाँ) |
| `black_planks` | 369 |  |
| `black_portal` | 2 | anim (4 फ़्रेम) |
| `black_spawn_block_side` | 761 |  |
| `black_spawn_block_top` | 757 | रोटेशन परिवार (4 प्रतियाँ) |
| `block_destroyer_tnt_side` | 1019 |  |
| `block_destroyer_tnt_top` | 1020 |  |
| `blue_concrete` | 282 |  |
| `blue_gen_spawn_coal` | 775 |  |
| `blue_gen_spawn_iron` | 776 |  |
| `blue_gen_spawn_top` | 774 |  |
| `blue_glazed_terracotta` | 414 | रोटेशन परिवार (4 प्रतियाँ) |
| `blue_lucky_block` | 996 |  |
| `blue_lucky_block_rare` | 998 |  |
| `blue_lucky_block_super` | 1000 |  |
| `blue_planks` | 365 |  |
| `blue_portal` | 3 | anim (4 फ़्रेम) |
| `blue_spawn_block_side` | 756 |  |
| `blue_spawn_block_top` | 752 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `brown_glazed_terracotta` | 418 | रोटेशन परिवार (4 प्रतियाँ) |
| `brown_mushroom_block` | 537 |  |
| `brown_planks` | 366 |  |
| `brown_portal` | 4 | anim (4 फ़्रेम) |
| `brown_spawn_block_side` | 751 |  |
| `brown_spawn_block_top` | 747 | रोटेशन परिवार (4 प्रतियाँ) |
| `building_lucky_block` | 991 |  |
| `building_lucky_block_rare` | 993 |  |
| `building_lucky_block_super` | 995 |  |
| `burner_drill_back` | 1050 |  |
| `burner_drill_bottom` | 1049 |  |
| `burner_drill_front` | 1043 |  |
| `burner_drill_side` | 1044 |  |
| `burner_drill_side_running` | 27 | anim (4 फ़्रेम) |
| `burner_drill_top` | 1045 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `checkpoint_block` | 762 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `chest_top` | 346 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `crop_harvester_back_running` | 45 | anim (4 फ़्रेम) |
| `crop_harvester_front` | 1188 |  |
| `crop_harvester_side` | 1189 |  |
| `crop_harvester_side_running` | 44 | anim (4 फ़्रेम) |
| `crop_harvester_top` | 1190 | रोटेशन परिवार (4 प्रतियाँ) |
| `crusher_back` | 1057 |  |
| `crusher_front` | 1051 |  |
| `crusher_side` | 1052 |  |
| `crusher_side_running` | 28 | anim (4 फ़्रेम) |
| `crusher_top` | 1053 | रोटेशन परिवार (4 प्रतियाँ) |
| `crystal_block` | 1031 |  |
| `crystal_vat_back` | 1168 |  |
| `crystal_vat_front` | 1162 |  |
| `crystal_vat_side` | 1163 |  |
| `crystal_vat_side_running` | 42 | anim (4 फ़्रेम) |
| `crystal_vat_top` | 1164 | रोटेशन परिवार (4 प्रतियाँ) |
| `custom_lobby_block_side` | 770 |  |
| `custom_lobby_block_top` | 766 | रोटेशन परिवार (4 प्रतियाँ) |
| `cut_red_sandstone` | 458 |  |
| `cut_sandstone` | 454 |  |
| `cyan_concrete` | 284 |  |
| `cyan_gen_spawn_coal` | 784 |  |
| `cyan_gen_spawn_iron` | 785 |  |
| `cyan_gen_spawn_top` | 783 |  |
| `cyan_glazed_terracotta` | 406 | रोटेशन परिवार (4 प्रतियाँ) |
| `cyan_planks` | 363 |  |
| `cyan_portal` | 5 | anim (4 फ़्रेम) |
| `cyan_spawn_block_side` | 746 |  |
| `cyan_spawn_block_top` | 742 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `deep_drill_side_running` | 39 | anim (4 फ़्रेम) |
| `deep_drill_top` | 1137 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `electric_drill_side_running` | 34 | anim (4 फ़्रेम) |
| `electric_drill_top` | 1096 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `generator_side_running` | 30 | anim (4 फ़्रेम) |
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
| `gray_glazed_terracotta` | 398 | रोटेशन परिवार (4 प्रतियाँ) |
| `gray_planks` | 361 |  |
| `gray_portal` | 6 | anim (4 फ़्रेम) |
| `gray_spawn_block_side` | 741 |  |
| `gray_spawn_block_top` | 737 | रोटेशन परिवार (4 प्रतियाँ) |
| `green_bricks` | 460 |  |
| `green_concrete` | 293 |  |
| `green_glazed_terracotta` | 422 | रोटेशन परिवार (4 प्रतियाँ) |
| `green_lucky_block` | 1008 |  |
| `green_lucky_block_rare` | 1010 |  |
| `green_lucky_block_super` | 1012 |  |
| `green_planks` | 367 |  |
| `green_portal` | 7 | anim (4 फ़्रेम) |
| `green_spawn_block_side` | 736 |  |
| `green_spawn_block_top` | 732 | रोटेशन परिवार (4 प्रतियाँ) |
| `green_stone` | 459 |  |
| `grenade_block` | 582 |  |
| `grey_portal` | 8 | anim (4 फ़्रेम) |
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
| `homestead_core_mid` | 26 | anim (4 फ़्रेम) |
| `hyper_compressed_messy_stone` | 534 |  |
| `ice` | 334 |  |
| `ice_brick` | 469 |  |
| `iceball_block` | 541 |  |
| `invisible_solid` | 322 |  |
| `iron_block` | 242 |  |
| `iron_chest_back` | 918 |  |
| `iron_chest_front` | 912 |  |
| `iron_chest_side` | 913 |  |
| `iron_chest_top` | 914 | रोटेशन परिवार (4 प्रतियाँ) |
| `iron_deposit` | 1035 |  |
| `iron_ore` | 236 |  |
| `iron_watermelon_side` | 547 |  |
| `iron_watermelon_top` | 548 |  |
| `jungle_grass_block` | 890 |  |
| `jungle_grass_block_side` | 889 |  |
| `lapis_block` | 244 |  |
| `lapis_ore` | 238 |  |
| `lava` | 1 | anim (8 फ़्रेम) |
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
| `light_blue_glazed_terracotta` | 382 | रोटेशन परिवार (4 प्रतियाँ) |
| `light_blue_lucky_block` | 934 |  |
| `light_blue_planks` | 357 |  |
| `light_blue_spawn_block_side` | 731 |  |
| `light_blue_spawn_block_top` | 727 | रोटेशन परिवार (4 प्रतियाँ) |
| `light_gray_concrete` | 280 |  |
| `light_gray_glazed_terracotta` | 402 | रोटेशन परिवार (4 प्रतियाँ) |
| `light_gray_planks` | 362 |  |
| `light_gray_spawn_block_side` | 726 |  |
| `light_gray_spawn_block_top` | 722 | रोटेशन परिवार (4 प्रतियाँ) |
| `lightblue_portal` | 9 | anim (4 फ़्रेम) |
| `lightgray_portal` | 10 | anim (4 फ़्रेम) |
| `lime_concrete` | 286 |  |
| `lime_gen_spawn_coal` | 778 |  |
| `lime_gen_spawn_iron` | 779 |  |
| `lime_gen_spawn_top` | 777 |  |
| `lime_glazed_terracotta` | 390 | रोटेशन परिवार (4 प्रतियाँ) |
| `lime_planks` | 359 |  |
| `lime_portal` | 11 | anim (4 फ़्रेम) |
| `lime_spawn_block_side` | 721 |  |
| `lime_spawn_block_top` | 717 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `magenta_glazed_terracotta` | 378 | रोटेशन परिवार (4 प्रतियाँ) |
| `magenta_planks` | 356 |  |
| `magenta_portal` | 12 | anim (4 फ़्रेम) |
| `magenta_spawn_block_side` | 716 |  |
| `magenta_spawn_block_top` | 712 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `moonstone_chest_top` | 446 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `orange_glazed_terracotta` | 374 | रोटेशन परिवार (4 प्रतियाँ) |
| `orange_lucky_block` | 1002 |  |
| `orange_lucky_block_rare` | 1004 |  |
| `orange_lucky_block_super` | 1006 |  |
| `orange_planks` | 355 |  |
| `orange_portal` | 13 | anim (4 फ़्रेम) |
| `orange_spawn_block_side` | 711 |  |
| `orange_spawn_block_top` | 707 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `pink_glazed_terracotta` | 394 | रोटेशन परिवार (4 प्रतियाँ) |
| `pink_planks` | 360 |  |
| `pink_portal` | 14 | anim (4 फ़्रेम) |
| `pink_spawn_block_side` | 706 |  |
| `pink_spawn_block_top` | 702 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `press_side_running` | 31 | anim (4 फ़्रेम) |
| `press_top` | 1069 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `purple_glazed_terracotta` | 410 | रोटेशन परिवार (4 प्रतियाँ) |
| `purple_lucky_block` | 990 |  |
| `purple_lucky_block_rare` | 992 |  |
| `purple_lucky_block_super` | 994 |  |
| `purple_planks` | 364 |  |
| `purple_portal` | 15 | anim (4 फ़्रेम) |
| `purple_spawn_block_side` | 701 |  |
| `purple_spawn_block_top` | 697 | रोटेशन परिवार (4 प्रतियाँ) |
| `quartz_block_chiseled` | 328 |  |
| `quartz_block_side` | 327 |  |
| `radar_bottom` | 930 |  |
| `radar_screen` | 19 | anim (16 फ़्रेम) रोटेशन परिवार (4 प्रतियाँ) |
| `radar_side_active` | 928 |  |
| `radar_side_inactive` | 931 |  |
| `radar_top_active` | 929 |  |
| `radar_top_inactive` | 932 |  |
| `recycler_back` | 1183 |  |
| `recycler_front` | 1177 |  |
| `recycler_side` | 1178 |  |
| `recycler_side_running` | 43 | anim (4 फ़्रेम) |
| `recycler_top` | 1179 | रोटेशन परिवार (4 प्रतियाँ) |
| `red_concrete` | 291 |  |
| `red_gen_spawn_coal` | 772 |  |
| `red_gen_spawn_iron` | 773 |  |
| `red_gen_spawn_top` | 771 |  |
| `red_glazed_terracotta` | 426 | रोटेशन परिवार (4 प्रतियाँ) |
| `red_lucky_block` | 935 |  |
| `red_lucky_block_rare` | 986 |  |
| `red_lucky_block_super` | 988 |  |
| `red_mushroom_block` | 538 |  |
| `red_planks` | 368 |  |
| `red_portal` | 16 | anim (4 फ़्रेम) |
| `red_sand` | 475 |  |
| `red_sandstone` | 455 |  |
| `red_sandstone_brick` | 476 |  |
| `red_sandstone_top` | 456 |  |
| `red_spawn_block_side` | 696 |  |
| `red_spawn_block_top` | 692 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `shatter_mill_side_running` | 40 | anim (4 फ़्रेम) |
| `shatter_mill_top` | 1145 | रोटेशन परिवार (4 प्रतियाँ) |
| `shop_trader_spawn_face` | 800 |  |
| `shop_trader_spawn_side` | 799 |  |
| `shop_trader_spawn_top` | 795 | रोटेशन परिवार (4 प्रतियाँ) |
| `shop_wizard_spawn_face` | 806 |  |
| `shop_wizard_spawn_side` | 805 |  |
| `shop_wizard_spawn_top` | 801 | रोटेशन परिवार (4 प्रतियाँ) |
| `sky_tap_back` | 1157 |  |
| `sky_tap_bottom` | 1156 |  |
| `sky_tap_front` | 1150 |  |
| `sky_tap_side` | 1151 |  |
| `sky_tap_side_running` | 41 | anim (4 फ़्रेम) |
| `sky_tap_top` | 1152 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `smelter_side_running` | 29 | anim (4 फ़्रेम) |
| `smelter_top` | 1060 | रोटेशन परिवार (4 प्रतियाँ) |
| `smoke` | 23 | anim (4 फ़्रेम) |
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
| `toxic_waste` | 25 | anim (8 फ़्रेम) |
| `toxic_waste_barrel_bottom` | 1022 |  |
| `toxic_waste_barrel_side` | 1021 |  |
| `toxic_waste_barrel_top` | 24 | anim (4 फ़्रेम) |
| `toxin_ball_block` | 681 |  |
| `trading_terminal_front` | 46 | anim (8 फ़्रेम) |
| `trading_terminal_side` | 1223 |  |
| `trading_terminal_top` | 1224 |  |
| `tree_cutter_back` | 1131 |  |
| `tree_cutter_back_running` | 37 | anim (4 फ़्रेम) |
| `tree_cutter_front` | 1125 |  |
| `tree_cutter_side` | 1126 |  |
| `tree_cutter_side_running` | 36 | anim (4 फ़्रेम) |
| `tree_cutter_top` | 1127 | रोटेशन परिवार (4 प्रतियाँ) |
| `ultra_compressed_messy_stone` | 535 |  |
| `unloaded` | 197 |  |
| `volt_engine_side` | 1133 |  |
| `volt_engine_side_running` | 38 | anim (4 फ़्रेम) |
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
| `white_glazed_terracotta` | 370 | रोटेशन परिवार (4 प्रतियाँ) |
| `white_planks` | 354 |  |
| `white_portal` | 17 | anim (4 फ़्रेम) |
| `white_spawn_block_side` | 691 |  |
| `white_spawn_block_top` | 687 | रोटेशन परिवार (4 प्रतियाँ) |
| `wire_mill_back` | 1080 |  |
| `wire_mill_front` | 1074 |  |
| `wire_mill_side` | 1075 |  |
| `wire_mill_side_running` | 32 | anim (4 फ़्रेम) |
| `wire_mill_top` | 1076 | रोटेशन परिवार (4 प्रतियाँ) |
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
| `yellow_glazed_terracotta` | 386 | रोटेशन परिवार (4 प्रतियाँ) |
| `yellow_lucky_block` | 933 |  |
| `yellow_lucky_block_rare` | 984 |  |
| `yellow_lucky_block_super` | 985 |  |
| `yellow_planks` | 358 |  |
| `yellow_portal` | 18 | anim (4 फ़्रेम) |
| `yellow_spawn_block_side` | 686 |  |
| `yellow_spawn_block_top` | 682 | रोटेशन परिवार (4 प्रतियाँ) |

### रोटेशन परिवार (57 मूल)

ये टेक्सचर केवल पहले-घुमाई प्रतियों (`name[rot[1..4`) के रूप में मौजूद हैं। रजिस्ट्री उन्हें नीचे दिए मूल पर फ़ोल्ड करता है, और `bloxdTexel` सैंपल के समय रोटेशन दोबारा लगाता है — मूल को संदर्भित करें, प्रतियों को कभी नहीं। कोई `[rot[N` स्पेलिंग लिखने पर समर्पित रोटेशन डायग्नोस्टिक मिलता है।
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

कच्चे डेटा में दिखने वाली संरचनात्मक टिप्पणी: एटलस में 46 एनीमेशन मूल हैं, 43 नहीं — `radar_screen` की चारों पहले-घुमाई प्रतियाँ अपनी-अपनी 4-फ़्रेम सीढ़ी ले चलती हैं, यही वजह भी है कि `radar_screen` एकमात्र नाम है जो दोनों परिवार-टिप्पणियाँ ले चलता है।
## मापा गया ड्रिफ़्ट (cnty9 → ab90qa)

रजिस्ट्री बिल्ड के साथ भेजा गया कंटेंट है और हर ब्लॉक अपडेट के साथ खिसकता है। v4 बिल्ड (`cnty9`, 2026-10-27) → v5 बिल्ड (`ab90qa`, 2026-11-03):

- एटलस प्रविष्टियाँ: 1,219 → 1,210
- रोटेशन परिवार (टर्न्ड स्पेलिंग): 57 (228) → 57 (228) — **अपरिवर्तित**
- एनीमेशन परिवार (फ़्रेम स्पेलिंग): 42 (188) → 42 (188) — **अपरिवर्तित**
- प्रयोग-योग्य नामित स्थिरांक: 905 → **896**
- बचे नामों में id परिवर्तन: **905 में से 334**

पूरा ड्रिफ़्ट (11 नाम):

- **जोड़े गए (1):** `scorpion_eggs`।
- **हटाए गए (10):** `chest_double_back_hi`, `chest_double_back_lo`, `chest_double_front_hi`, `chest_double_front_lo`, `chest_double_top_1_hi`, `chest_double_top_1_lo`, `chest_double_top_2_hi`, `chest_double_top_2_lo`, `mob_spawner_hostile_block_side`, `mob_spawner_neutral_block_side` — डबल चेस्ट (8 फ़ेस) गेम डेटा से चला गया (सिंगल-चेस्ट `chest_*` परिवार सुरक्षित बचा है), और स्पॉनर `mob_spawner_block_top` रखते हैं जबकि वेरिएंट साइड टेक्सचर चले गए हैं।

**नाम ही API हैं; id स्नैपशॉट हैं।** दोनों बिल्डों के बीच, बचे हुए 905 नामों में से 334 का id बदल गया — `351` नहीं, `bloxdTextureIdStone` लिखें। इंजन सत्यापन के समय नाम रिज़ॉल्व करता है, इसलिए नाम से लिखे गए पैक ड्रिफ़्ट से बच निकलते हैं; कच्चे-id वाले पैक नहीं।

## मापा गया ड्रिफ़्ट (ab90qa → xkg8x)

रजिस्ट्री v5 लॉन्च के अगले ही दिन फिर खिसका — `ab90qa` (2026-11-03) → `xkg8x` (2026-11-04, प्रोडक्शन पर लाइव; preprod `2lcqcl` शेडर-पैक की हर सतह पर समान मापा गया):

- एटलस प्रविष्टियाँ: 1,210 → 1,220
- रोटेशन परिवार (घुमाई गई स्पेलिंग): 57 (228) → 57 (228) — **अपरिवर्तित**
- एनीमेशन परिवार (फ़्रेम स्पेलिंग): 42 (188) → 42 (188) — **अपरिवर्तित**
- प्रयोग-योग्य नामित स्थिरांक: 896 → **906**
- जीवित नामों में id परिवर्तन: **896 में से 376**

पूरी ड्रिफ़्ट (10 नाम — v5 लॉन्च के सभी हटाए गए नाम वापस):

- **जोड़े गए (10):** `chest_double_back_hi`, `chest_double_back_lo`, `chest_double_front_hi`, `chest_double_front_lo`, `chest_double_top_1_hi`, `chest_double_top_1_lo`, `chest_double_top_2_hi`, `chest_double_top_2_lo`, `mob_spawner_hostile_block_side`, `mob_spawner_neutral_block_side` — डबल चेस्ट गेम डेटा में लौट आया और मॉब-स्पॉनर की साइड वैरिएंट भी वापस हैं।
- **हटाए गए:** कोई नहीं।

वही सिद्धांत और भी ज़्यादा लागू होता है: सिर्फ़ इसी कदम में 896 जीवित नामों में से 376 का id बदल गया।

## मापा गया ड्रिफ़्ट (xkg8x → bny9u)

रजिस्ट्री अगले ही दिन फिर खिसकी — `xkg8x` (2026-11-04) → `bny9u` (2026-11-05, प्रोडक्शन और preprod पर एक ही बाइट-समान बंडल के रूप में लाइव):

- एटलस प्रविष्टियाँ: 1,220 → 1,232
- रोटेशन परिवार (घुमाई गई स्पेलिंग): 57 (228) → 57 (228) — **अपरिवर्तित**
- एनीमेशन परिवार (फ़्रेम स्पेलिंग): 42 (188) → **43 (196)** — नया `trading_terminal_front` 8-फ़्रेम / 250 ms की सीढ़ी चलाता है
- प्रयोग-योग्य नामित स्थिरांक: 906 → **911**
- जीवित नामों में id परिवर्तन: **906 में से 864** (95%)

पूरी ड्रिफ़्ट (5 नाम — दो नए ब्लॉक):

- **जोड़े गए (5):** `stone_generator_side`, `stone_generator_top`, `trading_terminal_front` (anim, 8 फ़्रेम), `trading_terminal_side`, `trading_terminal_top` — Trading Terminal और Stone Generator ब्लॉक गेम डेटा में शामिल हो गए।
- **हटाए गए:** कोई नहीं।

यह सिद्धांत हर कदम पर और मज़बूती से लागू होता है: सिर्फ़ इसी कदम में 906 जीवित नामों में से 864 का id बदला — लगभग बीस में से उन्नीस।

## मापा गया ड्रिफ़्ट (bny9u → v98qt8)

रजिस्ट्री सप्ताहांत में फिर एक बार खिसका — `bny9u` (2026-11-05) → `v98qt8` (2026-11-08, प्रोडक्शन और preprod एक ही बाइट-समान बंडल परोसते हैं, md5 `7458fd47ff88331d9f451d1456ff48ac`):

- एटलस प्रविष्टियाँ: 1,232 → 1,227
- रोटेशन परिवार (घुमाई गई स्पेलिंग): 57 (228) → 57 (228) — अपरिवर्तित
- एनीमेशन परिवार (फ़्रेम स्पेलिंग): 43 (196) → 43 (196) — अपरिवर्तित
- प्रयोग-योग्य नामित स्थिरांक: 911 → **906**
- जीवित नामों में id परिवर्तन: **905 में से 716** (79%)

पूरा ड्रिफ़्ट (7 नाम — तीन ब्लॉक मॉडल बन गए):

- **जोड़ा गया (1):** `hay_block_top` — हे-ब्लॉक परिवार को एक अलग ऊपरी बनावट मिली।
- **हटाए गए (6):** `artisan_table_side`, `artisan_table_top`, `crafting_table_side`, `furnace_front`, `furnace_side`, `furnace_top` — Furnace, Workbench (क्राफ़्टिंग टेबल) और Artisan Bench टेरेन-बनावट वाले ब्लॉकों से हटकर ब्लॉक-मॉडल बन गए, इसलिए उनकी टेरेन बनावटें रजिस्ट्री से निकल गईं (Workbench ने `crafting_table_top` बनाए रखा — ऊपरी फलक अब भी टेरेन-बनावट है))

हमेशा जैसा सिद्धांत: इस एक ही कदम में 905 जीवित नामों में से 716 का id बदला — `bloxdTextureIdStone` लिखें, कच्चा नंबर नहीं।

## संबंधित

- [टेक्सचर API](texture-api.md) · [इंजन इंटरनल्स: टेक्सचर रजिस्ट्री](../internals/texture-registry.md) · [वर्शन हिस्ट्री: v4](../history/v4.md)

