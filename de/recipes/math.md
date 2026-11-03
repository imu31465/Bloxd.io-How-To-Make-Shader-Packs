# Mathe-Tricks

> Ziel-API: 5 · Ziel-Build: `ab90qa` (2026-11-03, Produktion) · Status: Verified (auf die aktuelle API portiert — Prüfung auf dem Gerät empfohlen)

```wgsl
// weiche Quantisierung von 0..1 (n Stufen)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 2-Stufen-Schwelle (Toon-Schatten)
let shadow = smoothstep(0.35, 0.37, level);   // ±0.02 um die Schwelle baut Stufen

// 3-Stufen-Toon
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// Luma (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// weicher Puls
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// Dreieckswelle (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// Sekunden → „langsame Phase" (für Effekte, die den 3600-s-Umlauf ignorieren)
let phase = t * 0.15;
```
