# Хуки шейдеров

> Целевой API: 5 · Целевой билд: `ab90qa` · Статус: Verified

Паки могут определять **9 хуков** — 3 цели рендера (программы) × 3 стадии пайплайна, все опциональны (отсутствие определения означает дефолт движка).

## Сравнение 9 хуков

| Хук | Программа | Стадия | Аргументы | Возвращает | Условие запуска |
|---|---|---|---|---|---|
| `bloxdTerrainVertex` | Terrain | vertex | `BloxdVertexIn` | `BloxdVertex` | только allow-варианты (**определить его в strict — само по себе ошибка**) |
| `bloxdTerrainSurface` | Terrain | surface | `BloxdSurfaceIn` | `BloxdSurface` | всегда |
| `bloxdTerrainLight` | Terrain | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | всегда |
| `bloxdLiquidVertex` | Liquid | vertex | `BloxdVertexIn` | `BloxdVertex` | только allow |
| `bloxdLiquidSurface` | Liquid | surface | `BloxdSurfaceIn` | `BloxdSurface` | всегда |
| `bloxdLiquidLight` | Liquid | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | всегда |
| `bloxdModelVertex` | Model | vertex | `BloxdVertexIn` | `BloxdVertex` | только allow |
| `bloxdModelSurface` | Model | surface | `BloxdSurfaceIn` | `BloxdSurface` | всегда |
| `bloxdModelLight` | Model | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | всегда |

## Что рисует каждая программа

| Программа | Рисует | Вода, когда нет ни одного хука Liquid |
|---|---|---|
| **Terrain** | каждый блок, кроме воды и блочных моделей | — |
| **Liquid** | вода | **и на воде ни один хук Terrain не запускается** (вода сохраняет дефолтный вид) |
| **Model** | блочные модели (полублоки, ступени, растения, посевы, паутина), предметы в руках / выпавшие / в полёте, игроки, мобы, NPC, броня, косметика | — |

## Роли стадий

- **Vertex** — двигает позиции вершин (покачивание травы, волны). Вершинная анимация отключает весь пак в strict-играх, поэтому `#ifndef BLOXD_STRICT` обязателен
- **Surface** — выход материала: `colour` / `alpha` (условное) / `emission` / `enchantColour` / `overlayColour`
- **Light** — итоговый цвет; принимает выход surface плюс `BloxdLightIn`. Её возвращаемое значение — цвет на экране

## Сигнатуры

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
// bloxdLiquid* / bloxdModel* принимают те же типы аргументов и возвращаемых значений
```

## Ограничения вызовов специальных функций

Валидатор движка ограничивает, из каких хуков можно обращаться к определённым функциям (нарушения проваливают валидацию со специальными диагностиками «reaches»):

| Функция | Откуда вызывается | Guard |
|---|---|---|
| `bloxdTexel` | только surface/light-хуки | — |
| `bloxdTextureSize` | только surface/light-хуки | — |
| `bloxdOpaqueBehind` | surface/light-хуки (осмысленно в жидкостных вариантах) | `#ifdef BLOXD_SCENE_DEPTH` |

> `bloxdFragmentBlockPosition` больше нет в документированном заголовке, но движок по-прежнему вставляет и принимает её — см. [Функции: bloxdFragmentBlockPosition](functions.md#bloxdfragmentblockposition--не-документирована-но-всё-ещё-инжектится). Это была единственная специальная функция, вызываемая из вершинных хуков; в новом коде для вопроса «что это за блок» предпочитайте `flags`.

## Fallback и совместное использование

- Неопределённый хук → та стадия ведёт себя как дефолт движка (`bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **Разделяйте обработку между хуками** функцией области модуля, вызываемой из обоих:

```wgsl
fn sharedSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}
```

## См. также

- Официальный шаблон 9 хуков → [Начало работы: хуки шейдеров](../getting-started/hooks.md)
- Каждое поле структур → [Структуры](structures.md)
- Внутренности вызова хуков → [Внутренности движка](../internals/hook-invocation.md)
