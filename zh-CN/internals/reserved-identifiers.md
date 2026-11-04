# 保留标识符内部机制

> 目标API: 5 · 目标构建: `xkg8x` · 状态: Analyzed (从现行 bundle 的生成器复原)

`bloxdSp*` 命名空间 — 生成器可能注入、因而包不能重声明的符号。面向包作者的摘要: [限制](../api/restrictions.md)。

## 46 个符号

从 v4 的 27 个增长到 **46 个** (新增 20、退役 1 — `bloxdSpLitColour`，已提升为公开的 `bloxdLitColour()`)：

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

## 新名称 ↔ v5 功能

- `bloxdSpFlags` — `BloxdFlags` 结构体的传递
- `bloxdSpEnchant` / `bloxdSpItemLocalPosition` — 新输入 (附魔、模型局部位置)
- `bloxdSpAcross` / `bloxdSpAt` / `bloxdSpCell` / `bloxdSpCellAt` / `bloxdSpCellIndex` / `bloxdSpSize` / `bloxdSpLevel` / `bloxdSpOwnTexel` — 单元格采样纹理包路径
- `bloxdSpQuarterTurns` — 旋转链 ([纹理采样](texture-sampling.md))
- `bloxdSpNormal` / `bloxdSpPosition` / `bloxdSpColour` / `bloxdSpOut` / `bloxdSpWord` / `bloxdSpIndex` / `bloxdSpDown` / `bloxdSpInside` — 扩展钩子局部量

## 包级规则

比该命名空间更宽: **一切匹配 `/^bloxd/i` (不区分大小写) 者**。只有 9 个钩子函数名可以声明 ([验证错误](../troubleshooting/validation.md))。

`bloxdTextureId` 前缀的标识符解析为纹理名称，拥有专属的错误族 ([纹理问题](../troubleshooting/textures.md))。

## 相关

- [限制](../api/restrictions.md) · [纹理采样](texture-sampling.md) · [版本历史: v5](../history/v5.md)
