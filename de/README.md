# Bloxd.io-Shader-Pakete erstellen (Komplette Anleitung)

Eigenständige Anleitung zum Erstellen und Verteilen von Shader-Paketen für Bloxd.io (nur WebGPU-Renderer).
Basierend auf der Spezifikation von `apiVersion: 2`. Die Anleitung ist pro Teil in eine eigene Datei aufgeteilt (dieses README ist das Inhaltsverzeichnis; die Rezeptsammlung liegt in `recipes.md`). V1-Pakete laden im aktuellen Spiel nicht (der v1-`apiVersion`-Wert und alte Bezeichner werden abgelehnt). Zur Migration von v1 siehe Teil VIII (`apiv2.md`).

> Dies ist eine inoffizielle Anleitung und gibt nicht die Sicht der Entwickler wieder. Die API kann sich ohne Ankündigung ändern.  
> Zuletzt geprüft: 2026-10-15 (Fog-Anwendungsreihenfolge, echte Fog-Einstellungen und Unterwasser-Rendering gegen die Implementierung verifiziert). Da keine öffentliche offizielle WGSL-API-Referenz gefunden werden konnte, prüfe Beschreibungen und Rezepte weiter anhand des Ladebildschirms und der Kompilierung im Spiel.  
> Die Shader-Paket-Funktion ist eine offizielle Funktion aus der Spieloberfläche, und Pakete sind reines WGSL  
> (keine JS-Ausführung, kein Netzwerk) – mit normalem Code passiert also nichts Gefährliches.  
> Dieser Leitfaden wurde mit KI-Unterstützung erstellt; Korrektheit ist nicht garantiert. Prüfe am tatsächlichen Spielverhalten.

## Inhalt

- [Teil I: Pakete erstellen](making.md)
- [Teil II: API-Referenz](api.md)
- [Teil III: Rezeptsammlung](recipes.md)
- [Teil IV: Realismus-Leitfaden](realism.md)
- [Teil V: Fehlersuche & Hinweise](troubleshooting.md)
- [Teil VI: Wichtige Umsetzungshinweise](implementation.md)
- [Teil VII: Interna-Ergänzung](internals.md)
- [Teil VIII: Migrationsleitfaden für API Version 2](apiv2.md)
