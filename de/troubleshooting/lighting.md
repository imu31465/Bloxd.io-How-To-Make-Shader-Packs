# Beleuchtungsprobleme

> Ziel-API: 5 · Status: Verified

Helligkeits-, Schatten- und Fog-Probleme.

## Höhlen zu hell

- **Ursache**: unzureichende Nichtlinearität auf `skyLight`
- **Fix**: die Höhlen-Abdunkel-Rezepte in [Lichtrezepten](../recipes/lighting.md) und [Realismusrezepten](../recipes/realism.md)

## Beleuchtete Flächen nachts zu hell

- **Ursache**: nur die Schattenfarben wurden abgedunkelt — die fertige Farbe behält ihre Tageshelligkeit
- **Fix**: die ganze fertige Farbe nachts dämpfen und nur lokales Licht (`blockLight` / `heldLight`) entspannen — [der Nacht-Leitfaden](../guides/night.md)

## Nacht zu dunkel

- **Fix**: ein Mindest-Ambiente garantieren; bei null `bloxdSunDirection()` ist die wahre Mondrichtung unbekannt, also pseudo-blaues Ambiente benutzen ([das Nacht-Rezept](../recipes/lighting.md)). Die Mondrichtung selbst ist `-bloxdSunDirection()` (nur Welten mit Tag/Nacht-Zyklus)

## Tag brennt aus

- **Fix**: die Belichtung vor ACES senken ([ACES](../recipes/realism.md))

## Fackelumgebung gesättigt orange

- **Fix**: die Warm-Mischratio senken ([warme Fackel × kühler Himmel](../recipes/realism.md))

## Das Weltlicht der Engine exakt behalten wollen

- **v5-Lösung**: `bloxdWorldLight(light)` aufrufen — identische Mathematik wie das „hellstes aus Block/Himmel/Hand, von ambientLightColour abgefloort“ der Engine ([Beleuchtung](../api/lighting.md#bloxdworldlight--das-licht-der-welt))
- **Hinweis**: `blockLight` / `heldLight` sind 0 und himmelsbezogene Felder sind 1, wenn `!bloxdLit()` (Header-Garantie)

## Sieht falsch aus in Spielen mit deaktivierter Beleuchtung

- **Ursache**: beleuchtungsexklusive Eingaben (`blockLight` etc.) ungeschützt benutzt. v5 hat kein `#ifdef BLOXD_LIGHTING` — auf **Laufzeit-`bloxdLit()`** verzweigen
- **Fix**: früh zurückgeben mit `if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }` ([Beleuchtung](../api/lighting.md#bloxdlit--das-gate))

## „LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk"

- **Ursache**: dichte Leuchtblock-Regionen überlaufen die Licht-Seed-Queue, und die Lichtberechnung des Chunks wird abgeschnitten. **Nicht paket-verursacht**, aber Lichtlücken nahe glühender Cluster gehen darauf zurück
- **Fix**: Lichtquellen in der Welt verteilen

## Die Theorie dahinter?

- Schatten: [Schatten](../guides/shadows.md) (skyLight = Voxel-Shadow-Map)
- Fog: [Engine-Interna: Fog-Interna](../internals/fog-internals.md)

## Verwandte Seiten

- [Beleuchtung](../api/lighting.md) · [Visuelle Probleme](visual.md) · [Beleuchtungs-Interna](../internals/lighting-internals.md)
