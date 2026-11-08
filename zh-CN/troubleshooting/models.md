# 模型问题

> 目标API: 5 · 目标构建: `v98qt8` · 状态: Analyzed (v5 新领域)

围绕 v5 新 Model 钩子的问题。

## 玩家/生物不受影响

- **原因**: 实体 (玩家、生物、NPC、盔甲、外观装饰) 由 **Model 程序**绘制 — 地形钩子碰不到它们
- **修复**: 添加 Model 钩子 ([模型指南](../guides/models.md))

## 台阶、楼梯、植物不受影响

- **原因**: 方块模型 (`slab` / `stairs` / `flat`) 同样是 Model 程序几何体，从不属于地形
- **修复**: 在 Model 钩子中用 `flags.slab` / `flags.stairs` / `flags.flat` ([标志](../api/flags.md))

## 水不受影响

- **原因**: 水只归 Liquid 钩子管；**没有 Liquid 钩子时，任何 Terrain 钩子也不会在水上运行** (v5 变更)
- **修复**: 定义 `bloxdLiquidSurface` / `bloxdLiquidLight` ([变体问题](variants.md))

## 想只改手持物品，结果全都变了

- **修复**: 用 `surface.flags.held` 选取 ([模型着色器配方](../recipes/model-shaders.md))

## 标志判断行为不对

- **可能原因**:
  1. **把标志当单选枚举** — 它们自由组合 («砂岩同时是沙和岩石»、«也可能全不满足») ([标志](../api/flags.md#标志可自由组合))
  2. 把 `else` 读作「其余一切」 — `flags.rock` 的 else 只是「不是岩石」，可能仍是沙
- **修复**: 材质标志 (`opaque`…) 与形状/状态标志 (`slab`/`held`…) 相互独立地组合

## 附魔闪光消失了

- **修复**: 透传 `enchantColour` 或改用 `bloxdLitColour()` ([附魔效果](../recipes/enchant-effects.md))

## 受伤红闪消失 / 过强

- **修复**: 透传 `overlayColour` 或调整 `out.overlayColour.a` ([附魔效果](../recipes/enchant-effects.md))

## localPosition 读出来永远是 0

- **设计如此**: 地形与液体面上的 `localPosition` 为 `vec3f(0.0)` — **那里没有模型**
- **修复**: 在 Model 钩子中读取 ([模型配方](../recipes/model-shaders.md))

## bloxdTexel 在模型上返回白色

- **设计如此**: `textureId: 0` (皮肤) 采样为白色
- **修复**: 用 `surface.textureId != 0u` 选取，或从 `surface.colour` 起步 ([纹理问题](textures.md))

## 想只改盔甲 / 只改外观装饰

- **限制**: 没有「盔甲」标志；`flags.lifeform` 包含盔甲与外观装饰
- **近似做法**: 与 `localPosition` (位置) 或 `overlayColour` 的存在性组合 ([模型配方](../recipes/model-shaders.md))

## 相关

- [模型指南](../guides/models.md) · [模型着色器配方](../recipes/model-shaders.md) · [标志](../api/flags.md)
