# 발광 레시피 (emission)



> `emission` 은 조명 계산 후에 가산되지만, 기존 처리에서는 **`fogVisibility` 가 곱해져 감쇠한다. 즉 완전히 안개에 잠긴 원경에서는 emission 도 사라진다. 원경에서도 빛나게 하고 싶은 성분은 emission 에 더하지 말고, light 훅 안에서 `out.colour += ...` 로 직접 가산한다** (engineColour 는 포그된 상태이므로, 원경에서는 안개색 위에 빛이 얹힌다)

## 등불의 맥동 (횃불이 숨쉰다)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let pulse = 0.5 + 0.5 * sin(bloxdSeconds() * 2.3 + l.position.x * 0.8);
        out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
}
    return out;
}
```

## 발광 광석 느낌 (밝은 소재를 빛나게)

```wgsl
// surface 측: 소재가 밝을 (흴) 수록 emission 을 얹는다
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

## 반딧불 무리 흉내 (시간으로 공간을 떠도는 광점)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // 몇 개의 「빛의 구슬」 이 천천히 이동한다. distance 의 역수로 빛나게 한다
    let t = bloxdSeconds() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdSeconds() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```
