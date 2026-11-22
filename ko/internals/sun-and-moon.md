# 태양과 달

> 대상 API: 5 · 문서 유형: 기술 참조

`bloxdSunDirection()`은 태양 방향 버퍼를 읽는다. 이 버퍼는 스카이박스 종류가 바뀔 때만 갱신된다. 판단 기준은 하늘에 태양이 보이는지가 아니라 **스카이박스의 종류가 `earth`인지 여부**이다.

| 스카이박스 | `bloxdSunDirection()` |
|---|---|
| `default` (절차적 하늘) | 0이 아님 (기본값은 아래 참조) |
| `gloomy` / `interstellar` / `space_*` (큐브 텍스처) | **항상 (0,0,0)** |

**달의 방향은 항상 `-bloxdSunDirection()`이다** (엔진이 달의 위치를 태양의 정반대 방향으로 계산하기 때문). 밤인지 여부는 태양의 고도로 판단한다. `bloxdSunDirection().y < 0` (태양이 지평선 아래)일 때 달이 지평선 위에 있다. 다만 기본 월드에서는 태양이 고정되어 있으므로 달도 움직이지 않는다. 달의 움직임은 낮과 밤의 주기를 구현한 월드에서만 나타난다.

기본 월드의 태양 방향은 약 `(-0.56, 0.81, -0.18)`이다 (`inclination` = −0.2 / `azimuth` = 0.55에서 계산한 정적 단위 벡터). 배포할 셰이더 팩을 테스트할 때 하이라이트 방향을 가늠하는 기준값으로 사용할 수 있다.

엔진에는 낮과 밤의 주기가 내장되어 있지 않다. `inclination`은 정적인 값이며, 낮과 밤의 변화를 구현한 월드는 게임 로직에서 이 값을 갱신한다. `bloxdSunDirection()`은 그 변경 사항을 반영한다.

지형 조명에는 씬 시작 시 생성되는 방향광 2개만 사용되며, **방향과 강도는 낮과 밤에 관계없이 고정되어 있다**. 즉, 지형의 밝기는 시간에 따라 변하지 않는다. 낮과 밤의 시각적 차이는 스카이박스와 `bloxdSunDirection()`으로만 표현된다. 밤에 지형을 어둡게 만들려는 셰이더 팩은 `bloxdSunDirection()`을 바탕으로 시간대를 직접 추정해야 한다 ([야간 표현 설계](../guides/night.md)의 `sunPresent` 기법 참조).

## R-A. 달빛 효과

달이 지평선 위에 있을 때만 푸른빛이 도는 흰색 Lambert 조명과 약한 정반사광을 더한다. 태양이 고정된 기본 월드에서는 `moonUp`이 0이므로 아무 효과도 나타나지 않는다. **이 달빛 효과는 낮과 밤의 주기를 구현한 월드에서만 활성화된다.**

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // 달은 항상 태양의 정반대. 낮 동안은 moonDir.y < 0 으로 자동 소등된다
        let moonDir = -bloxdSunDirection();
        let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
        if (moonUp > 0.0) {
            let n     = normalize(l.normal);
            let diff  = max(0.0, dot(n, moonDir));
            let view  = normalize(bloxdEyePosition() - l.position);
            let halfV = normalize(moonDir + view);
            let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
            out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
        }
    }
    return out;
}
```
