# Sombreadores de modelo

> API objetivo: 5 · Build objetivo: `xkg8x` (2026-11-04, producción) · Estado: Analyzed (escrito contra la especificación de cabecera v5)

Recetas con los hooks de Model de v5 y los nuevos flags para selecciones de **«qué estoy mirando» que eran imposibles antes de v5**. Lo básico: [Modelos y texturas](../guides/models.md).

## Brillo del ítem en mano

Lo que los autores de sombreadores en primera persona querían desde v1, en dos líneas:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## Separar el mundo de la mano

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;
    }
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## Puntas de hoja brillantes (localPosition)

`localPosition` gira con el modelo — «en qué parte del modelo estoy» sin conjeturas en espacio de mundo:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        let tipness = clamp(surface.localPosition.y * 0.5 + 0.5, 0.0, 1.0);
        out.emission += vec3f(0.3, 0.4, 0.6) * tipness * tipness * 0.6;
    }
    return out;
}
```

Nota: los rangos reales de `localPosition` varían por modelo — verifica en el dispositivo y `clamp` a la defensiva.

## Resaltar los ítems caídos

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.dropped) {
        let pulse = 0.5 + 0.5 * sin(bloxdSeconds() * 2.0
            + surface.localPosition.x * 3.0);
        out.emission += vec3f(0.08, 0.10, 0.06) * pulse;
    }
    return out;
}
```

## Borde frío en pieles de jugador (lifeform)

La mayoría de los modelos usan `textureId: 0` (pieles); `surface.colour` ya lleva piel × tinte:

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.flags.lifeform) {
        let viewDir = normalize(bloxdEyePosition() - light.position);
        let rim = pow(1.0 - clamp(dot(viewDir, normalize(light.normal)), 0.0, 1.0), 2.5);
        out.colour += vec3f(0.4, 0.5, 0.7) * rim * 0.25;
    }
    return out;
}
```

## Plantas que se mecen con el viento (solo allow)

Las plantas (`flags.flat`) se dibujan como modelos — vaivén vía el hook de vértice:

```wgsl
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(vertex);
    if (vertex.flags.flat) {
        let sway = sin(bloxdSeconds() * 1.8
            + bloxdWorldPosition(vertex.position).x * 0.7);
        let tipness = clamp(vertex.localPosition.y + 0.5, 0.0, 1.0);
        out.position.x += sway * 0.08 * tipness;
    }
    return out;
}
#endif
```

(La vegetación es también `flags.vegetation`: `flat` = «dibujada como plano cruzado», `vegetation` = «es una planta» — la hierba y las flores son ambas cosas.)

## Solo caras de modelo con textura de atlas

Las caras de modelos de bloque (losas, escaleras…) llevan `textureId` del atlas; selecciona con `textureId != 0u`:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

Las caras `textureId: 0` (pieles) muestrean como blanco — sin error ([texturas propias del modelo](../api/texture-api.md#texturas-propias-del-modelo-textureid-0)).

## Armadura frente al resto

`flags.lifeform` incluye armaduras y cosmética ([Flags](../api/flags.md)). No existe una entrada más granular; combina `localPosition` (colocación) o la presencia de `overlayColour` como aproximaciones prácticas.

## Compartir con el terreno

Gradación uniforme entre bloques completos y modelos de bloque:

```wgsl
fn applyGrade(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02, 1.0, 0.98);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}
```

El patrón de función compartida es el que la propia plantilla de paquete por defecto recomienda ([hooks](../getting-started/hooks.md#fallbacks-y-compartición-de-código)).

## Relacionado

- [Modelos y texturas](../guides/models.md) · [Efectos de encantamiento](enchant-effects.md) · [Flags](../api/flags.md) · [Estructuras](../api/structures.md)
