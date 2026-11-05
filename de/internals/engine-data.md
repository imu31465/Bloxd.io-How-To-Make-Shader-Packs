# Engine-Daten-Hauptbuch

> Ziel-API: 5 · Ziel-Build: `bny9u` (2026-11-05; Produktion und Preprod liefern dasselbe byte-identische Bundle) · Status: Verified

Das Mess-Hauptbuch der Dokumentation — jeder bestätigte Wert, alles am aktuellen Ziel-Build `bny9u` gemessen.

## Das Hauptbuch

| Posten | Wert |
|---|---|
| `apiVersion` | `5` (strikt `===`, Zahl) |
| Engine-Header | 8.954 B dekodiert / 208 Zeilen (9.125 B wie ausgeliefert, 6 Interpolationen). Erste Zeile `// The Bloxd shader pack API, apiVersion 5. Read-only, prepended to all packs.` — Volltext im [Engine-Header](engine-header.md) |
| Hooks | 9 (terrain/liquid/model × vertex/surface/light). Namen unverändert; die Standard-Vorlage bündelt alle 9 |
| Varianten | 6 (strict × Programm). Namen `strict\|allow.terrain\|liquid\|model` — die Beleuchtungs-Achse ist weg |
| Makros | `BLOXD_STRICT` (strict) · `BLOXD_ALPHA` (alle Liquid + nicht-strict Terrain/Model) · `BLOXD_SCENE_DEPTH` (alle Liquid) · ~~`BLOXD_LIGHTING`~~ **entfernt** |
| Paket-Uniform | `@group(3) @binding(0)`, 64 B: seconds@0, **lit@4 (u32, neu)**, renderOffset@16, sunDirection@32, eyePosition@48 |
| Paket-Bindings | Gruppe 3: 0 Uniform · 1 Szenentiefe (Liquid) · 2 `bloxdSpTextureLayers`-Storage |
| Flags | die `BloxdFlags`-Struktur, 14 Bools; die Bitwerte von v4 sind ausgemustert |
| Loader-Limits | 256 `.wgsl` / 256 KB Quelltext / 64 KB `pack.json` / 32 MB Zip / 1.024 Einträge; UTF-8; ein Manifest; eindeutige Pfade — alles unverändert |
| Textur-Registry | 1.210 Einträge → **896 benutzbare Namen**; Drift gegenüber cnty9 +1/−10 ([Textur-Registry](texture-registry.md)) → `xkg8x` (2026-11-04): 1.220 / **906** → `bny9u` (2026-11-05): 1.232 / **911 benutzbare Namen** — +5 (Trading Terminal ×3, Stone Generator ×2), 864 id-Änderungen |
| Lichtkurve | Stufen 0–15 → 0–1, ease-out (`6 → 0.45`, `12 → 0.92`) — im Header, unverändert |
| Lift-Kurve | `1 - (1 - x / (3 - 2x))^3` — unverändert (aktuell Chunk c9) |
| Richtlicht-Kegel | `0.12 / 0.65 / 0.62 / 0.95` — unverändert (Chunk c9) |
| Fog-Farbe | `vec3f(183/255, 191/255, 195/255)` — unverändert |
| reservierte Namen | `/^bloxd/i` (case-insensitive) + die 46 `bloxdSp*`-Engine-Symbole ([Reservierte Bezeichner](reserved-identifiers.md)) |
| HEADER_VERSION | `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` |
| strict-Titel | alles außer den 12 allow-Titeln in [Policy](policy.md) (auf bny9u neu aufgezählt: 115 Spieldefinitionen, 28 allow-Einträge — dieselben 12 Titel) |
| Header-/Registry-Builder | Header-Modul 29815 in Chunk c56 (umnummeriert von c55); auf `bny9u` ist der Registry-Builder Modul 29812 (Chunks c52/c53/c54, Datenmodul 1351; auf `xkg8x` war es 30093 + 1391) |
| Standard-Pack-Vorlage | Chunk c122 (c116 auf `xkg8x`, c124 in v4), 1.633 B |

## Bundle-Layout (für Nachvermesser)

Der Shader-Pipeline-Cluster: Loader (Zip/Manifest/Limits, Modul 32942) und Registry-Builder c52–c54, Validator/Header c56, WebGPU/Codegen c57, Fog c9. **Die Standard-Pack-Vorlage ist c122** (c116 auf `xkg8x`, c124 in v4).

Chunk-Format-Hinweis: jeder Chunk ist ein ES-Modul (`export const modules = {...}`) — c53 trägt sowohl c52s als auch c53s Module — daher bleibt die Klartext-Suche im Bundle aussagekräftig (Modul-id `1371` lebt im dünnen Modul-Array von *main*, in keinem Chunk).

Das Main-Bundle ist 3.362.913 Byte (3,36 MB); die Chunk-Map wuchs auf 201 ids (c0–c201; 7 benannte Chunks c0–c6).

## Frühere Hauptbücher

- v4 (cnty9, 2026-10-27) → [Versionsgeschichte: v4](../history/v4.md)
- v3 (3ymzdd, 2026-10-19) → [Versionsgeschichte: v3](../history/v3.md)

## Verwandte Seiten

- [Forschungslog](research-log.md) · [Engine-Header](engine-header.md) · [Policy](policy.md)
