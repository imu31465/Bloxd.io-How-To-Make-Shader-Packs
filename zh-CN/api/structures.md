# 输入与输出结构体

> 目标API: 5 · 目标构建: `v98qt8` · 状态: Analyzed (从现行标头逐字复原)

包可读写的结构体共七个。每个字段都列在下面 (`#ifdef` 字段为条件存在)。完整标头见[引擎内部](../internals/engine-header.md)。

## BloxdVertexIn (vertex 钩子输入)

```wgsl
struct BloxdVertexIn {
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `position` | `vec3f` | 渲染空间位置 (世界空间经 `bloxdWorldPosition()`) |
| `normal` | `vec3f` | 从面指向外的单位向量 |
| `localPosition` | `vec3f` | 模型局部坐标；**terrain 与 liquid 为 `vec3f(0.0)`**；对玩家手臂、手持剑或风车叶片等，它随模型旋转 |
| `flags` | `BloxdFlags` | 面的种类 ([标志](flags.md)) |

## BloxdVertex (vertex 钩子输出)

```wgsl
struct BloxdVertex {
    position: vec3f,      // The render position output.
}
```

## BloxdSurfaceIn (surface 钩子输入)

```wgsl
struct BloxdSurfaceIn {
    colour: vec3f,        // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,           // Opacity.

    // Enchanted items and armour only, all 0 for anything else.
    enchantTier: u32,     // 1-5 for Tier 1-5.
    enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
    enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.

    // Players and mobs only, 0 for anything else: RGB overlay colour, e.g. the
    // red flash when hurt, and its alpha. bloxdLitColour mixes it into colour.
    overlayColour: vec4f,

    // These mean the same as in BloxdVertexIn, after the vertex hook.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.

    // These are all 0 if the face has no texture. Most models use textureId 0.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `colour` | `vec3f` | RGB = 纹理 × tint × AO，由网格生成器烘焙 |
| `alpha` | `f32` | 不透明度 |
| `enchantTier` | `u32` | 附魔等级 1–5；非附魔为 0 |
| `enchantColour` | `vec4f` | 附魔 RGB 加**带动画**的 alpha (`.a`) — 逐片段读 `.a` 就免费得到流动图样；非附魔面全零 |
| `enchantSpeed` | `f32` | 附魔图样速度 («faster at higher tiers»，等级越高越快) |
| `overlayColour` | `vec4f` | 实体覆盖色 (受伤红闪等) RGB + alpha；玩家/生物以外为 0；由 `bloxdLitColour` 在光照前混入 |
| `position` / `normal` / `localPosition` / `flags` | — | 含义同 `BloxdVertexIn`，但为 **vertex 钩子之后**的值 (跟随移动后的顶点) |
| `textureId` | `u32` | 该面的纹理；与 `bloxdTextureId*` 比较；**无纹理时为 0** — 大多数模型都用 textureId 0 (模型自带纹理、玩家皮肤) |
| `textureRotation` | `u32` | 顺时针四分之一转数 (0–3)，由 `bloxdTexel` 应用 |
| `uv` | `vec2f` | 纹理铺满 0–1；实际绘制 `fract(uv)` (整数步进即平铺) |
| `mipLevel` | `f32` | mipmap 级别: 0 = 全尺寸，1 = 一半… |

## BloxdSurface (surface 钩子输出)

```wgsl
struct BloxdSurface {
    colour: vec3f,        // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,           // Opacity output.
#endif
    emission: vec3f,      // Emissive RGB, added after lighting, before fog.
    enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
    overlayColour: vec4f, // Overlay output, mixed in by bloxdLitColour.
}
```

| 字段 | 类型 | 条件 | 说明 |
|---|---|---|---|
| `colour` | `vec3f` | 总是 | RGB 输出 |
| `alpha` | `f32` | `#ifdef BLOXD_ALPHA` (全部 liquid + 非 strict 的 terrain/model) | 不透明度输出 |
| `emission` | `vec3f` | 总是 | 自发光 RGB — **在光照之后、雾之前加入** |
| `enchantColour` | `vec4f` | 总是 | 附魔输出，由 `bloxdLitColour` 混入 |
| `overlayColour` | `vec4f` | 总是 | 覆盖色输出，由 `bloxdLitColour` 混入 |

`bloxdDefaultSurface` 原样透传 `enchantColour` / `overlayColour`，因此默认外观与 v4 的引擎内部行为一致。自定义光照下把 `out.enchantColour` 置零可去掉附魔闪光；放大 `out.overlayColour.a` 可强调受伤红闪。

## BloxdLightIn (light 钩子输入)

```wgsl
struct BloxdLightIn {
    litColour: vec3f,  // Lit and enchanted RGB colour, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 if none.
    diffuse: vec3f,    // The material's RGB response to directional light.
    emissive: vec3f,   // The material's RGB glow, added to directional light.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 when !bloxdLit().
    skyLight: f32,     // Sky light; 1 when !bloxdLit().
    ambientLightColour: vec3f, // Minimum RGB light; 1 when !bloxdLit().
    skyLightColour: vec3f, // RGB colour of skyLight; 1 when !bloxdLit().
    heldLight: vec3f,  // RGB held light; 0 when !bloxdLit() or no light held.
    fogColour: vec3f,  // The game's RGB fog colour; 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.

    // These are the same as in BloxdSurfaceIn.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

逐字段的含义与在光照数学中的角色: 见[光照](lighting.md)。

**与旧版 API 的差异**: `fogVisibility` (v2–v4) 现为语义相反的 `fogAlpha` (0 = 无雾)；`engineColour` 现为 `litColour`；光照等级的措辞为 «0 when !bloxdLit()»。逐版本字段变更全表: [版本历史](../history/)。

## BloxdLight (light 钩子输出)

```wgsl
struct BloxdLight {
    colour: vec3f, // RGB colour output.
}
```

## BloxdOpaqueBehind (特殊函数返回值)

```wgsl
struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}
```

`bloxdOpaqueBehind()` 的返回值。在液体变体中于 `#ifdef BLOXD_SCENE_DEPTH` 守卫内使用 (v2 中该字段为 `found: bool`)。

## 条件字段 ↔ 宏

| 字段 | 存在条件 | 备注 |
|---|---|---|
| `BloxdSurface.alpha` | `#ifdef BLOXD_ALPHA` | 全部液体变体 + 非 strict 的 terrain/model |
| `bloxdOpaqueBehind()` 调用 | `#ifdef BLOXD_SCENE_DEPTH` | 全部液体变体 |

`BLOXD_STRICT` 控制的是**钩子存在与否** (vertex 钩子)，不是结构体形状。见[预处理器](preprocessor.md)。

## 书写惯例 (回顾)

- 切勿直接构造输出结构体 — 从 `bloxdDefault*` 起步；light 钩子里 `var out = s;` 亦可
- 裸写 `var x: BloxdSurface;` 是验证错误
- 钩子参数只读 — 修改前先复制

## 相关

- [光照](lighting.md) · [标志](flags.md) · [纹理 API](texture-api.md)
