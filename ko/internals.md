[← 이전 부](implementation.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](apiv2.md)

# 제7부: 내부 사양의 보충

엔진 구현 해석으로 밝혀진 추가 사양. 모두 현행 정식 빌드의 JavaScript 에서 직접 복원한 것이다.

## 24. 태양과 달의 정체

`bloxdSunDirection()` 의 공급원은 스카이박스 종류가 바뀔 때만 다시 쓰는 태양 방향 버퍼이며, 판단 기준은 「하늘에 태양이 있는가」 가 아니라 **「스카이박스가 earth 타입인가」** 이다.

| 스카이박스 | `bloxdSunDirection()` |
|---|---|
| `default` (절차 하늘) | 0이 아님 (기존값 아래) |
| `gloomy` / `interstellar` / `space_*` (큐브 텍스처) | **항상 (0,0,0)** |

**달은 항상 `-bloxdSunDirection()` 에 있다** (엔진이 달의 위치를 태양의 정반대로 계산하기 때문). 밤낮 판정은 태양 고도로 한다 — `bloxdSunDirection().y < 0` (태양이 지평선 밑) 일 때 달이 위에 있다. 단 기존 월드에서는 태양이 정지해 있으므로 달도 정지해 있으며, 움직이는 달이 의미 있는 것은 낮밤 사이클을 구현한 월드뿐이다.

기존 월드의 태양 방향은 약 `(-0.56, 0.81, -0.18)` (inclination = −0.2 / azimuth = 0.55 에서 계산되는 단위 벡터, 정지). 배포 팩 테스트 때 하이라이트 방향을 미리 예측할 수 있는 실용 기준값이다.

낮밤 사이클은 엔진에 내장되어 있지 않다 — inclination 은 정적인 수치이며, 낮밤이 움직이는 월드는 게임측이 갱신한다. 그 갱신 때마다 `bloxdSunDirection()` 도 다시 쓰이므로 따라간다.

지형의 방향광은 씬 기동시에 만들어지는 2등뿐이며 **방향도 강도도 고정, 낮밤에 변하지 않는다**. 정리하면 **지형 밝기를 정하는 요소는 어느 것도 시간에 의존하지 않는다. 낮밤의 「겉모습」 은 스카이박스와 bloxdSunDirection() 뿐**이며, 밤에 지형을 어둡게 하고 싶은 팩은 bloxdSunDirection() 에서 직접 시간대를 추정할 수밖에 없다 (§19 의 `sunPresent` 수법).

### R-A. 방향성 달빛 — moonDir = −bloxdSunDirection()

