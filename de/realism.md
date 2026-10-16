[← Vorheriger Teil](recipes.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](troubleshooting.md)

# Teil IV: Realismus-Leitfaden

## 13. Engine-Standardlicht und Realismus-Spielraum

Das Engine-Standardlicht ist „nur Multiplikation" — kein Specular, Fresnel, Warm-Kalt-Trennung oder Hemisphären-Ambiente existiert. Folgendes lässt sich neu aufbauen:

| Feature | Standard | In Paketen baubar? |
|---|---|---|
| Diffus (Lambert) | Nur skalare Richtlicht-Summe | ◎ Eigen mit `bloxdSunDirection()` (Wrap-Quellen etc.) |
| Specular | Keins | ◎ Blinn-Phong (R9.2) |
| Fresnel | Keins | ◎ Schlick-Näherung (R9.3) |
| Warme Fackel / kaltes Himmelslicht-Trennung | Farblos | ◎ (R9.1) |
| Hemisphären-Ambiente | Richtungslos | ◎ Himmel oben / Boden unten (R9.4) |
| Tonemapping | Keins (nur clamp) | ◎ ACES-Filmic (R9.5) |
| Luftperspektive | Nur Fog (Farbtausch) | ◎ Distanz-Entsättigung (R9.6) |
| Oberflächendetail | Nur Texturauflösung | △ Prozedurales Hash-Mikro-Bump (R9.8) |
| Vertex-Wellen (Wasser) | Keine (flach) | ◎ Nur allow (R7) |
| Wellennormalen / Sonnenglitzer | Keine | ◎ (R9.7) |
| Nachtmondlicht | Himmelsfarbe dunkelt nur ab | △ Mondrichtung liegt in `-bloxdSunDirection()`: Pseudo-Looks (blaues Ambiente in R2 / Entsättigung in R9.11) plus gerichtetes Mondlicht (R-A, nur Tag/Nacht-Zyklus) |
| Schatten (Himmelsverdeckung) | Nur sanftes Mischen via `mix(Ambiente, Himmel, skyLight)` | ◎ Lift-Inversion + Schwellenwert-Schnitt + Sonnen-Gate (R9.12). Baumschatten und Dachschatten fallen klar und folgen Block-Edits in Echtzeit |

## 14. Zwei Umsetzungs-Schulen

**Schule A: additive Fixes (ab defaultLight)** — `engineColour` (fertige Farbe) als Basis nutzen und warmen Glow oder Rim addieren. Leicht und sicher, aber das Lichtmodell bleibt Standard.

**Schule B: totales Relighting (ab s.colour)** — `l.engineColour` verwerfen und Licht aus `s.colour` (Albedo) und rohen LightIn-Materialien neu aufbauen. Der Königsweg zum Realismus. Vier Regeln:

1. **Fog neu anwenden**: Der Light-Hook läuft post-Fog; `mix(l.fogColour, col, l.fogVisibility)` selbst anwenden (R9.10). Bei dichtem Fog mit `max(l.fogVisibility, 0.3)` einen Floor legen. Umgekehrt: mehr Fog-Farbe in engineColour-basierte Pakete zu mischen ergibt weißen Doppel-Fog
2. **Unlit-Fallback**: außerhalb `#ifdef BLOXD_LIGHTING` an `defaultLight` durchreichen
3. **Gemeinsame Funktionen als Ganzes schützen**: gemeinsame Funktionen mit `BloxdLightIn`-Parameter als ganze fn in `#ifdef BLOXD_LIGHTING` packen (nur Aufrufstellen reicht nicht)
4. **Ohne Sonnenrichtung**: Ist `bloxdSunDirection()` null, kein gerichtetes Specular berechnen. `l.directional` ist ein Lichtmengen-Skalar, kein Richtungsvektor: stellt die Highlight-Richtung nicht wieder her. Bei Bedarf auf schwaches richtungsloses Ambiente wechseln. Die Mondrichtung ist via `-bloxdSunDirection()` verfügbar (bewegt sich nur in Welten mit Tag/Nacht-Zyklus. [Teil VII](internals.md) R-A)

