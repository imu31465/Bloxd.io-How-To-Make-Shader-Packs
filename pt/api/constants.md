# Constantes

> API alvo: 5 · Build alvo: `ab90qa` · Estado: Analyzed (restaurado literalmente do cabeçalho em produção)

O cabeçalho fornece três constantes (as constantes de nome de textura `bloxdTextureId*` são tratadas em [API de texturas](texture-api.md)).

```wgsl
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Blocks along each side of a chunk.
const bloxdChunkSize: i32 = 32;
```

| Constante | Tipo | Valor | Descrição |
|---|---|---|---|
| `bloxdPi` | `f32` | 3.1415926535898 | pi |
| `bloxdTau` | `f32` | 6.2831853071796 | 2π (prático para períodos) |
| `bloxdChunkSize` | `i32` | 32 | blocos ao longo de cada lado de um chunk |

## Uso

### bloxdPi / bloxdTau

Declaradas para você — não é preciso definir o seu próprio pi. `bloxdTau` é conveniente para animação periódica:

```wgsl
fn sway(worldPos: vec3f, time: f32) -> f32 {
    let phase = dot(worldPos, vec3f(1.0, 0.5, 0.8));
    return sin(time * bloxdTau / 3.0 + phase);
}
```

### bloxdChunkSize

O número de blocos ao longo de cada lado de um chunk, como uma constante nomeada sobre a qual você pode ramificar. Útil para efeitos periódicos por chunk (xadrez, acentos nas bordas de chunk):

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

Nota: `bloxdChunkSize` é `i32` — converta com `f32(bloxdChunkSize)` ao misturar com floats.

## Relacionados

- [Funções](functions.md) · [Histórico de versões: v3](../history/v3.md) (onde `bloxdPi` / `bloxdTau` chegaram)
