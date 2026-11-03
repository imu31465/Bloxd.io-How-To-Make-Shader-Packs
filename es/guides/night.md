# Corregir "sombras oscuras pero superficies brillantes" de noche



Oscurecer solo sombras deja el color terminado (`engineColour`) brillante sin sol, y el salto cara/sombra se vuelve antinatural. Atenúa todo el color terminado.

El ejemplo trata `bloxdSunDirection()` cero como noche y sol direccional como día, atenuando los colores terminados del terreno en horas oscuras. Donde `blockLight` y `heldLight` son fuertes, la atenuación se debilita para preservar lámparas cercanas como antorchas. `0.52` es un valor de ajuste — bájalo para noches más oscuras.

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

**Límites de esta corrección:** si `bloxdSunDirection()` se comporta como "dirección unitaria con sol, cero sin él", día/noche se distinguen pero el ocaso no se estima suavemente. Y como atenúa el color terminado, debilita juntos la luz diurna y el ambiente del motor — no es una reproducción total del horario. Para aplicar lo mismo a líquidos, revisa la relación de reserva de hooks de líquido.
