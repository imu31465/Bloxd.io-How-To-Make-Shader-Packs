# टेक्सचर कैटलॉग

प्रयोग-योग्य टेक्सचर-नाम स्थिरांकों (`bloxdTextureId*`) का पूरा कैटलॉग। **1,017 नाम**, वर्णनिक्रम में।

**फ़ोल्डिंग स्थिति (`bbb6l5`, 2026-11-20):** `v98qt8` ले आई एनीमेशन-स्थिरांक प्रतिगमन **ठीक हो गया** — एनीमेटेड-टेक्सचर तालिका फिर से स्लॉट-इंडेक्स है, इसलिए नीचे के एनीमेशन-परिवार आधार नाम (`lava`, सभी `*_portal`, `smoke`, `radar_screen`, `trading_terminal_front`, …) अब सामान्य रूप से सत्यापन पास करते हैं; सैंपल करने पर वर्तमान फ़्रेम मिलता है। नीचे लाइव बिल्ड पर पुनर्मापित फ़ोल्डेड (अभिप्रेत) दृश्य है।

## कैसे पढ़ें

**नाम** कॉलम रजिस्ट्री का नाम है — वह हैंडल जो आप वास्तव में लिखते हैं। स्थिरांक की स्पेलिंग फ़ाइल नाम का CamelCase रूप है: `grass_top` → `bloxdTextureIdGrassTop`, `lava` → `bloxdTextureIdLava`। **केस और अंडरस्कोर का भेद नहीं किया जाता** (`bloxdTextureId_grass_top` वैसे ही रिज़ॉल्व होता है जैसे `bloxdTextureIdGrassTop`)। नाम ही API हैं — लोडर लोड के समय इन्हें लाइव रजिस्ट्री के मुकाबले दोबारा रिज़ॉल्व करता है, इसलिए नाम रजिस्ट्री के ड्रिफ़्ट से बच निकलते हैं ([टेक्सचर API](texture-api.md))।

टेक्सचर के संख्यात्मक ID बिल्ड-विशिष्ट आंतरिक मान हैं, इसलिए इन्हें शामिल नहीं किया गया है। पैक में नाम वाले `bloxdTextureId*` constants का उपयोग करें।

**टिप्पणियाँ** कॉलम दो फ़ोल्डिंग परिवारों को चिह्नित करता है। "anim (N फ़्रेम)" का अर्थ है कि इस नाम को सैंपल करने पर मौजूदा एनीमेशन फ़्रेम अपने आप लौट आता है — **फ़्रेम सफ़िक्स कभी न लिखें** (`lava0` एक ज्ञात उपनाम है जिसके लिए समर्पित डायग्नोस्टिक मिलता है)। "रोटेशन परिवार (4 प्रतियाँ)" का अर्थ है कि टेक्सचर केवल पहले से घुमाई हुई स्लॉटों के रूप में मौजूद है — नाम मूल की ओर इशारा करता है और `bloxdTexel` रोटेशन दोबारा लगाता है। ठीक एक नाम (`radar_screen`) दोनों टिप्पणियाँ ले चलता है।

1,650 लेयर वाली एटलस तालिका इंजन का आंतरिक डेटा है। इसकी संरचना और मापन-विधि [इंजन इंटरनल्स: टेक्सचर रजिस्ट्री](../internals/texture-registry.md) में दी गई है।

### ये संख्याएँ आपस में कैसे जुड़ती हैं

ये संख्याएँ अलग-अलग समुच्चयों को नाम देती हैं, इसलिए इनका सीधा-सादा योग नहीं बैठता:

| संख्या | यह क्या गिनती है |
|---|---|
| **1,017** | प्रयोग-योग्य नामित स्थिरांक — टेक्सचर नाम जिन्हें आप `bloxdTextureId*` के रूप में लिख सकते हैं |
| **776** | उपनाम नाम (520 फ़्रेम + 256 रोटेशन) — पहचानी जाने वाली स्पेलिंग जो *अस्वीकृत* होकर मूल नाम की ओर राह दिखाती हैं; वे नाम हैं, स्थिरांक नहीं, और कोई id नहीं जोड़तीं |
| **1,650** | एटलस प्रविष्टियाँ — टेक्सचर एटलस के असली स्लॉट (ids 1–1650) |

`bbb6l5` रजिस्ट्री में 1,017 उपयोग-योग्य नाम हैं, जो `v98qt8` से 111 अधिक हैं। टेक्सचर ID बिल्ड के बीच बदल सकती हैं, इसलिए नामित स्थिरांक उपयोग करें और WGSL में संख्यात्मक ID को सीधे न लिखें।

## कैटलॉग

कैटलॉग में सभी 1,017 उपयोग-योग्य नाम वर्णक्रम में दिए गए हैं। id कॉलम में `bbb6l5` पर मापे गए मान हैं। बिल्ड के बीच ID बदल सकती हैं, इसलिए WGSL में टेक्सचर को नाम से संदर्भित करें।

