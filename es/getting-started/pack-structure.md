# Estructura del paquete

> API objetivo: 5 · Build objetivo: `ab90qa` · Estado: Verified

## Formato de distribución

- **Formato**: un único `.zip`, o una carpeta (la carga por carpeta es solo para navegadores de escritorio)
- **Contenido**: un `pack.json` (en el nivel superior del paquete; sin distinguir mayúsculas) + 1–256 archivos `.wgsl`
- Los múltiples archivos `.wgsl` se concatenan en un solo módulo, así que dividir y usar subdirectorios es gratis. Sin restricciones en los nombres de archivo. La concatenación ocurre en **orden de diccionario por nombre de ruta** (las declaraciones de ámbito de módulo son independientes del orden, así que esto solo importa para código que dependa del orden de inicialización de `var`). Los archivos que no son `.wgsl` (READMEs etc.) se ignoran

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

## Consejos de comprimido

Un zip que guarda todo bajo una carpeta raíz común ve ese prefijo eliminado automáticamente (el «Comprimir» de macOS funciona tal cual; los archivos con prefijo `__MACOSX`, `._` y `.DS_Store` se excluyen automáticamente). Los archivos sueltos en el nivel raíz rompen la detección del nivel superior, así que el método más seguro es comprimir `pack.json` y los archivos `.wgsl` directamente (verifica que `pack.json` quede en la raíz del zip).
