# 함수

> 대상 API: 5 · 대상 빌드: `ab90qa` · 상태: Analyzed (라이브 헤더에서 그대로 복원)

헤더의 모든 함수이다. 텍스처 API (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`) 와 `bloxdOpaqueBehind` 는 [텍스처 API](texture-api.md) 에서 다룬다.

## 프레임 함수 (프레임 전체에서 같은 값)

헤더 주석: *"These functions return the same value for the entire frame."* `bloxdPackInputs` uniform 을 읽으므로, 버텍스 훅과 모듈 스코프 함수에서도 호출할 수 있다.

### bloxdEyePosition

```wgsl
fn bloxdEyePosition() -> vec3f
```

- **반환값**: 카메라의 렌더 위치
- **호출 가능 범위**: 전 9개 훅 + 모듈 스코프
- **용도**: 시선 벡터 (`normalize(l.position - bloxdEyePosition())`), 림 라이트, 거리

### bloxdRenderOffset

```wgsl
fn bloxdRenderOffset() -> vec3i
```

- **반환값**: 정수 블록 오프셋. **렌더 위치 + 이 오프셋 = 월드 위치**
- 플레이어가 이동하면 함께 변한다 (렌더 위치를 0,0,0 근처로 유지한다)
- `bloxdWorldPosition()` 이 내부에서 사용한다

### bloxdSunDirection

```wgsl
fn bloxdSunDirection() -> vec3f
```

- **반환값**: 월드 방향 기준으로 태양을 향하는 단위 벡터. **태양이 없을 때는 제로 벡터**
- **사실**:
  - **달은 항상 `-bloxdSunDirection()` 에 있다** (엔진이 태양의 반대쪽에 놓는다)
  - **제로 벡터를 `normalize` 에 넘기지 마라** — `dot(d, d) < 1e-8` 으로 가드하고 상수 방향으로 폴백한다
  - 현행 빌드에는 낮밤 사이클이 없다. 태양·달·별은 세션 동안 움직이지 않는다 (불투명도 토글만 있다). 기본 지구 하늘에서 태양은 `(−0.56, 0.81, −0.18)` 부근에 있다 (고도 ≈ 54°)
- **용도**: 색 온도, 광원 방향, 태양 게이팅, 유사 달빛

### bloxdSeconds

```wgsl
fn bloxdSeconds() -> f32
```

- **반환값**: 페이지 로드 후의 경과 초 (랩 없음 — f32 는 처음 4.5시간 동안 밀리초 미만 정밀도를 유지한다)
- **용도**: 애니메이션. `bloxdSeconds() % period` 로 되풀이 타이머
- **주의**: v2 의 `bloxdTime()` (3600초에서 랩) 과 달리 랩하지 않는다

### bloxdLit

```wgsl
// Whether block and sky lighting is on. When it's off, BloxdLightIn's
// blockLight and heldLight are 0, and its skyLight and light colours are 1.
fn bloxdLit() -> bool
```

- **반환값**: 블록·하늘 라이팅이 켜져 있는지 여부
- **v5 신규**: v4 의 `#ifdef BLOXD_LIGHTING` 컴파일 시점 분기를 런타임 검사로 대체한다
- **꺼져 있을 때의 보증** (헤더 주석): `blockLight` 과 `heldLight` 는 0, `skyLight` 과 라이트 색 (`ambientLightColour` / `skyLightColour`) 은 1
- **사용법**: 라이팅 의존 코드를 게이트한다:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    // ... lighting-enabled processing
    return out;
}
```

`BLOXD_LIGHTING` 을 쓰면 *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."* 가 나온다.

## 좌표 변환

### bloxdWorldPosition

```wgsl
// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f
```

- **반환값**: `position + vec3f(bloxdRenderOffset())`
- **주의**: f32 정밀도 한계로 먼 좌표는 부정확할 수 있다 (헤더: *"with possible f32 inaccuracy"*)

### bloxdFragmentBlockPosition — 문서화되지 않았지만 여전히 주입된다

```wgsl
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i
```

이 함수는 **더 이상 문서화된 헤더의 일부가 아니다** (v4 에서는 있었다). 그래도 엔진은 여전히 받아들이고 정의한다:

- **검증기**: 라이브 시그니처 표에 여전히 실려 있어, 모든 훅 (버텍스 훅 포함) 에서 이름 검증을 통과한다
- **런타임**: 코드 생성기가 terrain/liquid 모듈과 양쪽 모델 프로그램에 정의를 계속 주입한다 — terrain/liquid 는 `vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset()` 을 쓰고, 모델 파이프라인은 1/64 블록 오프셋을 써서 배치된 블록 모델의 셀에 스냅한다
- **주의**: 문서화되지 않은 내부물이므로 예고 없이 미래 버전에서 사라질 수 있다 — 연속 좌표에는 `bloxdWorldPosition()` 을, 「어느 블록인가」에는 `flags` 를 쓰는 것이 낫다 (헤더에서의 제거 경위는 [버전 히스토리: v5](../history/v5.md))

이것을 호출하는 v4 용 팩은 계속 동작한다. 새 팩에서 채택하지 마라.

## 기본 함수 (엔진 동작)

### bloxdDefaultVertex

```wgsl
fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex
// impl: return BloxdVertex(vertex.position);
```

### bloxdDefaultSurface

```wgsl
fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface
```

`colour` 를 통과시키고, `enchantColour` / `overlayColour` 를 그대로 통과시키며, `emission` 을 0 으로 한다 (`BLOXD_ALPHA` 베리언트에서는 `alpha` 도 통과). **출력 구조체는 이 함수 경유로만 만들 수 있다.**

### bloxdDefaultLight

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight
// impl:
//   let lit = bloxdLitColour(surface, light);
//   return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
```

