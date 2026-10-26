[← Previous part](10-apiv4.md)·[Back to the manual](README.md)

# Часть XI: Полный справочник — заголовок движка и каталог текстур

Целевой билд: `cnty9.main.669f8081.js` (измерен 2026-10-27; продакшен и препрод побайтно совпадают). Эта часть вставляет **целиком** оба справочных артефакта, чтобы руководство было самодостаточным. §67 — точный текст заголовка, который движок дописывает перед каждым паком (восстановлен дословно из продакшен-бандла); §68 — полный каталог текстур: все 905 используемых имён `bloxdTextureId*` с измеренными id, 57 повёрнутых семейств, 42 анимированных и измеренный дрейф реестра.

Каталог — не приближение: он получен запуском **собственного** модуля-строителя реестра движка (module 28833 — тот же код, что разрешает `bloxdTextureId*` при валидации) на данных живого билда (`textureNameToIndex`, `animDataPerTex`) с фиксацией его вывода. Имена — это API; id — снимок одного билда, они дрейфуют (§68.5).

Подробные объяснения обоих разделов — в полных английской и японской версиях Части XI; сами данные здесь полны.


## 67. Полный заголовок движка v4, дословно

Заголовок в 6 021 байт (150 строк), который движок дописывает перед каждым паком — первая строка `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.` Не входят: пара `bloxdTexel`/`bloxdTextureSize`, генерируемая по конфигурации рендера (§63.1), и 27 символов `bloxdSp*` (§63.4). Ворот `#ifdef BLOXD_ALPHA` разрешается препроцессором движка по вариантам.


```wgsl

// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.

const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// These functions return 1 value per frame, the same for every call site.

// The camera's render position.
fn bloxdEyePosition() -> vec3f {
    return bloxdPackInputs.eyePosition;
}

// Changes as the player travels, so render positions stay close to 0,0,0.
// Integer distance, in blocks. Render position + this offset = world position.
// See bloxdWorldPosition for how this can be used.
fn bloxdRenderOffset() -> vec3i {
    return bloxdPackInputs.renderOffset;
}

// This unit vector points towards the sun, in world orientation; 0 when no sun.
fn bloxdSunDirection() -> vec3f {
    return bloxdPackInputs.sunDirection;
}

// Seconds since the page loaded. As an f32, it has sub-millisecond precision
// for the first 4.5 hours. Get a recurring timer using bloxdSeconds() % period.
fn bloxdSeconds() -> f32 {
    return bloxdPackInputs.seconds;
}

// Each bit of the binary representation of blockFlags is a flag corresponding
// to a collection of blocks. The collections overlap, so blocks can be in 0-2+.
// (blockFlags & bloxdBlockFlagRock) != 0 // The block has this flag.
// (blockFlags & bloxdBlockFlagRock) == 0 // The block doesn't have this flag.

// Opaque blocks, leaves and ice included. Not glass, water, spawners, etc.
const bloxdBlockFlagOpaque: u32 = 1;

// These blocks emit light, e.g. neon, portals, lamps, lava, and glowing ores.
const bloxdBlockFlagEmissive: u32 = 2;

// 'Leafy', e.g. leaves, and grass blocks. Not cacti, mushroom blocks or hay.
const bloxdBlockFlagVegetation: u32 = 4;

// Dirt and soil, grass blocks included. Rocky Dirt is both dirt and rock.
const bloxdBlockFlagDirt: u32 = 8;

// Sand, Red Sand, and every sandstone, which is rock too.
const bloxdBlockFlagSand: u32 = 16;

// Stone variants, and more, e.g. gravel, ores, sandstone, magma and obsidian.
const bloxdBlockFlagRock: u32 = 32;

// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f {
    return position + vec3f(bloxdRenderOffset());
}

// Using a fragment's position and normal, identify the block's world position.
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i {
    return vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset();
}

struct BloxdVertexIn {
    position: vec3f, // Render position.
    normal: vec3f,   // Unit vector direction pointing away from the face.
    blockFlags: u32, // What kind of block. See bloxdBlockFlag*.
}

struct BloxdVertex {
    position: vec3f, // The render position output.
}

struct BloxdSurfaceIn {
    colour: vec3f,   // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,      // Opacity.
    normal: vec3f,   // Unit vector direction pointing away from the face.
    position: vec3f, // Render position.
    blockFlags: u32, // What kind of block. See bloxdBlockFlag*.

    // These are 0 if the face has no texture.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // Texture coordinates in blocks; fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}

struct BloxdSurface {
    colour: vec3f,   // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,      // Opacity output.
#endif
    emission: vec3f, // Emissive RGB output, added after lighting, before fog.
}

// blockLight, skyLight and heldLight are 0-1, from the 0-15 light levels on an
// ease-out curve, e.g. 6->0.45, 12->0.92. They all exclude ambientLightColour.
struct BloxdLightIn {
    litColour: vec3f,  // RGB surface colour, lit, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 when off.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 without BLOXD_LIGHTING.
    skyLight: f32,     // Sky light; 1 without BLOXD_LIGHTING.
    ambientLightColour: vec3f, // Minimum RGB light; 1 without BLOXD_LIGHTING.
    skyLightColour: vec3f, // RGB colour of skyLight; 1 without BLOXD_LIGHTING.
    heldLight: vec3f,  // 0 without BLOXD_LIGHTING. 0 with no light source held.
    fogColour: vec3f,  // The game's RGB fog colour. 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.
    position: vec3f,   // Render position.
    normal: vec3f,     // Unit vector direction pointing away from the face.
    blockFlags: u32,   // What kind of block. See bloxdBlockFlag*.

    // These are 0 if the face has no texture.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // Texture coordinates in blocks; fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}

struct BloxdLight {
    colour: vec3f, // RGB colour output.
}

struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}

fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return BloxdVertex(vertex.position);
}

fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
#ifdef BLOXD_ALPHA
    return BloxdSurface(surface.colour, surface.alpha, vec3f(0.0));
#else
    return BloxdSurface(surface.colour, vec3f(0.0));
#endif
}

// Applies this fragment's fog to colour, as the engine does.
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}

fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return BloxdLight(bloxdApplyFog(light.litColour + surface.emission, light));
}
```

## 68. Полный каталог текстур (905 имён, измерено)

### 68.1 Как читать

**Имя** — дескриптор реестра; константа получается CamelCase-преобразованием (§57.3): `grass_top` → `bloxdTextureIdGrassTop`. **id** — значение константы (слой атласа + 1, измерено на `cnty9`) — для отладки, не для хардкода. Столбец **Примечания** помечает анимированные семейства (автоматически текущий кадр) и повёрнутые (адресуйте корень; `bloxdTexel` заново применяет поворот).

Чего здесь нет: 416 известных написаний-псевдонимов (188 кадровых, 228 поворотных) — это не константы, у них свои сообщения об ошибках (§57.3).


### 68.2 Каталог

Все используемые имена, по алфавиту. id — снимок `cnty9`; имена переживают дрейф реестра, потому что валидатор заново разрешает их при загрузке.

