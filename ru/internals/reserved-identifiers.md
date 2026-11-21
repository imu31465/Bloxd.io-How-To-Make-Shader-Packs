# Внутрянка зарезервированных идентификаторов

> Целевая API: 5 · Тип: техническая справка

Пространство имён `bloxdSp*` — символы, которые генераторы могут внедрять, и поэтому паки не могут их переобъявлять. Сводка для авторов паков: [Ограничения](../api/restrictions.md).

## 88 символов


`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCasterBlocks` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellFull` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpCrossed` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEntityLight` · `bloxdSpEntityRow` · `bloxdSpExitBox` · `bloxdSpEye` · `bloxdSpFacing` · `bloxdSpFacingDot` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLit` · `bloxdSpLod` · `bloxdSpMarch` · `bloxdSpMaskBit` · `bloxdSpMaskEdge` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpNormalCode` · `bloxdSpOrigin` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpOwnTexture` · `bloxdSpPixel` · `bloxdSpPlaneTolerance` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpRayFresh` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpShadowDz` · `bloxdSpShadowEmissive` · `bloxdSpShadowEntities` · `bloxdSpShadowEntityGrids` · `bloxdSpShadowFirstPerson` · `bloxdSpShadowLight` · `bloxdSpShadowMarch` · `bloxdSpShadowMask` · `bloxdSpShadowNormal` · `bloxdSpShadowPixel` · `bloxdSpShadowPosition` · `bloxdSpShadowSpecial` · `bloxdSpShadowVolume` · `bloxdSpShadowVolumeSampler` · `bloxdSpShadowVoxels` · `bloxdSpShadowZ` · `bloxdSpSize` · `bloxdSpSunShadow` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpT` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpVolumeAt` · `bloxdSpVolumeOpenLit` · `bloxdSpVolumeOut` · `bloxdSpVolumeTexel` · `bloxdSpVolumeWork` · `bloxdSpWindowHas` · `bloxdSpWindowSlot` · `bloxdSpWord` · `bloxdSpZ`


Все 42 новых символа происходят из реализации солнечных/лунных теней движка, на которой работают `bloxdShadow()` / `bloxdAirShadow()`:

- `bloxdSpSunShadow` / `bloxdSpShadowVolume` / `bloxdSpShadowVolumeSampler` / `bloxdSpShadowVoxels` — объём солнечной тени (3D-текстура, которую движок заполняет вокруг игрока) и его сэмплер
- `bloxdSpShadowMarch` / `bloxdSpMarch` / `bloxdSpOrigin` / `bloxdSpRayFresh` / `bloxdSpExitBox` — рей-марш, разрешающий теневой луч (64 шага, тест свежести stale-box)
- `bloxdSpShadowMask` / `bloxdSpShadowPixel` / `bloxdSpMaskBit` / `bloxdSpMaskEdge` — путь текстуры маски (сэмплирование с учётом краёв)
- `bloxdSpEntityLight` / `bloxdSpShadowEntities` / `bloxdSpShadowEntityGrids` / `bloxdSpEntityRow` / `bloxdSpCasterBlocks` — кастинг теней сущностей (игроки, мобы, предметы)
- `bloxdSpShadowPosition` / `bloxdSpShadowNormal` / `bloxdSpShadowEmissive` / `bloxdSpShadowFirstPerson` / `bloxdSpShadowLight` / `bloxdSpShadowDz` / `bloxdSpShadowZ` / `bloxdSpShadowSpecial` — теневой контекст на фрагмент (исключения emissive и first-person)
- `bloxdSpVolumeAt` / `bloxdSpVolumeOpenLit` / `bloxdSpVolumeTexel` / `bloxdSpVolumeOut` / `bloxdSpVolumeWork` — запросы к объёму (путь `bloxdAirShadow`: только блоки, размытие до целого блока)
- `bloxdSpLit` / `bloxdSpFacing` / `bloxdSpFacingDot` / `bloxdSpT` / `bloxdSpCrossed` / `bloxdSpNormalCode` / `bloxdSpCellFull` / `bloxdSpWindowHas` / `bloxdSpWindowSlot` / `bloxdSpOwnTexture` / `bloxdSpPlaneTolerance` — вспомогательные локали теневого и сэмплинг-кодгена

## Новые имена ↔ возможности v5

- `bloxdSpFlags` — доставка структуры `BloxdFlags`
- `bloxdSpEnchant` / `bloxdSpItemLocalPosition` — новые входы (зачарование, локальная позиция модели)
- `bloxdSpAcross` / `bloxdSpAt` / `bloxdSpCell` / `bloxdSpCellAt` / `bloxdSpCellIndex` / `bloxdSpSize` / `bloxdSpLevel` / `bloxdSpOwnTexel` — путь текстурных паков с сэмплингом по ячейкам
- `bloxdSpQuarterTurns` — цепочка поворотов ([Сэмплинг текстур](texture-sampling.md))
- `bloxdSpNormal` / `bloxdSpPosition` / `bloxdSpColour` / `bloxdSpOut` / `bloxdSpWord` / `bloxdSpIndex` / `bloxdSpDown` / `bloxdSpInside` — локальные переменные расширенных хуков

## Правило на уровне пака

Шире, чем это пространство имён: **всё, что совпадает с `/^bloxd/i` (без учёта регистра)**. Объявлять можно только 9 имён хук-функций ([Ошибки валидации](../troubleshooting/validation.md)).

Идентификаторы с префиксом `bloxdTextureId` разрешаются как имена текстур — со своим отдельным семейством ошибок ([Проблемы текстур](../troubleshooting/textures.md)).

## См. также

- [Ограничения](../api/restrictions.md) · [Сэмплинг текстур](texture-sampling.md) · [История версий: v5](../history/v5.md)
