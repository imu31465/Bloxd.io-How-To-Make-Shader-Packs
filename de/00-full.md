# Bloxd.io-Shader-Pakete erstellen (Komplette Anleitung)

Eigenständige Anleitung zum Erstellen und Verteilen von Shader-Paketen für Bloxd.io (nur WebGPU-Renderer).

> Dies ist eine inoffizielle Anleitung und gibt nicht die Sicht der Entwickler wieder. Die API kann sich ohne Ankündigung ändern.  
> Zuletzt geprüft: 2026-10-20 (v3-Produktionsrollout durch Bundle-Vergleich bestätigt; Hook-Aufruf, Fog, Tiefe und `blockFlags`-Interna aus dem Produktions-Build restauriert — Teil IX §49–§54). Da keine öffentliche offizielle WGSL-API-Referenz gefunden werden konnte, prüfe Beschreibungen und Rezepte weiter anhand des Ladebildschirms und der Kompilierung im Spiel.  
> Die Shader-Paket-Funktion ist eine offizielle Funktion aus der Spieloberfläche, und Pakete sind reines WGSL  
> (keine JS-Ausführung, kein Netzwerk) – mit normalem Code passiert also nichts Gefährliches.  
> Dieser Leitfaden wurde mit KI-Unterstützung erstellt; Korrektheit ist nicht garantiert. Prüfe am tatsächlichen Spielverhalten.

[Zurück zum Handbuch](README.md)·[Nächster Teil →](02-api.md)

# Teil I: Pakete erstellen

> Das aktuelle Spiel verlangt seit dem 2026-10-19 `apiVersion: 3` und lehnt v1/v2-Pakete beim Laden ab — der folgende Inhalt ist auf der v2-Spezifikation geschrieben. Siehe [Teil IX](09-apiv3.md) zum Migrieren vor der Verteilung.

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
3. Fehler beheben und neu laden (siehe [Teil V](05-troubleshooting.md))
4. In unterstützten Spielen testen
5. Fertig zippen und verteilen

## 3. Paketstruktur

