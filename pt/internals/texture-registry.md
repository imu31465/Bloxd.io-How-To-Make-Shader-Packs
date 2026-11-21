# Interioridades do registro de texturas

> API alvo: 5 · Build alvo: `bbb6l5` (verificado em produção e preprod em 2026-11-20) · Estado: Verified

Esta página explica como os nomes de textura são convertidos em IDs e resume as mudanças do registro entre builds. A lista atual para quem cria packs está no [Catálogo de texturas](../api/texture-catalog.md).

## Como foi medido

Recalculamos o registro executando o próprio construtor do build de produção sobre os dados de textura distribuídos com o jogo. A impressão digital resultante, `32451195`, corresponde ao atlas pré-compilado incluído em `bbb6l5`. São resultados do próprio motor, não de uma reimplementação.

## Registro atual

| Saída | `bbb6l5` | Significado |
|---|---:|---|
| `named` | **1.017** | Nomes disponíveis como constantes `bloxdTextureId<Name>` |
| `aliases` | **776** | Grafias alternativas resolvidas para um nome-base |
| `layers` | **1.650** | Total de camadas do atlas de texturas |
| Faixas do atlas | **7** | Seis faixas completas e uma parcial |
| Famílias de rotação | **64** | Nomes com variantes de rotação por face |
| Famílias de animação | **71** | Nomes com quadros animados |

Os aliases de animação incluem os nomes normais dos quadros e as grafias de transição usadas para mesclar quadros consecutivos. `radar_screen` pertence às famílias de rotação e de animação.

## Como os nomes são agrupados

- **Animação:** nomes de quadro como `lava0`–`lava7` são resolvidos para o nome-base `lava`. `bloxdTexel` seleciona o quadro atual durante a amostragem.
- **Rotação:** slots como `[rot[1`–`[rot[4` são resolvidos para o nome-base. `bloxdTexel` aplica o `textureRotation` da face.
- **Transições:** `frameA~frameB~interval` identifica um slot do atlas que mistura dois quadros adjacentes.

No WGSL, use as constantes pelo nome. Não fixe IDs numéricos: eles podem mudar entre builds mesmo quando o nome da textura continua disponível.

## Mudanças entre builds

| Comparação | Camadas do atlas | Nomes disponíveis | Mudança principal |
|---|---:|---:|---|
| `sjr0p7` → `cnty9` | 1.200 → 1.219 | — | 98 adicionados e 79 removidos; mudou a convenção de nomes das texturas rotacionadas |
| `cnty9` → `ab90qa` | 1.219 → 1.210 | 905 → 896 | Um nome adicionado e dez removidos |
| `ab90qa` → `xkg8x` | 1.210 → 1.220 | 896 → 906 | Os dez nomes removidos no lançamento do v5 voltaram |
| `xkg8x` → `bny9u` | 1.220 → 1.232 | 906 → 911 | Cinco nomes adicionados para Trading Terminal e Stone Generator |
| `bny9u` → `v98qt8` | 1.232 → 1.227 | 911 → 906 | Um nome adicionado; seis texturas saíram do registro quando os blocos viraram modelos |
| `v98qt8` → `bbb6l5` | 1.227 → 1.650 | 906 → 1.017 | Mais 423 camadas; famílias de rotação e animação ampliadas; regressão corrigida |

Muitos nomes receberam novos IDs em cada atualização. As constantes por nome mantêm os packs independentes dessas alterações numéricas.

## Regressão de dobragem do v98qt8 (corrigida)

No `v98qt8`, a tabela de texturas animadas do motor passou a usar chaves de texto, mas a lógica de dobragem ainda esperava índices de slot. Com isso, os nomes-base das texturas animadas falhavam na validação, e os nomes de cada quadro apareciam como constantes separadas, sem animação.

O problema foi corrigido no `bbb6l5`: a tabela voltou a usar índices de slot, os nomes-base de animação passaram na validação e a impressão digital do registro corresponde ao atlas distribuído. Esta seção fica como histórico; ela não descreve o build atual.

## Efeito sobre HEADER_VERSION

A impressão digital do registro faz parte de `HEADER_VERSION`. Uma mudança no registro pode, portanto, provocar nova validação dos packs. Packs que usam nomes são resolvidos com os novos IDs; os que fixam IDs numéricos podem parar de funcionar. Consulte [Compatibilidade](../api/compatibility.md).

## Relacionado

- [Catálogo de texturas](../api/texture-catalog.md) — nomes disponíveis para packs
- [Internals de amostragem de texturas](texture-sampling.md) — como as texturas são amostradas
- [Registro de pesquisa](research-log.md) — método de medição e histórico de builds
