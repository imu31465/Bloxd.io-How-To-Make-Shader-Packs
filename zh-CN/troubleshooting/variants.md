# 变体专属问题

> 目标API: 5 · 状态: Verified

只在 6 种变体 (`strict|allow` × `terrain|liquid|model`) 的部分中发生的问题。v5 移除了光照轴 (旧 `BLOXD_LIGHTING`)，加载器在加载时**一次验证全部 6 种变体**。

## 只在非 strict 游戏中能加载 / 在 strict 中被弃用

- **原因**: 未加守卫的 vertex 钩子或可达的 `discard`；strict 游戏两者皆禁，违规 = **整包自动禁用** (`shaderPack:offInStrict`)
- **检查**: 加载器界面显示 `<hook> moves terrain, which strict games prevent.` / `discard makes terrain see-through, which strict games prevent.`
- **修复**: 用 `#ifndef BLOXD_STRICT` 包住 vertex 钩子与 `discard`
- **预防**: vertex 钩子永远从带守卫的模板起步 ([变体](../getting-started/variants.md))

## 「.alpha is undefined」

- **原因**: `alpha` 只在 `#ifdef BLOXD_ALPHA` 之后存在 (全部 liquid + 非 strict 的 terrain/model)
- **修复**: 用 `#ifdef BLOXD_ALPHA` 包住涉及 alpha 的代码 ([预处理器](../api/preprocessor.md#macro--variant-matrix))

## 「BloxdVertex only exists when BLOXD_STRICT isn't defined」

- **原因**: strict 变体根本没有 vertex 钩子，也就没有 `BloxdVertex`；而 vertex 代码从 strict 变体中也可触达
- **修复**: 给 vertex 钩子加守卫

## bloxdOpaqueBehind 只在部分变体中失败

- **原因**: `BLOXD_SCENE_DEPTH` 只在全部液体变体中定义
- **修复**: `#ifdef BLOXD_SCENE_DEPTH` ([验证错误](validation.md))

## 水无视包 (Liquid)

- **症状**: 写了地形钩子，水却没变
- **原因**: **v5 中，包若未定义任何 Liquid 钩子，任何 Terrain 钩子也不会在水上运行** (v4 之前「液体回退到地形」的行为已移除)
- **修复**: 编写 Liquid 钩子 ([钩子划分](../api/hooks.md#what-each-program-draws))

## 模型 (实体、方块模型) 不受影响

- **原因**: v5 之前不在包的范围内；现在需要 `bloxdModel*` 钩子
- **修复**: 定义 `bloxdModelSurface` / `bloxdModelLight` ([模型指南](../guides/models.md))

## 关于 6 变体验证

加载器在加载时**一次验证全部 6 种变体** (光照轴不再单独编译)。即便某个游戏只用其中某些条件，分发的包也必须兼顾全部六种。

| 变体 | 定义的宏 |
|---|---|
| `allow.terrain` | `BLOXD_ALPHA` |
| `allow.liquid` | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | `BLOXD_ALPHA` |
| `strict.terrain` | — |
| `strict.liquid` | `BLOXD_SCENE_DEPTH` |
| `strict.model` | — |

## 相关

- [变体](../getting-started/variants.md) · [预处理器](../api/preprocessor.md) · [策略](../internals/policy.md)
