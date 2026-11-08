# Zeit & Animation

> Ziel-API: 5 · Ziel-Build: `v98qt8` (2026-11-08, Produktion und Preprod) · Status: Verified (auf die aktuelle API portiert — Prüfung auf dem Gerät empfohlen)

> `bloxdSeconds()` wrappt alle 3600 Sekunden (1 Stunde). Es ist Shader-Laufzeit ohne garantierte Synchronisation mit Tag/Nacht im Spiel. Für sichtbare periodische Animation ok, aber für echte Nachterkennung `bloxdSunDirection()` und Licht-Inputs bevorzugen.

## Tag-Nacht-Zyklus (1 Tag pro Stunde)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdSeconds() * 6.2831853 / 3600.0);   // 0..1 Stundenperiode; nicht unbedingt mit Tag/Nacht im Spiel synchron
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

## Wobbeln (überlagerte Sinus)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

## Wandernde Aurora-Bänder / Fluoreszenzstreifen

```wgsl
// 3 Farben über XZ-Position und Zeit mischen
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```
