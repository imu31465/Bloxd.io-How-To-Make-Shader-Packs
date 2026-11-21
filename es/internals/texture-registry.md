# Internas del registro de texturas

> API objetivo: 5 · Build objetivo: `bbb6l5` (verificado en producción y preprod el 2026-11-20) · Estado: Verified

Esta página explica cómo se resuelven los nombres de textura en IDs y resume los cambios del registro entre builds. La lista actual para autores de packs está en el [Catálogo de texturas](../api/texture-catalog.md).

## Método de medición

Recalculamos el registro ejecutando el constructor del propio build de producción sobre los datos de texturas incluidos en el juego. La huella resultante, `32451195`, coincide con el atlas precompilado incluido en `bbb6l5`. Son resultados del propio motor, no de una reimplementación.

## Registro actual

| Salida | `bbb6l5` | Significado |
|---|---:|---|
| `named` | **1.017** | Nombres disponibles como constantes `bloxdTextureId<Name>` |
| `aliases` | **776** | Grafías alternativas que se resuelven al nombre base |
| `layers` | **1.650** | Capas totales del atlas de texturas |
| Tiras del atlas | **7** | Seis tiras completas y una parcial |
| Familias de rotación | **64** | Nombres con variantes de rotación por cara |
| Familias de animación | **71** | Nombres con fotogramas animados |

Los alias de animación incluyen los nombres habituales de los fotogramas y las grafías de transición que mezclan dos fotogramas consecutivos. `radar_screen` pertenece tanto a la familia de rotación como a la de animación.

## Cómo se agrupan los nombres

- **Animación:** nombres de fotograma como `lava0`–`lava7` se resuelven al nombre base `lava`. `bloxdTexel` selecciona el fotograma actual al muestrear.
- **Rotación:** ranuras como `[rot[1`–`[rot[4` se resuelven al nombre base. `bloxdTexel` aplica `textureRotation` de la cara.
- **Transiciones:** `frameA~frameB~interval` identifica una ranura del atlas que mezcla dos fotogramas adyacentes.

En WGSL, utiliza las constantes por nombre. No fijes IDs numéricos: pueden cambiar entre builds aunque el nombre siga disponible.

## Cambios entre builds

| Comparación | Capas del atlas | Nombres disponibles | Cambio principal |
|---|---:|---:|---|
| `sjr0p7` → `cnty9` | 1.200 → 1.219 | — | 98 añadidos y 79 eliminados; cambió la convención de nombres para texturas rotadas |
| `cnty9` → `ab90qa` | 1.219 → 1.210 | 905 → 896 | Se añadió un nombre y se eliminaron diez |
| `ab90qa` → `xkg8x` | 1.210 → 1.220 | 896 → 906 | Volvieron los diez nombres retirados al inicio de v5 |
| `xkg8x` → `bny9u` | 1.220 → 1.232 | 906 → 911 | Cinco nombres nuevos para Trading Terminal y Stone Generator |
| `bny9u` → `v98qt8` | 1.232 → 1.227 | 911 → 906 | Se añadió un nombre y seis texturas dejaron el registro al convertirse sus bloques en modelos |
| `v98qt8` → `bbb6l5` | 1.227 → 1.650 | 906 → 1.017 | Se añadieron 423 capas; crecieron las familias de rotación y animación, y se corrigió la regresión |

En cada actualización se reasignaron los IDs de muchos nombres. Las constantes basadas en nombres mantienen los packs independientes de esos cambios numéricos.

## Regresión de plegado de v98qt8 (corregida)

En `v98qt8`, la tabla de texturas animadas del motor usaba claves de texto, mientras que la lógica de plegado esperaba índices de ranura. Por eso, los nombres base de las texturas animadas no pasaban la validación y los nombres de cada fotograma aparecían como constantes separadas, sin animación.

El problema se corrigió en `bbb6l5`: la tabla vuelve a usar índices de ranura, los nombres base de animación pasan la validación y la huella del registro coincide con el atlas distribuido. Se conserva aquí como antecedente histórico; no describe el build actual.

## Efecto en HEADER_VERSION

La huella del registro forma parte de `HEADER_VERSION`. Por eso, un cambio del registro puede provocar que los packs se vuelvan a validar. Los packs que usan nombres se resuelven con los IDs nuevos; los que fijan IDs numéricos pueden dejar de funcionar. Consulta [Compatibilidad](../api/compatibility.md).

## Relacionado

- [Catálogo de texturas](../api/texture-catalog.md) — nombres disponibles para los packs
- [Internas del muestreo de texturas](texture-sampling.md) — cómo se muestrean las texturas
- [Registro de investigación](research-log.md) — método de medición e historial de builds