| नाम | टिप्पणियाँ |
|---|---|
| `alloy_kiln_back` |  |
| `alloy_kiln_front` |  |
| `alloy_kiln_side` |  |
| `alloy_kiln_side_running` | anim (8 frames) |
| `alloy_kiln_top` | rotation family (4 copies) |
| `andesite_brick` |  |
| `apple_block_bottom` |  |
| `apple_block_side` |  |
| `apple_block_top` |  |
| `armour_lucky_block` |  |
| `armour_lucky_block_rare` |  |
| `armour_lucky_block_super` |  |
| `ash` |  |
| `atomic_bench_side` |  |
| `atomic_bench_top` |  |
| `atomic_bomb_side` |  |
| `atomic_bomb_top` |  |
| `atomic_spire` |  |
| `auto_bench_back` |  |
| `auto_bench_front` |  |
| `auto_bench_side` |  |
| `auto_bench_side_running` | anim (8 frames) |
| `auto_bench_top` | rotation family (4 copies) |
| `autocrafter_bottom` |  |
| `autocrafter_lunite_bottom` |  |
| `autocrafter_lunite_side` |  |
| `autocrafter_side` |  |
| `banana_block_side` |  |
| `banana_block_top` |  |
| `battery_casing` |  |
| `battery_cell` |  |
| `battery_cell_bottom` |  |
| `battery_cell_running` | anim (8 frames) |
| `battery_cell_top` |  |
| `battery_controller_front` |  |
| `battery_controller_front_running` | anim (8 frames) |
| `beacon` |  |
| `bedrock` |  |
| `beetroot_block_bottom` |  |
| `beetroot_block_side` |  |
| `beetroot_block_top` |  |
| `belt_drop_side` |  |
| `belt_drop_top` |  |
| `belt_lift_side` |  |
| `belt_lift_top` |  |
| `belt_loader_slab_front` |  |
| `belt_loader_top` |  |
| `belt_tunnel_back` |  |
| `belt_tunnel_exit_top` | rotation family (4 copies) |
| `belt_tunnel_mouth` |  |
| `belt_tunnel_side` |  |
| `belt_tunnel_top` | rotation family (4 copies) |
| `black_concrete` |  |
| `black_glazed_terracotta` | rotation family (4 copies) |
| `black_planks` |  |
| `black_portal` | anim (4 frames) |
| `black_spawn_block_side` |  |
| `black_spawn_block_top` | rotation family (4 copies) |
| `block_destroyer_tnt_side` |  |
| `block_destroyer_tnt_top` |  |
| `blue_concrete` |  |
| `blue_gen_spawn_coal` |  |
| `blue_gen_spawn_iron` |  |
| `blue_gen_spawn_top` |  |
| `blue_glazed_terracotta` | rotation family (4 copies) |
| `blue_lucky_block` |  |
| `blue_lucky_block_rare` |  |
| `blue_lucky_block_super` |  |
| `blue_planks` |  |
| `blue_portal` | anim (4 frames) |
| `blue_spawn_block_side` |  |
| `blue_spawn_block_top` | rotation family (4 copies) |
| `bone_block_side` |  |
| `bone_block_top` |  |
| `bookshelf` |  |
| `bookshelf_1` |  |
| `bookshelf_2` |  |
| `bookshelf_3` |  |
| `bookshelf_4` |  |
| `bookshelf_5` |  |
| `bookshelf_empty` |  |
| `bouncy_bomb_block` |  |
| `bowling_alley_floor` |  |
| `bread_block_back` |  |
| `bread_block_front` |  |
| `bread_block_side` |  |
| `bread_block_top` |  |
| `brick` |  |
| `brown_concrete` |  |
| `brown_glazed_terracotta` | rotation family (4 copies) |
| `brown_mushroom_block` |  |
| `brown_planks` |  |
| `brown_portal` | anim (4 frames) |
| `brown_spawn_block_side` |  |
| `brown_spawn_block_top` | rotation family (4 copies) |
| `building_lucky_block` |  |
| `building_lucky_block_rare` |  |
| `building_lucky_block_super` |  |
| `burner_drill_back` |  |
| `burner_drill_bottom` |  |
| `burner_drill_front` |  |
| `burner_drill_side` |  |
| `burner_drill_side_running` | anim (8 frames) |
| `burner_drill_top` | rotation family (4 copies) |
| `cactus_dry` |  |
| `cactus_top` |  |
| `carrot_block_bottom` |  |
| `carrot_block_side` |  |
| `carrot_block_top` |  |
| `carved_messy_stone` |  |
| `carved_pumpkin` |  |
| `centrifuge_back` |  |
| `centrifuge_back_running` | anim (8 frames) |
| `centrifuge_bottom` |  |
| `centrifuge_side` |  |
| `centrifuge_side_flip` |  |
| `centrifuge_side_flip_running` | anim (8 frames) |
| `centrifuge_side_running` | anim (8 frames) |
| `centrifuge_top` | rotation family (4 copies) |
| `chalk` |  |
| `chalk_black` |  |
| `chalk_blue` |  |
| `chalk_bricks_black` |  |
| `chalk_bricks_blue` |  |
| `chalk_bricks_brown` |  |
| `chalk_bricks_cyan` |  |
| `chalk_bricks_gray` |  |
| `chalk_bricks_green` |  |
| `chalk_bricks_light_blue` |  |
| `chalk_bricks_light_gray` |  |
| `chalk_bricks_lime` |  |
| `chalk_bricks_magenta` |  |
| `chalk_bricks_orange` |  |
| `chalk_bricks_pink` |  |
| `chalk_bricks_purple` |  |
| `chalk_bricks_red` |  |
| `chalk_bricks_slab_side_black` |  |
| `chalk_bricks_slab_side_blue` |  |
| `chalk_bricks_slab_side_brown` |  |
| `chalk_bricks_slab_side_cyan` |  |
| `chalk_bricks_slab_side_gray` |  |
| `chalk_bricks_slab_side_green` |  |
| `chalk_bricks_slab_side_light_blue` |  |
| `chalk_bricks_slab_side_light_gray` |  |
| `chalk_bricks_slab_side_lime` |  |
| `chalk_bricks_slab_side_magenta` |  |
| `chalk_bricks_slab_side_orange` |  |
| `chalk_bricks_slab_side_pink` |  |
| `chalk_bricks_slab_side_purple` |  |
| `chalk_bricks_slab_side_red` |  |
| `chalk_bricks_slab_side_white` |  |
| `chalk_bricks_slab_side_yellow` |  |
| `chalk_bricks_white` |  |
| `chalk_bricks_yellow` |  |
| `chalk_brown` |  |
| `chalk_cyan` |  |
| `chalk_gray` |  |
| `chalk_green` |  |
| `chalk_light_blue` |  |
| `chalk_light_gray` |  |
| `chalk_lime` |  |
| `chalk_magenta` |  |
| `chalk_orange` |  |
| `chalk_pink` |  |
| `chalk_purple` |  |
| `chalk_red` |  |
| `chalk_white` |  |
| `chalk_yellow` |  |
| `charge_vault_side` |  |
| `charge_vault_top` |  |
| `charging_pad_side` |  |
| `charging_pad_top` |  |
| `checkpoint_block` | rotation family (4 copies) |
| `cherry_block_bottom` |  |
| `cherry_block_side` |  |
| `cherry_block_top` |  |
| `chest_back` |  |
| `chest_double_back_hi` |  |
| `chest_double_back_lo` |  |
| `chest_double_front_hi` |  |
| `chest_double_front_lo` |  |
| `chest_double_top_1_hi` |  |
| `chest_double_top_1_lo` |  |
| `chest_double_top_2_hi` |  |
| `chest_double_top_2_lo` |  |
| `chest_front` |  |
| `chest_side` |  |
| `chest_top` | rotation family (4 copies) |
| `chili_pepper_block_bottom` |  |
| `chili_pepper_block_side` |  |
| `chili_pepper_block_top` |  |
| `chiseled_red_sandstone` |  |
| `chiseled_sandstone` |  |
| `clay` |  |
| `coal_block` |  |
| `coal_deposit` |  |
| `coal_ore` |  |
| `coarse_dirt` |  |
| `coconut_block_bottom` |  |
| `coconut_block_side` |  |
| `coconut_block_top` |  |
| `code_block` |  |
| `collider_bottom` |  |
| `collider_side_off` |  |
| `collider_side_running` | anim (32 frames) |
| `collider_top` | rotation family (4 copies) |
| `comet_heart` |  |
| `comet_ore` |  |
| `compressed_messy_stone` |  |
| `condenser_back` |  |
| `condenser_back_running` | anim (8 frames) |
| `condenser_bottom` |  |
| `condenser_side` |  |
| `condenser_side_flip` |  |
| `condenser_side_flip_running` | anim (8 frames) |
| `condenser_side_running` | anim (8 frames) |
| `condenser_top` | rotation family (4 copies) |
| `conveyor_belt_bottom` |  |
| `conveyor_belt_slab_side` |  |
| `conveyor_belt_top` |  |
| `conveyor_belt_turn_left` |  |
| `conveyor_belt_turn_right` |  |
| `coolant_channel` | anim (8 frames) |
| `coolant_mixer_back` |  |
| `coolant_mixer_back_running` | anim (8 frames) |
| `coolant_mixer_bottom` |  |
| `coolant_mixer_side` |  |
| `coolant_mixer_side_flip` |  |
| `coolant_mixer_side_flip_running` | anim (8 frames) |
| `coolant_mixer_side_running` | anim (8 frames) |
| `coolant_mixer_top` | rotation family (4 copies) |
| `copper_block` |  |
| `copper_deposit` |  |
| `copper_ore` |  |
| `corn_block_bottom` |  |
| `corn_block_side` |  |
| `corn_block_top` |  |
| `crafting_table_top` |  |
| `crate` |  |
| `crop_harvester_back` |  |
| `crop_harvester_back_running` | anim (4 frames) |
| `crop_harvester_front` |  |
| `crop_harvester_side` |  |
| `crop_harvester_side_running` | anim (4 frames) |
| `crop_harvester_top` | rotation family (4 copies) |
| `crusher_back` |  |
| `crusher_front` |  |
| `crusher_side` |  |
| `crusher_side_running` | anim (4 frames) |
| `crusher_top` | rotation family (4 copies) |
| `crystal_block` |  |
| `crystal_vat_back` |  |
| `crystal_vat_front` |  |
| `crystal_vat_side` |  |
| `crystal_vat_side_running` | anim (8 frames) |
| `crystal_vat_top` | rotation family (4 copies) |
| `custom_lobby_block_side` |  |
| `custom_lobby_block_top` | rotation family (4 copies) |
| `cut_red_sandstone` |  |
| `cut_sandstone` |  |
| `cyan_concrete` |  |
| `cyan_gen_spawn_coal` |  |
| `cyan_gen_spawn_iron` |  |
| `cyan_gen_spawn_top` |  |
| `cyan_glazed_terracotta` | rotation family (4 copies) |
| `cyan_planks` |  |
| `cyan_portal` | anim (4 frames) |
| `cyan_spawn_block_side` |  |
| `cyan_spawn_block_top` | rotation family (4 copies) |
| `dark_green_bricks` |  |
| `darkstone` |  |
| `darkstone_bricks` |  |
| `darkstone_bricks_cracked` |  |
| `darkstone_bricks_lava` |  |
| `darkstone_engraved` |  |
| `darkstone_smooth` |  |
| `deep_drill_back` |  |
| `deep_drill_bottom` |  |
| `deep_drill_front` |  |
| `deep_drill_side` |  |
| `deep_drill_side_running` | anim (8 frames) |
| `deep_drill_top` | rotation family (4 copies) |
| `dense_silo_side` |  |
| `dense_silo_top` |  |
| `diamond_block` |  |
| `diamond_gen_spawn_side` |  |
| `diamond_gen_spawn_top` |  |
| `diamond_ore` |  |
| `diorite_brick` |  |
| `dirt` |  |
| `drop_location_block_side` |  |
| `drop_location_block_top` |  |
| `drop_pad` |  |
| `dry_grass_block` |  |
| `dry_grass_block_side` |  |
| `electric_drill_back` |  |
| `electric_drill_bottom` |  |
| `electric_drill_front` |  |
| `electric_drill_side` |  |
| `electric_drill_side_running` | anim (8 frames) |
| `electric_drill_top` | rotation family (4 copies) |
| `emerald_block` |  |
| `emerald_ore` |  |
| `end_stone` |  |
| `engraved_andesite` |  |
| `engraved_diorite` |  |
| `engraved_granite` |  |
| `evil_lucky_block` |  |
| `evil_lucky_block_face` |  |
| `explosive_paint_black_side` |  |
| `explosive_paint_black_top` |  |
| `explosive_paint_blue_side` |  |
| `explosive_paint_blue_top` |  |
| `explosive_paint_brown_side` |  |
| `explosive_paint_brown_top` |  |
| `explosive_paint_cyan_side` |  |
| `explosive_paint_cyan_top` |  |
| `explosive_paint_gray_side` |  |
| `explosive_paint_gray_top` |  |
| `explosive_paint_green_side` |  |
| `explosive_paint_green_top` |  |
| `explosive_paint_light_blue_side` |  |
| `explosive_paint_light_blue_top` |  |
| `explosive_paint_light_gray_side` |  |
| `explosive_paint_light_gray_top` |  |
| `explosive_paint_lime_side` |  |
| `explosive_paint_lime_top` |  |
| `explosive_paint_magenta_side` |  |
| `explosive_paint_magenta_top` |  |
| `explosive_paint_orange_side` |  |
| `explosive_paint_orange_top` |  |
| `explosive_paint_pink_side` |  |
| `explosive_paint_pink_top` |  |
| `explosive_paint_purple_side` |  |
| `explosive_paint_purple_top` |  |
| `explosive_paint_quick_black` |  |
| `explosive_paint_quick_blue` |  |
| `explosive_paint_quick_brown` |  |
| `explosive_paint_quick_cyan` |  |
| `explosive_paint_quick_gray` |  |
| `explosive_paint_quick_green` |  |
| `explosive_paint_quick_light_blue` |  |
| `explosive_paint_quick_light_gray` |  |
| `explosive_paint_quick_lime` |  |
| `explosive_paint_quick_magenta` |  |
| `explosive_paint_quick_orange` |  |
| `explosive_paint_quick_pink` |  |
| `explosive_paint_quick_purple` |  |
| `explosive_paint_quick_red` |  |
| `explosive_paint_quick_white` |  |
| `explosive_paint_quick_yellow` |  |
| `explosive_paint_red_side` |  |
| `explosive_paint_red_top` |  |
| `explosive_paint_seeking_black` |  |
| `explosive_paint_seeking_blue` |  |
| `explosive_paint_seeking_brown` |  |
| `explosive_paint_seeking_cyan` |  |
| `explosive_paint_seeking_gray` |  |
| `explosive_paint_seeking_green` |  |
| `explosive_paint_seeking_light_blue` |  |
| `explosive_paint_seeking_light_gray` |  |
| `explosive_paint_seeking_lime` |  |
| `explosive_paint_seeking_magenta` |  |
| `explosive_paint_seeking_orange` |  |
| `explosive_paint_seeking_pink` |  |
| `explosive_paint_seeking_purple` |  |
| `explosive_paint_seeking_red` |  |
| `explosive_paint_seeking_white` |  |
| `explosive_paint_seeking_yellow` |  |
| `explosive_paint_sticky_black` |  |
| `explosive_paint_sticky_blue` |  |
| `explosive_paint_sticky_brown` |  |
| `explosive_paint_sticky_cyan` |  |
| `explosive_paint_sticky_gray` |  |
| `explosive_paint_sticky_green` |  |
| `explosive_paint_sticky_light_blue` |  |
| `explosive_paint_sticky_light_gray` |  |
| `explosive_paint_sticky_lime` |  |
| `explosive_paint_sticky_magenta` |  |
| `explosive_paint_sticky_orange` |  |
| `explosive_paint_sticky_pink` |  |
| `explosive_paint_sticky_purple` |  |
| `explosive_paint_sticky_red` |  |
| `explosive_paint_sticky_white` |  |
| `explosive_paint_sticky_yellow` |  |
| `explosive_paint_white_side` |  |
| `explosive_paint_white_top` |  |
| `explosive_paint_yellow_side` |  |
| `explosive_paint_yellow_top` |  |
| `express_belt_slab_side` |  |
| `express_belt_top` |  |
| `express_belt_turn_left` |  |
| `express_belt_turn_right` |  |
| `extra_compressed_messy_stone` |  |
| `fallen_cherry_leaves_side` |  |
| `fallen_maple_leaves_side` |  |
| `farmland` |  |
| `fast_belt_slab_side` |  |
| `fast_belt_top` |  |
| `fast_belt_turn_left` |  |
| `fast_belt_turn_right` |  |
| `fast_loader_slab_front` |  |
| `fast_loader_top` |  |
| `fertilised_soil` |  |
| `finish_block` |  |
| `fireball_block` |  |
| `fluid_tank` |  |
| `fluid_tank_fill1` | anim (8 frames) |
| `fluid_tank_fill2` | anim (8 frames) |
| `fluid_tank_fill3` | anim (8 frames) |
| `fluid_tank_fill4` | anim (8 frames) |
| `food_lucky_block` |  |
| `food_lucky_block_rare` |  |
| `food_lucky_block_super` |  |
| `forge_hopper_top` |  |
| `fuel_port` |  |
| `fuel_rod` | anim (8 frames) |
| `generator_side` |  |
| `generator_side_running` | anim (8 frames) |
| `generator_top` |  |
| `ghost_chest_back` |  |
| `ghost_chest_front` |  |
| `ghost_chest_side` |  |
| `ghost_chest_top` |  |
| `ghost_lucky_block` |  |
| `ghost_mystery_block` |  |
| `glass` |  |
| `glass_black` |  |
| `glass_blue` |  |
| `glass_brown` |  |
| `glass_cyan` |  |
| `glass_gray` |  |
| `glass_green` |  |
| `glass_light_blue` |  |
| `glass_light_gray` |  |
| `glass_lime` |  |
| `glass_magenta` |  |
| `glass_orange` |  |
| `glass_pink` |  |
| `glass_purple` |  |
| `glass_red` |  |
| `glass_silver` |  |
| `glass_white` |  |
| `glass_yellow` |  |
| `glow_lamp` |  |
| `glowstone` |  |
| `gold_block` |  |
| `gold_deposit` |  |
| `gold_ore` |  |
| `granite_brick` |  |
| `graphite` |  |
| `graphite_block` |  |
| `grass_block_side` |  |
| `grass_top` |  |
| `gravel` |  |
| `gray_concrete` |  |
| `gray_gen_spawn_coal` |  |
| `gray_gen_spawn_iron` |  |
| `gray_gen_spawn_top` |  |
| `gray_glazed_terracotta` | rotation family (4 copies) |
| `gray_planks` |  |
| `gray_portal` | anim (4 frames) |
| `gray_spawn_block_side` |  |
| `gray_spawn_block_top` | rotation family (4 copies) |
| `green_bricks` |  |
| `green_concrete` |  |
| `green_glazed_terracotta` | rotation family (4 copies) |
| `green_lucky_block` |  |
| `green_lucky_block_rare` |  |
| `green_lucky_block_super` |  |
| `green_planks` |  |
| `green_portal` | anim (4 frames) |
| `green_spawn_block_side` |  |
| `green_spawn_block_top` | rotation family (4 copies) |
| `green_stone` |  |
| `grenade_block` |  |
| `grey_portal` | anim (4 frames) |
| `gun_lucky_block` |  |
| `hardened_clay` |  |
| `hardened_clay_stained_black` |  |
| `hardened_clay_stained_blue` |  |
| `hardened_clay_stained_brown` |  |
| `hardened_clay_stained_cyan` |  |
| `hardened_clay_stained_gray` |  |
| `hardened_clay_stained_green` |  |
| `hardened_clay_stained_light_blue` |  |
| `hardened_clay_stained_lime` |  |
| `hardened_clay_stained_magenta` |  |
| `hardened_clay_stained_orange` |  |
| `hardened_clay_stained_pink` |  |
| `hardened_clay_stained_purple` |  |
| `hardened_clay_stained_red` |  |
| `hardened_clay_stained_silver` |  |
| `hardened_clay_stained_white` |  |
| `hardened_clay_stained_yellow` |  |
| `harvester_bottom` |  |
| `harvester_lunite_bottom` |  |
| `harvester_lunite_side_0` |  |
| `harvester_lunite_side_1` |  |
| `harvester_lunite_top` |  |
| `harvester_side0` |  |
| `harvester_side1` |  |
| `harvester_top` |  |
| `hay_block_side` |  |
| `hay_block_top` |  |
| `homestead_core` |  |
| `homestead_core_cap` |  |
| `homestead_core_crown` |  |
| `homestead_core_mid` | anim (8 frames) |
| `hyper_compressed_messy_stone` |  |
| `ice` |  |
| `ice_brick` |  |
| `iceball_block` |  |
| `invisible_solid` |  |
| `iron_block` |  |
| `iron_chest_back` |  |
| `iron_chest_front` |  |
| `iron_chest_side` |  |
| `iron_chest_top` | rotation family (4 copies) |
| `iron_deposit` |  |
| `iron_ore` |  |
| `iron_watermelon_side` |  |
| `iron_watermelon_top` |  |
| `isotope_comet_heart` |  |
| `isotope_comet_ore` |  |
| `jetpack_back` |  |
| `jungle_grass_block` |  |
| `jungle_grass_block_side` |  |
| `lapis_block` |  |
| `lapis_ore` |  |
| `laser_back` |  |
| `laser_front` |  |
| `laser_side` |  |
| `lava` | anim (16 frames) |
| `leather_block_side` |  |
| `leather_block_top` |  |
| `leaves_aspen` |  |
| `leaves_aspen_autumn` |  |
| `leaves_cedar` |  |
| `leaves_cherry` |  |
| `leaves_cherry_fruity` |  |
| `leaves_jungle` |  |
| `leaves_mango` |  |
| `leaves_mango_fruity` |  |
| `leaves_maple` |  |
| `leaves_maple_autumn` |  |
| `leaves_maple_fruity` |  |
| `leaves_palm` |  |
| `leaves_palm_fruity` |  |
| `leaves_pear` |  |
| `leaves_pear_fruity` |  |
| `leaves_pine` |  |
| `leaves_pine_cone` |  |
| `leaves_plum` |  |
| `leaves_plum_fruity` |  |
| `leaves_spectral` |  |
| `light_blue_concrete` |  |
| `light_blue_glazed_terracotta` | rotation family (4 copies) |
| `light_blue_lucky_block` |  |
| `light_blue_planks` |  |
| `light_blue_spawn_block_side` |  |
| `light_blue_spawn_block_top` | rotation family (4 copies) |
| `light_gray_concrete` |  |
| `light_gray_glazed_terracotta` | rotation family (4 copies) |
| `light_gray_planks` |  |
| `light_gray_spawn_block_side` |  |
| `light_gray_spawn_block_top` | rotation family (4 copies) |
| `lightblue_portal` | anim (4 frames) |
| `lightgray_portal` | anim (4 frames) |
| `lime_concrete` |  |
| `lime_gen_spawn_coal` |  |
| `lime_gen_spawn_iron` |  |
| `lime_gen_spawn_top` |  |
| `lime_glazed_terracotta` | rotation family (4 copies) |
| `lime_planks` |  |
| `lime_portal` | anim (4 frames) |
| `lime_spawn_block_side` |  |
| `lime_spawn_block_top` | rotation family (4 copies) |
| `log_ancient_maple` |  |
| `log_aspen` |  |
| `log_cedar` |  |
| `log_cherry` |  |
| `log_jungle` |  |
| `log_mango` |  |
| `log_maple` |  |
| `log_palm` |  |
| `log_pear` |  |
| `log_pine` |  |
| `log_plum` |  |
| `log_spectral` |  |
| `lucky_block_pink_question` |  |
| `lucky_block_pink_question_rare` |  |
| `lucky_block_pink_question_super` |  |
| `lunite_block` |  |
| `lunite_ore` |  |
| `machine_bench_side` |  |
| `machine_bench_top` |  |
| `machine_side` |  |
| `magenta_concrete` |  |
| `magenta_glazed_terracotta` | rotation family (4 copies) |
| `magenta_planks` |  |
| `magenta_portal` | anim (4 frames) |
| `magenta_spawn_block_side` |  |
| `magenta_spawn_block_top` | rotation family (4 copies) |
| `magma` |  |
| `mailbox_front` |  |
| `mailbox_front_full` |  |
| `mailbox_side` |  |
| `mango_block_bottom` |  |
| `mango_block_side` |  |
| `mango_block_top` |  |
| `mega_compressed_messy_stone` |  |
| `melon_side` |  |
| `melon_top` |  |
| `melting_ice` |  |
| `messy_stone` |  |
| `mob_farm_back` |  |
| `mob_farm_front` |  |
| `mob_farm_side` |  |
| `mob_farm_side_running` | anim (8 frames) |
| `mob_farm_top` | rotation family (4 copies) |
| `mob_spawner_block_empty_side` |  |
| `mob_spawner_block_top` |  |
| `mob_spawner_hostile_block_side` |  |
| `mob_spawner_neutral_block_side` |  |
| `mob_spawner_passive_block_side` |  |
| `moonstone_block` |  |
| `moonstone_chest_back` |  |
| `moonstone_chest_front` |  |
| `moonstone_chest_side` |  |
| `moonstone_chest_top` | rotation family (4 copies) |
| `moonstone_explosive_side` |  |
| `moonstone_explosive_top` |  |
| `moonstone_gen_spawn_side` |  |
| `moonstone_gen_spawn_top` |  |
| `moonstone_ore` |  |
| `mossy_cobblestone` |  |
| `mushroom_stem` |  |
| `mystery_block` |  |
| `neon_black` |  |
| `neon_blue` |  |
| `neon_brown` |  |
| `neon_cyan` |  |
| `neon_gray` |  |
| `neon_green` |  |
| `neon_light_blue` |  |
| `neon_light_gray` |  |
| `neon_lime` |  |
| `neon_magenta` |  |
| `neon_orange` |  |
| `neon_pink` |  |
| `neon_purple` |  |
| `neon_red` |  |
| `neon_white` |  |
| `neon_yellow` |  |
| `nether_brick` |  |
| `netherrack` |  |
| `nova_bomb_side` |  |
| `nova_bomb_top` |  |
| `obby_absorb_block` |  |
| `obby_absorb_death_block` |  |
| `obby_death_block` |  |
| `obsidian` |  |
| `orange_concrete` |  |
| `orange_glazed_terracotta` | rotation family (4 copies) |
| `orange_lucky_block` |  |
| `orange_lucky_block_rare` |  |
| `orange_lucky_block_super` |  |
| `orange_planks` |  |
| `orange_portal` | anim (4 frames) |
| `orange_spawn_block_side` |  |
| `orange_spawn_block_top` | rotation family (4 copies) |
| `ore_gen_spawn_side` |  |
| `ore_gen_spawn_top` |  |
| `output` |  |
| `packed_snow` |  |
| `parts_bench_side` |  |
| `parts_bench_top` |  |
| `patterned_glass_black` |  |
| `patterned_glass_blue` |  |
| `patterned_glass_brown` |  |
| `patterned_glass_cyan` |  |
| `patterned_glass_gray` |  |
| `patterned_glass_green` |  |
| `patterned_glass_light_blue` |  |
| `patterned_glass_light_gray` |  |
| `patterned_glass_lime` |  |
| `patterned_glass_magenta` |  |
| `patterned_glass_orange` |  |
| `patterned_glass_pink` |  |
| `patterned_glass_purple` |  |
| `patterned_glass_red` |  |
| `patterned_glass_white` |  |
| `patterned_glass_yellow` |  |
| `pear_block_bottom` |  |
| `pear_block_side` |  |
| `pear_block_top` |  |
| `pet_lucky_block` |  |
| `pine_cone_block_side` |  |
| `pine_cone_block_top` |  |
| `pine_grass_block` |  |
| `pine_grass_block_side` |  |
| `pink_concrete` |  |
| `pink_gen_spawn_coal` |  |
| `pink_gen_spawn_iron` |  |
| `pink_gen_spawn_top` |  |
| `pink_glazed_terracotta` | rotation family (4 copies) |
| `pink_planks` |  |
| `pink_portal` | anim (4 frames) |
| `pink_spawn_block_side` |  |
| `pink_spawn_block_top` | rotation family (4 copies) |
| `planks_aspen` |  |
| `planks_cedar` |  |
| `planks_cherry` |  |
| `planks_jungle` |  |
| `planks_mango` |  |
| `planks_maple` |  |
| `planks_palm` |  |
| `planks_pear` |  |
| `planks_pine` |  |
| `planks_plum` |  |
| `planks_spectral` |  |
| `plum_block_bottom` |  |
| `plum_block_side` |  |
| `plum_block_top` |  |
| `podzol_top` |  |
| `potato_block` |  |
| `potion_lucky_block` |  |
| `potion_lucky_block_rare` |  |
| `potion_lucky_block_super` |  |
| `press_back` |  |
| `press_front` |  |
| `press_side` |  |
| `press_side_running` | anim (4 frames) |
| `press_top` | rotation family (4 copies) |
| `protector` |  |
| `protector_faction` |  |
| `protector_tribe` |  |
| `pump_bottom` |  |
| `pump_side` |  |
| `pump_side_running` | anim (8 frames) |
| `pump_top` |  |
| `pumpkin_face_on` |  |
| `pumpkin_side` |  |
| `pumpkin_top` |  |
| `pure_coal_ore` |  |
| `pure_copper_ore` |  |
| `pure_diamond_ore` |  |
| `pure_gold_ore` |  |
| `pure_iron_ore` |  |
| `pure_moonstone_ore` |  |
| `pure_uranium_ore` |  |
| `pure_voltite_ore` |  |
| `purple_concrete` |  |
| `purple_glazed_terracotta` | rotation family (4 copies) |
| `purple_lucky_block` |  |
| `purple_lucky_block_rare` |  |
| `purple_lucky_block_super` |  |
| `purple_planks` |  |
| `purple_portal` | anim (4 frames) |
| `purple_spawn_block_side` |  |
| `purple_spawn_block_top` | rotation family (4 copies) |
| `quartz_block_chiseled` |  |
| `quartz_block_side` |  |
| `radar_bottom` |  |
| `radar_screen` | anim (8 frames); rotation family (4 copies) |
| `radar_side_active` |  |
| `radar_side_inactive` |  |
| `radar_top_active` |  |
| `radar_top_inactive` |  |
| `reactor_base` |  |
| `reactor_base_top` |  |
| `reactor_casing` |  |
| `reactor_controller_green` | anim (4 frames) |
| `reactor_controller_orange` | anim (4 frames) |
| `reactor_controller_red` | anim (4 frames) |
| `reactor_controller_yellow` | anim (4 frames) |
| `reactor_frame` |  |
| `reactor_glass` |  |
| `reactor_slag` |  |
| `recycler_back` |  |
| `recycler_front` |  |
| `recycler_side` |  |
| `recycler_side_running` | anim (8 frames) |
| `recycler_top` | rotation family (4 copies) |
| `red_concrete` |  |
| `red_gen_spawn_coal` |  |
| `red_gen_spawn_iron` |  |
| `red_gen_spawn_top` |  |
| `red_glazed_terracotta` | rotation family (4 copies) |
| `red_lucky_block` |  |
| `red_lucky_block_rare` |  |
| `red_lucky_block_super` |  |
| `red_mushroom_block` |  |
| `red_planks` |  |
| `red_portal` | anim (4 frames) |
| `red_sand` |  |
| `red_sandstone` |  |
| `red_sandstone_brick` |  |
| `red_sandstone_top` |  |
| `red_spawn_block_side` |  |
| `red_spawn_block_top` | rotation family (4 copies) |
| `redstone_lamp_off` |  |
| `redstone_lamp_on` |  |
| `rocket_block` |  |
| `rocky_dirt` |  |
| `rope_block` |  |
| `sand` |  |
| `sandstone_brick` |  |
| `sandstone_normal` |  |
| `sandstone_top` |  |
| `scaffolding` |  |
| `scorpion_eggs` |  |
| `shatter_mill_back` |  |
| `shatter_mill_front` |  |
| `shatter_mill_side` |  |
| `shatter_mill_side_running` | anim (4 frames) |
| `shatter_mill_top` | rotation family (4 copies) |
| `shop_trader_spawn_face` |  |
| `shop_trader_spawn_side` |  |
| `shop_trader_spawn_top` | rotation family (4 copies) |
| `shop_wizard_spawn_face` |  |
| `shop_wizard_spawn_side` |  |
| `shop_wizard_spawn_top` | rotation family (4 copies) |
| `sky_spring` | anim (8 frames) |
| `sky_tap_back` |  |
| `sky_tap_bottom` |  |
| `sky_tap_front` |  |
| `sky_tap_side` |  |
| `sky_tap_side_running` | anim (8 frames) |
| `sky_tap_top` | rotation family (4 copies) |
| `slab_andesite_brick_side` |  |
| `slab_aspen_side` |  |
| `slab_brick_side` |  |
| `slab_cedar_side` |  |
| `slab_cherry_side` |  |
| `slab_chiseled_red_sandstone_side` |  |
| `slab_chiseled_sandstone_side` |  |
| `slab_cobblestone_side` |  |
| `slab_cut_red_sandstone_side` |  |
| `slab_cut_sandstone_side` |  |
| `slab_diorite_brick_side` |  |
| `slab_dirt_side` |  |
| `slab_dry_grass_top_side` |  |
| `slab_engraved_andesite_side` |  |
| `slab_engraved_diorite_side` |  |
| `slab_engraved_granite_side` |  |
| `slab_granite_brick_side` |  |
| `slab_grass_top_side` |  |
| `slab_ice_brick_side` |  |
| `slab_jungle_grass_top_side` |  |
| `slab_jungle_side` |  |
| `slab_mango_side` |  |
| `slab_maple_side` |  |
| `slab_mossy_cobblestone_side` |  |
| `slab_palm_side` |  |
| `slab_pear_side` |  |
| `slab_pine_grass_top_side` |  |
| `slab_pine_side` |  |
| `slab_plum_side` |  |
| `slab_red_sandstone_brick_side` |  |
| `slab_red_sandstone_side` |  |
| `slab_sandstone_brick_side` |  |
| `slab_sandstone_normal_side` |  |
| `slab_smooth_stone_side` |  |
| `slab_spectral_side` |  |
| `slab_stone_andesite_side` |  |
| `slab_stone_andesite_smooth_side` |  |
| `slab_stone_diorite_side` |  |
| `slab_stone_diorite_smooth_side` |  |
| `slab_stone_granite_side` |  |
| `slab_stone_granite_smooth_side` |  |
| `slab_stone_side` |  |
| `slab_stonebrick_carved_side` |  |
| `slab_stonebrick_mossy_side` |  |
| `slab_stonebrick_side` |  |
| `smelter_back` |  |
| `smelter_front` |  |
| `smelter_side` |  |
| `smelter_side_running` | anim (8 frames) |
| `smelter_top` | rotation family (4 copies) |
| `smoke` | anim (8 frames) |
| `smooth_stone` |  |
| `snow` |  |
| `snowy_messy_stone` |  |
| `snowy_messy_stone_side` |  |
| `solar_panel_bottom` |  |
| `solar_panel_side` |  |
| `solar_panel_top` |  |
| `sorting_gate_slab_side` |  |
| `sorting_gate_top` |  |
| `sorting_gate_top_right` |  |
| `splitter_slab_side` |  |
| `splitter_top` |  |
| `splitter_top_front_right` |  |
| `splitter_top_left_front` |  |
| `sponge` |  |
| `starframe` |  |
| `stone` |  |
| `stone_andesite` |  |
| `stone_andesite_smooth` |  |
| `stone_deposit` |  |
| `stone_diorite` |  |
| `stone_diorite_smooth` |  |
| `stone_generator_side` |  |
| `stone_generator_top` |  |
| `stone_granite` |  |
| `stone_granite_smooth` |  |
| `stonebrick` |  |
| `stonebrick_carved` |  |
| `stonebrick_cracked` |  |
| `stonebrick_mossy` |  |
| `storage_silo_side` |  |
| `storage_silo_top` |  |
| `stripped_aspen_log` |  |
| `stripped_cedar_log` |  |
| `stripped_cherry_log` |  |
| `stripped_jungle_log` |  |
| `stripped_mango_log` |  |
| `stripped_maple_log` |  |
| `stripped_palm_log` |  |
| `stripped_pear_log` |  |
| `stripped_pine_log` |  |
| `stripped_plum_log` |  |
| `stripped_spectral_log` |  |
| `super_compressed_messy_stone` |  |
| `super_rocket_block` |  |
| `synthesizer_back` |  |
| `synthesizer_back_running` | anim (8 frames) |
| `synthesizer_bottom` |  |
| `synthesizer_side` |  |
| `synthesizer_side_flip` |  |
| `synthesizer_side_flip_running` | anim (4 frames) |
| `synthesizer_side_running` | anim (4 frames) |
| `synthesizer_top` | rotation family (4 copies) |
| `tool_bench_side` |  |
| `tool_bench_top` |  |
| `tools_lucky_block` |  |
| `tools_lucky_block_rare` |  |
| `tools_lucky_block_super` |  |
| `toxic_waste` | anim (16 frames) |
| `toxic_waste_barrel_bottom` |  |
| `toxic_waste_barrel_side` |  |
| `toxic_waste_barrel_top` | anim (8 frames) |
| `toxin_ball_block` |  |
| `trading_terminal_front` | anim (8 frames) |
| `trading_terminal_side` |  |
| `trading_terminal_top` |  |
| `tree_cutter_back` |  |
| `tree_cutter_back_running` | anim (4 frames) |
| `tree_cutter_front` |  |
| `tree_cutter_side` |  |
| `tree_cutter_side_running` | anim (8 frames) |
| `tree_cutter_top` | rotation family (4 copies) |
| `ultra_compressed_messy_stone` |  |
| `unloaded` |  |
| `uranium_block` |  |
| `uranium_deposit` |  |
| `uranium_glass` |  |
| `uranium_ore` |  |
| `volt_engine_side` |  |
| `volt_engine_side_running` | anim (8 frames) |
| `volt_engine_top` |  |
| `voltite_block` |  |
| `voltite_deposit` |  |
| `voltite_ore` |  |
| `water_port` |  |
| `watermelon_side` |  |
| `watermelon_top` |  |
| `weapon_lucky_block` |  |
| `weapon_lucky_block_rare` |  |
| `weapon_lucky_block_super` |  |
| `white_concrete` |  |
| `white_gen_spawn_coal` |  |
| `white_gen_spawn_iron` |  |
| `white_gen_spawn_top` |  |
| `white_glazed_terracotta` | rotation family (4 copies) |
| `white_planks` |  |
| `white_portal` | anim (4 frames) |
| `white_spawn_block_side` |  |
| `white_spawn_block_top` | rotation family (4 copies) |
| `wire_mill_back` |  |
| `wire_mill_front` |  |
| `wire_mill_side` |  |
| `wire_mill_side_running` | anim (8 frames) |
| `wire_mill_top` | rotation family (4 copies) |
| `wireless_terminal_bottom` |  |
| `wireless_terminal_front` |  |
| `wireless_terminal_top` | rotation family (4 copies) |
| `wool_colored_black` |  |
| `wool_colored_blue` |  |
| `wool_colored_brown` |  |
| `wool_colored_cyan` |  |
| `wool_colored_gray` |  |
| `wool_colored_green` |  |
| `wool_colored_light_blue` |  |
| `wool_colored_light_grey` |  |
| `wool_colored_lime` |  |
| `wool_colored_magenta` |  |
| `wool_colored_orange` |  |
| `wool_colored_pink` |  |
| `wool_colored_purple` |  |
| `wool_colored_red` |  |
| `wool_colored_white` |  |
| `wool_colored_yellow` |  |
| `yellow_concrete` |  |
| `yellow_gen_spawn_coal` |  |
| `yellow_gen_spawn_iron` |  |
| `yellow_gen_spawn_top` |  |
| `yellow_glazed_terracotta` | rotation family (4 copies) |
| `yellow_lucky_block` |  |
| `yellow_lucky_block_rare` |  |
| `yellow_lucky_block_super` |  |
| `yellow_planks` |  |
| `yellow_portal` | anim (4 frames) |
| `yellow_spawn_block_side` |  |
| `yellow_spawn_block_top` | rotation family (4 copies) |

