# Bloxd.io Shader-Pack-Dokumentation

Ein inoffizielles Handbuch zu Shader Packs für den Bloxd.io-WebGPU-Renderer — von Erstellung, Implementierung, Validierung und Vertrieb bis zur API-Spezifikation und Engine-Interna.

## Aktueller Stand

- Aktuelle API: **5** (`pack.json` muss `apiVersion: 5` deklarieren)
- Ziel: WebGPU-Renderer
- Zuletzt verifiziert: 2026-11-03
- Ziel-Build: `ab90qa.main.6188124c.js` (Produktion und Preprod identisch — per md5 `fc3322212d15be2445c0e8df9733fcc` verifiziert)
- Shader-Hooks: 9 (Terrain / Liquid / Model × Vertex / Surface / Light)

Neu bei Shader Packs? Beginne mit [Getting Started](getting-started/) (Englisch). API nachschlagen? Siehe [API Reference](api/) (Englisch).

> Diese Dokumentation ist keine offizielle Ressource der Spieleentwickler. Engine-Interna können sich mit Updates ändern — prüfe den Ziel-Build und den Verifikationsstatus auf jeder Seite.
>
> Dieses Handbuch wurde mit KI-Unterstützung erstellt; Genauigkeit wird nicht garantiert. Verifiziere am tatsächlichen In-Game-Verhalten.
>
> Die Shader-Pack-Funktion selbst ist ein offizielles Feature der In-Game-UI; Packs sind reines WGSL (keine JS-Ausführung, kein Netzwerk) — mit normalem Code passiert nichts Gefährliches.

## Einstiege nach Ziel

| Ziel | Kategorie | Publikum |
|---|---|---|
| Das erste Shader Pack bauen | [Getting Started](getting-started/) | Einsteiger |
| API-Funktionen & Felder nachschlagen | [API Reference](api/) | Autoren mitten in der Umsetzung |
| Einen Effekt umsetzen (Licht, Wasser, Modelle…) | [Guides & Recipes](guides/) | alle, die ein Look bauen |
| Einen Fehler beheben | [Troubleshooting](troubleshooting/) | alle mit kaputtem Pack |
| Engine-Interna erforschen | [Engine Internals & Research](internals/) | Engine-Analytiker |
| Ältere Versionen nachschlagen (v1–v5) | [Version History](history/) | Migratoren alter Packs |

## Dokumentationsstruktur

- **[Getting Started](getting-started/)** — Überblick, Quick Start, Pack-Struktur, pack.json, die 9 Hooks, Varianten, Validierung, Vertrieb.
- **[API Reference](api/)** — die systematische v5-Spezifikation: Hooks, Flags, Ein-/Ausgabe-Strukturen, alle Funktionen, Lighting, Textur-API, Konstanten, Präprozessor, Einschränkungen, Kompatibilität und der 896-Namen-Texturkatalog.
- **[Guides](guides/)** · **[Recipes](recipes/)** · **[Troubleshooting](troubleshooting/)** · **[Engine Internals & Research](internals/)** · **[Version History](history/)**

> Hinweis: Getting Started / API Reference / Troubleshooting sowie die in v5 neu hinzugefügten Seiten von Guides, Recipes und Internals werden derzeit **auf Englisch** angeboten (gleiche Struktur wie die übersetzten Seiten dieser Ausgabe). Die bereits übersetzten Inhalte bleiben vollständig erhalten.

## Verifikationsstatus

| Label | Bedeutung |
|---|---|
| Verified | am Ziel-Build verifiziert |
| Analyzed | per Analyse der Interna bestätigt |
| Partially Verified | nur teilweise bestätigt |
| Experimental | experimentell |
| Historical | Material zu einer alten Version |
