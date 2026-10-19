[← Vorheriger Teil](06-implementation.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](08-apiv2.md)

# Teil VII: Interna-Ergänzung

Extra-Spezifikationen aus Engine-Implementierungsanalyse. Alles direkt aus dem JavaScript des aktuellen Produktions-Builds restauriert.

## 24. Sonnen- und Mondidentität

Die `bloxdSunDirection()`-Quelle ist ein Sonnenrichtungs-Buffer, der nur bei Skybox-Typwechsel neu geschrieben wird — Kriterium ist nicht „ob der Himmel eine Sonne hat", sondern **„ob die Skybox vom Erdtyp ist"**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (prozeduraler Himmel) | Nicht null (Defaults unten) |
| `gloomy` / `interstellar` / `space_*` (Cube-Texturen) | **Immer (0,0,0)** |

**Der Mond ist immer `-bloxdSunDirection()`** (die Engine berechnet die Mondposition als exaktes Gegenteil der Sonne). Nacht wird per Sonnenhöhe beurteilt — Mond oben bei `bloxdSunDirection().y < 0` (Sonne unterm Horizont). In Standardwelten ist die Sonne aber statisch, der Mond also auch — nur Welten mit Tag/Nacht-Zyklus sehen ihn wandern.

Die Standardwelt-Sonnenrichtung liegt bei ca. `(-0.56, 0.81, -0.18)` (Einheitsvektor aus inclination = −0.2 / azimuth = 0.55, statisch). Praktische Referenz zur Vorhersage von Highlight-Richtungen beim Testen von Vertriebspaketen.

Tag/Nacht-Zyklen sind nicht in die Engine eingebaut — inclination ist eine statische Zahl, die Welten mit bewegtem Tag spielsietig aktualisieren. `bloxdSunDirection()` folgt jeder Aktualisierung.

Terrain-Richtlichter sind nur 2 Lampen beim Szenenstart, mit **fixer Richtung und Intensität, ohne Tag/Nacht-Wechsel**. Kurz: **Kein Terrain-Helligkeitsfaktor hängt von der Zeit ab. Tag/Nacht-„Looks" kommen nur aus Skybox und bloxdSunDirection()**, also müssen nachts abdunkelnde Pakete die Zeitspanne selbst aus bloxdSunDirection() schätzen (die `sunPresent`-Technik aus §19).

### R-A. Gerichtetes Mondlicht — moonDir = −bloxdSunDirection()

