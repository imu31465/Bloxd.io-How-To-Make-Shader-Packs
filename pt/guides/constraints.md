# O que pacotes de shaders podem e não podem fazer

> API alvo: 5 · Build alvo: `xkg8x` (2026-11-04, produção) · Estado: Verified (portado para a API atual — reverificação no dispositivo recomendada)

O teto de realismo dos pacotes de shaders em uma página: até onde a API atual chega, o que ela fundamentalmente não consegue, o que é condicional, por que os limites existem e os substitutos mais próximos. Avalie um look aqui antes de construí-lo.

## O que a API atual pode fazer

- **Cores, transparência e emissão, por face** — os três hooks de `Surface` devolvem cor (mais alpha e emissão condicionais) para terreno, líquidos e modelos
- **Uma reiluminação completa** — os três hooks de `Light` e a API de iluminação (`bloxdShading()` / `bloxdWorldLight()` / `bloxdLitColour()`) expõem a própria receita do motor como funções componíveis ([Iluminação](../api/lighting.md))
- **Sombras de estilo projetado que acompanham edições de blocos em tempo real** — `skyLight` é dado de oclusão de céu por voxel; a inversão do lift + corte por limiar o transforma em sombras nítidas sob árvores e telhados ([Sombras](shadows.md))
- **Ler as texturas do próprio jogo** — `bloxdTexel()` amostra o atlas de texturas de blocos e as texturas próprias de modelo exatamente como o sampler do motor faz ([API de texturas](../api/texture-api.md))
- **Efeitos por modelo** — `flags` diz "isto é um item na mão", "isto é um item caído", "isto é um jogador", "isto é uma laje" ([Flags](../api/flags.md)); `localPosition` dá coordenadas locais de modelo ([Estruturas](../api/structures.md))
- **Brilhos de encantamento e sobreposições de flash de dano** — `enchantTier` / `enchantColour` / `enchantSpeed` e `overlayColour` são legíveis e sobrescrevíveis ([Efeitos de encantamento](../recipes/enchant-effects.md))
- **Tempo e animação** — `bloxdSeconds()`, a posição de mundo e a direção do sol movem as coisas ([Tempo e animação](../recipes/animation.md))

## O que a API atual não pode fazer

| Look | Motivo |
|---|---|
| Mapas de sombras precisos ao pixel (sombras que acompanham o sol, penumbra) | Texturas de profundidade não podem ser referenciadas (`bloxdOpaqueBehind()`, exclusivo de líquidos, é só geometria e não serve como mapa de sombras). A oclusão de raios de luz não chega aos hooks |
| SSAO | Sem acesso à profundidade de cena (só o AO de vértices cozido pelo mesher; a profundidade exclusiva de líquidos não serve para SSAO) |
| SSR (reflexos) | Sem cor de cena. Só pseudo looks misturando cor de céu via fresnel |
| Bloom / glare | Sem hook no pós-processamento |
| Profundidade de campo, aberração cromática, grão | Requerem pós-processamento de tela cheia |
| Luz volumétrica (god rays) | Igual |
| Mapas PBR próprios (texturas de normal / roughness / metalness) | Pacotes não podem adicionar texturas próprias — a API só *lê* as texturas existentes do jogo via `bloxdTexel()`, e elas são texturas de cor pura sem canais PBR. Uma resposta pseudo-PBR só pode ser estimada a partir da luminância da cor mais `flags` ([API de texturas](../api/texture-api.md)) |
| Refração submarina | Sem cor de cena. A profundidade exclusiva de líquidos (`bloxdOpaqueBehind()`) permite absorção por espessura e projeção de fundo ([Fazendo a água parecer natural](water.md)) |
| Remoção / mudança do véu submarino (tom azul) | O véu é um quad emissive de tela cheia gerado da cor/alpha da definição do bloco líquido em que a câmera está, desenhado fora dos pipelines de hook (na frente de tudo), então pacotes não podem mudar nem sua cor nem sua densidade |
| Detecção submarina direta | Nenhuma entrada indica submersão da câmera, e fogStart / fogEnd / fogColour não mudam debaixo d'água, então não há forma confiável de estimar o estado submarino a partir de fogAlpha etc. |
| Mudar o céu, as nuvens ou o próprio disco solar | Os hooks rodam por face sobre a geometria de terreno / líquido / modelo; o skybox não faz parte de nenhum pipeline de hook |

## Capacidades condicionais

- **Animação de vértices e `discard`** — só em jogos cuja definição carrega `shaderPackPolicy: "allow"`; em todo o resto `BLOXD_STRICT` compila esses hooks fora ([Política de shader packs por jogo](../internals/policy.md))
- **Profundidade de cena (`bloxdOpaqueBehind()`)** — só hooks de líquido, e precisa de `BLOXD_SCENE_DEPTH`; hooks de terreno e modelo não têm acesso a profundidade ([Funções](../api/functions.md))
- **`bloxdTexel()` / `bloxdTextureSize()`** — só hooks de surface e light, e só onde o pipeline tem textura; configurações sem textura os compilam como stubs que devolvem branco ([API de texturas](../api/texture-api.md))
- **Alpha de terreno (`BLOXD_ALPHA`)** — só onde a variante o define ([Variantes e guardas](../getting-started/variants.md))

## Por que esses limites existem

Quatro entradas que um shader de pós-processamento "real" precisaria faltam estruturalmente:

