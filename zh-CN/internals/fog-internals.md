# 雾的内部规格



雾计算恒为 LINEAR 模式 (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`，clamp 0..1)，`fogStart = 32 × D`，`fogEnd = 32 × (D + 1)` (D = 雾距离设置；仅 D = 0 特例 fogEnd = 5)。**雾渐变带仅 32 格宽**，`(1.0 - l.fogAlpha)` 与其说是「距离雾」，不如说是**到已加载世界边缘的归一化距离**指标。随玩家加载距离变化，距离系演出应自行计算 `distance(l.position, bloxdEyePosition())` (配方 R-B)。(v3 注记: 渲染器的雾函数实际实现了 **off / exponential / exponential-squared / linear 四种模式**，正式发布的游戏驱动的是 linear；复原源码与稳健性讨论见[第九部分](../history/v3.md) §50。)

默认雾色 `rgb(183, 191, 195)` (淡青灰)。世界作者经 `fogColourOverride` (hex) 变更。雾模式 0 (NONE) 时 **fogColour 以黑到达**。标准形 `mix(l.fogColour, col, (1.0 - l.fogAlpha))` 安全，因为 fogVisibility 为 1 时不用雾色。脚本 API 还提供两个选项：`fogChunkDistanceOverride` 与 `fogOnSkybox`——Custom Game 可分别独立调整雾距 (D 值) 与雾对天空盒的应用。默认天空盒不受雾影响 (只有开启 `fogOnSkybox` 的游戏会让天空盒也染上雾色)。

玩家侧 `showFog` 关则雾推至 3200–3232 格，实际无效 (`fogVisibility ≈ 1` 持续返回)。

## R-B. 加载边界带 — fogVisibility 作「世界边缘」用

仅 32 格加载边界带悄悄染冷色，淡化世界尽头 (或作为演出强调)。不自行算距离，自动跟随玩家加载距离设置是优点。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = 内侧 (到边界有余裕), 0 = 即将出边界
    let edge = 1.0 - (1.0 - l.fogAlpha);
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```
