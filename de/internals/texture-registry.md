# Interne Textur-Registry

> Ziel-API: 5 · Status: Analyzed

Diese Seite erklärt, wie Textur-Namen aufgelöst und von Shader-Packs referenziert werden. Die für Pack-Autoren verfügbaren Namen stehen im [Texturkatalog](../api/texture-catalog.md).

## Benannte Konstanten

Packs sollten benannte Konstanten im Format `bloxdTextureId*` verwenden. Textur-Namen werden beim Laden eines Packs gegen die Registry aufgelöst; numerische IDs müssen daher nicht fest eingetragen werden.

**Behandle Namen als API und verlasse dich nicht auf numerische IDs.** Atlas-Anordnung und IDs sind Implementierungsdetails und können sich ändern.

## Animierte Texturen

Animierte Texturen werden über den Basisnamen ihrer Familie referenziert, nicht über eine Frame-Nummer. Beim Sampling wählt die Engine den aktuellen Frame aus; das Pack muss die Frames nicht selbst weiterschalten.

Frame-Schreibweisen sind keine separaten benannten Konstanten für den allgemeinen Gebrauch. Verwende die Basisnamen aus dem Katalog.

## Gedrehte Texturen

Die Drehung einer Fläche wird beim Sampling angewendet. Packs müssen keine internen, vorgedrehten Atlas-Slots direkt auswählen.

## Hinweise zum Sampling

- Wähle Namen aus dem [Texturkatalog](../api/texture-catalog.md).
- Verlasse dich nicht auf numerische IDs oder die interne Atlas-Anordnung.
- Überlasse Animation und Flächendrehung grundsätzlich dem Sampling-Pfad der Engine.

## Verwandte Seiten

- [Textur-API](../api/texture-api.md) — `bloxdTexel` und benannte Konstanten
- [Texturkatalog](../api/texture-catalog.md) — nutzbare Textur-Namen
- [Forschungsnotizen](research-log.md) — Einordnung der Untersuchungsnotizen
