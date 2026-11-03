# 컴파일 오류

> 대상 API: 5 · 상태: Verified

정적 검증은 통과하지만 WGSL 로는 실패하거나, 브라우저의 WGSL 컴파일러 (2단계) 에서만 실패하는 오류.

## "bloxdTerrainVertex must be declared as: fn ..."

- **원인**: 훅 시그니처 불일치 (인수/반환형)
- **해결**: 메시지에 표시된 선언으로 다시 쓴다 (파라미터명은 자유. 형은 정확히 맞아야 한다)
- **예방**: [훅 비교표](../api/hooks.md) 에서 시작한다

## "mixing '*' and '^' requires parenthesis (only in ...)"

- **원인**: WGSL 은 `^` `&` `|` `<<` `>>` 를 다른 연산자와 섞을 때 괄호를 요구한다
- **해결**: 피연산자에 괄호를 친다

## "... can only be a function's parameter or return type, ..."

- **원인**: `var x: BloxdSurface;` — 형 주석만 붙은 선언은 거부된다. 헤더 구조체가 필드를 얻기 때문이다
- **해결**: `var out = bloxdDefaultSurface(s);` (light 훅에서는 `var out = s;`)
- **예방**: 출력은 항상 `bloxdDefault*` 에서 구축한다 ([작성 규칙](../api/structures.md#작성-규칙-재정리))

## "_ can only be the target of a phony assignment, as in _ = f();"

- **원인**: `let _ = f();` 은 무효한 WGSL 이다
- **해결**: `_ = f();` 로 쓴다

## "Lite: …reads scene depth on a page that didn't turn it on"

- **원인**: 깊이를 읽는 팩 (`bloxdOpaqueBehind`) 이 활성화된 채 페이지가 생성되었다. 깊이 가용 여부는 페이지 생성 시점에 정해진다
- **해결**: 팩을 켠 채 페이지를 다시 불러온다

## dpdy 부호가 반전돼 보인다

- **의도된 동작이다**: 분석기가 `dpdy` / `dpdyCoarse` / `dpdyFine` 호출 전부를 `(-dpdy(...))` 로 자동 재작성한다 (화면공간 y 는 아래를 향한다)
- **해결**: 필요 없다 — 「위로 가며 h 는 어떻게 변하나」라는 의도로 `dpdy(h)` 를 쓰면 내보내는 코드가 반전을 싣는다 ([제한과 예약명](../api/restrictions.md#자동-재작성))
- `dpdx` 와 `fwidth` 는 손대지 않는다

## 게임 참가 시 팩이 떨어진다 / 실기기 검사가 끝나지 않는다

- **원인**: 실기기 검사 실패, 또는 60초 강제 타임아웃 (`skipped`) 도달 — 저사양 기기와 무거운 월드에서 흔하다
- **해결**: 무거운 버텍스 연산과 복잡한 루프를 줄인다. [퍼포먼스](performance.md) 참조

## 관련 문서

- [검증 오류](validation.md) · [엔진 내부와 연구: WGSL 컴파일](../internals/wgsl-compilation.md) · [제한과 예약명](../api/restrictions.md)
