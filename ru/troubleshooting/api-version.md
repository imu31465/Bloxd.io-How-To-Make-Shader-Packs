# Ошибки версии API

> Целевой API: 5 · Целевой билд: `bny9u` (проверено в продакшене 2026-11-05) · Статус: Verified (дословно из живого словаря i18n)

Ошибки, связанные с `apiVersion`. Текущая игра принимает **только `5`**.

## "pack.json needs "apiVersion": {{version}}."

- **Симптом**: это сообщение сразу после загрузки (`loadNoApiVersion`)
- **Причина**: ключ `apiVersion` отсутствует целиком
- **Исправление**: добавьте `"apiVersion": 5` — **число** (строка `"5"` не проходит)
- **Профилактика**: начинайте от шаблона [pack.json](../getting-started/manifest.md)

## "This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}."

- **Симптом**: `loadWrongApiVersion`
- **Причина**: `apiVersion` есть, но не 5 (пак v1–v4)
- **Исправление**: примените соответствующую миграцию ([История версий](../history/)):
  - v4 → v5: [руководство v5](../history/v5.md) — по большей части механическая (flags · `bloxdLit()` · оговорка про `bloxdFragmentBlockPosition`)
  - v3 → v5: сначала примените [v4](../history/v4.md)
  - v2 и старше → v5: пройдите по цепочке v3 → v4 → v5
- **Профилактика**: после любого обновления API сверяйтесь с [Совместимостью](../api/compatibility.md) и соответствующим руководством по миграции

## Строка "5" отклоняется

- **Причина**: загрузчик сравнивает `manifest.apiVersion !== 5` **строго** (`===`); JSON-строка `"5"` — не число 5
- **Исправление**: `"apiVersion": 5` (без кавычек)

## Сохранённый старый пак молча перестал работать

- **Симптом**: прежде работавший пак v1–v4 не реагирует, без каких-либо исключений
- **Причина**: сохранённые паки резолвятся в `{kind: "none", reason: "otherApiVersion"}` и становятся **молча неактивными**
- **Проверка**: строка состояния во вкладке настроек: `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`
- **Исправление**: загрузите мигрированную замену с того же экрана
- **Профилактика**: после обновлений API перевыпустите версию с поднятым номером и объявите об этом ([Распространение](../getting-started/distribution.md))

## Пак v4 после миграции не проходит валидацию

Три типовых сценария (полные шаги — в [руководстве по миграции v5](../history/v5.md)):

| Сообщение валидации | Причина | Исправление |
|---|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | использование `#ifdef BLOXD_LIGHTING` | перепишите как `if (bloxdLit()) { ... } else { return bloxdDefaultLight(s, l); }` |
| `bloxdBlockFlagRock isn't part of the shader pack API...` (диагностика зарезервированных имён) | оставшиеся ссылки на битовые константы | используйте `surface.flags.rock` и т.п. (таблица соответствий 1:1 в [Флагах](../api/flags.md)) |
| отсутствие `bloxdFragmentBlockPosition` | вне документированного заголовка с v5 (по-прежнему вставляется и принимается — см. [Функции](../api/functions.md)) | это не ошибка, которую надо чинить: код компилируется; в новом коде предпочитайте `flags` / `bloxdWorldPosition()` |

## Смотрите также

- [Совместимость](../api/compatibility.md) · [История версий](../history/) · [pack.json](../getting-started/manifest.md)
