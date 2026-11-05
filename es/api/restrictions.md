# Restricciones y nombres reservados

> API objetivo: 5 · Build objetivo: `bny9u` · Estado: Verified (límites de v4 reconfirmados byte a byte en v5)

Qué pueden escribir los paquetes, y las reglas completas de reserva de nombres.

## Permitido

- funciones integradas de WGSL (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select`, …)
- tus propios `fn` / `struct` / `const` / `alias` / `var<private>`, `let` dentro de funciones y control de flujo (if/for/while/switch…)
- derivadas (`dpdx` / `dpdy` / `fwidth`) solo en hooks surface/light (etapa de fragmento) — no en hooks de vértice
- arrays `const` (LUTs de color etc.), punteros (`ptr<function, T>`), matrices (`mat3x3f` etc.)
- definiciones de flag `#define NAME` (sin valor) + condicionales `#ifdef`

## Prohibido / advertencias

- **Sin texturas directas**: no puedes declarar tipos `texture_*` / `sampler`; las lecturas del atlas van únicamente por [`bloxdTexel`](texture-api.md). *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- **`discard` está prohibido en strict** — envuélvelo en `#ifndef BLOXD_STRICT`
- `@attributes` / `enable` / `requires` / `override` están prohibidos — no hay `enable f16;`, así que **sin tipos f16**
- sin `@builtin`, así que `fragCoord` / `vertex_index` son inaccesibles
- **sin `let` de ámbito de módulo** — usa `const` o `var`
- sin `atomic`
- **nunca construyas las estructuras de salida directamente**: `BloxdLight(...)` falla la validación estática; parte de `bloxdDefault*`
- un `var x: BloxdSurface;` desnudo es un error de validación
- los parámetros de los hooks son de solo lectura — cópialos antes de mutarlos
- `#define` no toma valor (solo nombres)

## Nombres reservados

### El prefijo bloxd (regla general)

**Todo identificador que coincida con `/^bloxd/i` (sin distinguir mayúsculas) está reservado.** Las únicas excepciones son los 9 nombres de funciones hook.

Texto del validador, literal:

> *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*

### El espacio de nombres bloxdSp* (46 símbolos)

Los 46 símbolos que el generador de código puede inyectar y que por tanto no se pueden redeclarar:

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

Cubren la entrega de la estructura de flags (`bloxdSpFlags`), las entradas de encantamiento y locales de modelo (`bloxdSpEnchant` / `bloxdSpItemLocalPosition`), la ruta de paquetes de texturas con muestreo por celda, la cadena de rotación y las variables locales de hooks extendidos. **La regla de reserva a nivel de paquete es más amplia que esta lista** (todo lo que coincida con `/^bloxd/i`), así que no necesitas memorizarla — simplemente nunca empieces tus propios nombres por `bloxd`.

### Nombres de textura

Los identificadores que empiezan por `bloxdTextureId` se resuelven como constantes de nombre de textura ([API de texturas](texture-api.md#bloxdtextureid-constantes-de-textura-por-nombre)).

## Reescrituras automáticas

- **Inversión de signo de la derivada en Y**: el analizador reescribe toda llamada a `dpdy`, `dpdyCoarse` y `dpdyFine` como `(-dpdy(...))` (la familia dpdy está explícitamente enumerada como conjunto de inversión en la pasada de reescritura de tokens del validador). La y en espacio de pantalla apunta hacia abajo, así que esta inversión hace que «tasa de cambio hacia arriba» coincida con la intuición. Escribe `dpdy(h)` con la intención de «cómo cambia h al subir» y el código emitido lleva la inversión. `dpdx` y la familia `fwidth` quedan intactas

## Diagnósticos que verás de verdad

- *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*
- *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- *"X reaches bloxdTexel, which only surface and light hooks can use."*
- *"X reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and Y doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH."*
- *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## Relacionado

- [Solución de problemas: compilación](../troubleshooting/compilation.md) · [Interior del motor: validación de sombreadores](../internals/shader-validation.md)
