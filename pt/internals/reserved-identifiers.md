# Interioridades dos identificadores reservados

> API alvo: 5 · Build alvo: `ab90qa` · Estado: Analyzed (restaurado dos geradores do bundle em produção)

O namespace `bloxdSp*` — símbolos que os geradores podem injetar e que os pacotes, portanto, não podem redeclarar. O resumo para autores de pacotes: [Restrições](../api/restrictions.md).

## Os 46 símbolos

Cresceu dos 27 da v4 para **46** (20 adicionados, 1 retirado — `bloxdSpLitColour`, promovido à pública `bloxdLitColour()`):

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

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
