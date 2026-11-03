# Versionsgeschichte

> Status: Historical — Aufzeichnungen je Version; jeder Leitfaden nennt seinen eigenen Ziel-Build

Änderungen, Migrationsschritte und entfernte APIs für v1 bis v5. Für die Migration alter Pakete und für die bewahrten Spezifikationen der jeweiligen Ära.

## Zeitstrahl

| Version | Live seit | Leitfaden | Highlights |
|---|---|---|---|
| v1 | (anfänglich) | [v1](v1.md) | erste Shader-Pack-API. 6 Hooks (Terrain/Liquid × Vertex/Surface); Vokabular `bloxdTime` / `bloxdOriginOffset` / `bloxdFaceBlock` / `engineColour` / `fogFactor` |
| v2 | — | [v2](v2.md) | vollständige Bezeichner-Umbenennung, `blockId`, `BLOXD_SCENE_DEPTH` und `bloxdOpaqueBehind()` |
| v3 | 2026-10-19 | [v3](v3.md) | `blockId` → `blockFlags`-Bitflags, `bloxdPi` / `bloxdTau`, offizielle Liquid-Hooks, Hook-Aufruf-Interna |
| v4 | 2026-10-26 | [v4](v4.md) | Textur-API (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`), der strict-Vertrag, Engine-Header- & Registry-Analyse |
| **v5** | **2026-11-03** | [v5](v5.md) | **aktuell** — `BloxdFlags`-Struktur (14 Bools), Model-Hooks (9 gesamt), die Beleuchtungs-API `bloxdLit()` / `bloxdLitColour()`, `localPosition`, Enchant-/Overlay-Ein- & -Ausgaben, 6 Varianten |

## Das gemeinsame Vorwort

Das aktuelle Spiel akzeptiert nur `apiVersion: 5`, und **Pakete alter Versionen scheitern im Augenblick des Ladens** (gespeicherte Pakete werden still deaktiviert — [Kompatibilität](../api/compatibility.md)). Jeder Leitfaden deckt „vorherige → nächste“ ab. Mehrere Versionen überspringen? Älteste zuerst anwenden.

## Schnellweg zu einer Checkliste

- v4-Paket → [v5-Leitfaden](v5.md) §77 (größtenteils mechanisch)
- v3-Paket → [v4](v4.md) §61 → [v5](v5.md) §77
- v2-Paket → [v3](v3.md) §47 → v4 → v5
- v1-Paket → bei [v2](v2.md) §37 beginnen

> Für die aktuelle Spezifikation selbst siehe [API-Referenz](../api/); für Interna des aktuellen Builds siehe [Engine-Interna](../internals/).
