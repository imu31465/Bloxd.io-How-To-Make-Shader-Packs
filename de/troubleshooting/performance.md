# Performance

> Ziel-API: 5 · Status: Verified

Geschwindigkeitsprobleme und ihre Fixes.

## Die Geräte-Prüfung endet nie und wirft das Paket raus

- **Ursache**: die Prüfung hat einen **erzwungenen 60-Sekunden-Timeout** (Übermaß wird als `skipped` behandelt) — üblich auf schwachen Geräten und schweren Welten
- **Fix**: schwere Vertex-Arbeit und komplexe Schleifen reduzieren, dann erneut versuchen
- **Vorbeugen**: dem [Performance-Leitfaden](../guides/performance.md) folgen

## Framerate bricht ein

- **Prüfen**: FPS mit und ohne Paket vergleichen; Terrain-lastige Szenen und Wasser getrennt messen
- **Typische Ursachen**: schwere Effekte bedingungslos auf jeder Fläche (keine Flag-/Distanz-Auswahl); hochfrequente Hash-Noise; große `pow`-Exponenten
- **Fixes** ([der Leitfaden](../guides/performance.md)):
  - Effekte per `flags` auf die Flächen gaten, die sie brauchen
  - nach Distanz früh aussteigen (`distance(surface.position, bloxdEyePosition())`)
  - ein Mip höher sampeln für billigere `bloxdTexel`-Lesezugriffe
- **Vorbeugen**: Detail schrittweise dazugeben und FPS vergleichen ([Testen](../guides/testing.md))

## Nur auf Mobil langsam

- **Ursache**: Pakete laufen auf dem WebGPU-Renderer; Mobil-GPUs können Zehnerpotenzen langsamer sein als Desktops
- **Fix**: Effektstärke/-frequenz reduzieren, Distanz-Culling verstärken — oder Mobil klar als nicht unterstützt markieren ([Voraussetzungen](../getting-started/requirements.md))

## Dem 256-KB-Paketlimit entgegen

- **Fix**: Kommentare trimmen, geteilten Code in Funktionen auslagern, unbenutzte Rezepte wegwerfen ([Pack-Struktur](../getting-started/pack-structure.md))

## Verwandte Seiten

- [Performance-Leitfaden](../guides/performance.md) · [Testen](../guides/testing.md)
