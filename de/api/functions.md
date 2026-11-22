# Funktionen

> Ziel-API: 5 · Typ: technische Referenz

Jede Header-Funktion. Die Textur-API (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`) steht zusammen mit `bloxdOpaqueBehind` in der [Textur-API](texture-api.md).

## Frame-Funktionen (für das ganze Frame derselbe Wert)

Header-Notiz: *"These functions return the same value for the entire frame."* Sie lesen das `bloxdPackInputs`-Uniform und sind daher auch aus Vertex-Hooks und Modul-Funktionen aufrufbar.

### bloxdEyePosition

```wgsl
fn bloxdEyePosition() -> vec3f
```

- **Rückgabe**: die Render-Position der Kamera
- **Aufrufbar von**: allen 9 Hooks + Modul-Ebene
- **Einsatz**: Sichtvektoren (`normalize(l.position - bloxdEyePosition())`), Rim-Light, Distanzen

### bloxdRenderOffset

```wgsl
fn bloxdRenderOffset() -> vec3i
```

- **Rückgabe**: ganzzahliger Block-Offset; **Render-Position + dieser Offset = Weltposition**
- Ändert sich, während der Spieler reist (hält Render-Positionen nahe 0,0,0)
- Wird intern von `bloxdWorldPosition()` benutzt

### bloxdSunDirection

```wgsl
fn bloxdSunDirection() -> vec3f
```
- **Rückgabe**: Einheitsvektor zur Sonne in Welt-Ausrichtung; **Nullvektor, wenn die Welt keine Sonne hat**.
- **Fakten**:
  - Gibt diese Funktion einen Vektor ungleich null zurück, ist die Mondrichtung `-bloxdSunDirection()`. Bei einem Nullvektor lässt sich die tatsächliche Mondrichtung nicht bestimmen.
  - **Den Nullvektor niemals an `normalize` übergeben**. Prüfe `dot(d, d) < 1e-8` und verwende bei Bedarf eine feste Ersatzrichtung.
  - Die Engine stellt keinen automatischen Tag-Nacht-Zyklus bereit. Im Standard-Earth-Himmel bleibt die Sonne nahe `(−0.56, 0.81, −0.18)` (Höhe ≈ 54°) stehen. Eine Welt kann einen eigenen Zyklus implementieren, indem sie `inclination` aktualisiert; dadurch ändern sich Sonnen- und Mondrichtung.
- **Einsatz**: Farbtemperatur, Lichtrichtung, Erkennung der Sonnenverfügbarkeit und Umgebungslicht-Effekte für Mondlicht.

### bloxdSeconds

```wgsl
fn bloxdSeconds() -> f32
```

- **Rückgabe**: Sekunden seit dem Laden der Seite (kein Wrap — f32 hält über die ersten 4,5 Stunden Sub-Millisekunden-Präzision)
- **Einsatz**: Animation; wiederkehrende Timer per `bloxdSeconds() % period`
- **Hinweis**: anders als das `bloxdTime()` von v2 (das bei 3600 s wrappte) läuft der Wert nicht über

### bloxdLit

```wgsl
// Whether block and sky lighting is on. When it's off, BloxdLightIn's
// blockLight and heldLight are 0, and its skyLight and light colours are 1.
fn bloxdLit() -> bool
```

- **Rückgabe**: ob Block- & Himmels-Beleuchtung aktiviert ist
- **Neu in v5**: ersetzt die Compile-Zeit-Verzweigung `#ifdef BLOXD_LIGHTING` aus v4 durch eine Laufzeitprüfung
- **Garantien bei ausgeschaltetem Licht** (Header-Notiz): `blockLight` und `heldLight` sind 0; `skyLight` und die Lichtfarben (`ambientLightColour` / `skyLightColour`) sind 1
- **Einsatz**: beleuchtungsabhängigen Code gaten:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    // ... lighting-enabled processing
    return out;
}
```

`BLOXD_LIGHTING` zu benutzen erzeugt *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## Koordinaten-Konvertierung

### bloxdWorldPosition

```wgsl
// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f
```

- **Rückgabe**: `position + vec3f(bloxdRenderOffset())`
- **Hinweis**: f32-Präzisionsgrenzen bedeuten, dass ferne Koordinaten ungenau sein können (Header: *"with possible f32 inaccuracy"*)

### `bloxdFragmentBlockPosition`

```wgsl
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i
```

Diese Funktion ist **nicht mehr Teil des dokumentierten Headers** (in v4 war sie es), aber die Engine akzeptiert und definiert sie weiterhin:

- **Validator**: weiterhin in der Live-Signaturentabelle gelistet, Aufrufe bestehen also die Namensvalidierung in jedem Hook (einschließlich Vertex-Hooks)
- **Laufzeit**: der Codegenerator injiziert weiterhin eine Definition in das Terrain-/Liquid-Modul und in beide Model-Programme — Terrain/Liquid nutzen `vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset()`; die Model-Pipelines nutzen einen 1/64-Block-Offset mit Snap auf die Zelle des platzierten Block-Modells
- **Vorbehalt**: als undokumentiertes Interna kann sie in einer künftigen Version ohne Ankündigung verschwinden — für kontinuierliche Positionen `bloxdWorldPosition()` bevorzugen und für „welcher Block ist das“ `flags` (die Entfernung aus dem Header steht in [Versionsgeschichte: v5](../history/v5.md))

V4-Pakete, die sie aufrufen, laufen weiter; neue Pakete sollten sie nicht übernehmen.

## Default-Funktionen (Engine-Verhalten)

### bloxdDefaultVertex

```wgsl
fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex
// impl: return BloxdVertex(vertex.position);
```

### bloxdDefaultSurface

```wgsl
fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface
```

Leitet `colour` durch, leitet `enchantColour` / `overlayColour` unverändert durch, nullt `emission` (und leitet `alpha` in `BLOXD_ALPHA`-Varianten durch). **Ausgabe-Strukturen lassen sich nur über diese Funktion bauen.**

### bloxdDefaultLight

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight
// impl:
//   let lit = bloxdLitColour(surface, light);
//   return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
```

