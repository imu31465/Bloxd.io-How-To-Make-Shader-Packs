# Unerreichbare Looks (die Realismus-„Decke")



| Look | Grund |
|---|---|
| Pixelgenaue Shadowmaps (mit der Sonne rotierende Schatten, Penumbra) | Tiefentexturen nicht referenzierbar (`bloxdOpaqueBehind()`, nur in Flüssigkeiten, liefert nur Geometrieinfo: für Shadowmaps unbrauchbar). Strahlverdeckung kommt nicht in Hooks an |
| SSAO | Kein Szenentiefenzugriff (nur Mesher-gebackene Vertex-AO; Flüssigkeits-Tiefe taugt nicht für SSAO) |
| SSR (Reflexionen) | Keine Szenenfarbe. Nur Pseudo-Looks per Fresnel-Himmelsfarbe |
| Bloom / Glare | Kein Hook ins Post-Processing |
| Tiefenschärfe, chromatische Aberration, Grain | Vollbild-Post-Processing nötig |
| Volumetrisches Licht (God Rays) | Ebenso |
| PBR-Texturen | Textur-Reads verboten. Nur Pseudo-Schätzung aus Farbluminanz |
| Unterwasser-Refraktion | Keine Szenenfarbe. Aber Flüssigkeits-Tiefe (`bloxdOpaqueBehind()`) ermöglicht Dickenabsorption und Grundprojektion ([Teil VIII](../history/v2.md) R-E) |
| Unterwasser-Schleier (blaue Tönung) entfernen/ändern | Der Schleier ist ein emissives Fullscreen-Quad aus Definitionsfarbe/-alpha des Flüssigkeitsblocks der Kamera, außerhalb der Hook-Pipelines (ganz vorne) gezeichnet: Das Paket kann weder Farbe noch Dichte ändern |
| Direkte Unterwasser-Erkennung | Kein Feld zeigt Kamera-Untertauchen; fogStart / fogEnd / fogColour ändern sich unter Wasser nicht: Auch aus fogVisibility etc. gibt es keine verlässliche Schätzung |

## Die Wahrheit über Schatten — „Baumschatten" gehen

Nur **mit der Sonne rotierende pixelgenaue Shadowmaps** sind in der Tabelle unmöglich. Die Engine berechnet „Schatten" von Anfang an, und das ist `skyLight`. Die mesh-seitige LightEngine läuft mit Minecraft-artigem Algorithmus:

1. **Spalten-Scan**: jede (x,z)-Spalte von oben nach unten durchgehen. Himmelslicht startet bei 15, wird an opaken Blöcken **0** und dimmt beim Absteigen mit `lightFilter` (Luft 1 / Wasser 3 / opak 15)
2. **BFS-Flutfüllung**: seitlich zu 6 Nachbarn expandieren (-1 pro Block) — das weicht Schattenkanten auf. Rohwert unter Radius-r-Verdeckung ist (15-r)/15
3. blockLight (Fackeln etc.) ist separates BFS aus 3 RGB-Kanälen (4bit-gepackt)

`l.skyLight` ist also kein bloßer Helligkeitsparameter, sondern **Voxel-Verdeckungsdaten für „ist von hier Himmel sichtbar" = eine Schattenkarte**. Unterm Baum, unterm Dach und innen ist sie bereits numerisch niedrig und kommt per Vertex-Interpolation geglättet an. Blöcke zu setzen/brechen rechnet sofort neu = **in Echtzeit folgende Schatten**. Vanilla nutzt sie nur „sanft" via `mix(Ambiente, Himmel, skyLight)`.

Die richtigen Werkzeuge sind R9.12s zwei Schritte (**Rohwerte per Lift-Inversion wiederherstellen → per Schwellen-`smoothstep` binarisieren**. `th = 1 - r/15` wählt direkt den „als Schatten zählenden Verdeckungsradius") plus **direkte Sonne per Sky gaten** (Sonne erreicht nur sichtbaren Himmel = Essenz der Projektion), mit warmer Sonne- / kalter Schatten-Tönung.

**Ehrliche Limits**: Diese Schatten basieren auf „Himmel nach oben" und **rotieren daher nicht mit der Sonne**. Auflösung ist pro Block (weiche Kanten kommen aus der BFS-Streuung). Das Licht-Template enthält noch einen geschlossenen `var shadow: f32 = 1.;`-Stub für Shadowmaps (immer 1.0 = deaktiviert) — als Spur „geplanter" pixelgenauer Rotationsschatten gedeutet. Sind diese unbedingt nötig, bleiben nur API-ferne Wege (z. B. GLSL-Injektion per Userscript, mit Policy-Risiko).

## Unterwasser-Realität

Unterwasser-Looks bestehen aus 3 Schichten:

| Schicht | Inhalt | Aus Paketen operierbar? |
|---|---|---|
| ① Terrain-/Flüssigkeits-Rendering | Per Hooks verarbeitbar. Light-Hooks laufen unter Wasser normal | Ja (wirkt „unterm Schleier") |
| ② Flüssigkeitsdefinitions-Schleier | Emissives Fullscreen-Quad aus Definitionsfarbe/-alpha des Flüssigkeitsblocks der Kamera, ganz vorne gezeichnet. Die Spieleinstellung `cameraTint` gewinnt, falls gesetzt | Nein (weder Farbe noch Dichte änderbar) |
| ③ cameraTint | Spieleinstellung | Nein |

Praktische Punkte: Pakete wirken auch unter Wasser weiter / der Schleier ist nicht entfernbar / unter Wasser ist keine Verzweigung möglich (fogStart / fogEnd / fogColour ändern sich unter Wasser nicht: fogVisibility erkennt es auch nicht).
