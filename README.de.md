# Bloxd.io-Shader-Pakete erstellen (Komplette Anleitung)

Eigenständige Anleitung zum Erstellen und Verteilen von Shader-Paketen für Bloxd.io (nur WebGPU-Renderer).
Basierend auf der Spezifikation von `apiVersion: 1`. Enthält Rezepte und API-Referenz: Mit dieser einen Datei kommst du von null bis zur Verteilung.

> Dies ist eine inoffizielle Anleitung und gibt nicht die Sicht der Entwickler wieder. Die API kann sich ohne Ankündigung ändern.  
> Zuletzt geprüft: 2026-10-15 (Fog-Anwendungsreihenfolge, echte Fog-Einstellungen und Unterwasser-Rendering gegen die Implementierung verifiziert). Da keine öffentliche offizielle WGSL-API-Referenz gefunden werden konnte, prüfe Beschreibungen und Rezepte weiter anhand des Ladebildschirms und der Kompilierung im Spiel.  
> Die Shader-Paket-Funktion ist eine offizielle Funktion aus der Spieloberfläche, und Pakete sind reines WGSL  
> (keine JS-Ausführung, kein Netzwerk) – mit normalem Code passiert also nichts Gefährliches.  
> Dieser Leitfaden wurde mit KI-Unterstützung erstellt; Korrektheit ist nicht garantiert. Prüfe am tatsächlichen Spielverhalten.

## Inhalt

