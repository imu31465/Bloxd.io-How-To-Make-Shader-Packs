[← Предыдущая часть](08-apiv2.md)·[Вернуться к руководству](README.md)

# Часть IX: руководство по миграции на API версии 3

> **Заменено 2026-10-26: текущий API — версия 4** — паки v3 отклоняются при загрузке ровно так, как здесь описано для v2. Примените эту часть, *затем* [часть X](10-apiv4.md) (v3 → v4: текстурный API, переименование `fogAlpha`, `bloxdFragmentBlockPosition`, `hit`).

Целевой билд: `3ymzdd.main.fae4743f.js` — **продакшн-билд, живущий с 2026-10-19**. Бандл, который bloxd.io отдаёт в продакшене, байт-в-байт совпадает (проверено по md5 — и основной бандл, и чанки шейдер-паков) с предпродакшн-деплоем, на котором изначально исследовалась эта часть, так что всё здесь применимо к продакшену как есть. Модель пака сохраняет форму v2 (те же поля `pack.json`, те же лимиты загрузчика, та же раскладка uniform).

Части I–VII этого руководства по-прежнему написаны на базе v2. Эта часть, как и [часть VIII](08-apiv2.md), собирает воедино точки миграции v2 → v3 и новые возможности v3. Переход в основном механический (§47), но лишь одно изменение реально меняет поведение — свет по умолчанию теперь ослабляет emission туманом (§43), — и `blockId` целиком заменён на `blockFlags` (§42), поэтому перед распространением всегда проверяйте компиляцией в игре.

Новое в этой редакции: разделы **§49–§54** выходят за рамки миграции и посвящены внутрянке движка, восстановленной из продакшн-билда: тому, как Lite-рендерер на самом деле вызывает ваши хуки; настоящей функции тумана с четырьмя режимами; точной реализации `bloxdOpaqueBehind()`; полному пути доставки `blockFlags` от регистрации блока до вашего хука и конвейеру валидации с измеренным хэшем заголовка. Это самые глубокие публично задокументированные факты о системе паков на сегодня, и они закрывают несколько вопросов, которые другие руководства до сих пор числят открытыми.

## 40. Судьба v2-паков (сначала вывод)

**Обновление 2026-10-19: v3 покинула предпродакшн и теперь её отдаёт живой сайт.** Каждый v2-пак, сохранённый до раскатки — включая все паки, распространявшиеся как v2, — теперь падает в продакшене ровно так, как описано ниже, так что миграция из §47 больше не опциональна ни для кого, кто распространяет паки сегодня.

Сборка требует, чтобы `apiVersion` в манифесте **точно совпадал с 3**, и **параллельной поддержки v2/v3 нет**. v2-пак отклоняется при загрузке сообщениями о «неправильной версии API» (ключи i18n, текст с подстановками):

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>
> `loadNoApiVersion`: "pack.json needs \"apiVersion\": {{version}}."

У сохранённых паков остаётся жизненный цикл v2 ([часть VIII](08-apiv2.md) §31): каждая сборка хэширует свой заголовок движка, обновления движка автоматически помечают сохранённые паки как «нужна перепроверка», а сохранённый пак, чей `apiVersion` отличается от текущей версии, помечается как неработающий (причём статусное сообщение выше указывает на замену), а не выдаёт ошибку.

## 41. pack.json и uniform-буфер (что не меняется)

