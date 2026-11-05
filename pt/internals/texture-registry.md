# Interioridades do registro de texturas

> API alvo: 5 · Build alvo: `bny9u` (verificado em produção 2026-11-05) · Estado: Verified (extraído reexecutando o próprio construtor de registro do motor)

A maquinaria de resolução nome→id e a deriva medida do registro. O catálogo voltado ao usuário: [Catálogo de texturas](../api/texture-catalog.md).

## Metodologia

Executamos o próprio módulo de construção de registro do motor (29812 nesta build, carregada pelos chunks 52/53/54) contra os dados de textura do registro de blocos distribuído (módulo de dados 1351 no bundle principal) contra os dados de textura do registro de blocos distribuído dentro de um mini harness webpack e registramos sua saída — esses números são **a computação do próprio bundle de produção**, não uma reimplementação.

## Estrutura da saída

| Saída | medido na v5 | Significado |
|---|---|---|
| `named` | **911** | nomes referenciáveis como `bloxdTextureId<Name>` |
| `aliases` | 424 | grafias dobradas — 196 aliases de quadro (`lava0`…) e 228 aliases de rotação (`chest_top[rot[1`…) |
| `layers` | 1,232 | a tabela de camadas completa do atlas — 911 raízes nomeadas, 150 quadros extras de animação, 171 slots pré-rotacionados |

## Regras de dobramento

- **famílias de animação** (43): grafias de quadro (`lava0`–`lava7`) se dobram ao nome base (`lava`); `bloxdTexel` devolve o quadro atual no momento da amostragem
- **famílias de rotação** (57): slots girados (`[rot[1..4`) se dobram ao nome raiz; `bloxdTexel` reaplica a `textureRotation` por face
- `radar_screen` é o único nome nas duas famílias (suas quatro cópias pré-rotacionadas carregam cada uma sua própria escada de 4 quadros — daí 46 raízes de animação no atlas, não 43)

## Deriva (cnty9 → ab90qa)

| Medição | cnty9 (v4) | ab90qa (v5) |
|---|---|---|
| entradas do atlas | 1,219 | **1,210** |
| famílias de rotação (grafias giradas) | 57 (228) | **57 (228) — sem mudanças** |
| famílias de animação (grafias de quadro) | 42 (188) | **42 (188) — sem mudanças** |
| constantes nomeadas utilizáveis | 905 | **896** |
| mudanças de id entre nomes sobreviventes | — | **334 de 905** |

A deriva completa (11 nomes): adicionado (1) `scorpion_eggs`; removidas (10) as oito texturas de baú duplo mais `mob_spawner_hostile_block_side` / `mob_spawner_neutral_block_side` (o baú duplo saiu dos dados do jogo; os spawners mantêm `mob_spawner_block_top`).

## Deriva (ab90qa → xkg8x)

| Medição | ab90qa (lançamento v5) | xkg8x (v5, atual) |
|---|---|---|
| entradas do atlas | 1,210 | **1,220** |
| famílias de rotação (grafias giradas) | 57 (228) | **57 (228) — inalteradas** |
| famílias de animação (grafias de quadro) | 42 (188) | **42 (188) — inalteradas** |
| constantes nomeadas utilizáveis | 896 | **906** |
| mudanças de id entre sobreviventes | — | **376 de 896** |

A deriva completa (10 nomes): adicionados (10) as oito texturas do baú duplo mais `mob_spawner_hostile_block_side` / `mob_spawner_neutral_block_side` — todo nome removido no lançamento da v5 voltou (o baú duplo retornou aos dados do jogo; as variantes laterais do spawner junto com ele). Nada foi removido.

5 de novembro (xkg8x → bny9u, 1 dia): entradas 1,220 → 1,232 (+5: as texturas Terminal de Troca ×3 e Gerador de Pedra ×2); 864 de 906 nomes mudaram de id (95%); sem remoções; famílias de rotação inalteradas, famílias de animação 42 → 43 (`trading_terminal_front`, 8 quadros a 250 ms). Produção e preprod servem o mesmo bundle idêntico byte a byte.

## Deriva (xkg8x → bny9u)

| Medição | xkg8x (v5) | bny9u (v5, atual) |
|---|---|---|
| entradas do atlas | 1,220 | **1,232** |
| famílias de rotação (grafias giradas) | 57 (228) | **57 (228) — inalteradas** |
| famílias de animação (grafias de quadro) | 42 (188) | **43 (196)** |
| constantes nomeadas utilizáveis | 906 | **911** |
| mudanças de id entre sobreviventes | — | **864 de 906** |

A deriva completa (5 nomes): adicionados (5) `trading_terminal_front` (anim, 8 quadros) / `trading_terminal_side` / `trading_terminal_top` / `stone_generator_side` / `stone_generator_top` — dois blocos novos (Terminal de Troca, Gerador de Pedra) entraram nos dados do jogo. Nada foi removido; a rotatividade de ids é quase total (95% dos sobreviventes).


## Efeito sobre HEADER_VERSION

O sufixo de hash do registro cozinha os ids, então esta deriva marca **cada pacote salvo "precisa de nova verificação"** (revalidado automaticamente ao carregar a página). Pacotes escritos com nomes sobrevivem à re-resolução; pacotes com ids crus quebram ([Compatibilidade](../api/compatibility.md)).

## Registros de deriva anteriores

A comparação de duas builds de outubro (sjr0p7 → cnty9, 10 dias): entradas 1200 → 1219 (98 adicionadas, 79 removidas); 779 dos 1121 nomes de grafia inalterada mudaram de id (69%); uma migração de convenção de nomes (sufixos `_rot1..4` → slots `[rot[1..4`); o surgimento do baú duplo. O registro completo vive em [Histórico de versões: v4](../history/v4.md).

4 de novembro (ab90qa → xkg8x, 1 dia): entradas 1,210 → 1,220 (+10, todas nomes que retornam — as remoções do lançamento da v5 se reverteram); 376 de 896 nomes mudaram de id (42%); sem remoções; ambas as famílias de dobragem inalteradas. O baú duplo está de volta.

## Relacionado

- [Catálogo de texturas](../api/texture-catalog.md) · [Validação de shaders](shader-validation.md) · [Registro de pesquisa](research-log.md)
