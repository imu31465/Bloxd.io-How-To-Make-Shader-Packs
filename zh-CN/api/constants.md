# 常量

> 目标API: 5 · 目标构建: `ab90qa` · 状态: Analyzed (从现行标头逐字复原)

标头提供三个常量 (纹理名称常量 `bloxdTextureId*` 见[纹理 API](texture-api.md))。

```wgsl
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Blocks along each side of a chunk.
const bloxdChunkSize: i32 = 32;
```

| 常量 | 类型 | 值 | 说明 |
|---|---|---|---|
| `bloxdPi` | `f32` | 3.1415926535898 | 圆周率 |
| `bloxdTau` | `f32` | 6.2831853071796 | 2π (周期计算很顺手) |
| `bloxdChunkSize` | `i32` | 32 | 区块每边的方块数 |

## 用法

### bloxdPi / bloxdTau

已替你声明 — 无需自己定义 pi。`bloxdTau` 适合周期动画：

```wgsl
fn sway(worldPos: vec3f, time: f32) -> f32 {
    let phase = dot(worldPos, vec3f(1.0, 0.5, 0.8));
    return sin(time * bloxdTau / 3.0 + phase);
}
```

### bloxdChunkSize

区块每边的方块数，以具名常量提供、可用于分支。适合区块周期效果 (棋盘格、区块边界描边)：

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    let p = bloxdWorldPosition(light.position);
    let chunk = floor(p / f32(bloxdChunkSize));
    let parity = (chunk.x + chunk.z) % 2.0;
    out.colour *= mix(1.0, 0.96, parity);
    return out;
}
```

注意: `bloxdChunkSize` 是 `i32` — 与浮点数混用时以 `f32(bloxdChunkSize)` 转换。

## 相关

- [函数](functions.md) · [版本历史: v3](../history/v3.md) (`bloxdPi` / `bloxdTau` 登场的版本)
