# 개요와 전제

> 대상 API: 5 · 상태: Verified

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

- **할 수 있는 것**: 색상·투명도·발광 변경, 라이팅 조정 ([라이팅 API](../api/lighting.md)), `bloxdTexel`을 이용한 텍스처 샘플링, `flags`를 이용한 모델별 효과, 정점 애니메이션 (allow 게임만)
- **할 수 없는 것**: 사용자 텍스처 추가, 블룸 등의 후처리 효과 생성, 사용자 섀도맵 생성 또는 깊이 데이터 직접 접근, 실제 반사 (SSR), 하늘·구름·태양 원반 자체에 셰이더 적용
- **그림자**: `bloxdShadow()`는 엔진이 계산한 태양·달 그림자 계수를 제공하고, `bloxdShadowDirection()`은 그림자를 만드는 빛의 진행 방향을 반환한다. `bloxdAirShadow(t)`는 카메라와 프래그먼트 사이의 한 지점에서 그림자를 평가한다. 기존 `skyLight` 복셀 하늘 가림 방식도 계속 사용할 수 있다 ([그림자 가이드](../guides/shadows.md))

## strict 와 allow 모드

모든 게임에는 셰이더 팩 정책 (`shaderPackPolicy`) 이 있고, **대부분의 게임은 strict 모드로 돈다** (정점 애니메이션 없음, `discard` 없음). 일반 배포용 팩은 strict 모드에서 동작해야 한다. [베리언트](variants.md) 와 [정책 레퍼런스](../internals/policy.md) 를 보라.

## 이 문서의 전제

- 현행 게임은 `apiVersion: 5` 팩만 받는다. v1–v4 팩은 로드 시 거부된다 (저장 팩은 조용히 비활성 — [호환성](../api/compatibility.md))
- 구버전용으로 쓴 팩을 이주하고 있는가? [버전 히스토리](../history/) 를 보라
- 엔진 내부 설명은 참고 자료다. 지원되는 API 사양은 API 레퍼런스를 확인한다
