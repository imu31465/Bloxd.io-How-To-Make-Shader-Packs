# Internas del muestreo de texturas

> API objetivo: 5 · Build objetivo: `ab90qa` · Estado: Analyzed (restaurado del generador en vivo, c56)

Cómo compilan de verdad `bloxdTexel` / `bloxdTextureSize` — el codegen de texturas de 3 variantes. El lado de usuario: [API de texturas](../api/texture-api.md).

## Las tres variantes

### Variante 1 — paquete de texturas inactivo (stubs)

```wgsl
fn bloxdTextureSize(bloxdSpMipLevel: f32) -> vec2u {
        return vec2u(1u);
}
fn bloxdTexel(bloxdSpTextureId: u32, bloxdSpUv: vec2f, bloxdSpMipLevel: f32) -> vec4f {
        return vec4f(1.0);
}
```

El código escrito para el atlas real sigue compilando y ejecutándose aquí — solo ve texels blancos y un tamaño 1×1.

### Variante 2 — la ruta del atlas (el valor por defecto del juego)

`bloxdTextureSize` devuelve `textureDimensions(textureAtlas0, u32(clamp(round(bloxdSpMipLevel), 0.0, f32(textureNumLevels(textureAtlas0) - 1u))))`. `bloxdTexel` aplica el cuarto de giro de la cara antes de la carga — la trampa de rotación escrita como la cadena `if` generada de `bloxdSpTurned`:

```wgsl
        // Each quarter turn clockwise the face shows its texture at reads the unturned texture at (v, 1 - u)
        var bloxdSpTurned = bloxdSpUv;
        if (bloxdSpTextureRotation == 1u) {
                bloxdSpTurned = vec2f(bloxdSpUv.y, 1.0 - bloxdSpUv.x);
        } else if (bloxdSpTextureRotation == 2u) {
                bloxdSpTurned = 1.0 - bloxdSpUv;
        } else if (bloxdSpTextureRotation == 3u) {
                bloxdSpTurned = vec2f(1.0 - bloxdSpUv.y, bloxdSpUv.x);
        }
```

(`bloxdSpTextureRotation` es el almacenamiento propio del motor del campo de entrada `textureRotation`.)

### Variante 3 — texturas de paquetes de texturas personalizados

`textureLoad(<atlas>, min(bloxdSpCellAt * bloxdSpSize + bloxdSpAt, <dims> - 1u), bloxdSpLevel)` muestrea la celda por textura del atlas por capas; los texels propios del paquete van por la ruta `bloxdSpOwnTexel`.

## La escalera de fotogramas de animación

Las texturas animadas (42 familias) avanzan a intervalos fijos por familia (200 / 250 / 300 ms — la columna de intervalo del [catálogo de texturas](../api/texture-catalog.md#familias-de-animación-42-nombres)). Pasar un id de familia de animación a `bloxdTexel` muestrea el fotograma actual.

## Ajustes del sampler

Las texturas de bloque son un `texture_2d_array`; el sampler de terreno es nearest + repeat.

## Greedy meshing y UV

El mesher fusiona caras con material/AO/luz coincidentes en rectángulos únicos (**greedy meshing**), así que los UV de vértice pueden superar el ancho de tile en caras fusionadas (inset de 0.0015 en los bordes). El direccionamiento repeat por hardware se encarga del teselado, así que las caras fusionadas se ven sin costuras — pero el detalle procedural con clave en `uv` puede discontinuar a través de los límites de fusión; usa como clave `bloxdWorldPosition(position)` para los efectos dependientes del mundo.

## Relacionado

- [API de texturas](../api/texture-api.md) · [Registro de texturas](texture-registry.md) · [Canalización de renderizado](rendering-pipeline.md)
