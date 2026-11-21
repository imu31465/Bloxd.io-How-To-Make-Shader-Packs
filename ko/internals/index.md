# 엔진 내부

이 분류는 셰이더 팩의 실행을 이해하는 데 도움이 되는 엔진 내부 동작을 설명합니다. 구현 세부 사항은 게임 업데이트에 따라 바뀔 수 있습니다. 안정적인 사용 규칙과 지원 API는 [API 참조](../api/)를 확인하세요.

## 구성

| 페이지 | 내용 |
|---|---|
| [렌더링 파이프라인](rendering-pipeline.md) | alphaTest 위치, 2광원 구성, uniform 의 실상, greedy 메싱 |
| [훅 호출](hook-invocation.md) | 훅이 엔진의 WGSL 에 어떻게 이어지는가 |
| [엔진 헤더](engine-header.md) | 셰이더 팩 앞에 추가되는 WGSL 선언 |
| [셰이더 검증](shader-validation.md) | 분석기 내부, 시그니처 표, HEADER_VERSION |
| [WGSL 컴파일](wgsl-compilation.md) | 2단계 진짜 컴파일과 검증 스텁 |
| [예약 식별자](reserved-identifiers.md) | 46개 `bloxdSp*` 심볼 |
| [라이팅의 내부](lighting-internals.md) | blockLight / heldLight 의 구조 |
| [포그의 내부](fog-internals.md) | 선형뿐, 32블록 기울기대 |
| [텍스처 샘플링](texture-sampling.md) | 3변형 텍스처 코드젠 |
| [텍스처 레지스트리](texture-registry.md) | 이름 해석, 애니메이션 및 회전 이름 |
| [모델 렌더링](model-rendering.md) | v5 의 Model 프로그램 |
| [엔진 데이터](engine-data.md) | API v5 기능 및 팩 제한 |
| [테스트 요인](testing-factors.md) | 월드·플레이어 설정 중 팩 가시값을 바꾸는 것 |
| [정책](policy.md) | shaderPackPolicy — allow 12 타이틀 |
| [태양과 달](sun-and-moon.md) | bloxdSunDirection 에 무엇이 흐르는가 |
| [디버깅](debugging.md) | URL 파라미터, 통계 패널 |


엔진 내부 구현은 안정적인 API 계약이 아닙니다. 팩을 작성할 때는 [API 참조](../api/)의 공개 사양을 우선하세요.