## 15. Unerreichbare Looks (die Realismus-„Decke")

| Look | Grund |
|---|---|
| Pixelgenaue Shadowmaps (mit der Sonne rotierende Schatten, Penumbra) | Tiefentexturen nicht referenzierbar (`bloxdOpaqueBehind()`, nur in Flüssigkeiten, liefert nur Geometrieinfo: für Shadowmaps unbrauchbar). Strahlverdeckung kommt nicht in Hooks an |
| SSAO | Kein Szenentiefenzugriff (nur Mesher-gebackene Vertex-AO; Flüssigkeits-Tiefe taugt nicht für SSAO) |
| SSR (Reflexionen) | Keine Szenenfarbe. Nur Pseudo-Looks per Fresnel-Himmelsfarbe |
| Bloom / Glare | Kein Hook ins Post-Processing |
| Tiefenschärfe, chromatische Aberration, Grain | Vollbild-Post-Processing nötig |
| Volumetrisches Licht (God Rays) | Ebenso |
| PBR-Texturen | Textur-Reads verboten. Nur Pseudo-Schätzung aus Farbluminanz |
| Unterwasser-Refraktion | Keine Szenenfarbe. Aber Flüssigkeits-Tiefe (`bloxdOpaqueBehind()`) ermöglicht Dickenabsorption und Grundprojektion ([Teil VIII](apiv2.md) R-E) |
| Unterwasser-Schleier (blaue Tönung) entfernen/ändern | Der Schleier ist ein emissives Fullscreen-Quad aus Definitionsfarbe/-alpha des Flüssigkeitsblocks der Kamera, außerhalb der Hook-Pipelines (ganz vorne) gezeichnet: Das Paket kann weder Farbe noch Dichte ändern |
| Direkte Unterwasser-Erkennung | Kein Feld zeigt Kamera-Untertauchen; fogStart / fogEnd / fogColour ändern sich unter Wasser nicht: Auch aus fogVisibility etc. gibt es keine verlässliche Schätzung |

### Die Wahrheit über Schatten — „Baumschatten" gehen

Nur **mit der Sonne rotierende pixelgenaue Shadowmaps** sind in der Tabelle unmöglich. Die Engine berechnet „Schatten" von Anfang an, und das ist `skyLight`. Die mesh-seitige LightEngine läuft mit Minecraft-artigem Algorithmus:

1. **Spalten-Scan**: jede (x,z)-Spalte von oben nach unten durchgehen. Himmelslicht startet bei 15, wird an opaken Blöcken **0** und dimmt beim Absteigen mit `lightFilter` (Luft 1 / Wasser 3 / opak 15)
2. **BFS-Flutfüllung**: seitlich zu 6 Nachbarn expandieren (-1 pro Block) — das weicht Schattenkanten auf. Rohwert unter Radius-r-Verdeckung ist (15-r)/15
3. blockLight (Fackeln etc.) ist separates BFS aus 3 RGB-Kanälen (4bit-gepackt)

`l.skyLight` ist also kein bloßer Helligkeitsparameter, sondern **Voxel-Verdeckungsdaten für „ist von hier Himmel sichtbar" = eine Schattenkarte**. Unterm Baum, unterm Dach und innen ist sie bereits numerisch niedrig und kommt per Vertex-Interpolation geglättet an. Blöcke zu setzen/brechen rechnet sofort neu = **in Echtzeit folgende Schatten**. Vanilla nutzt sie nur „sanft" via `mix(Ambiente, Himmel, skyLight)`.

