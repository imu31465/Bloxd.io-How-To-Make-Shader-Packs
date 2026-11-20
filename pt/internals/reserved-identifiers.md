# Interioridades dos identificadores reservados

> API alvo: 5 · Build alvo: `bbb6l5` · Estado: Analyzed (restaurado dos geradores do bundle em produção)

O namespace `bloxdSp*` — símbolos que os geradores podem injetar e que os pacotes, portanto, não podem redeclarar. O resumo para autores de pacotes: [Restrições](../api/restrictions.md).

## Os 88 símbolos

De 27 no v4 a 46 no lançamento v5, e a **88** no `bbb6l5` (+42, 0 retirados; a única aposentadoria histórica foi `bloxdSpLitColour`, promovido ao público `bloxdLitColour()`):

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCasterBlocks` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellFull` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpCrossed` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEntityLight` · `bloxdSpEntityRow` · `bloxdSpExitBox` · `bloxdSpEye` · `bloxdSpFacing` · `bloxdSpFacingDot` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLit` · `bloxdSpLod` · `bloxdSpMarch` · `bloxdSpMaskBit` · `bloxdSpMaskEdge` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpNormalCode` · `bloxdSpOrigin` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpOwnTexture` · `bloxdSpPixel` · `bloxdSpPlaneTolerance` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpRayFresh` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpShadowDz` · `bloxdSpShadowEmissive` · `bloxdSpShadowEntities` · `bloxdSpShadowEntityGrids` · `bloxdSpShadowFirstPerson` · `bloxdSpShadowLight` · `bloxdSpShadowMarch` · `bloxdSpShadowMask` · `bloxdSpShadowNormal` · `bloxdSpShadowPixel` · `bloxdSpShadowPosition` · `bloxdSpShadowSpecial` · `bloxdSpShadowVolume` · `bloxdSpShadowVolumeSampler` · `bloxdSpShadowVoxels` · `bloxdSpShadowZ` · `bloxdSpSize` · `bloxdSpSunShadow` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpT` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpVolumeAt` · `bloxdSpVolumeOpenLit` · `bloxdSpVolumeOut` · `bloxdSpVolumeTexel` · `bloxdSpVolumeWork` · `bloxdSpWindowHas` · `bloxdSpWindowSlot` · `bloxdSpWord` · `bloxdSpZ`

## Nomes novos ↔ o sistema de sombras de \`bbb6l5\`

Os 42 símbolos novos vêm da implementação de sombras sol/lua do engine, que agora sustenta \`bloxdShadow()\` / \`bloxdAirShadow()\`:

- \`bloxdSpSunShadow\` / \`bloxdSpShadowVolume\` / \`bloxdSpShadowVolumeSampler\` / \`bloxdSpShadowVoxels\` — o volume de sombra solar (uma textura 3D que o engine preenche ao redor do jogador) e seu sampler
- \`bloxdSpShadowMarch\` / \`bloxdSpMarch\` / \`bloxdSpOrigin\` / \`bloxdSpRayFresh\` / \`bloxdSpExitBox\` — o ray march que resolve um raio de sombra (64 passos, teste de frescor stale-box)
- \`bloxdSpShadowMask\` / \`bloxdSpShadowPixel\` / \`bloxdSpMaskBit\` / \`bloxdSpMaskEdge\` — o caminho de textura de máscara (amostragem ciente de borda)
- \`bloxdSpEntityLight\` / \`bloxdSpShadowEntities\` / \`bloxdSpShadowEntityGrids\` / \`bloxdSpEntityRow\` / \`bloxdSpCasterBlocks\` — projeção de sombras de entidades (jogadores, mobs, itens)
- \`bloxdSpShadowPosition\` / \`bloxdSpShadowNormal\` / \`bloxdSpShadowEmissive\` / \`bloxdSpShadowFirstPerson\` / \`bloxdSpShadowLight\` / \`bloxdSpShadowDz\` / \`bloxdSpShadowZ\` / \`bloxdSpShadowSpecial\` — contexto de sombra por fragmento (as exclusões emissive e primeira pessoa)
- \`bloxdSpVolumeAt\` / \`bloxdSpVolumeOpenLit\` / \`bloxdSpVolumeTexel\` / \`bloxdSpVolumeOut\` / \`bloxdSpVolumeWork\` — consultas de volume (o caminho de \`bloxdAirShadow\`: só blocos, desfocado por bloco inteiro)
- \`bloxdSpLit\` / \`bloxdSpFacing\` / \`bloxdSpFacingDot\` / \`bloxdSpT\` / \`bloxdSpCrossed\` / \`bloxdSpNormalCode\` / \`bloxdSpCellFull\` / \`bloxdSpWindowHas\` / \`bloxdSpWindowSlot\` / \`bloxdSpOwnTexture\` / \`bloxdSpPlaneTolerance\` — locais de apoio do codegen de sombras e amostragem

## Novos nomes ↔ recursos da v5

- `bloxdSpFlags` — entrega da struct `BloxdFlags`
- `bloxdSpEnchant` / `bloxdSpItemLocalPosition` — as novas entradas (encantamento, posição local do modelo)
- `bloxdSpAcross` / `bloxdSpAt` / `bloxdSpCell` / `bloxdSpCellAt` / `bloxdSpCellIndex` / `bloxdSpSize` / `bloxdSpLevel` / `bloxdSpOwnTexel` — o caminho de pacotes de texturas com amostragem por célula
- `bloxdSpQuarterTurns` — a cadeia de rotação ([Amostragem de texturas](texture-sampling.md))
- `bloxdSpNormal` / `bloxdSpPosition` / `bloxdSpColour` / `bloxdSpOut` / `bloxdSpWord` / `bloxdSpIndex` / `bloxdSpDown` / `bloxdSpInside` — variáveis locais dos hooks estendidos

## A regra em nível de pacote

Mais ampla que este namespace: **tudo que corresponde a `/^bloxd/i` (sem diferenciar maiúsculas de minúsculas)**. Só os 9 nomes de funções hook podem ser declarados ([Erros de validação](../troubleshooting/validation.md)).

Identificadores com prefixo `bloxdTextureId` resolvem como nomes de textura com sua família de erros dedicada ([Problemas de texturas](../troubleshooting/textures.md)).

## Relacionado

- [Restrições](../api/restrictions.md) · [Amostragem de texturas](texture-sampling.md) · [Histórico de versões: v5](../history/v5.md)
