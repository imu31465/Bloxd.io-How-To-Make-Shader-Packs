# Constants

> Target API: 5 · Target build: `bny9u` · Status: Analyzed (restored verbatim from the live header)

The header provides three constants (texture name constants `bloxdTextureId*` are covered in [Texture API](texture-api.md)).

```wgsl
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Blocks along each side of a chunk.
const bloxdChunkSize: i32 = 32;
```

| Constant | Type | Value | Description |
|---|---|---|---|
| `bloxdPi` | `f32` | 3.1415926535898 | pi |
| `bloxdTau` | `f32` | 6.2831853071796 | 2π (handy for periods) |
| `bloxdChunkSize` | `i32` | 32 | blocks along each side of a chunk |

## Usage

### bloxdPi / bloxdTau

Declared for you — no need to define your own pi. `bloxdTau` is convenient for periodic animation:

```wgsl
fn sway(worldPos: vec3f, time: f32) -> f32 {
    let phase = dot(worldPos, vec3f(1.0, 0.5, 0.8));
    return sin(time * bloxdTau / 3.0 + phase);
}
```

### bloxdChunkSize

The number of blocks along each side of a chunk, as a named constant you can branch on. Useful for chunk-periodic effects (checkerboards, chunk-border accents):

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

Note: `bloxdChunkSize` is `i32` — cast with `f32(bloxdChunkSize)` when mixing with floats.

## Related

- [Functions](functions.md) · [Version History: v3](../history/v3.md) (where `bloxdPi` / `bloxdTau` arrived)
