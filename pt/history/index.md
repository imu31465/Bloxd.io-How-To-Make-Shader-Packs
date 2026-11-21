# Histórico de versões

> Tipo: histórico · Guias de migração da API v1–v5

Esta seção preserva as mudanças, os passos de migração e as APIs removidas das versões v1 a v5. O foco é o comportamento da API e os caminhos de migração, não identificadores de build ou datas de verificação.

## Versões

| Versão | Guia de migração | Principais mudanças |
|---|---|---|
| v1 | [v1](v1.md) | API inicial de shader packs |
| v2 | [v2](v2.md) | Renomeação de identificadores, `blockId` e acesso à profundidade da cena |
| v3 | [v3](v3.md) | `blockFlags`, `bloxdPi` / `bloxdTau` e hooks Liquid |
| v4 | [v4](v4.md) | API de texturas e restrições de jogos strict |
| **v5** | [v5](v5.md) | **Atual** — `BloxdFlags`, hooks Model e APIs de iluminação e sombras |

## Como as versões antigas são tratadas

O jogo atual aceita apenas packs com `apiVersion: 5`. Packs antigos não podem ser carregados sem alterações. Para migrar entre várias versões, aplique os guias em ordem, começando pela versão mais antiga.

## Caminhos de migração

- Pack v4 → [guia de migração v5](v5.md)
- Pack v3 → [v4](v4.md) → [v5](v5.md)
- Pack v2 → [v3](v3.md) → [v4](v4.md) → [v5](v5.md)
- Pack v1 → [v2](v2.md) → [v3](v3.md) → [v4](v4.md) → [v5](v5.md)

Para consultar a API atual, veja a [Referência da API](../api/).
