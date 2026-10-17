[← 이전 부](5-troubleshooting.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](7-internals.md)

# 제6부: 구현 시 중요한 보충

## 19. 야간에 「그림자는 어두운데 표면만 밝다」 를 고친다

그림자만 어둡게 하면, 태양 없을 때 엔진 완성색 (`engineColour`) 이 밝은 채 남아, 면과 그림자의 차이가 부자연스러워질 수 있다. 그림자의 색조가 아니라 완성색 전체에 감쇠를 걸 필요가 있다.

다음 예는 `bloxdSunDirection()` 이 제로면 밤측, 방향이 있으면 낮측으로 보고, 어두운 시간은 지형의 완성색을 감쇠시킨다. 조명 대응 베리언트에서는 `blockLight` 와 `heldLight` 가 강한 장소일수록 감쇠를 약하게 해, 횃불 등의 근거리광을 가급적 남긴다. `0.52` 는 조정값으로, 더 어둡게 하고 싶으면 작게 한다.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    #ifdef BLOXD_LIGHTING
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
    let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
    let protectLocalLight = smoothstep(0.03, 0.35, localLight);
    scale = mix(nightDim, 1.0, protectLocalLight);
    #endif
    // 완성색을 감쇠시키고, 소재의 emission 은 기존대로 포그를 통해 가산한다
    out.colour = l.engineColour * scale + s.emission * l.fogVisibility;
    return out;
}
```

**이 처리의 한계:** `bloxdSunDirection()` 의 동작이 「태양 있음=단위 방향, 태양 없음=제로」 의 두 값이라면, 낮과 밤의 구별은 되어도 노을·박명을 연속적으로 추정할 수 없다. 또 완성색을 감쇠시키므로, 엔진측의 주광·환경광을 함께 약하게 하는 방식이며, 시간대를 완전히 재현하는 것은 아니다. 액체에도 같은 처리를 적용하고 싶으면 액체 훅의 폴백 관계를 확인할 것.

## 20. 물을 자연스럽게 보이게 하는 통합 레시피

이 API에서는 씬색을 샘플링할 수 없으므로, **진짜 반사·굴절이 아니라, 프레넬풍의 색 블렌드와 태양 하이라이트에 의한 유사 표현**이 된다 (수심 계산은 v2의 `bloxdOpaqueBehind()` 로 가능해져, [제8부](8-apiv2.md) R-E에 분리했다). 아래는 색의 베이스를 남기면서, 얕은 시선 각도로 하늘색에 가까운 색을 조금 섞고, 태양이 있을 때만 작은 글린트를 더하는 샘플.

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
    #ifdef BLOXD_LIGHTING
    let worldPos = bloxdWorldPosition(l.position);
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdTime()), topness));
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let halfDir = normalize(viewDir + sunDir);
        let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
        out.colour += vec3f(1.0, 0.97, 0.90) * glint;
    }
    #endif
    return out;
}
```

조정 기준:

- 물이 하얗다 / 밝다: `fresnel * 0.38` 의 `0.38` 과 글린트의 `0.55` 를 낮춘다.
- 물이 진하다: `fakeSkyReflection` 의 혼합률을 조금 올린다. 단 올리면 플라스틱처럼 보인다.
- 수면에 선도 규칙적인 줄무늬가 보인다: 파의 주파수나 글린트 강도를 낮춘다. 수면 메시 자체의 정점 변위는 이 코드에는 없다.
- 실제 경치를 비추고 싶다: 이 API 입력에는 화면색이 없으므로, 색을 섞을 뿐 실반사가 안 된다 (깊이는 액체 한정으로 얻을 수 있다. [제8부](8-apiv2.md) R-E).

이 레시피는 기존의 `bloxdLiquidLight` 를**바꾼다**는 것. R9.7 의 동명 파법선 함수나 다른 동명 훅과 중복해 붙이지 않는다.

## 21. 실기 테스트 체크리스트

컴파일 성공과 「보기 좋다」 는 별개이므로, 다음 순서로 확인한다.

