# Wie das Lighting funktioniert

> Ziel-API: 5 · Ziel-Build: `bny9u` (2026-11-05, Produktion) · Status: Verified (auf die aktuelle API portiert — Prüfung auf dem Gerät empfohlen)

Das Engine-Standardlicht ist „nur Multiplikation" — kein Specular, Fresnel, Warm-Kalt-Trennung oder Hemisphären-Ambiente existiert. Folgendes lässt sich neu aufbauen:

| Feature | Standard | In Paketen baubar? |
|---|---|---|
| Diffus (Lambert) | Nur skalare Richtlicht-Summe | ◎ Eigen mit `bloxdSunDirection()` (Wrap-Quellen etc.) |
| Specular | Keins | ◎ Blinn-Phong (R9.2) |
| Fresnel | Keins | ◎ Schlick-Näherung (R9.3) |
| Warme Fackel / kaltes Himmelslicht-Trennung | Farblos | ◎ (R9.1) |
| Hemisphären-Ambiente | Richtungslos | ◎ Himmel oben / Boden unten (R9.4) |
| Tonemapping | Keins (nur clamp) | ◎ ACES-Filmic (R9.5) |
| Luftperspektive | Nur Fog (Farbtausch) | ◎ Distanz-Entsättigung (R9.6) |
| Oberflächendetail | Nur Texturauflösung | △ Prozedurales Hash-Mikro-Bump (R9.8) |
| Vertex-Wellen (Wasser) | Keine (flach) | ◎ Nur allow (R7) |
| Wellennormalen / Sonnenglitzer | Keine | ◎ (R9.7) |
| Nachtmondlicht | Himmelsfarbe dunkelt nur ab | △ Kein Mondrichtungs-Input, also nur Pseudo-Looks (blaues Ambiente in R2 / Entsättigung in R9.11) |
| Schatten (Himmelsverdeckung) | Nur sanftes Mischen via `mix(Ambiente, Himmel, skyLight)` | ◎ Lift-Inversion + Schwellenwert-Schnitt + Sonnen-Gate (R9.12). Baumschatten und Dachschatten fallen klar und folgen Block-Edits in Echtzeit |