- [Teil I: Pakete erstellen](#teil-i-pakete-erstellen)
- [Teil II: API-Referenz](#teil-ii-api-referenz)
- [Teil III: Rezeptsammlung](#teil-iii-rezeptsammlung)
- [Teil IV: Realismus-Leitfaden](#teil-iv-realismus-leitfaden)
- [Teil V: Fehlersuche & Hinweise](#teil-v-fehlersuche--hinweise)
- [Teil VI: Wichtige Umsetzungshinweise](#teil-vi-wichtige-umsetzungshinweise)
- [Teil VII: Interna-Ergänzung](#teil-vii-interna-ergänzung)

---

# Teil I: Pakete erstellen

## 1. Überblick und Voraussetzungen

- Shader-Pakete sind **nur für den WebGPU-Renderer**. Solange ein Paket installiert ist, wird der WebGPU-Renderer in den Einstellungen zwangsweise aktiviert
- Pakete werden in einer **eingeschränkten WGSL-Untermenge** geschrieben. Sie betreffen nur das Aussehen von **Terrain und Flüssigkeiten**
- Möglich: Farben, Transparenz und Emission ändern; Beleuchtung neu aufbauen; projektionsartige Schatten (R9.12); Vertex-Animation (nur in bestimmten Spielen)
- Nicht möglich: Texturen hinzufügen/sampeln, Post-Processing (Bloom etc.), pixelgenaue mit der Sonne rotierende Schatten (Shadowmaps) oder echte Reflexionen (SSR), Himmel oder Entities beeinflussen
- Möglich (wird aber leicht übersehen): **projektionsartige Schatten mit `skyLight` (Voxel-Himmelsverdeckung)** — Bereiche unter Bäumen und Dächern deutlich abdunkeln (R9.12). Blöcke zu zerstören lässt die LightEngine sofort neu berechnen, Schatten folgen also in Echtzeit
- **Die meisten Spiele laufen im Strict-Modus** (keine Vertex-Animation, kein `discard`). Pakete für die allgemeine Verteilung bitte strict-tauglich gestalten

## 2. Schnellstart

1. Ordner anlegen, `pack.json` und `.wgsl`-Dateien hineinlegen
2. Zip oder Ordner über Spieleinstellungen → Shader Pack laden
3. Fehler beheben und neu laden (siehe Teil V)
4. In unterstützten Spielen testen
5. Fertig zippen und verteilen

## 3. Paketstruktur

- **Vertriebsform**: eine einzelne `.zip` oder ein Ordner (Ordnerladen nur in Desktop-Browsern)
- **Inhalt**: eine `pack.json` (oberste Ebene des Pakets; Groß-/Kleinschreibung egal) + 1–256 `.wgsl`-Dateien
- Mehrere `.wgsl` werden verkettet und als ein Modul behandelt, Aufteilen und Unterordner sind also frei. Keine Dateinamen-Einschränkungen. Nicht-`.wgsl`-Dateien (READMEs etc.) werden ignoriert
- Zip-Tipp: Liegt alles unter einem gemeinsamen Wurzelordner, wird dieses Präfix automatisch abgestreift (macOS-„Komprimieren"-Zips funktionieren direkt). Fremddateien auf Root-Ebene brechen aber die Top-Level-Erkennung; am sichersten in den Ordner gehen und `pack.json` plus `.wgsl` direkt packen (prüfen, dass `pack.json` im ZIP-Root landet)

| Punkt | Limit |
|---|---|
| Zip-Größe / Einträge | 32MB / 1024 |
| pack.json-Größe | 64KB, UTF-8 |
| .wgsl gesamt | 256KB, UTF-8 |
| Zip-Format | zip64, geteilte und verschlüsselte Zips werden abgelehnt |

## 4. pack.json

```json
{
  "apiVersion": 1,
  "name": "My Pack",
  "author": "your name"
}
```

| Feld | Pflicht | Beschreibung |
|---|---|---|
| `apiVersion` | Pflicht | Muss exakt `1` sein |
| `name` | Pflicht | Nicht leer. Wird in der Einstellungs-UI angezeigt |
| `author` | optional | Darf fehlen. Nicht-String-Werte (Zahlen etc.) sind Fehler |

Andere Felder werden ignoriert.

## 5. Minimalvorlage

Funktionsfähiges Paket mit nur `pack.json` (Abschnitt 4) und diesem `pack.wgsl`:

```wgsl
// Minimalpaket mit leichtem Warmton
const packWarmth = 0.18;

fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

Zu befolgende Regeln:

- Ausgabe-Structs **nie direkt konstruieren** (`bloxd_Surface(...)` ist ein Fehler). Immer von `bloxd_defaultSurface(s)` / `bloxd_defaultLight(s, l)` / `bloxd_defaultVertex(v)` ausgehen und Felder ändern. Ausnahme: Der erste Light-Hook-Parameter (`s: bloxd_Surface`) hat den Ausgabe-Typ, also geht auch `var out = s;`
- Uninitialisiertes `var x: bloxd_Surface;` (nur Typ-Annotation) ist ebenfalls ein Fehler
- Hook-Parameter sind **schreibgeschützt**. Zum Ändern erst kopieren, z. B. `var sv = s;`
- Das Präfix `bloxd_` darf nicht für eigene Bezeichner verwendet werden (außer den 6 Hook-Namen)
- Konstanten mit `const` schreiben (`#define` kann keine Werte halten)

## 6. Die 6 Hooks

Alle optional. Signaturen müssen typgenau übereinstimmen (Parameternamen frei).

| Hook | Rolle |
|---|---|
| `fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex` | Terrain-Vertex-Animation. **Im Strict-Modus nicht verfügbar** |
| `fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface` | Terrain-Farbe, Transparenz, Emission. `s.colour` ist Textur × Vertex-Farbe |
| `fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light` | Terrain-Endfarbe. Wird in der **letzten Fragment-Stufe** aufgerufen, der Rückgabewert wird unverändert zur Endfarbe |
| `fn bloxd_liquid_vertex / _surface / _light` (gleiche Formen) | Flüssigkeits-Versionen. `alpha` wirkt als Flüssigkeitstransparenz |

Fallback-Regeln:

- Ohne Liquid-Hook wird **der gleichnamige Terrain-Hook verwendet** (nie umgekehrt). Nur surface zu schreiben wirkt auch auf Flüssigkeiten
- Ohne Light-Hook gilt das Standardverhalten (`engineColour + emission × fogFactor`)
- Wer `engineColour` verwirft und aus der Basisfarbe neu aufbaut, muss den Fog selbst neu anwenden: `mix(l.fogColour, col, l.fogFactor)`. Emission beim Addieren erst mit `fogFactor` multiplizieren

## 7. 8 Varianten und Guards

Ein Code wird geschrieben, muss aber in allen **8 Kombinationen aus {strict, allow} × {Licht an, Licht aus} × {Terrain, Flüssigkeit}** kompilieren.
Nur `#define` (nur Flag, keine Werte) / `#ifdef` / `#ifndef` / `#else` / `#endif` verfügbar. `#` muss am Zeilenanfang stehen (auch in Funktionen ok).

| Guard | Bedeutung | Verwendung |
|---|---|---|
| `#ifndef BLOXD_STRICT` | Nur außerhalb von strict (allow) | Umschließt den ganzen Vertex-Hook und `discard` |
| `#ifdef BLOXD_LIGHTING` | Nur bei eingeschaltetem Licht | Umschließt Code mit `blockLight`, `skyLight`, `ambientLightColour` etc. **Gemeinsame Hilfsfunktionen (Modul-fn) als ganze Funktion umschließen** (nur die Aufrufstelle zu schützen reicht nicht) |
| `#ifdef BLOXD_ALPHA` | Wenn das `alpha`-Feld existiert (Flüssigkeiten immer, Terrain nur in allow) | Umschließt Code mit `alpha` |

## 8. Verfügbare Sprachfeatures und Verbote

Verfügbar:

- WGSL-Builtin-Funktionen (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select` etc.)
- Eigene `fn` / `struct` / `const` / `alias` / `var<private>`, dazu `let` und Kontrollfluss (if/for/while/switch etc.) in Funktionen
- Ableitungen (`dpdx` / `dpdy` / `fwidth`) nur in Surface-/Light-Hooks (Fragment-Stufe). Nicht in Vertex
- `const`-Arrays (z. B. Farbpaletten-LUTs), Pointer (`ptr<function, T>`), Matrizen (`mat3x3f` etc.)
- Flag-Definitionen `#define NAME` + `#ifdef`-Verzweigung

Verbote / Vorsicht:

- **Keine Texturen**: `texture_*`- / `sampler`-Typen unbenutzbar. Details prozedural mit Hash-Rauschen etc. bauen
- **`discard` im Strict-Modus verboten** (mit `#ifndef BLOXD_STRICT` umschließen)
- `@attribute` / `enable` / `requires` / `override` verboten. Da `enable f16;` nicht schreibbar ist, sind **f16-Typen faktisch unbenutzbar**
- Auch `@builtin`-Attribute verboten, daher `fragCoord` (Bildschirmkoordinaten) und `vertex_index` nicht lesbar
- **Kein `let` auf Modulebene** (`const` oder `var` verwenden)
- `atomic` unbenutzbar
- Koordinaten sind noa-lokal. Für Weltkoordinaten `originOffset` addieren. Blockkoordinaten sind `vec3i(floor(position - normal * 0.5)) + originOffset`

## 9. Prüfung, Test und Verteilung

Beim Laden laufen diese Prüfungen der Reihe nach:

1. Loader-Limit-Prüfungen (Limits aus Abschnitt 3)
2. Statische Kompilierung (alle 8 Varianten)
3. Echte Kompilierung im Browser-WebGPU (die statische Prüfung typprüft nicht vollständig; mancher Code fällt erst hier – Fallen aus Abschnitt 8 meiden)

Schritte:

1. Zip / Ordner über Einstellungen → Shader Pack laden
2. Status prüfen. Erfolg ist "Ready to use". Bei "Saved, but it won't run until you fix these errors..." die gelisteten Fehler (Datei:Zeile + Variante) beheben und neu laden
3. Seite neu laden zum Aktivieren. Renderer-Overrides in URL-Parametern oder localStorage vorher entfernen, sonst verweigert das Paket den Start
4. Erst in permissiven Spielen testen, dann in strikten Spielen (die Mehrheit). Vertex-Animation geht nur in Allow-Spielen
5. Zum Verteilen mit `pack.json` obenauf zippen (innerhalb der Abschnitt-3-Limits). Dieselbe Seite neu zu laden ersetzt das Paket; Remove Pack löscht es. Re-Validierung nach Spiel-Updates läuft beim Seitenladen automatisch

# Teil II: API-Referenz

## 10. Engine-Header (wird automatisch vor Paket-Code gesetzt)

Die Engine fügt folgenden Code automatisch vor Paket-Code ein (Pakete dürfen ihn nicht erneut deklarieren). `#ifdef`-Abschnitte variieren je Variante.

```wgsl
// Engine-provided and read-only to packs. apiVersion 1.
struct bloxd_VertexIn {
    position: vec3f,     // noa-local world space (world minus originOffset)
    normal: vec3f,
    originOffset: vec3i, // whole blocks
    time: f32,           // seconds, wrapped every 3600 s (part of the API)
}

#ifndef BLOXD_STRICT
struct bloxd_Vertex {
    position: vec3f,     // noa-local
}
#endif

struct bloxd_SurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher in v1)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    originOffset: vec3i, // a face's world block is vec3i(floor(position - normal * 0.5)) + originOffset
    eyePosition: vec3f,  // noa-local
    time: f32,
    sunDirection: vec3f, // unit, towards the sun, in world orientation; zero when the sky has no sun
}

struct bloxd_Surface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct bloxd_LightIn {
    engineColour: vec3f, // the engine's result for this fragment, from the surface hook's colour
    directional: f32,    // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,      // the material's ambient times the scene's
#ifdef BLOXD_LIGHTING
    blockLight: vec3f,   // voxel block light, tone-mapped
    skyLight: f32,       // voxel sky light, tone-mapped
    ambientLightColour: vec3f,
    skyLightColour: vec3f,
    heldLight: vec3f,    // held light here, tone-mapped like blockLight, before the ambient boost; 0 out of reach
#endif
    fogColour: vec3f,
    fogFactor: f32,      // 1 = no fog, 0 = fully fogged
    position: vec3f,     // as in bloxd_SurfaceIn
    normal: vec3f,
    originOffset: vec3i,
    eyePosition: vec3f,
    time: f32,
    sunDirection: vec3f,
}

struct bloxd_Light {
    colour: vec3f,
}

#ifndef BLOXD_STRICT
fn bloxd_defaultVertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    return bloxd_Vertex(v.position);
}
#endif

fn bloxd_defaultSurface(s: bloxd_SurfaceIn) -> bloxd_Surface {
#ifdef BLOXD_ALPHA
    return bloxd_Surface(s.colour, s.alpha, vec3f(0.0));
#else
    return bloxd_Surface(s.colour, vec3f(0.0));
#endif
}

fn bloxd_defaultLight(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    return bloxd_Light(l.engineColour + s.emission * l.fogFactor);
}
```

Kernpunkte:

- `time` wrappt alle 3600 Sekunden und ist verstrichene Zeit. Keine garantierte Synchronisation mit der Tag/Nacht-Uhr im Spiel.
- `sunDirection` ist nur ein Einheitsvektor, solange eine Sonne existiert; null, wenn der Himmel keine Sonne hat. **Der Mond ist immer `-sunDirection`** (die Engine berechnet die Mondposition als exaktes Gegenteil der Sonne). In Standardwelten ist die Sonne aber statisch, der Mond also auch — ein bewegter Mond zählt nur in Welten mit Tag/Nacht-Zyklus (siehe Teil VII, Abschnitt 24)
- ※Hinweis: früher als „bei null nicht als Mondrichtung wiederverwendbar" formuliert. Die Richtung selbst ist via `-sunDirection` verfügbar, aber Vertriebspakete sollten mit `sunPresent` auf Null-Prämisse verzweigen (zum blauen Umgebungs-Pseudo-Look siehe R2, zum gerichteten Mondlicht Teil VII R-A)
- `emission` wird nach der Lichtberechnung addiert, gedämpft mit **`fogFactor`** (die defaultLight-Implementierung `engineColour + emission × fogFactor`. Emission verschwindet auch in völlig vernebelter Ferne)
- **Fog-Anwendungsreihenfolge**: Fragment-Verarbeitung läuft ① Licht/Emissions-Komposition → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogFactor)` → ④ Light-Hook-Aufruf → ⑤ return. **engineColour kommt also gefoggt an**, und **der Light-Hook-Rückgabewert wird unverändert zur Endfarbe** (nach dem Hook wird kein Fog neu angewandt)
- **fogFactor-Herkunft**: View-Space-Distanz (pro Vertex berechnet, interpoliert). Im Linear-Modus `fogFactor = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **Bei fogMode == 0**: `fogColour` kommt als `vec3f(0.0)` (schwarz) an. Code, der Tageszeiten aus fogColour-Tönung schätzt, sei vorsichtig
- **Echte Fog-Einstellungen aktueller Builds**: **linear fixiert**. `fogStart` = Chunk-Sichtweite, `fogEnd` = +1 Chunk (nur Horizont). Bei Fog-aus auf 100 / 101 Chunks gesetzt, faktisch deaktiviert. Standard-Fog-Farbe RGB(183, 191, 195)
- Ein Uniform namens `bloxd_packInputs` existiert engine-intern, aber **Pakete können es nicht direkt referenzieren**. Werte über Hook-Input-Felder (`s.time` etc.) nutzen
- **`skyLight` / `blockLight` / `heldLight` kommen nach einer „Lift-Kurve" an**. Das `tone-mapped` in den Header-Kommentaren meint dies: Die Engine wendet immer `y = 1-(1-x/(3-2x))³` (eine dunkle Bereiche anhebende S-Kurve) auf Fragmente an, bevor sie Pakete erreichen. Keine rohen Voxel-Werte (n/15); z. B. kommt unter einem Baum (roh 0,87) angehoben als **0,97** an
- `skyLight` ist im Kern Voxel-Verdeckungsdaten für „ist von hier Himmel sichtbar" (= eine Schattenkarte), kein bloßer Helligkeitsparameter (siehe Abschnitt 15, „Die Wahrheit über Schatten")

## 11. Variantentabelle

| Variante | BLOXD_STRICT | BLOXD_LIGHTING | BLOXD_ALPHA |
|---|---|---|---|
| allow + unlit + Terrain | – | – | ✓ |
| allow + unlit + Flüssigkeit | – | – | ✓ |
| allow + lit + Terrain | – | ✓ | ✓ |
| allow + lit + Flüssigkeit | – | ✓ | ✓ |
| strict + unlit + Terrain | ✓ | – | – |
| strict + unlit + Flüssigkeit | ✓ | – | ✓ |
| strict + lit + Terrain | ✓ | ✓ | – |
| strict + lit + Flüssigkeit | ✓ | ✓ | ✓ |

Auch Header-Struct-Formen ändern sich je Variante (kein `bloxd_Vertex` in strict, kein `blockLight` etc. in unlit, kein `alpha` in strict-Terrain).

## 12. Skelett-Spickzettel

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);          // direkte Konstruktion verboten; immer von default ausgehen
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // Terrain hat alpha nur in allow
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);         // engineColour + emission*fogFactor
    #ifdef BLOXD_LIGHTING                       // nur-Licht-Inputs schützen
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // Vertex immer mit diesem Guard
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    out.position.y += sin(v.time) * 0.05;
    return out;
}
#endif
```

Fünf Dinge immer im Kopf: in allen 8 Varianten sauber kompilieren / strikte Spiele sind die Mehrheit / keine Texturen / Hook-Parameter sind schreibgeschützt / kein `let` auf Modulebene.

---

# Teil III: Rezeptsammlung

> **Wichtig:** Die Rezepte unten sind einzelne Beispiele, nicht zum Aneinanderhängen von oben nach unten gedacht. Mehrere Definitionen desselben Hook-Namens (`bloxd_terrain_light` etc.) oder desselben Hilfsfunktionsnamens erzeugen doppelte Definitionen in einem Modul und lassen die Kompilierung scheitern. Zum Kombinieren von Effekten in jeweils eine Funktion pro Hook-Typ zusammenführen.

## R1. Farbrezepte (Surface)

### Einzelfarbton (am grundlegendsten)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Sättigung boosten / entsättigen

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 lebendig / -1.0 total monochrom
```

### Farbtemperatur (warm ⇄ kalt)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = warm (stark rot), -1.0 = kalt (stark blau)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### Vintage / Sepia

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### Höhengradient (warmes Tiefland)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldY = s.position.y + f32(s.originOffset.y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 1..0 über Höhe 0..50
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Nach Flächenausrichtung färben (oben = hell, Wände = dunkel)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // Boden 1 / Wand 0 / Decke -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // Wände und Decken etwas dunkler
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Posterisieren (weniger Farben)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. Lichtrezepte (Light)

### Kontrast-S-Kurve

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### Distanz-Dunst (eigener Fog)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
    // 0..0.35 eigenen Fog von 64 bis 192 Blöcken dazugeben
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### Nacht (skyLight-Blauverschiebung + Lampenschutz)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
    #endif
    return out;
}
```

### Höhlen stockdunkel (skylight-lose Stellen weiter abdunkeln)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    out.colour *= mix(1.0, 0.35, underground * underground);
    #endif
    return out;
}
```

> `skyLight` kommt post-Lift an (Abschnitt 10): flache Verdeckung (unterm Baum: roh 0,87 → geliftet 0,97) dunkelt mit dieser Methode kaum. Für Höhlen (roh 0) tauglich. Um „Baumschatten" zu schärfen, Lift-Inversion + Schwellenwert aus R9.12 verwenden.

### Blaues Nacht-Ambiente (Pseudo-Look ohne Mondrichtung)

> In dieser API ist `sunDirection` null, wenn der Himmel keine Sonne hat. Folgendes ist kein gerichtetes Mondlicht, nur schwaches blaues Ambiente bei dunklem Himmel. Die Mondrichtung selbst ist via `-sunDirection` verfügbar (nur Welten mit Tag/Nacht-Zyklus. Teil VII R-A).

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
    let night = 1.0 - sunPresent;
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let upward = clamp(l.normal.y, 0.0, 1.0);
    out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
    #endif
    return out;
}
```

### Abendrot-Wärme (Farbton nach Sonnenhöhe)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 am Horizont / 0 im Zenit
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### Totaler Engine-Output-Ersatz (einfachstes Relighting)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    #ifdef BLOXD_LIGHTING
    // HINWEIS: direkte bloxd_Light(...)-Konstruktion verboten; colour ab default umschreiben
    var out = bloxd_defaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // engineColour (das Engine-Lichtergebnis) verwerfen und „Basisfarbe × selbst berechnete Helligkeit" einsetzen
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogFactor);   // engineColour verworfen: Fog-Neuanwendung Pflicht
    out.colour = col + s.emission * l.fogFactor;   // Emission selbst dazugeben (Pflicht)
    return out;
    #else
    return bloxd_defaultLight(s, l);
    #endif
}
```

## R3. Emissionsrezepte

> `emission` wird nach der Lichtberechnung addiert, aber die Standardverarbeitung **dämpft es mit `fogFactor`. In völlig vernebelter Ferne verschwindet Emission ebenfalls. Um Glanz in der Ferne zu behalten, nicht auf emission addieren — direkt als `out.colour += ...` im Light-Hook addieren** (engineColour ist bereits gefoggt, also landet Licht in der Ferne auf der Fog-Farbe)

### Pulsierende Lampen (atmende Fackeln)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(l.time * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### Leuchterz-Look (helle Materialien strahlen)

```wgsl
// Surface-Seite: je heller (weißer) das Material, desto mehr Emission
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### Glühwürmchen-Schwarm (treibende Lichtpunkte)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let world = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    // ein paar langsam treibende „Lichtkugeln"; Glühen per inverser Distanz
    let t = l.time * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(l.time * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. Koordinatenrezepte (Welt / Block / Sicht)

### Weltkoordinaten

```wgsl
let worldPos = s.position + vec3f(f32(s.originOffset.x), f32(s.originOffset.y), f32(s.originOffset.z));
```

### Blockkoordinaten

```wgsl
let worldBlock = vec3i(floor(l.position - l.normal * 0.5)) + l.originOffset;
```

### Schachbrett (pro Block)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 oder 1
out.colour *= mix(0.96, 1.04, checker);
```

### Block-Pseudozufall (Hash)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// Nutzen: Grasfarbvariation, Steinmarmorierung etc.
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### Sichtvektor und Rim-Light

```wgsl
let viewDir = normalize(l.eyePosition - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### Sichtwinkel (Fresnel-Hausmittel — für Flüssigkeiten)

```wgsl
let viewDir = normalize(s.eyePosition - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 frontal / 0 streifend
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. Zeitrezepte (Animation)

> `time` wrappt alle 3600 Sekunden (1 Stunde). Es ist Shader-Laufzeit ohne garantierte Synchronisation mit Tag/Nacht im Spiel. Für sichtbare periodische Animation ok, aber für echte Nachterkennung `sunDirection` und Licht-Inputs bevorzugen.

### Tag-Nacht-Zyklus (1 Tag pro Stunde)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let day = 0.5 + 0.5 * sin(l.time * 6.2831853 / 3600.0);   // 0..1 Stundenperiode; nicht unbedingt mit Tag/Nacht im Spiel synchron
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### Wobbeln (überlagerte Sinus)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### Wandernde Aurora-Bänder / Fluoreszenzstreifen

```wgsl
// 3 Farben über XZ-Position und Zeit mischen
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

## R6. Flüssigkeitsrezepte

### Gekräuselte Oberfläche (Farbschimmer)

```wgsl
fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldX = s.position.x + f32(s.originOffset.x);
    let worldZ = s.position.z + f32(s.originOffset.z);
    let ripple = sin(s.time * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // Liquid hat immer BLOXD_ALPHA — Guard aus Gewohnheit
    #endif
    return out;
}
```

### Höhen-Pseudo-Transparenz (kein echter Flachwassertest)

> Szenentiefe und Grundposition sind nicht abfragbar: echte Wassertiefe lässt sich mit dieser API allein nicht berechnen. `s.position.y` ist eine lokale Koordinate und roh verwendet verschiebt sich der Effekt mit dem Chunk-Ursprung. Folgendes variiert alpha nur über Welthöhe — Pseudo-Effekt, kein küsten-/grundbewusstes Flachwasser. `packWaterReferenceY` an die eigene Welthöhe anpassen.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldY = s.position.y + f32(s.originOffset.y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // unten dünner, oben näher am Basis-Alpha; Richtung im Spiel prüfen
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### Unterwassertrübung von innen

```wgsl
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### Nur-Flüssigkeits-Paket (Terrain unberührt)

```wgsl
// Keine terrain_*-Hooks schreiben. Dann:
//  - Terrain-Varianten = ohne Hooks = Engine-Defaults
//  - Liquid-Varianten  = nur liquid_*-Hooks wirken
```

## R7. Vertex-Rezepte (nur allow)

> Alles in `#ifndef BLOXD_STRICT` einpacken.

### Gras im Wind (nur Spitzen bewegen)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let sway = sin(v.time * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // nur vertikale Flächen
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### Flüssigkeitswellen (nur Oberseiten)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_liquid_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + v.time * 1.6) * 0.5
              + sin(v.position.z * 1.2 + v.time * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### Pulsierendes Terrain

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let pulse = sin(v.time * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // leichtes Aufblähen/Schrumpfen entlang Normalen
    return out;
}
#endif
```

### Wogendes Terrain (riesige Sinuswellen)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + v.time * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - v.time * 0.7) * 0.3;
    return out;
}
#endif
```

## R8. Mathe-Tricks

```wgsl
// weiche Quantisierung von 0..1 (n Stufen)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 2-Stufen-Schwelle (Toon-Schatten)
let shadow = smoothstep(0.35, 0.37, level);   // ±0.02 um die Schwelle baut Stufen

// 3-Stufen-Toon
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// Luma (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// weicher Puls
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// Dreieckswelle (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// Sekunden → „langsame Phase" (für Effekte, die den 3600-s-Umlauf ignorieren)
let phase = t * 0.15;
```

## R9. Realismus-Rezepte

> Physik-Rezepte zum „Vanilla-Look aus Materialien neu aufbauen". Erst diese Prämissen lesen:
>
> 1. **Der Light-Hook läuft in der letzten Fragment-Stufe**. Seine zurückgegebene Farbe wird unverändert zur Endfarbe. **Fog selbst neu anwenden** (R9.10)  
> 2. **Das Engine-Standardlicht ist nur Multiplikation**. Specular / Fresnel / Warm-Kalt-Trennung / Hemisphären-Ambiente werden von null aufgebaut  
> 3. `l.engineColour` ist die fertige Farbe (bereits gefoggt). Neuaufbau aus `s.colour` (Albedo) ist der Königsweg  
> 4. Texturen verboten → alle Details müssen **prozedural** sein (Hash/Rauschen) (R9.8)

### R9.1 Warme Fackeln × kaltes Himmelslicht

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // Zwischen-Clamp
    col = mix(l.fogColour, col, l.fogFactor);                    // Fog-Neuanwendung
    out.colour = col + s.emission * l.fogFactor;                 // Emission-Re-Addition
    #endif
    return out;
}
```

### R9.2 Sonnen-Specular (Blinn-Phong)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
        let h = normalize(viewDir + sunDir);          // Halbvektor
        let ndh = max(dot(n, h), 0.0);
        let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
        let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
        out.colour += spec * vec3f(1.0, 0.97, 0.90);
    }
    #endif
    return out;
}
```

### R9.3 Schlick-Fresnel

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // zarter Randglanz
    #endif
    return out;
}
```

### R9.4 Hemisphären-Ambiente (Himmel oben / Boden-Bounce unten)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // unten: Bounce
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // oben: Himmelslicht
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // Zwischen-Clamp
    col = mix(l.fogColour, col, l.fogFactor);                           // Fog-Neuanwendung
    out.colour = col + s.emission * l.fogFactor;                        // Emission-Re-Addition
    #endif
    return out;
}
```

### R9.5 ACES-Filmic (Narkowicz-Näherung)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = Belichtung
    return out;
}
```

### R9.6 Luftperspektive („Atmosphäre" per Distanz-Entsättigung)

> Anders als Fog (Farbtausch) macht überlagerte „Distanz-Entsättigung" Fernen deutlich realistischer.  
> Vorsicht: nur Sättigung senken — nie Luminanz anfassen.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // Abfall (~30% bei 100blk / ~75% bei 400blk)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // nur Sättigung senken (Luminanz unverändert)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 Wellennormalen + Sonnenglitzer („Sonnenstraße" auf Wasser)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // Höhe h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // dh/dx
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // dh/dz
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, l.time), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(l.eyePosition - l.position);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
        let h = normalize(viewDir + sunDir);
        let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
        out.colour += glint * vec3f(1.0);
    }
    #endif
    return out;
}
```

### R9.8 Prozedurales Mikro-Bump (Texturverbots-Workaround)

```wgsl
fn pack_hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}
fn pack_bumpNormal(p: vec3f, n: vec3f, strength: f32) -> vec3f {
    let e = 0.15;
    let h0 = pack_hash(p);
    let hx = pack_hash(p + vec3f(e, 0.0, 0.0));
    let hz = pack_hash(p + vec3f(0.0, 0.0, e));
    let tangentX = normalize(cross(vec3f(0.0, 1.0, 0.0), n) + vec3f(0.0001, 0.0, 0.0));
    let tangentZ = normalize(cross(n, tangentX));
    return normalize(n + tangentX * (hx - h0) * strength + tangentZ * (hz - h0) * strength);
}
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // blocklokale Koordinaten
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
        let lam = clamp(dot(n, sunDir), 0.0, 1.0);
        let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
        out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
    }
    #endif
    return out;
}
```

### R9.9 Nichtlineare Höhlenabdunklung + Lampenschutz

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let keep = 0.12 + 0.88 * blockInt;          // Lampenstellen anheben
    out.colour *= mix(keep, 1.0, sky * sky);     // nichtlineare (quadrierte) Abdunklung
    #endif
    return out;
}
```

### R9.10 Fog neu anwenden (Pflicht beim Verwerfen von engineColour)

> Ein Floor wie `max(l.fogFactor, 0.25)` begrenzt „nicht dichter als dies"
> (0.0 = engine-treu / 0.3–0.5 = klarere Ferne).
> Hinweis: Der Engine-Fog ist reiner Horizont-Linear-Fog (nur nahe Sichtweite); mittleren Dunst muss das Paket bauen.
> Echte Fog-Einstellungen (implementierungsverifiziert): linear fixiert / `fogStart` = Chunk-Sichtweite / `fogEnd` = +1 Chunk / bei Fog-aus auf 100–101 Chunks faktisch deaktiviert / Standardfarbe RGB(183, 191, 195).

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogFactor, 0.15));  // Fog-Neuanwendung (0.15 = leichter Floor)
    col += s.emission * l.fogFactor;            // Emission ebenfalls gefoggt
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 Cinema-Grade (kalte Schatten / warme Highlights / Nacht-Entsättigung)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
    let night = 1.0 - sunPresent;  // Nacht nur bei Sonnenrichtung null; kein Abendrot-Gradient
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 Projektionsschatten — Lift-Inversion + Schwellenwert-Schnitt (definitiv)

> **Prämissen-Recheck (Abschnitt 10)**: `l.skyLight` ist nicht der rohe Voxel-Wert (n/15), sondern der Wert nach der Engine-„Lift-Kurve"  
> `y = 1-(1-x/(3-2x))³` (dunkle Bereiche anhebende S-Kurve).
>
> | Ort | Voxel roh | geliftet (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | offener Himmel | 1.00 | 1.00 | 1.00 |  
> | unterm Baum (Radius 2) | 0.87 | **0.97** | **0.86** ← fast unversehrt |  
> | Radius 3 | 0.80 | **0.92** | 0.66 |  
> | Radius 5 | 0.67 | 0.78 | 0.29 |
>
> **Dies ist die bewiesene Wurzel von „Schatten werden mit Gamma nie tiefer"**. Die Kurve ist aber monoton und damit algebraisch exakt invertierbar:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Nach Wiederherstellung der Rohwerte genügt Binarisierung per Schwellenschnitt (`smoothstep`).  
> Die LightEngine-BFS-Seitenausbreitung ist „1 Block = -1", also wählt die Schwelle `th = 1 - r/15` direkt  
> „Verdeckung ab Radius r zählt als Schatten". Blöcke zu brechen bewegt Schatten sofort (LightEngine rechnet in Echtzeit neu).  
> Limit: Schatten basieren auf „Himmel nach oben", rotieren also nicht mit der Sonne (Abschnitt 15, „Die Wahrheit über Schatten").

```wgsl
// Engine-Lift exakt invertieren, um rohes Voxel-skyLight (n/15) wiederherzustellen
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // kein cbrt in WGSL, pow nehmen
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // Schattenradius-Regler: th = 1 - r/15 (0.87 = Radius 2+ ist Schatten)
const shSoft = 0.04;   // Kantenweichheit (0.02 = hart / 0.08 = weich)
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. Rohwerte wiederherstellen (überspringen gibt niemals Schatten)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. Schwellenschnitt — trennt sauber Sonne=1 / Schatten=0
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // Sonnen-Lambert (Fallback auf l.directional ohne Sonne)
    let sunLen = length(l.sunDirection);
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), l.sunDirection / sunLen), 0.0, 1.0),
                      sunLen > 0.5);
    // Essenz der Projektion: direkte Sonne erreicht nur sichtbaren Himmel
    let lit = sunL * sky;
    // Schattenseite: himmelblau getönt, nicht schwarz + Mindest-Ambiente
    let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
    var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
    // Fackellicht durchdringt Schatten (blockLight auch geliftet: zusammen restaurieren)
    let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                         sh_unlift(l.blockLight.g),
                         sh_unlift(l.blockLight.b));
    let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
    col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
    // Fog neu anwenden (Anteil des verworfenen engineColour)
    col = mix(l.fogColour, col, max(l.fogFactor, 0.15));
    out.colour = clamp(col + s.emission * l.fogFactor, vec3f(0.0), vec3f(1.0));   // Emission nicht vergessen (gefoggt)
    #endif
    return out;
}
```

> Tuning-Guide: **Schattenfläche entscheidet allein `shTh`** — `0.93` = Radius 1.5+ / `0.87` = Radius 2 / `0.80` = Radius 3 / `0.67` = Radius 5.  
> Kanten­härte ist `shSoft` (0.02 = hart / 0.08 = weich). Kern­dunkelheit ist die Zwei-Punkt-Verschiebung aus `0.09` (Mindest-Ambiente) und `0.16` (Himmelsstreulicht).  
> Für breitere Abend­schatten `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` addieren (Näherung langer Abendschatten.  
> `sunDir` ist `l.sunDirection / length(l.sunDirection)`). Für blauere Schatten das B von `vec3f(0.72, 0.82, 1.05)` erhöhen.
>
> ⚠️ „Kontrast mit `pow(skyLight, γ)` vertiefen" **legte Gamma auf geliftete Werte** und wirkte unterm Baum nie (0.97). Stattdessen diese Methode verwenden.

---

# Teil IV: Realismus-Leitfaden

## 13. Engine-Standardlicht und Realismus-Spielraum

Das Engine-Standardlicht ist „nur Multiplikation" — kein Specular, Fresnel, Warm-Kalt-Trennung oder Hemisphären-Ambiente existiert. Folgendes lässt sich neu aufbauen:

| Feature | Standard | In Paketen baubar? |
|---|---|---|
| Diffus (Lambert) | Nur skalare Richtlicht-Summe | ◎ Eigen mit `sunDirection` (Wrap-Quellen etc.) |
| Specular | Keins | ◎ Blinn-Phong (R9.2) |
| Fresnel | Keins | ◎ Schlick-Näherung (R9.3) |
| Warme Fackel / kaltes Himmelslicht-Trennung | Farblos | ◎ (R9.1) |
| Hemisphären-Ambiente | Richtungslos | ◎ Himmel oben / Boden unten (R9.4) |
| Tonemapping | Keins (nur clamp) | ◎ ACES-Filmic (R9.5) |
| Luftperspektive | Nur Fog (Farbtausch) | ◎ Distanz-Entsättigung (R9.6) |
| Oberflächendetail | Nur Texturauflösung | △ Prozedurales Hash-Mikro-Bump (R9.8) |
| Vertex-Wellen (Wasser) | Keine (flach) | ◎ Nur allow (R7) |
| Wellennormalen / Sonnenglitzer | Keine | ◎ (R9.7) |
| Nachtmondlicht | Himmelsfarbe dunkelt nur ab | △ Mondrichtung liegt in `-sunDirection`: Pseudo-Looks (blaues Ambiente in R2 / Entsättigung in R9.11) plus gerichtetes Mondlicht (R-A, nur Tag/Nacht-Zyklus) |
| Schatten (Himmelsverdeckung) | Nur sanftes Mischen via `mix(Ambiente, Himmel, skyLight)` | ◎ Lift-Inversion + Schwellenwert-Schnitt + Sonnen-Gate (R9.12). Baumschatten und Dachschatten fallen klar und folgen Block-Edits in Echtzeit |

## 14. Zwei Umsetzungs-Schulen

**Schule A: additive Fixes (ab defaultLight)** — `engineColour` (fertige Farbe) als Basis nutzen und warmen Glow oder Rim addieren. Leicht und sicher, aber das Lichtmodell bleibt Standard.

**Schule B: totales Relighting (ab s.colour)** — `l.engineColour` verwerfen und Licht aus `s.colour` (Albedo) und rohen LightIn-Materialien neu aufbauen. Der Königsweg zum Realismus. Vier Regeln:

1. **Fog neu anwenden**: Der Light-Hook läuft post-Fog; `mix(l.fogColour, col, l.fogFactor)` selbst anwenden (R9.10). Bei dichtem Fog mit `max(l.fogFactor, 0.3)` einen Floor legen. Umgekehrt: mehr Fog-Farbe in engineColour-basierte Pakete zu mischen ergibt weißen Doppel-Fog
2. **Unlit-Fallback**: außerhalb `#ifdef BLOXD_LIGHTING` an `defaultLight` durchreichen
3. **Gemeinsame Funktionen als Ganzes schützen**: gemeinsame Funktionen mit `bloxd_LightIn`-Parameter als ganze fn in `#ifdef BLOXD_LIGHTING` packen (nur Aufrufstellen reicht nicht)
4. **Ohne Sonnenrichtung**: Ist `sunDirection` null, kein gerichtetes Specular berechnen. `l.directional` ist ein Lichtmengen-Skalar, kein Richtungsvektor: stellt die Highlight-Richtung nicht wieder her. Bei Bedarf auf schwaches richtungsloses Ambiente wechseln. Die Mondrichtung ist via `-sunDirection` verfügbar (bewegt sich nur in Welten mit Tag/Nacht-Zyklus. Teil VII R-A)

