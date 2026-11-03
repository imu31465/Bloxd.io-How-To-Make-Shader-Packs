# 光照问题

> 目标API: 5 · 状态: Verified

亮度、阴影与雾的问题。

## 洞穴过亮

- **原因**: `skyLight` 上的非线性不足
- **修复**: [光照配方](../recipes/lighting.md)与[写实系配方](../recipes/realism.md)中的洞穴压暗配方

## 夜晚受光面过亮

- **原因**: 只压暗了阴影色 — 完成色仍保持白天的亮度
- **修复**: 夜间对整体完成色施加衰减，仅对局部光 (`blockLight` / `heldLight`) 放宽 — [夜晚指南](../guides/night.md)

## 夜晚黑到看不见

- **修复**: 保证最低环境光；`bloxdSunDirection()` 为零时无法得知真实月亮方向，请用拟似蓝色环境光 ([夜晚配方](../recipes/lighting.md))。月亮方向本身是 `-bloxdSunDirection()` (仅昼夜循环世界)

## 白天过曝

- **修复**: 降低 ACES 之前的曝光 ([ACES](../recipes/realism.md))

## 火把周围一片橙

- **修复**: 调低暖色混合比 ([暖火把 × 冷天空](../recipes/realism.md))

## 想原样保留引擎的世界光照

- **v5 解法**: 调用 `bloxdWorldLight(light)` — 与引擎「方块/天空/手持取最亮、`ambientLightColour` 兜底」完全相同的数学 ([光照](../api/lighting.md#bloxdworldlight--世界光照))
- **注意**: `!bloxdLit()` 时 `blockLight` / `heldLight` 为 0、天空相关字段为 1 (标头保证)

## 关闭光照的游戏中画面不对

- **原因**: 光照专属输入 (`blockLight` 等) 未加守卫地使用。v5 没有 `#ifdef BLOXD_LIGHTING` — 请按**运行时 `bloxdLit()`** 分支
- **修复**: 提前返回 `if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }` ([光照](../api/lighting.md#bloxdlit--门控))

## 「LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk」

- **原因**: 密集的发光方块区溢出光照种子队列，该区块的光照计算被截断。**不是包造成的**，但发光簇附近的光照缺口源于此
- **修复**: 在世界中分散光源

## 想了解原理？

- 阴影: [阴影](../guides/shadows.md) (skyLight = 体素阴影贴图)
- 雾: [引擎内部: 雾](../internals/fog-internals.md)

## 相关

- [光照](../api/lighting.md) · [画面问题](visual.md) · [光照内部](../internals/lighting-internals.md)
