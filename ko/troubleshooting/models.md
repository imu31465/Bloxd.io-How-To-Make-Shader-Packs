# 모델 문제

> 대상 API: 5 · 대상 빌드: `ab90qa` · 상태: Analyzed (v5 의 새 영역)

새로운 v5 Model 훅 관련 문제.

## 플레이어/몹이 영향을 받지 않는다

- **원인**: 엔티티 (플레이어, 몹, NPC, 방어구, 화장품) 는 **Model 프로그램** 이 그린다 — 지형 훅은 손대지 않는다
- **해결**: Model 훅을 추가한다 ([모델과 텍스처 가이드](../guides/models.md))

## 반 블록·계단·식물이 영향을 받지 않는다

- **원인**: 블록 모델 (`slab` / `stairs` / `flat`) 도 Model 프로그램 지오메트리다. 지형이 아니다
- **해결**: Model 훅에서 `flags.slab` / `flags.stairs` / `flags.flat` 으로 고른다 ([플래그](../api/flags.md))

## 물이 영향을 받지 않는다

- **원인**: 물은 Liquid 훅 전용. **Liquid 훅이 없으면 물 위에서 Terrain 훅도 돌지 않는다** (v5 변경)
- **해결**: `bloxdLiquidSurface` / `bloxdLiquidLight` 를 정의한다 ([베리언트 문제](variants.md))

## 손에 든 아이템만 바꾸고 싶은데 전부 바뀐다

- **해결**: `surface.flags.held` 로 고른다 ([모델 셰이더 레시피](../recipes/model-shaders.md))

## 플래그 검사가 의도대로 안 돈다

- **짐후보 원인**:
  1. **플래그를 단일 선택 enum 으로 다룸** — 자유롭게 조합된다 («sandstone is sand and rock», «possibly even none») ([플래그](../api/flags.md#flags-combine-freely))
  2. `else` 를 「나머지 전부」로 읽음 — `flags.rock` 의 else 는 단지 「rock 아님」일 뿐, sand 일 수 있다
- **해결**: 머티리얼 플래그 (`opaque`…) 와 형상·상태 플래그 (`slab`/`held`…) 를 독립적으로 조합한다

## 인챈트 글린트가 사라졌다

- **해결**: `enchantColour` 을 통과시키거나 `bloxdLitColour()` 를 쓴다 ([인챈트 효과](../recipes/enchant-effects.md))

## 피격 플래시가 사라졌다 / 너무 강하다

- **해결**: `overlayColour` 을 통과시키거나 `out.overlayColour.a` 를 조정한다 ([인챈트 효과](../recipes/enchant-effects.md))

## localPosition 이 항상 0

- **설계상 그렇다**: 지형·액체 면에서 `localPosition` 은 `vec3f(0.0)` — **모델이 없다**
- **해결**: Model 훅에서 읽는다 ([모델 레시피](../recipes/model-shaders.md))

## 모델에서 bloxdTexel 이 흰색을 반환

- **설계상 그렇다**: `textureId: 0` (스킨) 은 흰색으로 샘플된다
- **해결**: `surface.textureId != 0u` 로 고르거나 `surface.colour` 로 작업한다 ([텍스처 문제](textures.md))

## 방어구만 / 화장품만 바꾸고 싶다

- **한계**: 「방어구」 플래그는 없다. `flags.lifeform` 은 방어구와 화장품을 포함한다
- **근사**: `localPosition` (배치) 이나 `overlayColour` 유무와 조합한다 ([모델 레시피](../recipes/model-shaders.md))

## 관련 문서

- [모델과 텍스처 가이드](../guides/models.md) · [모델 셰이더 레시피](../recipes/model-shaders.md) · [플래그](../api/flags.md)
