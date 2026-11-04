# 概览与前置条件

> 目标API: 5 · 目标构建: `xkg8x` (2026-11-04 生产环境确认) · 状态: Verified

## 着色器包是什么

Bloxd.io 着色器包只改变游戏 **WebGPU 渲染器**的画面观感。包以**受限的 WGSL 子集**编写，从游戏内设置 → 着色器包 (Shader Pack) 界面以 zip 或文件夹形式加载。安装包期间，设置中的 WebGPU 渲染器会被强制启用。

包以纯 WGSL 验证与编译 — 没有 JavaScript 执行、没有网络访问。正常编写不会发生任何危险。

## 你能改变什么

包接入渲染器的**逐面 3 阶段管线**。渲染目标分为三个程序，共 **9 个钩子**：

| 目标 | 钩子 (Vertex / Surface / Light) | 绘制内容 |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | 水与方块模型以外的所有方块 |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | 水 |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | 方块模型 (台阶、楼梯、植物)、物品、玩家、生物、NPC、盔甲、外观装饰 |

- **能做到**: 改颜色、透明度与自发光；重建光照 ([光照 API](../api/lighting.md))；投影式阴影 (经 `skyLight`)；采样纹理 (`bloxdTexel` — 读取既有方块纹理图集)；逐模型效果 (`flags` 会告诉你「这是手持物品」「这是玩家」)；顶点动画 (仅 allow 游戏)
- **做不到**: 添加自己的纹理 (那是纹理包系统的职责)；后处理 (泛光等)；随太阳旋转的阴影贴图式阴影；真实反射 (SSR)；影响天空、云或太阳盘本身
- **容易忽视但很强**: **利用 `skyLight` (体素天空遮蔽) 的投影式阴影** — 让树下与屋檐下明确压暗。破坏方块会让 LightEngine 立即重算，阴影实时跟随

## strict 与 allow 模式

每个游戏都有自己的着色器包策略 (`shaderPackPolicy`)，而**大多数游戏以 strict 模式运行** (无顶点动画、无 `discard`)。面向大众分发的包必须在 strict 模式下可用。见[变体](variants.md)与[策略参考](../internals/policy.md)。

## 本文档的前提

- 当前游戏只接受 `apiVersion: 5` 的包；v1–v4 包加载即被拒绝 (已保存的包会静默失效 — [兼容性](../api/compatibility.md))
- 要迁移为旧版本编写的包？见[版本历史](../history/)
- 引擎内部可能随更新变化，因此每页都标注目标构建
