# Bloxd.io-Shader-Pakete erstellen (Komplette Anleitung)

Eigenständige Anleitung zum Erstellen und Verteilen von Shader-Paketen für Bloxd.io (nur WebGPU-Renderer).
Basierend auf der Spezifikation von `apiVersion: 2`. Enthält Rezepte und API-Referenz: Mit dieser einen Datei kommst du von null bis zur Verteilung. V1-Pakete laden im aktuellen Spiel nicht (der v1-`apiVersion`-Wert und alte Bezeichner werden abgelehnt). Zur Migration von v1 siehe Teil VIII.

> Dies ist eine inoffizielle Anleitung und gibt nicht die Sicht der Entwickler wieder. Die API kann sich ohne Ankündigung ändern.  
> Zuletzt geprüft: 2026-10-15 (Fog-Anwendungsreihenfolge, echte Fog-Einstellungen und Unterwasser-Rendering gegen die Implementierung verifiziert). Da keine öffentliche offizielle WGSL-API-Referenz gefunden werden konnte, prüfe Beschreibungen und Rezepte weiter anhand des Ladebildschirms und der Kompilierung im Spiel.  
> Die Shader-Paket-Funktion ist eine offizielle Funktion aus der Spieloberfläche, und Pakete sind reines WGSL  
> (keine JS-Ausführung, kein Netzwerk) – mit normalem Code passiert also nichts Gefährliches.  
> Dieser Leitfaden wurde mit KI-Unterstützung erstellt; Korrektheit ist nicht garantiert. Prüfe am tatsächlichen Spielverhalten.

## Inhalt

