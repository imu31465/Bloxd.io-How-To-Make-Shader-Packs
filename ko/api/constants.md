# 상수

> 대상 API: 5 · 대상 빌드: `ab90qa` · 상태: Analyzed (라이브 헤더에서 그대로 복원)

헤더는 세 개의 상수를 제공한다 (텍스처 이름 상수 `bloxdTextureId*` 는 [텍스처 API](texture-api.md) 에서 다룬다).

```wgsl
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Blocks along each side of a chunk.
const bloxdChunkSize: i32 = 32;
```

| 상수 | 형 | 값 | 설명 |
|---|---|---|---|
| `bloxdPi` | `f32` | 3.1415926535898 | 원주율 |
| `bloxdTau` | `f32` | 6.2831853071796 | 2π (주기 계산에 편리) |
| `bloxdChunkSize` | `i32` | 32 | 청크 한 변의 블록 수 |

## 사용법

### bloxdPi / bloxdTau

선언이 이미 되어 있으므로, 자신만의 pi를 정의할 필요는 없다. `bloxdTau` 는 주기 애니메이션에 편리하다:

```wgsl
fn sway(worldPos: vec3f, time: f32) -> f32 {
    let phase = dot(worldPos, vec3f(1.0, 0.5, 0.8));
    return sin(time * bloxdTau / 3.0 + phase);
}
```

### bloxdChunkSize

청크 한 변의 블록 수를, 분기에 쓸 수 있는 이름 붙은 상수로 제공한다. 청크 주기 효과 (체커보드, 청크 경계 강조) 에 유용하다:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    let p = bloxdWorldPosition(light.position);
    let chunk = floor(p / f32(bloxdChunkSize));
    let parity = (chunk.x + chunk.z) % 2.0;
    out.colour *= mix(1.0, 0.96, parity);
    return out;
}
```

주의: `bloxdChunkSize` 는 `i32` 이다 — float 와 섞을 때는 `f32(bloxdChunkSize)` 로 캐스트한다.

## 관련 문서

- [함수](functions.md) · [버전 히스토리: v3](../history/v3.md) (`bloxdPi` / `bloxdTau` 가 도착한 곳)
