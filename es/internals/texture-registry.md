# Internas del registro de texturas

> API objetivo: 5 · Build objetivo: `v98qt8` (2026-11-08, producción y preprod) · Estado: Verified (extraído reejecutando el constructor de registro del propio motor)

La maquinaria de resolución nombre→id y la deriva medida del registro. El catálogo orientado al usuario: [Catálogo de texturas](../api/texture-catalog.md).

## Metodología

Ejecutamos el módulo constructor de registro del propio motor (29812 en este build, transportado por los chunks 52/53/54) contra los datos de textura del registro de bloques distribuido (módulo de datos 1351 en el bundle principal) contra los datos de textura del registro de bloques distribuido dentro de un mini arnés de webpack y registramos su salida — estos números son **el cómputo del propio bundle de producción**, no una reimplementación.

## Estructura de salida

| Salida | v5 medida | Significado |
|---|---|---|
| `named` | **906** | nombres referenciables como `bloxdTextureId<Name>` |
| `aliases` | 424 | grafías plegadas — 196 alias de fotograma (`lava0`…) y 228 alias de rotación (`chest_top[rot[1`…) |
| `layers` | 1,227 | la tabla de capas completa del atlas — 911 raíces nombradas, 150 fotogramas extra de animación, 171 ranuras prerrotadas |

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


## Deriva (bny9u → v98qt8)

| Medición | bny9u (v5) | v98qt8 (v5, actual) |
|---|---|---|
| entradas del atlas | 1.232 | **1.227** |
| familias de rotación (grafías giradas) | 57 (228) | **57 (228) — sin cambios** |
| familias de animación (grafías de fotograma) | 43 (196) | **43 (196) — sin cambios** |
| constantes con nombre utilizables | 911 | **906** |
| cambios de id entre supervivientes | — | **716 de 905** (79 %) |

La deriva completa (7 nombres): añadido (1) `hay_block_top`; eliminados (6) `artisan_table_side` / `artisan_table_top` / `crafting_table_side` / `furnace_front` / `furnace_side` / `furnace_top` — el Horno, la Mesa de trabajo y el Banco artesano se convirtieron de bloques texturizados del terreno a modelos de bloque, por lo que sus texturas de terreno salieron del registro (la Mesa de trabajo conservó `crafting_table_top` — su cara superior sigue siendo textura de terreno). Producción y preprod sirven el mismo bundle idéntico byte a byte (md5 `7458fd47ff88331d9f451d1456ff48ac`).

## La regresión de plegado de v98qt8

`v98qt8` incluye una regresión verificada a nivel de bytes en el plegado de constantes de textura. El módulo de datos (1351) ahora construye `animatedBlockTextures` como un **Array indexado por grafía** (`Yi[pii[0]] ??= {numAnimStates, animStartIdx, …}` — verificado por hexdump en el bundle principal en vivo), mientras que el clasificador (módulo 30048) sigue esperando un **array indexado por ranura** en dos puntos:

1. `hii.forEach((value, key))` — `Array.prototype.forEach` nunca visita claves de tipo string, así que el mapa ranura→base de los fotogramas extra permanece vacío
2. `hii[Qi]` con `Qi` = la ranura del atlas — el acceso por corchetes con un índice de ranura nunca alcanza una clave de grafía, así que el plegado de la grafía base (`lava0` → `lava`) nunca se dispara

Consecuencias, todas medidas ejecutando tal cual el clasificador y el resolutor de producción en Node:

- los 43 nombres base de familias de animación (`lava`, todos los `*_portal`, `smoke`, `radar_screen`, `trading_terminal_front`, las 19 texturas de máquina `*_running`, …) **fallan la validación**: `bloxdTextureIdLava` → «There's no texture called bloxdTextureIdLava. Did you mean bloxdTextureIdLava0?»
- las 196 grafías de fotograma (`lava0`–`lava7`, …) se resuelven como **constantes individuales utilizables** (muestreando solo el fotograma base — sin animación)
- el diagnóstico dedicado «names a frame of the animated texture» nunca puede dispararse (no existen alias de fotograma)
- el conjunto `named` en tiempo de ejecución del motor tiene 1.047 filas, así que el hash de registro que el motor calcula para `HEADER_VERSION` es `694df62c` — no el `df6c1915` previsto (plegado) — lo que además fuerza **a cada paquete guardado a revalidarse** en este build

Experimento de control: alimentar al mismo clasificador con un array indexado por ranura (lo que espera la propia lógica de plegado y lo que producía el módulo de datos de `bny9u`) reproduce exactamente la salida plegada documentada — 906 named con `lava` en id 1, `lava0`–`lava7` como alias de fotograma, 424 alias, 1.227 capas. Las reglas de plegado de abajo describen esa API prevista.

## Efecto sobre HEADER_VERSION

El sufijo de hash del registro hornea los ids, así que esta deriva marca **cada paquete guardado como «necesita revisión»** (revalidado automáticamente al cargar la página). Los paquetes escritos con nombres sobreviven a la re-resolución; los de ids crudos se rompen ([Compatibilidad](../api/compatibility.md)).

## Registros de deriva pasados

La comparación de dos builds de octubre (sjr0p7 → cnty9, 10 días): entradas 1200 → 1219 (98 añadidas, 79 eliminadas); 779 de 1121 nombres con grafía sin cambios cambiaron de id (69 %); una migración de convención de nombres (sufijos `_rot1..4` → ranuras `[rot[1..4`); la aparición del cofre doble. El registro completo vive en [Historial de versiones: v4](../history/v4.md).

4 de noviembre (ab90qa → xkg8x, 1 día): entradas 1,210 → 1,220 (+10, todas nombres que vuelven — las eliminaciones del lanzamiento de v5 se revirtieron); 376 de 896 nombres cambiaron de id (42 %); sin eliminaciones; ambas familias de plegado sin cambios. El cofre doble está de vuelta.

8 de noviembre (bny9u → v98qt8, 3 días): entradas 1.232 → 1.227 (+1 `hay_block_top`, −6 texturas de bloques convertidos a modelo: Horno, Mesa de trabajo, Banco artesano); 716 de 905 nombres cambiaron de id (79 %); familias de rotación y animación sin cambios (57 / 43). Producción y preprod sirven el mismo bundle idéntico byte a byte — y el build lleva la regresión de plegado documentada arriba.

## Relacionado

- [Catálogo de texturas](../api/texture-catalog.md) · [Validación de sombreadores](shader-validation.md) · [Registro de investigación](research-log.md)
