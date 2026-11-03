# Interioridades de la niebla



El cómputo de niebla es siempre modo LINEAR (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), con `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = ajuste de niebla; solo D = 0 es especial con fogEnd = 5). **La banda de gradiente es de solo 32 bloques**, y `(1.0 - l.fogAlpha)` es menos "bruma por distancia" que **distancia normalizada al borde del mundo cargado**. Varía por jugador con la distancia de carga: los efectos por distancia deben calcular `distance(l.position, bloxdEyePosition())` ellos mismos (receta R-B). (Nota de v3: la función de niebla del renderizador implementa en realidad **cuatro** modos — off / exponencial / exponencial al cuadrado / lineal — con los títulos distribuidos activando el lineal; el código fuente restaurado y el argumento de robustez están en la [Parte IX](../history/v3.md) §50.)

Color de niebla por defecto `rgb(183, 191, 195)` (gris azul pálido). Los creadores de mundos lo cambian vía `fogColourOverride` (hex). Con modo niebla 0 (NONE), **fogColour llega negro**. La forma estándar `mix(l.fogColour, col, (1.0 - l.fogAlpha))` es segura pues el color de niebla no se usa a fogVisibility 1. La API de script tiene además dos opciones, `fogChunkDistanceOverride` y `fogOnSkybox`: juegos personalizados pueden fijar a la vez la distancia de niebla (el valor D) y la aplicación de niebla al skybox. Por defecto el skybox no es afectado por la niebla (solo en juegos con `fogOnSkybox` activado el skybox también se tiñe con el color de niebla).

Ajustar `showFog` a false empuja la niebla a 3200–3232 bloques, desactivándola de hecho (`fogVisibility ≈ 1` sigue viniendo).

## R-B. Banda de borde de carga — fogVisibility como "borde del mundo"

Enfría en silencio solo la banda de 32 bloques del borde de carga para disimular el fin del mundo (o enfatizarlo como efecto). Sin distancia autocalculada: sigue auto los ajustes de distancia de carga del jugador.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = dentro (margen al borde), 0 = a punto de salir del borde
    let edge = 1.0 - (1.0 - l.fogAlpha);
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```
