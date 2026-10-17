[← Parte anterior](03-recipes.md)·[Volver al manual](README.md)·[Parte siguiente →](05-troubleshooting.md)

# Parte IV: Guía de realismo

## 13. Iluminación por defecto del motor y margen para el realismo

La iluminación por defecto del motor es "solo multiplicación" — no existen especular, fresnel, separación cálido/frío ni ambiente hemisférico. Lo siguiente se puede reconstruir:

| Función | Por defecto | ¿Construible en paquetes? |
|---|---|---|
| Difuso (Lambert) | Solo suma escalar de direccionales | ◎ Propio con `bloxdSunDirection()` (fuentes envueltas etc.) |
| Especular | Ninguno | ◎ Blinn-Phong (R9.2) |
| Fresnel | Ninguno | ◎ Aproximación de Schlick (R9.3) |
| Separación antorcha cálida / cielo frío | Sin color | ◎ (R9.1) |
| Ambiente hemisférico | Sin dirección | ◎ Cielo arriba / suelo abajo (R9.4) |
| Mapeo de tonos | Ninguno (solo clamp) | ◎ ACES fílmico (R9.5) |
| Perspectiva aérea | Solo niebla (reemplazo de color) | ◎ Desaturación con distancia (R9.6) |
| Detalle de superficie | Solo resolución de textura | △ Micro-relieve procedural con hash (R9.8) |
| Ondas de vértice (agua) | Ninguna (plano) | ◎ Solo allow (R7) |
| Normales de ola / destello solar | Ningunas | ◎ (R9.7) |
| Luz lunar nocturna | El color del cielo solo oscurece | △ La dirección lunar está en `-bloxdSunDirection()`: pseudo looks (ambiente azul en R2 / desaturación en R9.11) más luz lunar direccional (R-A, solo ciclo día/noche) |
| Sombras (oclusión de cielo) | Solo mezcla suave vía `mix(ambiente, cielo, skyLight)` | ◎ Inversión del realce + corte por umbral + puerta solar (R9.12). La sombra de árboles y bajo techos cae claramente, siguiendo ediciones de bloques en tiempo real |

## 14. Dos escuelas de implementación

**Escuela A: retoques aditivos (desde defaultLight)** — usa `engineColour` (color terminado) como base y suma brillo cálido o rim. Fácil y seguro, pero el modelo de iluminación sigue siendo el por defecto.

**Escuela B: reiluminación total (desde s.colour)** — descarta `l.engineColour` y reconstruye la iluminación desde `s.colour` (albedo) y materiales LightIn crudos. El camino real al realismo. Cuatro reglas:

1. **Reaplica la niebla**: el hook light se ejecuta tras la niebla; aplica `mix(l.fogColour, col, l.fogVisibility)` tú mismo (R9.10). Con niebla densa, pon suelo con `max(l.fogVisibility, 0.3)`. Y al revés: mezclar más color de niebla en paquetes basados en engineColour produce doble niebla blanca
2. **Reserva unlit**: pasa a `defaultLight` fuera de `#ifdef BLOXD_LIGHTING`
3. **Protege funciones compartidas enteras**: envuelve en `#ifdef BLOXD_LIGHTING` como funciones completas las funciones compartidas que toman `BloxdLightIn` (proteger solo llamadas no basta)
4. **Sin dirección solar**: si `bloxdSunDirection()` es cero, no calcules especular direccional. `l.directional` es un escalar de cantidad de luz, no un vector de dirección: no restaura la dirección del brillo. Cambia a ambiente débil sin dirección si hace falta. La dirección lunar está disponible vía `-bloxdSunDirection()` (solo se mueve en mundos con ciclo día/noche. [Parte VII](07-internals.md) R-A)

## 15. Looks inalcanzables (el "techo" del realismo)

| Look | Motivo |
|---|---|
| Mapas de sombras pixelados (sombras que rotan con el sol, penumbra) | Las texturas de profundidad no se pueden referenciar (`bloxdOpaqueBehind()` limitado a líquidos es solo geometría y no sirve como mapa de sombras). La oclusión de rayos no llega a los hooks |
| SSAO | Sin acceso a profundidad de escena (solo AO de vértices del mesher; la profundidad limitada a líquidos no sirve para SSAO) |
| SSR (reflejos) | Sin color de escena. Solo pseudo looks mezclando color de cielo vía fresnel |
| Bloom / glare | Sin hook al posprocesado |
| Profundidad de campo, aberración cromática, grano | Requieren posprocesado de pantalla completa |
| Luz volumétrica (god rays) | Igual |
| Texturas PBR | Lecturas de textura prohibidas. Solo pseudo estimación desde luminancia de color |
| Refracción submarina | Sin color de escena. La profundidad limitada a líquidos (`bloxdOpaqueBehind()`) permite absorción por grosor y proyección de fondo ([Parte VIII](08-apiv2.md) R-E) |
| Velo submarino (tinte azul): quitar / cambiar | El velo es un quad emissive de pantalla completa generado del color/alpha de definición del bloque líquido de la cámara, dibujado fuera de los pipelines de hook (delante del todo): el paquete no puede cambiar ni color ni densidad |
| Detección directa submarina | Ninguna entrada indica sumersión de cámara, y fogStart / fogEnd / fogColour no cambian bajo el agua: tampoco hay forma fiable de estimarlo desde fogVisibility etc. |

