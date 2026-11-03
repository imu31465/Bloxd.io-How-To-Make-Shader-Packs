# O que muda os valores visíveis do pacote — lista de provas



O mesmo pacote renderiza distinto segundo **mundo e ajustes de jogador**. Revise ao menos estes 3 ambientes antes de distribuir:

1. **Mundo normal** (skybox default, sem overrides) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, cores padrão
2. **Mundo com skybox espacial** — bloxdSunDirection() = 0. O look do ramo `sunPresent`
3. **Mundo personalizado com `visionMinLightColour` / `skyLightColourOverride`** — escuros elevados e cores

Fontes principais de variação: `lightingOverride` (iluminação forçada) / `skyLightColourOverride`, `ambientLightColourOverride` (trocas hex) / `visionMinLightColour` ("cor mais escura visível". Implementado como um max por componente contra `uSkyLightColour` e `uAmbientLightColour` ao mesmo tempo; Night Vision o usa — os pacotes "caverna às escuras" não escurecem o previsto, e a própria cor de céu é elevada) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (presença de bloxdSunDirection()). `uSkyLightColour` padrão = (1,1,1) branco, `uAmbientLightColour` padrão = (0.25,0.25,0.30). `l.ambient` lado cena = ajuste gráfico "Ambient Lighting Intensity" (padrão 0.5). `(1.0 - l.fogAlpha)` segue os ajustes de névoa/distância de chunks do jogador. Também `cameraTint` (tinta RGBA sobre a tela toda) e `proximityFadeDistance` / `proximityFadeMinOpacity` (fade de proximidade da câmera para entidades) são fatores de variação por mundo — `cameraTint` em especial é uma passada final composta **por cima** da saída do pacote. Muitos desses ajustes também podem ser definidos pela API de script (`serverOption`) e atualizados durante a partida.
