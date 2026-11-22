# 夜间表现设计

> 目标API: 5 · 目标构建: `bbb6l5` (2026-11-20 生产与preprod确认) · 状态: Verified (已移植到当前API — 建议实机复核)

只压暗阴影，太阳缺席时引擎完成色 (`engineColour`) 依然偏亮，面影落差会显得不自然。应对完成色整体施加衰减。

下例以 `bloxdSunDirection()` 为零判夜、有方向判昼，对夜间地形完成色衰减。`blockLight` 与 `heldLight` 强处减弱衰减，尽量保留火把等近光。`0.52` 为可调值，想更暗请调小。

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

**此方法的局限：** `bloxdSunDirection()` 提供太阳方向，因此取反即可得到月亮方向 (`-bloxdSunDirection()`)。默认世界中的太阳是静止的，月亮也不会移动；只有实现了昼夜循环的世界才会移动。如果该值只有单位方向或零两种状态，就能区分昼夜，却无法平滑表现黄昏与黎明。本例直接降低地形最终颜色，因此会同时削弱引擎的日光和环境光，并不能完整重现全天候照明。若要应用于液体，请先确认液体钩子的回退关系。
