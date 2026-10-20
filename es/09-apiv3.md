[← Parte anterior](08-apiv2.md)·[Volver al manual](README.md)

# Parte IX: Guía de migración a API Version 3

Build objetivo: `3ymzdd.main.fae4743f.js` — **el build de producción activo desde el 2026-10-19**. El bundle que bloxd.io sirve en producción es idéntico byte a byte (verificado con md5, tanto el bundle principal como los chunks de paquetes de sombreadores) al despliegue de preproducción contra el que se investigó originalmente esta parte, así que todo lo que sigue se aplica a producción tal cual. El modelo de paquetes conserva su forma de v2 (mismos campos de `pack.json`, mismos límites del cargador, mismo diseño de uniform).

Las partes I–VII de esta guía siguen escritas sobre la base v2. Esta parte reúne, en el mismo orden que la [Parte VIII](08-apiv2.md), los puntos de migración de v2 → v3 y las nuevas funciones de v3. La conversión es en su mayoría mecánica (§47), pero dos cambios alteran realmente el comportamiento — la luz predeterminada ahora atenúa la emisión con la niebla (§43), y `BLOXD_ALPHA` ya no está definido en las variantes de líquido (§46) — y `blockId` se sustituye por completo por `blockFlags` (§42), así que verifica siempre con una compilación en el juego antes de distribuir.

Novedad en esta revisión: las secciones **§49–§54** van más allá de la migración y entran en interioridades del motor restauradas del build de producción — cómo invoca realmente el renderizador Lite tus hooks, la función de niebla real de cuatro modos, la implementación exacta de `bloxdOpaqueBehind()`, la ruta completa de entrega de blockFlags desde el registro del bloque hasta tu hook, y el pipeline de validación con su hash de cabecera medido. Son los hechos documentados públicamente más profundos sobre el sistema de paquetes hasta la fecha, y resuelven varias preguntas que otras guías todavía listan como abiertas.

## 40. Destino de los paquetes v2 (conclusión primero)

**Actualización 2026-10-19: v3 salió de preproducción y es ahora lo que sirve el sitio activo.** Todo paquete v2 guardado antes del despliegue — incluido todo paquete distribuido como v2 — falla ahora en producción exactamente como se describe abajo, así que la migración de §47 ya no es opcional para quien distribuya paquetes hoy.

El build exige que el `apiVersion` del manifiesto **coincida exactamente con 3**, y **no hay soporte paralelo de v2/v3**. Un paquete v2 se rechaza al cargar con los mensajes de «versión de API incorrecta» (claves i18n, texto de marcador):

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>
> `loadNoApiVersion`: "pack.json needs \"apiVersion\": {{version}}."

Los paquetes guardados conservan el ciclo de vida de v2 ([Parte VIII](08-apiv2.md) §31): cada build hashea su cabecera del motor, las actualizaciones del motor marcan automáticamente los paquetes guardados como «necesita revisión», y un paquete guardado cuyo `apiVersion` sea cualquier versión distinta de la actual se marca como no ejecutable (con el mensaje de estado de arriba que apunta al reemplazo) en lugar de dar error.

## 41. pack.json y el búfer uniform (lo que no cambia)

