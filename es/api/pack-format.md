# Formato del paquete

> API objetivo: 5 · Build objetivo: `ab90qa` (2026-11-03, producción) · Estado: Verified (remedido en el cargador en vivo)

El modelo completo del paquete en una sola página — manifiesto, límites del cargador, uniform por fotograma. Para la versión paso a paso ver [Primeros pasos](../getting-started/manifest.md).

## pack.json

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `apiVersion` | número | obligatorio | **debe ser exactamente `5`** (`===`). Un string `"5"` falla y se informa con su grafía JSON |
| `name` | string | obligatorio | no vacío tras recortar espacios; se muestra en los ajustes |
| `author` | string | opcional | debe ser un string si está presente |

Todo lo demás del manifiesto se ignora. `pack.json` debe ser exactamente un objeto JSON en la raíz del zip.

## Límites del cargador (remedidos en el c53 en vivo)

| Límite | Valor | Mensaje al superarlo |
|---|---|---|
| archivos `.wgsl` por paquete | 256 | `The pack has more than 256 .wgsl files.` |
| fuente `.wgsl` total | 256 KB | `The pack's .wgsl files are over 256 KB in total.` |
| tamaño de `pack.json` | 64 KB | `pack.json is over 64 KB.` |
| tamaño del zip | 32 MB | `The zip is over 32 MB.` |
| entradas del zip | 1.024 | `The zip has more than 1024 entries.` |
| forma del zip | — | zip dividido / zip64 / cifrado / compresión no soportada: cada uno rechazado con su propio mensaje; todos los archivos UTF-8 válidos; exactamente un `pack.json`; sin rutas duplicadas |

## Comprobación de versión de API

El cargador compara `manifest.apiVersion !== 5` con el `!==` estricto de JavaScript. La constante de versión `5` y la plantilla de cabecera viven en el mismo módulo (c55 / módulo 29836), así que la validación y la cabecera que asume se mueven juntas. Mensajes de desajuste: ver [Compatibilidad](compatibility.md).

## Uniform por fotograma: bloxdPackInputs

`@group(3) @binding(0) var<uniform> bloxdPackInputs: BloxdPackInputs` — sigue siendo de 64 bytes, pero v5 añadió un miembro (del módulo de diseño de uniform en vivo):

| Desplazamiento | Campo | Tipo | Nota |
|---|---|---|---|
| 0 | `seconds` | `f32` | respalda `bloxdSeconds()` |
| 4 | `lit` | `u32` | 1 cuando la iluminación de bloque/cielo está activada; respalda `bloxdLit()` |
| 16 | `renderOffset` | `vec3i` | respalda `bloxdRenderOffset()` |
| 32 | `sunDirection` | `vec3f` | respalda `bloxdSunDirection()` |
| 48 | `eyePosition` | `vec3f` | respalda `bloxdEyePosition()` |

`lit` cupo en el relleno que v4 ya tenía entre `seconds` y `renderOffset` (los desplazamientos 4–15 eran huecos de alineación; `vec3i` necesita alineación de 16 bytes, así que `renderOffset` se queda en 16). El tamaño total y todos los demás desplazamientos no cambian. El motor lo escribe con un único `setUint32(4, lit ? 1 : 0)` — es un flag, no un nivel de luz (los nombres del lado JS de v4 `terrainLightLevels` / `terrainHeldLight` han desaparecido por completo del bundle).

**Nunca referencies el uniform directamente desde un paquete.** Úsalo a través de las funciones de cabecera (`bloxdSeconds()` etc.). La visibilidad de etapa es VERTEX|FRAGMENT, así que las funciones de cabecera funcionan también desde funciones de ámbito de módulo y hooks de vértice.

## Diseño del grupo de bindings

| binding | Contenido |
|---|---|
| 0 | uniform `bloxdPackInputs` (64 B) |
| 1 | textura de profundidad de escena (variantes de líquido) |
| 2 | buffer de almacenamiento `bloxdSpTextureLayers` |

`minBindingSize` sigue siendo 64. La textura de profundidad (binding 1) es exclusiva de FRAGMENT, razón por la que `bloxdOpaqueBehind()` solo existe en hooks surface/light.

## Concatenación de wgsl

Los múltiples archivos `.wgsl` se concatenan en un solo módulo en **orden de diccionario por nombre de ruta**. Las declaraciones de ámbito de módulo son independientes del orden; solo el orden de inicialización de `var` puede importar. Los archivos que no son `.wgsl` se ignoran.
