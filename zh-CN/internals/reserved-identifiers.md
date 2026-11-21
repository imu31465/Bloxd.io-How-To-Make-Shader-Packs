# 保留标识符内部机制

> 目标 API：5 · 文档类型：技术参考

`bloxdSp*` 命名空间 — 生成器可能注入、因而包不能重声明的符号。面向包作者的摘要: [限制](../api/restrictions.md)。
## 88 个符号


`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCasterBlocks` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellFull` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpCrossed` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEntityLight` · `bloxdSpEntityRow` · `bloxdSpExitBox` · `bloxdSpEye` · `bloxdSpFacing` · `bloxdSpFacingDot` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLit` · `bloxdSpLod` · `bloxdSpMarch` · `bloxdSpMaskBit` · `bloxdSpMaskEdge` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpNormalCode` · `bloxdSpOrigin` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpOwnTexture` · `bloxdSpPixel` · `bloxdSpPlaneTolerance` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpRayFresh` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpShadowDz` · `bloxdSpShadowEmissive` · `bloxdSpShadowEntities` · `bloxdSpShadowEntityGrids` · `bloxdSpShadowFirstPerson` · `bloxdSpShadowLight` · `bloxdSpShadowMarch` · `bloxdSpShadowMask` · `bloxdSpShadowNormal` · `bloxdSpShadowPixel` · `bloxdSpShadowPosition` · `bloxdSpShadowSpecial` · `bloxdSpShadowVolume` · `bloxdSpShadowVolumeSampler` · `bloxdSpShadowVoxels` · `bloxdSpShadowZ` · `bloxdSpSize` · `bloxdSpSunShadow` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpT` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpVolumeAt` · `bloxdSpVolumeOpenLit` · `bloxdSpVolumeOut` · `bloxdSpVolumeTexel` · `bloxdSpVolumeWork` · `bloxdSpWindowHas` · `bloxdSpWindowSlot` · `bloxdSpWord` · `bloxdSpZ`


全部 42 个新符号都来自引擎的太阳/月亮阴影实现（即 \`bloxdShadow()\` / \`bloxdAirShadow()\` 的支撑）:

- \`bloxdSpSunShadow\` / \`bloxdSpShadowVolume\` / \`bloxdSpShadowVolumeSampler\` / \`bloxdSpShadowVoxels\` — 太阳阴影体（引擎在玩家周围填充的 3D 纹理）及其采样器
- \`bloxdSpShadowMarch\` / \`bloxdSpMarch\` / \`bloxdSpOrigin\` / \`bloxdSpRayFresh\` / \`bloxdSpExitBox\` — 解析阴影光线的 ray march（64 步、stale-box 新鲜度测试）
- \`bloxdSpShadowMask\` / \`bloxdSpShadowPixel\` / \`bloxdSpMaskBit\` / \`bloxdSpMaskEdge\` — 遮罩纹理路径（mask-edge 感知采样）
- \`bloxdSpEntityLight\` / \`bloxdSpShadowEntities\` / \`bloxdSpShadowEntityGrids\` / \`bloxdSpEntityRow\` / \`bloxdSpCasterBlocks\` — 实体阴影投射（玩家、生物、物品）
- \`bloxdSpShadowPosition\` / \`bloxdSpShadowNormal\` / \`bloxdSpShadowEmissive\` / \`bloxdSpShadowFirstPerson\` / \`bloxdSpShadowLight\` / \`bloxdSpShadowDz\` / \`bloxdSpShadowZ\` / \`bloxdSpShadowSpecial\` — 逐片元阴影上下文（自发光与第一人称的排除）
- \`bloxdSpVolumeAt\` / \`bloxdSpVolumeOpenLit\` / \`bloxdSpVolumeTexel\` / \`bloxdSpVolumeOut\` / \`bloxdSpVolumeWork\` — 体积查询（\`bloxdAirShadow\` 的仅方块、整块模糊路径）
- \`bloxdSpLit\` / \`bloxdSpFacing\` / \`bloxdSpFacingDot\` / \`bloxdSpT\` / \`bloxdSpCrossed\` / \`bloxdSpNormalCode\` / \`bloxdSpCellFull\` / \`bloxdSpWindowHas\` / \`bloxdSpWindowSlot\` / \`bloxdSpOwnTexture\` / \`bloxdSpPlaneTolerance\` — 阴影与采样代码生成的辅助局部变量

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
