# Детали пайплайна



- **Surface-хуки идут «до» alphaTest**: `out.alpha` кормит тест отброса напрямую. Cutout-материалы (трава, листья) позволяют эффекты растворения типа dither (рецепт R-C). В жидкостях (смешивание) `out.alpha` — настоящая прозрачность (рецепт R-D). На обычном непрозрачном террейне эффекта нет — не перепутайте
- **Содержимое `l.ambient`**: `material.ambient × sceneAmbient`, разное по материалам. Сценовая сторона привязана к графической настройке «Ambient Lighting Intensity» (дефолт 0.5) — никогда не программируйте фиксированные дефолты
- **Сценовый направленный свет — из двух источников**: ламбертова сумма главного (направление из позиции солнца в настройках неба, интенсивность 1.0) и заполняющего (направление `[-0.5, -1, -1]`, интенсивность 0.35) приходит как `l.directional`. Заполняющий направлен вниз, так что верхние грани не трогает, но выцепляет обращённые вниз грани (потолки пещер и т.п.). Террейн учитывает только лампы, добавленные через `_initScene`; лампы, добавленные в сцену после запуска, террейном и блочными моделями игнорируются (есть официальное предупреждение)
- **`bloxdSeconds()` — реально `performance.now()`**: `time() { return performance.now() / 1e3 % 3600 }` — аптайм браузера, завёрнутый на 1 час. Без связи с днём/ночью игры и прошедшим временем мира. Для анимации, синхронной с игровыми часами, оценивайте время по азимуту `bloxdSunDirection()` в мирах с циклом день/ночь
- **Функции заголовка — алиасы 4 слотов одного 64-байтного uniform (`@group(3) @binding(0)`)**: `bloxdSeconds()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` соответствуют чтению слотов time / originOffset / sunDirection / eyePosition (по 16B, little-endian); `bloxdRenderOffset()` — зарезервированный слот, туда всегда приходит `[0, 0, 0]`. Пак не может перезаписывать этот uniform, а поскольку WGSL пака и движка склеиваются в один модуль, объявить тот же group/binding самостоятельно тоже нельзя. (В v3 два слота переименованы — `seconds` / `renderOffset`, функции называются `bloxdSeconds()` / `bloxdRenderOffset()` — и добавлена текстура глубины сцены на `@group(3) @binding(1)`; см. [часть IX](../history/v3.md) §41 и §51.)
- **Вершинные данные готовит мешер (Web Worker)**: геометрия блоков складывается в интерливинг по 28 байт на вершину (32 при атласе): позиция = float32×3 / нормаль = 4×8bit знаковых / цвет = 4×8bit unorm (`s.colour` — tint × AO, запечённые мешером в 8 бит; разделить и восстановить в паке принципиально нельзя) / UV = float32×2 / atlasIndex = float32. Уровни света едут отдельным 4-байтным вершинным буфером ([часть VII](../internals/) §26, [часть II](../api/) §11). Вершины рисуются instancing'ом по чанкам
- Мелкие шахматки на границах чанков при загрузке — чанк-фейд screen-space Bayer 4×4 dither движка, а не баги пака (можно отключить графической настройкой `chunkFadeIn`)
- **`mod` — зарезервированное слово**: отклоняется с `pack.wgsl:3 'mod' is a reserved word in WGSL.` Остатки пишите оператором `%`

## R-C. Bayer-dither растворение — out.alpha управляет discard

Воспроизводит **ту же таблицу Bayer 4×4**, что движок использует в чанк-фейдах, растворяя cutout'ы снизу блоков. discard срабатывает в alphaTest-материалах (трава, листья); в жидкостях это прозрачность смешивания.

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
    // растворяется снизу блоков; больший dissolve остаётся
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

## R-D. Подводный fade у камеры — alpha жидкости держит обзор

`out.alpha` жидкостного хука кормит смешивание напрямую. Расчищает лишь поверхность под камерой, чтобы держать обзор при нырянии и надводной камере.

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
