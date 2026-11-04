# Errores de versión de API

> API objetivo: 5 · Build objetivo: `xkg8x` (2026-11-04, producción) · Estado: Verified (literal del diccionario i18n en vivo)

Errores en torno a `apiVersion`. El juego actual acepta **solo `5`**.

## "pack.json needs "apiVersion": {{version}}."

- **Síntoma**: este mensaje justo tras la carga (`loadNoApiVersion`)
- **Causa**: falta la clave `apiVersion` por completo
- **Corrección**: añade `"apiVersion": 5` — un **número** (el string `"5"` falla)
- **Prevención**: parte de la plantilla de [pack.json](../getting-started/manifest.md)

## "This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}."

- **Síntoma**: `loadWrongApiVersion`
- **Causa**: `apiVersion` existe pero no es 5 (un paquete v1–v4)
- **Corrección**: aplica la migración que corresponda ([Historial de versiones](../history/)):
  - v4 → v5: [la guía de v5](../history/v5.md) — casi todo mecánico (flags · `bloxdLit()` · la advertencia de `bloxdFragmentBlockPosition`)
  - v3 → v5: aplica primero [v4](../history/v4.md)
  - v2 o anterior → v5: recorre v3 → v4 → v5
- **Prevención**: tras cualquier actualización de la API, consulta [Compatibilidad](../api/compatibility.md) y la guía de migración correspondiente

## El string "5" se rechaza

- **Causa**: el cargador compara `manifest.apiVersion !== 5` **estrictamente** (`===`); un string JSON `"5"` no es el número 5
- **Corrección**: `"apiVersion": 5` (sin comillas)

## Un paquete antiguo guardado dejó de funcionar en silencio

- **Síntoma**: un paquete v1–v4 que antes funcionaba no responde, sin excepción alguna
- **Causa**: los paquetes guardados se resuelven a `{kind: "none", reason: "otherApiVersion"}` y quedan **inactivos en silencio**
- **Comprobación**: la línea de estado de la pestaña de ajustes: `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`
- **Corrección**: carga un reemplazo migrado desde la misma pantalla
- **Prevención**: tras las actualizaciones de la API, vuelve a publicar una versión con el número subido y anúnciala ([Distribución](../getting-started/distribution.md))

## Un paquete v4 migrado falla la validación

Los tres patrones típicos (pasos completos en la [guía de migración a v5](../history/v5.md)):

| Mensaje de validación | Causa | Corrección |
|---|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | uso de `#ifdef BLOXD_LIGHTING` | reescríbelo como `if (bloxdLit()) { ... } else { return bloxdDefaultLight(s, l); }` |
| `bloxdBlockFlagRock isn't part of the shader pack API...` (diagnóstico de nombre reservado) | referencias restantes a constantes de bits | usa `surface.flags.rock` etc. (tabla 1:1 en [Flags](../api/flags.md)) |
| falta `bloxdFragmentBlockPosition` | fuera de la cabecera documentada desde v5 (aún inyectada y aceptada — ver [Funciones](../api/functions.md)) | no es un error que corregir: compila; prefiere `flags` / `bloxdWorldPosition()` en código nuevo |

## Relacionado

- [Compatibilidad](../api/compatibility.md) · [Historial de versiones](../history/) · [pack.json](../getting-started/manifest.md)
