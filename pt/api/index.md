# Referência da API

A especificação sistemática da API v5 atual. Tudo aqui foi medido sobre o build alvo `bny9u` (2026-11-05; produção e preprod idênticos). O cabeçalho do motor anteposto a cada pacote (reproduzido em [Interior do motor](../internals/engine-header.md)) é a fonte primária.

## Mapa

| Página | Conteúdo |
|---|---|
| [Formato do pacote](pack-format.md) | cada campo de `pack.json`, limites do carregador, layout do uniform |
| [Hooks de shader](hooks.md) | comparação dos 9 hooks: assinaturas, alvos, condições de execução |
| [Flags](flags.md) | os 14 campos de `BloxdFlags` |
| [Estruturas](structures.md) | cada campo de cada struct (incl. campos condicionais) |
| [Funções](functions.md) | todas as assinaturas das funções frame/padrão/especiais |
| [Iluminação](lighting.md) | a API de iluminação e a ordem de processamento |
| [API de texturas](texture-api.md) | `bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*` e nomeação |
| [Constantes](constants.md) | `bloxdPi` / `bloxdTau` / `bloxdChunkSize` |
| [Pré-processador](preprocessor.md) | `BLOXD_STRICT` / `BLOXD_ALPHA` / `BLOXD_SCENE_DEPTH` |
| [Restrições](restrictions.md) | limites da linguagem, identificadores reservados |
| [Compatibilidade](compatibility.md) | pacotes de versões antigas, revalidação de pacotes salvos |
| [Catálogo de texturas](texture-catalog.md) | todos os 896 nomes utilizáveis (com busca) |

> API alvo: 5 · Build alvo: `bny9u` (verificado em produção 2026-11-05) · Estado: Analyzed (restaurado literalmente do cabeçalho e do validador)

Migrando da v4? Veja [Histórico de versões: v5](../history/v5.md).
