# Функции

> Целевой API: 5 · Тип: техническая справка

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
- **Возвращает**: единичный вектор к солнцу в мировой системе координат; **нулевой вектор, если в мире нет солнца**.
- **Важные факты**:
  - Если функция возвращает ненулевой вектор, направление Луны равно `-bloxdSunDirection()`. При нулевом значении фактическое направление Луны определить нельзя.
  - **Не передавайте нулевой вектор в `normalize`**. Сначала проверьте `dot(d, d) < 1e-8`, а при необходимости используйте фиксированное запасное направление.
  - Движок не предоставляет автоматический цикл дня и ночи. В стандартном небе Earth солнце остаётся примерно в направлении `(−0.56, 0.81, −0.18)` (высота ≈ 54°). Мир может реализовать собственный цикл, обновляя `inclination`; при этом меняются направления солнца и Луны.
- **Применение**: настройка цветовой температуры и направления света, проверка наличия солнца и создание фонового лунного освещения.

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

### `bloxdFragmentBlockPosition`

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

## Теневые функции

Эти три функции **внедряются в скомпилированный модуль каждого пака** (как `bloxdFragmentBlockPosition`) и указаны в таблице функций валидатора, но отсутствуют в читаемом тексте заголовка.

### bloxdShadow

```wgsl
fn bloxdShadow() -> f32
```

- **Возвращает**: солнечный или лунный свет, достигающий этого фрагмента — **0 в тени, 1 на свету** — *новое в API v5*
- Кто отбрасывает: **блоки, игроки, мобы и предметы** (предмет в руке от первого лица исключён намеренно)
- Поведение (дословно из описания валидатора): затухает к 0 при заходе солнца/луны или когда грань отворачивается; **1 на гранях `flags.emissive`**; свет идёт вдоль `bloxdShadowDirection()`, поэтому тени есть и под безсолнечным небом
- **Вызов**: из surface-/light-хуков
- Рецепт: `let sun = mix(shadowColour, litColour, bloxdShadow());` — см. [Тени](../guides/shadows.md)

### bloxdAirShadow

```wgsl
fn bloxdAirShadow(t: f32) -> f32
```

- **Возвращает**: как `bloxdShadow()`, но в точке **между камерой (t = 0) и этим фрагментом (t = 1)** — *новое в API v5* — для световых столбов
- Отбрасывают только блоки (игроки и мобы — нет), размытые до целых блоков; `t` ограничен 0–1
- Рецепт: сэмплить несколько `t` вдоль луча взгляда и накапливать — [Тени](../guides/shadows.md)

### bloxdShadowDirection

Концептуально относится к теневым функциям, но живёт в читаемом заголовке — см. [Функции кадра](#bloxdshadowdirection).


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
- **Подробный разбор**: [История версий: v3](../history/v3.md) и [Внутреннее устройство движка](../internals/rendering-pipeline.md)

## См. также

- [Освещение](lighting.md) · [API текстур](texture-api.md) · [Формат пака](pack-format.md)
