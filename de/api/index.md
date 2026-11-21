# API-Referenz

Diese Seite dokumentiert die aktuelle API v5. Die maßgebliche Quelle für die API-Definitionen ist der Engine-Header, den die Engine jedem Pack automatisch voranstellt (den vollständigen Header findest du unter [Engine-Interna](../internals/engine-header.md)).

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
| [Texturkatalog](texture-catalog.md) | 1.017 verfügbare benannte Konstanten (durchsuchbar) |

> API: 5 · Status: Analyzed (aus Engine-Header und Validator rekonstruiert)

Migration von v4? Siehe [Versionsgeschichte: v5](../history/v5.md).
