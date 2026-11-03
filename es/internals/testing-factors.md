# Qué cambia los valores visibles para los paquetes

> API objetivo: 5 · Build objetivo: `ab90qa` (2026-11-03, producción) · Estado: Analyzed (análisis del paquete de producción a nivel de JavaScript)

El mismo paquete renderiza distinto según **mundo y ajustes de jugador**. Revisa al menos estos 3 entornos antes de distribuir:

1. **Mundo normal** (skybox default, sin overrides) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, colores por defecto
2. **Mundo con skybox espacial** — bloxdSunDirection() = 0. El look de la rama `sunPresent`
3. **Mundo personalizado con `visionMinLightColour` / `skyLightColourOverride`** — oscuros elevados y colores

Fuentes principales de variación: `lightingOverride` (iluminación forzada) / `skyLightColourOverride`, `ambientLightColourOverride` (cambios hex) / `visionMinLightColour` (suelo "color más oscuro visible". Implementado como max por componentes contra `uSkyLightColour` y `uAmbientLightColour`; Night Vision lo usa — los paquetes "cueva a oscuras" no oscurecen lo previsto, y el color del cielo en sí se eleva) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (presencia de bloxdSunDirection()). `uSkyLightColour` por defecto = (1,1,1) blanco, `uAmbientLightColour` por defecto = (0.25,0.25,0.30). `l.ambient` lado escena = ajuste gráfico "Ambient Lighting Intensity" (defecto 0.5). `(1.0 - l.fogAlpha)` sigue los ajustes de niebla/distancia de chunks del jugador. Además `cameraTint` (tinte RGBA sobre toda la pantalla) y `proximityFadeDistance` / `proximityFadeMinOpacity` (fundido de proximidad de cámara para entidades) son factores de variación por ajustes de mundo — `cameraTint` en particular es un pase de composición final aplicado **sobre** la salida del paquete. Muchos de estos se fijan también vía la API de script (`serverOption`) y pueden actualizarse con la partida en marcha.
