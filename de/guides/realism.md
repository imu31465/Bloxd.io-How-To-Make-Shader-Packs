# Realismus: zwei Schulen

> Ziel-API: 5 · Ziel-Build: `bny9u` (2026-11-05, Produktion) · Status: Verified (auf die aktuelle API portiert — Prüfung auf dem Gerät empfohlen)

**Schule A: additive Fixes (ab defaultLight)** — `engineColour` (fertige Farbe) als Basis nutzen und warmen Glow oder Rim addieren. Leicht und sicher, aber das Lichtmodell bleibt Standard.

**Schule B: totales Relighting (ab s.colour)** — `l.engineColour` verwerfen und Licht aus `s.colour` (Albedo) und rohen LightIn-Materialien neu aufbauen. Der Königsweg zum Realismus. Vier Regeln:

1. **Fog neu anwenden**: Der Light-Hook läuft post-Fog; `mix(l.fogColour, col, (1.0 - l.fogAlpha))` selbst anwenden (R9.10). Bei dichtem Fog mit `min(l.fogAlpha, 0.70)` einen Floor legen. Umgekehrt: mehr Fog-Farbe in engineColour-basierte Pakete zu mischen ergibt weißen Doppel-Fog
2. **Unlit-Fallback**: außerhalb `#ifdef BLOXD_LIGHTING` an `defaultLight` durchreichen
3. **Gemeinsame Funktionen als Ganzes schützen**: gemeinsame Funktionen mit `BloxdLightIn`-Parameter als ganze fn in `#ifdef BLOXD_LIGHTING` packen (nur Aufrufstellen reicht nicht)
4. **Ohne Sonnenrichtung**: Ist `bloxdSunDirection()` null, kein gerichtetes Specular berechnen. `l.directional` ist ein Lichtmengen-Skalar, kein Richtungsvektor: stellt die Highlight-Richtung nicht wieder her. Bei Bedarf auf schwaches richtungsloses Ambiente wechseln. Die Mondrichtung ist via `-bloxdSunDirection()` verfügbar (bewegt sich nur in Welten mit Tag/Nacht-Zyklus — [Sonne und Mond](../internals/sun-and-moon.md))