1. **Sem cor de cena** — os hooks rodam enquanto cada face é desenhada; não há textura de framebuffer para ler, então SSR, refração e qualquer coisa derivada de "o que está atrás de mim" não pode ser calculada
2. **Sem profundidade de cena** — exceto a sonda geométrica `bloxdOpaqueBehind()` exclusiva de líquidos; SSAO e mapas de sombras precisam de um buffer de profundidade completo
3. **Sem etapa de pós-processamento** — nenhum hook roda depois de o quadro ser composto, então bloom, DOF, aberração, grão e god rays não têm ponto de entrada
4. **Sem acesso ao céu** — o skybox, as nuvens e o disco solar são desenhados fora dos pipelines de hook, e nenhuma entrada os descreve além de `bloxdSunDirection()`

O véu submarino é um caso especial da mesma estrutura: é um quad emissive de tela cheia desenhado na frente de tudo, gerado da definição do bloco líquido em que a câmera está — fora de todo pipeline de hook.

## Substitutos mais próximos

| Desejado | Abordagem mais próxima pelo lado do pacote |
|---|---|
| Reflexos | Mistura ponderada por fresnel rumo a uma cor tipo céu + brilho solar ([Fazendo a água parecer natural](water.md)) |
| Materiais PBR | Estimativa de especular/roughness por luminância + classes de material por `flags` ([Cores](../recipes/colors.md), [Realismo](../recipes/realism.md)) |
| Bloom / glow | Saída de emission — brilho genuinamente aditivo, mas por face, não um desfoque de pós-processamento ([Emissão](../recipes/emission.md)) |
| Oclusão ambiente | O AO de vértices cozido pelo mesher já vem em `surface.colour`; o escurecimento por skyLight serve também de AO em grande escala ([Sombras](shadows.md)) |
| Absorção por profundidade da água | Espessura via `bloxdOpaqueBehind()` + projeção de fundo em hooks de líquido ([Líquidos](../recipes/liquids.md)) |
| Ambiente submarino | Aceite o véu; estilize o que é visível através dele (terreno/líquido continuam renderizando normalmente debaixo d'água) |

## A verdade sobre as sombras — "sombras de árvores" dá para fazer

Só os **mapas de sombras precisos ao pixel que acompanham o sol** são impossíveis na tabela acima. O motor já calcula "sombras" desde o início, e isso é `skyLight`. O LightEngine do lado da malha roda um algoritmo estilo Minecraft:

1. **Varredura de colunas**: percorre cada coluna (x,z) de cima para baixo. A luz do céu começa em 15, vira **0 nos blocos opacos**, atenuando ao descer com `lightFilter` (ar 1 / água 3 / opaco 15)
2. **Preenchimento por inundação BFS**: espalha-se lateralmente aos 6 vizinhos (-1 por bloco) — isto é o que suaviza as bordas de sombra. O valor cru sob oclusão de raio r é (15-r)/15
3. blockLight (tochas etc.) é um BFS separado de 3 canais RGB (empacotado em 4 bits)

Então `l.skyLight` não é um mero parâmetro de brilho, mas **dado de oclusão em resolução de voxel de "se o céu é visível daqui" = um mapa de sombras**. Sob árvores, sob telhados e em interiores já é numericamente baixo, chegando suavizado por interpolação de vértices. Colocar/quebrar blocos recalcula imediatamente = **sombras que acompanham em tempo real**. Vanilla só o usa "suavemente" via `mix(ambiente, céu, skyLight)`.

As ferramentas certas são os dois passos de [Sombras](shadows.md) (**restaurar valores crus via inversão do lift → binarizar com limiar `smoothstep`**; `th = 1 - r/15` ajusta diretamente o "raio de oclusão tratado como sombra") mais **condicionar o sol direto ao céu** (o sol só chega onde o céu é visível = a essência da projeção), composto com tingimento quente ao sol / frio na sombra.

**Limites honestos**: essas sombras têm como base "o céu para cima", então **elas não giram conforme o sol se move ao longo do tempo**. A resolução é por bloco (bordas suaves vêm da dispersão BFS). O template de iluminação do motor ainda contém um stub fechado `var shadow: f32 = 1.;` para mapas de sombras (sempre 1.0 = desativado) — interpretado como rastro de sombras rotativas precisas ao pixel "planejadas". Se sombras rotativas precisas ao pixel forem imprescindíveis, só restam abordagens fora da API (ex. injeção GLSL por userscript, com risco de política).

## Realidade submarina

Os looks submarinos consistem em 3 camadas:

| Camada | Conteúdo | Operável pelos pacotes? |
|---|---|
| ① Render de terreno/líquido | Processável por hooks. Os hooks light são chamados normalmente debaixo d'água | Sim (funciona "sob o véu") |
| ② Véu de definição líquida | Quad emissive de tela cheia da cor/alpha de definição do bloco líquido na posição da câmera, desenhado na frente de tudo. O ajuste de jogo `cameraTint` prevalece se definido | Não (nem cor nem densidade mudáveis) |
| ③ cameraTint | Ajuste do jogo | Não |

Pontos práticos: os pacotes continuam funcionando debaixo d'água / o véu não pode ser removido / não se pode ramificar sobre o estado submarino (fogStart / fogEnd / fogColour não mudam debaixo d'água, então fogAlpha tampouco consegue detectá-lo).

## Relacionado

- [Sombras](shadows.md) — a técnica de sombras por skyLight por completo
- [Modelos e texturas](models.md) — até onde chega o pipeline de modelos
- [Compatibilidade](../api/compatibility.md) — como se comportam os pacotes de versões antigas
- Mudanças nesses limites versão por versão: [Histórico de versões](../history/)