| Имя | id (cnty9) | Примечания |
|---|---|---|
| `alloy_kiln_back` | 1091 |  |
| `alloy_kiln_front` | 1085 |  |
| `alloy_kiln_side` | 1086 |  |
| `alloy_kiln_side_running` | 33 | animated (4 frames) |
| `alloy_kiln_top` | 1087 | turned (4 rotated copies) |
| `andesite_brick` | 465 |  |
| `apple_block_bottom` | 441 |  |
| `apple_block_side` | 439 |  |
| `apple_block_top` | 440 |  |
| `armour_lucky_block` | 995 |  |
| `armour_lucky_block_rare` | 997 |  |
| `armour_lucky_block_super` | 999 |  |
| `artisan_table_side` | 367 |  |
| `artisan_table_top` | 368 |  |
| `ash` | 1031 |  |
| `auto_bench_back` | 1106 |  |
| `auto_bench_front` | 1100 |  |
| `auto_bench_side` | 1101 |  |
| `auto_bench_side_running` | 35 | animated (4 frames) |
| `auto_bench_top` | 1102 | turned (4 rotated copies) |
| `autocrafter_bottom` | 962 |  |
| `autocrafter_lunite_bottom` | 973 |  |
| `autocrafter_lunite_side` | 972 |  |
| `autocrafter_side` | 961 |  |
| `banana_block_side` | 899 |  |
| `banana_block_top` | 900 |  |
| `beacon` | 330 |  |
| `bedrock` | 334 |  |
| `beetroot_block_bottom` | 925 |  |
| `beetroot_block_side` | 923 |  |
| `beetroot_block_top` | 924 |  |
| `belt_drop_side` | 1185 |  |
| `belt_drop_top` | 1184 |  |
| `belt_lift_side` | 1183 |  |
| `belt_lift_top` | 1182 |  |
| `belt_loader_slab_front` | 1110 |  |
| `belt_loader_top` | 1109 |  |
| `belt_tunnel_back` | 1199 |  |
| `belt_tunnel_exit_top` | 1200 | turned (4 rotated copies) |
| `belt_tunnel_mouth` | 1193 |  |
| `belt_tunnel_side` | 1194 |  |
| `belt_tunnel_top` | 1195 | turned (4 rotated copies) |
| `black_concrete` | 273 |  |
| `black_glazed_terracotta` | 429 | turned (4 rotated copies) |
| `black_planks` | 366 |  |
| `black_portal` | 2 | animated (4 frames) |
| `black_spawn_block_side` | 760 |  |
| `black_spawn_block_top` | 756 | turned (4 rotated copies) |
| `block_destroyer_tnt_side` | 1017 |  |
| `block_destroyer_tnt_top` | 1018 |  |
| `blue_concrete` | 274 |  |
| `blue_gen_spawn_coal` | 774 |  |
| `blue_gen_spawn_iron` | 775 |  |
| `blue_gen_spawn_top` | 773 |  |
| `blue_glazed_terracotta` | 413 | turned (4 rotated copies) |
| `blue_lucky_block` | 994 |  |
| `blue_lucky_block_rare` | 996 |  |
| `blue_lucky_block_super` | 998 |  |
| `blue_planks` | 362 |  |
| `blue_portal` | 3 | animated (4 frames) |
| `blue_spawn_block_side` | 755 |  |
| `blue_spawn_block_top` | 751 | turned (4 rotated copies) |
| `bone_block_side` | 818 |  |
| `bone_block_top` | 819 |  |
| `bookshelf` | 564 |  |
| `bookshelf_1` | 566 |  |
| `bookshelf_2` | 567 |  |
| `bookshelf_3` | 568 |  |
| `bookshelf_4` | 569 |  |
| `bookshelf_5` | 570 |  |
| `bookshelf_empty` | 565 |  |
| `bouncy_bomb_block` | 591 |  |
| `bowling_alley_floor` | 978 |  |
| `bread_block_back` | 435 |  |
| `bread_block_front` | 434 |  |
| `bread_block_side` | 436 |  |
| `bread_block_top` | 437 |  |
| `brick` | 315 |  |
| `brown_concrete` | 275 |  |
| `brown_glazed_terracotta` | 417 | turned (4 rotated copies) |
| `brown_mushroom_block` | 536 |  |
| `brown_planks` | 363 |  |
| `brown_portal` | 4 | animated (4 frames) |
| `brown_spawn_block_side` | 750 |  |
| `brown_spawn_block_top` | 746 | turned (4 rotated copies) |
| `building_lucky_block` | 989 |  |
| `building_lucky_block_rare` | 991 |  |
| `building_lucky_block_super` | 993 |  |
| `burner_drill_back` | 1048 |  |
| `burner_drill_bottom` | 1047 |  |
| `burner_drill_front` | 1041 |  |
| `burner_drill_side` | 1042 |  |
| `burner_drill_side_running` | 27 | animated (4 frames) |
| `burner_drill_top` | 1043 | turned (4 rotated copies) |
| `cactus_dry` | 350 |  |
| `cactus_top` | 349 |  |
| `carrot_block_bottom` | 921 |  |
| `carrot_block_side` | 919 |  |
| `carrot_block_top` | 920 |  |
| `carved_messy_stone` | 827 |  |
| `carved_pumpkin` | 543 |  |
| `chalk` | 839 |  |
| `chalk_black` | 855 |  |
| `chalk_blue` | 854 |  |
| `chalk_bricks_black` | 871 |  |
| `chalk_bricks_blue` | 870 |  |
| `chalk_bricks_brown` | 869 |  |
| `chalk_bricks_cyan` | 868 |  |
| `chalk_bricks_gray` | 867 |  |
| `chalk_bricks_green` | 866 |  |
| `chalk_bricks_light_blue` | 865 |  |
| `chalk_bricks_light_gray` | 864 |  |
| `chalk_bricks_lime` | 863 |  |
| `chalk_bricks_magenta` | 862 |  |
| `chalk_bricks_orange` | 861 |  |
| `chalk_bricks_pink` | 860 |  |
| `chalk_bricks_purple` | 859 |  |
| `chalk_bricks_red` | 858 |  |
| `chalk_bricks_slab_side_black` | 887 |  |
| `chalk_bricks_slab_side_blue` | 886 |  |
| `chalk_bricks_slab_side_brown` | 885 |  |
| `chalk_bricks_slab_side_cyan` | 884 |  |
| `chalk_bricks_slab_side_gray` | 883 |  |
| `chalk_bricks_slab_side_green` | 882 |  |
| `chalk_bricks_slab_side_light_blue` | 881 |  |
| `chalk_bricks_slab_side_light_gray` | 880 |  |
| `chalk_bricks_slab_side_lime` | 879 |  |
| `chalk_bricks_slab_side_magenta` | 878 |  |
| `chalk_bricks_slab_side_orange` | 877 |  |
| `chalk_bricks_slab_side_pink` | 876 |  |
| `chalk_bricks_slab_side_purple` | 875 |  |
| `chalk_bricks_slab_side_red` | 874 |  |
| `chalk_bricks_slab_side_white` | 873 |  |
| `chalk_bricks_slab_side_yellow` | 872 |  |
| `chalk_bricks_white` | 857 |  |
| `chalk_bricks_yellow` | 856 |  |
| `chalk_brown` | 853 |  |
| `chalk_cyan` | 852 |  |
| `chalk_gray` | 851 |  |
| `chalk_green` | 850 |  |
| `chalk_light_blue` | 849 |  |
| `chalk_light_gray` | 848 |  |
| `chalk_lime` | 847 |  |
| `chalk_magenta` | 846 |  |
| `chalk_orange` | 845 |  |
| `chalk_pink` | 844 |  |
| `chalk_purple` | 843 |  |
| `chalk_red` | 842 |  |
| `chalk_white` | 841 |  |
| `chalk_yellow` | 840 |  |
| `charge_vault_side` | 1114 |  |
| `charge_vault_top` | 1113 |  |
| `charging_pad_side` | 1159 |  |
| `charging_pad_top` | 1158 |  |
| `checkpoint_block` | 761 | turned (4 rotated copies) |
| `cherry_block_bottom` | 590 |  |
| `cherry_block_side` | 588 |  |
| `cherry_block_top` | 589 |  |
| `chest_back` | 347 |  |
| `chest_double_back_hi` | 1219 |  |
| `chest_double_back_lo` | 1218 |  |
| `chest_double_front_hi` | 1213 |  |
| `chest_double_front_lo` | 1212 |  |
| `chest_double_top_1_hi` | 1215 |  |
| `chest_double_top_1_lo` | 1214 |  |
| `chest_double_top_2_hi` | 1217 |  |
| `chest_double_top_2_lo` | 1216 |  |
| `chest_front` | 341 |  |
| `chest_side` | 342 |  |
| `chest_top` | 343 | turned (4 rotated copies) |
| `chili_pepper_block_bottom` | 678 |  |
| `chili_pepper_block_side` | 676 |  |
| `chili_pepper_block_top` | 677 |  |
| `chiseled_red_sandstone` | 456 |  |
| `chiseled_sandstone` | 325 |  |
| `clay` | 195 |  |
| `coal_block` | 233 |  |
| `coal_deposit` | 1032 |  |
| `coal_ore` | 227 |  |
| `coarse_dirt` | 191 |  |
| `coconut_block_bottom` | 522 |  |
| `coconut_block_side` | 520 |  |
| `coconut_block_top` | 521 |  |
| `code_block` | 679 |  |
| `comet_heart` | 1170 |  |
| `comet_ore` | 1169 |  |
| `compressed_messy_stone` | 530 |  |
| `conveyor_belt_bottom` | 1081 |  |
| `conveyor_belt_slab_side` | 1080 |  |
| `conveyor_belt_top` | 1079 |  |
| `conveyor_belt_turn_left` | 1171 |  |
| `conveyor_belt_turn_right` | 1172 |  |
| `copper_deposit` | 1035 |  |
| `copper_ore` | 1040 |  |
| `corn_block_bottom` | 594 |  |
| `corn_block_side` | 592 |  |
| `corn_block_top` | 593 |  |
| `crafting_table_side` | 338 |  |
| `crafting_table_top` | 339 |  |
| `crate` | 918 |  |
| `crop_harvester_back` | 1192 |  |
| `crop_harvester_back_running` | 45 | animated (4 frames) |
| `crop_harvester_front` | 1186 |  |
| `crop_harvester_side` | 1187 |  |
| `crop_harvester_side_running` | 44 | animated (4 frames) |
| `crop_harvester_top` | 1188 | turned (4 rotated copies) |
| `crusher_back` | 1055 |  |
| `crusher_front` | 1049 |  |
| `crusher_side` | 1050 |  |
| `crusher_side_running` | 28 | animated (4 frames) |
| `crusher_top` | 1051 | turned (4 rotated copies) |
| `crystal_block` | 1029 |  |
| `crystal_vat_back` | 1166 |  |
| `crystal_vat_front` | 1160 |  |
| `crystal_vat_side` | 1161 |  |
| `crystal_vat_side_running` | 42 | animated (4 frames) |
| `crystal_vat_top` | 1162 | turned (4 rotated copies) |
| `custom_lobby_block_side` | 769 |  |
| `custom_lobby_block_top` | 765 | turned (4 rotated copies) |
| `cut_red_sandstone` | 457 |  |
| `cut_sandstone` | 453 |  |
| `cyan_concrete` | 276 |  |
| `cyan_gen_spawn_coal` | 783 |  |
| `cyan_gen_spawn_iron` | 784 |  |
| `cyan_gen_spawn_top` | 782 |  |
| `cyan_glazed_terracotta` | 405 | turned (4 rotated copies) |
| `cyan_planks` | 360 |  |
| `cyan_portal` | 5 | animated (4 frames) |
| `cyan_spawn_block_side` | 745 |  |
| `cyan_spawn_block_top` | 741 | turned (4 rotated copies) |
| `dark_green_bricks` | 460 |  |
| `darkstone` | 1206 |  |
| `darkstone_bricks` | 1207 |  |
| `darkstone_bricks_cracked` | 1208 |  |
| `darkstone_bricks_lava` | 1209 |  |
| `darkstone_engraved` | 1210 |  |
| `darkstone_smooth` | 1211 |  |
| `deep_drill_back` | 1140 |  |
| `deep_drill_bottom` | 1139 |  |
| `deep_drill_front` | 1133 |  |
| `deep_drill_side` | 1134 |  |
| `deep_drill_side_running` | 39 | animated (4 frames) |
| `deep_drill_top` | 1135 | turned (4 rotated copies) |
| `diamond_block` | 340 |  |
| `diamond_gen_spawn_side` | 807 |  |
| `diamond_gen_spawn_top` | 806 |  |
| `diamond_ore` | 232 |  |
| `diorite_brick` | 463 |  |
| `dirt` | 190 |  |
| `drop_location_block_side` | 814 |  |
| `drop_location_block_top` | 813 |  |
| `drop_pad` | 1038 |  |
| `dry_grass_block` | 980 |  |
| `dry_grass_block_side` | 979 |  |
| `electric_drill_back` | 1099 |  |
| `electric_drill_bottom` | 1098 |  |
| `electric_drill_front` | 1092 |  |
| `electric_drill_side` | 1093 |  |
| `electric_drill_side_running` | 34 | animated (4 frames) |
| `electric_drill_top` | 1094 | turned (4 rotated copies) |
| `emerald_block` | 237 |  |
| `emerald_ore` | 231 |  |
| `end_stone` | 226 |  |
| `engraved_andesite` | 464 |  |
| `engraved_diorite` | 462 |  |
| `engraved_granite` | 466 |  |
| `evil_lucky_block` | 1022 |  |
| `evil_lucky_block_face` | 1023 |  |
| `explosive_paint_black_side` | 626 |  |
| `explosive_paint_black_top` | 627 |  |
| `explosive_paint_blue_side` | 624 |  |
| `explosive_paint_blue_top` | 625 |  |
| `explosive_paint_brown_side` | 622 |  |
| `explosive_paint_brown_top` | 623 |  |
| `explosive_paint_cyan_side` | 620 |  |
| `explosive_paint_cyan_top` | 621 |  |
| `explosive_paint_gray_side` | 618 |  |
| `explosive_paint_gray_top` | 619 |  |
| `explosive_paint_green_side` | 616 |  |
| `explosive_paint_green_top` | 617 |  |
| `explosive_paint_light_blue_side` | 614 |  |
| `explosive_paint_light_blue_top` | 615 |  |
| `explosive_paint_light_gray_side` | 612 |  |
| `explosive_paint_light_gray_top` | 613 |  |
| `explosive_paint_lime_side` | 610 |  |
| `explosive_paint_lime_top` | 611 |  |
| `explosive_paint_magenta_side` | 608 |  |
| `explosive_paint_magenta_top` | 609 |  |
| `explosive_paint_orange_side` | 606 |  |
| `explosive_paint_orange_top` | 607 |  |
| `explosive_paint_pink_side` | 604 |  |
| `explosive_paint_pink_top` | 605 |  |
| `explosive_paint_purple_side` | 602 |  |
| `explosive_paint_purple_top` | 603 |  |
| `explosive_paint_quick_black` | 643 |  |
| `explosive_paint_quick_blue` | 642 |  |
| `explosive_paint_quick_brown` | 641 |  |
| `explosive_paint_quick_cyan` | 640 |  |
| `explosive_paint_quick_gray` | 639 |  |
| `explosive_paint_quick_green` | 638 |  |
| `explosive_paint_quick_light_blue` | 637 |  |
| `explosive_paint_quick_light_gray` | 636 |  |
| `explosive_paint_quick_lime` | 635 |  |
| `explosive_paint_quick_magenta` | 634 |  |
| `explosive_paint_quick_orange` | 633 |  |
| `explosive_paint_quick_pink` | 632 |  |
| `explosive_paint_quick_purple` | 631 |  |
| `explosive_paint_quick_red` | 630 |  |
| `explosive_paint_quick_white` | 629 |  |
| `explosive_paint_quick_yellow` | 628 |  |
| `explosive_paint_red_side` | 600 |  |
| `explosive_paint_red_top` | 601 |  |
| `explosive_paint_seeking_black` | 659 |  |
| `explosive_paint_seeking_blue` | 658 |  |
| `explosive_paint_seeking_brown` | 657 |  |
| `explosive_paint_seeking_cyan` | 656 |  |
| `explosive_paint_seeking_gray` | 655 |  |
| `explosive_paint_seeking_green` | 654 |  |
| `explosive_paint_seeking_light_blue` | 653 |  |
| `explosive_paint_seeking_light_gray` | 652 |  |
| `explosive_paint_seeking_lime` | 651 |  |
| `explosive_paint_seeking_magenta` | 650 |  |
| `explosive_paint_seeking_orange` | 649 |  |
| `explosive_paint_seeking_pink` | 648 |  |
| `explosive_paint_seeking_purple` | 647 |  |
| `explosive_paint_seeking_red` | 646 |  |
| `explosive_paint_seeking_white` | 645 |  |
| `explosive_paint_seeking_yellow` | 644 |  |
| `explosive_paint_sticky_black` | 675 |  |
| `explosive_paint_sticky_blue` | 674 |  |
| `explosive_paint_sticky_brown` | 673 |  |
| `explosive_paint_sticky_cyan` | 672 |  |
| `explosive_paint_sticky_gray` | 671 |  |
| `explosive_paint_sticky_green` | 670 |  |
| `explosive_paint_sticky_light_blue` | 669 |  |
| `explosive_paint_sticky_light_gray` | 668 |  |
| `explosive_paint_sticky_lime` | 667 |  |
| `explosive_paint_sticky_magenta` | 666 |  |
| `explosive_paint_sticky_orange` | 665 |  |
| `explosive_paint_sticky_pink` | 664 |  |
| `explosive_paint_sticky_purple` | 663 |  |
| `explosive_paint_sticky_red` | 662 |  |
| `explosive_paint_sticky_white` | 661 |  |
| `explosive_paint_sticky_yellow` | 660 |  |
| `explosive_paint_white_side` | 598 |  |
| `explosive_paint_white_top` | 599 |  |
| `explosive_paint_yellow_side` | 596 |  |
| `explosive_paint_yellow_top` | 597 |  |
| `extra_compressed_messy_stone` | 531 |  |
| `fallen_cherry_leaves_side` | 586 |  |
| `fallen_maple_leaves_side` | 478 |  |
| `farmland` | 433 |  |
| `fast_belt_slab_side` | 1157 |  |
| `fast_belt_top` | 1156 |  |
| `fast_belt_turn_left` | 1173 |  |
| `fast_belt_turn_right` | 1174 |  |
| `fertilised_soil` | 926 |  |
| `finish_block` | 812 |  |
| `fireball_block` | 539 |  |
| `food_lucky_block` | 1007 |  |
| `food_lucky_block_rare` | 1009 |  |
| `food_lucky_block_super` | 1011 |  |
| `forge_hopper_top` | 1168 |  |
| `furnace_front` | 335 |  |
| `furnace_side` | 336 |  |
| `furnace_top` | 337 |  |
| `generator_side` | 1063 |  |
| `generator_side_running` | 30 | animated (4 frames) |
| `generator_top` | 1064 |  |
| `ghost_chest_back` | 956 |  |
| `ghost_chest_front` | 953 |  |
| `ghost_chest_side` | 954 |  |
| `ghost_chest_top` | 955 |  |
| `ghost_lucky_block` | 957 |  |
| `ghost_mystery_block` | 958 |  |
| `glass` | 294 |  |
| `glass_black` | 295 |  |
| `glass_blue` | 296 |  |
| `glass_brown` | 297 |  |
| `glass_cyan` | 298 |  |
| `glass_gray` | 299 |  |
| `glass_green` | 301 |  |
| `glass_light_blue` | 302 |  |
| `glass_light_gray` | 300 |  |
| `glass_lime` | 303 |  |
| `glass_magenta` | 304 |  |
| `glass_orange` | 305 |  |
| `glass_pink` | 306 |  |
| `glass_purple` | 307 |  |
| `glass_red` | 308 |  |
| `glass_silver` | 311 |  |
| `glass_white` | 309 |  |
| `glass_yellow` | 310 |  |
| `glowstone` | 331 |  |
| `gold_block` | 235 |  |
| `gold_deposit` | 1036 |  |
| `gold_ore` | 229 |  |
| `granite_brick` | 467 |  |
| `grass_block_side` | 192 |  |
| `grass_top` | 193 |  |
| `gravel` | 196 |  |
| `gray_concrete` | 271 |  |
| `gray_gen_spawn_coal` | 792 |  |
| `gray_gen_spawn_iron` | 793 |  |
| `gray_gen_spawn_top` | 791 |  |
| `gray_glazed_terracotta` | 397 | turned (4 rotated copies) |
| `gray_planks` | 358 |  |
| `gray_portal` | 6 | animated (4 frames) |
| `gray_spawn_block_side` | 740 |  |
| `gray_spawn_block_top` | 736 | turned (4 rotated copies) |
| `green_bricks` | 459 |  |
| `green_concrete` | 285 |  |
| `green_glazed_terracotta` | 421 | turned (4 rotated copies) |
| `green_lucky_block` | 1006 |  |
| `green_lucky_block_rare` | 1008 |  |
| `green_lucky_block_super` | 1010 |  |
| `green_planks` | 364 |  |
| `green_portal` | 7 | animated (4 frames) |
| `green_spawn_block_side` | 735 |  |
| `green_spawn_block_top` | 731 | turned (4 rotated copies) |
| `green_stone` | 458 |  |
| `grenade_block` | 581 |  |
| `grey_portal` | 8 | animated (4 frames) |
| `gun_lucky_block` | 952 |  |
| `hardened_clay` | 254 |  |
| `hardened_clay_stained_black` | 270 |  |
| `hardened_clay_stained_blue` | 266 |  |
| `hardened_clay_stained_brown` | 267 |  |
| `hardened_clay_stained_cyan` | 264 |  |
| `hardened_clay_stained_gray` | 262 |  |
| `hardened_clay_stained_green` | 268 |  |
| `hardened_clay_stained_light_blue` | 258 |  |
| `hardened_clay_stained_lime` | 260 |  |
| `hardened_clay_stained_magenta` | 257 |  |
| `hardened_clay_stained_orange` | 256 |  |
| `hardened_clay_stained_pink` | 261 |  |
| `hardened_clay_stained_purple` | 265 |  |
| `hardened_clay_stained_red` | 269 |  |
| `hardened_clay_stained_silver` | 263 |  |
| `hardened_clay_stained_white` | 255 |  |
| `hardened_clay_stained_yellow` | 259 |  |
| `harvester_bottom` | 969 |  |
| `harvester_lunite_bottom` | 977 |  |
| `harvester_lunite_side_0` | 974 |  |
| `harvester_lunite_side_1` | 975 |  |
| `harvester_lunite_top` | 976 |  |
| `harvester_side0` | 966 |  |
| `harvester_side1` | 967 |  |
| `harvester_top` | 968 |  |
| `hay_block_side` | 328 |  |
| `homestead_core` | 1037 |  |
| `homestead_core_cap` | 1122 |  |
| `homestead_core_crown` | 1121 |  |
| `homestead_core_mid` | 26 | animated (4 frames) |
| `hyper_compressed_messy_stone` | 533 |  |
| `ice` | 326 |  |
| `ice_brick` | 468 |  |
| `iceball_block` | 540 |  |
| `invisible_solid` | 314 |  |
| `iron_block` | 234 |  |
| `iron_chest_back` | 917 |  |
| `iron_chest_front` | 911 |  |
| `iron_chest_side` | 912 |  |
| `iron_chest_top` | 913 | turned (4 rotated copies) |
| `iron_deposit` | 1033 |  |
| `iron_ore` | 228 |  |
| `iron_watermelon_side` | 546 |  |
| `iron_watermelon_top` | 547 |  |
| `jungle_grass_block` | 889 |  |
| `jungle_grass_block_side` | 888 |  |
| `lapis_block` | 236 |  |
| `lapis_ore` | 230 |  |
| `lava` | 1 | animated (8 frames) |
| `leather_block_side` | 908 |  |
| `leather_block_top` | 909 |  |
| `leaves_aspen` | 288 |  |
| `leaves_aspen_autumn` | 910 |  |
| `leaves_cedar` | 470 |  |
| `leaves_cherry` | 585 |  |
| `leaves_cherry_fruity` | 906 |  |
| `leaves_jungle` | 290 |  |
| `leaves_mango` | 894 |  |
| `leaves_mango_fruity` | 907 |  |
| `leaves_maple` | 289 |  |
| `leaves_maple_autumn` | 477 |  |
| `leaves_maple_fruity` | 901 |  |
| `leaves_palm` | 471 |  |
| `leaves_palm_fruity` | 904 |  |
| `leaves_pear` | 525 |  |
| `leaves_pear_fruity` | 905 |  |
| `leaves_pine` | 287 |  |
| `leaves_pine_cone` | 902 |  |
| `leaves_plum` | 469 |  |
| `leaves_plum_fruity` | 903 |  |
| `leaves_spectral` | 831 |  |
| `light_blue_concrete` | 277 |  |
| `light_blue_glazed_terracotta` | 381 | turned (4 rotated copies) |
| `light_blue_lucky_block` | 933 |  |
| `light_blue_planks` | 354 |  |
| `light_blue_spawn_block_side` | 730 |  |
| `light_blue_spawn_block_top` | 726 | turned (4 rotated copies) |
| `light_gray_concrete` | 272 |  |
| `light_gray_glazed_terracotta` | 401 | turned (4 rotated copies) |
| `light_gray_planks` | 359 |  |
| `light_gray_spawn_block_side` | 725 |  |
| `light_gray_spawn_block_top` | 721 | turned (4 rotated copies) |
| `lightblue_portal` | 9 | animated (4 frames) |
| `lightgray_portal` | 10 | animated (4 frames) |
| `lime_concrete` | 278 |  |
| `lime_gen_spawn_coal` | 777 |  |
| `lime_gen_spawn_iron` | 778 |  |
| `lime_gen_spawn_top` | 776 |  |
| `lime_glazed_terracotta` | 389 | turned (4 rotated copies) |
| `lime_planks` | 356 |  |
| `lime_portal` | 11 | animated (4 frames) |
| `lime_spawn_block_side` | 720 |  |
| `lime_spawn_block_top` | 716 | turned (4 rotated copies) |
| `log_ancient_maple` | 1021 |  |
| `log_aspen` | 202 |  |
| `log_cedar` | 201 |  |
| `log_cherry` | 582 |  |
| `log_jungle` | 203 |  |
| `log_mango` | 891 |  |
| `log_maple` | 198 |  |
| `log_palm` | 472 |  |
| `log_pear` | 523 |  |
| `log_pine` | 199 |  |
| `log_plum` | 200 |  |
| `log_spectral` | 828 |  |
| `lucky_block_pink_question` | 959 |  |
| `lucky_block_pink_question_rare` | 1013 |  |
| `lucky_block_pink_question_super` | 1015 |  |
| `lunite_block` | 971 |  |
| `lunite_ore` | 970 |  |
| `machine_bench_side` | 1115 |  |
| `machine_bench_top` | 1116 |  |
| `machine_side` | 1039 |  |
| `magenta_concrete` | 279 |  |
| `magenta_glazed_terracotta` | 377 | turned (4 rotated copies) |
| `magenta_planks` | 353 |  |
| `magenta_portal` | 12 | animated (4 frames) |
| `magenta_spawn_block_side` | 715 |  |
| `magenta_spawn_block_top` | 711 | turned (4 rotated copies) |
| `magma` | 451 |  |
| `mailbox_front` | 571 |  |
| `mailbox_front_full` | 573 |  |
| `mailbox_side` | 572 |  |
| `mango_block_bottom` | 898 |  |
| `mango_block_side` | 896 |  |
| `mango_block_top` | 897 |  |
| `mega_compressed_messy_stone` | 535 |  |
| `melon_side` | 544 |  |
| `melon_top` | 545 |  |
| `melting_ice` | 595 |  |
| `messy_stone` | 216 |  |
| `mob_spawner_block_empty_side` | 823 |  |
| `mob_spawner_block_top` | 821 |  |
| `mob_spawner_hostile_block_side` | 822 |  |
| `mob_spawner_neutral_block_side` | 838 |  |
| `mob_spawner_passive_block_side` | 820 |  |
| `moonstone_block` | 450 |  |
| `moonstone_chest_back` | 449 |  |
| `moonstone_chest_front` | 443 |  |
| `moonstone_chest_side` | 444 |  |
| `moonstone_chest_top` | 445 | turned (4 rotated copies) |
| `moonstone_explosive_side` | 332 |  |
| `moonstone_explosive_top` | 333 |  |
| `moonstone_gen_spawn_side` | 809 |  |
| `moonstone_gen_spawn_top` | 808 |  |
| `moonstone_ore` | 442 |  |
| `mossy_cobblestone` | 438 |  |
| `mushroom_stem` | 538 |  |
| `mystery_block` | 578 |  |
| `neon_black` | 951 |  |
| `neon_blue` | 950 |  |
| `neon_brown` | 949 |  |
| `neon_cyan` | 948 |  |
| `neon_gray` | 947 |  |
| `neon_green` | 946 |  |
| `neon_light_blue` | 945 |  |
| `neon_light_gray` | 944 |  |
| `neon_lime` | 943 |  |
| `neon_magenta` | 942 |  |
| `neon_orange` | 941 |  |
| `neon_pink` | 940 |  |
| `neon_purple` | 939 |  |
| `neon_red` | 938 |  |
| `neon_white` | 937 |  |
| `neon_yellow` | 936 |  |
| `nether_brick` | 317 |  |
| `netherrack` | 318 |  |
| `obby_absorb_block` | 816 |  |
| `obby_absorb_death_block` | 817 |  |
| `obby_death_block` | 815 |  |
| `obsidian` | 327 |  |
| `orange_concrete` | 280 |  |
| `orange_glazed_terracotta` | 373 | turned (4 rotated copies) |
| `orange_lucky_block` | 1000 |  |
| `orange_lucky_block_rare` | 1002 |  |
| `orange_lucky_block_super` | 1004 |  |
| `orange_planks` | 352 |  |
| `orange_portal` | 13 | animated (4 frames) |
| `orange_spawn_block_side` | 710 |  |
| `orange_spawn_block_top` | 706 | turned (4 rotated copies) |
| `ore_gen_spawn_side` | 811 |  |
| `ore_gen_spawn_top` | 810 |  |
| `packed_snow` | 826 |  |
| `parts_bench_side` | 1117 |  |
| `parts_bench_top` | 1118 |  |
| `patterned_glass_black` | 548 |  |
| `patterned_glass_blue` | 549 |  |
| `patterned_glass_brown` | 550 |  |
| `patterned_glass_cyan` | 551 |  |
| `patterned_glass_gray` | 552 |  |
| `patterned_glass_green` | 554 |  |
| `patterned_glass_light_blue` | 555 |  |
| `patterned_glass_light_gray` | 553 |  |
| `patterned_glass_lime` | 556 |  |
| `patterned_glass_magenta` | 557 |  |
| `patterned_glass_orange` | 558 |  |
| `patterned_glass_pink` | 559 |  |
| `patterned_glass_purple` | 560 |  |
| `patterned_glass_red` | 561 |  |
| `patterned_glass_white` | 562 |  |
| `patterned_glass_yellow` | 563 |  |
| `pear_block_bottom` | 529 |  |
| `pear_block_side` | 527 |  |
| `pear_block_top` | 528 |  |
| `pet_lucky_block` | 960 |  |
| `pine_cone_block_side` | 836 |  |
| `pine_cone_block_top` | 837 |  |
| `pine_grass_block` | 834 |  |
| `pine_grass_block_side` | 833 |  |
| `pink_concrete` | 281 |  |
| `pink_gen_spawn_coal` | 789 |  |
| `pink_gen_spawn_iron` | 790 |  |
| `pink_gen_spawn_top` | 788 |  |
| `pink_glazed_terracotta` | 393 | turned (4 rotated copies) |
| `pink_planks` | 357 |  |
| `pink_portal` | 14 | animated (4 frames) |
| `pink_spawn_block_side` | 705 |  |
| `pink_spawn_block_top` | 701 | turned (4 rotated copies) |
| `planks_aspen` | 205 |  |
| `planks_cedar` | 209 |  |
| `planks_cherry` | 584 |  |
| `planks_jungle` | 207 |  |
| `planks_mango` | 893 |  |
| `planks_maple` | 204 |  |
| `planks_palm` | 473 |  |
| `planks_pear` | 524 |  |
| `planks_pine` | 208 |  |
| `planks_plum` | 206 |  |
| `planks_spectral` | 830 |  |
| `plum_block_bottom` | 519 |  |
| `plum_block_side` | 517 |  |
| `plum_block_top` | 518 |  |
| `podzol_top` | 452 |  |
| `potato_block` | 922 |  |
| `potion_lucky_block` | 1012 |  |
| `potion_lucky_block_rare` | 1014 |  |
| `potion_lucky_block_super` | 1016 |  |
| `press_back` | 1071 |  |
| `press_front` | 1065 |  |
| `press_side` | 1066 |  |
| `press_side_running` | 31 | animated (4 frames) |
| `press_top` | 1067 | turned (4 rotated copies) |
| `protector` | 348 |  |
| `protector_faction` | 575 |  |
| `protector_tribe` | 574 |  |
| `pumpkin_face_on` | 291 |  |
| `pumpkin_side` | 541 |  |
| `pumpkin_top` | 542 |  |
| `pure_coal_ore` | 1024 |  |
| `pure_copper_ore` | 1204 |  |
| `pure_diamond_ore` | 1027 |  |
| `pure_gold_ore` | 1026 |  |
| `pure_iron_ore` | 1025 |  |
| `pure_moonstone_ore` | 1028 |  |
| `pure_voltite_ore` | 1205 |  |
| `purple_concrete` | 282 |  |
| `purple_glazed_terracotta` | 409 | turned (4 rotated copies) |
| `purple_lucky_block` | 988 |  |
| `purple_lucky_block_rare` | 990 |  |
| `purple_lucky_block_super` | 992 |  |
| `purple_planks` | 361 |  |
| `purple_portal` | 15 | animated (4 frames) |
| `purple_spawn_block_side` | 700 |  |
| `purple_spawn_block_top` | 696 | turned (4 rotated copies) |
| `quartz_block_chiseled` | 320 |  |
| `quartz_block_side` | 319 |  |
| `radar_bottom` | 929 |  |
| `radar_screen` | 19 | animated (4 frames) · turned (4 rotated copies) |
| `radar_side_active` | 927 |  |
| `radar_side_inactive` | 930 |  |
| `radar_top_active` | 928 |  |
| `radar_top_inactive` | 931 |  |
| `recycler_back` | 1181 |  |
| `recycler_front` | 1175 |  |
| `recycler_side` | 1176 |  |
| `recycler_side_running` | 43 | animated (4 frames) |
| `recycler_top` | 1177 | turned (4 rotated copies) |
| `red_concrete` | 283 |  |
| `red_gen_spawn_coal` | 771 |  |
| `red_gen_spawn_iron` | 772 |  |
| `red_gen_spawn_top` | 770 |  |
| `red_glazed_terracotta` | 425 | turned (4 rotated copies) |
| `red_lucky_block` | 934 |  |
| `red_lucky_block_rare` | 984 |  |
| `red_lucky_block_super` | 986 |  |
| `red_mushroom_block` | 537 |  |
| `red_planks` | 365 |  |
| `red_portal` | 16 | animated (4 frames) |
| `red_sand` | 474 |  |
| `red_sandstone` | 454 |  |
| `red_sandstone_brick` | 475 |  |
| `red_sandstone_top` | 455 |  |
| `red_spawn_block_side` | 695 |  |
| `red_spawn_block_top` | 691 | turned (4 rotated copies) |
| `redstone_lamp_off` | 313 |  |
| `redstone_lamp_on` | 312 |  |
| `rocket_block` | 579 |  |
| `rocky_dirt` | 476 |  |
| `rope_block` | 1030 |  |
| `sand` | 194 |  |
| `sandstone_brick` | 461 |  |
| `sandstone_normal` | 225 |  |
| `sandstone_top` | 324 |  |
| `shatter_mill_back` | 1147 |  |
| `shatter_mill_front` | 1141 |  |
| `shatter_mill_side` | 1142 |  |
| `shatter_mill_side_running` | 40 | animated (4 frames) |
| `shatter_mill_top` | 1143 | turned (4 rotated copies) |
| `shop_trader_spawn_face` | 799 |  |
| `shop_trader_spawn_side` | 798 |  |
| `shop_trader_spawn_top` | 794 | turned (4 rotated copies) |
| `shop_wizard_spawn_face` | 805 |  |
| `shop_wizard_spawn_side` | 804 |  |
| `shop_wizard_spawn_top` | 800 | turned (4 rotated copies) |
| `sky_tap_back` | 1155 |  |
| `sky_tap_bottom` | 1154 |  |
| `sky_tap_front` | 1148 |  |
| `sky_tap_side` | 1149 |  |
| `sky_tap_side_running` | 41 | animated (4 frames) |
| `sky_tap_top` | 1150 | turned (4 rotated copies) |
| `slab_andesite_brick_side` | 498 |  |
| `slab_aspen_side` | 483 |  |
| `slab_brick_side` | 515 |  |
| `slab_cedar_side` | 482 |  |
| `slab_cherry_side` | 587 |  |
| `slab_chiseled_red_sandstone_side` | 512 |  |
| `slab_chiseled_sandstone_side` | 508 |  |
| `slab_cobblestone_side` | 488 |  |
| `slab_cut_red_sandstone_side` | 513 |  |
| `slab_cut_sandstone_side` | 509 |  |
| `slab_diorite_brick_side` | 502 |  |
| `slab_dirt_side` | 486 |  |
| `slab_dry_grass_top_side` | 981 |  |
| `slab_engraved_andesite_side` | 497 |  |
| `slab_engraved_diorite_side` | 501 |  |
| `slab_engraved_granite_side` | 505 |  |
| `slab_granite_brick_side` | 506 |  |
| `slab_grass_top_side` | 487 |  |
| `slab_ice_brick_side` | 516 |  |
| `slab_jungle_grass_top_side` | 890 |  |
| `slab_jungle_side` | 484 |  |
| `slab_mango_side` | 895 |  |
| `slab_maple_side` | 479 |  |
| `slab_mossy_cobblestone_side` | 493 |  |
| `slab_palm_side` | 485 |  |
| `slab_pear_side` | 526 |  |
| `slab_pine_grass_top_side` | 835 |  |
| `slab_pine_side` | 480 |  |
| `slab_plum_side` | 481 |  |
| `slab_red_sandstone_brick_side` | 514 |  |
| `slab_red_sandstone_side` | 511 |  |
| `slab_sandstone_brick_side` | 510 |  |
| `slab_sandstone_normal_side` | 507 |  |
| `slab_smooth_stone_side` | 490 |  |
| `slab_spectral_side` | 832 |  |
| `slab_stone_andesite_side` | 495 |  |
| `slab_stone_andesite_smooth_side` | 496 |  |
| `slab_stone_diorite_side` | 499 |  |
| `slab_stone_diorite_smooth_side` | 500 |  |
| `slab_stone_granite_side` | 503 |  |
| `slab_stone_granite_smooth_side` | 504 |  |
| `slab_stone_side` | 489 |  |
| `slab_stonebrick_carved_side` | 491 |  |
| `slab_stonebrick_mossy_side` | 494 |  |
| `slab_stonebrick_side` | 492 |  |
| `smelter_back` | 1062 |  |
| `smelter_front` | 1056 |  |
| `smelter_side` | 1057 |  |
| `smelter_side_running` | 29 | animated (4 frames) |
| `smelter_top` | 1058 | turned (4 rotated copies) |
| `smoke` | 23 | animated (4 frames) |
| `smooth_stone` | 218 |  |
| `snow` | 197 |  |
| `snowy_messy_stone` | 824 |  |
| `snowy_messy_stone_side` | 825 |  |
| `solar_panel_bottom` | 965 |  |
| `solar_panel_side` | 963 |  |
| `solar_panel_top` | 964 |  |
| `sorting_gate_slab_side` | 1108 |  |
| `sorting_gate_top` | 1107 |  |
| `splitter_slab_side` | 1083 |  |
| `splitter_top` | 1082 |  |
| `sponge` | 329 |  |
| `starframe` | 1167 |  |
| `stone` | 217 |  |
| `stone_andesite` | 221 |  |
| `stone_andesite_smooth` | 222 |  |
| `stone_deposit` | 1034 |  |
| `stone_diorite` | 219 |  |
| `stone_diorite_smooth` | 220 |  |
| `stone_granite` | 223 |  |
| `stone_granite_smooth` | 224 |  |
| `stonebrick` | 316 |  |
| `stonebrick_carved` | 321 |  |
| `stonebrick_cracked` | 323 |  |
| `stonebrick_mossy` | 322 |  |
| `storage_silo_side` | 1112 |  |
| `storage_silo_top` | 1111 |  |
| `stripped_aspen_log` | 211 |  |
| `stripped_cedar_log` | 215 |  |
| `stripped_cherry_log` | 583 |  |
| `stripped_jungle_log` | 213 |  |
| `stripped_mango_log` | 892 |  |
| `stripped_maple_log` | 210 |  |
| `stripped_palm_log` | 576 |  |
| `stripped_pear_log` | 577 |  |
| `stripped_pine_log` | 214 |  |
| `stripped_plum_log` | 212 |  |
| `stripped_spectral_log` | 829 |  |
| `super_compressed_messy_stone` | 532 |  |
| `super_rocket_block` | 580 |  |
| `tool_bench_side` | 1119 |  |
| `tool_bench_top` | 1120 |  |
| `tools_lucky_block` | 1001 |  |
| `tools_lucky_block_rare` | 1003 |  |
| `tools_lucky_block_super` | 1005 |  |
| `toxic_waste` | 25 | animated (8 frames) |
| `toxic_waste_barrel_bottom` | 1020 |  |
| `toxic_waste_barrel_side` | 1019 |  |
| `toxic_waste_barrel_top` | 24 | animated (4 frames) |
| `toxin_ball_block` | 680 |  |
| `tree_cutter_back` | 1129 |  |
| `tree_cutter_back_running` | 37 | animated (4 frames) |
| `tree_cutter_front` | 1123 |  |
| `tree_cutter_side` | 1124 |  |
| `tree_cutter_side_running` | 36 | animated (4 frames) |
| `tree_cutter_top` | 1125 | turned (4 rotated copies) |
| `ultra_compressed_messy_stone` | 534 |  |
| `unloaded` | 189 |  |
| `volt_engine_side` | 1131 |  |
| `volt_engine_side_running` | 38 | animated (4 frames) |
| `volt_engine_top` | 1132 |  |
| `voltite_deposit` | 1130 |  |
| `voltite_ore` | 1084 |  |
| `watermelon_side` | 292 |  |
| `watermelon_top` | 293 |  |
| `weapon_lucky_block` | 935 |  |
| `weapon_lucky_block_rare` | 985 |  |
| `weapon_lucky_block_super` | 987 |  |
| `white_concrete` | 284 |  |
| `white_gen_spawn_coal` | 786 |  |
| `white_gen_spawn_iron` | 787 |  |
| `white_gen_spawn_top` | 785 |  |
| `white_glazed_terracotta` | 369 | turned (4 rotated copies) |
| `white_planks` | 351 |  |
| `white_portal` | 17 | animated (4 frames) |
| `white_spawn_block_side` | 690 |  |
| `white_spawn_block_top` | 686 | turned (4 rotated copies) |
| `wire_mill_back` | 1078 |  |
| `wire_mill_front` | 1072 |  |
| `wire_mill_side` | 1073 |  |
| `wire_mill_side_running` | 32 | animated (4 frames) |
| `wire_mill_top` | 1074 | turned (4 rotated copies) |
| `wool_colored_black` | 253 |  |
| `wool_colored_blue` | 249 |  |
| `wool_colored_brown` | 250 |  |
| `wool_colored_cyan` | 247 |  |
| `wool_colored_gray` | 245 |  |
| `wool_colored_green` | 251 |  |
| `wool_colored_light_blue` | 241 |  |
| `wool_colored_light_grey` | 246 |  |
| `wool_colored_lime` | 243 |  |
| `wool_colored_magenta` | 240 |  |
| `wool_colored_orange` | 239 |  |
| `wool_colored_pink` | 244 |  |
| `wool_colored_purple` | 248 |  |
| `wool_colored_red` | 252 |  |
| `wool_colored_white` | 238 |  |
| `wool_colored_yellow` | 242 |  |
| `yellow_concrete` | 286 |  |
| `yellow_gen_spawn_coal` | 780 |  |
| `yellow_gen_spawn_iron` | 781 |  |
| `yellow_gen_spawn_top` | 779 |  |
| `yellow_glazed_terracotta` | 385 | turned (4 rotated copies) |
| `yellow_lucky_block` | 932 |  |
| `yellow_lucky_block_rare` | 982 |  |
| `yellow_lucky_block_super` | 983 |  |
| `yellow_planks` | 355 |  |
| `yellow_portal` | 18 | animated (4 frames) |
| `yellow_spawn_block_side` | 685 |  |
| `yellow_spawn_block_top` | 681 | turned (4 rotated copies) |

