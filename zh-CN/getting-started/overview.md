# 概览与前置条件

> API: 5 · 状态: Verified

## 着色器包是什么

Bloxd.io 着色器包只改变游戏 **WebGPU 渲染器**的画面观感。包以**受限的 WGSL 子集**编写，从游戏内设置 → 着色器包 (Shader Pack) 界面以 zip 或文件夹形式加载。安装包期间，设置中的 WebGPU 渲染器会被强制启用。

包内代码会作为 WGSL 进行验证和编译。WGSL 包代码无法执行 JavaScript，也无法发起网络请求。

## 你能改变什么

包接入渲染器的**逐面 3 阶段管线**。渲染目标分为三个程序，共 **9 个钩子**：

| 目标 | 钩子 (Vertex / Surface / Light) | 绘制内容 |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | 水与方块模型以外的所有方块 |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | 水 |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | 方块模型 (台阶、楼梯、植物)、物品、玩家、生物、NPC、盔甲、外观装饰 |

- **可以实现**：修改颜色、透明度和自发光；调整光照（见[光照 API](../api/lighting.md)）；使用 `bloxdTexel` 采样纹理；通过 `flags` 创建逐模型效果；移动顶点（仅限 allow 游戏）
- **无法实现**：添加自定义纹理；创建泛光等后期处理效果；生成自定义阴影贴图或直接读取其深度数据；实现真实反射（SSR）；直接对天空、云或太阳圆盘本身应用着色器
- **阴影**：`bloxdShadow()` 提供引擎计算的太阳/月亮阴影系数，`bloxdShadowDirection()` 返回投射阴影的光线行进方向。`bloxdAirShadow(t)` 可评估摄像机与当前片元之间某一点的阴影。旧的 `skyLight` 体素天空遮蔽方法也仍可使用（见[阴影指南](../guides/shadows.md)）

## strict 与 allow 模式

每个游戏都有自己的着色器包策略 (`shaderPackPolicy`)，而**大多数游戏以 strict 模式运行** (无顶点动画、无 `discard`)。面向大众分发的包必须在 strict 模式下可用。见[变体](variants.md)与[策略参考](../internals/policy.md)。

## 本文档的前提

- 当前游戏只接受 `apiVersion: 5` 的包；v1–v4 包加载即被拒绝 (已保存的包会静默失效 — [兼容性](../api/compatibility.md))
- 要迁移为旧版本编写的包？见[版本历史](../history/)
- 引擎内部机制的说明仅作参考；受支持的 API 以 API 参考为准
