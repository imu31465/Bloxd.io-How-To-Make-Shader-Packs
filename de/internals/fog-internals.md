# Fog-Interna



Die Fog-Berechnung ist immer LINEAR-Modus (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), mit `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = Fog-Einstellung; nur D = 0 ist speziell mit fogEnd = 5). **Das Gradientenband ist nur 32 Blöcke breit**, und `(1.0 - l.fogAlpha)` ist weniger „Distanzdunst" als **normierte Distanz zur Kante der geladenen Welt**. Variiert pro Spieler mit Ladedistanz: Distanz-Effekte sollten `distance(l.position, bloxdEyePosition())` selbst berechnen (Rezept R-B). (v3-Hinweis: Die Fog-Funktion des Renderers implementiert tatsächlich **vier** Modi — aus / exponentiell / exponentiell zum Quadrat / linear —, wobei ausgelieferte Titel den linearen Modus fahren; der restaurierte Quellcode und das Robustheitsargument stehen in [Teil IX](../history/v3.md) §50.)

Standard-Fog-Farbe `rgb(183, 191, 195)` (blasses Blaugrau). Welt-Ersteller ändern sie via `fogColourOverride` (hex). Bei Fog-Modus 0 (NONE) **kommt fogColour schwarz an**. Die Standardform `mix(l.fogColour, col, (1.0 - l.fogAlpha))` ist sicher, da Fog-Farbe bei fogVisibility 1 ungenutzt bleibt. Die Script-API hat zwei weitere Optionen, `fogChunkDistanceOverride` und `fogOnSkybox`: Custom Games können die Fog-Distanz (den D-Wert) und die Fog-Anwendung auf die Skybox unabhängig setzen. Standardmäßig ist die Skybox nicht vom Fog betroffen (nur in Spielen mit aktivem `fogOnSkybox` wird auch die Skybox mit der Fog-Farbe getönt).

`showFog` auf false zu setzen schiebt Fog auf 3200–3232 Blöcke und deaktiviert faktisch (`fogVisibility ≈ 1` kommt weiter).

## R-B. Ladekanten-Band — fogVisibility als „Weltkante"

Kühlt leise nur das 32-Block-Band der Ladekante, um das Weltende zu kaschieren (oder als Effekt zu betonen). Ohne selbst berechnete Distanz: folgt automatisch den Ladedistanz-Einstellungen des Spielers.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = innen (Spielraum zur Kante), 0 = kurz vorm Kantenaustritt
    let edge = 1.0 - (1.0 - l.fogAlpha);
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```
