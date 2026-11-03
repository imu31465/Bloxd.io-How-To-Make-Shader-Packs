# Lighting

> Target API: 5 · Target build: `ab90qa` · Status: Analyzed (restored verbatim from the live header)

v5 published the lighting API. What the engine did internally (building `litColour`) is now callable from packs. This page covers the lighting inputs, functions, and processing order as a system.

## The full pipeline

The complete color chain, as the default light-stage implementation (`bloxdDefaultLight`) shows it:

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

`bloxdLitColour()` order (header summary: *"mixed with overlayColour, then bloxdShading, then mixed with enchantColour, then bloxdWorldLight"*):

1. apply `overlayColour`
2. shade with `bloxdShading()`
3. apply `enchantColour`
4. apply world light with `bloxdWorldLight()`

Emission and fog order: **emission is added after lighting and before fog**, and fog sinks emission too (`bloxdDefaultLight` = `bloxdApplyFog(lit + emission, light)`).

## Functions

### bloxdLit() — the gate

```wgsl
fn bloxdLit() -> bool
```

Whether block & sky lighting is on. **Guarantees when off**:

| Field | Value when off |
|---|---|
| `blockLight` / `heldLight` | `0` |
| `skyLight` | `1` |
| `ambientLightColour` / `skyLightColour` | `1` (white) |

v4's `#ifdef BLOXD_LIGHTING` is gone. Replace with `if (!bloxdLit()) { return bloxdDefaultLight(...); }`.

### bloxdShading() — material & angle response

```wgsl
fn bloxdShading(light: BloxdLightIn) -> vec3f {
    let diffuse = light.directional * light.diffuse;
    return saturate(diffuse + light.emissive + light.ambient);
}
```

- multiplies `directional` (summed Lambert) by `diffuse` (material RGB response), adds `emissive` (material glow) and `ambient` (RGB ambient), clamps to 0–1
- **the new v5 inputs `diffuse` / `emissive`** let you swap just the Lambert term while keeping the engine's material response

### bloxdWorldLight() — the world's light

```wgsl
fn bloxdWorldLight(light: BloxdLightIn) -> vec3f {
    let ambientLight = light.ambientLightColour;
    let blockLight = ambientLight + light.blockLight * (1.0 - ambientLight);
    let skyLight = mix(ambientLight, light.skyLightColour, light.skyLight);
    let heldLight = ambientLight + light.heldLight * (1.0 - ambientLight);
    return max(max(blockLight, skyLight), heldLight);
}
```

- shapes each of the three channels (block / sky / held) with `ambientLightColour` as the floor, then takes the **brightest**
- `skyLight` interpolates from `ambientLightColour` toward `skyLightColour` by the sky-light amount

### bloxdLitColour() — the engine recipe

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

### bloxdApplyFog() — fog

```wgsl
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}
```

- `fogAlpha`: **0 = no fog, 1 = only fogColour** (inverted from v4's `fogVisibility`)
- `fogColour` is the game's fog RGB; **`vec3f(0.0)` when the game has no fog**

### bloxdDefaultLight() — the whole default

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## Input fields (BloxdLightIn)

| Field | Type | Meaning | Note |
|---|---|---|---|
| `litColour` | `vec3f` | lit & enchanted RGB (before emission and fog) | a result value, not a source |
| `directional` | `f32` | summed Lambert from directional lights | 0 when no directional lights |
| `diffuse` | `vec3f` | material RGB response to directional light | new in v5 |
| `emissive` | `vec3f` | material RGB glow (added to directional) | new in v5 |
| `ambient` | `vec3f` | RGB ambient (added to directional) | |
| `blockLight` | `vec3f` | RGB block light | 0 when `!bloxdLit()` |
| `skyLight` | `f32` | sky light | 1 when `!bloxdLit()` |
| `ambientLightColour` | `vec3f` | minimum RGB light (floor) | 1 when `!bloxdLit()` |
| `skyLightColour` | `vec3f` | RGB color of skyLight | 1 when `!bloxdLit()` |
| `heldLight` | `vec3f` | RGB held light | 0 when `!bloxdLit()` or nothing held |
| `fogColour` | `vec3f` | game fog RGB | 0 with no fog |
| `fogAlpha` | `f32` | 0 = no fog, 1 = only fogColour | inverted from v4 `fogVisibility` |

## Light-level physics (background, skippable)

- **`blockLight` / `skyLight` / `heldLight` arrive mapped to 0–1**: the 0–15 levels through an ease-out curve (e.g. `6 → 0.45`, `12 → 0.92`). All exclude `ambientLightColour`
- **Lift curve**: `skyLight` is really "can this position see the sky" — voxel occlusion data, i.e. a shadow map. Threshold-based sun/shade separation may need the inverse transform (see the [realism guide](../guides/realism.md))
- **Fog internals**: in linear mode `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)` (clamped 0..1), computed per vertex in view space. The current build is linear-only (details in [Engine Internals: Fog Internals](../internals/fog-internals.md))

## Recipes

### Custom shading + the engine's world light

What v4 authors approximated by scaling `litColour` can now be written exactly:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let nDotL = light.directional; // already summed Lambert
    let wrapped = nDotL * 0.5 + 0.5;
    let shaded = saturate(wrapped * light.diffuse + light.emissive + light.ambient);
    let colour = max(shaded * bloxdWorldLight(light), vec3f(0.0));
    return BloxdLight(bloxdApplyFog(colour + surface.emission, light));
}
```

### Keep the engine's world light, boost emission only

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission * 2.0, light));
}
```

### Night blue shift (skyLight-driven)

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    let night = 1.0 - light.skyLight;
    out.colour = mix(out.colour, out.colour * vec3f(0.75, 0.82, 1.15), night * 0.6);
    return out;
}
```

## Related

- [Functions](functions.md) · [Guides: lighting](../guides/lighting.md) · [Engine Internals: Lighting Internals](../internals/lighting-internals.md)
