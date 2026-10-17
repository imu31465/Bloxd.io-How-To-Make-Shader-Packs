[← Vorheriger Teil](1-making.md)·[Zurück zum Handbuch](README.md)·[Nächster Teil →](3-recipes.md)

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
- `bloxdSunDirection()` ist nur ein Einheitsvektor, solange eine Sonne existiert; null, wenn der Himmel keine Sonne hat. **Der Mond ist immer `-bloxdSunDirection()`** (die Engine berechnet die Mondposition als exaktes Gegenteil der Sonne). In Standardwelten ist die Sonne aber statisch, der Mond also auch — ein bewegter Mond zählt nur in Welten mit Tag/Nacht-Zyklus (siehe [Teil VII](7-internals.md), Abschnitt 24)
- ※Hinweis: früher als „bei null nicht als Mondrichtung wiederverwendbar" formuliert. Die Richtung selbst ist via `-bloxdSunDirection()` verfügbar, aber Vertriebspakete sollten mit `sunPresent` auf Null-Prämisse verzweigen (zum blauen Umgebungs-Pseudo-Look siehe R2, zum gerichteten Mondlicht [Teil VII](7-internals.md) R-A)
- `emission` wird nach der Lichtberechnung addiert, gedämpft mit **`fogVisibility`** (die defaultLight-Implementierung `engineColour + emission × fogVisibility`. Emission verschwindet auch in völlig vernebelter Ferne)
- **Fog-Anwendungsreihenfolge**: Fragment-Verarbeitung läuft ① Licht/Emissions-Komposition → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ Light-Hook-Aufruf → ⑤ return. **engineColour kommt also gefoggt an**, und **der Light-Hook-Rückgabewert wird unverändert zur Endfarbe** (nach dem Hook wird kein Fog neu angewandt)
- **fogVisibility-Herkunft**: View-Space-Distanz (pro Vertex berechnet, interpoliert). Im Linear-Modus `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **Bei fogMode == 0**: `fogColour` kommt als `vec3f(0.0)` (schwarz) an. Code, der Tageszeiten aus fogColour-Tönung schätzt, sei vorsichtig
- **Echte Fog-Einstellungen aktueller Builds**: **linear fixiert**. `fogStart` = Chunk-Sichtweite, `fogEnd` = +1 Chunk (nur Horizont). Bei Fog-aus auf 100 / 101 Chunks gesetzt, faktisch deaktiviert. Standard-Fog-Farbe RGB(183, 191, 195)
- Das Uniform `bloxdPackInputs` (`@group(3) @binding(0)`, 64 B) **nur über Header-Funktionen nutzen**. Nie direkt aus Paketen referenzieren. Da die Stage-Sichtbarkeit VERTEX|FRAGMENT ist, sind Header-Funktionen auch aus Modul-Scope-Funktionen außerhalb von Hooks und aus Vertex-Hooks aufrufbar. Da die Tiefentextur (Binding 1) FRAGMENT-exklusiv ist, ist `bloxdOpaqueBehind()` auf Surface-/Light-Hooks beschränkt
- **`skyLight` / `blockLight` / `heldLight` kommen nach einer „Lift-Kurve" an**. Das `tone-mapped` in den Header-Kommentaren meint dies: Die Engine wendet immer `y = 1-(1-x/(3-2x))³` (eine dunkle Bereiche anhebende S-Kurve) auf Fragmente an, bevor sie Pakete erreichen. Keine rohen Voxel-Werte (n/15); z. B. kommt unter einem Baum (roh 0,87) angehoben als **0,97** an
- `skyLight` ist im Kern Voxel-Verdeckungsdaten für „ist von hier Himmel sichtbar" (= eine Schattenkarte), kein bloßer Helligkeitsparameter (siehe Abschnitt 15, „Die Wahrheit über Schatten")
- **`litColour` als Ausgangspunkt nutzbar**: In v1 gab es nur das bereits gefoggte `engineColour`, sodass eigene Atmosphäre-Looks leicht zu Doppel-Fog führten. In v2 ab `litColour` (vor Fog, vor Emission) starten und Fog im eigenen Rhythmus per `bloxdApplyFog()` neu anwenden
- **Blockarten per `blockId` unterscheiden**: Identifikation unabhängig von Texturfarbe. Die ID-Blockart-Tabelle ist aber engine-intern: Welche ID welcher Block ist, in der Welt vermessen (siehe [Teil VIII](8-apiv2.md))
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
