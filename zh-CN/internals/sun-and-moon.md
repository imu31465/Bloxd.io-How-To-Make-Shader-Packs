# 太阳与月亮

> 目标 API：5 · 文档类型：技术参考

`bloxdSunDirection()` 读取太阳方向缓冲区，该缓冲区仅在天空盒类型变化时更新。判断条件不是天空中是否能看到太阳，而是**天空盒的类型是否为 `earth`**。

| 天空盒 | `bloxdSunDirection()` |
|---|---|
| `default` (程序天空) | 非零 (默认值见下文) |
| `gloomy` / `interstellar` / `space_*` (立方体纹理) | **恒为 (0,0,0)** |

当 `bloxdSunDirection()` 返回非零向量时，月亮的方向就是 `-bloxdSunDirection()`（引擎将月亮放在太阳的正反方向）。如果返回零向量，此函数无法提供月亮的实际方向。昼夜状态根据太阳高度判断：当 `bloxdSunDirection().y < 0`（太阳低于地平线）时，月亮位于地平线上方。默认世界中的太阳是静止的，因此月亮也不会移动；只有实现了昼夜循环的世界才会让月亮移动。

默认世界的太阳方向约为 `(-0.56, 0.81, -0.18)` (由 `inclination` = −0.2 / `azimuth` = 0.55 计算出的静态单位向量)。测试着色器包时，可以用这个数值估算高光方向。

引擎本身没有内置昼夜循环。`inclination` 是静态值；实现昼夜变化的世界会在游戏逻辑中更新它，`bloxdSunDirection()` 也会反映每次更新。

地形只使用场景启动时创建的两盏方向光，**它们的方向和强度始终固定，昼夜之间不会变化**。也就是说，地形亮度不随时间改变；昼夜视觉效果仅由天空盒和 `bloxdSunDirection()` 决定。因此，想在夜间调暗地形的着色器包，需要根据 `bloxdSunDirection()` 自行推断当前时段，例如使用[夜间效果设计](../guides/night.md)中的 `sunPresent` 方法。

## R-A. 月光效果

仅月亮在上时叠加青白色 Lambert 与弱高光。`moonUp` 在默认静止太阳世界为 0，那里什么都不发生——**仅在实现昼夜循环的世界中生效的月光效果**。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // 只有太阳方向向量非零时，才能确定月亮位于太阳的反方向。
        let moonDir = -bloxdSunDirection();
        let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
        if (moonUp > 0.0) {
            let n     = normalize(l.normal);
            let diff  = max(0.0, dot(n, moonDir));
            let view  = normalize(bloxdEyePosition() - l.position);
            let halfV = normalize(moonDir + view);
            let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
            out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
        }
    }
    return out;
}
```