- **Vertriebsform**: eine einzelne `.zip` oder ein Ordner (Ordnerladen nur in Desktop-Browsern)
- **Inhalt**: eine `pack.json` (oberste Ebene des Pakets; Groß-/Kleinschreibung egal) + 1–256 `.wgsl`-Dateien
- Mehrere `.wgsl` werden verkettet und als ein Modul behandelt, Aufteilen und Unterordner sind also frei. Keine Dateinamen-Einschränkungen. Die Verkettung erfolgt in **Wörterbuch-Reihenfolge nach Eintrags-(Pfad-)Namen** (Modul-Scope-Deklarationen sind reihenfolgeunabhängig, deshalb stört das normalerweise nicht — es beißt nur Code, der von der `var`-Initialisierungsreihenfolge abhängt). Nicht-`.wgsl`-Dateien (READMEs etc.) werden ignoriert
- Zip-Tipp: Liegt alles unter einem gemeinsamen Wurzelordner, wird dieses Präfix automatisch abgestreift (macOS-„Komprimieren"-Zips funktionieren direkt; OS-Müll wie `__MACOSX`, `._`-Präfixe und `.DS_Store` wird automatisch ausgeschlossen). Fremddateien auf Root-Ebene brechen aber die Top-Level-Erkennung; am sichersten in den Ordner gehen und `pack.json` plus `.wgsl` direkt packen (prüfen, dass `pack.json` im ZIP-Root landet)

| Punkt | Limit |
|---|---|
| Zip-Größe / Einträge | 32MB / 1024 |
| pack.json-Größe | 64KB, UTF-8 |
| .wgsl gesamt | 256KB, UTF-8 |
| Zip-Format | zip64, geteilte und verschlüsselte Zips werden abgelehnt. Kompression: nur store / deflate. Doppelte Pfade nicht erlaubt |

## 4. pack.json

```json
{
  "apiVersion": 3,
  "name": "My Pack",
  "author": "your name"
}
```

| Feld | Pflicht | Beschreibung |
|---|---|---|
| `apiVersion` | Pflicht | Muss exakt `3` sein. `1`/`2`-Pakete werden beim Laden mit `shaderPack:loadWrongApiVersion` abgelehnt — Migration: [Teil IX](09-apiv3.md) |
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
2. Status prüfen. Direkt nach der Auswahl erscheint "Ready. Reload the page to use it." — nach dem Neuladen der Seite bedeutet "Ready to use" Erfolg. Bei "Saved, but it won't run until you fix these errors..." die gelisteten Fehler (Datei:Zeile + Variante) beheben und neu laden
3. Seite neu laden zum Aktivieren. Renderer-Overrides in URL-Parametern oder localStorage vorher entfernen, sonst verweigert das Paket den Start
4. Erst in permissiven Spielen testen, dann in strikten Spielen (die Mehrheit). Vertex-Animation geht nur in Allow-Spielen
5. Zum Verteilen mit `pack.json` obenauf zippen (innerhalb der Abschnitt-3-Limits). Das Paket lässt sich auf derselben Seite ersetzen, wirkt aber erst nach einem Seiten-Neuladen (Schritte 2–3); Remove Pack löscht es. Re-Validierung nach Spiel-Updates läuft beim Seitenladen automatisch

[Zurück zum Handbuch](README.md)·[Nächster Teil →](02-api.md)

[← Vorheriger Teil](01-making.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](03-recipes.md)

# Teil II: API-Referenz

> Das aktuelle Spiel verlangt seit dem 2026-10-19 `apiVersion: 3` und lehnt v1/v2-Pakete beim Laden ab — der folgende Inhalt ist auf der v2-Spezifikation geschrieben. Siehe [Teil IX](09-apiv3.md) zum Migrieren vor der Verteilung.

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
- `bloxdSunDirection()` ist nur ein Einheitsvektor, solange eine Sonne existiert; null, wenn der Himmel keine Sonne hat. **Der Mond ist immer `-bloxdSunDirection()`** (die Engine berechnet die Mondposition als exaktes Gegenteil der Sonne). Aktuelle Builds haben keinen Tag/Nacht-Zyklus: Sonne, Mond und Sterne bewegen sich während des Spiels nie (nur Opacity-Schalter wie `dayNightSunOpacity`). Im standardmäßigen erdähnlichen Himmel steht die Sonne fix bei ≈ `(−0.56, 0.81, −0.18)` (Höhenwinkel ~54°). **Niemals einen Nullvektor an `normalize` geben** — Sonnenabwesenheit mit `dot(d, d) < 1e-8` testen und auf eine konstante Richtung ausweichen (siehe [Teil VII](07-internals.md) §28)
- ※Hinweis: früher als „bei null nicht als Mondrichtung wiederverwendbar" formuliert. Die Richtung selbst ist via `-bloxdSunDirection()` verfügbar, aber Vertriebspakete sollten mit `sunPresent` auf Null-Prämisse verzweigen (zum blauen Umgebungs-Pseudo-Look siehe R2, zum gerichteten Mondlicht [Teil VII](07-internals.md) R-A)
- `emission` wird nach der Lichtberechnung addiert, gedämpft mit **`fogVisibility`** (die defaultLight-Implementierung `engineColour + emission × fogVisibility`. Emission verschwindet auch in völlig vernebelter Ferne)
- **Fog-Anwendungsreihenfolge**: Fragment-Verarbeitung läuft ① Licht/Emissions-Komposition → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ Light-Hook-Aufruf → ⑤ return. **engineColour kommt also gefoggt an**, und **der Light-Hook-Rückgabewert wird unverändert zur Endfarbe** (nach dem Hook wird kein Fog neu angewandt)
- **fogVisibility-Herkunft**: View-Space-Distanz (pro Vertex berechnet, interpoliert). Im Linear-Modus `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **Bei fogMode == 0**: `fogColour` kommt als `vec3f(0.0)` (schwarz) an. Code, der Tageszeiten aus fogColour-Tönung schätzt, sei vorsichtig
- **Echte Fog-Einstellungen aktueller Builds**: **linear fixiert**. `fogStart` = Chunk-Sichtweite, `fogEnd` = +1 Chunk (nur Horizont). Bei Fog-aus auf 100 / 101 Chunks gesetzt, faktisch deaktiviert. Standard-Fog-Farbe RGB(183, 191, 195)
- Das Uniform `bloxdPackInputs` (`@group(3) @binding(0)`, 64 B) **nur über Header-Funktionen nutzen**. Nie direkt aus Paketen referenzieren. Da die Stage-Sichtbarkeit VERTEX|FRAGMENT ist, sind Header-Funktionen auch aus Modul-Scope-Funktionen außerhalb von Hooks und aus Vertex-Hooks aufrufbar. Da die Tiefentextur (Binding 1) FRAGMENT-exklusiv ist, ist `bloxdOpaqueBehind()` auf Surface-/Light-Hooks beschränkt
- **`skyLight` / `blockLight` / `heldLight` kommen nach einer „Lift-Kurve" an**. Das `tone-mapped` in den Header-Kommentaren meint dies: Die Engine wendet immer `y = 1-(1-x/(3-2x))³` (eine dunkle Bereiche anhebende S-Kurve) auf Fragmente an, bevor sie Pakete erreichen. Keine rohen Voxel-Werte (n/15); z. B. kommt unter einem Baum (roh 0,87) angehoben als **0,97** an
- `skyLight` ist im Kern Voxel-Verdeckungsdaten für „ist von hier Himmel sichtbar" (= eine Schattenkarte), kein bloßer Helligkeitsparameter (siehe Abschnitt 15, „Die Wahrheit über Schatten")
- **`litColour` als Ausgangspunkt nutzbar**: In v1 gab es nur das bereits gefoggte `engineColour`, sodass eigene Atmosphäre-Looks leicht zu Doppel-Fog führten. In v2 ab `litColour` (vor Fog, vor Emission) starten und Fog im eigenen Rhythmus per `bloxdApplyFog()` neu anwenden
- **Blockarten per `blockId` unterscheiden**: Identifikation unabhängig von Texturfarbe. Die ID-Blockart-Tabelle ist aber engine-intern: Welche ID welcher Block ist, in der Welt vermessen; eine fertige Tabelle gibt es auf [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (siehe [Teil VIII](08-apiv2.md))
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

Die offiziell definierten Symbole sind nur 4 (die 3 oben + `BLOXD_SCENE_DEPTH` — [Teil VIII](08-apiv2.md) §35). Terrain vs. Flüssigkeit ist kein Symbol, sondern ein **eigenes Programm** — Verzweigungen wie `#ifdef BLOXD_TERRAIN` sind daher unmöglich. Beim Flag-Namen wird Groß/Klein nicht unterschieden; ein falscher Name im `#ifdef` lässt die Fehlermeldung alle 4 gültigen auflisten. Hook-Funktionen werden nur in die Terrain- und Flüssigkeitsprogramme injiziert — Pakete können Entities, Partikel oder sonstiges Rendering nicht beeinflussen.

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

[← Vorheriger Teil](01-making.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](03-recipes.md)

[← Vorheriger Teil](02-api.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](04-realism.md)

# Teil III: Rezeptsammlung

> Das aktuelle Spiel verlangt seit dem 2026-10-19 `apiVersion: 3` und lehnt v1/v2-Pakete beim Laden ab — der folgende Inhalt ist auf der v2-Spezifikation geschrieben. Siehe [Teil IX](09-apiv3.md) zum Migrieren vor der Verteilung.

- [R1. Farbrezepte (Surface)](#r1-farbrezepte-surface)
- [R2. Lichtrezepte (Light)](#r2-lichtrezepte-light)
- [R3. Emissionsrezepte](#r3-emissionsrezepte)
- [R4. Koordinatenrezepte (Welt / Block / Sicht)](#r4-koordinatenrezepte-welt--block--sicht)
- [R5. Zeitrezepte (Animation)](#r5-zeitrezepte-animation)
- [R6. Flüssigkeitsrezepte](#r6-flüssigkeitsrezepte)
- [R7. Vertex-Rezepte (nur allow)](#r7-vertex-rezepte-nur-allow)
- [R8. Mathe-Tricks](#r8-mathe-tricks)
- [R9. Realismus-Rezepte](#r9-realismus-rezepte)

---

> **Wichtig:** Die Rezepte unten sind einzelne Beispiele, nicht zum Aneinanderhängen von oben nach unten gedacht. Mehrere Definitionen desselben Hook-Namens (`bloxdTerrainLight` etc.) oder desselben Hilfsfunktionsnamens erzeugen doppelte Definitionen in einem Modul und lassen die Kompilierung scheitern. Zum Kombinieren von Effekten in jeweils eine Funktion pro Hook-Typ zusammenführen.

## R1. Farbrezepte (Surface)

### Einzelfarbton (am grundlegendsten)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
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
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 1..0 über Höhe 0..50
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Nach Flächenausrichtung färben (oben = hell, Wände = dunkel)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 0..0.35 eigenen Fog von 64 bis 192 Blöcken dazugeben
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### Nacht (skyLight-Blauverschiebung + Lampenschutz)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
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

> In dieser API ist `bloxdSunDirection()` null, wenn der Himmel keine Sonne hat. Folgendes ist kein gerichtetes Mondlicht, nur schwaches blaues Ambiente bei dunklem Himmel. Die Mondrichtung selbst ist via `-bloxdSunDirection()` verfügbar (nur Welten mit Tag/Nacht-Zyklus. [Teil VII](07-internals.md) R-A).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 am Horizont / 0 im Zenit
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### Totaler Engine-Output-Ersatz (einfachstes Relighting)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // HINWEIS: direkte BloxdLight(...)-Konstruktion verboten; colour ab default umschreiben
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // engineColour (das Engine-Lichtergebnis) verwerfen und „Basisfarbe × selbst berechnete Helligkeit" einsetzen
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // engineColour verworfen: Fog-Neuanwendung Pflicht
    out.colour = col + s.emission * l.fogVisibility;   // Emission selbst dazugeben (Pflicht)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. Emissionsrezepte

> `emission` wird nach der Lichtberechnung addiert, aber die Standardverarbeitung **dämpft es mit `fogVisibility`. In völlig vernebelter Ferne verschwindet Emission ebenfalls. Um Glanz in der Ferne zu behalten, nicht auf emission addieren — direkt als `out.colour += ...` im Light-Hook addieren** (engineColour ist bereits gefoggt, also landet Licht in der Ferne auf der Fog-Farbe)

### Pulsierende Lampen (atmende Fackeln)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(bloxdTime() * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### Leuchterz-Look (helle Materialien strahlen)

```wgsl
// Surface-Seite: je heller (weißer) das Material, desto mehr Emission
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### Glühwürmchen-Schwarm (treibende Lichtpunkte)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // ein paar langsam treibende „Lichtkugeln"; Glühen per inverser Distanz
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. Koordinatenrezepte (Welt / Block / Sicht)

### Weltkoordinaten

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### Blockkoordinaten

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
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
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### Sichtwinkel (Fresnel-Hausmittel — für Flüssigkeiten)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 frontal / 0 streifend
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. Zeitrezepte (Animation)

> `bloxdTime()` wrappt alle 3600 Sekunden (1 Stunde). Es ist Shader-Laufzeit ohne garantierte Synchronisation mit Tag/Nacht im Spiel. Für sichtbare periodische Animation ok, aber für echte Nachterkennung `bloxdSunDirection()` und Licht-Inputs bevorzugen.

### Tag-Nacht-Zyklus (1 Tag pro Stunde)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 Stundenperiode; nicht unbedingt mit Tag/Nacht im Spiel synchron
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
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // Liquid hat immer BLOXD_ALPHA — Guard aus Gewohnheit
    #endif
    return out;
}
```

### Höhen-Pseudo-Transparenz (kein echter Flachwassertest)

> In v1 waren Szenentiefe und Grundposition nicht abfragbar: echte Wassertiefe ließ sich mit dieser API allein nicht berechnen. In v2 misst `bloxdOpaqueBehind()` — nur in Flüssigkeiten — die Dicke bis zur opaken Fläche dahinter ([Teil VIII](08-apiv2.md) R-E). Folgendes ist der alte Pseudo-Effekt ohne das: `s.position.y` ist eine lokale Koordinate und roh verwendet verschiebt sich der Effekt mit dem Chunk-Ursprung. Er variiert alpha nur über Welthöhe — Pseudo-Effekt, kein küsten-/grundbewusstes Flachwasser. `packWaterReferenceY` an die eigene Welthöhe anpassen.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
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
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
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
> Zu den genauen Bedingungen (Liste der allow-Titel; Custom Games ist strict) siehe §30: [§30 Anwendungsmodi je Spiel](07-internals.md#30-anwendungsmodi-je-spiel-shaderpackpolicy)

### Gras im Wind (nur Spitzen bewegen)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // nur vertikale Flächen
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### Flüssigkeitswellen (nur Oberseiten)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdTime() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdTime() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### Pulsierendes Terrain

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // leichtes Aufblähen/Schrumpfen entlang Normalen
    return out;
}
#endif
```

### Wogendes Terrain (riesige Sinuswellen)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdTime() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdTime() * 0.7) * 0.3;
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // Zwischen-Clamp
    col = mix(l.fogColour, col, l.fogVisibility);                    // Fog-Neuanwendung
    out.colour = col + s.emission * l.fogVisibility;                 // Emission-Re-Addition
    #endif
    return out;
}
```

### R9.2 Sonnen-Specular (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // zarter Randglanz
    #endif
    return out;
}
```

### R9.4 Hemisphären-Ambiente (Himmel oben / Boden-Bounce unten)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // unten: Bounce
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // oben: Himmelslicht
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // Zwischen-Clamp
    col = mix(l.fogColour, col, l.fogVisibility);                           // Fog-Neuanwendung
    out.colour = col + s.emission * l.fogVisibility;                        // Emission-Re-Addition
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = Belichtung
    return out;
}
```

### R9.6 Luftperspektive („Atmosphäre" per Distanz-Entsättigung)

> Anders als Fog (Farbtausch) macht überlagerte „Distanz-Entsättigung" Fernen deutlich realistischer.  
> Vorsicht: nur Sättigung senken — nie Luminanz anfassen.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
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
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = bloxdWorldPosition(l.position);
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdTime()), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // blocklokale Koordinaten
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
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

> Ein Floor wie `max(l.fogVisibility, 0.25)` begrenzt „nicht dichter als dies"
> (0.0 = engine-treu / 0.3–0.5 = klarere Ferne).
> Hinweis: Der Engine-Fog ist reiner Horizont-Linear-Fog (nur nahe Sichtweite); mittleren Dunst muss das Paket bauen.
> Echte Fog-Einstellungen (implementierungsverifiziert): linear fixiert / `fogStart` = Chunk-Sichtweite / `fogEnd` = +1 Chunk / bei Fog-aus auf 100–101 Chunks faktisch deaktiviert / Standardfarbe RGB(183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // Fog-Neuanwendung (0.15 = leichter Floor)
    col += s.emission * l.fogVisibility;            // Emission ebenfalls gefoggt
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 Cinema-Grade (kalte Schatten / warme Highlights / Nacht-Entsättigung)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. Rohwerte wiederherstellen (überspringen gibt niemals Schatten)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. Schwellenschnitt — trennt sauber Sonne=1 / Schatten=0
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // Sonnen-Lambert (Fallback auf l.directional ohne Sonne)
    let sunLen = length(bloxdSunDirection());
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
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
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // Emission nicht vergessen (gefoggt)
    #endif
    return out;
}
```

> Tuning-Guide: **Schattenfläche entscheidet allein `shTh`** — `0.93` = Radius 1.5+ / `0.87` = Radius 2 / `0.80` = Radius 3 / `0.67` = Radius 5.  
> Kanten­härte ist `shSoft` (0.02 = hart / 0.08 = weich). Kern­dunkelheit ist die Zwei-Punkt-Verschiebung aus `0.09` (Mindest-Ambiente) und `0.16` (Himmelsstreulicht).  
> Für breitere Abend­schatten `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` addieren (Näherung langer Abendschatten.  
> `sunDir` ist `bloxdSunDirection() / length(bloxdSunDirection())`). Für blauere Schatten das B von `vec3f(0.72, 0.82, 1.05)` erhöhen.
>

[← Vorheriger Teil](02-api.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](04-realism.md)

[← Vorheriger Teil](03-recipes.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](05-troubleshooting.md)

# Teil IV: Realismus-Leitfaden

> Das aktuelle Spiel verlangt seit dem 2026-10-19 `apiVersion: 3` und lehnt v1/v2-Pakete beim Laden ab — der folgende Inhalt ist auf der v2-Spezifikation geschrieben. Siehe [Teil IX](09-apiv3.md) zum Migrieren vor der Verteilung.

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
4. **Ohne Sonnenrichtung**: Ist `bloxdSunDirection()` null, kein gerichtetes Specular berechnen. `l.directional` ist ein Lichtmengen-Skalar, kein Richtungsvektor: stellt die Highlight-Richtung nicht wieder her. Bei Bedarf auf schwaches richtungsloses Ambiente wechseln. Die Mondrichtung ist via `-bloxdSunDirection()` verfügbar (bewegt sich nur in Welten mit Tag/Nacht-Zyklus. [Teil VII](07-internals.md) R-A)

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
| Unterwasser-Refraktion | Keine Szenenfarbe. Aber Flüssigkeits-Tiefe (`bloxdOpaqueBehind()`) ermöglicht Dickenabsorption und Grundprojektion ([Teil VIII](08-apiv2.md) R-E) |
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
- Nachts bleiben nur beleuchtete Flächen → nicht nur Schatten abdunkeln; die ganze fertige Farbe (`engineColour`) nachts dämpfen. Lokale Lampen per `blockLight` / `heldLight` weniger dämpfen ([Teil VI](06-implementation.md), Abschnitt 19)
- Schatten vertiefen sich mit `pow(skyLight, γ)` nicht → `l.skyLight` ist post-Kurve (Abschnitt 10). Auf R9.12-Inversion + Schwelle wechseln
- Schattenfläche/-dichte tunen → R9.12-Tuning-Guide (Fläche = Schwelle `shTh` / Kante = `shSoft` / Kerndunkelheit = Zwei-Punkt-Verschiebung aus Mindest-Ambiente und Himmelsstreulicht)

[← Vorheriger Teil](03-recipes.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](05-troubleshooting.md)

[← Vorheriger Teil](04-realism.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](06-implementation.md)

# Teil V: Fehlersuche & Hinweise

> Das aktuelle Spiel verlangt seit dem 2026-10-19 `apiVersion: 3` und lehnt v1/v2-Pakete beim Laden ab — der folgende Inhalt ist auf der v2-Spezifikation geschrieben. Siehe [Teil IX](09-apiv3.md) zum Migrieren vor der Verteilung.

## 17. Häufige Fehler und Fixes

| Symptom | Fix |
|---|---|
| Lädt in strikten Spielen nicht | Vertex-Hook in `#ifndef BLOXD_STRICT` packen |
| `.alpha` als undefiniert gemeldet | In `#ifdef BLOXD_ALPHA` packen |
| `blockLight` als undefiniert gemeldet | In `#ifdef BLOXD_LIGHTING` packen. Gemeinsame Hilfsfunktionen **als ganze Funktionen** einpacken (in v2 ist das Feld immer vorhanden: praktisch kein Fehler mehr; Guards für Entscheidungszweige behalten) |
| `Packs can't construct BloxdSurface directly` | Von `bloxdDefaultSurface(s)` ausgehen |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | In `#ifndef BLOXD_STRICT` packen |
| Weiße milchige Ferne | Meist Doppel-Fog. Die fertige Farbe ist bereits gefoggt: eigenen Dunst dezent halten und lieber nur Sättigung senken |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | Warnung, dass die Licht-Seed-Queue in Regionen hoher Emitterdichte oder über Regionsgrenzen hinweg übergelaufen ist; die Lichtberechnung dieses Chunks wurde abgeschnitten. Nicht paketbedingt, aber **Lichtlücken um Emitter-Konzentrationen stammen aus dieser Spezifikation** — verteilte Lichtquellen in der Welt vermeiden sie |
| Paket beim Spielbeitritt ausgeschlossen | Live-Check im Spiel schlägt fehl. Guard-Lücken prüfen |
| Der Live-Check terminiert nie und das Paket fliegt mit `This device couldn't check ...` etc. | Der Check hat ein erzwungenes 60-Sekunden-Timeout (Überschreitung zählt als `skipped`). Häufig auf schwachen Geräten / schweren Welten — schweres Vertex-Arbeiten und komplexe Loops reduzieren und erneut versuchen |
| `pack.json needs "apiVersion": 3.` | `apiVersion` fehlt oder ist nicht `3`. Zahl `3` eintragen (String `"3"` wird abgelehnt). v1/v2-Pakete werden mit `shaderPack:loadWrongApiVersion` abgelehnt |
| `There's no pack.json at the top of the pack.` | Kein `pack.json` im ZIP-Root. Prüfen, ob nicht der Ordner selbst gezippt wurde |
| `bloxdTerrainVertex must be declared as: fn ...` | Signatur weicht ab. Exakt wie angezeigt umschreiben |
| `bloxdTerrainVertex can't run in strict games...` | Vertex-Hook in `#ifndef BLOXD_STRICT` packen |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | In `#ifdef BLOXD_LIGHTING` packen (in v2 ist das Feld immer vorhanden: praktisch kein Fehler mehr) |
| `pow(l.skyLight, γ)` höher zu drehen vertieft Schatten nie | `skyLight` ist Post-Kurven-Wert (roh 0,87 kommt als 0,97). Auf R9.12-Lift-Inversion + Schwelle wechseln (Abschnitt 10) |
| `... can only be a function's parameter or return type, ...` | Uninitialisiertes `var x: BloxdSurface;` wird abgelehnt. Ab `bloxdDefault*` bauen |
| `bloxdPackInputs isn't part of the bloxd_ header` | Das PackInputs-Uniform kann aus Paketen nicht direkt referenziert werden. Über Header-Funktionen wie `bloxdTime()` nutzen |
| `Packs can't declare bloxd_ names...` | Das `bloxd_`-Präfix aus eigenen Bezeichnern entfernen. Nur die 6 Hook-Namen dürfen definiert werden |
| `loadDuplicateManifest` beim Zip-Laden | Zwei `pack.json` (inkl. Groß/Klein-Varianten). Eines behalten |
| `needs the new WebGPU renderer, so remove the renderer override...` | URL-Parameter `?renderer=` und localStorage `bloxdRenderer` entfernen und neu laden ([Teil VII](07-internals.md) §29) |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Ab `bloxdDefaultSurface(s)` umschreiben. Von einer Kopie des ersten Light-Hook-Parameters (`var out = s;`) zu starten geht auch |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` wird abgelehnt. `_ = f();` schreiben |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | `bloxdOpaqueBehind()`-Aufrufe in Terrain-Hooks mit `#ifdef BLOXD_SCENE_DEPTH` umschließen |
| `...only surface and light hooks can use.` | `bloxdOpaqueBehind()` aus Vertex-Hooks entfernen (nur Surface / Light) |
| `Lite: …reads scene depth on a page that didn't turn it on` | Seite neu laden und mit dem Tiefen lesenden Paket ([Teil VIII](08-apiv2.md) §35) wieder öffnen. Die Verfügbarkeit der Tiefentextur wird bei der Seitenerstellung fixiert |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Kein Fehler, sondern Auto-Deaktivierung in strikten Spielen (`shaderPack:offInStrict`). Vertex-Hooks und `discard` mit `#ifndef BLOXD_STRICT` umschließen |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Fehler der 2. Stufe (Browser-Tint). Operanden von `^` `&` `\|` `<<` `>>` klammern (§38) |

### Fehler-IDs der Ladephase

Fehler vom Einstellungs-Bildschirm tragen `shaderPack:load*`-IDs. Als Nachschlagehilfe für Meldungen:

| ID | Bedeutung |
|---|---|
| `loadZipTooBig` | zip über 32MB |
| `loadTooManyZipEntries` | zip-Einträge über 1024 |
| `loadTooManyWgsl` | `.wgsl` über 256 |
| `loadSourceTooBig` | `.wgsl` gesamt über 256KB (Streaming-Prüfung pro Datei) |
| `loadManifestTooBig` | `pack.json` über 64KB |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` ist kein JSON / kein Objekt |
| `loadNoApiVersion` / `loadWrongApiVersion` | kein `apiVersion` / nicht `3` (v1/v2-Pakete abgelehnt) |
| `loadNoName` / `loadAuthorNotString` | kein `name` / `author` ist kein String |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | nicht unterstützte Kompression / zip64 / geteilt / verschlüsselt |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | doppelte Pfade / kein UTF-8 / Dekomprimierung fehlgeschlagen / zip beschädigt |

`loadNoManifest` / `loadDuplicateManifest` (Position / Duplikate von `pack.json`) — siehe die passenden Zeilen in der Tabelle oben.

## 18. Rechte & Hinweise

- Die Shader-Paket-Funktion ist eine offizielle, aus der Spiel-UI ladbare Funktion, Pakete zu erstellen gilt als vorgesehener Gebrauch. Es wurde aber keine öffentliche offizielle Dokumentation bestätigt
- Pakete sind reines WGSL — JS-Ausführung und Netzwerkzugriff sind konstruktionsbedingt unmöglich
- Dies ist eine inoffizielle Anleitung, nicht die offizielle Position der Entwickler. Die API kann sich ohne Hinweis ändern

[← Vorheriger Teil](04-realism.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](06-implementation.md)

[← Vorheriger Teil](05-troubleshooting.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](07-internals.md)

# Teil VI: Wichtige Umsetzungshinweise

> Das aktuelle Spiel verlangt seit dem 2026-10-19 `apiVersion: 3` und lehnt v1/v2-Pakete beim Laden ab — der folgende Inhalt ist auf der v2-Spezifikation geschrieben. Siehe [Teil IX](09-apiv3.md) zum Migrieren vor der Verteilung.

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

Diese API kann die Szenenfarbe nicht sampeln: Es ist **Pseudo-Rendering per Fresnel-Farbmischung und Sonnen-Highlights, keine echte Reflexion/Refraktion**. Die Tiefenberechnung geht in v2 per `bloxdOpaqueBehind()` (ausgelagert in [Teil VIII](08-apiv2.md) R-E). Das Sample behält die Basisfarbe, mischt bei streifenden Blickwinkeln etwas Richtung Himmelsfarbe und addiert nur mit Sonne einen kleinen Glint.

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
- Echte Landschaftsreflexionen: Diese API-Inputs haben keine Bildschirmfarbe: Farben zu mischen wird nie echte Reflexion (Tiefe ist in Flüssigkeiten abgreifbar. [Teil VIII](08-apiv2.md) R-E).

Dieses Rezept **ersetzt** ein existierendes `bloxdLiquidLight`. Nicht neben die gleichnamige Wellenfunktion aus R9.7 oder andere gleichnamige Hooks kleben.

## 21. In-Game-Testcheckliste

Kompiliererfolg und „gutes Aussehen" sind verschiedene Dinge. In dieser Reihenfolge prüfen:

1. **Laden:** `pack.json` im ZIP-Root. Direkt nach der Auswahl erscheint `Ready. Reload the page to use it.` und das Paket wird **beim Neuladen der Seite** aktiv; danach `Ready to use` bestätigen. Gespeicherte Pakete werden beim nächsten Seitenladen automatisch revalidiert: Wann immer sich der engine-seitige Spec-Header aktualisiert, wird der Header-Inhalt per Fingerprint geprüft (bestanden = bleibt unverändert aktiv / fehlgeschlagen = wird als blockiert angezeigt) — ein defektes altes Paket bleibt also nie still aktiv.
2. **8 Varianten:** keine Typ-Guard-Lücken in strict / allow, Licht an / aus, Terrain / Flüssigkeit. Auch wenn ein Spiel nur manche Bedingungen nutzt, sollten Vertriebspakete alle 8 annehmen.
3. **Tag:** Farben pro Material nicht ausgebrannt (Gras, Stein, Sand, Holz); natürlicher Hell/Dunkel-Sprung zwischen Oben und Seiten.
4. **Nacht:** dieselben Materialien im einstigen Tageslicht, Schatten und Fackelnähe vergleichen. Bleiben nur beleuchtete Flächen, Belichtungsdämpfung tunen; wird alles dunkel, lokalen Lichtschutz tunen.
5. **Wasser:** von oben, streifende Winkel, Ufer, unter Wasser und nachts getrennt ansehen. Alpha-Verhalten und Unterwasser-Look hängen vom Spiel-Compositing ab — nie von einem Blickwinkel urteilen. Unter Wasser deckt der Flüssigkeitsdefinitions-Schleier vorne ab, wie in [Teil VII](07-internals.md) beschrieben: Paket-Unterschiede zeigen sich vor allem an Oberfläche und Terrain hinterm Schleier.
6. **Ränder und Ferne:** keine Wellen-/Mustersprünge an Chunk-/Ursprungsübergängen; kein Doppel-Fog und kein weißer Dunst in der Ferne.
7. **Performance:** fragment-schwere Hash/Trig/`pow`-Effekte minimal. Details schrittweise dazugeben und FPS vergleichen.

### Bekannte Einschränkungen als Prämissen

- Pakete beschränken sich auf Terrain-/Flüssigkeits-Hooks — kein Himmel, keine Entities, keine UI mit demselben Code.
- Keine Inputs, um Shadowmaps, Screen-Space-Reflexionen, Refraktion, Bloom etc. hinzuzufügen (Szenentiefe ist in Flüssigkeiten via `bloxdOpaqueBehind()` freigegeben. Siehe [Teil VIII](08-apiv2.md)).
- `bloxdTime()` ist Animationszeit ohne garantierte Bindung an Tag/Nacht im Spiel.
- Bei `bloxdSunDirection()`-null ist die wahre Mondrichtung unbekannt, keine „Mondlichtphysik" sondern Stimmungsnäherung. Gerichtetes Mondlicht baut man aus `-bloxdSunDirection()` (nur Welten mit Tag/Nacht-Zyklus. [Teil VII](07-internals.md) R-A).
- `s.position` / `l.position` sind lokale Koordinaten: `bloxdOriginOffset()` für weltabhängige Effekte addieren. Für blocklokale Muster sind lokale Koordinaten bewusst das Werkzeug.

## 22. Mit anderen Paketen kombinieren, wenn der Shader allein ans Limit stößt

Da Pakete keine Texturen hinzufügen oder sampeln können, keine feinen Material-Bumps oder Himmelsbilder per Shader allein lösen wollen. Das öffentliche Texturpaket-Repo für Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) behandelt Texturen, Skybox, Modelle etc. auf anderem Weg.

Als Referenz entpuppten sich in einem Fall analysierte Community-„Cinematic-Shader"-Distributionen als Texturpakete (128x128-Texturen ohne `pack.json` / `.wgsl`).

In der Praxis **Licht und Farbe per Shader tunen und Materialien plus Himmel per passendem Ressourcenpaket abdecken**. Aber Co-Nutzung und Ladereihenfolge gegen Spiel-Implementierung und -Einstellungen prüfen.

Texturpakete haben ihre eigene Spezifikation (als Referenz): Das Größenlimit liegt bei 25MB, gemessen als Länge des base64-kodierten JSON-Strings; Base64-Kodierung eines PNG bläht es um +33% auf, das praktische Limit für Rohbilder liegt also bei ~18–19MB. CSS wird von einem einfachen Regex-Parser verarbeitet — Verschachtelung und Kommentare vermeiden.

## 23. Unterwasser-Realität mit Shader-Paketen

Unterwasser-Looks bestehen aus 3 Schichten:

| Schicht | Inhalt | Aus Paketen operierbar? |
|---|---|---|
| ① Terrain-/Flüssigkeits-Rendering | Per Hooks verarbeitbar. Light-Hooks laufen unter Wasser normal | Ja (wirkt „unterm Schleier") |
| ② Flüssigkeitsdefinitions-Schleier | Emissives Fullscreen-Quad aus Definitionsfarbe/-alpha des Flüssigkeitsblocks der Kamera, ganz vorne gezeichnet. Die Spieleinstellung `cameraTint` gewinnt, falls gesetzt | Nein (weder Farbe noch Dichte änderbar) |
| ③ cameraTint | Spieleinstellung | Nein |

Praktische Punkte: Pakete wirken auch unter Wasser weiter / der Schleier ist nicht entfernbar / unter Wasser ist keine Verzweigung möglich (fogStart / fogEnd / fogColour ändern sich unter Wasser nicht: fogVisibility erkennt es auch nicht).

[← Vorheriger Teil](05-troubleshooting.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](07-internals.md)

[← Vorheriger Teil](06-implementation.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](08-apiv2.md)

# Teil VII: Interna-Ergänzung

> Das aktuelle Spiel verlangt seit dem 2026-10-19 `apiVersion: 3` und lehnt v1/v2-Pakete beim Laden ab — der folgende Inhalt ist auf der v2-Spezifikation geschrieben. Siehe [Teil IX](09-apiv3.md) zum Migrieren vor der Verteilung.

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

Die Fog-Berechnung ist immer LINEAR-Modus (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), mit `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = Fog-Einstellung; nur D = 0 ist speziell mit fogEnd = 5). **Das Gradientenband ist nur 32 Blöcke breit**, und `l.fogVisibility` ist weniger „Distanzdunst" als **normierte Distanz zur Kante der geladenen Welt**. Variiert pro Spieler mit Ladedistanz: Distanz-Effekte sollten `distance(l.position, bloxdEyePosition())` selbst berechnen (Rezept R-B). (v3-Hinweis: Die Fog-Funktion des Renderers implementiert tatsächlich **vier** Modi — aus / exponentiell / exponentiell zum Quadrat / linear —, wobei ausgelieferte Titel den linearen Modus fahren; der restaurierte Quellcode und das Robustheitsargument stehen in [Teil IX](09-apiv3.md) §50.)

Standard-Fog-Farbe `rgb(183, 191, 195)` (blasses Blaugrau). Welt-Ersteller ändern sie via `fogColourOverride` (hex). Bei Fog-Modus 0 (NONE) **kommt fogColour schwarz an**. Die Standardform `mix(l.fogColour, col, l.fogVisibility)` ist sicher, da Fog-Farbe bei fogVisibility 1 ungenutzt bleibt. Die Script-API hat zwei weitere Optionen, `fogChunkDistanceOverride` und `fogOnSkybox`: Custom Games können die Fog-Distanz (den D-Wert) und die Fog-Anwendung auf die Skybox unabhängig setzen. Standardmäßig ist die Skybox nicht vom Fog betroffen (nur in Spielen mit aktivem `fogOnSkybox` wird auch die Skybox mit der Fog-Farbe getönt).

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

Die Licht-Komposition ist nicht additiv. Intern nimmt die Engine das **Maximum** aus Blocklicht (nach dem 35-%-Floor) und Sky-Licht in der Form `mix(Umgebungsfarbe, Himmelsfarbe, skyLight)` und davon erneut das Maximum mit Handlicht (nach Ambient-Boost). Die Kanalwerte dieser Komposition sind die **Post-Lift**-Werte — die Engine komponiert aus denselben angehobenen Lichtpegeln, die die Hook-Eingaben erreichen (`terrainLightLevels` nach der Lift-Kurve), in v2 wie in v3. `blockLight` und `skyLight` heben sich also nie gegenseitig auf — der Beitrag der dunkleren Seite wird schlicht verworfen — deshalb dunkelt abgeschwächtes Sky-Licht von blockLight dominierte Stellen kaum ab. Belichtungs- und Abfall-Rezepte um diese Struktur herum bauen (der lokale Lichtschutz in [Teil VI](06-implementation.md) §19 existiert als Ausgleich dafür).

Handlicht (`heldLight`) hat Reichweite nach hellstem Kanal (max 15 Blöcke) mit `dist^0.75`-Vorverarbeitung, demselben 35-%-Floor, und `l.heldLight` ist der **Pre**-Ambient-Boost-Wert. Der Kegelabfall, restauriert aus dem Lichtmodul der Engine: Die Winkelabschwächung des Strahls ist `1 − 0.5 × (smoothstep(0.12, 0.65, t) + smoothstep(0.62, 0.95, t))`, wobei `t` der normierte Winkel von der Kegelachse ist (0 = Zentrum, 1 = Rand); die Reichweite ist `(rangeOverride > 0 ? rangeOverride : hellster Kanal) × Kegelabfall`, wobei `rangeOverride` aus dem Alpha der Handlicht-Farbe gelesen wird; innerhalb der Reichweite dämpft ein Override mit `(range − dist) / range`, während der Standard die (vorverarbeitete) Distanz kanalweise abzieht; danach folgen der 35-%-Floor, Division durch 15, die Lift-Kurve und schließlich der Ambient-Boost. Custom-Items können `spotlightRange` und Kegelwinkel setzen — ein „Strahl im Halten"-Modus, dessen Kegel der Kamera folgt. Pakete können die Strahlrichtung nicht wissen.

Custom-Blöcke können `skyLightEmission` (0–15) tragen, das **in den skyLight-Kanal selbst injiziert, separat zum blockLight-BFS**. R9.12-artige Pakete, die Sonne/Schatten per skyLight-Schwelle beurteilen, können in Welten mit künstlich gehobenem skyLight danebenliegen. Vertriebspakete beurteilen robuster kombiniert mit blockLight.

## 27. Pipeline-Details

- **Surface-Hooks laufen „vor" alphaTest**: `out.alpha` speist den Verwerfungstest direkt. Cutout-Materialien (Gras, Blätter) erlauben Dissolve-Dither-Effekte (Rezept R-C). In Flüssigkeiten (Blending) ist `out.alpha` die echte Transparenz (Rezept R-D). Kein Effekt auf normalem opakem Terrain — nicht verwechseln
- **`l.ambient`-Inhalt**: `material.ambient × sceneAmbient`, pro Material verschieden. Die Szenenseite hängt an der Grafik-Einstellung „Ambient Lighting Intensity" (Standard 0.5) — nie Fixes einprogrammieren
- **Die Richtlichter der Szene sind ein 2-Lampen-Aufbau**: Die Lambert-Summe aus Hauptlicht (Richtung aus der Sonnenposition der Sky-Einstellung, Intensität 1.0) und Fülllicht (Richtung `[-0.5, -1, -1]`, Intensität 0.35) erreicht `l.directional`. Das Fülllicht zeigt nach unten, trägt also nichts zu Oberseiten bei und fängt nach unten weisende Flächen ein (Höhlendecken usw.). Terrain berücksichtigt nur in `_initScene` hinzugefügte Lichter; nach dem Start zur Szene hinzugefügte Lichter werden von Terrain und Blockmodellen ignoriert (eine offizielle Warnmeldung sagt das)
- **`bloxdTime()` ist wirklich `performance.now()`**: die Browser-Uptime, auf 1 Stunde gewrappt. Ohne Bezug zu Spiel-Tag/Nacht und Welt-Laufzeit. Für uhr-synchrone Animation die Uhrzeit aus dem `bloxdSunDirection()`-Azimut in Tag/Nacht-Zyklus-Welten schätzen
- **Header-Funktionen lesen ein Uniform**: Die Engine platziert ein 64-Byte-Uniform auf `@group(3) @binding(0)` (4 Slots — Zeit / originOffset / sunDirection / eyePosition, Little-Endian), und `bloxdTime()` / `bloxdOriginOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` entsprechen dem Lesen dieser Slots. `originOffset` ist im aktuellen Build immer `[0, 0, 0]` (ein reservierter Slot für Fließkomma-Weltkoordinaten). Pakete können dieses Uniform nicht schreiben, und da Paket- und Engine-WGSL zu einem Modul verschmelzen, ist auch das eigene Deklarieren derselben group/binding unmöglich. (v3 benennt die beiden Slots um — `seconds` / `renderOffset`, exponiert als `bloxdSeconds()` / `bloxdRenderOffset()` — und ergänzt die Szenentiefe-Textur bei `@group(3) @binding(1)`; siehe [Teil IX](09-apiv3.md) §41 und §51.)
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

- Referenz-Build: `szby6g.main.94a7596c.js` (Produktions-Deployment zum 2026-10-17). Statische Auswertung aller 111 Spieldefinitionen: **26 allow-Einträge (12 Titel) / 85 strict-Einträge**. Dieselben 12 allow-Literale in denselben 12 Titeln wurden im v3-Produktions-Bundle (`3ymzdd`, 2026-10-20) unverändert erneut bestätigt — die folgende Liste gilt wortgleich auch für v3.
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

[← Vorheriger Teil](07-internals.md)·[Zurück zum Handbuch](README.md)

# Teil VIII: Migrationsleitfaden für API Version 2

> Das aktuelle Spiel verlangt seit dem 2026-10-19 `apiVersion: 3` und lehnt v1/v2-Pakete beim Laden ab — der folgende Inhalt ist auf der v2-Spezifikation geschrieben. Siehe [Teil IX](09-apiv3.md) zum Migrieren vor der Verteilung.

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

Alle 3 Structs `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` erhalten `blockId: u32`. Die **ID des Blocks, dem die Fläche gehört** (0–65535), über die ganze Fläche konstant (per `@interpolate(flat)` übergeben). Dient zur texturfarben-unabhängigen Blockart-Erkennung. Die ID-Blockart-Tabelle liegt aber engine-intern und ist aus Paketen nicht referenzierbar: **Welche ID welcher Block ist, lässt sich in der Welt vermessen oder in der Referenz unten nachschlagen**. Intern wird die ID in das Alpha der Vertexfarbe (untere 8 Bit) und in das w der Normalen (obere 8 Bit) gebacken — 16 Bit insgesamt; daher rührt auch die 65535-Obergrenze. Das blockId-System selbst wird nur aktiv, solange ein aktives Shader-Pack existiert (ohne Pack behalten die Leitungen ihre Füllziele, aber innerhalb der Struct-Definitionen aus Teil II ist dieser Unterschied nicht beobachtbar).

**Referenz**: Der Autor veröffentlicht eine Liste der Spiel-Einträge unter [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (`entries.json`: Tabelle id ↔ Blockname; Rotations-/Meta-Varianten wie `Furnace|meta|rot2` stehen als eigene IDs drin). Zuordnungen können sich mit Spiel-Updates ändern — endgültige Werte im echten Spiel prüfen.

Häufige Blockarten (aus entries.json, Stand 2026-10-18; nur die Terrain-Familien mit den niedrigen IDs aufgelistet):

| ID | Blockname | ID | Blockname |
|---|---|---|---|
| 0 | Air | 15 | Maple Wood Planks |
| 1 | Unloaded | 28 | Stone |
| 2 | Dirt | 29 | Messy Stone |
| 3 | Messy Dirt | 31 | Smooth Stone |
| 4 | Grass Block | 126 | Water |
| 5 | Sand | 128 | Bricks |
| 6 | Clay | 139 | Ice |
| 7 | Gravel | 147 | Bedrock |
| 8 | Snow | 149 | Cactus |
| 9 | Maple Log | 1491 | Lava |

entries.json listet auch Nicht-Block-Einträge (Werkzeuge etc.), aber nur Block-Familien-IDs erreichen die Terrain-/Liquid-Hooks.

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

### R-G. blockId in der Welt ausmessen — das Bit-Plane-Anzeige-Pack

Ein Debug-Rezept, um in der Welt die IDs von Blöcken auszumessen, die in der Tabelle fehlen. Durchlaufe die vordere Konstante `plane` mit `0, 1, 2, …`, während du die Farbe der Fläche des Blocks abliest, den du identifizieren willst.

```wgsl
const plane: u32 = 0u;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let d = (s.blockId >> (plane * 3u)) & 7u;
    var palette = array<vec3f, 8>(
        vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 1.0, 0.0),
        vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 1.0));
    out.colour = palette[d];
    return out;
}
```

Die Fläche zeigt die 3 Bits von blockId direkt als RGB (schwarz = 0 / rot = 1 / grün = 2 / gelb = 3 / blau = 4 / magenta = 5 / cyan = 6 / weiß = 7). Eine Beobachtung liest eine Oktalziffer. Liest p0 → p3 nacheinander 3, 2, 7, 2, ist die von der oberen Ziffer gelesene Oktalzahl 2723 = 1491 die id (Lava). Terrain-Familien mit niedriger id kommen mit 2 Beobachtungen (p0, p1) aus. Verwendet nur den surface hook, läuft also auch in strict-Titeln.

### R-H. Nur die Blätter schwanken lassen — Eingrenzung des Vertex-Hooks per blockId

Das R7-Wind-Rezept ([Teil III](03-recipes.md)) wellt das ganze Terrain, aber auch der Vertex-Hook kann `blockId` lesen — die Ziele lassen sich also auf Blattblöcke begrenzen. Die ID-Liste und das WGSL-Array (gemessen am 2026-10-18; 22 Sorten — Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / Fruchtvarianten / Autumn Aspen):

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// vertex hooks werden in strict-Titeln automatisch deaktiviert (siehe §36)
#ifndef BLOXD_STRICT

fn sp_isLeaf(id: u32) -> bool {
    for (var i = 0u; i < 22u; i++) {
        if (LEAF_IDS[i] == id) { return true; }
    }
    return false;
}

fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    if (sp_isLeaf(v.blockId)) {
        let wp   = bloxdWorldPosition(v.position);
        let t    = bloxdTime();
        // Die Verschiebung ist eine glatte Funktion der Weltposition. Gemeinsam benutzte Vertices,
        // die auf denselben Weltpunkt zeigen, bewegen sich identisch, sodass Flächen nicht abreißen ([Teil III](03-recipes.md) R7 folgt demselben Prinzip)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- Die ID-Liste wächst mit den Engine-Updates (allein bei der Messung kamen in einem neuen Build 50 Blocksorten hinzu). Um weiter zu nutzen, ergänze Neuheiten über [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) oder durch Messen mit der Bit-Plane-Anzeige aus R-G und erweitere das Array
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) sind unsolide, auf den Boden gelegte Blattmatten. Wankt sie, scheint sie vom Boden abzuheben — eine Option ist, sie vom Array auszuschließen
- In strict-Titeln wird der Vertex-Hook pauschal deaktiviert, aber mit der obigen Guard schaltet das Pack einfach „auf Ruhe ab“ — die Fragment-seitigen Effekte bleiben aktiv

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

Anwendungen: dickenbasierte Absorption/Streuung, Wellen-/Kaustik-artige Musterprojektion aus Boden-Weltkoordinaten via `behind.position`, Himmelsreflexion an der Oberfläche mit Himmel-vs-Verdeckung-Unterscheidung per `found=false`, tiefengestaffelte Schaum- und Trübungsgrade. Schlägt der Aufbau der Tiefenkopie-Pipeline fehl, sichere Degradation zu „nichts dahinter". Die Verfügbarkeit der Tiefentextur wird bei der Erzeugung des Seiten-Renderers einmalig fixiert — maßgeblich ist „liest das aktive Paket Tiefe?". **Beim Einsatz eines Tiefe lesenden Pakets daher immer die Seite neu laden**. Wird Tiefe angefordert, während ein Paket aktiv ist, die Seite aber nicht neu geladen wurde, zeigt die Konsole einmalig eine `…reads scene depth on a page that didn't turn it on`-Warnung, und die Tiefentextur wird durch einen 1×1-Fallback ersetzt, sodass `bloxdOpaqueBehind()` immer `found = false` liefert.

## 36. Sonstige v2-Änderungen

- **Hook-Fallback**: Liquid-Programme fallen ohne definiertes `bloxdLiquidXxx` auf Terrain-Hooks zurück. **Pakete mit nur Terrain-Hooks wirken unverändert auch auf Wasser**. Falls unerwünscht, Liquid-seitige Hooks explizit definieren.
- **`BLOXD_LIGHTING`-Feld-Guards überflüssig**: `blockLight` etc. existieren in allen Varianten, in unlit mit Defaults (0 / 1 / Weiß / 0). `#ifdef BLOXD_LIGHTING` nur für Lichtabfragen nutzen. Bestehende Guards zu behalten ändert nichts.
- **`BLOXD_ALPHA`-Definitionsbedingung geändert**: In Nicht-Strict-Terrain-Varianten und allen Liquid-Varianten definiert, in strict × Terrain nicht. Beim Schreiben von alpha in Terrain-Hooks den Guard behalten.
- **Direkte Struct-Konstruktion verboten**: Konstruktoraufrufe wie `BloxdLight(...)` werden von der statischen Prüfung abgelehnt. Immer ab `bloxdDefault*` ändern oder die Eingabe kopieren.
- **`let _ =` wird `_ =`**: Die WGSL-Verwerfungszuweisung `_ = f();` ist gültig, aber `let _ = f();` wird abgelehnt.
- **offInStrict**: Eine Vertex-Hook-Definition oder ein aus Surface-/Light-Hooks erreichbares `discard` gibt keinen Fehler, sondern deaktiviert das ganze Paket in strikten Spielen automatisch (Einstellungs-UI zeigt `shaderPack:offInStrict`, in Allow-Spielen läuft es). Vertex-Hooks und `discard` mit `#ifndef BLOXD_STRICT` umschließen. Beachte: die Meldung der offiziellen Einstellungs-UI selbst weist an, den Rest mit `#ifndef BLOXD_STRICT` zu umschließen — ist keine bloße Konvention, sondern offizielle Empfehlung.
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

[← Vorheriger Teil](07-internals.md)·[Zurück zum Handbuch](README.md)

[← Vorheriger Teil](08-apiv2.md)·[Zurück zum Handbuch](README.md)

# Teil IX: Migrationsleitfaden für API Version 3

Ziel-Build: `3ymzdd.main.fae4743f.js` — **der seit 2026-10-19 live ausgelieferte Produktions-Build**. Das Bundle, das bloxd.io in Produktion ausliefert, ist byte-identisch (per md5 geprüft, Haupt-Bundle und Shader-Pack-Chunks gleichermaßen) mit dem Preprod-Deploy, gegen das dieser Teil ursprünglich untersucht wurde; alles hier gilt also unverändert für die Produktion. Das Paketmodell behält seine v2-Form (gleiche `pack.json`-Felder, gleiche Loader-Limits, gleiches Uniform-Layout).

Die Teile I–VII dieser Anleitung sind weiterhin auf v2-Basis geschrieben. Dieser Teil sammelt in derselben Reihenfolge wie [Teil VIII](08-apiv2.md) die Migrationspunkte v2 → v3 und die Neuerungen von v3. Die Umstellung ist größtenteils mechanisch (§47), aber nur eine Änderung verändert tatsächlich das Verhalten — das Standardlicht dämpft Emission jetzt durch Fog (§43) — und `blockId` wird vollständig durch `blockFlags` ersetzt (§42); vor der Verteilung daher immer per In-Game-Kompilierung prüfen.

Neu in dieser Revision: Die Abschnitte **§49–§54** gehen über die Migration hinaus in Engine-Interna, die aus dem Produktions-Build restauriert wurden — wie der Lite-Renderer deine Hooks tatsächlich aufruft, die echte Fog-Funktion mit vier Modi, die exakte Implementierung von `bloxdOpaqueBehind()`, den vollständigen blockFlags-Übertragungsweg von der Blockregistrierung bis zu deinem Hook und die Validierungspipeline mit ihrem gemessenen Header-Hash. Das sind die detailliertesten bislang öffentlich dokumentierten Fakten über das Paketsystem, und sie beantworten mehrere Fragen, die andere Anleitungen noch als offen führen.

## 40. Das Schicksal von v2-Paketen (erst das Fazit)

**Update 2026-10-19: v3 hat Preprod verlassen und ist jetzt das, was die Live-Seite ausliefert.** Jedes vor dem Rollout gespeicherte v2-Paket — einschließlich jedes als v2 verteilten Pakets — scheitert in Produktion genau wie unten beschrieben; die Migration aus §47 ist für alle, die heute Pakete verteilen, nicht mehr optional.

Der Build verlangt, dass die Manifest-`apiVersion` **exakt 3 entspricht**, und es gibt **keinen parallelen v2/v3-Support**. Ein v2-Paket wird beim Laden mit den Meldungen zur falschen API-Version abgelehnt (i18n-Keys, Platzhaltertext):

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>
> `loadNoApiVersion`: "pack.json needs \"apiVersion\": {{version}}."

Gespeicherte Pakete behalten den v2-Lebenszyklus ([Teil VIII](08-apiv2.md) §31): Jeder Build hasht seinen Engine-Header, Engine-Updates markieren gespeicherte Pakete automatisch als „muss erneut geprüft werden“, und ein gespeichertes Paket, dessen `apiVersion` eine andere als die aktuelle ist, wird als nicht ausführbar markiert (mit der obigen Statusmeldung, die auf den Ersatz verweist), statt einen Fehler auszulösen.

## 41. pack.json und der Uniform-Buffer (was unverändert bleibt)

- Die Pflichtfelder im Manifest sind unverändert: `{ apiVersion, name, author }`.
- Die Loader-Limits sind unverändert: 32 MB Zip / 1024 Einträge / 256 `.wgsl`-Dateien / 256 KB Code gesamt / 64 KB Manifest.
- Das Uniform der Engine ist in seiner Form unverändert: `@group(3) @binding(0)`, 64 B, mit — in Deklarationsreihenfolge — Zeit, Render-Offset, Sonnenrichtung und Augenposition. Das Layout ist mit `minBindingSize: 64` registriert, und die exakte Feldanordnung ist `seconds: f32` @ Byte 0, `renderOffset: vec3i` @ 16, `sunDirection: vec3f` @ 32, `eyePosition: vec3f` @ 48. Zwei interne Feldnamen haben sich geändert: `time` → `seconds`, `originOffset` → `renderOffset`. Die **Byte-Anordnung ist identisch mit v2**, und für Paketcode ändert sich ohnehin nichts, weil Pakete das Uniform nicht direkt benennen dürfen (der Engine-Header markiert es als engine-provided und read-only, „which packs can't name“); weiter über die Header-Funktionen `bloxdSeconds()` / `bloxdRenderOffset()` gehen.
- In Gruppe 3 des Pakets ist jetzt ein zweiter Platz dokumentiert: `@group(3) @binding(1)` ist die Szenentiefe-Textur, die `bloxdOpaqueBehind()` liest (vollständige Implementierung in §51). Das 64-Byte-Uniform bleibt bei Binding 0; Pakete können weiterhin keines der beiden Bindings benennen.

## 42. blockId wird blockFlags: Materialien pro Block als Bitflags (die Hauptänderung)

In allen drei Hook-Eingabestrukturen (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`) wird das v2-Feld `blockId: u32` **ersetzt** durch `blockFlags: u32`. Engine-Text zum Feld: *"What kind of block this face is: `bloxdBlockFlag*` bits, the same across the face."* Die Engine liefert jetzt die Materialdaten selbst, daher ist der v2-Weg, Materialien aus numerischen ID-Bereichen zu raten oder ID-Tabellen in der Welt zu pflegen ([Teil VIII](08-apiv2.md) §34), nicht mehr nötig.

Die Bits sind als benannte Konstanten exponiert:

```wgsl
// Einen Test mit (blockFlags & bloxdBlockFlagRock) != 0 ausführen.
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| Wert | Konstante | Bedeutung (Engine-Hinweise, verdichtet) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | Vollständig opak — Blätter und Eis eingeschlossen. Nicht Glas, Wasser, Lava, Spawner oder Geister- und unsichtbare Blöcke. |
| 2 | `bloxdBlockFlagEmissive` | Gibt Blocklicht ab, wie Neon, Portale, Lampen, Lava und Beacon. Leuchtende Erze zählen, egal wie schwach. |
| 4 | `bloxdBlockFlagVegetation` | Blätter und das Gras auf Grasblöcken (Grasblöcke tragen auch Dirt). Keine Kakteen, Pilzblöcke oder Heu. |
| 8 | `bloxdBlockFlagDirt` | Dirt und Erde, Grasblöcke eingeschlossen. Rocky Dirt ist ebenfalls Gestein. |
| 16 | `bloxdBlockFlagSand` | Sand, Red Sand und jeder Sandstein — der auch Gestein ist. |
| 32 | `bloxdBlockFlagRock` | Stein und seine Varianten, Andesit, Diorit, Granit, Kies, Erze, Sandstein, Rocky Dirt, Bedrock, Obsidian und Magma. |

Ein Block aus mehreren Materialien trägt **jedes** passende Flag (das Engine-Beispiel selbst: Sandstein ist Sand und Gestein, bekommt also beide). Blätter sind Vegetation, aber kein Dirt; Grasblöcke sind gleichzeitig Vegetation und Dirt.

Die Flags vegetation / dirt / sand / rock werden anhand des registrierten **Anzeigenamens** des Blocks vergeben (opaque / emissive stammen stattdessen aus den Opazitäts- und Emissionsdaten der Engine): Namen, die auf `Leaves` enden, sowie `Grass Block` sind Vegetation; Namen wie `Dirt` / `Soil` (und jeder `Grass Block`) sind Dirt; genau `Sand` und `Red Sand` sowie jeder Name, der `Sandstone` enthält, sind Sand; Namen mit `Stone` / `Andesite` / `Diorite` / `Granite`, jedes `Ore`, außerdem Yellowstone, Gravel, Bedrock, Obsidian, Magma, Rocky Dirt (und Sandstein) sind Gestein.

### Die exakten Namensregeln (die Flags jedes Blocks selbst ableiten)

Die vier Material-Bits stammen aus einem festen Klassifikator über den registrierten Anzeigenamen des Blocks. Varianten-Namen (alles nach `|`) werden zuerst entfernt, sodass Varianten die Flags des Basisblocks erben. Dann gilt:

| Bit | Regel (auf dem bereinigten Namen ausgewertet) |
|---|---|
| vegetation | der Name **endet auf** ` Leaves` oder **endet auf** ` Grass Block` |
| dirt | der Name **ist exakt** `Dirt`, **endet auf** ` Dirt` oder ` Soil`, oder **endet auf** ` Grass Block` |
| sand | der Name **ist exakt** `Sand` oder `Red Sand`, oder **enthält** `Sandstone` |
| rock | der Name **ist exakt** einer von `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt`, **enthält** `Sandstone`, **endet auf** ` Ore`, oder enthält `Stone` / `Andesite` / `Diorite` / `Granite` als eigenständiges Wort |

Yellowstone ist ausdrücklich aufgeführt, weil `Stone` in `Yellowstone` kein eigenständiges Wort ist. Opaque und Emissive kommen **nicht** aus dem Namen — sie stammen aus den Opazitäts- und Blocklicht-Emissionsdaten der Engine, lassen sich mit diesen Regeln also nicht ableiten.

Quelle: der Namensklassifikator der Engine (Modul 28537, Bundle `3ymzdd`); gegen alle 7.861 benannten Blöcke verifiziert, 2026-10-20.

Beispiel — Tönung pro Block nach Material:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

Wirkung auf v2-Rezepte: Das 22 Einträge umfassende Blatt-ID-Array von R-H ([Teil VIII](08-apiv2.md) §34) schrumpft auf `(blockFlags & bloxdBlockFlagVegetation) != 0`. Die Referenz zwischen Block-IDs und Blocknamen bei [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) bleibt für Nicht-Shader-Zwecke nützlich, muss für Material-Styling aber nicht mehr in der Welt nachgeschlagen werden.

### Blätter ohne das Gras (die Frage, die alle stellen)

`vegetation` allein trifft Blätter **und** das Gras auf Grasblöcken, die auch
`dirt` tragen. Dirt ausschließen, um nur Blätter zu bewegen — der Diskriminator,
den die Feldnotizen der Engine selbst ausbuchstabieren:

```wgsl
// Nur Blätter: Vegetation ohne Dirt. Grasblöcke sind Vegetation UND Dirt.
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// Nur Grasblöcke (die grasbewachsenen Flächen der Terrain-Oberfläche):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

Gegen die Live-Registry verifiziert (2026-10-20, Bundle `3ymzdd`):
`vegetation && !dirt` trifft exakt die 45 Blattregistrierungen (22 Basistypen —
dieselben 22, die das v2-R-H-ID-Array gemessen hat); `vegetation && dirt` trifft exakt
die 8 Grasblöcke. Keine Ausnahmen in beide Richtungen — Registry-Zahlen zum Stand jenes Builds; neue Blöcke erhöhen die Zahlen, ohne die Regel zu ändern. Mit `vertex.normal`
(oben/unten) kombinieren, um Flächen auszuwählen, z. B. nur Grasblock-Oberseiten.

## 43. Funktionsumbenennungen und semantische Änderungen

| v2 | v3 | Hinweise |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | Sekunden seit dem Laden der Seite (Hinweis zur f32-Präzision unten) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | Dieselbe Größe: Renderposition + dies = Weltposition |
| `const bloxdTimeWrap: f32 = 3600` | **entfernt** | Zeiträume selbst auf der Paketseite definieren |
| `engineColour` (in `BloxdLightIn`) | **entfernt** (14 → 13 Felder) | Aus `litColour` + Fog neu aufbauen |
| Hook-Parameter `v` / `s` / `l` | `vertex` / `surface` / `light` | Schreibweise im Template; Signaturen unverändert |

- **`bloxdSeconds()`** — Sekunden seit dem Laden der Seite. In f32 zählt es in Schritten von unter 1 ms für die ersten 4,5 Stunden und von etwa 4 ms zwischen 9 und 18 Stunden. Der Header empfiehlt das Idiom `bloxdSeconds() % period`, das von 0 bis `period` zählt und dann neu beginnt — ein sauberer Ersatz für die entfernte Wrap-Konstante.
- **`bloxdRenderOffset()`** — ganze Blöcke: „a render position plus this is a world position.“ Es ändert sich, während der Spieler reist, daher bleiben Renderpositionen nahe am Spieler — und damit präzise. In der gesamten Anleitung heißt die Größe, die der v2-Text noa-lokaler Offset nannte, jetzt einheitlich **Renderposition** / Render-Offset; es ist dieselbe Größe, die `bloxdOriginOffset()` zurückgab.
- **`bloxdTimeWrap` entfernt** — ein Paket, das die Zeit bei 3600 s umbrechen ließ, deklariert jetzt seine eigene Konstante, z. B. `const timeWrap: f32 = 3600.0;` und `% timeWrap`.
- **Semantik des Standardlichts** — der v2-Standard war `engineColour + emission × fogVisibility`; der v3-Standard setzt es als `bloxdApplyFog(litColour + emission, light)` zusammen — **Emission wird jetzt innerhalb des Standards durch Fog gedämpft**, sodass die kombinierte Ausgabe gemeinsam durch den Fog-Blend geht. Portierungstabelle:

  | v2-Ausdruck | v3-Portierung |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // v3-Portierung des v2-Lesezugriffs `l.engineColour + s.emission * l.fogVisibility`:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **In Name und Bedeutung unverändert**: `bloxdEyePosition()`, `bloxdSunDirection()`, `bloxdFaceBlock()`, `bloxdApplyFog()`, `bloxdWorldPosition()`.

## 44. Neue Header-Konstanten: `bloxdPi` und `bloxdTau`

```wgsl
// Eine halbe Umdrehung und eine volle Umdrehung, in Radiant.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

Nützlich sowohl für trigonometrische Tricks als auch weil Pakete π nicht mehr hartcodieren müssen. Auf Namenskollisionen achten: Eine paketlokale Konstante gleichen Namens kollidiert jetzt mit der Prüfung des Headers auf doppelte Bezeichner — jede Neudeklaration von `bloxdPi` / `bloxdTau` im eigenen Code entfernen oder umbenennen.

## 45. Das Sechs-Hook-Template (Flüssigkeits-Hooks offiziell gezeigt)

Der mit dem Build veröffentlichte Standard-Pakettext enthält jetzt **alle sechs Hooks** — Terrain / Flüssigkeit × Vertex / Surface / Light —, jeder gibt seinen Engine-Standard zurück. Die Engine-Kommentare führen es so ein: *"Every hook returns its engine default. Copy a hook and change its output to start a shader pack."*

```wgsl
// Jeder Hook gibt seinen Engine-Standard zurück. Kopiere einen Hook und ändere
// seine Ausgabe, um ein Shader-Paket zu beginnen.

// Strict-Spiele lassen Terrain, wo es ist: Ohne Guard würde dieser Hook
// das ganze Shader-Paket dort abschalten.
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Wasser nutzt diese. Wenn gelöscht, nutzt Wasser stattdessen deine Terrain-Hooks.
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

- Die Kommentare der Hooks nennen die Flüssigkeitsregeln direkt: **Wasser braucht das Trio; löschst du es, verwendet Wasser wieder deine Terrain-Hooks** (das aus v2 bekannte Fallback-Verhalten, [Teil VIII](08-apiv2.md) §36, jetzt im Template selbst festgeschrieben).
- `bloxdLiquidVertex` liegt im selben `#ifndef BLOXD_STRICT`-Guard wie `bloxdTerrainVertex` — ohne Guard würde es das ganze Paket in Strict-Spielen abschalten, genau wie Vertex-Effekte auf der Terrain-Seite.
- Die Template-Schreibweisen sind jetzt die vollen Parameternamen `vertex` / `surface` / `light` (das v2-Template nutzte die kurzen `v` / `s` / `l`). Die Parameternamen im eigenen Code sind frei — nur die Signaturen zählen.

## 46. Variantenmatrix: die Programm-Achse und Makro-Änderungen

Varianten werden über eine Matrix aus **strict × lighting × program** erzeugt — dieselben 8 Kombinationen wie in v2, aber Terrain / Flüssigkeit ist jetzt eine explizite Achse der Matrix. Die Variantennamen schreiben das als `allow|strict · unlit|lit · terrain|liquid` aus und erscheinen in der UI als ``terrain`` / `liquid`, `strict` / `non-strict`, `lighting on` / `lighting off` (Fehleranzeigen können „(only in {{variants}})“ anhängen).

| Makro | Definiert in |
|---|---|
| `BLOXD_STRICT` | Strict-Varianten (beide Programme) |
| `BLOXD_LIGHTING` | Varianten mit Lighting an (beide Programme) |
| `BLOXD_ALPHA` | **alle Flüssigkeitsvarianten** plus Nicht-Strict-**Terrain**-Varianten |
| `BLOXD_SCENE_DEPTH` | **alle Flüssigkeitsvarianten** |

Zwei Dinge ändern sich für Autoren gegenüber den v2-Regeln ([Teil VIII](08-apiv2.md) §36):

- **`BLOXD_ALPHA` ist gegenüber v2 unverändert.** Der Variantengenerator enthält die Literalzeile `"liquid"!==program&&strict||push("BLOXD_ALPHA")` — die JS-Operatorpriorität macht *(Terrain **und** strict)* zum einzigen Fall, der den push überspringt, sodass das Makro in **jeder Flüssigkeitsvariante (strict oder nicht strict) und in Nicht-Strict-Terrain** definiert ist; nur Strict-Terrain lässt es weg. Flüssigkeitsseitiger `#ifdef BLOXD_ALPHA`-Code wird genau wie immer hineinkompiliert, und das Alpha-Zurückschreiben aus §49 (eingefügt für Flüssigkeitsprogramme oder Nicht-Strict-Varianten) deckt sich exakt mit dieser Menge.
- **`BLOXD_SCENE_DEPTH` ist in Flüssigkeitsvarianten immer definiert**, daher bleibt die Tiefennutzung dort ohne Guard in Ordnung, genau wie in v2 (§35); in Terrain-Hooks braucht sie weiterhin den `#ifdef BLOXD_SCENE_DEPTH`-Wrap.

## 47. v2 → v3-Migrationscheckliste

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** in allen drei Eingabestrukturen; Material-Styling als Bittests gegen `bloxdBlockFlag*`-Konstanten ausdrücken (§42); ID-Bereichs-Heuristiken aus v2 entfernen
3. **`bloxdTime()` → `bloxdSeconds()`**; eigenen Zeitraum statt des entfernten `bloxdTimeWrap` deklarieren (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **Lichtmathematik von `engineColour` auf `litColour` + Fog umbauen** gemäß der Tabelle in §43; beachten, dass der Standard Emission jetzt durch Fog dämpft
6. **Flüssigkeits-Hooks**: `bloxdLiquid*` explizit definieren, wenn Wasser anders behandelt werden soll; weglassen, um auf die Terrain-Hooks zurückzufallen
7. **Keine `BLOXD_ALPHA`-Prüfung nötig** — die Variantenmenge ist gegenüber v2 unverändert: alle Flüssigkeitsvarianten plus Nicht-Strict-Terrain definieren es, nur Strict-Terrain lässt es weg (§46)
8. **`bloxdPi` / `bloxdTau` verwenden**, wo trigonometrienahe Konstanten hartcodiert waren; paketlokale Neudeklarationen entfernen, die jetzt den Header duplizieren
9. **Strict-Guards behalten**: Vertex-Hooks und `discard` bleiben in `#ifndef BLOXD_STRICT` gewrappt; das Template schützt `bloxdLiquidVertex` genauso wie Terrain
10. **Im Spiel validieren** — das Paket in einem Spiel kompilieren und testen, das Shader-Pakete unterstützt

## 48. Weitere v3-Änderungen und Hinweise

- **Die Validierung bleibt zweistufig** ([Teil VIII](08-apiv2.md) §38): zuerst statische Validierung, dann die echte WebGPU-Kompilierung des Browsers über generierte Stub-Schnipsel, die deine Hooks aufrufen, mit Fehlern, die auf Quelldateien / -zeilen zurückgeführt werden, und Diagnosen, die die ursprünglichen Namen engine-seitiger Bezeichner über ein Mapping wiederherstellen.
- **Strict-Diagnosen nennen den Grund**: Ein Vertex-Hook, der Terrain verschiebt, meldet „… moves terrain, which strict games prevent.“, und `discard` in Surface-/Light-Hooks meldet „discard makes terrain see-through, which strict games prevent.“; die Einstellungsoberfläche behält den Hinweis „wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`.“ (`offInStrict`).
- **Loader-Meldungen**: Fehlerarten und Limits sind unverändert; "Zip64 archives aren't supported." wird als UI-Meldung angezeigt (`loadZip64`). Das Inventar der Paket-UI-Strings umfasst 57 `shaderPack:*`-Keys; unter den Ladephase-Fehlern vervollständigen `loadNoWgsl` (ein Zip mit null `.wgsl`-Dateien) und `loadNotZip` (eine Datei ohne Zip-End-of-Archive-Signatur) die Menge.
- **Mit der Paket-UI wird kein WGSL-Editor im Spiel ausgeliefert.** Der Einstellungsbildschirm bietet keinen Shader-Code-Editor — Pakete werden außerhalb des Spiels als Zip-Dateien erstellt. (Ein CodeMirror-Editor existiert zwar im Bundle, ist aber der JavaScript-Editor der Custom-Game-Scripting-UI; er hat keine WGSL-Unterstützung und keine Verbindung zum Paketsystem.)
- **Hardware-Gate**: Lite benötigt einen Treiber, der das WebGPU-Feature `shader-f16` unterstützt; zu alte Treiber werden mit einer Meldung wie "Intel driver too old for Lite (no shader-f16)" abgelehnt.
- **Lichtänderungen validieren gespeicherte Pakete neu**: Wenn die Lighting-Einstellung zur Laufzeit geändert wird, führt die Engine die Paketprüfung erneut aus (`changed → recheck`); die Replay-Ansicht ruft denselben Hook mit `changed: false` auf und überspringt die erneute Prüfung.
- **Formulierung**: Text über Spiele, die Shader-Pakete akzeptieren, lautet jetzt „in games that **support** them“.
- **Geltungsbereich der Titel**: Die Menge der Spiele, in denen Pakete laufen, ist gegenüber dem vorherigen Build unverändert.

## 49. Engine-Interna: wie der Lite-Renderer deine Hooks aufruft

Alles in §40–§48 ist das, was Loader und Header dir sagen. Dieser Abschnitt und die folgenden dokumentieren, was die Engine zur Laufzeit tatsächlich tut, restauriert aus dem Produktions-Bundle (dem Lite-Renderer — ein 175-KB-Chunk; der echte Name der Integrationsquelldatei `lite/terrainShaderPack.ts` überlebt in ihren Fehlermeldungen). Nichts davon ändert, was du schreibst, aber es beseitigt das Rätselraten darüber, was deine Hooks erhalten — und beantwortet mehrere Fragen, die andere Community-Anleitungen noch als offen führen.

Der Renderer „ruft“ deine Hooks nicht aus JavaScript auf. Wenn ein Paket die Validierung besteht, **fügt die Engine deine Hook-Aufrufe in ihr eigenes Terrain-WGSL ein**, indem sie feste Ankerzeilen im Shader-Text ersetzt. Ein Anker muss genau einmal passen — null oder mehrere Treffer brechen ab mit `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Stufe | Ankerzeile im Engine-Shader | Was eingefügt wird |
|---|---|---|
| vertex | ein vierzeiliger Block von `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` bis `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);` | `BloxdVertexIn` bauen, deinen Vertex-Hook aufrufen, `worldPos` zurückschreiben — das Einfügen schreibt außerdem `let worldPos` in `var worldPos` um |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | `BloxdSurfaceIn` bauen, deinen Surface-Hook aufrufen, `baseColor` / `alpha` zurückschreiben |
| lit colour | kurz vor `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` | `let bloxdSpLitColour = color.rgb;` — fängt die Farbe vor dem Fog ein |
| light | der abschließende `return color;` des Fragment-Shaders | `BloxdLightIn` bauen, deinen Light-Hook aufrufen, `color` zurückschreiben — nach dem Fog-Mix |

Der eingefügte Code, restauriert aus dem ausgelieferten Bundle (Ausdrücke für Lichtlevel-Proben gekürzt, wo die Engine-Formatierung lang läuft):

```wgsl
// Vertex-Stufe — Nicht-Strict-Varianten mit Vertex-Hook
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* dein bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// Fragment-Stufe — Surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* dein Surface-Hook */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // nur eingefügt, wenn das Programm Flüssigkeit oder die Variante nicht strict ist
```

```wgsl
// Fragment-Stufe — Light
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // directional
        ambient,                                 // ambient
        /* Lichtlevel-Varying */.rgb,            // blockLight
        /* Himmelskanal desselben Varyings */,   // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* Term des gehaltenen Lichts (siehe unten) */, // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour — nur ohne jeglichen Fog schwarz
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* dein Light-Hook */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

Vier Fakten zur Durchsetzung ergeben sich direkt aus diesem Einfügen:

- **Strict-Terrain ignoriert Alpha-Änderungen des Surface-Hooks.** Das Zurückschreiben von `alpha = bloxdSpSurface.alpha` wird nur für Flüssigkeitsprogramme oder Nicht-Strict-Varianten eingefügt — die Implementierung hinter der Makrotabelle aus §46. (In Strict-Terrain wird dein `#ifdef BLOXD_ALPHA`-Code ohnehin nicht hineinkompiliert; jetzt ist außerdem bestätigt, dass ungeschützte Alpha-Schreibzugriffe dort verworfen werden.)
- **Eine Strict-Variante, die trotzdem einen Vertex-Hook deklariert, führt ihn nie aus** — die Engine meldet das zur Build-Zeit: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. Deshalb umschließt das offizielle Template (§45) `bloxdLiquidVertex` mit demselben `#ifndef BLOXD_STRICT` wie sein Terrain-Gegenstück.
- Die `bloxdSp*`-Bezeichner — **14 insgesamt**: `bloxdSpVertexIn`, `bloxdSpVertex`, `bloxdSpSurfaceIn`, `bloxdSpSurface`, `bloxdSpLightIn`, `bloxdSpLight`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, `bloxdSpPositionW`, `bloxdSpZ`, `bloxdSpEye`, `bloxdSpScale`, `bloxdSpBehind` — sind engine-seitige Temporaries. Dein Code sieht sie nie, aber sie tauchen in Diagnosen und in jeder Reverse-Engineering-Ausgabe auf, daher lohnt es sich, sie auf Anhieb zu erkennen.
- **Die Abkürzung für die Standard-Surface.** Wenn der Surface-Hook einer Variante buchstäblich `bloxdDefaultSurface` ist, überspringt die Engine das Einfügen der Zurückschreibzeilen für `baseColor` / `alpha` vollständig — der Standard erzeugt diese Werte bereits, die Zuweisung wäre also toter Code. Unveränderte Hook-Ketten kosten nichts.

**Was `BloxdLightIn` tatsächlich speist** — Feld für Feld, aus dem eingefügten Code:

| Feld | Engine-seitige Quelle |
|---|---|
| `litColour` | die Fragmentfarbe, die kurz vor dem Fog-Mix eingefangen wird (der Anker `bloxdSpLitColour`) — „before emission and fog“, wie der Header es formuliert |
| `directional` | `vTerrainLambert` — eine vertex-interpolierte Summe von `max(0, dot(normal, lightDirection)) × intensity` über die Richtlichter der Szene (Formel in §54); 0, wenn die Szene keine hat |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — pro Material, pro Frame |
| `blockLight` | das `.rgb` des dekodierten Lichtlevel-Varyings (Dekodierung in §54) |
| `skyLight` | der Himmelskanal desselben Lichtlevel-Varyings — *"Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING"* (Header-Text) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | der Term des gehaltenen Lichts, gebaut aus dem w-Kanal des Lichtlevel-Varyings zusammen mit den Frame-Uniforms `uHeldLightPos` / `uHeldLightColour` ([Teil VII](07-internals.md) §26 dokumentiert Abfall und Kanal-Floor-Verhalten) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **nur in einer Szene ganz ohne Fog schwarz** (Modus 0, §50) |
| `fogVisibility` | der geclampte Fog-Koeffizient — exakt der Wert, den die Funktion aus §50 zurückgibt |
| `position` / `normal` | die Varyings `vPositionW` / `vNormalW` (Normale pro Fragment renormalisiert) |
| `blockFlags` | das flache Varying `vBlockFlags` — vollständiger Übertragungsweg in §52 |

Zur Orientierung beim Lesen älteren Materials: Die identische Einfügearchitektur existierte im v2-Renderer, und die einzigen Integrationsunterschiede von v3 sind `vBlockId` → `vBlockFlags` und die hinzugekommenen Flüssigkeitsvarianten. Das Hook-System ist über den Bruch v2 → v3 hinweg architektonisch stabil.

## 50. Die Fog-Funktion: vier Modi, ein Feld

Wortgetreu aus dem Produktions-Terrain-Shader restauriert:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // linear
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // exponentiell
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // exponentiell zum Quadrat
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = Fog aus (Koeffizient bleibt 1.0)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)` — ein einziges vec4 steuert alles.
- **Im Shader existieren vier Modi: 0 = aus, 1 = exponentiell, 2 = exponentiell zum Quadrat, 3 = linear.** `fogVisibility` ist der geclampte Koeffizient, welcher Modus auch läuft — es gibt genau ein Feld, und kein Modus-Flag wird jemals an Pakete exponiert.
- Bloxds eigene Titel fahren Modus 3 (linear) mit dem 32-Block-Band aus [Teil VII](07-internals.md) §25 (`fogStart = 32 × D`, `fogEnd = 32 × (D + 1)`), daher beschreibt die Beobachtung „immer linear“ aus jenem Teil weiterhin das ausgelieferte Spielgeschehen. Die exponentiellen Modi sind jedoch echter, aktiver Engine-Code — ein Titel kann `vFogInfos.x` umschalten und die Rampe ohne jegliches Client-Update ändern. Distanzrezepte, die `distance(l.position, bloxdEyePosition())` selbst berechnen (Rezept R-B), sind der robuste Weg für distanzgetriebene Looks, da sie durch einen Moduswechsel nicht verschoben werden können.
- Damit ist die Frage „welche Fog-Rampe die Engine tatsächlich verwendet“ aus dem Quellcode geklärt: Alle vier sind implementiert; ausgelieferte Titel nutzen linear. (Dieselbe Funktion erklärt auch den fogColour-Kommentar des Headers — Modus 0 ist der einzige Fall, in dem `fogColour` schwarz ankommt, und Bloxds Spiele liefern nie Modus 0 aus; sie schieben den Fog stattdessen weit nach außen, [Teil VII](07-internals.md) §25.)

## 51. bloxdOpaqueBehind(): die exakte Implementierung

Die vollständige Funktion, wortgetreu aus dem Produktions-Build restauriert:

```wgsl
@group(3) @binding(1) var bloxdSpSceneDepth: texture_2d<f32>;
var<private> bloxdSpPixel: vec2i;
var<private> bloxdSpPositionW: vec3f;

fn bloxdOpaqueBehind() -> BloxdOpaqueBehind {
    let bloxdSpZ = textureLoad(bloxdSpSceneDepth, bloxdSpPixel, 0).r;
    if (bloxdSpZ <= 0.0) {
        return BloxdOpaqueBehind(false, vec3f(0.0), 0.0);
    }
    let bloxdSpEye = bloxdPackInputs.eyePosition;
    let bloxdSpScale = max(bloxdSpZ / (scene.view * vec4f(bloxdSpPositionW, 1.0)).z, 1.0);
    let bloxdSpBehind = bloxdSpEye + (bloxdSpPositionW - bloxdSpEye) * bloxdSpScale;
    return BloxdOpaqueBehind(true, bloxdSpBehind, distance(bloxdSpBehind, bloxdSpEye));
}
```

- **Die Tiefentextur liegt bei `@group(3) @binding(1)`** — Gruppe 3 ist die eigene Gruppe des Pakets: Binding 0 ist das 64-Byte-Uniform `bloxdPackInputs` (§41), Binding 1 ist diese Tiefentextur. Beide werden von der Engine bereitgestellt und können von deiner Seite nicht benannt werden.
- **Die Tiefentextur ist eine unfilterable-float-Ressource nur für Fragments.** Das Bind-Group-Layout registriert sie als `texture: { sampleType: "unfilterable-float" }` allein mit `GPUShaderStage.FRAGMENT`-Sichtbarkeit — genau deshalb baut `bloxdOpaqueBehind()` auf `textureLoad` (explizite Texel-Koordinaten, Mip-Level 0) statt auf `textureSample`: Hardware-Filterung ist bei dieser Textur schlicht nicht verfügbar.
- `z ≤ 0` bedeutet, dass die Tiefenprobe nichts getroffen hat (ferne Ebene / Himmel): `found = false`, und `position` / `distance` sind bedeutungslos — prüfe immer zuerst `found`.
- Die zurückgegebene Position ist ein **skalierter Strahlschnittpunkt**: Die opake Oberfläche wird bei `eye + (fragment − eye) × max(z / viewDepth, 1)` platziert. `distance` wird vom Auge zu diesem Punkt gemessen — für Wasseroberflächen-Pakete ist das effektiv „wie viel Wasser der Strahl durchquert hat, bevor er auf etwas Festes traf“, was tiefengetönte Wasserrezepte ohne zweiten Tiefenpuffer möglich macht.

## 52. blockFlags von Ende zu Ende: von der Registrierung bis zu deinem Hook

§42 erklärt, was die Bits bedeuten. Dieser Abschnitt ist der vollständige Weg, den ein Flag-Bit von der Blockregistrierung bis zu deinem Hook zurücklegt — jede Station aus der Produktionsquelle bestätigt, was zugleich die Aussage „the same across the face“ des Headers bis auf Byte-Ebene belegt.

**1. Registrierung (Blockdefinitions-Datenbank).** Die Flags jedes Blocks werden einmal bei der Registrierung berechnet:

```js
flags[id] = nameFlags                     // Regeln für Anzeigenamen (§42): Vegetation / Dirt / Sand / Gestein
          | (definition.opaque === true ? 1 : 0)   // Opak-Bit — Opazitätsdaten der Engine
          | (anyFaceEmission >= 1       ? 2 : 0);  // Emissions-Bit — Blocklicht-Emissionsdaten
```

Die Anzeigenamen-Regeln decken nur die vier Material-Bits ab; die beiden physikalischen Bits stammen aus separaten Engine-Daten — `opaque` direkt aus der Blockdefinition, `emissive` aus dem Emissionsarray für Blocklicht pro Fläche. Das „Glowing ores count, however faint“ des Headers ist wörtlich gemeint: Jede Fläche mit Emission ≥ 1 setzt das Bit.

**2. Pro Block → pro Material (Initialisierung des Meshers).** Terrain wird pro *Material* gezeichnet, nicht pro Block-ID, daher werden die Flags in eine Materialtabelle umtabelliert (ein `Uint16Array`, indexiert nach Material-ID; jedes Material übernimmt die Flags der ersten Fläche seines Besitzerblocks). Die Tabelle geht an den Meshing-Web-Worker — aber **nur in Konfigurationen, in denen die Paket-Pipeline aktiviert ist**; andernfalls ist die Tabelle `null` und es werden nie Flag-Bytes geschrieben. Spieler ohne Pakete zahlen konstruktionsbedingt null Overhead.

**3. In die Vertex-Bytes (Mesher-Worker).** Die Flags reiten in zwei freien Bytes der vorhandenen verschachtelten Vertex-Daten:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // niedrige 8 Bits → Alpha-Byte des Farbattributs
        buffer[o + normalOffset + 3] = flags >> 8;    // hohe 8 Bits → w-Byte des Normalenattributs
    }
}
```

Alle vier Vertices einer Fläche erhalten denselben Wert — die Bedeutung von „the same across the face“ auf Implementierungsebene.

**4. Dekodierung auf der GPU (Lite-Terrain-Shader).** Die zwei Bytes reisen als Vertex-Attribut `blockFlagWords: vec2u` (Location 7, nur vorhanden, wenn die Paket-Pipeline an ist) und werden in der Vertex-Stufe wieder zusammengesetzt:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags` ist als `@interpolate(flat)` deklariert — pro Fläche konstant bis in die Fragment-Stufe, weshalb die Bittests aus §42 innerhalb einer Fläche stabil sind und nie einen Blend mitten in einer Fläche erzeugen können.

- Die Pipeline reserviert **16 Bits** Kapazität (diese Dekodierung setzt zwei volle Bytes zusammen), während v3 nur 6 definiert — künftige Flags können ohne weitere Vertex-Format-Änderung oder API-Sprung erscheinen.
- Im Packed-Vertex-Modus reisen dieselben zwei Bytes in `packed.y` und dem oberen Byte des Farbworts statt in einem dedizierten Attribut — gleiche Werte, anderer Container.
- Zur Blätter-gegen-Gras-Frage, zu der diese Flags am häufigsten befragt werden, siehe [Blätter ohne das Gras](#blätter-ohne-das-gras-die-frage-die-alle-stellen) unter §42.

## 53. Interna der Validierung: HEADER_VERSION, Signaturen, reservierte Namen

**Der gemessene Header-Hash.** Jede Paketvalidierung wird mit dem `HEADER_VERSION` der Engine gestempelt. Das Produktions-Validierungsmodul direkt auszuführen (siehe Harness-Hinweis am Ende von §54) misst ihn:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← aus dem Live-Produktions-Bundle gemessen
```

Es ist ein FNV-1a-32-Hash (Präfix `6.`) über fünf Eingaben: den Engine-Header, vorverarbeitet und **pro Variante** tokenisiert (ein Eintrag für jede der 8 Varianten), das vollständige lexikalische WGSL-Universum des Parsers, die vier Makronamen, die Tabelle der Spezialfunktionen und die Deklaration `BloxdPackInputs` zusammen mit ihrer Uniform-Zeile `@group(3) @binding(0)`. Zwei Konsequenzen für Autoren:

- **Jede Header-Änderung auf Engine-Seite berechnet ihn neu** — das ist der Mechanismus hinter dem automatischen „muss erneut geprüft werden“, das gespeicherte Pakete nach Engine-Updates erhalten ([Teil VIII](08-apiv2.md) §31).
- Der Hash deckt den *Engine-Header* ab, nicht deinen Code. Ein Paket, das nach einem Engine-Update weiter lädt, ist nicht „noch gültig“ — es hat nur noch keine Header-Änderung ausgelöst. Die einzige Versionsprüfung, an der dein Manifest teilnimmt, ist das `apiVersion`-Gate (§40).

**Hook-Signaturprüfung: token-genau bei Typen, frei bei Namen.** Der Validator hält eine Signatur pro Hook-Slot:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

Der Abgleich erfolgt **Token für Token**: Parametertypnamen müssen exakt passen, `->` und der Rückgabetyp müssen exakt passen, und Parameteranzahl sowie Kommaplatzierung werden geprüft. Parameter*namen* sind frei — jeder Bezeichner an der Parameterposition wird akzeptiert, weshalb dein `fn bloxdTerrainLight(s, l)` kompiliert, obwohl das Template `(surface, light)` schreibt. Der Light-Hook nimmt genau zwei Parameter.

**Reservierte Namen.** Die Regel ist eine einzige Regex: `/^bloxd/i`. Jeder Bezeichner, der mit `bloxd` beginnt, ist reserviert — alles `bloxd*` wird von der Engine bereitgestellt, und ein Paket kann nicht in diesen Namensraum deklarieren (deshalb kollidieren auch die `bloxdPi` / `bloxdTau`-Neudeklarationen aus §44).

**Spezialfunktionen.** Genau eine ist in v3 registriert:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

„Spezial“ bedeutet *an ein Makro gebunden* — eine Engine-Funktion, deren Verfügbarkeit von einem Variantensymbol abhängt. Zwei Guard-Diagnosen erzwingen den korrekten Einsatz:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — ein Vertex-Hook erreicht eine Funktion, die nur Surface- und Light-Hooks nutzen können.
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — zum Beispiel terrain-seitiges `bloxdOpaqueBehind()` ohne `#ifdef BLOXD_SCENE_DEPTH`-Wrap.

**Der Engine-Header (Präludium), festgeschrieben.** Der v3-Header ist eine 5.637-Byte-Zeichenkette, die mit `// Engine-provided and read-only, prepended to all packs. apiVersion 3.` beginnt. Er trägt `#if` / `#ifdef`-Direktiven, die der WGSL-Präprozessor der Engine selbst pro Variante auswertet — die Engine führt tatsächlich die Auswertung von `#if`-Ausdrücken aus, und ein fehlerhafter Ausdruck endet mit `Cannot evaluate #if ...`. Jede Struktur, jede Funktionssignatur und jeder zitierte Kommentar in dieser Anleitung stammt aus diesem gerenderten Text, daher können Anleitung und ausgelieferter Header nicht auseinanderlaufen.

**Parser-Hinweise für Autoren.**

- Paketseitige Funktionen werden beim Verschmelzen in den Engine-Shader mit dem Präfix `pack_` umbenannt (Kollisionsvermeidung); Diagnosen führen sie auf deine ursprünglichen Namen zurück — derselbe Mechanismus, den [Teil VIII](08-apiv2.md) §38 für die zweite Validierungsstufe beschreibt.
- Die Meldung für nicht deklarierte Bezeichner lautet `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`; `_ can only be the target of a phony assignment, as in _ = f();` und `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.` vervollständigen die neu bestätigte Menge.
- Das lexikalische Universum des Parsers enthält Bezeichner, die **kein Standard-WGSL** sind: `bufferView`, `bufferArrayView`, `bufferLength`, `atomicStoreMax`, `atomicStoreMin`. Die Engine kennt sie als Built-ins, aber ob die WGSL-Implementierung eines bestimmten Browsers sie bereitstellt, ist nicht garantiert — baue niemals ein Vertriebspaket darauf auf.

## 54. Bestätigte Konstanten, Limits und Layouts

Das vollständige Ressourcenlayout des Terrain-Programms, direkt aus dem Produktions-Lite-Renderer:

| Binding | Inhalt |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms` — `viewProjection` mat4x4f, `view` mat4x4f, `vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`, `uSkyLightColour`, `uAmbientLightColour`, **`vFogInfos`**, `vFogColor`, `outputHeight`, `sceneAmbient`, **`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: Storage `array<vec4f>` — xyz = Übersetzung in den Render-Frame, w = Sichtbarkeit beim Einblenden |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`, `ambientAndCutoff`, `emissiveAndLevel`, `anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — das Paket-Uniform (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — die Tiefentextur (§51) |

- **Richtlichter sind hart auf vier begrenzt.** Der Renderer bricht mit `Terrain supports 4 directional lights, not ${n}` ab, wenn eine Szene mehr registrieren will. `l.directional` ist die summierte Lambert-Beleuchtung über alle vorhandenen (0–4; Bloxds eigene Szenen nutzen 2 — [Teil VII](07-internals.md) §27). Terrain warnt außerdem über Lichter, die es nicht berücksichtigen kann, wortlautgetreu: ein nachträglich hinzugefügtes Licht — `Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`; ein getöntes — `Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`; und ein mesh-filterndes — `Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **Benennung des Terrain-Programms**: Pipeline-Cache-Keys lauten `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}` — ein Paket erscheint als Suffix `-sp{variant}`, ein Programm pro Variante aus §46. Ein Watcher (`watchPipelineFailures`) gleicht Live-Pipeline-Namen gegen `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/` ab und prüft die passende Paketvariante erneut, wenn eine Pipeline-Kompilierung fehlschlägt; bei GPU-Device-Verlust (`device.lost`) wird die Prüfung übersprungen.
- **`BLOXD_TERRAIN_DIRECTIONAL` ist ein engine-internes Makro** (definiert, wenn dirLightCount > 0). Es ist *nicht* eines der vier aus dem Präludium und erreicht nie Paketcode — aber es erscheint in WGSL-Dumps der Engine-eigenen Shader, daher spart das Erkennen Verwirrung.
- **Dekodierung des Lichtlevels**: Das Vertex-Attribut `aPackedLightLevels` ist ein f32, das vier Nibbles packt, jeweils durch 15 geteilt: rgb = das farbige Blocklicht, a = der Himmel-/Handlicht-Kanal. Die Vertex-Stufe dekodiert es in das Varying `vLightLevels`; `blockLight` liest `.rgb`, der Himmel-/Handlicht-Kanal liest `.w`. Die Engine legt die rgb-Kanäle vor der Interpolation auf mindestens 35 % des hellsten Kanals — der engine-seitige Anker des Lifts, den [Teil VII](07-internals.md) §26 aus dem Gameplay dokumentiert.
- **`vTerrainLambert`** (die Quelle von `directional`, §49) wird als Summe über die aktiven Richtlichter erzeugt: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, geschützt durch `BLOXD_TERRAIN_DIRECTIONAL`.
- **Indexpuffer werden beim ersten großen Mesh 32 Bit breit.** Der Lite-Renderer wählt `Uint16Array`-Indizes nur, solange jeder Indexwert ≤ 65.534 bleibt — sobald ein Index 65.535 erreicht, wird der Puffer ein `Uint32Array` (pro Puffer über ein `is32Bits`-Flag verfolgt). Praktisch: Ein Chunk-Mesh mit höchstens 65.535 Vertices passt in 16-Bit-Indizes; eines mit genau 65.536 Vertices erzeugt zwangsläufig einen Index von 65.535 und schaltet den ganzen Puffer auf 32 Bit.
- **Details des Manifest-Ladens**: Zip-Einträge unter `__MACOSX/`, Dateien mit Präfix `._` und `.DS_Store` werden herausgefiltert (macOS-Archivrauschen); `pack.json` wird per kleingeschriebenem Pfadvergleich gefunden — null Treffer → `loadNoManifest`, zwei oder mehr → `loadDuplicateManifest`; das Lesen des Manifests ist auf 65.536 Bytes begrenzt.
- **Wie all das verifiziert wurde**: Die Module des Produktions-Bundles wurden restauriert (165 Chunks; die webpack-Registry zählt in diesem Bundle 4.951 Module — die Modulzahl verschiebt sich um einige, je nachdem ob asynchrone Kind-Abhängigkeiten mitgezählt werden, daher die exakte Zahl als bundle-spezifisch behandeln) und in einem webpack-kompatiblen Harness unter Node.js ausgeführt. Der gemessene `HEADER_VERSION` (§53), der gerenderte 5.637-Byte-Header, die kanonische Reihenfolge der Variantentabelle und die Tabelle der Spezialfunktionen stammen alle aus *der Ausführung des ausgelieferten Codes*, nicht aus dem Lesen von Zeichenketten. Derselbe Harness ist der natürliche Kern für ein Community-`pack_check` v6 — den Validator der Engine selbst gegen ein Paket auszuführen reproduziert exakt seine Ergebnisse.

---

Recherchiert von ltf_ahel (recherchiert mit glm)

[← Vorheriger Teil](08-apiv2.md)·[Zurück zum Handbuch](README.md)

