# 렌더링 파이프라인

> 대상 API: 5 · 대상 빌드: `ab90qa` (2026-11-03, 프로덕션) · 상태: Analyzed (프로덕션 번들의 JavaScript 수준 분석)

- **surface 훅은 alphaTest 의 「앞」 에서 돈다**: `out.alpha` 가 그대로 discard 판정에 쓰인다. 컷아웃 소재 (풀·잎) 에서는 디더 패턴으로 녹는 듯한 이펙트를 만들 수 있다 (레시피 R-C). 액체 (블렌딩) 에서는 `out.alpha` 가 실제 투명도가 된다 (레시피 R-D). 통상 불투명 지형에서는 alpha 가 끝내 무시된다
- **`l.ambient` 의 내용**은 `material.ambient × sceneAmbient` 로 소재마다 다른 값이다. 씬측은 그래픽 설정 「Ambient Lighting Intensity」 (기본 0.5) 에 직결되어 있으므로, 기본값 때려박기를 하지 않는다
- **씬의 방위광은 2등 구성**: 주광 (방향은 스카이 설정의 태양 위치에 유래·강도 1.0) 과 필광 (방향 `[-0.5, -1, -1]`·강도 0.35) 의 Lambert 합이 `l.directional` 로 도착한다. 필광은 방향이 아래를 향하므로 윗면에는 기여하지 않고, 아래를 향한 면 (동굴 천장 등) 을 집는다. 지형이 고려하는 것은 `_initScene` 으로 추가된 등뿐이며, 기동 후에 씬에 추가한 등은 지형·블록 모델에서 무시된다 (공식 경고 문구가 있다)
- **`bloxdSeconds()` 의 정체는 `performance.now()`** 이다: 브라우저의 기동 경과 시간을 1시간으로 감은 값. 게임 안 낮밤이나 월드 경과 시간과 무관하다. 게임 안 시계와 동기된 애니메이션을 만들고 싶으면, 낮밤 사이클 구현 월드의 `bloxdSunDirection()` 방위각에서 추정하는 것이 현실적이다
- **헤더 함수는 uniform 하나를 읽는다**: 엔진은 `@group(3) @binding(0)` 에 64바이트 `bloxdPackInputs` uniform (seconds / lit / renderOffset / sunDirection / eyePosition 의 5슬롯·little-endian) 을 두고 있으며, `bloxdSeconds()` / `bloxdLit()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` 이 각 슬롯의 읽기에 해당한다 ([팩 형식: 프레임당 uniform](../api/pack-format.md#per-frame-uniform-bloxdpackinputs)). 팩에서 이 uniform 을 고쳐 쓸 수는 없고, 팩과 엔진의 WGSL은 같은 모듈로 합성되므로, 같은 group/binding 을 자신이 선언할 수도 없다. `@group(3) @binding(1)` 에는 액체의 씬 깊이 텍스처가, `@binding(2)` 에는 `bloxdSpTextureLayers` 스토리지 버퍼가 실린다.
- **정점 데이터는 메셔 (Web Worker) 가 만든다**: 블록의 지형을 1정점 28바이트 (아틀라스 있음은 32바이트) 의 인터리브로 정리하고, 위치 = float32×3 / 법선 = 8bit 신호 정수×4 / 색 = 8bit 준정수×4 (`s.colour` 의 실체 — tint × AO 가 메셔 시점에 8bit 로 구워져, 팩에서 분리·복원은 원리적으로 불가) / UV = float32×2 / atlasIndex = float32. 라이트 레벨만은 독립된 4바이트 정점 버퍼로 운반된다 (실측값: [엔진 데이터 장부](engine-data.md)). 정점은 청크 단위의 instancing 으로 그려진다
- 로딩 때 청크 경계의 미세 체크무늬는 엔진의 화면 공간 Bayer 4×4 디더 청크 페이드이며, 팩 유래 버그가 아니다 (그래픽 설정의 `chunkFadeIn` 을 끄면 무효화할 수 있다)
- **`mod` 는 예약어**: `pack.wgsl:3 'mod' is a reserved word in WGSL.` 로 거부된다. 나머지는 `%` 연산자로 쓴다

## R-C. Bayer 디더 용해 — out.alpha 가 discard 를 제어한다

엔진이 청크 페이드에 쓰는 것과 **같은 Bayer 4×4 테이블**을 재현해, 낮은 블록부터 순서대로 디더로 「녹는」 cutout 을 만든다. alphaTest 소재 (풀·잎) 에서는 discard 가 돌고, 액체에서는 블렌드 투명도가 된다.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod 는 예약어이므로 % 연산자를 쓴다
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // 낮은 블록부터 녹는다. dissolve 가 높을수록 남는다
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

## R-D. 물의 카메라 근접 페이드 — 액체의 alpha 로 시야를 확보한다

액체 훅의 `out.alpha` 는 블렌딩에 직결된다. 카메라 바로 아래 수면만 비워서, 잠수·수상 카메라의 시야를 확보하는 레시피.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0~3 블록에서 완전 투명→통상
    #endif
    return out;
}
```
