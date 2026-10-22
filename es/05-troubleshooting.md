[← Parte anterior](04-realism.md)·[Volver al manual](README.md)·[Parte siguiente →](06-implementation.md)

# Parte V: Solución de problemas y notas

> El juego actual exige `apiVersion: 3` desde el 2026-10-19 y rechaza los paquetes v1/v2 al cargar — el contenido siguiente está escrito sobre la especificación v2. Consulta [Parte IX](09-apiv3.md) para migrar antes de distribuir.

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
