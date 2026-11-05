# Внутрянка зарезервированных идентификаторов

> Целевой API: 5 · Целевой билд: `bny9u` · Статус: Analyzed (восстановлено из генераторов живого бандла)

Пространство имён `bloxdSp*` — символы, которые генераторы могут подставлять и которые паки поэтому не могут переобъявлять. Сводка для авторов паков: [Ограничения](../api/restrictions.md).

## 46 символов

Выросло с 27 в v4 до **46** (20 добавлено, 1 выбыл — `bloxdSpLitColour`, переведён в публичную `bloxdLitColour()`):

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

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
