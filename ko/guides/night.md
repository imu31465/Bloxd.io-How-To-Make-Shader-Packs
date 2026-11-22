# 야간 표현 설계

> 대상 API: 5 · 대상 빌드: `bbb6l5` (2026-11-20, 프로덕션·preprod 확인) · 상태: Verified (현재 API로 이식됨 — 실기기 재확인 권장)

그림자만 어둡게 처리하면 태양이 없는 상황에서도 엔진이 출력하는 최종 색상 (`engineColour`) 은 밝게 남을 수 있다. 그 결과 밝게 비친 면과 그림자 영역의 명암 차이가 부자연스러워진다. 그림자만 조정하는 대신 최종 색상 전체를 어둡게 해야 한다.

아래 예제는 `bloxdSunDirection()`이 영벡터이면 밤, 영벡터가 아니면 낮으로 판단해 밤에 지형의 최종 색상을 어둡게 한다. 조명 기능이 활성화된 변형에서는 `blockLight` 또는 `heldLight`가 강한 곳일수록 어둡게 만드는 정도를 줄여 횃불 같은 가까운 광원이 최대한 유지되도록 한다. `0.52`는 조정 가능한 값이며, 밤을 더 어둡게 하려면 값을 낮춘다.

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

**이 방법의 한계:** `bloxdSunDirection()`이 태양이 있을 때는 단위 방향 벡터를, 없을 때는 영벡터를 반환하는 방식이라면 낮과 밤은 구분할 수 있지만, 해 질 녘이나 박명 시간대를 연속적으로 추정할 수는 없다. 또한 최종 색상을 어둡게 만들기 때문에 엔진의 주광과 환경광도 함께 약해진다. 하루 동안의 조명 변화를 완전히 재현하는 방법은 아니다. 액체에도 같은 방법을 적용하려면 액체 훅의 폴백 동작을 확인해야 한다.
