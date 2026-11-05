# 포그 내부

> 대상 API: 5 · 대상 빌드: `bny9u` (2026-11-05, 프로덕션) · 상태: Analyzed (프로덕션 번들의 JavaScript 수준 분석)

포그 계산은 항상 LINEAR 모드 (`fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)` 와 등가, clamp 0..1) 이며, `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = 포그 거리 설정; D = 0 일 때만 fogEnd = 5 특례) 이다. **포그 기울기대는 고작 32 블록 폭**이며, `l.fogAlpha` 는 「거리 안개」라기보다 **「로드된 월드의 가장자리까지의 정규화 거리」**에 가깝다. 플레이어마다 로드 거리가 다르므로, 거리 기반 연출은 직접 `distance(l.position, bloxdEyePosition())` 을 계산해야 한다 (아래 「로드 경계 밴드」 절). (참고: 렌더러의 포그 함수는 실제로 **네 가지** 모드 — 끔 / 지수 / 지수 제곱 / 선형 — 를 구현하며, 출하된 타이틀은 선형을 구동한다. 복원된 소스와 견고성 논거는 [버전 히스토리: v3](../history/v3.md)에 보존되어 있다.)

- 기본 포그색은 `rgb(183, 191, 195)` (엷은 청회색). 월드 작성자는 `fogColourOverride` (hex) 로 바꾼다. 포그 모드가 0 (NONE) 인 상태에서는 **fogColour 는 흑으로 도착한다**. 표준형 `bloxdApplyFog(col, l)` 은 fogAlpha 가 0 일 때 안개색이 쓰이지 않으므로 안전하다. 스크립트 API 측에는 그 외에 `fogChunkDistanceOverride` 와 `fogOnSkybox` 옵션이 있어, 커스텀 게임은 포그 거리 (D 에 해당하는 값) 와 스카이박스로의 포그 적용을 개별 설정할 수 있다. 기본에서는 스카이박스는 포그의 영향을 받지 않는다 (`fogOnSkybox` 를 유효화한 게임에서만, 스카이박스도 포그색으로 물든다).

플레이어측 `showFog` 를 끄면 포그는 3200~3232 블록으로 밀려나 사실상 무효가 된다 (`fogAlpha ≈ 0` 이 계속 돌아온다).

## 로드 경계 밴드 — fogAlpha 를 「월드 가장자리」로 쓴다

로드 경계의 32 블록대만 조용히 냉색으로 조여서, 월드 끝을 눈에 띄지 않게 한다 (또는 연출로 강조한다). 거리를 직접 계산하지 않으므로, 플레이어의 로드 거리 설정에 자동 추종하는 것이 이점.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogAlpha: 0 = 안쪽 (경계까지 여유 있음), 1 = 경계 밖으로 나갈 직전
    let edge = l.fogAlpha;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```