- [Teil I: Pakete erstellen](#teil-i-pakete-erstellen)
- [Teil II: API-Referenz](#teil-ii-api-referenz)
- [Teil III: Rezeptsammlung](de/recipes.md)
- [Teil IV: Realismus-Leitfaden](#teil-iv-realismus-leitfaden)
- [Teil V: Fehlersuche & Hinweise](#teil-v-fehlersuche--hinweise)
- [Teil VI: Wichtige Umsetzungshinweise](#teil-vi-wichtige-umsetzungshinweise)
- [Teil VII: Interna-Ergänzung](#teil-vii-interna-ergänzung)
- [Teil VIII: Migrationsleitfaden für API Version 2](#teil-viii-migrationsleitfaden-für-api-version-2)

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
  "apiVersion": 2,
  "name": "My Pack",
  "author": "your name"
}
```

| Feld | Pflicht | Beschreibung |
|---|---|---|
| `apiVersion` | Pflicht | Muss exakt `2` sein. `1`-Pakete werden mit `shaderPack:loadWrongApiVersion` abgelehnt |
| `name` | Pflicht | Nicht leer. Wird in der Einstellungs-UI angezeigt |
| `author` | optional | Darf fehlen. Nicht-String-Werte (Zahlen etc.) sind Fehler |

Andere Felder werden ignoriert.

## 5. Minimalvorlage

Funktionsfähiges Paket mit nur `pack.json` (Abschnitt 4) und diesem `pack.wgsl`:

```wgsl
// Minimalpaket mit leichtem Warmton
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

Zu befolgende Regeln:

- Ausgabe-Structs **nie direkt konstruieren** (`BloxdSurface(...)` ist ein Fehler). Immer von `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` ausgehen und Felder ändern. Ausnahme: Der erste Light-Hook-Parameter (`s: BloxdSurface`) hat den Ausgabe-Typ, also geht auch `var out = s;`
- Uninitialisiertes `var x: BloxdSurface;` (nur Typ-Annotation) ist ebenfalls ein Fehler
- Hook-Parameter sind **schreibgeschützt**. Zum Ändern erst kopieren, z. B. `var sv = s;`
- Das Präfix `bloxd_` darf nicht für eigene Bezeichner verwendet werden (außer den 6 Hook-Namen)
- Konstanten mit `const` schreiben (`#define` kann keine Werte halten)

## 6. Die 6 Hooks

Alle optional. Signaturen müssen typgenau übereinstimmen (Parameternamen frei).

| Hook | Rolle |
|---|---|
| `fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex` | Terrain-Vertex-Animation. **Im Strict-Modus nicht verfügbar** |
| `fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface` | Terrain-Farbe, Transparenz, Emission. `s.colour` ist Textur × Vertex-Farbe |
| `fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight` | Terrain-Endfarbe. Wird in der **letzten Fragment-Stufe** aufgerufen, der Rückgabewert wird unverändert zur Endfarbe |
| `fn bloxdLiquidVertex / bloxdLiquidSurface / bloxdLiquidLight` (gleiche Formen) | Flüssigkeits-Versionen. `alpha` wirkt als Flüssigkeitstransparenz |

Fallback-Regeln:

- Ohne Liquid-Hook wird **der gleichnamige Terrain-Hook verwendet** (nie umgekehrt). Nur surface zu schreiben wirkt auch auf Flüssigkeiten
- Ohne Light-Hook gilt das Standardverhalten (`engineColour + emission × fogVisibility`)
- Wer `engineColour` verwirft und aus der Basisfarbe neu aufbaut, muss den Fog selbst neu anwenden: `mix(l.fogColour, col, l.fogVisibility)`. Emission beim Addieren erst mit `fogVisibility` multiplizieren

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
- Koordinaten sind noa-lokal. Für Weltkoordinaten `bloxdOriginOffset()` addieren. Blockkoordinaten sind `bloxdFaceBlock(position, normal)`

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
// Engine-provided and read-only to packs. apiVersion 2.
const bloxdTimeWrap: f32 = 3600.0;   // seconds until time wraps to 0

fn bloxdTime() -> f32;               // seconds. wraps to 0 every 3600 s
fn bloxdOriginOffset() -> vec3i;     // whole blocks. noa-local + this = world coords
fn bloxdEyePosition() -> vec3f;      // camera position (noa-local)
fn bloxdSunDirection() -> vec3f;     // sun direction (unit vector, non-zero only with earth skybox)
fn bloxdWorldPosition(position: vec3f) -> vec3f;  // noa-local -> world coords
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i;  // world block coords of this face
fn bloxdApplyFog(colour: vec3f, l: BloxdLightIn) -> vec3f;   // mix(l.fogColour, colour, l.fogVisibility)

struct BloxdVertexIn {
    position: vec3f,   // noa-local world space (world minus bloxdOriginOffset())
    normal: vec3f,
    blockId: u32,      // owning block id (flat-interpolated, uniform across the face)
}

#ifndef BLOXD_STRICT
struct BloxdVertex {
    position: vec3f,     // noa-local
}
#endif

struct BloxdSurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    blockId: u32,        // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct BloxdLightIn {
    litColour: vec3f,          // engine lighting result (before emission and fog)
    engineColour: vec3f,       // post-fog = bloxdApplyFog(litColour, l). excludes emission
    directional: f32,          // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,            // the material's ambient times the scene's
    blockLight: vec3f,         // voxel block light, tone-mapped (all variants; 0 when unlit)
    skyLight: f32,             // voxel sky light, tone-mapped (all variants; 1 when unlit)
    ambientLightColour: vec3f, // present in all variants (white when unlit)
    skyLightColour: vec3f,     // present in all variants (white when unlit)
    heldLight: vec3f,          // held light here (all variants; 0 when unlit/out of range)
    fogColour: vec3f,
    fogVisibility: f32,        // 1 = no fog, 0 = fully fogged (renamed from v1 fogFactor)
    position: vec3f,           // as in BloxdSurfaceIn
    normal: vec3f,
    blockId: u32,              // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdLight {
    colour: vec3f,
}

// liquid variants, surface / light hooks only
struct BloxdOpaqueBehind {
    found: bool,       // false when no opaque face behind (sky)
    position: vec3f,   // opaque face position behind (noa-local)
    distance: f32,     // distance from the eye
}
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind;

#ifndef BLOXD_STRICT
fn bloxdDefaultVertex(v: BloxdVertexIn) -> BloxdVertex;
#endif

fn bloxdDefaultSurface(s: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdDefaultLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight;
```

Kernpunkte:

- `bloxdTime()` ist verstrichene Zeit mit Wrap alle 3600 Sekunden (`bloxdTimeWrap`). Keine garantierte Synchronisation mit der Tag/Nacht-Uhr im Spiel. Da die Stage-Sichtbarkeit der Bind Group VERTEX|FRAGMENT ist, **auch aus Vertex-Hooks aufrufbar**
- `bloxdSunDirection()` ist nur ein Einheitsvektor, solange eine Sonne existiert; null, wenn der Himmel keine Sonne hat. **Der Mond ist immer `-bloxdSunDirection()`** (die Engine berechnet die Mondposition als exaktes Gegenteil der Sonne). In Standardwelten ist die Sonne aber statisch, der Mond also auch — ein bewegter Mond zählt nur in Welten mit Tag/Nacht-Zyklus (siehe Teil VII, Abschnitt 24)
- ※Hinweis: früher als „bei null nicht als Mondrichtung wiederverwendbar" formuliert. Die Richtung selbst ist via `-bloxdSunDirection()` verfügbar, aber Vertriebspakete sollten mit `sunPresent` auf Null-Prämisse verzweigen (zum blauen Umgebungs-Pseudo-Look siehe R2, zum gerichteten Mondlicht Teil VII R-A)
- `emission` wird nach der Lichtberechnung addiert, gedämpft mit **`fogVisibility`** (die defaultLight-Implementierung `engineColour + emission × fogVisibility`. Emission verschwindet auch in völlig vernebelter Ferne)
- **Fog-Anwendungsreihenfolge**: Fragment-Verarbeitung läuft ① Licht/Emissions-Komposition → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ Light-Hook-Aufruf → ⑤ return. **engineColour kommt also gefoggt an**, und **der Light-Hook-Rückgabewert wird unverändert zur Endfarbe** (nach dem Hook wird kein Fog neu angewandt)
- **fogVisibility-Herkunft**: View-Space-Distanz (pro Vertex berechnet, interpoliert). Im Linear-Modus `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **Bei fogMode == 0**: `fogColour` kommt als `vec3f(0.0)` (schwarz) an. Code, der Tageszeiten aus fogColour-Tönung schätzt, sei vorsichtig
- **Echte Fog-Einstellungen aktueller Builds**: **linear fixiert**. `fogStart` = Chunk-Sichtweite, `fogEnd` = +1 Chunk (nur Horizont). Bei Fog-aus auf 100 / 101 Chunks gesetzt, faktisch deaktiviert. Standard-Fog-Farbe RGB(183, 191, 195)
- Das Uniform `bloxdPackInputs` (`@group(3) @binding(0)`, 64 B) **nur über Header-Funktionen nutzen**. Nie direkt aus Paketen referenzieren. Da die Stage-Sichtbarkeit VERTEX|FRAGMENT ist, sind Header-Funktionen auch aus Modul-Scope-Funktionen außerhalb von Hooks und aus Vertex-Hooks aufrufbar. Da die Tiefentextur (Binding 1) FRAGMENT-exklusiv ist, ist `bloxdOpaqueBehind()` auf Surface-/Light-Hooks beschränkt
- **`skyLight` / `blockLight` / `heldLight` kommen nach einer „Lift-Kurve" an**. Das `tone-mapped` in den Header-Kommentaren meint dies: Die Engine wendet immer `y = 1-(1-x/(3-2x))³` (eine dunkle Bereiche anhebende S-Kurve) auf Fragmente an, bevor sie Pakete erreichen. Keine rohen Voxel-Werte (n/15); z. B. kommt unter einem Baum (roh 0,87) angehoben als **0,97** an
- `skyLight` ist im Kern Voxel-Verdeckungsdaten für „ist von hier Himmel sichtbar" (= eine Schattenkarte), kein bloßer Helligkeitsparameter (siehe Abschnitt 15, „Die Wahrheit über Schatten")
- **`litColour` als Ausgangspunkt nutzbar**: In v1 gab es nur das bereits gefoggte `engineColour`, sodass eigene Atmosphäre-Looks leicht zu Doppel-Fog führten. In v2 ab `litColour` (vor Fog, vor Emission) starten und Fog im eigenen Rhythmus per `bloxdApplyFog()` neu anwenden
- **Blockarten per `blockId` unterscheiden**: Identifikation unabhängig von Texturfarbe. Die ID-Blockart-Tabelle ist aber engine-intern: Welche ID welcher Block ist, in der Welt vermessen (siehe Teil VIII)
- **Direkte Struct-Konstruktion verboten**: Konstruktoraufrufe wie `BloxdLight(...)` werden von der statischen Prüfung abgelehnt. Immer ab `bloxdDefault*` ändern oder die Eingabe kopieren

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

Auch Header-Struct-Formen ändern sich je Variante (kein `BloxdVertex` in strict, kein `blockLight` etc. in unlit, kein `alpha` in strict-Terrain).

## 12. Skelett-Spickzettel

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);          // direkte Konstruktion verboten; immer von default ausgehen
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // Terrain hat alpha nur in allow
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);         // engineColour + emission*fogVisibility
    #ifdef BLOXD_LIGHTING                       // nur-Licht-Inputs schützen
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // Vertex immer mit diesem Guard
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdTime()) * 0.05;
    return out;
}
#endif
```

Fünf Dinge immer im Kopf: in allen 8 Varianten sauber kompilieren / strikte Spiele sind die Mehrheit / keine Texturen / Hook-Parameter sind schreibgeschützt / kein `let` auf Modulebene.

---

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
4. **Ohne Sonnenrichtung**: Ist `bloxdSunDirection()` null, kein gerichtetes Specular berechnen. `l.directional` ist ein Lichtmengen-Skalar, kein Richtungsvektor: stellt die Highlight-Richtung nicht wieder her. Bei Bedarf auf schwaches richtungsloses Ambiente wechseln. Die Mondrichtung ist via `-bloxdSunDirection()` verfügbar (bewegt sich nur in Welten mit Tag/Nacht-Zyklus. Teil VII R-A)

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
| Unterwasser-Refraktion | Keine Szenenfarbe. Aber Flüssigkeits-Tiefe (`bloxdOpaqueBehind()`) ermöglicht Dickenabsorption und Grundprojektion (Teil VIII R-E) |
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
| `blockLight` als undefiniert gemeldet | In `#ifdef BLOXD_LIGHTING` packen. Gemeinsame Hilfsfunktionen **als ganze Funktionen** einpacken (in v2 ist das Feld immer vorhanden: praktisch kein Fehler mehr; Guards für Entscheidungszweige behalten) |
| `Packs can't construct BloxdSurface directly` | Von `bloxdDefaultSurface(s)` ausgehen |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | In `#ifndef BLOXD_STRICT` packen |
| Weiße milchige Ferne | Meist Doppel-Fog. Die fertige Farbe ist bereits gefoggt: eigenen Dunst dezent halten und lieber nur Sättigung senken |
| Paket beim Spielbeitritt ausgeschlossen | Live-Check im Spiel schlägt fehl. Guard-Lücken prüfen |
| `pack.json needs "apiVersion": 2.` | `apiVersion` fehlt oder ist nicht `2`. Zahl `2` eintragen (String `"2"` wird abgelehnt). V1-Pakete werden mit `shaderPack:loadWrongApiVersion` abgelehnt |
| `There's no pack.json at the top of the pack.` | Kein `pack.json` im ZIP-Root. Prüfen, ob nicht der Ordner selbst gezippt wurde |
| `bloxdTerrainVertex must be declared as: fn ...` | Signatur weicht ab. Exakt wie angezeigt umschreiben |
| `bloxdTerrainVertex can't run in strict games...` | Vertex-Hook in `#ifndef BLOXD_STRICT` packen |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | In `#ifdef BLOXD_LIGHTING` packen (in v2 ist das Feld immer vorhanden: praktisch kein Fehler mehr) |
| `pow(l.skyLight, γ)` höher zu drehen vertieft Schatten nie | `skyLight` ist Post-Kurven-Wert (roh 0,87 kommt als 0,97). Auf R9.12-Lift-Inversion + Schwelle wechseln (Abschnitt 10) |
| `... can only be a function's parameter or return type, ...` | Uninitialisiertes `var x: BloxdSurface;` wird abgelehnt. Ab `bloxdDefault*` bauen |
| `bloxdPackInputs isn't part of the bloxd_ header` | Das PackInputs-Uniform kann aus Paketen nicht direkt referenziert werden. Über Header-Funktionen wie `bloxdTime()` nutzen |
| `Packs can't declare bloxd_ names...` | Das `bloxd_`-Präfix aus eigenen Bezeichnern entfernen. Nur die 6 Hook-Namen dürfen definiert werden |
| `loadDuplicateManifest` beim Zip-Laden | Zwei `pack.json` (inkl. Groß/Klein-Varianten). Eines behalten |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Ab `bloxdDefaultSurface(s)` umschreiben. Von einer Kopie des ersten Light-Hook-Parameters (`var out = s;`) zu starten geht auch |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` wird abgelehnt. `_ = f();` schreiben |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | `bloxdOpaqueBehind()`-Aufrufe in Terrain-Hooks mit `#ifdef BLOXD_SCENE_DEPTH` umschließen |
| `...only surface and light hooks can use.` | `bloxdOpaqueBehind()` aus Vertex-Hooks entfernen (nur Surface / Light) |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Kein Fehler, sondern Auto-Deaktivierung in strikten Spielen (`shaderPack:offInStrict`). Vertex-Hooks und `discard` mit `#ifndef BLOXD_STRICT` umschließen |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Fehler der 2. Stufe (Browser-Tint). Operanden von `^` `&` `\|` `<<` `>>` klammern (§38) |

## 18. Rechte & Hinweise

- Die Shader-Paket-Funktion ist eine offizielle, aus der Spiel-UI ladbare Funktion, Pakete zu erstellen gilt als vorgesehener Gebrauch. Es wurde aber keine öffentliche offizielle Dokumentation bestätigt
- Pakete sind reines WGSL — JS-Ausführung und Netzwerkzugriff sind konstruktionsbedingt unmöglich
- Dies ist eine inoffizielle Anleitung, nicht die offizielle Position der Entwickler. Die API kann sich ohne Hinweis ändern

---

# Teil VI: Wichtige Umsetzungshinweise

## 19. „Dunkle Schatten, aber helle Flächen" nachts beheben

Nur Schatten abzudunkeln lässt die fertige Farbe (`engineColour`) ohne Sonne hell, und die Flächen/Schatten-Lücke wird unnatürlich. Die ganze fertige Farbe dämpfen.

Das Beispiel behandelt `bloxdSunDirection()`-null als Nacht und gerichtete Sonne als Tag und dämpft Terrain-Endfarben in dunklen Stunden. Wo `blockLight` und `heldLight` stark sind, schwächt sich die Dämpfung, um nahe Lampen wie Fackeln zu erhalten. `0.52` ist ein Tuning-Wert — für dunklere Nächte senken.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
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
    out.colour = l.engineColour * scale + s.emission * l.fogVisibility;
    return out;
}
```

**Limits dieses Fixes:** Verhält sich `bloxdSunDirection()` wie „Einheitsrichtung mit Sonne, null ohne", lassen sich Tag/Nacht unterscheiden, aber Abendrot nicht weich schätzen. Und da es die fertige Farbe dämpft, schwächt es Engine-Tageslicht und -Ambiente zusammen — keine totale Tageszeit-Reproduktion. Für Flüssigkeiten dieselbe Liquid-Hook-Fallback-Beziehung prüfen.

## 20. Integriertes Rezept für natürlich aussehendes Wasser

Diese API kann die Szenenfarbe nicht sampeln: Es ist **Pseudo-Rendering per Fresnel-Farbmischung und Sonnen-Highlights, keine echte Reflexion/Refraktion**. Die Tiefenberechnung geht in v2 per `bloxdOpaqueBehind()` (ausgelagert in Teil VIII R-E). Das Sample behält die Basisfarbe, mischt bei streifenden Blickwinkeln etwas Richtung Himmelsfarbe und addiert nur mit Sonne einen kleinen Glint.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = bloxdWorldPosition(l.position);
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdTime()), topness));
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
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
- Echte Landschaftsreflexionen: Diese API-Inputs haben keine Bildschirmfarbe: Farben zu mischen wird nie echte Reflexion (Tiefe ist in Flüssigkeiten abgreifbar. Teil VIII R-E).

Dieses Rezept **ersetzt** ein existierendes `bloxdLiquidLight`. Nicht neben die gleichnamige Wellenfunktion aus R9.7 oder andere gleichnamige Hooks kleben.

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
- Keine Inputs, um Shadowmaps, Screen-Space-Reflexionen, Refraktion, Bloom etc. hinzuzufügen (Szenentiefe ist in Flüssigkeiten via `bloxdOpaqueBehind()` freigegeben. Siehe Teil VIII).
- `bloxdTime()` ist Animationszeit ohne garantierte Bindung an Tag/Nacht im Spiel.
- Bei `bloxdSunDirection()`-null ist die wahre Mondrichtung unbekannt, keine „Mondlichtphysik" sondern Stimmungsnäherung. Gerichtetes Mondlicht baut man aus `-bloxdSunDirection()` (nur Welten mit Tag/Nacht-Zyklus. Teil VII R-A).
- `s.position` / `l.position` sind lokale Koordinaten: `bloxdOriginOffset()` für weltabhängige Effekte addieren. Für blocklokale Muster sind lokale Koordinaten bewusst das Werkzeug.

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

Praktische Punkte: Pakete wirken auch unter Wasser weiter / der Schleier ist nicht entfernbar / unter Wasser ist keine Verzweigung möglich (fogStart / fogEnd / fogColour ändern sich unter Wasser nicht: fogVisibility erkennt es auch nicht).

---

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

Standard-Fog-Farbe `rgb(183, 191, 195)` (blasses Blaugrau). Welt-Ersteller ändern sie via `fogColourOverride` (hex). Bei Fog-Modus 0 (NONE) **kommt fogColour schwarz an**. Die Standardform `mix(l.fogColour, col, l.fogVisibility)` ist sicher, da Fog-Farbe bei fogVisibility 1 ungenutzt bleibt.

`showFog` auf false zu setzen schiebt Fog auf 3200–3328 Blöcke und deaktiviert faktisch (`fogVisibility ≈ 1` kommt weiter).

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

Beim Dekodieren von `aPackedLightLevels` legt die Engine pro Kanal einen **Floor von 35 % des hellsten RGB-Kanals**. Z. B. wird „reines Rotlicht" in Vertices auf (1,00, 0,35, 0) gehoben, vor Interpolation und Lift. Dass Fackel-Orange im Spiel „weißlich-pink statt rot" wirkt, kommt hierher — warmes Fackel-Rezept (R9.1)-Sättigung gegen dieses Default tunen.

Handlicht (`heldLight`) hat Reichweite nach hellstem Kanal (max 15 Blöcke) mit `dist^0.75`-Vorverarbeitung, demselben 35-%-Floor, und `l.heldLight` ist der **Pre**-Ambient-Boost-Wert. Custom-Items können `spotlightRange` und Kegelwinkel setzen — ein „Strahl im Halten"-Modus, dessen Kegel der Kamera folgt. Pakete können die Strahlrichtung nicht wissen.

Custom-Blöcke können `skyLightEmission` (0–15) tragen, das **in den skyLight-Kanal selbst injiziert, separat zum blockLight-BFS**. R9.12-artige Pakete, die Sonne/Schatten per skyLight-Schwelle beurteilen, können in Welten mit künstlich gehobenem skyLight danebenliegen. Vertriebspakete beurteilen robuster kombiniert mit blockLight.

## 27. Pipeline-Details

- **Surface-Hooks laufen „vor" alphaTest**: `out.alpha` speist den Verwerfungstest direkt. Cutout-Materialien (Gras, Blätter) erlauben Dissolve-Dither-Effekte (Rezept R-C). In Flüssigkeiten (Blending) ist `out.alpha` die echte Transparenz (Rezept R-D). Kein Effekt auf normalem opakem Terrain — nicht verwechseln
- **`l.ambient`-Inhalt**: `material.ambient × sceneAmbient`, pro Material verschieden. Die Szenenseite hängt an der Grafik-Einstellung „Ambient Lighting Intensity" (Standard 0.5) — nie Fixes einprogrammieren
- **`bloxdTime()` ist wirklich `performance.now()`**: die Browser-Uptime, auf 1 Stunde gewrappt. Ohne Bezug zu Spiel-Tag/Nacht und Welt-Laufzeit. Für uhr-synchrone Animation die Uhrzeit aus dem `bloxdSunDirection()`-Azimut in Tag/Nacht-Zyklus-Welten schätzen
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

1. **Normalwelt** (Default-Skybox, keine Overrides) — bloxdSunDirection() da, Standardfarben
2. **Space-Skybox-Welt** — bloxdSunDirection() = 0. Der `sunPresent`-Zweig-Look
3. **Custom-Welt mit `visionMinLightColour` / `skyLightColourOverride`** — gehobene Dunkelheiten und Farben

Haupt-Varianzquellen: `lightingOverride` (Zwangslicht) / `skyLightColourOverride`, `ambientLightColourOverride` (Hex-Tausch) / `visionMinLightColour` (Floor „dunkelste sichtbare Farbe" auf Sky und Ambient; Night Vision nutzt es — „stockdunkle Höhlen"-Pakete werden nicht so dunkel wie gedacht) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (bloxdSunDirection()-Präsenz). `uSkyLightColour`-Standard = (1,1,1) weiß, `uAmbientLightColour`-Standard = (0.25,0.25,0.30). `l.ambient`-Szenenseite = Grafik-Einstellung „Ambient Lighting Intensity" (Standard 0.5). `l.fogVisibility` folgt Spieler-Fog/Chunk-Distanz-Einstellungen.

## 29. Debugging-Mittel

- URL-Parameter `?renderer=lite` — Lite-Renderer erzwingen (`?renderer=webgl2` / `babylon` gehen auch)
- URL-Parameter `?vconsole` — On-Screen-Konsole (VConsole). Praktisch für echte Mobil-Verifikation
- Die Konsole zeigt `noa-engine v0.33.0` und `Renderer: lite from <Quelle>` — erst prüfen, um Render-Pfad-Fehldiagnosen zu vermeiden
- Der WebGPU-Renderer sperrt sich mit Paket auf „zwangsweise AN". Die Einstellung „Disable Block Texture Atlas" sperrt sich ebenfalls (Atlas bleibt AN), und ohne WebGPU wendet sich das Paket gar nicht erst an. Basis, um auf Vertriebsseiten „WebGPU-Browser nötig" zu schreiben
- Die Laufzeit-Revalidierung pro Beitritt (`checkCompilation`) kompiliert echte Terrain-Materialien im Browser-WebGPU (strenger als Einstellungs-Static-Validierung). Hier fallende Pakete werden aus diesem Spiel ausgeschlossen

# Teil VIII: Migrationsleitfaden für API Version 2

Ziel-Build: `6qxffk.main.5912a15f.js` (Produktions-Deployment mit Stand 2026-10-16). Teile I bis VII dieses Leitfadens sind bereits auf v2-Standard umgeschrieben; dieser Teil VIII fasst die Migrationspunkte von v1 und die v2-Neuerungen zusammen. Die Code-Beispiele der Neuerungen haben die 8/8-Variantenprüfung des v2-Compilers und die Browser-WGSL-Compiler-Prüfung (Tint) (§38) bestanden, und die v2-Konvertierung bestehender Rezepte ist rein mechanischer Bezeichnerersatz: vor Verteilung unbedingt per In-Game-Kompilierung prüfen.

## 31. Das Schicksal von v1-Paketen (erst das Fazit)

Das Spiel verlangt, dass die `apiVersion` des Manifests **strikt 2** ist. V1-Pakete werden beim Laden mit `This pack is for shader pack API version 1. Bloxd supports version 2.` (i18n-Key `shaderPack:loadWrongApiVersion`) abgelehnt. Es gibt **keinen parallelen v1/v2-Support**. Außerdem prüft die Engine das `validation.headerVersion` gespeicherter Pakete (Hash des gesamten Headers) erneut: Der Mechanismus, der gespeicherte Pakete bei Engine-Updates automatisch „recheck-pflichtig" macht, ist derselbe wie in v1.

## 32. Komplettumbenennung der Bezeichner (Zuordnungstabelle)

In v2 wurde die Underscore-Benennung zu CamelCase vereinheitlicht. **Alte Namen sind durchweg unbrauchbar**.

| v1 | v2 |
|---|---|
| `bloxd_terrain_vertex` | `bloxdTerrainVertex` |
| `bloxd_terrain_surface` | `bloxdTerrainSurface` |
| `bloxd_terrain_light` | `bloxdTerrainLight` |
| `bloxd_liquid_vertex` | `bloxdLiquidVertex` |
| `bloxd_liquid_surface` | `bloxdLiquidSurface` |
| `bloxd_liquid_light` | `bloxdLiquidLight` |
| `bloxd_defaultVertex` | `bloxdDefaultVertex` |
| `bloxd_defaultSurface` | `bloxdDefaultSurface` |
| `bloxd_defaultLight` | `bloxdDefaultLight` |
| `bloxd_VertexIn` | `BloxdVertexIn` |
| `bloxd_Vertex` | `BloxdVertex` |
| `bloxd_SurfaceIn` | `BloxdSurfaceIn` |
| `bloxd_Surface` | `BloxdSurface` |
| `bloxd_LightIn` | `BloxdLightIn` |
| `bloxd_Light` | `BloxdLight` |
| `bloxd_packInputs` (internes Uniform) | `bloxdPackInputs` (`@group(3) @binding(0)`, 64 B) |

Die Hook-Arten (vertex / surface / light × Terrain / Flüssigkeit, 6 Stück) und das `pack.json`-Format (`apiVersion` / `name` / `author`) ändern sich nicht. Auch die Loader-Limits sind unverändert (Zip 32 MB / 1024 Einträge / 256 `.wgsl`-Dateien / 256 KB gesamt / Manifest 64 KB).

## 33. Wohin gelöschte Felder wandern

In v1 waren `time` / `eyePosition` / `sunDirection` / `originOffset` Struct-Felder. In v2 sind **diese Felder gelöscht und durch Header-Funktionen ersetzt**, die das Engine-Uniform (`bloxdPackInputs`) lesen. Da die Funktionen das Uniform direkt lesen, sind sie **auch aus Modul-Scope-Funktionen außerhalb von Hooks und aus Vertex-Hooks aufrufbar**.

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| Weltkoordinatenbildung per `s.position + vec3f(...)` | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

## 34. Neuerung ①: `blockId` (blockeigenes Shading)

Alle 3 Structs `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` erhalten `blockId: u32`. Die **ID des Blocks, dem die Fläche gehört** (0–65535), über die ganze Fläche konstant (per `@interpolate(flat)` übergeben). Dient zur texturfarben-unabhängigen Blockart-Erkennung. Die ID-Blockart-Tabelle liegt aber engine-intern und ist aus Paketen nicht referenzierbar: **Welche ID welcher Block ist, lässt sich nur in der Welt vermessen**.

### R-F. Blockart-Tönung per blockId

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // z. B.: Steinfamilie (High-Bit-Muster der ID) kalt tönen
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

## 35. Neuerung ②: `BLOXD_SCENE_DEPTH` und `bloxdOpaqueBehind()` (die wichtigste)

Der in v1 strukturell unmögliche Tiefenzugriff ist **nur für Liquid-Programme** freigegeben. Keine Farbe, aber **Geometrieinfo zu Distanz und Position der opaken Fläche dahinter**. Typische Nutzung: Absorptionsfarbe aus gemessener Wasserdicke berechnen.

Nutzungsregeln:

| Verwendung | Ergebnis |
|---|---|
| Guard-loser Aufruf in `bloxdLiquidSurface` / `bloxdLiquidLight` | OK (in Liquid-Varianten immer definiert) |
| Guard-loser Aufruf in `bloxdTerrainSurface` | FEHLER. Mit `#ifdef BLOXD_SCENE_DEPTH` umschließen |
| Aufruf in Vertex-Hooks | FEHLER (nur Surface-/Light-Hooks) |

