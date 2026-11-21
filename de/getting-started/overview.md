# Überblick & Voraussetzungen

> API: 5 · Status: Verified

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

- **Möglich**: Farben, Transparenz und Emission ändern; Beleuchtung anpassen (siehe [Beleuchtungs-API](../api/lighting.md)); Texturen mit `bloxdTexel` sampeln; mit `flags` Effekte je Modell erstellen; Vertices animieren (nur allow-Spiele)
- **Nicht möglich**: eigene Texturen hinzufügen; Post-Processing-Effekte wie Bloom erstellen; eine eigene Shadowmap erzeugen oder auf deren Tiefendaten zugreifen; echte Reflexionen (SSR) erzeugen; oder Himmel, Wolken und Sonnenscheibe selbst schattieren
- **Schatten**: `bloxdShadow()` liefert den von der Engine berechneten Sonnen-/Mondschatten-Faktor. `bloxdShadowDirection()` gibt die Bewegungsrichtung des schattenwerfenden Lichts an. `bloxdAirShadow(t)` wertet einen Punkt zwischen Kamera und Fragment aus. Die ältere voxelbasierte Himmelsabschattung mit `skyLight` bleibt ebenfalls verfügbar ([Schatten-Anleitung](../guides/shadows.md))

## strict- und allow-Modi

Jedes Spiel hat eine Shader-Pack-Policy (`shaderPackPolicy`), und **die meisten Spiele laufen im strict-Modus** (keine Vertex-Animation, kein `discard`). Pakete für den allgemeinen Vertrieb müssen im strict-Modus funktionieren. Siehe [Varianten](variants.md) und die [Policy-Referenz](../internals/policy.md).

## Annahmen dieser Dokumentation

- Das aktuelle Spiel akzeptiert nur `apiVersion: 5`-Pakete; v1–v4-Pakete werden beim Laden abgelehnt (gespeicherte Pakete werden still deaktiviert — [Kompatibilität](../api/compatibility.md))
- Du migrierst ein Paket, das für eine ältere Version geschrieben wurde? Siehe [Versionsgeschichte](../history/)
- Erklärungen zu Engine-Interna dienen als Hintergrundinformation. Für den unterstützten API-Vertrag ist die API-Referenz maßgeblich
