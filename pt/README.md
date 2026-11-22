# Documentação de shader packs do Bloxd.io

Guia não oficial sobre shader packs para o renderizador WebGPU do Bloxd.io. Abrange todo o processo — da criação e dos testes à referência da API e à análise do funcionamento interno do motor.

## Especificação atual

- API atual: **5** (o `pack.json` deve declarar `apiVersion: 5`)
- Alvo: renderizador WebGPU
- Hooks de shader: 9 (Terrain / Liquid / Model × Vertex / Surface / Light)

Está começando com shader packs? Acesse [Primeiros passos](getting-started/). Precisa consultar uma função ou um campo? Veja a [Referência da API](api/).

> Esta documentação não é um recurso oficial dos desenvolvedores do jogo. Os mecanismos internos do motor são detalhes de implementação e podem mudar com as atualizações; consulte a referência da API para conhecer o comportamento compatível.
>
> Este guia foi preparado com auxílio de IA. Confirme o comportamento no jogo, pois os detalhes de implementação podem mudar.
>
> Os packs são escritos apenas em WGSL: não executam JavaScript nem fazem requisições de rede.

## Entradas por objetivo

| Objetivo | Categoria | Público |
|---|---|---|
| Criar seu primeiro shader pack | [Primeiros passos](getting-started/) | autores de packs iniciantes |
| Consultar funções e campos da API | [Referência da API](api/) | autores no meio da implementação |
| Implementar um efeito (luz, água, modelos…) | [Guias](guides/) · [Receitas](recipes/) | quem quer definir uma aparência visual |
| Corrigir um erro | [Solução de problemas](troubleshooting/) | qualquer um com um pack quebrado |
| Pesquisar funcionamento interno do motor | [Funcionamento interno do motor](internals/) | analistas do motor |
| Consultar versões antigas (v1–v5) | [Histórico de versões](history/) | quem migra packs antigos |

## Mapa da documentação

- **[Primeiros passos](getting-started/)** — visão geral, início rápido, estrutura do pacote, pack.json, os 9 hooks, variantes, validação, distribuição.
- **[Referência da API](api/)** — a especificação sistemática da v5: hooks, flags, estruturas de entrada/saída, todas as funções, iluminação, API de texturas, constantes, pré-processador, restrições, compatibilidade e o catálogo de 1.017 identificadores de textura.
- **[Guias](guides/)** — como funciona a iluminação, sombras, água, noite, renderização de modelos, desempenho, conceitos de realismo.
- **[Receitas](recipes/)** — exemplos de código orientados a objetivo: cores, iluminação, emissão, coordenadas, animação, líquidos, vértices, matemática, realismo, shaders de modelo, efeitos de encantamento.
- **[Solução de problemas](troubleshooting/)** — resolução de erros por sintoma: carregamento, versão de API, compilação, validação, variantes, visual, texturas, iluminação, modelos, desempenho.
- **[Funcionamento interno do motor](internals/)** — pipeline de renderização, invocação de hooks, cabeçalho do motor, detalhes internos de validação e compilação, identificadores reservados, mecanismos internos de iluminação e neblina, amostragem e registro de texturas, renderização de modelos, dados medidos.
- **[Histórico de versões](history/)** — de v1 a v5: mudanças por versão, passos de migração, APIs removidas.

## Rótulos de status de verificação

Cada página informa a versão da API que abrange e o estado de verificação do conteúdo.

| Rótulo | Significado |
|---|---|
| Verified | verificado no jogo |
| Analyzed | confirmado analisando a implementação interna |
| Partially Verified | confirmado apenas parcialmente |
| Experimental | experimental / não consolidado |
| Historical | material de uma versão passada |

Os dados extraídos do motor (cabeçalho, registro e medições) estão disponíveis em [Funcionamento interno do motor](internals/); a metodologia e os registros correspondentes estão no [registro de pesquisa](internals/research-log.md).
