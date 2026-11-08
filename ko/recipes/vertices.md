# 버텍스 (allow 전용)

> 대상 API: 5 · 대상 빌드: `v98qt8` (2026-11-08, 프로덕션·preprod 확인) · 상태: Verified (현재 API로 이식됨 — 실기기 재확인 권장)
> 전부 `#ifndef BLOXD_STRICT` 로 감쌀 것.
> 정확한 조건 (allow 타이틀 일람; Custom Games 는 strict) 은 [게임별 셰이더 팩 정책](../internals/policy.md) 참조

## 풀잎이 바람에 흔들린다 (위쪽만 움직인다)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdSeconds() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // 수직면만
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

## 액면의 파도 (윗면만)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdSeconds() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdSeconds() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

## 맥동하는 지형

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdSeconds() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // 법선 방향으로 미세하게 팽창수축
    return out;
}
#endif
```

## 파도치는 지형 (거대 sin 파)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdSeconds() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdSeconds() * 0.7) * 0.3;
    return out;
}
#endif
```
