# Efectos de encantamiento

> API objetivo: 5 · Build objetivo: `xkg8x` (2026-11-04, producción) · Estado: Analyzed (restaurado de la cabecera en vivo)

v5 abrió el pipeline de encantamiento tanto en entradas como en salidas. Recetas para controlar el brillo de los ítems y armaduras encantados conservando la matemática del motor.

## Entradas y salidas

**Entradas** (`BloxdSurfaceIn` / `BloxdLightIn` — solo ítems y armaduras encantados, todo 0 en el resto):

```wgsl
enchantTier: u32,     // 1-5 for Tier 1-5.
enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.
```

**Salida** (`BloxdSurface`):

```wgsl
enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
```

El motor la mezcla dentro de [`bloxdLitColour()`](../api/lighting.md) — justo tras el sombreado, antes de la luz del mundo. `bloxdDefaultSurface` pasa la entrada sin cambios, así que **el aspecto por defecto coincide con el comportamiento interno del motor de v4**.

## Entendiendo los valores por defecto

La entrada `enchantColour.a` es un alfa **animado** — el motor anima el barrido del brillo, así que leer `.a` por fragmento da un patrón en movimiento gratis. `enchantTier` y `enchantSpeed` son coherentes por construcción («faster at higher tiers»).

Las caras no encantadas llevan `enchantTier == 0`, `enchantColour == vec4f(0.0)`, `enchantSpeed == 0.0`.

## Receta 1: realismo sin brillo (dos líneas)

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.enchantColour = vec4f(0.0);
    return out;
}
```

## Receta 2: brillo más fuerte por nivel

`enchantTier` da el clásico «brillo escalado por nivel» sin analizar colores:

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

## Receta 3: recolorear el brillo

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

## Receta 4: barrido dirigido por enchantSpeed

Convierte `enchantSpeed` en una fase para un barrido propio:

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

## Receta 5: amplificar el destello de daño (overlayColour)

`overlayColour` (solo jugadores/mobs; destello de daño etc.) se mezcla antes de la iluminación en `bloxdLitColour`:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.overlayColour.a = clamp(surface.overlayColour.a * 1.6, 0.0, 1.0);
    return out;
}
```

Inofensivo en no entidades (`overlayColour` vale 0 ahí).

## Combinar con iluminación propia

Usar `bloxdLitColour()` mantiene automática la mezcla de encantamiento/superposición:

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## Notas

- Las entradas de encantamiento llegan **solo en ítems y armaduras encantados** — todo 0 en terreno, agua y caras no encantadas
- Cambiar la salida `enchantColour` nunca toca `colour` directamente — la mezcla ocurre en `bloxdLitColour` / `bloxdDefaultLight`
- Fuera del pipeline de modelo las entradas de encantamiento son siempre 0

## Relacionado

- [Iluminación](../api/lighting.md) · [Estructuras](../api/structures.md) · [Recetas de sombreadores de modelo](model-shaders.md)
