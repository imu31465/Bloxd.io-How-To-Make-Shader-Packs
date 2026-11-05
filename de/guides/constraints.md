# Was Shader-Pakete können und was nicht

> Ziel-API: 5 · Ziel-Build: `bny9u` (2026-11-05, Produktion) · Status: Verified (auf die aktuelle API portiert — Prüfung auf dem Gerät empfohlen)

Die Realismus-Decke der Shader-Pakete auf einer Seite: Was die aktuelle API erreicht, was grundlegend nicht, was bedingt ist, warum die Grenzen existieren und welche Ersatzansätze am nächsten kommen. Vor dem Bauen eines Looks hier scopen.

## Was die aktuelle API kann

- **Farben, Transparenz und Emission pro Fläche** — die drei `Surface`-Hooks liefern colour (plus bedingtes alpha und emission) für Terrain, Flüssigkeiten und Modelle
- **Ein vollständiger Licht-Rebuild** — die drei `Light`-Hooks und die Lighting-API (`bloxdShading()` / `bloxdWorldLight()` / `bloxdLitColour()`) legen das hauseigene Rezept der Engine als komponierbare Funktionen offen ([Lighting](../api/lighting.md))
- **Projektionsartige Schatten, die Block-Edits in Echtzeit folgen** — `skyLight` sind Voxel-Himmelsverdeckungsdaten; Lift-Inversion + Schwellenschnitt macht daraus klare Schatten unter Bäumen und Dächern ([Schatten](shadows.md))
- **Die Texturen des Spiels selbst lesen** — `bloxdTexel()` sampelt den Block-Textur-Atlas und modell eigene Texturen exakt so wie der Sampler der Engine ([Textur-API](../api/texture-api.md))
- **Effekte pro Modell** — `flags` sagt dir „das ist ein gehaltenes Item“, „das ist ein fallengelassenes Item“, „das ist ein Spieler“, „das ist eine Stufe“ ([Flags](../api/flags.md)); `localPosition` liefert modelllokale Koordinaten ([Strukturen](../api/structures.md))
- **Verzauberungs-Glints und Treffer-Blitz-Overlays** — `enchantTier` / `enchantColour` / `enchantSpeed` und `overlayColour` sind lesbar und übersteuerbar ([Verzauberungs-Effekte](../recipes/enchant-effects.md))
- **Zeit und Animation** — `bloxdSeconds()`, Weltposition und die Sonnenrichtung treiben Bewegung ([Zeit & Animation](../recipes/animation.md))

## Was die aktuelle API nicht kann

| Look | Grund |
|---|---|
| Pixelgenaue Shadowmaps (mit der Sonne rotierende Schatten, Penumbra) | Tiefentexturen nicht referenzierbar (das liquid-exklusive `bloxdOpaqueBehind()` liefert nur Geometrieinfo und taugt nicht als Shadowmap). Strahlverdeckung kommt nicht in Hooks an |
| SSAO | Kein Szenentiefenzugriff (nur Mesher-gebackene Vertex-AO; die liquid-exklusive Tiefe taugt nicht für SSAO) |
| SSR (Reflexionen) | Keine Szenenfarbe. Nur Pseudo-Looks per Fresnel-Mischung Richtung Himmelsfarbe |
| Bloom / Glare | Kein Hook ins Post-Processing |
| Tiefenschärfe, chromatische Aberration, Grain | Vollbild-Post-Processing nötig |
| Volumetrisches Licht (God Rays) | Ebenso |
| Eigene PBR-Maps (Normal-/Roughness-/Metalness-Texturen) | Pakete können keine eigenen Texturen hinzufügen — die API *liest* über `bloxdTexel()` nur die vorhandenen Texturen des Spiels, und das sind schlichte Farbtexturen ohne PBR-Kanäle. Eine Pseudo-PBR-Antwort lässt sich nur aus Farbluminanz plus `flags` schätzen ([Textur-API](../api/texture-api.md)) |
| Unterwasser-Refraktion | Keine Szenenfarbe. Die liquid-exklusive Tiefe (`bloxdOpaqueBehind()`) ermöglicht Dickenabsorption und Grundprojektion ([Wasser natürlich aussehen lassen](water.md)) |
| Unterwasser-Schleier (blaue Tönung) entfernen/ändern | Der Schleier ist ein emissives Fullscreen-Quad aus Definitionsfarbe/-alpha des Flüssigkeitsblocks, in dem die Kamera steckt, gezeichnet außerhalb der Hook-Pipelines (ganz vorne): Das Paket kann weder Farbe noch Dichte ändern |
| Direkte Unterwasser-Erkennung | Kein Eingabefeld zeigt Kamera-Untertauchen; fogStart / fogEnd / fogColour ändern sich unter Wasser nicht, also gibt es keine verlässliche Schätzung aus fogAlpha etc. |
| Himmel, Wolken oder die Sonnenscheibe selbst ändern | Hooks laufen flächenweise auf Terrain-/Flüssigkeits-/Modell-Geometrie; die Skybox gehört zu keiner Hook-Pipeline |

