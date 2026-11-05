# Pack-Struktur

> Ziel-API: 5 · Ziel-Build: `bny9u` · Status: Verified

## Vertriebsformat

- **Format**: eine einzelne `.zip` oder ein Ordner (Ordner-Laden geht nur in Desktop-Browsern)
- **Inhalt**: eine `pack.json` (auf der obersten Ebene des Pakets; case-insensitive) + 1–256 `.wgsl`-Dateien
- Mehrere `.wgsl`-Dateien werden zu einem Modul konkateniert, Aufteilen und Unterverzeichnisse sind also gratis. Keine Beschränkungen für Dateinamen. Die Konkatenation erfolgt in **Wörterbuch-Reihenfolge des Pfadnamens** (Modul-Ebene-Deklarationen sind reihenfolgeunabhängig, das spielt also nur für Code eine Rolle, der von der `var`-Initialisierungsreihenfolge abhängt). Nicht-`.wgsl`-Dateien (READMEs etc.) werden ignoriert

## Größen- und Formatlimits

| Posten | Limit | Meldung bei Überschreitung |
|---|---|---|
| Zip-Größe | 32 MB | `The zip is over 32 MB.` |
| Zip-Einträge | 1.024 | `The zip has more than 1024 entries.` |
| `pack.json`-Größe | 64 KB (UTF-8) | `pack.json is over 64 KB.` |
| `.wgsl`-Dateianzahl | 256 | `The pack has more than 256 .wgsl files.` |
| `.wgsl`-Quelltext gesamt | 256 KB (UTF-8) | `The pack's .wgsl files are over 256 KB in total.` |
| Zip-Form | kein zip64 / Split / Verschlüsselung; store oder deflate; keine doppelten Pfade | je mit eigener Meldung abgelehnt |

Alle Dateien müssen valides UTF-8 sein.

## Zip-Tipps

Eine Zip, die alles unter einem gemeinsamen Wurzelordner ablegt, bekommt dieses Präfix automatisch abgeschnitten (macOS „Compress“ funktioniert direkt; `__MACOSX`, `._`-Präfix-Dateien und `.DS_Store` werden automatisch ausgeschlossen). Herumliegende Dateien auf der Root-Ebene brechen die Top-Level-Erkennung — die sicherste Methode ist daher, `pack.json` und die `.wgsl`-Dateien direkt zu zippen (prüfen, dass `pack.json` am Zip-Root landet).