말 그대로 「엔진의 레시피를 적용한 뒤, emission 을 더한 결과에 포그를 건다」.

## 라이팅 레시피 함수

엔진 자신의 라이팅 레시피를 호출 가능한 WGSL 로 문서화한 것이다 — 단계별로 조합하거나 덮어쓸 수 있다. 해설과 흐름도는 [라이팅](lighting.md).

| 함수 | 시그니처 | 역할 |
|---|---|---|
| `bloxdShading` | `(light: BloxdLightIn) -> vec3f` | 면의 머티리얼과 각도가 어떻게 비추는가 (Lambert × diffuse + emissive + ambient, 0–1 클램프) |
| `bloxdWorldLight` | `(light: BloxdLightIn) -> vec3f` | 이 장소의 월드 라이트 (block/sky/held 중 최광, `ambientLightColour` 가 바닥) |
| `bloxdLitColour` | `(surface: BloxdSurface, light: BloxdLightIn) -> vec3f` | 면의 색을 엔진 방식으로 비춘 것 (emission·포그 이전) |
| `bloxdApplyFog` | `(colour: vec3f, light: BloxdLightIn) -> vec3f` | 이 프래그먼트의 포그 적용 (`mix(colour, fogColour, fogAlpha)`) |

## 특수 함수

### bloxdOpaqueBehind

```wgsl
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind
```

- **반환값**: `BloxdOpaqueBehind` (`hit: bool`, `position: vec3f`, `distance: f32`)
- **호출 가능 범위**: 서피스 / light 훅만 (깊이 텍스처가 FRAGMENT 전용이다)
- **가드**: `#ifdef BLOXD_SCENE_DEPTH` (액체 베리언트에서 정의)
- **의미**: 이 프래그먼트 뒤의 불투명 면 (물 너머로 보이는 지형). 하늘일 때는 `hit == false`
- **v2 에서의 개명**: `found` → `hit`
- **심층 해설**: [버전 히스토리: v3](../history/v3.md) 및 [엔진 내부와 연구](../internals/rendering-pipeline.md)

## 관련 문서

- [라이팅](lighting.md) · [텍스처 API](texture-api.md) · [팩 형식](pack-format.md)
