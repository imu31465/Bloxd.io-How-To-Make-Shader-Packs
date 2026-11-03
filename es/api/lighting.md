# Iluminación

> API objetivo: 5 · Build objetivo: `ab90qa` · Estado: Analyzed (restaurado literalmente de la cabecera en vivo)

v5 publicó la API de iluminación. Lo que el motor hacía internamente (construir `litColour`) ahora es llamable desde los paquetes. Esta página cubre las entradas, las funciones y el orden de procesamiento de la iluminación como un sistema.

## El pipeline completo

La cadena de color completa, tal como la muestra la implementación por defecto de la etapa light (`bloxdDefaultLight`):

```
surface.colour
    │  mezcla con overlayColour (mix(colour, overlay.rgb, overlay.a))
    ▼
overlaid
    │  multiplicación por bloxdShading(light) — respuesta de material y ángulo
    ▼
shaded
    │  mezcla con enchantColour (mix(shaded, enchant.rgb, enchant.a))
    ▼
enchanted
    │  multiplicación por bloxdWorldLight(light) — luz del mundo (la más brillante de bloque/cielo/en mano)
    ▼
lit = bloxdLitColour(surface, light)   ← el color «antes de emisión y niebla»
    │  + surface.emission               ← la emisión se añade tras la iluminación
    ▼
    │  bloxdApplyFog(colour, light)      ← mix(colour, fogColour, fogAlpha)
    ▼
BloxdLight.colour (color final)
```

Orden de `bloxdLitColour()` (resumen de la cabecera: *"mixed with overlayColour, then bloxdShading, then mixed with enchantColour, then bloxdWorldLight"*):

1. aplica `overlayColour`
2. sombrea con `bloxdShading()`
3. aplica `enchantColour`
4. aplica la luz del mundo con `bloxdWorldLight()`

Orden de emisión y niebla: **la emisión se añade después de la iluminación y antes de la niebla**, y la niebla también hunde la emisión (`bloxdDefaultLight` = `bloxdApplyFog(lit + emission, light)`).

## Funciones

### bloxdLit() — la compuerta

```wgsl
fn bloxdLit() -> bool
```

Si la iluminación de bloque y cielo está activada. **Garantías cuando está desactivada**:

| Campo | Valor cuando está desactivada |
|---|---|
| `blockLight` / `heldLight` | `0` |
| `skyLight` | `1` |
| `ambientLightColour` / `skyLightColour` | `1` (blanco) |

El `#ifdef BLOXD_LIGHTING` de v4 ha desaparecido. Sustitúyelo por `if (!bloxdLit()) { return bloxdDefaultLight(...); }`.

### bloxdShading() — respuesta de material y ángulo

```wgsl
fn bloxdShading(light: BloxdLightIn) -> vec3f {
    let diffuse = light.directional * light.diffuse;
    return saturate(diffuse + light.emissive + light.ambient);
}
```

- multiplica `directional` (Lambert sumado) por `diffuse` (respuesta RGB del material), suma `emissive` (brillo del material) y `ambient` (ambiente RGB), y acota a 0–1
- **las nuevas entradas de v5 `diffuse` / `emissive`** te permiten sustituir solo el término Lambert conservando la respuesta de material del motor

### bloxdWorldLight() — la luz del mundo

```wgsl
fn bloxdWorldLight(light: BloxdLightIn) -> vec3f {
    let ambientLight = light.ambientLightColour;
    let blockLight = ambientLight + light.blockLight * (1.0 - ambientLight);
    let skyLight = mix(ambientLight, light.skyLightColour, light.skyLight);
    let heldLight = ambientLight + light.heldLight * (1.0 - ambientLight);
    return max(max(blockLight, skyLight), heldLight);
}
```

- moldea cada uno de los tres canales (bloque / cielo / en mano) con `ambientLightColour` como suelo, y luego toma el **más brillante**
- `skyLight` interpola desde `ambientLightColour` hacia `skyLightColour` según la cantidad de luz de cielo

