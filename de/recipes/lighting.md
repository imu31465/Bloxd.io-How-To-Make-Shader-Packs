# Beleuchtung

> Ziel-API: 5 · Ziel-Build: `v98qt8` (2026-11-08, Produktion und Preprod) · Status: Verified (auf die aktuelle API portiert — Prüfung auf dem Gerät empfohlen)

## Kontrast-S-Kurve

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

## Distanz-Dunst (eigener Fog)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 0..0.35 eigenen Fog von 64 bis 192 Blöcken dazugeben
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

## Nacht (skyLight-Blauverschiebung + Lampenschutz)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
}
    return out;
}
```

## Höhlen stockdunkel (skylight-lose Stellen weiter abdunkeln)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        out.colour *= mix(1.0, 0.35, underground * underground);
}
    return out;
}
```

> `skyLight` kommt post-Lift an (Abschnitt 10): flache Verdeckung (unterm Baum: roh 0,87 → geliftet 0,97) dunkelt mit dieser Methode kaum. Für Höhlen (roh 0) tauglich. Um „Baumschatten" zu schärfen, Lift-Inversion + Schwellenwert aus R9.12 verwenden.

## Blaues Nacht-Ambiente (Pseudo-Look ohne Mondrichtung)

> In dieser API ist `bloxdSunDirection()` null, wenn der Himmel keine Sonne hat. Folgendes ist kein gerichtetes Mondlicht, nur schwaches blaues Ambiente bei dunklem Himmel. Die Mondrichtung selbst ist via `-bloxdSunDirection()` verfügbar (nur Welten mit Tag/Nacht-Zyklus — [Sonne und Mond](../internals/sun-and-moon.md)).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let upward = clamp(l.normal.y, 0.0, 1.0);
        out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
}
    return out;
}
```

## Abendrot-Wärme (Farbton nach Sonnenhöhe)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 am Horizont / 0 im Zenit
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

## Totaler Engine-Output-Ersatz (einfachstes Relighting)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    if (bloxdLit()) {
        // HINWEIS: direkte BloxdLight(...)-Konstruktion verboten; colour ab default umschreiben
        var out = bloxdDefaultLight(s, l);
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let level = clamp(sky * 0.7 + block, 0.0, 1.0);
        // engineColour (das Engine-Lichtergebnis) verwerfen und „Basisfarbe × selbst berechnete Helligkeit" einsetzen
        var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));   // engineColour verworfen: Fog-Neuanwendung Pflicht
        out.colour = col + s.emission * (1.0 - l.fogAlpha);   // Emission selbst dazugeben (Pflicht)
        return out;
} else {
        return bloxdDefaultLight(s, l);
}
}
```
