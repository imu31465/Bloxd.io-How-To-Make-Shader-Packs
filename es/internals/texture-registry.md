# Internas del registro de texturas

> API objetivo: 5 · Build objetivo: `bny9u` (2026-11-05, producción) · Estado: Verified (extraído reejecutando el constructor de registro del propio motor)

La maquinaria de resolución nombre→id y la deriva medida del registro. El catálogo orientado al usuario: [Catálogo de texturas](../api/texture-catalog.md).

## Metodología

Ejecutamos el módulo constructor de registro del propio motor (29812 en este build, transportado por los chunks 52/53/54) contra los datos de textura del registro de bloques distribuido (módulo de datos 1351 en el bundle principal) contra los datos de textura del registro de bloques distribuido dentro de un mini arnés de webpack y registramos su salida — estos números son **el cómputo del propio bundle de producción**, no una reimplementación.

## Estructura de salida

| Salida | v5 medida | Significado |
|---|---|---|
| `named` | **911** | nombres referenciables como `bloxdTextureId<Name>` |
| `aliases` | 424 | grafías plegadas — 196 alias de fotograma (`lava0`…) y 228 alias de rotación (`chest_top[rot[1`…) |
| `layers` | 1,232 | la tabla de capas completa del atlas — 911 raíces nombradas, 150 fotogramas extra de animación, 171 ranuras prerrotadas |

## Reglas de plegado

- **familias de animación** (43): las grafías de fotograma (`lava0`–`lava7`) se pliegan al nombre base (`lava`); `bloxdTexel` devuelve el fotograma actual en el momento del muestreo
- **familias de rotación** (57): las ranuras giradas (`[rot[1..4`) se pliegan al nombre raíz; `bloxdTexel` reaplica la `textureRotation` por cara
- `radar_screen` es el único nombre en ambas familias (sus cuatro copias prerrotadas llevan cada una su propia escalera de 4 fotogramas — de ahí 46 raíces de animación en el atlas, no 43)

## Deriva (cnty9 → ab90qa)

| Medición | cnty9 (v4) | ab90qa (v5) |
|---|---|---|
| entradas del atlas | 1.219 | **1.210** |
| familias de rotación (grafías giradas) | 57 (228) | **57 (228) — sin cambios** |
| familias de animación (grafías de fotograma) | 42 (188) | **42 (188) — sin cambios** |
| constantes con nombre utilizables | 905 | **896** |
| cambios de id entre nombres supervivientes | — | **334 de 905** |

La deriva completa (11 nombres): añadido (1) `scorpion_eggs`; eliminados (10) las ocho texturas del cofre doble más `mob_spawner_hostile_block_side` / `mob_spawner_neutral_block_side` (el cofre doble salió de los datos del juego; los generadores conservan `mob_spawner_block_top`).

## Deriva (ab90qa → xkg8x)

| Medición | ab90qa (lanzamiento de v5) | xkg8x (v5, actual) |
|---|---|---|
| entradas del atlas | 1,210 | **1,220** |
| familias de rotación (grafías giradas) | 57 (228) | **57 (228) — sin cambios** |
| familias de animación (grafías de fotograma) | 42 (188) | **42 (188) — sin cambios** |
| constantes con nombre utilizables | 896 | **906** |
| cambios de id entre nombres supervivientes | — | **376 de 896** |

La deriva completa (10 nombres): añadidos (10) las ocho texturas del cofre doble más `mob_spawner_hostile_block_side` / `mob_spawner_neutral_block_side` — cada nombre eliminado en el lanzamiento de v5 ha vuelto (el cofre doble regresó a los datos del juego; las variantes laterales del generador volvieron con él). No se eliminó nada.

5 de noviembre (xkg8x → bny9u, 1 día): entradas 1,220 → 1,232 (+5: las texturas del Terminal de Intercambio ×3 y el Generador de Piedra ×2); 864 de 906 nombres cambiaron de id (95 %); sin eliminaciones; familias de rotación sin cambios, familias de animación 42 → 43 (`trading_terminal_front`, 8 fotogramas a 250 ms). Producción y preprod sirven el mismo bundle idéntico byte a byte.

## Deriva (xkg8x → bny9u)

| Medición | xkg8x (v5) | bny9u (v5, actual) |
|---|---|---|
| entradas del atlas | 1,220 | **1,232** |
| familias de rotación (grafías giradas) | 57 (228) | **57 (228) — sin cambios** |
| familias de animación (grafías de fotograma) | 42 (188) | **43 (196)** |
| constantes con nombre utilizables | 906 | **911** |
| cambios de id entre nombres supervivientes | — | **864 de 906** |

La deriva completa (5 nombres): añadidos (5) `trading_terminal_front` (anim, 8 fotogramas) / `trading_terminal_side` / `trading_terminal_top` / `stone_generator_side` / `stone_generator_top` — dos bloques nuevos (Terminal de Intercambio, Generador de Piedra) entraron en los datos del juego. No se eliminó nada; la rotación de ids es casi total (el 95 % de los supervivientes).


## Efecto sobre HEADER_VERSION

El sufijo de hash del registro hornea los ids, así que esta deriva marca **cada paquete guardado como «necesita revisión»** (revalidado automáticamente al cargar la página). Los paquetes escritos con nombres sobreviven a la re-resolución; los de ids crudos se rompen ([Compatibilidad](../api/compatibility.md)).

## Registros de deriva pasados

La comparación de dos builds de octubre (sjr0p7 → cnty9, 10 días): entradas 1200 → 1219 (98 añadidas, 79 eliminadas); 779 de 1121 nombres con grafía sin cambios cambiaron de id (69 %); una migración de convención de nombres (sufijos `_rot1..4` → ranuras `[rot[1..4`); la aparición del cofre doble. El registro completo vive en [Historial de versiones: v4](../history/v4.md).

4 de noviembre (ab90qa → xkg8x, 1 día): entradas 1,210 → 1,220 (+10, todas nombres que vuelven — las eliminaciones del lanzamiento de v5 se revirtieron); 376 de 896 nombres cambiaron de id (42 %); sin eliminaciones; ambas familias de plegado sin cambios. El cofre doble está de vuelta.

## Relacionado

- [Catálogo de texturas](../api/texture-catalog.md) · [Validación de sombreadores](shader-validation.md) · [Registro de investigación](research-log.md)
