# 시간 레시피 (애니메이션)



> `bloxdSeconds()` 은 3600초 (1시간) 에 감긴다. 셰이더 경과 시간이며 게임 안의 태양·낮밤과 동기된다는 보장은 없다. 겉보기 주기 애니메이션에는 쓸 수 있지만 실제 밤 판정에는 `bloxdSunDirection()` 이나 조명 입력을 우선한다.

## 낮밤 사이클 (1시간에 1일)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdSeconds() * 6.2831853 / 3600.0);   // 0..1 의 1시간 주기. 게임 안의 낮밤과 동기되리라는 보장은 없다
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

## 흔들림 (복수 sin 의 겹침)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

## 밴드가 흐르는 오로라 / 형광 띠

```wgsl
// XZ 위치와 시간으로 3색을 섞는다
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```
