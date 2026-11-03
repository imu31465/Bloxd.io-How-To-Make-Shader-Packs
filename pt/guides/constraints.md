# Looks inalcançáveis (o "teto" do realismo)



| Look | Motivo |
|---|---|
| Mapas de sombra pixelados (sombras que giram com o sol, penumbra) | Texturas de profundidade não podem ser referenciadas (`bloxdOpaqueBehind()` limitado a líquidos é só geometria e não serve como mapa de sombras). Oclusão de raios não chega aos hooks |
| SSAO | Sem acesso à profundidade de cena (só AO de vértices do mesher; a profundidade limitada a líquidos não serve para SSAO) |
| SSR (reflexos) | Sem cor de cena. Só pseudo looks misturando cor de céu via fresnel |
| Bloom / glare | Sem hook ao pós-processamento |
| Profundidade de campo, aberração cromática, grão | Requerem pós-processamento de tela cheia |
| Luz volumétrica (god rays) | Igual |
| Texturas PBR | Leituras de textura proibidas. Só pseudo estimativa desde luminância de cor |
| Refração submarina | Sem cor de cena. A profundidade limitada a líquidos (`bloxdOpaqueBehind()`) permite absorção por espessura e projeção de fundo ([Parte VIII](../history/v2.md) R-E) |
| Véu submarino (tom azul): remover / mudar | O véu é um quad emissive de tela cheia gerado da cor/alpha de definição do bloco líquido da câmera, desenhado fora dos pipelines de hook (na frente de tudo): o pacote não muda nem cor nem densidade |
| Detecção submarina direta | Nenhuma entrada indica submersão de câmera, e fogStart / fogEnd / fogColour não mudam debaixo d'água: tampouco há forma fiável de estimá-la desde fogVisibility etc. |

## A verdade sobre as sombras — "sombras de árvores" dá para fazer

Só **mapas de sombra pixelados que giram com o sol** são impossíveis na tabela. O motor já calcula "sombras" desde o início, e isso é `skyLight`. O LightEngine do lado da malha usa um algoritmo estilo Minecraft:

1. **Varredura de colunas**: percorre cada coluna (x,z) de cima abaixo. A luz do céu começa em 15, vira **0 em blocos opacos**, atenuando ao descer com `lightFilter` (ar 1 / água 3 / opaco 15)
2. **Preenchimento BFS**: expande lateralmente a 6 vizinhos (-1 por bloco) — isto suaviza bordas de sombra. O valor cru sob oclusão de raio r é (15-r)/15
3. blockLight (tochas etc.) é um BFS separado de 3 canais RGB (empacotado 4bit)

Então `l.skyLight` não é mero parâmetro de brilho mas **dado de oclusão por voxels de "se o céu é visível daqui" = um mapa de sombras**. Sob árvores, sob telhados e interiores já é numericamente baixo, chegando suavizado por interpolação de vértices. Colocar/quebrar blocos recalcula na hora = **sombras que acompanham em tempo real**. O baunilha só usa "suave" via `mix(ambiente, céu, skyLight)`.

As ferramentas certas são os dois passos de R9.12 (**restaurar valores crus via inversão do lift → binarizar com limiar `smoothstep`**. `th = 1 - r/15` marca diretamente o "raio de oclusão tratado como sombra") mais **abrir o sol direto com sky** (o sol só chega onde o céu é visível = a essência da projeção), com tom quente no sol / frio na sombra.

**Limites honestos**: estas sombras usam como base "o céu para cima", então **não giram quando o sol se move**. A resolução é por bloco (bordas suaves vêm da dispersão BFS). O template de iluminação ainda contém um stub fechado `var shadow: f32 = 1.;` para mapas de sombra (sempre 1.0 = desativado) — interpretado como rastro de sombras rotativas pixeladas "planejadas". Se essas sombras forem imprescindíveis, só restam vias fora da API (ex. injeção GLSL por userscript, com risco de política).

## Realidade submarina

Os looks submarinos constam de 3 camadas:

| Camada | Conteúdo | Operável desde pacotes? |
|---|---|---|
| ① Render de terreno/líquido | Processável por hooks. Os hooks light são chamados normalmente debaixo d'água | Sim (funciona "sob o véu") |
| ② Véu de definição líquida | Quad emissive de tela cheia da cor/alpha de definição do bloco líquido da câmera, desenhado na frente de tudo. O ajuste `cameraTint` ganha se existir | Não (nem cor nem densidade mudáveis) |
| ③ cameraTint | Ajuste do jogo | Não |

Pontos práticos: os pacotes seguem funcionando debaixo d'água / o véu não se remove / debaixo d'água não se ramifica (fogStart / fogEnd / fogColour não mudam debaixo d'água: fogVisibility tampouco o detecta).
