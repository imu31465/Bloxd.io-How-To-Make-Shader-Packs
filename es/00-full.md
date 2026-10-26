# Cómo crear paquetes de sombreadores (shader packs) para Bloxd.io (Guía completa)

Guía autocontenida para crear y distribuir paquetes de sombreadores para Bloxd.io (solo renderizador WebGPU).

> Esta es una guía no oficial y no representa la postura de los desarrolladores. La API puede cambiar sin aviso.  
> Esta guía se creó con asistencia de IA; la exactitud no está garantizada. Verifica con el comportamiento real en el juego.  
> Última revisión: 2026-10-27 (despliegue de v4 confirmado — build `cnty9`, producción y preprod idénticas; ver Parte X. lanzamiento oficial de v3 confirmado contra el build de comparación; invocación de hooks, niebla, profundidad e interioridades de blockFlags restauradas del build de producción — Parte IX §49–§54). Ya existen referencias oficiales (`bloxd-api.wgsl` y `BLOCK_TEXTURES.md`, Discord oficial) y se han cotejado con esta guía — sigue verificando las recetas con la pantalla de carga y la compilación en el juego.  
> La función de paquetes de sombreadores es una función oficial accesible desde la interfaz del juego, y los paquetes son WGSL puro  
> (sin ejecución de JS ni red), así que nada peligroso ocurre con código normal.

[Volver al manual](README.md)·[Parte siguiente →](02-api.md)

# Parte I: Crear paquetes

> El juego actual exige `apiVersion: 4` desde el 2026-10-26 y rechaza los paquetes v1/v2/v3 al cargar — el contenido siguiente está escrito sobre la especificación v2. Consulta [Parte IX](09-apiv3.md) y [Parte X](10-apiv4.md) para migrar antes de distribuir.

## 1. Resumen y requisitos

- Los paquetes de sombreadores son **solo para el renderizador WebGPU**. Mientras un paquete está instalado, el renderizador WebGPU se activa forzosamente en los ajustes
- Los paquetes se escriben en un **subconjunto restringido de WGSL**. Solo afectan el aspecto del **terreno (terrain) y los líquidos (liquid)**
- Lo que puedes hacer: cambiar colores, transparencia y emisión; reconstruir la iluminación; sombras estilo proyección (R9.12); animación de vértices (solo en ciertos juegos)
- Lo que no puedes hacer: añadir texturas propias, posprocesado (bloom etc.), sombras pixeladas que roten con el sol (mapas de sombras) ni reflejos reales (SSR), ni afectar el cielo o las entidades (muestrear el atlas de texturas de bloques existente **es posible desde v4** — `bloxdTexel`, [Parte X](10-apiv4.md) §57)
- Lo que sí puedes hacer (pero se suele pasar por alto): **sombras estilo proyección con `skyLight` (oclusión de cielo por vóxeles)** — puedes oscurecer claramente bajo árboles y techos (R9.12). Romper bloques hace que LightEngine recalcule al instante, así que las sombras siguen en tiempo real
- **La mayoría de los juegos usan el modo estricto** (sin animación de vértices, sin `discard`). Diseña los paquetes de distribución general para que funcionen en modo estricto

## 2. Inicio rápido

1. Crea una carpeta y coloca `pack.json` y archivos `.wgsl` en ella
2. Carga el zip o la carpeta desde ajustes del juego → Shader Pack
3. Corrige los errores y recarga (ver [Parte V](05-troubleshooting.md))
4. Prueba en juegos compatibles
5. Comprímelo en zip cuando termines y distribúyelo

## 3. Estructura del paquete

- **Formato de distribución**: un solo `.zip`, o una carpeta (la carga de carpetas es solo en navegadores de escritorio)
- **Contenido**: un `pack.json` (en el nivel superior del paquete; insensible a mayúsculas) + 1–256 archivos `.wgsl`
- Múltiples `.wgsl` se concatenan y tratan como un módulo, así que dividir y usar subdirectorios es libre. Sin restricciones de nombres. La concatenación se hace en **orden de diccionario de los nombres de entrada (rutas)** (las declaraciones de ámbito de módulo son independientes del orden, así que normalmente no importa — solo afecta a código que dependa del orden de inicialización de `var`). Los archivos no `.wgsl` ( READMEs etc.) se ignoran
- Consejo de compresión: si un zip guarda todo bajo una carpeta raíz común, ese prefijo se elimina automáticamente (los zips de macOS "Comprimir" funcionan tal cual, y la basura del OS (`__MACOSX`, archivos con prefijo `._`, `.DS_Store`) se excluye automáticamente). Pero archivos extra en la raíz rompen la detección del nivel superior; lo más seguro es entrar en la carpeta y comprimir `pack.json` y los `.wgsl` directamente (verifica que `pack.json` quede en la raíz del ZIP)

| Elemento | Límite |
|---|---|
| tamaño del zip / nº de entradas | 32MB / 1024 |
| tamaño de pack.json | 64KB, UTF-8 |
| tamaño total .wgsl | 256KB, UTF-8 |
| formato zip | se rechazan zip64, divididos y cifrados. Compresión: solo store / deflate. Rutas duplicadas no permitidas |

## 4. pack.json

```json
{
  "apiVersion": 3,
  "name": "My Pack",
  "author": "your name"
}
```

| Campo | Requerido | Descripción |
|---|---|---|
| `apiVersion` | requerido | Debe coincidir exactamente con `3`. Los paquetes con `1`/`2` se rechazan al cargar con `shaderPack:loadWrongApiVersion` — véase [Parte IX](09-apiv3.md) para migrar |
| `name` | requerido | No debe estar vacío. Se muestra en la interfaz de ajustes |
| `author` | opcional | Puede omitirse. Valores no cadena (números etc.) son errores |

Los demás campos se ignoran.

## 5. Plantilla mínima

Un paquete funcional con solo `pack.json` (sección 4) y este `pack.wgsl`:

```wgsl
// Paquete mínimo con un ligero tinte cálido
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

Reglas a seguir:

- Nunca **construyas las structs de salida directamente** (`BloxdSurface(...)` es un error). Empieza siempre desde `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` y modifica campos. Excepción: el primer parámetro del hook light (`s: BloxdSurface`) tiene el tipo de salida: `var out = s;` también vale
- `var x: BloxdSurface;` sin inicializar (solo anotación de tipo) también es un error
- Los parámetros de los hooks son de **solo lectura**. Para cambiarlos, copia primero, p. ej. `var sv = s;`
- No puedes usar el prefijo `bloxd_` en tus identificadores (salvo los 6 nombres de hook)
- Escribe las constantes con `const` (`#define` no admite valores)

## 6. Los 6 hooks

Todos opcionales. Las firmas deben coincidir exactamente en tipos (los nombres de parámetros son libres).

| Hook | Rol |
|---|---|
| `fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex` | Animación de vértices del terreno. **No disponible en modo estricto** |
| `fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface` | Color, transparencia y emisión del terreno. `s.colour` es textura × color de vértice |
| `fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight` | Color final del terreno. Se llama en la **etapa final del fragmento** y su valor de retorno se convierte en el color final tal cual |
| `fn bloxdLiquidVertex / bloxdLiquidSurface / bloxdLiquidLight` (mismas formas) | Versiones para líquidos. `alpha` actúa como transparencia del líquido |

Reglas de reserva:

- Si un hook de líquido no está definido, **se usa el hook de terreno del mismo nombre** (no al revés). Escribir solo surface aplica el mismo efecto a los líquidos
- Sin hook light, se usa el comportamiento por defecto (`engineColour + emission × fogVisibility`)
- Si descartas `engineColour` y reconstruyes desde el color base, reaplica la niebla tú mismo: `mix(l.fogColour, col, l.fogVisibility)`. Al añadir emisión, multiplícala antes por `fogVisibility`

## 7. 8 variantes y guardias

Escribes un solo código, pero debe compilar en las **8 combinaciones de {strict, allow} × {iluminación on, iluminación off} × {terreno, líquido}**.
Solo están disponibles `#define` (solo bandera, sin valores) / `#ifdef` / `#ifndef` / `#else` / `#endif`. `#` debe iniciar su línea (también dentro de funciones).

| Guardia | Significado | Uso |
|---|---|---|
| `#ifndef BLOXD_STRICT` | Solo fuera de estricto (allow) | Envuelve todo el hook vertex y `discard` |
| `#ifdef BLOXD_LIGHTING` | Solo con iluminación activada | Envuelve el código que toca `blockLight`, `skyLight`, `ambientLightColour`, etc. **Envuelve las funciones auxiliares compartidas (fn de ámbito de módulo) como funciones enteras** (proteger solo el punto de llamada no basta) |
| `#ifdef BLOXD_ALPHA` | Cuando existe el campo `alpha` (siempre en líquidos, en terreno solo en allow) | Envuelve el código que toca `alpha` |

## 8. Funciones del lenguaje disponibles y prohibiciones

Disponible:

