# Recetas de tiempo (animación)



> `bloxdSeconds()` se envuelve cada 3600 segundos (1 hora). Es tiempo transcurrido del sombreador sin garantía de sincronía con el día/noche del juego. Úsalo para animación periódica visual, pero prefiere `bloxdSunDirection()` y las entradas de iluminación para detectar la noche real.

## Ciclo día-noche (1 día por hora)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdSeconds() * 6.2831853 / 3600.0);   // 0..1 período de una hora; no necesariamente sincronizado con el día/noche del juego
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

## Oscilación (senos superpuestos)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

## Bandas de aurora / franjas fluorescentes

```wgsl
// mezcla 3 colores por posición XZ y tiempo
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```
