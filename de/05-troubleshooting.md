[← Vorheriger Teil](04-realism.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](06-implementation.md)

# Teil V: Fehlersuche & Hinweise

## 17. Häufige Fehler und Fixes

| Symptom | Fix |
|---|---|
| Lädt in strikten Spielen nicht | Vertex-Hook in `#ifndef BLOXD_STRICT` packen |
| `.alpha` als undefiniert gemeldet | In `#ifdef BLOXD_ALPHA` packen |
| `blockLight` als undefiniert gemeldet | In `#ifdef BLOXD_LIGHTING` packen. Gemeinsame Hilfsfunktionen **als ganze Funktionen** einpacken (in v2 ist das Feld immer vorhanden: praktisch kein Fehler mehr; Guards für Entscheidungszweige behalten) |
| `Packs can't construct BloxdSurface directly` | Von `bloxdDefaultSurface(s)` ausgehen |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | In `#ifndef BLOXD_STRICT` packen |
| Weiße milchige Ferne | Meist Doppel-Fog. Die fertige Farbe ist bereits gefoggt: eigenen Dunst dezent halten und lieber nur Sättigung senken |
| Paket beim Spielbeitritt ausgeschlossen | Live-Check im Spiel schlägt fehl. Guard-Lücken prüfen |
| `pack.json needs "apiVersion": 2.` | `apiVersion` fehlt oder ist nicht `2`. Zahl `2` eintragen (String `"2"` wird abgelehnt). V1-Pakete werden mit `shaderPack:loadWrongApiVersion` abgelehnt |
| `There's no pack.json at the top of the pack.` | Kein `pack.json` im ZIP-Root. Prüfen, ob nicht der Ordner selbst gezippt wurde |
| `bloxdTerrainVertex must be declared as: fn ...` | Signatur weicht ab. Exakt wie angezeigt umschreiben |
| `bloxdTerrainVertex can't run in strict games...` | Vertex-Hook in `#ifndef BLOXD_STRICT` packen |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | In `#ifdef BLOXD_LIGHTING` packen (in v2 ist das Feld immer vorhanden: praktisch kein Fehler mehr) |
| `pow(l.skyLight, γ)` höher zu drehen vertieft Schatten nie | `skyLight` ist Post-Kurven-Wert (roh 0,87 kommt als 0,97). Auf R9.12-Lift-Inversion + Schwelle wechseln (Abschnitt 10) |
| `... can only be a function's parameter or return type, ...` | Uninitialisiertes `var x: BloxdSurface;` wird abgelehnt. Ab `bloxdDefault*` bauen |
| `bloxdPackInputs isn't part of the bloxd_ header` | Das PackInputs-Uniform kann aus Paketen nicht direkt referenziert werden. Über Header-Funktionen wie `bloxdTime()` nutzen |
| `Packs can't declare bloxd_ names...` | Das `bloxd_`-Präfix aus eigenen Bezeichnern entfernen. Nur die 6 Hook-Namen dürfen definiert werden |
| `loadDuplicateManifest` beim Zip-Laden | Zwei `pack.json` (inkl. Groß/Klein-Varianten). Eines behalten |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Ab `bloxdDefaultSurface(s)` umschreiben. Von einer Kopie des ersten Light-Hook-Parameters (`var out = s;`) zu starten geht auch |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` wird abgelehnt. `_ = f();` schreiben |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | `bloxdOpaqueBehind()`-Aufrufe in Terrain-Hooks mit `#ifdef BLOXD_SCENE_DEPTH` umschließen |
| `...only surface and light hooks can use.` | `bloxdOpaqueBehind()` aus Vertex-Hooks entfernen (nur Surface / Light) |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Kein Fehler, sondern Auto-Deaktivierung in strikten Spielen (`shaderPack:offInStrict`). Vertex-Hooks und `discard` mit `#ifndef BLOXD_STRICT` umschließen |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Fehler der 2. Stufe (Browser-Tint). Operanden von `^` `&` `\|` `<<` `>>` klammern (§38) |

## 18. Rechte & Hinweise

- Die Shader-Paket-Funktion ist eine offizielle, aus der Spiel-UI ladbare Funktion, Pakete zu erstellen gilt als vorgesehener Gebrauch. Es wurde aber keine öffentliche offizielle Dokumentation bestätigt
- Pakete sind reines WGSL — JS-Ausführung und Netzwerkzugriff sind konstruktionsbedingt unmöglich
- Dies ist eine inoffizielle Anleitung, nicht die offizielle Position der Entwickler. Die API kann sich ohne Hinweis ändern
