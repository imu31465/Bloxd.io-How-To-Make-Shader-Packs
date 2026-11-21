# Textur-Registry-Interna

> Ziel-API: 5 · Ziel-Build: `bbb6l5` (am 2026-11-20 in Produktion und Preprod verifiziert) · Status: Verified

Diese Seite erklärt, wie Textur-Namen in IDs aufgelöst werden, und fasst die Änderungen des Registry zwischen Builds zusammen. Die aktuelle Liste für Pack-Autoren steht im [Texturkatalog](../api/texture-catalog.md).

## Messmethode

Wir haben das Registry mit dem Registry-Builder des Produktions-Builds und den ausgelieferten Block-Texturdaten neu berechnet. Der resultierende Fingerabdruck `32451195` stimmt mit dem vorgefertigten Atlas aus `bbb6l5` überein. Es sind Ergebnisse der Engine selbst, keine separate Nachimplementierung.

## Aktuelles Registry

| Ausgabe | `bbb6l5` | Bedeutung |
|---|---:|---|
| `named` | **1.017** | Namen, die als `bloxdTextureId<Name>`-Konstanten verfügbar sind |
| `aliases` | **776** | alternative Schreibweisen, die auf einen Basisnamen verweisen |
| `layers` | **1.650** | alle Layer des Texturatlas |
| Atlas-Streifen | **7** | sechs volle und ein teilweiser Streifen |
| Rotationsfamilien | **64** | Namen mit flächenbezogenen Rotationsvarianten |
| Animationsfamilien | **71** | Namen mit animierten Frames |

Animations-Aliasse umfassen normale Frame-Schreibweisen und Übergangs-Schreibweisen, mit denen benachbarte Frames überblendet werden. `radar_screen` gehört sowohl zur Rotations- als auch zur Animationsfamilie.

## Zusammenfassen von Namen

- **Animation:** Frame-Namen wie `lava0`–`lava7` werden auf den Basisnamen `lava` abgebildet. `bloxdTexel` wählt beim Sampling den aktuellen Frame.
- **Rotation:** Slots wie `[rot[1`–`[rot[4` werden auf den Basisnamen abgebildet. `bloxdTexel` wendet das `textureRotation` der Fläche an.
- **Übergänge:** `frameA~frameB~interval` bezeichnet einen Atlas-Slot, der zwei benachbarte Animationsframes mischt.

Verwende in WGSL die benannten Konstanten. Numerische Textur-IDs sollten nicht fest codiert werden: Sie können sich zwischen Builds ändern, auch wenn der Name verfügbar bleibt.

## Änderungen zwischen Builds

| Vergleich | Atlas-Layer | Verfügbare Namen | Wichtigste Änderung |
|---|---:|---:|---|
| `sjr0p7` → `cnty9` | 1.200 → 1.219 | — | 98 hinzugefügt, 79 entfernt; Namenskonvention für rotierte Texturen geändert |
| `cnty9` → `ab90qa` | 1.219 → 1.210 | 905 → 896 | Ein Name hinzugefügt, zehn entfernt |
| `ab90qa` → `xkg8x` | 1.210 → 1.220 | 896 → 906 | Die zehn zum v5-Start entfernten Namen kehrten zurück |
| `xkg8x` → `bny9u` | 1.220 → 1.232 | 906 → 911 | Fünf Namen für Trading Terminal und Stone Generator hinzugefügt |
| `bny9u` → `v98qt8` | 1.232 → 1.227 | 911 → 906 | Ein Name hinzugefügt; sechs Texturen verließen das Registry, als ihre Blöcke zu Modellen wurden |
| `v98qt8` → `bbb6l5` | 1.227 → 1.650 | 906 → 1.017 | 423 Layer hinzugefügt; Rotations- und Animationsfamilien erweitert; Regression behoben |

Bei jeder Aktualisierung wurden die IDs vieler Namen neu vergeben. Benannte Konstanten halten Packs von diesen numerischen Änderungen unabhängig.

## Faltungs-Regression in v98qt8 (behoben)

In `v98qt8` verwendete die Tabelle animierter Texturen Schreibweisen als Schlüssel, während die Faltungslogik Slot-Indizes erwartete. Dadurch bestanden die Basisnamen animierter Texturen die Validierung nicht; die Frame-Namen erschienen stattdessen als einzelne Konstanten ohne Animation.

Der Fehler wurde in `bbb6l5` behoben: Die Tabelle verwendet wieder Slot-Indizes, die Basisnamen der Animationen bestehen die Validierung und der Registry-Fingerabdruck stimmt mit dem ausgelieferten Atlas überein. Dieser Abschnitt bleibt als historische Dokumentation erhalten und beschreibt nicht den aktuellen Build.

## Auswirkung auf HEADER_VERSION

Der Registry-Fingerabdruck ist Bestandteil von `HEADER_VERSION`. Änderungen am Registry können deshalb eine erneute Pack-Validierung auslösen. Packs mit Namen werden auf die neuen IDs aufgelöst; fest codierte numerische IDs können dagegen brechen. Siehe [Kompatibilität](../api/compatibility.md).

## Verwandte Seiten

- [Texturkatalog](../api/texture-catalog.md) — verfügbare Namen für Packs
- [Textur-Sampling-Interna](texture-sampling.md) — wie Texturen abgetastet werden
- [Forschungslog](research-log.md) — Messmethode und Build-Verlauf
