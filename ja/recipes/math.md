# 数式小技集

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認) · 検証状況: Verified (v5 移植済み — 動作は同一ビルドで実機確認を推奨)

レシピの部品になる数式断片。`smoothstep`・`pow`・三角波など。


```wgsl
// 0..1 を滑らかに段階化 (n 段)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 2 段階のしきい値 (トゥーン影)
let shadow = smoothstep(0.35, 0.37, level);   // しきい値±0.02 で階段を作る

// 3 段階トゥーン
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// ルーマ (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// 円滑なパルス
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// 三角波 (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// 秒 → 「ゆっくりな位相」に変換
let phase = t * 0.15;
```

## 関連

- [色のレシピ](colors.md)
- [時間とアニメーションのレシピ](animation.md)
