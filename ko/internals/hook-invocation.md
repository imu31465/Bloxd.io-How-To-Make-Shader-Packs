# 훅 호출의 내부

> 대상 API: 5 · 대상 빌드: `ab90qa` · 상태: Analyzed (프로덕션 번들에서 복원 — Lite 렌더러. 통합 소스 파일 `lite/terrainShaderPack.ts` 가 오류 문자열에 살아 있다)

엔진이 런타임에 훅을 부르는 방식. 쓰는 코드에는 아무것도 바뀌지 않지만, 훅이 무엇을 받는지에 대한 추측이 사라진다.

## 접합 (splice) 아키텍처

렌더러는 JavaScript 에서 훅을 「호출」하지 않는다. 팩이 검증을 통과하면, 엔진은 **셰이더 텍스트의 고정 앵커 행을 치환해, 당신의 훅 호출을 자기 terrain WGSL 에 이식한다**. 각 앵커는 정확히 한 번 매치되어야 한다 — 0회 또는 복수 매치는 `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)` 로 중단한다.

| 단계 | 엔진 셰이더의 앵커 | 이식되는 것 |
|---|---|---|
| 버텍스 | `let worldPos = …` 부터 `vertexOutputs.vNormalW = …` 블록까지 | `BloxdVertexIn` 을 구축, 버텍스 훅 호출, `worldPos` 를 되돌려 쓴다 (`let worldPos` 를 `var worldPos` 로 재작성하는 것도 포함) |
| 서피스 | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | `BloxdSurfaceIn` 을 구축, 서피스 훅 호출, `baseColor` / `alpha` 를 되돌려 쓴다 |
| lit color | 포그 믹스 직전 | 포그 이전의 색을 캡처 (v3 는 `bloxdSpLitColour` 임시변수를 썼다 — v5 는 이 역할을 공개 헤더 함수 `bloxdLitColour()` 로 승격) |
| 라이트 | 프래그먼트 셰이더 끝의 `return color;` | `BloxdLightIn` 을 구축, light 훅 호출, `color` 를 되돌려 쓴다 — 포그 믹스 후 |

## 접합이 강제하는 것

- **strict 지형은 서피스 훅의 alpha 변경을 무시한다.** `alpha = bloxdSpSurface.alpha` 되돌리기 쓰기는 액체 프로그램이나 비strict 베리언트에만 이식된다 — 매크로 표 뒤의 구현이다 ([전처리기](../api/preprocessor.md))
- **버텍스 훅을 선언한 strict 베리언트는 그것을 결코 실행하지 않는다.** 엔진이 빌드 시점에 보고한다: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. 템플릿의 `#ifndef BLOXD_STRICT` 이 이 때문이다
- **`bloxdSp*` 식별자**는 엔진 임시변수다 — 당신의 코드에는 보이지 않지만 진단과 리버스 엔지니어링 출력에는 나타난다 ([예약 식별자](reserved-identifiers.md) — v5 에서 46개)
- **기본 서피스 지름길.** 어떤 베리언트의 서피스 훅이 문자 그대로 `bloxdDefaultSurface` 면, 엔진은 `baseColor` / `alpha` 되돌리기 이식을 통째로 생략한다 — 기본값이 이미 그 값을 만들므로 대입은 죽은 코드다. **손대지 않은 훅 체인은 비용이 없다**

## v5 에서 바뀐 것

접합 아키텍처는 v2 렌더러에 존재했고 v2 → v3 에서 안정적으로 유지되었다 (v3 는 `vBlockId` → `vBlockFlags` 와 액체 베리언트 추가뿐). v5 의 변경:

- `vBlockFlags` (비트) → **`BloxdFlags` 구조체** (`bloxdSpFlags` 경유 전달)
- `litColour` 캡처가 엔진 내부물에서 **공개 API** 로 (`bloxdLitColour()` — v4 의 `bloxdSpLitColour` 승격)
- `BloxdLightIn` 이 `diffuse` / `emissive` 를 얻었고, `bloxdShading()` 이 머티리얼 응답을 재구축한다 ([라이팅](../api/lighting.md))
- `localPosition` (`bloxdSpItemLocalPosition`), 인챈트 입력 (`bloxdSpEnchant`), `overlayColour` 의 전달 ([모델 렌더링](model-rendering.md))
- `fogVisibility` → **`fogAlpha`** (반전)
- Model 프로그램이 베리언트 매트릭스에 합류 (3 프로그램 × 2 모드 = 6베리언트)

## BloxdLightIn 에 무엇이 흐르는가 (필드별)

| 필드 | 엔진 측 출처 |
|---|---|
| `litColour` | 포그 믹스 직전에 캡처된 프래그먼트색 — 헤더 표현으로 「emission 과 포그 이전」 |
| `directional` | 방향광별 Lambert 의 버텍스 보간 합 ([렌더링 파이프라인](rendering-pipeline.md) 의 2광원 구성) |
| `diffuse` / `emissive` | 머티리얼의 방향광 RGB 응답 / RGB 발광 |
| `ambient` | `material.ambient × sceneAmbient` — 머티리얼별, 프레임별 |
| `blockLight` / `skyLight` | 디코딩된 라이트 레벨 베리링 ([라이팅의 내부](lighting-internals.md)) |
| `ambientLightColour` / `skyLightColour` | 대응하는 uniform |
| `heldLight` | 라이트 레벨 베리링과 held-light uniform 으로 구축 (원뿔 감쇠는 [라이팅의 내부](lighting-internals.md)) |
| `fogColour` | 완전히 포그 없는 장면 (모드 0) 에서만 검정 |
| `fogAlpha` | 클램프된 포그 계수 ([포그의 내부](fog-internals.md)) |
| `position` / `normal` / `localPosition` / `flags` / `textureId` / `textureRotation` / `uv` / `mipLevel` | 베리링과 플랫 보간값 (`BloxdSurfaceIn` 과 동일 — 버텍스 훅 적용 후의 값) |

## 관련 문서

- [셰이더 훅](../api/hooks.md) · [렌더링 파이프라인](rendering-pipeline.md) · [예약 식별자](reserved-identifiers.md) · [버전 히스토리: v3](../history/v3.md)
