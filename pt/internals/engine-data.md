# Ledger de dados do motor

> API alvo: 5 · Build alvo: `xkg8x` (2026-11-04; produção; preprod idêntico em todas as superfícies de shader packs) · Estado: Verified

O ledger de medições desta documentação — cada valor confirmado, todos medidos sobre o build alvo atual `xkg8x`.

## O ledger

| Item | Valor |
|---|---|
| `apiVersion` | `5` (`===` estrito, número) |
| cabeçalho do motor | 8.954 B decodificados / 208 linhas (9.125 B como distribuído, 6 interpolações). Primeira linha `// The Bloxd shader pack API, apiVersion 5. Read-only, prepended to all packs.` — texto completo em [Cabeçalho do motor](engine-header.md) |
| hooks | 9 (terreno/líquido/modelo × vertex/surface/light). Nomes inalterados; o template padrão embute todos os 9 |
| variantes | 6 (strict × programa). Nomes `strict\|allow.terrain\|liquid\|model` — o eixo de iluminação desapareceu |
| macros | `BLOXD_STRICT` (strict) · `BLOXD_ALPHA` (todo líquido + terreno/modelo não strict) · `BLOXD_SCENE_DEPTH` (todo líquido) · ~~`BLOXD_LIGHTING`~~ **removida** |
| uniform do pacote | `@group(3) @binding(0)`, 64 B: seconds@0, **lit@4 (u32, novo)**, renderOffset@16, sunDirection@32, eyePosition@48 |
| bindings do pacote | group 3: 0 uniform · 1 profundidade de cena (líquido) · 2 storage `bloxdSpTextureLayers` |
| flags | a struct `BloxdFlags`, 14 bools; os valores de bits da v4 retirados |
| limites do carregador | 256 `.wgsl` / 256 KB de fonte / 64 KB `pack.json` / 32 MB de zip / 1.024 entradas; UTF-8; um manifesto; caminhos únicos — tudo inalterado |
| registro de texturas | 1.210 entradas → **896 nomes utilizáveis**; deriva vs cnty9 +1/−10 ([Registro de texturas](texture-registry.md)) → `xkg8x` (2026-11-04): 1.220 / **906 nomes utilizáveis** — as 10 remoções revertidas, 376 mudanças de id |
| curva de luz | níveis 0–15 → 0–1, ease-out (`6 → 0.45`, `12 → 0.92`) — no cabeçalho, inalterada |
| curva de lift | `1 - (1 - x / (3 - 2x))^3` — inalterada (atualmente chunk c9) |
| cone direcional | `0.12 / 0.65 / 0.62 / 0.95` — inalterado (chunk c9) |
| cor da névoa | `vec3f(183/255, 191/255, 195/255)` — inalterada |
| nomes reservados | `/^bloxd/i` (não distingue maiúsculas de minúsculas) + os 46 símbolos `bloxdSp*` do motor ([Identificadores reservados](reserved-identifiers.md)) |
| HEADER_VERSION | `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` |
| títulos strict | tudo exceto os 12 títulos allow de [Política](policy.md) (reverificados em xkg8x, inalterados) |
| construtores de cabeçalho/registro | chunk c55 (módulos 29833 + 1371 + 1391 + 1384 + 219 coordenando); no `xkg8x` o construtor é o módulo 30093 (módulo de dados 1391) |
| template de pacote padrão | chunk c116 (movido do c124 da v4), 1.683 B |

## Layout do bundle (para refazer o levantamento)

O cluster do pipeline de shaders: carregador/persistência c51–c53, construtor de validador/cabeçalho/registro c55, WebGPU/codegen c56, névoa c9. **O template de pacote padrão é o c116** (c124 na v4).

Nota sobre o formato dos chunks: cada chunk é um módulo ES (`export const modules = {...}`) — o c53 carrega tanto os módulos do c52 quanto os do próprio c53 — então a busca de texto puro no bundle continua fazendo sentido (o id de módulo `1371` vive no array esparso de módulos de *main*, em nenhum chunk).

O bundle principal tem 3,39 MB (+115 KB frente à build da v4); o mapa de chunks tem 195 IDs (188 emitidos, 7 lacunas conhecidas).

## Ledgers passados

- v4 (cnty9, 2026-10-27) → [Histórico de versões: v4](../history/v4.md)
- v3 (3ymzdd, 2026-10-19) → [Histórico de versões: v3](../history/v3.md)

## Relacionado

- [Registro de pesquisa](research-log.md) · [Cabeçalho do motor](engine-header.md) · [Política](policy.md)
