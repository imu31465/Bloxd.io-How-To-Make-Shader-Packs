# pack.json (Manifest)

> Ziel-API: 5 · Ziel-Build: `v98qt8` (2026-11-08, Produktion und Preprod) · Status: Verified

`pack.json` ist das Paket-Manifest — exakt ein JSON-Objekt im Zip-Root.

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

## Felder

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `apiVersion` | Zahl | Pflicht | muss **exakt `5` entsprechen** (strikt `===`). Ein String `"5"` oder jeder andere Typ scheitert, gemeldet mit der JSON-Schreibweise |
| `name` | String | Pflicht | nach dem Trimmen nicht leer; wird in der Einstellungen-UI angezeigt |
| `author` | String | optional | darf fehlen; muss, falls vorhanden, ein String sein |

Alle anderen Felder ignoriert der Loader.

## Was bei Versions-Nichtübereinstimmung passiert

Der Loader vergleicht `manifest.apiVersion !== 5` strikt und **scheitert im Augenblick des Ladens**. Meldungen, wortwörtlich aus dem Live-i18n-Wörterbuch:

- `pack.json needs "apiVersion": {{version}}.` — der Schlüssel fehlt vollständig
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — der Schlüssel existiert, ist aber nicht 5

Zuvor gespeicherte ältere Pakete werfen keine Exceptions; sie werden zu `{kind: "none", reason: "otherApiVersion"}` aufgelöst und **still deaktiviert**. Der Shader-Pack-Einstellungen-Tab erklärt den Grund:

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

Für die Migration von v1–v4 siehe [Versionsgeschichte](../history/).
