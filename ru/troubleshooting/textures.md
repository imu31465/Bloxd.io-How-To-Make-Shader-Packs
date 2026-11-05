# Проблемы текстур

> Целевой API: 5 · Целевой билд: `bny9u` · Статус: Verified (сообщения записаны дословно с живого валидатора)

Проблемы вокруг `bloxdTextureId*` / `bloxdTexel`. Все 896 имён ищите в [каталоге текстур](../api/texture-catalog.md).

## "There's no texture called X. Did you mean bloxdTextureIdY?"

- **Причина**: опечатка; у валидатора есть **подсказки Левенштейна** (порог `max(2, floor(len/4)) + 1`)
- **Исправление**: примите подсказку; сверьтесь с [каталогом](../api/texture-catalog.md)
- **Профилактика**: копируйте имена из каталога

## "...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates."

- **Причина**: написан **номер кадра** у анимированной текстуры (`lava0` и т.п.)
- **Исправление**: используйте базовое имя — сэмплинг автоматически возвращает текущий кадр
- **Профилактика**: никогда не пишите суффиксы кадров для 42 семейств анимаций ([правила имён](../api/texture-api.md#правила-правописания-и-свобода-именования))

## "...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, ..."

- **Причина**: написано имя повёрнутой копии из семейства поворотов (`[rot[N`)
- **Исправление**: используйте корневое имя — `bloxdTexel` заново применяет поворот

## "...could name X and Y, which differ only by case or underscores, so it can't be used."

- **Причина**: свёртка, нечувствительная к регистру и подчёркиваниям, оставила имя **неоднозначным**
- **Исправление**: устраните неоднозначность написания

## "bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?"

- **Причина**: опечатка в префиксе (напр. `bloxdTextureID`, `bloxdtextureid`)
- **Исправление**: начинайте имена ровно с `bloxdTextureId`

## "Case and underscores are not distinguished" — как сосуществуют оба правила?

Разрешение имён сворачивает регистр и `_`, поэтому `bloxdTextureId_grass_top` и `bloxdTextureIdGrassTop` резолвятся в **одну и ту же** константу. Специальная ошибка неоднозначности срабатывает, только когда свёртка оставляет несколько кандидатов ([правила имён](../api/texture-api.md#правила-правописания-и-свобода-именования)).

## bloxdTexel на моделях всегда возвращает белый

- **Так задумано**: большинство моделей используют `textureId: 0` (без текстуры — скины игроков и т.п.); `bloxdTexel(0, ...)` возвращает `vec4f(1.0)`
- **Исправление**: отбирайте условием `surface.textureId != 0u` ([текстуры, принадлежащие моделям](../api/texture-api.md#собственные-текстуры-моделей-textureid-0))

## Хотите добавить текстуры

- **Предел**: API шейдер-паков только **читает** атлас; добавление текстур — дело системы текстурных паков ([комбинирование](../guides/combinations.md))

## "Packs can't use X: the engine binds every texture and sampler..."

- **Причина**: прямое объявление типов `texture_*` / `sampler`
- **Исправление**: идите через `bloxdTexel()` ([Ограничения](../api/restrictions.md))

## Сырые id сломались после обновления игры

- **Причина**: **id — это снимки**: по измерениям, 334 из 905 выживших имён сменили id между двумя билдами
- **Исправление**: пишите `bloxdTextureIdLava`, а не `19` ([имена — это API](../api/texture-catalog.md#измеренный-дрейф-cnty9--ab90qa))

## Смотрите также

- [API текстур](../api/texture-api.md) · [Каталог текстур](../api/texture-catalog.md) · [Внутрянка реестра текстур](../internals/texture-registry.md)
