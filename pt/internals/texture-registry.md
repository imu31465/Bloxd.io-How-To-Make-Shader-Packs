# Internos do registro de texturas

> API alvo: 5 · Estado: Analyzed

Esta página explica como os nomes das texturas são resolvidos e referenciados pelos shader packs. Para conhecer os nomes disponíveis aos autores de packs, consulte o [catálogo de texturas](../api/texture-catalog.md).

## Constantes nomeadas

Os packs devem usar constantes nomeadas no formato `bloxdTextureId*`. Os nomes das texturas são resolvidos no registro quando o pack é carregado, portanto não é necessário fixar IDs numéricos.

**Trate os nomes como a API e não dependa de IDs numéricos.** A organização do atlas e os IDs são detalhes de implementação que podem mudar.

## Texturas animadas

Referencie texturas animadas pelo nome-base da família, não pelo número do quadro. O motor seleciona o quadro atual durante a amostragem, então o pack não precisa avançar os quadros por conta própria.

As grafias de quadros não são constantes nomeadas independentes para uso geral. Use os nomes-base listados no catálogo.

## Texturas rotacionadas

A rotação de cada face é aplicada durante a amostragem da textura. Os packs não precisam selecionar diretamente slots internos do atlas já rotacionados.

## Notas de amostragem

- Escolha nomes no [catálogo de texturas](../api/texture-catalog.md).
- Evite depender de IDs numéricos ou da organização interna do atlas.
- Em geral, deixe a animação e a rotação das faces a cargo do processo de amostragem do motor.

## Relacionado

- [API de texturas](../api/texture-api.md) — `bloxdTexel` e constantes nomeadas
- [Catálogo de texturas](../api/texture-catalog.md) — nomes de textura utilizáveis
- [Registro de pesquisa](research-log.md) — como interpretar as notas da investigação
