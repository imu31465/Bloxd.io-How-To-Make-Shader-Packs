# Nacht-Looks gestalten

> Ziel-API: 5 · Ziel-Build: `bbb6l5` (2026-11-20, Produktion und Preprod) · Status: Verified (auf die aktuelle API portiert — Prüfung auf dem Gerät empfohlen)

Nur Schatten abzudunkeln lässt die fertige Farbe (`engineColour`) ohne Sonne hell, und die Flächen/Schatten-Lücke wird unnatürlich. Die ganze fertige Farbe dämpfen.

Das Beispiel interpretiert `bloxdSunDirection() == 0` als Nacht und eine gültige Sonnenrichtung als Tag. Nachts wird die fertige Terrain-Farbe abgeschwächt. Bei hohen Werten für `blockLight` und `heldLight` fällt die Abschwächung geringer aus, damit Lichtquellen in der Nähe – etwa Fackeln – sichtbar bleiben. `0.52` ist ein einstellbarer Wert. Für dunklere Nächte kann er verringert werden.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    if (bloxdLit()) {
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
        let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
        let protectLocalLight = smoothstep(0.03, 0.35, localLight);
        scale = mix(nightDim, 1.0, protectLocalLight);
}
    // fertige Farbe dämpfen; Material-Emission per Default mit Fog addieren
    out.colour = l.engineColour * scale + s.emission * (1.0 - l.fogAlpha);
    return out;
}
```

**Limits dieses Fixes:** Verhält sich `bloxdSunDirection()` wie „Einheitsrichtung mit Sonne, null ohne", lassen sich Tag/Nacht unterscheiden, aber Abendrot nicht weich schätzen. Und da es die fertige Farbe dämpft, schwächt es Engine-Tageslicht und -Ambiente zusammen — keine totale Tageszeit-Reproduktion. Für Flüssigkeiten dieselbe Liquid-Hook-Fallback-Beziehung prüfen.