Wer Tiefe auch in Terrain-Hooks nutzen will, umschließt mit `#ifdef BLOXD_SCENE_DEPTH` (Terrain-Hooks werden auch von Liquid-Programmen wiederverwendet, Tiefe gilt dort nur liquid-seitig).

### R-E. Wasserdicken-Absorption (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // Wassersäulenlänge = von aktueller Position bis zur opaken Fläche dahinter
        let thickness = distance(behind.position, surface.position);
        // Beer-Lambert-Absorption: Rot fällt schnell, Blau trägt weit
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // dahinter Himmel = zu tiefem Wasserblau ziehen
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

Anwendungen: dickenbasierte Absorption/Streuung, Wellen-/Kaustik-artige Musterprojektion aus Boden-Weltkoordinaten via `behind.position`, Himmelsreflexion an der Oberfläche mit Himmel-vs-Verdeckung-Unterscheidung per `found=false`, tiefengestaffelte Schaum- und Trübungsgrade. Schlägt der Aufbau der Tiefenkopie-Pipeline fehl, sichere Degradation zu „nichts dahinter".

## 36. Sonstige v2-Änderungen

- **Hook-Fallback**: Liquid-Programme fallen ohne definiertes `bloxdLiquidXxx` auf Terrain-Hooks zurück. **Pakete mit nur Terrain-Hooks wirken unverändert auch auf Wasser**. Falls unerwünscht, Liquid-seitige Hooks explizit definieren.
- **`BLOXD_LIGHTING`-Feld-Guards überflüssig**: `blockLight` etc. existieren in allen Varianten, in unlit mit Defaults (0 / 1 / Weiß / 0). `#ifdef BLOXD_LIGHTING` nur für Lichtabfragen nutzen. Bestehende Guards zu behalten ändert nichts.
- **`BLOXD_ALPHA`-Definitionsbedingung geändert**: In Nicht-Strict-Terrain-Varianten und allen Liquid-Varianten definiert, in strict × Terrain nicht. Beim Schreiben von alpha in Terrain-Hooks den Guard behalten.
- **Direkte Struct-Konstruktion verboten**: Konstruktoraufrufe wie `BloxdLight(...)` werden von der statischen Prüfung abgelehnt. Immer ab `bloxdDefault*` ändern oder die Eingabe kopieren.
- **`let _ =` wird `_ =`**: Die WGSL-Verwerfungszuweisung `_ = f();` ist gültig, aber `let _ = f();` wird abgelehnt.
- **offInStrict**: Eine Vertex-Hook-Definition oder ein aus Surface-/Light-Hooks erreichbares `discard` gibt keinen Fehler, sondern deaktiviert das ganze Paket in strikten Spielen automatisch (Einstellungs-UI zeigt `shaderPack:offInStrict`, in Allow-Spielen läuft es). Vertex-Hooks und `discard` mit `#ifndef BLOXD_STRICT` umschließen.
- **Fog-Erweiterung**: In der Fog-Berechnung sind 3 Modi LINEAR / EXP / EXP2 implementiert, aber die Spiel-Einstellung bleibt wie bisher immer LINEAR, also gilt die bestehende Fog-Spec weiter. Auch die Bedeutung von `fogColour` ist offiziell festgeschrieben (nur in völlig fog-freien Szenen schwarz).
- **Unverändert**: Lift-Kurve, 35-%-Kanal-Floor, heldLight-Dämpfung (`pow(lightDist, 0.75)`) und Ambient-Boost, Sonnen-/Mondrichtungs-Spec, Standard-Fog-Farbe, Time-Wrap (3600 s), Richtlichter (max 4), nur Lite (WebGPU), Speichermechanismus (IndexedDB), reserviertes Wort `mod`.

