# API 레퍼런스

이 페이지는 현행 API v5 사양을 설명한다. API 정의의 기본 자료는 엔진이 모든 팩의 앞에 자동으로 추가하는 엔진 헤더다 (전체 내용은 [엔진 내부 구조](../internals/engine-header.md) 참조).

## 목차

| 페이지 | 내용 |
|---|---|
| [팩 형식](pack-format.md) | `pack.json` 의 전 필드, 로더 제한, uniform 레이아웃 |
| [셰이더 훅](hooks.md) | 9훅 비교: 시그니처·대상·실행 조건 |
| [플래그](flags.md) | `BloxdFlags` 의 14 필드 전체 |
| [입출력 구조체](structures.md) | 모든 구조체의 모든 필드 (조건부 필드 포함) |
| [함수](functions.md) | 프레임·기본·특수 함수의 전 시그니처 |
| [라이팅](lighting.md) | 라이팅 API 전체와 처리 순서 |
| [텍스처 API](texture-api.md) | `bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*` 와 명명 규칙 |
| [상수](constants.md) | `bloxdPi` / `bloxdTau` / `bloxdChunkSize` |
| [전처리기](preprocessor.md) | `BLOXD_STRICT` / `BLOXD_ALPHA` / `BLOXD_SCENE_DEPTH` |
| [제한과 예약명](restrictions.md) | 언어 기능 제한, 예약 식별자 |
| [호환성](compatibility.md) | 구버전 팩의 취급, 저장 팩 재검증 |
| [텍스처 카탈로그](texture-catalog.md) | 사용 가능한 이름 지정 상수 1,017개 (검색 가능) |

> 대상 API: 5 · 검증 상태: Analyzed (엔진 헤더와 검증기에서 복원)

v4 에서 이주해야 한다면 [버전 히스토리: v5](../history/v5.md) 를 보라.
