# 雾的内部规格

> 目标API: 5 · 目标构建: `xkg8x` (2026-11-04, 生产环境) · 状态: Analyzed (基于生产环境包的 JavaScript 级分析)

雾计算恒为 LINEAR 模式 (等价于 `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)`，clamp 0..1)，`fogStart = 32 × D`，`fogEnd = 32 × (D + 1)` (D = 雾距离设置；仅 D = 0 特例 fogEnd = 5)。**雾渐变带仅 32 格宽**，`l.fogAlpha` 与其说是「距离雾」，不如说是**到已加载世界边缘的归一化距离**。它随玩家加载距离而变，因此距离系演出应自行计算 `distance(l.position, bloxdEyePosition())` (见下方「加载边界带」一节)。(渲染器的雾函数实际实现了 **四种** 模式——off / exponential / exponential-squared / linear——正式发布的游戏驱动的是 linear；复原源码与稳健性讨论保存于[版本历史：v3 迁移指南](../history/v3.md)。)

默认雾色 `rgb(183, 191, 195)` (淡青灰)。世界作者经 `fogColourOverride` (hex) 变更。雾模式 0 (NONE) 时 **fogColour 以黑到达**。标准形 `bloxdApplyFog(col, l)` 是安全的，因为 fogAlpha 为 0 时不用雾色。脚本 API 还提供两个选项：`fogChunkDistanceOverride` 与 `fogOnSkybox`——Custom Game 可分别独立调整雾距 (D 值) 与雾对天空盒的应用。默认天空盒不受雾影响 (只有开启 `fogOnSkybox` 的游戏会让天空盒也染上雾色)。

玩家侧 `showFog` 设为 false 会把雾推至 3200–3232 格，实际等效于关闭 (`fogAlpha ≈ 0` 持续返回)。

## 加载边界带 — fogAlpha 作「世界边缘」用

仅 32 格加载边界带悄悄染冷色，淡化世界尽头 (或作为演出强调)。不自行算距离，自动跟随玩家加载距离设置是优点。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogAlpha: 0 = 内侧 (到边界有余裕), 1 = 即将出边界
    let edge = l.fogAlpha;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```
