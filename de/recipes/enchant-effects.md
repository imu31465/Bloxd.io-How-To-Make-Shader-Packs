# Enchant-Effekte

> Ziel-API: 5 · Ziel-Build: `v98qt8` (2026-11-08, Produktion und Preprod) · Status: Analyzed (wortwörtlich aus dem Live-Header restauriert)

v5 hat die Enchant-Pipeline für Ein- und Ausgaben geöffnet. Rezepte, um den Glint verzauberter Items und Rüstung zu steuern und dabei die Mathematik der Engine zu bewahren.

## Eingaben & Ausgaben

**Eingaben** (`BloxdSurfaceIn` / `BloxdLightIn` — nur verzauberte Items und Rüstung, sonst alles 0):

```wgsl
enchantTier: u32,     // 1-5 for Tier 1-5.
enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.
```

**Ausgabe** (`BloxdSurface`):

```wgsl
enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
```

Die Engine mischt ihn innerhalb von [`bloxdLitColour()`](../api/lighting.md) — direkt nach dem Shading, vor dem Weltlicht. `bloxdDefaultSurface` leitet die Eingabe unverändert durch, daher **entspricht der Standard-Look dem engine-internen Verhalten von v4**.

## Die Defaults verstehen

Die Eingabe `enchantColour.a` ist ein **animiertes** Alpha — die Engine animiert den Glint-Sweep, `.a` pro Fragment zu lesen liefert also gratis ein wanderndes Muster. `enchantTier` und `enchantSpeed` sind konstruktionsbedingt konsistent („faster at higher tiers“).

Unverzauberte Flächen tragen `enchantTier == 0`, `enchantColour == vec4f(0.0)`, `enchantSpeed == 0.0`.

## Rezept 1: Glint-losen Realismus (zwei Zeilen)

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.enchantColour = vec4f(0.0);
    return out;
}
```

## Rezept 2: stärkerer Glint nach Stufe

`enchantTier` liefert den klassischen „stufenskalierten Glint“ ohne Farben zu parsen:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        let tierBoost = 1.0 + f32(surface.enchantTier) * 0.12;
        out.enchantColour.a = clamp(surface.enchantColour.a * tierBoost, 0.0, 1.0);
        out.enchantColour.rgb = surface.enchantColour.rgb;
    }
    return out;
}
```

## Rezept 3: den Glint umfärben

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        var e = surface.enchantColour;
        e.rgb = mix(vec3f(0.35, 0.8, 1.0), vec3f(0.9, 0.5, 1.0),
                    f32(surface.enchantTier) / 5.0);   // low tiers blue, high purple
        out.enchantColour = e;
    }
    return out;
}
```

## Rezept 4: enchantSpeed-gesteuerter Sweep

`enchantSpeed` in eine Phase für einen eigenen Sweep verwandeln:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        let band = 0.5 + 0.5 * sin(surface.localPosition.y * 6.0
                                   - bloxdSeconds() * surface.enchantSpeed * 2.0);
        var e = surface.enchantColour;
        e.a = clamp(e.a * (0.4 + 0.6 * band), 0.0, 1.0);
        out.enchantColour = e;
    }
    return out;
}
```

## Rezept 5: den Schadens-Blitz verstärken (overlayColour)

`overlayColour` (nur Spieler/Mobs; Schadens-Blitz etc.) mischt sich vor der Beleuchtung in `bloxdLitColour`:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.overlayColour.a = clamp(surface.overlayColour.a * 1.6, 0.0, 1.0);
    return out;
}
```

Harmlos auf Nicht-Entities (`overlayColour` ist dort 0).

## Kombination mit eigener Beleuchtung

`bloxdLitColour()` zu benutzen hält das Enchant-/Overlay-Mischen automatisch:

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## Hinweise

- Enchant-Eingaben kommen **nur auf verzauberten Items und Rüstung** an — alles 0 auf Terrain, Wasser und unverzauberten Flächen
- Die `enchantColour`-Ausgabe zu ändern berührt `colour` nie direkt — das Mischen passiert in `bloxdLitColour` / `bloxdDefaultLight`
- Außerhalb der Model-Pipeline sind die Enchant-Eingaben immer 0

## Verwandte Seiten

- [Beleuchtung](../api/lighting.md) · [Strukturen](../api/structures.md) · [Modell-Shader-Rezepte](model-shaders.md)
