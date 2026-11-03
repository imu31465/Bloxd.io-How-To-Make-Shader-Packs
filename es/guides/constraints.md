# Looks inalcanzables (el "techo" del realismo)



| Look | Motivo |
|---|---|
| Mapas de sombras pixelados (sombras que rotan con el sol, penumbra) | Las texturas de profundidad no se pueden referenciar (`bloxdOpaqueBehind()` limitado a líquidos es solo geometría y no sirve como mapa de sombras). La oclusión de rayos no llega a los hooks |
| SSAO | Sin acceso a profundidad de escena (solo AO de vértices del mesher; la profundidad limitada a líquidos no sirve para SSAO) |
| SSR (reflejos) | Sin color de escena. Solo pseudo looks mezclando color de cielo vía fresnel |
| Bloom / glare | Sin hook al posprocesado |
| Profundidad de campo, aberración cromática, grano | Requieren posprocesado de pantalla completa |
| Luz volumétrica (god rays) | Igual |
| Texturas PBR | Lecturas de textura prohibidas. Solo pseudo estimación desde luminancia de color |
| Refracción submarina | Sin color de escena. La profundidad limitada a líquidos (`bloxdOpaqueBehind()`) permite absorción por grosor y proyección de fondo ([Parte VIII](../history/v2.md) R-E) |
| Velo submarino (tinte azul): quitar / cambiar | El velo es un quad emissive de pantalla completa generado del color/alpha de definición del bloque líquido de la cámara, dibujado fuera de los pipelines de hook (delante del todo): el paquete no puede cambiar ni color ni densidad |
| Detección directa submarina | Ninguna entrada indica sumersión de cámara, y fogStart / fogEnd / fogColour no cambian bajo el agua: tampoco hay forma fiable de estimarlo desde fogVisibility etc. |

## La verdad sobre las sombras — las "sombras de árboles" sí se pueden hacer

Solo los **mapas de sombras pixelados que rotan con el sol** son imposibles en la tabla. El motor ya calcula "sombras" desde el inicio, y eso es `skyLight`. El LightEngine del lado de malla usa un algoritmo estilo Minecraft:

1. **Escaneo de columnas**: recorre cada columna (x,z) de arriba abajo. La luz del cielo empieza en 15, se vuelve **0 en bloques opacos**, atenuando al bajar con `lightFilter` (aire 1 / agua 3 / opaco 15)
2. **Relleno BFS**: se expande lateralmente a 6 vecinos (-1 por bloque) — esto suaviza los bordes de sombra. El valor crudo bajo oclusión de radio r es (15-r)/15
3. blockLight (antorchas etc.) es un BFS separado de 3 canales RGB (empaquetado 4bit)

Así que `l.skyLight` no es un mero parámetro de brillo sino **dato de oclusión por vóxeles de "si el cielo es visible desde aquí" = un mapa de sombras**. Bajo árboles, bajo techos e interiores ya es numéricamente bajo, llegando suavizado por interpolación de vértices. Colocar/romper bloques recalcula al instante = **sombras que siguen en tiempo real**. Vanilla solo lo usa "suavemente" vía `mix(ambiente, cielo, skyLight)`.

Las herramientas correctas son los dos pasos de R9.12 (**restaurar valores crudos vía inversión del realce → binarizar con umbral `smoothstep`**. `th = 1 - r/15` marca directamente el "radio de oclusión tratado como sombra") más **abrir el sol directo con sky** (el sol solo llega donde el cielo es visible = la esencia de la proyección), con tinte cálido en sol / frío en sombra.

**Límites honestos**: estas sombras usan como base "el cielo hacia arriba", así que **no rotan cuando el sol se mueve**. La resolución es por bloque (los bordes suaves vienen de la dispersión BFS). La plantilla de iluminación aún contiene un stub cerrado `var shadow: f32 = 1.;` para mapas de sombras (siempre 1.0 = desactivado) — interpretado como rastro de sombras rotatorias pixeladas "planificadas". Si esas sombras son imprescindibles, solo quedan vías fuera de la API (p. ej. inyección GLSL por userscript, con riesgo de política).

## Realidad submarina

Los looks submarinos constan de 3 capas:

| Capa | Contenido | Operable desde paquetes? |
|---|---|---|
| ① Render de terreno/líquido | Procesable por hooks. Los hooks light se llaman con normalidad bajo el agua | Sí (funciona "bajo el velo") |
| ② Velo de definición líquida | Quad emissive de pantalla completa del color/alpha de definición del bloque líquido de la cámara, dibujado delante del todo. El ajuste `cameraTint` gana si existe | No (ni color ni densidad cambiables) |
| ③ cameraTint | Ajuste del juego | No |

Puntos prácticos: los paquetes siguen funcionando bajo el agua / el velo no se puede quitar / bajo el agua no se puede ramificar (fogStart / fogEnd / fogColour no cambian bajo el agua: fogVisibility tampoco lo detecta).