- Funciones integradas de WGSL (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select`, etc.)
- Tus propios `fn` / `struct` / `const` / `alias` / `var<private>`, más `let` y flujo de control (if/for/while/switch etc.) dentro de funciones
- Derivadas (`dpdx` / `dpdy` / `fwidth`) solo en hooks surface/light (etapa de fragmento). No en vertex
- Arreglos `const` (p. ej. LUTs de paleta), punteros (`ptr<function, T>`), matrices (`mat3x3f` etc.)
- Definiciones de banderas `#define NOMBRE` + ramificación `#ifdef`

Prohibido / precaución:

- **Sin texturas**: los tipos `texture_*` / `sampler` son inutilizables. Construye el detalle proceduralmente con ruido hash etc.
- **`discard` está prohibido en modo estricto** (envuélvelo con `#ifndef BLOXD_STRICT`)
- `@attribute` / `enable` / `requires` / `override` están prohibidos. Como `enable f16;` no se puede escribir, **los tipos f16 son efectivamente inutilizables**
- Los atributos `@builtin` también están prohibidos, así que `fragCoord` (coordenadas de pantalla) y `vertex_index` no se pueden leer
- **No uses `let` de ámbito de módulo** (usa `const` o `var`)
- `atomic` es inutilizable
- Las coordenadas son locales-noa. Suma `bloxdOriginOffset()` para coordenadas de mundo. Las coordenadas de bloque son `bloxdFaceBlock(position, normal)`

## 9. Validación, pruebas y distribución

La carga ejecuta estas comprobaciones en orden:

1. Comprobaciones de límites del cargador (límites de la sección 3)
2. Compilación estática (las 8 variantes)
3. Compilación real en el WebGPU del navegador (la validación estática no verifica todos los tipos; cierto código solo falla aquí — evita las trampas de la sección 8)

Pasos:

1. Carga el zip / carpeta desde ajustes → Shader Pack
2. Revisa el estado. Justo tras seleccionar verás "Ready. Reload the page to use it." — tras recargar la página, "Ready to use" significa éxito. Ante "Saved, but it won't run until you fix these errors...", corrige los errores listados (archivo:línea + variante) y recarga
3. Recarga la página para activar. Elimina antes cualquier override de renderizador en parámetros URL o localStorage, o el paquete se negará a iniciar
4. Prueba primero en juegos permisivos y luego en juegos estrictos (la mayoría). La animación de vértices solo funciona en juegos allow
5. Para distribuir, comprime con `pack.json` en la parte superior (dentro de los límites de la sección 3). Reemplazar el paquete se puede hacer desde la misma pantalla, pero solo surte efecto tras una recarga de página (pasos 2-3). Remove Pack lo elimina. La revalidación tras actualizaciones del juego se ejecuta sola al cargar la página

[Volver al manual](README.md)·[Parte siguiente →](02-api.md)

[← Parte anterior](01-making.md)·[Volver al manual](README.md)·[Parte siguiente →](03-recipes.md)

# Parte II: Referencia de la API

> El juego actual exige `apiVersion: 4` desde el 2026-10-26 y rechaza los paquetes v1/v2/v3 al cargar — el contenido siguiente está escrito sobre la especificación v2. Consulta [Parte IX](09-apiv3.md) y [Parte X](10-apiv4.md) para migrar antes de distribuir.

## 10. Cabecera del motor (antepuesta automáticamente al código del paquete)

El motor inserta automáticamente el siguiente código delante del código del paquete (los paquetes no pueden redeclararlo). Las secciones envueltas en `#ifdef` varían según la variante.

```wgsl
// Engine-provided and read-only to packs. apiVersion 2.
const bloxdTimeWrap: f32 = 3600.0;   // seconds until time wraps to 0

fn bloxdTime() -> f32;               // seconds. wraps to 0 every 3600 s
fn bloxdOriginOffset() -> vec3i;     // whole blocks. noa-local + this = world coords
fn bloxdEyePosition() -> vec3f;      // camera position (noa-local)
fn bloxdSunDirection() -> vec3f;     // sun direction (unit vector, non-zero only with earth skybox)
fn bloxdWorldPosition(position: vec3f) -> vec3f;  // noa-local -> world coords
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i;  // world block coords of this face
fn bloxdApplyFog(colour: vec3f, l: BloxdLightIn) -> vec3f;   // mix(l.fogColour, colour, l.fogVisibility)

struct BloxdVertexIn {
    position: vec3f,   // noa-local world space (world minus bloxdOriginOffset())
    normal: vec3f,
    blockId: u32,      // owning block id (flat-interpolated, uniform across the face)
}

#ifndef BLOXD_STRICT
struct BloxdVertex {
    position: vec3f,     // noa-local
}
#endif

struct BloxdSurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    blockId: u32,        // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct BloxdLightIn {
    litColour: vec3f,          // engine lighting result (before emission and fog)
    engineColour: vec3f,       // post-fog = bloxdApplyFog(litColour, l). excludes emission
    directional: f32,          // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,            // the material's ambient times the scene's
    blockLight: vec3f,         // voxel block light, tone-mapped (all variants; 0 when unlit)
    skyLight: f32,             // voxel sky light, tone-mapped (all variants; 1 when unlit)
    ambientLightColour: vec3f, // present in all variants (white when unlit)
    skyLightColour: vec3f,     // present in all variants (white when unlit)
    heldLight: vec3f,          // held light here (all variants; 0 when unlit/out of range)
    fogColour: vec3f,
    fogVisibility: f32,        // 1 = no fog, 0 = fully fogged (renamed from v1 fogFactor)
    position: vec3f,           // as in BloxdSurfaceIn
    normal: vec3f,
    blockId: u32,              // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdLight {
    colour: vec3f,
}

// liquid variants, surface / light hooks only
struct BloxdOpaqueBehind {
    found: bool,       // false when no opaque face behind (sky)
    position: vec3f,   // opaque face position behind (noa-local)
    distance: f32,     // distance from the eye
}
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind;

#ifndef BLOXD_STRICT
fn bloxdDefaultVertex(v: BloxdVertexIn) -> BloxdVertex;
#endif

fn bloxdDefaultSurface(s: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdDefaultLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight;
```

Puntos clave:

- `bloxdTime()` es tiempo transcurrido que se envuelve cada 3600 segundos (`bloxdTimeWrap`). No se garantiza que esté sincronizado con el reloj diurno del juego. Como la visibilidad de etapa del bind group es VERTEX|FRAGMENT, **también puede llamarse desde hooks vertex**
- `bloxdSunDirection()` es un vector unitario solo mientras existe un sol; cero cuando el cielo no tiene sol. **La luna está siempre en `-bloxdSunDirection()`** (el motor calcula la posición lunar como el opuesto exacto del sol). Las builds actuales no tienen ciclo día/noche: sol, luna y estrellas no se mueven durante la partida (solo cambian opacidades como `dayNightSunOpacity`). En el cielo terrestre por defecto el sol queda fijo en ≈ `(−0.56, 0.81, −0.18)` (elevación ~54°). **Nunca pases un vector cero a `normalize`** — comprueba la ausencia de sol con `dot(d, d) < 1e-8` y recurre a una dirección constante ([Parte VII](07-internals.md), sección 28)
- ※Nota: antes escrito como "no reutilizable como dirección lunar en cero". La dirección en sí está disponible vía `-bloxdSunDirection()`, pero los paquetes de distribución deben ramificar con `sunPresent` sobre premisa cero (ver R2 para el pseudo look azul, [Parte VII](07-internals.md) R-A para luz lunar direccional)
- `emission` se añade tras el cálculo de iluminación, atenuado por **`fogVisibility`** (la implementación defaultLight `engineColour + emission × fogVisibility`. La emisión también desaparece en distancia totalmente anegada)
- **Orden de aplicación de niebla**: el fragmento procesa ① composición iluminación/emisión → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ llamada al hook light → ⑤ return. Por tanto **engineColour llega ya con niebla**, y **el valor devuelto del hook light se convierte en el color final tal cual** (tras el hook no se reaplica niebla)
- **Origen de fogVisibility**: distancia en espacio de vista (calculada por vértice, interpolada). En modo linear `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **Cuando fogMode == 0**: `fogColour` llega como `vec3f(0.0)` (negro). El código que estime franjas horarias por el tinte de fogColour debe tener cuidado
- **Ajustes reales de niebla en builds actuales**: **linear fijo**. `fogStart` = distancia de chunks, `fogEnd` = +1 chunk (solo horizonte). Con niebla off se fija en 100 / 101 chunks, efectivamente desactivada. Color de niebla por defecto RGB(183, 191, 195)
- El uniform `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) es solo para **uso vía funciones de cabecera**. No lo references directamente desde paquetes. La visibilidad de etapa es VERTEX|FRAGMENT, así que las funciones de cabecera también pueden llamarse desde funciones de ámbito de módulo fuera de los hooks y desde hooks vertex. La textura de profundidad (binding 1) es solo FRAGMENT, así que `bloxdOpaqueBehind()` queda limitado a hooks surface / light
- **`skyLight` / `blockLight` / `heldLight` llegan tras una "curva de realce"**. El `tone-mapped` de los comentarios de la cabecera se refiere a esto: el motor siempre aplica `y = 1-(1-x/(3-2x))³` (una curva S que levanta zonas oscuras) a los fragmentos antes de entregarlos a los paquetes. No son valores de vóxel crudos (n/15); p. ej. bajo un árbol (crudo 0.87) llega elevado a **0.97**
- `skyLight` es esencialmente el dato de oclusión por vóxeles de "si el cielo es visible desde aquí" (= un mapa de sombras), no un simple parámetro de brillo (ver sección 15, "La verdad sobre las sombras")
- **`litColour` sirve de punto de partida**: en v1 solo existía `engineColour` ya con niebla, y la atmósfera propia tendía a la doble niebla. En v2 se parte de `litColour` previo a niebla y emisión, y se reaplica niebla al propio ritmo con `bloxdApplyFog()`
- **`blockId` distingue tipos de bloque**: identificación independiente del color de textura. Pero la tabla ID-tipo vive dentro del motor: qué ID es qué bloque se mide en el mundo; hay una tabla ya preparada en [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (ver [Parte VIII](08-apiv2.md))
- **La construcción directa de structs está prohibida**: llamadas de constructor como `BloxdLight(...)` se rechazan en validación estática. Parte siempre de `bloxdDefault*` o usa una copia de la entrada

## 11. Tabla de variantes

| Variante | BLOXD_STRICT | BLOXD_LIGHTING | BLOXD_ALPHA |
|---|---|---|---|
| allow + unlit + terreno | – | – | ✓ |
| allow + unlit + líquido | – | – | ✓ |
| allow + lit + terreno | – | ✓ | ✓ |
| allow + lit + líquido | – | ✓ | ✓ |
| strict + unlit + terreno | ✓ | – | – |
| strict + unlit + líquido | ✓ | – | ✓ |
| strict + lit + terreno | ✓ | ✓ | – |
| strict + lit + líquido | ✓ | ✓ | ✓ |

Las formas de las structs de cabecera también cambian por variante (sin `BloxdVertex` en strict, sin `blockLight` etc. en unlit, sin `alpha` en terreno strict).

Los símbolos definidos oficialmente son solo 4 (los 3 anteriores + `BLOXD_SCENE_DEPTH` — [Parte VIII](08-apiv2.md), sección 35). Terreno vs. líquido no es un símbolo sino **un programa aparte**: ramas como `#ifdef BLOXD_TERRAIN` son imposibles. La comparación de nombres de bandera no distingue mayúsculas/minúsculas; si escribes un nombre erróneo en `#ifdef`, el mensaje de error lista los 4 válidos. Las funciones hook solo se inyectan en los programas de terreno y líquido — los paquetes no pueden afectar a entidades, partículas ni ningún otro renderizado.

## 12. Chuleta de esqueleto

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);          // la construcción directa está prohibida; empieza siempre desde default
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // el terreno solo tiene alpha en allow
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);         // engineColour + emission*fogVisibility
    #ifdef BLOXD_LIGHTING                       // protege las entradas solo de iluminación
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex siempre con esta guardia
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdTime()) * 0.05;
    return out;
}
#endif
```

Cinco cosas a tener siempre presentes: compilar limpio en las 8 variantes / los juegos estrictos son la mayoría / sin texturas / los parámetros de hook son de solo lectura / nada de `let` en ámbito de módulo.

[← Parte anterior](01-making.md)·[Volver al manual](README.md)·[Parte siguiente →](03-recipes.md)

[← Parte anterior](02-api.md)·[Volver al manual](README.md)·[Parte siguiente →](04-realism.md)

# Parte III: Recetario

> El juego actual exige `apiVersion: 4` desde el 2026-10-26 y rechaza los paquetes v1/v2/v3 al cargar — el contenido siguiente está escrito sobre la especificación v2. Consulta [Parte IX](09-apiv3.md) y [Parte X](10-apiv4.md) para migrar antes de distribuir.

- [R1. Recetas de color (surface)](#r1-recetas-de-color-surface)
- [R2. Recetas de iluminación (light)](#r2-recetas-de-iluminación-light)
- [R3. Recetas de emisión](#r3-recetas-de-emisión)
- [R4. Recetas de coordenadas (mundo / bloque / vista)](#r4-recetas-de-coordenadas-mundo--bloque--vista)
- [R5. Recetas de tiempo (animación)](#r5-recetas-de-tiempo-animación)
- [R6. Recetas de líquidos](#r6-recetas-de-líquidos)
- [R7. Recetas de vértices (solo allow)](#r7-recetas-de-vértices-solo-allow)
- [R8. Trucos matemáticos](#r8-trucos-matemáticos)
- [R9. Recetas realistas](#r9-recetas-realistas)

---

> **Importante:** las recetas son ejemplos individuales, no para concatenar de arriba abajo. Pegar varias definiciones del mismo nombre de hook (`bloxdTerrainLight` etc.) o del mismo nombre de función auxiliar duplica definiciones en un módulo y falla la compilación. Para combinar efectos, fúndelos en una función por tipo de hook.

## R1. Recetas de color (surface)

### Tinte único (lo más básico)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Subir / bajar saturación

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 vívido / -1.0 monocromo total
```

### Temperatura de color (cálido ⇄ frío)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = cálido (rojo fuerte), -1.0 = frío (azul fuerte)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### Vintage / sepia

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### Gradiente de altitud (tierras bajas cálidas)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 1..0 en altura 0..50
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Pintar por orientación (arriba = claro, paredes = oscuro)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // suelo 1 / pared 0 / techo -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // paredes y techos algo más oscuros
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Posterizar (menos colores)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. Recetas de iluminación (light)

### Curva S de contraste

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### Neblina de distancia (niebla propia)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 0..0.35 de niebla propia de 64 a 192 bloques
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### Noche (tinte azul por skyLight + protección de lámparas)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
    #endif
    return out;
}
```

### Cuevas a oscuras (oscurecer más donde no hay skyLight)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    out.colour *= mix(1.0, 0.35, underground * underground);
    #endif
    return out;
}
```

> `skyLight` llega post-realce (sección 10): la oclusión leve (bajo árboles: crudo 0.87 → realzado 0.97) apenas oscurece con este método. Sirve para cuevas (crudo 0). Para marcar la "sombra de árboles", usa inversión + umbral de R9.12.

### Azul nocturno ambiental (pseudo look sin dirección lunar)

> En esta API, `bloxdSunDirection()` es cero cuando el cielo no tiene sol. Lo siguiente no es luz lunar direccional, solo un tenue ambiente azul cuando el cielo está oscuro. La dirección lunar en sí está disponible vía `-bloxdSunDirection()` (solo mundos con ciclo día/noche. [Parte VII](07-internals.md) R-A).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let upward = clamp(l.normal.y, 0.0, 1.0);
    out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
    #endif
    return out;
}
```

### Calidez de atardecer (tinte por altura del sol)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 en horizonte / 0 en cenit
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### Reemplazo total de la salida del motor (reiluminación simple)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // NOTA: la construcción directa de BloxdLight(...) está prohibida; reescribe colour desde default
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // descarta engineColour (el resultado de iluminación del motor) y usa "color base × brillo calculado"
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // descartado engineColour: rehacer niebla es obligatorio
    out.colour = col + s.emission * l.fogVisibility;   // suma emission tú también (obligatorio)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. Recetas de emisión

> `emission` se suma tras el cálculo de iluminación, pero el proceso por defecto **lo atenúa con `fogVisibility`. En distancia totalmente anegada la emisión también desaparece. Para mantener brillo a lo lejos, no sumes a emission — suma directamente como `out.colour += ...` dentro del hook light** (engineColour ya lleva niebla, así que a lo lejos la luz cae sobre el color de niebla)

### Lámparas pulsantes (antorchas que respiran)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(bloxdTime() * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### Aspecto de mena luminosa (los materiales claros emiten)

```wgsl
// lado surface: cuanto más claro (blanco) el material, más emisión
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### Enjambre de luciérnagas (puntos de luz a la deriva)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // unos "orbes de luz" a la deriva lenta; brillo por inverso de distancia
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. Recetas de coordenadas (mundo / bloque / vista)

### Coordenadas de mundo

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### Coordenadas de bloque

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
```

### Damero (por bloque)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 o 1
out.colour *= mix(0.96, 1.04, checker);
```

### Pseudoaleatorio por bloque (hash)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// usos: variación de hierba, moteado de piedra, etc.
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### Vector de vista y luz de borde (rim)

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### Ángulo de vista (fresnel casero — para líquidos)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 de frente / 0 rasante
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. Recetas de tiempo (animación)

> `bloxdTime()` se envuelve cada 3600 segundos (1 hora). Es tiempo transcurrido del sombreador sin garantía de sincronía con el día/noche del juego. Úsalo para animación periódica visual, pero prefiere `bloxdSunDirection()` y las entradas de iluminación para detectar la noche real.

