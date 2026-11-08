# Funciones

> API objetivo: 5 · Build objetivo: `v98qt8` · Estado: Analyzed (restaurado literalmente de la cabecera en vivo)

Todas las funciones de cabecera. La API de texturas (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`) se trata en [API de texturas](texture-api.md), junto con `bloxdOpaqueBehind`.

## Funciones de fotograma (mismo valor durante todo el fotograma)

Nota de la cabecera: *"These functions return the same value for the entire frame."* Leen el uniform `bloxdPackInputs`, así que también son llamables desde hooks de vértice y funciones de ámbito de módulo.

### bloxdEyePosition

```wgsl
fn bloxdEyePosition() -> vec3f
```

- **Devuelve**: la posición de render de la cámara
- **Llamable desde**: los 9 hooks + ámbito de módulo
- **Usos**: vectores de vista (`normalize(l.position - bloxdEyePosition())`), luz de borde (rim), distancias

### bloxdRenderOffset

```wgsl
fn bloxdRenderOffset() -> vec3i
```

- **Devuelve**: desplazamiento entero de bloques; **posición de render + este desplazamiento = posición de mundo**
- Cambia a medida que el jugador viaja (mantiene las posiciones de render cerca de 0,0,0)
- Usado internamente por `bloxdWorldPosition()`

### bloxdSunDirection

```wgsl
fn bloxdSunDirection() -> vec3f
```

- **Devuelve**: vector unitario hacia el sol en orientación de mundo; **vector cero cuando no hay sol**
- **Datos**:
  - **la luna está siempre en `-bloxdSunDirection()`** (el motor la coloca opuesta al sol)
  - **nunca pases el vector cero a `normalize`** — protégelo con `dot(d, d) < 1e-8` y recurre a una dirección constante
  - el build actual no tiene ciclo día-noche; sol, luna y estrellas no se mueven durante una sesión (solo se alterna la opacidad). En el cielo terrestre por defecto el sol está cerca de `(−0.56, 0.81, −0.18)` (elevación ≈ 54°)
- **Usos**: temperatura de color, dirección de la luz, puertas solares, luz lunar pseudo

### bloxdSeconds

```wgsl
fn bloxdSeconds() -> f32
```

- **Devuelve**: segundos desde que cargó la página (sin envoltura — f32 mantiene precisión submilisegundo durante las primeras 4,5 horas)
- **Usos**: animación; temporizadores recurrentes vía `bloxdSeconds() % period`
- **Nota**: al contrario que el `bloxdTime()` de v2 (que se envolvía a los 3600 s), no se envuelve

### bloxdLit

```wgsl
// Whether block and sky lighting is on. When it's off, BloxdLightIn's
// blockLight and heldLight are 0, and its skyLight and light colours are 1.
fn bloxdLit() -> bool
```

- **Devuelve**: si la iluminación de bloque y cielo está activada
- **Nuevo en v5**: sustituye la ramificación en tiempo de compilación `#ifdef BLOXD_LIGHTING` de v4 por una comprobación en tiempo de ejecución
- **Garantías cuando está desactivada** (nota de cabecera): `blockLight` y `heldLight` valen 0; `skyLight` y los colores de luz (`ambientLightColour` / `skyLightColour`) valen 1
- **Uso**: proteger con puerta el código dependiente de la iluminación:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    // ... lighting-enabled processing
    return out;
}
```

Usar `BLOXD_LIGHTING` produce *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## Conversión de coordenadas

### bloxdWorldPosition

```wgsl
// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f
```

- **Devuelve**: `position + vec3f(bloxdRenderOffset())`
- **Nota**: los límites de precisión de f32 hacen que las coordenadas lejanas puedan ser inexactas (cabecera: *"with possible f32 inaccuracy"*)

### bloxdFragmentBlockPosition — indocumentado pero sigue inyectado

```wgsl
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i
```

Esta función **ya no forma parte de la cabecera documentada** (sí lo estaba en la de v4), pero el motor la sigue aceptando y definiendo:

- **Validador**: sigue listada en la tabla de firmas en vivo, así que las llamadas pasan la validación de nombres en todos los hooks (incluidos los hooks de vértice)
- **Ejecución**: el generador de código sigue inyectando una definición en el módulo de terreno/líquido y en ambos programas de modelo — terreno/líquido usan `vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset()`; los pipelines de modelo usan un desplazamiento de 1/64 de bloque, ajustando a la celda del modelo para los modelos de bloque colocados
- **Advertencia**: al ser una interna indocumentada puede desaparecer en una versión futura sin aviso — prefiere `bloxdWorldPosition()` para posiciones continuas y `flags` para «qué bloque es este» (ver [Historial de versiones: v5](../history/v5.md) para su salida de la cabecera)

Los paquetes escritos para v4 que la llaman siguen funcionando; los paquetes nuevos no deberían adoptarla.

## Funciones por defecto (comportamiento del motor)

### bloxdDefaultVertex

```wgsl
fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex
// impl: return BloxdVertex(vertex.position);
```

### bloxdDefaultSurface

```wgsl
fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface
```

Pasa `colour` tal cual, pasa `enchantColour` / `overlayColour` sin cambios, pone `emission` a cero (y pasa `alpha` en variantes `BLOXD_ALPHA`). **Las estructuras de salida solo se pueden construir vía esta función.**

### bloxdDefaultLight

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight
// impl:
//   let lit = bloxdLitColour(surface, light);
//   return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
```

Literalmente, «aplica la receta del motor y luego aplica niebla al resultado con la emisión añadida».

## Funciones de receta de iluminación

La receta de iluminación del propio motor, documentada como WGSL llamable — compón o sustituye las etapas individualmente. Explicaciones y el diagrama de flujo: [Iluminación](lighting.md).

| Función | Firma | Papel |
|---|---|---|
| `bloxdShading` | `(light: BloxdLightIn) -> vec3f` | cómo iluminan la cara su material y su ángulo (Lambert × difusa + emisiva + ambiente, con clamp 0–1) |
| `bloxdWorldLight` | `(light: BloxdLightIn) -> vec3f` | la luz del mundo aquí (la más brillante de bloque/cielo/en mano, con suelo en `ambientLightColour`) |
| `bloxdLitColour` | `(surface: BloxdSurface, light: BloxdLightIn) -> vec3f` | el color de la superficie iluminado como lo hace el motor (antes de emisión y niebla) |
| `bloxdApplyFog` | `(colour: vec3f, light: BloxdLightIn) -> vec3f` | aplica la niebla de este fragmento (`mix(colour, fogColour, fogAlpha)`) |

## Funciones especiales

### bloxdOpaqueBehind

```wgsl
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind
```

- **Devuelve**: `BloxdOpaqueBehind` (`hit: bool`, `position: vec3f`, `distance: f32`)
- **Llamable desde**: solo hooks surface / light (la textura de profundidad es exclusiva de FRAGMENT)
- **Guarda**: `#ifdef BLOXD_SCENE_DEPTH` (definida en variantes de líquido)
- **Significado**: la cara opaca tras este fragmento (terreno visto a través del agua); `hit == false` para el cielo
- **Renombrado respecto a v2**: `found` → `hit`
- **A fondo**: [Historial de versiones: v3](../history/v3.md) y [Interior del motor](../internals/rendering-pipeline.md)

## Relacionado

- [Iluminación](lighting.md) · [API de texturas](texture-api.md) · [Formato del paquete](pack-format.md)
