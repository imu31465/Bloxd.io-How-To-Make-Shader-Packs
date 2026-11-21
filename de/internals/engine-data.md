# Engine-Daten

> Ziel-API: 5 · Zweck: Spezifikationsübersicht

Diese Seite fasst die für Shader-Packs verfügbare API und die beim Erstellen eines Packs wichtigen Grenzen zusammen. Definitionen und Beispiele stehen in den jeweiligen Referenzen.

## API-Überblick

| Element | Spezifikation |
|---|---|
| API-Version | `5` |
| Hooks | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| Varianten | 6 (allow / strict × terrain / liquid / model) |
| Makros | `BLOXD_STRICT`, `BLOXD_ALPHA` und `BLOXD_SCENE_DEPTH`. `BLOXD_LIGHTING` ist nicht verfügbar |
| Pack-Uniform | 80 Byte. Feld-Offsets stehen im [Pack-Format](../api/pack-format.md) |
| Texturen | Benannte Konstanten im Format `bloxdTextureId<Name>` verwenden. Numerische IDs niemals fest eintragen |
| Reservierte Namen | Bezeichner mit dem Präfix `bloxd` sind für die Engine reserviert |

## Pack-Grenzen

| Element | Grenze |
|---|---:|
| WGSL-Dateien | 256 |
| WGSL-Quelltext insgesamt | 256 KB |
| `pack.json` | 64 KB |
| ZIP-Archiv | 32 MB |
| ZIP-Einträge | 1.024 |

Lege genau ein Manifest im ZIP-Stammverzeichnis ab und speichere Dateien als UTF-8. Doppelte Pfade und nicht unterstützte ZIP-Formate werden nicht akzeptiert. Einzelheiten stehen im [Pack-Format](../api/pack-format.md).

## Wichtige Funktionen der API v5

- `bloxdShadow()` und `bloxdAirShadow(t)` stellen Schatteninformationen von Sonnen- und Mondlicht bereit.
- `bloxdShadowDirection()` liefert die Richtung des schattenwerfenden Lichts.
- Setze das optionale Feld `keepCircleShadows` in `pack.json` auf `true`, um trotz Verwendung der Schatten-API die traditionellen runden Schatten beizubehalten.
- Prüfe die Beleuchtung zur Laufzeit mit `bloxdLit()`; das Makro `BLOXD_LIGHTING` wird nicht unterstützt.

## Verwandte Seiten

- [API-Referenz](../api/) — Funktionen, Strukturen und Konstanten
- [Pack-Format](../api/pack-format.md) — Manifest, Uniform und Loader-Grenzen
- [Texturkatalog](../api/texture-catalog.md) — verfügbare Textur-Namen
- [Richtlinien je Spiel](policy.md) — allow / strict
- [API-v4-Migrationsleitfaden](../history/v4.md) — Migration von der vorherigen Version
