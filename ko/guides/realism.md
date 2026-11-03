# 리얼화의 두 유파

> 대상 API: 5 · 대상 빌드: `ab90qa` (2026-11-03, 프로덕션) · 상태: Verified (현재 API로 이식됨 — 실기기 재확인 권장)

**유파 A: 가산 수정 (defaultLight 기점)** — `engineColour` (완성색) 를 바탕으로, 난색 글로우나 림을 더한다. 간편하고 안전하지만 조명 모델 자체는 기존 그대로.

**유파 B: 완전 리라이팅 (s.colour 기점)** — `l.engineColour` 을 버리고 `s.colour` (알베도) 와 LightIn 생소재에서 조명을 다시 짠다. 리얼화로 가는 진짜 길. 지킬 4가지 규칙:

1. **포그를 다시 건다**: light 훅은 최종단 (포그 뒤) 에서 불리므로 `mix(l.fogColour, col, (1.0 - l.fogAlpha))` 를 직접 적용한다 (R9.10). 포그가 너무 짙을 때는 `min(l.fogAlpha, 0.70)` 으로 바닥을 깐다. 반대로 engineColour 기점 팩에 포그색을 더 섞으면 이중 포그로 원경이 하얗게 뜬다
2. **조명off 베리언트 폴백**: `#ifdef BLOXD_LIGHTING` 밖에서는 `defaultLight` 로 그대로 통과시킨다
3. **공용 함수째 가드한다**: `BloxdLightIn` 을 인수로 취하는 공용 함수는 fn째 `#ifdef BLOXD_LIGHTING` 로 감싼다 (호출측만으로는 불충분)
4. **태양 방향이 없을 때**: `bloxdSunDirection()` 이 제로면 방향성 스페큘러는 계산하지 않는다. `l.directional` 은 광량의 스칼라지 방향 벡터가 아니므로 하이라이트 방향을 복원하는 용도로는 쓸 수 없다. 필요하면 방향성 없는 약한 환경광으로 전환한다. 단 달의 방향은 `-bloxdSunDirection()` 으로 얻을 수 있다 (낮밤 사이클 월드에서만 움직인다 — [태양과 달](../internals/sun-and-moon.md) 참조)
