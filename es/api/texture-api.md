# API de texturas

> API objetivo: 5 · Build objetivo: `xkg8x` · Estado: Verified (API sin cambios desde v4, reconfirmada en el build de v5)

La API para leer las texturas propias del juego: dos funciones, una familia de constantes con nombre y cuatro campos de entrada. La frase de una línea de la propia cabecera: *"This face's texture. Compare with `bloxdTextureId*`."*

## bloxdTexel

```wgsl
fn bloxdTexel(textureId: u32, uv: vec2f, mipLevel: f32) -> vec4f
```

- **Llamable desde**: **solo hooks surface / light** (alcanzarla desde un hook de vértice falla con un diagnóstico de «reaches»)

Lee un texel **igual que lo hace el sampler del propio motor** — mismo atlas `texture_2d_array<f32>`, mismo sampler, `textureSampleLevel` en `round(mipLevel)` — así que el texel que lees coincide estructuralmente con el texel que dibujó el motor.

### Qué lee `bloxdTexel` depende del pipeline

El motor genera una definición distinta de `bloxdTexel` por pipeline, así que una función tiene tres comportamientos:

| Pipeline | `textureId == 0` | `textureId` no nulo | Notas |
|---|---|---|---|
| **Pipelines de atlas** — terreno, líquido y modelos de bloque dibujados desde el atlas de bloques | `vec4f(1.0)` (blanco — «sin textura») | muestrea **esa entrada del atlas** | las constantes con nombre aplican; animación y rotación son automáticas |
| **Pipelines de textura propia** — modelos cuya malla lleva su propia textura difusa (pieles de jugador, texturas de mobs, sprites de ítem) | muestrea **la textura propia de la malla** en el uv que pases | `vec4f(1.0)` (blanco) | exactamente una textura está en alcance; las constantes con nombre no aplican |
| **Pipelines sin textura** | blanco | blanco | stub; `bloxdTextureSize() -> vec2u(1u)` |

Semántica de los pipelines de atlas en detalle:

- **`textureId == 0` devuelve `vec4f(1.0)` (blanco).** Ese es el id de «sin textura»; las caras sin textura llevan 0 en los cuatro campos de entrada, así que `bloxdTexel(surface.textureId, ...)` siempre es seguro de llamar
- **Las texturas animadas devuelven automáticamente el fotograma actual.** Los fotogramas avanzan con el reloj de animación del juego — no puedes detenerlos ni avanzarlos a pasos, y nunca lo necesitarás
- **`mipLevel` se acota exactamente como el del motor**: `clamp(round(mipLevel), 0, textureNumLevels(textureAtlas0) - 1)`; los mips fuera de rango saturan en lugar de dar error
- **La `textureRotation` propia del fragmento se aplica al uv que pases** (ver abajo)

`textureId` es **1-based** en los pipelines de atlas: `bloxdTextureIdGrassTop` es el id, y la capa del atlas que el motor muestrea para él es `id - 1`. Los ids son estables por *nombre* de textura, no por ranura del atlas — el motor reordena el atlas entre builds, pero la comparación por nombre conserva su significado.

### El patrón de llamada universal

```wgsl
// Works in every pipeline: on atlas faces it samples the atlas entry;
// on own-texture models textureId is 0 and it samples the model's own texture.
let texel = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
```

`surface.colour` ya contiene `textura × tinte × oclusión ambiental` (pieles y tintes incluidos), así que las lecturas de texels son para detalle *adicional* — estimaciones de luminancia, efectos por textura — no para reconstruir el color base.

## bloxdTextureSize

```wgsl
fn bloxdTextureSize(mipLevel: f32) -> vec2u
```

- **Llamable desde**: solo hooks surface / light

`textureDimensions(textureAtlas0, <mip acotado>)`. Cada textura ocupa una capa del array, así que esto es también *el tamaño en texels de cualquier textura en ese mip* (todas las texturas de bloque de un nivel del atlas comparten el mismo tamaño cuadrado).

```wgsl
// texel-aligned resampling for a "pixel-art" look
let size = bloxdTextureSize(surface.mipLevel);
let uv = fract(surface.uv);
let texel = bloxdTexel(surface.textureId, uv, surface.mipLevel);
```

## Texturas propias del modelo (textureId: 0)

La cabecera señala: *"These are all 0 if the face has no texture. **Most models use textureId 0.**"* — la mayoría de las caras de modelo no tienen textura de *atlas*, porque sus mallas llevan sus propias texturas:

