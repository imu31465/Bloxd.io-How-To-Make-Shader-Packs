# 夜间表现设计

> 目标API: 5 · 目标构建: `bbb6l5` (2026-11-20 生产与preprod确认) · 状态: Verified (已移植到当前API — 建议实机复核)

如果只压暗阴影，即使没有太阳，引擎输出的最终颜色 (`engineColour`) 仍可能偏亮，导致受光面与阴影区域之间的明暗反差显得不自然。因此，应当衰减整体最终颜色，而不只是调整阴影。

下面的示例将 `bloxdSunDirection()` 为零视为夜晚，将其具有非零方向视为白天，并在夜间降低地形的最终颜色。`blockLight` 或 `heldLight` 较强时会减弱暗化程度，以保留火把等近处光源的效果。`0.52` 是可调参数；想让夜晚更暗，可以适当调低。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    if (bloxdLit()) {
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
        let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
        let protectLocalLight = smoothstep(0.03, 0.35, localLight);
        scale = mix(nightDim, 1.0, protectLocalLight);
    }
    // 完成色衰减，材质 emission 按默认经雾叠加
    out.colour = l.engineColour * scale + s.emission * (1.0 - l.fogAlpha);
    return out;
}
```

**此方法的局限：** 如果 `bloxdSunDirection()` 在有太阳时返回单位方向向量、无太阳时返回零，就只能区分白天和夜晚，无法平滑估算黄昏或晨昏时段。此外，这种做法会衰减最终颜色，因此引擎的日光和环境光也会同时变弱，无法完整还原一天中的光照变化。若要将同样的方法用于液体，请先确认液体钩子的回退行为。
