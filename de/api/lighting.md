# Beleuchtung

> Ziel-API: 5 · Ziel-Build: `v98qt8` (2026-11-08, Produktion und Preprod) · Status: Analyzed (wortwörtlich aus dem Live-Header restauriert)

v5 hat die Beleuchtungs-API veröffentlicht. Was die Engine intern tat (den Aufbau von `litColour`) ist jetzt aus Paketen aufrufbar. Diese Seite behandelt die Beleuchtungs-Eingaben, Funktionen und die Verarbeitungsreihenfolge als System.

## Die komplette Pipeline

Die vollständige Farb-Kette, wie sie die Standard-Implementierung der Light-Stufe (`bloxdDefaultLight`) zeigt:

```
surface.colour
    │  mix with overlayColour (mix(colour, overlay.rgb, overlay.a))
    ▼
overlaid
    │  multiply by bloxdShading(light) — material & angle response
    ▼
shaded
    │  mix with enchantColour (mix(shaded, enchant.rgb, enchant.a))
    ▼
enchanted
    │  multiply by bloxdWorldLight(light) — world light (brightest of block/sky/held)
    ▼
lit = bloxdLitColour(surface, light)   ← the color "before emission and fog"
    │  + surface.emission               ← emission added after lighting
    ▼
    │  bloxdApplyFog(colour, light)      ← mix(colour, fogColour, fogAlpha)
    ▼
BloxdLight.colour (final color)
```

Reihenfolge von `bloxdLitColour()` (Header-Zusammenfassung: *"mixed with overlayColour, then bloxdShading, then mixed with enchantColour, then bloxdWorldLight"*):

1. `overlayColour` anwenden
2. mit `bloxdShading()` schattieren
3. `enchantColour` anwenden
4. Weltlicht per `bloxdWorldLight()` anwenden

Reihenfolge von Emission und Fog: **Emission wird nach der Beleuchtung und vor dem Fog addiert**, und Fog senkt auch die Emission (`bloxdDefaultLight` = `bloxdApplyFog(lit + emission, light)`).

## Funktionen

### bloxdLit() — das Gate

```wgsl
fn bloxdLit() -> bool
```

Ob Block- & Himmels-Beleuchtung an ist. **Garantien bei ausgeschaltetem Licht**:

| Feld | Wert bei aus |
|---|---|
| `blockLight` / `heldLight` | `0` |
| `skyLight` | `1` |
| `ambientLightColour` / `skyLightColour` | `1` (weiß) |

Das `#ifdef BLOXD_LIGHTING` aus v4 ist weg. Ersetzen durch `if (!bloxdLit()) { return bloxdDefaultLight(...); }`.

### bloxdShading() — Material- & Winkel-Antwort

```wgsl
fn bloxdShading(light: BloxdLightIn) -> vec3f {
    let diffuse = light.directional * light.diffuse;
    return saturate(diffuse + light.emissive + light.ambient);
}
```

- multipliziert `directional` (summiertes Lambert) mit `diffuse` (RGB-Materialantwort), addiert `emissive` (Material-Glow) und `ambient` (RGB-Ambiente), clampt auf 0–1
- **die neuen v5-Eingaben `diffuse` / `emissive`** erlauben, nur den Lambert-Term zu tauschen und die Materialantwort der Engine zu behalten

### bloxdWorldLight() — das Licht der Welt

```wgsl
fn bloxdWorldLight(light: BloxdLightIn) -> vec3f {
    let ambientLight = light.ambientLightColour;
    let blockLight = ambientLight + light.blockLight * (1.0 - ambientLight);
    let skyLight = mix(ambientLight, light.skyLightColour, light.skyLight);
    let heldLight = ambientLight + light.heldLight * (1.0 - ambientLight);
    return max(max(blockLight, skyLight), heldLight);
}
```

- formt jeden der drei Kanäle (Block / Himmel / Hand) mit `ambientLightColour` als Untergrenze und nimmt dann das **hellste**
- `skyLight` interpoliert von `ambientLightColour` Richtung `skyLightColour`, gesteuert durch den Himmelslicht-Anteil

### bloxdLitColour() — das Engine-Rezept