달이 위에 있을 때만 푸르스름한 흰 Lambert 와 약한 스페큘러를 더한다. `moonUp` 이 0인 세계 (기존 정지 태양 월드) 에서는 아무 일도 일어나지 않으므로, **낮밤 사이클 있는 월드에서만 발동하는 안전한 달빛**이 된다.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 달은 항상 태양의 정반대. 낮 동안은 moonDir.y < 0 으로 자동 소등된다
    let moonDir = -bloxdSunDirection();
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(bloxdEyePosition() - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. 포그의 내부 사양

포그 계산은 항상 LINEAR 모드 (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1) 이며, `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = 포그 거리 설정. D = 0 일 때만 fogEnd = 5 특례) 이다. **포그 기울기대는 고작 32 블록 폭**이며, `l.fogVisibility` 는 「거리 안개」 라기보다 **「읽힌 월드의 가장자리까지 정규화 거리」** 지표이다. 플레이어마다 읽기 거리가 다르므로, 거리 기반 연출은 직접 `distance(l.position, bloxdEyePosition())` 을 계산해야 한다 (레시피 R-B).

기존 포그색은 `rgb(183, 191, 195)` (엷은 청회색). 월드 작성자는 `fogColourOverride` (hex) 로 바꾼다. 포그 모드 0 (NONE) 일 때 **fogColour 는 검정으로 도착한다**. 표준형 `mix(l.fogColour, col, l.fogVisibility)` 는 fogVisibility 가 1 일 때 안개색을 쓰지 않으므로 안전.

플레이어측 `showFog` 를 끄면 포그는 3200~3328 블록으로 밀려나 사실상 무효가 된다 (`fogVisibility ≈ 1` 이 계속 돌아온다).

### R-B. 읽기 경계 밴드 — fogVisibility 를 「월드 가장자리」 로 쓴다

읽기 경계의 32 블록대만 조용히 냉색으로 조여서, 월드 끝을 눈에 띄지 않게 한다 (또는 연출로 강조한다). 거리를 직접 계산하지 않으므로, 플레이어의 읽기 거리 설정에 자동 추종하는 것이 이점.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = 안쪽 (경계까지 여유 있음), 0 = 경계 밖으로 나갈 직전
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. blockLight / heldLight 의 내부 구조

`aPackedLightLevels` 를 디코딩할 때, 엔진은 각 채널에 **RGB 가장 밝은 채널의 35% 를 하한으로 까는 「35% 채널 바닥」** 을 깐다. 예를 들어 「순수 빨간 광원」 은 정점에서 (1.00, 0.35, 0) 으로 들려서 보간·리프트를 탄다. 횃불 오렌지가 게임 안에서 「빨강이라기보다 하얀 핑크」 로 보이는 것은 이 때문이다. 난색 토치 계열 레시피 (R9.1) 의 채도는 이 기본 동작을 기준으로 조정하면 좋다.

손에 든 빛 (`heldLight`) 의 범위는 가장 밝은 빛색 채널을 따르며 (최대 15 블록), `dist^0.75` 전처리가 들어가고, 같은 35% 채널 바닥이 적용되며, `l.heldLight` 는 앰비언트 부스트 **전** 값이다. 커스텀 아이템에는 `spotlightRange` (사정) 와 원뿔각을 정할 수 있어, 「들고 있는 동안 지향성 빔을 쏜다」 모드가 존재하며 그 원뿔은 카메라를 따라간다. 팩측에서는 빔 방향을 알 방법이 없다.

커스텀 블록에는 `skyLightEmission` (0~15) 이 달릴 수 있어, **blockLight BFS 와는 별개로 skyLight 채널 자체를 주입할 수 있다**. R9.12 같은 「skyLight 임계값으로 낮/그림자를 판별하는」 팩은, 인공광으로 skyLight 가 들려 있는 월드에서는 오판할 수 있다. 배포 팩은 blockLight 와 조합해 판정하는 편이 견고하다.

## 27. 파이프라인 세부

- **surface 훅은 alphaTest 의 「앞」 에서 돈다**: `out.alpha` 가 그대로 discard 판정에 쓰인다. 컷아웃 소재 (풀·잎) 에서는 디더 패턴으로 녹는 듯한 이펙트를 만들 수 있다 (레시피 R-C). 액체 (블렌딩) 에서는 `out.alpha` 가 실제 투명도가 된다 (레시피 R-D). 통상 불투명 지형에서는 alpha 가 끝내 무시된다
- **`l.ambient` 의 내용**은 `material.ambient × sceneAmbient` 로 소재마다 다른 값이다. 씬측은 그래픽 설정 「Ambient Lighting Intensity」 (기존 0.5) 에 직결되어 있으므로, 기존값 때려박기를 하지 않는다
- **`bloxdTime()` 의 정체는 `performance.now()`**: 브라우저 기동 경과 시간을 1시간으로 감은 값이다. 게임 안 낮밤이나 월드 경과 시간과 무관하다. 게임 안 시계와 동기된 애니메이션을 만들고 싶으면, 낮밤 사이클 구현 월드의 `bloxdSunDirection()` 방위각에서 추정하는 것이 현실적이다
- 로딩 때 청크 경계의 미세 체크무늬는 엔진의 화면 공간 Bayer 4×4 디더 청크 페이드이며, 팩 유래 버그가 아니다
- **`mod` 는 예약어**: `pack.wgsl:3 'mod' is a reserved word in WGSL.` 로 거부된다. 나머지는 `%` 연산자로 쓴다

### R-C. Bayer 디더 용해 — out.alpha 가 discard 를 제어한다

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
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. 물의 카메라 근접 페이드 — 액체의 alpha 로 시야를 확보한다

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

## 28. 팩에 보이는 값을 바꾸는 것 — 테스트 체크리스트

같은 팩도 **월드와 플레이어 설정에 따라** 다르게 보인다. 배포 전에는 적어도 다음 3 환경에서 겉모습을 확인할 것:

1. **통상 월드** (default 스카이박스·오버라이드 없음) — bloxdSunDirection() 있음·기존색
2. **space 계열 스카이박스 월드** — bloxdSunDirection() = 0. `sunPresent` 분기의 겉모습
3. **`visionMinLightColour`·`skyLightColourOverride` 를 정한 커스텀 월드** — 어두운 곳과 색이 들려 있는 경우

주된 변동원: `lightingOverride` (조명 강제) / `skyLightColourOverride`·`ambientLightColourOverride` (hex 교체) / `visionMinLightColour` (하늘과 앰비언트에 대한 「볼 수 있는 가장 어두운 색」 하한. Night Vision 이 쓴다 — 「동굴을 깜깜하게」 계열 팩은예상보다 어두워지지 않는다) / `heldLightColourOverride`·`Range`·`ConeAngle` / `fogChunkDistanceOverride`·`fogColourOverride`·`fogOnSkybox` / `skyBox` (bloxdSunDirection() 유무). `uSkyLightColour` 기존 = (1,1,1) 흰색, `uAmbientLightColour` 기존 = (0.25,0.25,0.30). `l.ambient` 씬측 = 그래픽 설정 「Ambient Lighting Intensity」 (기존 0.5). `l.fogVisibility` 는 플레이어 포그/청크 거리 설정을 따라간다.

## 29. 디버깅 수단

- URL 파라미터 `?renderer=lite` — Lite 렌더러 강제 (`?renderer=webgl2` / `babylon` 도 가능)
- URL 파라미터 `?vconsole` — 화면 안 콘솔 (VConsole) 기동. 모바일 실기 검증에 요긴하다
- 콘솔에는 `noa-engine v0.33.0` 과 `Renderer: lite from <소스>` 가 나온다 — 그리기 경로 오진단 방지에 먼저 이것을 확인할 것
- WebGPU 렌더러는 팩 적용 중 「강제 ON」 으로 잠긴다. 「Disable Block Texture Atlas」 설정도 잠기며 (아틀라스 ON 유지), WebGPU 미대응 환경에서는 애초 팩이 적용되지 않는다. 배포 페이지에 「WebGPU 대응 브라우저가 필요」 라고 쓰는 근거는 여기이다
- 게임 참가 때마다 런타임 재검증 (`checkCompilation`) 이 돌아, 실재하는 전 지형 소재를 브라우저 WebGPU 로 실컴파일한다 (설정 화면의 정적 검증보다 엄격). 여기서 떨어지면 팩은 그 게임에서 제외된다

## 30. 게임별 적용 모드 (`shaderPackPolicy`)

여기서 §7 의 「allow / strict」 가 타이틀 단위 설정임을 확정한다. 게임 정의 측의 `shaderPackPolicy` 이 명시적으로 `"allow"` 인 타이틀만 full 모드 (vertex 훅, `discard`, 지형 `alpha`) 로 움직이고, 지정이 없는 (또는 allow 이외의) 타이틀은 strict 가 된다 — `BLOXD_STRICT` 가 정의되고, 가드 내부의 코드는 자동으로 무효화된다. 이 판정은 팩 측에서 고를 수 없으므로, 어느 타이틀에서 무엇이 움직이는지 아는 것이 배포의 전제가 된다.

- 근거 빌드: `szby6g.main.94a7596c.js` (2026-10-17 시점의 정식 배포). 전체 111 게임 정의를 정적으로 분석한 결과 **allow 26 엔트리 (12 타이틀) / strict 85 엔트리**.
- allow 는 기저 정의의 직서 8 곳과 기저 변수 (`tb` / `kz` / `cb` / `Fb`) 의 4 곳 합계 12 곳에서 선언되고, 베리언트는 스프레드 상속 (`{...tb,...}`) 으로 받는다. 베리언트 단위의 개별 덮어쓰기 (부모 allow·자식 strict 의 역 패턴) 는 현재 제로.

allow 의 12 타이틀 (합계 26 엔트리):

- **Test Gym** — 기본 + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (합계 11 엔트리)
- **Doodle Cube** — 기본 + Solos / Duos (합계 3)
- **Rocket Obby** — 기본 + Sheep / January (합계 3)
- **단독 타이틀 (9)**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

strict 측에서 특히 오해하기 쉬운 점:

- **Superflat Creative (classic_creativeFlat) 은 strict**. 「Creative」 를 이름에 포함하지만, classic 계열에서 allow 인 것은 통상의 Creative (`classic_creative`) 뿐. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns 등도 전부 strict
- **Custom Games (customGames) 은 strict**. 자작 커스텀 게임에서는 vertex 훅 계열의 효과가 발동하지 않는다. 작업용 검증은 Test Gym 을 사용하는 것이 확실
- bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) 계열의 주요 PvP·서버계 타이틀은 전부 strict

한편 strict 타이틀에서도 팩의 로드와 컴파일 자체는 이루어지고, surface / light 등 프래그먼트 측 레시피는 통상대로 움직인다. 제한을 받는 것은 vertex 훅 (`bloxdTerrainVertex` / `bloxdLiquidVertex`) 과 `discard`, 그리고 지형 `alpha` (액체는 항상 존재) 이다.

이 일람은 상기 빌드 시점의 정적 분석 결과이며, 엔진 갱신으로 allow/strict 의 배분은 변할 수 있다. 새판이 나오면 재확인할 것.
