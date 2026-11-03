# Erros de validação

> API alvo: 5 · Estado: Verified (mensagens registradas literalmente do validador em produção)

Erros da validação estática (analisador, etapa 1) — em sua maioria nomes reservados, o contrato strict e restrições de chamadas entre hooks.

## "Packs can't construct BloxdSurface directly" / "Packs can't construct BloxdLight directly, since header structs gain fields; ..."

- **Causa**: chamar construtores como `BloxdSurface(...)`
- **Correção**: comece de `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` e altere campos (`var out = s;` funciona em hooks light)

## "Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"

- **Causa**: um identificador começando com `bloxd` (sem distinção de maiúsculas/minúsculas)
- **Correção**: renomeie (ex. `packTint`). Só os 9 nomes de hooks são permitidos
- **Prevenção**: prefixe os seus próprios nomes com `pack` / `my` etc.

## "bloxdPackInputs isn't part of the bloxd_ header"

- **Causa**: referenciar o uniform diretamente
- **Correção**: use-o por meio das funções de cabeçalho ([Formato do pacote](../api/pack-format.md#uniform-por-frame-bloxdpackinputs))

## "... reaches bloxdTexel, which only surface and light hooks can use."

- **Causa**: chamada a partir de um hook vertex (ou de uma função alcançável a partir de um) — "reaches" significa **o caminho de chamada**
- **Correção**: mova a chamada para um hook surface / light

## "... reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and <program> doesn't define it; ..."

- **Causa**: `bloxdOpaqueBehind()` precisa de `BLOXD_SCENE_DEPTH`, definido apenas nas variantes all-liquid; compartilhar a chamada a partir de código de hooks terrain/model cria variantes que não compilam
- **Correção**: envolva a chamada em `#ifdef BLOXD_SCENE_DEPTH`
- **Prevenção**: isole leituras de profundidade como processamento só de líquidos

## O contrato strict

| Mensagem | Significado |
|---|---|
| `<hook> moves terrain, which strict games prevent.` | hook vertex sem guarda |
| `discard makes terrain see-through, which strict games prevent.` | `discard` alcançável |

- **Importante**: estes não são erros de compilação — jogos estritos **autodesativam o pacote inteiro** (`shaderPack:offInStrict`)
- **Correção**: envolva hooks vertex e `discard` em `#ifndef BLOXD_STRICT` ([Variantes](../getting-started/variants.md))

## Mensagens da versão atual

| Mensagem | Ação |
|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | migre `#ifdef BLOXD_LIGHTING` → `if (bloxdLit())` ([Iluminação](../api/lighting.md#bloxdlit--a-porta)) |
| `bloxdBlockFlagRock isn't part of the shader pack API...` | constante de bits remanescente → `flags.rock` ([Flags](../api/flags.md)) |
| `bloxdSpLitColour isn't part of the shader pack API...` | símbolo interno da v4 → use a pública `bloxdLitColour()` |

O analisador dá **mensagens dedicadas** a pacotes que continuam lendo `blockFlags` ou envolvendo hooks light em `#ifdef BLOXD_LIGHTING`, para que nada se comporte mal em silêncio (os passos de migração: [migração para a v5](../history/v5.md)).

Erros de resolução de nomes de textura (sugestões de grafia, grafias de quadro/rotação) ficam em [Problemas de texturas](textures.md).

## Relacionado

- [Restrições e nomes reservados](../api/restrictions.md) · [Interioridades do motor: validação de shaders](../internals/shader-validation.md) · [Problemas específicos de variantes](variants.md)
