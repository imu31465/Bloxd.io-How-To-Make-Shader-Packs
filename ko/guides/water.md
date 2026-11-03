# 물을 자연스럽게 보이게 하는 통합 레시피



이 API에서는 씬색을 샘플링할 수 없으므로, **진짜 반사·굴절이 아니라, 프레넬풍의 색 블렌드와 태양 하이라이트에 의한 유사 표현**이 된다 (수심 계산은 v2의 `bloxdOpaqueBehind()` 로 가능해져, [제8부](../history/v2.md) R-E에 분리했다). 아래는 색의 베이스를 남기면서, 얕은 시선 각도로 하늘색에 가까운 색을 조금 섞고, 태양이 있을 때만 작은 글린트를 더하는 샘플.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    if (bloxdLit()) {
        let worldPos = bloxdWorldPosition(l.position);
        let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
        let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdSeconds()), topness));
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let halfDir = normalize(viewDir + sunDir);
            let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
            out.colour += vec3f(1.0, 0.97, 0.90) * glint;
        }
}
    return out;
}
```

조정 기준:

- 물이 하얗다 / 밝다: `fresnel * 0.38` 의 `0.38` 과 글린트의 `0.55` 를 낮춘다.
- 물이 진하다: `fakeSkyReflection` 의 혼합률을 조금 올린다. 단 올리면 플라스틱처럼 보인다.
- 수면에 선도 규칙적인 줄무늬가 보인다: 파의 주파수나 글린트 강도를 낮춘다. 수면 메시 자체의 정점 변위는 이 코드에는 없다.
- 실제 경치를 비추고 싶다: 이 API 입력에는 화면색이 없으므로, 색을 섞을 뿐 실반사가 안 된다 (깊이는 액체 한정으로 얻을 수 있다. [제8부](../history/v2.md) R-E).

이 레시피는 기존의 `bloxdLiquidLight` 를**바꾼다**는 것. R9.7 의 동명 파법선 함수나 다른 동명 훅과 중복해 붙이지 않는다.


## 셰이더 팩과 수중의 실상



수중 겉모습은 3층으로 되어 있다:

| 층 | 내용 | 팩에서 다룰 수 있는가? |
|---|---|---|
| ① 지형/액체 그리기 | 훅으로 다룰 수 있다. light 훅은 수중에서도 평소처럼 불린다 | 가능 (「베일 밑」 에서 통한다) |
| ② 액체 정의색 베일 | 카메라가 들어간 액체 블록 정의 color/alpha 의 emissive 풀스크린 quad 로, 훅 파이프라인 밖 (최전면) 에 그려진다. 게임 설정 `cameraTint` 이 있으면 그쪽이 우선 | 불가 (색도 농도도 바꿀 수 없다) |
| ③ cameraTint | 게임 설정 | 불가 |

실무 포인트: 팩은 수중에서도 계속 동작한다 / 베일은 없앨 수 없다 / 수중에서는 분기할 수 없다 (fogStart / fogEnd / fogColour 는 수중에서도 변하지 않으므로 fogVisibility 로도 검출할 수 없다).
