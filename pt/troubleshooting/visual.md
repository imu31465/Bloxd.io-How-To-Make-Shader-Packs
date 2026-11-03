# Problemas visuais

> API alvo: 5 · Estado: Verified

Compila bem, mas o visual fica errado.

## A distância fica branca/brumosa

- **Causa**: névoa dupla. A saída padrão do hook light **já vem com névoa** (`bloxdApplyFog(lit + emission, light)`), então misturar mais cor de névoa por cima dobra o efeito
- **Correção**: mantenha a névoa própria sutil; considere perspectiva aérea só de dessaturação ([receitas de realismo](../recipes/realism.md))
- **Prevenção**: entenda a semântica de `fogAlpha` (0 = sem névoa, 1 = só fogColour) e o [pipeline](../api/lighting.md#o-pipeline-completo) antes de escrever névoa

## pow(l.skyLight, γ) nunca escurece sombras

- **Causa**: `skyLight` chega pós-curva de lift (o cru 0.87 chega como 0.97); o gama não consegue competir matematicamente
- **Correção**: mude para inversão do lift + limiar ([Sombras](../guides/shadows.md))

## Blocos ficam quase brancos puros

- **Causa**: a saída do hook light supera 1.0 (não existe clamp depois da saída)
- **Correção**: acrescente `clamp(col, vec3f(0.0), vec3f(1.0))`

## Branco sem somas

- **Causa**: inversão un-fog por divisão
- **Correção**: abandone o un-fog; reconstrua desde `s.colour` e aplique névoa exatamente uma vez ao final (ou via `bloxdApplyFog`)

## Blocos brilhantes não brilham (pacotes de reconstrução)

- **Causa**: falta a re-soma de emission — descartar a saída padrão significa somar emission você mesmo
- **Correção**: some `+ s.emission * (1.0 - l.fogAlpha)`; na v5, a composição `bloxdLitColour()` + emission + `bloxdApplyFog` é a mais segura ([Iluminação](../api/lighting.md))

## Ondas/padrões cortados em trocas de chunk ou de origem

- **Causa**: usar posições do espaço de render diretamente — a origem se move com o jogador
- **Correção**: use `bloxdWorldPosition(position)` para efeitos dependentes do mundo ([Coordenadas](../recipes/coordinates.md)); note os limites de precisão do f32 longe da origem

## Padrões da superfície da água desalinhados em faces rotacionadas

- **Causa**: `bloxdTexel` aplica a própria `textureRotation` do fragmento ao seu uv ([a sutileza da rotação](../api/texture-api.md#a-sutileza-da-rotação--um-sampler-neutro))
- **Correção**: pré-rotacione com o auxiliar `texelNeutral`

## Brilho de encantamento / clarão de dano desapareceu

- **Causa**: iluminação própria reconstruída sem repassar `enchantColour` / `overlayColour`
- **Correção**: repasse-os ou use `bloxdLitColour()` ([Efeitos de encantamento](../recipes/enchant-effects.md))
- **v5**: `bloxdDefaultSurface` repassa ambos inalterados, então os padrões nunca os perdem

## Céu, nuvens ou o disco solar sem efeito

- **Por design**: os hooks cobrem apenas terrain / liquid / model ([Looks inalcançáveis](../guides/constraints.md))

## Relacionado

- [Problemas de iluminação](lighting.md) · [Dicas de depuração](../guides/debugging.md) · [Interioridades da névoa](../internals/fog-internals.md)