### घूर्णन परिवार (64 मूल)

ये टेक्सचर केवल पहले-घुमाई प्रतियों (`name[rot[1..4`) के रूप में मौजूद हैं। रजिस्ट्री उन्हें नीचे दिए मूल पर फ़ोल्ड करता है, और `bloxdTexel` सैंपल के समय रोटेशन दोबारा लगाता है — मूल को संदर्भित करें, प्रतियों को कभी नहीं। कोई `[rot[N` स्पेलिंग लिखने पर समर्पित रोटेशन डायग्नोस्टिक मिलता है।
- `alloy_kiln_top`
- `auto_bench_top`
- `belt_tunnel_exit_top`
- `belt_tunnel_top`
- `black_glazed_terracotta`
- `black_spawn_block_top`
- `blue_glazed_terracotta`
- `blue_spawn_block_top`
- `brown_glazed_terracotta`
- `brown_spawn_block_top`
- `burner_drill_top`
- `centrifuge_top`
- `checkpoint_block`
- `chest_top`
- `collider_top`
- `condenser_top`
- `coolant_mixer_top`
- `crop_harvester_top`
- `crusher_top`
- `crystal_vat_top`
- `custom_lobby_block_top`
- `cyan_glazed_terracotta`
- `cyan_spawn_block_top`
- `deep_drill_top`
- `electric_drill_top`
- `gray_glazed_terracotta`
- `gray_spawn_block_top`
- `green_glazed_terracotta`
- `green_spawn_block_top`
- `iron_chest_top`
- `light_blue_glazed_terracotta`
- `light_blue_spawn_block_top`
- `light_gray_glazed_terracotta`
- `light_gray_spawn_block_top`
- `lime_glazed_terracotta`
- `lime_spawn_block_top`
- `magenta_glazed_terracotta`
- `magenta_spawn_block_top`
- `mob_farm_top`
- `moonstone_chest_top`
- `orange_glazed_terracotta`
- `orange_spawn_block_top`
- `pink_glazed_terracotta`
- `pink_spawn_block_top`
- `press_top`
- `purple_glazed_terracotta`
- `purple_spawn_block_top`
- `radar_screen`
- `recycler_top`
- `red_glazed_terracotta`
- `red_spawn_block_top`
- `shatter_mill_top`
- `shop_trader_spawn_top`
- `shop_wizard_spawn_top`
- `sky_tap_top`
- `smelter_top`
- `synthesizer_top`
- `tree_cutter_top`
- `white_glazed_terracotta`
- `white_spawn_block_top`
- `wire_mill_top`
- `wireless_terminal_top`
- `yellow_glazed_terracotta`
- `yellow_spawn_block_top`
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
- प्रयोग-योग्य नामित स्थिरांक: 896 → **1,017**
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
- प्रयोग-योग्य नामित स्थिरांक: 1,017 → **911**
- जीवित नामों में id परिवर्तन: **1,017 में से 864** (95%)

