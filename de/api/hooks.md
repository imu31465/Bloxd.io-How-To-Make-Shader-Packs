# Shader-Hooks

> Ziel-API: 5 · Ziel-Build: `v98qt8` (2026-11-08, Produktion und Preprod) · Status: Verified

Pakete können **9 Hooks** definieren — 3 Render-Ziele (Programme) × 3 Pipeline-Stufen, alle optional (undefiniert bedeutet Engine-Standard).

## Vergleich der 9 Hooks

| Hook | Programm | Stufe | Argumente | Rückgabe | Laufbedingung |
|---|---|---|---|---|---|
| `bloxdTerrainVertex` | Terrain | Vertex | `BloxdVertexIn` | `BloxdVertex` | nur allow-Varianten (**es in strict zu definieren ist selbst ein Fehler**) |
| `bloxdTerrainSurface` | Terrain | Surface | `BloxdSurfaceIn` | `BloxdSurface` | immer |
| `bloxdTerrainLight` | Terrain | Light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | immer |
| `bloxdLiquidVertex` | Liquid | Vertex | `BloxdVertexIn` | `BloxdVertex` | nur allow |
| `bloxdLiquidSurface` | Liquid | Surface | `BloxdSurfaceIn` | `BloxdSurface` | immer |
| `bloxdLiquidLight` | Liquid | Light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | immer |
| `bloxdModelVertex` | Model | Vertex | `BloxdVertexIn` | `BloxdVertex` | nur allow |
| `bloxdModelSurface` | Model | Surface | `BloxdSurfaceIn` | `BloxdSurface` | immer |
| `bloxdModelLight` | Model | Light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | immer |

## Was jedes Programm zeichnet

| Programm | Zeichnet | Wasser, wenn kein Liquid-Hook existiert |
|---|---|---|
| **Terrain** | jeden Block außer Wasser und Block-Modellen | — |
| **Liquid** | Wasser | **auf Wasser läuft auch kein Terrain-Hook** (Wasser behält seinen Standard-Look) |
| **Model** | Block-Modelle (Stufen, Treppen, Pflanzen, Feldfrüchte, Spinnennetze), gehaltene/gefallene/geworfene Items, Spieler, Mobs, NPCs, Rüstung, Kosmetik | — |

## Rollen der Stufen

- **Vertex** — Vertex-Positionen bewegen (Gras-Wiegen, Wellen). Vertex-Animation schaltet das ganze Paket in strict-Spielen ab, daher ist `#ifndef BLOXD_STRICT` Pflicht
- **Surface** — der Material-Output: `colour` / `alpha` (bedingt) / `emission` / `enchantColour` / `overlayColour`
- **Light** — die finale Farbe; nimmt den Surface-Output plus `BloxdLightIn`. Ihr Rückgabewert ist die Farbe auf dem Bildschirm

## Signaturen

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
// bloxdLiquid* / bloxdModel* take the same argument and return types
```

## Aufrufbeschränkungen für Spezialfunktionen

Der Validator der Engine beschränkt, welche Hooks bestimmte Funktionen erreichen dürfen (Verstöße scheitern mit eigenen „reaches“-Diagnosen):

| Funktion | Aufrufbar von | Guard |
|---|---|---|
| `bloxdTexel` | nur Surface-/Light-Hooks | — |
| `bloxdTextureSize` | nur Surface-/Light-Hooks | — |
| `bloxdOpaqueBehind` | Surface-/Light-Hooks (sinnvoll in Liquid-Varianten) | `#ifdef BLOXD_SCENE_DEPTH` |

> `bloxdFragmentBlockPosition` steht nicht mehr im dokumentierten Header, aber die Engine injiziert und akzeptiert es weiterhin — siehe [Funktionen: bloxdFragmentBlockPosition](functions.md#bloxdfragmentblockposition--undokumentiert-aber-weiterhin-injiziert). Es war die eine Spezialfunktion, die aus Vertex-Hooks aufrufbar war; für neuen Code lieber `flags` für „welcher Block ist das“ verwenden.

## Fallbacks und gemeinsame Nutzung

- Undefinierter Hook → die Stufe verhält sich wie der Engine-Standard (`bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **Verarbeitung über Hooks teilen** mit einer Funktion auf Modul-Ebene, die von beiden aufgerufen wird:

```wgsl
fn sharedSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}
```

## Verwandte Seiten

- Offizielle 9-Hook-Vorlage → [Erste Schritte: Shader-Hooks](../getting-started/hooks.md)
- Jedes Struktur-Feld → [Strukturen](structures.md)
- Interna des Hook-Aufrufs → [Engine-Interna](../internals/hook-invocation.md)
