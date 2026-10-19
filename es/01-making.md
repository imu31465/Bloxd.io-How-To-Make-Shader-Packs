[Volver al manual](README.md)·[Parte siguiente →](02-api.md)

# Parte I: Crear paquetes

## 1. Resumen y requisitos

- Los paquetes de sombreadores son **solo para el renderizador WebGPU**. Mientras un paquete está instalado, el renderizador WebGPU se activa forzosamente en los ajustes
- Los paquetes se escriben en un **subconjunto restringido de WGSL**. Solo afectan el aspecto del **terreno (terrain) y los líquidos (liquid)**
- Lo que puedes hacer: cambiar colores, transparencia y emisión; reconstruir la iluminación; sombras estilo proyección (R9.12); animación de vértices (solo en ciertos juegos)
- Lo que no puedes hacer: añadir/muestrear texturas, posprocesado (bloom etc.), sombras pixeladas que roten con el sol (mapas de sombras) ni reflejos reales (SSR), ni afectar el cielo o las entidades
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
  "apiVersion": 2,
  "name": "My Pack",
  "author": "your name"
}
```

| Campo | Requerido | Descripción |
|---|---|---|
| `apiVersion` | requerido | Debe coincidir exactamente con `2`. Los paquetes con `1` se rechazan con `shaderPack:loadWrongApiVersion` |
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
