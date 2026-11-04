# Konstanten

> Ziel-API: 5 · Ziel-Build: `xkg8x` · Status: Analyzed (wortwörtlich aus dem Live-Header restauriert)

Der Header stellt drei Konstanten bereit (Textur-Namenskonstanten `bloxdTextureId*` stehen in der [Textur-API](texture-api.md)).

```wgsl
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Blocks along each side of a chunk.
const bloxdChunkSize: i32 = 32;
```

| Konstante | Typ | Wert | Beschreibung |
|---|---|---|---|
| `bloxdPi` | `f32` | 3.1415926535898 | π |
| `bloxdTau` | `f32` | 6.2831853071796 | 2π (praktisch für Perioden) |
| `bloxdChunkSize` | `i32` | 32 | Blöcke entlang jeder Chunk-Seite |

## Verwendung

### bloxdPi / bloxdTau

Für dich deklariert — ein eigenes π definieren ist unnötig. `bloxdTau` ist praktisch für periodische Animation:

```wgsl
fn sway(worldPos: vec3f, time: f32) -> f32 {
    let phase = dot(worldPos, vec3f(1.0, 0.5, 0.8));
    return sin(time * bloxdTau / 3.0 + phase);
}
```

### bloxdChunkSize

Die Zahl der Blöcke entlang jeder Chunk-Seite, als benannte Konstante, auf die du verzweigen kannst. Nützlich für chunk-periodische Effekte (Schachbretter, Chunk-Grenzen-Akzente):

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

Hinweis: `bloxdChunkSize` ist `i32` — beim Mischen mit Floats per `f32(bloxdChunkSize)` konvertieren.

## Verwandte Seiten

- [Funktionen](functions.md) · [Versionsgeschichte: v3](../history/v3.md) (wo `bloxdPi` / `bloxdTau` ankamen)