## 15. Unerreichbare Looks (die Realismus-„Decke")

| Look | Grund |
|---|---|
| Pixelgenaue Shadowmaps (mit der Sonne rotierende Schatten, Penumbra) | Tiefentexturen nicht referenzierbar. Strahlverdeckung kommt nicht in Hooks an |
| SSAO | Kein Szenentiefenzugriff (nur Mesher-gebackene Vertex-AO) |
| SSR (Reflexionen) | Ebenso. Nur Pseudo-Looks per Fresnel-Himmelsfarbe |
| Bloom / Glare | Kein Hook ins Post-Processing |
| Tiefenschärfe, chromatische Aberration, Grain | Vollbild-Post-Processing nötig |
| Volumetrisches Licht (God Rays) | Ebenso |
| PBR-Texturen | Textur-Reads verboten. Nur Pseudo-Schätzung aus Farbluminanz |
| Unterwasser-Refraktion | Kein Szenentiefen-Input |
| Unterwasser-Schleier (blaue Tönung) entfernen/ändern | Der Schleier ist ein emissives Fullscreen-Quad aus Definitionsfarbe/-alpha des Flüssigkeitsblocks der Kamera, außerhalb der Hook-Pipelines (ganz vorne) gezeichnet: Das Paket kann weder Farbe noch Dichte ändern |
| Direkte Unterwasser-Erkennung | Kein Feld zeigt Kamera-Untertauchen; fogStart / fogEnd / fogColour ändern sich unter Wasser nicht: Auch aus fogFactor etc. gibt es keine verlässliche Schätzung |

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

