# Cómo funciona la iluminación

> API objetivo: 5 · Build objetivo: `v98qt8` (2026-11-08, producción y preprod) · Estado: Verified (portado a la API actual — se recomienda reverificar en el dispositivo)

La iluminación por defecto del motor es "solo multiplicación" — no existen especular, fresnel, separación cálido/frío ni ambiente hemisférico. Lo siguiente se puede reconstruir:

| Función | Por defecto | ¿Construible en paquetes? |
|---|---|---|
| Difuso (Lambert) | Solo suma escalar de direccionales | ◎ Propio con `bloxdSunDirection()` (caída envuelta etc.) |
| Especular | Ninguno | ◎ Blinn-Phong (R9.2) |
| Fresnel | Ninguno | ◎ Aproximación de Schlick (R9.3) |
| Separación antorcha cálida / cielo frío | Sin color | ◎ (R9.1) |
| Ambiente hemisférico | Sin dirección | ◎ Cielo arriba / suelo abajo (R9.4) |
| Mapeo de tonos | Ninguno (solo clamp) | ◎ ACES fílmico (R9.5) |
| Perspectiva aérea | Solo niebla (reemplazo de color) | ◎ Desaturación con distancia (R9.6) |
| Detalle de superficie | Solo resolución de textura | △ Micro-relieve procedural con hash (R9.8) |
| Ondas de vértice (agua) | Ninguna (plano) | ◎ Solo allow (R7) |
| Normales de ola / destello solar | Ningunas | ◎ (R9.7) |
| Luz lunar nocturna | El color del cielo solo oscurece | △ Sin entrada de dirección lunar, así que solo looks pseudo (ambiente azul en R2 / desaturación en R9.11) |
| Sombras (oclusión de cielo) | Solo mezcla suave vía `mix(ambiente, cielo, skyLight)` | ◎ Inversión del realce + corte por umbral + puerta solar (R9.12). La sombra de árboles y bajo techos cae claramente, siguiendo ediciones de bloques en tiempo real |
