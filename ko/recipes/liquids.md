# 액체

> 대상 API: 5 · 대상 빌드: `ab90qa` (2026-11-03, 프로덕션) · 상태: Verified (현재 API로 이식됨 — 실기기 재확인 권장)

## 수면의 잔물결 (색의 명멸)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdRenderOffset().x);
    let worldZ = s.position.z + f32(bloxdRenderOffset().z);
    let ripple = sin(bloxdSeconds() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid 는 항상 BLOXD_ALPHA — 가드는 습관상
    #endif
    return out;
}
```

## 고도를 사용한 투명도의 유사 변화 (진짜 여울 판정이 아니다)

> 진짜 수심에는 액체 한정의 `bloxdOpaqueBehind()` 가 필요하다 — 안쪽 불투명면까지의 두께를 잰다 (완전한 레시피: [물을 자연스럽게 보이게 하기](../guides/water.md)). 아래는 그것을 쓰지 않는 더 간단한 유사 스타일링이다: `s.position.y` 는 로컬 좌표이므로 그대로 쓰면 청크 원점의 변화로 효과가 어긋난다. 월드 고도는 `bloxdWorldPosition()` 으로 변환해 쓴다. 아래는 월드 고도로 알파를 바꿀 뿐인 유사 연출이며, 해안선이나 수중 바닥을 따른 여울 표현이 아니다. `packWaterReferenceY` 는 월드 고도에 맞춰 조정한다.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // 낮은 고도에서는 얇게, 높은 고도에서는 원래 알파에 가깝게. 게임 안에서 방향은 확인할 것.
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

## 수중에서 본 수중 안개

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

## 액체에만 통하는 팩 (지형 무손상 구성)

```wgsl
// terrain_* 훅을 일절 쓰지 않는다. 그러면:
//  - terrain 베리언트 = 훅 없음 = 지형은 엔진 기존 그대로
//  - liquid 베리언트  = liquid_* 훅만 유효
```
