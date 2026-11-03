# Flags (BloxdFlags)

> API alvo: 5 · Build alvo: `ab90qa` · Estado: Analyzed (restaurado literalmente do cabeçalho em produção)

A v5 identifica faces com uma struct de booleanos nomeados. A máscara de bits `blockFlags: u32` da v4 e as suas 6 constantes `bloxdBlockFlag*` desapareceram.

## Definição (verbatim do cabeçalho)

```wgsl
// What kind of block, item or lifeform a face is. Any number of flags may be
// set, possibly even none. For example, sandstone is sand and rock.
struct BloxdFlags {
    opaque: bool,     // Opaque blocks, i.e. full cubes with no gaps or holes.
    emissive: bool,   // Blocks that emit light, e.g. lava and glowing ores.
    vegetation: bool, // Leaves, grass blocks and leafy plants, e.g. tall grass.
    dirt: bool,       // Soil, grass blocks included. Rocky Dirt is rock too.
    sand: bool,       // Sand, Red Sand and every sandstone, which is rock too.
    rock: bool,       // Stone variants, and more, e.g. gravel, ores and magma.

    // Drawn as block models, so never part of terrain or flagged as opaque.
    slab: bool,       // Half blocks.
    stairs: bool,     // Stairs and corner stairs.
    flat: bool,       // Planes, e.g. tall grass, flowers, crops and cobwebs.

    placed: bool,     // Blocks placed as part of chunks. Not items or vehicles.
    held: bool,       // Items in a hand, in first or third person.
    dropped: bool,    // Dropped items, on the ground, on a belt or in a pipe.
    thrown: bool,     // Items in flight, e.g. snowballs, arrows and rockets.

    lifeform: bool,   // Players, mobs and NPCs. Includes armour and cosmetics.
}
```

## Referência de campos

| Campo | Classe | Significado | Objetos típicos | Hooks |
|---|---|---|---|---|
| `opaque` | material | cubo cheio sem vazios nem furos | pedra, terra, madeira maciça | todos os 9 |
| `emissive` | material | blocos que emitem luz | lava, minérios brilhantes | todos os 9 |
| `vegetation` | material | folhas, blocos de grama, plantas folhosas | folhas, grama alta | todos os 9 |
| `dirt` | material | solo (blocos de grama incluídos) | terra, bloco de grama, Rocky Dirt (também rock) | todos os 9 |
| `sand` | material | família de areia e arenito | areia, areia vermelha, todo arenito (também rock) | todos os 9 |
| `rock` | material | família de pedra (+ cascalho, minérios, magma) | variantes de pedra, cascalho, minérios | todos os 9 |
| `slab` | forma | meio-blocos | lajes | hooks Model |
| `stairs` | forma | escadas e escadas de canto | escadas | hooks Model |
| `flat` | forma | planos (incl. planos cruzados) | grama alta, flores, plantações, teias de aranha | hooks Model |
| `placed` | colocação | geometria colocada como parte dos chunks | blocos do mundo | hooks Model (não itens/veículos) |
| `held` | colocação | itens segurados na mão (1ª/3ª pessoa) | itens na mão, armaduras | hooks Model |
| `dropped` | colocação | itens no chão / em esteira / em tubo | itens caídos | hooks Model |
| `thrown` | colocação | itens em voo | bolas de neve, flechas, foguetes | hooks Model |
| `lifeform` | alvo | jogadores, mobs, NPCs (armaduras e cosméticos incluídos) | entidades | hooks Model |

## As flags se combinam livremente

**As flags não são um enum de escolha única.** Qualquer número delas pode ser verdadeiro ao mesmo tempo — possivelmente nenhuma (o próprio cabeçalho diz *"Any number of flags may be set, possibly even none"*).

Exemplos que o próprio cabeçalho dá:

- **arenito é `sand` e `rock` ao mesmo tempo**
- **Rocky Dirt é `dirt` e `rock` ao mesmo tempo**
- Uma laje pode ser `slab` e (dependendo do material) `rock` ao mesmo tempo

Ler o ramo `else` de uma flag como "todo o resto" é um bug. Flags de material (`opaque`/`emissive`/…) se combinam **de forma independente** de flags de forma/estado (`slab`/`held`/…).

## Uso

`flags` é um campo de mesmo nome nas três structs de entrada (`BloxdVertexIn`, `BloxdSurfaceIn`, `BloxdLightIn`):

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.vegetation) {
        out.colour *= vec3f(1.0, 1.08, 0.9);
    }
    if (surface.flags.emissive) {
        out.emission += vec3f(0.05);
    }
    return out;
}
```

No pipeline de modelos, as flags respondem "no que estou olhando":

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

## Migrando da v4 (mecânico)

| v4 | v5 |
|---|---|
| `(surface.blockFlags & bloxdBlockFlagOpaque) != 0u` | `surface.flags.opaque` |
| `(surface.blockFlags & bloxdBlockFlagEmissive) != 0u` | `surface.flags.emissive` |
| `(surface.blockFlags & bloxdBlockFlagVegetation) != 0u` | `surface.flags.vegetation` |
| `(surface.blockFlags & bloxdBlockFlagDirt) != 0u` | `surface.flags.dirt` |
| `(surface.blockFlags & bloxdBlockFlagSand) != 0u` | `surface.flags.sand` |
| `(surface.blockFlags & bloxdBlockFlagRock) != 0u` | `surface.flags.rock` |

Referências restantes às constantes `bloxdBlockFlag*` falham no diagnóstico de nome reservado do analisador (as constantes foram excluídas).

## Casos de borda (exaustivo, do cabeçalho)

- «Rocky Dirt is rock too»
- «every sandstone, which is rock too»
- «Drawn as block models, so never part of terrain or flagged as opaque» — faces `slab`/`stairs`/`flat` nunca entram no programa Terrain e nunca definem `opaque`
- «Includes armour and cosmetics» — `lifeform` cobre também o equipamento dos jogadores
- «Not items or vehicles» — `placed` exclui veículos

## Relacionados

- Migração completa da v4 → [Histórico de versões: v5](../history/v5.md)
- Interioridades da entrega de flags → [Interior do motor](../internals/rendering-pipeline.md)
