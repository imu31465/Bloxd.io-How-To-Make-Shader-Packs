# 포그의 내부 사양



포그 계산은 항상 LINEAR 모드 (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1) 이며, `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = 포그 거리 설정. D = 0 일 때만 fogEnd = 5 특례) 이다. **포그 기울기대는 고작 32 블록 폭**이며, `(1.0 - l.fogAlpha)` 는 「거리 안개」 라기보다 **「읽힌 월드의 가장자리까지 정규화 거리」** 지표이다. 플레이어마다 읽기 거리가 다르므로, 거리 기반 연출은 직접 `distance(l.position, bloxdEyePosition())` 을 계산해야 한다 (레시피 R-B). (v3 참고: 렌더러의 포그 함수는 실제로 **네 가지** 모드 — 끔 / 지수 / 지수 제곱 / 선형 — 를 구현하며, 출하된 타이틀은 선형을 구동한다. 복원한 소스와 견고성 논의는 [제9부](../history/v3.md) §50에 있다.)

- 기본 포그색은 `rgb(183, 191, 195)` (엷은 청회색). 월드 작성자는 `fogColourOverride` (hex) 로 바꾼다. 포그 모드가 0 (NONE) 인 상태에서는 **fogColour 는 흑으로 도착한다** (`fogColour = select(vec3f(0.0), uniforms.vFogColor, ...)`). 표준형 `mix(l.fogColour, col, (1.0 - l.fogAlpha))` 는 fogVisibility 가 1 일 때 안개색이 쓰이지 않으므로 안전. 스크립트 API 측에는 그 외에 `fogChunkDistanceOverride` 와 `fogOnSkybox` 옵션이 있어, 커스텀 게임은 포그 거리 (D 에 해당하는 값) 와 스카이박스로의 포그 적용을 개별 설정할 수 있다. 기본에서는 스카이박스는 포그의 영향을 받지 않는다 (`fogOnSkybox` 를 유효화한 게임에서만, 스카이박스도 포그색으로 물든다).

플레이어측 `showFog` 를 끄면 포그는 3200~3232 블록으로 밀려나 사실상 무효가 된다 (`fogVisibility ≈ 1` 이 계속 돌아온다).

## R-B. 읽기 경계 밴드 — fogVisibility 를 「월드 가장자리」 로 쓴다

읽기 경계의 32 블록대만 조용히 냉색으로 조여서, 월드 끝을 눈에 띄지 않게 한다 (또는 연출로 강조한다). 거리를 직접 계산하지 않으므로, 플레이어의 읽기 거리 설정에 자동 추종하는 것이 이점.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = 안쪽 (경계까지 여유 있음), 0 = 경계 밖으로 나갈 직전
    let edge = 1.0 - (1.0 - l.fogAlpha);
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```
