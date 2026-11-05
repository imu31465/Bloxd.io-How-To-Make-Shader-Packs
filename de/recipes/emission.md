# Emission

> Ziel-API: 5 · Ziel-Build: `bny9u` (2026-11-05, Produktion) · Status: Verified (auf die aktuelle API portiert — Prüfung auf dem Gerät empfohlen)

> `emission` wird nach der Lichtberechnung addiert, aber die Standardverarbeitung **dämpft es mit der Fog-Menge (`fogAlpha`). In völlig vernebelter Ferne verschwindet Emission ebenfalls. Um Glanz in der Ferne zu behalten, nicht auf emission addieren — direkt als `out.colour += ...` im Light-Hook addieren** (der Standard-Output ist bereits gefoggt, also landet Licht in der Ferne auf der Fog-Farbe)

## Pulsierende Lampen (atmende Fackeln)

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

## Leuchterz-Look (helle Materialien strahlen)

```wgsl
// Surface-Seite: je heller (weißer) das Material, desto mehr Emission
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

## Glühwürmchen-Schwarm (treibende Lichtpunkte)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // ein paar langsam treibende „Lichtkugeln"; Glühen per inverser Distanz
    let t = bloxdSeconds() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdSeconds() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```
