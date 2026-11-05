# 개요와 전제

> 대상 API: 5 · 대상 빌드: `bny9u` (2026-11-05, 프로덕션 확인) · 상태: Verified

## 셰이더 팩이란

Bloxd.io 셰이더 팩은 게임의 **WebGPU 렌더러만** 외관을 바꾼다. 팩은 **제한된 WGSL 서브셋**으로 쓰고, 게임 내 설정 → Shader Pack 화면에서 zip 이나 폴더로 로드한다. 팩이 설치되어 있는 동안 설정에서 WebGPU 렌더러가 강제로 켜진다.

팩은 순수 WGSL 로 검증·컴파일된다 — JavaScript 실행 없음, 네트워크 없음. 정상적인 코드로는 위험한 일이 일어나지 않는다.

## 바꿀 수 있는 것

팩은 렌더러의 **면별 3단계 파이프라인**에 끼어든다. 렌더 대상은 세 프로그램으로 나뉘며, 합계 **9개의 훅**을 가진다:

| 대상 | 훅 (Vertex / Surface / Light) | 그리는 것 |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | 물과 블록 모델을 제외한 모든 블록 |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | 물 |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | 블록 모델 (반 블록, 계단, 식물), 아이템, 플레이어, 몹, NPC, 방어구, 화장품 |

- **할 수 있다**: 색·투명도·발광 변경, 라이팅 재구축 ([라이팅 API](../api/lighting.md)), 투영형 그림자 (`skyLight` 경유), 텍스처 샘플 (`bloxdTexel` — 기존 블록 텍스처 아틀라스 읽기), 모델별 효과 (`flags` 가 「손에 든 아이템이다」「플레이어다」를 알려준다), 정점 애니메이션 (allow 게임만)
- **할 수 없다**: 자신의 텍스처 추가 (그것은 텍스처팩 시스템의 임무), 후처리 (블룸 등), 태양과 함께 도는 섀도맵 그림자, 진짜 반사 (SSR), 하늘·구름·태양 원반 자체에 영향
- **놓치기 쉽지만 강력**: **`skyLight` (복셀 하늘 가림) 을 쓴 투영형 그림자** — 나무 밑과 지붕 밑을 뚜렷하게 어둡게 한다. 블록을 부수면 LightEngine 이 즉시 재계산하므로, 그림자는 실시간으로 따라간다

## strict 와 allow 모드

모든 게임에는 셰이더 팩 정책 (`shaderPackPolicy`) 이 있고, **대부분의 게임은 strict 모드로 돈다** (정점 애니메이션 없음, `discard` 없음). 일반 배포용 팩은 strict 모드에서 동작해야 한다. [베리언트](variants.md) 와 [정책 레퍼런스](../internals/policy.md) 를 보라.

## 이 문서의 전제

- 현행 게임은 `apiVersion: 5` 팩만 받는다. v1–v4 팩은 로드 시 거부된다 (저장 팩은 조용히 비활성 — [호환성](../api/compatibility.md))
- 구버전용으로 쓴 팩을 이주하고 있는가? [버전 히스토리](../history/) 를 보라
- 엔진 내부는 업데이트로 바뀔 수 있으므로, 모든 페이지가 대상 빌드를 명시한다
