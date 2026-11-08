# Textur-Registry-Interna

> Ziel-API: 5 · Ziel-Build: `v98qt8` (2026-11-08, Produktion und Preprod) · Status: Verified (extrahiert durch erneutes Ausführen des Registry-Builders der Engine)

Die Name→id-Auflösungsmaschinerie und der gemessene Registry-Drift. Der nutzerseitige Katalog: [Texturkatalog](../api/texture-catalog.md).

## Methodik

Wir haben das eigene Registry-Bau-Modul der Engine (29812 auf diesem Build, getragen von den Chunks 52/53/54) gegen die Texturdaten des ausgelieferten Block-Registry (Datenmodul 1351 im Haupt-Bundle) in einem Mini-Webpack-Harness gegen die Texturdaten des ausgelieferten Block-Registry laufen lassen und seine Ausgabe aufgezeichnet — diese Zahlen sind **die eigene Berechnung des Produktions-Bundles**, keine Re-Implementierung.

## Ausgabe-Struktur

| Ausgabe | v5 gemessen | Bedeutung |
|---|---|---|
| `named` | **906** | als `bloxdTextureId<Name>` referenzierbare Namen |
| `aliases` | 424 | gefaltete Schreibweisen — 196 Rahmen-Aliasse (`lava0`…) und 228 Rotations-Aliasse (`chest_top[rot[1`…) |
| `layers` | 1,227 | die vollständige Atlas-Layer-Tabelle — 911 benannte Wurzeln, 150 zusätzliche Animationsrahmen, 171 vor-rotierte Slots |

## Faltungsregeln

- **Animationsfamilien** (43): Rahmen-Schreibweisen (`lava0`–`lava7`) falten auf den Basisnamen (`lava`); `bloxdTexel` liefert zur Sample-Zeit den aktuellen Rahmen
- **Rotationsfamilien** (57): gedrehte Slots (`[rot[1..4`) falten auf den Wurzelnamen; `bloxdTexel` wendet pro Fläche die `textureRotation` erneut an
- `radar_screen` ist der einzige Name in beiden Familien (seine vier vor-rotierten Kopien tragen jeweils eine eigene 4-Rahmen-Leiter — daher 46 Animationswurzeln im Atlas, nicht 43)

## Drift (cnty9 → ab90qa)

| Messung | cnty9 (v4) | ab90qa (v5) |
|---|---|---|
| Atlas-Einträge | 1.219 | **1.210** |
| Rotationsfamilien (gedrehte Schreibweisen) | 57 (228) | **57 (228) — unverändert** |
| Animationsfamilien (Rahmen-Schreibweisen) | 42 (188) | **42 (188) — unverändert** |
| benutzbare benannte Konstanten | 905 | **896** |
| id-Änderungen unter überlebenden Namen | — | **334 von 905** |

Der vollständige Drift (11 Namen): hinzu (1) `scorpion_eggs`; entfernt (10) die acht Doppel-Truhentexturen plus `mob_spawner_hostile_block_side` / `mob_spawner_neutral_block_side` (die Doppel-Truhe hat die Spieldaten verlassen; Spawner behalten `mob_spawner_block_top`).

## Drift (ab90qa → xkg8x)

| Messung | ab90qa (v5-Start) | xkg8x (v5, aktuell) |
|---|---|---|
| Atlas-Einträge | 1,210 | **1,220** |
| Rotationsfamilien (gedrehte Schreibweisen) | 57 (228) | **57 (228) — unverändert** |
| Animationsfamilien (Bild-Schreibweisen) | 42 (188) | **42 (188) — unverändert** |
| benutzbare benannte Konstanten | 896 | **906** |
| id-Änderungen unter überlebenden Namen | — | **376 von 896** |

Die vollständige Drift (10 Namen): hinzu (10) die acht Double-Chest-Texturen plus `mob_spawner_hostile_block_side` / `mob_spawner_neutral_block_side` — jeder beim v5-Start entfernte Name ist zurück (die Double-Chest kehrte in die Spieldaten zurück, die Spawner-Seitenvarianten gleich mit). Nichts wurde entfernt.


## Drift (xkg8x → bny9u)

| Messung | xkg8x (v5) | bny9u (v5, aktuell) |
|---|---|---|
| Atlas-Einträge | 1,220 | **1,232** |
| Rotationsfamilien (gedrehte Schreibweisen) | 57 (228) | **57 (228) — unverändert** |
| Animationsfamilien (Bild-Schreibweisen) | 42 (188) | **43 (196)** |
| benutzbare benannte Konstanten | 906 | **911** |
| id-Änderungen unter überlebenden Namen | — | **864 von 906** |

Die vollständige Drift (5 Namen): hinzu (5) `trading_terminal_front` (anim, 8 Frames) / `trading_terminal_side` / `trading_terminal_top` / `stone_generator_side` / `stone_generator_top` — zwei neue Blöcke (Trading Terminal, Stone Generator) sind in die Spieldaten gekommen. Nichts wurde entfernt; die id-Fluktuation ist fast total (95 % der Überlebenden).


## Drift (bny9u → v98qt8)

| Messung | bny9u (v5) | v98qt8 (v5, aktuell) |
|---|---|---|
| Atlas-Einträge | 1.232 | **1.227** |
| Rotationsfamilien (gedrehte Schreibweisen) | 57 (228) | **57 (228) — unverändert** |
| Animationsfamilien (Rahmen-Schreibweisen) | 43 (196) | **43 (196) — unverändert** |
| benutzbare benannte Konstanten | 911 | **906** |
| id-Änderungen unter Überlebenden | — | **716 von 905** (79 %) |

