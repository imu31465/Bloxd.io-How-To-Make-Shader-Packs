# API-Versionsfehler

> Ziel-API: 5 · Ziel-Build: `bny9u` (2026-11-05, Produktion) · Status: Verified (wortwörtlich aus dem Live-i18n-Wörterbuch)

Fehler rund um `apiVersion`. Das aktuelle Spiel akzeptiert **nur `5`**.

## „pack.json needs "apiVersion": {{version}}."

- **Symptom**: diese Meldung direkt nach dem Laden (`loadNoApiVersion`)
- **Ursache**: der Schlüssel `apiVersion` fehlt vollständig
- **Fix**: `"apiVersion": 5` hinzufügen — eine **Zahl** (der String `"5"` scheitert)
- **Vorbeugen**: von der [pack.json](../getting-started/manifest.md)-Vorlage ausgehen

## „This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}."

- **Symptom**: `loadWrongApiVersion`
- **Ursache**: `apiVersion` existiert, ist aber nicht 5 (ein v1–v4-Paket)
- **Fix**: die passende Migration anwenden ([Versionsgeschichte](../history/)):
  - v4 → v5: [der v5-Leitfaden](../history/v5.md) — größtenteils mechanisch (flags · `bloxdLit()` · der `bloxdFragmentBlockPosition`-Vorbehalt)
  - v3 → v5: zuerst [v4](../history/v4.md) anwenden
  - v2 oder früher → v5: über v3 → v4 → v5 durchsteigen
- **Vorbeugen**: nach jedem API-Update [Kompatibilität](../api/compatibility.md) und den passenden Migrationsleitfaden prüfen

## Der String „5“ wird abgelehnt

- **Ursache**: der Loader vergleicht `manifest.apiVersion !== 5` **strikt** (`===`); ein JSON-String `"5"` ist nicht die Zahl 5
- **Fix**: `"apiVersion": 5` (unquoted)

## Ein gespeichertes altes Paket hat still aufgehört zu funktionieren

- **Symptom**: ein zuvor funktionierendes v1–v4-Paket reagiert nicht, ohne Exception
- **Ursache**: gespeicherte Pakete werden zu `{kind: "none", reason: "otherApiVersion"}` aufgelöst und **still deaktiviert**
- **Prüfen**: die Statuszeile im Einstellungen-Tab: `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`
- **Fix**: einen migrierten Ersatz vom selben Bildschirm laden
- **Vorbeugen**: nach API-Updates eine angehobene Version neu veröffentlichen und ankündigen ([Vertrieb](../getting-started/distribution.md))

## Ein migriertes v4-Paket scheitert an der Validierung

Die drei typischen Muster (vollständige Schritte im [v5-Migrationsleitfaden](../history/v5.md)):

| Validierungsmeldung | Ursache | Fix |
|---|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | `#ifdef BLOXD_LIGHTING`-Verwendung | als `if (bloxdLit()) { ... } else { return bloxdDefaultLight(s, l); }` umschreiben |
| `bloxdBlockFlagRock isn't part of the shader pack API...` (Reserved-Name-Diagnose) | übrig gebliebene Bitkonstanten-Referenzen | `surface.flags.rock` etc. benutzen (1:1-Tabelle in [Flags](../api/flags.md)) |
| `bloxdFragmentBlockPosition` fehlt | seit v5 aus dem dokumentierten Header (weiterhin injiziert und akzeptiert — siehe [Funktionen](../api/functions.md)) | kein zu behebender Fehler: es kompiliert; in neuem Code `flags` / `bloxdWorldPosition()` bevorzugen |

## Verwandte Seiten

- [Kompatibilität](../api/compatibility.md) · [Versionsgeschichte](../history/) · [pack.json](../getting-started/manifest.md)
