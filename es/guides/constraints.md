# Qué pueden y qué no pueden hacer los paquetes de sombreadores

> API objetivo: 5 · Build objetivo: `v98qt8` (2026-11-08, producción y preprod) · Estado: Verified (portado a la API actual — se recomienda reverificar en el dispositivo)

El techo de realismo de los paquetes de sombreadores en una página: hasta dónde llega la API actual, qué no puede hacer por principio, qué es condicional, por qué existen los límites y los sustitutos más cercanos. Valora aquí un look antes de construirlo.

## Qué puede hacer la API actual

- **Colores, transparencia y emisión, por cara** — los tres hooks de `Surface` devuelven color (más alpha y emisión condicionales) para terreno, líquidos y modelos
- **Una reiluminación completa** — los tres hooks de `Light` y la API de iluminación (`bloxdShading()` / `bloxdWorldLight()` / `bloxdLitColour()`) exponen la propia receta del motor como funciones componibles ([Iluminación](../api/lighting.md))
- **Sombras de estilo proyectado que siguen las ediciones de bloques en tiempo real** — `skyLight` es dato de oclusión de cielo por vóxel; la inversión del realce + corte por umbral lo convierte en sombras nítidas bajo árboles y techos ([Sombras](shadows.md))
- **Leer las texturas del propio juego** — `bloxdTexel()` muestrea el atlas de texturas de bloques y las texturas de los modelos exactamente como lo hace el sampler del motor ([API de texturas](../api/texture-api.md))
- **Efectos por modelo** — `flags` te dice "esto es un ítem en mano", "esto es un ítem tirado", "esto es un jugador", "esto es una losa" ([Flags](../api/flags.md)); `localPosition` da coordenadas locales de modelo ([Estructuras](../api/structures.md))
- **Destellos de encantamiento y superposiciones de destello de daño** — `enchantTier` / `enchantColour` / `enchantSpeed` y `overlayColour` son legibles y sobrescribibles ([Efectos de encantamiento](../recipes/enchant-effects.md))
- **Tiempo y animación** — `bloxdSeconds()`, la posición de mundo y la dirección del sol mueven las cosas ([Tiempo y animación](../recipes/animation.md))

## Qué no puede hacer la API actual

| Look | Motivo |
|---|---|
| Mapas de sombras con precisión de píxel (sombras que siguen al sol, penumbra) | Las texturas de profundidad no se pueden referenciar (`bloxdOpaqueBehind()`, exclusivo de líquidos, es solo geometría y no sirve como mapa de sombras). La oclusión de rayos de luz no llega a los hooks |
| SSAO | Sin acceso a profundidad de escena (solo el AO de vértices horneado por el mesher; la profundidad exclusiva de líquidos no sirve para SSAO) |
| SSR (reflejos) | Sin color de escena. Solo looks pseudo mezclando color de cielo vía fresnel |
| Bloom / glare | Sin hook al posprocesado |
| Profundidad de campo, aberración cromática, grano | Requieren posprocesado de pantalla completa |
| Luz volumétrica (god rays) | Igual |
| Mapas PBR propios (texturas de normal / roughness / metalness) | Los paquetes no pueden añadir texturas propias — la API solo *lee* las texturas existentes del juego vía `bloxdTexel()`, y son texturas de color plano sin canales PBR. Una respuesta pseudo-PBR solo puede estimarse desde la luminancia del color más `flags` ([API de texturas](../api/texture-api.md)) |
| Refracción submarina | Sin color de escena. La profundidad exclusiva de líquidos (`bloxdOpaqueBehind()`) permite absorción por grosor y proyección de fondo ([Hacer que el agua parezca natural](water.md)) |
| Quitar o cambiar el velo submarino (tinte azul) | El velo es un quad emissive de pantalla completa generado del color/alpha de definición del bloque líquido en que está la cámara, dibujado fuera de los pipelines de hook (delante del todo), así que los paquetes no pueden cambiar ni su color ni su densidad |
| Detección submarina directa | Ninguna entrada indica sumersión de cámara, y fogStart / fogEnd / fogColour no cambian bajo el agua, así que no hay forma fiable de estimar el estado submarino desde fogAlpha etc. |
| Cambiar el cielo, las nubes o el propio disco solar | Los hooks corren por cara sobre la geometría de terreno / líquido / modelo; el skybox no forma parte de ningún pipeline de hook |

## Capacidades condicionales

- **Animación de vértices y `discard`** — solo en juegos cuya definición lleva `shaderPackPolicy: "allow"`; en el resto `BLOXD_STRICT` compila esos hooks fuera ([Política de shader packs por juego](../internals/policy.md))
- **Profundidad de escena (`bloxdOpaqueBehind()`)** — solo hooks de líquido, y necesita `BLOXD_SCENE_DEPTH`; los hooks de terreno y modelo no tienen acceso a profundidad ([Funciones](../api/functions.md))
- **`bloxdTexel()` / `bloxdTextureSize()`** — solo hooks de surface y light, y solo donde el pipeline tiene textura; las configuraciones sin textura los compilan como stubs que devuelven blanco ([API de texturas](../api/texture-api.md))
- **Alpha de terreno (`BLOXD_ALPHA`)** — solo donde la variante lo define ([Variantes y guardias](../getting-started/variants.md))

## Por qué existen estos límites

Cuatro entradas que un sombreador de posprocesado "real" necesitaría faltan estructuralmente:

