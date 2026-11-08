# Registro de investigación

> Estado: Verified — cómo se obtuvieron las mediciones de esta documentación

Las afirmaciones técnicas de aquí no descansan en documentación oficial de los desarrolladores sino en el **análisis del bundle de producción**. Esta página registra la metodología y la evidencia para que los builds futuros se puedan reverificar.

## Principios básicos

1. **Recuperación directa del bundle de producción** — el main.js y los chunks crudos descargados tanto de producción como de preprod, identidad verificada por md5
2. **Respeto literal** — cabeceras, mensajes de error y cadenas i18n se **citan tal cual**, nunca parafraseadas
3. **Medición reproducida** — los valores derivados, como el registro, se recalculan ejecutando los módulos del propio motor en un arnés (salida real, no una reimplementación parecida)
4. **Builds con nombre** — cada medición lleva un id de build y fecha

## Historia de builds referenciada por esta documentación

| Build | API | Fecha | Nota |
|---|---|---|---|
| `szby6g` | era v3 | 2026-10-17 | primer análisis estático allow/strict (111 definiciones de juego) |
| `3ymzdd` | v3 | 2026-10-20 | build de evidencia de la guía de v3 |
| `sjr0p7` | era v3 | 2026-10-17 | línea base de comparación de deriva |
| `cnty9` | v4 | 2026-10-27 | evidencia de la guía v4 y del catálogo de 905 nombres |
| `6pf78` / `tcwczu` | v4 | 2026-10-31 | confirmación de la congelación de v4 (evento de Halloween + rework de Skyblock) |
| `ab90qa` | **v5** | 2026-11-03 | build de lanzamiento de v5; línea base original de v5. prod = preprod (md5 `fc3322212d15be2445c0e8dfc9733fcc`) |
| `xkg8x` | **v5** | 2026-11-04 | deriva de registro (+10 nombres); preprod `2lcqcl` medido idéntico en toda superficie de shader packs |
| `bny9u` | **v5** | 2026-11-05 | ; línea base de esta documentación. prod = preprod (md5 `60eea80ec48253b7ac6cc45604dc8273` del bundle principal, descargado en vivo de ambos hosts) |
| `v98qt8` | **v5** | 2026-11-08 | **actual**; línea base de esta documentación. prod = preprod (md5 `7458fd47ff88331d9f451d1456ff48ac`). deriva del registro (−5 neto), juegos 115 → 116, y la **regresión de plegado de constantes de textura** ([Texture registry](texture-registry.md#the-v98qt8-folding-regression)) |

## Metodología clave

### Restauración de la cabecera del motor

Renderizando la plantilla de cabecera de c55 con sus interpolaciones en vivo (`${vC}` = apiVersion, las 5 lecturas del uniform vía `${Gq.j}`) — 6 interpolaciones en v5 ([Cabecera del motor](engine-header.md)).

### Recómputo del registro de texturas

Ejecutando el módulo constructor del registro del motor (29812, transportado por los chunks 52/53/54) contra los datos de textura (módulo de datos 1351 en el bundle principal) contra los datos de textura del registro de bloques distribuido en un mini arnés de webpack; registrando la salida (911 con nombre / 424 alias / atlas 1,232 en el build actual `bny9u`, 2026-11-05 — módulo 29812 + módulo de datos 1351; 906 / 416 / 1,220 en `xkg8x` vía módulos 30093 + 1391; 896 en el lanzamiento de v5) ([Registro de texturas](texture-registry.md)).

Los intervalos de animación provienen de la tabla tipo `animDataPerTex` (por capa `numAnimStates` / `animationInterval`) — solo existen tres valores de intervalo: 200 / 250 / 300 ms ([el catálogo](../api/texture-catalog.md#familias-de-animación-43-nombres)).

### Captura de mensajes de error

Mensajes del cargador literales del diccionario i18n en vivo; mensajes del validador de los literales de cadena del módulo de validación.

### Análisis estático allow / strict

Analizando estáticamente las 111 definiciones de juego: literales `"allow"` de `shaderPackPolicy` — 8 directos + 4 con variable base = 12 títulos (26 entradas), con seguimiento también de la herencia por dispersión (`{...tb,...}`) ([Política](policy.md)).

### Restauración del uniform / pipeline

El diseño de campos de `BloxdPackInputs` desde el módulo de diseño de uniform (29838); el codegen de texturas de 3 variantes desde el generador WebGPU (c56) ([Muestreo de texturas](texture-sampling.md)).

## Observaciones de deriva

| Comparación | Periodo | Resultado |
|---|---|---|
| sjr0p7 → cnty9 | 10 días | 98 añadidos, 79 eliminados; 779/1121 nombres cambiaron de id (69 %) |
| cnty9 → ab90qa | 7 días | +1 (scorpion_eggs), −10 (cofre doble ×8, laterales de generador ×2); 334/905 nombres cambiaron de id |
| ab90qa → xkg8x | 1 día | +10 (todas las eliminaciones del lanzamiento de v5 volvieron: cofre doble ×8, lados de spawner ×2); 376/896 nombres cambiaron de id; ninguno eliminado |
| xkg8x → bny9u | 1 día | +5 (Terminal de Intercambio ×3, Generador de Piedra ×2); 864/906 nombres cambiaron de id (95 %); ninguno eliminado; familias de animación 42 → 43 |
| bny9u → v98qt8 | 3 days | +1 `hay_block_top`, −6 (Furnace/Workbench/Artisan Bench became models); 716/905 names changed id (79%); families unchanged; **folding regression** — engine resolves 1,047 unfolded names |

## Sin verificar / especulativo

- Los mapas de sombras precisos al píxel como «planes futuros» son una **interpretación** (inferida del `var shadow: f32 = 1.;` sin usar en la plantilla de iluminación)
- El reparto allow/strict puede cambiar por build (identidad de 12 títulos reconfirmada en ab90qa y xkg8x; juegos futuros desconocidos)
- `bloxdFragmentBlockPosition` (fuera de la cabecera v5): entrada en la tabla de firmas e inyección en ejecución ambas confirmadas en vivo — las llamadas validan y compilan; si el equipo del motor pretende conservarla es desconocido

## Cuándo reverificar

Al detectar una actualización del juego (un nuevo hash de main.js): re-comprueba la cabecera (9.125 B), la constante apiVersion, recalcula el registro y reconfirma la lista allow/strict. La metodología de vigilancia detallada queda fuera del alcance de esta documentación, pero las ubicaciones de módulos de arriba (c55 / c116 / c56) eran los puntos de partida — en `bny9u`: módulo header/apiVersion 29815 y módulos validadores en el chunk c56, cargador (zip/manifiest/límites) módulo 32942 en el chunk c54, constructor del registro 29812 en los chunks c52/c53/c54, codegen WebGPU chunk c57, plantilla de pack por defecto módulo 33350 en el chunk c122, módulo de juegos/política 517 en el bundle principal.

## Relacionado

- [Datos del motor](engine-data.md) · [Registro de texturas](texture-registry.md) · [Historial de versiones](../history/)