1. **읽기:** `pack.json` 이 ZIP 직하에 있을 것, 설정 화면에서 `Ready to use` 가 될 것.
2. **8 베리언트:** strict / allow, 조명 on / off, terrain / liquid 각 조건에서 타입 가드 누락이 없을 것. 게임이 일부 조건만 쓰더라도, 배포용 팩은 8가지를 전제한다.
3. **주간:** 풀·돌·모래·목재 등 소재마다 색이 날지 않았는가, 윗면과 측면의 명암차가 부자연스럽지 않은가를 본다.
4. **야간:** 해가 비출 때와 같은 소재, 그림자, 횃불 근처를 비교한다. 밝은 면만 남으면 노출 감쇠, 전부가 어두워지면 국소광 보호를 조정한다.
5. **물:** 바로 위·얕은 시선 각도·기슭·수중·밤을 따로 본다. 알파 거동과 수중 보기는 게임측 합성 방식에 의존하므로 하나의 시점에서만 판단하지 않는다. 수중에서는 액체 정의색 베일이 앞을 가리므로 (위 참조), 팩 차이는 주로 수면과 베일 너머 지형에서 확인한다.
6. **경계와 거리:** 청크 / 원점 전환으로 파도나 무늬가 튀지 않는가, 원경에서 이중 포그나 흰 안개가 나오지 않는가를 확인한다.
7. **성능:** 해시·삼각 함수·`pow` 를 남용하는 효과는 필요 최소한으로 한다. 디테일을 조금씩 추가해 FPS를 비교한다.

### 알려진 제약을 전제로 한다

- shader pack 은 terrain / liquid 훅에 한정되며, 하늘·엔티티·UI를 같은 코드로 처리하는 구조가 아니다.
- 섀도맵, 화면 공간 반사, 굴절, 블룸 등을 추가하기 위한 입력은 이 API에 없다 (씬 깊이는 액체 한정으로 `bloxdOpaqueBehind()` 로 풀렸다. [제8부](8-apiv2.md) 참조).
- `bloxdTime()` 은 애니메이션용 시간으로, 게임 안의 낮밤과 연동된다는 보장은 없다.
- `bloxdSunDirection()` 이 제로면 진짜 달의 방향은 알 수 없으며, 파란 환경광을 더하는 처리는 분위기를 만드는 근사. 방향성 달빛은 `-bloxdSunDirection()` 으로 만든다 (낮밤 사이클 월드 한정. [제7부](7-internals.md) R-A).
- `s.position` / `l.position` 은 로컬 좌표이므로, 월드 위치에 의존하는 효과에서는 `bloxdOriginOffset()` 을 더한다. 블록 안 로컬 무늬를 만들 경우는, 의도적으로 로컬 좌표를 쓸 수도 있다.

## 22. 셰이더 단독으로 한계가 있을 경우의 조합

셰이더 팩측에서 텍스처를 추가·샘플링할 수 없다는 제약이 있으므로, 소재 그 자체의 미세한 요철이나 하늘의 화상을 바꾸고 싶으면 셰이더만으로 해결하려 하지 않는다. Bloxd.io용 공개 텍스처팩 리포지토리 [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) 에는 텍스처, skybox, 모델 등을 다루는 별도 방식이 있다.

현실적으로는, **셰이더로 빛과 색을 조정하고, 대응하는 별도 리소스팩으로 소재나 하늘을 보완**하는 방침이 좋다. 단, 별도 팩과의 동시 이용 가능 여부나 읽기 순서는 게임측의 구현·설정으로 확인할 것.

## 23. 셰이더 팩과 수중의 실상

수중 겉모습은 3층으로 되어 있다:

| 층 | 내용 | 팩에서 다룰 수 있는가? |
|---|---|---|
| ① 지형/액체 그리기 | 훅으로 다룰 수 있다. light 훅은 수중에서도 평소처럼 불린다 | 가능 (「베일 밑」 에서 통한다) |
| ② 액체 정의색 베일 | 카메라가 들어간 액체 블록 정의 color/alpha 의 emissive 풀스크린 quad 로, 훅 파이프라인 밖 (최전면) 에 그려진다. 게임 설정 `cameraTint` 이 있으면 그쪽이 우선 | 불가 (색도 농도도 바꿀 수 없다) |
| ③ cameraTint | 게임 설정 | 불가 |

실무 포인트: 팩은 수중에서도 계속 동작한다 / 베일은 없앨 수 없다 / 수중에서는 분기할 수 없다 (fogStart / fogEnd / fogColour 는 수중에서도 변하지 않으므로 fogVisibility 로도 검출할 수 없다).
