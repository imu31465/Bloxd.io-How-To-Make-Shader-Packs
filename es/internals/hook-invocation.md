# Internas de la invocación de hooks

> API objetivo: 5 · Build objetivo: `bny9u` · Estado: Analyzed (restaurado del bundle de producción — el renderizador Lite; el archivo fuente integrado `lite/terrainShaderPack.ts` sobrevive en las cadenas de error)

Cómo llama el motor a los hooks en tiempo de ejecución. Esto no cambia nada del código que escribes, pero elimina las conjeturas sobre qué reciben los hooks.

## La arquitectura de empalme

El renderizador no «llama» a los hooks desde JavaScript. Una vez que un paquete pasa la validación, el motor **injerta tus invocaciones de hooks en su WGSL de terreno reemplazando líneas de anclaje fijas en el texto del sombreador**. Cada anclaje debe coincidir exactamente una vez — cero o varias coincidencias abortan con `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Etapa | Anclaje en el sombreador del motor | Qué se injerta |
|---|---|---|
| vertex | el bloque `let worldPos = …` hasta `vertexOutputs.vNormalW = …` | construir `BloxdVertexIn`, llamar al hook de vértice, escribir `worldPos` de vuelta (reescribiendo también `let worldPos` a `var worldPos`) |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | construir `BloxdSurfaceIn`, llamar al hook de surface, escribir `baseColor` / `alpha` de vuelta |
| color iluminado | justo antes de la mezcla de niebla | captura el color pre-niebla (v3 usaba la temporal `bloxdSpLitColour` — v5 promueve ese papel a la función de cabecera pública `bloxdLitColour()`) |
| light | el `return color;` al final del sombreador de fragmento | construir `BloxdLightIn`, llamar al hook de light, escribir `color` de vuelta — tras la mezcla de niebla |

## Lo que el empalme fuerza

- **El terreno strict ignora los cambios de alpha del hook de surface.** La reescritura `alpha = bloxdSpSurface.alpha` se injerta solo para el programa de líquido o las variantes no strict — la implementación detrás de la tabla de macros ([Preprocesador](../api/preprocessor.md))
- **Una variante strict que declara un hook de vértice nunca lo ejecuta.** El motor informa en tiempo de construcción: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. De ahí el `#ifndef BLOXD_STRICT` de la plantilla
- **Los identificadores `bloxdSp*`** son temporales del motor — invisibles para tu código pero presentes en diagnósticos y en la salida de ingeniería inversa ([Identificadores reservados](reserved-identifiers.md) — 46 en v5)
- **El atajo de surface por defecto.** Si el hook de surface de una variante es literalmente `bloxdDefaultSurface`, el motor omite por completo el injerto de reescritura de `baseColor` / `alpha` — el valor por defecto ya produce esos valores, así que las asignaciones son código muerto. **Las cadenas de hooks sin modificar no cuestan nada**

## Qué cambió en v5

La arquitectura de empalme existía en el renderizador de v2 y se mantuvo estable de v2 a v3 (v3 solo cambió `vBlockId` → `vBlockFlags` y añadió la variante de líquido). Los cambios de v5:

- `vBlockFlags` (bits) → la **estructura `BloxdFlags`** (entregada vía `bloxdSpFlags`)
- la captura de `litColour` pasó de interna del motor a **API pública** (`bloxdLitColour()` — el `bloxdSpLitColour` de v4 promovido)
- `BloxdLightIn` ganó `diffuse` / `emissive`, y `bloxdShading()` reconstruye la respuesta del material ([Iluminación](../api/lighting.md))
- la entrega de `localPosition` (`bloxdSpItemLocalPosition`), las entradas de encantamiento (`bloxdSpEnchant`) y `overlayColour` ([Renderizado de modelos](model-rendering.md))
- `fogVisibility` → **`fogAlpha`** (invertido)
- el programa Model se unió a la matriz de variantes (3 programas × 2 modos = 6 variantes)

## Qué alimenta BloxdLightIn (por campo)

| Campo | Fuente en el lado del motor |
|---|---|
| `litColour` | el color del fragmento capturado justo antes de la mezcla de niebla — «antes de emisión y niebla» en términos de la cabecera |
| `directional` | la suma interpolada por vértice del Lambert de cada luz direccional (montaje de 2 luces en [Canalización de renderizado](rendering-pipeline.md)) |
| `diffuse` / `emissive` | la respuesta RGB direccional del material / el brillo RGB |
| `ambient` | `material.ambient × sceneAmbient` — por material, por fotograma |
| `blockLight` / `skyLight` | los varyings de niveles de luz decodificados ([Internas de iluminación](lighting-internals.md)) |
| `ambientLightColour` / `skyLightColour` | los uniforms correspondientes |
| `heldLight` | construido a partir del varying de nivel de luz y los uniforms de luz en mano (cono de atenuación en [Internas de iluminación](lighting-internals.md)) |
| `fogColour` | negro solo en escenas completamente sin niebla (modo 0) |
| `fogAlpha` | el factor de niebla acotado ([Internas de niebla](fog-internals.md)) |
| `position` / `normal` / `localPosition` / `flags` / `textureId` / `textureRotation` / `uv` / `mipLevel` | varyings y valores de interpolación plana (igual que `BloxdSurfaceIn` — valores posteriores al hook de vértice) |

## Relacionado

- [Hooks de sombreado](../api/hooks.md) · [Canalización de renderizado](rendering-pipeline.md) · [Identificadores reservados](reserved-identifiers.md) · [Historial de versiones: v3](../history/v3.md)
