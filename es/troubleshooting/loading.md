# Errores de carga

> API objetivo: 5 · Estado: Verified

Errores rechazados en la **etapa del cargador** (la primera puerta), mostrados en la línea de estado de los ajustes con ids `shaderPack:load*`.

## "There's no pack.json at the top of the pack."

- **Causa**: no hay `pack.json` en la raíz del zip (p. ej. la carpeta se comprimió con un nivel extra de anidamiento)
- **Comprobación**: abre el zip — `pack.json` en el nivel superior (o directamente bajo una única carpeta raíz común)
- **Corrección**: comprime `pack.json` y los archivos `.wgsl` directamente. Una única carpeta raíz común se elimina automáticamente ([Estructura del paquete](../getting-started/pack-structure.md))
- **Prevención**: mantén fijo tu procedimiento de comprimido; el «Comprimir» de macOS funciona tal cual (la basura del SO se excluye automáticamente)

## `loadDuplicateManifest` al cargar el zip

- **Causa**: dos archivos `pack.json` (incluidas diferencias de mayúsculas)
- **Corrección**: conserva exactamente uno

## Límites de tamaño y recuento

| Mensaje | Límite |
|---|---|
| `The zip is over 32 MB.` | zip 32 MB |
| `The zip has more than 1024 entries.` | 1.024 entradas |
| `The pack has more than 256 .wgsl files.` | 256 archivos `.wgsl` |
| `The pack's .wgsl files are over 256 KB in total.` | 256 KB totales |
| `pack.json is over 64 KB.` | manifiesto de 64 KB |

- **Corrección**: suelta los archivos `.wgsl` innecesarios / fusiona archivos / recorta comentarios
- **Prevención**: estos límites son también techos prácticos de compilación — trata el crecimiento como señal de refactorización

## Problemas de formato

Los zips divididos, zip64, las entradas cifradas y la compresión no soportada se rechazan cada uno con mensajes dedicados. Todos los archivos deben ser UTF-8 válidos.

## Referencia de ids de error del cargador

| ID | Significado |
|---|---|
| `loadZipTooBig` | zip de más de 32 MB |
| `loadTooManyZipEntries` | más de 1024 entradas |
| `loadTooManyWgsl` | más de 256 `.wgsl` |
| `loadSourceTooBig` | más de 256 KB totales (comprobación por archivo en flujo) |
| `loadManifestTooBig` | `pack.json` de más de 64 KB |
| `loadManifestNotJson` / `loadManifestNotObject` | no es JSON / no es un objeto |
| `loadNoApiVersion` / `loadWrongApiVersion` | falta / no es `5` ([Errores de versión de API](api-version.md)) |
| `loadNoName` / `loadAuthorNotString` | falta `name` / `author` no es string |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | compresión no soportada / zip64 / dividido / cifrado |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | ruta duplicada / no UTF-8 / fallo de descompresión / zip dañado |
| `loadNoManifest` / `loadDuplicateManifest` | posición del manifiesto / duplicación |

## "Ready. Reload the page to use it." pero nada cambia

- **Causa**: los paquetes necesitan una **recarga de página** para activarse
- **Corrección**: recarga tras seleccionar; el estado debería volverse `Ready to use`
- **Nota**: las anulaciones de renderizador que queden (`?renderer=`, localStorage `bloxdRenderer`) hacen que los paquetes se nieguen a arrancar — límpialas y recarga

## Relacionado

- [Errores de versión de API](api-version.md) · [Estructura del paquete](../getting-started/pack-structure.md) · [Formato del paquete](../api/pack-format.md)
