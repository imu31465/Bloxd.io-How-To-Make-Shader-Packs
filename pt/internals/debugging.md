# Meios de depuração



- Parâmetro URL `?renderer=lite` — força o renderizador Lite (`?renderer=webgl2` / `babylon` também valem; `babylon` = nome antigo do webgl2). A prioridade: parâmetro URL > localStorage `bloxdRenderer` > tela de configurações > padrão (webgl2). Valores inválidos são ignorados com um aviso. Overrides remanescentes na URL ou no localStorage podem quebrar cenas que exigem WebGPU (lite) com `needs the new WebGPU renderer, so remove the renderer override...` ([Parte V](../troubleshooting/) §17)
- Parâmetro URL `?vconsole` — consola em tela (VConsole). Útil em verificação móvel real
- Parâmetro URL `?drawcalls=1` — adiciona um painel de depuração de estatísticas de draw. Selecione objetos de jogo na consola de depuração, ou use `drawCalls()` / `why()` / `configureDrawCallWatching()`, para inspecionar o overdraw de mecanismos grandes (do pacote ou não) e a aproximação do teto de ~65.000 vértices por draw — útil para isolar gargalos de desempenho
- A consola mostra `noa-engine v0.33.0` e `Renderer: lite from <fonte>` — revise-os primeiro para não diagnosticar mal a via de render
- O renderizador WebGPU bloqueia-se "forçado ON" com pacote aplicado. O ajuste "Disable Block Texture Atlas" também se bloqueia (o atlas fica ON), e em ambientes sem WebGPU o pacote nem aplica. Base para escrever "precisa navegador WebGPU" em páginas de distribuição
- As texturas de blocos são uma textura de array 2D (`texture_2d_array`), e o sampler do terreno é nearest + repeat. O mesher também funde faces com material / AO / luz idênticos num retângulo (**greedy meshing**), então a UV de uma face fundida pode exceder a largura de um tile (bordas recuadas em 0.0015). O endereçamento repeat do hardware cuida do encaixe, então faces fundidas parecem sem costura. Note que um detalhe procedural atrelado à `vUV` pode quebrar nas fronteiras de fusão — prefira atrelá-lo à posição de mundo (`s.position` + `bloxdRenderOffset()`)
- A revalidação runtime por partida (`checkCompilation`) compila materiais de terreno reais em WebGPU do navegador (mais estrita que a validação estática de ajustes). Os pacotes que falham aqui se excluem desse jogo
