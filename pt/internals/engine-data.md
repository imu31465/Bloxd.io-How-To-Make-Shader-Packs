# Ledger de dados do motor

> API alvo: 5 · Build alvo: `bbb6l5` (verificado em produção e preprod em 2026-11-20) · Estado: Verified

Este ledger reúne os valores confirmados da API visível aos shader packs no build atual. Detalhes internos do bundle, como IDs de módulos e chunks, não fazem parte da especificação e não são listados aqui.

## Especificação atual

| Item | Valor |
|---|---|
| `apiVersion` | `5` (comparação estrita com número) |
| Cabeçalho do motor | 216 linhas; texto completo em [Cabeçalho do motor](engine-header.md) |
| Hooks | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| Variantes | 6 (strict × terrain / liquid / model) |
| Macros | `BLOXD_STRICT`, `BLOXD_ALPHA`, `BLOXD_SCENE_DEPTH`; `BLOXD_LIGHTING` foi removida no v5 |
| Uniform do pack | 80 bytes: `seconds` @0, `lit` @4, `renderOffset` @16, `sunDirection` @32, `eyePosition` @48, `shadowDirection` @64 |
| Binding do pack | `@group(3) @binding(0)`; `minBindingSize` 80 |
| Flags | estrutura `BloxdFlags` com 14 campos booleanos |
| Atlas de texturas | 1.650 camadas; 1.017 nomes; 776 aliases |
| Famílias de textura | 64 de rotação e 71 de animação |
| Identificadores reservados | nomes que correspondem a `/^bloxd/i` e 88 símbolos internos `bloxdSp*` |
| Definições de jogos | 119 |
| Política de shader packs | 12 títulos permitidos, 28 entradas; veja [Política por jogo](policy.md) |
| Template padrão do pack | 1.633 bytes |
| Limites do loader | 256 arquivos WGSL / 256 KB de código / 64 KB para `pack.json` / ZIP de 32 MB / 1.024 entradas |

## Mudanças do bbb6l5

O `bbb6l5` mantém `apiVersion: 5`, mas amplia a API visível aos packs:

- `bloxdShadow()`, `bloxdAirShadow(t)` e `bloxdShadowDirection()` expõem o sistema de sombras do sol e da lua calculado pelo motor.
- O uniform recebe `shadowDirection: vec3f` no deslocamento 64 e aumenta de 64 para 80 bytes.
- `pack.json` aceita o booleano opcional `keepCircleShadows` para manter as antigas sombras circulares.
- O atlas cresce de 1.227 para 1.650 camadas e passa de 906 para 1.017 nomes disponíveis.
- A regressão de dobragem de constantes de textura introduzida em `v98qt8` foi corrigida.

A explicação e as evidências dessas medições estão no [Registro de pesquisa](research-log.md) e nas [Interioridades do registro de texturas](texture-registry.md).

## Versões anteriores

- [Histórico de versões](../history/) — mudanças e migrações das APIs anteriores
- [Registro de pesquisa](research-log.md) — método e referências das medições

## Relacionado

- [Cabeçalho do motor](engine-header.md) — texto completo do cabeçalho
- [Política por jogo](policy.md) — títulos com política allow / strict
- [Registro de texturas](texture-registry.md) — nomes e atribuição de IDs
