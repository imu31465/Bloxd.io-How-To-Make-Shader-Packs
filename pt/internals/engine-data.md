# Resumo dos dados do motor

> API alvo: 5 · Estado: Analyzed

Esta página resume a API disponível para os shader packs. Consulte a [Referência da API](../api/) para obter detalhes de uso.

## Superfície da API

| Item | Especificação |
|---|---|
| Versão da API | `5` |
| Cabeçalho do motor | 216 linhas; consulte o [cabeçalho do motor](engine-header.md) |
| Hooks | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| Variantes | 6 (strict × terrain / liquid / model) |
| Macros | `BLOXD_STRICT`, `BLOXD_ALPHA`, `BLOXD_SCENE_DEPTH` |
| Uniform do pack | 80 bytes; consulte o [formato do pack](../api/pack-format.md) |
| Campos do uniform | `seconds` @0, `lit` @4, `renderOffset` @16, `sunDirection` @32, `eyePosition` @48, `shadowDirection` @64 |
| Nomes de texturas | As constantes utilizáveis estão no [catálogo de texturas](../api/texture-catalog.md) |

## API de sombras

- `bloxdShadow()` retorna o fator de sombra do sol/lua calculado pelo motor.
- `bloxdAirShadow(t)` avalia a sombra em um ponto entre a câmera e o fragmento.
- `bloxdShadowDirection()` retorna a direção da luz que projeta a sombra.
- `keepCircleShadows` é um campo booleano opcional de `pack.json` que mantém as sombras circulares antigas.

## Relacionado

- [Referência da API](../api/) — APIs disponíveis para os packs
- [Formato do pack](../api/pack-format.md) — manifesto, uniform e limites do carregador
- [Política por jogo](policy.md) — restrições de cada jogo
