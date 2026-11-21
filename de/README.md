# Bloxd.io Shader-Pack-Dokumentation

Ein inoffizieller Leitfaden zu Shader-Packs für den WebGPU-Renderer von Bloxd.io. Er behandelt den gesamten Ablauf – von der Erstellung und Prüfung bis zur API-Referenz und zur Analyse der internen Funktionsweise der Engine.

## Aktueller Stand

- Aktuelle API: **5** (`pack.json` muss `apiVersion: 5` deklarieren)
- Ziel: WebGPU-Renderer
- Shader-Hooks: 9 (Terrain / Liquid / Model × Vertex / Surface / Light)

Neu bei Shader Packs? Beginne mit [Erste Schritte](getting-started/). API nachschlagen? Siehe [API-Referenz](api/).

> Diese Dokumentation ist keine offizielle Ressource der Spieleentwickler. Engine-Interna sind Implementierungsdetails und können sich mit Updates ändern; für unterstütztes Verhalten ist die API-Referenz maßgeblich.
>
> Dieses Handbuch wurde mit KI-Unterstützung erstellt; Genauigkeit wird nicht garantiert. Verifiziere am tatsächlichen In-Game-Verhalten. Rezepte weiterhin gegen den Loader-Bildschirm und die In-Game-Kompilierung prüfen.
>
> Shader-Packs bestehen ausschließlich aus WGSL-Code. Sie führen kein JavaScript aus und senden keine Netzwerkanfragen.

## Einstiege nach Ziel

| Ziel | Kategorie | Publikum |
|---|---|---|
| Das erste Shader Pack bauen | [Erste Schritte](getting-started/) | Einsteiger |
| API-Funktionen & Felder nachschlagen | [API-Referenz](api/) | Autoren mitten in der Umsetzung |
| Einen Effekt umsetzen (Licht, Wasser, Modelle…) | [Leitfäden](guides/) · [Rezepte](recipes/) | alle, die einen bestimmten visuellen Stil umsetzen möchten |
| Einen Fehler beheben | [Fehlerbehebung](troubleshooting/) | alle mit nicht funktionierenden Pack |
| Engine-Interna erforschen | [Engine-Interna & Forschung](internals/) | Engine-Analytiker |
| Ältere Versionen nachschlagen (v1–v5) | [Versionsgeschichte](history/) | Migratoren alter Packs |

## Dokumentationsstruktur

- **[Erste Schritte](getting-started/)** — Überblick, Quick Start, Pack-Struktur, pack.json, die 9 Hooks, Varianten, Validierung, Vertrieb. Ein durchgängiges Tutorial bis zum ersten Paket.
- **[API-Referenz](api/)** — die systematische v5-Spezifikation: Hooks, Flags, Ein-/Ausgabe-Strukturen, alle Funktionen, Beleuchtung, Textur-API, Konstanten, Präprozessor, Einschränkungen, Kompatibilität und der Texturkatalog mit 1.017 Einträgen.
- **[Leitfäden](guides/)** — wie Beleuchtung funktioniert, Schatten, Wasser, Nacht, Modell-Rendering, Performance, Realismus-Konzepte.
- **[Rezepte](recipes/)** — zielgerichtete Codebeispiele: Farben, Beleuchtung, Emission, Koordinaten, Animation, Flüssigkeiten, Vertices, Mathematik, Realismus, Modell-Shader, Enchant-Effekte.
- **[Fehlerbehebung](troubleshooting/)** — symptomgetriebene Fehlerlösung: Laden, API-Version, Kompilierung, Validierung, Varianten, visuell, Texturen, Beleuchtung, Modelle, Performance.
- **[Engine-Interna & Forschung](internals/)** — Rendering-Pipeline, Hook-Aufruf, Engine-Header, Validierungs- & Kompilierungs-Interna, reservierte Bezeichner, Beleuchtungs-/Fog-Interna, Textur-Sampling & Registry, Modell-Rendering, Messdaten.
- **[Versionsgeschichte](history/)** — v1 bis v5: Änderungen je Version, Migrationsschritte, entfernte APIs.

## Verifikationsstatus

Jede Seite nennt die abgedeckte API-Version und den Prüfstatus ihrer Angaben.

| Label | Bedeutung |
|---|---|
| Verified | im Spiel überprüft |
| Analyzed | per Analyse der internen Implementierung bestätigt |
| Partially Verified | nur teilweise bestätigt |
| Experimental | experimentell / ungeklärt |
| Historical | Material zu einer vergangenen Version |

Rohe engine-extrahierte Daten (Header, Registry, Messungen) leben in den [Engine-Interna](internals/); die Methodik und die Logs dahinter werden im [Forschungslog](internals/research-log.md) festgehalten.
