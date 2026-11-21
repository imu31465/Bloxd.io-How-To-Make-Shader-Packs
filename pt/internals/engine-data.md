# Dados do motor

> API alvo: 5 · Uso: resumo das especificações

Esta página resume a API disponível para shader packs e os limites importantes ao criar um pacote. Consulte as referências específicas para definições e exemplos.

## Visão geral da API

| Item | Especificação |
|---|---|
| Versão da API | `5` |
| Hooks | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| Variantes | 6 (allow / strict × terrain / liquid / model) |
| Macros | `BLOXD_STRICT`, `BLOXD_ALPHA` e `BLOXD_SCENE_DEPTH`. `BLOXD_LIGHTING` não está disponível |
| Uniform do pack | 80 bytes. Consulte [Formato do pack](../api/pack-format.md) para ver os offsets |
| Texturas | Use constantes nomeadas no formato `bloxdTextureId<Name>`. Não fixe IDs numéricos |
| Nomes reservados | Identificadores iniciados por `bloxd` são reservados para o motor |

## Limites do pack

| Item | Limite |
|---|---:|
| Arquivos WGSL | 256 |
| Total do código-fonte WGSL | 256 KB |
| `pack.json` | 64 KB |
| Arquivo ZIP | 32 MB |
| Entradas ZIP | 1.024 |

Coloque exatamente um manifesto na raiz do ZIP e salve os arquivos em UTF-8. Caminhos duplicados e formatos ZIP não suportados não são aceitos. Consulte [Formato do pack](../api/pack-format.md) para obter detalhes.

## Principais recursos da API v5

- `bloxdShadow()` e `bloxdAirShadow(t)` expõem informações sobre sombras do sol e da lua.
- `bloxdShadowDirection()` retorna a direção da luz que projeta a sombra.
- Defina o campo opcional `keepCircleShadows` em `pack.json` como `true` para manter as sombras circulares tradicionais ao usar a API de sombras.
- Verifique a iluminação em tempo de execução com `bloxdLit()`; a macro `BLOXD_LIGHTING` não é suportada.

## Relacionado

- [Referência da API](../api/) — funções, estruturas e constantes
- [Formato do pack](../api/pack-format.md) — manifesto, uniform e limites do carregador
- [Catálogo de texturas](../api/texture-catalog.md) — nomes de texturas disponíveis
- [Política por jogo](policy.md) — cobertura allow / strict
- [Guia de migração da API v4](../history/v4.md) — migração da versão anterior
