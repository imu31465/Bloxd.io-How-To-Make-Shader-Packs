# 검증 오류

> 대상 API: 5 · 상태: Verified (메시지는 라이브 검증기에서 그대로 기록)

정적 검증 (분석기, 1단계) 오류 — 대부분 예약명, strict 계약, 훅 간 호출 제한.

## "Packs can't construct BloxdSurface directly" / "Packs can't construct BloxdLight directly, since header structs gain fields; ..."

- **원인**: `BloxdSurface(...)` 같은 생성자 호출
- **해결**: `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` 에서 시작해 필드를 바꾼다 (light 훅에서는 `var out = s;` 도 통한다)

## "Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"

- **원인**: `bloxd` 로 시작하는 식별자 (대소문자 무관)
- **해결**: 이름을 바꾼다 (예: `packTint`). 허용되는 것은 9개 훅명뿐이다
- **예방**: 자신의 이름에는 `pack` / `my` 등의 접두사를 붙인다

## "bloxdPackInputs isn't part of the bloxd_ header"

- **원인**: uniform 을 직접 참조함
- **해결**: 헤더 함수를 통해 쓴다 ([팩 형식](../api/pack-format.md#per-frame-uniform-bloxdpackinputs))

## "... reaches bloxdTexel, which only surface and light hooks can use."

- **원인**: 버텍스 훅 (또는 거기서 도달 가능한 함수) 에서 호출함 — 「reaches」 는 **호출 경로** 를 뜻한다
- **해결**: 호출을 서피스 / light 훅으로 옮긴다

## "... reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and <program> doesn't define it; ..."

- **원인**: `bloxdOpaqueBehind()` 에는 모든 액체 베리언트에서만 정의되는 `BLOXD_SCENE_DEPTH` 가 필요하다. terrain/model 훅 코드에서 공유하면 컴파일 불가능한 베리언트가 생긴다
- **해결**: 호출을 `#ifdef BLOXD_SCENE_DEPTH` 로 감싼다
- **예방**: 깊이 읽기는 액체 전용 처리로 격리한다

## strict 계약

| 메시지 | 의미 |
|---|---|
| `<hook> moves terrain, which strict games prevent.` | 가드 없는 버텍스 훅 |
| `discard makes terrain see-through, which strict games prevent.` | 도달 가능한 `discard` |

- **중요**: 컴파일 오류가 아니다 — strict 게임은 **팩 전체를 자동 비활성화**한다 (`shaderPack:offInStrict`)
- **해결**: 버텍스 훅과 `discard` 를 `#ifndef BLOXD_STRICT` 로 감싼다 ([베리언트](../getting-started/variants.md))

## 현행 버전 메시지

| 메시지 | 조치 |
|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | `#ifdef BLOXD_LIGHTING` → `if (bloxdLit())` 이주 ([라이팅](../api/lighting.md#bloxdlit--the-gate)) |
| `bloxdBlockFlagRock isn't part of the shader pack API...` | 남은 비트 상수 → `flags.rock` ([플래그](../api/flags.md)) |
| `bloxdSpLitColour isn't part of the shader pack API...` | v4 내부 심볼 → 공개 `bloxdLitColour()` 를 쓴다 |

`blockFlags` 를 계속 읽거나 light 훅을 `#ifdef BLOXD_LIGHTING` 으로 감싼 팩에는 분석기가 **전용 메시지**를 낸다. 조용히 오동작하는 일은 없다 (이주 단계: [v5 마이그레이션](../history/v5.md)).

텍스처 이름 해석 오류 (철자 제안, 프레임/회전 철자) 는 [텍스처 문제](textures.md) 에 있다.

## 관련 문서

- [제한과 예약명](../api/restrictions.md) · [엔진 내부와 연구: 셰이더 검증](../internals/shader-validation.md) · [베리언트 고유 문제](variants.md)