### Ciclo día-noche (1 día por hora)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 período de una hora; no necesariamente sincronizado con el día/noche del juego
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### Oscilación (senos superpuestos)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### Bandas de aurora / franjas fluorescentes

```wgsl
// mezcla 3 colores por posición XZ y tiempo
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

## R6. Recetas de líquidos

### Superficie rizada (parpadeo de color)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid siempre tiene BLOXD_ALPHA — guardia por costumbre
    #endif
    return out;
}
```

### Transparencia pseudo por altura (no es una prueba real de bajío)

> En v1, la profundidad de escena y la posición del fondo no se podían consultar: la profundidad real no se calculaba solo con aquella API. En v2, `bloxdOpaqueBehind()` limitado a líquidos mide el grosor hasta la cara opaca trasera ([Parte VIII](08-apiv2.md) R-E). Lo que sigue es el viejo pseudo efecto sin ello: `s.position.y` es coordenada local y usarla cruda desplaza el efecto con el origen del chunk. Para altura de mundo convierte con `bloxdWorldPosition()`. El trecho solo varía alpha por altura de mundo — pseudo efecto, no bajío por costa/fondo. Ajusta `packWaterReferenceY` a tu altura de mundo.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // más fino a baja altura, más cerca del alpha base arriba; verifica la dirección en el juego
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### Turbidez submarina desde dentro

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### Paquete solo-líquidos (terreno intacto)

```wgsl
// no escribas ningún hook terrain_*. Entonces:
//  - variantes terrain = sin hooks = valores por defecto del motor
//  - variantes liquid  = solo actúan los hooks liquid_*
```

## R7. Recetas de vértices (solo allow)

> Envuelve todo en `#ifndef BLOXD_STRICT`.
> Para las condiciones exactas (lista de títulos allow; Custom Games es estricto) ver §30: [§30 Modos de aplicación por juego](07-internals.md#30-modos-de-aplicación-por-juego-shaderpackpolicy)

### Hierba al viento (mueve solo las puntas)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // solo caras verticales
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### Olas en líquido (solo caras superiores)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdTime() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdTime() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### Terreno pulsante

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // leve expansión/contracción a lo largo de normales
    return out;
}
#endif
```

### Terreno ondulante (olas seno gigantes)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdTime() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdTime() * 0.7) * 0.3;
    return out;
}
#endif
```

## R8. Trucos matemáticos

```wgsl
// cuantización suave de 0..1 (n pasos)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// umbral de 2 niveles (sombra toon)
let shadow = smoothstep(0.35, 0.37, level);   // ±0.02 en torno al umbral crea escalones

// toon de 3 niveles
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// luma (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// pulso suave
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// onda triangular (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// segundos → "fase lenta" (para efectos que ignoran el ciclo de 3600 s)
let phase = t * 0.15;
```

## R9. Recetas realistas

> Recetas físicas para "reconstruir el aspecto vainilla desde los materiales". Lee estas premisas primero:
>
> 1. **El hook light se llama en la etapa final del fragmento**. Su color devuelto se convierte en el color final tal cual. **Debes reaplicar la niebla tú mismo** (R9.10)  
> 2. **La iluminación por defecto del motor es solo multiplicación**. Especular / fresnel / separación cálido-frío / ambiente hemisférico se construyen desde cero  
> 3. `l.engineColour` es el color terminado (ya con niebla). Reconstruir desde `s.colour` (albedo) es el enfoque completo  
> 4. Las texturas están prohibidas → todo el detalle debe ser **procedural** (hash/ruido) (R9.8)

### R9.1 Antorchas cálidas × luz de cielo fría

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // clamp intermedio
    col = mix(l.fogColour, col, l.fogVisibility);                    // rehacer niebla
    out.colour = col + s.emission * l.fogVisibility;                 // re-sumar emission
    #endif
    return out;
}
```

### R9.2 Especular solar (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);          // vector medio
        let ndh = max(dot(n, h), 0.0);
        let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
        let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
        out.colour += spec * vec3f(1.0, 0.97, 0.90);
    }
    #endif
    return out;
}
```

### R9.3 Fresnel de Schlick

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // tenue brillo de borde
    #endif
    return out;
}
```

### R9.4 Ambiente hemisférico (cielo arriba / rebote del suelo abajo)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // abajo: rebote
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // arriba: luz del cielo
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // clamp intermedio
    col = mix(l.fogColour, col, l.fogVisibility);                           // rehacer niebla
    out.colour = col + s.emission * l.fogVisibility;                        // re-sumar emission
    #endif
    return out;
}
```

### R9.5 ACES fílmico (aproximación de Narkowicz)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = exposición
    return out;
}
```

### R9.6 Perspectiva aérea ("atmósfera" por desaturación con distancia)

> A diferencia de la niebla (reemplazo de color), superponer "desaturación con distancia" hace las vistas lejanas mucho más realistas.  
> Precaución: reduce solo la saturación — nunca toques la luminancia.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // caída (~30% a 100blk / ~75% a 400blk)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // solo baja saturación (luminancia intacta)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 Normales de ola + destello solar ("camino del sol" en el agua)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // altura h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // dh/dx
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // dh/dz
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = bloxdWorldPosition(l.position);
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdTime()), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);
        let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
        out.colour += glint * vec3f(1.0);
    }
    #endif
    return out;
}
```

### R9.8 Micro-relieve procedural (truco ante la prohibición de texturas)

```wgsl
fn pack_hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}
fn pack_bumpNormal(p: vec3f, n: vec3f, strength: f32) -> vec3f {
    let e = 0.15;
    let h0 = pack_hash(p);
    let hx = pack_hash(p + vec3f(e, 0.0, 0.0));
    let hz = pack_hash(p + vec3f(0.0, 0.0, e));
    let tangentX = normalize(cross(vec3f(0.0, 1.0, 0.0), n) + vec3f(0.0001, 0.0, 0.0));
    let tangentZ = normalize(cross(n, tangentX));
    return normalize(n + tangentX * (hx - h0) * strength + tangentZ * (hz - h0) * strength);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // coords locales del bloque
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lam = clamp(dot(n, sunDir), 0.0, 1.0);
        let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
        out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
    }
    #endif
    return out;
}
```

### R9.9 Oscurecimiento no lineal de cuevas + protección de lámparas

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let keep = 0.12 + 0.88 * blockInt;          // levanta focos con lámparas
    out.colour *= mix(keep, 1.0, sky * sky);     // oscurecimiento no lineal (al cuadrado)
    #endif
    return out;
}
```

### R9.10 Reaplicar niebla (obligatorio al descartar engineColour)

> Poner un suelo como `max(l.fogVisibility, 0.25)` limita "no más denso que esto"
> (0.0 = fiel al motor / 0.3–0.5 = distancia más clara).
> Nota: la niebla del motor es lineal solo de horizonte (cerca de la distancia de dibujado); la bruma media debe construirla el paquete.
> Ajustes reales de niebla (verificados en implementación): linear fijo / `fogStart` = distancia de chunks / `fogEnd` = +1 chunk / efectivamente desactivada a 100–101 chunks con niebla off / color por defecto RGB(183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // rehacer niebla (0.15 = suelo ligero)
    col += s.emission * l.fogVisibility;            // emisión también con niebla
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 Grado cine (sombras frías / altas cálidas / desaturación nocturna)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;  // noche solo cuando la dirección solar es cero; sin degradado de ocaso
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 Sombras proyectadas — inversión del realce + corte por umbral (definitivo)

> **Repaso de la premisa (sección 10)**: `l.skyLight` no es el valor de vóxel crudo (n/15) sino el valor tras la "curva de realce" del motor  
> `y = 1-(1-x/(3-2x))³` (una curva S que levanta zonas oscuras).
>
> | Lugar | vóxel crudo | realzado (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | cielo abierto | 1.00 | 1.00 | 1.00 |  
> | bajo árbol (radio 2) | 0.87 | **0.97** | **0.86** ← casi intacto |  
> | radio 3 | 0.80 | **0.92** | 0.66 |  
> | radio 5 | 0.67 | 0.78 | 0.29 |
>
> **Esta es la causa demostrada de "las sombras no se profundizan con gamma"**. Pero la curva es monótona e invertible algebraicamente:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Tras restaurar valores crudos, basta binarizar con un corte por umbral (`smoothstep`).  
> La dispersión BFS de LightEngine es "1 bloque = -1", así que el umbral `th = 1 - r/15` marca directamente  
> "la oclusión de radio r o más cuenta como sombra". Romper bloques mueve las sombras al instante (LightEngine recalcula en tiempo real).  
> Limitación: las sombras usan como base "el cielo hacia arriba", así que no rotan con el sol (sección 15, "La verdad sobre las sombras").

```wgsl
// Invierte exactamente el realce del motor para restaurar el skyLight de vóxel crudo (n/15)
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // sin cbrt en WGSL, usa pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // dial de radio de sombra: th = 1 - r/15 (0.87 = radio 2+ es sombra)
const shSoft = 0.04;   // suavidad de borde (0.02 = duro / 0.08 = suave)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. restaura valores crudos (saltarlo jamás da sombras)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. corte por umbral — separa limpiamente sol=1 / sombra=0
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // Lambert solar (recurre a l.directional cuando no hay sol)
    let sunLen = length(bloxdSunDirection());
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                      sunLen > 0.5);
    // la esencia de la proyección: el sol directo solo llega donde el cielo es visible
    let lit = sunL * sky;
    // lado sombra: teñido azul cielo, no negro + ambiente mínimo
    let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
    var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
    // la luz de antorcha atraviesa sombras (blockLight también realzado: restaura junto)
    let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                         sh_unlift(l.blockLight.g),
                         sh_unlift(l.blockLight.b));
    let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
    col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
    // reaplica niebla (la parte del engineColour descartado)
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // no olvides emission (con niebla)
    #endif
    return out;
}
```

> Guía de ajuste: **el área de sombra la decide solo `shTh`** — `0.93` = radio 1.5+ / `0.87` = radio 2 / `0.80` = radio 3 / `0.67` = radio 5.  
> La dureza del borde es `shSoft` (0.02 = duro / 0.08 = suave). La oscuridad del núcleo es el doble ajuste de `0.09` (ambiente mínimo) y `0.16` (luz dispersa del cielo).  
> Para ensanchar sombras al atardecer, suma `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (aproximación de sombras largas de tarde.  
> `sunDir` es `bloxdSunDirection() / length(bloxdSunDirection())`). Para sombras más azules sube el B de `vec3f(0.72, 0.82, 1.05)`.
>

[← Parte anterior](02-api.md)·[Volver al manual](README.md)·[Parte siguiente →](04-realism.md)

[← Parte anterior](03-recipes.md)·[Volver al manual](README.md)·[Parte siguiente →](05-troubleshooting.md)

# Parte IV: Guía de realismo

> El juego actual exige `apiVersion: 4` desde el 2026-10-26 y rechaza los paquetes v1/v2/v3 al cargar — el contenido siguiente está escrito sobre la especificación v2. Consulta [Parte IX](09-apiv3.md) y [Parte X](10-apiv4.md) para migrar antes de distribuir.

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

[← Parte anterior](03-recipes.md)·[Volver al manual](README.md)·[Parte siguiente →](05-troubleshooting.md)

[← Parte anterior](04-realism.md)·[Volver al manual](README.md)·[Parte siguiente →](06-implementation.md)

# Parte V: Solución de problemas y notas

> El juego actual exige `apiVersion: 4` desde el 2026-10-26 y rechaza los paquetes v1/v2/v3 al cargar — el contenido siguiente está escrito sobre la especificación v2. Consulta [Parte IX](09-apiv3.md) y [Parte X](10-apiv4.md) para migrar antes de distribuir.

## 17. Errores comunes y soluciones