## 37. v1 → v2-Migrationscheckliste

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **Bezeichner**: alles per §32-Tabelle ersetzen (Hook-Namen, Struct-Namen, Default-Funktionen)
3. **Gelöschte Felder portieren**: per §33-Tabelle zu Header-Funktionen (`s.time` → `bloxdTime()` etc.)
4. **`fogFactor` → `fogVisibility`** umbenennen
5. **Direkte Struct-Konstruktionen entfernen**
6. **`let _ =` zu `_ =`** korrigieren
7. **Vertex-Hooks und discard mit `#ifndef BLOXD_STRICT` umschließen**
8. Prüfen, dass **Wasser auch Terrain-Hook-Effekte abbekommt**; falls unerwünscht, Liquid-Hooks explizit definieren
9. (Optional) Fog ab `litColour` selbst verwalten / Wasserdicken-Absorption per `bloxdOpaqueBehind()` addieren / blockeigene Looks per `blockId`
10. **Auch Stufe 2 (Browser-Tint) prüfen** — besonders Klammern bei Ausdrücken mit `^` `&` `|` `<<` `>>`. Code kann die statische Prüfung bestehen und trotzdem vom Browser abgelehnt werden (§38)

## 38. Zweite Prüfstufe — der Browser-WGSL-Compiler ist strenger als der eingebaute Parser

