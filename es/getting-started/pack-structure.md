# Estructura del paquete

> API objetivo: 5 · Build objetivo: `bbb6l5` · Estado: Verified

## Formato de distribución

- **Formato**: un único `.zip`, o una carpeta (la carga por carpeta es solo para navegadores de escritorio)
- **Contenido**: un `pack.json` (en el nivel superior del paquete; sin distinguir mayúsculas) + 1–256 archivos `.wgsl`
- Los archivos `.wgsl` se concatenan en un único módulo, así que puedes repartir el código entre varios archivos y subdirectorios. No hay restricciones para los nombres. La concatenación sigue el **orden lexicográfico de las rutas** (las declaraciones a nivel de módulo no dependen del orden; esto solo importa si el código depende del orden de inicialización de `var`). Los archivos que no sean `.wgsl` (como los README) se ignoran.

## Límites de tamaño y formato

| Elemento | Límite | Mensaje al superarlo |
|---|---|---|
| tamaño del zip | 32 MB | `The zip is over 32 MB.` |
| entradas del zip | 1.024 | `The zip has more than 1024 entries.` |
| tamaño de `pack.json` | 64 KB (UTF-8) | `pack.json is over 64 KB.` |
| número de archivos `.wgsl` | 256 | `The pack has more than 256 .wgsl files.` |
| fuente `.wgsl` total | 256 KB (UTF-8) | `The pack's .wgsl files are over 256 KB in total.` |
| forma del zip | sin zip64 / dividido / cifrado; store o deflate; sin rutas duplicadas | cada uno rechazado con su propio mensaje |

Todos los archivos deben ser UTF-8 válidos.

## Consejos para crear el ZIP

Un zip que guarda todo bajo una carpeta raíz común ve ese prefijo eliminado automáticamente (el «Comprimir» de macOS funciona tal cual; los archivos con prefijo `__MACOSX`, `._` y `.DS_Store` se excluyen automáticamente). Los archivos sueltos en el nivel raíz rompen la detección del nivel superior, así que el método más seguro es comprimir `pack.json` y los archivos `.wgsl` directamente (verifica que `pack.json` quede en la raíz del zip).