| Síntoma | Solución |
|---|---|
| No carga en juegos estrictos | Envuelve el hook vertex en `#ifndef BLOXD_STRICT` |
| `.alpha` reportado indefinido | Envuelve en `#ifdef BLOXD_ALPHA` |
| `blockLight` reportado indefinido | Envuelve en `#ifdef BLOXD_LIGHTING`. Envuelve funciones auxiliares compartidas **como funciones enteras** (en v2 el campo existe en todas las variantes: rara vez ocurre. Mantén las guardias usadas para detección) |
| `Packs can't construct BloxdSurface directly` | Empieza desde `bloxdDefaultSurface(s)` |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | Envuelve en `#ifndef BLOXD_STRICT` |
| Distancia blanca y lechosa | Suele ser doble niebla. El color terminado ya lleva niebla: mantén sutil la bruma propia y prefiere reducir solo saturación |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | Aviso de que la cola de semillas de luz se desbordó en zonas de alta densidad de emisores o entre regiones, y el cálculo de luz de ese chunk se quedó a medias. No proviene del paquete, pero **los huecos de luz junto a concentraciones de emisores se deben a esta especificación** — reparte las fuentes de luz por el mundo para evitarlo |
| Paquete excluido al unirse al juego | Falla la comprobación en vivo del juego. Revisa omisiones de guardias |
| La comprobación en vivo no termina nunca y el paquete cae con `This device couldn't check …` etc. | La comprobación tiene un límite forzado de 60 segundos (el exceso cuenta como `skipped`). Suele pasar en dispositivos lentos o mundos pesados; reduce trabajo de vértices intenso y bucles complejos, y reintenta |
| `pack.json needs "apiVersion": 3.` | Falta `apiVersion` o no es `3`. Añade el número `3` (la cadena `"3"` se rechaza). Los paquetes v1/v2 se rechazan con `shaderPack:loadWrongApiVersion` |
| `There's no pack.json at the top of the pack.` | Sin `pack.json` en la raíz del ZIP. Revisa no haber comprimido la carpeta misma |
| `bloxdTerrainVertex must be declared as: fn ...` | Firma distinta. Reescribe exactamente como se muestra |
| `bloxdTerrainVertex can't run in strict games...` | Envuelve el hook vertex en `#ifndef BLOXD_STRICT` |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | Envuelve en `#ifdef BLOXD_LIGHTING` (en v2 el campo existe en todas las variantes: rara vez ocurre) |
| Subir `pow(l.skyLight, γ)` jamás profundiza sombras | `skyLight` es valor post-curva (crudo 0.87 llega como 0.97). Cambia a inversión + umbral de R9.12 (sección 10) |
| `... can only be a function's parameter or return type, ...` | `var x: BloxdSurface;` sin inicializar es rechazado. Construye desde `bloxdDefault*` |
| `bloxdPackInputs isn't part of the bloxd_ header` | El uniform PackInputs no se puede referenciar desde paquetes directamente. Úsalo vía funciones de cabecera como `bloxdTime()` |
| `Packs can't declare bloxd_ names...` | Quita el prefijo `bloxd_` de tus identificadores. Solo los 6 nombres de hook pueden definirse |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` se rechaza. Escribe `_ = f();` |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | Envuelve las llamadas `bloxdOpaqueBehind()` en hooks de terreno con `#ifdef BLOXD_SCENE_DEPTH` |
| `...only surface and light hooks can use.` | Quita `bloxdOpaqueBehind()` de hooks vertex (solo surface / light) |
| `Lite: …reads scene depth on a page that didn't turn it on` | Recarga la página y reábrela con activado el pack que lee profundidad ([Parte VIII](08-apiv2.md), sección 35). La disponibilidad de la textura de profundidad se fija en la generación de la página |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | No es error sino autodesactivación en juegos estrictos (`shaderPack:offInStrict`). Envuelve hooks vertex y `discard` con `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Error de segunda etapa (Tint del navegador). Pon entre paréntesis operandos de `^` `&` `\|` `<<` `>>` (§38) |
| `loadDuplicateManifest` al cargar zip | Dos `pack.json` (incluidas variantes de mayúsculas/minúsculas). Deja uno |
| 「needs the new WebGPU renderer, so remove the renderer override...」 | Quita el `?renderer=` de la URL y el `bloxdRenderer` de localStorage, y recarga ([Parte VII](07-internals.md), sección 29) |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Reescribe desde `bloxdDefaultSurface(s)`. Empezar de una copia del primer parámetro del hook light (`var out = s;`) también vale |

### IDs de error en la etapa de carga

Los errores de la pantalla de ajustes llevan IDs `shaderPack:load*`. Como ayuda para localizar el mensaje:

| ID | Significado |
|---|---|
| `loadZipTooBig` | zip de más de 32MB |
| `loadTooManyZipEntries` | más de 1024 entradas en el zip |
| `loadTooManyWgsl` | más de 256 archivos `.wgsl` |
| `loadSourceTooBig` | `.wgsl` total de más de 256KB (comprobación en streaming por archivo) |
| `loadManifestTooBig` | `pack.json` de más de 64KB |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` no es JSON / no es objeto |
| `loadNoApiVersion` / `loadWrongApiVersion` | sin `apiVersion` / no es `3` (paquetes v1/v2 rechazados) |
| `loadNoName` / `loadAuthorNotString` | sin `name` / `author` no es cadena |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | compresión no soportada / zip64 / dividido / cifrado |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | rutas duplicadas / no UTF-8 / fallo de descompresión / zip dañado |

`loadNoManifest` / `loadDuplicateManifest` (posición del `pack.json` / duplicados) — ver las filas correspondientes en la tabla de arriba.

## 18. Derechos y notas

- La función de paquetes de sombreadores es una función oficial cargable desde la interfaz del juego, y crear paquetes se considera uso previsto. Pero no se ha confirmado documentación oficial pública
- Los paquetes son WGSL puro — la ejecución de JS y el acceso a red son imposibles por diseño
- Esta es una guía no oficial, no la postura oficial de los desarrolladores. La API puede cambiar sin aviso

[← Parte anterior](04-realism.md)·[Volver al manual](README.md)·[Parte siguiente →](06-implementation.md)

[← Parte anterior](05-troubleshooting.md)·[Volver al manual](README.md)·[Parte siguiente →](07-internals.md)

# Parte VI: Notas importantes de implementación

> El juego actual exige `apiVersion: 4` desde el 2026-10-26 y rechaza los paquetes v1/v2/v3 al cargar — el contenido siguiente está escrito sobre la especificación v2. Consulta [Parte IX](09-apiv3.md) y [Parte X](10-apiv4.md) para migrar antes de distribuir.

## 19. Corregir "sombras oscuras pero superficies brillantes" de noche

Oscurecer solo sombras deja el color terminado (`engineColour`) brillante sin sol, y el salto cara/sombra se vuelve antinatural. Atenúa todo el color terminado.

El ejemplo trata `bloxdSunDirection()` cero como noche y sol direccional como día, atenuando los colores terminados del terreno en horas oscuras. Donde `blockLight` y `heldLight` son fuertes, la atenuación se debilita para preservar lámparas cercanas como antorchas. `0.52` es un valor de ajuste — bájalo para noches más oscuras.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    #ifdef BLOXD_LIGHTING
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
    let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
    let protectLocalLight = smoothstep(0.03, 0.35, localLight);
    scale = mix(nightDim, 1.0, protectLocalLight);
    #endif
    // atenúa el color terminado; suma la emisión del material con niebla por defecto
    out.colour = l.engineColour * scale + s.emission * l.fogVisibility;
    return out;
}
```

**Límites de esta corrección:** si `bloxdSunDirection()` se comporta como "dirección unitaria con sol, cero sin él", día/noche se distinguen pero el ocaso no se estima suavemente. Y como atenúa el color terminado, debilita juntos la luz diurna y el ambiente del motor — no es una reproducción total del horario. Para aplicar lo mismo a líquidos, revisa la relación de reserva de hooks de líquido.

## 20. Receta integrada para agua de aspecto natural

Esta API no puede muestrear color de escena: es **estilizado pseudo con mezcla de color fresnel e iluminaciones solares, no reflejo/refracción reales** (el cálculo de profundidad llegó en v2 con `bloxdOpaqueBehind()`, separado en [Parte VIII](08-apiv2.md) R-E). La muestra conserva el color base, mezcla un poco hacia un color cielo en ángulos rasantes y añade un pequeño destello solo con sol.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = bloxdWorldPosition(l.position);
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdTime()), topness));
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let halfDir = normalize(viewDir + sunDir);
        let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
        out.colour += vec3f(1.0, 0.97, 0.90) * glint;
    }
    #endif
    return out;
}
```

Pistas de ajuste:

- Agua blanca/lavada: baja `0.38` en `fresnel * 0.38` y el destello `0.55`.
- Agua muy oscura: mezcla algo más de `fakeSkyReflection`. En exceso parece plástico.
- Líneas o rayas regulares en el agua: baja frecuencias de ola y fuerza de destello. Este código no desplaza vértices de malla.
- Reflejos reales del paisaje: las entradas de esta API no tienen color de pantalla: mezclar colores jamás es reflejo real (profundidad solo limitada a líquidos. [Parte VIII](08-apiv2.md) R-E).

Esta receta **reemplaza** un `bloxdLiquidLight` existente. No la pegues junto a la función de ola homónima de R9.7 ni otros hooks homónimos.

## 21. Lista de pruebas en el juego

El éxito de compilación y el "buen aspecto" son cosas distintas. Revisa en este orden:

1. **Carga:** `pack.json` en la raíz del ZIP. Justo tras seleccionar aparece `Ready. Reload the page to use it.` y el paquete se activa **al recargar la página**; confirma después `Ready to use`. Los paquetes guardados se revalidan automáticamente en la siguiente carga de página: desde la parte del motor se comprueba el fingerprint del contenido de la cabecera (pasa = se mantiene tal cual / falla = se marca como bloqueado), así que un paquete antiguo roto nunca queda activo en silencio.
2. **8 variantes:** sin omisiones de guardias de tipos en strict / allow, iluminación on / off, terreno / líquido. Aunque un juego solo use algunas condiciones, los paquetes de distribución deben asumir las 8.
3. **Día:** colores sin reventar por material (hierba, piedra, arena, madera); salto claro/oscuro natural entre caras altas y laterales.
4. **Noche:** compara los mismos materiales a plena luz pasada, sombras y cercanía de antorchas. Si solo quedan caras iluminadas, ajusta la atenuación de exposición; si todo oscurece, ajusta la protección de luz local.
5. **Agua:** mira desde arriba, ángulos rasantes, orillas, bajo el agua y de noche por separado. El comportamiento alpha y el aspecto submarino dependen del compaginado del juego — nunca juzgues desde un solo punto de vista. Bajo el agua el velo del color de definición líquida se aplica al frente tal como se describe en [Parte VII](07-internals.md): las diferencias del paquete se ven sobre todo en la superficie y el terreno tras el velo.
6. **Bordes y distancia:** sin saltos de olas/patrones en transiciones de chunk / origen; sin doble niebla ni bruma blanca a lo lejos.
7. **Rendimiento:** efectos pesados en hash/trig/`pow` por fragmento al mínimo. Añade detalle poco a poco y compara FPS.

### Restricciones conocidas como premisas

- Los paquetes se limitan a hooks de terreno / líquido — sin manejo de cielo, entidades o UI con el mismo código.
- No existen entradas para añadir mapas de sombras, reflejos en espacio de pantalla, refracción, bloom, etc. (la profundidad de escena se desbloqueó limitada a líquidos como `bloxdOpaqueBehind()`. Ver [Parte VIII](08-apiv2.md)).
- `bloxdTime()` es tiempo de animación sin vínculo garantizado con el día/noche del juego.
- Con `bloxdSunDirection()` cero la verdadera dirección lunar es desconocida, no "física de luz lunar" sino aproximación de ambiente. La luz lunar direccional se construye desde `-bloxdSunDirection()` (solo mundos con ciclo día/noche. [Parte VII](07-internals.md) R-A).
- `s.position` / `l.position` son coordenadas locales: suma `bloxdOriginOffset()` para efectos dependientes del mundo. Para patrones locales del bloque, las coordenadas locales son la herramienta intencionada.

## 22. Combinar con otros paquetes cuando el sombreador solo llega a su límite

Como los paquetes no pueden añadir ni muestrear texturas, no intentes resolver bultos finos de material o imágenes del cielo solo con sombreadores. El repositorio público de paquetes de texturas para Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) maneja texturas, skybox, modelos, etc. por otra vía.

Como referencia, distribuciones comunitarias "cinematic shader" analizadas en un caso resultaron ser paquetes de texturas (texturas 128x128 sin `pack.json` / `.wgsl`).

En la práctica, **ajusta luz y color con sombreadores y cubre materiales y cielo con un paquete de recursos a juego**. Pero verifica el co-uso y el orden de carga según la implementación y ajustes del juego.

Los paquetes de texturas tienen su propia especificación (a título de referencia): el límite de tamaño es 25MB medido como la longitud de la cadena JSON codificada en base64; y codificar un PNG en base64 infla un +33%, así que el techo práctico en imágenes crudas queda en ~18–19MB. El CSS lo procesa un parser simple basado en regex — evita anidamientos y comentarios.

## 23. Realidad submarina con paquetes de sombreadores

Los looks submarinos constan de 3 capas:

| Capa | Contenido | Operable desde paquetes? |
|---|---|---|
| ① Render de terreno/líquido | Procesable por hooks. Los hooks light se llaman con normalidad bajo el agua | Sí (funciona "bajo el velo") |
| ② Velo de definición líquida | Quad emissive de pantalla completa del color/alpha de definición del bloque líquido de la cámara, dibujado delante del todo. El ajuste `cameraTint` gana si existe | No (ni color ni densidad cambiables) |
| ③ cameraTint | Ajuste del juego | No |

Puntos prácticos: los paquetes siguen funcionando bajo el agua / el velo no se puede quitar / bajo el agua no se puede ramificar (fogStart / fogEnd / fogColour no cambian bajo el agua: fogVisibility tampoco lo detecta).

[← Parte anterior](05-troubleshooting.md)·[Volver al manual](README.md)·[Parte siguiente →](07-internals.md)

[← Parte anterior](06-implementation.md)·[Volver al manual](README.md)·[Parte siguiente →](08-apiv2.md)

# Parte VII: Suplemento de interioridades

> El juego actual exige `apiVersion: 4` desde el 2026-10-26 y rechaza los paquetes v1/v2/v3 al cargar — el contenido siguiente está escrito sobre la especificación v2. Consulta [Parte IX](09-apiv3.md) y [Parte X](10-apiv4.md) para migrar antes de distribuir.

Especificaciones extra halladas por análisis de implementación del motor. Todo restaurado directamente del JavaScript del build de producción actual.

## 24. Identidad del sol y la luna

La fuente de `bloxdSunDirection()` es un búfer de dirección solar reescrito solo cuando cambia el tipo de skybox — el criterio no es "si el cielo tiene sol" sino **"si el skybox es tipo tierra"**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (cielo procedural) | No cero (defectos abajo) |
| `gloomy` / `interstellar` / `space_*` (texturas cubo) | **Siempre (0,0,0)** |

