# Diseñar looks nocturnos

> API objetivo: 5 · Build objetivo: `bbb6l5` (2026-11-20, producción y preprod) · Estado: Verified (portado a la API actual — se recomienda reverificar en el dispositivo)

Oscurecer únicamente las sombras deja brillante el color final que produce el motor (`engineColour`) cuando no hay sol. Como resultado, el contraste entre las caras iluminadas y las zonas en sombra se ve poco natural. En lugar de modificar solo las sombras, atenúa el color final en su conjunto.

El ejemplo interpreta un vector `bloxdSunDirection()` igual a cero como noche y un vector no nulo como día, y reduce el color final del terreno durante las horas oscuras. Cuando `blockLight` o `heldLight` tienen valores altos, aplica una reducción menor para conservar fuentes de luz cercanas, como las antorchas. El valor `0.52` se puede ajustar: redúcelo para conseguir noches más oscuras.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    if (bloxdLit()) {
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
        let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
        let protectLocalLight = smoothstep(0.03, 0.35, localLight);
        scale = mix(nightDim, 1.0, protectLocalLight);
    }
    // atenúa el color terminado; suma la emisión del material con niebla por defecto
    out.colour = l.engineColour * scale + s.emission * (1.0 - l.fogAlpha);
    return out;
}
```

**Limitaciones:** si `bloxdSunDirection()` devuelve un vector unitario cuando hay sol y cero cuando no lo hay, este método permite distinguir el día de la noche, pero no estimar gradualmente el crepúsculo. Además, al reducir el color final, también atenúa a la vez la luz diurna y la iluminación ambiental del motor; no reproduce por completo los cambios de iluminación a lo largo del día. Para aplicar el mismo método a los líquidos, revisa el comportamiento de fallback de sus hooks.
