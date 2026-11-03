# 야간 표현 설계

> 대상 API: 5 · 대상 빌드: `ab90qa` (2026-11-03, 프로덕션) · 상태: Verified (현재 API로 이식됨 — 실기기 재확인 권장)

그림자만 어둡게 하면, 태양 없을 때 엔진 완성색 (`engineColour`) 이 밝은 채 남아, 면과 그림자의 차이가 부자연스러워질 수 있다. 그림자의 색조가 아니라 완성색 전체에 감쇠를 걸 필요가 있다.

다음 예는 `bloxdSunDirection()` 이 제로면 밤측, 방향이 있으면 낮측으로 보고, 어두운 시간은 지형의 완성색을 감쇠시킨다. 조명 대응 베리언트에서는 `blockLight` 와 `heldLight` 가 강한 장소일수록 감쇠를 약하게 해, 횃불 등의 근거리광을 가급적 남긴다. `0.52` 는 조정값으로, 더 어둡게 하고 싶으면 작게 한다.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    if (bloxdLit()) {
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
        let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
        let protectLocalLight = smoothstep(0.03, 0.35, localLight);
        scale = mix(nightDim, 1.0, protectLocalLight);
}
    // 완성색을 감쇠시키고, 소재의 emission 은 기존대로 포그를 통해 가산한다
    out.colour = l.engineColour * scale + s.emission * (1.0 - l.fogAlpha);
    return out;
}
```

**이 처리의 한계:** `bloxdSunDirection()` 의 동작이 「태양 있음=단위 방향, 태양 없음=제로」 의 두 값이라면, 낮과 밤의 구별은 되어도 노을·박명을 연속적으로 추정할 수 없다. 또 완성색을 감쇠시키므로, 엔진측의 주광·환경광을 함께 약하게 하는 방식이며, 시간대를 완전히 재현하는 것은 아니다. 액체에도 같은 처리를 적용하고 싶으면 액체 훅의 폴백 관계를 확인할 것.