- **Las pieles de jugador** y otras texturas de modelo fuera del atlas (mobs, sprites de ítem) llegan como `textureId: 0`
- En esos pipelines `bloxdTexel(0u, uv, mip)` muestrea **la textura propia de la malla** (ver la tabla de arriba); cualquier id no nulo devuelve blanco — no hay atlas en alcance
- Los campos de la cabecera siguen funcionando como está documentado: `uv` abarca la textura del modelo de 0 a 1, `mipLevel` es el mip de la cara
- **`bloxdTextureSize()`** informa del tamaño de *la textura que muestrea el pipeline*: el atlas en los pipelines de atlas, la textura propia del modelo en los de textura propia

Los efectos que solo tienen sentido en caras de atlas deberían protegerse:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        // only faces whose texture lives in the block atlas (block models)
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

- **Pieles frente al atlas**: el atlas mapea *nombres* de textura a capas y es comparable vía `bloxdTextureId*`. Las texturas propias del modelo (pieles) no están en ese espacio de nombres y llegan como id 0. `surface.colour` ya contiene piel × tinte, así que trabaja desde ahí

## bloxdTextureId*: constantes de textura por nombre

Cada nombre de textura utilizable se convierte en una `const` comparable. **La grafía es el nombre de archivo en CamelCase**:

| Archivo de textura | Constante | Nota |
|---|---|---|
| `grass_top.png` | `bloxdTextureIdGrassTop` | el propio ejemplo del motor |
| `lava0.png` (fotogramas `lava0`–`lava7`) | `bloxdTextureIdLava` | familia de animación: los sufijos de fotograma caen del nombre canónico |
| `black_portal0.png` (fotogramas 0–3) | `bloxdTextureIdBlackPortal` | misma regla |
| `radar_screen0` (copias giradas `[rot[1`–`[rot[4`) | `bloxdTextureIdRadarScreen0` | familia de rotación: se pliega al nombre raíz |

### Reglas de grafía y libertad de nombrado

- **Regla de generación** (restaurada del validador): divide el nombre por las secuencias no alfanuméricas, capitaliza cada parte y concatena tras el prefijo `bloxdTextureId`
- **No se distinguen mayúsculas ni guiones bajos**: la coincidencia inversa (el nombre que escribió un paquete → nombre del registro) pliega tanto tu grafía como la del motor, así que p. ej. `bloxdTextureIdGrassTop` y `bloxdTextureId_grass_top` se resuelven a **la misma constante**
- **Las texturas animadas no llevan número de fotograma**: `lava` es el nombre; `lava0` es un error dedicado
- **Las familias de rotación usan el nombre raíz**: escribir la grafía de una copia girada produce un mensaje dedicado

### Errores de resolución de nombres (literales del validador)

> **Grafía del prefijo / mayúsculas:** `bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?`
>
> **Fotograma de animación:** `...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates.`
>
> **Copia girada:** `...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, which bloxdTexel turns as each face shows it.`
>
> **Ambigua tras el plegado:** `...could name X and Y, which differ only by case or underscores, so it can't be used.`
>
> **No encontrada (con sugerencia):** `There's no texture called X. Did you mean bloxdTextureIdY?` — el umbral de sugerencia es distancia de Levenshtein `max(2, floor(len/4)) + 1`
>
> **No encontrada (sin sugerencia):** `There's no texture called X. Texture names are the file names texture packs use, as in bloxdTextureIdGrassTop for grass_top.png; BLOCK_TEXTURES.md lists them.`

> El `BLOCK_TEXTURES.md` de ese mensaje es la lista interna de nombres de textura del propio juego, referenciada por el validador del motor — no es una página de este sitio. El equivalente aquí es el [Catálogo de texturas](texture-catalog.md).

### Solo se emiten las constantes referenciadas

El bloque `bloxdTextureId*` de la cabecera se genera **por paquete** a partir de los nombres que realmente referencia — un paquete que usa 3 constantes obtiene 3 líneas `const`, no ~900.

## Campos de entrada

Los cuatro campos de textura de `BloxdSurfaceIn` / `BloxdLightIn`:

| Campo | Tipo | Descripción |
|---|---|---|
| `textureId` | `u32` | la textura de esta cara; compárala con `bloxdTextureId*`; 0 = ninguna |
| `textureRotation` | `u32` | cuartos de giro en sentido horario (0–3), aplicados por `bloxdTexel` |
| `uv` | `vec2f` | la textura abarca 0–1; se dibuja `fract(uv)` |
| `mipLevel` | `f32` | nivel de mip: 0 = tamaño completo, 1 = mitad… |