## Bedingte Möglichkeiten

- **Vertex-Animation und `discard`** — nur in Spielen, deren Definition `shaderPackPolicy: "allow"` trägt; überall sonst kompiliert `BLOXD_STRICT` diese Hooks weg ([Shader-Pack-Richtlinien je Spiel](../internals/policy.md))
- **Szenentiefe (`bloxdOpaqueBehind()`)** — nur in Liquid-Hooks, und sie braucht `BLOXD_SCENE_DEPTH`; Terrain- und Modell-Hooks haben keinen Tiefenzugriff ([Funktionen](../api/functions.md))
- **`bloxdTexel()` / `bloxdTextureSize()`** — nur in Surface- und Light-Hooks, und nur wo die Pipeline eine Textur hat; texturlose Konfigurationen kompilieren sie als weiße Stubs ([Textur-API](../api/texture-api.md))
- **Terrain-Alpha (`BLOXD_ALPHA`)** — nur wo die Variante es definiert ([Varianten und Guards](../getting-started/variants.md))

## Warum diese Grenzen existieren

Vier Eingaben, die ein „echter" Post-Processing-Shader bräuchte, fehlen strukturell:

1. **Keine Szenenfarbe** — Hooks laufen, während jede Fläche gezeichnet wird; es gibt keine Framebuffer-Textur zu lesen, also lassen sich SSR, Refraktion und alles aus „was ist hinter mir" Abgeleitete nicht berechnen
2. **Keine Szenentiefe** — außer der liquid-exklusiven Geometrie-Sonde `bloxdOpaqueBehind()`; SSAO und Shadowmaps brauchen einen vollständigen Depth-Buffer
3. **Keine Post-Processing-Stufe** — kein Hook läuft, nachdem der Frame komponiert ist; Bloom, DOF, Aberration, Grain und God Rays haben keinen Einsprungspunkt
4. **Kein Himmel-Zugriff** — Skybox, Wolken und Sonnenscheibe werden außerhalb der Hook-Pipelines gezeichnet, und kein Input beschreibt sie jenseits von `bloxdSunDirection()`

Der Unterwasser-Schleier ist ein Spezialfall derselben Struktur: ein emissives, ganz vorne gezeichnetes Fullscreen-Quad, erzeugt aus der Flüssigkeitsblock-Definition, in der sich die Kamera befindet — außerhalb jeder Hook-Pipeline.

## Die nächsten Ersatz-Ansätze

| Gewünscht | Nächster paketseitiger Ansatz |
|---|---|
| Reflexionen | Fresnel-gewichtete Mischung Richtung himmelsähnlicher Farbe + Sonnenglint ([Wasser natürlich aussehen lassen](water.md)) |
| PBR-Materialien | Luminanz-basierte Specular-/Roughness-Schätzung + `flags`-basierte Materialklassen ([Farben](../recipes/colors.md), [Realismus](../recipes/realism.md)) |
| Bloom / Glow | Emission-Output — echt additiver Glanz, aber flächenweise, kein Post-Process-Blur ([Emission](../recipes/emission.md)) |
| Ambient Occlusion | Die schon in `surface.colour` eingebackene Mesher-Vertex-AO; skyLight-Abdunklung dient zusätzlich als großskalige AO ([Schatten](shadows.md)) |
| Wasser-Dickenabsorption | `bloxdOpaqueBehind()`-Dicke + Grundprojektion in Liquid-Hooks ([Flüssigkeiten](../recipes/liquids.md)) |
| Unterwasser-Stimmung | Den Schleier akzeptieren; gestalten, was durch ihn sichtbar ist (Terrain/Flüssigkeit rendern unter Wasser weiterhin normal) |

