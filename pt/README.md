# Como criar pacotes de shaders para Bloxd.io (Guia completo)

Guia autocontido para criar e distribuir pacotes de shaders (shader packs) para Bloxd.io (somente renderizador WebGPU).
Baseado na especificação da `apiVersion: 2`. O guia está dividido em um arquivo por parte (este README é o índice; o receituário está em `3-recipes.md`). Pacotes v1 não carregam no jogo atual (valores v1 de `apiVersion` e identificadores antigos são rejeitados). Para migrar da v1, ver a Parte VIII (`8-apiv2.md`).

> Este é um guia não oficial e não representa a posição dos desenvolvedores. A API pode mudar sem aviso.  
> Última revisão: 2026-10-15 (ordem de aplicação de névoa, ajustes reais de névoa e renderização submarina verificados contra a implementação do motor). Como não foi encontrada uma referência oficial pública da API WGSL, continue verificando descrições e receitas contra a tela de carregamento e a compilação no jogo.  
> O recurso de pacotes de shaders é um recurso oficial acessível pela interface do jogo, e os pacotes são WGSL puro  
> (sem execução de JS nem rede), então nada perigoso acontece com código normal.  
> Este guia foi criado com assistência de IA; a precisão não é garantida. Verifique com o comportamento real no jogo.

## Índice

- [Parte I: Criar pacotes](1-making.md)
- [Parte II: Referência da API](2-api.md)
- [Parte III: Receituário](3-recipes.md)
- [Parte IV: Guia de realismo](4-realism.md)
- [Parte V: Solução de problemas e notas](5-troubleshooting.md)
- [Parte VI: Notas importantes de implementação](6-implementation.md)
- [Parte VII: Suplemento de interioridades](7-internals.md)
- [Parte VIII: Guia de migração para API Version 2](8-apiv2.md)
