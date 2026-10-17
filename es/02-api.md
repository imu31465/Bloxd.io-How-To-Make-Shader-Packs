[← Parte anterior](01-making.md)·[Volver al manual](README.md)·[Parte siguiente →](03-recipes.md)

# Parte II: Referencia de la API

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
- `bloxdSunDirection()` es un vector unitario solo mientras existe un sol; cero cuando el cielo no tiene sol. **La luna está siempre en `-bloxdSunDirection()`** (el motor calcula la posición lunar como el opuesto exacto del sol). Pero en mundos por defecto el sol está estático y la luna también — una luna en movimiento solo importa en mundos con ciclo día/noche (ver [Parte VII](07-internals.md), sección 24)
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