Praktische Punkte: Pakete wirken auch unter Wasser weiter / der Schleier ist nicht entfernbar / unter Wasser ist keine Verzweigung möglich (fogStart / fogEnd / fogColour ändern sich unter Wasser nicht: fogFactor erkennt es auch nicht).

## 16. Debugging-Tipps

- Zu helle Höhlen → nichtlineare `skyLight`-Kurve fehlt (Höhlenrezept R2 / R9.9)
- Ausgebrannte Tage → Pre-ACES-Belichtung senken
- Zu dunkle Nächte → Mindest-Ambiente sichern (Nacht-`skyLightColour` ist prämissenhaft fast schwarz)
- Zu dunstige Ferne → Luftkoeffizienten senken
- Alles orange um Fackeln → Warmanteil senken (etwas rohes getöntes Licht behalten)
- Blöcke fast durchweg weiß → Light-Hook-Output-Summe über 1.0 (downstream kein Clamp). Mit `clamp(col, vec3f(0.0), vec3f(1.0))` enden
- Weiß ohne Additionen → Un-Fog-Inversion per fogFactor-Division. Un-Fog raus; ab `s.colour` neu aufbauen und Fog einmal am Ende per `mix`
- Emissions-Blöcke leuchten nicht → fehlende Emissions-Re-Addition in Rebuild-Rezepten. `+ s.emission * l.fogFactor` dazugeben
- Nachts bleiben nur beleuchtete Flächen → nicht nur Schatten abdunkeln; die ganze fertige Farbe (`engineColour`) nachts dämpfen. Lokale Lampen per `blockLight` / `heldLight` weniger dämpfen (Teil VI, Abschnitt 19)
- Schatten vertiefen sich mit `pow(skyLight, γ)` nicht → `l.skyLight` ist post-Kurve (Abschnitt 10). Auf R9.12-Inversion + Schwelle wechseln
- Schattenfläche/-dichte tunen → R9.12-Tuning-Guide (Fläche = Schwelle `shTh` / Kante = `shSoft` / Kerndunkelheit = Zwei-Punkt-Verschiebung aus Mindest-Ambiente und Himmelsstreulicht)

