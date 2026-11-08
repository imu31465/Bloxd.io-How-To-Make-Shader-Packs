# 时间与动画

> 目标API: 5 · 目标构建: `v98qt8` (2026-11-08 生产与preprod确认) · 状态: Verified (已移植到当前API — 建议实机复核)

> `bloxdSeconds()` 每 3600 秒 (1 小时) 回绕。但这是着色器流逝时间，不保证与游戏内太阳/昼夜同步。视觉周期动画可用，实际夜晚判定优先用 `bloxdSunDirection()` 与光照输入。

## 昼夜循环 (1 小时 1 天)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdSeconds() * 6.2831853 / 3600.0);   // 0..1 的 1 小时周期，不保证与游戏内昼夜同步
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

## 摇摆 (多 sin 叠加)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

## 流动极光带 / 荧光带

```wgsl
// 以 XZ 位置与时间混合 3 色
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```
