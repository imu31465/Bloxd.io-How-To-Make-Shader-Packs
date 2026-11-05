# Constantes

> API objetivo: 5 · Build objetivo: `bny9u` · Estado: Analyzed (restaurado literalmente de la cabecera en vivo)

La cabecera proporciona tres constantes (las constantes de nombre de textura `bloxdTextureId*` se tratan en [API de texturas](texture-api.md)).

```wgsl
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Blocks along each side of a chunk.
const bloxdChunkSize: i32 = 32;
```

| Constante | Tipo | Valor | Descripción |
|---|---|---|---|
| `bloxdPi` | `f32` | 3.1415926535898 | pi |
| `bloxdTau` | `f32` | 6.2831853071796 | 2π (útil para periodos) |
| `bloxdChunkSize` | `i32` | 32 | bloques a lo largo de cada lado de un chunk |

## Uso

### bloxdPi / bloxdTau

Declaradas por ti — no hace falta definir tu propio pi. `bloxdTau` resulta cómoda para animación periódica:

```wgsl
fn sway(worldPos: vec3f, time: f32) -> f32 {
    let phase = dot(worldPos, vec3f(1.0, 0.5, 0.8));
    return sin(time * bloxdTau / 3.0 + phase);
}
```

### bloxdChunkSize

El número de bloques a lo largo de cada lado de un chunk, como constante con nombre sobre la que puedes ramificar. Útil para efectos periódicos por chunk (dameros, acentos en bordes de chunk):

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

Nota: `bloxdChunkSize` es `i32` — convierte con `f32(bloxdChunkSize)` al mezclarla con flotantes.

## Relacionado

- [Funciones](functions.md) · [Historial de versiones: v3](../history/v3.md) (donde llegaron `bloxdPi` / `bloxdTau`)
