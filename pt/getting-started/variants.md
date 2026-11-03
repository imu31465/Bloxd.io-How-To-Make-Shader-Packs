# Variantes e guardas

> API alvo: 5 · Build alvo: `ab90qa` (verificado em produção em 2026-11-03) · Estado: Analyzed

## 6 variantes

Você escreve um único corpo de código, mas ele deve compilar em todas as **6 variantes**: `{strict, allow} × {terrain, liquid, model}`. O carregador valida as seis no momento do carregamento.

O eixo "iluminação ligada/desligada" da v4 e anteriores desapareceu (a v4 tinha 8 variantes). O estado de iluminação agora é uma pergunta de tempo de execução para [`bloxdLit()`](../api/lighting.md), não um ramo de tempo de compilação.

| Variante | Exemplo | Macros definidas |
|---|---|---|
| `allow.terrain` | terreno em um jogo allow | `BLOXD_ALPHA` |
| `allow.liquid` | água em um jogo allow | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | modelos em um jogo allow | `BLOXD_ALPHA` |
| `strict.terrain` | terreno em um jogo strict | — |
| `strict.liquid` | água em um jogo strict | `BLOXD_SCENE_DEPTH` |
| `strict.model` | modelos em um jogo strict | — |

## Condicionais

Somente `#define NAME` (sem valor) / `#ifdef` / `#ifndef` / `#else` / `#endif` estão disponíveis. O `#` vai no início de uma linha (dentro de funções é permitido).

| Guarda | Significado | Uso típico |
|---|---|---|
| `#ifndef BLOXD_STRICT` | somente variantes não strict (allow) | envolver hooks de vértice inteiros, envolver `discard` |
| `#ifdef BLOXD_ALPHA` | variantes onde `alpha` existe (todo líquido + terreno/modelo não strict) | envolver código que toca alpha |
| `#ifdef BLOXD_SCENE_DEPTH` | todas as variantes de líquido | envolver chamadas a `bloxdOpaqueBehind()` |

`BLOXD_LIGHTING` foi **removida na v5**. Usá-la falha na validação com: *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## O contrato dos jogos strict

A maioria dos jogos é strict (sem animação de vértices, sem `discard`). Um hook de vértice sem guarda reporta `<hook> moves terrain, which strict games prevent.` e um `discard` alcançável reporta `discard makes terrain see-through, which strict games prevent.` — ambos desativam **todos os hooks** naquele jogo strict. Sempre envolva os hooks de vértice em `#ifndef BLOXD_STRICT`.

Para as interioridades da política por jogo, veja [Interioridades do motor: política](../internals/policy.md).