**La luna está siempre en `-bloxdSunDirection()`** (el motor calcula la posición lunar como el opuesto exacto del sol). La noche se juzga por altura solar — hay luna arriba cuando `bloxdSunDirection().y < 0` (sol bajo el horizonte). Pero en mundos por defecto el sol está estático y la luna también — solo los mundos con ciclo día/noche la ven moverse.

La dirección solar por defecto ronda `(-0.56, 0.81, -0.18)` (vector unitario de inclination = −0.2 / azimuth = 0.55, estático). Referencia práctica para predecir direcciones de brillo al probar paquetes de distribución.

Los ciclos día/noche no están integrados en el motor — inclination es un número estático que los mundos con día móvil actualizan lado juego. `bloxdSunDirection()` sigue cada actualización.

Las luces direccionales del terreno son solo 2 lámparas creadas al arrancar escena, de **dirección e intensidad fijas, sin cambio día/noche**. En corto: **ningún factor de brillo del terreno depende del tiempo. Los "looks" día/noche vienen solo del skybox y bloxdSunDirection()**, así que los paquetes que oscurecen de noche deben estimar la franja horaria desde bloxdSunDirection() (la técnica `sunPresent` de §19).

### R-A. Luz lunar direccional — moonDir = −bloxdSunDirection()

Añade Lambert blanco-azulado y especular débil solo mientras la luna está arriba. `moonUp` es 0 en mundos de sol estático por defecto: allí no pasa nada — **luz lunar que solo se activa en mundos con ciclo día/noche, luego segura**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
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
    #endif
    return out;
}
```

## 25. Interioridades de la niebla

El cómputo de niebla es siempre modo LINEAR (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), con `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = ajuste de niebla; solo D = 0 es especial con fogEnd = 5). **La banda de gradiente es de solo 32 bloques**, y `l.fogVisibility` es menos "bruma por distancia" que **distancia normalizada al borde del mundo cargado**. Varía por jugador con la distancia de carga: los efectos por distancia deben calcular `distance(l.position, bloxdEyePosition())` ellos mismos (receta R-B). (Nota de v3: la función de niebla del renderizador implementa en realidad **cuatro** modos — off / exponencial / exponencial al cuadrado / lineal — con los títulos distribuidos activando el lineal; el código fuente restaurado y el argumento de robustez están en la [Parte IX](09-apiv3.md) §50.)

Color de niebla por defecto `rgb(183, 191, 195)` (gris azul pálido). Los creadores de mundos lo cambian vía `fogColourOverride` (hex). Con modo niebla 0 (NONE), **fogColour llega negro**. La forma estándar `mix(l.fogColour, col, l.fogVisibility)` es segura pues el color de niebla no se usa a fogVisibility 1. La API de script tiene además dos opciones, `fogChunkDistanceOverride` y `fogOnSkybox`: juegos personalizados pueden fijar a la vez la distancia de niebla (el valor D) y la aplicación de niebla al skybox. Por defecto el skybox no es afectado por la niebla (solo en juegos con `fogOnSkybox` activado el skybox también se tiñe con el color de niebla).

Ajustar `showFog` a false empuja la niebla a 3200–3232 bloques, desactivándola de hecho (`fogVisibility ≈ 1` sigue viniendo).

### R-B. Banda de borde de carga — fogVisibility como "borde del mundo"

Enfría en silencio solo la banda de 32 bloques del borde de carga para disimular el fin del mundo (o enfatizarlo como efecto). Sin distancia autocalculada: sigue auto los ajustes de distancia de carga del jugador.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = dentro (margen al borde), 0 = a punto de salir del borde
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. Interioridades de blockLight / heldLight

`blockLight` es **luz coloreada** de tres canales RGB. Cada bloque emisor define un color de emisión `[R, G, B]` (0–15 en cada uno) que queda como color de la luz tal cual (antorcha normal = blanco cálido (14,14,12) / lava = naranja (14,8,2) / beacon = cian (5,14,14) / antorcha blanca = (15,15,15), etc.). En la etapa vértice llega empaquetado como 4 nibbles — r / g / b / sky — en un solo atributo float. Tratar los tres canales por separado dentro del hook light habilita una iluminación local coloreada — la receta de antorcha cálida (R9.1) está calibrada contra este comportamiento.

Al decodificar `aPackedLightLevels`, el motor pone a cada canal un **suelo del 35% del canal RGB más brillante**. P. ej. una "luz roja pura" se eleva a (1.00, 0.35, 0) en vértices antes de interpolación y realce. El naranja de antorcha viéndose "rosa blanquecino más que rojo" viene de aquí — ajusta la saturación de recetas de antorcha cálida (R9.1) contra este default.

La composición de la iluminación no es aditiva. Internamente el motor toma el **max** entre la luz de bloque (tras el suelo del 35%) y la luz de cielo construida como `mix(ambientColour, skyColour, skyLight)`, y toma max otra vez con la luz de mano (tras su boost ambiental). Los valores de canal de esta composición son los valores **post-realce** — el motor compone a partir de los mismos niveles de luz realzados que llegan a las entradas del hook (`terrainLightLevels` tras la curva de realce), tanto en v2 como en v3. Por tanto `blockLight` y `skyLight` nunca se anulan entre sí — la contribución del lado más oscuro simplemente se descarta — con lo que debilitar la luz de cielo apenas oscurece los puntos dominados por la luz de bloque. Diseña las recetas de exposición/atenúa sobre esta estructura (la protección de luz local de [Parte VI](06-implementation.md), sección 19 existe para compensarlo).

La luz de mano (`heldLight`) tiene alcance según el canal más brillante (máx 15 bloques) con preproceso `dist^0.75`, el mismo suelo 35%, y `l.heldLight` es el valor **pre**-boost ambiental. La caída del cono, restaurada del módulo de luz del motor: la atenuación angular del haz es `1 − 0.5 × (smoothstep(0.12, 0.65, t) + smoothstep(0.62, 0.95, t))`, donde `t` es el ángulo normalizado respecto al eje del cono (0 = centro, 1 = borde); el alcance es `(rangeOverride > 0 ? rangeOverride : canal más brillante) × caída del cono`, con `rangeOverride` leído del alfa del color de la luz sostenida; dentro del alcance, un override atenúa por `(range − dist) / range`, mientras que el valor predeterminado resta la distancia (preprocesada) canal a canal; después vienen el suelo del 35%, la división por 15, la curva de realce y, por último, el boost ambiental. Los objetos personalizados pueden fijar `spotlightRange` y ángulo de cono — un modo "haz mientras se sostiene" cuyo cono sigue a la cámara. Los paquetes no pueden saber la dirección del haz.

Los bloques personalizados pueden llevar `skyLightEmission` (0–15), que **inyecta al propio canal skyLight, aparte del BFS de blockLight**. Los paquetes estilo R9.12 que juzgan sol/sombra por umbral skyLight pueden fallar en mundos con skyLight elevado por luces artificiales. Los paquetes de distribución juzgan más robusto combinado con blockLight.

## 27. Detalles de pipeline

- **Los hooks surface corren "antes" de alphaTest**: `out.alpha` alimenta el test de descarte directamente. Los materiales cutout (hierba, hojas) permiten efectos de disolución tipo dither (receta R-C). En líquidos (mezclado) `out.alpha` es la transparencia real (receta R-D). Sin efecto en terreno opaco normal — no confundir
- **Contenido de `l.ambient`**: `material.ambient × sceneAmbient`, distinto por material. El lado escena ata al ajuste gráfico "Ambient Lighting Intensity" (defecto 0.5) — nunca programes defectos fijos
- **`bloxdTime()` es realmente `performance.now()`**: el uptime del navegador envuelto a 1 hora. Sin relación con día/noche del juego ni tiempo de mundo transcurrido. Para animar sincronizado a un reloj de juego, estima la hora desde el azimut `bloxdSunDirection()` en mundos con ciclo día/noche
- **Las luces direccionales de la escena son un montaje de 2**: la suma Lambert de la luz principal (dirección desde la posición solar del ajuste de cielo, intensidad 1.0) y la luz de relleno (dirección `[-0.5, -1, -1]`, intensidad 0.35) llega a `l.directional`. La luz de relleno apunta hacia abajo, así que no aporta a las caras superiores y recoge las superficies orientadas hacia abajo (techos de cueva etc.). El terreno solo considera las luces añadidas en `_initScene`; las luces añadidas a la escena tras el arranque son ignoradas por terreno y modelos de bloque (un mensaje de advertencia oficial lo dice así)
- **Las funciones de cabecera leen un solo uniform**: el motor coloca un uniform de 64 bytes en `@group(3) @binding(0)` (4 slots — time / originOffset / sunDirection / eyePosition, little-endian), y `bloxdTime()` / `bloxdOriginOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` corresponden a leer esos slots. Los paquetes no pueden escribir este uniform, y como el WGSL del paquete y el del motor se fusionan en un solo módulo, declarar el mismo group/binding por tu cuenta también es imposible. (En v3 los dos slots se renombran a `seconds` / `renderOffset`, expuestos como `bloxdSeconds()` / `bloxdRenderOffset()`, y se añade la textura de profundidad de escena en `@group(3) @binding(1)`; ver [Parte IX](09-apiv3.md) §41 y §51.)
- **Los datos de vértice los construye el mesher (Web Worker)**: el terreno de bloques viaja intercalado a 28 bytes por vértice (32 bytes con el atlas activado) — position = float32×3 / normal = enteros de 8 bits con signo ×4 / colour = enteros de 8 bits normalizados ×4 (la sustancia de `s.colour` — tint × AO queda horneado en 8 bits en la etapa del mesher, con lo que separarlo o restaurarlo desde el paquete es imposible en principio) / UV = float32×2 / atlasIndex = float32. Solo los niveles de luz viajan en un buffer de vértice aparte de 4 bytes ([Parte VII](07-internals.md), sección 26, [Parte II](02-api.md), sección 11). Los vértices se dibujan con instancing por chunk
- Los finos dameros en bordes de chunk al cargar son el fundido de chunk por dither Bayer 4×4 en espacio de pantalla del motor, no bugs del paquete (desactivable por el ajuste gráfico `chunkFadeIn`)
- **`mod` es palabra reservada**: rechazado con `pack.wgsl:3 'mod' is a reserved word in WGSL.` Escribe restos con el operador `%`

### R-C. Disolución por dither Bayer — out.alpha controla discard

Reproduce la **misma tabla Bayer 4×4** que el motor usa en fundidos de chunk, disolviendo cutouts desde bloques bajos. discard se activa en materiales alphaTest (hierba, hojas); en líquidos es transparencia de mezcla.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod es reservado: usa el operador %
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // se disuelve desde bloques bajos; mayor dissolve persiste
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. Fundido de agua cercana a cámara — el alpha líquido despeja la vista