पूरी ड्रिफ़्ट (5 नाम — दो नए ब्लॉक):

- **जोड़े गए (5):** `stone_generator_side`, `stone_generator_top`, `trading_terminal_front` (anim, 8 फ़्रेम), `trading_terminal_side`, `trading_terminal_top` — Trading Terminal और Stone Generator ब्लॉक गेम डेटा में शामिल हो गए।
- **हटाए गए:** कोई नहीं।

यह सिद्धांत हर कदम पर और मज़बूती से लागू होता है: सिर्फ़ इसी कदम में 1,017 जीवित नामों में से 864 का id बदला — लगभग बीस में से उन्नीस।

## मापा गया ड्रिफ़्ट (bny9u → v98qt8)

रजिस्ट्री सप्ताहांत में फिर एक बार खिसका — `bny9u` (2026-11-05) → `v98qt8` (2026-11-08, प्रोडक्शन और preprod एक ही बाइट-समान बंडल परोसते हैं, md5 `7458fd47ff88331d9f451d1456ff48ac`):

- एटलस प्रविष्टियाँ: 1,232 → 1,650
- रोटेशन परिवार (घुमाई गई स्पेलिंग): 57 (228) → 57 (228) — अपरिवर्तित
- एनीमेशन परिवार (फ़्रेम स्पेलिंग): 43 (196) → 43 (196) — अपरिवर्तित
- प्रयोग-योग्य नामित स्थिरांक: 911 → **1,017**
- जीवित नामों में id परिवर्तन: **905 में से 716** (79%)

पूरा ड्रिफ़्ट (7 नाम — तीन ब्लॉक मॉडल बन गए):

- **जोड़ा गया (1):** `hay_block_top` — हे-ब्लॉक परिवार को एक अलग ऊपरी बनावट मिली।
- **हटाए गए (6):** `artisan_table_side`, `artisan_table_top`, `crafting_table_side`, `furnace_front`, `furnace_side`, `furnace_top` — Furnace, Workbench (क्राफ़्टिंग टेबल) और Artisan Bench टेरेन-बनावट वाले ब्लॉकों से हटकर ब्लॉक-मॉडल बन गए, इसलिए उनकी टेरेन बनावटें रजिस्ट्री से निकल गईं (Workbench ने `crafting_table_top` बनाए रखा — ऊपरी फलक अब भी टेरेन-बनावट है))

हमेशा जैसा सिद्धांत: इस एक ही कदम में 905 जीवित नामों में से 716 का id बदला — `bloxdTextureIdStone` लिखें, कच्चा नंबर नहीं।

## संबंधित

- [टेक्सचर API](texture-api.md) · [इंजन इंटरनल्स: टेक्सचर रजिस्ट्री](../internals/texture-registry.md) · [वर्शन हिस्ट्री: v4](../history/v4.md)
