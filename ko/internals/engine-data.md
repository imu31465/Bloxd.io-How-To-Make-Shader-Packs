# 엔진 데이터 요약

> 대상 API: 5 · 상태: Analyzed

이 페이지는 셰이더 팩에서 사용할 수 있는 API 구성을 요약한다. 사용 방법은 [API 레퍼런스](../api/)를 참조한다.

## API 구성

| 항목 | 사양 |
|---|---|
| API 버전 | `5` |
| 엔진 헤더 | 216줄; [엔진 헤더](engine-header.md) 참조 |
| 훅 | 9개 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| 베리언트 | 6개 (strict × terrain / liquid / model) |
| 매크로 | `BLOXD_STRICT`, `BLOXD_ALPHA`, `BLOXD_SCENE_DEPTH` |
| 팩 uniform | 80바이트; [팩 형식](../api/pack-format.md) 참조 |
| uniform 필드 | `seconds` @0, `lit` @4, `renderOffset` @16, `sunDirection` @32, `eyePosition` @48, `shadowDirection` @64 |
| 텍스처 이름 | 사용 가능한 이름 상수는 [텍스처 카탈로그](../api/texture-catalog.md)에 수록 |

## 그림자 API

- `bloxdShadow()`는 엔진이 계산한 태양·달 그림자 계수를 반환한다.
- `bloxdAirShadow(t)`는 카메라와 프래그먼트 사이의 한 지점에서 그림자를 평가한다.
- `bloxdShadowDirection()`은 그림자를 만드는 빛의 방향을 반환한다.
- `keepCircleShadows`는 기존 원형 그림자를 유지하는 `pack.json` 선택 필드다.

## 관련 페이지

- [API 레퍼런스](../api/) — 팩에서 사용할 수 있는 API
- [팩 형식](../api/pack-format.md) — manifest, uniform, 로더 제한
- [게임별 정책](policy.md) — 게임별 제한
