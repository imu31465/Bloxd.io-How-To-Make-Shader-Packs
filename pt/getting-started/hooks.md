# Hooks de shader

> API alvo: 5 · Build alvo: `bny9u` (verificado em produção em 2026-11-05) · Estado: Verified

Um pacote pode se conectar a **9 hooks**: 3 alvos de renderização (Terrain / Liquid / Model) × 3 estágios de pipeline (Vertex / Surface / Light). Todos são opcionais — um hook indefinido cai no padrão do motor.

## Os hooks

| Hook | Estágio | O que faz |
|---|---|---|
| `bloxdTerrainVertex` | terrain · vertex | Animação de vértices do terreno. **Não pode rodar em jogos strict** |
| `bloxdTerrainSurface` | terrain · surface | Cor, alpha, emissão, encantamento e sobreposição do terreno |
| `bloxdTerrainLight` | terrain · light | Cor final do terreno — o último estágio do fragmento |
| `bloxdLiquidVertex` | liquid · vertex | Animação de vértices da água. **exige guarda contra strict** |
| `bloxdLiquidSurface` | liquid · surface | Cor, alpha e emissão da água |
| `bloxdLiquidLight` | liquid · light | Cor final da água |
| `bloxdModelVertex` | model · vertex | Animação de vértices de modelos de bloco / itens / entidades. **exige guarda contra strict** |
| `bloxdModelSurface` | model · surface | Cor, alpha, emissão, encantamento e sobreposição do modelo |
| `bloxdModelLight` | model · light | Cor final do modelo |

Assinaturas (os tipos devem corresponder exatamente; os nomes de parâmetros são livres):

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex;
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight;
// bloxdLiquid* / bloxdModel* recebem os mesmos tipos
```

## Divisão de alvos de renderização

- **Terrain** — todo bloco, exceto água e modelos de bloco
- **Liquid** — água
- **Model** — modelos de bloco (lajes, escadas, plantas de planos cruzados), itens segurados, caídos e arremessados, jogadores, mobs, NPCs, armaduras, cosméticos

**Importante**: se um pacote não define nenhum hook de Liquid, **nenhum hook de Terrain roda na água** (a água é tratada somente pelos hooks de Liquid). Isso difere do comportamento anterior à v4, em que o líquido caía nos hooks de terreno.

## Fallbacks e compartilhamento de código

- Um hook indefinido significa que esse estágio usa o padrão do motor (mesmo comportamento que `bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **Para compartilhar código entre hooks**, defina uma função de escopo de módulo e chame-a a partir de ambos:

```wgsl
fn applyWarmth(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.04, 1.0, 0.96);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}
```

## O pacote padrão (template oficial de 9 hooks)

O template de partida agora inclui os hooks de luz. 1.683 bytes como distribuído, verbatim:

```wgsl
// Every hook here returns its engine default. Modify the return values to start
// building a shader pack. If you delete a hook, the default is used instead.

// All blocks but water and block models use terrain hooks.
#ifndef BLOXD_STRICT
// Strict games keep terrain where it is. Without the #ifndef, this hook would
// turn the whole shader pack off there.
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Water uses liquid hooks. To share code with another hook, define a function
// and call it from both places.
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Models: block models such as slabs and plants, items, players and mobs.
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

Os comentários do template são a orientação de projeto: modifique os valores de retorno para começar a construir; apagar um hook restaura o padrão; jogos strict mantêm o terreno onde está; compartilhe código por meio de funções.

## Convenções de escrita

- **Nunca construa as structs de saída diretamente** (`BloxdSurface(...)` falha na validação). Comece sempre de `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` e modifique os campos. O primeiro argumento do hook de luz já é do tipo de saída, então `var out = s;` também funciona
- Um `var x: BloxdSurface;` puro (só anotação de tipo) também é um erro de validação
- Os parâmetros dos hooks são **somente leitura**. Copie primeiro (`var sv = s;`)
- Você não pode usar identificadores iniciados por `bloxd` (sem distinguir maiúsculas de minúsculas), exceto os 9 nomes de função de hook
- Escreva constantes como `const` (`#define` não recebe valor)

Para cada campo que cada hook pode ler e escrever, veja [Estruturas](../api/structures.md).
