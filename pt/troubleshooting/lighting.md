# Problemas de iluminação

> API alvo: 5 · Estado: Verified

Problemas de brilho, sombra e névoa.

## Cavernas claras demais

- **Causa**: não-linearidade insuficiente no `skyLight`
- **Correção**: as receitas de escurecimento de cavernas em [receitas de iluminação](../recipes/lighting.md) e [receitas de realismo](../recipes/realism.md)

## Faces iluminadas claras demais à noite

- **Causa**: só as cores de sombra foram escurecidas — a cor terminada mantém o brilho diurno
- **Correção**: atenue toda a cor terminada à noite e afrouxe apenas a luz local (`blockLight` / `heldLight`) — [o guia noturno](../guides/night.md)

## Noite escura demais

- **Correção**: garanta um ambiente mínimo; com um `bloxdSunDirection()` zero a direção lunar verdadeira é desconhecida, então use pseudo ambiente azul ([a receita noturna](../recipes/lighting.md)). A própria direção da lua é `-bloxdSunDirection()` (só mundos com ciclo dia-noite)

## Dia estoura

- **Correção**: baixe a exposição antes do ACES ([ACES](../recipes/realism.md))

## Arredores de tochas saturados de laranja

- **Correção**: baixe a proporção da mistura quente ([tocha quente × céu frio](../recipes/realism.md))

## Quer manter exatamente a luz de mundo do motor

- **Solução da v5**: chame `bloxdWorldLight(light)` — matemática idêntica à do motor, "a mais brilhante entre block/sky/held, com piso em ambientLightColour" ([Iluminação](../api/lighting.md#bloxdworldlight--a-luz-do-mundo))
- **Nota**: `blockLight` / `heldLight` são 0 e os campos relacionados ao céu são 1 quando `!bloxdLit()` (garantia do cabeçalho)

## Visual errado em jogos com iluminação desativada

- **Causa**: entradas só de iluminação (`blockLight` etc.) usadas sem guarda. A v5 não tem `#ifdef BLOXD_LIGHTING` — ramifique em **`bloxdLit()` em tempo de execução**
- **Correção**: retorne cedo com `if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }` ([Iluminação](../api/lighting.md#bloxdlit--a-porta))

## "LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk"

- **Causa**: regiões densas de blocos brilhantes transbordam a fila de sementes de luz e o cálculo de luz do chunk é cortado. **Não causado pelo pacote**, mas lacunas de luz perto de aglomerados brilhantes têm origem nisso
- **Correção**: espalhe fontes de luz no mundo

## Quer a teoria?

- Sombras: [Sombras](../guides/shadows.md) (skyLight = mapa de sombras por voxel)
- Névoa: [Interioridades do motor: névoa](../internals/fog-internals.md)

## Relacionado

- [Iluminação](../api/lighting.md) · [Problemas visuais](visual.md) · [Interioridades da iluminação](../internals/lighting-internals.md)