- Los campos obligatorios del manifiesto no cambian: `{ apiVersion, name, author }`.
- Los límites del cargador no cambian: zip de 32 MB / 1024 entradas / 256 archivos `.wgsl` / 256 KB de código total / 64 KB de manifiesto.
- El bloque uniform del motor no cambia de forma: `@group(3) @binding(0)`, 64 B, con — en orden de declaración — el tiempo, el desplazamiento de render, la dirección del sol y la posición del ojo. Dos nombres de campo internos cambiaron: `time` → `seconds`, `originOffset` → `renderOffset`. El **diseño de bytes es idéntico al de v2**, y de todos modos nada cambia para el código del paquete, porque los paquetes no pueden nombrar el uniform directamente (la cabecera del motor lo marca como proporcionado por el motor y de solo lectura, «which packs can't name»); sigue usando las funciones de cabecera `bloxdSeconds()` / `bloxdRenderOffset()`.
- El grupo 3 del paquete ganó un segundo ocupante documentado: `@group(3) @binding(1)` es la textura de profundidad de escena que lee `bloxdOpaqueBehind()` (implementación completa en §51). El uniform de 64 B permanece en el binding 0; los paquetes siguen sin poder nombrar ninguno de los dos bindings.

## 42. blockId pasa a blockFlags: materiales por bloque como bits (lo principal)

En las tres estructuras de entrada de hooks (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`), el campo v2 `blockId: u32` se **sustituye** por `blockFlags: u32`. Texto del motor sobre el campo: *«What kind of block this face is: `bloxdBlockFlag*` bits, the same across the face.»* El motor ahora entrega los datos de material en sí, así que la forma v2 de adivinar materiales a partir de rangos de ids numéricos o de mantener tablas de ids en el mundo ([Parte VIII](08-apiv2.md) §34) ya no es necesaria.

Los bits se exponen como constantes con nombre:

```wgsl
// Prueba uno con (blockFlags & bloxdBlockFlagRock) != 0.
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| Valor | Constante | Significado (notas del motor, condensadas) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | Totalmente opaco — hojas y hielo incluidos. No vidrio, agua, lava, generadores, ni bloques fantasma o invisibles. |
| 2 | `bloxdBlockFlagEmissive` | Emite luz de bloque, como hacen el neón, los portales, las lámparas, la lava y el faro. Los minerales brillantes cuentan, por tenues que sean. |
| 4 | `bloxdBlockFlagVegetation` | Hojas, y la hierba de los bloques de hierba — que también son tierra. No cactus, bloques de champiñón ni heno. |
| 8 | `bloxdBlockFlagDirt` | Tierra y suelo, con los bloques de hierba incluidos. La `Rocky Dirt` también es roca. |
| 16 | `bloxdBlockFlagSand` | Arena, arena roja y toda arenisca — que también es roca. |
| 32 | `bloxdBlockFlagRock` | Piedra y sus variantes, andesita, diorita, granito, grava, minerales, arenisca, `Rocky Dirt`, bedrock, obsidiana y magma. |

Un bloque compuesto de varios materiales lleva **cada** flag que corresponda (el ejemplo del propio motor: la arenisca es arena y roca, así que recibe ambos). Las hojas son vegetación pero no tierra; los bloques de hierba son vegetación y tierra a la vez.

Los flags de vegetación / tierra / arena / roca se asignan a partir del **nombre visible** registrado del bloque (opaco / emisivo vienen en cambio de los datos de opacidad y emisión del propio motor): los nombres que terminan en `Leaves`, o `Grass Block`, son vegetación; los nombres `Dirt` / `Soil` (y todo `Grass Block`) son tierra; exactamente `Sand` y `Red Sand`, más cualquier nombre que contenga `Sandstone`, son arena; los nombres que contengan `Stone` / `Andesite` / `Diorite` / `Granite`, cualquier `Ore`, más Yellowstone, Gravel, Bedrock, Obsidian, Magma, Rocky Dirt (y arenisca) son roca.

Ejemplo — tinte por bloque según el material:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

Efecto sobre las recetas de v2: el array de 22 ids de hojas de R-H ([Parte VIII](08-apiv2.md) §34) se reduce a `(blockFlags & bloxdBlockFlagVegetation) != 0`. La referencia de id ↔ nombre de bloque en [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) sigue siendo útil para fines ajenos a los sombreadores, pero ya no necesita búsquedas en el mundo para el estilo de materiales.

### Hojas sin la hierba (la pregunta que todos hacen)

`vegetation` por sí solo coincide con las hojas **y** con la hierba de los bloques de hierba, que además llevan `dirt`. Excluye dirt para afectar solo a las hojas — el discriminador que detallan las propias notas de campo del motor:

```wgsl
// Solo hojas: vegetación sin tierra. Los bloques de hierba son vegetación Y tierra.
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// Solo bloques de hierba (las caras verdes de la superficie del terreno):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

Verificado contra el registro activo (2026-10-20, bundle `3ymzdd`):
`vegetation && !dirt` coincide exactamente con los 45 registros de hojas (22 tipos base —
los mismos 22 que midió el array de ids de R-H en v2); `vegetation && dirt` coincide exactamente
con los 8 bloques de hierba. No hay excepciones en ninguna dirección. Combínalo con `vertex.normal`
(arriba/abajo) para elegir caras, por ejemplo solo las caras superiores de los bloques de hierba.

## 43. Renombrados de funciones y cambios semánticos

| v2 | v3 | Notas |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | Segundos desde que se cargó la página (nota de precisión f32 abajo) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | Misma cantidad: posición de render + esto = posición de mundo |
| `const bloxdTimeWrap: f32 = 3600` | **eliminada** | Define los periodos tú mismo en el paquete |
| `engineColour` (en `BloxdLightIn`) | **eliminado** (14 → 13 campos) | Reconstruye desde `litColour` + niebla |
| parámetros de hook `v` / `s` / `l` | `vertex` / `surface` / `light` | Nombres de la plantilla; firmas sin cambios |

- **`bloxdSeconds()`** — segundos desde que se cargó la página. En f32 cuenta en pasos de menos de 1 ms durante las primeras 4,5 horas, y de unos 4 ms de las 9 a las 18 horas. La cabecera recomienda el idioma `bloxdSeconds() % period`, que cuenta de 0 a `period` y vuelve a empezar — un reemplazo limpio de la constante de envoltura eliminada.
- **`bloxdRenderOffset()`** — bloques enteros: «a render position plus this is a world position». Cambia a medida que el jugador viaja, así que las posiciones de render se mantienen cerca del jugador — y por tanto son precisas. En toda la guía, lo que el texto v2 llamaba el offset local de noa ahora se llama de forma consistente **posición de render** / desplazamiento de render; es la misma cantidad que devolvía `bloxdOriginOffset()`.
- **`bloxdTimeWrap` eliminada** — un paquete que envolvía el tiempo a 3600 s declara ahora su propia constante, por ejemplo `const timeWrap: f32 = 3600.0;` y `% timeWrap`.
- **Semántica de la luz predeterminada** — el valor predeterminado de v2 era `engineColour + emission × fogVisibility`; el de v3 lo compone como `bloxdApplyFog(litColour + emission, light)` — **la emisión se atenúa con la niebla dentro del valor predeterminado**, así que la salida combinada pasa por la mezcla de niebla en conjunto. Tabla de traslado:

  | Expresión v2 | Traslado a v3 |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // traslado a v3 de la lectura v2 `l.engineColour + s.emission * l.fogVisibility`:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **Sin cambios de nombre ni de significado**: `bloxdEyePosition()`, `bloxdSunDirection()`, `bloxdFaceBlock()`, `bloxdApplyFog()`, `bloxdWorldPosition()`.

## 44. Nuevas constantes de cabecera: `bloxdPi` y `bloxdTau`

```wgsl
// Media vuelta y una vuelta completa, en radianes.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

Son útiles tanto para trucos de trigonometría como porque los paquetes ya no necesitan escribir π a mano. Ojo con la reutilización de nombres: una constante local del paquete con el mismo nombre ahora choca con la comprobación de identificadores duplicados de la cabecera — elimina o renombra cualquier redeclaración de `bloxdPi` / `bloxdTau` en tu código.

## 45. La plantilla de seis hooks (hooks de líquido mostrados oficialmente)

El texto de paquete predeterminado publicado con el build ahora incluye **los seis hooks** — terreno / líquido × vértice / superficie / luz — y cada uno devuelve su valor predeterminado del motor. Los comentarios del motor lo presentan así: *«Every hook returns its engine default. Copy a hook and change its output to start a shader pack.»*

```wgsl
// Cada hook devuelve su valor predeterminado del motor. Copia un hook y cambia
// su salida para empezar un paquete de sombreadores.

// Los juegos estrictos dejan el terreno donde está: sin guardia, este hook
// desactivaría todo el paquete de sombreadores allí.
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// El agua usa estos. Si se eliminan, el agua usa tus hooks de terreno.
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

- Los comentarios de los hooks enuncian directamente las reglas de líquido: **el agua necesita el trío; elimínalo y el agua reutiliza tus hooks de terreno** (el comportamiento de reserva conocido de v2, [Parte VIII](08-apiv2.md) §36, ahora escrito en la propia plantilla).
- `bloxdLiquidVertex` está dentro de la misma guardia `#ifndef BLOXD_STRICT` que `bloxdTerrainVertex` — sin guardia, desactivaría todo el paquete en juegos estrictos igual que hacen los efectos de vértice del lado del terreno.
- Los nombres de la plantilla son ahora los nombres completos de parámetro `vertex` / `surface` / `light` (la plantilla de v2 usaba los cortos `v` / `s` / `l`). Los nombres de parámetro de tu propio código son libres — solo importan las firmas.

## 46. Matriz de variantes: el eje de programa y los cambios de macros

Las variantes se generan sobre una matriz de **estricto × iluminación × programa** — las mismas 8 combinaciones que en v2, pero con terreno / líquido ahora como un eje explícito de la matriz. Los nombres de variante lo deletrean como `allow|strict · unlit|lit · terrain|liquid`, y se muestran en la interfaz como ``terrain`` / `liquid`, `strict` / `non-strict`, `lighting on` / `lighting off` (y las pantallas de error pueden añadir «(only in {{variants}})»).

| Macro | Definida en |
|---|---|
| `BLOXD_STRICT` | variantes estrictas (ambos programas) |
| `BLOXD_LIGHTING` | variantes con iluminación activada (ambos programas) |
| `BLOXD_ALPHA` | solo variantes de **terreno** no estrictas |
| `BLOXD_SCENE_DEPTH` | **todas las variantes de líquido** |

Dos cosas cambian para los autores respecto a las reglas de v2 ([Parte VIII](08-apiv2.md) §36):

- **`BLOXD_ALPHA` ya no está definido en las variantes de líquido.** En v2 también estaba definido en todas las variantes de líquido; en v3 el código de líquido bajo `#ifdef BLOXD_ALPHA` simplemente nunca se compila — la lógica condicionada por alfa debe vivir en hooks de terreno, o depender de que las variantes de líquido no tengan un flag que fuerce alfa.
- **`BLOXD_SCENE_DEPTH` está siempre definido en las variantes de líquido**, así que el uso de profundidad sigue estando bien sin guardia allí, exactamente como en v2 (§35); en hooks de terreno sigue necesitando el envoltorio `#ifdef BLOXD_SCENE_DEPTH`.

## 47. Lista de migración de v2 a v3

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** en las tres estructuras de entrada; expresa el estilo de material como pruebas de bits contra las constantes `bloxdBlockFlag*` (§42); elimina las heurísticas de rangos de ids de v2
3. **`bloxdTime()` → `bloxdSeconds()`**; declara tu propio periodo en lugar de la eliminada `bloxdTimeWrap` (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **Reconstruye las matemáticas de luz desde `engineColour` sobre `litColour` + niebla** según la tabla de §43; ten en cuenta que el valor predeterminado ahora atenúa la emisión con la niebla
6. **Hooks de líquido**: define `bloxdLiquid*` explícitamente cuando quieras que el agua se trate de forma distinta; omítelos para recaer en tus hooks de terreno
7. **Audita las guardias `BLOXD_ALPHA`** — el flag desapareció de las variantes de líquido (§46); el código de líquido condicionado por alfa está muerto allí
8. **Usa `bloxdPi` / `bloxdTau`** donde se escribieran constantes trigonométricas a mano; elimina las redeclaraciones locales que ahora dupliquen la cabecera
9. **Mantén las guardias estrictas**: los hooks de vértice y `discard` siguen envueltos en `#ifndef BLOXD_STRICT`; la plantilla protege `bloxdLiquidVertex` igual que su gemelo de terreno
10. **Valida en el juego** — compila y prueba el paquete en un juego compatible con paquetes de sombreadores

## 48. Otros cambios y notas de v3

- **La validación sigue siendo de dos etapas** ([Parte VIII](08-apiv2.md) §38): primero la validación estática, luego la compilación real de WebGPU del navegador mediante fragmentos stub generados que llaman a tus hooks, con los errores asignados de vuelta a los archivos / líneas de origen, y los diagnósticos restauran los nombres originales de los identificadores del lado del motor mediante una asignación.
- **Los diagnósticos estrictos nombran el motivo**: un hook de vértice que mueve el terreno informa «… moves terrain, which strict games prevent.» y `discard` en hooks de superficie / luz informa «discard makes terrain see-through, which strict games prevent.»; la interfaz de ajustes mantiene la guía «wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`.» (`offInStrict`).
- **Mensajes del cargador**: los tipos de error y los límites no cambian; «Zip64 archives aren't supported.» se muestra como mensaje de la interfaz (`loadZip64`).
- **Editor en el juego**: el editor de sombreadores se renovó a un editor basado en CodeMirror con resaltado consciente de WGSL, emparejamiento de corchetes y tramos de diagnóstico.
- **Requisito de hardware**: Lite necesita un controlador compatible con la función `shader-f16` de WebGPU; los controladores demasiado antiguos se rechazan con un mensaje como «Intel driver too old for Lite (no shader-f16)».
- **Redacción**: el texto sobre juegos que aceptan paquetes de sombreadores ahora dice «in games that **support** them».
- **Alcance de los títulos**: el conjunto de juegos donde se ejecutan los paquetes no cambia respecto al build anterior.

## 49. Interioridades del motor: cómo el renderizador Lite invoca tus hooks

Todo lo de §40–§48 es lo que te dicen el cargador y la cabecera. Esta sección y las siguientes documentan lo que el motor hace realmente en tiempo de ejecución, restaurado del bundle de producción (el renderizador Lite — un chunk de 175 KB; el nombre real del archivo fuente de integración `lite/terrainShaderPack.ts` sobrevive dentro de sus cadenas de error). Nada de esto cambia lo que escribes, pero elimina las conjeturas sobre lo que reciben tus hooks — y resuelve varias preguntas que otras guías de la comunidad todavía listan como abiertas.

El renderizador no «llama» a tus hooks desde JavaScript. Cuando un paquete pasa la validación, el motor **empalma las llamadas a tus hooks en su propio WGSL de terreno** reemplazando líneas ancla fijas en su texto de shader. Un ancla debe coincidir exactamente una vez — cero o varias coincidencias abortan con `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Etapa | Línea ancla en el shader del motor | Qué se empalma |
|---|---|---|
| vértice | `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` | construye `BloxdVertexIn`, llama a tu hook de vértice, reescribe `worldPos` |
| superficie | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | construye `BloxdSurfaceIn`, llama a tu hook de superficie, reescribe `baseColor` / `alpha` |
| color iluminado | justo antes de `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` | `let bloxdSpLitColour = color.rgb;` — captura el color previo a la niebla |
| luz | mismo punto | construye `BloxdLightIn`, llama a tu hook de luz, reescribe `color` |

El código empalmado, restaurado del bundle distribuido (las expresiones de muestra del nivel de luz se abrevian donde el formato propio del motor se extiende demasiado):

```wgsl
// etapa de vértice — variantes no estrictas con un hook de vértice
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* tu bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// etapa de fragmento — superficie
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* tu hook de superficie */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // solo se empalma cuando el programa es líquido o la variante no es estricta
```

```wgsl
// etapa de fragmento — luz
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // directional
        ambient,                                 // ambient
        /* varying de nivel de luz */.rgb,       // blockLight
        /* canal de cielo de la misma varying */, // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* término de luz sostenida (ver abajo) */, // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour — negro solo sin niebla alguna
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* tu hook de luz */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

Tres hechos de aplicación se desprenden directamente de este empalme:

- **El terreno estricto ignora los cambios de alfa del hook de superficie.** La escritura de vuelta `alpha = bloxdSpSurface.alpha` solo se empalma para programas de líquido o variantes no estrictas — la implementación detrás de la tabla de macros de §46. (En terreno estricto tu código `#ifdef BLOXD_ALPHA` no se compila de todos modos; ahora también está confirmado que las escrituras de alfa sin guardia se descartan allí.)
- **Una variante estricta que todavía declara un hook de vértice nunca lo ejecuta** — el motor lo informa en tiempo de build: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. Por eso la plantilla oficial (§45) envuelve `bloxdLiquidVertex` en el mismo `#ifndef BLOXD_STRICT` que su gemelo de terreno.
- Los identificadores `bloxdSp*` (`bloxdSpVertexIn`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, … — 16 en total) son temporales del lado del motor. Tu código nunca los ve, pero aparecen en los diagnósticos y en la salida de ingeniería inversa de cualquiera, así que merece la pena reconocerlos a primera vista.

**Qué alimenta realmente `BloxdLightIn`** — campo por campo, del código empalmado:

| Campo | Origen del lado del motor |
|---|---|
| `litColour` | el color del fragmento capturado justo antes de la mezcla de niebla (el ancla `bloxdSpLitColour`) — «before emission and fog», como dice la cabecera |
| `directional` | `vTerrainLambert` — una suma interpolada por vértice de `max(0, dot(normal, lightDirection)) × intensity` sobre las luces direccionales de la escena (fórmula en §54); 0 cuando la escena no tiene ninguna |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — por material, por fotograma |
| `blockLight` | el `.rgb` de la varying de nivel de luz ya decodificada (decodificación en §54) |
| `skyLight` | el canal de cielo de esa misma varying de nivel de luz — *«Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING»* (texto de la cabecera) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | el término de luz sostenida, construido a partir del canal w de la varying de nivel de luz junto con los uniforms de fotograma `uHeldLightPos` / `uHeldLightColour` (la [Parte VII](07-internals.md) §26 documenta la caída y el comportamiento del piso de canal) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **negro solo en una escena sin niebla alguna** (modo 0, §50) |
| `fogVisibility` | el coeficiente de niebla limitado — el valor exacto que devuelve la función de §50 |
| `position` / `normal` | las varyings `vPositionW` / `vNormalW` (la normal se renormaliza por fragmento) |
| `blockFlags` | la varying plana `vBlockFlags` — la ruta de entrega completa de §52 |

Para orientarte al leer material antiguo: la arquitectura de empalme idéntica existía en el renderizador v2, y las únicas diferencias de integración de v3 son `vBlockId` → `vBlockFlags` y la adición de las variantes de líquido. El sistema de hooks es arquitectónicamente estable a través del corte v2 → v3.

## 50. La función de niebla: cuatro modos, un campo

Restaurada literalmente del shader de terreno de producción:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // linear
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // exponential
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // exponential squared
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = fog off (coeff stays 1.0)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)` — un solo vec4 lo controla todo.
- **En el shader existen cuatro modos: 0 = apagado, 1 = exponencial, 2 = exponencial al cuadrado, 3 = lineal.** `fogVisibility` es el coeficiente limitado sea cual sea el modo que se ejecute — hay exactamente un campo, y nunca se expone un flag de modo a los paquetes.
- Los títulos propios de Bloxd usan el modo 3 (lineal) con la banda de 32 bloques descrita en la [Parte VII](07-internals.md) §25 (`fogStart = 32 × D`, `fogEnd = 32 × (D + 1)`), así que la observación «siempre lineal» de esa parte sigue describiendo el gameplay publicado. Los modos exponenciales son código real y activo del motor, sin embargo — un título puede cambiar `vFogInfos.x` y alterar la rampa sin ninguna actualización del cliente. Las recetas de distancia que calculan `distance(l.position, bloxdEyePosition())` por su cuenta (receta R-B) son la forma robusta de escribir looks basados en distancia, ya que un cambio de modo no puede moverlas.
- Esto resuelve desde el código la pregunta «qué rampa de niebla usa realmente el motor»: las cuatro están implementadas; los títulos publicados usan la lineal. (La misma función también explica el comentario de `fogColour` de la cabecera — el modo 0 es el único caso en que `fogColour` llega negro, y los juegos de Bloxd nunca publican el modo 0; en su lugar empujan la niebla muy lejos, [Parte VII](07-internals.md) §25.)

## 51. bloxdOpaqueBehind(): la implementación exacta

La función completa, restaurada literalmente del build de producción:

```wgsl
@group(3) @binding(1) var bloxdSpSceneDepth: texture_2d<f32>;
var<private> bloxdSpPixel: vec2i;
var<private> bloxdSpPositionW: vec3f;

fn bloxdOpaqueBehind() -> BloxdOpaqueBehind {
    let bloxdSpZ = textureLoad(bloxdSpSceneDepth, bloxdSpPixel, 0).r;
    if (bloxdSpZ <= 0.0) {
        return BloxdOpaqueBehind(false, vec3f(0.0), 0.0);
    }
    let bloxdSpEye = bloxdPackInputs.eyePosition;
    let bloxdSpScale = max(bloxdSpZ / (scene.view * vec4f(bloxdSpPositionW, 1.0)).z, 1.0);
    let bloxdSpBehind = bloxdSpEye + (bloxdSpPositionW - bloxdSpEye) * bloxdSpScale;
    return BloxdOpaqueBehind(true, bloxdSpBehind, distance(bloxdSpBehind, bloxdSpEye));
}
```

- **La textura de profundidad vive en `@group(3) @binding(1)`** — el grupo 3 es el grupo propio del paquete: el binding 0 es el uniform `bloxdPackInputs` de 64 B (§41), el binding 1 es esta textura de profundidad. Ambos los proporciona el motor y no tienen nombre desde tu lado.
- `z ≤ 0` significa que la muestra de profundidad no alcanzó nada (plano lejano / cielo): `found = false`, y `position` / `distance` no tienen significado — comprueba `found` primero, siempre.
- La posición devuelta es una **intersección escalada a lo largo del rayo**: la superficie opaca se coloca en `eye + (fragment − eye) × max(z / viewDepth, 1)`. `distance` se mide desde el ojo hasta ese punto — para paquetes de superficie de agua esto es efectivamente «cuánta agua atravesó el rayo antes de golpear algo sólido», que es lo que hace funcionar las recetas de agua teñida por profundidad sin un segundo búfer de profundidad.

## 52. blockFlags de extremo a extremo: del registro a tu hook

§42 te dice qué significan los bits. Esta sección es la ruta completa que recorre un bit de flag desde el registro del bloque hasta tu hook — cada salto confirmado desde el código de producción, que también demuestra el «the same across the face» de la cabecera hasta el nivel de byte.

**1. Registro (base de datos de definiciones de bloques).** Los flags de cada bloque se calculan una vez, en el registro:

```js
flags[id] = nameFlags                     // reglas de nombre visible (§42): vegetación / tierra / arena / roca
          | (definition.opaque === true ? 1 : 0)   // bit opaco — datos de opacidad del motor
          | (anyFaceEmission >= 1       ? 2 : 0);  // bit emisivo — datos de emisión de luz de bloque
```

Las reglas de nombre visible cubren solo los cuatro bits de material; los dos bits de física vienen de datos separados del motor — `opaque` directamente de la definición del bloque, `emissive` del array de emisión de luz por cara. El «Glowing ores count, however faint» de la cabecera es literal: cualquier cara con emisión ≥ 1 activa el bit.

**2. Por bloque → por material (inicialización del mesher).** El terreno se dibuja por *material*, no por id de bloque, así que los flags se retabulan en una tabla de materiales (un `Uint16Array` indexado por id de material, donde cada material toma los flags de la primera cara de su bloque propietario). La tabla se envía al Web Worker de mallado — pero **solo en configuraciones donde el pipeline de paquetes está habilitado**; de lo contrario la tabla es `null` y nunca se escriben bytes de flags. Los jugadores sin paquetes no pagan sobrecarga alguna, por construcción.

**3. A los bytes de vértice (worker del mesher).** Los flags viajan en dos bytes libres de los datos de vértice intercalados existentes:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // 8 bits bajos → byte alfa del atributo de color
        buffer[o + normalOffset + 3] = flags >> 8;    // 8 bits altos → byte w del atributo de normal
    }
}
```

Los cuatro vértices de una cara reciben el mismo valor — el significado a nivel de implementación de «the same across the face».

**4. Decodificación en la GPU (shader de terreno Lite).** Los dos bytes viajan como el atributo de vértice `blockFlagWords: vec2u` (location 7, presente solo cuando el pipeline de paquetes está activo) y se reensamblan en la etapa de vértice:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags` se declara `@interpolate(flat)` — constante por cara hasta la etapa de fragmento, por lo que las pruebas de bits de §42 son estables dentro de una cara y nunca pueden producir una mezcla a mitad de cara.

- El pipeline reserva **16 bits** de capacidad (esa decodificación reensambla dos bytes completos) mientras que v3 solo define 6 — pueden aparecer flags futuros sin otro cambio de formato de vértice ni subida de versión de API.
- En el modo de vértices empaquetados, esos mismos dos bytes viajan dentro de `packed.y` y del byte superior de la palabra de color en lugar de un atributo dedicado — mismos valores, distinto contenedor.
- Para la pregunta de hojas frente a hierba, que es para lo que más se consultan estos flags, consulta [Hojas sin la hierba](#hojas-sin-la-hierba-la-pregunta-que-todos-hacen) en §42.

## 53. Interioridades de la validación: HEADER_VERSION, firmas y nombres reservados

**El hash de cabecera medido.** Toda validación de paquete se sella con el `HEADER_VERSION` del motor. Ejecutar directamente el módulo de validación de producción (ver la nota del arnés al final de §54) lo mide:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← medido del bundle de producción activo
```

Es un hash FNV-1a-32 (prefijado `6.`) sobre cinco entradas: la cabecera del motor preprocesada y tokenizada **por variante** (una entrada por cada una de las 8 variantes), el universo léxico WGSL completo del analizador, los cuatro nombres de macro, el mapa de funciones especiales, y la declaración `BloxdPackInputs` junto con su línea uniform `@group(3) @binding(0)`. Dos consecuencias para los autores:

- **Cualquier edición de la cabecera del lado del motor la vuelve a hashear** — este es el mecanismo detrás del flag automático «necesita revisión» que reciben los paquetes guardados tras las actualizaciones del motor ([Parte VIII](08-apiv2.md) §31).
- El hash cubre la *cabecera del motor*, no tu código. Un paquete que sigue cargando tras una actualización del motor no está «todavía válido» — simplemente aún no ha activado un cambio de cabecera. La única comprobación de versión en la que participa tu manifiesto es la puerta de `apiVersion` (§40).

**Comprobación de firmas de hooks: exacta por token en los tipos, libre en los nombres.** El validador mantiene una firma por ranura de hook:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

La coincidencia es **token por token**: los nombres de tipo de los parámetros deben coincidir exactamente, `->` y el tipo de retorno deben coincidir exactamente, y se comprueban el número de parámetros y la colocación de las comas. Los *nombres* de los parámetros son libres — se acepta cualquier identificador en la posición del parámetro, por eso tu `fn bloxdTerrainLight(s, l)` compila aunque la plantilla lo escriba `(surface, light)`. El hook de luz toma exactamente dos parámetros.

**Nombres reservados.** La regla es una sola expresión regular: `/^bloxd/i`. Cualquier identificador que empiece por `bloxd` está reservado — todo lo `bloxd*` lo proporciona el motor, y un paquete no puede declarar en ese espacio de nombres (por eso también chocan las redeclaraciones de `bloxdPi` / `bloxdTau` de §44).

**Funciones especiales.** En v3 hay registrada exactamente una:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

«Especial» significa *ligado a una macro* — una función del motor cuya disponibilidad depende de un símbolo de variante. Dos diagnósticos de guardia imponen el uso correcto:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — un hook de vértice que alcanza una función exclusiva de superficie / luz.
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — por ejemplo, `bloxdOpaqueBehind()` del lado del terreno sin un envoltorio `#ifdef BLOXD_SCENE_DEPTH`.

**La cabecera del motor (preludio), fijada.** La cabecera de v3 es una cadena de 5.637 bytes que comienza `// Engine-provided and read-only, prepended to all packs. apiVersion 3.` Lleva directivas `#if` / `#ifdef` que el preprocesador WGSL del propio motor evalúa por variante — el motor ejecuta de verdad la evaluación de expresiones `#if`, y una expresión mal formada da error con `Cannot evaluate #if ...`. Cada estructura, firma de función y comentario citado en esta guía proviene de este texto renderizado, así que la guía y la cabecera distribuida no pueden divergir.

**Notas del analizador para autores.**

- Las funciones del lado del paquete se renombran con el prefijo `pack_` al fusionarse en el shader del motor (para evitar colisiones); los diagnósticos las asignan de vuelta a tus nombres originales — el mismo mecanismo que describe la [Parte VIII](08-apiv2.md) §38 para la segunda etapa de validación.
- El mensaje de identificador no declarado dice `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`; `_ can only be the target of a phony assignment, as in _ = f();` y `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.` completan el conjunto recién confirmado.
- El universo léxico del analizador incluye identificadores que **no son WGSL estándar**: `bufferView`, `bufferArrayView`, `bufferLength`, `atomicStoreMax`, `atomicStoreMin`. El motor los conoce como integrados, pero no está garantizado que la implementación WGSL de un navegador concreto los proporcione — nunca bases un paquete de distribución en ellos.

## 54. Constantes, límites y diseños confirmados

El diseño de recursos completo del programa de terreno, directamente del renderizador Lite de producción:

| Binding | Contenido |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms` — `viewProjection` mat4x4f, `view` mat4x4f, `vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`, `uSkyLightColour`, `uAmbientLightColour`, **`vFogInfos`**, `vFogColor`, `outputHeight`, `sceneAmbient`, **`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: storage `array<vec4f>` — xyz = traslación al fotograma de render, w = visibilidad del fundido de entrada |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`, `ambientAndCutoff`, `emissiveAndLevel`, `anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — el uniform del paquete (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — la textura de profundidad (§51) |

- **Las luces direccionales tienen un tope estricto de cuatro.** El renderizador falla con `Terrain supports 4 directional lights, not ${n}` si una escena intenta registrar más. `l.directional` es la suma Lambert sobre las que existan (0–4; las escenas propias de Bloxd usan 2 — [Parte VII](07-internals.md) §27).
- **Nombres del programa de terreno**: las claves de caché de pipeline dicen `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}` — un paquete aparece como el sufijo `-sp{variant}`, un programa por variante de §46.
- **`BLOXD_TERRAIN_DIRECTIONAL` es una macro interna del motor** (definida cuando dirLightCount > 0). *No* es una de las cuatro del preludio y nunca llega al código del paquete — pero aparece en los volcados WGSL de los shaders propios del motor, así que reconocerla ahorra confusión.
- **Decodificación del nivel de luz**: el atributo de vértice `aPackedLightLevels` es un f32 que empaqueta cuatro nibbles, cada uno dividido por 15: rgb = la luz de bloque coloreada, a = el canal de cielo / luz sostenida. La etapa de vértice lo decodifica en la varying `vLightLevels`; `blockLight` lee `.rgb`, y el canal de cielo / luz sostenida lee `.w`. El motor fija un piso del 35 % del canal más brillante para los canales rgb antes de interpolar — el ancla del lado del motor de la elevación que la [Parte VII](07-internals.md) §26 documenta desde el gameplay.
- **`vTerrainLambert`** (la fuente de `directional`, §49) se genera como una suma sobre las luces direccionales activas: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, protegida por `BLOXD_TERRAIN_DIRECTIONAL`.
- **Detalles de carga del manifiesto**: se filtran las entradas zip bajo `__MACOSX/`, los archivos con prefijo `._` y `.DS_Store` (ruido de archivo de macOS); `pack.json` se localiza por comparación de ruta en minúsculas — cero coincidencias → `loadNoManifest`, dos o más → `loadDuplicateManifest`; la lectura del manifiesto está limitada a 65.536 bytes.
- **Cómo se verificó todo esto**: los módulos del bundle de producción se restauraron (165 chunks, 4.951 módulos) y se ejecutaron en un arnés compatible con webpack bajo Node.js. El `HEADER_VERSION` medido (§53), la cabecera renderizada de 5.637 bytes, el orden canónico de la tabla de variantes y el mapa de funciones especiales provienen de *ejecutar el código distribuido*, no de leer cadenas. El mismo arnés es el núcleo natural para un `pack_check` v6 comunitario — ejecutar el validador propio del motor contra un paquete reproduce sus veredictos exactamente.

---

Investigado por ltf_ahel (investigado con glm)

[← Parte anterior](08-apiv2.md)·[Volver al manual](README.md)
