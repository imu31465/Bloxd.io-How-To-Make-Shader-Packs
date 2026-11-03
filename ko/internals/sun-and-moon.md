# 태양과 달의 정체



`bloxdSunDirection()` 의 공급원은 스카이박스 종류가 바뀔 때만 다시 쓰는 태양 방향 버퍼이며, 판단 기준은 「하늘에 태양이 있는가」 가 아니라 **「스카이박스가 earth 타입인가」** 이다.

| 스카이박스 | `bloxdSunDirection()` |
|---|---|
| `default` (절차 하늘) | 0이 아님 (기존값 아래) |
| `gloomy` / `interstellar` / `space_*` (큐브 텍스처) | **항상 (0,0,0)** |

**달은 항상 `-bloxdSunDirection()` 에 있다** (엔진이 달의 위치를 태양의 정반대로 계산하기 때문). 밤낮 판정은 태양 고도로 한다 — `bloxdSunDirection().y < 0` (태양이 지평선 밑) 일 때 달이 위에 있다. 단 기존 월드에서는 태양이 정지해 있으므로 달도 정지해 있으며, 움직이는 달이 의미 있는 것은 낮밤 사이클을 구현한 월드뿐이다.

기존 월드의 태양 방향은 약 `(-0.56, 0.81, -0.18)` (inclination = −0.2 / azimuth = 0.55 에서 계산되는 단위 벡터, 정지). 배포 팩 테스트 때 하이라이트 방향을 미리 예측할 수 있는 실용 기준값이다.

낮밤 사이클은 엔진에 내장되어 있지 않다 — inclination 은 정적인 수치이며, 낮밤이 움직이는 월드는 게임측이 갱신한다. 그 갱신 때마다 `bloxdSunDirection()` 도 다시 쓰이므로 따라간다.

지형의 방향광은 씬 기동시에 만들어지는 2등뿐이며 **방향도 강도도 고정, 낮밤에 변하지 않는다**. 정리하면 **지형 밝기를 정하는 요소는 어느 것도 시간에 의존하지 않는다. 낮밤의 「겉모습」 은 스카이박스와 bloxdSunDirection() 뿐**이며, 밤에 지형을 어둡게 하고 싶은 팩은 bloxdSunDirection() 에서 직접 시간대를 추정할 수밖에 없다 (§19 의 `sunPresent` 수법).

## R-A. 방향성 달빛 — moonDir = −bloxdSunDirection()

달이 위에 있을 때만 푸르스름한 흰 Lambert 와 약한 스페큘러를 더한다. `moonUp` 이 0인 세계 (기존 정지 태양 월드) 에서는 아무 일도 일어나지 않으므로, **낮밤 사이클 있는 월드에서만 발동하는 안전한 달빛**이 된다.

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
