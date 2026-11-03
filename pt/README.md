# Documentação de shader packs do Bloxd.io

Um guia não oficial sobre shader packs para o renderizador WebGPU do Bloxd.io — da criação, implementação, validação e distribuição à especificação da API e à pesquisa dos internals do motor.

## Especificação atual

- API atual: **5** (`pack.json` deve declarar `apiVersion: 5`)
- Alvo: renderizador WebGPU
- Última verificação: 2026-11-03
- Build alvo: `ab90qa.main.6188124c.js` (produção e preprod idênticos — verificado por md5 `fc3322212d15be2445c0e8dfc9733fcc`)
- Hooks de shader: 9 (Terrain / Liquid / Model × Vertex / Surface / Light)

Novo em shader packs? Comece por [Getting Started](getting-started/) (em inglês). Consultando a API? Veja [API Reference](api/) (em inglês).

> Esta documentação não é um recurso oficial dos desenvolvedores. Os internals do motor podem mudar com atualizações — confira o build alvo e o status de verificação indicados em cada página.
>
> Este guia foi criado com assistência de IA; a precisão não é garantida. Verifique contra o comportamento real do jogo.
>
> A função de shader packs é um recurso oficial acessível pela UI do jogo, e os packs são WGSL puro (sem execução de JS, sem rede) — nada de perigoso acontece com código normal.

## Entradas por objetivo

| Objetivo | Categoria | Público |
|---|---|---|
| Criar seu primeiro pack | [Getting Started](getting-started/) | iniciantes |
| Consultar funções e campos da API | [API Reference](api/) | autores no meio da implementação |
| Implementar um efeito (luz, água, modelos…) | [Guides & Recipes](guides/) | qualquer um construindo um visual |
| Corrigir um erro | [Troubleshooting](troubleshooting/) | qualquer um com um pack quebrado |
| Pesquisar internals do motor | [Engine Internals & Research](internals/) | analistas do motor |
| Consultar versões antigas (v1–v5) | [Version History](history/) | quem migra packs antigos |

## Estrutura da documentação

- **[Getting Started](getting-started/)** — visão geral, início rápido, estrutura do pack, pack.json, os 9 hooks, variantes, validação, distribuição.
- **[API Reference](api/)** — a especificação sistemática da v5: hooks, flags, estruturas de entrada/saída, todas as funções, iluminação, API de texturas, constantes, pré-processador, restrições, compatibilidade e o catálogo de 896 nomes.
- **[Guides](guides/)** · **[Recipes](recipes/)** · **[Troubleshooting](troubleshooting/)** · **[Engine Internals & Research](internals/)** · **[Version History](history/)**

> Nota: Getting Started / API Reference / Troubleshooting e as novas páginas v5 de Guides, Recipes e Internals são oferecidos atualmente **em inglês** (mesma estrutura das páginas traduzidas desta edição). O conteúdo já traduzido permanece integralmente.

## Status de verificação

| Rótulo | Significado |
|---|---|
| Verified | verificado no build alvo |
| Analyzed | confirmado analisando a implementação interna |
| Partially Verified | confirmado apenas parcialmente |
| Experimental | experimental / não consolidado |
| Historical | material de uma versão passada |
