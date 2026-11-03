# 베리언트 고유 문제

> 대상 API: 5 · 상태: Verified

6개 베리언트 (`strict|allow` × `terrain|liquid|model`) 중 일부에서만 일어나는 문제. v5 는 라이팅 축 (옛 `BLOXD_LIGHTING`) 을 없앴고, 로더는 로드 시 **6개 베리언트 전부를 한꺼번에** 검증한다.

## 비strict 게임에서만 로드됨 / strict 에서 떨어짐

- **원인**: 가드 없는 버텍스 훅 또는 도달 가능한 `discard`. strict 게임은 둘 다 금지하며, 위반 = **팩 전체 자동 비활성** (`shaderPack:offInStrict`)
- **확인**: 로더 화면에 `<hook> moves terrain, which strict games prevent.` / `discard makes terrain see-through, which strict games prevent.` 표시
- **해결**: 버텍스 훅과 `discard` 를 `#ifndef BLOXD_STRICT` 로 감싼다
- **예방**: 버텍스 훅은 항상 가드된 템플릿에서 시작한다 ([베리언트](../getting-started/variants.md))

## ".alpha is undefined"

- **원인**: `alpha` 는 `#ifdef BLOXD_ALPHA` (모든 액체 + 비strict 지형/모델) 뒤에만 존재한다
- **해결**: alpha 를 만지는 코드를 `#ifdef BLOXD_ALPHA` 로 감싼다 ([전처리기](../api/preprocessor.md#macro--variant-matrix))

## "BloxdVertex only exists when BLOXD_STRICT isn't defined"

- **원인**: strict 베리언트에는 버텍스 훅 자체가 없어 `BloxdVertex` 도 없다. 버텍스 코드가 strict 베리언트에서 도달 가능하다
- **해결**: 버텍스 훅을 가드한다

## bloxdOpaqueBehind 가 일부 베리언트에서만 실패

- **원인**: `BLOXD_SCENE_DEPTH` 는 모든 액체 베리언트에서만 정의된다
- **해결**: `#ifdef BLOXD_SCENE_DEPTH` ([검증 오류](validation.md))

## 물이 팩을 무시한다 (Liquid)

- **증상**: 지형 훅을 썼는데 물이 그대로다
- **원인**: **v5 에서는 팩이 Liquid 훅을 하나도 정의하지 않으면 물 위에서 Terrain 훅도 돌지 않는다** (v4 이전의 「액체가 terrain 으로 폴백」 동작은 없어졌다)
- **해결**: Liquid 훅을 쓴다 ([훅 분할](../api/hooks.md#what-each-program-draws))

## 모델 (엔티티, 블록 모델) 이 영향을 받지 않는다

- **원인**: v5 이전에는 관할 밖. 이제 `bloxdModel*` 훅이 필요하다
- **해결**: `bloxdModelSurface` / `bloxdModelLight` 를 정의한다 ([모델과 텍스처 가이드](../guides/models.md))

## 6베리언트 검증에 대해

로더는 로드 시 **6개 베리언트 전부를 한꺼번에** 검증한다 (라이팅 축은 더 이상 따로 컴파일되지 않는다). 어떤 게임이 일부 조건만 쓰더라도, 배포 팩은 여섯 가지 모두를 예상해야 한다.

| 베리언트 | 정의되는 매크로 |
|---|---|
| `allow.terrain` | `BLOXD_ALPHA` |
| `allow.liquid` | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | `BLOXD_ALPHA` |
| `strict.terrain` | — |
| `strict.liquid` | `BLOXD_SCENE_DEPTH` |
| `strict.model` | — |

## 관련 문서

- [베리언트](../getting-started/variants.md) · [전처리기](../api/preprocessor.md) · [정책](../internals/policy.md)
