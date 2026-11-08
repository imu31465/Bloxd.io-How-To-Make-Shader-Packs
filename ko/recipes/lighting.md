# 조명

> 대상 API: 5 · 대상 빌드: `v98qt8` (2026-11-08, 프로덕션·preprod 확인) · 상태: Verified (현재 API로 이식됨 — 실기기 재확인 권장)

## 콘트라스트 S자 커브

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

## 거리 헤이즈 (독자 포그)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 64 블록에서 192 블록으로 0..0.35 의 포그를 직접 더한다
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

## 밤 (skyLight 구동의 파랑 시프트 + 등불 보호)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
}
    return out;
}
```

## 동굴을 깜깜하게 (skyLight 없는 곳을 더 어둡게)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        out.colour *= mix(1.0, 0.35, underground * underground);
}
    return out;
}
```

> `skyLight` 는 리프트 후의 값 (10장) 이므로, 옅은 가림 (나무 밑 등. 생값 0.87 → 리프트 후 0.97) 은 이 방법으로는 거의 어두워지지 않는다. 동굴 (생값 0) 에는 통한다. 「숲그늘」 을 또렷하게 하고 싶으면 R9.12 의 리프트 역변환 + 임계값 방식을 쓴다.

## 밤의 파란 환경광 (달의 방향을 쓰지 않는 유사 표현)

> 이 API에서는 태양 없는 하늘의 `bloxdSunDirection()` 은 제로이다. 방향성 달빛이 아니라, 어두운 하늘에 희미한 파란 환경광을 더할 뿐이다. 단 달의 방향 자체는 `-bloxdSunDirection()` 으로 얻을 수 있다 (낮밤 사이클 월드 한정 — [태양과 달](../internals/sun-and-moon.md) 참조).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let upward = clamp(l.normal.y, 0.0, 1.0);
        out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
}
    return out;
}
```

## 노을의 따뜻함 (태양 고도로 색을 기울이기)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 지평선에서 1 / 바로 위에서 0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

## 엔진 출력의 완전 교체 (가장 단순한 재조명)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    if (bloxdLit()) {
        // ※ BloxdLight(...) 의 직접 구축은 금지. default 에서 만들어 colour 를 고친다
        var out = bloxdDefaultLight(s, l);
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let level = clamp(sky * 0.7 + block, 0.0, 1.0);
        // engineColour (엔진의 조명 결과) 를 버리고 「소재의 색 × 직접 계산한 밝기」 로 교체한다
        var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));   // engineColour 를 버렸으므로 포그를 다시 거는 것 (필수)
        out.colour = col + s.emission * (1.0 - l.fogAlpha);   // emission 도 직접 더한다 (필수)
        return out;
} else {
        return bloxdDefaultLight(s, l);
}
}
```