Die richtigen Werkzeuge sind R9.12s zwei Schritte (**Rohwerte per Lift-Inversion wiederherstellen → per Schwellen-`smoothstep` binarisieren**. `th = 1 - r/15` wählt direkt den „als Schatten zählenden Verdeckungsradius") plus **direkte Sonne per Sky gaten** (Sonne erreicht nur sichtbaren Himmel = Essenz der Projektion), mit warmer Sonne- / kalter Schatten-Tönung.

**Ehrliche Limits**: Diese Schatten basieren auf „Himmel nach oben" und **rotieren daher nicht mit der Sonne**. Auflösung ist pro Block (weiche Kanten kommen aus der BFS-Streuung). Das Licht-Template enthält noch einen geschlossenen `var shadow: f32 = 1.;`-Stub für Shadowmaps (immer 1.0 = deaktiviert) — als Spur „geplanter" pixelgenauer Rotationsschatten gedeutet. Sind diese unbedingt nötig, bleiben nur API-ferne Wege (z. B. GLSL-Injektion per Userscript, mit Policy-Risiko).

### Unterwasser-Realität

Unterwasser-Looks bestehen aus 3 Schichten:

| Schicht | Inhalt | Aus Paketen operierbar? |
|---|---|---|
| ① Terrain-/Flüssigkeits-Rendering | Per Hooks verarbeitbar. Light-Hooks laufen unter Wasser normal | Ja (wirkt „unterm Schleier") |
| ② Flüssigkeitsdefinitions-Schleier | Emissives Fullscreen-Quad aus Definitionsfarbe/-alpha des Flüssigkeitsblocks der Kamera, ganz vorne gezeichnet. Die Spieleinstellung `cameraTint` gewinnt, falls gesetzt | Nein (weder Farbe noch Dichte änderbar) |
| ③ cameraTint | Spieleinstellung | Nein |

Praktische Punkte: Pakete wirken auch unter Wasser weiter / der Schleier ist nicht entfernbar / unter Wasser ist keine Verzweigung möglich (fogStart / fogEnd / fogColour ändern sich unter Wasser nicht: fogVisibility erkennt es auch nicht).

## 16. Debugging-Tipps

- Zu helle Höhlen → nichtlineare `skyLight`-Kurve fehlt (Höhlenrezept R2 / R9.9)
- Ausgebrannte Tage → Pre-ACES-Belichtung senken
- Zu dunkle Nächte → Mindest-Ambiente sichern (Nacht-`skyLightColour` ist prämissenhaft fast schwarz)
- Zu dunstige Ferne → Luftkoeffizienten senken
- Alles orange um Fackeln → Warmanteil senken (etwas rohes getöntes Licht behalten)
- Blöcke fast durchweg weiß → Light-Hook-Output-Summe über 1.0 (downstream kein Clamp). Mit `clamp(col, vec3f(0.0), vec3f(1.0))` enden
- Weiß ohne Additionen → Un-Fog-Inversion per fogVisibility-Division. Un-Fog raus; ab `s.colour` neu aufbauen und Fog einmal am Ende per `mix`
- Emissions-Blöcke leuchten nicht → fehlende Emissions-Re-Addition in Rebuild-Rezepten. `+ s.emission * l.fogVisibility` dazugeben
- Nachts bleiben nur beleuchtete Flächen → nicht nur Schatten abdunkeln; die ganze fertige Farbe (`engineColour`) nachts dämpfen. Lokale Lampen per `blockLight` / `heldLight` weniger dämpfen ([Teil VI](implementation.md), Abschnitt 19)
- Schatten vertiefen sich mit `pow(skyLight, γ)` nicht → `l.skyLight` ist post-Kurve (Abschnitt 10). Auf R9.12-Inversion + Schwelle wechseln
- Schattenfläche/-dichte tunen → R9.12-Tuning-Guide (Fläche = Schwelle `shTh` / Kante = `shSoft` / Kerndunkelheit = Zwei-Punkt-Verschiebung aus Mindest-Ambiente und Himmelsstreulicht)
