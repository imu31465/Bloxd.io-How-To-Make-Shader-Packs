# Математический инструментарий

> Целевой API: 5 · Целевой билд: `bny9u` (2026-11-05, прод) · Статус: Verified (портировано под текущий API — рекомендуется перепроверить на устройстве)
```wgsl
// мягкое квантование 0..1 (n ступеней)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// двухуровневый порог (toon-тень)
let shadow = smoothstep(0.35, 0.37, level);   // ±0.02 вокруг порога дают ступени

// трёхуровневый toon
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// luma (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// мягкий пульс
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// треугольная волна (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// секунды → «медленная фаза» (для эффектов, игнорирующих цикл 3600 с)
let phase = t * 0.15;
```
