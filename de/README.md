# Bloxd.io Shader-Pack-Dokumentation

Ein inoffizieller Leitfaden zu Shader-Packs für den WebGPU-Renderer von Bloxd.io. Er behandelt den gesamten Ablauf – von der Erstellung und Prüfung bis zur API-Referenz und zur Analyse der internen Funktionsweise der Engine.

## Aktueller Stand

- Aktuelle API: **5** (`pack.json` muss `apiVersion: 5` deklarieren)
- Ziel: WebGPU-Renderer
- Shader-Hooks: 9 (Terrain / Liquid / Model × Vertex / Surface / Light)

Du erstellst dein erstes Shader-Pack? Beginne mit [Erste Schritte](getting-started/). Suchst du eine Funktion oder ein Feld? Siehe die [API-Referenz](api/).

> Diese Dokumentation ist keine offizielle Ressource der Spieleentwickler. Engine-Interna sind Implementierungsdetails und können sich mit Updates ändern; für unterstütztes Verhalten ist die API-Referenz maßgeblich.
>
> Dieses Handbuch wurde mit KI-Unterstützung erstellt. Prüfe das Verhalten im Spiel, da sich Implementierungsdetails ändern können.
>
> Shader-Packs bestehen ausschließlich aus WGSL-Code. Sie führen kein JavaScript aus und senden keine Netzwerkanfragen.

## Einstiege nach Ziel

| Ziel | Kategorie | Publikum |
|---|---|---|
| Das erste Shader Pack bauen | [Erste Schritte](getting-started/) | Einsteiger |
| API-Funktionen & Felder nachschlagen | [API-Referenz](api/) | Autoren mitten in der Umsetzung |
| Einen Effekt umsetzen (Licht, Wasser, Modelle…) | [Leitfäden](guides/) · [Rezepte](recipes/) | alle, die einen bestimmten visuellen Stil umsetzen möchten |
| Einen Fehler beheben | [Fehlerbehebung](troubleshooting/) | alle mit nicht funktionierenden Pack |
| Die Funktionsweise der Engine verstehen | [Funktionsweise der Engine](internals/) | technisch Interessierte |
| Ältere Versionen nachschlagen (v1–v5) | [Versionsgeschichte](history/) | Migratoren alter Packs |

## Dokumentationsstruktur

- **[Erste Schritte](getting-started/)** — Überblick, Schnellstart, Pack-Struktur, pack.json, die 9 Hooks, Varianten, Validierung, Veröffentlichung. Ein durchgängiges Tutorial bis zum ersten Paket.
- **[API-Referenz](api/)** — die systematische v5-Spezifikation: Hooks, Flags, Ein-/Ausgabe-Strukturen, alle Funktionen, Beleuchtung, Textur-API, Konstanten, Präprozessor, Einschränkungen, Kompatibilität und der Texturkatalog mit 1.017 Einträgen.
- **[Leitfäden](guides/)** — wie Beleuchtung funktioniert, Schatten, Wasser, Nacht, Modell-Rendering, Performance, Realismus-Konzepte.
- **[Rezepte](recipes/)** — zielgerichtete Codebeispiele: Farben, Beleuchtung, Emission, Koordinaten, Animation, Flüssigkeiten, Vertices, Mathematik, Realismus, Modell-Shader, Enchant-Effekte.
- **[Fehlerbehebung](troubleshooting/)** — symptomgetriebene Fehlerlösung: Laden, API-Version, Kompilierung, Validierung, Varianten, Darstellung, Texturen, Beleuchtung, Modelle, Performance.
- **[Funktionsweise der Engine](internals/)** — Rendering-Pipeline, Hook-Aufruf, Engine-Header, interne Abläufe von Validator und Compiler, reservierte Bezeichner, interne Abläufe von Beleuchtung und Nebel, Textur-Sampling & Registry, Modell-Rendering, Messdaten.
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

Aus der Engine gewonnene Daten (Header, Registry und Messwerte) stehen unter [Funktionsweise der Engine](internals/); die Methodik und die zugehörigen Aufzeichnungen findest du im [Forschungslog](internals/research-log.md).
