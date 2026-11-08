# Compatibilidad

> API objetivo: 5 · Build objetivo: `v98qt8` (2026-11-08, producción y preprod) · Estado: Verified

Cómo interoperan el juego actual y los paquetes de versiones antiguas.

## Versiones aceptadas

**Solo `apiVersion: 5`.** El cargador compara `manifest.apiVersion !== 5` estrictamente y los paquetes v1/v2/v3/v4 **fallan en el instante mismo de la carga**. No existe aceptación de varias versiones a la vez.

## Mensajes en el momento de la carga (literales del diccionario i18n en vivo)

- `pack.json needs "apiVersion": {{version}}.` — falta la clave `apiVersion`
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — la clave existe pero no es 5

## Paquetes antiguos guardados (sin excepciones — desactivación silenciosa)

Los paquetes v1–v4 guardados previamente no lanzan errores. El resultado del paquete guardado se resuelve a:

```
{kind: "none", reason: "otherApiVersion"}
```

y el paquete queda **inactivo en silencio**. Solo la pestaña de ajustes de shader packs explica el porqué:

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

## La naturaleza de la conversión v4 → v5

La conversión es en su mayoría mecánica (lista completa en [la guía de migración a v5](../history/v5.md)):

- `blockFlags & bloxdBlockFlagX != 0u` → `flags.x` (un renombrado 1:1)
- `#ifdef BLOXD_LIGHTING` → `if (bloxdLit()) { ... } else { return bloxdDefaultLight(...); }`
- los puntos de llamada a `bloxdFragmentBlockPosition` siguen compilando (el motor lo sigue inyectando), pero ya no está documentado — migrar fuera de él es la jugada segura ([Funciones](functions.md#bloxdfragmentblockposition--indocumentado-pero-sigue-inyectado))
- sube `pack.json` a `"apiVersion": 5`

La trampa silenciosa de esta vez: los paquetes que sigan leyendo `blockFlags` o envolviendo hooks de luz en `#ifdef BLOXD_LIGHTING` **fallan la validación con mensajes dedicados** (el analizador ya explica ambos casos), así que nada se comporta mal en silencio — simplemente siguen rechazados hasta que se migren.

## Revalidación de paquetes guardados («necesita revisión»)

`HEADER_VERSION` es `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` (el entero inicial pasó del 8 de v4 al 9). Cuando la cabecera del motor o el registro de texturas cambian (habitual con las actualizaciones del juego), los paquetes guardados se marcan como «necesita revisión» y se revalidan automáticamente al cargar la página.

**Advertencia de v98qt8:** la regresión de plegado del build actual ([Interior del motor: registro de texturas](../internals/texture-registry.md#the-v98qt8-folding-regression)) cambia lo que hashea el motor — el sufijo de registro que calcula es la tabla *sin plegar* de 1.047 filas (`694df62c`), no la plegada de 906 filas prevista (`df6c1915`, era `e735ebdc` en `bny9u`). Cada paquete guardado se revalida por tanto en este build, y los paquetes que referencien alguno de los 43 nombres base de familias de animación (`lava`, …) **fallan** la revalidación hasta que se arregle el lado del motor — escribe los nombres plegados de todos modos; son la API.



Un ejemplo medido del movimiento del registro (dos builds, 10 días de diferencia): entradas 1200 → 1219 (98 añadidas, 79 eliminadas), y de los nombres que conservaron su grafía, **779 de 1121 cambiaron de id**. Dicho de otro modo:

- **los paquetes escritos con nombres (`bloxdTextureIdLava`) sobreviven a la deriva** (el cargador los re-resuelve contra el registro en vivo)
- **los paquetes escritos con ids crudos (`19`) se rompen en la revalidación**

Detalles: [Interior del motor: registro de texturas](../internals/texture-registry.md).

## Entornos de ejecución

- **Solo renderizador WebGPU**: instalar un paquete activa por la fuerza el renderizador WebGPU
- **Móvil**: los entornos con WebGPU limitado no pueden ejecutar paquetes en absoluto ([Requisitos](../getting-started/requirements.md))
- **Configuraciones de renderizador sin atlas**: `bloxdTexel` / `bloxdTextureSize` se degradan a stubs (texels blancos, 1×1); el código sigue compilando y ejecutándose ([API de texturas](texture-api.md#adónde-no-llega-la-api-de-texturas))

## Resumen de soporte de versiones

| Versión de API | En producción desde | Trato del juego actual |
|---|---|---|
| v1 | — | rechazado al cargar (migra vía [v2](../history/v2.md)) |
| v2 | — | rechazado al cargar |
| v3 | 2026-10-19 | rechazado al cargar |
| v4 | 2026-10-26 | rechazado al cargar |
| **v5** | **2026-11-03** | **actual** |

## Relacionado

- [Lista de comprobación de migración a v5](../history/v5.md) · [Historial de versiones](../history/)
