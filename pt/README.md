# Documentação de shader packs do Bloxd.io

Um guia não oficial sobre shader packs para o renderizador WebGPU do Bloxd.io — da criação, implementação, validação e distribuição de pacotes à especificação da API e à pesquisa dos internals do motor.

## Especificação atual

- API atual: **5** (o `pack.json` deve declarar `apiVersion: 5`)
- Alvo: renderizador WebGPU
- Última verificação: 2026-11-05
- Build alvo: `v98qt8.main.62d8d238.js` (produção e preprod, verificado em 2026-11-08, bundle idêntico byte a byte, md5 `7458fd47ff88331d9f451d1456ff48ac` — registro, cabeçalho, hooks e limites remedidos)
- Hooks de shader: 9 (Terrain / Liquid / Model × Vertex / Surface / Light)

Novo em shader packs? Comece por [Primeiros passos](getting-started/). Consultando a API? Veja [Referência da API](api/).

> Esta documentação não é um recurso oficial dos desenvolvedores do jogo. Os internals do motor podem mudar com atualizações — confira o build alvo e o status de verificação indicados em cada página.
>
> Este guia foi criado com assistência de IA; a precisão não é garantida. Verifique contra o comportamento real do jogo. Continue verificando as receitas contra a tela do carregador e a compilação no jogo.
>
> A função de shader packs em si é um recurso oficial acessível pela interface do jogo, e os packs são WGSL puro (sem execução de JS, sem rede) — nada de perigoso acontece com código normal.

## Entradas por objetivo

| Objetivo | Categoria | Público |
|---|---|---|
| Criar seu primeiro shader pack | [Primeiros passos](getting-started/) | autores de packs iniciantes |
| Consultar funções e campos da API | [Referência da API](api/) | autores no meio da implementação |
| Implementar um efeito (luz, água, modelos…) | [Guias](guides/) · [Receitas](recipes/) | qualquer um construindo um look |
| Corrigir um erro | [Solução de problemas](troubleshooting/) | qualquer um com um pack quebrado |
| Pesquisar internals do motor | [Interior do motor e pesquisa](internals/) | analistas do motor |
| Consultar versões antigas (v1–v5) | [Histórico de versões](history/) | quem migra packs antigos |

## Mapa da documentação

- **[Primeiros passos](getting-started/)** — visão geral, início rápido, estrutura do pacote, pack.json, os 9 hooks, variantes, validação, distribuição. Um tutorial de pista única até seu primeiro pack.
- **[Referência da API](api/)** — a especificação sistemática da v5: hooks, flags, estruturas de entrada/saída, todas as funções, iluminação, API de texturas, constantes, pré-processador, restrições, compatibilidade e o catálogo de 911 nomes.
- **[Guias](guides/)** — como funciona a iluminação, sombras, água, noite, renderização de modelos, desempenho, conceitos de realismo.
- **[Receitas](recipes/)** — exemplos de código orientados a objetivo: cores, iluminação, emissão, coordenadas, animação, líquidos, vértices, matemática, realismo, shaders de modelo, efeitos de encantamento.
- **[Solução de problemas](troubleshooting/)** — resolução de erros por sintoma: carregamento, versão de API, compilação, validação, variantes, visual, texturas, iluminação, modelos, desempenho.
- **[Interior do motor e pesquisa](internals/)** — pipeline de renderização, invocação de hooks, cabeçalho do motor, internals de validação e compilação, identificadores reservados, internals de iluminação/névoa, amostragem e registro de texturas, renderização de modelos, dados medidos.
- **[Histórico de versões](history/)** — de v1 a v5: mudanças por versão, passos de migração, APIs removidas.

## Rótulos de status de verificação

Cada página anota sua versão de API alvo, build, data da última verificação e status.

| Rótulo | Significado |
|---|---|
| Verified | verificado no dispositivo / no build alvo |
| Analyzed | confirmado analisando a implementação interna |
| Partially Verified | confirmado apenas parcialmente |
| Experimental | experimental / não consolidado |
| Historical | material de uma versão passada |

Os dados brutos extraídos do motor (cabeçalho, registro, medições) vivem em [Interior do motor e pesquisa](internals/); a metodologia e os registros por trás deles são acompanhados no [registro de pesquisa](internals/research-log.md).
