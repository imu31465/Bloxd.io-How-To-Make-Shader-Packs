[← Parte anterior](realism.md)·[Volver al manual](README.md)·[Parte siguiente →](implementation.md)

# Parte V: Solución de problemas y notas

## 17. Errores comunes y soluciones

| Síntoma | Solución |
|---|---|
| No carga en juegos estrictos | Envuelve el hook vertex en `#ifndef BLOXD_STRICT` |
| `.alpha` reportado indefinido | Envuelve en `#ifdef BLOXD_ALPHA` |
| `blockLight` reportado indefinido | Envuelve en `#ifdef BLOXD_LIGHTING`. Envuelve funciones auxiliares compartidas **como funciones enteras** (en v2 el campo existe en todas las variantes: rara vez ocurre. Mantén las guardias usadas para detección) |
| `Packs can't construct BloxdSurface directly` | Empieza desde `bloxdDefaultSurface(s)` |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | Envuelve en `#ifndef BLOXD_STRICT` |
| Distancia blanca y lechosa | Suele ser doble niebla. El color terminado ya lleva niebla: mantén sutil la bruma propia y prefiere reducir solo saturación |
| Paquete excluido al unirse al juego | Falla la comprobación en vivo del juego. Revisa omisiones de guardias |
| `pack.json needs "apiVersion": 2.` | Falta `apiVersion` o no es `2`. Añade el número `2` (la cadena `"2"` se rechaza). Los paquetes v1 se rechazan con `shaderPack:loadWrongApiVersion` |
| `There's no pack.json at the top of the pack.` | Sin `pack.json` en la raíz del ZIP. Revisa no haber comprimido la carpeta misma |
| `bloxdTerrainVertex must be declared as: fn ...` | Firma distinta. Reescribe exactamente como se muestra |
| `bloxdTerrainVertex can't run in strict games...` | Envuelve el hook vertex en `#ifndef BLOXD_STRICT` |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | Envuelve en `#ifdef BLOXD_LIGHTING` (en v2 el campo existe en todas las variantes: rara vez ocurre) |
| Subir `pow(l.skyLight, γ)` jamás profundiza sombras | `skyLight` es valor post-curva (crudo 0.87 llega como 0.97). Cambia a inversión + umbral de R9.12 (sección 10) |
| `... can only be a function's parameter or return type, ...` | `var x: BloxdSurface;` sin inicializar es rechazado. Construye desde `bloxdDefault*` |
| `bloxdPackInputs isn't part of the bloxd_ header` | El uniform PackInputs no se puede referenciar desde paquetes directamente. Úsalo vía funciones de cabecera como `bloxdTime()` |
| `Packs can't declare bloxd_ names...` | Quita el prefijo `bloxd_` de tus identificadores. Solo los 6 nombres de hook pueden definirse |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` se rechaza. Escribe `_ = f();` |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | Envuelve las llamadas `bloxdOpaqueBehind()` en hooks de terreno con `#ifdef BLOXD_SCENE_DEPTH` |
| `...only surface and light hooks can use.` | Quita `bloxdOpaqueBehind()` de hooks vertex (solo surface / light) |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | No es error sino autodesactivación en juegos estrictos (`shaderPack:offInStrict`). Envuelve hooks vertex y `discard` con `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Error de segunda etapa (Tint del navegador). Pon entre paréntesis operandos de `^` `&` `\|` `<<` `>>` (§38) |
| `loadDuplicateManifest` al cargar zip | Dos `pack.json` (incluidas variantes de mayúsculas). Deja uno |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Reescribe desde `bloxdDefaultSurface(s)`. Empezar de una copia del primer parámetro del hook light (`var out = s;`) también vale |

## 18. Derechos y notas

- La función de paquetes de sombreadores es una función oficial cargable desde la interfaz del juego, y crear paquetes se considera uso previsto. Pero no se ha confirmado documentación oficial pública
- Los paquetes son WGSL puro — la ejecución de JS y el acceso a red son imposibles por diseño
- Esta es una guía no oficial, no la postura oficial de los desarrolladores. La API puede cambiar sin aviso
