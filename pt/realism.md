[← Parte anterior](recipes.md)·[Voltar ao manual](README.md)·[Parte seguinte →](troubleshooting.md)

# Parte IV: Guia de realismo

## 13. Iluminação padrão do motor e margem para realismo

A iluminação padrão do motor é "só multiplicação" — não existem especular, fresnel, separação quente/frio nem ambiente hemisférico. O seguinte pode ser reconstruído:

| Função | Padrão | Reconstruível em pacotes? |
|---|---|---|
| Difuso (Lambert) | Só soma escalar de direcionais | ◎ Próprio com `bloxdSunDirection()` (fontes envoltas etc.) |
| Especular | Nenhum | ◎ Blinn-Phong (R9.2) |
| Fresnel | Nenhum | ◎ Aproximação de Schlick (R9.3) |
| Separação tocha quente / céu frio | Sem cor | ◎ (R9.1) |
| Ambiente hemisférico | Sem direção | ◎ Céu em cima / chão embaixo (R9.4) |
| Mapeamento de tons | Nenhum (só clamp) | ◎ ACES fílmico (R9.5) |
| Perspectiva aérea | Só névoa (troca de cor) | ◎ Dessaturação com distância (R9.6) |
| Detalhe de superfície | Só resolução de textura | △ Micro-relevo procedural com hash (R9.8) |
| Ondas de vértice (água) | Nenhuma (plano) | ◎ Só allow (R7) |
| Normais de onda / brilho solar | Nenhumas | ◎ (R9.7) |
| Luar noturno | A cor do céu só escurece | △ A direção lunar está em `-bloxdSunDirection()`: pseudo looks (ambiente azul em R2 / dessaturação em R9.11) mais luar direcional (R-A, só ciclo dia/noite) |
| Sombras (oclusão de céu) | Só mistura suave via `mix(ambiente, céu, skyLight)` | ◎ Inversão do lift + corte por limiar + porta solar (R9.12). Sombra de árvores e sob telhados cai claramente, seguindo edições de blocos em tempo real |

## 14. Duas escolas de implementação

**Escola A: retoques aditivos (de defaultLight)** — usa `engineColour` (cor terminada) como base e soma brilho quente ou rim. Fácil e seguro, mas o modelo de iluminação segue o padrão.

**Escola B: reiluminação total (de s.colour)** — descarta `l.engineColour` e reconstrói a iluminação de `s.colour` (albedo) e materiais LightIn crus. O caminho real ao realismo. Quatro regras:

1. **Reaplique a névoa**: o hook light roda pós-névoa; aplique `mix(l.fogColour, col, l.fogVisibility)` você mesmo (R9.10). Com névoa densa, ponha piso com `max(l.fogVisibility, 0.3)`. E ao contrário: misturar mais cor de névoa em pacotes baseados em engineColour produz névoa branca dupla
2. **Reserva unlit**: passe para `defaultLight` fora de `#ifdef BLOXD_LIGHTING`
3. **Proteja funções compartilhadas inteiras**: envolva em `#ifdef BLOXD_LIGHTING` como funções completas as funções compartilhadas que tomam `BloxdLightIn` (proteger só chamadas não basta)
4. **Sem direção solar**: se `bloxdSunDirection()` é zero, não compute especular direcional. `l.directional` é um escalar de quantidade de luz, não um vetor de direção: não restaura a direção do brilho. Troque para ambiente fraco sem direção se preciso. A direção lunar está disponível via `-bloxdSunDirection()` (só se move em mundos com ciclo dia/noite. [Parte VII](internals.md) R-A)

## 15. Looks inalcançáveis (o "teto" do realismo)

| Look | Motivo |
|---|---|
| Mapas de sombra pixelados (sombras que giram com o sol, penumbra) | Texturas de profundidade não podem ser referenciadas (`bloxdOpaqueBehind()` limitado a líquidos é só geometria e não serve como mapa de sombras). Oclusão de raios não chega aos hooks |
| SSAO | Sem acesso à profundidade de cena (só AO de vértices do mesher; a profundidade limitada a líquidos não serve para SSAO) |
| SSR (reflexos) | Sem cor de cena. Só pseudo looks misturando cor de céu via fresnel |
| Bloom / glare | Sem hook ao pós-processamento |
| Profundidade de campo, aberração cromática, grão | Requerem pós-processamento de tela cheia |
| Luz volumétrica (god rays) | Igual |
| Texturas PBR | Leituras de textura proibidas. Só pseudo estimativa desde luminância de cor |
| Refração submarina | Sem cor de cena. A profundidade limitada a líquidos (`bloxdOpaqueBehind()`) permite absorção por espessura e projeção de fundo ([Parte VIII](apiv2.md) R-E) |
| Véu submarino (tom azul): remover / mudar | O véu é um quad emissive de tela cheia gerado da cor/alpha de definição do bloco líquido da câmera, desenhado fora dos pipelines de hook (na frente de tudo): o pacote não muda nem cor nem densidade |
| Detecção submarina direta | Nenhuma entrada indica submersão de câmera, e fogStart / fogEnd / fogColour não mudam debaixo d'água: tampouco há forma fiável de estimá-la desde fogVisibility etc. |

