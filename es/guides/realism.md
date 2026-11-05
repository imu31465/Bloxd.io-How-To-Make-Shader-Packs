# Realismo: dos escuelas

> API objetivo: 5 · Build objetivo: `bny9u` (2026-11-05, producción) · Estado: Verified (portado a la API actual — se recomienda reverificar en el dispositivo)

**Escuela A: retoques aditivos (desde defaultLight)** — usa `engineColour` (color terminado) como base y suma brillo cálido o rim. Fácil y seguro, pero el modelo de iluminación sigue siendo el por defecto.

**Escuela B: reiluminación total (desde s.colour)** — descarta `l.engineColour` y reconstruye la iluminación desde `s.colour` (albedo) y materiales LightIn crudos. El camino real al realismo. Cuatro reglas:

1. **Reaplica la niebla**: el hook light se ejecuta tras la niebla; aplica `mix(l.fogColour, col, (1.0 - l.fogAlpha))` tú mismo (R9.10). Con niebla densa, pon suelo con `min(l.fogAlpha, 0.70)`. Y al revés: mezclar más color de niebla en paquetes basados en engineColour produce doble niebla blanca
2. **Fallback unlit**: pasa a `defaultLight` fuera de `#ifdef BLOXD_LIGHTING`
3. **Protege funciones compartidas enteras**: envuelve en `#ifdef BLOXD_LIGHTING` como funciones completas las funciones compartidas que toman `BloxdLightIn` (proteger solo llamadas no basta)
4. **Sin dirección solar**: si `bloxdSunDirection()` es cero, no calcules especular direccional. `l.directional` es un escalar de cantidad de luz, no un vector de dirección: no restaura la dirección del brillo. Cambia a ambiente débil sin dirección si hace falta. La dirección lunar está disponible vía `-bloxdSunDirection()` (solo se mueve en mundos con ciclo día/noche — [El sol y la luna](../internals/sun-and-moon.md))
