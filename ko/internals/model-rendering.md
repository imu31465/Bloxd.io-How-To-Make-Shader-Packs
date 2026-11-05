# 모델 렌더링의 내부

> 대상 API: 5 · 대상 빌드: `bny9u` · 상태: Analyzed (라이브 번들에서 복원)

v5 Model 프로그램의 내부. 사용자용 가이드: [모델과 텍스처](../guides/models.md).

## Model 프로그램이란

v5 이전에는 팩이 지형/액체에만 끼어들 수 있었다. 블록 모델 (반 블록, 계단, 식물) 과 엔티티 (플레이어, 몹, 아이템) 는 **팩의 관할 밖**이었다. v5 는 model 을 세 번째 프로그램으로 추가했고, 다음을 그린다:

- 블록 모델로 그려지는 블록 (헤더 주석: *"Drawn as block models, so never part of terrain or flagged as opaque"*)
- 손에 든 / 떨어진 / 던진 아이템
- 플레이어, 몹, NPC (방어구와 화장품 포함)

## 플래그·입력 전달

- **`bloxdSpFlags`** — `BloxdFlags` 구조체의 전달 경로. 8개 새 필드 (`slab` / `stairs` / `flat` / `placed` / `held` / `dropped` / `thrown` / `lifeform`) 는 모델 면에서만 의미 있는 값을 싣는다
- **`bloxdSpItemLocalPosition`** — `localPosition` 의 전달. 지형/액체에서는 `vec3f(0.0)`
- **`bloxdSpEnchant`** — 인챈트 입력 (`enchantTier` / `enchantColour` / `enchantSpeed`) 의 전달

## 인챈트 계산

엔진은 글린트 스윕을 애니메이션해 `enchantColour.a` 로 서피스/light 훅에 건넨다 ([인챈트 효과](../recipes/enchant-effects.md)). 혼합은 `bloxdLitColour()` 안에서 — 셰이딩 직후, 월드 라이트 전 — 일어난다 ([라이팅](../api/lighting.md#전체-파이프라인)).

## 오버레이 (피격 플래시 등)

`overlayColour` 은 엔티티 상태색 (피격 플래시 등) 을 RGB + alpha 로 싣는다. `bloxdLitColour` 이 **라이팅 전에** 섞으므로, 상태 표현이 기본색을 깨지 않고 얹힌다. 이 처리는 v4 에서 내부에 존재했고 v5 에서 입출력으로 열렸다.

## 텍스처 경로

대부분의 모델 면은 `textureId: 0` (텍스처 없음) 이다 — 플레이어 스킨과 몹 텍스처는 블록 텍스처 아틀라스 네임스페이스에 없다. `surface.colour` 에는 스킨 × tint 가 구워져 도착하므로, 모델 면 처리는 `colour` 에서 시작한다 ([모델 자체 텍스처](../api/texture-api.md#모델-자체-텍스처-textureid-0)).

## 베리언트

Model 프로그램은 베리언트 매트릭스의 한 축을 이룬다: `strict.model` / `allow.model`. `BLOXD_ALPHA` 는 allow.model 에서만 정의된다 ([전처리기](../api/preprocessor.md#매크로--베리언트-매트릭스)). strict.model 에는 버텍스 훅이 없다.

## 관련 문서

- [모델과 텍스처](../guides/models.md) · [모델 셰이더 레시피](../recipes/model-shaders.md) · [플래그](../api/flags.md) · [렌더링 파이프라인](rendering-pipeline.md)
