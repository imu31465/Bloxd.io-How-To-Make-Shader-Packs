# Internas de niebla

> API objetivo: 5 · Build objetivo: `xkg8x` (2026-11-04, producción) · Estado: Analyzed (análisis del paquete de producción a nivel de JavaScript)

El cómputo de niebla es siempre modo LINEAR (equivalente a `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), con `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = ajuste de distancia de niebla; solo D = 0 es especial con fogEnd = 5). **La banda de gradiente de niebla es de solo 32 bloques**, y `l.fogAlpha` es menos "bruma por distancia" que **distancia normalizada al borde del mundo cargado**. Varía por jugador con la distancia de carga, así que los efectos por distancia deben calcular `distance(l.position, bloxdEyePosition())` ellos mismos (la sección «Banda de borde de carga» más abajo). (La función de niebla del renderizador implementa en realidad **cuatro** modos — off / exponencial / exponencial al cuadrado / lineal — con los títulos distribuidos activando el lineal; el código fuente restaurado y el argumento de robustez se conservan en [Historial de versiones: v3](../history/v3.md).)

Color de niebla por defecto `rgb(183, 191, 195)` (gris azul pálido). Los creadores de mundos lo cambian vía `fogColourOverride` (hex). Con modo niebla 0 (NONE), **fogColour llega negro**. La forma estándar `bloxdApplyFog(col, l)` es segura pues el color de niebla no se usa con fogAlpha 0. La API de script tiene además dos opciones, `fogChunkDistanceOverride` y `fogOnSkybox`: los juegos personalizados pueden fijar por separado la distancia de niebla (el valor D) y la aplicación de niebla al skybox. Por defecto el skybox no es afectado por la niebla (solo en juegos con `fogOnSkybox` activado el skybox también se tiñe con el color de niebla).

Ajustar `showFog` a false del lado del jugador empuja la niebla a 3200–3232 bloques, desactivándola de hecho (`fogAlpha ≈ 0` sigue llegando).

## Banda de borde de carga — fogAlpha como "borde del mundo"

Enfría en silencio solo la banda de 32 bloques del borde de carga para disimular el fin del mundo (o enfatizarlo como efecto). Sin distancia autocalculada: sigue automáticamente los ajustes de distancia de carga del jugador.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogAlpha: 0 = dentro (margen al borde), 1 = a punto de salir del borde
    let edge = l.fogAlpha;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```