---

# Teil V: Fehlersuche & Hinweise

## 17. Häufige Fehler und Fixes

| Symptom | Fix |
|---|---|
| Lädt in strikten Spielen nicht | Vertex-Hook in `#ifndef BLOXD_STRICT` packen |
| `.alpha` als undefiniert gemeldet | In `#ifdef BLOXD_ALPHA` packen |
| `blockLight` als undefiniert gemeldet | In `#ifdef BLOXD_LIGHTING` packen. Gemeinsame Hilfsfunktionen **als ganze Funktionen** einpacken |
| `Packs can't construct bloxd_Surface directly` | Von `bloxd_defaultSurface(s)` ausgehen |
| `bloxd_Vertex only exists when BLOXD_STRICT isn't defined` | In `#ifndef BLOXD_STRICT` packen |
| Weiße milchige Ferne | Meist Doppel-Fog. Die fertige Farbe ist bereits gefoggt: eigenen Dunst dezent halten und lieber nur Sättigung senken |
| Paket beim Spielbeitritt ausgeschlossen | Live-Check im Spiel schlägt fehl. Guard-Lücken prüfen |
| `pack.json needs "apiVersion": 1.` | `apiVersion` fehlt. Zahl `1` ergänzen (String `"1"` wird abgelehnt) |
| `There's no pack.json at the top of the pack.` | Kein `pack.json` im ZIP-Root. Prüfen, ob nicht der Ordner selbst gezippt wurde |
| `bloxd_terrain_vertex must be declared as: fn ...` | Signatur weicht ab. Exakt wie angezeigt umschreiben |
| `bloxd_terrain_vertex can't run in strict games...` | Vertex-Hook in `#ifndef BLOXD_STRICT` packen |
| `bloxd_LightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | In `#ifdef BLOXD_LIGHTING` packen |
| `pow(l.skyLight, γ)` höher zu drehen vertieft Schatten nie | `skyLight` ist Post-Kurven-Wert (roh 0,87 kommt als 0,97). Auf R9.12-Lift-Inversion + Schwelle wechseln (Abschnitt 10) |
| `... can only be a function's parameter or return type, ...` | Uninitialisiertes `var x: bloxd_Surface;` wird abgelehnt. Ab `bloxd_default*` bauen |
| `bloxd_packInputs isn't part of the bloxd_ header` | Das PackInputs-Uniform kann aus Paketen nicht referenziert werden. Hook-Input-Felder (`s.time`, `s.originOffset`, `s.sunDirection`) verwenden |
| `Packs can't declare bloxd_ names...` | Das `bloxd_`-Präfix aus eigenen Bezeichnern entfernen. Nur die 6 Hook-Namen dürfen definiert werden |
| `loadDuplicateManifest` beim Zip-Laden | Zwei `pack.json` (inkl. Groß/Klein-Varianten). Eines behalten |
| `Packs can't construct bloxd_Surface directly, since header structs gain fields; ...` | Ab `bloxd_defaultSurface(s)` umschreiben. Von einer Kopie des ersten Light-Hook-Parameters (`var out = s;`) zu starten geht auch |

