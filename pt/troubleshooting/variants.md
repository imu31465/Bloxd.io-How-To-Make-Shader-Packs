# Problemas específicos de variantes

> API alvo: 5 · Estado: Verified

Problemas que ocorrem em apenas algumas das 6 variantes (`strict|allow` × `terrain|liquid|model`). A v5 removeu o eixo de iluminação (a antiga `BLOXD_LIGHTING`) e o carregador valida **as 6 variantes de uma vez** no carregamento.

## Carrega apenas em jogos não estritos / descartado em jogos estritos

- **Causa**: um hook vertex sem guarda ou um `discard` alcançável; jogos estritos proíbem ambos, e violar = **autodesativação do pacote inteiro** (`shaderPack:offInStrict`)
- **Verificação**: a tela do carregador mostra `<hook> moves terrain, which strict games prevent.` / `discard makes terrain see-through, which strict games prevent.`
- **Correção**: envolva hooks vertex e `discard` em `#ifndef BLOXD_STRICT`
- **Prevenção**: sempre comece os hooks vertex a partir do template com guarda ([Variantes](../getting-started/variants.md))

## ".alpha is undefined"

- **Causa**: `alpha` existe apenas atrás de `#ifdef BLOXD_ALPHA` (todo líquido + terrain/model não estritos)
- **Correção**: envolva o código que toca alpha em `#ifdef BLOXD_ALPHA` ([Pré-processador](../api/preprocessor.md#matriz-de-macros--variantes))

## "BloxdVertex only exists when BLOXD_STRICT isn't defined"

- **Causa**: as variantes estritas não têm hooks vertex nenhum, então tampouco `BloxdVertex`; código de vértice é alcançável a partir de variantes estritas
- **Correção**: coloque guarda no hook vertex

## bloxdOpaqueBehind falha em apenas algumas variantes

- **Causa**: `BLOXD_SCENE_DEPTH` é definido apenas nas variantes all-liquid
- **Correção**: `#ifdef BLOXD_SCENE_DEPTH` ([Erros de validação](validation.md))

## A água ignora o pacote (Liquid)

- **Sintoma**: hooks de terrain escritos, água inalterada
- **Causa**: **na v5, se um pacote não define nenhum hook de Liquid, nenhum hook de Terrain roda na água também** (o comportamento pré-v4 de "o líquido cai de volta no terrain" acabou)
- **Correção**: escreva hooks de Liquid ([divisão de hooks](../api/hooks.md#o-que-cada-programa-desenha))

## Modelos (entidades, modelos de blocos) sem efeito

- **Causa**: fora do escopo antes da v5; agora exige hooks `bloxdModel*`
- **Correção**: defina `bloxdModelSurface` / `bloxdModelLight` ([guia de modelos](../guides/models.md))

## Sobre a validação de 6 variantes

O carregador valida **as 6 variantes de uma vez** no carregamento (o eixo de iluminação não é mais compilado separadamente). Mesmo que um jogo use apenas algumas condições, pacotes distribuídos devem antecipar todas as seis.

| Variante | Macros definidas |
|---|---|
| `allow.terrain` | `BLOXD_ALPHA` |
| `allow.liquid` | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | `BLOXD_ALPHA` |
| `strict.terrain` | — |
| `strict.liquid` | `BLOXD_SCENE_DEPTH` |
| `strict.model` | — |

## Relacionado

- [Variantes](../getting-started/variants.md) · [Pré-processador](../api/preprocessor.md) · [Política](../internals/policy.md)
