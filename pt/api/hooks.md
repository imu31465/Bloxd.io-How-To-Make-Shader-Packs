# Hooks de shader

> API alvo: 5 · Build alvo: `bny9u` · Estado: Verified

Pacotes podem definir **9 hooks** — 3 alvos de renderização (programas) × 3 estágios de pipeline, todos opcionais (não definido significa o padrão do motor).

## Comparação dos 9 hooks

| Hook | Programa | Estágio | Argumentos | Retorna | Condição de execução |
|---|---|---|---|---|---|
| `bloxdTerrainVertex` | Terrain | vertex | `BloxdVertexIn` | `BloxdVertex` | só variantes allow (**defini-lo em strict é em si um erro**) |
| `bloxdTerrainSurface` | Terrain | surface | `BloxdSurfaceIn` | `BloxdSurface` | sempre |
| `bloxdTerrainLight` | Terrain | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | sempre |
| `bloxdLiquidVertex` | Liquid | vertex | `BloxdVertexIn` | `BloxdVertex` | só allow |
| `bloxdLiquidSurface` | Liquid | surface | `BloxdSurfaceIn` | `BloxdSurface` | sempre |
| `bloxdLiquidLight` | Liquid | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | sempre |
| `bloxdModelVertex` | Model | vertex | `BloxdVertexIn` | `BloxdVertex` | só allow |
| `bloxdModelSurface` | Model | surface | `BloxdSurfaceIn` | `BloxdSurface` | sempre |
| `bloxdModelLight` | Model | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | sempre |

## O que cada programa desenha

| Programa | Desenha | A água quando não existe hook Liquid |
|---|---|---|
| **Terrain** | todo bloco exceto água e modelos de blocos | — |
| **Liquid** | água | **nenhum hook Terrain roda na água tampouco** (a água mantém a aparência padrão) |
| **Model** | modelos de blocos (lajes, escadas, plantas, plantações, teias de aranha), itens na mão/caídos/arremessados, jogadores, mobs, NPCs, armaduras, cosméticos | — |

## Papéis dos estágios

- **Vertex** — move as posições de vértices (balanço da grama, ondas). A animação de vértices desativa o pacote inteiro em jogos strict, então `#ifndef BLOXD_STRICT` é obrigatório
- **Surface** — a saída de material: `colour` / `alpha` (condicional) / `emission` / `enchantColour` / `overlayColour`
- **Light** — a cor final; recebe a saída de surface mais `BloxdLightIn`. Seu valor de retorno é a cor na tela

## Assinaturas

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
// bloxdLiquid* / bloxdModel* recebem os mesmos tipos de argumento e retorno
```

## Restrições de chamada de funções especiais

O validador do motor restringe quais hooks podem alcançar certas funções (violações falham com diagnósticos "reaches" dedicados):

| Função | Chamável de | Guarda |
|---|---|---|
| `bloxdTexel` | apenas hooks surface / light | — |
| `bloxdTextureSize` | apenas hooks surface / light | — |
| `bloxdOpaqueBehind` | hooks surface / light (significativo em variantes liquid) | `#ifdef BLOXD_SCENE_DEPTH` |

> `bloxdFragmentBlockPosition` não está mais no cabeçalho documentado, mas o motor ainda o injeta e o aceita — veja [Funções: bloxdFragmentBlockPosition](functions.md#bloxdfragmentblockposition--indocumentada-mas-ainda-injetada). Ela era a única função especial chamável de hooks vertex; para código novo, prefira `flags` para "qual é este bloco".

## Fallbacks e compartilhamento

- Hook não definido → aquele estágio se comporta como o padrão do motor (`bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **Compartilhe processamento entre hooks** com uma função de escopo de módulo chamada de ambos:

```wgsl
fn sharedSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}
```

## Relacionados

- Template oficial de 9 hooks → [Primeiros passos: hooks de shader](../getting-started/hooks.md)
- Cada campo de cada struct → [Estruturas](structures.md)
- Interioridades da invocação de hooks → [Interior do motor](../internals/hook-invocation.md)
