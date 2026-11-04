# Kompatibilität

> Ziel-API: 5 · Ziel-Build: `ab90qa` (2026-11-04, Produktion) · Status: Verified

Wie das aktuelle Spiel und Pakete alter Versionen zusammenwirken.

## Akzeptierte Versionen

**Nur `apiVersion: 5`.** Der Loader vergleicht `manifest.apiVersion !== 5` strikt, und v1/v2/v3/v4-Pakete **scheitern im Augenblick des Ladens**. Eine Multi-Version-Akzeptanz existiert nicht.

## Meldungen zur Ladezeit (wortwörtlich aus dem Live-i18n-Wörterbuch)

- `pack.json needs "apiVersion": {{version}}.` — der Schlüssel `apiVersion` fehlt
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — der Schlüssel existiert, ist aber nicht 5

## Gespeicherte alte Pakete (keine Ausnahmen — stille Deaktivierung)

Zuvor gespeicherte v1–v4-Pakete werfen keine Exception. Das Saved-Pack-Ergebnis wird zu:

```
{kind: "none", reason: "otherApiVersion"}
```

und das Paket wird **still deaktiviert**. Nur der Shader-Pack-Einstellungen-Tab erklärt den Grund:

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

## Der Charakter der v4→v5-Konvertierung

Die Konvertierung ist größtenteils mechanisch (vollständige Checkliste im [v5-Migrationsleitfaden](../history/v5.md)):

- `blockFlags & bloxdBlockFlagX != 0u` → `flags.x` (eine 1:1-Umbenennung)
- `#ifdef BLOXD_LIGHTING` → `if (bloxdLit()) { ... } else { return bloxdDefaultLight(...); }`
- `bloxdFragmentBlockPosition`-Aufrufstellen kompilieren weiterhin (die Engine injiziert die Funktion), sind aber jetzt undokumentiert — davon wegzumigrieren ist der sichere Weg ([Funktionen](functions.md#bloxdfragmentblockposition--undokumentiert-aber-weiterhin-injiziert))
- `pack.json` auf `"apiVersion": 5` anheben

Die stille Falle ist diesmal eine andere: Pakete, die weiterhin `blockFlags` lesen oder Light-Hooks in `#ifdef BLOXD_LIGHTING` verpacken, **scheitern mit eigenen Meldungen an der Validierung** (der Analyzer erklärt inzwischen beide Fälle) — nichts verhält sich also still falsch; sie bleiben bis zur Migration schlicht abgelehnt.

## Re-Validierung gespeicherter Pakete („muss erneut geprüft werden“)

`HEADER_VERSION` ist `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` (die führende Ganzzahl stieg von der 8 in v4 auf 9). Wenn sich der Engine-Header oder die Textur-Registry ändert (bei Spiel-Updates üblich), werden gespeicherte Pakete als „muss erneut geprüft werden“ markiert und beim Seitenladen automatisch neu validiert.

Ein gemessenes Beispiel für Registry-Bewegung (zwei Builds, 10 Tage auseinander): Einträge 1200 → 1219 (98 hinzugekommen, 79 entfernt), und von den Namen, die ihre Schreibweise behielten, **änderten 779 von 1121 die id**. Mit anderen Worten:

- **Pakete, die mit Namen geschrieben sind (`bloxdTextureIdLava`), überstehen den Drift** (der Loader löst sie gegen die Live-Registry neu auf)
- **Pakete, die mit rohen ids (`19`) geschrieben sind, brechen bei der Re-Validierung**

Details: [Engine-Interna: Textur-Registry](../internals/texture-registry.md).

## Laufzeitumgebungen

- **Nur WebGPU-Renderer**: Das Installieren eines Pakets erzwingt den WebGPU-Renderer
- **Mobil**: In WebGPU-beschränkten Umgebungen laufen Pakete gar nicht ([Voraussetzungen](../getting-started/requirements.md))
- **Nicht-Atlas-Renderer-Konfigurationen**: `bloxdTexel` / `bloxdTextureSize` fallen auf Stubs zurück (weiße Texel, 1×1); der Code kompiliert und läuft weiterhin ([Textur-API](texture-api.md#wohin-die-textur-api-nicht-gehen-kann))

## Zusammenfassung der Versionsunterstützung

| API-Version | Live seit | Behandlung durch das aktuelle Spiel |
|---|---|---|
| v1 | — | beim Laden abgelehnt (Migration via [v2](../history/v2.md)) |
| v2 | — | beim Laden abgelehnt |
| v3 | 2026-10-19 | beim Laden abgelehnt |
| v4 | 2026-10-26 | beim Laden abgelehnt |
| **v5** | **2026-11-03** | **aktuell** |

## Verwandte Seiten

- [v5-Migrationscheckliste](../history/v5.md) · [Versionsgeschichte](../history/)
