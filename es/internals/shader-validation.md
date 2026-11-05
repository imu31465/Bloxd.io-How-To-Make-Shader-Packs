# Internas de la validación de sombreadores

> API objetivo: 5 · Build objetivo: `bny9u` · Estado: Analyzed (restaurado del validador en vivo)

La validación estática (analizador, etapa 1 de la comprobación de carga). Correcciones orientadas al usuario: [Errores de validación](../troubleshooting/validation.md).

## Las etapas

1. **Límites del cargador** (forma del zip / pack.json) → [Formato del paquete](../api/pack-format.md)
2. **Validación estática (analizador)** — esta página; sintaxis, tipos, nombres reservados, contratos de hooks en las 6 variantes
3. **Compilación real en el navegador** → [Compilación de WGSL](wgsl-compilation.md)
4. **Revalidación en ejecución al unirse a un juego** — de hecho compila cada material de terreno existente (más estricta que la comprobación de la pantalla de ajustes); fallarla descarta el paquete para ese juego

## La tabla de firmas de funciones especiales

El validador mantiene una tabla en el módulo 29849 y comprueba las restricciones de llamada entre hooks:

```js
const Jq = new Map([
  ["bloxdFragmentBlockPosition", { params: "position: vec3f, normal: vec3f", returns: "vec3i", symbol: null, vertex: true }],
  ["bloxdOpaqueBehind", { params: "", returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }],
  ["bloxdTexel", { params: "textureId: u32, uv: vec2f, mipLevel: f32", returns: "vec4f", symbol: null }],
  ["bloxdTextureSize", { params: "mipLevel: f32", returns: "vec2u", symbol: null }],
]);
```

Lógica restaurada:

- llamar a una función especial no marcada `vertex: true` desde un hook de vértice → *"X reaches Y, which only surface and light hooks can use."*
- una función con `symbol` (`bloxdOpaqueBehind` → `BLOXD_SCENE_DEPTH`) alcanzada desde una variante que no define esa macro → *"X reaches Y, which needs BLOXD_SCENE_DEPTH, and Z doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH."*

Nota: `bloxdFragmentBlockPosition` ha salido de la generación de la cabecera, pero su entrada permanece en esta tabla en vivo — y la tabla es lo que consulta la comprobación de identificadores, así que las llamadas siguen pasando la validación. El generador de código también sigue inyectando la definición (terreno/líquido y ambos programas de modelo), así que la función sigue siendo llamable en la práctica. Se trata como deprecada: indocumentada, y puede caer en cualquier versión futura.

## Diagnósticos de nombres reservados

- **la regla general `/^bloxd/i`**: *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*
- **declaraciones directas de texture/sampler**: *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*

## Resolución y diagnóstico de nombres de textura

La resolución `bloxdTextureId*` tiene una ruta dedicada ([los mensajes](../api/texture-api.md#errores-de-resolución-de-nombres-literales-del-validador)):

- **plegado**: división por no alfanuméricos, CamelCase, prefijo `bloxdTextureId`; la coincidencia inversa no distingue mayúsculas ni guiones bajos
- **sugerencias de grafía** (nuevo en v5): los nombres sin coincidencia reciben propuestas Levenshtein con umbral `max(2, floor(len/4)) + 1`
- mensajes dedicados para grafías de fotograma y grafías de copia girada
- los nombres ambiguos tras el plegado no se pueden usar

## Los nuevos diagnósticos de v5

- *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."* — nombra la macro eliminada
- los paquetes que lean `blockFlags` o referencien `bloxdBlockFlag*` fallan el diagnóstico de nombres reservados — **ningún paquete se comporta mal en silencio**

## La reescritura de la derivada en Y

La pasada de reescritura de tokens del analizador reescribe toda llamada a `dpdy` / `dpdyCoarse` / `dpdyFine` a `(-dpdy(...))` (la familia dpdy está explícitamente enumerada como conjunto de inversión). `dpdx` y `fwidth` quedan intactas ([Restricciones](../api/restrictions.md#reescrituras-automáticas)).

## Generación de cabecera y constantes de textura

- la cabecera se antepone en modo solo lectura ([Cabecera del motor](engine-header.md))
- el bloque `bloxdTextureId*` se genera **por paquete** a partir de los nombres referenciados

## HEADER_VERSION

`HEADER_VERSION` es `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` (entero inicial de 8 → 9 desde v4). Los dos sufijos fnv1a32 toman la huella del material de la cabecera y del registro ordenado nombre-id. La revalidación de paquetes guardados usa esta huella para decidir «necesita revisión» ([Compatibilidad](../api/compatibility.md#revalidación-de-paquetes-guardados-necesita-revisión)).

## Stubs de validación

El código que pasa la validación estática recibe código stub sintetizado antes de la comprobación real de WGSL del navegador: `var<private> bloxdValidationP: vec4f` más `bloxdValidateVertex` / `bloxdValidateFragment` — la tabla de stubs de tipos (`bool` → `p.x > 0.0`, `vec3f` → `p.xyz`, …) construye las estructuras de entrada e invoca los hooks. Detalles: [Compilación de WGSL](wgsl-compilation.md).

## Relacionado

- [Errores de validación](../troubleshooting/validation.md) · [Compilación de WGSL](wgsl-compilation.md) · [Registro de texturas](texture-registry.md) · [Datos del motor](engine-data.md)
