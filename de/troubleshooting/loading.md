# Ladefehler

> Ziel-API: 5 · Status: Verified

Fehler, die an der **Loader-Stufe** (dem ersten Gate) abgelehnt werden, angezeigt in der Statuszeile der Einstellungen mit `shaderPack:load*`-ids.

## „There's no pack.json at the top of the pack."

- **Ursache**: keine `pack.json` im Zip-Root (z. B. wurde der Ordner mit einer Extra-Verschachtelungsebene gezippt)
- **Prüfen**: die Zip öffnen — `pack.json` auf der obersten Ebene (oder direkt unter genau einem gemeinsamen Wurzelordner)
- **Fix**: `pack.json` und die `.wgsl`-Dateien direkt zippen. Ein einzelner gemeinsamer Wurzelordner wird automatisch abgeschnitten ([Pack-Struktur](../getting-started/pack-structure.md))
- **Vorbeugen**: die Zip-Prozedur fix halten; macOS „Compress“ funktioniert direkt (OS-Müll wird automatisch ausgeschlossen)

## `loadDuplicateManifest` beim Zip-Laden

- **Ursache**: zwei `pack.json`-Dateien (Groß/Klein-Differenzen eingeschlossen)
- **Fix**: exakt eine behalten

## Größen- & Anzahl-Limits

| Meldung | Limit |
|---|---|
| `The zip is over 32 MB.` | Zip 32 MB |
| `The zip has more than 1024 entries.` | 1.024 Einträge |
| `The pack has more than 256 .wgsl files.` | 256 `.wgsl`-Dateien |
| `The pack's .wgsl files are over 256 KB in total.` | 256 KB gesamt |
| `pack.json is over 64 KB.` | 64 KB Manifest |

- **Fix**: unnötige `.wgsl`-Dateien wegwerfen / Dateien zusammenlegen / Kommentare trimmen
- **Vorbeugen**: diese Limits sind zugleich praktische Compile-Zeit-Decken — Wachstum als Refactoring-Signal behandeln

## Formatprobleme

Split-Zips, zip64, verschlüsselte Einträge und nicht unterstützte Kompression werden je mit eigenen Meldungen abgelehnt. Alle Dateien müssen valides UTF-8 sein.

## Loader-Fehler-id-Referenz

| id | Bedeutung |
|---|---|
| `loadZipTooBig` | Zip über 32 MB |
| `loadTooManyZipEntries` | über 1.024 Einträge |
| `loadTooManyWgsl` | über 256 `.wgsl` |
| `loadSourceTooBig` | über 256 KB gesamt (gestreamte Prüfung pro Datei) |
| `loadManifestTooBig` | `pack.json` über 64 KB |
| `loadManifestNotJson` / `loadManifestNotObject` | kein JSON / kein Objekt |
| `loadNoApiVersion` / `loadWrongApiVersion` | fehlt / nicht `5` ([API-Versionsfehler](api-version.md)) |
| `loadNoName` / `loadAuthorNotString` | `name` fehlt / `author` kein String |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | nicht unterstützte Kompression / zip64 / Split / verschlüsselt |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | doppelter Pfad / Nicht-UTF-8 / Dekomprimier-Fehler / beschädigte Zip |
| `loadNoManifest` / `loadDuplicateManifest` | Manifest-Position / Duplikation |

## „Ready. Reload the page to use it.", aber nichts ändert sich

- **Ursache**: Pakete brauchen einen **Seiten-Reload**, um zu aktivieren
- **Fix**: nach der Auswahl neu laden; der Status sollte `Ready to use` werden
- **Hinweis**: zurückgebliebene Renderer-Overrides (`?renderer=`, localStorage `bloxdRenderer`) lassen Pakete den Start verweigern — diese löschen und neu laden

## Verwandte Seiten

- [API-Versionsfehler](api-version.md) · [Pack-Struktur](../getting-started/pack-structure.md) · [Packformat](../api/pack-format.md)
