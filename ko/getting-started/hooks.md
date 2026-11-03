# 셰이더 훅

> 대상 API: 5 · 대상 빌드: `ab90qa` (2026-11-03, 프로덕션 확인) · 상태: Verified

팩은 **9개의 훅**에 끼어들 수 있다: 3개 렌더 대상 (Terrain / Liquid / Model) × 3개 파이프라인 단계 (Vertex / Surface / Light). 모두 선택 사항이다 — 정의하지 않은 훅은 엔진 기본값으로 폴백한다.

## 훅 일람

| 훅 | 단계 | 하는 일 |
|---|---|---|
| `bloxdTerrainVertex` | terrain · 버텍스 | 지형 정점 애니메이션. **strict 게임에서는 실행 불가** |
| `bloxdTerrainSurface` | terrain · 서피스 | 지형의 색, alpha, emission, 인챈트, 오버레이 |
| `bloxdTerrainLight` | terrain · 라이트 | 지형의 최종색 — 프래그먼트의 마지막 단계 |
| `bloxdLiquidVertex` | liquid · 버텍스 | 물 정점 애니메이션. **strict 전용 가드 필수** |
| `bloxdLiquidSurface` | liquid · 서피스 | 물의 색, alpha, emission |
| `bloxdLiquidLight` | liquid · 라이트 | 물의 최종색 |
| `bloxdModelVertex` | model · 버텍스 | 블록 모델 / 아이템 / 엔티티 정점 애니메이션. **strict 전용 가드 필수** |
| `bloxdModelSurface` | model · 서피스 | 모델의 색, alpha, emission, 인챈트, 오버레이 |
| `bloxdModelLight` | model · 라이트 | 모델의 최종색 |

시그니처 (형은 정확히 맞아야 한다. 파라미터명은 자유):

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex;
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight;
// bloxdLiquid* / bloxdModel* take the same types
```

## 렌더 대상 분할

- **Terrain** — 물과 블록 모델을 제외한 모든 블록
- **Liquid** — 물
- **Model** — 블록 모델 (반 블록, 계단, 교차 평면 식물), 손에 든/떨어진/던진 아이템, 플레이어, 몹, NPC, 방어구, 화장품

**중요**: 팩이 Liquid 훅을 하나도 정의하지 않으면, **물 위에서는 Terrain 훅도 돌지 않는다** (물은 Liquid 훅이 단독 처리). 액체가 terrain 훅으로 폴백하던 v4 이전 동작과 다르다.

## 폴백과 코드 공유

- 정의하지 않은 훅은 그 단계가 엔진 기본값을 쓴다는 뜻이다 (`bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight` 와 같은 동작)
- **훅 간 코드 공유**는 모듈 스코프 함수를 정의해 양쪽에서 호출한다:

```wgsl
fn applyWarmth(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.04, 1.0, 0.96);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}
```

## 기본 팩 (공식 9훅 템플릿)

시작 템플릿이 이제 light 훅을 포함한다. 출하 상태 그대로 1,683 바이트:

```wgsl
// Every hook here returns its engine default. Modify the return values to start
// building a shader pack. If you delete a hook, the default is used instead.

// All blocks but water and block models use terrain hooks.
#ifndef BLOXD_STRICT
// Strict games keep terrain where it is. Without the #ifndef, this hook would
// turn the whole shader pack off there.
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Water uses liquid hooks. To share code with another hook, define a function
// and call it from both places.
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Models: block models such as slabs and plants, items, players and mobs.
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

템플릿의 주석이 곧 설계 지침이다: 반환값을 고쳐 만들기 시작한다. 훅을 지우면 기본값으로 돌아간다. strict 게임은 지형을 제자리에 둔다. 코드 공유는 함수로 한다.

## 작성 규칙

- **출력 구조체를 직접 생성하지 마라** (`BloxdSurface(...)` 은 검증에 실패한다). 항상 `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` 에서 시작해 필드를 바꾼다. light 훅의 첫 인수는 이미 출력형이므로 `var out = s;` 도 통한다
- bare `var x: BloxdSurface;` (형 주석만) 도 검증 오류이다
- 훅 파라미터는 **읽기 전용**. 먼저 복사한다 (`var sv = s;`)
- `bloxd` 로 시작하는 식별자 (대소문자 무관) 는 쓸 수 없다. 9개 훅 함수명만 예외다
- 상수는 `const` 로 쓴다 (`#define` 은 값을 받지 않는다)

각 훅이 읽고 쓸 수 있는 모든 필드는 [구조체](../api/structures.md) 를 보라.
