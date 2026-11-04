# API-Referenz

Die systematische Spezifikation der aktuellen API v5. Alles hier ist am Ziel-Build `xkg8x` gemessen (2026-11-04; Produktion und Preprod identisch). Der Engine-Header, der jedem Paket vorangestellt wird (abgedruckt in [Engine-Interna](../internals/engine-header.md)), ist die Primärquelle.

## Map

| Seite | Inhalt |
|---|---|
| [Packformat](pack-format.md) | jedes `pack.json`-Feld, Loader-Limits, Uniform-Layout |
| [Shader-Hooks](hooks.md) | 9-Hook-Vergleich: Signaturen, Ziele, Laufbedingungen |
| [Flags](flags.md) | alle 14 `BloxdFlags`-Felder |
| [Strukturen](structures.md) | jedes Feld jeder Struktur (inkl. bedingter Felder) |
| [Funktionen](functions.md) | alle Frame-/Default-/Spezialfunktions-Signaturen |
| [Beleuchtung](lighting.md) | die Beleuchtungs-API und die Verarbeitungsreihenfolge |
| [Textur-API](texture-api.md) | `bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*` und Namensgebung |
| [Konstanten](constants.md) | `bloxdPi` / `bloxdTau` / `bloxdChunkSize` |
| [Präprozessor](preprocessor.md) | `BLOXD_STRICT` / `BLOXD_ALPHA` / `BLOXD_SCENE_DEPTH` |
| [Einschränkungen](restrictions.md) | Sprachgrenzen, reservierte Bezeichner |
| [Kompatibilität](compatibility.md) | Pakete alter Versionen, Re-Validierung gespeicherter Pakete |
| [Texturkatalog](texture-catalog.md) | alle 896 benutzbaren Namen (durchsuchbar) |

> Ziel-API: 5 · Ziel-Build: `xkg8x` (2026-11-04, Produktion) · Status: Analyzed (wortwörtlich aus Header & Validator restauriert)

Migration von v4? Siehe [Versionsgeschichte: v5](../history/v5.md).
