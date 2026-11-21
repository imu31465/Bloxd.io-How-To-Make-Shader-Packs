# Packformat

Das ganze Paketmodell auf einer Seite — Manifest, Loader-Limits, Per-Frame-Uniform. Für die Schritt-für-Schritt-Version siehe [Erste Schritte](../getting-started/manifest.md).

## pack.json

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `apiVersion` | Zahl | Pflicht | **muss strikt `5` entsprechen** (`===`). Ein String `"5"` scheitert und wird mit seiner JSON-Schreibweise gemeldet |
| `name` | String | Pflicht | nach dem Trimmen nicht leer; wird in den Einstellungen angezeigt |
| `author` | String | optional | muss, falls vorhanden, ein String sein |
| `keepCircleShadows` | boolean | optional | behält die alten kreisförmigen Schatten unter Spielern und Mobs, wenn deine Shader auch die echte Sonnenschatten-API nutzen ([Schatten](../guides/shadows.md)). Standard `false`; jeder andere Typ wird mit eigener Meldung abgelehnt |

Alles andere im Manifest wird ignoriert. `pack.json` muss exakt ein JSON-Objekt im Zip-Root sein.

## Loader-Limits

| Limit | Wert | Meldung bei Überschreitung |
|---|---|---|
| `.wgsl`-Dateien pro Paket | 256 | `The pack has more than 256 .wgsl files.` |
| `.wgsl`-Quelltext gesamt | 256 KB | `The pack's .wgsl files are over 256 KB in total.` |
| `pack.json`-Größe | 64 KB | `pack.json is over 64 KB.` |
| Zip-Größe | 32 MB | `The zip is over 32 MB.` |
| Zip-Einträge | 1.024 | `The zip has more than 1024 entries.` |
| Zip-Form | — | Split-Zip / zip64 / verschlüsselt / nicht unterstützte Kompression werden je mit eigener Meldung abgelehnt; alle Dateien valides UTF-8; exakt eine `pack.json`; keine doppelten Pfade |

## API-Versionsprüfung

Der Loader vergleicht `manifest.apiVersion !== 5` mit JavaScript-strikt `!==`. Meldungen bei Nichtübereinstimmung: siehe [Kompatibilität](compatibility.md).

## Per-Frame-Uniform: bloxdPackInputs

`@group(3) @binding(0) var<uniform> bloxdPackInputs: BloxdPackInputs` — weiterhin 80 Byte, aber v5 hat ein Member hinzugefügt:

| Offset | Feld | Typ | Hinweis |
|---|---|---|---|
| 0 | `seconds` | `f32` | unterlegt `bloxdSeconds()` |
| 4 | `lit` | `u32` | 1, wenn Block-/Himmels-Beleuchtung an ist; unterlegt `bloxdLit()` |
| 16 | `renderOffset` | `vec3i` | unterlegt `bloxdRenderOffset()` |
| 32 | `sunDirection` | `vec3f` | unterlegt `bloxdSunDirection()` |
| 48 | `eyePosition` | `vec3f` | unterlegt `bloxdEyePosition()` |
| 64 | `shadowDirection` | `vec3f` | die Richtung, in die das schattenwerfende Licht läuft; stützt `bloxdShadowDirection()` |

`shadowDirection` füllt die Lücke nach `eyePosition` (ein `vec3f` belegt 12 Byte, also waren Offsets 60–63 Spielraum; `shadowDirection` landet bei 80, einer 16-Byte-Grenze — der Struct bleibt exakt 80 Byte). Die Engine schreibt ihn mit drei `setFloat32` — es ist ein Einheitsvektor (tagsüber von der Sonne, nachts vom Mond, bei sonnenlosen Worlds von der Sonne des Standardhimmels), nie über dem Horizont. Das Uniform ist 80 Byte groß; `minBindingSize` beträgt ebenfalls 80.

`lit` passte in den Spielraum, den v4 bereits zwischen `seconds` und `renderOffset` hatte.

**Das Uniform nie direkt aus einem Paket referenzieren.** Es über die Header-Funktionen benutzen (`bloxdSeconds()` usw.). Die Stage-Sichtbarkeit ist VERTEX|FRAGMENT, deshalb funktionieren Header-Funktionen auch aus Modul-Funktionen und Vertex-Hooks.

## Bind-Group-Layout

| Binding | Inhalt |
|---|---|
| 0 | `bloxdPackInputs`-Uniform (80 B) |
| 1 | Szenentiefe-Textur (Liquid-Varianten) |
| 2 | `bloxdSpTextureLayers`-Storage-Buffer |

`minBindingSize` bleibt 80. Die Tiefentextur (Binding 1) ist FRAGMENT-only — deshalb ist `bloxdOpaqueBehind()` nur aus Surface-/Light-Hooks aufrufbar.

## WGSL-Konkatenation

Mehrere `.wgsl`-Dateien werden in **Wörterbuch-Reihenfolge des Pfadnamens** zu einem Modul konkateniert. Modul-Ebene-Deklarationen sind reihenfolgeunabhängig; nur die `var`-Initialisierungsreihenfolge kann relevant werden. Nicht-`.wgsl`-Dateien werden ignoriert.
