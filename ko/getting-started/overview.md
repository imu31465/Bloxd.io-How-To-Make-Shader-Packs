# 개요와 전제

## 셰이더 팩이란

Bloxd.io 셰이더 팩은 게임의 **WebGPU 렌더러만** 외관을 바꾼다. 팩은 **제한된 WGSL 서브셋**으로 쓰고, 게임 내 설정 → Shader Pack 화면에서 zip 이나 폴더로 로드한다. 팩이 설치되어 있는 동안 설정에서 WebGPU 렌더러가 강제로 켜진다.

팩 코드는 WGSL로 검증 및 컴파일됩니다. 팩의 WGSL 코드는 JavaScript를 실행하거나 네트워크 요청을 보낼 수 없습니다.

## 바꿀 수 있는 것

팩은 렌더러의 **면별 3단계 파이프라인**에 끼어든다. 렌더 대상은 세 프로그램으로 나뉘며, 합계 **9개의 훅**을 가진다:

| 대상 | 훅 (Vertex / Surface / Light) | 그리는 것 |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | 물과 블록 모델을 제외한 모든 블록 |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | 물 |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | 블록 모델 (반 블록, 계단, 식물), 아이템, 플레이어, 몹, NPC, 방어구, 화장품 |

- **할 수 있다**: 색·투명도·발광 변경, 라이팅 재구축 ([라이팅 API](../api/lighting.md)), 엔진이 계산한 태양·달 그림자 사용 (`bloxdShadow()`, `bloxdAirShadow(t)`, `bloxdShadowDirection()`), 복셀 하늘 가림 (`skyLight`) 사용, `bloxdTexel`로 텍스처 샘플링, `flags`를 이용한 모델별 효과, allow 게임에서 정점 애니메이션
- **할 수 없다**: 자체 텍스처 추가 (텍스처팩 시스템의 역할), 최종 프레임 후처리 (블룸 등), 섀도맵 깊이 데이터 접근 또는 자체 섀도맵 생성, 실제 반사 (SSR) 추가, 하늘·구름·태양 원반 자체 변경
- **그림자 방식 선택**: 태양과 달을 따라가는 엔진 그림자에는 `bloxdShadow()`를 사용한다. `skyLight`는 나무 밑과 지붕 밑을 어둡게 하는 이전 방식이며 태양이나 달의 움직임을 따라가지 않는다. [그림자](../guides/shadows.md)를 참조한다.

## strict 와 allow 모드

모든 게임에는 셰이더 팩 정책 (`shaderPackPolicy`) 이 있고, **대부분의 게임은 strict 모드로 돈다** (정점 애니메이션 없음, `discard` 없음). 일반 배포용 팩은 strict 모드에서 동작해야 한다. [베리언트](variants.md) 와 [정책 레퍼런스](../internals/policy.md) 를 보라.

## 이 문서의 전제

- 현행 게임은 `apiVersion: 5` 팩만 받는다. v1–v4 팩은 로드 시 거부된다 (저장 팩은 조용히 비활성 — [호환성](../api/compatibility.md))
- 구버전용으로 쓴 팩을 이주하고 있는가? [버전 히스토리](../history/) 를 보라
