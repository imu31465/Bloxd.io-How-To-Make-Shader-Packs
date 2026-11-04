# Problemas de texturas

> API alvo: 5 · Build alvo: `xkg8x` · Estado: Verified (mensagens registradas literalmente do validador em produção)

Problemas em torno de `bloxdTextureId*` / `bloxdTexel`. Pesquise os 896 nomes no [catálogo de texturas](../api/texture-catalog.md).

## "There's no texture called X. Did you mean bloxdTextureIdY?"

- **Causa**: um erro de grafia; o validador tem **sugestões de Levenshtein** (limiar `max(2, floor(len/4)) + 1`)
- **Correção**: aceite a sugestão; confira no [catálogo](../api/texture-catalog.md)
- **Prevenção**: copie e cole os nomes do catálogo

## "...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates."

- **Causa**: escrever um **número de quadro** em uma textura animada (`lava0` etc.)
- **Correção**: use o nome base — a amostragem devolve o quadro atual automaticamente
- **Prevenção**: nunca escreva sufixos de quadro para as 42 famílias de animação ([nomenclatura](../api/texture-api.md#regras-de-grafia-e-liberdade-de-nomes))

## "...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, ..."

- **Causa**: escrever a grafia de cópia girada de uma família de rotação (`[rot[N`)
- **Correção**: use o nome raiz — `bloxdTexel` reaplica a rotação

## "...could name X and Y, which differ only by case or underscores, so it can't be used."

- **Causa**: o folding sem distinção de maiúsculas/underscores deixou o nome **ambíguo**
- **Correção**: desambigue a grafia

## "bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?"

- **Causa**: erro de grafia no prefixo (ex. `bloxdTextureID`, `bloxdtextureid`)
- **Correção**: comece os nomes exatamente com `bloxdTextureId`

## "Case and underscores are not distinguished" — como as duas regras coexistem?

A resolução de nomes faz folding de maiúsculas e `_`, então `bloxdTextureId_grass_top` e `bloxdTextureIdGrassTop` resolvem para a **mesma** constante. Só quando o folding deixa múltiplos candidatos o erro dedicado de ambiguidade dispara ([regras de nomenclatura](../api/texture-api.md#regras-de-grafia-e-liberdade-de-nomes)).

## bloxdTexel sempre devolve branco em modelos

- **Por design**: a maioria dos modelos usa `textureId: 0` (sem textura — skins de jogador etc.); `bloxdTexel(0, ...)` devolve `vec4f(1.0)`
- **Correção**: selecione com `surface.textureId != 0u` ([texturas próprias do modelo](../api/texture-api.md#texturas-próprias-do-modelo-textureid-0))

## Querer adicionar texturas

- **Limite**: a API de pacotes de shaders apenas **lê** o atlas; adicionar texturas é trabalho do sistema de pacotes de texturas ([combinações](../guides/combinations.md))

## "Packs can't use X: the engine binds every texture and sampler..."

- **Causa**: declarar tipos `texture_*` / `sampler` diretamente
- **Correção**: passe por `bloxdTexel()` ([Restrições](../api/restrictions.md))

## Ids crus quebraram após uma atualização do jogo

- **Causa**: **ids são fotografias** — medido, 334 de 905 nomes sobreviventes mudaram de id entre duas builds
- **Correção**: escreva `bloxdTextureIdLava`, não `19` ([nomes são a API](../api/texture-catalog.md#deriva-medida-cnty9--ab90qa))

## Relacionado

- [API de texturas](../api/texture-api.md) · [Catálogo de texturas](../api/texture-catalog.md) · [Interioridades do registro de texturas](../internals/texture-registry.md)
