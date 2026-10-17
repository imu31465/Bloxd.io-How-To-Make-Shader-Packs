[← Предыдущая часть](4-realism.md)·[Вернуться к руководству](README.md)·[Следующая часть →](6-implementation.md)

# Часть V: Решение проблем и замечания

## 17. Частые ошибки и фиксы

| Симптом | Фикс |
|---|---|
| Не грузится в strict-играх | Оберните vertex-хук в `#ifndef BLOXD_STRICT` |
| `.alpha` заявлен как неопределённый | Оберните в `#ifdef BLOXD_ALPHA` |
| `blockLight` заявлен как неопределённый | Оберните в `#ifdef BLOXD_LIGHTING`. Общие helper-функции оборачивайте **целыми функциями** (в v2 поля есть всегда, так что обычно не случается. Guard'ы для детектирования оставляйте) |
| `Packs can't construct BloxdSurface directly` | Начинайте с `bloxdDefaultSurface(s)` |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | Оберните в `#ifndef BLOXD_STRICT` |
| Белая молочная даль | Чаще двойной туман. Готовый цвет уже с туманом: свой держите сдержанно и лучше снижайте только saturation |
| Пак исключили при входе в игру | Падает live-проверка игры. Проверьте пропуски guard'ов |
| `pack.json needs "apiVersion": 2.` | Нет `apiVersion` или не `2`. Впишите число `2` (строка `"2"` отклоняется). Паки v1 отклоняются с `shaderPack:loadWrongApiVersion` |
| `There's no pack.json at the top of the pack.` | Нет `pack.json` в корне ZIP. Проверьте, не упаковали ли саму папку |
| `bloxdTerrainVertex must be declared as: fn ...` | Сигнатура отличается. Перепишите в точности как показано |
| `bloxdTerrainVertex can't run in strict games...` | Оберните vertex-хук в `#ifndef BLOXD_STRICT` |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | Оберните в `#ifdef BLOXD_LIGHTING` (в v2 поля есть всегда, так что обычно не случается) |
| Крутите `pow(l.skyLight, γ)` — тени не углубляются никогда | `skyLight` — значение пост-кривой (сырое 0.87 приходит как 0.97). Переходите на инверсию лифта + порог R9.12 (раздел 10) |
| `... can only be a function's parameter or return type, ...` | Неинициализированный `var x: BloxdSurface;` отклоняется. Стройте от `bloxdDefault*` |
| `bloxdPackInputs isn't part of the bloxd_ header` | Uniform PackInputs нельзя ссылать из паков напрямую. Используйте через функции заголовка вроде `bloxdTime()` |
| `Packs can't declare bloxd_ names...` | Уберите префикс `bloxd_` из своих идентификаторов. Определять можно лишь 6 имён хуков |
| `loadDuplicateManifest` при загрузке zip | Два `pack.json` (включая регистровые варианты). Оставьте один |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Переписывайте от `bloxdDefaultSurface(s)` и т.д. Старт с копии первого параметра light-хука (`var out = s;`) тоже годится |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` невозможен. Пишите `_ = f();` |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | Оборачивайте вызовы `bloxdOpaqueBehind()` в хуках террейна в `#ifdef BLOXD_SCENE_DEPTH` |
| `...only surface and light hooks can use.` | Уберите `bloxdOpaqueBehind()` из vertex-хуков (только surface / light) |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Не ошибка, а автодеактивация в strict-играх (`shaderPack:offInStrict`). Оборачивайте vertex-хуки и `discard` в `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Ошибка второй ступени (браузерный Tint). Операнды `^` `&` `\|` `<<` `>>` берите в скобки (§38) |

## 18. Права и замечания

- Функция шейдер-паков — официальная функция, загружаемая из интерфейса игры, и создание паков считается предусмотренным использованием. Но подтверждённой публичной официальной документации нет
- Паки — чистый WGSL: выполнение JS и доступ к сети невозможны по конструкции
- Это неофициальное руководство, а не официальная позиция разработчиков. API может измениться без уведомления
