[← 上一部分](09-apiv3.md)·[返回手册](README.md)

# 第十部分: API Version 4 迁移指南 (2026-10-26, 摘要)

> 本文是该语言的简短摘要。包含全部细节、示例配方与复原的引擎内部实现 (§55–§66) 的完整版位于[英文版](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md)与[日文版](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md)。

目标构建: `cnty9.main.669f8081.js` —— **自 2026-10-26 起同时在生产与预发布环境上线** (两者逐字节一致)。包模型保持形态: 相同的 `pack.json` 字段、相同的加载器限制、相同的 64 B uniform、相同的 6 个钩子。

## 变更内容

- `pack.json` 要求 `"apiVersion": 4` (严格 `===`，数字) —— v3 包在加载时被拒绝。
- **全新纹理 API (本次亮点):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` 以与引擎本身完全相同的方式采样方块纹理图集 (id 0 = 白色；动画纹理自动返回当前帧)，`bloxdTextureSize(mipLevel) -> vec2u`，以及命名常量 `bloxdTextureId*` (由文件名转 CamelCase，如 `grass_top` → `bloxdTextureIdGrassTop`；全部 905 个可用名称的完整名录已作为 §68 嵌入第十一部分 (`11-reference.md`))。
- `BloxdSurfaceIn` *与* `BloxdLightIn` 新增 **4 个输入字段**: `textureId`、`textureRotation` (顺时针四分之一转，由 `bloxdTexel` 应用)、`uv` (以方块为单位；绘制 `fract(uv)`)、`mipLevel`。
- **伴随含义变化的改名:** `fogVisibility` → `fogAlpha`，含义**反转** (`0 = 无雾，1 = 仅有 fogColour`；移植: `l.fogVisibility` → `1.0 - l.fogAlpha`)；`bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (函数体一致)；`BloxdOpaqueBehind.found` → `hit`。
- **严格游戏现在由内置验证器强制执行:** 未加保护的顶点钩子或可达的 `discard` 会报 `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...`，并在严格游戏中禁用**全部**钩子。使用 `#ifndef BLOXD_STRICT` 包裹后 surface/light 仍可运行。
- 其余全部冻结: 6 个钩子、`blockFlags` 位 (1/2/4/8/16/32)、uniform 布局、加载器限制、变体矩阵、12 个 allow 标题 (2026-10-27 在 `cnty9` 上复确认不变)。

## 快速迁移

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (数字) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` 或 `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| 未保护的顶点钩子 | `#ifndef BLOXD_STRICT ... #endif` |

完整参考材料现在已是本指南的一部分：完整复原的引擎头文件与含全部 905 个可用名称的完整纹理目录见第十一部分 (`11-reference.md`)。完整细节 —— `bloxdTexel` 的旋转细节、复原的采样 WGSL、名称注册表、带注册表哈希的新 `HEADER_VERSION` 结构 —— 见英文与日文完整版。

[← 上一部分](09-apiv3.md)·[返回手册](README.md)
