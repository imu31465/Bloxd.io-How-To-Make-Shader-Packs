[← Предыдущая часть](04-realism.md)·[Вернуться к руководству](README.md)·[Следующая часть →](06-implementation.md)

# Часть V: Решение проблем и замечания

> Текущая игра требует `apiVersion: 3` с 2026-10-19 и отклоняет паки v1/v2 при загрузке — приведённое ниже написано по спецификации v2. Перед распространением см. [часть IX](09-apiv3.md) для миграции.

## 17. Частые ошибки и фиксы

| Симптом | Фикс |
|---|---|
| Не грузится в strict-играх | Оберните vertex-хук в `#ifndef BLOXD_STRICT` |
| `.alpha` заявлен как неопределённый | Оберните в `#ifdef BLOXD_ALPHA` |
| `blockLight` заявлен как неопределённый | Оберните в `#ifdef BLOXD_LIGHTING`. Общие helper-функции оборачивайте **целыми функциями** (в v2 поля есть всегда, так что обычно не случается. Guard'ы для детектирования оставляйте) |
| `Packs can't construct BloxdSurface directly` | Начинайте с `bloxdDefaultSurface(s)` |
| `pack.json needs "apiVersion": 3.` | Нет `apiVersion` или не `3`. Впишите число `3` (строка `"3"` отклоняется). Паки v1/v2 отклоняются с `shaderPack:loadWrongApiVersion` |
| `There's no pack.json at the top of the pack.` | Нет `pack.json` в корне ZIP. Проверьте, не упаковали ли саму папку |
| `bloxdTerrainVertex must be declared as: fn ...` | Сигнатура отличается. Перепишите в точности как показано |
| `bloxdTerrainVertex can't run in strict games...` | Оберните vertex-хук в `#ifndef BLOXD_STRICT` |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | Оберните в `#ifdef BLOXD_LIGHTING` (в v2 поля есть всегда, так что обычно не случается) |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | Оберните в `#ifndef BLOXD_STRICT` |
| Крутите `pow(l.skyLight, γ)` — тени не углубляются никогда | `skyLight` — значение пост-кривой (сырое 0.87 приходит как 0.97). Переходите на инверсию лифта + порог R9.12 (раздел 10) |
| `... can only be a function's parameter or return type, ...` | Неинициализированный `var x: BloxdSurface;` отклоняется. Стройте от `bloxdDefault*` |
| `bloxdPackInputs isn't part of the bloxd_ header` | Uniform PackInputs нельзя ссылать из паков напрямую. Используйте через функции заголовка вроде `bloxdTime()` |
| `Packs can't declare bloxd_ names...` | Уберите префикс `bloxd_` из своих идентификаторов. Определять можно лишь 6 имён хуков |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Переписывайте от `bloxdDefaultSurface(s)` и т.д. Старт с копии первого параметра light-хука (`var out = s;`) тоже годится |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` невозможен. Пишите `_ = f();` |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | Оборачивайте вызовы `bloxdOpaqueBehind()` в хуках террейна в `#ifdef BLOXD_SCENE_DEPTH` |
| `...only surface and light hooks can use.` | Уберите `bloxdOpaqueBehind()` из vertex-хуков (только surface / light) |
| `Lite: …reads scene depth on a page that didn't turn it on` | Перезагрузите страницу и откройте заново, пока пак, читающий глубину ([часть VIII](08-apiv2.md) §35), активен. Готовность depth-текстуры фиксируется при создании страницы |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Не ошибка, а автодеактивация в strict-играх (`shaderPack:offInStrict`). Оборачивайте vertex-хуки и `discard` в `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Ошибка второй ступени (браузерный Tint). Операнды `^` `&` `\|` `<<` `>>` берите в скобки (§38) |
| `loadDuplicateManifest` при загрузке zip | Два `pack.json` (включая регистровые варианты). Оставьте один |
| «needs the new WebGPU renderer, so remove the renderer override...» | Уберите `?renderer=` из URL и `bloxdRenderer` из localStorage и перезагрузите ([часть VII](07-internals.md) §29) |
| Белая молочная даль | Чаще двойной туман. Готовый цвет уже с туманом: свой держите сдержанно и лучше снижайте только saturation |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | Предупреждение: очередь сидов блочного света переполнилась (плотные скопления светящихся блоков или через границу зон), расчёт света этого чанка оборвался. Не ошибка пака, но **провалы света у скоплений светящихся блоков — именно эта механика**; лечится разрежением источников на стороне мира |
| Пак исключили при входе в игру | Падает live-проверка игры. Проверьте пропуски guard'ов |
| live-проверка не успевает — `This device couldn't check …`, пак исключён | У проверки жёсткий таймаут 60 секунд (превышение помечается `skipped`). Типично для слабых устройств и тяжёлых миров: сократите нагрузку vertex-обработки и сложные циклы и повторите |

### Список ID ошибок этапа загрузки

Ошибки в экране настроек несут ID вида `shaderPack:load*`. Для поиска по текстам:

| ID | Значение |
|---|---|
| `loadZipTooBig` | zip больше 32MB |
| `loadTooManyZipEntries` | записей zip больше 1024 |
| `loadTooManyWgsl` | файлов `.wgsl` больше 256 |
| `loadSourceTooBig` | суммарный объём `.wgsl` больше 256KB (потоковая проверка пофайлово) |
| `loadManifestTooBig` | `pack.json` больше 64KB |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` — не JSON / не объект |
| `loadNoApiVersion` / `loadWrongApiVersion` | нет `apiVersion` / не `3` (v1/v2 отклоняется) |
| `loadNoName` / `loadAuthorNotString` | нет `name` / `author` не строка |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | неподдерживаемое сжатие / zip64 / многотомный / шифрованный |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | дубликат пути / не UTF-8 / ошибка распаковки / zip повреждён |

`loadNoManifest` / `loadDuplicateManifest` (расположение и дубликат pack.json) — см. соответствующие строки таблицы выше.

## 18. Права и замечания

- Функция шейдер-паков — официальная функция, загружаемая из интерфейса игры, и создание паков считается предусмотренным использованием. Но подтверждённой публичной официальной документации нет
- Паки — чистый WGSL: выполнение JS и доступ к сети невозможны по конструкции
- Это неофициальное руководство, а не официальная позиция разработчиков. API может измениться без уведомления

[← Предыдущая часть](04-realism.md)·[Вернуться к руководству](README.md)·[Следующая часть →](06-implementation.md)
