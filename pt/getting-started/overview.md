# Visão geral e pré-requisitos

> API: 5 · Estado: Verified

## O que é um pacote de shaders

Um pacote de shaders do Bloxd.io muda a aparência do jogo **somente no renderizador WebGPU**. Pacotes são escritos em um **subconjunto restrito de WGSL** e carregados pela tela de configurações do jogo → Shader Pack, como zip ou pasta. Enquanto um pacote estiver instalado, o renderizador WebGPU fica ativado à força nas configurações.

O código do pack é validado e compilado como WGSL. O WGSL do pack não pode executar JavaScript nem fazer requisições de rede.

## O que você pode mudar

Um pacote se conecta ao **pipeline de 3 estágios por face** do renderizador. Os alvos de renderização se dividem em três programas com um total de **9 hooks**:

| Alvo | Hooks (Vertex / Surface / Light) | O que é desenhado |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | Todos os blocos, exceto água e modelos de bloco |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | Água |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | Modelos de bloco (lajes, escadas, plantas), itens, jogadores, mobs, NPCs, armaduras, cosméticos |

- **Pode fazer**: alterar cores, transparência e emissão; ajustar a iluminação (a [API de iluminação](../api/lighting.md)); amostrar texturas com `bloxdTexel`; criar efeitos por modelo usando `flags`; animar vértices (apenas jogos allow)
- **Não pode fazer**: adicionar texturas próprias; criar efeitos de pós-processamento, como bloom; gerar um mapa de sombras próprio ou acessar seus dados de profundidade; criar reflexos reais (SSR); nem aplicar sombreamento ao céu, às nuvens ou ao disco solar
- **Sombras**: `bloxdShadow()` fornece o fator de sombra solar/lunar calculado pelo motor, e `bloxdShadowDirection()` indica a direção em que a luz que projeta a sombra se desloca. `bloxdAirShadow(t)` avalia um ponto entre a câmera e o fragmento. O método antigo de oclusão do céu por voxels com `skyLight` também continua disponível ([Guia de sombras](../guides/shadows.md))

## Modos strict e allow

Cada jogo tem uma política de pacotes de shaders (`shaderPackPolicy`), e **a maioria dos jogos roda em modo strict** (sem animação de vértices, sem `discard`). Pacotes para distribuição geral devem funcionar em modo strict. Veja [Variantes](variants.md) e a [referência de política](../internals/policy.md).

## Premissas desta documentação

- O jogo atual aceita apenas pacotes `apiVersion: 5`; pacotes v1–v4 são rejeitados no carregamento (pacotes salvos ficam silenciosamente inativos — [Compatibilidade](../api/compatibility.md))
- Está migrando um pacote escrito para uma versão mais antiga? Veja o [Histórico de versões](../history/)
- As descrições dos mecanismos internos do motor são material de referência; consulte a referência da API para conhecer o contrato compatível
