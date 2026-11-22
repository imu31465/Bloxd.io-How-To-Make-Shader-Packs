# Nacht-Looks gestalten

> Ziel-API: 5 · Ziel-Build: `bbb6l5` (2026-11-20, Produktion und Preprod) · Status: Verified (auf die aktuelle API portiert — Prüfung auf dem Gerät empfohlen)

Werden nur die Schatten abgedunkelt, bleibt die vom Renderer ausgegebene Endfarbe (`engineColour`) auch ohne Sonne hell. Dadurch wirkt der Kontrast zwischen beleuchteten Flächen und Schatten unnatürlich. Stattdessen sollte die gesamte Endfarbe abgeschwächt werden.

Das Beispiel wertet einen Nullvektor von `bloxdSunDirection()` als Nacht und einen Vektor ungleich null als Tag. Während der Nacht wird die Endfarbe des Terrains abgeschwächt. Sind `blockLight` oder `heldLight` stark, fällt die Abdunklung geringer aus, damit nahe Lichtquellen wie Fackeln sichtbar bleiben. Der Wert `0.52` lässt sich anpassen: Für dunklere Nächte kann er weiter gesenkt werden.

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

**Grenzen dieser Methode:** Gibt `bloxdSunDirection()` bei vorhandener Sonne einen Einheitsvektor und andernfalls null zurück, lassen sich Tag und Nacht unterscheiden, nicht aber Dämmerungsphasen weich abschätzen. Da die Endfarbe abgeschwächt wird, werden zugleich das Tageslicht und das Umgebungslicht der Engine reduziert. Der vollständige Tagesverlauf wird damit nicht nachgebildet. Für Flüssigkeiten muss das Fallback-Verhalten der Liquid-Hooks geprüft werden.
