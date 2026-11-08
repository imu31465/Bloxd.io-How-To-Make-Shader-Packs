# Препроцессор

> Целевой API: 5 · Целевой билд: `v98qt8` · Статус: Analyzed (восстановлено из живого валидатора)

Условная компиляция поддерживает только `#define NAME` (без значения) / `#ifdef` / `#ifndef` / `#else` / `#endif`. `#` ставится в начале строки (внутри функций — можно). Сопоставление имён флагов нечувствительно к регистру; при неверном имени в `#ifdef` сообщение об ошибке перечисляет официальный набор.

## Определённые макросы (3)

| Макрос | Где определён | Типичное применение |
|---|---|---|
| `BLOXD_STRICT` | варианты strict-игр (strict.terrain / strict.liquid / strict.model) | `#ifndef BLOXD_STRICT` вокруг целых вершинных хуков и `discard` |
| `BLOXD_ALPHA` | варианты, где существует `BloxdSurface.alpha` — все жидкостные + не-strict террейн/модели | обёртка кода, трогающего alpha |
| `BLOXD_SCENE_DEPTH` | все жидкостные варианты | обёртка вызовов `bloxdOpaqueBehind()` |

## Матрица макрос × вариант

| Вариант | `BLOXD_STRICT` | `BLOXD_ALPHA` | `BLOXD_SCENE_DEPTH` |
|---|---|---|---|
| `allow.terrain` | – | ✓ | – |
| `allow.liquid` | – | ✓ | ✓ |
| `allow.model` | – | ✓ | – |
| `strict.terrain` | ✓ | – | – |
| `strict.liquid` | ✓ | ✓ | ✓ |
| `strict.model` | ✓ | – | – |

Различия террейн / жидкость / модель — это **отдельные программы, а не макросы**: `#ifdef BLOXD_TERRAIN` не существует.

## Удалённые макросы

- **`BLOXD_LIGHTING`** — удалён в v5. Состояние освещения — вопрос времени выполнения для [`bloxdLit()`](lighting.md#bloxdlit--гейт), а не ветка компиляции. Его использование проваливает валидацию с сообщением:

> *«BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.»*

Паттерн миграции v4:

```wgsl
// v4 (проваливает валидацию на v5)
#ifdef BLOXD_LIGHTING
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight { ... }
#endif

// v5 (после миграции)
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    // ... обработка при включённом свете
}
```

## Пример

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // террейн имеет alpha только в allow
    out.alpha = s.alpha;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // вершинным хукам этот guard нужен всегда
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdSeconds()) * 0.05;
    return out;
}
#endif
```

## Макросы формируют структуры

- `BloxdSurface.alpha` существует только внутри `#ifdef BLOXD_ALPHA`
- `bloxdOpaqueBehind()` вызываема только внутри `#ifdef BLOXD_SCENE_DEPTH`

См. [Структуры](structures.md#условные-поля--макросы).

## См. также

- [Начало работы: варианты](../getting-started/variants.md) · [Внутренности движка: валидация шейдеров](../internals/shader-validation.md)
