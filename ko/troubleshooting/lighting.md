# 라이팅 문제

> 대상 API: 5 · 상태: Verified

밝기·그림자·포그 문제.

## 동굴이 너무 밝다

- **원인**: `skyLight` 에 비선형성이 부족하다
- **해결**: [라이팅 레시피](../recipes/lighting.md) 와 [리얼화 레시피](../recipes/realism.md) 의 동굴 어둡히기 레시피

## 밤에 빛 받은 면이 너무 밝다

- **원인**: 그림자 색만 어둡게 했다 — 완성색은 낮의 밝기를 유지한다
- **해결**: 밤에는 완성색 전체를 감쇠하고 지역광 (`blockLight` / `heldLight`) 만 완화한다 — [야간 가이드](../guides/night.md)

## 밤이 너무 어둡다

- **해결**: 최저 앰비언트를 보장한다. `bloxdSunDirection()` 이 제로면 진짜 달 방향은 알 수 없으므로 유사 파란 앰비언트를 쓴다 ([밤 레시피](../recipes/lighting.md)). 달 방향 자체는 `-bloxdSunDirection()` 이다 (낮밤 사이클 월드 한정)

## 낮이 뽀개진다

- **해결**: ACES 전에 노출을 낮춘다 ([ACES](../recipes/realism.md))

## 횃불 주변이 주황으로 포화된다

- **해결**: 난색 혼합 비율을 낮춘다 ([난색 횃불 × 냉색 하늘](../recipes/realism.md))

## 엔진의 월드 라이트를 정확히 유지하고 싶다

- **v5 해법**: `bloxdWorldLight(light)` 를 호출한다 — 엔진의 「block/sky/held 중 최광, `ambientLightColour` 가 바닥」과 같은 수식이다 ([라이팅](../api/lighting.md#bloxdworldlight--월드의-빛))
- **주의**: `!bloxdLit()` 일 때 `blockLight` / `heldLight` 은 0, 하늘 관련 필드는 1 이다 (헤더 보증)

## 라이팅 꺼진 게임에서 이상하다

- **원인**: 라이팅 전용 입력 (`blockLight` 등) 을 가드 없이 씀. v5 에는 `#ifdef BLOXD_LIGHTING` 이 없다 — **런타임 `bloxdLit()`** 으로 분기한다
- **해결**: `if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }` 로 조기 반환한다 ([라이팅](../api/lighting.md#bloxdlit--게이트))

## "LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk"

- **원인**: 빛나는 블록이 밀집한 구역이 라이트 시드 큐를 넘쳐하게 해, 그 청크의 라이트 계산이 도중에 잘린다. **팩 탓이 아니다**. 다만 빛나는 덩어리 근처의 라이트 빈틈은 여기서 온다
- **해결**: 월드에서 광원을 흩어 놓는다

## 이론이 궁금하다면

- 그림자: [그림자](../guides/shadows.md) (skyLight = 복셀 섀도맵)
- 포그: [엔진 내부와 연구: 포그의 내부](../internals/fog-internals.md)

## 관련 문서

- [라이팅](../api/lighting.md) · [외관 문제](visual.md) · [라이팅의 내부](../internals/lighting-internals.md)
