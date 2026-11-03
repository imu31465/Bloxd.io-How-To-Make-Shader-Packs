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
| `ab90qa` | **v5** | 2026-11-03 | **actual**; línea base de esta documentación. prod = preprod (md5 `fc3322212d15be2445c0e8dfc9733fcc`) |

## Metodología clave

### Restauración de la cabecera del motor

Renderizando la plantilla de cabecera de c55 con sus interpolaciones en vivo (`${vC}` = apiVersion, las 5 lecturas del uniform vía `${Gq.j}`) — 6 interpolaciones en v5 ([Cabecera del motor](engine-header.md)).

### Recómputo del registro de texturas

Ejecutando los módulos constructores del registro del motor (29833 + 1371 + 1391 + 1384 + 219) contra los datos de textura del registro de bloques distribuido en un mini arnés de webpack; registrando la salida (896 con nombre / 416 alias / 228 capas) ([Registro de texturas](texture-registry.md)).

Los intervalos de animación provienen de la tabla tipo `animDataPerTex` (por capa `numAnimStates` / `animationInterval`) — solo existen tres valores de intervalo: 200 / 250 / 300 ms ([el catálogo](../api/texture-catalog.md#familias-de-animación-42-nombres)).

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

## Sin verificar / especulativo

- Los mapas de sombras precisos al píxel como «planes futuros» son una **interpretación** (inferida del `var shadow: f32 = 1.;` sin usar en la plantilla de iluminación)
- El reparto allow/strict puede cambiar por build (identidad de 12 títulos reconfirmada en ab90qa; juegos futuros desconocidos)
- `bloxdFragmentBlockPosition` (fuera de la cabecera v5): entrada en la tabla de firmas e inyección en ejecución ambas confirmadas en vivo — las llamadas validan y compilan; si el equipo del motor pretende conservarla es desconocido

## Cuándo reverificar

Al detectar una actualización del juego (un nuevo hash de main.js): re-comprueba la cabecera (9.125 B), la constante apiVersion, recalcula el registro y reconfirma la lista allow/strict. La metodología de vigilancia detallada queda fuera del alcance de esta documentación, pero las ubicaciones de módulos de arriba (c55 / c116 / c56) son los puntos de partida.

## Relacionado

- [Datos del motor](engine-data.md) · [Registro de texturas](texture-registry.md) · [Historial de versiones](../history/)
