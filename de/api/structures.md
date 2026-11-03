# Ein- & Ausgabe-Strukturen

> Ziel-API: 5 · Ziel-Build: `ab90qa` · Status: Analyzed (wortwörtlich aus dem Live-Header restauriert)

Sieben Strukturen sind für Pakete les-/schreibbar. Jedes Feld ist unten aufgelistet (`#ifdef`-Felder sind bedingt). Der vollständige Header steht in [Engine-Interna](../internals/engine-header.md).

## BloxdVertexIn (Vertex-Hook-Eingabe)

```wgsl
struct BloxdVertexIn {
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
}
```

| Feld | Typ | Beschreibung |
|---|---|---|
| `position` | `vec3f` | Position im Render-Space (Weltposition via `bloxdWorldPosition()`) |
| `normal` | `vec3f` | Einheitsvektor, der von der Fläche weg zeigt |
| `localPosition` | `vec3f` | modell-lokale Koordinaten; **`vec3f(0.0)` für Terrain und Liquid**; für den Arm eines Spielers, ein gehaltenes Schwert oder Windmühlenflügel rotiert sie mit dem Modell |
| `flags` | `BloxdFlags` | Art der Fläche ([Flags](flags.md)) |

## BloxdVertex (Vertex-Hook-Ausgabe)

```wgsl
struct BloxdVertex {
    position: vec3f,      // The render position output.
}
```

## BloxdSurfaceIn (Surface-Hook-Eingabe)

```wgsl
struct BloxdSurfaceIn {
    colour: vec3f,        // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,           // Opacity.

    // Enchanted items and armour only, all 0 for anything else.
    enchantTier: u32,     // 1-5 for Tier 1-5.
    enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
    enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.

    // Players and mobs only, 0 for anything else: RGB overlay colour, e.g. the
    // red flash when hurt, and its alpha. bloxdLitColour mixes it into colour.
    overlayColour: vec4f,

    // These mean the same as in BloxdVertexIn, after the vertex hook.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.

    // These are all 0 if the face has no texture. Most models use textureId 0.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

| Feld | Typ | Beschreibung |
|---|---|---|
| `colour` | `vec3f` | RGB = Textur × Tint × AO, vom Mesher gebacken |
| `alpha` | `f32` | Opacity |
| `enchantTier` | `u32` | Enchant-Stufe 1–5; 0 für alles nicht Verzauberte |
| `enchantColour` | `vec4f` | Enchant-RGB plus ein **animiertes** Alpha (`.a`) — `.a` pro Fragment zu lesen liefert gratis ein wanderndes Muster; auf unverzauberten Flächen komplett null |
| `enchantSpeed` | `f32` | Geschwindigkeit des Enchant-Musters („faster at higher tiers“) |
| `overlayColour` | `vec4f` | Entity-Overlay (Schadens-Blitz etc.) RGB + Alpha; 0 außerhalb von Spielern/Mobs; wird vor der Beleuchtung von `bloxdLitColour` eingemischt |
| `position` / `normal` / `localPosition` / `flags` | — | gleiche Bedeutungen wie in `BloxdVertexIn`, **nach dem Vertex-Hook** (sie folgen bewegten Vertices) |
| `textureId` | `u32` | Textur dieser Fläche; Vergleich mit `bloxdTextureId*`; **0, wenn die Fläche keine Textur hat** — die meisten Modelle nutzen textureId 0 (modell-eigene Texturen, Spieler-Skins) |
| `textureRotation` | `u32` | Vierteldrehungen im Uhrzeigersinn (0–3), angewendet von `bloxdTexel` |
| `uv` | `vec2f` | die Textur spannt 0–1; gezeichnet wird `fract(uv)` (Ganzzahl-Schritte kacheln) |
| `mipLevel` | `f32` | Mipmap-Level: 0 = volle Größe, 1 = halbe… |

## BloxdSurface (Surface-Hook-Ausgabe)

```wgsl
struct BloxdSurface {
    colour: vec3f,        // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,           // Opacity output.
#endif
    emission: vec3f,      // Emissive RGB, added after lighting, before fog.
    enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
    overlayColour: vec4f, // Overlay output, mixed in by bloxdLitColour.
}
```

| Feld | Typ | Bedingung | Beschreibung |
|---|---|---|---|
| `colour` | `vec3f` | immer | RGB-Ausgabe |
| `alpha` | `f32` | `#ifdef BLOXD_ALPHA` (alle Liquid + nicht-strict Terrain/Model) | Opacity-Ausgabe |
| `emission` | `vec3f` | immer | emissives RGB — **nach der Beleuchtung, vor dem Fog addiert** |
| `enchantColour` | `vec4f` | immer | Enchant-Ausgabe, von `bloxdLitColour` eingemischt |
| `overlayColour` | `vec4f` | immer | Overlay-Ausgabe, von `bloxdLitColour` eingemischt |

