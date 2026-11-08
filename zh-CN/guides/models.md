# 模型与纹理

> 目标API: 5 · 目标构建: `v98qt8` (2026-11-08 生产与preprod确认) · 状态: Analyzed (从标头与验证器复原)

v5 新的 Model 钩子绘制与读取什么。

## Model 程序绘制什么

- **方块模型**: 半砖 (`slab`)、楼梯 (`stairs`)、交叉平面植物 — 高草、花、作物、蜘蛛网 (`flat`)
- **物品**: 手持 (`held`)、掉落 (`dropped`)、投掷 (`thrown` — 雪球、箭、火箭)
- **实体**: 玩家、生物、NPC (`lifeform`) — **含盔甲与外观装饰**

地形 (完整方块) 与 Liquid (水) 永远不进入该程序。

## 读取有什么不同

模型面携带三样地形面上从不出现的东西：

| 信息 | 字段 | 地形上的值 |
|---|---|---|
| 模型局部坐标 | `localPosition: vec3f` | `vec3f(0.0)` (无模型) |
| 附魔状态 | `enchantTier` / `enchantColour` / `enchantSpeed` | 全 0 |
| 实体覆盖色 | `overlayColour` | 0 |

而且**纹理的含义不同**: 地形面携带图集 `textureId`，但**大多数模型用 `textureId: 0`** («无纹理») — 玩家皮肤与生物纹理不在图集命名空间中。`surface.colour` 已含皮肤 × tint，请以它为起点 ([模型自带纹理](../api/texture-api.md#模型自带纹理-textureid-0))。

`flags` 的 `held` / `dropped` / `thrown` / `lifeform` / `placed` 只在模型面上有意义 ([标志](../api/flags.md))。

## localPosition

模型实例局部坐标，位于世界放置**之前**；terrain/liquid 为 `vec3f(0.0)`。

- 对玩家手臂、手持剑或风车叶片，它随模型旋转
- **按部件分动画与弯曲效果**变成一次字段读取 —「我在剑刃多高的位置」直接就是 `localPosition.y`
- 在 light 结构体中它是 **vertex 钩子之后**的值 (标头: *«the same as in BloxdVertexIn, after the vertex hook»*)

## 选取模式

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;   // lift world entities, exclude the hand
    }
    if (surface.flags.held) {
        out.colour *= 1.15;   // brighten the local player's held items
    }
    return out;
}
```

完整示例: [模型着色器配方](../recipes/model-shaders.md)与[附魔效果](../recipes/enchant-effects.md)。

## Terrain / Liquid / Model 速查表

| 想影响什么 | 钩子 | 选取字段 |
|---|---|---|
| 完整方块外观 | `bloxdTerrain*` | 材质标志 (`opaque` / `rock`…) |
| 水 | `bloxdLiquid*` | 永远是 Liquid (无 Liquid 钩子 = 水保持原样) |
| 植物、半砖、楼梯 | `bloxdModel*` | `flags.flat` / `slab` / `stairs` |
| 手持物品 | `bloxdModel*` | `flags.held` |
| 掉落物品 | `bloxdModel*` | `flags.dropped` |
| 投掷物品 | `bloxdModel*` | `flags.thrown` |
| 玩家与生物 | `bloxdModel*` | `flags.lifeform` |

## 光照

`bloxdModelLight` 接收同样的 `BloxdSurface` / `BloxdLightIn`，与 `bloxdDefaultLight` / `bloxdLitColour()` 配合。附魔闪光 (`enchantColour`) 与受伤红闪 (`overlayColour`) 在 `bloxdLitColour` 内混合，因此**默认行为会自动保留这两种观感**；要控制它们见[附魔效果](../recipes/enchant-effects.md)。

## 内部机制

模型如何渲染、标志/附魔输入如何流动: [引擎内部: 模型渲染](../internals/model-rendering.md)；`bloxdSpItemLocalPosition`、`bloxdSpEnchant` 等生成符号列在[限制](../api/restrictions.md)中。
