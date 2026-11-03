# 버전 히스토리

> 상태: Historical — 버전별 기록. 각 가이드의 머리에 대상 빌드가 명시되어 있다

v1 부터 v5 까지의 변경 내용·이주 절차·폐지된 API. 구형 팩의 이주와, 시대별 사양의 보존 자료로 쓴다.

## 연표

| 버전 | 가동 개시 | 가이드 | 주요 변경 |
|---|---|---|---|
| v1 | (최초) | [v1](v1.md) | 셰이더 팩 API 의 첫 등장. 6훅 (terrain/liquid × vertex/surface), `bloxdTime` / `bloxdOriginOffset` / `bloxdFaceBlock` / `engineColour` / `fogFactor` 어휘 |
| v2 | — | [v2](v2.md) | 식별자 전면 개명, `blockId`, `BLOXD_SCENE_DEPTH` 와 `bloxdOpaqueBehind()` |
| v3 | 2026-10-19 | [v3](v3.md) | `blockId` → `blockFlags` 비트 플래그, `bloxdPi` / `bloxdTau`, 액체 훅의 공식화, 훅 호출 내부의 분석 |
| v4 | 2026-10-26 | [v4](v4.md) | 텍스처 API (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`), strict 계약, 엔진 헤더·레지스트리 분석 |
| **v5** | **2026-11-03** | [v5](v5.md) | **현행** — `BloxdFlags` 구조체 (14 bool), Model 훅 (합계 9훅), `bloxdLit()` / `bloxdLitColour()` 라이팅 API, `localPosition`, 인챈트/오버레이 입출력, 6베리언트 |

## 공통 서두

현행 게임은 `apiVersion: 5` 만 받으며, **구버전 팩은 로드하는 순간 실패한다** (저장 팩은 조용히 비활성 — [호환성](../api/compatibility.md)). 각 가이드는 「이전 → 다음」 변환을 다룬다. 여러 버전을 건너뛸 때는 오래된 것부터 순서대로 적용하라.

## 체크리스트로 가는 지름길

- v4 팩 → [v5 가이드](v5.md) §77 (거의 기계적)
- v3 팩 → [v4](v4.md) §61 → [v5](v5.md) §77
- v2 팩 → [v3](v3.md) §47 → v4 → v5
- v1 팩 → [v2](v2.md) §37 부터 순서대로

> 현행 사양 자체는 [API 레퍼런스](../api/) 를, 현행 빌드의 내부 분석은 [엔진 내부와 연구](../internals/) 를 보라.
