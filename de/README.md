# Bloxd.io Shader-Pack-Dokumentation

Ein inoffizielles Handbuch zu Shader Packs für den Bloxd.io-WebGPU-Renderer — von Erstellung, Implementierung, Validierung und Vertrieb bis zur API-Spezifikation und Engine-Interna-Forschung.

## Aktueller Stand

- Aktuelle API: **5** (`pack.json` muss `apiVersion: 5` deklarieren)
- Ziel: WebGPU-Renderer
- Zuletzt verifiziert: 2026-11-05
- Ziel-Build: `v98qt8.main.62d8d238.js` (Produktion und Preprod, verifiziert am 2026-11-08, byte-identisches Bundle, md5 `7458fd47ff88331d9f451d1456ff48ac` — Registry, Header, Hooks, Limits neu vermessen)
- Shader-Hooks: 9 (Terrain / Liquid / Model × Vertex / Surface / Light)

Neu bei Shader Packs? Beginne mit [Erste Schritte](getting-started/). API nachschlagen? Siehe [API-Referenz](api/).

> Diese Dokumentation ist keine offizielle Ressource der Spieleentwickler. Engine-Interna können sich mit Updates ändern — prüfe den Ziel-Build und den Verifikationsstatus, die auf jeder Seite vermerkt sind.
>
> Dieses Handbuch wurde mit KI-Unterstützung erstellt; Genauigkeit wird nicht garantiert. Verifiziere am tatsächlichen In-Game-Verhalten. Rezepte weiterhin gegen den Loader-Bildschirm und die In-Game-Kompilierung prüfen.
>
> Die Shader-Pack-Funktion selbst ist ein offizielles Feature, erreichbar aus der In-Game-UI, und Packs sind reines WGSL (keine JS-Ausführung, kein Netzwerk) — mit normalem Code passiert nichts Gefährliches.

## Einstiege nach Ziel

| Ziel | Kategorie | Publikum |
|---|---|---|
| Das erste Shader Pack bauen | [Erste Schritte](getting-started/) | Einsteiger |
| API-Funktionen & Felder nachschlagen | [API-Referenz](api/) | Autoren mitten in der Umsetzung |
| Einen Effekt umsetzen (Licht, Wasser, Modelle…) | [Leitfäden](guides/) · [Rezepte](recipes/) | alle, die einen Look bauen |
| Einen Fehler beheben | [Fehlerbehebung](troubleshooting/) | alle mit kaputtem Paket |
| Engine-Interna erforschen | [Engine-Interna & Forschung](internals/) | Engine-Analytiker |
| Ältere Versionen nachschlagen (v1–v5) | [Versionsgeschichte](history/) | Migratoren alter Packs |

## Dokumentationsstruktur

- **[Erste Schritte](getting-started/)** — Überblick, Quick Start, Pack-Struktur, pack.json, die 9 Hooks, Varianten, Validierung, Vertrieb. Ein durchgängiges Tutorial bis zum ersten Paket.
- **[API-Referenz](api/)** — die systematische v5-Spezifikation: Hooks, Flags, Ein-/Ausgabe-Strukturen, alle Funktionen, Beleuchtung, Textur-API, Konstanten, Präprozessor, Einschränkungen, Kompatibilität und der 911-Namen-Texturkatalog.
- **[Leitfäden](guides/)** — wie Beleuchtung funktioniert, Schatten, Wasser, Nacht, Modell-Rendering, Performance, Realismus-Konzepte.
- **[Rezepte](recipes/)** — zielgerichtete Codebeispiele: Farben, Beleuchtung, Emission, Koordinaten, Animation, Flüssigkeiten, Vertices, Mathematik, Realismus, Modell-Shader, Enchant-Effekte.
- **[Fehlerbehebung](troubleshooting/)** — symptomgetriebene Fehlerlösung: Laden, API-Version, Kompilierung, Validierung, Varianten, visuell, Texturen, Beleuchtung, Modelle, Performance.
- **[Engine-Interna & Forschung](internals/)** — Rendering-Pipeline, Hook-Aufruf, Engine-Header, Validierungs- & Kompilierungs-Interna, reservierte Bezeichner, Beleuchtungs-/Fog-Interna, Textur-Sampling & Registry, Modell-Rendering, Messdaten.
- **[Versionsgeschichte](history/)** — v1 bis v5: Änderungen je Version, Migrationsschritte, entfernte APIs.

## Verifikationsstatus

Jede Seite nennt ihre Ziel-API-Version, ihren Build, das Datum der letzten Verifikation und ihren Status.

| Label | Bedeutung |
|---|---|
| Verified | auf dem Gerät / am Ziel-Build verifiziert |
| Analyzed | per Analyse der internen Implementierung bestätigt |
| Partially Verified | nur teilweise bestätigt |
| Experimental | experimentell / ungeklärt |
| Historical | Material zu einer vergangenen Version |

Rohe engine-extrahierte Daten (Header, Registry, Messungen) leben in den [Engine-Interna](internals/); die Methodik und die Logs dahinter werden im [Forschungslog](internals/research-log.md) festgehalten.
