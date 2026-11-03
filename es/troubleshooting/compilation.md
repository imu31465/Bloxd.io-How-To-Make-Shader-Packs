# Errores de compilación

> API objetivo: 5 · Estado: Verified

Errores que pasan la validación estática pero fallan como WGSL, o fallan solo en el compilador WGSL del navegador (etapa 2).

## "bloxdTerrainVertex must be declared as: fn ..."

- **Causa**: desajuste de la firma del hook (tipos de argumento/retorno)
- **Corrección**: reescribe según la declaración mostrada en el mensaje (los nombres de parámetros son libres; los tipos deben coincidir exactamente)
- **Prevención**: parte de la [tabla comparativa de hooks](../api/hooks.md)

## "mixing '*' and '^' requires parenthesis (only in ...)"

- **Causa**: WGSL exige paréntesis al mezclar `^` `&` `|` `<<` `>>` con otros operadores
- **Corrección**: pon paréntesis a los operandos

## "... can only be a function's parameter or return type, ..."

- **Causa**: `var x: BloxdSurface;` — las declaraciones desnudas con anotación de tipo se rechazan porque las estructuras de cabecera ganan campos
- **Corrección**: `var out = bloxdDefaultSurface(s);` (o `var out = s;` en hooks de light)
- **Prevención**: construye siempre las salidas desde `bloxdDefault*` ([convenciones](../api/structures.md#convenciones-de-escritura-recapitulación))

## "_ can only be the target of a phony assignment, as in _ = f();"

- **Causa**: `let _ = f();` es WGSL inválido
- **Corrección**: escribe `_ = f();`

## "Lite: …reads scene depth on a page that didn't turn it on"

- **Causa**: un paquete lector de profundidad (`bloxdOpaqueBehind`) estaba activo cuando se generó la página; la disponibilidad de profundidad se decide en la generación de la página
- **Corrección**: recarga la página con el paquete activo

## El signo de dpdy parece invertido

- **Es de diseño**: el analizador reescribe automáticamente toda llamada a `dpdy` / `dpdyCoarse` / `dpdyFine` a `(-dpdy(...))` (la y en espacio de pantalla apunta hacia abajo)
- **Corrección**: nada — escribe `dpdy(h)` con la intención de «cómo cambia h al subir» y el código emitido lleva la inversión ([Restricciones](../api/restrictions.md#reescrituras-automáticas))
- `dpdx` y `fwidth` quedan intactas

## El paquete se descarta al unirse a un juego / la comprobación en el dispositivo nunca termina

- **Causa**: la comprobación en el dispositivo falló, o alcanzó el tiempo límite forzado de 60 segundos (`skipped`) — común en dispositivos de gama baja y mundos pesados
- **Corrección**: reduce el trabajo pesado de vértices y los bucles complejos; ver [Rendimiento](performance.md)

## Relacionado

- [Errores de validación](validation.md) · [Interior del motor: compilación de WGSL](../internals/wgsl-compilation.md) · [Restricciones](../api/restrictions.md)
