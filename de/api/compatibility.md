# Kompatibilität

> Ziel-API: 5 · Typ: API-Referenz

Diese Seite erklärt, welche Shader-Pack-API-Versionen das aktuelle Spiel akzeptiert und wie gespeicherte Packs älterer Versionen behandelt werden.

## Akzeptierte API-Version

Das aktuelle Spiel akzeptiert nur Packs, deren Manifest den numerischen Wert `5` in `apiVersion` enthält. Die Zeichenkette `"5"` wird nicht akzeptiert. Packs für API v1–v4 müssen vor dem Laden migriert werden.

## Meldungen beim Laden

- `pack.json needs "apiVersion": {{version}}.` — der Schlüssel `apiVersion` fehlt
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — die angegebene Version stimmt nicht mit der aktuellen Version überein

## Gespeicherte Packs älterer Versionen

Ein Pack, das für eine ältere API-Version gespeichert wurde, wird im aktuellen Spiel nicht ausgeführt. Die Shader-Pack-Einstellungen zeigen an, dass das Pack eine nicht unterstützte Version verwendet. Aktualisiere es anhand des passenden Migrationsleitfadens.

## Erneute Validierung gespeicherter Packs

Gespeicherte Packs werden erneut validiert, wenn sich von der Engine bereitgestellte Header oder Texturnamen-Definitionen ändern. Die erneute Validierung erfolgt automatisch beim Laden des Spiels. Referenziere Texturen im Pack-Code über benannte Konstanten und nicht über numerische IDs, die sich ändern können.

## Laufzeitkompatibilität

- **WebGPU:** Shader-Packs benötigen einen WebGPU-fähigen Renderer.
- **Mobilgeräte:** In Umgebungen ohne WebGPU-Unterstützung sind Shader-Packs nicht verfügbar ([Voraussetzungen](../getting-started/requirements.md)).
- **Texturzugriff:** In Renderer-Konfigurationen ohne Textur-Atlas bieten `bloxdTexel` und `bloxdTextureSize` keinen normalen Zugriff auf Atlas-Texturen ([Textur-API](texture-api.md)).

## Unterstützung der API-Versionen

| API-Version | Unterstützung im aktuellen Spiel |
|---|---|
| v1 | Wird beim Laden abgelehnt |
| v2 | Wird beim Laden abgelehnt |
| v3 | Wird beim Laden abgelehnt |
| v4 | Wird beim Laden abgelehnt |
| **v5** | **Aktuell** |

## Verwandte Seiten

- [Migration von v4 zu v5](../history/v5.md)
- [Versionsgeschichte](../history/)
