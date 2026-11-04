# 베리언트와 가드

> 대상 API: 5 · 대상 빌드: `xkg8x` (2026-11-04, 프로덕션 확인) · 상태: Analyzed

## 6개 베리언트

코드 본체는 하나지만, **6개 베리언트** 모두에서 컴파일되어야 한다: `{strict, allow} × {terrain, liquid, model}`. 로더는 로드 시 여섯 개 전부를 검증한다.

v4 이전의 「라이팅 온/오프」 축은 없어졌다 (v4 는 8베리언트였다). 라이팅 상태는 이제 [`bloxdLit()`](../api/lighting.md) 의 런타임 질문이지, 컴파일 시점 분기가 아니다.

| 베리언트 | 예 | 정의되는 매크로 |
|---|---|---|
| `allow.terrain` | allow 게임의 지형 | `BLOXD_ALPHA` |
| `allow.liquid` | allow 게임의 물 | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | allow 게임의 모델 | `BLOXD_ALPHA` |
| `strict.terrain` | strict 게임의 지형 | — |
| `strict.liquid` | strict 게임의 물 | `BLOXD_SCENE_DEPTH` |
| `strict.model` | strict 게임의 모델 | — |

## 조건부

쓸 수 있는 것은 `#define NAME` (값 없음) / `#ifdef` / `#ifndef` / `#else` / `#endif` 뿐이다. `#` 은 행 머리에 붙인다 (함수 안도 상관없다).

| 가드 | 의미 | 전형적 용도 |
|---|---|---|
| `#ifndef BLOXD_STRICT` | 비strict (allow) 베리언트만 | 버텍스 훅 전체 감싸기, `discard` 감싸기 |
| `#ifdef BLOXD_ALPHA` | `alpha` 가 존재하는 베리언트 (모든 액체 + 비strict 지형/모델) | alpha 를 만지는 코드 감싸기 |
| `#ifdef BLOXD_SCENE_DEPTH` | 모든 액체 베리언트 | `bloxdOpaqueBehind()` 호출 감싸기 |

`BLOXD_LIGHTING` 은 **v5 에서 제거되었다**. 쓰면 다음과 함께 검증에 실패한다: *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## strict 게임 계약

대부분의 게임은 strict 다 (정점 애니메이션 없음, `discard` 없음). 가드 없는 버텍스 훅은 `<hook> moves terrain, which strict games prevent.` 를, 도달 가능한 `discard` 는 `discard makes terrain see-through, which strict games prevent.` 를 낸다 — 둘 다 그 strict 게임에서 **모든 훅**을 비활성화한다. 버텍스 훅은 항상 `#ifndef BLOXD_STRICT` 로 감싸라.

게임별 정책의 내부는 [엔진 내부와 연구: 정책](../internals/policy.md) 을 보라.
