# Modelos e texturas

> API alvo: 5 · Build alvo: `v98qt8` (verificado em produção 2026-11-08) · Estado: Analyzed (restaurado do cabeçalho e do validador)

O que os novos hooks de Model do v5 desenham e leem.

## O que o programa Model desenha

- **Modelos de bloco**: meio-blocos (`slab`), escadas (`stairs`), plantas de planos cruzados — grama alta, flores, cultivos, teias de aranha (`flat`)
- **Itens**: na mão (`held`), caídos (`dropped`), arremessados (`thrown` — bolas de neve, flechas, foguetes)
- **Entidades**: jogadores, mobs, NPCs (`lifeform`) — **incluindo armaduras e cosméticos**

Terreno (blocos completos) e Líquido (água) nunca entram neste programa.

## O que se lê diferente

Faces de modelo carregam três coisas que faces de terreno nunca têm:

| Informação | Campo | Valor no terreno |
|---|---|---|
| coordenadas locais do modelo | `localPosition: vec3f` | `vec3f(0.0)` (sem modelo) |
| estado de encantamento | `enchantTier` / `enchantColour` / `enchantSpeed` | todos 0 |
| sobreposição de entidade | `overlayColour` | 0 |

E **texturas significam outra coisa**: faces de terreno carregam `textureId`s do atlas, mas **a maioria dos modelos usa `textureId: 0`** ("sem textura") — skins de jogador e texturas de mobs não estão no namespace do atlas. `surface.colour` já contém skin × tinta, então trabalhe a partir dele ([texturas próprias do modelo](../api/texture-api.md#texturas-próprias-do-modelo-textureid-0)).

Os `held` / `dropped` / `thrown` / `lifeform` / `placed` de `flags` só têm significado em faces de modelo ([Flags](../api/flags.md)).

## localPosition

A posição local da instância do modelo **antes** do posicionamento no mundo; `vec3f(0.0)` para terreno/líquido.

- Para o braço de um jogador, uma espada na mão ou as pás de um moinho, ela gira com o modelo
- **Animação com chave por parte e efeitos de dobramento** viram uma escrita de um único campo — "a que altura da lâmina estou" é diretamente `localPosition.y`
- Nas structs de light é o valor **pós-hook-de-vértice** (cabeçalho: *"the same as in BloxdVertexIn, after the vertex hook"*)

## Padrões de seleção

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;   // levanta entidades do mundo, exclui a mão
    }
    if (surface.flags.held) {
        out.colour *= 1.15;   // clareia os itens na mão do jogador local
    }
    return out;
}
```

Exemplos completos: [receitas de shaders de modelo](../recipes/model-shaders.md) e [efeitos de encantamento](../recipes/enchant-effects.md).

## Cola de Terrain / Liquid / Model

| Quer afetar | Hooks | Campos de seleção |
|---|---|---|
| o look de blocos completos | `bloxdTerrain*` | flags de material (`opaque` / `rock`…) |
| a água | `bloxdLiquid*` | sempre Liquid (sem hooks de Liquid = água intacta) |
| plantas, lajes, escadas | `bloxdModel*` | `flags.flat` / `slab` / `stairs` |
| itens na mão | `bloxdModel*` | `flags.held` |
| itens caídos | `bloxdModel*` | `flags.dropped` |
| itens arremessados | `bloxdModel*` | `flags.thrown` |
| jogadores e mobs | `bloxdModel*` | `flags.lifeform` |

## Iluminação

`bloxdModelLight` recebe os mesmos `BloxdSurface` / `BloxdLightIn` e trabalha com `bloxdDefaultLight` / `bloxdLitColour()`. O brilho de encantamento (`enchantColour`) e o clarão de dano (`overlayColour`) se misturam dentro de `bloxdLitColour`, então **os padrões preservam ambos os looks automaticamente**; para controlá-los, veja [efeitos de encantamento](../recipes/enchant-effects.md).

## Interioridades

Como os modelos são renderizados e como as entradas de flags/encantamento fluem: [Interioridades do motor: renderização de modelos](../internals/model-rendering.md); símbolos gerados como `bloxdSpItemLocalPosition` e `bloxdSpEnchant` estão listados em [restrições](../api/restrictions.md).
