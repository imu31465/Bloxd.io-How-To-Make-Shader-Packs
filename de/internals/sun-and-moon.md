# Sonne und Mond

> Ziel-API: 5 · Typ: technische Referenz

`bloxdSunDirection()` liest einen Puffer mit der Sonnenrichtung, der nur bei einem Wechsel des Skybox-Typs aktualisiert wird. Entscheidend ist nicht, ob am Himmel eine Sonne zu sehen ist, sondern **ob die Skybox vom Typ `earth` ist**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (prozeduraler Himmel) | Nicht null (Defaults unten) |
| `gloomy` / `interstellar` / `space_*` (Cube-Texturen) | **Immer (0,0,0)** |

**Der Mond ist immer `-bloxdSunDirection()`** (die Engine berechnet die Mondposition als exaktes Gegenteil der Sonne). Nacht wird per Sonnenhöhe beurteilt — Mond oben bei `bloxdSunDirection().y < 0` (Sonne unterm Horizont). In Standardwelten ist die Sonne aber statisch, der Mond also auch — nur Welten mit Tag/Nacht-Zyklus sehen ihn wandern.

Die Sonnenrichtung in Standardwelten beträgt etwa `(-0.56, 0.81, -0.18)` (ein statischer Einheitsvektor aus `inclination` = −0.2 und `azimuth` = 0.55). Der Wert hilft dabei, beim Testen von Shader-Packs die Richtung von Glanzlichtern abzuschätzen.

Ein Tag-Nacht-Zyklus ist nicht in die Engine eingebaut. `inclination` ist ein statischer Wert; Welten mit einem dynamischen Tag-Nacht-Zyklus aktualisieren ihn in ihrer Spiellogik. `bloxdSunDirection()` übernimmt jede Aktualisierung.

Die gerichtete Beleuchtung des Terrains besteht aus nur zwei Lichtquellen, die beim Start der Szene erzeugt werden. **Richtung und Intensität bleiben tagsüber und nachts unverändert.** Die Helligkeit des Terrains hängt also nicht von der Tageszeit ab; der Tag-Nacht-Eindruck entsteht allein durch die Skybox und `bloxdSunDirection()`. Shader-Packs, die das Terrain nachts abdunkeln, müssen die Tageszeit daher selbst anhand von `bloxdSunDirection()` abschätzen, etwa mit der `sunPresent`-Technik aus [Nacht-Looks gestalten](../guides/night.md).

## R-A. Mondlicht

Fügt ein bläulich-weißes Lambert-Licht und einen schwachen Glanzpunkt hinzu, solange der Mond über dem Horizont steht. In Standardwelten mit unbeweglicher Sonne ist `moonUp` gleich 0; dort tritt kein Effekt auf. **Der Mondlichteffekt ist daher nur in Welten mit einem Tag-Nacht-Zyklus aktiv.**

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
