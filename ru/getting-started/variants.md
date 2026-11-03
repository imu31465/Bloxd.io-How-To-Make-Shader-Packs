# Варианты и гарды

> Целевой API: 5 · Целевой билд: `ab90qa` (проверен в продакшене 2026-11-03) · Статус: Analyzed

## 6 вариантов

Вы пишете одно тело кода, но оно должно компилироваться во всех **6 вариантах**: `{strict, allow} × {terrain, liquid, model}`. Загрузчик валидирует все шесть в момент загрузки.

Ось «свет вкл/выкл» из v4 и более ранних версий исчезла (в v4 было 8 вариантов). Состояние освещения — теперь runtime-вопрос для [`bloxdLit()`](../api/lighting.md), а не ветвление на этапе компиляции.

| Вариант | Пример | Определённые макросы |
|---|---|---|
| `allow.terrain` | террейн в allow-игре | `BLOXD_ALPHA` |
| `allow.liquid` | вода в allow-игре | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | модели в allow-игре | `BLOXD_ALPHA` |
| `strict.terrain` | террейн в strict-игре | — |
| `strict.liquid` | вода в strict-игре | `BLOXD_SCENE_DEPTH` |
| `strict.model` | модели в strict-игре | — |

## Условные директивы

Доступны только `#define NAME` (без значения) / `#ifdef` / `#ifndef` / `#else` / `#endif`. `#` ставится в начале строки (внутри функций — можно).

| Гард | Смысл | Типичное применение |
|---|---|---|
| `#ifndef BLOXD_STRICT` | только не-strict (allow) варианты | оборачивать целиком vertex-хуки, оборачивать `discard` |
| `#ifdef BLOXD_ALPHA` | варианты, где существует `alpha` (вся жидкость + не-strict террейн/модели) | оборачивать код, затрагивающий `alpha` |
| `#ifdef BLOXD_SCENE_DEPTH` | все варианты жидкости | оборачивать вызовы `bloxdOpaqueBehind()` |

`BLOXD_LIGHTING` был **удалён в v5**. Его использование проваливает валидацию с сообщением: *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## Контракт strict-игр

Большинство игр — strict (без вершинной анимации, без `discard`). Неохраняемый vertex-хук сообщает `<hook> moves terrain, which strict games prevent.`, а достижимый `discard` — `discard makes terrain see-through, which strict games prevent.`; оба отключают **все хуки** в этой strict-игре. Всегда оборачивайте vertex-хуки в `#ifndef BLOXD_STRICT`.

О внутренностях политики по играм см. [Внутренности движка: политика](../internals/policy.md).
