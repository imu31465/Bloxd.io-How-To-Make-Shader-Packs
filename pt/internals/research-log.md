# Registro de pesquisa

> Estado: Analyzed

Esta página explica como interpretar as notas técnicas sobre a implementação do jogo. O comportamento interno não é um contrato público da API e pode mudar com as atualizações.

## Princípios de pesquisa

1. **Verificar o comportamento observável** — comparar a documentação com a validação no jogo e o comportamento em tempo de execução.
2. **Separar implementação e API** — distinguir os recursos disponíveis para os shader packs dos mecanismos usados apenas dentro do motor.
3. **Descrever a origem das conclusões** — indicar qual operação do motor sustenta um valor ou comportamento documentado.
4. **Não apresentar inferências como fatos** — separar observações, interpretações e questões em aberto.
5. **Não confundir horário de observação com horário de distribuição** — uma verificação feita durante uma investigação não comprova quando um recurso foi disponibilizado.

## Páginas de referência

| Página | Conteúdo |
|---|---|
| [Cabeçalho do motor](engine-header.md) | Tipos, funções e constantes adicionados aos packs |
| [Validação de shaders](shader-validation.md) | Regras de validação dos packs |
| [Compilação WGSL](wgsl-compilation.md) | Comportamento da compilação |
| [Registro de texturas](texture-registry.md) | Resolução e amostragem de nomes de textura |
| [Política por jogo](policy.md) | Restrições de cada jogo |
| [Resumo dos dados do motor](engine-data.md) | API visível para os packs |

## Limitações

- Não há garantia de que funções e estruturas internas permaneçam disponíveis.
- A organização do bundle e os identificadores internos não fazem parte da especificação da API.
- Prefira as APIs documentadas para os packs em vez de depender de detalhes privados da implementação.