## 18. Rechte & Hinweise

- Die Shader-Paket-Funktion ist eine offizielle, aus der Spiel-UI ladbare Funktion, Pakete zu erstellen gilt als vorgesehener Gebrauch. Es wurde aber keine öffentliche offizielle Dokumentation bestätigt
- Pakete sind reines WGSL — JS-Ausführung und Netzwerkzugriff sind konstruktionsbedingt unmöglich
- Dies ist eine inoffizielle Anleitung, nicht die offizielle Position der Entwickler. Die API kann sich ohne Hinweis ändern

---

# Teil VI: Wichtige Umsetzungshinweise

## 19. „Dunkle Schatten, aber helle Flächen" nachts beheben

Nur Schatten abzudunkeln lässt die fertige Farbe (`engineColour`) ohne Sonne hell, und die Flächen/Schatten-Lücke wird unnatürlich. Die ganze fertige Farbe dämpfen.

Das Beispiel behandelt `sunDirection`-null als Nacht und gerichtete Sonne als Tag und dämpft Terrain-Endfarben in dunklen Stunden. Wo `blockLight` und `heldLight` stark sind, schwächt sich die Dämpfung, um nahe Lampen wie Fackeln zu erhalten. `0.52` ist ein Tuning-Wert — für dunklere Nächte senken.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    #ifdef BLOXD_LIGHTING
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
    let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
    let protectLocalLight = smoothstep(0.03, 0.35, localLight);
    scale = mix(nightDim, 1.0, protectLocalLight);
    #endif
    // fertige Farbe dämpfen; Material-Emission per Default mit Fog addieren
    out.colour = l.engineColour * scale + s.emission * l.fogFactor;
    return out;
}
```

**Limits dieses Fixes:** Verhält sich `sunDirection` wie „Einheitsrichtung mit Sonne, null ohne", lassen sich Tag/Nacht unterscheiden, aber Abendrot nicht weich schätzen. Und da es die fertige Farbe dämpft, schwächt es Engine-Tageslicht und -Ambiente zusammen — keine totale Tageszeit-Reproduktion. Für Flüssigkeiten dieselbe Liquid-Hook-Fallback-Beziehung prüfen.

## 20. Integriertes Rezept für natürlich aussehendes Wasser

Diese API kann Szenenfarbe, Tiefe und Grund nicht sampeln: Es ist **Pseudo-Styling per Fresnel-Farbmischung und Sonnen-Highlights, keine echte Reflexions-/Refraktions-/Tiefenmathematik**. Das Sample behält die Basisfarbe, mischt bei streifenden Blickwinkeln etwas Richtung Himmelsfarbe und addiert nur mit Sonne einen kleinen Glint.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, l.time), topness));
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
        let halfDir = normalize(viewDir + sunDir);
        let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
        out.colour += vec3f(1.0, 0.97, 0.90) * glint;
    }
    #endif
    return out;
}
```

