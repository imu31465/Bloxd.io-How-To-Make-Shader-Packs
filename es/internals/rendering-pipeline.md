# Canalización de renderizado

> API objetivo: 5 · Build objetivo: `ab90qa` (2026-11-03, producción) · Estado: Analyzed (análisis del paquete de producción a nivel de JavaScript)

- **Los hooks surface corren "antes" de alphaTest**: `out.alpha` alimenta el test de descarte directamente. Los materiales cutout (hierba, hojas) permiten efectos de disolución tipo dither (receta R-C). En líquidos (mezclado) `out.alpha` es la transparencia real (receta R-D). Sin efecto en terreno opaco normal — no confundir
- **Contenido de `l.ambient`**: `material.ambient × sceneAmbient`, distinto por material. El lado escena ata al ajuste gráfico "Ambient Lighting Intensity" (defecto 0.5) — nunca programes defectos fijos
- **`bloxdSeconds()` es realmente `performance.now()`**: el uptime del navegador envuelto a 1 hora. Sin relación con día/noche del juego ni tiempo de mundo transcurrido. Para animar sincronizado a un reloj de juego, estima la hora desde el azimut `bloxdSunDirection()` en mundos con ciclo día/noche
- **Las luces direccionales de la escena son un montaje de 2**: la suma Lambert de la luz principal (dirección desde la posición solar del ajuste de cielo, intensidad 1.0) y la luz de relleno (dirección `[-0.5, -1, -1]`, intensidad 0.35) llega a `l.directional`. La luz de relleno apunta hacia abajo, así que no aporta a las caras superiores y recoge las superficies orientadas hacia abajo (techos de cueva etc.). El terreno solo considera las luces añadidas en `_initScene`; las luces añadidas a la escena tras el arranque son ignoradas por terreno y modelos de bloque (un mensaje de advertencia oficial lo dice así)
- **Las funciones de cabecera leen un solo uniform**: el motor coloca el uniform de 64 bytes `bloxdPackInputs` en `@group(3) @binding(0)` (5 slots — seconds / lit / renderOffset / sunDirection / eyePosition, little-endian), y `bloxdSeconds()` / `bloxdLit()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` corresponden a leer esos slots ([Formato del paquete: uniform por fotograma](../api/pack-format.md#uniform-por-fotograma-bloxdpackinputs)). Los paquetes no pueden escribir este uniform, y como el WGSL del paquete y el del motor se fusionan en un solo módulo, declarar el mismo group/binding por tu cuenta también es imposible. `@group(3) @binding(1)` lleva la textura de profundidad de escena de líquidos, y `@binding(2)` el búfer de almacenamiento `bloxdSpTextureLayers`
- **Los datos de vértice los construye el mesher (Web Worker)**: el terreno de bloques viaja intercalado a 28 bytes por vértice (32 bytes con el atlas activado) — position = float32×3 / normal = enteros de 8 bits con signo ×4 / colour = enteros de 8 bits normalizados ×4 (la sustancia de `s.colour` — tint × AO queda horneado en 8 bits en la etapa del mesher, con lo que separarlo o restaurarlo desde el paquete es imposible en principio) / UV = float32×2 / atlasIndex = float32. Solo los niveles de luz viajan en un buffer de vértice aparte de 4 bytes (valores medidos: [Registro de datos del motor](engine-data.md)). Los vértices se dibujan con instancing por chunk
- Los finos dameros en bordes de chunk al cargar son el fundido de chunk por dither Bayer 4×4 en espacio de pantalla del motor, no bugs del paquete (desactivable por el ajuste gráfico `chunkFadeIn`)
- **`mod` es palabra reservada**: rechazado con `pack.wgsl:3 'mod' is a reserved word in WGSL.` Escribe restos con el operador `%`

## R-C. Disolución por dither Bayer — out.alpha controla discard

Reproduce la **misma tabla Bayer 4×4** que el motor usa en fundidos de chunk, disolviendo cutouts desde bloques bajos hacia arriba. discard se activa en materiales alphaTest (hierba, hojas); en líquidos es transparencia de mezcla.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod es reservado: usa el operador %
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // se disuelve desde bloques bajos; mayor dissolve persiste
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

## R-D. Fundido de agua cercana a cámara — el alpha líquido despeja la vista

El `out.alpha` del hook líquido alimenta la mezcla directamente. Despeja solo la superficie bajo la cámara para asegurar la vista al bucear o con cámara sobre el agua.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 bloques de transparente total a normal
    #endif
    return out;
}
```
