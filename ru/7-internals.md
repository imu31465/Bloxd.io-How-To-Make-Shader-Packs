[← Предыдущая часть](6-implementation.md)·[Вернуться к руководству](README.md)·[Следующая часть →](8-apiv2.md)

# Часть VII: Приложение по внутрянке

Дополнительные спеки, найденные анализом реализации движка. Всё восстановлено напрямую из JavaScript актуального продакшн-билда.

## 24. Идентичность солнца и луны

Источник `bloxdSunDirection()` — буфер солнечного направления, перезаписываемый лишь при смене типа скайбокса: критерий не «есть ли в небе солнце», а **«скайбокс ли земного типа»**.

| Скайбокс | `bloxdSunDirection()` |
|---|---|
| `default` (процедурное небо) | Ненулевой (дефолты ниже) |
| `gloomy` / `interstellar` / `space_*` (куб-текстуры) | **Всегда (0,0,0)** |

**Луна всегда `-bloxdSunDirection()`** (движок считает позицию луны точной противоположностью солнца). Ночь судится по высоте солнца — луна наверху, когда `bloxdSunDirection().y < 0` (солнце под горизонтом). Но в дефолтных мирах солнце статично, и луна тоже — движущуюся луну видят лишь миры с циклом день/ночь.

Дефолтное солнечное направление около `(-0.56, 0.81, -0.18)` (единичный вектор из inclination = −0.2 / azimuth = 0.55, статичен). Практический референс для предсказания направлений бликов при тестах дистрибутивных паков.

Циклы день/ночь не встроены в движок — inclination статическое число, которое миры с подвижным днём обновляют на стороне игры. `bloxdSunDirection()` следует каждому обновлению.

Направленные огни террейна — лишь 2 лампы, созданные при старте сцены, с **фиксированными направлением и интенсивностью, без смены день/ночь**. Коротко: **ни один фактор яркости террейна не зависит от времени. «Виды» день/ночь идут лишь от скайбокса и bloxdSunDirection()**, так что паки, затемняющие ночью, должны сами оценивать полосу времени из bloxdSunDirection() (техника `sunPresent` из §19).

### R-A. Направленный лунный свет — moonDir = −bloxdSunDirection()

