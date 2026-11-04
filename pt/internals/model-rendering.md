# Interioridades da renderização de modelos

> API alvo: 5 · Build alvo: `xkg8x` · Estado: Analyzed (restaurado do bundle em produção)

As interioridades do programa Model da v5. O guia voltado ao usuário: [Modelos e texturas](../guides/models.md).

## O que é o programa Model

Antes da v5, pacotes só podiam se conectar a terreno / líquido; modelos de blocos (lajes, escadas, plantas) e entidades (jogadores, mobs, itens) estavam **fora da jurisdição dos pacotes**. A v5 adicionou model como terceiro programa, desenhando:

- blocos desenhados como modelos de blocos (nota do cabeçalho: *"Drawn as block models, so never part of terrain or flagged as opaque"*)
- itens na mão / caídos / arremessados
- jogadores, mobs, NPCs (armaduras e cosméticos incluídos)

## Entrega de flags e entradas

- **`bloxdSpFlags`** — o caminho de entrega da struct `BloxdFlags`; os 8 campos novos (`slab` / `stairs` / `flat` / `placed` / `held` / `dropped` / `thrown` / `lifeform`) carregam valores com significado apenas em faces de modelo
- **`bloxdSpItemLocalPosition`** — entrega de `localPosition`; `vec3f(0.0)` em terreno/líquido
- **`bloxdSpEnchant`** — entrega das entradas de encantamento (`enchantTier` / `enchantColour` / `enchantSpeed`)

## O cálculo do encantamento

O motor anima a varredura do brilho de encantamento e a entrega como `enchantColour.a` aos hooks surface/light ([Efeitos de encantamento](../recipes/enchant-effects.md)). A mistura acontece dentro de `bloxdLitColour()` — logo após o sombreamento, antes da luz do mundo ([Iluminação](../api/lighting.md#o-pipeline-completo)).

## A sobreposição (clarão de dano etc.)

`overlayColour` carrega a cor de estado da entidade (clarão de dano etc.) como RGB + alfa. `bloxdLitColour` a mistura **antes da iluminação**, então a expressão de estado vai montada sem quebrar a cor base. O processamento existia internamente na v4 e foi aberto a entradas/saídas na v5.

## O caminho das texturas

A maioria das faces de modelo usa `textureId: 0` (sem textura) — skins de jogador e texturas de mobs não estão no namespace do atlas de texturas de blocos. `surface.colour` chega com skin × tinta já cozidas, então o processamento de faces de modelo parte de `colour` ([texturas próprias do modelo](../api/texture-api.md#texturas-próprias-do-modelo-textureid-0)).

## Variantes

O programa Model forma um eixo da matriz de variantes: `strict.model` / `allow.model`. `BLOXD_ALPHA` é definido apenas em allow.model ([Pré-processador](../api/preprocessor.md#matriz-de-macros--variantes)); strict.model não tem hooks de vértice.

## Relacionado

- [Modelos e texturas](../guides/models.md) · [Receitas de shaders de modelo](../recipes/model-shaders.md) · [Flags](../api/flags.md) · [Pipeline de renderização](rendering-pipeline.md)
