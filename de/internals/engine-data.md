# Engine-Daten-Hauptbuch

> Ziel-API: 5 · Ziel-Build: `bbb6l5` (am 2026-11-20 in Produktion und Preprod verifiziert) · Status: Verified

Dieses Hauptbuch fasst die bestätigten Werte der für Shader-Packs sichtbaren API im aktuellen Build zusammen. Interne Bundle-Details wie Modul-IDs und Chunk-Nummern gehören nicht zur Spezifikation und werden hier nicht aufgeführt.

## Aktuelle Spezifikation

| Element | Wert |
|---|---|
| `apiVersion` | `5` (strikter Zahlenvergleich) |
| Engine-Header | 216 Zeilen; Volltext im [Engine-Header](engine-header.md) |
| Hooks | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| Varianten | 6 (strict × terrain / liquid / model) |
| Makros | `BLOXD_STRICT`, `BLOXD_ALPHA`, `BLOXD_SCENE_DEPTH`; `BLOXD_LIGHTING` wurde in v5 entfernt |
| Pack-Uniform | 80 Byte: `seconds` @0, `lit` @4, `renderOffset` @16, `sunDirection` @32, `eyePosition` @48, `shadowDirection` @64 |
| Pack-Binding | `@group(3) @binding(0)`; `minBindingSize` 80 |
| Flags | `BloxdFlags`-Struktur mit 14 booleschen Feldern |
| Texturatlas | 1.650 Layer; 1.017 Namen; 776 Aliasse |
| Texturfamilien | 64 Rotations- und 71 Animationsfamilien |
| Reservierte Bezeichner | Namen passend zu `/^bloxd/i` sowie 88 interne `bloxdSp*`-Symbole |
| Spieleddefinitionen | 119 |
| Shader-Pack-Richtlinie | 12 erlaubte Titel, 28 Einträge; siehe [Richtlinie pro Spiel](policy.md) |
| Standard-Packvorlage | 1.633 Byte |
| Loader-Limits | 256 WGSL-Dateien / 256 KB Quelltext / 64 KB für `pack.json` / 32-MB-ZIP / 1.024 Einträge |

## Änderungen in bbb6l5

`bbb6l5` behält `apiVersion: 5` bei, erweitert aber die für Packs sichtbare API:

- `bloxdShadow()`, `bloxdAirShadow(t)` und `bloxdShadowDirection()` machen das von der Engine berechnete Sonnen- und Mondschatten-System verfügbar.
- Das Uniform erhält `shadowDirection: vec3f` bei Offset 64 und wächst von 64 auf 80 Byte.
- `pack.json` akzeptiert das optionale boolesche Feld `keepCircleShadows`, um die bisherigen Kreisschatten beizubehalten.
- Der Atlas wächst von 1.227 auf 1.650 Layer und von 906 auf 1.017 verfügbare Namen.
- Die in `v98qt8` eingeführte Faltungs-Regression der Texturkonstanten wurde behoben.

Erläuterungen und Belege zu diesen Messungen stehen im [Forschungslog](research-log.md) und in den [Textur-Registry-Interna](texture-registry.md).

## Frühere Versionen

- [Versionsgeschichte](../history/) — Änderungen und Migrationen früherer APIs
- [Forschungslog](research-log.md) — Messmethode und Quellen der Messwerte

## Verwandte Seiten

- [Engine-Header](engine-header.md) — vollständiger Headertext
- [Richtlinie pro Spiel](policy.md) — Titel mit allow- / strict-Richtlinie
- [Textur-Registry](texture-registry.md) — Namen und ID-Zuordnung
