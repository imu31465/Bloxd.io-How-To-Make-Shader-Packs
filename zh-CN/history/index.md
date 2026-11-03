# 版本历史

> 状态: Historical — 按版本逐一记录；各指南各自标注目标构建

v1 到 v5 的变更、迁移步骤与被移除的 API。用于迁移旧包，也用于保存各时代的规格。

## 时间线

| 版本 | 上线时间 | 指南 | 要点 |
|---|---|---|---|
| v1 | (最初) | [v1](v1.md) | 第一个着色器包 API。6 个钩子 (terrain/liquid × vertex/surface)；`bloxdTime` / `bloxdOriginOffset` / `bloxdFaceBlock` / `engineColour` / `fogFactor` 词汇 |
| v2 | — | [v2](v2.md) | 全面标识符改名、`blockId`、`BLOXD_SCENE_DEPTH` 与 `bloxdOpaqueBehind()` |
| v3 | 2026-10-19 | [v3](v3.md) | `blockId` → `blockFlags` 位标志、`bloxdPi` / `bloxdTau`、官方液体钩子、钩子接入内部机制 |
| v4 | 2026-10-26 | [v4](v4.md) | 纹理 API (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`)、strict 契约、引擎标头与注册表分析 |
| **v5** | **2026-11-03** | [v5](v5.md) | **现行** — `BloxdFlags` 结构体 (14 个布尔)、Model 钩子 (共 9 个)、`bloxdLit()` / `bloxdLitColour()` 光照 API、`localPosition`、附魔/覆盖色输入与输出、6 种变体 |

## 共同前言

当前游戏只接受 `apiVersion: 5`，**旧版本包在加载瞬间即告失败** (已保存的包被静默停用 — [兼容性](../api/compatibility.md))。每篇指南讲「上一版 → 下一版」。要跨多个版本？从最旧的开始依次应用。

## 直达检查清单

- v4 包 → [v5 指南](v5.md) §77 (大多为机械操作)
- v3 包 → [v4](v4.md) §61 → [v5](v5.md) §77
- v2 包 → [v3](v3.md) §47 → v4 → v5
- v1 包 → 从 [v2](v2.md) §37 开始

> 现行规格本身见 [API 参考](../api/)；现行构建的内部机制见[引擎内部](../internals/)。
