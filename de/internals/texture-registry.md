# Textur-Registry-Interna

> Ziel-API: 5 · Ziel-Build: `ab90qa` (2026-11-04, Produktion) · Status: Verified (extrahiert durch erneutes Ausführen des Registry-Builders der Engine)

Die Name→id-Auflösungsmaschinerie und der gemessene Registry-Drift. Der nutzerseitige Katalog: [Texturkatalog](../api/texture-catalog.md).

## Methodik

Wir haben das eigene Registry-Bau-Modul der Engine (29833 auf diesem Build, koordinierend die Module 1371 / 1391 / 1384 / 219) in einem Mini-Webpack-Harness gegen die Texturdaten des ausgelieferten Block-Registry laufen lassen und seine Ausgabe aufgezeichnet — diese Zahlen sind **die eigene Berechnung des Produktions-Bundles**, keine Re-Implementierung.

## Ausgabe-Struktur

| Ausgabe | v5 gemessen | Bedeutung |
|---|---|---|
| `named` | **906** | als `bloxdTextureId<Name>` referenzierbare Namen |
| `aliases` | 416 | gefaltete Schreibweisen — 188 Rahmen-Aliasse (`lava0`…) und 228 Rotations-Aliasse (`chest_top[rot[1`…) |
| `layers` | 228 | die Layer-Tabelle — einschließlich 171 vor-rotierter Slots (57 Wurzeln × 4 Rotationen) |

## Faltungsregeln

- **Animationsfamilien** (42): Rahmen-Schreibweisen (`lava0`–`lava7`) falten auf den Basisnamen (`lava`); `bloxdTexel` liefert zur Sample-Zeit den aktuellen Rahmen
- **Rotationsfamilien** (57): gedrehte Slots (`[rot[1..4`) falten auf den Wurzelnamen; `bloxdTexel` wendet pro Fläche die `textureRotation` erneut an
- `radar_screen` ist der einzige Name in beiden Familien (seine vier vor-rotierten Kopien tragen jeweils eine eigene 4-Rahmen-Leiter — daher 45 Animationswurzeln im Atlas, nicht 42)

## Drift (cnty9 → ab90qa)

| Messung | cnty9 (v4) | ab90qa (v5) |
|---|---|---|
| Atlas-Einträge | 1.219 | **1.210** |
| Rotationsfamilien (gedrehte Schreibweisen) | 57 (228) | **57 (228) — unverändert** |
| Animationsfamilien (Rahmen-Schreibweisen) | 42 (188) | **42 (188) — unverändert** |
| benutzbare benannte Konstanten | 905 | **896** |
| id-Änderungen unter überlebenden Namen | — | **334 von 905** |

Der vollständige Drift (11 Namen): hinzu (1) `scorpion_eggs`; entfernt (10) die acht Doppel-Truhentexturen plus `mob_spawner_hostile_block_side` / `mob_spawner_neutral_block_side` (die Doppel-Truhe hat die Spieldaten verlassen; Spawner behalten `mob_spawner_block_top`).

## Wirkung auf HEADER_VERSION

Der Registry-Hash-Suffix bäckt ids ein, daher markiert dieser Drift **jedes gespeicherte Paket als „muss erneut geprüft werden“** (beim Seitenladen automatisch revalidiert). Namens-geschriebene Pakete überstehen die Neuauflösung; Roh-id-Pakete brechen ([Kompatibilität](../api/compatibility.md)).

## Frühere Drift-Aufzeichnungen

Der Zwei-Build-Vergleich aus dem Oktober (sjr0p7 → cnty9, 10 Tage): Einträge 1200 → 1219 (98 hinzugekommen, 79 entfernt); 779 von 1121 unveränderten Namen änderten die id (69 %); eine Namenskonventions-Migration (Suffixe `_rot1..4` → Slots `[rot[1..4`); das Auftauchen der Doppel-Truhe. Die vollständige Aufzeichnung lebt in [Versionsgeschichte: v4](../history/v4.md).

## Verwandte Seiten

- [Texturkatalog](../api/texture-catalog.md) · [Shader-Validierung](shader-validation.md) · [Forschungslog](research-log.md)