Addiert bläulich-weißes Lambert und schwaches Specular nur solange der Mond oben ist. `moonUp` ist in statischen Standardwelten 0: dort passiert nichts — **Mondlicht, das nur in Welten mit Tag/Nacht-Zyklus feuert, also sicher**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // der Mond ist immer exakt gegenüber der Sonne; Tages-Auto-Off via moonDir.y < 0
    let moonDir = -bloxdSunDirection();
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(bloxdEyePosition() - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. Fog-Interna

Die Fog-Berechnung ist immer LINEAR-Modus (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), mit `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = Fog-Einstellung; nur D = 0 ist speziell mit fogEnd = 5). **Das Gradientenband ist nur 32 Blöcke breit**, und `l.fogVisibility` ist weniger „Distanzdunst" als **normierte Distanz zur Kante der geladenen Welt**. Variiert pro Spieler mit Ladedistanz: Distanz-Effekte sollten `distance(l.position, bloxdEyePosition())` selbst berechnen (Rezept R-B).

Standard-Fog-Farbe `rgb(181, 191, 195)` (blasses Blaugrau). Welt-Ersteller ändern sie via `fogColourOverride` (hex). Bei Fog-Modus 0 (NONE) **kommt fogColour schwarz an**. Die Standardform `mix(l.fogColour, col, l.fogVisibility)` ist sicher, da Fog-Farbe bei fogVisibility 1 ungenutzt bleibt. Die Script-API hat zwei weitere Optionen, `fogChunkDistanceOverride` und `fogOnSkybox`: Custom Games können die Fog-Distanz (den D-Wert) und die Fog-Anwendung auf die Skybox unabhängig setzen. Standardmäßig ist die Skybox nicht vom Fog betroffen (nur in Spielen mit aktivem `fogOnSkybox` wird auch die Skybox mit der Fog-Farbe getönt).

`showFog` auf false zu setzen schiebt Fog auf 3200–3232 Blöcke und deaktiviert faktisch (`fogVisibility ≈ 1` kommt weiter).

### R-B. Ladekanten-Band — fogVisibility als „Weltkante"

Kühlt leise nur das 32-Block-Band der Ladekante, um das Weltende zu kaschieren (oder als Effekt zu betonen). Ohne selbst berechnete Distanz: folgt automatisch den Ladedistanz-Einstellungen des Spielers.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = innen (Spielraum zur Kante), 0 = kurz vorm Kantenaustritt
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. blockLight-/heldLight-Interna

`blockLight` ist **farbiges Licht** mit drei RGB-Kanälen. Jeder leuchtende Block definiert eine Emissionsfarbe `[R, G, B]` (je 0–15), die unverändert als Lichtfarbe übernommen wird (normale Fackel = warmweiß (14,14,12) / Lava = orange (14,8,2) / Beacon = cyan (5,14,14) / weiße Fackel = (15,15,15) usw.). In der Vertex-Stufe kommt sie als 4 Nibbles gepackt an — r / g / b / sky — in einem Float-Attribut. Die drei Kanäle im Light-Hook getrennt zu behandeln, ermöglicht farbiges lokales Licht — das warme Fackel-Rezept (R9.1) ist auf dieses Verhalten kalibriert.

Beim Dekodieren von `aPackedLightLevels` legt die Engine pro Kanal einen **Floor von 35 % des hellsten RGB-Kanals**. Z. B. wird „reines Rotlicht" in Vertices auf (1,00, 0,35, 0) gehoben, vor Interpolation und Lift. Dass Fackel-Orange im Spiel „weißlich-pink statt rot" wirkt, kommt hierher — warmes Fackel-Rezept (R9.1)-Sättigung gegen dieses Default tunen.

Die Licht-Komposition ist nicht additiv. Intern nimmt die Engine das **Maximum** aus Blocklicht (nach dem 35-%-Floor) und Sky-Licht in der Form `mix(Umgebungsfarbe, Himmelsfarbe, skyLight)` und davon erneut das Maximum mit Handlicht (nach Ambient-Boost). Die Kanalwerte dieser Komposition sind Rohwerte (vor Lift), getrennt von den Post-Lift-Werten, die die Hook-Eingaben erreichen. `blockLight` und `skyLight` heben sich also nie gegenseitig auf — der Beitrag der dunkleren Seite wird schlicht verworfen — deshalb dunkelt abgeschwächtes Sky-Licht von blockLight dominierte Stellen kaum ab. Belichtungs- und Abfall-Rezepte um diese Struktur herum bauen (der lokale Lichtschutz in [Teil VI](06-implementation.md) §19 existiert als Ausgleich dafür).

Handlicht (`heldLight`) hat Reichweite nach hellstem Kanal (max 15 Blöcke) mit `dist^0.75`-Vorverarbeitung, demselben 35-%-Floor, und `l.heldLight` ist der **Pre**-Ambient-Boost-Wert. Custom-Items können `spotlightRange` und Kegelwinkel setzen — ein „Strahl im Halten"-Modus, dessen Kegel der Kamera folgt. Pakete können die Strahlrichtung nicht wissen.

Custom-Blöcke können `skyLightEmission` (0–15) tragen, das **in den skyLight-Kanal selbst injiziert, separat zum blockLight-BFS**. R9.12-artige Pakete, die Sonne/Schatten per skyLight-Schwelle beurteilen, können in Welten mit künstlich gehobenem skyLight danebenliegen. Vertriebspakete beurteilen robuster kombiniert mit blockLight.

## 27. Pipeline-Details

- **Surface-Hooks laufen „vor" alphaTest**: `out.alpha` speist den Verwerfungstest direkt. Cutout-Materialien (Gras, Blätter) erlauben Dissolve-Dither-Effekte (Rezept R-C). In Flüssigkeiten (Blending) ist `out.alpha` die echte Transparenz (Rezept R-D). Kein Effekt auf normalem opakem Terrain — nicht verwechseln
- **`l.ambient`-Inhalt**: `material.ambient × sceneAmbient`, pro Material verschieden. Die Szenenseite hängt an der Grafik-Einstellung „Ambient Lighting Intensity" (Standard 0.5) — nie Fixes einprogrammieren
- **Die Richtlichter der Szene sind ein 2-Lampen-Aufbau**: Die Lambert-Summe aus Hauptlicht (Richtung aus der Sonnenposition der Sky-Einstellung, Intensität 1.0) und Fülllicht (Richtung `[-0.5, -1, -1]`, Intensität 0.35) erreicht `l.directional`. Das Fülllicht zeigt nach unten, trägt also nichts zu Oberseiten bei und fängt nach unten weisende Flächen ein (Höhlendecken usw.). Terrain berücksichtigt nur in `_initScene` hinzugefügte Lichter; nach dem Start zur Szene hinzugefügte Lichter werden von Terrain und Blockmodellen ignoriert (eine offizielle Warnmeldung sagt das)
- **`bloxdTime()` ist wirklich `performance.now()`**: die Browser-Uptime, auf 1 Stunde gewrappt. Ohne Bezug zu Spiel-Tag/Nacht und Welt-Laufzeit. Für uhr-synchrone Animation die Uhrzeit aus dem `bloxdSunDirection()`-Azimut in Tag/Nacht-Zyklus-Welten schätzen
- **Header-Funktionen lesen ein Uniform**: Die Engine platziert ein 64-Byte-Uniform auf `@group(3) @binding(0)` (4 Slots — Zeit / originOffset / sunDirection / eyePosition, Little-Endian), und `bloxdTime()` / `bloxdOriginOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` entsprechen dem Lesen dieser Slots. `originOffset` ist im aktuellen Build immer `[0, 0, 0]` (ein reservierter Slot für Fließkomma-Weltkoordinaten). Pakete können dieses Uniform nicht schreiben, und da Paket- und Engine-WGSL zu einem Modul verschmelzen, ist auch das eigene Deklarieren derselben group/binding unmöglich
- **Vertex-Daten baut der Mesher (Web Worker)**: Block-Terrain ist mit 28 Byte pro Vertex verschachtelt (32 Byte mit Atlas) — Position = float32×3 / Normale = vorzeichenbehaftete 8-Bit-Ganzzahl×4 / Farbe = 8-Bit-normalisierte Ganzzahl×4 (die Substanz von `s.colour` — Tint × AO ist schon im Mesher in 8 Bit eingebacken, ein Auftrennen oder Wiederherstellen im Paket ist prinzipiell unmöglich) / UV = float32×2 / atlasIndex = float32. Nur die Lichtlevel liegen in einem separaten 4-Byte-Vertex-Buffer ([Teil VII](07-internals.md) §26, [Teil II](02-api.md) §11). Vertices werden per Chunk-Instancing gezeichnet
- Feine Schachbrettmuster an Chunk-Rändern beim Laden sind das Chunk-Fading per Screen-Space-Bayer-4×4-Dither der Engine, keine Paket-Bugs (abschaltbar über die Grafik-Einstellung `chunkFadeIn`)
- **`mod` ist ein reserviertes Wort**: abgelehnt mit `pack.wgsl:3 'mod' is a reserved word in WGSL.` Reste mit `%`-Operator schreiben

### R-C. Bayer-Dither-Dissolve — out.alpha steuert discard

Reproduziert die **gleiche Bayer-4×4-Tabelle**, die die Engine in Chunk-Fades nutzt, und löst Cutouts von unteren Blöcken auf. discard feuert in alphaTest-Materialien (Gras, Blätter); in Flüssigkeiten ist es Misch-Transparenz.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod ist reserviert: %-Operator verwenden
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // löst von unteren Blöcken auf; höheres dissolve bleibt
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. Wasser-Nahkamera-Fade — Flüssigkeits-Alpha hält Sicht frei

Flüssigkeits-Hook-`out.alpha` speist das Blending direkt. Blendet nur die Fläche unter der Kamera aus, um Tauch-/Überwasser-Kamera-Sicht zu sichern.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 Blöcke von total transparent bis normal
    #endif
    return out;
}
```

## 28. Was sichtbare Paket-Werte ändert — Testcheckliste

Dasselbe Paket rendert je nach **Welt und Spieler-Einstellungen** anders. Vor Verteilung mindestens diese 3 Umgebungen prüfen:

1. **Normalwelt** (Default-Skybox, keine Overrides) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, Standardfarben
2. **Space-Skybox-Welt** — bloxdSunDirection() = 0. Der `sunPresent`-Zweig-Look
3. **Custom-Welt mit `visionMinLightColour` / `skyLightColourOverride`** — gehobene Dunkelheiten und Farben

Haupt-Varianzquellen: `lightingOverride` (Zwangslicht) / `skyLightColourOverride`, `ambientLightColourOverride` (Hex-Tausch) / `visionMinLightColour` („dunkelste sichtbare Farbe". Als Komponenten-Maximum gegen sowohl `uSkyLightColour` als auch `uAmbientLightColour` implementiert; Night Vision nutzt es — „stockdunkle Höhlen"-Pakete werden nicht so dunkel wie gedacht, und die Himmelsfarbe selbst wird angehoben) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (bloxdSunDirection()-Präsenz). `uSkyLightColour`-Standard = (1,1,1) weiß, `uAmbientLightColour`-Standard = (0.25,0.25,0.30). `l.ambient`-Szenenseite = Grafik-Einstellung „Ambient Lighting Intensity" (Standard 0.5). `l.fogVisibility` folgt Spieler-Fog/Chunk-Distanz-Einstellungen. Auch `cameraTint` (RGBA-Tönung über den ganzen Bildschirm) und `proximityFadeDistance` / `proximityFadeMinOpacity` (Kamera-Nähe-Fade für Entities) sind Welt-Einstellungs-Varianzfaktoren — `cameraTint` ist insbesondere ein Final-Pass, der **über** die Paket-Ausgabe komponiert wird. Vieles davon lässt sich auch per Script-API (`serverOption`) setzen und während des Spiels aktualisieren.

## 29. Debugging-Mittel

- URL-Parameter `?renderer=lite` — den Lite-Renderer (WebGPU) erzwingen (`?renderer=webgl2` / `babylon` gehen auch; `babylon` ist der alte Name für webgl2). Priorität: URL-Parameter > localStorage `bloxdRenderer` > Einstellungsbildschirm > Standard (webgl2). Ungültige Werte werden mit Warnung ignoriert. In URL oder localStorage belassene Overrides können Szenen brechen, die WebGPU (lite) brauchen — „needs the new WebGPU renderer, so remove the renderer override..." ([Teil V](05-troubleshooting.md) §17)
- URL-Parameter `?vconsole` — On-Screen-Konsole (VConsole). Praktisch für echte Mobil-Verifikation
- URL-Parameter `?drawcalls=1` — blendet ein Draw-Statistik-Debug-Panel ein. Spielobjekte aus der Debug-Konsole auswählen oder `drawCalls()` / `why()` / `configureDrawCallWatching()` nutzen, um Overdraw großer Mechanismen (Paket und sonstige) und die Annäherung ans Limit von ~65.000 Vertices pro Draw-Call zu inspizieren — nützlich zur Isolation von Performance-Engpässen
- Die Konsole zeigt `noa-engine v0.33.0` und `Renderer: lite from <Quelle>` — erst prüfen, um Render-Pfad-Fehldiagnosen zu vermeiden
- Der WebGPU-Renderer sperrt sich mit Paket auf „zwangsweise AN". Die Einstellung „Disable Block Texture Atlas" sperrt sich ebenfalls (Atlas bleibt AN), und ohne WebGPU wendet sich das Paket gar nicht erst an. Basis, um auf Vertriebsseiten „WebGPU-Browser nötig" zu schreiben
- Block-Texturen sind eine 2D-Array-Textur (`texture_2d_array`), der Terrain-Sampler ist Nearest + Repeat. Der Mesher verschmilzt außerdem Flächen mit gleichem Material / AO / Licht zu einem Rechteck (**Greedy Meshing**), die UV einer verschmolzenen Fläche kann daher eine Kachelbreite überschreiten (Kanten um 0.0015 eingerückt). Hardware-Repeat-Adressierung übernimmt die Kachelung, verschmolzene Flächen wirken nahtlos. Beachte: an `vUV` gekoppeltes prozedurales Detail kann an Verschmelzungsgrenzen brechen — stattdessen an die Weltposition (`s.position` + `bloxdOriginOffset()`) koppeln
- Die Laufzeit-Revalidierung pro Beitritt (`checkCompilation`) kompiliert echte Terrain-Materialien im Browser-WebGPU (strenger als Einstellungs-Static-Validierung). Hier fallende Pakete werden aus diesem Spiel ausgeschlossen

## 30. Anwendungsmodi je Spiel (`shaderPackPolicy`)

Dieser Abschnitt präzisiert, was „allow / strict" auf Titelebene bedeutet (vgl. §7). Nur Titel, deren Spieldefinition ausdrücklich `shaderPackPolicy: "allow"` enthält, laufen im vollen Modus (Vertex-Hooks, `discard`, Terrain-`alpha`); Titel ohne Angabe (oder mit einem anderen Wert) sind strict — `BLOXD_STRICT` wird definiert, umschlossener Code automatisch deaktiviert. Das Paket kann dies nicht selbst wählen; zu wissen, in welchen Titeln was läuft, ist Voraussetzung für das Verteilen.

- Referenz-Build: `szby6g.main.94a7596c.js` (Produktions-Deployment zum 2026-10-17). Statische Auswertung aller 111 Spieldefinitionen: **26 allow-Einträge (12 Titel) / 85 strict-Einträge**.
- Oberhalb von `shaderPackPolicy` gibt es ein Gate auf Auslieferungskanal-Ebene (grob `canUseShaderPacks`): Über externe Portale (z. B. Coolmath-Games-Builds) kann das Shader-Paket-System selbst deaktiviert sein, bevor `shaderPackPolicy` überhaupt konsultiert wird. Die Allow/Strict-Analyse unten basiert auf dem bloxd.io-Haupt-Web-Build.
- allow wird an 12 Stellen deklariert: 8 direkte Literale in den Spieldefinitionen und 4 Basisvariablen (`tb` / `kz` / `cb` / `Fb`); Varianten erben über Spread (`{...tb,...}`). Eine Übersteuerung pro Variante (Eltern-allow / Kind-strict) gibt es derzeit nicht.

Die 12 allow-Titel (insgesamt 26 Einträge):

- **Test Gym** — Basis + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (insgesamt 11 Einträge)
- **Doodle Cube** — Basis + Solos / Duos (3)
- **Rocket Obby** — Basis + Sheep / January (3)
- **9 Einzeltitel**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

Die missverständlichsten Punkte auf der strict-Seite:

- **Superflat Creative (classic_creativeFlat) ist strict.** Der Name enthält „Creative", aber in der classic-Familie ist nur das normale Creative (`classic_creative`) allow. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns usw. sind komplett strict
- **Custom Games (customGames) ist strict.** Vertex-Hook-Effekte feuern nicht in selbst erstellten Custom Games. Zum Verifizieren ist Test Gym die sichere Wahl
- Große PvP-/Server-Titel wie bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) sind allesamt strict

Auch in strict-Titeln wird das Paket geladen und kompiliert; Fragment-Rezepte wie surface / light funktionieren normal. Eingeschränkt sind die Vertex-Hooks (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard` und Terrain-`alpha` (bei Flüssigkeiten stets vorhanden).

Diese Liste spiegelt die statische Analyse des genannten Builds wider; Engine-Updates können die allow/strict-Aufteilung ändern. Bei neuen Versionen nachkontrollieren.

[← Vorheriger Teil](06-implementation.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](08-apiv2.md)