El `out.alpha` del hook líquido alimenta la mezcla directamente. Despeja solo la superficie bajo la cámara para asegurar la vista al bucear o con cámara sobre el agua.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 bloques de transparente total a normal
    #endif
    return out;
}
```

## 28. Qué cambia los valores visibles del paquete — lista de pruebas

El mismo paquete renderiza distinto según **mundo y ajustes de jugador**. Revisa al menos estos 3 entornos antes de distribuir:

1. **Mundo normal** (skybox default, sin overrides) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, colores por defecto
2. **Mundo con skybox espacial** — bloxdSunDirection() = 0. El look de la rama `sunPresent`
3. **Mundo personalizado con `visionMinLightColour` / `skyLightColourOverride`** — oscuros elevados y colores

Fuentes principales de variación: `lightingOverride` (iluminación forzada) / `skyLightColourOverride`, `ambientLightColourOverride` (cambios hex) / `visionMinLightColour` (suelo "color más oscuro visible". Implementado como max por componentes contra `uSkyLightColour` y `uAmbientLightColour`; Night Vision lo usa — los paquetes "cueva a oscuras" no oscurecen lo previsto, y el color del cielo en sí se eleva) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (presencia de bloxdSunDirection()). `uSkyLightColour` por defecto = (1,1,1) blanco, `uAmbientLightColour` por defecto = (0.25,0.25,0.30). `l.ambient` lado escena = ajuste gráfico "Ambient Lighting Intensity" (defecto 0.5). `l.fogVisibility` sigue los ajustes de niebla/distancia de chunks del jugador. Además `cameraTint` (tinte RGBA sobre toda la pantalla) y `proximityFadeDistance` / `proximityFadeMinOpacity` (fundido de proximidad de cámara para entidades) son factores de variación por ajustes de mundo — `cameraTint` en particular es un pase de composición final aplicado **sobre** la salida del paquete. Muchos de estos se fijan también vía la API de script (`serverOption`) y pueden actualizarse con la partida en marcha.

## 29. Medios de depuración

- Parámetro URL `?renderer=lite` — fuerza el renderizador Lite (WebGPU) (`webgl2` / `babylon` también valen; `babylon` es el nombre antiguo de webgl2). Prioridad: parámetro URL > localStorage `bloxdRenderer` > pantalla de ajustes > defecto (webgl2). Valores inválidos se ignoran con advertencia. Los overrides dejados en la URL o en localStorage pueden romper escenas que necesitan WebGPU (lite) junto con "needs the new WebGPU renderer, so remove the renderer override..." ([Parte V](05-troubleshooting.md), sección 17)
- Parámetro URL `?vconsole` — consola en pantalla (VConsole). Útil en verificación móvil real
- Parámetro URL `?drawcalls=1` — añade un panel de debug de estadísticas de draw. Escogiendo objetos del juego desde la consola de debug, o con `drawCalls()` / `why()` / `configureDrawCallWatching()`, sirve para inspeccionar overdrawing por mecanismos grandes (pack o no) y el enfoque al límite de ~65,000 vértices por draw call — útil para aislar cuellos de rendimiento
- La consola muestra `noa-engine v0.33.0` y `Renderer: lite from <fuente>` — revísalos primero para no diagnosticar mal la vía de render
- El renderizador WebGPU se bloquea "forzado ON" con paquete aplicado. El ajuste "Disable Block Texture Atlas" también se bloquea (el atlas queda ON), y en entornos sin WebGPU el paquete ni aplica. Base para escribir "necesita navegador WebGPU" en páginas de distribución
- Las texturas de bloque son una textura en 2D array (`texture_2d_array`) y el sampler del terreno es nearest + repeat. El mesher además fusiona caras con el mismo material / AO / luz en un solo rectángulo (**greedy meshing**), así que el UV de una cara fusionada puede exceder una anchura de tesela (bordes metidos 0.0015). El direccionamiento repeat del hardware sostiene la repetición, por eso las caras fusionadas se ven continuas. Ojo: el detalle procedural anclado a `vUV` se puede romper en los límites de caras fusionadas — anclalo mejor a la posición en el mundo (`s.position` + `bloxdOriginOffset()`)
- La revalidación runtime por partida (`checkCompilation`) compila materiales de terreno reales en WebGPU del navegador (más estricta que la validación estática de ajustes). Los paquetes que fallan aquí se excluyen de ese juego

## 30. Modos de aplicación por juego (`shaderPackPolicy`)

Aquí queda precisado lo que significan `allow / strict` a nivel de título (cf. §7). Solo los títulos cuya definición de juego lleva de forma explícita `shaderPackPolicy: "allow"` funcionan en modo completo (hooks vertex, `discard`, `alpha` de terreno); los títulos sin valor (o con un valor distinto de allow) son estrictos: se define `BLOXD_STRICT` y el código dentro de guardas se desactiva automáticamente. El lado del paquete no puede elegir esto, así que saber qué títulos ejecutan qué es un prerrequisito de la distribución.

- Build de referencia: `szby6g.main.94a7596c.js` (despliegue en producción a fecha de 2026-10-17). Enumerando estáticamente las 111 definiciones de juego: **26 entradas allow (12 títulos) / 85 entradas estrictas**. Los mismos 12 literales allow en los mismos 12 títulos se reconfirmaron sin cambios en el bundle de producción v3 (`3ymzdd`, 2026-10-20) — la lista de abajo se traslada tal cual a v3.
- Encima de `shaderPackPolicy` hay una compuerta por canal de distribución (aprox. `canUseShaderPacks`): en builds de portales externos (Coolmath Games etc.) el sistema de shader packs se puede desactivar antes de llegar siquiera a leer `shaderPackPolicy`. El análisis allow/strict de abajo parte del build web principal de bloxd.io.
- allow se declara en 12 lugares: 8 literales directos en definiciones de juego y 4 variables base (`tb` / `kz` / `cb` / `Fb`); las variantes lo heredan por spread (`{...tb,...}`). Hoy no existe ninguna sobreescritura por variante (tampoco el patrón inverso padre-allow / hijo-estricto).

Los 12 títulos allow (26 entradas en total):

- **Test Gym** — base + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (11 entradas)
- **Doodle Cube** — base + Solos / Duos (3)
- **Rocket Obby** — base + Sheep / January (3)
- **9 títulos individuales**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

En el lado estricto, los casos que más confunden:

- **Superflat Creative (classic_creativeFlat) es estricto.** El nombre contiene "Creative", pero en la familia classic solo el Creative normal (`classic_creative`) es allow. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns etc. son todos estrictos
- **Custom Games (customGames) es estricto.** Los efectos de hooks vertex no se disparan en juegos personalizados creados por el usuario. Para el trabajo de verificación, Test Gym es la opción segura
- Los títulos principales PvP / de servidor como bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) son todos estrictos

En los títulos estrictos el paquete sí se carga y compila, y las recetas del lado fragment como surface / light funcionan con normalidad. Lo restringido: los hooks vertex (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard` y la `alpha` de terreno (en líquidos existe siempre).

Esta lista refleja el análisis estático del build indicado; las actualizaciones del motor pueden cambiar el reparto allow/strict. Vuelve a comprobarlo al salir versiones nuevas.

[← Parte anterior](06-implementation.md)·[Volver al manual](README.md)·[Parte siguiente →](08-apiv2.md)

[← Parte anterior](07-internals.md)·[Volver al manual](README.md)

# Parte VIII: Guía de migración a API Version 2

> El juego actual exige `apiVersion: 4` desde el 2026-10-26 y rechaza los paquetes v1/v2/v3 al cargar — el contenido siguiente está escrito sobre la especificación v2. Consulta [Parte IX](09-apiv3.md) y [Parte X](10-apiv4.md) para migrar antes de distribuir.

Build objetivo: `6qxffk.main.5912a15f.js` (despliegue en producción a 2026-10-16). Las Partes I–VII de esta guía ya están reescritas a la base v2; esta Parte VIII recoge los puntos de migración desde v1 y las novedades de v2. Los ejemplos de código de novedades pasan la validación de 8/8 variantes en el compilador v2 y la validación del compilador WGSL del navegador (Tint) (§38), pero la conversión v2 de recetas existentes es sustitución mecánica de identificadores — verifica siempre con compilación en juego antes de distribuir.

## 31. Destino de los paquetes v1 (conclusión primero)

El juego exige que el `apiVersion` del manifiesto **coincida estrictamente con 2**. Cargar un paquete v1 se rechaza con `This pack is for shader pack API version 1. Bloxd supports version 2.` (clave i18n `shaderPack:loadWrongApiVersion`). **No hay soporte paralelo v1/v2**. El motor también re-verifica el `validation.headerVersion` de paquetes guardados (hash del texto completo de la cabecera): el mecanismo que marca paquetes guardados "a re-verificar" en actualizaciones del motor es igual que en v1.

## 32. Renombrado total de identificadores (tabla de correspondencia)

v2 unifica el nombrado con guiones bajos a camelCase. **Los nombres viejos son totalmente inutilizables.**

| v1 | v2 |
|---|---|
| `bloxd_terrain_vertex` | `bloxdTerrainVertex` |
| `bloxd_terrain_surface` | `bloxdTerrainSurface` |
| `bloxd_terrain_light` | `bloxdTerrainLight` |
| `bloxd_liquid_vertex` | `bloxdLiquidVertex` |
| `bloxd_liquid_surface` | `bloxdLiquidSurface` |
| `bloxd_liquid_light` | `bloxdLiquidLight` |
| `bloxd_defaultVertex` | `bloxdDefaultVertex` |
| `bloxd_defaultSurface` | `bloxdDefaultSurface` |
| `bloxd_defaultLight` | `bloxdDefaultLight` |
| `bloxd_VertexIn` | `BloxdVertexIn` |
| `bloxd_Vertex` | `BloxdVertex` |
| `bloxd_SurfaceIn` | `BloxdSurfaceIn` |
| `bloxd_Surface` | `BloxdSurface` |
| `bloxd_LightIn` | `BloxdLightIn` |
| `bloxd_Light` | `BloxdLight` |
| `bloxd_packInputs` (uniform interno) | `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) |

Los tipos de hook (vertex / surface / light × terrain / liquid, 6 en total) y el formato `pack.json` (`apiVersion` / `name` / `author`) no cambian. Los límites del cargador tampoco (zip 32MB / 1024 entradas / 256 archivos `.wgsl` / 256KB total / 64KB manifiesto).

## 33. Destino de los campos eliminados

En v1, `time` / `eyePosition` / `sunDirection` / `originOffset` eran campos de structs. En v2 **esos campos se eliminan; en su lugar se usan funciones de cabecera que leen el uniform del motor (`bloxdPackInputs`)**. Como las funciones leen el uniform directamente, **pueden llamarse desde funciones de ámbito de módulo fuera de los hooks y desde hooks vertex**.

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` para conversión a coordenadas de mundo | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

## 34. Novedad ①: `blockId` (sombreado por bloque)

Los tres structs `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` ganan `blockId: u32`. Es el **ID del bloque dueño** (0–65535), uniforme en toda la cara (pasado con `@interpolate(flat)`). Úsalo para identificar tipos de bloque sin depender del color de textura. Pero la tabla ID-tipo vive dentro del motor y es invisible desde paquetes: **qué ID es qué bloque se puede medir en el mundo o consultar en la referencia de abajo**. Internamente este ID viaja cocinado en el alfa del color de vértice (8 bits bajos) y en la w de la normal (8 bits altos) — 16 bits en total, de ahí el tope de 65535. El sistema blockId en sí se activa solo mientras existe un paquete de sombreadores activo (sin paquete los cables guardan sus objetivos de relleno, pero dentro de las definiciones de struct de la Parte II esta diferencia es inobservable).

