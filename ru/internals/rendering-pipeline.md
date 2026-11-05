# Пайплайн рендеринга

> Целевой API: 5 · Целевой билд: `bny9u` (2026-11-05, прод) · Статус: Analyzed (анализ JavaScript продакшн-бандла)
- **Surface-хуки идут «до» alphaTest**: `out.alpha` кормит тест отброса напрямую. Cutout-материалы (трава, листья) допускают dither-эффекты растворения (рецепт R-C). В жидкостях (смешивание) `out.alpha` — настоящая прозрачность (рецепт R-D). На обычном непрозрачном террейне эффекта нет — не перепутайте
- **Содержимое `l.ambient`** — это `material.ambient × sceneAmbient`, различающееся по материалам. Сценовая сторона привязана к графической настройке «Ambient Lighting Intensity» (дефолт 0.5) — никогда не программируйте фиксированные дефолты
- **Сценовые направленные огни — сетап из двух источников**: ламбертова сумма главного (направление из позиции солнца в настройках неба, интенсивность 1.0) и заполняющего (направление `[-0.5, -1, -1]`, интенсивность 0.35) приходит как `l.directional`. Заполняющий направлен вниз, так что верхним граням он ничего не даёт, но выцепляет обращённые вниз поверхности (потолки пещер и т.п.). Террейн учитывает только лампы, добавленные в `_initScene`; лампы, добавленные в сцену после запуска, игнорируются террейном и блочными моделями (об этом говорит официальное предупреждающее сообщение)
- **`bloxdSeconds()` — на самом деле `performance.now()`**: аптайм браузера, завёрнутый на 1 час. Не связано с днём/ночью в игре и прошедшим временем мира. Для анимации, синхронной с игровыми часами, оценивайте время по азимуту `bloxdSunDirection()` в мирах с циклом день/ночь
- **Функции заголовка читают один uniform**: движок размещает 64-байтный uniform `bloxdPackInputs` на `@group(3) @binding(0)` (5 слотов — seconds / lit / renderOffset / sunDirection / eyePosition, little-endian), а `bloxdSeconds()` / `bloxdLit()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` соответствуют чтению этих слотов ([Формат пака: кадровый uniform](../api/pack-format.md#кадровый-uniform-bloxdpackinputs)). Пак не может писать в этот uniform, а поскольку WGSL пака и движка склеиваются в единый модуль, объявить тот же group/binding самостоятельно тоже нельзя. `@group(3) @binding(1)` несёт текстуру глубины сцены для жидкостей, а `@binding(2)` — storage-буфер `bloxdSpTextureLayers`
- **Вершинные данные строит мешер (Web Worker)**: блочный террейн идёт интерливингом по 28 байт на вершину (32 байта при включённом атласе) — позиция = float32×3 / нормаль = знаковый 8-битный целый ×4 / цвет = нормализованный 8-битный целый ×4 (суть `s.colour` — tint × AO запекается в 8 бит на стадии мешера, поэтому разделить или восстановить это на стороне пака принципиально невозможно) / UV = float32×2 / atlasIndex = float32. Лишь уровни света едут отдельным 4-байтным вершинным буфером (измеренные значения: [реестр данных движка](engine-data.md)). Вершины рисуются instancing'ом по чанкам
- Мелкие шахматки на границах чанков при загрузке — чанк-фейд screen-space Bayer 4×4 dither движка, а не баги пака (можно отключить графической настройкой `chunkFadeIn`)
- **`mod` — зарезервированное слово**: отклоняется с ошибкой `pack.wgsl:3 'mod' is a reserved word in WGSL.` Остатки пишите оператором `%`

## R-C. Bayer-dither растворение — out.alpha управляет discard

Воспроизводит **ту же таблицу Bayer 4×4**, что движок использует в чанк-фейдах, растворяя cutout'ы от нижних блоков вверх. discard срабатывает в alphaTest-материалах (трава, листья); в жидкостях это становится прозрачностью смешивания.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod зарезервирован: используйте оператор %
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // растворение от нижних блоков вверх; больший dissolve остаётся
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

## R-D. Fade воды у камеры — alpha жидкости держит обзор

`out.alpha` жидкостного хука кормит смешивание напрямую. Гасит лишь поверхность воды под камерой, чтобы сохранять линию обзора при нырянии и при камере над водой.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 блока от полной прозрачности к норме
    #endif
    return out;
}
```