### A verdade sobre as sombras — "sombras de árvores" dá para fazer

Só **mapas de sombra pixelados que giram com o sol** são impossíveis na tabela. O motor já calcula "sombras" desde o início, e isso é `skyLight`. O LightEngine do lado da malha usa um algoritmo estilo Minecraft:

1. **Varredura de colunas**: percorre cada coluna (x,z) de cima abaixo. A luz do céu começa em 15, vira **0 em blocos opacos**, atenuando ao descer com `lightFilter` (ar 1 / água 3 / opaco 15)
2. **Preenchimento BFS**: expande lateralmente a 6 vizinhos (-1 por bloco) — isto suaviza bordas de sombra. O valor cru sob oclusão de raio r é (15-r)/15
3. blockLight (tochas etc.) é um BFS separado de 3 canais RGB (empacotado 4bit)

Então `l.skyLight` não é mero parâmetro de brilho mas **dado de oclusão por voxels de "se o céu é visível daqui" = um mapa de sombras**. Sob árvores, sob telhados e interiores já é numericamente baixo, chegando suavizado por interpolação de vértices. Colocar/quebrar blocos recalcula na hora = **sombras que acompanham em tempo real**. O baunilha só usa "suave" via `mix(ambiente, céu, skyLight)`.

As ferramentas certas são os dois passos de R9.12 (**restaurar valores crus via inversão do lift → binarizar com limiar `smoothstep`**. `th = 1 - r/15` marca diretamente o "raio de oclusão tratado como sombra") mais **abrir o sol direto com sky** (o sol só chega onde o céu é visível = a essência da projeção), com tom quente no sol / frio na sombra.

**Limites honestos**: estas sombras usam como base "o céu para cima", então **não giram quando o sol se move**. A resolução é por bloco (bordas suaves vêm da dispersão BFS). O template de iluminação ainda contém um stub fechado `var shadow: f32 = 1.;` para mapas de sombra (sempre 1.0 = desativado) — interpretado como rastro de sombras rotativas pixeladas "planejadas". Se essas sombras forem imprescindíveis, só restam vias fora da API (ex. injeção GLSL por userscript, com risco de política).

### Realidade submarina

Os looks submarinos constam de 3 camadas:

| Camada | Conteúdo | Operável desde pacotes? |
|---|---|---|
| ① Render de terreno/líquido | Processável por hooks. Os hooks light são chamados normalmente debaixo d'água | Sim (funciona "sob o véu") |
| ② Véu de definição líquida | Quad emissive de tela cheia da cor/alpha de definição do bloco líquido da câmera, desenhado na frente de tudo. O ajuste `cameraTint` ganha se existir | Não (nem cor nem densidade mudáveis) |
| ③ cameraTint | Ajuste do jogo | Não |

Pontos práticos: os pacotes seguem funcionando debaixo d'água / o véu não se remove / debaixo d'água não se ramifica (fogStart / fogEnd / fogColour não mudam debaixo d'água: fogVisibility tampouco o detecta).

## 16. Dicas de depuração

- Cavernas claras demais → falta curva não linear de `skyLight` (receita de cavernas R2 / R9.9)
- Dias estourados → baixe a exposição pré-ACES
- Noites escuras demais → assegure ambiente mínimo (o `skyLightColour` noturno é quase preto por premissa)
- Distância com bruma demais → baixe coeficientes aéreos
- Tudo laranja em torno de tochas → baixe a proporção quente (conserve algo de luz crua tingida)
- Blocos quase todo brancos → o total de saída do hook light supera 1.0 (sem clamp águas abaixo). Termine com `clamp(col, vec3f(0.0), vec3f(1.0))`
- Branco sem somas → inversão un-fog por divisão com fogVisibility. Tire un-fog; reconstrua desde `s.colour` e `mix` de névoa uma só vez ao final
- Blocos emissivos não brilham → falta re-soma de emission em receitas de reconstrução. Some `+ s.emission * l.fogVisibility`
- De noite só restam faces iluminadas → não escureça só sombras; atenue toda a cor terminada (`engineColour`) de noite. Para conservar lamparinas locais, atenue menos com `blockLight` / `heldLight` ([Parte VI](implementation.md), seção 19)
- Sombra não aprofunda com `pow(skyLight, γ)` → `l.skyLight` é pós-curva (seção 10). Mude para inversão + limiar de R9.12
- Ajustar área/densidade de sombra → guia de ajuste de R9.12 (área = limiar `shTh` / borda = `shSoft` / escuridão do núcleo = duplo ajuste de ambiente mínimo e dispersão do céu)