### 68.3 Повёрнутые семейства (57 корней)

Эти текстуры существуют только как заранее повёрнутые копии (`name[rot[1..4`); реестр сворачивает их к корню, а `bloxdTexel` заново применяет поворот (§57.4).

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
- `radar_screen0` (id 19) · also animated
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

### 68.4 Анимированные семейства (42 имени)

Сэмплирование этих имён автоматически возвращает текущий кадр анимации (§63.3) — кадровые суффиксы являются ошибкой.

| Имя | Кадры | База реестра |
|---|---|---|
| `lava` | 8 | `lava0` |
| `toxic_waste` | 8 | `toxic_waste0` |
| `alloy_kiln_side_running` | 4 | `alloy_kiln_side_running0` |
| `auto_bench_side_running` | 4 | `auto_bench_side_running0` |
| `black_portal` | 4 | `black_portal0` |
| `blue_portal` | 4 | `blue_portal0` |
| `brown_portal` | 4 | `brown_portal0` |
| `burner_drill_side_running` | 4 | `burner_drill_side_running0` |
| `crop_harvester_back_running` | 4 | `crop_harvester_back_running0` |
| `crop_harvester_side_running` | 4 | `crop_harvester_side_running0` |
| `crusher_side_running` | 4 | `crusher_side_running0` |
| `crystal_vat_side_running` | 4 | `crystal_vat_side_running0` |
| `cyan_portal` | 4 | `cyan_portal0` |
| `deep_drill_side_running` | 4 | `deep_drill_side_running0` |
| `electric_drill_side_running` | 4 | `electric_drill_side_running0` |
| `generator_side_running` | 4 | `generator_side_running0` |
| `gray_portal` | 4 | `gray_portal0` |
| `green_portal` | 4 | `green_portal0` |
| `grey_portal` | 4 | `grey_portal0` |
| `homestead_core_mid` | 4 | `homestead_core_mid0` |
| `lightblue_portal` | 4 | `lightblue_portal0` |
| `lightgray_portal` | 4 | `lightgray_portal0` |
| `lime_portal` | 4 | `lime_portal0` |
| `magenta_portal` | 4 | `magenta_portal0` |
| `orange_portal` | 4 | `orange_portal0` |
| `pink_portal` | 4 | `pink_portal0` |
| `press_side_running` | 4 | `press_side_running0` |
| `purple_portal` | 4 | `purple_portal0` |
| `radar_screen` | 4 | `radar_screen0[rot[1` |
| `recycler_side_running` | 4 | `recycler_side_running0` |
| `red_portal` | 4 | `red_portal0` |
| `shatter_mill_side_running` | 4 | `shatter_mill_side_running0` |
| `sky_tap_side_running` | 4 | `sky_tap_side_running0` |
| `smelter_side_running` | 4 | `smelter_side_running0` |
| `smoke` | 4 | `smoke0` |
| `toxic_waste_barrel_top` | 4 | `toxic_waste_barrel_top0` |
| `tree_cutter_back_running` | 4 | `tree_cutter_back_running0` |
| `tree_cutter_side_running` | 4 | `tree_cutter_side_running0` |
| `volt_engine_side_running` | 4 | `volt_engine_side_running0` |
| `white_portal` | 4 | `white_portal0` |
| `wire_mill_side_running` | 4 | `wire_mill_side_running0` |
| `yellow_portal` | 4 | `yellow_portal0` |

### 68.5 Дрейф реестра, измерено (sjr0p7 → cnty9)

Два билда, измеренных в октябре с интервалом в десять дней:

- Entries: 1,200 → 1,219 (98 added, 79 removed)
- Names that kept their spelling: 1,121 — of which **779 changed id** (69%)
- A naming convention migrated mid-month: 68 `_rot1..4` suffix names became `[rot[1..4` slots, and the double-chest textures (`chest_double_*`, 8 entries) appeared with them
- The usable-name count moved 900 → 905, and the registry hash in `HEADER_VERSION` (§65.1) re-invalidated every saved pack that had baked ids

Write `bloxdTextureIdLava`, not `19` — a name-constant survives every one of those bullets unchanged.

[← Previous part](10-apiv4.md)·[Back to the manual](README.md)