- Обязательные поля манифеста не изменились: `{ apiVersion, name, author }`.
- Лимиты загрузчика не изменились: 32 МБ zip / 1024 записи / 256 файлов `.wgsl` / 256 КБ кода суммарно / 64 КБ манифеста.
- Блок uniform движка не изменился по форме: `@group(3) @binding(0)`, 64 B, содержит — в порядке объявления — время, смещение рендера, направление солнца и позицию глаз. Раскладка зарегистрирована с `minBindingSize: 64`, а точная раскладка полей — `seconds: f32` @ байт 0, `renderOffset: vec3i` @ 16, `sunDirection: vec3f` @ 32, `eyePosition: vec3f` @ 48. Два внутренних имени полей изменились: `time` → `seconds`, `originOffset` → `renderOffset`. **Байтовая раскладка идентична v2**, и для кода пака ничего не меняется, потому что пакам по-прежнему нельзя называть uniform напрямую (заголовок движка помечает его как предоставляемый движком и read-only, «which packs can't name»); продолжайте работать через функции заголовка `bloxdSeconds()` / `bloxdRenderOffset()`.
- В группе 3 пака появился второй задокументированный ресурс: `@group(3) @binding(1)` — текстура глубины сцены, которую читает `bloxdOpaqueBehind()` (полная реализация в §51). 64-байтный uniform остаётся на binding 0; паки по-прежнему не могут называть ни один из биндингов.

## 42. blockId становится blockFlags: материалы блоков как битовые флаги (главное)

Во всех трёх структурах входов хуков (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`) поле v2 `blockId: u32` **заменено** на `blockFlags: u32`. Текст движка о поле: *"What kind of block this face is: `bloxdBlockFlag*` bits, the same across the face."* Движок теперь сам поставляет данные материала, так что подходы v2 — угадывание материалов по диапазонам числовых id или таблицы id в мире ([часть VIII](08-apiv2.md) §34) — больше не нужны.

Биты выставлены как именованные константы:

```wgsl
// Проверка: (blockFlags & bloxdBlockFlagRock) != 0.
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| Значение | Константа | Смысл (заметки движка, сокращённо) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | Полностью непрозрачный — включая листву и лёд. Не стекло, вода, лава, спавнеры, призрачные и невидимые блоки. |
| 2 | `bloxdBlockFlagEmissive` | Источает блочный свет, как неон, порталы, лампы, лава и маяк. Светящиеся руды считаются, даже если слабо. |
| 4 | `bloxdBlockFlagVegetation` | Листва и трава на травяных блоках (травяные блоки тоже несут dirt). Не кактусы, грибные блоки и сено. |
| 8 | `bloxdBlockFlagDirt` | Dirt и soil, включая травяные блоки. Rocky Dirt — тоже rock. |
| 16 | `bloxdBlockFlagSand` | Песок, красный песок и любой песчаник — который тоже rock. |
| 32 | `bloxdBlockFlagRock` | Камень и его виды, андезит, диорит, гранит, гравий, руды, песчаник, Rocky Dirt, бедрок, обсидиан и магма. |

Блок из нескольких материалов несёт **каждый** подходящий флаг (пример самого движка: песчаник — это песок и камень, поэтому получает оба). Листва — vegetation, но не dirt; травяные блоки — vegetation и dirt одновременно.

Флаги vegetation / dirt / sand / rock назначаются по зарегистрированному **отображаемому имени** блока (opaque / emissive берутся из собственных данных движка о непрозрачности и свечении): имена, оканчивающиеся на `Leaves`, и имя `Grass Block` — vegetation; имена `Dirt` / `Soil` (и каждый `Grass Block`) — dirt; ровно `Sand` и `Red Sand`, а также любое имя, содержащее `Sandstone`, — sand; имена, содержащие `Stone` / `Andesite` / `Diorite` / `Granite` или `Ore`, а также Yellowstone, Gravel, Bedrock, Obsidian, Magma, Rocky Dirt (и песчаник) — rock.

### Точные правила имён (выведите флаги любого блока сами)

Четыре материальных бита вычисляет фиксированный классификатор по зарегистрированному отображаемому имени блока. Сначала отбрасывается суффикс варианта (всё после `|`), поэтому варианты наследуют флаги базового блока. Затем:

| Бит | Правило (вычисляется по имени без суффикса) |
|---|---|
| vegetation | имя **оканчивается на** ` Leaves` или **оканчивается на** ` Grass Block` |
| dirt | имя **ровно** `Dirt`, **оканчивается на** ` Dirt` или ` Soil`, либо **оканчивается на** ` Grass Block` |
| sand | имя **ровно** `Sand` или `Red Sand`, либо **содержит** `Sandstone` |
| rock | имя **ровно** одно из `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt`, **содержит** `Sandstone`, **оканчивается на** ` Ore`, либо содержит `Stone` / `Andesite` / `Diorite` / `Granite` как отдельное слово |

Yellowstone перечислен явно, потому что `Stone` не является отдельным словом внутри `Yellowstone`. Opaque и emissive **не** происходят из имени — они берутся из собственных данных движка о непрозрачности и свечении блочного света, поэтому этими правилами их не вывести.

Источник: классификатор имён движка (модуль 28537, бандл `3ymzdd`); проверено по всем 7 861 именованному блоку, 2026-10-20.

Пример — тинт по материалу блока:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

Влияние на рецепты v2: массив из 22 id листвы из R-H ([часть VIII](08-apiv2.md) §34) сворачивается до `(blockFlags & bloxdBlockFlagVegetation) != 0`. Справочник id ↔ имя блока в [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) остаётся полезным для не-шейдерных задач, но для стилизации материалов больше не нужен поиск по миру.

### Листва без травы (вопрос, который задают все)

`vegetation` сам по себе совпадает с листвой **и** травой на травяных блоках, которые также несут `dirt`. Исключите dirt, чтобы затрагивать только листву — именно это различие прямо прописано в заметках движка к полю:

```wgsl
// Только листва: vegetation без dirt. Травяные блоки — это vegetation И dirt.
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// Только травяные блоки (травяные грани поверхности террейна):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

Проверено по живому реестру (2026-10-20, бандл `3ymzdd`): `vegetation && !dirt` совпадает ровно с 45 регистрациями листвы (22 базовых типа — те же 22, что измерял массив id из R-H в v2); `vegetation && dirt` совпадает ровно с 8 травяными блоками. Исключений ни в одну, ни в другую сторону нет — счётчики реестра на момент той сборки; новые блоки увеличивают числа, не меняя правило. В паре с `vertex.normal` (вверх/вниз) можно выбирать грани, например только верхушки травяных блоков.

## 43. Переименования функций и семантические изменения

| v2 | v3 | Заметки |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | Секунды с момента загрузки страницы (о точности f32 ниже) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | Та же величина: позиция рендера + это = мировая позиция |
| `const bloxdTimeWrap: f32 = 3600` | **удалено** | Задавайте периоды сами на стороне пака |
| `engineColour` (в `BloxdLightIn`) | **удалено** (14 → 13 полей) | Собирайте заново из `litColour` + тумана |
| параметры хуков `v` / `s` / `l` | `vertex` / `surface` / `light` | Написание в шаблоне; сигнатуры не изменились |

- **`bloxdSeconds()`** — секунды с момента загрузки страницы. В f32 в первые 4,5 часа шаг счёта меньше 1 мс, а с 9 до 18 часов — около 4 мс. Заголовок рекомендует идиому `bloxdSeconds() % period`, которая считает от 0 до `period`, а затем начинается заново — чистая замена удалённой константы wrap.
- **`bloxdRenderOffset()`** — целые блоки: «a render position plus this is a world position». Он меняется, пока игрок двигается, поэтому позиции рендера остаются близко к игроку — и потому точными. По всему руководству то, что текст v2 называл noa-локальным смещением, теперь последовательно называется **позицией рендера** / смещением рендера; это та же величина, которую возвращал `bloxdOriginOffset()`.
- **`bloxdTimeWrap` удалена** — пак, заворачивавший время на 3600 с, теперь объявляет свою константу, например `const timeWrap: f32 = 3600.0;`, и использует `% timeWrap`.
- **Семантика света по умолчанию** — дефолт v2 был `engineColour + emission × fogVisibility`; дефолт v3 собирает его как `bloxdApplyFog(litColour + emission, light)` — **emission теперь ослабляется туманом внутри дефолта**, так что итоговый выход целиком проходит через смешивание с туманом. Таблица переноса:

  | Выражение v2 | Перенос v3 |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // перенос v2-чтения `l.engineColour + s.emission * l.fogVisibility` в v3:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **Не изменились по имени и смыслу**: `bloxdEyePosition()`, `bloxdSunDirection()`, `bloxdFaceBlock()`, `bloxdApplyFog()`, `bloxdWorldPosition()`.

## 44. Новые константы заголовка: `bloxdPi` и `bloxdTau`

```wgsl
// Пол-оборота и полный оборот, в радианах.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

Они полезны и в тригонометрии, и тем, что избавляют от хардкода π. Следите за повторным использованием имён: локальная константа пака с тем же именем теперь конфликтует с проверкой заголовка на дубликаты идентификаторов — уберите или переименуйте любое повторное объявление `bloxdPi` / `bloxdTau` в своём коде.

## 45. Шаблон из шести хуков (жидкостные хуки официально показаны)

Поставляемый со сборкой текст пака по умолчанию теперь содержит **все шесть хуков** — terrain / liquid × vertex / surface / light — и каждый возвращает свой дефолт движка. Комментарии движка описывают его так: *"Every hook returns its engine default. Copy a hook and change its output to start a shader pack."*

```wgsl
// Каждый хук возвращает свой дефолт движка. Скопируйте хук и измените
// его выход, чтобы начать шейдер-пак.

// Strict-игры оставляют террейн на месте: без guard'а этот хук отключил бы
// весь шейдер-пак там.
#ifndef BLOXD_STRICT
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

// Вода использует эти. Если удалить, вода использует ваши террейн-хуки.
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
```

- Комментарии хуков прямо формулируют правила жидкостей: **воде нужен свой набор из трёх хуков; удалите его, и вода снова использует ваши террейн-хуки** (поведение fallback, известное из v2, [часть VIII](08-apiv2.md) §36, теперь прописано в самом шаблоне).
- `bloxdLiquidVertex` находится под тем же guard'ом `#ifndef BLOXD_STRICT`, что и `bloxdTerrainVertex` — без guard'а он отключил бы весь пак в strict-играх так же, как vertex-эффекты террейна.
- В шаблоне теперь используются полные имена параметров `vertex` / `surface` / `light` (шаблон v2 использовал короткие `v` / `s` / `l`). Имена параметров в вашем коде свободны — важны только сигнатуры.

## 46. Матрица вариантов: ось программы и изменения макросов

Варианты генерируются по матрице **strict × lighting × program** — те же 8 комбинаций, что в v2, но terrain / liquid теперь явная ось матрицы. В именах вариантов она записывается как `allow|strict · unlit|lit · terrain|liquid`, а в UI показывается как `terrain` / `liquid`, `strict` / `non-strict`, `lighting on` / `lighting off` (и в сообщениях об ошибках может добавляться «(only in {{variants}})»).

| Макрос | Где определён |
|---|---|
| `BLOXD_STRICT` | strict-варианты (обе программы) |
| `BLOXD_LIGHTING` | варианты с включённым светом (обе программы) |
| `BLOXD_ALPHA` | **все жидкостные варианты** плюс не-strict **террейн**-варианты |
| `BLOXD_SCENE_DEPTH` | **все жидкостные варианты** |

Для авторов меняются две вещи по сравнению с правилами v2 ([часть VIII](08-apiv2.md) §36):

- **`BLOXD_ALPHA` не изменился по сравнению с v2.** Генератор вариантов содержит буквальную строку `"liquid"!==program&&strict||push("BLOXD_ALPHA")` — приоритет операторов JS делает *(террейн **и** strict)* единственным случаем, когда push пропускается, поэтому макрос определён в **каждом жидкостном варианте (strict или не-strict) и в не-strict террейне**; его опускает только strict-террейн. Код `#ifdef BLOXD_ALPHA` на жидкостной стороне компилируется ровно как всегда, и запись alpha из §49 (вставляемая для жидкостных программ или не-strict вариантов) точно соответствует этому набору.
- **`BLOXD_SCENE_DEPTH` всегда определён в жидкостных вариантах**, поэтому использование глубины там остаётся допустимым без guard'а, ровно как в v2 (§35); в террейн-хуках по-прежнему нужен `#ifdef BLOXD_SCENE_DEPTH`.

## 47. Чек-лист миграции v2 → v3

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** во всех трёх входных структурах; выражайте стилизацию материалов битовыми проверками констант `bloxdBlockFlag*` (§42); выбросьте эвристики по диапазонам id из v2
3. **`bloxdTime()` → `bloxdSeconds()`**; объявите свой период вместо удалённой `bloxdTimeWrap` (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **Пересоберите математику света с `engineColour` на `litColour` + туман** по таблице §43; учтите, что дефолт теперь ослабляет emission туманом
6. **Жидкостные хуки**: явно определите `bloxdLiquid*`, если хотите обрабатывать воду иначе; не определяйте их, чтобы вернуться к террейн-хукам
7. **Проверка guard'ов `BLOXD_ALPHA` не нужна** — его набор вариантов не изменился с v2: все жидкостные варианты плюс не-strict террейн определяют его, опускает его только strict-террейн (§46)
8. **Используйте `bloxdPi` / `bloxdTau`** там, где были захардкожены тригонометрические константы; удалите локальные повторные объявления, которые теперь дублируют заголовок
9. **Сохраняйте strict-guard'ы**: vertex-хуки и `discard` остаются обёрнутыми в `#ifndef BLOXD_STRICT`; шаблон защищает `bloxdLiquidVertex` так же, как террейн
10. **Проверяйте в игре** — компилируйте и тестируйте пак в игре, поддерживающей шейдер-паки

## 48. Прочие изменения и заметки v3

- **Валидация остаётся двухступенчатой** ([часть VIII](08-apiv2.md) §38): сначала статическая валидация, затем настоящая WebGPU-компиляция браузера через сгенерированные заглушки, вызывающие ваши хуки, с привязкой ошибок обратно к исходным файлам / строкам, а диагностика восстанавливает исходные имена идентификаторов движка через отображение.
- **Strict-диагностика называет причину**: vertex-хук, двигающий террейн, сообщает «… moves terrain, which strict games prevent.», а `discard` в surface / light-хуках — «discard makes terrain see-through, which strict games prevent.»; UI настроек сохраняет указание «wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`.» (`offInStrict`).
- **Сообщения загрузчика**: виды ошибок и лимиты не изменились; «Zip64 archives aren't supported.» выводится как сообщение UI (`loadZip64`). Инвентарь строк UI паков насчитывает 57 ключей `shaderPack:*`; среди ошибок стадии загрузки набор дополняют `loadNoWgsl` (zip без единого файла `.wgsl`) и `loadNotZip` (файл без сигнатуры конца zip-архива).
- **В игровом UI паков нет WGSL-редактора.** Экран настроек не предлагает редактор шейдерного кода — паки пишутся как zip-файлы вне игры. (CodeMirror в бандле есть, но это редактор JavaScript для UI скриптинга кастомных игр; поддержки WGSL у него нет, и с системой паков он не связан.)
- **Аппаратный порог**: Lite требует драйвер с поддержкой функции WebGPU `shader-f16`; слишком старые драйверы отклоняются сообщением вроде «Intel driver too old for Lite (no shader-f16)».
- **Смена освещения перепроверяет сохранённые паки**: когда настройка освещения меняется во время выполнения, движок заново запускает проверку пака (`changed → recheck`); просмотр реплеев вызывает тот же хук с `changed: false` и перепроверку пропускает.
- **Формулировки**: текст об играх, принимающих шейдер-паки, теперь читается как «in games that **support** them».
- **Область действия заголовков**: набор игр, где работают паки, не изменился по сравнению с предыдущей сборкой.

## 49. Внутрянка движка: как Lite-рендерер вызывает ваши хуки

Всё в §40–§48 — это то, что вам сообщают загрузчик и заголовок. Этот и следующие разделы документируют, что движок на самом деле делает во время выполнения; всё это восстановлено из продакшн-бандла (Lite-рендерер — чанк на 175 КБ; настоящее имя исходного файла интеграции `lite/terrainShaderPack.ts` сохранилось в его строках ошибок). Ничто из этого не меняет того, что вы пишете, но убирает догадки о том, что получают ваши хуки — и закрывает несколько вопросов, которые другие руководства сообщества до сих пор числят открытыми.

Рендерер не «вызывает» ваши хуки из JavaScript. Когда пак проходит валидацию, движок **вставляет вызовы ваших хуков в собственный WGSL террейна**, заменяя фиксированные якорные строки в тексте шейдера. Якорь должен совпасть ровно один раз — ноль или несколько совпадений прерывают работу с `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Стадия | Якорная строка в шейдере движка | Что вставляется |
|---|---|---|
| vertex | блок из четырёх строк от `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` до `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);` | собрать `BloxdVertexIn`, вызвать ваш vertex-хук, записать `worldPos` обратно — вставка ещё и переписывает `let worldPos` в `var worldPos` |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | собрать `BloxdSurfaceIn`, вызвать ваш surface-хук, записать `baseColor` / `alpha` обратно |
| lit colour | прямо перед `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` | `let bloxdSpLitColour = color.rgb;` — захватывает цвет до тумана |
| light | финальная строка `return color;` во фрагментном шейдере | собрать `BloxdLightIn`, вызвать ваш light-хук, записать `color` обратно — после смешивания с туманом |

Вставленный код, восстановленный из отгруженного бандла (выражения уровней света местами сокращены, где форматирование движка слишком длинное):

```wgsl
// vertex-стадия — не-strict варианты с vertex-хуком
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* your bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// fragment-стадия — surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* your surface hook */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // вставляется, только если программа жидкостная или вариант не-strict
```

```wgsl
// fragment-стадия — light
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // directional
        ambient,                                 // ambient
        /* varying уровня света */.rgb,          // blockLight
        /* sky-канал того же varying */,         // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* поле ручного света (см. ниже) */,     // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour — чёрный только при полном отсутствии тумана
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* your light hook */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

Из этой вставки напрямую следуют четыре факта о принуждении:

- **Strict-террейн игнорирует изменения alpha из surface-хука.** Запись `alpha = bloxdSpSurface.alpha` вставляется только для жидкостных программ или не-strict вариантов — реализация, стоящая за таблицей макросов из §46. (В strict-террейне ваш код `#ifdef BLOXD_ALPHA` и так не компилируется; теперь ещё подтверждено, что незащищённые записи alpha там отбрасываются.)
- **Strict-вариант, который всё же объявляет vertex-хук, никогда его не запускает** — движок сообщает об этом во время сборки: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. Поэтому официальный шаблон (§45) оборачивает `bloxdLiquidVertex` в тот же `#ifndef BLOXD_STRICT`, что и его террейн-близнеца.
- Идентификаторы `bloxdSp*` — **всего 14**: `bloxdSpVertexIn`, `bloxdSpVertex`, `bloxdSpSurfaceIn`, `bloxdSpSurface`, `bloxdSpLightIn`, `bloxdSpLight`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, `bloxdSpPositionW`, `bloxdSpZ`, `bloxdSpEye`, `bloxdSpScale`, `bloxdSpBehind` — временные переменные движка. Ваш код их никогда не видит, но они всплывают в диагностике и в любых результатах обратной разработки, так что их стоит узнавать с первого взгляда.
- **Сокращение для дефолтного surface.** Когда surface-хук варианта — буквально `bloxdDefaultSurface`, движок вообще не вставляет строки записи `baseColor` / `alpha` — дефолт и так выдаёт эти значения, так что присваивание было бы мёртвым кодом. Неизменённые цепочки хуков ничего не стоят.

**Что на самом деле питает `BloxdLightIn`** — поле за полем, из вставленного кода:

| Поле | Источник на стороне движка |
|---|---|
| `litColour` | цвет фрагмента, захваченный прямо перед смешиванием с туманом (якорь `bloxdSpLitColour`) — «before emission and fog», как говорит заголовок |
| `directional` | `vTerrainLambert` — интерполированная по вершинам сумма `max(0, dot(normal, lightDirection)) × intensity` по направленным светам сцены (формула в §54); 0, если в сцене их нет |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — по материалу, на кадр |
| `blockLight` | `.rgb` декодированного varying уровней света (декодирование в §54) |
| `skyLight` | sky-канал того же varying уровней света — *"Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING"* (текст заголовка) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | поле ручного света, собранное из w-канала varying уровней света вместе с кадровыми uniform `uHeldLightPos` / `uHeldLightColour` ([часть VII](07-internals.md) §26 документирует затухание и поведение пола каналов) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **чёрный только в сцене без тумана вообще** (режим 0, §50) |
| `fogVisibility` | ограниченный коэффициент тумана — точное значение, которое возвращает функция из §50 |
| `position` / `normal` | varying `vPositionW` / `vNormalW` (нормаль перенормируется на фрагмент) |
| `blockFlags` | flat varying `vBlockFlags` — полный путь доставки из §52 |

Для ориентации при чтении старого материала: идентичная архитектура вставки существовала в рендерере v2, а единственные интеграционные отличия v3 — `vBlockId` → `vBlockFlags` и добавленные жидкостные варианты. Система хуков архитектурно стабильна, несмотря на разрыв между v2 и v3.

## 50. Функция тумана: четыре режима, одно поле

Восстановлено дословно из продакшн-шейдера террейна:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // линейный
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // экспоненциальный
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // экспоненциальный в квадрате
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = туман выключен (коэффициент остаётся 1.0)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)` — один vec4 управляет всем.
- **В шейдере существуют четыре режима: 0 = выкл., 1 = экспоненциальный, 2 = экспоненциальный в квадрате, 3 = линейный.** `fogVisibility` — это ограниченный коэффициент, какой бы режим ни работал — поле ровно одно, и флаг режима никогда не выставляется пакам.
- Собственные заголовки Bloxd используют режим 3 (линейный) с 32-блочной полосой, описанной в [части VII](07-internals.md) §25 (`fogStart = 32 × D`, `fogEnd = 32 × (D + 1)`), так что наблюдение «всегда линейный» из той части по-прежнему верно для штатных игр. Однако экспоненциальные режимы — настоящий живой код движка: заголовок может переключить `vFogInfos.x` и изменить кривую без обновления клиента. Рецепты дистанции, которые сами считают `distance(l.position, bloxdEyePosition())` (рецепт R-B), — надёжный способ писать завязанный на дистанцию вид, поскольку переключение режима их не сдвинет.
- Это закрывает вопрос «какую кривую тумана движок на самом деле использует» по исходникам: реализованы все четыре; поставляемые заголовки используют линейный. (Та же функция объясняет и комментарий заголовка о fogColour — режим 0 единственный, где `fogColour` приходит чёрным, а игры Bloxd никогда не поставляют режим 0; вместо этого они отодвигают туман далеко, [часть VII](07-internals.md) §25.)

## 51. bloxdOpaqueBehind(): точная реализация

Вся функция, восстановленная дословно из продакшн-билда:

```wgsl
@group(3) @binding(1) var bloxdSpSceneDepth: texture_2d<f32>;
var<private> bloxdSpPixel: vec2i;
var<private> bloxdSpPositionW: vec3f;

fn bloxdOpaqueBehind() -> BloxdOpaqueBehind {
    let bloxdSpZ = textureLoad(bloxdSpSceneDepth, bloxdSpPixel, 0).r;
    if (bloxdSpZ <= 0.0) {
        return BloxdOpaqueBehind(false, vec3f(0.0), 0.0);
    }
    let bloxdSpEye = bloxdPackInputs.eyePosition;
    let bloxdSpScale = max(bloxdSpZ / (scene.view * vec4f(bloxdSpPositionW, 1.0)).z, 1.0);
    let bloxdSpBehind = bloxdSpEye + (bloxdSpPositionW - bloxdSpEye) * bloxdSpScale;
    return BloxdOpaqueBehind(true, bloxdSpBehind, distance(bloxdSpBehind, bloxdSpEye));
}
```

- **Текстура глубины живёт на `@group(3) @binding(1)`** — группа 3 — собственная группа пака: binding 0 — 64-байтный uniform `bloxdPackInputs` (§41), binding 1 — эта текстура глубины. Оба ресурса предоставлены движком, и вы не можете обращаться к ним по имени.
- **Текстура глубины — unfilterable-float, ресурс только для фрагмента.** Раскладка bind-group регистрирует её как `texture: { sampleType: "unfilterable-float" }` с видимостью только `GPUShaderStage.FRAGMENT` — именно поэтому `bloxdOpaqueBehind()` построен на `textureLoad` (явные координаты тексела, mip 0), а не на `textureSample`: аппаратная фильтрация для этой текстуры просто недоступна.
- `z ≤ 0` означает, что выборка глубины ни во что не попала (дальняя плоскость / небо): `found = false`, а `position` / `distance` бессмысленны — всегда сначала проверяйте `found`.
- Возвращаемая позиция — **пересечение с масштабированием луча**: непрозрачная поверхность ставится в `eye + (fragment − eye) × max(z / viewDepth, 1)`. `distance` измеряется от глаза до этой точки — для паков, рисующих воду, это фактически «сколько воды луч прошёл до удара во что-то твёрдое», что и заставляет рецепты воды с тинтом по глубине работать без второго буфера глубины.

## 52. blockFlags от начала до конца: от регистрации до вашего хука

§42 рассказывает, что означают биты. Этот раздел — полный путь, который бит флага проходит от регистрации блока до вашего хука — каждый шаг подтверждён по продакшн-исходнику, что также доказывает «the same across the face» из заголовка вплоть до уровня байтов.

**1. Регистрация (база определений блоков).** Флаги каждого блока вычисляются один раз, при регистрации:

```js
flags[id] = nameFlags                     // правила отображаемого имени (§42): vegetation / dirt / sand / rock
          | (definition.opaque === true ? 1 : 0)   // бит opaque — данные непрозрачности движка
          | (anyFaceEmission >= 1       ? 2 : 0);  // бит emissive — данные свечения блочного света
```

Правила отображаемого имени покрывают только четыре материальных бита; два физических бита приходят из отдельных данных движка — `opaque` прямо из определения блока, `emissive` из массива свечения блочного света по граням. «Glowing ores count, however faint» из заголовка — буквально: любая грань с излучением ≥ 1 ставит бит.

**2. От блока к материалу (инициализация мешера).** Террейн рисуется по *материалам*, а не по id блоков, поэтому флаги перетабулируются в таблицу материалов (`Uint16Array` с индексацией по id материала, каждый материал берёт флаги первой грани своего блока). Таблица отправляется в Web Worker мешинга — но **только в конфигурациях, где включён конвейер паков**; иначе таблица `null`, и байты флагов не записываются вовсе. Игроки без паков не платят ничего — так устроено конструкцией.

**3. В байты вершин (worker мешера).** Флаги едут в двух свободных байтах существующих интерливинг-данных вершины:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // младшие 8 бит → альфа-байт атрибута цвета
        buffer[o + normalOffset + 3] = flags >> 8;    // старшие 8 бит → w-байт атрибута нормали
    }
}
```

Все четыре вершины грани получают одно и то же значение — смысл «the same across the face» на уровне реализации.

**4. Декодирование на стороне GPU (шейдер террейна Lite).** Два байта едут как вершинный атрибут `blockFlagWords: vec2u` (location 7, присутствует только когда конвейер паков включён) и собираются обратно на vertex-стадии:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags` объявлен `@interpolate(flat)` — константа на грань вплоть до fragment-стадии, поэтому битовые проверки из §42 стабильны внутри грани и никогда не дают смешивания посередине грани.

- Конвейер резервирует **16 бит** ёмкости (декодирование собирает два полных байта), тогда как v3 определяет только 6 — будущие флаги могут появиться без очередного изменения формата вершин или бампа API.
- В режиме упакованных вершин те же два байта едут внутри `packed.y` и старшего байта слова цвета вместо выделенного атрибута — те же значения, другой контейнер.
- О вопросе «листва или трава», который чаще всего задают про эти флаги, см. [Листва без травы](#листва-без-травы-вопрос-который-задают-все) в §42.

## 53. Внутрянка валидации: HEADER_VERSION, сигнатуры, зарезервированные имена

**Измеренный хэш заголовка.** Каждая валидация пака штампуется `HEADER_VERSION` движка. Прямое исполнение продакшн-модуля валидации (см. заметку о стенде в конце §54) даёт измерение:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← измерено из живого продакшн-бандла
```

Это хэш FNV-1a-32 (с префиксом `6.`) от пяти входов: заголовок движка, препроцессированный и токенизированный **по варианту** (одна запись на каждый из 8 вариантов), полный лексический универсум парсера WGSL, четыре имени макросов, карта специальных функций и объявление `BloxdPackInputs` вместе со строкой uniform `@group(3) @binding(0)`. Два следствия для авторов:

- **Любая правка заголовка на стороне движка пересчитывает хэш** — это механизм автоматической пометки «нужна перепроверка», которую сохранённые паки получают после обновлений движка ([часть VIII](08-apiv2.md) §31).
- Хэш покрывает *заголовок движка*, а не ваш код. Пак, который продолжает загружаться после обновления движка, не «всё ещё валиден» — просто он пока не задел изменение заголовка. Единственная проверка версии, в которой участвует ваш манифест, — ворота `apiVersion` (§40).

**Проверка сигнатур хуков: точность по токенам в типах, свобода в именах.** Валидатор держит одну сигнатуру на слот хука:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

Сопоставление **токен за токеном**: имена типов параметров должны совпадать точно, `->` и возвращаемый тип должны совпадать точно, а количество параметров и расстановка запятых проверяются. Имена параметров свободны — любой идентификатор на месте параметра принимается, поэтому ваш `fn bloxdTerrainLight(s, l)` компилируется, хотя шаблон пишет его `(surface, light)`. Light-хук принимает ровно два параметра.

**Зарезервированные имена.** Правило — один regex: `/^bloxd/i`. Любой идентификатор, начинающийся с `bloxd`, зарезервирован — все идентификаторы `bloxd*` предоставляет движок, и пак не может объявлять что-то в этом пространстве имён (поэтому же повторные объявления `bloxdPi` / `bloxdTau` из §44 конфликтуют).

**Специальные функции.** В v3 зарегистрирована ровно одна:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

«Специальная» значит *привязанная к макросу* — функция движка, доступность которой зависит от символа варианта. Две диагностики guard'ов обеспечивают правильное использование:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — vertex-хук, дотягивающийся до функции, доступной только surface/light-хукам.
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — например, `bloxdOpaqueBehind()` на стороне террейна без обёртки `#ifdef BLOXD_SCENE_DEPTH`.

**Заголовок движка (прелюдия) закреплён.** Заголовок v3 — строка длиной 5 637 байт, начинающаяся с `// Engine-provided and read-only, prepended to all packs. apiVersion 3.` Он несёт директивы `#if` / `#ifdef`, которые собственный препроцессор движка вычисляет для каждого варианта — движок действительно вычисляет выражения `#if`, а при некорректном выражении возникает ошибка `Cannot evaluate #if ...`. Каждая структура, сигнатура функции и цитируемый комментарий в этом руководстве происходят из этого отрендеренного текста, поэтому руководство и поставляемый заголовок не могут разойтись.

**Заметки о парсере для авторов.**

- Функции на стороне пака переименовываются с префиксом `pack_` при слиянии в шейдер движка (избегание коллизий); диагностика отображает их обратно в ваши исходные имена — тот же механизм, который [часть VIII](08-apiv2.md) §38 описывает для второй ступени валидации.
- Сообщение о необъявленном идентификаторе читается как `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`; `_ can only be the target of a phony assignment, as in _ = f();` и `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.` дополняют недавно подтверждённый набор.
- Лексический универсум парсера включает идентификаторы, которые **не являются стандартным WGSL**: `bufferView`, `bufferArrayView`, `bufferLength`, `atomicStoreMax`, `atomicStoreMin`. Движок знает их как встроенные, но гарантии, что конкретная реализация WGSL в браузере их предоставляет, нет — никогда не стройте на них распространяемый пак.

## 54. Подтверждённые константы, лимиты и раскладки

Полная раскладка ресурсов террейн-программы, прямо из продакшн-рендерера Lite:

| Binding | Содержимое |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms` — `viewProjection` mat4x4f, `view` mat4x4f, `vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`, `uSkyLightColour`, `uAmbientLightColour`, **`vFogInfos`**, `vFogColor`, `outputHeight`, `sceneAmbient`, **`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: storage `array<vec4f>` — xyz = перенос в кадр рендера, w = видимость при появлении |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`, `ambientAndCutoff`, `emissiveAndLevel`, `anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — uniform пака (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — текстура глубины (§51) |

- **Направленные света жёстко ограничены четырьмя.** Рендерер завершается с ошибкой `Terrain supports 4 directional lights, not ${n}`, если сцена пытается зарегистрировать больше. `l.directional` — суммарный Ламберт по стольким, сколько есть (0–4; собственные сцены Bloxd используют 2 — [часть VII](07-internals.md) §27). Кроме того, террейн предупреждает о светах, которые не может учесть, дословно: свет, добавленный поздно — `Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`; тонированный — `Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`; и свет с фильтрацией мешей — `Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **Именование террейн-программы**: ключи кэша пайплайна читаются как `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}` — пак обнаруживается по суффиксу `-sp{variant}`, одна программа на вариант из §46. Наблюдатель (`watchPipelineFailures`) сопоставляет имена живых пайплайнов с `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/` и перепроверяет соответствующий вариант пака при сбое компиляции пайплайна; потеря GPU-устройства (`device.lost`) проверку пропускает.
- **`BLOXD_TERRAIN_DIRECTIONAL` — внутренний макрос движка** (определён при dirLightCount > 0). Это *не* один из четырёх макросов прелюдии, и он никогда не доходит до кода пака — но появляется в дампах WGSL собственных шейдеров движка, так что узнавание его экономит путаницу.
- **Декодирование уровней света**: вершинный атрибут `aPackedLightLevels` — один f32, упаковывающий четыре ниббла, каждый делится на 15: rgb = цветной блочный свет, a = канал неба / ручного света. Vertex-стадия декодирует его в varying `vLightLevels`; `blockLight` читает `.rgb`, канал неба / ручного света читает `.w`. Движок поднимает rgb-каналы до пола в 35% ярчайшего канала перед интерполяцией — якорь на стороне движка для подъёма, который [часть VII](07-internals.md) §26 описывает со стороны геймплея.
- **`vTerrainLambert`** (источник `directional`, §49) генерируется как сумма по активным направленным светам: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, под guard'ом `BLOXD_TERRAIN_DIRECTIONAL`.
- **Индексные буферы становятся 32-битными на первом крупном меше.** Lite-рендерер выбирает индексы `Uint16Array`, только пока каждое значение индекса остаётся ≤ 65 534 — как только любой индекс достигает 65 535, буфер становится `Uint32Array` (отслеживается для каждого буфера флагом `is32Bits`). На практике: меш чанка не более чем с 65 535 вершинами помещается в 16-битные индексы; меш ровно с 65 536 вершинами неизбежно выдаёт индекс 65 535 и переключает весь буфер на 32 бита.
- **Детали загрузки манифеста**: zip-записи под `__MACOSX/`, файлы с префиксом `._` и `.DS_Store` отфильтровываются (шум macOS-архива); `pack.json` ищется сравнением путей в нижнем регистре — ноль совпадений → `loadNoManifest`, два и более → `loadDuplicateManifest`; чтение манифеста ограничено 65 536 байтами.
- **Как всё это проверялось**: модули продакшн-бандла были восстановлены (165 чанков; реестр webpack насчитывает 4 951 модуль в этом бандле — счётчик модулей смещается на несколько штук в зависимости от того, включены ли асинхронные дочерние зависимости, так что точное число стоит считать привязанным к конкретному бандлу) и исполнены в webpack-совместимом стенде под Node.js. Измеренный `HEADER_VERSION` (§53), отрендеренный заголовок на 5 637 байт, канонический порядок таблицы вариантов и карта специальных функций — всё это получено *исполнением отгруженного кода*, а не чтением строк. Тот же стенд — естественное ядро для сообщественного `pack_check` v6: исполнение собственного валидатора движка против пака в точности воспроизводит его вердикты.

---

Исследование: ltf_ahel (исследование проведено с помощью glm)

[← Предыдущая часть](08-apiv2.md)·[Вернуться к руководству](README.md)
