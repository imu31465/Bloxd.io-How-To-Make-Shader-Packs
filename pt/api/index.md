# Referência da API

Esta seção documenta a API v5 atual de shader packs. Cada página explica os tipos, as funções e os limites necessários para criar e implementar shader packs.

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
| [Catálogo de texturas](texture-catalog.md) | todos os 1,017 nomes utilizáveis (com busca) |

Migrando da v4? Veja [Histórico de versões: v5](../history/v5.md).
