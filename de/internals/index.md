# Engine-Interna & Forschung

Dieser Bereich enthält technische Erkenntnisse aus der Analyse der Spielimplementierung. Interne Abläufe können sich mit Updates ändern und sind kein stabiler API-Vertrag.

## Map

| Seite | Inhalt |
|---|---|
| [Rendering-Pipeline](rendering-pipeline.md) | alphaTest-Position, 2-Licht-Setup, Uniform-Realität, Greedy Meshing |
| [Hook-Aufruf](hook-invocation.md) | wie Hooks in das WGSL der Engine gespleißt werden |
| [Engine-Header](engine-header.md) | der vollständige v5-Header (wortwörtlich, 8.954 B) |
| [Shader-Validierung](shader-validation.md) | Analyzer-Interna, die Signaturentabelle, HEADER_VERSION |
| [WGSL-Kompilierung](wgsl-compilation.md) | die echte Stufe-2-Kompilierung und Validierungs-Stubs |
| [Reservierte Bezeichner](reserved-identifiers.md) | die 46 `bloxdSp*`-Symbole |
| [Beleuchtungs-Interna](lighting-internals.md) | blockLight / heldLight-Struktur |
| [Fog-Interna](fog-internals.md) | nur linear, das 32-Block-Gradientenband |
| [Textur-Sampling](texture-sampling.md) | der 3-Varianten-Textur-Codegen |
| [Textur-Registry](texture-registry.md) | Name→id-Auflösung, 896 Namen, gemessener Drift |
| [Model-Rendering](model-rendering.md) | das v5-Model-Programm |
| [Engine-Daten](engine-data.md) | das v5-Konstanten/Limits/Layout-Hauptbuch |
| [Testfaktoren](testing-factors.md) | welche Welt-/Spielereinstellungen paket-sichtbare Werte ändern |
| [Policy](policy.md) | shaderPackPolicy — die 12 allow-Titel |
| [Sonne & Mond](sun-and-moon.md) | was bloxdSunDirection speist |
| [Debugging](debugging.md) | URL-Parameter, Statistik-Panels |
| [Forschungslog](research-log.md) | Methodik, Build-Historie, unverifizierte Punkte |

Interna sind kein stabiler API-Vertrag — sie können sich mit Engine-Updates ändern, und jede Seite nennt ihren Evidenz-Build ([Forschungslog](research-log.md)).
