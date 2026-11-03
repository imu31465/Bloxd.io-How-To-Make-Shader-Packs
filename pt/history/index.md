# Histórico de versões

> Estado: Historical — registros versão por versão; cada guia indica a própria build alvo

Mudanças, etapas de migração e APIs removidas da v1 à v5. Para migrar pacotes antigos e para as especificações preservadas de cada época.

## Cronologia

| Versão | Em produção desde | Guia | Destaques |
|---|---|---|---|
| v1 | (inicial) | [v1](v1.md) | primeira API de pacotes de shaders. 6 hooks (terrain/liquid × vertex/surface); vocabulário `bloxdTime` / `bloxdOriginOffset` / `bloxdFaceBlock` / `engineColour` / `fogFactor` |
| v2 | — | [v2](v2.md) | renomeação total de identificadores, `blockId`, `BLOXD_SCENE_DEPTH` e `bloxdOpaqueBehind()` |
| v3 | 2026-10-19 | [v3](v3.md) | `blockId` → `blockFlags` (flags de bits), `bloxdPi` / `bloxdTau`, hooks de líquido oficiais, interioridades da invocação de hooks |
| v4 | 2026-10-26 | [v4](v4.md) | API de texturas (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`), o contrato strict, análise do cabeçalho e do registro do motor |
| **v5** | **2026-11-03** | [v5](v5.md) | **atual** — struct `BloxdFlags` (14 bools), hooks de Model (9 no total), a API de iluminação `bloxdLit()` / `bloxdLitColour()`, `localPosition`, entradas e saídas de encantamento/sobreposição, 6 variantes |

## O prefácio comum

O jogo atual aceita apenas `apiVersion: 5` e **pacotes de versões antigas falham no instante do carregamento** (pacotes salvos são silenciosamente desativados — [Compatibilidade](../api/compatibility.md)). Cada guia cobre "anterior → próxima". Vai cruzar várias versões? Aplique-as da mais antiga para a mais nova.

## Caminho rápido para uma lista de verificação

- pacote v4 → [guia da v5](v5.md) §77 (quase tudo mecânico)
- pacote v3 → [v4](v4.md) §61 → [v5](v5.md) §77
- pacote v2 → [v3](v3.md) §47 → v4 → v5
- pacote v1 → comece pela [v2](v2.md) §37

> Para a especificação atual em si, veja a [Referência da API](../api/); para as interioridades da build atual, veja [Interioridades do motor](../internals/).
