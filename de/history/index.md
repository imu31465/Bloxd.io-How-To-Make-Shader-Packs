# Versionsgeschichte

> Typ: Historisch · Migrationsleitfäden für API v1–v5

Dieser Abschnitt bewahrt Änderungen, Migrationsschritte und entfernte APIs der Versionen v1 bis v5. Der Schwerpunkt liegt auf API-Verhalten und Migrationspfaden, nicht auf Build-IDs oder Prüfzeitpunkten.

## Versionen

| Version | Migrationsleitfaden | Wichtigste Änderungen |
|---|---|---|
| v1 | [v1](v1.md) | Erste Shader-Pack-API |
| v2 | [v2](v2.md) | Umbenennung von Bezeichnern, `blockId` und Scene-Depth-Zugriff |
| v3 | [v3](v3.md) | `blockFlags`, `bloxdPi` / `bloxdTau` und Liquid-Hooks |
| v4 | [v4](v4.md) | Textur-API und Einschränkungen in Strict-Spielen |
| **v5** | [v5](v5.md) | **Aktuell** — `BloxdFlags`, Model-Hooks sowie Lighting- und Shadow-API |

## Umgang mit älteren Versionen

Das aktuelle Spiel akzeptiert nur Packs mit `apiVersion: 5`. Ältere Packs können nicht unverändert geladen werden. Bei einer Migration über mehrere Versionen wendest du die Leitfäden der Reihe nach an, beginnend mit der ältesten Version.

## Migrationspfade

- v4-Pack → [v5-Migrationsleitfaden](v5.md)
- v3-Pack → [v4](v4.md) → [v5](v5.md)
- v2-Pack → [v3](v3.md) → [v4](v4.md) → [v5](v5.md)
- v1-Pack → [v2](v2.md) → [v3](v3.md) → [v4](v4.md) → [v5](v5.md)

Die aktuelle API steht in der [API-Referenz](../api/).
