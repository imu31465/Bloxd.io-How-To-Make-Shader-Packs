# Überblick & Voraussetzungen

## Was ein Shader Pack ist

Ein Bloxd.io-Shader-Pack verändert nur das Aussehen des **WebGPU-Renderers** des Spiels. Pakete werden in einer **beschränkten Teilmenge von WGSL** geschrieben und aus den In-Game-Einstellungen → dem Shader-Pack-Bildschirm als Zip oder Ordner geladen. Während ein Paket installiert ist, ist der WebGPU-Renderer in den Einstellungen zwangsweise aktiviert.

Der Pack-Code wird als WGSL validiert und kompiliert. WGSL in einem Pack kann weder JavaScript ausführen noch Netzwerkanfragen senden.

## Was du ändern kannst

Ein Paket dockt an die **3-stufige Flächen-Pipeline** des Renderers an. Die Render-Ziele teilen sich in drei Programme mit insgesamt **9 Hooks**:

| Ziel | Hooks (Vertex / Surface / Light) | Was gezeichnet wird |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | alle Blöcke außer Wasser und Block-Modellen |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | Wasser |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | Block-Modelle (Stufen, Treppen, Pflanzen), Items, Spieler, Mobs, NPCs, Rüstung, Kosmetik |

- **Möglich**: Farben, Transparenz und Emission ändern; Beleuchtung neu aufbauen ([Beleuchtungs-API](../api/lighting.md)); die von der Engine berechneten Sonnen- und Mondschatten nutzen (`bloxdShadow()`, `bloxdAirShadow(t)`, `bloxdShadowDirection()`); voxelbasierte Himmelsabschattung (`skyLight`) verwenden; Texturen mit `bloxdTexel` sampeln; Effekte pro Modell mit `flags` erstellen; Vertices in allow-Spielen animieren
- **Nicht möglich**: eigene Texturen hinzufügen (dafür ist das Texturpack-System zuständig); Post-Processing auf das fertige Bild anwenden (Bloom usw.); auf Shadowmap-Tiefendaten zugreifen oder eine eigene Shadowmap erzeugen; echte Reflexionen (SSR) ergänzen; Himmel, Wolken oder die Sonnenscheibe selbst verändern
- **Die passende Schattenmethode wählen**: Für Schatten, die Sonne und Mond folgen, verwende `bloxdShadow()`. `skyLight` ist eine ältere Methode, um Bereiche unter Bäumen und Dächern abzudunkeln; sie folgt nicht der Sonne oder dem Mond. Siehe [Schatten](../guides/shadows.md).

## strict- und allow-Modi

Jedes Spiel hat eine Shader-Pack-Policy (`shaderPackPolicy`), und **die meisten Spiele laufen im strict-Modus** (keine Vertex-Animation, kein `discard`). Pakete für den allgemeinen Vertrieb müssen im strict-Modus funktionieren. Siehe [Varianten](variants.md) und die [Policy-Referenz](../internals/policy.md).

## Annahmen dieser Dokumentation

- Das aktuelle Spiel akzeptiert nur `apiVersion: 5`-Pakete; v1–v4-Pakete werden beim Laden abgelehnt (gespeicherte Pakete werden still deaktiviert — [Kompatibilität](../api/compatibility.md))
- Du migrierst ein Paket, das für eine ältere Version geschrieben wurde? Siehe [Versionsgeschichte](../history/)
