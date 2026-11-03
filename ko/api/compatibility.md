# 호환성

> 대상 API: 5 · 대상 빌드: `ab90qa` (2026-11-03, 프로덕션 확인) · 상태: Verified

현행 게임과 구버전 팩이 서로 어떻게 맞물리는지에 대한 설명이다.

## 받아들이는 버전

**`apiVersion: 5` 뿐이다.** 로더는 `manifest.apiVersion !== 5` 를 엄격히 비교하며, v1/v2/v3/v4 팩은 **로드하는 그 순간 실패한다**. 다중 버전 병행 수용은 존재하지 않는다.

## 로드 시점 메시지 (라이브 i18n 사전에서 그대로 인용)

- `pack.json needs "apiVersion": {{version}}.` — `apiVersion` 키가 빠져 있다
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — 키는 있지만 5가 아니다

## 저장된 구버전 팩 (예외 없음 — 조용한 비활성화)

과거에 저장한 v1–v4 팩은 예외를 던지지 않는다. 저장 팩의 결과는:

```
{kind: "none", reason: "otherApiVersion"}
```

로 귀결되며, 팩은 **조용히 비활성**이 된다. 이유를 설명해 주는 곳은 셰이더 팩 설정 탭뿐이다:

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

## v4 → v5 변환의 성격

변환은 대부분 기계적이다 (전체 체크리스트는 [v5 마이그레이션 가이드](../history/v5.md) 에 있다):

- `blockFlags & bloxdBlockFlagX != 0u` → `flags.x` (1:1 개명)
- `#ifdef BLOXD_LIGHTING` → `if (bloxdLit()) { ... } else { return bloxdDefaultLight(...); }`
- `bloxdFragmentBlockPosition` 호출 지점은 여전히 컴파일된다 (엔진이 주입한다). 다만 이제는 문서화되지 않았으므로, 여기서 벗어나 이주하는 것이 안전한 선택이다 ([함수](functions.md#bloxdfragmentblockposition--undocumented-but-still-injected))
- `pack.json` 을 `"apiVersion": 5` 로 올린다

이번 판의 조용한 함정: `blockFlags` 를 계속 읽거나 light 훅을 `#ifdef BLOXD_LIGHTING` 으로 감싼 채인 팩은 **전용 메시지와 함께 검증에 실패한다** (분석기가 이제 이 두 경우를 모두 설명한다). 즉 조용히 오동작하는 일은 없고, 이주할 때까지 계속 거부될 뿐이다.

## 저장 팩 재검증 (「재확인 필요」)

`HEADER_VERSION` 은 `9.<fnv1a32(header)>.<fnv1a32(텍스처 레지스트리)>` 이다 (선두 정수는 v4 의 8 에서 9 로 올라갔다). 엔진의 헤더나 텍스처 레지스트리가 바뀌면 (게임 업데이트 때 흔하다) 저장 팩은 「재확인 필요」 로 표시되고, 페이지 로드 시 자동으로 재검증된다.

레지스트리 이동의 실측 예 (10일 간격의 두 빌드): 엔트리 1200 → 1219 (98개 추가, 79개 삭제). 그리고 철자를 유지한 이름 중에서 **1121개 가운데 779개가 id 가 바뀌었다**. 다시 말해:

- **이름 (`bloxdTextureIdLava`) 으로 쓴 팩은 드리프트를 견딘다** (로더가 라이브 레지스트리에 대해 다시 해석한다)
- **원시 id (`19`) 로 쓴 팩은 재검증에서 깨진다**

상세는 [엔진 내부와 연구: 텍스처 레지스트리](../internals/texture-registry.md).

## 실행 환경

- **WebGPU 렌더러 전용**: 팩을 설치하면 WebGPU 렌더러가 강제로 켜진다
- **모바일**: WebGPU가 제한된 환경에서는 팩을 아예 실행할 수 없다 ([요구 사항](../getting-started/requirements.md))
- **비아틀라스 렌더러 구성**: `bloxdTexel` / `bloxdTextureSize` 는 스텁으로 퇴화한다 (흰 텍셀, 1×1). 코드 자체는 여전히 컴파일되고 실행된다 ([텍스처 API](texture-api.md#where-the-texture-api-cant-go))

## 버전 지원 요약

| API 버전 | 가동 개시 | 현행 게임에서의 취급 |
|---|---|---|
| v1 | — | 로드 시 거부 ([v2](../history/v2.md) 경유로 이주) |
| v2 | — | 로드 시 거부 |
| v3 | 2026-10-19 | 로드 시 거부 |
| v4 | 2026-10-26 | 로드 시 거부 |
| **v5** | **2026-11-03** | **현행** |

## 관련 문서

- [v5 마이그레이션 체크리스트](../history/v5.md) · [버전 히스토리](../history/)
