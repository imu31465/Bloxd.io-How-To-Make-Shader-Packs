# 着色器钩子

> 目标API: 5 · 目标构建: `v98qt8` (2026-11-08 生产与preprod确认) · 状态: Verified

包可以接入 **9 个钩子**: 3 个渲染目标 (Terrain / Liquid / Model) × 3 个管线阶段 (Vertex / Surface / Light)。全部可选 — 未定义的钩子回退到引擎默认。

## 钩子一览

| 钩子 | 阶段 | 职责 |
|---|---|---|
| `bloxdTerrainVertex` | terrain · vertex | 地形顶点动画。**strict 游戏中无法运行** |
| `bloxdTerrainSurface` | terrain · surface | 地形颜色、alpha、自发光、附魔、覆盖色 |
| `bloxdTerrainLight` | terrain · light | 地形最终颜色 — 片段的最后阶段 |
| `bloxdLiquidVertex` | liquid · vertex | 水面顶点动画。**必须加 strict 守卫** |
| `bloxdLiquidSurface` | liquid · surface | 水的颜色、alpha、自发光 |
| `bloxdLiquidLight` | liquid · light | 水的最终颜色 |
| `bloxdModelVertex` | model · vertex | 方块模型 / 物品 / 实体顶点动画。**必须加 strict 守卫** |
| `bloxdModelSurface` | model · surface | 模型颜色、alpha、自发光、附魔、覆盖色 |
| `bloxdModelLight` | model · light | 模型最终颜色 |

签名 (类型必须完全匹配；参数名自由)：

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex;
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight;
// bloxdLiquid* / bloxdModel* take the same types
```

## 渲染目标的划分

- **Terrain** — 水与方块模型以外的所有方块
- **Liquid** — 水
- **Model** — 方块模型 (台阶、楼梯、交叉平面植物)、手持/掉落/投掷物品、玩家、生物、NPC、盔甲、外观装饰

**重要**: 包若未定义任何 Liquid 钩子，**水面上任何 Terrain 钩子也不运行** (水只由 Liquid 钩子处理)。这与 v4 之前液体回退到 terrain 钩子的行为不同。

## 回退与代码共享

- 未定义的钩子表示该阶段使用引擎默认 (与 `bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight` 行为相同)
- **要在钩子间共享代码**，定义一个模块级函数，两处都调用：

```wgsl
fn applyWarmth(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.04, 1.0, 0.96);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}
```

## 默认包 (官方 9 钩子模板)

起始模板现在包含 light 钩子。随包分发时为 1,683 字节，逐字如下：

```wgsl
// Every hook here returns its engine default. Modify the return values to start
// building a shader pack. If you delete a hook, the default is used instead.

// All blocks but water and block models use terrain hooks.
#ifndef BLOXD_STRICT
// Strict games keep terrain where it is. Without the #ifndef, this hook would
// turn the whole shader pack off there.
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Water uses liquid hooks. To share code with another hook, define a function
// and call it from both places.
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Models: block models such as slabs and plants, items, players and mobs.
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

模板的注释就是设计指引: 修改返回值即开始构建；删除钩子即恢复默认；strict 游戏让地形留在原地；用函数共享代码。

## 书写惯例

- **切勿直接构造输出结构体** (`BloxdSurface(...)` 会验证失败)。总是从 `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` 起步再改字段。light 钩子的第一个参数已是输出类型，因此 `var out = s;` 亦可
- 裸写 `var x: BloxdSurface;` (仅类型标注) 同样是验证错误
- 钩子参数**只读**。先复制 (`var sv = s;`)
- 不能使用以 `bloxd` 开头的标识符 (不区分大小写)，9 个钩子函数名除外
- 常量写成 `const` (`#define` 不带值)

每个钩子可读写的全部字段见[结构体](../api/structures.md)。