```wgsl
fn bloxdLitColour(surface: BloxdSurface, light: BloxdLightIn) -> vec3f {
    let overlay = surface.overlayColour;
    let overlaid = mix(surface.colour, overlay.rgb, overlay.a);
    let shaded = bloxdShading(light) * overlaid;
    let enchant = surface.enchantColour;
    let enchanted = mix(shaded, enchant.rgb, enchant.a);
    return max(enchanted * bloxdWorldLight(light), vec3f(0.0));
}
```

### bloxdApplyFog() — Fog

```wgsl
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}
```

- `fogAlpha`: **0 = kein Fog, 1 = nur fogColour** (invertiert gegenüber dem `fogVisibility` aus v4)
- `fogColour` ist das Fog-RGB des Spiels; **`vec3f(0.0)`, wenn das Spiel keinen Fog hat**

### bloxdDefaultLight() — das ganze Standardverhalten

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## Eingabefelder (BloxdLightIn)

| Feld | Typ | Bedeutung | Hinweis |
|---|---|---|---|
| `litColour` | `vec3f` | beleuchtetes & verzaubertes RGB (vor Emission und Fog) | ein Ergebniswert, keine Quelle |
| `directional` | `f32` | summiertes Lambert der Richtlichter | 0, wenn keine Richtlichter |
| `diffuse` | `vec3f` | RGB-Materialantwort auf Richtlicht | lässt `bloxdShading()` die Materialantwort neu aufbauen |
| `emissive` | `vec3f` | RGB-Material-Glow (zum Richtlicht addiert) | |
| `ambient` | `vec3f` | RGB-Ambiente (zum Richtlicht addiert) | |
| `blockLight` | `vec3f` | RGB-Blocklicht | 0, wenn `!bloxdLit()` |
| `skyLight` | `f32` | Himmelslicht | 1, wenn `!bloxdLit()` |
| `ambientLightColour` | `vec3f` | minimales RGB-Licht (Untergrenze) | 1, wenn `!bloxdLit()` |
| `skyLightColour` | `vec3f` | RGB-Farbe des Himmelslichts | 1, wenn `!bloxdLit()` |
| `heldLight` | `vec3f` | RGB-Licht der Hand | 0, wenn `!bloxdLit()` oder nichts gehalten |
| `fogColour` | `vec3f` | Fog-RGB des Spiels | 0 ohne Fog |
| `fogAlpha` | `f32` | 0 = kein Fog, 1 = nur fogColour | invertiert gegenüber dem `fogVisibility` aus v4 |

## Physik der Lichtstufen (Hintergrund, überspringbar)

- **`blockLight` / `skyLight` / `heldLight` kommen bereits auf 0–1 abgebildet an**: die Stufen 0–15 durch eine Ease-out-Kurve (z. B. `6 → 0.45`, `12 → 0.92`). Alle ohne `ambientLightColour`
- **Lift-Kurve**: `skyLight` ist in Wahrheit „kann diese Position den Himmel sehen“ — Voxel-Okklusionsdaten, also eine Art Shadow-Map. Schwellenwert-basierte Sonne/Schatten-Trennung kann die inverse Transformation brauchen (siehe den [Realismus-Leitfaden](../guides/realism.md))
- **Fog-Interna**: Im Linear-Modus ist `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)` (geclampt 0..1), pro Vertex im View-Space berechnet. Der aktuelle Build ist nur linear (Details in [Engine-Interna: Fog-Interna](../internals/fog-internals.md))

## Rezepte

### Eigene Schattierung + das Weltlicht der Engine

Was v4-Autoren durch Skalieren von `litColour` approximierten, lässt sich jetzt exakt schreiben:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let nDotL = light.directional; // already summed Lambert
    let wrapped = nDotL * 0.5 + 0.5;
    let shaded = saturate(wrapped * light.diffuse + light.emissive + light.ambient);
    let colour = max(shaded * bloxdWorldLight(light), vec3f(0.0));
    return BloxdLight(bloxdApplyFog(colour + surface.emission, light));
}
```

### Das Weltlicht der Engine behalten, nur die Emission boosten

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission * 2.0, light));
}
```

### Blau-Verschiebung nachts (skyLight-gesteuert)

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    let night = 1.0 - light.skyLight;
    out.colour = mix(out.colour, out.colour * vec3f(0.75, 0.82, 1.15), night * 0.6);
    return out;
}
```

## Verwandte Seiten

- [Funktionen](functions.md) · [Leitfäden: Beleuchtung](../guides/lighting.md) · [Engine-Interna: Beleuchtungs-Interna](../internals/lighting-internals.md)
