# Interior do motor e pesquisa

Especificações internas restauradas analisando a implementação do motor. Tudo aqui foi recuperado diretamente do JavaScript da build de produção atual (`ab90qa`). Separado da documentação da API pública ([Referência da API](../api/)) para preservar o comportamento interno exato e os resultados da análise.

## Mapa

| Página | Conteúdo |
|---|---|
| [Pipeline de renderização](rendering-pipeline.md) | posição do alphaTest, montagem de 2 luzes, realidade do uniform, greedy meshing |
| [Invocação de hooks](hook-invocation.md) | como os hooks são enxertados no WGSL do motor |
| [Cabeçalho do motor](engine-header.md) | o cabeçalho v5 completo (verbatim, 8,954B) |
| [Validação de shaders](shader-validation.md) | interioridades do analisador, a tabela de assinaturas, HEADER_VERSION |
| [Compilação de WGSL](wgsl-compilation.md) | a compilação real da etapa 2 e os stubs de validação |
| [Identificadores reservados](reserved-identifiers.md) | os 46 símbolos `bloxdSp*` |
| [Interioridades da iluminação](lighting-internals.md) | estrutura de blockLight / heldLight |
| [Interioridades da névoa](fog-internals.md) | só linear, a faixa de gradiente de 32 blocos |
| [Amostragem de texturas](texture-sampling.md) | o codegen de texturas de 3 variantes |
| [Registro de texturas](texture-registry.md) | resolução nome→id, 896 nomes, deriva medida |
| [Renderização de modelos](model-rendering.md) | o programa Model da v5 |
| [Dados do motor](engine-data.md) | o ledger de constantes/limites/layout da v5 |
| [Fatores de teste](testing-factors.md) | que ajustes de mundo/jogador mudam os valores visíveis aos pacotes |
| [Política](policy.md) | shaderPackPolicy — os 12 títulos allow |
| [Sol e lua](sun-and-moon.md) | o que alimenta bloxdSunDirection |
| [Depuração](debugging.md) | parâmetros de URL, painéis de estatísticas |
| [Registro de pesquisa](research-log.md) | metodologia, histórico de builds, itens não verificados |

> API alvo: 5 · Build alvo: `ab90qa` (verificado em produção 2026-11-03)

As interioridades não são um contrato de API estável — elas podem mudar com as atualizações do motor, e cada página nomeia sua build de evidência ([registro de pesquisa](research-log.md)).
