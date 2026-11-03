# 着色器钩子

> 目标API: 5 · 目标构建: `ab90qa` · 状态: Verified

包可以定义 **9 个钩子** — 3 个渲染目标 (程序) × 3 个管线阶段，全部可选 (未定义即用引擎默认)。

## 9 钩子对照

| 钩子 | 程序 | 阶段 | 参数 | 返回 | 运行条件 |
|---|---|---|---|---|---|
| `bloxdTerrainVertex` | Terrain | vertex | `BloxdVertexIn` | `BloxdVertex` | 仅 allow 变体 (**在 strict 中定义它本身就是错误**) |
| `bloxdTerrainSurface` | Terrain | surface | `BloxdSurfaceIn` | `BloxdSurface` | 总是 |
| `bloxdTerrainLight` | Terrain | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | 总是 |
| `bloxdLiquidVertex` | Liquid | vertex | `BloxdVertexIn` | `BloxdVertex` | 仅 allow |
| `bloxdLiquidSurface` | Liquid | surface | `BloxdSurfaceIn` | `BloxdSurface` | 总是 |
| `bloxdLiquidLight` | Liquid | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | 总是 |
| `bloxdModelVertex` | Model | vertex | `BloxdVertexIn` | `BloxdVertex` | 仅 allow |
| `bloxdModelSurface` | Model | surface | `BloxdSurfaceIn` | `BloxdSurface` | 总是 |
| `bloxdModelLight` | Model | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | 总是 |

## 各程序绘制什么

| 程序 | 绘制对象 | 无 Liquid 钩子时的水 |
|---|---|---|
| **Terrain** | 水与方块模型以外的所有方块 | — |
| **Liquid** | 水 | **水面上任何 Terrain 钩子也不运行** (水保持默认外观) |
| **Model** | 方块模型 (台阶、楼梯、植物、作物、蜘蛛网)、手持/掉落/投掷物品、玩家、生物、NPC、盔甲、外观装饰 | — |

## 各阶段的职责

- **Vertex** — 移动顶点位置 (草摇摆、波浪)。顶点动画会在严格游戏中禁用整个包，因此 `#ifndef BLOXD_STRICT` 为必填
- **Surface** — 材质输出: `colour` / `alpha` (条件存在) / `emission` / `enchantColour` / `overlayColour`
- **Light** — 最终颜色；取 surface 输出加 `BloxdLightIn`。其返回值即屏幕上的颜色

## 签名

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
// bloxdLiquid* / bloxdModel* take the same argument and return types
```

## 特殊函数调用限制

引擎验证器限制哪些钩子可以触达特定函数 (违例以专用的「reaches」诊断失败)：

| 函数 | 可从何处调用 | 守卫 |
|---|---|---|
| `bloxdTexel` | 仅 surface / light 钩子 | — |
| `bloxdTextureSize` | 仅 surface / light 钩子 | — |
| `bloxdOpaqueBehind` | surface / light 钩子 (液体变体中才有意义) | `#ifdef BLOXD_SCENE_DEPTH` |

> `bloxdFragmentBlockPosition` 已不在有文档的标头中，但引擎仍会注入并接受它 — 见[函数: bloxdFragmentBlockPosition](functions.md#bloxdfragmentblockposition--undocumented-but-still-injected)。它曾是唯一可从 vertex 钩子调用的特殊函数；新代码请改用 `flags` 判断「这是哪个方块」。

## 回退与共享

- 未定义的钩子 → 该阶段按引擎默认行为 (`bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **跨钩子共享处理**：用模块级函数，两处都调用它：

```wgsl
fn sharedSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}
```

## 相关

- 官方 9 钩子模板 → [入门指南: 着色器钩子](../getting-started/hooks.md)
- 每个结构体字段 → [结构体](structures.md)
- 钩子接入内部机制 → [引擎内部](../internals/hook-invocation.md)
