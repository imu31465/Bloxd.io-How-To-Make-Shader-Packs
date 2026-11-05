# Problemas de modelos

> API alvo: 5 · Build alvo: `bny9u` · Estado: Analyzed (novo território da v5)

Problemas em torno dos novos hooks de Model da v5.

## Jogadores/mobs sem efeito

- **Causa**: entidades (jogadores, mobs, NPCs, armaduras, cosméticos) são desenhadas pelo **programa Model** — hooks de terrain não as tocam
- **Correção**: adicione hooks de Model ([o guia de modelos](../guides/models.md))

## Lajes, escadas, plantas sem efeito

- **Causa**: modelos de bloco (`slab` / `stairs` / `flat`) também são geometria do programa Model, nunca terrain
- **Correção**: use hooks de Model com `flags.slab` / `flags.stairs` / `flags.flat` ([Flags](../api/flags.md))

## Água sem efeito

- **Causa**: a água é só de hooks de Liquid; **sem hooks de Liquid, nenhum hook de Terrain roda na água também** (mudança da v5)
- **Correção**: defina `bloxdLiquidSurface` / `bloxdLiquidLight` ([Problemas de variantes](variants.md))

## Quer mudar só os itens na mão, mas tudo muda

- **Correção**: selecione com `surface.flags.held` ([receitas de sombreadores de modelo](../recipes/model-shaders.md))

## Verificações de flags não se comportam

- **Causas prováveis**:
  1. **tratar as flags como um enum de escolha única** — elas se combinam livremente («arenito é areia e rocha», «possivelmente até nenhuma») ([Flags](../api/flags.md#as-flags-se-combinam-livremente))
  2. ler `else` como "todo o resto" — o else de `flags.rock` é meramente "não é rocha", possivelmente ainda areia
- **Correção**: combine flags de material (`opaque`…) independentemente das flags de forma/estado (`slab`/`held`…)

## Brilho de encantamento desapareceu

- **Correção**: repasse `enchantColour` ou use `bloxdLitColour()` ([Efeitos de encantamento](../recipes/enchant-effects.md))

## Clarão de dano desapareceu / forte demais

- **Correção**: repasse `overlayColour` ou ajuste `out.overlayColour.a` ([Efeitos de encantamento](../recipes/enchant-effects.md))

## localPosition sempre lê 0

- **Por design**: `localPosition` é `vec3f(0.0)` em faces de terrain e liquid — **ali não há modelo**
- **Correção**: leia-o em hooks de Model ([receitas de modelo](../recipes/model-shaders.md))

## bloxdTexel devolve branco em modelos

- **Por design**: `textureId: 0` (skins) amostra como branco
- **Correção**: selecione com `surface.textureId != 0u` ou trabalhe desde `surface.colour` ([Problemas de texturas](textures.md))

## Quer mudanças só na armadura / só nos cosméticos

- **Limite**: nenhuma flag diz "armadura"; `flags.lifeform` inclui armaduras e cosméticos
- **Aproximação**: combine com `localPosition` (posicionamento) ou a presença de `overlayColour` ([receitas de modelo](../recipes/model-shaders.md))

## Relacionado

- [Guia de modelos](../guides/models.md) · [Receitas de sombreadores de modelo](../recipes/model-shaders.md) · [Flags](../api/flags.md)
