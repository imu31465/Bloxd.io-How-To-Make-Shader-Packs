# 엔진 데이터

> 대상 API: 5 · 용도: 사양 요약

이 페이지에서는 셰이더 팩에서 사용할 수 있는 API와 팩 제작 시 알아야 할 제한을 정리합니다. 구체적인 정의와 예시는 각 참조 문서를 확인하세요.

## API 개요

| 항목 | 사양 |
|---|---|
| API 버전 | `5` |
| 훅 | 9개 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| 베리언트 | 6개 (allow / strict × terrain / liquid / model) |
| 매크로 | `BLOXD_STRICT`, `BLOXD_ALPHA`, `BLOXD_SCENE_DEPTH`. `BLOXD_LIGHTING`은 사용할 수 없습니다 |
| 팩 uniform | 80바이트. 필드 오프셋은 [팩 형식](../api/pack-format.md) 참조 |
| 텍스처 | `bloxdTextureId<Name>` 형식의 이름 상수를 사용하세요. 숫자 ID를 고정하지 마세요 |
| 예약 이름 | `bloxd`로 시작하는 식별자는 엔진용으로 예약되어 있습니다 |

## 팩 제한

| 항목 | 제한 |
|---|---:|
| WGSL 파일 수 | 256 |
| WGSL 소스 총량 | 256 KB |
| `pack.json` | 64 KB |
| ZIP 파일 | 32 MB |
| ZIP 항목 수 | 1,024 |

ZIP 루트에 매니페스트를 하나만 두고 파일은 UTF-8로 저장하세요. 중복 경로나 지원하지 않는 ZIP 형식은 허용되지 않습니다. 자세한 내용은 [팩 형식](../api/pack-format.md)을 참조하세요.

## API v5 주요 기능

- `bloxdShadow()` 및 `bloxdAirShadow(t)`로 태양광과 달빛에 의한 그림자 정보를 가져올 수 있습니다.
- `bloxdShadowDirection()`은 그림자를 만드는 빛의 방향을 반환합니다.
- 그림자 API를 사용하면서 기존 원형 그림자를 유지하려면 `pack.json`의 선택 항목 `keepCircleShadows`를 `true`로 설정하세요.
- 광원 활성 상태는 `BLOXD_LIGHTING`이 아니라 `bloxdLit()`으로 런타임에 확인하세요.

## 관련 문서

- [API 참조](../api/) — 함수, 구조체, 상수
- [팩 형식](../api/pack-format.md) — 매니페스트, uniform, 로더 제한
- [텍스처 카탈로그](../api/texture-catalog.md) — 사용할 수 있는 텍스처 이름
- [게임별 적용 정책](policy.md) — allow / strict 범위
- [API v4 마이그레이션 가이드](../history/v4.md) — 이전 버전에서 마이그레이션
