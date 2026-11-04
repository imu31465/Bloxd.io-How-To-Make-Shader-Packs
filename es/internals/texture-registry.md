# Internas del registro de texturas

> API objetivo: 5 · Build objetivo: `ab90qa` (2026-11-04, producción) · Estado: Verified (extraído reejecutando el constructor de registro del propio motor)

La maquinaria de resolución nombre→id y la deriva medida del registro. El catálogo orientado al usuario: [Catálogo de texturas](../api/texture-catalog.md).

## Metodología

Ejecutamos el módulo constructor de registro del propio motor (29833 en este build, coordinando los módulos 1371 / 1391 / 1384 / 219) contra los datos de textura del registro de bloques distribuido dentro de un mini arnés de webpack y registramos su salida — estos números son **el cómputo del propio bundle de producción**, no una reimplementación.

## Estructura de salida

| Salida | v5 medida | Significado |
|---|---|---|
| `named` | **906** | nombres referenciables como `bloxdTextureId<Name>` |
| `aliases` | 416 | grafías plegadas — 188 alias de fotograma (`lava0`…) y 228 alias de rotación (`chest_top[rot[1`…) |
| `layers` | 228 | la tabla de capas — incluidas 171 ranuras prerrotadas (57 raíces × 4 rotaciones) |

## Reglas de plegado

- **familias de animación** (42): las grafías de fotograma (`lava0`–`lava7`) se pliegan al nombre base (`lava`); `bloxdTexel` devuelve el fotograma actual en el momento del muestreo
- **familias de rotación** (57): las ranuras giradas (`[rot[1..4`) se pliegan al nombre raíz; `bloxdTexel` reaplica la `textureRotation` por cara
- `radar_screen` es el único nombre en ambas familias (sus cuatro copias prerrotadas llevan cada una su propia escalera de 4 fotogramas — de ahí 45 raíces de animación en el atlas, no 42)

## Deriva (cnty9 → ab90qa)

| Medición | cnty9 (v4) | ab90qa (v5) |
|---|---|---|
| entradas del atlas | 1.219 | **1.210** |
| familias de rotación (grafías giradas) | 57 (228) | **57 (228) — sin cambios** |
| familias de animación (grafías de fotograma) | 42 (188) | **42 (188) — sin cambios** |
| constantes con nombre utilizables | 905 | **896** |
| cambios de id entre nombres supervivientes | — | **334 de 905** |

La deriva completa (11 nombres): añadido (1) `scorpion_eggs`; eliminados (10) las ocho texturas del cofre doble más `mob_spawner_hostile_block_side` / `mob_spawner_neutral_block_side` (el cofre doble salió de los datos del juego; los generadores conservan `mob_spawner_block_top`).

## Efecto sobre HEADER_VERSION

El sufijo de hash del registro hornea los ids, así que esta deriva marca **cada paquete guardado como «necesita revisión»** (revalidado automáticamente al cargar la página). Los paquetes escritos con nombres sobreviven a la re-resolución; los de ids crudos se rompen ([Compatibilidad](../api/compatibility.md)).

## Registros de deriva pasados

La comparación de dos builds de octubre (sjr0p7 → cnty9, 10 días): entradas 1200 → 1219 (98 añadidas, 79 eliminadas); 779 de 1121 nombres con grafía sin cambios cambiaron de id (69 %); una migración de convención de nombres (sufijos `_rot1..4` → ranuras `[rot[1..4`); la aparición del cofre doble. El registro completo vive en [Historial de versiones: v4](../history/v4.md).

## Relacionado

- [Catálogo de texturas](../api/texture-catalog.md) · [Validación de sombreadores](shader-validation.md) · [Registro de investigación](research-log.md)
