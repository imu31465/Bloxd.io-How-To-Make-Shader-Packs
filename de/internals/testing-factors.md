# Was paket-sichtbare Werte verändert

> Ziel-API: 5 · Ziel-Build: `ab90qa` (2026-11-03, Produktion) · Status: Analyzed (Analyse des Produktions-Bundles auf JavaScript-Ebene)

Dasselbe Paket rendert je nach **Welt und Spieler-Einstellungen** anders. Vor Verteilung mindestens diese 3 Umgebungen prüfen:

1. **Normalwelt** (Default-Skybox, keine Overrides) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, Standardfarben
2. **Space-Skybox-Welt** — bloxdSunDirection() = 0. Der `sunPresent`-Zweig-Look
3. **Custom-Welt mit `visionMinLightColour` / `skyLightColourOverride`** — gehobene Dunkelheiten und Farben

Haupt-Varianzquellen: `lightingOverride` (Zwangslicht) / `skyLightColourOverride`, `ambientLightColourOverride` (Hex-Tausch) / `visionMinLightColour` („dunkelste sichtbare Farbe". Als Komponenten-Maximum gegen sowohl `uSkyLightColour` als auch `uAmbientLightColour` implementiert; Night Vision nutzt es — „stockdunkle Höhlen"-Pakete werden nicht so dunkel wie gedacht, und die Himmelsfarbe selbst wird angehoben) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (bloxdSunDirection()-Präsenz). `uSkyLightColour`-Standard = (1,1,1) weiß, `uAmbientLightColour`-Standard = (0.25,0.25,0.30). `l.ambient`-Szenenseite = Grafik-Einstellung „Ambient Lighting Intensity" (Standard 0.5). `(1.0 - l.fogAlpha)` folgt Spieler-Fog/Chunk-Distanz-Einstellungen. Auch `cameraTint` (RGBA-Tönung über den ganzen Bildschirm) und `proximityFadeDistance` / `proximityFadeMinOpacity` (Kamera-Nähe-Fade für Entities) sind Welt-Einstellungs-Varianzfaktoren — `cameraTint` ist insbesondere ein Final-Pass, der **über** die Paket-Ausgabe komponiert wird. Vieles davon lässt sich auch per Script-API (`serverOption`) setzen und während des Spiels aktualisieren.
