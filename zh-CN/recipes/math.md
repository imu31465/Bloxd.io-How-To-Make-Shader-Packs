# 数学小技巧



```wgsl
// 0..1 平滑分级 (n 级)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 二级阈值 (卡通阴影)
let shadow = smoothstep(0.35, 0.37, level);   // 阈值 ±0.02 形成台阶

// 三级卡通
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// 亮度 (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// 平滑脉冲
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// 三角波 (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// 秒 → 「缓慢相位」换算 (无视 3600 秒回绕的演出用)
let phase = t * 0.15;
```
