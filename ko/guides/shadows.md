# 그림자

> 대상 API: 5 · 대상 빌드: `bbb6l5` · 상태: Verified (LightEngine 동작은 v4 실측 이후 불변)
> **`bbb6l5`부터**: 실제 태양 섀도 API가 추가되었습니다 — `bloxdShadow()` (0~1 섀도 계수. 블록·플레이어·몹·아이템이 섀도를 드리우고 태양을 따라감), `bloxdAirShadow(t)` (빛 기둥용), `bloxdShadowDirection()` (빛의 진행 방향). pack.json의 `keepCircleShadows`로 옛 원형 섀도 병존도 선택할 수 있습니다. 자세히는 [함수](../api/functions.md)를 보세요.


셰이더 팩에서 「그림자」를 만드는 세 방법과 그 한계.

## 가능 / 불가능

| 효과 | 가능? | 방법 |
|---|---|---|
| 나무·지붕 밑을 뚜렷하게 어둡게 (투영형) | ◎ | `skyLight` 리프트 역변환 + 임계값 컷 (아래) |
| 그림자가 블록 편집에 실시간 추종 | ◎ | LightEngine 이 즉시 재계산 — 자동 |
| 그림자는 냉색 / 양지는 난색 | ◎ | 2색 시프트 |
| 태양과 달을 따라 움직이는 그림자 | ◎ | `bloxdShadow()` |
| 섀도맵 깊이 데이터 접근 | ✕ | API는 최종 그림자 계수만 제공하며 깊이 데이터는 제공하지 않는다. |
| 물리적 반음영 | ✕ | 복셀 분해능의 BFS 확산이 상한 |
| 실시간 AO (SSAO) | ✕ | 버텍스 색에 구워진 AO 뿐 |

## skyLight 은 복셀 섀도맵이다

`l.skyLight` 은 단순한 밝기 파라미터가 아니다. 메셔의 LightEngine 이 마인크래프트식 **「이 장소에서 하늘이 보이는가」 복셀 가림 데이터 = 섀도맵** 을 계산한다:

1. **종열 스캔**: 각 (x,z) 열을 위에서 아래로. 하늘빛은 15 에서 시작해 불투명 블록에서 0 이 되고, `lightFilter` (공기 1 / 물 3 / 불투명 15) 로 감광하며 내려간다
2. **BFS 플러드필**: 6근방으로 옆으로 확산 (1블록에 −1) — 이것이 그림자 가장자리를 부드럽게 하는 정체. 반경 r 가림물 밑의 생값은 (15−r)/15 다
3. blockLight (횃불 등) 는 RGB 3채널 (4bit 팩) 의 별도 BFS 다

나무 밑, 지붕 밑, 실내에서는 값이 이미 낮고, 정점 보간으로 매끄럽게 도착한다. 블록을 놓거나 부수면 즉시 재계산 — **실시간 추종 그림자**.

## 리프트 곡선의 함정

`l.skyLight` 은 **리프트 곡선 적용 후** 로 도착한다 (`y = 1-(1-x/(3-2x))³`, 어두운 값을 끌어올리는 S자 곡선):

| 장소 | 생 복셀값 | 리프트 후 (= l.skyLight) | pow(·, 5.0) |
|---|---|---|---|
| 옥외 | 1.00 | 1.00 | 1.00 |
| 나무 밑 (반경 2) | 0.87 | **0.97** | **0.86** ← 거의 유지 |
| 반경 3 | 0.80 | **0.92** | 0.66 |
| 반경 5 | 0.67 | 0.78 | 0.29 |

**이것이 「감마로 그림자가 어두워지지 않는다」의 입증된 근본 원인이다** — γ=5 로도 나무 밑 0.97 은 0.86 까지밖에 내려가지 않는다.

## 해법: 리프트 역변환 + 임계값 컷

곡선은 단조증가이므로 정확히 역변환된다: `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. 생값을 복원한 뒤, **`smoothstep` 임계값**으로 이값화한다. LightEngine 의 BFS 확산은 「인접 1블록에 −1」이므로, `th = 1 - r/15` 이 곧 「그림자로 간주하는 가림 반경」 다이얼이다.

전체 구현 (태양 게이팅 + 난색/냉색 분리 + blockLight 통과) 은 [리얼화 레시피](../recipes/realism.md) 에 있다. 핵심 단계:

```wgsl
// 1. restore the raw value (skipping this means shadows never appear)
let skyRaw = sh_unlift(l.skyLight);
// 2. threshold-cut — sunlit 1 / shadow 0
let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
// the essence of projection: direct sun only reaches places that see the sky
let lit = sunL * sky;
```

다이얼: **면적** = `shTh` (0.93→반경 1.5 / 0.87→2 / 0.80→3 / 0.67→5). **가장자리 부드러움** = `shSoft`. **핵심 어두움** = 최저 앰비언트와 하늘 산란 2점 시프트. 저녁의 긴 그림자 ≈ `thEff = shTh + 0.10 * (1 - clamp(sunDir.y, 0.0, 1.0))`.

## 솔직한 한계

- 이 한계는 오래된 `skyLight` 방식에만 해당합니다. 이 방식은 **위쪽 하늘**을 기준으로 하므로 **태양을 따라 회전하지 않습니다**. 현재 API의 `bloxdShadow()`는 태양이나 달을 따라갑니다.

- 픽셀 정밀 회전 그림자는 현행 API 밖이다 ([도달할 수 없는 표현](constraints.md))

## 관련 문서

- [리얼화 레시피](../recipes/realism.md) (투영 그림자 전체 레시피) · [라이팅의 내부](../internals/lighting-internals.md) · [디버깅 팁](debugging.md)
