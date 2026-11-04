# 엔진 내부와 연구

엔진 구현을 분석해 복원한 내부 사양. 여기의 모든 것은 현행 프로덕션 빌드 (`xkg8x`) 의 JavaScript 에서 직접 회수했다. 정확한 내부 동작과 분석 결과를 보존하기 위해 공개 API 문서 ([API 레퍼런스](../api/)) 와 분리해 두었다.

## 구성

| 페이지 | 내용 |
|---|---|
| [렌더링 파이프라인](rendering-pipeline.md) | alphaTest 위치, 2광원 구성, uniform 의 실상, greedy 메싱 |
| [훅 호출](hook-invocation.md) | 훅이 엔진의 WGSL 에 어떻게 이어지는가 |
| [엔진 헤더](engine-header.md) | v5 헤더 전문 (그대로, 8,954B) |
| [셰이더 검증](shader-validation.md) | 분석기 내부, 시그니처 표, HEADER_VERSION |
| [WGSL 컴파일](wgsl-compilation.md) | 2단계 진짜 컴파일과 검증 스텁 |
| [예약 식별자](reserved-identifiers.md) | 46개 `bloxdSp*` 심볼 |
| [라이팅의 내부](lighting-internals.md) | blockLight / heldLight 의 구조 |
| [포그의 내부](fog-internals.md) | 선형뿐, 32블록 기울기대 |
| [텍스처 샘플링](texture-sampling.md) | 3변형 텍스처 코드젠 |
| [텍스처 레지스트리](texture-registry.md) | 이름→id 해석, 896 이름, 실측 드리프트 |
| [모델 렌더링](model-rendering.md) | v5 의 Model 프로그램 |
| [엔진 데이터](engine-data.md) | v5 상수·제한·레이아웃 대장 |
| [테스트 요인](testing-factors.md) | 월드·플레이어 설정 중 팩 가시값을 바꾸는 것 |
| [정책](policy.md) | shaderPackPolicy — allow 12 타이틀 |
| [태양과 달](sun-and-moon.md) | bloxdSunDirection 에 무엇이 흐르는가 |
| [디버깅](debugging.md) | URL 파라미터, 통계 패널 |
| [리서치 로그](research-log.md) | 방법론, 빌드 이력, 미검증 항목 |

> 대상 API: 5 · 대상 빌드: `xkg8x` (2026-11-04, 프로덕션 확인)

내부 사양은 안정된 API 계약이 아니다 — 엔진 업데이트로 바뀔 수 있으며, 각 페이지는 근거 빌드를 명시한다 ([리서치 로그](research-log.md)).
