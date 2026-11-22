# Referência da API

Esta página documenta a API v5 atual. A principal fonte das definições é o cabeçalho que o motor acrescenta automaticamente ao início de cada pacote (consulte [Mecanismos internos do motor](../internals/engine-header.md) para ver o cabeçalho completo).

## Conteúdo

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
| [Catálogo de texturas](texture-catalog.md) | 1.017 constantes nomeadas disponíveis (com pesquisa) |

> API: 5 · Estado: Analyzed (reconstruído a partir do cabeçalho do motor e do validador)

Migrando da v4? Veja [Histórico de versões: v5](../history/v5.md).