Wörtlich: „das Rezept der Engine anwenden, dann das emissiv erweiterte Ergebnis mit Fog versehen“.

## Funktionen des Beleuchtungsrezepts

Das eigene Beleuchtungsrezept der Engine, als aufrufbares WGSL dokumentiert — die Stufen einzeln komponieren oder überschreiben. Erklärungen und das Flussdiagramm: [Beleuchtung](lighting.md).

| Funktion | Signatur | Rolle |
|---|---|---|
| `bloxdShading` | `(light: BloxdLightIn) -> vec3f` | wie Material & Winkel der Fläche sie beleuchten (Lambert × diffuse + emissive + ambient, geclampt 0–1) |
| `bloxdWorldLight` | `(light: BloxdLightIn) -> vec3f` | das Licht der Welt an dieser Stelle (das hellste aus Block-/Himmel-/Handlicht, nach unten durch `ambientLightColour` abgefloort) |
| `bloxdLitColour` | `(surface: BloxdSurface, light: BloxdLightIn) -> vec3f` | die Farbe der Fläche, beleuchtet wie es die Engine tut (vor Emission und Fog) |
| `bloxdApplyFog` | `(colour: vec3f, light: BloxdLightIn) -> vec3f` | den Fog dieses Fragments anwenden (`mix(colour, fogColour, fogAlpha)`) |

## Schattenfunktionen

Diese drei Funktionen werden **in das kompilierte Modul jedes Packs injiziert** (wie `bloxdFragmentBlockPosition`) und stehen in der Funktionstabelle des Validators, nicht aber im lesbaren Headertext.

### bloxdShadow

```wgsl
fn bloxdShadow() -> f32
```

- **Liefert**: das Sonnen- oder Mondlicht, das dieses Fragment erreicht — **0 im Schatten, 1 beleuchtet** — *neu in API v5*
- Wer sie wirft: **Blöcke, Spieler, Mobs und Items** (der in der Ego-Perspektive gehaltene Gegenstand ist absichtlich ausgenommen)
- Verhalten (wörtlich aus der Validatoren-Beschreibung): blendet auf 0 ab, wenn Sonne oder Mond sinken oder sich die Fläche abwendet; **1 auf `flags.emissive`-Flächen**; das Licht läuft entlang `bloxdShadowDirection()`, also gibt es Schatten selbst unter einem sonnenlosen Himmel
- **Aufrufbar von**: surface-/light-Hooks
- Rezept: `let sun = mix(shadowColour, litColour, bloxdShadow());` — siehe [Schatten](../guides/shadows.md)

### bloxdAirShadow

```wgsl
fn bloxdAirShadow(t: f32) -> f32
```

- **Liefert**: wie `bloxdShadow()`, aber an einem Punkt **zwischen Kamera (t = 0) und diesem Fragment (t = 1)** — *neu in API v5* — für Lichtsäulen
- Nur Blöcke werfen sie (Spieler und Mobs nicht), auf ganze Blöcke weichgezeichnet; `t` ist auf 0–1 geklemmt
- Rezept: mehrere `t` entlang des Sichtstrahls abtasten und akkumulieren — [Schatten](../guides/shadows.md)

### bloxdShadowDirection

Gehört begrifflich zu den Schattenfunktionen, lebt aber im lesbaren Header — siehe [Frame-Funktionen](#bloxdshadowdirection).


## Spezialfunktionen

### bloxdOpaqueBehind

```wgsl
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind
```

- **Rückgabe**: `BloxdOpaqueBehind` (`hit: bool`, `position: vec3f`, `distance: f32`)
- **Aufrufbar von**: nur Surface-/Light-Hooks (die Tiefentextur ist FRAGMENT-only)
- **Guard**: `#ifdef BLOXD_SCENE_DEPTH` (in Liquid-Varianten definiert)
- **Bedeutung**: die opake Fläche hinter diesem Fragment (Terrain, durch Wasser gesehen); `hit == false` für Himmel
- **Umbenennung von v2**: `found` → `hit`
- **Vertiefung**: [Versionsgeschichte: v3](../history/v3.md) und [Engine-Interna](../internals/rendering-pipeline.md)

## Verwandte Seiten

- [Beleuchtung](lighting.md) · [Textur-API](texture-api.md) · [Packformat](pack-format.md)
