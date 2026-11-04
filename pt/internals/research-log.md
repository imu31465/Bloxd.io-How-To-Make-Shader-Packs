# Registro de pesquisa

> Estado: Verified — como as medições desta documentação foram obtidas

As afirmações técnicas daqui não se apoiam em documentação oficial de desenvolvedores, mas na **análise do bundle de produção**. Esta página registra a metodologia e as evidências para que builds futuros possam ser reverificados.

## Princípios básicos

1. **Recuperação direta do bundle de produção** — o main.js e os chunks brutos baixados tanto da produção quanto do preprod, identidade verificada por md5
2. **Respeito verbatim** — cabeçalhos, mensagens de erro e strings de i18n são **citadas tal como são**, nunca parafraseadas
3. **Medição reproduzida** — valores derivados, como o registro, são recalculados executando os próprios módulos do motor em um harness (saída real, não uma reimplementação parecida)
4. **Builds nomeados** — cada medição carrega um id de build e data

## Histórico de builds referenciado por esta documentação

| Build | API | Data | Nota |
|---|---|---|---|
| `szby6g` | era v3 | 2026-10-17 | primeira análise estática allow/strict (111 definições de jogo) |
| `3ymzdd` | v3 | 2026-10-20 | a build de evidência do guia da v3 |
| `sjr0p7` | era v3 | 2026-10-17 | linha de base para comparação de deriva |
| `cnty9` | v4 | 2026-10-27 | evidência do guia da v4 e do catálogo de 905 nomes |
| `6pf78` / `tcwczu` | v4 | 2026-10-31 | confirmação do congelamento da v4 (evento de Halloween + rework de Skyblock) |
| `ab90qa` | **v5** | 2026-11-03 | **atual**; linha de base desta documentação. prod = preprod (md5 `fc3322212d15be2445c0e8dfc9733fcc`) |
| `xkg8x` | **v5** | 2026-11-04 | **atual**; linha de base desta documentação. main de prod ≠ main de preprod (`2lcqcl`), mas toda superfície de shader packs medida idêntica |

## Metodologia chave

### Restauração do cabeçalho do motor

Renderizando o template de cabeçalho do c55 com suas interpolações reais (`${vC}` = apiVersion, as 5 leituras de uniform via `${Gq.j}`) — 6 interpolações na v5 ([Cabeçalho do motor](engine-header.md)).

### Recomputação do registro de texturas

Executando os módulos de construção de registro do motor (29833 + 1371 + 1391 + 1384 + 219) contra os dados de textura do registro de blocos distribuído em um mini harness de webpack; registrando a saída (896 nomes / 416 aliases / 228 camadas) ([Registro de texturas](texture-registry.md)).

Os intervalos de animação vêm da tabela no estilo `animDataPerTex` (`numAnimStates` / `animationInterval` por camada) — só existem três valores de intervalo: 200 / 250 / 300 ms ([o catálogo](../api/texture-catalog.md#famílias-de-animação-42-nomes)).

### Captura de mensagens de erro

Mensagens do carregador, verbatim do dicionário i18n em execução; mensagens do validador, dos literais de string do módulo de validação.

### Análise estática allow / strict

Analisando estaticamente as 111 definições de jogo: literais `"allow"` de `shaderPackPolicy` — 8 diretos + 4 por variável base = 12 títulos (26 entradas), com a herança por spread (`{...tb,...}`) rastreada também ([Política](policy.md)).

### Restauração de uniform / pipeline

O layout de campos de `BloxdPackInputs` do módulo de layout de uniform (29838); o codegen de texturas de 3 variantes do gerador WebGPU (c56) ([Amostragem de texturas](texture-sampling.md)).

## Observações de deriva

| Comparação | Período | Resultado |
|---|---|---|
| sjr0p7 → cnty9 | 10 dias | 98 adicionados, 79 removidos; 779/1121 nomes mudaram de id (69%) |
| cnty9 → ab90qa | 7 dias | +1 (scorpion_eggs), −10 (cofre duplo ×8, laterais de spawner ×2); 334/905 nomes mudaram de id |
| ab90qa → xkg8x | 1 dia | +10 (todas as remoções do lançamento da v5 voltaram: baú duplo ×8, laterais de spawner ×2); 376/896 nomes mudaram de id; nenhum removido |

## Não verificado / especulativo

- Mapas de sombra precisos ao pixel como "planos futuros" é uma **interpretação** (inferida do `var shadow: f32 = 1.;` não usado no template de iluminação)
- A divisão allow/strict pode mudar por build (identidade dos 12 títulos reconfirmada em ab90qa; jogos futuros desconhecidos)
- `bloxdFragmentBlockPosition` (fora do cabeçalho da v5): entrada na tabela de assinaturas e injeção em tempo de execução, ambas confirmadas no bundle em execução — as chamadas validam e compilam; se a equipe do motor pretende mantê-la é desconhecido

## Quando reverificar

Ao detectar uma atualização do jogo (um novo hash de main.js): reconferir o cabeçalho (9.125 B), a constante apiVersion, recomputar o registro e reconfirmar a lista allow/strict. A metodologia detalhada de monitoramento está fora do escopo desta documentação, mas as localizações de módulos acima (c55 / c116 / c56) são os pontos de partida.

## Relacionado

- [Ledger de dados do motor](engine-data.md) · [Registro de texturas](texture-registry.md) · [Histórico de versões](../history/)
