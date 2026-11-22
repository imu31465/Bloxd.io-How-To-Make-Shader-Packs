# El sol y la luna

> API objetivo: 5 · Tipo: referencia técnica

`bloxdSunDirection()` lee un búfer con la dirección del sol, que solo se actualiza cuando cambia el tipo de skybox. La condición decisiva no es si el cielo muestra un sol, sino **si el skybox es de tipo `earth`**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (cielo procedural) | Distinto de cero (valor predeterminado más abajo) |
| `gloomy` / `interstellar` / `space_*` (texturas cubo) | **Siempre (0,0,0)** |

**La luna está siempre en `-bloxdSunDirection()`** (el motor calcula la posición lunar como el opuesto exacto del sol). La noche se juzga por altura solar — hay luna arriba cuando `bloxdSunDirection().y < 0` (sol bajo el horizonte). Pero en mundos por defecto el sol está estático y la luna también — solo los mundos con ciclo día/noche la ven moverse.

La dirección solar por defecto ronda `(-0.56, 0.81, -0.18)` (vector unitario de `inclination` = −0.2 / `azimuth` = 0.55, estático). Referencia útil para estimar la dirección de los reflejos al probar packs.

El motor no incorpora un ciclo día/noche. `inclination` permanece estático; los mundos que implementan un ciclo dinámico actualizan ese valor desde la lógica del juego. `bloxdSunDirection()` refleja cada actualización.

La iluminación direccional del terreno se limita a dos fuentes creadas al iniciar la escena. Su **dirección e intensidad permanecen constantes tanto de día como de noche**. En otras palabras, la iluminación del terreno no cambia con la hora; la apariencia diurna o nocturna depende únicamente del skybox y de `bloxdSunDirection()`. Por eso, los packs que oscurecen el terreno por la noche deben estimar la hora a partir de `bloxdSunDirection()`, como en la técnica `sunPresent` de [Diseñar looks nocturnos](../guides/night.md).

## R-A. Luz de luna

Añade Lambert blanco-azulado y especular débil solo mientras la luna está arriba. `moonUp` es 0 en mundos de sol estático por defecto: allí no pasa nada — **luz lunar que solo se activa en mundos con ciclo día/noche, por lo que solo se activa en mundos con ciclo día/noche**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // la luna está siempre exactamente opuesta al sol; auto-off diurno vía moonDir.y < 0
        let moonDir = -bloxdSunDirection();
        let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
        if (moonUp > 0.0) {
            let n     = normalize(l.normal);
            let diff  = max(0.0, dot(n, moonDir));
            let view  = normalize(bloxdEyePosition() - l.position);
            let halfV = normalize(moonDir + view);
            let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
            out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
        }
    }
    return out;
}
```
