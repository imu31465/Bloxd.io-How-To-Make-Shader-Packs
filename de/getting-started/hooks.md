# Shader-Hooks

> Ziel-API: 5 · Ziel-Build: `xkg8x` (2026-11-04, Produktion) · Status: Verified

Ein Paket kann **9 Hooks** einhängen: 3 Render-Ziele (Terrain / Liquid / Model) × 3 Pipeline-Stufen (Vertex / Surface / Light). Alle sind optional — ein undefinierter Hook fällt auf den Engine-Standard zurück.

## Die Hooks

| Hook | Stufe | Was er tut |
|---|---|---|
| `bloxdTerrainVertex` | Terrain · Vertex | Terrain-Vertex-Animation. **Kann in strict-Spielen nicht laufen** |
| `bloxdTerrainSurface` | Terrain · Surface | Terrain-Farbe, Alpha, Emission, Enchant, Overlay |
| `bloxdTerrainLight` | Terrain · Light | finale Terrain-Farbe — die letzte Stufe des Fragments |
| `bloxdLiquidVertex` | Liquid · Vertex | Wasser-Vertex-Animation. **strict-only-Guard erforderlich** |
| `bloxdLiquidSurface` | Liquid · Surface | Wasser-Farbe, Alpha, Emission |
| `bloxdLiquidLight` | Liquid · Light | finale Wasser-Farbe |
| `bloxdModelVertex` | Model · Vertex | Vertex-Animation von Block-Modellen / Items / Entities. **strict-only-Guard erforderlich** |
| `bloxdModelSurface` | Model · Surface | Modell-Farbe, Alpha, Emission, Enchant, Overlay |
| `bloxdModelLight` | Model · Light | finale Modell-Farbe |

Signaturen (Typen müssen exakt passen; Parameternamen sind frei):

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex;
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight;
// bloxdLiquid* / bloxdModel* take the same types
```

## Aufteilung der Render-Ziele

- **Terrain** — jeder Block außer Wasser und Block-Modellen
- **Liquid** — Wasser
- **Model** — Block-Modelle (Stufen, Treppen, Pflanzen aus gekreuzten Ebenen), gehaltene/gefallene/geworfene Items, Spieler, Mobs, NPCs, Rüstung, Kosmetik

**Wichtig**: Definiert ein Paket keinen Liquid-Hook, **läuft auf Wasser auch kein Terrain-Hook** (Wasser wird ausschließlich von Liquid-Hooks behandelt). Das unterscheidet sich vom Verhalten vor v4, wo Liquid auf Terrain-Hooks zurückfiel.

## Fallbacks und Code-Sharing

- Ein undefinierter Hook bedeutet: Diese Stufe benutzt den Engine-Standard (dasselbe Verhalten wie `bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **Um Code über Hooks zu teilen**, eine Funktion auf Modul-Ebene definieren und aus beiden aufrufen:

```wgsl
fn applyWarmth(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.04, 1.0, 0.96);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}
```

## Das Standardpaket (offizielle 9-Hook-Vorlage)

Die Startvorlage enthält inzwischen die Light-Hooks. 1.683 Byte wie ausgeliefert, wortwörtlich:

```wgsl
// Every hook here returns its engine default. Modify the return values to start
// building a shader pack. If you delete a hook, the default is used instead.

// All blocks but water and block models use terrain hooks.
#ifndef BLOXD_STRICT
// Strict games keep terrain where it is. Without the #ifndef, this hook would
// turn the whole shader pack off there.
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

// Water uses liquid hooks. To share code with another hook, define a function
// and call it from both places.
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

// Models: block models such as slabs and plants, items, players and mobs.
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

Die Kommentare der Vorlage sind die Design-Leitlinie: Rückgabewerte verändern, um mit dem Bauen zu beginnen; einen Hook zu löschen stellt den Standard wieder her; strict-Spiele halten das Terrain an Ort und Stelle; Code über Funktionen teilen.

## Schreibkonventionen

- **Ausgabe-Strukturen nie direkt konstruieren** (`BloxdSurface(...)` scheitert an der Validierung). Immer bei `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` beginnen und Felder mutieren. Das erste Argument des Light-Hooks ist bereits der Ausgabetyp, daher funktioniert dort auch `var out = s;`
- Ein nacktes `var x: BloxdSurface;` (nur Typ-Annotation) ist ebenfalls ein Validierungsfehler
- Hook-Parameter sind **read-only**. Zuerst kopieren (`var sv = s;`)
- Bezeichner, die mit `bloxd` beginnen (case-insensitive), sind unbenutzbar — außer den 9 Hook-Funktionsnamen
- Konstanten als `const` schreiben (`#define` nimmt keinen Wert)

Welche Felder jeder Hook lesen und schreiben kann, steht in [Strukturen](../api/structures.md).
