# pack.json (manifiesto)

> API objetivo: 5 · Build objetivo: `xkg8x` (2026-11-04, producción) · Estado: Verified

`pack.json` es el manifiesto del paquete — exactamente un objeto JSON en la raíz del zip.

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

## Campos

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `apiVersion` | número | obligatorio | Debe ser **exactamente `5`** (`===` estricto). Un string `"5"` o cualquier otro tipo falla, e informa con la grafía JSON |
| `name` | string | obligatorio | No vacío tras recortar espacios. Se muestra en la interfaz de ajustes |
| `author` | string | opcional | Puede omitirse; debe ser un string si está presente |

El cargador ignora todos los demás campos.

## Qué pasa al no coincidir la versión

El cargador compara `manifest.apiVersion !== 5` estrictamente y **falla en el instante mismo de la carga**. Mensajes, literales del diccionario i18n en vivo:

- `pack.json needs "apiVersion": {{version}}.` — falta la clave por completo
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — la clave existe pero no es 5

Los paquetes antiguos guardados previamente no lanzan excepciones; se resuelven a `{kind: "none", reason: "otherApiVersion"}` y quedan **inactivos en silencio**. La pestaña de ajustes de shader packs explica el porqué:

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

Para migrar desde v1–v4, ver [Historial de versiones](../history/).