Добавляет бело-голубой Ламберт и слабый спекуляр, лишь пока луна наверху. `moonUp` в дефолтных статично-солнечных мирах равен 0: там ничего не происходит — **лунный свет, срабатывающий лишь в мирах с циклом день/ночь, а значит безопасный**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // луна всегда точно напротив солнца; дневной авто-офф через moonDir.y < 0
    let moonDir = -bloxdSunDirection();
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(bloxdEyePosition() - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. Внутрянка тумана

Расчёт тумана всегда LINEAR-режим (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), при `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = настройка тумана; лишь D = 0 особенный с fogEnd = 5). **Градиентная полоса лишь 32 блока**, и `l.fogVisibility` — меньше «дымка по дистанции», а **нормированная дистанция до края загруженного мира**. Варьируется от игрока с дистанцией загрузки: дистанционные эффекты пусть сами считают `distance(l.position, bloxdEyePosition())` (рецепт R-B).

Дефолтный цвет тумана `rgb(183, 191, 195)` (бледный сине-серый). Создатели миров меняют его через `fogColourOverride` (hex). При режиме тумана 0 (NONE) **fogColour приходит чёрным**. Стандартная форма `mix(l.fogColour, col, l.fogVisibility)` безопасна, ибо цвет тумана при fogVisibility 1 не используется.

Выставление `showFog` в false отгоняет туман на 3200–3328 блоков, фактически выключая (`fogVisibility ≈ 1` продолжает приходить).

### R-B. Полоса края загрузки — fogVisibility как «край мира»

Тихо холодит лишь 32-блочную полосу края загрузки, чтобы заретушировать конец мира (или подчеркнуть как эффект). Без самопосчитанной дистанции: сама следует настройкам дистанции загрузки игрока.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = внутри (запас до края), 0 = вот-вот выход за край
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. Внутрянка blockLight / heldLight

При декодировании `aPackedLightLevels` движок кладёт на каждый канал **пол в 35% ярчайшего RGB-канала**. Напр. «чисто красный свет» в вершинах поднимается до (1.00, 0.35, 0) до интерполяции и лифта. Оранжевый факелов, выглядящий «розовато-белым, а не красным», — отсюда: насыщенность тёплых факелов (R9.1) крутите против этого дефолта.

Ручной свет (`heldLight`) с дальностью по ярчайшему каналу (макс 15 блоков) с препроцессом `dist^0.75`, тем же полом 35%, а `l.heldLight` — значение **до** ambient-буста. Кастомные предметы могут фиксировать `spotlightRange` и угол конуса — режим «луч, пока держишь», чей конус следует за камерой. Паки узнать направление луча не могут.

Кастомные блоки могут нести `skyLightEmission` (0–15), который **инжектит в сам канал skyLight, отдельно от BFS blockLight**. Паки в духе R9.12, судящие солнце/тень по порогу skyLight, могут мазать в мирах с искусственно поднятым skyLight. Дистрибутивные паки судят надёжнее в связке с blockLight.

## 27. Детали пайплайна

- **Surface-хуки идут «до» alphaTest**: `out.alpha` кормит тест отброса напрямую. Cutout-материалы (трава, листья) позволяют эффекты растворения типа dither (рецепт R-C). В жидкостях (смешивание) `out.alpha` — настоящая прозрачность (рецепт R-D). На обычном непрозрачном террейне эффекта нет — не перепутайте
- **Содержимое `l.ambient`**: `material.ambient × sceneAmbient`, разное по материалам. Сценовая сторона привязана к графической настройке «Ambient Lighting Intensity» (дефолт 0.5) — никогда не программируйте фиксированные дефолты
- **`bloxdTime()` — реально `performance.now()`**: аптайм браузера, завёрнутый на 1 час. Без связи с днём/ночью игры и прошедшим временем мира. Для анимации, синхронной с игровыми часами, оценивайте время по азимуту `bloxdSunDirection()` в мирах с циклом день/ночь
- Мелкие шахматки на границах чанков при загрузке — чанк-фейд screen-space Bayer 4×4 dither движка, а не баги пака
- **`mod` — зарезервированное слово**: отклоняется с `pack.wgsl:3 'mod' is a reserved word in WGSL.` Остатки пишите оператором `%`

### R-C. Bayer-dither растворение — out.alpha управляет discard

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
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. Подводный fade у камеры — alpha жидкости держит обзор

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

## 28. Что меняет видимые значения пака — чеклист тестов

Один и тот же пак рендерится по-разному в зависимости от **мира и настроек игрока**. Перед распространением проверьте хотя бы эти 3 окружения:

1. **Обычный мир** (дефолтный скайбокс, без оверрайдов) — bloxdSunDirection() есть, дефолтные цвета
2. **Мир со space-скайбоксом** — bloxdSunDirection() = 0. Вид ветки `sunPresent`
3. **Кастомный мир с `visionMinLightColour` / `skyLightColourOverride`** — поднятые темноты и цвета

Главные источники вариации: `lightingOverride` (принудительный свет) / `skyLightColourOverride`, `ambientLightColourOverride` (hex-замены) / `visionMinLightColour` (пол «самого тёмного видимого цвета» на sky и ambient; Night Vision его использует — паки «кромешная пещера» не темнеют как задумано) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (наличие bloxdSunDirection()). `uSkyLightColour` дефолт = (1,1,1) белый, `uAmbientLightColour` дефолт = (0.25,0.25,0.30). `l.ambient` сценовая сторона = графическая настройка «Ambient Lighting Intensity» (дефолт 0.5). `l.fogVisibility` следует настройкам тумана/дистанции чанков игрока.

## 29. Средства отладки

- URL-параметр `?renderer=lite` — форсирует Lite-рендер (`?renderer=webgl2` / `babylon` тоже годятся)
- URL-параметр `?vconsole` — экранная консоль (VConsole). Удобно для проверки на реальном мобильном
- В консоли видны `noa-engine v0.33.0` и `Renderer: lite from <источник>` — проверьте их первым делом, чтобы не ошибиться с трактом рендера
- WebGPU-рендер лочится «форсированно ВКЛ», пока применён пак. Настройка «Disable Block Texture Atlas» тоже лочится (атлас остаётся ВКЛ), а без WebGPU пак вообще не применяется. Основание писать «нужен WebGPU-браузер» на страницах распространения
- Рантайм-перепроверка при каждом входе (`checkCompilation`) компилирует настоящие террейн-материалы в браузерном WebGPU (строже статической проверки настроек). Паки, падающие здесь, исключаются из этой игры

## 30. Режимы применения по играм (`shaderPackPolicy`)

Здесь фиксируется смысл пары `allow / strict` из §7 на уровне отдельных игр. Только игры, в чьём определении явно стоит `shaderPackPolicy: "allow"`, работают в полном режиме (vertex-хуки, `discard`, `alpha` террейна); игры без указания (или с любым значением, кроме allow) — strict: определяется `BLOXD_STRICT`, охраняемый код автоматически отключается. Со стороны пака это выбрать нельзя, поэтому знание о том, какие игры что исполняют, — предпосылка распространения.

- Опорный билд: `szby6g.main.94a7596c.js` (прод-деплой на 2026-10-17). Статический разбор всех 111 определений игр даёт **26 allow-записей (12 игр) / 85 strict-записей**.
- «allow» объявляется в 12 местах: 8 прямых записей в определениях игр и 4 базовые переменные (`tb` / `kz` / `cb` / `Fb`); вариации наследуют через спред (`{...tb,...}`). Перезаписей на уровне отдельной вариации (обратная схема «родитель allow — ребёнок strict») сейчас нет.

12 allow-игр (всего 26 записей):

- **Test Gym** — базовая + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (всего 11)
- **Doodle Cube** — базовая + Solos / Duos (3)
- **Rocket Obby** — базовая + Sheep / January (3)
- **9 одиночных игр**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

Самые обманчивые моменты на стороне strict:

- **Superflat Creative (classic_creativeFlat) — strict.** В названии есть «Creative», но в семействе classic allow имеет только обычный Creative (`classic_creative`). Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns и т.д. — все strict
- **Custom Games (customGames) — strict.** В созданных пользователем кастомных играх эффекты vertex-хуков не срабатывают. Для проверки надёжно Test Gym
- Основные PvP-/серверные игры вроде bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) — все strict

При этом в strict-играх пак загружается и компилируется, а рецепты фрагментной стороны вроде surface / light работают как обычно. Ограничения касаются vertex-хуков (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard` и `alpha` террейна (у жидкостей она есть всегда).

Этот список отражает статический анализ указанного билда; обновления движка могут менять распределение allow/strict. При выходе новых версий перепроверяйте.
