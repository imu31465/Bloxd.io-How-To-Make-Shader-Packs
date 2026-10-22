[← Vorheriger Teil](04-realism.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](06-implementation.md)

# Teil V: Fehlersuche & Hinweise

> Das aktuelle Spiel verlangt seit dem 2026-10-19 `apiVersion: 3` und lehnt v1/v2-Pakete beim Laden ab — der folgende Inhalt ist auf der v2-Spezifikation geschrieben. Siehe [Teil IX](09-apiv3.md) zum Migrieren vor der Verteilung.

## 17. Häufige Fehler und Fixes

| Symptom | Fix |
|---|---|
| Lädt in strikten Spielen nicht | Vertex-Hook in `#ifndef BLOXD_STRICT` packen |
| `.alpha` als undefiniert gemeldet | In `#ifdef BLOXD_ALPHA` packen |
| `blockLight` als undefiniert gemeldet | In `#ifdef BLOXD_LIGHTING` packen. Gemeinsame Hilfsfunktionen **als ganze Funktionen** einpacken (in v2 ist das Feld immer vorhanden: praktisch kein Fehler mehr; Guards für Entscheidungszweige behalten) |
| `Packs can't construct BloxdSurface directly` | Von `bloxdDefaultSurface(s)` ausgehen |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | In `#ifndef BLOXD_STRICT` packen |
| Weiße milchige Ferne | Meist Doppel-Fog. Die fertige Farbe ist bereits gefoggt: eigenen Dunst dezent halten und lieber nur Sättigung senken |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | Warnung, dass die Licht-Seed-Queue in Regionen hoher Emitterdichte oder über Regionsgrenzen hinweg übergelaufen ist; die Lichtberechnung dieses Chunks wurde abgeschnitten. Nicht paketbedingt, aber **Lichtlücken um Emitter-Konzentrationen stammen aus dieser Spezifikation** — verteilte Lichtquellen in der Welt vermeiden sie |
| Paket beim Spielbeitritt ausgeschlossen | Live-Check im Spiel schlägt fehl. Guard-Lücken prüfen |
| Der Live-Check terminiert nie und das Paket fliegt mit `This device couldn't check ...` etc. | Der Check hat ein erzwungenes 60-Sekunden-Timeout (Überschreitung zählt als `skipped`). Häufig auf schwachen Geräten / schweren Welten — schweres Vertex-Arbeiten und komplexe Loops reduzieren und erneut versuchen |
| `pack.json needs "apiVersion": 3.` | `apiVersion` fehlt oder ist nicht `3`. Zahl `3` eintragen (String `"3"` wird abgelehnt). v1/v2-Pakete werden mit `shaderPack:loadWrongApiVersion` abgelehnt |
| `There's no pack.json at the top of the pack.` | Kein `pack.json` im ZIP-Root. Prüfen, ob nicht der Ordner selbst gezippt wurde |
| `bloxdTerrainVertex must be declared as: fn ...` | Signatur weicht ab. Exakt wie angezeigt umschreiben |
| `bloxdTerrainVertex can't run in strict games...` | Vertex-Hook in `#ifndef BLOXD_STRICT` packen |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | In `#ifdef BLOXD_LIGHTING` packen (in v2 ist das Feld immer vorhanden: praktisch kein Fehler mehr) |
| `pow(l.skyLight, γ)` höher zu drehen vertieft Schatten nie | `skyLight` ist Post-Kurven-Wert (roh 0,87 kommt als 0,97). Auf R9.12-Lift-Inversion + Schwelle wechseln (Abschnitt 10) |
| `... can only be a function's parameter or return type, ...` | Uninitialisiertes `var x: BloxdSurface;` wird abgelehnt. Ab `bloxdDefault*` bauen |
| `bloxdPackInputs isn't part of the bloxd_ header` | Das PackInputs-Uniform kann aus Paketen nicht direkt referenziert werden. Über Header-Funktionen wie `bloxdTime()` nutzen |
| `Packs can't declare bloxd_ names...` | Das `bloxd_`-Präfix aus eigenen Bezeichnern entfernen. Nur die 6 Hook-Namen dürfen definiert werden |
| `loadDuplicateManifest` beim Zip-Laden | Zwei `pack.json` (inkl. Groß/Klein-Varianten). Eines behalten |
| `needs the new WebGPU renderer, so remove the renderer override...` | URL-Parameter `?renderer=` und localStorage `bloxdRenderer` entfernen und neu laden ([Teil VII](07-internals.md) §29) |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Ab `bloxdDefaultSurface(s)` umschreiben. Von einer Kopie des ersten Light-Hook-Parameters (`var out = s;`) zu starten geht auch |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` wird abgelehnt. `_ = f();` schreiben |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | `bloxdOpaqueBehind()`-Aufrufe in Terrain-Hooks mit `#ifdef BLOXD_SCENE_DEPTH` umschließen |
| `...only surface and light hooks can use.` | `bloxdOpaqueBehind()` aus Vertex-Hooks entfernen (nur Surface / Light) |
| `Lite: …reads scene depth on a page that didn't turn it on` | Seite neu laden und mit dem Tiefen lesenden Paket ([Teil VIII](08-apiv2.md) §35) wieder öffnen. Die Verfügbarkeit der Tiefentextur wird bei der Seitenerstellung fixiert |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Kein Fehler, sondern Auto-Deaktivierung in strikten Spielen (`shaderPack:offInStrict`). Vertex-Hooks und `discard` mit `#ifndef BLOXD_STRICT` umschließen |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Fehler der 2. Stufe (Browser-Tint). Operanden von `^` `&` `\|` `<<` `>>` klammern (§38) |

### Fehler-IDs der Ladephase

Fehler vom Einstellungs-Bildschirm tragen `shaderPack:load*`-IDs. Als Nachschlagehilfe für Meldungen:

| ID | Bedeutung |
|---|---|
| `loadZipTooBig` | zip über 32MB |
| `loadTooManyZipEntries` | zip-Einträge über 1024 |
| `loadTooManyWgsl` | `.wgsl` über 256 |
| `loadSourceTooBig` | `.wgsl` gesamt über 256KB (Streaming-Prüfung pro Datei) |
| `loadManifestTooBig` | `pack.json` über 64KB |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` ist kein JSON / kein Objekt |
| `loadNoApiVersion` / `loadWrongApiVersion` | kein `apiVersion` / nicht `3` (v1/v2-Pakete abgelehnt) |
| `loadNoName` / `loadAuthorNotString` | kein `name` / `author` ist kein String |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | nicht unterstützte Kompression / zip64 / geteilt / verschlüsselt |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | doppelte Pfade / kein UTF-8 / Dekomprimierung fehlgeschlagen / zip beschädigt |

`loadNoManifest` / `loadDuplicateManifest` (Position / Duplikate von `pack.json`) — siehe die passenden Zeilen in der Tabelle oben.

## 18. Rechte & Hinweise

- Die Shader-Paket-Funktion ist eine offizielle, aus der Spiel-UI ladbare Funktion, Pakete zu erstellen gilt als vorgesehener Gebrauch. Es wurde aber keine öffentliche offizielle Dokumentation bestätigt
- Pakete sind reines WGSL — JS-Ausführung und Netzwerkzugriff sind konstruktionsbedingt unmöglich
- Dies ist eine inoffizielle Anleitung, nicht die offizielle Position der Entwickler. Die API kann sich ohne Hinweis ändern

[← Vorheriger Teil](04-realism.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](06-implementation.md)