### La verdad sobre las sombras — las "sombras de árboles" sí se pueden hacer

Solo los **mapas de sombras pixelados que rotan con el sol** son imposibles en la tabla. El motor ya calcula "sombras" desde el inicio, y eso es `skyLight`. El LightEngine del lado de malla usa un algoritmo estilo Minecraft:

1. **Escaneo de columnas**: recorre cada columna (x,z) de arriba abajo. La luz del cielo empieza en 15, se vuelve **0 en bloques opacos**, atenuando al bajar con `lightFilter` (aire 1 / agua 3 / opaco 15)
2. **Relleno BFS**: se expande lateralmente a 6 vecinos (-1 por bloque) — esto suaviza los bordes de sombra. El valor crudo bajo oclusión de radio r es (15-r)/15
3. blockLight (antorchas etc.) es un BFS separado de 3 canales RGB (empaquetado 4bit)

Así que `l.skyLight` no es un mero parámetro de brillo sino **dato de oclusión por vóxeles de "si el cielo es visible desde aquí" = un mapa de sombras**. Bajo árboles, bajo techos e interiores ya es numéricamente bajo, llegando suavizado por interpolación de vértices. Colocar/romper bloques recalcula al instante = **sombras que siguen en tiempo real**. Vanilla solo lo usa "suavemente" vía `mix(ambiente, cielo, skyLight)`.

Las herramientas correctas son los dos pasos de R9.12 (**restaurar valores crudos vía inversión del realce → binarizar con umbral `smoothstep`**. `th = 1 - r/15` marca directamente el "radio de oclusión tratado como sombra") más **abrir el sol directo con sky** (el sol solo llega donde el cielo es visible = la esencia de la proyección), con tinte cálido en sol / frío en sombra.

**Límites honestos**: estas sombras usan como base "el cielo hacia arriba", así que **no rotan cuando el sol se mueve**. La resolución es por bloque (los bordes suaves vienen de la dispersión BFS). La plantilla de iluminación aún contiene un stub cerrado `var shadow: f32 = 1.;` para mapas de sombras (siempre 1.0 = desactivado) — interpretado como rastro de sombras rotatorias pixeladas "planificadas". Si esas sombras son imprescindibles, solo quedan vías fuera de la API (p. ej. inyección GLSL por userscript, con riesgo de política).

### Realidad submarina

Los looks submarinos constan de 3 capas:

| Capa | Contenido | Operable desde paquetes? |
|---|---|---|
| ① Render de terreno/líquido | Procesable por hooks. Los hooks light se llaman con normalidad bajo el agua | Sí (funciona "bajo el velo") |
| ② Velo de definición líquida | Quad emissive de pantalla completa del color/alpha de definición del bloque líquido de la cámara, dibujado delante del todo. El ajuste `cameraTint` gana si existe | No (ni color ni densidad cambiables) |
| ③ cameraTint | Ajuste del juego | No |

Puntos prácticos: los paquetes siguen funcionando bajo el agua / el velo no se puede quitar / bajo el agua no se puede ramificar (fogStart / fogEnd / fogColour no cambian bajo el agua: fogVisibility tampoco lo detecta).

## 16. Consejos de depuración

- Cuevas muy claras → falta curva no lineal de `skyLight` (receta de cuevas R2 / R9.9)
- Días quemados → baja la exposición pre-ACES
- Noches demasiado oscuras → asegura ambiente mínimo (el `skyLightColour` nocturno es casi negro por premisa)
- Distancia con demasiada bruma → baja coeficientes aéreos
- Todo naranja en torno a antorchas → baja la proporción cálida (conserva algo de luz cruda teñida)
- Bloques casi todo blancos → el total de salida del hook light supera 1.0 (sin clamp aguas abajo). Termina con `clamp(col, vec3f(0.0), vec3f(1.0))`
- Blanco sin sumas → inversión un-fog por división con fogVisibility. Quita un-fog; reconstruye desde `s.colour` y `mix` de niebla una sola vez al final
- Bloques emisivos no brillan → falta re-suma de emission en recetas de reconstrucción. Suma `+ s.emission * l.fogVisibility`
- De noche solo quedan caras iluminadas → no oscurezcas solo sombras; atenúa todo el color terminado (`engineColour`) de noche. Para conservar lámparas locales, atenúa menos con `blockLight` / `heldLight` ([Parte VI](06-implementation.md), sección 19)
- La sombra no se profundiza con `pow(skyLight, γ)` → `l.skyLight` es post-curva (sección 10). Cambia a inversión + umbral de R9.12
- Ajustar área/densidad de sombra → guía de ajuste de R9.12 (área = umbral `shTh` / borde = `shSoft` / oscuridad del núcleo = doble ajuste de ambiente mínimo y dispersión del cielo)
