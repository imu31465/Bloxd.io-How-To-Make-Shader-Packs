# Überblick & Voraussetzungen

> Ziel-API: 5 · Ziel-Build: `v98qt8` (2026-11-08, Produktion und Preprod) · Status: Verified

## Was ein Shader Pack ist

Ein Bloxd.io-Shader-Pack verändert nur das Aussehen des **WebGPU-Renderers** des Spiels. Pakete werden in einer **beschränkten Teilmenge von WGSL** geschrieben und aus den In-Game-Einstellungen → dem Shader-Pack-Bildschirm als Zip oder Ordner geladen. Während ein Paket installiert ist, ist der WebGPU-Renderer in den Einstellungen zwangsweise aktiviert.

Pakete werden als reines WGSL validiert und kompiliert — keine JavaScript-Ausführung, kein Netzwerk. Mit normalem Code kann nichts Gefährliches passieren.

## Was du ändern kannst

Ein Paket dockt an die **3-stufige Flächen-Pipeline** des Renderers an. Die Render-Ziele teilen sich in drei Programme mit insgesamt **9 Hooks**:

| Ziel | Hooks (Vertex / Surface / Light) | Was gezeichnet wird |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | alle Blöcke außer Wasser und Block-Modellen |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | Wasser |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | Block-Modelle (Stufen, Treppen, Pflanzen), Items, Spieler, Mobs, NPCs, Rüstung, Kosmetik |

- **Möglich**: Farben, Transparenz und Emission ändern; Beleuchtung neu aufbauen (die [Beleuchtungs-API](../api/lighting.md)); projektionsartige Schatten (über `skyLight`); Texturen sampeln (`bloxdTexel` — Lesen des bestehenden Block-Textur-Atlas); Effekte pro Modell (`flags` sagen dir „das ist ein gehaltenes Item“, „das ist ein Spieler“); Vertex-Animation (nur allow-Spiele)
- **Nicht möglich**: eigene Texturen hinzufügen (das ist Aufgabe des Texturpack-Systems); Post-Processing (Bloom etc.); Shadow-Map-Schatten, die mit der Sonne rotieren; echte Reflexionen (SSR); Himmel, Wolken oder die Sonnenscheibe selbst anfassen
- **Leicht zu übersehen, aber stark**: **projektionsartige Schatten über `skyLight` (Voxel-Himmels-Okklusion)** — Flächen unter Bäumen und Dächern klar abdunkeln. Blöcke abzubauen lässt die LightEngine sofort neu rechnen, Schatten folgen also in Echtzeit

## strict- und allow-Modi

Jedes Spiel hat eine Shader-Pack-Policy (`shaderPackPolicy`), und **die meisten Spiele laufen im strict-Modus** (keine Vertex-Animation, kein `discard`). Pakete für den allgemeinen Vertrieb müssen im strict-Modus funktionieren. Siehe [Varianten](variants.md) und die [Policy-Referenz](../internals/policy.md).

## Annahmen dieser Dokumentation

- Das aktuelle Spiel akzeptiert nur `apiVersion: 5`-Pakete; v1–v4-Pakete werden beim Laden abgelehnt (gespeicherte Pakete werden still deaktiviert — [Kompatibilität](../api/compatibility.md))
- Du migrierst ein Paket, das für eine ältere Version geschrieben wurde? Siehe [Versionsgeschichte](../history/)
- Engine-Interna können sich mit Updates ändern, daher nennt jede Seite ihren Ziel-Build