### bloxdLitColour() — la receta del motor

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

### bloxdApplyFog() — niebla

```wgsl
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}
```

- `fogAlpha`: **0 = sin niebla, 1 = solo fogColour** (invertido respecto al `fogVisibility` de v4)
- `fogColour` es el RGB de niebla del juego; **`vec3f(0.0)` cuando el juego no tiene niebla**

### bloxdDefaultLight() — el conjunto por defecto

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## Campos de entrada (BloxdLightIn)

| Campo | Tipo | Significado | Nota |
|---|---|---|---|
| `litColour` | `vec3f` | RGB iluminado y encantado (antes de emisión y niebla) | valor resultado, no fuente |
| `directional` | `f32` | Lambert sumado de las luces direccionales | 0 cuando no hay luces direccionales |
| `diffuse` | `vec3f` | respuesta RGB del material a la luz direccional | permite a `bloxdShading()` reconstruir la respuesta del material |
| `emissive` | `vec3f` | brillo RGB del material (sumado a la direccional) | |
| `ambient` | `vec3f` | ambiente RGB (sumado a la direccional) | |
| `blockLight` | `vec3f` | luz de bloque RGB | 0 cuando `!bloxdLit()` |
| `skyLight` | `f32` | luz de cielo | 1 cuando `!bloxdLit()` |
| `ambientLightColour` | `vec3f` | luz RGB mínima (suelo) | 1 cuando `!bloxdLit()` |
| `skyLightColour` | `vec3f` | color RGB de skyLight | 1 cuando `!bloxdLit()` |
| `heldLight` | `vec3f` | luz RGB de lo sostenido | 0 cuando `!bloxdLit()` o nada en mano |
| `fogColour` | `vec3f` | RGB de la niebla del juego | 0 sin niebla |
| `fogAlpha` | `f32` | 0 = sin niebla, 1 = solo fogColour | invertido respecto al `fogVisibility` de v4 |

## Física de los niveles de luz (trasfondo, saltable)

- **`blockLight` / `skyLight` / `heldLight` llegan ya mapeados a 0–1**: los niveles 0–15 a través de una curva ease-out (p. ej. `6 → 0.45`, `12 → 0.92`). Todos excluyen `ambientLightColour`
- **Curva de realce**: `skyLight` es en realidad «¿puede esta posición ver el cielo?» — datos de oclusión por vóxeles, es decir, un mapa de sombras. La separación sol/sombra por umbral puede necesitar la transformación inversa (ver la [guía de realismo](../guides/realism.md))
- **Interioridades de la niebla**: en modo lineal `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)` (acotado 0..1), calculado por vértice en espacio de vista. El build actual es solo lineal (detalles en [Interior del motor: interioridades de la niebla](../internals/fog-internals.md))

## Recetas

### Sombreado propio + la luz del mundo del motor

Lo que los autores de v4 aproximaban escalando `litColour` ahora se puede escribir exacto:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let nDotL = light.directional; // already summed Lambert
    let wrapped = nDotL * 0.5 + 0.5;
    let shaded = saturate(wrapped * light.diffuse + light.emissive + light.ambient);
    let colour = max(shaded * bloxdWorldLight(light), vec3f(0.0));
    return BloxdLight(bloxdApplyFog(colour + surface.emission, light));
}
```

### Conserva la luz del mundo del motor, refuerza solo la emisión

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission * 2.0, light));
}
```

### Desplazamiento azul nocturno (dirigido por skyLight)

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    let night = 1.0 - light.skyLight;
    out.colour = mix(out.colour, out.colour * vec3f(0.75, 0.82, 1.15), night * 0.6);
    return out;
}
```

## Relacionado

- [Funciones](functions.md) · [Guías: iluminación](../guides/lighting.md) · [Interior del motor: interioridades de la iluminación](../internals/lighting-internals.md)