Tuning-Hinweise:

- Wasser weiß/ausgewaschen: `0.38` in `fresnel * 0.38` und Glint `0.55` senken.
- Wasser zu dunkel: etwas mehr `fakeSkyReflection` mischen. Zu viel wirkt plastisch.
- Linien oder regelmäßige Streifen auf Wasser: Wellenfrequenzen und Glint-Stärke senken. Dieser Code verschiebt keine Mesh-Vertices.
- Echte Landschaftsreflexionen: Diese API-Inputs haben keine Bildschirmfarbe und keine Tiefe: Farben zu mischen wird nie echte Reflexion.

Dieses Rezept **ersetzt** ein existierendes `bloxd_liquid_light`. Nicht neben die gleichnamige Wellenfunktion aus R9.7 oder andere gleichnamige Hooks kleben.

## 21. In-Game-Testcheckliste

Kompiliererfolg und „gutes Aussehen" sind verschiedene Dinge. In dieser Reihenfolge prüfen:

1. **Laden:** `pack.json` im ZIP-Root; Einstellungen zeigen `Ready to use`.
2. **8 Varianten:** keine Typ-Guard-Lücken in strict / allow, Licht an / aus, Terrain / Flüssigkeit. Auch wenn ein Spiel nur manche Bedingungen nutzt, sollten Vertriebspakete alle 8 annehmen.
3. **Tag:** Farben pro Material nicht ausgebrannt (Gras, Stein, Sand, Holz); natürlicher Hell/Dunkel-Sprung zwischen Oben und Seiten.
4. **Nacht:** dieselben Materialien im einstigen Tageslicht, Schatten und Fackelnähe vergleichen. Bleiben nur beleuchtete Flächen, Belichtungsdämpfung tunen; wird alles dunkel, lokalen Lichtschutz tunen.
5. **Wasser:** von oben, streifende Winkel, Ufer, unter Wasser und nachts getrennt ansehen. Alpha-Verhalten und Unterwasser-Look hängen vom Spiel-Compositing ab — nie von einem Blickwinkel urteilen. Unter Wasser deckt der Flüssigkeitsdefinitions-Schleier vorne ab (siehe oben): Paket-Unterschiede zeigen sich vor allem an Oberfläche und Terrain hinterm Schleier.
6. **Ränder und Ferne:** keine Wellen-/Mustersprünge an Chunk-/Ursprungsübergängen; kein Doppel-Fog und kein weißer Dunst in der Ferne.
7. **Performance:** fragment-schwere Hash/Trig/`pow`-Effekte minimal. Details schrittweise dazugeben und FPS vergleichen.

### Bekannte Einschränkungen als Prämissen

- Pakete beschränken sich auf Terrain-/Flüssigkeits-Hooks — kein Himmel, keine Entities, keine UI mit demselben Code.
- Keine Inputs, um Shadowmaps, Screen-Space-Reflexionen, Szenentiefe, Refraktion, Bloom etc. hinzuzufügen.
- `time` ist Animationszeit ohne garantierte Bindung an Tag/Nacht im Spiel.
- Bei `sunDirection`-null ist die wahre Mondrichtung unbekannt, keine „Mondlichtphysik" sondern Stimmungsnäherung. Gerichtetes Mondlicht baut man aus `-sunDirection` (nur Welten mit Tag/Nacht-Zyklus. Teil VII R-A).
- `s.position` / `l.position` sind lokale Koordinaten: `originOffset` für weltabhängige Effekte addieren. Für blocklokale Muster sind lokale Koordinaten bewusst das Werkzeug.

## 22. Mit anderen Paketen kombinieren, wenn der Shader allein ans Limit stößt

Da Pakete keine Texturen hinzufügen oder sampeln können, keine feinen Material-Bumps oder Himmelsbilder per Shader allein lösen wollen. Das öffentliche Texturpaket-Repo für Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) behandelt Texturen, Skybox, Modelle etc. auf anderem Weg.

Als Referenz entpuppten sich in einem Fall analysierte Community-„Cinematic-Shader"-Distributionen als Texturpakete (128x128-Texturen ohne `pack.json` / `.wgsl`).

In der Praxis **Licht und Farbe per Shader tunen und Materialien plus Himmel per passendem Ressourcenpaket abdecken**. Aber Co-Nutzung und Ladereihenfolge gegen Spiel-Implementierung und -Einstellungen prüfen.

In der Praxis **Licht und Farbe per Shader tunen und Materialien plus Himmel per passendem Ressourcenpaket abdecken**. Aber Co-Nutzung und Ladereihenfolge gegen Spiel-Implementierung und -Einstellungen prüfen.

## 23. Unterwasser-Realität mit Shader-Paketen

Unterwasser-Looks bestehen aus 3 Schichten:

