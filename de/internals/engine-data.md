# Engine-Datenübersicht

> Ziel-API: 5 · Status: Analyzed

Diese Seite fasst die Shader-Packs zur Verfügung stehende API zusammen. Einzelheiten zur Verwendung stehen in der [API-Referenz](../api/).

## API-Umfang

| Element | Spezifikation |
|---|---|
| API-Version | `5` |
| Engine-Header | 216 Zeilen; siehe [Engine-Header](engine-header.md) |
| Hooks | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| Varianten | 6 (strict × terrain / liquid / model) |
| Makros | `BLOXD_STRICT`, `BLOXD_ALPHA`, `BLOXD_SCENE_DEPTH` |
| Pack-Uniform | 80 Byte; siehe [Packformat](../api/pack-format.md) |
| Uniform-Felder | `seconds` @0, `lit` @4, `renderOffset` @16, `sunDirection` @32, `eyePosition` @48, `shadowDirection` @64 |
| Textur-Namen | Nutzbare benannte Konstanten stehen im [Texturkatalog](../api/texture-catalog.md) |

## Schatten-API

- `bloxdShadow()` gibt den von der Engine berechneten Sonnen-/Mondschattenfaktor zurück.
- `bloxdAirShadow(t)` wertet den Schatten an einem Punkt zwischen Kamera und Fragment aus.
- `bloxdShadowDirection()` gibt die Richtung des schattenwerfenden Lichts zurück.
- `keepCircleShadows` ist ein optionales `pack.json`-Feld, mit dem die bisherigen Kreisschatten erhalten bleiben.

## Verwandte Seiten

- [API-Referenz](../api/) — APIs für Shader-Packs
- [Packformat](../api/pack-format.md) — Manifest, Uniform und Loader-Limits
- [Richtlinien pro Spiel](policy.md) — Einschränkungen einzelner Spiele
