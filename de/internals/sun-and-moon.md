# Sonne und Mond

> Ziel-API: 5 · Typ: technische Referenz

Die `bloxdSunDirection()`-Quelle ist ein Sonnenrichtungs-Buffer, der nur bei Skybox-Typwechsel neu geschrieben wird — Kriterium ist nicht „ob der Himmel eine Sonne hat", sondern **„ob die Skybox vom Erdtyp ist"**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (prozeduraler Himmel) | Nicht null (Defaults unten) |
| `gloomy` / `interstellar` / `space_*` (Cube-Texturen) | **Immer (0,0,0)** |

**Der Mond ist immer `-bloxdSunDirection()`** (die Engine berechnet die Mondposition als exaktes Gegenteil der Sonne). Nacht wird per Sonnenhöhe beurteilt — Mond oben bei `bloxdSunDirection().y < 0` (Sonne unterm Horizont). In Standardwelten ist die Sonne aber statisch, der Mond also auch — nur Welten mit Tag/Nacht-Zyklus sehen ihn wandern.

Die Sonnenrichtung in Standardwelten beträgt etwa `(-0.56, 0.81, -0.18)` (ein statischer Einheitsvektor aus `inclination` = −0.2 und `azimuth` = 0.55). Der Wert hilft dabei, beim Testen von Shader-Packs die Richtung von Glanzlichtern abzuschätzen.

Tag/Nacht-Zyklen sind nicht in die Engine eingebaut — inclination ist eine statische Zahl, die Welten mit einem dynamischen Tag-Nacht-Zyklus aktualisieren den Wert spielseitig. `bloxdSunDirection()` folgt jeder Aktualisierung.

gerichteten Terrain-Lichter sind nur 2 Lampen beim Szenenstart, mit **fixer Richtung und Intensität, ohne Tag/Nacht-Wechsel**. Kurz: **Kein Terrain-Helligkeitsfaktor hängt von der Zeit ab. Tag/Nacht-„Looks" kommen nur aus Skybox und bloxdSunDirection()**, also müssen nachts abdunkelnde Pakete die Zeitspanne selbst aus bloxdSunDirection() schätzen (die `sunPresent`-Technik aus [Nacht-Looks gestalten](../guides/night.md)).

## R-A. Mondlicht

Addiert bläulich-weißes Lambert und schwaches Specular nur solange der Mond oben ist. `moonUp` ist in statischen Standardwelten 0: dort passiert nichts — **Mondlicht, das nur in Welten mit Tag/Nacht-Zyklus feuert, also sicher**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // der Mond ist immer exakt gegenüber der Sonne; Tages-Auto-Off via moonDir.y < 0
        let moonDir = -bloxdSunDirection();
        let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
        if (moonUp > 0.0) {
            let n     = normalize(l.normal);
            let diff  = max(0.0, dot(n, moonDir));
            let view  = normalize(bloxdEyePosition() - l.position);
            let halfV = normalize(moonDir + view);
            let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
            out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
        }
    }
    return out;
}
```