`bloxdDefaultSurface` leitet `enchantColour` / `overlayColour` unverändert durch, daher entspricht der Standard-Look dem engine-internen Verhalten von v4. `out.enchantColour` nullen, um den Glint unter eigener Beleuchtung zu entfernen; `out.overlayColour.a` verstärken, um den Schadens-Blitz zu betonen.

## BloxdLightIn (Light-Hook-Eingabe)

```wgsl
struct BloxdLightIn {
    litColour: vec3f,  // Lit and enchanted RGB colour, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 if none.
    diffuse: vec3f,    // The material's RGB response to directional light.
    emissive: vec3f,   // The material's RGB glow, added to directional light.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 when !bloxdLit().
    skyLight: f32,     // Sky light; 1 when !bloxdLit().
    ambientLightColour: vec3f, // Minimum RGB light; 1 when !bloxdLit().
    skyLightColour: vec3f, // RGB colour of skyLight; 1 when !bloxdLit().
    heldLight: vec3f,  // RGB held light; 0 when !bloxdLit() or no light held.
    fogColour: vec3f,  // The game's RGB fog colour; 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.

    // These are the same as in BloxdSurfaceIn.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

Feld-für-Feld-Bedeutung und Rolle in der Beleuchtungsmathematik: siehe [Beleuchtung](lighting.md).

**Gegenüber älteren API-Versionen**: `fogVisibility` (v2–v4) ist jetzt `fogAlpha` mit invertierter Semantik (0 = kein Fog); `engineColour` ist jetzt `litColour`; die Lichtstufen-Formulierung lautet „0 when !bloxdLit()“. Die vollständigen Feldänderungen je Version: [Versionsgeschichte](../history/).

## BloxdLight (Light-Hook-Ausgabe)

```wgsl
struct BloxdLight {
    colour: vec3f, // RGB colour output.
}
```

## BloxdOpaqueBehind (Rückgabe der Spezialfunktion)

```wgsl
struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}
```

Rückgabewert von `bloxdOpaqueBehind()`. In Liquid-Varianten hinter einem `#ifdef BLOXD_SCENE_DEPTH`-Guard benutzen (in v2 hieß das Feld `found: bool`).

## Bedingte Felder ↔ Makros

| Feld | Existiert wann | Hinweis |
|---|---|---|
| `BloxdSurface.alpha` | `#ifdef BLOXD_ALPHA` | alle Liquid-Varianten + nicht-strict Terrain/Model |
| Aufruf `bloxdOpaqueBehind()` | `#ifdef BLOXD_SCENE_DEPTH` | alle Liquid-Varianten |

`BLOXD_STRICT` steuert die **Hook-Existenz** (Vertex-Hooks), nicht die Strukturform. Siehe [Präprozessor](preprocessor.md).

## Schreibkonventionen (Recap)

- Ausgabe-Strukturen nie direkt konstruieren — bei `bloxdDefault*` beginnen; in Light-Hooks funktioniert auch `var out = s;`
- Ein nacktes `var x: BloxdSurface;` ist ein Validierungsfehler
- Hook-Parameter sind read-only — vor dem Mutieren kopieren

## Verwandte Seiten

- [Beleuchtung](lighting.md) · [Flags](flags.md) · [Textur-API](texture-api.md)
