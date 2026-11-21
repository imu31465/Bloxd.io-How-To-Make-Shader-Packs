# Qué pueden y qué no pueden hacer los paquetes de sombreadores

> API objetivo: 5 · Build objetivo: `bbb6l5` (2026-11-20, producción y preprod) · Estado: Verified (portado a la API actual — se recomienda reverificar en el dispositivo)

El techo de realismo de los paquetes de sombreadores en una página: hasta dónde llega la API actual, qué no puede hacer por principio, qué es condicional, por qué existen los límites y los sustitutos más cercanos. Valora aquí un look antes de construirlo.

## Qué puede hacer la API actual

- **Colores, transparencia y emisión, por cara** — los tres hooks de `Surface` devuelven color (más alpha y emisión condicionales) para terreno, líquidos y modelos
- **Una reiluminación completa** — los tres hooks de `Light` y la API de iluminación (`bloxdShading()` / `bloxdWorldLight()` / `bloxdLitColour()`) exponen la propia receta del motor como funciones componibles ([Iluminación](../api/lighting.md))
- **Sombras que siguen al sol y a la luna** — `bloxdShadow()` devuelve el factor de sombra calculado por el motor; `bloxdAirShadow(t)` permite muestrear la sombra entre la cámara y el fragmento, y `bloxdShadowDirection()` devuelve la dirección de la luz ([Sombras](shadows.md))
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

## El método `skyLight` como alternativa
La técnica `skyLight` descrita arriba sirve para oscurecer zonas bajo árboles y techos, pero usa la visibilidad del cielo hacia arriba y no gira con el sol. Para sombras que sigan al sol o a la luna, usa `bloxdShadow()`.
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