## La sutileza de la rotación — un sampler neutral

`bloxdTexel` contrarrota el uv que pasas según la `textureRotation` del **fragmento actual** — sin importar qué id pasaste. Dos casos frecuentes:

- **Re-muestrear la textura propia de esta cara** con `surface.uv` — el uv está en el marco girado de la cara y la contrarrotación lo devuelve al espacio del atlas; el uso primario previsto
- **Muestrear otra textura** con uv en espacio del atlas mientras la cara está girada — la contrarrotación se dispara igualmente y la muestra cae rotada. Esa es la trampa

El motor no puede consultar la rotación por textura (la rotación son datos de geometría de la cara) y siempre usa el valor del fragmento. Para muestrear otra textura de forma neutral a la rotación, prerrota el uv el mismo cuarto de giro para cancelarla:

```wgsl
// Rotation-neutral texel sampling: pre-rotate uv so bloxdTexel's counter-rotation
// (by this face's textureRotation) cancels out. Pass surface.textureRotation as r.
fn texelNeutral(id: u32, uv: vec2f, mip: f32, r: u32) -> vec4f {
    var turned = uv;
    if (r == 1u) {
        turned = vec2f(1.0 - uv.y, uv.x);
    } else if (r == 2u) {
        turned = vec2f(1.0 - uv.x, 1.0 - uv.y);
    } else if (r == 3u) {
        turned = vec2f(uv.y, 1.0 - uv.x);
    }
    return bloxdTexel(id, turned, mip);
}
```

(`textureRotation == 0` no necesita corrección. La mayoría de las caras llevan 0, pero los paquetes distribuidos no deben asumirlo.)

## Ejemplos prácticos

### Emisión desde la luminancia del texel

Muestrea un mip por encima del de la cara para un promedio blando y robusto a la distancia:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let avg = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + 1.0);
    let lum = dot(avg.rgb, vec3f(0.2126, 0.7152, 0.0722));
    if (surface.flags.emissive) {
        out.emission += avg.rgb * lum * 0.5;
    }
    return out;
}
```

### Efectos específicos por textura

Compara `textureId` para aislar texturas concretas (la forma oficial de, p. ej., hacer brillar las menas):

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.textureId == bloxdTextureIdDiamondOre) {
        let p = bloxdWorldPosition(light.position);
        let s = sin(bloxdSeconds() * 3.0 + p.x * 2.7 + p.y * 1.3 + p.z * 4.1);
        out.colour += vec3f(0.35, 0.45, 0.55) * max(0.0, s);
    }
    return out;
}
```

### Desenfoque de distancia estilo profundidad de campo

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let d = distance(surface.position, bloxdEyePosition());
    if (d > 40.0 && surface.textureId != 0u) {
        let own = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel);
        if (any(abs(own.rgb - vec3f(0.0)) > vec3f(1e-6))) {          // division guard
            let blur = clamp((d - 40.0) / 60.0, 0.0, 3.0);
            let t = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + blur);
            out.colour = t.rgb / own.rgb * out.colour;
        }
    }
    return out;
}
```

(El truco del cociente conserva la `colour = textura × tinte × AO` del motor: dividir el texel difuminado por el nativo cancela el contenido de la textura, dejando solo el factor de desenfoque para multiplicarlo de vuelta en `surface.colour`. Las lecturas blancas — caras sin textura — hacen que la guarda se salte el efecto.)

## Adónde no llega la API de texturas

- **No es llamable desde hooks de vértice** — los diagnósticos de «reaches» la rechazan
- **No puedes añadir texturas** — el atlas es del motor; la API solo lo lee. Las texturas personalizadas siguen siendo tarea del sistema de paquetes de texturas
- **Las configuraciones de renderizador sin atlas se degradan a stubs** — `bloxdTextureSize() -> vec2u(1u)` y `bloxdTexel(...) -> vec4f(1.0)`, con las cuatro entradas fluyendo `0u, 0u, vec2f(0.0), 0.0`. El código escrito para el atlas real sigue compilando y ejecutándose — solo ve texels blancos y un tamaño 1×1. El código que tolera `textureId == 0` tolera esto también

## Relacionado

- **Los 896 nombres utilizables** → [Catálogo de texturas](texture-catalog.md)
- [Interior del motor: registro de texturas](../internals/texture-registry.md) · [Muestreo de texturas](../internals/texture-sampling.md)
