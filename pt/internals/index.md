# Internas do motor

Esta categoria explica o funcionamento interno do motor e pode ajudar a compreender como os shader packs são executados. Esses detalhes de implementação podem mudar; para regras de uso estáveis e APIs disponíveis, consulte a [Referência da API](../api/).

## Mapa

| Página | Conteúdo |
|---|---|
| [Pipeline de renderização](rendering-pipeline.md) | posição do alphaTest, montagem de 2 luzes, realidade do uniform, greedy meshing |
| [Invocação de hooks](hook-invocation.md) | como os hooks são enxertados no WGSL do motor |
| [Cabeçalho do motor](engine-header.md) | Declarações WGSL adicionadas aos shader packs |
| [Validação de shaders](shader-validation.md) | interioridades do analisador, a tabela de assinaturas, HEADER_VERSION |
| [Compilação de WGSL](wgsl-compilation.md) | a compilação real da etapa 2 e os stubs de validação |
| [Identificadores reservados](reserved-identifiers.md) | os 46 símbolos `bloxdSp*` |
| [Interioridades da iluminação](lighting-internals.md) | estrutura de blockLight / heldLight |
| [Interioridades da névoa](fog-internals.md) | só linear, a faixa de gradiente de 32 blocos |
| [Amostragem de texturas](texture-sampling.md) | o codegen de texturas de 3 variantes |
| [Registro de texturas](texture-registry.md) | Resolução de nomes e nomes de animação e rotação |
| [Renderização de modelos](model-rendering.md) | o programa Model da v5 |
| [Dados do motor](engine-data.md) | Recursos da API v5 e limites dos packs |
| [Fatores de teste](testing-factors.md) | que ajustes de mundo/jogador mudam os valores visíveis aos pacotes |
| [Política](policy.md) | shaderPackPolicy — os 12 títulos allow |
| [Sol e lua](sun-and-moon.md) | o que alimenta bloxdSunDirection |
| [Depuração](debugging.md) | parâmetros de URL, painéis de estatísticas |


Os detalhes internos não constituem um contrato de API estável. Ao criar packs, priorize a [Referência da API](../api/).