## Die Wahrheit über Schatten — „Baumschatten" sind baubar

Nur **mit der Sonne rotierende pixelgenaue Shadowmaps** sind in der Tabelle oben unmöglich. Die Engine berechnet „Schatten" von Anfang an, und das ist `skyLight`. Die mesh-seitige LightEngine läuft mit Minecraft-artigem Algorithmus:

1. **Spalten-Scan**: jede (x,z)-Spalte von oben nach unten durchgehen. Himmelslicht startet bei 15, wird an opaken Blöcken **0** und dimmt beim Absteigen mit `lightFilter` (Luft 1 / Wasser 3 / opak 15)
2. **BFS-Flutfüllung**: seitlich zu 6 Nachbarn expandieren (-1 pro Block) — das weicht Schattenkanten auf. Rohwert unter Radius-r-Verdeckung ist (15-r)/15
3. blockLight (Fackeln etc.) ist separates BFS aus 3 RGB-Kanälen (4bit-gepackt)

`l.skyLight` ist also kein bloßer Helligkeitsparameter, sondern **Voxel-Verdeckungsdaten für „ist von hier Himmel sichtbar" = eine Schattenkarte**. Unterm Baum, unterm Dach und innen ist sie bereits numerisch niedrig und kommt per Vertex-Interpolation geglättet an. Blöcke zu setzen/brechen rechnet sofort neu = **in Echtzeit folgende Schatten**. Vanilla nutzt sie nur „sanft" via `mix(Ambiente, Himmel, skyLight)`.

Die richtigen Werkzeuge sind die zwei Schritte aus [Schatten](shadows.md) (**Rohwerte per Lift-Inversion wiederherstellen → per Schwellen-`smoothstep` binarisieren**; `th = 1 - r/15` wählt direkt den „als Schatten zählenden Verdeckungsradius") plus **direkte Sonne per Sky gaten** (Sonne erreicht nur sichtbaren Himmel = Essenz der Projektion), komponiert mit warmer Sonnen- und kalter Schatten-Tönung.

**Ehrliche Limits**: Diese Schatten basieren auf „Himmel nach oben" und **rotieren daher nicht mit der Sonne**. Auflösung ist pro Block (weiche Kanten kommen aus der BFS-Streuung). Das Licht-Template der Engine enthält noch einen geschlossenen `var shadow: f32 = 1.;`-Stub für Shadowmaps (immer 1.0 = deaktiviert) — als Spur „geplanter" pixelgenauer Rotationsschatten gedeutet. Sind diese unbedingt nötig, bleiben nur API-ferne Wege (z. B. GLSL-Injektion per Userscript, mit Policy-Risiko).

## Unterwasser-Realität

Unterwasser-Looks bestehen aus 3 Schichten:

| Schicht | Inhalt | Aus Paketen operierbar? |
|---|---|---|
| ① Terrain-/Flüssigkeits-Rendering | Per Hooks verarbeitbar. Light-Hooks laufen unter Wasser normal | Ja (wirkt „unterm Schleier") |
| ② Flüssigkeitsdefinitions-Schleier | Emissives Fullscreen-Quad aus Definitionsfarbe/-alpha des Flüssigkeitsblocks der Kamera, ganz vorne gezeichnet. Die Spieleinstellung `cameraTint` gewinnt, falls gesetzt | Nein (weder Farbe noch Dichte änderbar) |
| ③ cameraTint | Spieleinstellung | Nein |

Praktische Punkte: Pakete wirken auch unter Wasser weiter / der Schleier ist nicht entfernbar / unter Wasser ist keine Verzweigung möglich (fogStart / fogEnd / fogColour ändern sich unter Wasser nicht: fogAlpha erkennt es auch nicht).

## Verwandt

- [Schatten](shadows.md) — die skyLight-Schattentechnik im Volltext
- [Modelle und Texturen](models.md) — was die Modell-Pipeline erreicht
- [Kompatibilität](../api/compatibility.md) — wie sich Pakete alter Versionen verhalten
- Änderungen dieser Grenzen Version für Version: [Versionsgeschichte](../history/)
