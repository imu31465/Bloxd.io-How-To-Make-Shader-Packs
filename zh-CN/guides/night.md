# 夜间表现设计

> 目标API: 5 · 目标构建: `bny9u` (2026-11-05, 生产环境) · 状态: Verified (已移植到当前API — 建议实机复核)

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

**该处理的局限：** 若 `bloxdSunDirection()` 为「有太阳=单位方向、无=零」二值，可分昼夜但无法连续推定黄昏薄明。且因衰减完成色，会把引擎昼光与环境光一并削弱，并非完整的时间带再现。液体同样处理时请确认液体钩子的回退关系。
