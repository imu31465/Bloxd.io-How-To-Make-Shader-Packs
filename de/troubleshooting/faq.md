# FAQ & rechtliche Hinweise

> Ziel-API: 5 · Ziel-Build: `xkg8x` (2026-11-04, Produktion) · Status: Verified

## Häufig gestellte Fragen

### F. Sind Shader Packs ein offizielles Feature?

Die Shader-Pack-Funktion ist aus der In-Game-UI erreichbar, und Pakete-Bauen erscheint als beabsichtigte Aktivität. Eine öffentliche offizielle Dokumentation wurde allerdings nicht gefunden — dieses Handbuch ist ein inoffizielles, analysebasiertes Dokument.

### F. Können Pakete etwas Gefährliches tun?

Pakete sind reines WGSL — **JS-Ausführung und Netzwerkzugriff sind konstruktionsbedingt unmöglich**. Es läuft nur Code, der Validierung und Kompilierung besteht ([Einschränkungen](../api/restrictions.md)).

### F. In welchen Spielen funktionieren Pakete?

Die meisten Spiele laufen im strict-Modus (keine Vertex-Animation, kein `discard`). Vertex-Animation funktioniert nur in allow-gelisteten Spielen. Die Liste pro Titel steht in [Engine-Interna: Policy](../internals/policy.md).

### F. Funktionieren Pakete auf Mobil?

Nur in WebGPU-fähigen Umgebungen ([Voraussetzungen](../getting-started/requirements.md)).

### F. Kann ich eigene Texturen ausliefern?

Nicht in einem Shader Pack (der Atlas ist read-only). Das ist Aufgabe des Texturpack-Systems ([Kombinationen](../guides/combinations.md)).

### F. Kann ich ein Paket alter Version weiter benutzen?

Das aktuelle Spiel akzeptiert nur `apiVersion: 5`; ältere Pakete werden still deaktiviert ([Kompatibilität](../api/compatibility.md)). Migration über die [Versionsgeschichte](../history/).

### F. Ändert sich die API nochmal?

Engine-Interna können sich mit Updates ändern — jede Seite nennt ihren Ziel-Build. Gespeicherte Pakete revalidieren automatisch, wenn sich Header oder Registry ändern ([Kompatibilität](../api/compatibility.md#re-validierung-gespeicherter-pakete-muss-erneut-geprüft-werden)).

### F. Was ist mit „Cinematic-Shader“-Distributionen?

Eine von uns analysierte Community-„Cinematic-Shader“-Distribution entpuppte sich als Texturpack (128×128-Texturen, kein `pack.json` / `.wgsl`). Die meisten „schattig shader-artigen“ Looks sind texturseitiges Handwerk ([Kombinationen](../guides/combinations.md)).

## Rechtliches & Hinweise

- Dies ist ein inoffizielles Handbuch und vertritt nicht die Sicht der Entwickler. Die API kann sich ohne Ankündigung ändern
- Mit KI-Unterstützung erstellt; Genauigkeit wird nicht garantiert. Am tatsächlichen In-Game-Verhalten verifizieren
- Messwerte (Textur-ids etc.) sind Momentaufnahmen spezifischer Builds und ändern sich zwischen Builds ([Namen sind die API](../api/texture-catalog.md#gemessener-drift-cnty9--ab90qa))

## Verwandte Seiten

- [Einstieg der Dokumentation](../) · [Versionsgeschichte](../history/)
