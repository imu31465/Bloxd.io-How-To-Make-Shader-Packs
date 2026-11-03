# Ошибки загрузки

> Целевой API: 5 · Статус: Verified

Ошибки, на которых пак отклоняется на **этапе загрузчика** (первый рубеж); показываются в строке состояния настроек с id вида `shaderPack:load*`.

## "There's no pack.json at the top of the pack."

- **Причина**: в корне zip нет `pack.json` (например, папку запаковали с лишним уровнем вложенности)
- **Проверка**: откройте zip — `pack.json` на верхнем уровне (или прямо под единой общей корневой папкой)
- **Исправление**: запаковывайте `pack.json` и файлы `.wgsl` напрямую. Единственная общая корневая папка снимается автоматически ([Структура пака](../getting-started/pack-structure.md))
- **Профилактика**: держите процедуру архивации неизменной; штатное «Compress» в macOS работает как есть (мусор ОС исключается автоматически)

## `loadDuplicateManifest` при загрузке zip

- **Причина**: два файла `pack.json` (включая различия в регистре)
- **Исправление**: оставьте ровно один

## Лимиты размера и количества

| Сообщение | Лимит |
|---|---|
| `The zip is over 32 MB.` | zip 32 МБ |
| `The zip has more than 1024 entries.` | 1 024 записи |
| `The pack has more than 256 .wgsl files.` | 256 файлов `.wgsl` |
| `The pack's .wgsl files are over 256 KB in total.` | 256 КБ суммарно |
| `pack.json is over 64 KB.` | манифест 64 КБ |

- **Исправление**: выбросьте ненужные файлы `.wgsl` / объединяйте файлы / сокращайте комментарии
- **Профилактика**: эти лимиты — ещё и практические потолки времени компиляции; относитесь к росту как к сигналу на рефакторинг

## Проблемы формата

Разрезанные (split) zip, zip64, зашифрованные записи и неподдерживаемое сжатие отклоняются, причём для каждого случая — своё отдельное сообщение. Все файлы должны быть корректным UTF-8.

## Справочник id ошибок загрузчика

| id | Значение |
|---|---|
| `loadZipTooBig` | zip больше 32 МБ |
| `loadTooManyZipEntries` | больше 1 024 записей |
| `loadTooManyWgsl` | больше 256 `.wgsl` |
| `loadSourceTooBig` | больше 256 КБ суммарно (потоковая проверка по каждому файлу) |
| `loadManifestTooBig` | `pack.json` больше 64 КБ |
| `loadManifestNotJson` / `loadManifestNotObject` | не JSON / не объект |
| `loadNoApiVersion` / `loadWrongApiVersion` | отсутствует / не `5` ([Ошибки версии API](api-version.md)) |
| `loadNoName` / `loadAuthorNotString` | отсутствует `name` / `author` не строка |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | неподдерживаемое сжатие / zip64 / split / шифрование |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | дублирующийся путь / не UTF-8 / ошибка распаковки / повреждённый zip |
| `loadNoManifest` / `loadDuplicateManifest` | расположение манифеста / дублирование |

## "Ready. Reload the page to use it." но ничего не меняется

- **Причина**: пакам для активации нужна **перезагрузка страницы**
- **Исправление**: перезагрузите страницу после выбора; статус должен стать `Ready to use`
- **Заметка**: оставшиеся переопределения рендерера (`?renderer=`, localStorage `bloxdRenderer`) не дают пакам запуститься — удалите их и перезагрузите страницу

## Смотрите также

- [Ошибки версии API](api-version.md) · [Структура пака](../getting-started/pack-structure.md) · [Формат пака](../api/pack-format.md)