| Schicht | Inhalt | Aus Paketen operierbar? |
|---|---|---|
| ① Terrain-/Flüssigkeits-Rendering | Per Hooks verarbeitbar. Light-Hooks laufen unter Wasser normal | Ja (wirkt „unterm Schleier") |
| ② Flüssigkeitsdefinitions-Schleier | Emissives Fullscreen-Quad aus Definitionsfarbe/-alpha des Flüssigkeitsblocks der Kamera, ganz vorne gezeichnet. Die Spieleinstellung `cameraTint` gewinnt, falls gesetzt | Nein (weder Farbe noch Dichte änderbar) |
| ③ cameraTint | Spieleinstellung | Nein |

Praktische Punkte: Pakete wirken auch unter Wasser weiter / der Schleier ist nicht entfernbar / unter Wasser ist keine Verzweigung möglich (fogStart / fogEnd / fogColour ändern sich unter Wasser nicht: fogFactor erkennt es auch nicht).

---

# Teil VII: Interna-Ergänzung

Extra-Spezifikationen aus Engine-Implementierungsanalyse. Alles direkt aus dem JavaScript des aktuellen Produktions-Builds restauriert.

## 24. Sonnen- und Mondidentität

Die `l.sunDirection`-Quelle ist ein Sonnenrichtungs-Buffer, der nur bei Skybox-Typwechsel neu geschrieben wird — Kriterium ist nicht „ob der Himmel eine Sonne hat", sondern **„ob die Skybox vom Erdtyp ist"**.

| Skybox | `l.sunDirection` |
|---|---|
| `default` (prozeduraler Himmel) | Nicht null (Defaults unten) |
| `gloomy` / `interstellar` / `space_*` (Cube-Texturen) | **Immer (0,0,0)** |

**Der Mond ist immer `-sunDirection`** (die Engine berechnet die Mondposition als exaktes Gegenteil der Sonne). Nacht wird per Sonnenhöhe beurteilt — Mond oben bei `sunDirection.y < 0` (Sonne unterm Horizont). In Standardwelten ist die Sonne aber statisch, der Mond also auch — nur Welten mit Tag/Nacht-Zyklus sehen ihn wandern.

Die Standardwelt-Sonnenrichtung liegt bei ca. `(-0.56, 0.81, -0.18)` (Einheitsvektor aus inclination = −0.2 / azimuth = 0.55, statisch). Praktische Referenz zur Vorhersage von Highlight-Richtungen beim Testen von Vertriebspaketen.

Tag/Nacht-Zyklen sind nicht in die Engine eingebaut — inclination ist eine statische Zahl, die Welten mit bewegtem Tag spielsietig aktualisieren. `sunDirection` folgt jeder Aktualisierung.

Terrain-Richtlichter sind nur 2 Lampen beim Szenenstart, mit **fixer Richtung und Intensität, ohne Tag/Nacht-Wechsel**. Kurz: **Kein Terrain-Helligkeitsfaktor hängt von der Zeit ab. Tag/Nacht-„Looks" kommen nur aus Skybox und sunDirection**, also müssen nachts abdunkelnde Pakete die Zeitspanne selbst aus sunDirection schätzen (die `sunPresent`-Technik aus §19).

### R-A. Gerichtetes Mondlicht — moonDir = −l.sunDirection

Addiert bläulich-weißes Lambert und schwaches Specular nur solange der Mond oben ist. `moonUp` ist in statischen Standardwelten 0: dort passiert nichts — **Mondlicht, das nur in Welten mit Tag/Nacht-Zyklus feuert, also sicher**.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // der Mond ist immer exakt gegenüber der Sonne; Tages-Auto-Off via moonDir.y < 0
    let moonDir = -l.sunDirection;
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(l.eyePosition - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. Fog-Interna

Die Fog-Berechnung ist immer LINEAR-Modus (`fogFactor = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), mit `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = Fog-Einstellung; nur D = 0 ist speziell mit fogEnd = 5). **Das Gradientenband ist nur 32 Blöcke breit**, und `l.fogFactor` ist weniger „Distanzdunst" als **normierte Distanz zur Kante der geladenen Welt**. Variiert pro Spieler mit Ladedistanz: Distanz-Effekte sollten `distance(l.position, l.eyePosition)` selbst berechnen (Rezept R-B).

Standard-Fog-Farbe `rgb(183, 191, 195)` (blasses Blaugrau). Welt-Ersteller ändern sie via `fogColourOverride` (hex). Bei Fog-Modus 0 (NONE) **kommt fogColour schwarz an**. Die Standardform `mix(l.fogColour, col, l.fogFactor)` ist sicher, da Fog-Farbe bei fogFactor 1 ungenutzt bleibt.

`showFog` auf false zu setzen schiebt Fog auf 3200–3328 Blöcke und deaktiviert faktisch (`fogFactor ≈ 1` kommt weiter).

### R-B. Ladekanten-Band — fogFactor als „Weltkante"

Kühlt leise nur das 32-Block-Band der Ladekante, um das Weltende zu kaschieren (oder als Effekt zu betonen). Ohne selbst berechnete Distanz: folgt automatisch den Ladedistanz-Einstellungen des Spielers.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    // fogFactor: 1 = innen (Spielraum zur Kante), 0 = kurz vorm Kantenaustritt
    let edge = 1.0 - l.fogFactor;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. blockLight-/heldLight-Interna

Beim Dekodieren von `aPackedLightLevels` legt die Engine pro Kanal einen **Floor von 35 % des hellsten RGB-Kanals**. Z. B. wird „reines Rotlicht" in Vertices auf (1,00, 0,35, 0) gehoben, vor Interpolation und Lift. Dass Fackel-Orange im Spiel „weißlich-pink statt rot" wirkt, kommt hierher — warmes Fackel-Rezept (R9.1)-Sättigung gegen dieses Default tunen.

Handlicht (`heldLight`) hat Reichweite nach hellstem Kanal (max 15 Blöcke) mit `dist^0.75`-Vorverarbeitung, demselben 35-%-Floor, und `l.heldLight` ist der **Pre**-Ambient-Boost-Wert. Custom-Items können `spotlightRange` und Kegelwinkel setzen — ein „Strahl im Halten"-Modus, dessen Kegel der Kamera folgt. Pakete können die Strahlrichtung nicht wissen.

Custom-Blöcke können `skyLightEmission` (0–15) tragen, das **in den skyLight-Kanal selbst injiziert, separat zum blockLight-BFS**. R9.12-artige Pakete, die Sonne/Schatten per skyLight-Schwelle beurteilen, können in Welten mit künstlich gehobenem skyLight danebenliegen. Vertriebspakete beurteilen robuster kombiniert mit blockLight.

## 27. Pipeline-Details

- **Surface-Hooks laufen „vor" alphaTest**: `out.alpha` speist den Verwerfungstest direkt. Cutout-Materialien (Gras, Blätter) erlauben Dissolve-Dither-Effekte (Rezept R-C). In Flüssigkeiten (Blending) ist `out.alpha` die echte Transparenz (Rezept R-D). Kein Effekt auf normalem opakem Terrain — nicht verwechseln
- **`l.ambient`-Inhalt**: `material.ambient × sceneAmbient`, pro Material verschieden. Die Szenenseite hängt an der Grafik-Einstellung „Ambient Lighting Intensity" (Standard 0.5) — nie Fixes einprogrammieren
- **`time` ist wirklich `performance.now()`**: die Browser-Uptime, auf 1 Stunde gewrappt. Ohne Bezug zu Spiel-Tag/Nacht und Welt-Laufzeit. Für uhr-synchrone Animation die Uhrzeit aus dem `sunDirection`-Azimut in Tag/Nacht-Zyklus-Welten schätzen
- Feine Schachbrettmuster an Chunk-Rändern beim Laden sind das Chunk-Fading per Screen-Space-Bayer-4×4-Dither der Engine, keine Paket-Bugs
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

fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    #ifdef BLOXD_ALPHA
    // löst von unteren Blöcken auf; höheres dissolve bleibt
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(s.originOffset).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. Wasser-Nahkamera-Fade — Flüssigkeits-Alpha hält Sicht frei

Flüssigkeits-Hook-`out.alpha` speist das Blending direkt. Blendet nur die Fläche unter der Kamera aus, um Tauch-/Überwasser-Kamera-Sicht zu sichern.

```wgsl
fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, s.eyePosition);
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 Blöcke von total transparent bis normal
    #endif
    return out;
}
```

## 28. Was sichtbare Paket-Werte ändert — Testcheckliste

Dasselbe Paket rendert je nach **Welt und Spieler-Einstellungen** anders. Vor Verteilung mindestens diese 3 Umgebungen prüfen:

1. **Normalwelt** (Default-Skybox, keine Overrides) — sunDirection da, Standardfarben
2. **Space-Skybox-Welt** — sunDirection = 0. Der `sunPresent`-Zweig-Look
3. **Custom-Welt mit `visionMinLightColour` / `skyLightColourOverride`** — gehobene Dunkelheiten und Farben

Haupt-Varianzquellen: `lightingOverride` (Zwangslicht) / `skyLightColourOverride`・`ambientLightColourOverride` (Hex-Tausch) / `visionMinLightColour` (Floor „dunkelste sichtbare Farbe" auf Sky und Ambient; Night Vision nutzt es — „stockdunkle Höhlen"-Pakete werden nicht so dunkel wie gedacht) / `heldLightColourOverride`・`Range`・`ConeAngle` / `fogChunkDistanceOverride`・`fogColourOverride`・`fogOnSkybox` / `skyBox` (sunDirection-Präsenz). `uSkyLightColour`-Standard = (1,1,1) weiß, `uAmbientLightColour`-Standard = (0.25,0.25,0.30). `l.ambient`-Szenenseite = Grafik-Einstellung „Ambient Lighting Intensity" (Standard 0.5). `l.fogFactor` folgt Spieler-Fog/Chunk-Distanz-Einstellungen.

## 29. Debugging-Mittel

- URL-Parameter `?renderer=lite` — Lite-Renderer erzwingen (`?renderer=webgl2` / `babylon` gehen auch)
- URL-Parameter `?vconsole` — On-Screen-Konsole (VConsole). Praktisch für echte Mobil-Verifikation
- Die Konsole zeigt `noa-engine v0.33.0` und `Renderer: lite from <Quelle>` — erst prüfen, um Render-Pfad-Fehldiagnosen zu vermeiden
- Der WebGPU-Renderer sperrt sich mit Paket auf „zwangsweise AN". Die Einstellung „Disable Block Texture Atlas" sperrt sich ebenfalls (Atlas bleibt AN), und ohne WebGPU wendet sich das Paket gar nicht erst an. Basis, um auf Vertriebsseiten „WebGPU-Browser nötig" zu schreiben
- Die Laufzeit-Revalidierung pro Beitritt (`checkCompilation`) kompiliert echte Terrain-Materialien im Browser-WebGPU (strenger als Einstellungs-Static-Validierung). Hier fallende Pakete werden aus diesem Spiel ausgeschlossen

## 30. Über unabhängig ähnliche Materialien

Es existiert ein Community-Material mit fast gleichem Inhalt: [Shader von GlitchHunterCoder/Bloxd-Essay](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader). Vor diesem Leitfaden publiziert, aber **dieser Leitfadeninhalt stammt aus glms eigener Analyse der echten Bloxd-Bundle-Dateien (Webpack-Chunk-Satz) — kein Copy-Paste**. Beide stimmen überein, weil unabhängiges Untersuchen derselben Implementierung zu denselben Schlüssen führt.

---

Recherchiert von ltf_ahel (recherchiert mit glm)
