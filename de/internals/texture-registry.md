# Textur-Registry-Interna

> Ziel-API: 5 · Ziel-Build: `bny9u` (2026-11-05, Produktion) · Status: Verified (extrahiert durch erneutes Ausführen des Registry-Builders der Engine)

Die Name→id-Auflösungsmaschinerie und der gemessene Registry-Drift. Der nutzerseitige Katalog: [Texturkatalog](../api/texture-catalog.md).

## Methodik

Wir haben das eigene Registry-Bau-Modul der Engine (29812 auf diesem Build, getragen von den Chunks 52/53/54) gegen die Texturdaten des ausgelieferten Block-Registry (Datenmodul 1351 im Haupt-Bundle) in einem Mini-Webpack-Harness gegen die Texturdaten des ausgelieferten Block-Registry laufen lassen und seine Ausgabe aufgezeichnet — diese Zahlen sind **die eigene Berechnung des Produktions-Bundles**, keine Re-Implementierung.

## Ausgabe-Struktur

| Ausgabe | v5 gemessen | Bedeutung |
|---|---|---|
| `named` | **911** | als `bloxdTextureId<Name>` referenzierbare Namen |
| `aliases` | 424 | gefaltete Schreibweisen — 196 Rahmen-Aliasse (`lava0`…) und 228 Rotations-Aliasse (`chest_top[rot[1`…) |
| `layers` | 1,232 | die vollständige Atlas-Layer-Tabelle — 911 benannte Wurzeln, 150 zusätzliche Animationsrahmen, 171 vor-rotierte Slots |

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


## Wirkung auf HEADER_VERSION

Der Registry-Hash-Suffix bäckt ids ein, daher markiert dieser Drift **jedes gespeicherte Paket als „muss erneut geprüft werden“** (beim Seitenladen automatisch revalidiert). Namens-geschriebene Pakete überstehen die Neuauflösung; Roh-id-Pakete brechen ([Kompatibilität](../api/compatibility.md)).

## Frühere Drift-Aufzeichnungen

Der Zwei-Build-Vergleich aus dem Oktober (sjr0p7 → cnty9, 10 Tage): Einträge 1200 → 1219 (98 hinzugekommen, 79 entfernt); 779 von 1121 unveränderten Namen änderten die id (69 %); eine Namenskonventions-Migration (Suffixe `_rot1..4` → Slots `[rot[1..4`); das Auftauchen der Doppel-Truhe. Die vollständige Aufzeichnung lebt in [Versionsgeschichte: v4](../history/v4.md).

4. November (ab90qa → xkg8x, 1 Tag): Einträge 1,210 → 1,220 (+10, alles Rückkehrer — die v5-Start-Entfernungen kehrten sich um); 376 von 896 Namen änderten die id (42 %); keine Entfernungen; beide Faltfamilien unverändert. Die Double-Chest ist zurück.

November 5 (xkg8x → bny9u, 1 Tag): Einträge 1,220 → 1,232 (+5: die Trading-Terminal- ×3 und Stone-Generator- ×2 Texturen); 864 von 906 Namen änderten die id (95 %); keine Entfernungen; Rotationsfamilien unverändert, Animationsfamilien 42 → 43 (`trading_terminal_front`, 8 Frames bei 250 ms). Produktion und Preprod liefern dasselbe byte-identische Bundle.
## Verwandte Seiten

- [Texturkatalog](../api/texture-catalog.md) · [Shader-Validierung](shader-validation.md) · [Forschungslog](research-log.md)
