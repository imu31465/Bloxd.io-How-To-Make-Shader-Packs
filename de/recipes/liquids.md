# Flüssigkeitsrezepte



## Gekräuselte Oberfläche (Farbschimmer)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdRenderOffset().x);
    let worldZ = s.position.z + f32(bloxdRenderOffset().z);
    let ripple = sin(bloxdSeconds() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // Liquid hat immer BLOXD_ALPHA — Guard aus Gewohnheit
    #endif
    return out;
}
```

## Höhen-Pseudo-Transparenz (kein echter Flachwassertest)

> In v1 waren Szenentiefe und Grundposition nicht abfragbar: echte Wassertiefe ließ sich mit dieser API allein nicht berechnen. In v2 misst `bloxdOpaqueBehind()` — nur in Flüssigkeiten — die Dicke bis zur opaken Fläche dahinter ([Teil VIII](../history/v2.md) R-E). Folgendes ist der alte Pseudo-Effekt ohne das: `s.position.y` ist eine lokale Koordinate und roh verwendet verschiebt sich der Effekt mit dem Chunk-Ursprung. Er variiert alpha nur über Welthöhe — Pseudo-Effekt, kein küsten-/grundbewusstes Flachwasser. `packWaterReferenceY` an die eigene Welthöhe anpassen.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // unten dünner, oben näher am Basis-Alpha; Richtung im Spiel prüfen
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

## Unterwassertrübung von innen

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

## Nur-Flüssigkeits-Paket (Terrain unberührt)

```wgsl
// Keine terrain_*-Hooks schreiben. Dann:
//  - Terrain-Varianten = ohne Hooks = Engine-Defaults
//  - Liquid-Varianten  = nur liquid_*-Hooks wirken
```
