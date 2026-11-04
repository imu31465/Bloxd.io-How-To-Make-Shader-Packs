# Шейдерные хуки

> Целевой API: 5 · Целевой билд: `xkg8x` (проверен в продакшене 2026-11-04) · Статус: Verified

Пак может встраиваться в **9 хуков**: 3 цели рендера (Terrain / Liquid / Model) × 3 этапа пайплайна (Vertex / Surface / Light). Все необязательны — неопределённый хук откатывается к дефолту движка.

## Хуки

| Хук | Этап | Что делает |
|---|---|---|
| `bloxdTerrainVertex` | terrain · vertex | Вершинная анимация террейна. **Не может выполняться в strict-играх** |
| `bloxdTerrainSurface` | terrain · surface | Цвет, альфа, emission, зачарование, оверлей террейна |
| `bloxdTerrainLight` | terrain · light | Итоговый цвет террейна — последний этап фрагмента |
| `bloxdLiquidVertex` | liquid · vertex | Вершинная анимация воды. **Требуется гард от strict** |
| `bloxdLiquidSurface` | liquid · surface | Цвет, альфа, emission воды |
| `bloxdLiquidLight` | liquid · light | Итоговый цвет воды |
| `bloxdModelVertex` | model · vertex | Вершинная анимация блочных моделей / предметов / сущностей. **Требуется гард от strict** |
| `bloxdModelSurface` | model · surface | Цвет, альфа, emission, зачарование, оверлей моделей |
| `bloxdModelLight` | model · light | Итоговый цвет моделей |

Сигнатуры (типы должны совпадать точно; имена параметров произвольны):

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex;
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight;
// bloxdLiquid* / bloxdModel* принимают те же типы
```

## Разделение целей рендера

- **Террейн** — все блоки, кроме воды и блочных моделей
- **Жидкость** — вода
- **Модель** — блочные модели (полублоки, ступени, растения из скрещённых плоскостей), предметы в руке / выпавшие / брошенные, игроки, мобы, NPC, броня, косметика

**Важно**: если пак не определяет ни одного хука Liquid, **на воде не работает ни один хук Террейна** (водой управляют исключительно хуки Liquid). Это отличается от поведения до v4, где жидкость откатывалась на хуки террейна.

## Fallback и разделение кода

- Неопределённый хук означает, что этап использует дефолт движка (то же поведение, что дают `bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **Чтобы разделить код между хуками**, объявите функцию на уровне модуля и вызывайте её из обоих:

```wgsl
fn applyWarmth(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.04, 1.0, 0.96);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}
```

## Дефолтный пак (официальный шаблон из 9 хуков)

Стартовый шаблон теперь включает light-хуки. 1 683 байта дословно, как поставляется:

```wgsl
// Every hook here returns its engine default. Modify the return values to start
// building a shader pack. If you delete a hook, the default is used instead.

// All blocks but water and block models use terrain hooks.
#ifndef BLOXD_STRICT
// Strict games keep terrain where it is. Without the #ifndef, this hook would
// turn the whole shader pack off there.
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Water uses liquid hooks. To share code with another hook, define a function
// and call it from both places.
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Models: block models such as slabs and plants, items, players and mobs.
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

Комментарии шаблона — это проектное руководство: меняйте возвращаемые значения, чтобы начать строить пак; удаление хука восстанавливает дефолт; strict-игры держат террейн на месте; разделяйте код через функции.

## Соглашения при написании

- **Никогда не конструируйте выходные структуры напрямую** (`BloxdSurface(...)` не проходит валидацию). Всегда начинайте с `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` и изменяйте поля. Первый аргумент light-хука уже имеет выходной тип, поэтому `var out = s;` тоже работает
- Голое `var x: BloxdSurface;` (только аннотация типа) — тоже ошибка валидации
- Параметры хуков — **read-only**. Сначала скопируйте (`var sv = s;`)
- Нельзя использовать идентификаторы, начинающиеся с `bloxd` (без учёта регистра), кроме 9 имён хук-функций
- Константы пишите как `const` (`#define` не принимает значения)

Какие поля каждый хук может читать и писать — см. [Структуры](../api/structures.md).
