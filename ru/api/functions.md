# Функции

> Целевой API: 5 · Целевой билд: `v98qt8` · Статус: Analyzed (восстановлен дословно из живого заголовка)

Все функции заголовка. Текстурный API (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`) разобран в [API текстур](texture-api.md) — вместе с `bloxdOpaqueBehind`.

## Функции кадра (одно и то же значение весь кадр)

Заметка из заголовка: *"These functions return the same value for the entire frame."* Эти функции читают uniform `bloxdPackInputs`, поэтому вызывать их можно и из вершинных хуков, и из функций уровня модуля.

### bloxdEyePosition

```wgsl
fn bloxdEyePosition() -> vec3f
```

- **Возвращает**: позицию рендера камеры
- **Вызов возможен из**: всех 9 хуков + уровня модуля
- **Применение**: векторы взгляда (`normalize(l.position - bloxdEyePosition())`), rim-подсветка, расстояния

### bloxdRenderOffset

```wgsl
fn bloxdRenderOffset() -> vec3i
```

- **Возвращает**: целочисленное смещение в блоках; **позиция рендера + это смещение = мировая позиция**
- Меняется по мере перемещений игрока (позиции рендера держатся около 0,0,0)
- Используется внутри `bloxdWorldPosition()`

### bloxdSunDirection

```wgsl
fn bloxdSunDirection() -> vec3f
```

- **Возвращает**: единичный вектор к солнцу в мировой ориентации; **нулевой вектор, когда солнца нет**
- **Факты**:
  - **луна всегда находится в `-bloxdSunDirection()`** (движок размещает её напротив солнца)
  - **никогда не передавайте нулевой вектор в `normalize`** — защищайтесь условием `dot(d, d) < 1e-8` с откатом на постоянное направление
  - в текущем билде нет цикла дня и ночи; солнце, луна и звёзды не двигаются в течение сессии (переключается только непрозрачность). В стандартном земном небе солнце стоит около `(−0.56, 0.81, −0.18)` (высота ≈ 54°)
- **Применение**: цветовая температура, направление света, солнечный гейт, псевдо-лунный свет

### bloxdSeconds

```wgsl
fn bloxdSeconds() -> f32
```

- **Возвращает**: секунды с момента загрузки страницы (без сброса — f32 хранит субмиллисекундную точность первые 4,5 часа)
- **Применение**: анимация; повторяющиеся таймеры через `bloxdSeconds() % period`
- **Примечание**: в отличие от `bloxdTime()` из v2 (который сбрасывался на 3600 с), эта функция не сбрасывается

### bloxdLit

```wgsl
// Whether block and sky lighting is on. When it's off, BloxdLightIn's
// blockLight and heldLight are 0, and its skyLight and light colours are 1.
fn bloxdLit() -> bool
```

- **Возвращает**: включено ли блочное и небесное освещение
- **Новое в v5**: заменяет ветвление времени компиляции `#ifdef BLOXD_LIGHTING` из v4 на runtime-проверку
- **Гарантии при выключении** (заметка из заголовка): `blockLight` и `heldLight` равны 0; `skyLight` и цвета света (`ambientLightColour` / `skyLightColour`) равны 1
- **Использование**: гейт для кода, зависящего от освещения:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    // ... обработка при включённом освещении
    return out;
}
```

Использование `BLOXD_LIGHTING` даёт *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## Преобразование координат

### bloxdWorldPosition

```wgsl
// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f
```

- **Возвращает**: `position + vec3f(bloxdRenderOffset())`
- **Примечание**: пределы точности f32 означают, что дальние координаты могут быть неточными (заголовок: *"with possible f32 inaccuracy"*)

### bloxdFragmentBlockPosition — не документирована, но всё ещё инжектится

```wgsl
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i
```

Эта функция **больше не входит в документированный заголовок** (в заголовок v4 входила), но движок по-прежнему принимает её и определяет:

- **Валидатор**: она всё ещё числится в живой таблице сигнатур, поэтому вызовы проходят проверку имён во всех хуках (включая вершинные)
- **Выполнение**: генератор кода всё ещё инжектит определение в модуль террейна/жидкости и в обе модельные программы — террейн/жидкость используют `vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset()`; модельные пайплайны используют смещение в 1/64 блока, привязываясь к ячейке модели для установленных блочных моделей
- **Оговорка**: как недокументированная внутренность она может исчезнуть в будущей версии без предупреждения — предпочитайте `bloxdWorldPosition()` для непрерывных позиций и `flags` для «какой это блок» (об удалении из заголовка см. [История версий: v5](../history/v5.md))

Паки, написанные для v4 и вызывающие её, продолжают работать; новым пакам принимать её не стоит.

## Функции по умолчанию (поведение движка)

### bloxdDefaultVertex

```wgsl
fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex
// impl: return BloxdVertex(vertex.position);
```

### bloxdDefaultSurface

```wgsl
fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface
```

Пропускает `colour` как есть, передаёт `enchantColour` / `overlayColour` без изменений, обнуляет `emission` (и передаёт `alpha` в вариантах `BLOXD_ALPHA`). **Строить выходные структуры можно только через эту функцию.**

### bloxdDefaultLight

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight
// impl:
//   let lit = bloxdLitColour(surface, light);
//   return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
```

Буквально «применить рецепт движка, а затем применить туман к результату с добавленной эмиссией».

## Функции рецепта освещения

Собственный рецепт освещения движка, задокументированный как вызываемый WGSL — компонуйте или переопределяйте отдельные стадии. Пояснения и схема потока: [Освещение](lighting.md).

| Функция | Сигнатура | Роль |
|---|---|---|
| `bloxdShading` | `(light: BloxdLightIn) -> vec3f` | как материал и угол освещают грань (Ламберт × diffuse + emissive + ambient, clamp 0–1) |
| `bloxdWorldLight` | `(light: BloxdLightIn) -> vec3f` | свет мира в этой точке (ярчайший из блочного/небесного/ручного, с полом в `ambientLightColour`) |
| `bloxdLitColour` | `(surface: BloxdSurface, light: BloxdLightIn) -> vec3f` | цвет поверхности, освещённый так, как это делает движок (до эмиссии и тумана) |
| `bloxdApplyFog` | `(colour: vec3f, light: BloxdLightIn) -> vec3f` | применяет туман этого фрагмента (`mix(colour, fogColour, fogAlpha)`) |

## Специальные функции

### bloxdOpaqueBehind

```wgsl
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind
```

- **Возвращает**: `BloxdOpaqueBehind` (`hit: bool`, `position: vec3f`, `distance: f32`)
- **Вызов возможен только из**: surface / light-хуков (текстура глубины — FRAGMENT-only)
- **Guard**: `#ifdef BLOXD_SCENE_DEPTH` (определён в жидкостных вариантах)
- **Смысл**: непрозрачная грань позади этого фрагмента (террейн, видимый сквозь воду); `hit == false` для неба
- **Переименование из v2**: `found` → `hit`
- **Подробный разбор**: [История версий: v3](../history/v3.md) и [Внутрянка движка](../internals/rendering-pipeline.md)

## См. также

- [Освещение](lighting.md) · [API текстур](texture-api.md) · [Формат пака](pack-format.md)