Die Spiel-Paketprüfung läuft in **2 Stufen**. Stufe 1 ist die statische Prüfung (engine-eingebauter JS-Parser — Hook-Signaturen, verbotene Syntax, paketeigene Regeln wie die sceneDepth-Nutzung), und Stufe 2 ist die Browser-Prüfung (die dem Kompilierungsergebnis beigelegten Stubs werden mit der echten WebGPU-Implementierung kompiliert, und Fehler werden auf die Ursprungsdateizeilen des Pakets zurückgemappt angezeigt. Das „Saved, but it won't run until you fix these errors" der UI ist diese Stufe). Suffixe wie `(only in terrain)` am Ende der Fehleranzeige bezeichnen „die program-Art der Variante, in der der Fehler auftrat".

Der eingebaute Parser implementiert die WGSL-Operator-Bindungs-(Binding-)Regeln nicht, und **Code kann die statische Prüfung bestehen und trotzdem vom Browser abgelehnt werden**. Häufig betroffen ist das Standardmuster des Integer-Hashings:

| Operator | Folge |
|---|---|
| `<<` `>>` | Nur bis Unary-Level direkt kombinierbar. `a + b << c` ist ein Fehler |
| `&` `^` `\|` | Nur bis Unary-Level direkt kombinierbar. `a * b ^ c` ist ein Fehler |
| `&&` `\|\|` | Vermischung verboten. `a && b \|\| c` ist ein Fehler |

### Klammerung (NG / OK)

```wgsl
// NG — besteht die statische Prüfung, wird aber vom Browser (Tint) abgelehnt:
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — jede Multiplikation klammern (Kette desselben Operators A ^ B ^ C ist linksassoziativ legal)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

Kein abgedruckter Code in diesem Leitfaden enthält dieses Muster (die `+`/`*`-Mischungen von `pack_hash3` und `h ^ (h >> 16u)` sind bereits geklammert, also spec-konform). Nach dem Schreiben eines Pakets sowohl Stufe 1 als auch Stufe 2 durchlaufen.

## 39. Über unabhängig ähnliche Materialien

Es existiert ein Community-Material mit fast gleichem Inhalt: [Shader von GlitchHunterCoder/Bloxd-Essay](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader). Vor diesem Leitfaden publiziert, aber **dieser Leitfadeninhalt stammt aus glms eigener Analyse der echten Bloxd-Bundle-Dateien (Webpack-Chunk-Satz) — kein Copy-Paste**. Beide stimmen überein, weil unabhängiges Untersuchen derselben Implementierung zu denselben Schlüssen führt.

---

Recherchiert von ltf_ahel (recherchiert mit glm)
