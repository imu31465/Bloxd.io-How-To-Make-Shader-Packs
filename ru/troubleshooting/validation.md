# Ошибки валидации

> Целевой API: 5 · Статус: Verified (сообщения записаны дословно с живого валидатора)

Ошибки статической валидации (анализатор, этап 1) — в основном зарезервированные имена, strict-контракт и ограничения вызовов между хуками.

## "Packs can't construct BloxdSurface directly" / "Packs can't construct BloxdLight directly, since header structs gain fields; ..."

- **Причина**: вызов конструкторов вида `BloxdSurface(...)`
- **Исправление**: начинайте от `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` и мутируйте поля (`var out = s;` работает в light-хуках)

## "Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"

- **Причина**: идентификатор, начинающийся с `bloxd` (регистр не важен)
- **Исправление**: переименуйте (напр. `packTint`). Разрешены только 9 имён хуков
- **Профилактика**: префиксуйте свои имена `pack` / `my` и т.п.

## "bloxdPackInputs isn't part of the bloxd_ header"

- **Причина**: прямая ссылка на uniform
- **Исправление**: работайте с ним через функции заголовка ([Формат пака](../api/pack-format.md#кадровый-uniform-bloxdpackinputs))

## "... reaches bloxdTexel, which only surface and light hooks can use."

- **Причина**: вызов из вершинного хука (или из функции, достижимой из него) — «reaches» означает **путь вызова**
- **Исправление**: перенесите вызов в surface / light-хук

## "... reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and <program> doesn't define it; ..."

- **Причина**: `bloxdOpaqueBehind()` требует `BLOXD_SCENE_DEPTH`, определённый только во всех жидкостных вариантах; шаринг вызова из кода террейн/модель-хуков создаёт некомпилируемые варианты
- **Исправление**: оберните вызов в `#ifdef BLOXD_SCENE_DEPTH`
- **Профилактика**: изолируйте чтения глубины как обработку только для жидкостей

## Strict-контракт

| Сообщение | Смысл |
|---|---|
| `<hook> moves terrain, which strict games prevent.` | незащищённый вершинный хук |
| `discard makes terrain see-through, which strict games prevent.` | достижимый `discard` |

- **Важно**: это не ошибки компиляции — strict-игры **автоматически отключают пак целиком** (`shaderPack:offInStrict`)
- **Исправление**: оберните вершинные хуки и `discard` в `#ifndef BLOXD_STRICT` ([Варианты](../getting-started/variants.md))

## Сообщения текущей версии

| Сообщение | Действие |
|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | мигрируйте `#ifdef BLOXD_LIGHTING` → `if (bloxdLit())` ([Освещение](../api/lighting.md#bloxdlit--гейт)) |
| `bloxdBlockFlagRock isn't part of the shader pack API...` | оставшаяся битовая константа → `flags.rock` ([Флаги](../api/flags.md)) |
| `bloxdSpLitColour isn't part of the shader pack API...` | внутренний символ v4 → используйте публичную `bloxdLitColour()` |

Анализатор выдаёт **специальные сообщения** пакам, которые продолжают читать `blockFlags` или оборачивать light-хуки в `#ifdef BLOXD_LIGHTING`, так что ничего не сбоит молча (шаги миграции: [миграция v5](../history/v5.md)).

Ошибки разрешения имён текстур (подсказки написания, написания кадров/поворотов) собраны в [Проблемах текстур](textures.md).

## Смотрите также

- [Ограничения и зарезервированные имена](../api/restrictions.md) · [Внутрянка движка: валидация шейдеров](../internals/shader-validation.md) · [Проблемы отдельных вариантов](variants.md)
