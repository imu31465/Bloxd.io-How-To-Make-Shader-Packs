# Emisión

> API objetivo: 5 · Build objetivo: `xkg8x` (2026-11-04, producción) · Estado: Verified (portado a la API actual — se recomienda reverificar en el dispositivo)

> `emission` se suma tras el cálculo de iluminación, pero el proceso por defecto **lo atenúa con la cantidad de niebla (`fogAlpha`). En distancia totalmente anegada la emisión también desaparece. Para mantener brillo a lo lejos, no sumes a emission — suma directamente como `out.colour += ...` dentro del hook light** (la salida por defecto ya lleva niebla, así que a lo lejos la luz cae sobre el color de niebla)

## Lámparas pulsantes (antorchas que respiran)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let pulse = 0.5 + 0.5 * sin(bloxdSeconds() * 2.3 + l.position.x * 0.8);
        out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
}
    return out;
}
```

## Aspecto de mena luminosa (los materiales claros emiten)

```wgsl
// lado surface: cuanto más claro (blanco) el material, más emisión
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

## Enjambre de luciérnagas (puntos de luz a la deriva)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // unos "orbes de luz" a la deriva lenta; brillo por inverso de distancia
    let t = bloxdSeconds() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdSeconds() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```
