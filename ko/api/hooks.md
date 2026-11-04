# 셰이더 훅

> 대상 API: 5 · 대상 빌드: `xkg8x` · 상태: Verified

팩은 **9개의 훅** — 3개의 렌더 대상 (프로그램) × 3개의 파이프라인 단계 — 을 정의할 수 있다. 모두 선택 사항이다 (정의하지 않으면 엔진 기본값).

## 9훅 비교

| 훅 | 프로그램 | 단계 | 인수 | 반환 | 실행 조건 |
|---|---|---|---|---|---|
| `bloxdTerrainVertex` | Terrain | 버텍스 | `BloxdVertexIn` | `BloxdVertex` | allow 베리언트만 (**strict 에서 정의 자체가 오류**) |
| `bloxdTerrainSurface` | Terrain | 서피스 | `BloxdSurfaceIn` | `BloxdSurface` | 항상 |
| `bloxdTerrainLight` | Terrain | 라이트 | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | 항상 |
| `bloxdLiquidVertex` | Liquid | 버텍스 | `BloxdVertexIn` | `BloxdVertex` | allow 만 |
| `bloxdLiquidSurface` | Liquid | 서피스 | `BloxdSurfaceIn` | `BloxdSurface` | 항상 |
| `bloxdLiquidLight` | Liquid | 라이트 | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | 항상 |
| `bloxdModelVertex` | Model | 버텍스 | `BloxdVertexIn` | `BloxdVertex` | allow 만 |
| `bloxdModelSurface` | Model | 서피스 | `BloxdSurfaceIn` | `BloxdSurface` | 항상 |
| `bloxdModelLight` | Model | 라이트 | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | 항상 |

## 각 프로그램이 그리는 것

| 프로그램 | 그리는 것 | Liquid 훅이 없을 때의 물 |
|---|---|---|
| **Terrain** | 물과 블록 모델을 제외한 모든 블록 | — |
| **Liquid** | 물 | **물 위에서는 Terrain 훅도 돌지 않는다** (물은 기본 외관을 유지) |
| **Model** | 블록 모델 (반 블록, 계단, 식물, 작물, 거미줄), 손에 든/떨어진/던진 아이템, 플레이어, 몹, NPC, 방어구, 화장품 | — |

## 단계의 역할

- **버텍스 (Vertex)** — 정점 위치를 움직인다 (풀 흔들림, 파도). 정점 애니메이션은 strict 게임에서 팩 전체를 비활성화하므로, `#ifndef BLOXD_STRICT` 이 필수다
- **서피스 (Surface)** — 머티리얼 출력: `colour` / `alpha` (조건부) / `emission` / `enchantColour` / `overlayColour`
- **라이트 (Light)** — 최종 색. 서피스 출력에 `BloxdLightIn` 이 더해져 들어온다. 반환값이 화면에 찍히는 색이다

## 시그니처

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
// bloxdLiquid* / bloxdModel* take the same argument and return types
```

## 특수 함수 호출 제한

엔진의 검증기는 어느 훅이 어느 함수에 도달할 수 있는지 제한한다 (위반은 전용 「reaches」 진단으로 실패한다):

| 함수 | 호출 가능 범위 | 가드 |
|---|---|---|
| `bloxdTexel` | 서피스 / light 훅만 | — |
| `bloxdTextureSize` | 서피스 / light 훅만 | — |
| `bloxdOpaqueBehind` | 서피스 / light 훅 (액체 베리언트에서 의미 있음) | `#ifdef BLOXD_SCENE_DEPTH` |

> `bloxdFragmentBlockPosition` 은 더 이상 문서화된 헤더에 없지만, 엔진은 여전히 주입하고 받아들인다 — [함수: bloxdFragmentBlockPosition](functions.md#bloxdfragmentblockposition--문서화되지-않았지만-여전히-주입된다) 참조. 버텍스 훅에서 호출 가능한 유일한 특수 함수였다. 새 코드에서는 「어느 블록인가」에 `flags` 를 쓰는 것이 낫다.

## 폴백과 공유

- 정의하지 않은 훅 → 그 단계는 엔진 기본값으로 동작한다 (`bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **훅 간 처리 공유**는 양쪽에서 호출하는 모듈 스코프 함수로 한다:

```wgsl
fn sharedSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}
```

## 관련 문서

- 공식 9훅 템플릿 → [시작하기: 셰이더 훅](../getting-started/hooks.md)
- 모든 구조체 필드 → [구조체](structures.md)
- 훅 호출의 내부 → [엔진 내부와 연구](../internals/hook-invocation.md)
