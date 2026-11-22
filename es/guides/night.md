# Diseñar looks nocturnos

> API objetivo: 5 · Build objetivo: `bbb6l5` (2026-11-20, producción y preprod) · Estado: Verified (portado a la API actual — se recomienda reverificar en el dispositivo)

Oscurecer solo sombras deja el color terminado (`engineColour`) brillante sin sol, y el salto cara/sombra se vuelve antinatural. Atenúa todo el color terminado.

El ejemplo interpreta `bloxdSunDirection() == 0` como noche y una dirección solar válida como día. Durante la noche, reduce la intensidad del color final del terreno. En las zonas con valores altos de `blockLight` y `heldLight`, reduce menos la intensidad para conservar la luz de fuentes cercanas, como las antorchas. `0.52` es un valor de ajuste — bájalo para noches más oscuras.

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

**Límites de este método:** `bloxdSunDirection()` proporciona la dirección del sol, por lo que la dirección de la luna se obtiene invirtiéndola (`-bloxdSunDirection()`). En los mundos predeterminados el sol permanece fijo, así que la luna tampoco se mueve; solo se mueve en mundos con ciclo día/noche. Si el valor solo indica una dirección unitaria o cero, permite distinguir el día de la noche, pero no representar suavemente el ocaso o el crepúsculo. Este ejemplo atenúa el color final del terreno, por lo que reduce a la vez la luz diurna y la ambiental del motor; no reproduce por completo la iluminación según la hora. Para aplicarlo a líquidos, revisa la relación de fallback de sus hooks.