1. **Sin color de escena** — los hooks corren mientras se dibuja cada cara; no hay textura de framebuffer que leer, así que SSR, refracción y todo lo derivado de "qué hay detrás de mí" no se pueden calcular
2. **Sin profundidad de escena** — salvo la sonda geométrica `bloxdOpaqueBehind()` exclusiva de líquidos; SSAO y mapas de sombras necesitan un búfer de profundidad completo
3. **Sin etapa de posprocesado** — ningún hook corre después de componer el fotograma, así que bloom, DOF, aberración, grano y god rays no tienen punto de entrada
4. **Sin acceso al cielo** — el skybox, las nubes y el disco solar se dibujan fuera de los pipelines de hook, y ninguna entrada los describe más allá de `bloxdSunDirection()`

El velo submarino es un caso especial de la misma estructura: es un quad emissive de pantalla completa dibujado delante del todo, generado desde la definición del bloque líquido en que está la cámara — fuera de todo pipeline de hook.

## Sustitutos más cercanos

| Buscado | Enfoque más cercano desde el paquete |
|---|---|
| Reflejos | Mezcla ponderada por fresnel hacia un color tipo cielo + destello solar ([Hacer que el agua parezca natural](water.md)) |
| Materiales PBR | Estimación de especular/roughness por luminancia + clases de material por `flags` ([Colores](../recipes/colors.md), [Realismo](../recipes/realism.md)) |
| Bloom / glow | Salida de emission — brillo genuinamente aditivo, pero por cara, no un desenfoque de posprocesado ([Emisión](../recipes/emission.md)) |
| Oclusión ambiental | El AO de vértices horneado por el mesher ya va en `surface.colour`; el oscurecido por skyLight sirve de AO a gran escala ([Sombras](shadows.md)) |
| Absorción por profundidad del agua | Grosor vía `bloxdOpaqueBehind()` + proyección de fondo en hooks de líquido ([Líquidos](../recipes/liquids.md)) |
| Ambiente submarino | Acepta el velo; estiliza lo visible a través de él (terreno/líquido siguen renderizando con normalidad bajo el agua) |

## La verdad sobre las sombras — las "sombras de árboles" sí se pueden hacer

Solo los **mapas de sombras con precisión de píxel que siguen al sol** son imposibles en la tabla de arriba. El motor ya calcula "sombras" desde el inicio, y eso es `skyLight`. El LightEngine del lado de malla ejecuta un algoritmo estilo Minecraft:

1. **Escaneo de columnas**: recorre cada columna (x,z) de arriba abajo. La luz del cielo empieza en 15, se vuelve **0 en bloques opacos**, atenuando al bajar con `lightFilter` (aire 1 / agua 3 / opaco 15)
2. **Relleno BFS**: se expande lateralmente a 6 vecinos (-1 por bloque) — esto suaviza los bordes de sombra. El valor crudo bajo oclusión de radio r es (15-r)/15
3. blockLight (antorchas etc.) es un BFS separado de 3 canales RGB (empaquetado 4bit)

Así que `l.skyLight` no es un mero parámetro de brillo sino **dato de oclusión por vóxeles de "si el cielo es visible desde aquí" = un mapa de sombras**. Bajo árboles, bajo techos e interiores ya es numéricamente bajo, llegando suavizado por interpolación de vértices. Colocar/romper bloques recalcula al instante = **sombras que siguen en tiempo real**. Vanilla solo lo usa "suavemente" vía `mix(ambiente, cielo, skyLight)`.

Las herramientas correctas son los dos pasos de [Sombras](shadows.md) (**restaurar valores crudos vía inversión del realce → binarizar con umbral `smoothstep`**; `th = 1 - r/15` marca directamente el "radio de oclusión tratado como sombra") más **abrir el sol directo con sky** (el sol solo llega donde el cielo es visible = la esencia de la proyección), con tinte cálido en sol / frío en sombra.

**Límites honestos**: estas sombras usan como base "el cielo hacia arriba", así que **no rotan cuando el sol se mueve**. La resolución es por bloque (los bordes suaves vienen de la dispersión BFS). La plantilla de iluminación aún contiene un stub cerrado `var shadow: f32 = 1.;` para mapas de sombras (siempre 1.0 = desactivado) — interpretado como rastro de sombras rotatorias pixeladas "planificadas". Si las sombras rotatorias con precisión de píxel son imprescindibles, solo quedan vías fuera de la API (p. ej. inyección GLSL por userscript, con riesgo de política).

## Realidad submarina

Los looks submarinos constan de 3 capas:

| Capa | Contenido | Operable desde paquetes? |
|---|---|---|
| ① Render de terreno/líquido | Procesable por hooks. Los hooks light se llaman con normalidad bajo el agua | Sí (funciona "bajo el velo") |
| ② Velo de definición líquida | Quad emissive de pantalla completa del color/alpha de definición del bloque líquido en la posición de la cámara, dibujado delante del todo. El ajuste `cameraTint` del juego gana si existe | No (ni color ni densidad cambiables) |
| ③ cameraTint | Ajuste del juego | No |

Puntos prácticos: los paquetes siguen funcionando bajo el agua / el velo no se puede quitar / bajo el agua no se puede ramificar (fogStart / fogEnd / fogColour no cambian bajo el agua: fogAlpha tampoco puede detectarlo).

## Relacionado

- [Sombras](shadows.md) — la técnica de sombras por skyLight al completo
- [Modelos y texturas](models.md) — hasta dónde llega el pipeline de modelos
- [Compatibilidad](../api/compatibility.md) — cómo se comportan los paquetes de versiones antiguas
- Cambios de estos límites versión por versión: [Historial de versiones](../history/)
