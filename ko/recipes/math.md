# 수식 도구 상자

> 대상 API: 5 · 대상 빌드: `bny9u` (2026-11-05, 프로덕션 확인) · 상태: Verified (현재 API로 이식됨 — 실기기 재확인 권장)



```wgsl
// 0..1 을 매끄럽게 단계화 (n 단)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 2단계의 임계값 (툰 그림자)
let shadow = smoothstep(0.35, 0.37, level);   // 임계값±0.02 로 계단을 만든다

// 3단계 툰
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// 루마 (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// 매끄러운 펄스
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// 삼각파 (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// 초 → 「느린 위상」 으로 변환 (3600초 감김을 고려하지 않는 연출용)
let phase = t * 0.15;
```
