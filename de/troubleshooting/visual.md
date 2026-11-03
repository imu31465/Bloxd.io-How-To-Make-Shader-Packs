# Visuelle Probleme

> Ziel-API: 5 · Status: Verified

Kompiliert einwandfrei, sieht aber falsch aus.

## Ferne wird weiß/dunstig

- **Ursache**: Doppel-Fog. Der Standard-Light-Hook-Output ist **bereits verfogt** (`bloxdApplyFog(lit + emission, light)`), weitere Fog-Farbe obendrauf zu mischen verdoppelt ihn
- **Fix**: eigenen Fog subtil halten; eine nur entsättigende Luftperspektive erwägen ([Realismusrezepte](../recipes/realism.md))
- **Vorbeugen**: die `fogAlpha`-Semantik verstehen (0 = kein Fog, 1 = nur fogColour) und die [Pipeline](../api/lighting.md#die-komplette-pipeline), bevor Fog geschrieben wird

## pow(l.skyLight, γ) dunkelt Schatten nie ab

- **Ursache**: `skyLight` kommt nach der Lift-Kurve an (Rohwert 0.87 kommt als 0.97 an); Gamma kann mathematisch nicht mithalten
- **Fix**: auf Lift-Inversion + Schwelle wechseln ([Schatten](../guides/shadows.md))

## Blöcke werden fast rein weiß

- **Ursache**: der Light-Hook-Output übersteigt 1.0 (hinter der Ausgabe existiert kein Clamp)
- **Fix**: `clamp(col, vec3f(0.0), vec3f(1.0))` anhängen

## Weiß ohne Additionen

- **Ursache**: Un-Fog-Inversion per Division
- **Fix**: das Un-Fog rauswerfen; ab `s.colour` neu aufbauen und Fog exakt einmal am Ende anwenden (oder per `bloxdApplyFog`)

## Glühende Blöcke glühen nicht (Rebuild-Pakete)

- **Ursache**: fehlende Emissions-Re-Addition — den Standard-Output fallen zu lassen bedeutet, die Emission selbst zu addieren
- **Fix**: `+ s.emission * (1.0 - l.fogAlpha)` dazugeben; auf v5 ist die Komposition `bloxdLitColour()` + Emission + `bloxdApplyFog` am sichersten ([Beleuchtung](../api/lighting.md))

## Wellen/Muster brechen an Chunk- oder Ursprungswechseln ab

- **Ursache**: Render-Space-Positionen direkt benutzt — der Ursprung wandert mit dem Spieler
- **Fix**: für weltabhängige Effekte `bloxdWorldPosition(position)` benutzen ([Koordinaten](../recipes/coordinates.md)); die f32-Präzisionsgrenzen weit vom Ursprung beachten

## Wasser-Oberflächenmuster stehen auf gedrehten Flächen schief

- **Ursache**: `bloxdTexel` wendet das eigene `textureRotation` des Fragments auf deine uv an ([die Rotations-Subtilität](../api/texture-api.md#die-rotations-subtilität--ein-neutraler-sampler))
- **Fix**: mit dem `texelNeutral`-Helfer vor-drehen

## Enchant-Glint / Schadens-Blitz verschwunden

- **Ursache**: eigene Beleuchtung gebaut, ohne `enchantColour` / `overlayColour` durchzureichen
- **Fix**: sie durchreichen oder `bloxdLitColour()` benutzen ([Enchant-Effekte](../recipes/enchant-effects.md))
- **v5**: `bloxdDefaultSurface` leitet beide unverändert durch, daher verlieren die Defaults sie nie

## Himmel, Wolken oder die Sonnenscheibe unbeeinflusst

- **Absicht**: Hooks decken nur Terrain / Liquid / Model ab ([Unerreichbare Effekte](../guides/constraints.md))

## Verwandte Seiten

- [Beleuchtungsprobleme](lighting.md) · [Debugging-Tipps](../guides/debugging.md) · [Fog-Interna](../internals/fog-internals.md)