**Referencia**: el autor publica una lista de entradas del juego en [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (`entries.json`: tabla id ↔ nombre de bloque; las variantes de rotación/meta como `Furnace|meta|rot2` figuran como IDs separados). Las correspondencias pueden cambiar con las actualizaciones del juego; lo definitivo se confirma en el juego real.

Ejemplos de bloques comunes (de entries.json a fecha de 2026-10-18; solo las familias de terreno de id bajo):

| ID | Nombre de bloque | ID | Nombre de bloque |
|---|---|---|---|
| 0 | Air | 15 | Maple Wood Planks |
| 1 | Unloaded | 28 | Stone |
| 2 | Dirt | 29 | Messy Stone |
| 3 | Messy Dirt | 31 | Smooth Stone |
| 4 | Grass Block | 126 | Water |
| 5 | Sand | 128 | Bricks |
| 6 | Clay | 139 | Ice |
| 7 | Gravel | 147 | Bedrock |
| 8 | Snow | 149 | Cactus |
| 9 | Maple Log | 1491 | Lava |

entries.json también lista ítems que no son bloques (herramientas etc.), pero solo los ids de familia de bloque llegan a los hooks de terreno / líquido.

### R-F. Tinte por tipo de bloque vía blockId

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // p. ej. inclina ids pétreos (patrón de bits altos) al frío
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

### R-G. Medir blockId en el mundo — el pack de plano de bits

Receta de debug para consultar en el mundo los ids de bloques ausentes de la tabla de correspondencias. Cambia la constante `plane` inicial por `0, 1, 2, …` mientras lees el color de la cara del bloque que quieres identificar.

```wgsl
const plane: u32 = 0u;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let d = (s.blockId >> (plane * 3u)) & 7u;
    var palette = array<vec3f, 8>(
        vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 1.0, 0.0),
        vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 1.0));
    out.colour = palette[d];
    return out;
}
```

El color de la cara codifica 3 bits de blockId directamente como RGB (negro = 0 / rojo = 1 / verde = 2 / amarillo = 3 / azul = 4 / magenta = 5 / cian = 6 / blanco = 7). Una observación lee un dígito octal. Si p0 → p3 leen 3, 2, 7, 2, el octal 2723 = 1491 leído desde el dígito superior es el id (Lava). Las familias de terreno de id bajo se completan con dos observaciones (p0, p1). Usa solo el hook surface, así que corre también en títulos strict.

### R-H. Hacer ondear solo las hojas — acotar el hook vertex por blockId

La receta de viento R7 ([Parte III](03-recipes.md)) ondea todo el terreno, pero el hook vertex también puede leer `blockId`, así que se puede acotar el objetivo a bloques de hoja. La lista de ids y el array WGSL (medidos a fecha de 2026-10-18; 22 variedades — Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / variantes con fruta / Autumn Aspen):

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// los hooks vertex se auto-desactivan en títulos strict (ver sección 36)
#ifndef BLOXD_STRICT

fn sp_isLeaf(id: u32) -> bool {
    for (var i = 0u; i < 22u; i++) {
        if (LEAF_IDS[i] == id) { return true; }
    }
    return false;
}

fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    if (sp_isLeaf(v.blockId)) {
        let wp   = bloxdWorldPosition(v.position);
        let t    = bloxdTime();
        // el desplazamiento es una función suave de la posición en el mundo. Los vértices compartidos que apuntan
        // al mismo punto del mundo se mueven igual, así que las caras nunca se desgarran ([Parte III](03-recipes.md) R7 - mismo principio)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- La lista de ids crece con las actualizaciones del motor (solo durante la medición, un build nuevo añadió 50 clases de bloque). Para seguir usándola, consulta los añadidos vía [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) o mídelos con el display de plano de bits de R-G, y extiende el array
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) son esterillas de hoja no sólidas sobre el suelo. El ondeo las hace parecer que se despegan del suelo, con lo que excluirlas del array es una opción
- En títulos strict el hook vertex se desactiva en bloque, pero con la guardia de arriba el paquete simplemente "deja de ondear" — los efectos del lado fragment siguen funcionando

## 35. Novedad ②: `BLOXD_SCENE_DEPTH` y `bloxdOpaqueBehind()` (la principal)

El acceso a profundidad, estructuralmente imposible en v1, se desbloquea **solo para programas liquid**. Sin color, pero **la geometría — distancia y posición de la cara opaca trasera — está disponible**. El uso típico es calcular color de absorción desde el grosor de agua medido.

Reglas de uso:

| Uso | Resultado |
|---|---|
| Llamado sin guardia en `bloxdLiquidSurface` / `bloxdLiquidLight` | OK (siempre definido en variantes liquid) |
| Llamado sin guardia en `bloxdTerrainSurface` | ERROR. Envuelve con `#ifdef BLOXD_SCENE_DEPTH` |
| Llamado en hooks vertex | ERROR (solo hooks surface / light) |

Para usar profundidad también en hooks de terreno, envuelve con `#ifdef BLOXD_SCENE_DEPTH` (los hooks de terreno se reutilizan en programas liquid: la profundidad solo vive del lado liquid).

### R-E. Absorción por grosor de agua (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // longitud de columna de agua = de aquí a la cara opaca trasera
        let thickness = distance(behind.position, surface.position);
        // absorción Beer-Lambert: el rojo cae rápido, el azul llega lejos
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // nada detrás = tinta hacia azul de agua profunda
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

Aplicaciones: absorción/dispersión por grosor, proyección de ondas tipo cáustica desde coordenadas de mundo del fondo vía `behind.position`, distinción cielo-oclusión con `found=false` para reflejo de cielo en agua, turbidez por etapas según profundidad. Si el pipeline de copia de profundidad no se construye, degrada con seguridad a "nada detrás". La preparación de la textura de profundidad se decide una sola vez, al crear el renderizador de la página, según "si el paquete activo lee profundidad" — así que **recarga siempre la página al usar un paquete que lea profundidad**. Si se pide profundidad con paquete activo pero la página no fue recargada, la consola muestra una advertencia única `…reads scene depth on a page that didn't turn it on` y la textura de profundidad se reemplaza por un fallback de 1×1, con lo que `bloxdOpaqueBehind()` devuelve siempre `found = false`.

## 36. Otros cambios de v2

- **Fallback de hooks**: los programas liquid usan el hook de terreno si `bloxdLiquidXxx` no está definido. **Los paquetes solo-terreno afectan al agua tal cual**. Define hooks del lado liquid explícitos si no lo quieres.
- **Sin guardias `BLOXD_LIGHTING` para campos**: `blockLight` etc. existen en todas las variantes, con defectos en unlit (0 / 1 / blanco / 0). Usa `#ifdef BLOXD_LIGHTING` solo para detectar iluminación. Mantener las guardias existentes no cambia nada.
- **Cambia la condición de `BLOXD_ALPHA`**: definido en variantes de terreno no estrictas y en todas las liquid, indefinido en strict × terrain. Mantén la guardia al escribir alpha en hooks de terreno.
- **Construcción directa de structs prohibida**: llamadas de constructor como `BloxdLight(...)` se rechazan en validación estática. Modifica siempre desde `bloxdDefault*` o usa una copia de la entrada.
- **`let _ =` pasa a `_ =`**: la asignación de descarte WGSL `_ = f();` vale, pero `let _ = f();` se rechaza.
- **offInStrict**: definir un hook vertex, o un `discard` alcanzable desde hooks surface / light, autodesactiva todo el paquete en juegos estrictos en vez de error (la UI muestra `shaderPack:offInStrict`; sigue corriendo en juegos allow). Envuelve hooks vertex y `discard` con `#ifndef BLOXD_STRICT`. Ojo: el propio mensaje de la UI oficial de ajustes instruye "envuelve lo restante con `#ifndef BLOXD_STRICT`" — esta práctica es recomendación oficial, no convención.
- **Extensiones de niebla**: modos LINEAR / EXP / EXP2 implementados, pero los ajustes del juego siguen siempre en LINEAR: las specs de niebla existentes siguen valiendo. La semántica de `fogColour` queda documentada oficialmente (negro solo en escenas sin niebla).
- **Sin cambios**: curva de realce, suelo de canal 35%, caída de heldLight (`pow(lightDist, 0.75)`) y boost ambiental, spec de direcciones sol/luna, color de niebla por defecto, wrap de tiempo (3600 s), luces direccionales (máx 4), solo Lite (WebGPU), mecanismo de guardado (IndexedDB), `mod` palabra reservada.

## 37. Lista de migración v1 → v2

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **Identificadores**: reemplaza todo según la tabla §32 (nombres de hook, structs, funciones default)
3. **Porte de campos eliminados**: a funciones de cabecera según la tabla §33 (`s.time` → `bloxdTime()` etc.)
4. **Renombra `fogFactor` → `fogVisibility`**
5. **Quita la construcción directa de structs**
6. **Corrige `let _ =` a `_ =`**
7. **Envuelve hooks vertex y discard con `#ifndef BLOXD_STRICT`**
8. **Confirma que el agua también siente los efectos de hooks de terreno**; define hooks liquid explícitos si no lo quieres
9. (Opcional) Gestiona niebla desde `litColour` / añade absorción por grosor con `bloxdOpaqueBehind()` / estilizado por bloque con `blockId`
10. **Valida también la segunda etapa (Tint del navegador)** — pon paréntesis en expresiones con `^` `&` `|` `<<` `>>` sobre todo. Hay código que pasa la validación estática y el navegador lo rechaza (§38)

## 38. Segunda etapa de validación — el compilador WGSL del navegador es más estricto que el analizador interno

La validación de paquetes en el juego tiene **2 etapas**. La primera etapa es la validación estática (analizador JS interno del motor. Revisa reglas propias de paquetes como firmas de hook, sintaxis prohibida, uso de sceneDepth), y la segunda etapa es la validación de navegador (compila stubs incluidos en el resultado de compilación con una implementación WebGPU real, remapeando errores a las líneas del archivo fuente del paquete para mostrarlos. El «Saved, but it won't run until you fix these errors» de la UI es esta etapa). Un sufijo como `(only in terrain)` al final de un error es «la clase de program de la variante donde ocurrió ese error».

El analizador interno no implementa las reglas de ligadura (Binding) de operadores de WGSL: **hasta el código que pasa la validación estática puede ser rechazado por el navegador**. La víctima típica es el patrón clásico del hash entero:

| Operador | Consecuencia |
|---|---|
| `<<` `>>` | Solo pueden ligarse directamente a nivel unario. `a + b << c` es error |
| `&` `^` `\|` | Solo pueden ligarse directamente a nivel unario. `a * b ^ c` es error |
| `&&` `\|\|` | No pueden mezclarse. `a && b \|\| c` es error |

### Cómo poner paréntesis (NG / OK)

```wgsl
// NG — pasa la validación estática pero el navegador (Tint) lo rechaza:
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — pon paréntesis en cada multiplicación (una cadena del mismo operador A ^ B ^ C es legal por asociatividad izquierda)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

El código publicado en esta guía no contiene este patrón (la mezcla `+`/`*` de `pack_hash3` y `h ^ (h >> 16u)` ya van entre paréntesis, luego conformes). Cuando escribas un paquete, pasa la primera y la segunda etapa.

## 39. Sobre materiales independientemente similares

Existe un material comunitario de contenido casi igual: [Shader de GlitchHunterCoder/Bloxd-Essay](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader). Se publicó antes que esta guía, pero **el contenido de esta guía viene del análisis propio de glm sobre los archivos bundle reales de Bloxd (conjunto de chunks webpack) — no es copiar-pegar**. Ambos coinciden porque investigar independientemente la misma implementación lleva a las mismas conclusiones.

---

Investigado por ltf_ahel (investigado con glm)

[← Parte anterior](07-internals.md)·[Volver al manual](README.md)

[← Parte anterior](08-apiv2.md)·[Volver al manual](README.md)

# Parte IX: Guía de migración a API Version 3

> **Sustituida el 2026-10-26: la API actual es la versión 4** — los paquetes v3 se rechazan al cargar tal como se describe aquí para v2. Aplica esta parte *y después* la [Parte X](10-apiv4.md) (v3 → v4: API de texturas, cambio de nombre a `fogAlpha`, `bloxdFragmentBlockPosition`, `hit`).

Build objetivo: `3ymzdd.main.fae4743f.js` — **el build de producción activo desde el 2026-10-19**. El bundle que bloxd.io sirve en producción es idéntico byte a byte (verificado con md5, tanto el bundle principal como los chunks de paquetes de sombreadores) al despliegue de preproducción contra el que se investigó originalmente esta parte, así que todo lo que sigue se aplica a producción tal cual. El modelo de paquetes conserva su forma de v2 (mismos campos de `pack.json`, mismos límites del cargador, mismo diseño de uniform).

Las partes I–VII de esta guía siguen escritas sobre la base v2. Esta parte reúne, en el mismo orden que la [Parte VIII](08-apiv2.md), los puntos de migración de v2 → v3 y las nuevas funciones de v3. La conversión es en su mayoría mecánica (§47), pero solo un cambio altera realmente el comportamiento — la luz predeterminada ahora atenúa la emisión con la niebla (§43) — y `blockId` se sustituye por completo por `blockFlags` (§42), así que verifica siempre con una compilación en el juego antes de distribuir.

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
- El bloque uniform del motor no cambia de forma: `@group(3) @binding(0)`, 64 B, con — en orden de declaración — el tiempo, el desplazamiento de render, la dirección del sol y la posición del ojo. El diseño se registra con `minBindingSize: 64`, y la disposición exacta de campos es `seconds: f32` @ byte 0, `renderOffset: vec3i` @ 16, `sunDirection: vec3f` @ 32, `eyePosition: vec3f` @ 48. Dos nombres de campo internos cambiaron: `time` → `seconds`, `originOffset` → `renderOffset`. El **diseño de bytes es idéntico al de v2**, y de todos modos nada cambia para el código del paquete, porque los paquetes no pueden nombrar el uniform directamente (la cabecera del motor lo marca como proporcionado por el motor y de solo lectura, «which packs can't name»); sigue usando las funciones de cabecera `bloxdSeconds()` / `bloxdRenderOffset()`.
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

### Las reglas exactas de nombres (deriva los flags de cualquier bloque tú mismo)

Los cuatro bits de material provienen de un clasificador fijo sobre el nombre visible registrado del bloque. Primero se eliminan los nombres de variante (todo lo que va tras `|`), así que las variantes heredan los flags del bloque base. Después:

| Bit | Regla (evaluada sobre el nombre sin variante) |
|---|---|
| vegetación | el nombre **termina en** ` Leaves`, o **termina en** ` Grass Block` |
| tierra | el nombre **es exactamente** `Dirt`, **termina en** ` Dirt` o ` Soil`, o **termina en** ` Grass Block` |
| arena | el nombre **es exactamente** `Sand` o `Red Sand`, o **contiene** `Sandstone` |
| roca | el nombre **es exactamente** uno de `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt`, **contiene** `Sandstone`, **termina en** ` Ore`, o contiene `Stone` / `Andesite` / `Diorite` / `Granite` como palabra independiente |

Yellowstone aparece listado explícitamente porque `Stone` no es una palabra independiente dentro de `Yellowstone`. Opaco y emisivo **no** provienen del nombre — vienen de los datos de opacidad y de emisión de luz de bloque del propio motor, así que no pueden derivarse con estas reglas.

Fuente: el clasificador de nombres del motor (módulo 28537, bundle `3ymzdd`); verificado contra los 7.861 bloques con nombre, 2026-10-20.

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
con los 8 bloques de hierba. No hay excepciones en ninguna dirección — recuentos del registro a fecha de ese build; los bloques nuevos hacen crecer las cifras sin cambiar la regla. Combínalo con `vertex.normal`
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
| `BLOXD_ALPHA` | **todas las variantes de líquido** más las variantes de **terreno** no estrictas |
| `BLOXD_SCENE_DEPTH` | **todas las variantes de líquido** |

Dos cosas cambian para los autores respecto a las reglas de v2 ([Parte VIII](08-apiv2.md) §36):

- **`BLOXD_ALPHA` no cambia respecto a v2.** El generador de variantes lleva la línea literal `"liquid"!==program&&strict||push("BLOXD_ALPHA")` — la precedencia de operadores de JS hace que *(terreno **y** estricto)* sea el único caso que omite el push, así que la macro está definida en **todas las variantes de líquido (estrictas o no) y en terreno no estricto**; solo el terreno estricto la omite. El código de líquido bajo `#ifdef BLOXD_ALPHA` se compila exactamente como siempre lo hizo, y la escritura de vuelta de alfa de §49 (empalmada para programas de líquido o variantes no estrictas) coincide con este conjunto con precisión.
- **`BLOXD_SCENE_DEPTH` está siempre definido en las variantes de líquido**, así que el uso de profundidad sigue estando bien sin guardia allí, exactamente como en v2 (§35); en hooks de terreno sigue necesitando el envoltorio `#ifdef BLOXD_SCENE_DEPTH`.

## 47. Lista de migración de v2 a v3

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** en las tres estructuras de entrada; expresa el estilo de material como pruebas de bits contra las constantes `bloxdBlockFlag*` (§42); elimina las heurísticas de rangos de ids de v2
3. **`bloxdTime()` → `bloxdSeconds()`**; declara tu propio periodo en lugar de la eliminada `bloxdTimeWrap` (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **Reconstruye las matemáticas de luz desde `engineColour` sobre `litColour` + niebla** según la tabla de §43; ten en cuenta que el valor predeterminado ahora atenúa la emisión con la niebla
6. **Hooks de líquido**: define `bloxdLiquid*` explícitamente cuando quieras que el agua se trate de forma distinta; omítelos para recaer en tus hooks de terreno
7. **No hace falta auditar `BLOXD_ALPHA`** — su conjunto de variantes no cambia respecto a v2: todas las variantes de líquido y el terreno no estricto la definen, solo el terreno estricto la omite (§46)
8. **Usa `bloxdPi` / `bloxdTau`** donde se escribieran constantes trigonométricas a mano; elimina las redeclaraciones locales que ahora dupliquen la cabecera
9. **Mantén las guardias estrictas**: los hooks de vértice y `discard` siguen envueltos en `#ifndef BLOXD_STRICT`; la plantilla protege `bloxdLiquidVertex` igual que su gemelo de terreno
10. **Valida en el juego** — compila y prueba el paquete en un juego compatible con paquetes de sombreadores

## 48. Otros cambios y notas de v3

- **La validación sigue siendo de dos etapas** ([Parte VIII](08-apiv2.md) §38): primero la validación estática, luego la compilación real de WebGPU del navegador mediante fragmentos stub generados que llaman a tus hooks, con los errores asignados de vuelta a los archivos / líneas de origen, y los diagnósticos restauran los nombres originales de los identificadores del lado del motor mediante una asignación.
- **Los diagnósticos estrictos nombran el motivo**: un hook de vértice que mueve el terreno informa «… moves terrain, which strict games prevent.» y `discard` en hooks de superficie / luz informa «discard makes terrain see-through, which strict games prevent.»; la interfaz de ajustes mantiene la guía «wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`.» (`offInStrict`).
- **Mensajes del cargador**: los tipos de error y los límites no cambian; «Zip64 archives aren't supported.» se muestra como mensaje de la interfaz (`loadZip64`). El inventario de cadenas de la interfaz de paquetes suma 57 claves `shaderPack:*`; entre los errores de la etapa de carga, `loadNoWgsl` (un zip sin ningún archivo `.wgsl`) y `loadNotZip` (un archivo sin la firma de fin de archivo zip) completan el conjunto.
- **La interfaz de paquetes no incluye ningún editor WGSL en el juego.** La pantalla de ajustes no ofrece editor de código de sombreadores — los paquetes se escriben como archivos zip fuera del juego. (En el bundle sí existe un editor CodeMirror, pero es el editor de JavaScript de la interfaz de scripting de juegos personalizados; no tiene soporte de WGSL ni conexión alguna con el sistema de paquetes.)
- **Requisito de hardware**: Lite necesita un controlador compatible con la función `shader-f16` de WebGPU; los controladores demasiado antiguos se rechazan con un mensaje como «Intel driver too old for Lite (no shader-f16)».
- **Los cambios de iluminación revalidan los paquetes guardados**: cuando el ajuste de iluminación cambia en tiempo de ejecución, el motor vuelve a ejecutar la comprobación del paquete (`changed → recheck`); la reproducción de repeticiones llama al mismo hook con `changed: false` y se salta la recomprobación.
- **Redacción**: el texto sobre juegos que aceptan paquetes de sombreadores ahora dice «in games that **support** them».
- **Alcance de los títulos**: el conjunto de juegos donde se ejecutan los paquetes no cambia respecto al build anterior.

## 49. Interioridades del motor: cómo el renderizador Lite invoca tus hooks

Todo lo de §40–§48 es lo que te dicen el cargador y la cabecera. Esta sección y las siguientes documentan lo que el motor hace realmente en tiempo de ejecución, restaurado del bundle de producción (el renderizador Lite — un chunk de 175 KB; el nombre real del archivo fuente de integración `lite/terrainShaderPack.ts` sobrevive dentro de sus cadenas de error). Nada de esto cambia lo que escribes, pero elimina las conjeturas sobre lo que reciben tus hooks — y resuelve varias preguntas que otras guías de la comunidad todavía listan como abiertas.

El renderizador no «llama» a tus hooks desde JavaScript. Cuando un paquete pasa la validación, el motor **empalma las llamadas a tus hooks en su propio WGSL de terreno** reemplazando líneas ancla fijas en su texto de shader. Un ancla debe coincidir exactamente una vez — cero o varias coincidencias abortan con `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Etapa | Línea ancla en el shader del motor | Qué se empalma |
|---|---|---|
| vértice | un bloque de cuatro líneas desde `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` hasta `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);` | construye `BloxdVertexIn`, llama a tu hook de vértice, reescribe `worldPos` — el empalme también cambia `let worldPos` por `var worldPos` |
| superficie | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | construye `BloxdSurfaceIn`, llama a tu hook de superficie, reescribe `baseColor` / `alpha` |
| color iluminado | justo antes de `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` | `let bloxdSpLitColour = color.rgb;` — captura el color previo a la niebla |
| luz | la línea final `return color;` del fragment shader | construye `BloxdLightIn`, llama a tu hook de luz, reescribe `color` — después de la mezcla de niebla |

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

Cuatro hechos de aplicación se desprenden directamente de este empalme:

- **El terreno estricto ignora los cambios de alfa del hook de superficie.** La escritura de vuelta `alpha = bloxdSpSurface.alpha` solo se empalma para programas de líquido o variantes no estrictas — la implementación detrás de la tabla de macros de §46. (En terreno estricto tu código `#ifdef BLOXD_ALPHA` no se compila de todos modos; ahora también está confirmado que las escrituras de alfa sin guardia se descartan allí.)
- **Una variante estricta que todavía declara un hook de vértice nunca lo ejecuta** — el motor lo informa en tiempo de build: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. Por eso la plantilla oficial (§45) envuelve `bloxdLiquidVertex` en el mismo `#ifndef BLOXD_STRICT` que su gemelo de terreno.
- Los identificadores `bloxdSp*` — **14 en total**: `bloxdSpVertexIn`, `bloxdSpVertex`, `bloxdSpSurfaceIn`, `bloxdSpSurface`, `bloxdSpLightIn`, `bloxdSpLight`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, `bloxdSpPositionW`, `bloxdSpZ`, `bloxdSpEye`, `bloxdSpScale`, `bloxdSpBehind` — son temporales del lado del motor. Tu código nunca los ve, pero aparecen en los diagnósticos y en la salida de ingeniería inversa de cualquiera, así que merece la pena reconocerlos a primera vista.
- **El atajo de superficie predeterminada.** Cuando el hook de superficie de una variante es literalmente `bloxdDefaultSurface`, el motor se salta por completo el empalme de las líneas de escritura de vuelta de `baseColor` / `alpha` — el valor predeterminado ya produce esos valores, así que la asignación sería código muerto. Las cadenas de hooks sin modificar no cuestan nada.

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
- **La textura de profundidad es un recurso no filtrable, solo de fragmento.** La entrada del bind group la registra como `texture: { sampleType: "unfilterable-float" }` con visibilidad únicamente `GPUShaderStage.FRAGMENT`; por eso `bloxdOpaqueBehind()` usa `textureLoad` (texel exacto, nivel de mip 0) en vez de `textureSample` — el filtrado por hardware no está disponible en esta textura.
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

- **Las luces direccionales tienen un tope estricto de cuatro.** El renderizador falla con `Terrain supports 4 directional lights, not ${n}` si una escena intenta registrar más. `l.directional` es la suma Lambert sobre las que existan (0–4; las escenas propias de Bloxd usan 2 — [Parte VII](07-internals.md) §27). El terreno también avisa sobre las luces que no puede respetar, literalmente: una luz añadida tarde — `Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`; una luz con tinte — `Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`; y una que filtra mallas — `Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **Nombres del programa de terreno**: las claves de caché de pipeline dicen `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}` — un paquete aparece como el sufijo `-sp{variant}`, un programa por variante de §46. Un watcher (`watchPipelineFailures`) compara los nombres de pipeline en vivo con `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/` y vuelve a comprobar la variante de paquete correspondiente cuando falla la compilación de un pipeline; se salta la pérdida del dispositivo GPU (`device.lost`).
- **`BLOXD_TERRAIN_DIRECTIONAL` es una macro interna del motor** (definida cuando dirLightCount > 0). *No* es una de las cuatro del preludio y nunca llega al código del paquete — pero aparece en los volcados WGSL de los shaders propios del motor, así que reconocerla ahorra confusión.
- **Decodificación del nivel de luz**: el atributo de vértice `aPackedLightLevels` es un f32 que empaqueta cuatro nibbles, cada uno dividido por 15: rgb = la luz de bloque coloreada, a = el canal de cielo / luz sostenida. La etapa de vértice lo decodifica en la varying `vLightLevels`; `blockLight` lee `.rgb`, y el canal de cielo / luz sostenida lee `.w`. El motor fija un piso del 35 % del canal más brillante para los canales rgb antes de interpolar — el ancla del lado del motor de la elevación que la [Parte VII](07-internals.md) §26 documenta desde el gameplay.
- **`vTerrainLambert`** (la fuente de `directional`, §49) se genera como una suma sobre las luces direccionales activas: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, protegida por `BLOXD_TERRAIN_DIRECTIONAL`.
- **Los búferes de índices pasan a 32 bits con la primera malla grande.** El renderizador Lite elige índices `Uint16Array` solo mientras todos los valores de índice se mantienen ≤ 65.534; en cuanto cualquier índice llega a 65.535, el búfer pasa a ser un `Uint32Array` (se rastrea por búfer con un flag `is32Bits`). En la práctica: una malla de chunk con como máximo 65.535 vértices cabe en índices de 16 bits; una con exactamente 65.536 vértices emite necesariamente un índice 65.535 y cambia todo el búfer a 32 bits.
- **Detalles de carga del manifiesto**: se filtran las entradas zip bajo `__MACOSX/`, los archivos con prefijo `._` y `.DS_Store` (ruido de archivo de macOS); `pack.json` se localiza por comparación de ruta en minúsculas — cero coincidencias → `loadNoManifest`, dos o más → `loadDuplicateManifest`; la lectura del manifiesto está limitada a 65.536 bytes.
- **Cómo se verificó todo esto**: los módulos del bundle de producción se restauraron (165 chunks; el registro webpack de este bundle cuenta 4.951 módulos — la cifra varía en unas pocas unidades según se incluyan o no las dependencias hijas asíncronas, así que trátala como específica de este bundle) y se ejecutaron en un arnés compatible con webpack bajo Node.js. El `HEADER_VERSION` medido (§53), la cabecera renderizada de 5.637 bytes, el orden canónico de la tabla de variantes y el mapa de funciones especiales provienen de *ejecutar el código distribuido*, no de leer cadenas. El mismo arnés es el núcleo natural para un `pack_check` v6 comunitario — ejecutar el validador propio del motor contra un paquete reproduce sus veredictos exactamente.

---

# Parte X: Guía de migración a API Version 4 (2026-10-26, resumen)

> Este texto es el resumen breve en este idioma. La versión completa con todos los detalles, recetas de ejemplo e interioridades del motor restauradas (§55–§66) está en [inglés](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md) y [japonés](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md).

Build objetivo: `cnty9.main.669f8081.js` — **en producción y preprod simultáneamente desde el 2026-10-26** (ambas byte a byte idénticas). El modelo de paquetes conserva su forma: mismos campos de `pack.json`, mismos límites del cargador, mismo uniform de 64 B, los mismos 6 hooks.

## Qué cambia

- `pack.json` exige `"apiVersion": 4` (igualdad `===` estricta, número) — los paquetes v3 se rechazan al cargar.
- **Nueva API de texturas (la novedad principal):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` muestrea el atlas de texturas de bloques exactamente como lo hace la propia engine (id 0 = blanco; las texturas animadas devuelven automáticamente el fotograma actual), `bloxdTextureSize(mipLevel) -> vec2u`, y constantes con nombre `bloxdTextureId*` (CamelCase a partir del nombre de archivo, p. ej. `grass_top` → `bloxdTextureIdGrassTop`; el catálogo oficial es `BLOCK_TEXTURES.md`).
- **Cuatro campos nuevos de entrada** en `BloxdSurfaceIn` *y* `BloxdLightIn`: `textureId`, `textureRotation` (cuartos de giro en sentido horario, que `bloxdTexel` aplica), `uv` (en bloques; se dibuja `fract(uv)`), `mipLevel`.
- **Renombres con cambio de significado:** `fogVisibility` → `fogAlpha` con significado **invertido** (`0 = sin niebla, 1 = solo fogColour`; portado: `l.fogVisibility` → `1.0 - l.fogAlpha`); `bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (cuerpo idéntico); `BloxdOpaqueBehind.found` → `hit`.
- **Los juegos estrictos ahora los impone el validador incluido:** un hook de vértice sin proteger o un `discard` alcanzable informa `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...` y desactiva **todos** los hooks en juegos estrictos. Con envoltorios `#ifndef BLOXD_STRICT`, surface/light siguen funcionando.
- Todo lo demás queda congelado: 6 hooks, bits de `blockFlags` (1/2/4/8/16/32), diseño del uniform, límites del cargador, matriz de variantes, los 12 títulos allow (reconfirmados sin cambios en `cnty9` el 2026-10-27).

## Migración rápida

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (número) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` o `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| Hooks de vértice sin protección | `#ifndef BLOXD_STRICT ... #endif` |

Ya existen referencias oficiales (`bloxd-api.wgsl` y `BLOCK_TEXTURES.md`, Discord oficial). Los detalles completos — la sutileza de rotación de `bloxdTexel`, el WGSL de muestreo restaurado, el registro de nombres con ≈900 constantes utilizables, la nueva estructura de `HEADER_VERSION` con hash del registro — están en la versión completa en inglés y japonés.

[← Parte anterior](09-apiv3.md)·[Volver al manual](README.md)
