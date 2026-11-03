# Внутрянка вызова хуков

> Целевой API: 5 · Целевой билд: `ab90qa` · Статус: Analyzed (восстановлено из продакшн-бандла — Lite-рендерер; интегрированный исходный файл `lite/terrainShaderPack.ts` сохранился в строках ошибок)

Как движок вызывает хуки во время выполнения. Это ничего не меняет в коде, который вы пишете, но убирает догадки о том, что получают хуки.

## Архитектура врезки

Рендерер не «вызывает» хуки из JavaScript. Как только пак проходит валидацию, движок **вживляет вызовы ваших хуков в собственный WGSL террейна, заменяя фиксированные якорные строки в тексте шейдера**. Каждый якорь должен совпасть ровно один раз — ноль или несколько совпадений прерывают работу с `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Стадия | Якорь в шейдере движка | Что вживляется |
|---|---|---|
| vertex | блок от `let worldPos = …` до `vertexOutputs.vNormalW = …` | собрать `BloxdVertexIn`, вызвать vertex-хук, записать `worldPos` обратно (заодно переписав `let worldPos` в `var worldPos`) |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | собрать `BloxdSurfaceIn`, вызвать surface-хук, записать `baseColor` / `alpha` обратно |
| lit color | прямо перед смешиванием с туманом | захватывает цвет до тумана (v3 использовала временную `bloxdSpLitColour` — v5 повышает эту роль до публичной функции заголовка `bloxdLitColour()`) |
| light | `return color;` в конце фрагментного шейдера | собрать `BloxdLightIn`, вызвать light-хук, записать `color` обратно — после смешивания с туманом |

## Что диктует врезка

- **strict-террейн игнорирует изменения alpha из surface-хука.** Запись `alpha = bloxdSpSurface.alpha` вживляется только для жидкостной программы или не-strict вариантов — реализация, стоящая за таблицей макросов ([Препроцессор](../api/preprocessor.md))
- **strict-вариант, объявляющий vertex-хук, никогда его не запускает.** Движок сообщает об этом во время сборки: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. Отсюда `#ifndef BLOXD_STRICT` в шаблоне
- **Идентификаторы `bloxdSp*`** — временные переменные движка: невидимы для вашего кода, но присутствуют в диагностике и в результатах обратной разработки ([Зарезервированные идентификаторы](reserved-identifiers.md) — 46 в v5)
- **Сокращение для дефолтного surface.** Если surface-хук варианта — буквально `bloxdDefaultSurface`, движок целиком пропускает вживление записи `baseColor` / `alpha` — дефолт и так выдаёт эти значения, так что присваивания были бы мёртвым кодом. **Неизменённые цепочки хуков ничего не стоят**

## Что изменилось в v5

Архитектура врезки существовала ещё в рендерере v2 и оставалась стабильной при переходе v2 → v3 (v3 лишь заменила `vBlockId` → `vBlockFlags` и добавила жидкостный вариант). Изменения v5:

- `vBlockFlags` (биты) → **структура `BloxdFlags`** (доставляется через `bloxdSpFlags`)
- захват `litColour` перешёл из внутренности движка в **публичный API** (`bloxdLitColour()` — повышенный `bloxdSpLitColour` из v4)
- `BloxdLightIn` получил `diffuse` / `emissive`, а `bloxdShading()` заново собирает отклик материала ([Освещение](../api/lighting.md))
- доставка `localPosition` (`bloxdSpItemLocalPosition`), входов зачарования (`bloxdSpEnchant`) и `overlayColour` ([Рендеринг моделей](model-rendering.md))
- `fogVisibility` → **`fogAlpha`** (инвертирован)
- программа Model вошла в матрицу вариантов (3 программы × 2 режима = 6 вариантов)

## Что питает BloxdLightIn (по полям)

| Поле | Источник на стороне движка |
|---|---|
| `litColour` | цвет фрагмента, захваченный прямо перед смешиванием с туманом — «before emission and fog» в терминах заголовка |
| `directional` | интерполированная по вершинам сумма ламбертов по каждому направленному свету (сетап из двух источников в [Пайплайне рендеринга](rendering-pipeline.md)) |
| `diffuse` / `emissive` | направленный RGB-отклик материала / RGB-свечение |
| `ambient` | `material.ambient × sceneAmbient` — по материалу, на кадр |
| `blockLight` / `skyLight` | декодированные varying уровней света ([Внутрянка освещения](lighting-internals.md)) |
| `ambientLightColour` / `skyLightColour` | соответствующие uniform |
| `heldLight` | собирается из varying уровня света и uniform ручного света (затухание конуса — в [Внутрянке освещения](lighting-internals.md)) |
| `fogColour` | чёрный только в сценах, полностью лишённых тумана (режим 0) |
| `fogAlpha` | зажатый (clamped) фактор тумана ([Внутрянка тумана](fog-internals.md)) |
| `position` / `normal` / `localPosition` / `flags` / `textureId` / `textureRotation` / `uv` / `mipLevel` | varying и flat-интерполированные значения (как в `BloxdSurfaceIn` — значения после vertex-хука) |

## См. также

- [Хуки шейдеров](../api/hooks.md) · [Пайплайн рендеринга](rendering-pipeline.md) · [Зарезервированные идентификаторы](reserved-identifiers.md) · [История версий: v3](../history/v3.md)
