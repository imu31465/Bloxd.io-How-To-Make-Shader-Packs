# 좌표

> 대상 API: 5 · 대상 빌드: `ab90qa` (2026-11-03, 프로덕션) · 상태: Verified (현재 API로 이식됨 — 실기기 재확인 권장)

## 월드 좌표

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

## 블록 좌표

```wgsl
let worldBlock = vec3i(floor(bloxdWorldPosition(l.position)));
```

## 체크무늬 (블록 단위)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 또는 1
out.colour *= mix(0.96, 1.04, checker);
```

## 블록 단위의 의사 난수 (해시)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// 용도: 풀색의 베리에이션, 돌의 색얼룩 등
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

## 시선 벡터와 림라이트

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

## 시선 각도 (프레넬 흉내 — 액체용)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 바로 위에서 1 / 얕은 각도 0
let fresnel = pow(1.0 - facing, 3.0);
```
