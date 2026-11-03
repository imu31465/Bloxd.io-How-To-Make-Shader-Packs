# 会改变包可见值的因素

> 目标API: 5 · 目标构建: `ab90qa` (2026-11-03, 生产环境) · 状态: Analyzed (基于生产环境包的 JavaScript 级分析)

同一包因**世界与玩家设置**渲染各异。分发前至少在以下 3 环境确认外观：

1. **通常世界** (默认天空盒、无覆盖) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`、默认色
2. **太空系天空盒世界** — bloxdSunDirection() = 0。`sunPresent` 分支的外观
3. **设 `visionMinLightColour` / `skyLightColourOverride` 的自定义世界** — 暗部与颜色被抬高的情形

主要变动源：`lightingOverride` (强制光照) / `skyLightColourOverride`、`ambientLightColourOverride` (hex 替换) / `visionMinLightColour` (「可见最暗色」。实现为对 `uSkyLightColour` 与 `uAmbientLightColour` 二者按分量取 max；Night Vision 在用——「洞穴全黑」系包达不到预想之暗，天空色本身也被垫高) / `heldLightColourOverride`、`Range`、`ConeAngle` / `fogChunkDistanceOverride`、`fogColourOverride`、`fogOnSkybox` / `skyBox` (bloxdSunDirection() 有无)。`uSkyLightColour` 默认 = (1,1,1) 白，`uAmbientLightColour` 默认 = (0.25,0.25,0.30)。`l.ambient` 场景成分 = 图形设置「Ambient Lighting Intensity」(默认 0.5)。`(1.0 - l.fogAlpha)` 跟随玩家雾/区块距离设置。另有 `cameraTint` (覆盖全屏的 RGBA 色染) 与 `proximityFadeDistance` / `proximityFadeMinOpacity` (相机对实体的接近淡出) 两种世界侧变动源——`cameraTint` 尤其是叠加在包输出**之上**的最终通道。多数设置也可经脚本 API (`serverOption`) 定义并在对局中更新。
