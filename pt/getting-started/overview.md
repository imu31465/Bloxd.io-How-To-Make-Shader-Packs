# Visão geral e pré-requisitos

> API alvo: 5 · Build alvo: `ab90qa` (verificado em produção em 2026-11-03) · Estado: Verified

## O que é um pacote de shaders

Um pacote de shaders do Bloxd.io muda a aparência do jogo **somente no renderizador WebGPU**. Pacotes são escritos em um **subconjunto restrito de WGSL** e carregados pela tela de configurações do jogo → Shader Pack, como zip ou pasta. Enquanto um pacote estiver instalado, o renderizador WebGPU fica ativado à força nas configurações.

Pacotes são validados e compilados como WGSL puro — sem execução de JavaScript, sem rede. Nada de perigoso pode acontecer com código normal.

## O que você pode mudar

Um pacote se conecta ao **pipeline de 3 estágios por face** do renderizador. Os alvos de renderização se dividem em três programas com um total de **9 hooks**:

| Alvo | Hooks (Vertex / Surface / Light) | O que é desenhado |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | Todos os blocos, exceto água e modelos de bloco |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | Água |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | Modelos de bloco (lajes, escadas, plantas), itens, jogadores, mobs, NPCs, armaduras, cosméticos |

- **Pode fazer**: mudar cores, transparência e emissão; reconstruir a iluminação (a [API de iluminação](../api/lighting.md)); sombras de estilo projetado (via `skyLight`); amostrar texturas (`bloxdTexel` — ler o atlas existente de texturas de blocos); efeitos por modelo (`flags` dizem "isto é um item na mão", "isto é um jogador"); animação de vértices (apenas jogos allow)
- **Não pode fazer**: adicionar texturas próprias (isso é trabalho do sistema de pacotes de texturas); pós-processamento (bloom etc.); sombras de mapa de sombras que giram com o sol; reflexos reais (SSR); afetar o céu, as nuvens ou o próprio disco solar
- **Fácil de deixar passar, mas poderoso**: **sombras de estilo projetado usando `skyLight` (oclusão de céu por voxels)** — escurecem nitidamente as áreas sob árvores e telhados. Quebrar blocos faz a LightEngine recalcular imediatamente, então as sombras acompanham em tempo real

## Modos strict e allow

Cada jogo tem uma política de pacotes de shaders (`shaderPackPolicy`), e **a maioria dos jogos roda em modo strict** (sem animação de vértices, sem `discard`). Pacotes para distribuição geral devem funcionar em modo strict. Veja [Variantes](variants.md) e a [referência de política](../internals/policy.md).

## Premissas desta documentação

- O jogo atual aceita apenas pacotes `apiVersion: 5`; pacotes v1–v4 são rejeitados no carregamento (pacotes salvos ficam silenciosamente inativos — [Compatibilidade](../api/compatibility.md))
- Está migrando um pacote escrito para uma versão mais antiga? Veja o [Histórico de versões](../history/)
- As interioridades do motor podem mudar com as atualizações, então cada página indica sua build alvo
