# 엔진 데이터 대장

> 대상 API: 5 · 대상 빌드: `bbb6l5` (2026-11-20 프로덕션 및 preprod에서 확인) · 상태: Verified

이 대장은 현재 빌드에서 셰이더 팩에 공개된 API의 확인된 값을 정리합니다. 모듈 ID나 청크 번호처럼 번들 내부에만 해당하는 정보는 API 사양이 아니므로 싣지 않습니다.

## 현재 사양

| 항목 | 현재 값 |
|---|---|
| `apiVersion` | `5` (숫자와 엄격 비교) |
| 엔진 헤더 | 216행; 전체 내용은 [엔진 헤더](engine-header.md) 참조 |
| 훅 | 9개 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| 베리언트 | 6개 (strict × terrain / liquid / model) |
| 매크로 | `BLOXD_STRICT`, `BLOXD_ALPHA`, `BLOXD_SCENE_DEPTH`; `BLOXD_LIGHTING`은 v5에서 제거됨 |
| 팩 uniform | 80바이트: `seconds` @0, `lit` @4, `renderOffset` @16, `sunDirection` @32, `eyePosition` @48, `shadowDirection` @64 |
| 팩 binding | `@group(3) @binding(0)`; `minBindingSize` 80 |
| 플래그 | 14개 boolean 필드를 가진 `BloxdFlags` 구조체 |
| 텍스처 아틀라스 | 1,650 레이어; 이름 1,017개; 별칭 776개 |
| 텍스처 계열 | 회전 64개, 애니메이션 71개 |
| 예약 식별자 | `/^bloxd/i`와 일치하는 이름 및 내부 `bloxdSp*` 심볼 88개 |
| 게임 정의 | 119개 |
| 셰이더 팩 정책 | 허용된 게임 12개, 항목 28개; [게임별 정책](policy.md) 참조 |
| 기본 팩 템플릿 | 1,633바이트 |
| 로더 제한 | WGSL 파일 256개 / 코드 총 256KB / `pack.json` 64KB / ZIP 32MB / 항목 1,024개 |

## bbb6l5 변경 사항

`bbb6l5`는 `apiVersion: 5`를 유지하면서 팩에 공개되는 API를 확장했습니다.

- `bloxdShadow()`, `bloxdAirShadow(t)`, `bloxdShadowDirection()`이 엔진이 계산한 태양·달 그림자를 제공합니다.
- uniform의 오프셋 64에 `shadowDirection: vec3f`가 추가되어 크기가 64바이트에서 80바이트로 늘었습니다.
- `pack.json`에 기존 원형 그림자를 유지하는 선택적 boolean 필드 `keepCircleShadows`가 추가되었습니다.
- 아틀라스는 1,227에서 1,650 레이어로, 사용 가능한 이름은 906개에서 1,017개로 늘었습니다.
- `v98qt8`에서 발생한 텍스처 상수 폴딩 회귀가 수정되었습니다.

측정 설명과 근거는 [리서치 로그](research-log.md)와 [텍스처 레지스트리 내부](texture-registry.md)를 참고하세요.

## 이전 버전

- [버전 히스토리](../history/) — 이전 API의 변경 및 마이그레이션
- [리서치 로그](research-log.md) — 측정 방법과 근거

## 관련 문서

- [엔진 헤더](engine-header.md) — 헤더 전체 내용
- [게임별 정책](policy.md) — allow / strict 정책 대상
- [텍스처 레지스트리](texture-registry.md) — 이름과 ID의 연결
