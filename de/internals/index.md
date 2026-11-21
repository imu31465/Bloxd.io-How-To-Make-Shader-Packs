# Interne Abläufe der Engine

Diese Kategorie erläutert das interne Verhalten der Engine, damit sich die Ausführung von Shader-Packs besser verstehen lässt. Diese Implementierungsdetails können sich ändern; stabile Nutzungsregeln und verfügbare APIs stehen in der [API-Referenz](../api/).

## Übersicht

| Seite | Inhalt |
|---|---|
| [Rendering-Pipeline](rendering-pipeline.md) | alphaTest-Position, 2-Licht-Setup, Uniform-Realität, Greedy Meshing |
| [Hook-Aufruf](hook-invocation.md) | wie Hooks in den WGSL-Code der Engine eingefügt werden |
| [Engine-Header](engine-header.md) | WGSL-Deklarationen, die Shader-Packs vorangestellt werden |
| [Shader-Validierung](shader-validation.md) | interne Abläufe des Analysators, die Signaturentabelle, HEADER_VERSION |
| [WGSL-Kompilierung](wgsl-compilation.md) | die echte Stufe-2-Kompilierung und Validierungs-Stubs |
| [Reservierte Bezeichner](reserved-identifiers.md) | die 46 `bloxdSp*`-Symbole |
| [interne Beleuchtungsabläufe](lighting-internals.md) | blockLight / heldLight-Struktur |
| [Nebelverarbeitung](fog-internals.md) | rein linear mit einem 32 Blöcke breiten Übergangsbereich |
| [Textur-Sampling](texture-sampling.md) | die Textur-Codegenerierung für drei Varianten |
| [Textur-Registry](texture-registry.md) | Namensauflösung sowie Animations- und Rotationsnamen |
| [Model-Rendering](model-rendering.md) | das v5-Model-Programm |
| [Engine-Daten](engine-data.md) | API-v5-Funktionen und Pack-Grenzen |
| [Testfaktoren](testing-factors.md) | welche Welt-/Spielereinstellungen paket-sichtbare Werte ändern |
| [Policy](policy.md) | shaderPackPolicy — die 12 allow-Titel |
| [Sonne & Mond](sun-and-moon.md) | was bloxdSunDirection speist |
| [Debugging](debugging.md) | URL-Parameter, Statistik-Panels |


Interne Implementierungsdetails sind kein stabiler API-Vertrag. Beim Erstellen von Packs hat die [API-Referenz](../api/) Vorrang.
