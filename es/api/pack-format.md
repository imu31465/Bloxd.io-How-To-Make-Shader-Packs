# Formato del pack

> API objetivo: 5 · Tipo: referencia de API

Esta página resume el manifiesto, los límites del archivo ZIP y el uniform del pack. Para ver los pasos de configuración, consulta [Primeros pasos](../getting-started/manifest.md).

## pack.json

Coloca `pack.json` en la raíz del archivo ZIP. Debe ser un objeto JSON.

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "Author Name",
  "keepCircleShadows": false
}
```

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `apiVersion` | number | Sí | Usa el valor numérico `5`. No se acepta una cadena |
| `name` | string | Sí | Nombre no vacío después de quitar los espacios exteriores |
| `author` | string | No | Nombre del autor |
| `keepCircleShadows` | boolean | No | Establécelo en `true` para conservar las sombras circulares tradicionales al usar la API de sombras |

## Límites del cargador

| Elemento | Límite |
|---|---:|
| Archivos `.wgsl` por pack | 256 |
| Fuente `.wgsl` total | 256 KB |
| `pack.json` | 64 KB |
| Archivo ZIP | 32 MB |
| Entradas ZIP | 1.024 |

No se admiten archivos ZIP divididos, Zip64, entradas cifradas ni métodos de compresión no compatibles. Guarda todos los archivos en UTF-8 y evita las rutas duplicadas dentro del archivo.

## Uniform del pack

El uniform del pack ocupa 80 bytes y se enlaza en `@group(3) @binding(0)`.

| Offset | Campo | Tipo |
|---|---|---|
| 0 | `seconds` | `f32` |
| 4 | `lit` | `u32` |
| 16 | `renderOffset` | `vec3i` |
| 32 | `sunDirection` | `vec3f` |
| 48 | `eyePosition` | `vec3f` |
| 64 | `shadowDirection` | `vec3f` |

El tamaño mínimo del enlace del uniform es de 80 bytes. Los demás enlaces del grupo 3 son la textura de profundidad de escena para las variantes Liquid y el búfer `bloxdSpTextureLayers`.

## Relacionado

- [Crear el manifiesto](../getting-started/manifest.md)
- [Referencia de API](./)
- [Guía de migración a API v5](../history/v5.md)
