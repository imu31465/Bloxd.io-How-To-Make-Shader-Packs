# 纹理问题

> 目标API: 5 · 目标构建: `ab90qa` · 状态: Verified (消息逐字采录自现行验证器)

围绕 `bloxdTextureId*` / `bloxdTexel` 的问题。全部 896 个名称可在[纹理目录](../api/texture-catalog.md)中搜索。

## 「There's no texture called X. Did you mean bloxdTextureIdY?」

- **原因**: 拼写错误；验证器带**莱文斯坦建议** (阈值 `max(2, floor(len/4)) + 1`)
- **修复**: 采纳建议；与[目录](../api/texture-catalog.md)核对
- **预防**: 从目录复制粘贴名称

## 「...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates.」

- **原因**: 给动画纹理写了**帧号** (`lava0` 等)
- **修复**: 用基础名称 — 采样会自动返回当前帧
- **预防**: 42 个动画族永远不要写帧号后缀 ([命名](../api/texture-api.md#拼写规则与命名自由度))

## 「...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, ...」

- **原因**: 写了旋转族的旋转副本拼写 (`[rot[N`)
- **修复**: 用根名称 — `bloxdTexel` 会重新应用旋转

## 「...could name X and Y, which differ only by case or underscores, so it can't be used.」

- **原因**: 不区分大小写/下划线的折叠使名称**有歧义**
- **修复**: 改写拼写以消除歧义

## 「bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?」

- **原因**: 前缀拼错 (如 `bloxdTextureID`、`bloxdtextureid`)
- **修复**: 名称以精确的 `bloxdTextureId` 开头

## 「Case and underscores are not distinguished」— 两条规则怎么共存？

名称解析会折叠大小写与 `_`，因此 `bloxdTextureId_grass_top` 与 `bloxdTextureIdGrassTop` 解析为**同一个**常量。只有当折叠后剩下多个候选时才会触发专属的歧义错误 ([命名规则](../api/texture-api.md#拼写规则与命名自由度))。

## bloxdTexel 在模型上总是返回白色

- **设计如此**: 大多数模型用 `textureId: 0` (无纹理 — 玩家皮肤等)；`bloxdTexel(0, ...)` 返回 `vec4f(1.0)`
- **修复**: 用 `surface.textureId != 0u` 选取 ([模型自带纹理](../api/texture-api.md#模型自带纹理-textureid-0))

## 想添加纹理

- **限制**: 着色器包 API 只**读取**图集；添加纹理是纹理包系统的职责 ([组合](../guides/combinations.md))

## 「Packs can't use X: the engine binds every texture and sampler...」

- **原因**: 直接声明了 `texture_*` / `sampler` 类型
- **修复**: 经 `bloxdTexel()` 使用 ([限制](../api/restrictions.md))

## 游戏更新后裸 id 失效了

- **原因**: **id 是快照** — 实测两个构建之间 905 个幸存名称中 334 个改了 id
- **修复**: 写 `bloxdTextureIdLava`，而不是 `19` ([名称即 API](../api/texture-catalog.md#实测漂移-cnty9--ab90qa))

## 相关

- [纹理 API](../api/texture-api.md) · [纹理目录](../api/texture-catalog.md) · [纹理注册表内部](../internals/texture-registry.md)
