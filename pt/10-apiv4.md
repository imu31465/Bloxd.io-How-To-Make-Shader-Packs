[← Parte anterior](09-apiv3.md)·[Voltar ao manual](README.md)

# Parte X: Guia de migração para API Version 4 (2026-10-26, resumo)

> Este texto é o resumo curto neste idioma. A versão completa com todos os detalhes, receitas de exemplo e internos do motor restaurados (§55–§66) está em [inglês](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md) e [japonês](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md).

Build alvo: `cnty9.main.669f8081.js` — **em produção e pré-produção simultaneamente desde 2026-10-26** (ambas idênticas byte a byte). O modelo de pacote mantém a forma: mesmos campos de `pack.json`, mesmos limites do carregador, mesmo uniform de 64 B, os mesmos 6 hooks.

## O que muda

- `pack.json` exige `"apiVersion": 4` (igualdade `===` estrita, número) — pacotes v3 são rejeitados ao carregar.
- **Nova API de texturas (o destaque):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` amostra o atlas de texturas de blocos exatamente como a própria engine (id 0 = branco; texturas animadas devolvem automaticamente o quadro atual), `bloxdTextureSize(mipLevel) -> vec2u`, e constantes nomeadas `bloxdTextureId*` (CamelCase a partir do nome do arquivo, ex.: `grass_top` → `bloxdTextureIdGrassTop`; o catálogo oficial é `BLOCK_TEXTURES.md`).
- **Quatro novos campos de entrada** em `BloxdSurfaceIn` *e* `BloxdLightIn`: `textureId`, `textureRotation` (quartos de volta horários, que `bloxdTexel` aplica), `uv` (em blocos; `fract(uv)` é desenhado), `mipLevel`.
- **Renomeações com mudança de significado:** `fogVisibility` → `fogAlpha` com significado **invertido** (`0 = sem névoa, 1 = só fogColour`; porte: `l.fogVisibility` → `1.0 - l.fogAlpha`); `bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (corpo idêntico); `BloxdOpaqueBehind.found` → `hit`.
- **Jogos estritos agora são impostos pelo validador embutido:** um hook de vértice sem guarda ou um `discard` alcançável reporta `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...` e desativa **todos** os hooks em jogos estritos. Com envolvências `#ifndef BLOXD_STRICT`, surface/light continuam rodando.
- Todo o resto segue congelado: 6 hooks, bits de `blockFlags` (1/2/4/8/16/32), layout do uniform, limites do carregador, matriz de variantes, os 12 títulos allow (reconfirmados inalterados em `cnty9` em 2026-10-27).

## Migração rápida

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (número) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` ou `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| Hooks de vértice sem guarda | `#ifndef BLOXD_STRICT ... #endif` |

O material de referência completo agora faz parte do guia: o cabeçalho do motor restaurado por inteiro e o catálogo completo de texturas com os 905 nomes utilizáveis estão na Parte XI (`11-reference.md`). Os detalhes completos — a sutileza de rotação do `bloxdTexel`, o WGSL de amostragem restaurado, o registro de nomes, a nova estrutura de `HEADER_VERSION` com hash do registro — estão na versão completa em inglês e japonês.

[← Parte anterior](09-apiv3.md)·[Voltar ao manual](README.md)
