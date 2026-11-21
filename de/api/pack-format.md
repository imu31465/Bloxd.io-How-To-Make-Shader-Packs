# Pack-Format

> Ziel-API: 5 · Typ: API-Referenz

Diese Seite fasst Manifest, ZIP-Archivgrenzen und Pack-Uniform zusammen. Einrichtungsschritte stehen unter [Erste Schritte](../getting-started/manifest.md).

## pack.json

Lege `pack.json` im Stammverzeichnis des ZIP-Archivs ab. Es muss ein JSON-Objekt sein.

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "Author Name",
  "keepCircleShadows": false
}
```

| Feld | Typ | Erforderlich | Beschreibung |
|---|---|---|---|
| `apiVersion` | number | Ja | Den numerischen Wert `5` angeben. Eine Zeichenkette wird nicht akzeptiert |
| `name` | string | Ja | Nicht leerer Name nach Entfernen äußerer Leerzeichen |
| `author` | string | Nein | Name des Autors |
| `keepCircleShadows` | boolean | Nein | Auf `true` setzen, um bei Verwendung der Shadow-API die traditionellen runden Schatten beizubehalten |

## Loader-Grenzen

| Element | Grenze |
|---|---:|
| `.wgsl`-Dateien pro Pack | 256 |
| WGSL-Quelltext insgesamt | 256 KB |
| `pack.json` | 64 KB |
| ZIP-Archiv | 32 MB |
| ZIP-Einträge | 1.024 |

Aufgeteilte ZIP-Archive, Zip64, verschlüsselte Einträge und nicht unterstützte Kompressionsverfahren werden nicht unterstützt. Speichere alle Dateien als UTF-8 und verwende keine doppelten Pfade im Archiv.

## Pack-Uniform

Das Pack-Uniform ist 80 Byte groß und an `@group(3) @binding(0)` gebunden.

| Offset | Feld | Typ |
|---|---|---|
| 0 | `seconds` | `f32` |
| 4 | `lit` | `u32` |
| 16 | `renderOffset` | `vec3i` |
| 32 | `sunDirection` | `vec3f` |
| 48 | `eyePosition` | `vec3f` |
| 64 | `shadowDirection` | `vec3f` |

Die minimale Uniform-Binding-Größe beträgt 80 Byte. Die übrigen Bindings in Gruppe 3 sind die Scene-Depth-Textur für Liquid-Varianten und der Storage-Puffer `bloxdSpTextureLayers`.

## Verwandte Seiten

- [Manifest erstellen](../getting-started/manifest.md)
- [API-Referenz](./)
- [API-v5-Migrationsleitfaden](../history/v5.md)
