# Visão geral e pré-requisitos

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

- **Pode fazer**: mudar cores, transparência e emissão; reconstruir a iluminação ([API de iluminação](../api/lighting.md)); usar as sombras do sol e da lua calculadas pelo motor (`bloxdShadow()`, `bloxdAirShadow(t)`, `bloxdShadowDirection()`); usar a oclusão do céu por voxels (`skyLight`); amostrar texturas com `bloxdTexel`; criar efeitos por modelo com `flags`; animar vértices em jogos allow
- **Não pode fazer**: adicionar texturas próprias (isso cabe ao sistema de pacotes de texturas); aplicar pós-processamento ao quadro final (bloom etc.); acessar dados de profundidade do shadow map ou gerar um shadow map próprio; adicionar reflexos reais (SSR); alterar o céu, as nuvens ou o próprio disco solar
- **Escolha do método de sombra**: use `bloxdShadow()` para as sombras do motor que acompanham o sol e a lua. `skyLight` é um método antigo para escurecer áreas sob árvores e telhados; ele não acompanha o sol nem a lua. Consulte [Sombras](../guides/shadows.md).

## Modos strict e allow

Cada jogo tem uma política de pacotes de shaders (`shaderPackPolicy`), e **a maioria dos jogos roda em modo strict** (sem animação de vértices, sem `discard`). Pacotes para distribuição geral devem funcionar em modo strict. Veja [Variantes](variants.md) e a [referência de política](../internals/policy.md).

## Premissas desta documentação

- O jogo atual aceita apenas pacotes `apiVersion: 5`; pacotes v1–v4 são rejeitados no carregamento (pacotes salvos ficam silenciosamente inativos — [Compatibilidade](../api/compatibility.md))
- Está migrando um pacote escrito para uma versão mais antiga? Veja o [Histórico de versões](../history/)