Der vollständige Drift (7 Namen): hinzu (1) `hay_block_top`; entfernt (6) `artisan_table_side` / `artisan_table_top` / `crafting_table_side` / `furnace_front` / `furnace_side` / `furnace_top` — Furnace, Workbench (Crafting Table) und Artisan Bench wurden von texturierten Terrain-Blöcken zu Block-Modellen konvertiert, sodass ihre Terrain-Texturen die Registry verließen (die Workbench behielt `crafting_table_top` — die Oberseite bleibt eine Terrain-Textur). Produktion und Preprod liefern dasselbe byte-identische Bundle (md5 `7458fd47ff88331d9f451d1456ff48ac`).

## Die v98qt8-Faltungs-Regression

`v98qt8` liefert eine byte-verifizierte Regression in der Texturkonstanten-Faltung. Das Datenmodul (1351) baut `animatedBlockTextures` jetzt als **schreibweise-verschlüsseltes Array** (`Yi[pii[0]] ??= {numAnimStates, animStartIdx, …}` — hexdump-verifiziert im Live-Main-Bundle), während der Klassifikator (Modul 30048) an zwei Stellen ein **slot-verschlüsseltes Array** erwartet:

1. `hii.forEach((value, key))` — `Array.prototype.forEach` besucht nie String-Schlüssel, daher bleibt die Slot→Basis-Map für Zusatzrahmen leer
2. `hii[Qi]` mit `Qi` = der Atlas-Slot — Klammer-Zugriff mit einem Slot-Index trifft nie einen Schreibweise-Schlüssel, daher löst die Basis-Faltung (`lava0` → `lava`) nie aus

Folgen, alles gemessen durch verbatim-Ausführung des Produktions-Klassifikators und -Resolvers in Node:

- die 43 Animationsfamilien-Basisnamen (`lava`, alle `*_portal`, `smoke`, `radar_screen`, `trading_terminal_front`, die 19 `*_running`-Maschinentexturen, …) **scheitern an der Validierung**: `bloxdTextureIdLava` → „There's no texture called bloxdTextureIdLava. Did you mean bloxdTextureIdLava0?“
- die 196 Rahmen-Schreibweisen (`lava0`–`lava7`, …) lösen als **einzelne benutzbare Konstanten** auf (nur den Basisrahmen sampelnd — keine Animation)
- die dedizierte Diagnose „names a frame of the animated texture“ kann nie feuern (keine Rahmen-Aliasse existieren)
- das Laufzeit-`named`-Set der Engine hat 1.047 Zeilen, daher berechnet die Engine für `HEADER_VERSION` den Registry-Hash `694df62c` — nicht den beabsichtigten `df6c1915` (gefaltet) — was zusätzlich **jedes gespeicherte Paket zur Neuprüfung** zwingt

Kontrollversuch: demselben Klassifikator ein slot-verschlüsseltes Array zu übergeben (was die Faltungslogik selbst erwartet und was `bny9u`s Datenmodul erzeugte) reproduziert die dokumentierte gefaltete Ausgabe exakt — 906 named mit `lava` bei id 1, `lava0`–`lava7` als Rahmen-Aliasse, 424 Aliasse, 1.227 Layer. Die Faltungsregeln unten beschreiben diese beabsichtigte API.

## Wirkung auf HEADER_VERSION

Der Registry-Hash-Suffix bäckt ids ein, daher markiert dieser Drift **jedes gespeicherte Paket als „muss erneut geprüft werden“** (beim Seitenladen automatisch revalidiert). Namens-geschriebene Pakete überstehen die Neuauflösung; Roh-id-Pakete brechen ([Kompatibilität](../api/compatibility.md)).

## Frühere Drift-Aufzeichnungen

Der Zwei-Build-Vergleich aus dem Oktober (sjr0p7 → cnty9, 10 Tage): Einträge 1200 → 1219 (98 hinzugekommen, 79 entfernt); 779 von 1121 unveränderten Namen änderten die id (69 %); eine Namenskonventions-Migration (Suffixe `_rot1..4` → Slots `[rot[1..4`); das Auftauchen der Doppel-Truhe. Die vollständige Aufzeichnung lebt in [Versionsgeschichte: v4](../history/v4.md).

4. November (ab90qa → xkg8x, 1 Tag): Einträge 1,210 → 1,220 (+10, alles Rückkehrer — die v5-Start-Entfernungen kehrten sich um); 376 von 896 Namen änderten die id (42 %); keine Entfernungen; beide Faltfamilien unverändert. Die Double-Chest ist zurück.

November 5 (xkg8x → bny9u, 1 Tag): Einträge 1,220 → 1,232 (+5: die Trading-Terminal- ×3 und Stone-Generator- ×2 Texturen); 864 von 906 Namen änderten die id (95 %); keine Entfernungen; Rotationsfamilien unverändert, Animationsfamilien 42 → 43 (`trading_terminal_front`, 8 Frames bei 250 ms). Produktion und Preprod liefern dasselbe byte-identische Bundle.
8. November (bny9u → v98qt8, 3 Tage): Einträge 1.232 → 1.227 (+1 `hay_block_top`, −6 modellkonvertierte Blocktexturen: Furnace, Workbench, Artisan Bench); 716 von 905 Namen änderten die id (79 %); Rotations- und Animationsfamilien unverändert (57 / 43). Produktion und Preprod liefern dasselbe byte-identische Bundle — und der Build trägt die oben dokumentierte Faltungs-Regression.

## Verwandte Seiten

- [Texturkatalog](../api/texture-catalog.md) · [Shader-Validierung](shader-validation.md) · [Forschungslog](research-log.md)
