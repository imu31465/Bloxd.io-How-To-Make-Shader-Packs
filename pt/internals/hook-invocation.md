# Interioridades da invocação de hooks

> API alvo: 5 · Build alvo: `v98qt8` · Estado: Analyzed (restaurado do bundle de produção — o renderizador Lite; o arquivo-fonte integrado `lite/terrainShaderPack.ts` sobrevive nas strings de erro)

Como o motor chama os hooks em tempo de execução. Isto não muda nada no código que você escreve, mas elimina as suposições sobre o que os hooks recebem.

## A arquitetura de injeção

O renderizador não "chama" hooks a partir de JavaScript. Quando um pacote passa na validação, o motor **injeta suas invocações de hooks no próprio WGSL de terreno, substituindo linhas de âncora fixas no texto do shader**. Cada âncora precisa corresponder exatamente uma vez — zero ou múltiplas correspondências abortam com `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Estágio | Âncora no shader do motor | O que é injetado |
|---|---|---|
| vertex | o bloco de `let worldPos = …` até `vertexOutputs.vNormalW = …` | construir `BloxdVertexIn`, chamar o hook de vertex, gravar `worldPos` de volta (reescrevendo também `let worldPos` como `var worldPos`) |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | construir `BloxdSurfaceIn`, chamar o hook de surface, gravar `baseColor` / `alpha` de volta |
| cor iluminada | logo antes da mistura de névoa | captura a cor antes da névoa (a v3 usava a temporária `bloxdSpLitColour` — a v5 promove esse papel à função de cabeçalho pública `bloxdLitColour()`) |
| light | o `return color;` no final do fragment shader | construir `BloxdLightIn`, chamar o hook de light, gravar `color` de volta — depois da mistura de névoa |

## O que a injeção força

- **Terreno strict ignora mudanças de alpha do hook de surface.** A gravação de volta `alpha = bloxdSpSurface.alpha` só é injetada para o programa liquid ou variantes não strict — a implementação por trás da tabela de macros ([Pré-processador](../api/preprocessor.md))
- **Uma variante strict que declara um hook de vertex nunca o executa.** O motor reporta no momento da build: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. Daí o `#ifndef BLOXD_STRICT` do template
- **Os identificadores `bloxdSp*`** são temporários do motor — invisíveis para o seu código, mas presentes em diagnósticos e na saída de engenharia reversa ([Identificadores reservados](reserved-identifiers.md) — 46 na v5)
- **O atalho de surface padrão.** Se o hook de surface de uma variante for literalmente `bloxdDefaultSurface`, o motor omite por completo a injeção de gravação de volta de `baseColor` / `alpha` — o padrão já produz esses valores, então as atribuições são código morto. **Cadeias de hooks sem modificação não custam nada**

## O que mudou na v5

A arquitetura de injeção existia no renderizador da v2 e permaneceu estável na passagem v2 → v3 (a v3 só mudou `vBlockId` → `vBlockFlags` e adicionou a variante liquid). As mudanças da v5:

- `vBlockFlags` (bits) → a **struct `BloxdFlags`** (entregue via `bloxdSpFlags`)
- a captura de `litColour` passou de interna do motor a **API pública** (`bloxdLitColour()` — o `bloxdSpLitColour` da v4, promovido)
- `BloxdLightIn` ganhou `diffuse` / `emissive`, e `bloxdShading()` reconstrói a resposta do material ([Iluminação](../api/lighting.md))
- a entrega de `localPosition` (`bloxdSpItemLocalPosition`), das entradas de encantamento (`bloxdSpEnchant`) e de `overlayColour` ([Renderização de modelos](model-rendering.md))
- `fogVisibility` → **`fogAlpha`** (invertido)
- o programa Model entrou na matriz de variantes (3 programas × 2 modos = 6 variantes)

## O que alimenta BloxdLightIn (por campo)

| Campo | Origem no lado do motor |
|---|---|
| `litColour` | a cor do fragmento capturada logo antes da mistura de névoa — "before emission and fog", nos termos do cabeçalho |
| `directional` | a soma interpolada por vértice do Lambert de cada luz direcional (o rig de 2 luzes em [Pipeline de renderização](rendering-pipeline.md)) |
| `diffuse` / `emissive` | a resposta RGB direcional do material / o brilho RGB |
| `ambient` | `material.ambient × sceneAmbient` — por material, por frame |
| `blockLight` / `skyLight` | os varyings de níveis de luz decodificados ([Interioridades de iluminação](lighting-internals.md)) |
| `ambientLightColour` / `skyLightColour` | os uniforms correspondentes |
| `heldLight` | construída a partir do varying de nível de luz e dos uniforms de luz na mão (a queda do cone em [Interioridades de iluminação](lighting-internals.md)) |
| `fogColour` | preta só em cenas inteiramente sem névoa (modo 0) |
| `fogAlpha` | o fator de névoa limitado ([Interioridades da névoa](fog-internals.md)) |
| `position` / `normal` / `localPosition` / `flags` / `textureId` / `textureRotation` / `uv` / `mipLevel` | varyings e valores de interpolação flat (os mesmos de `BloxdSurfaceIn` — valores posteriores ao hook de vertex) |

## Relacionado

- [Hooks de shader](../api/hooks.md) · [Pipeline de renderização](rendering-pipeline.md) · [Identificadores reservados](reserved-identifiers.md) · [Histórico de versões: v3](../history/v3.md)
