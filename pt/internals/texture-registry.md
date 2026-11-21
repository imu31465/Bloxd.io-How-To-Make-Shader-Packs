# Como funciona o registro de texturas

> API alvo: 5 · Uso: referências a texturas por nome

Os shader packs referenciam texturas por constantes nomeadas, e não por IDs numéricos. As constantes usam o formato `bloxdTextureId<Name>`. Consulte o [Catálogo de texturas](../api/texture-catalog.md) para ver os nomes disponíveis.

## Resolução de nomes

Ao carregar um pack, o carregador resolve cada constante nomeada usando os nomes de textura disponíveis. Se a organização interna mudar, mas o nome continuar disponível, o pack poderá continuar referenciando essa textura pelo nome.

**Não escreva IDs numéricos de textura diretamente em WGSL.** Os IDs internos e as posições no atlas podem mudar quando o conteúdo do jogo é atualizado. As constantes nomeadas mantêm o código do pack independente dessas posições internas.

## Animação e rotação

- **Animação:** Use o nome-base, como `lava`, em vez das grafias de quadro, como `lava0`–`lava7`. A amostragem seleciona o quadro atual.
- **Rotação:** Use o nome-base listado no catálogo em vez dos slots internos de rotação. A amostragem aplica a rotação da face.
- **Transições entre quadros:** O motor possui slots internos para interpolar quadros de animação adjacentes. Os packs devem continuar usando as constantes nomeadas habituais.

## Relacionado

- [Catálogo de texturas](../api/texture-catalog.md) — nomes e constantes disponíveis
- [API de texturas](../api/texture-api.md) — consulta e amostragem de texturas
- [Interior da amostragem de texturas](texture-sampling.md) — como funciona a amostragem
