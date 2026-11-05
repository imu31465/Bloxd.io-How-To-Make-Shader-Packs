# API 버전 오류

> 대상 API: 5 · 대상 빌드: `bny9u` (2026-11-05, 프로덕션 확인) · 상태: Verified (라이브 i18n 사전에서 그대로)

`apiVersion` 관련 오류. 현행 게임은 **`5` 만** 받는다.

## "pack.json needs "apiVersion": {{version}}."

- **증상**: 로드 직후 이 메시지 (`loadNoApiVersion`)
- **원인**: `apiVersion` 키가 통째로 없다
- **해결**: `"apiVersion": 5` 를 추가 — **숫자**로 (문자열 `"5"` 는 실패)
- **예방**: [pack.json](../getting-started/manifest.md) 템플릿에서 시작한다

## "This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}."

- **증상**: `loadWrongApiVersion`
- **원인**: `apiVersion` 은 있지만 5가 아니다 (v1–v4 팩)
- **해결**: 해당하는 이주를 적용한다 ([버전 히스토리](../history/)):
  - v4 → v5: [v5 가이드](../history/v5.md) — 거의 기계적 (flags · `bloxdLit()` · `bloxdFragmentBlockPosition` 주의점)
  - v3 → v5: 먼저 [v4](../history/v4.md) 를 적용
  - v2 이하 → v5: v3 → v4 → v5 를 순서대로
- **예방**: API 업데이트 후에는 [호환성](../api/compatibility.md) 과 해당 이주 가이드를 확인한다

## 문자열 "5" 는 거부된다

- **원인**: 로더는 `manifest.apiVersion !== 5` 를 **엄격히** (`===`) 비교한다. JSON 문자열 `"5"` 는 숫자 5가 아니다
- **해결**: `"apiVersion": 5` (따옴표 없이)

## 저장된 구버전 팩이 조용히 멈췄다

- **증상**: 예전에 동작하던 v1–v4 팩이 예외 없이 반응하지 않는다
- **원인**: 저장 팩은 `{kind: "none", reason: "otherApiVersion"}` 로 귀결되어 **조용히 비활성**이 된다
- **확인**: 설정 탭 상태줄: `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`
- **해결**: 같은 화면에서 이주된 대체 팩을 로드한다
- **예방**: API 업데이트 후에는 올린 버전을 재릴리스하고 공지한다 ([배포](../getting-started/distribution.md))

## 이주한 v4 팩이 검증에 실패한다

세 가지 전형 패턴 (전체 단계는 [v5 마이그레이션 가이드](../history/v5.md)):

| 검증 메시지 | 원인 | 해결 |
|---|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | `#ifdef BLOXD_LIGHTING` 사용 | `if (bloxdLit()) { ... } else { return bloxdDefaultLight(s, l); }` 로 재작성 |
| `bloxdBlockFlagRock isn't part of the shader pack API...` (예약명 진단) | 남은 비트 상수 참조 | `surface.flags.rock` 등을 쓴다 (1:1 표는 [플래그](../api/flags.md)) |
| `bloxdFragmentBlockPosition` 없음 | v5 부터 문서화된 헤더 밖 (여전히 주입·수용됨 — [함수](../api/functions.md) 참조) | 고칠 오류가 아니다: 컴파일된다. 새 코드에서는 `flags` / `bloxdWorldPosition()` 을 쓰라 |

## 관련 문서

- [호환성](../api/compatibility.md) · [버전 히스토리](../history/) · [pack.json](../getting-started/manifest.md)
