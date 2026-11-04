# Fog-Interna

> Ziel-API: 5 · Ziel-Build: `xkg8x` (2026-11-04, Produktion) · Status: Analyzed (Analyse des Produktions-Bundles auf JavaScript-Ebene)

Die Fog-Berechnung ist immer LINEAR-Modus (äquivalent zu `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), mit `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = Fog-Einstellung; nur D = 0 ist speziell mit fogEnd = 5). **Das Gradientenband ist nur 32 Blöcke breit**, und `l.fogAlpha` ist weniger „Distanzdunst" als **normierte Distanz zur Kante der geladenen Welt**. Es variiert pro Spieler mit der Ladedistanz: Distanz-Effekte sollten daher `distance(l.position, bloxdEyePosition())` selbst berechnen (Abschnitt „Ladekanten-Band" unten). (Die Fog-Funktion des Renderers implementiert tatsächlich **vier** Modi — aus / exponentiell / exponentiell-quadratisch / linear —, wobei ausgelieferte Titel den linearen Modus fahren; der restaurierte Quellcode und das Robustheitsargument stehen im [v3-Migrationsleitfaden](../history/v3.md).)

Standard-Fog-Farbe `rgb(183, 191, 195)` (blasses Blaugrau). Welt-Ersteller ändern sie via `fogColourOverride` (hex). Bei Fog-Modus 0 (NONE) **kommt fogColour schwarz an**. Die Standardform `bloxdApplyFog(col, l)` ist sicher, da die Fog-Farbe bei fogAlpha 0 ungenutzt bleibt. Die Script-API hat zwei weitere Optionen, `fogChunkDistanceOverride` und `fogOnSkybox`: Custom Games können die Fog-Distanz (den D-Wert) und die Fog-Anwendung auf die Skybox unabhängig setzen. Standardmäßig ist die Skybox nicht vom Fog betroffen (nur in Spielen mit aktivem `fogOnSkybox` wird auch die Skybox mit der Fog-Farbe getönt).

`showFog` auf false zu setzen schiebt Fog auf 3200–3232 Blöcke und deaktiviert faktisch (`fogAlpha ≈ 0` kommt weiterhin zurück).

## Ladekanten-Band — fogAlpha als „Weltkante"

Kühlt leise nur das 32-Block-Band der Ladekante, um das Weltende zu kaschieren (oder als Effekt zu betonen). Ohne selbst berechnete Distanz: folgt automatisch den Ladedistanz-Einstellungen des Spielers.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogAlpha: 0 = innen (Spielraum zur Kante), 1 = kurz vorm Kantenaustritt
    let edge = l.fogAlpha;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```
