# Consejos de depuración



- Cuevas muy claras → falta curva no lineal de `skyLight` (receta de cuevas R2 / R9.9)
- Días quemados → baja la exposición pre-ACES
- Noches demasiado oscuras → asegura ambiente mínimo (el `skyLightColour` nocturno es casi negro por premisa)
- Distancia con demasiada bruma → baja coeficientes aéreos
- Todo naranja en torno a antorchas → baja la proporción cálida (conserva algo de luz cruda teñida)
- Bloques casi todo blancos → el total de salida del hook light supera 1.0 (sin clamp aguas abajo). Termina con `clamp(col, vec3f(0.0), vec3f(1.0))`
- Blanco sin sumas → inversión un-fog por división con fogVisibility. Quita un-fog; reconstruye desde `s.colour` y `mix` de niebla una sola vez al final
- Bloques emisivos no brillan → falta re-suma de emission en recetas de reconstrucción. Suma `+ s.emission * (1.0 - l.fogAlpha)`
- De noche solo quedan caras iluminadas → no oscurezcas solo sombras; atenúa todo el color terminado (`engineColour`) de noche. Para conservar lámparas locales, atenúa menos con `blockLight` / `heldLight` ([Parte VI](../guides/), sección 19)
- La sombra no se profundiza con `pow(skyLight, γ)` → `l.skyLight` es post-curva (sección 10). Cambia a inversión + umbral de R9.12
- Ajustar área/densidad de sombra → guía de ajuste de R9.12 (área = umbral `shTh` / borde = `shSoft` / oscuridad del núcleo = doble ajuste de ambiente mínimo y dispersión del cielo)
