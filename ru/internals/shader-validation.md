# Валидация шейдеров

> Целевой API: 5 · Целевой билд: `bny9u` · Статус: Analyzed (восстановлено из живого валидатора)

Статическая валидация (анализатор, этап 1 проверки при загрузке). Исправления для пользователя: [Ошибки валидации](../troubleshooting/validation.md).

## Этапы

1. **Лимиты загрузчика** (форма zip / pack.json) → [Формат пака](../api/pack-format.md)
2. **Статическая валидация (анализатор)** — эта страница; синтаксис, типы, зарезервированные имена, контракты хуков по всем 6 вариантам
3. **Настоящая компиляция в браузере** → [Компиляция WGSL](wgsl-compilation.md)
4. **Рантайм-перепроверка при входе в игру** — реально компилирует каждый существующий материал террейна (строже проверки на экране настроек); провал отбрасывает пак для этой игры

## Таблица сигнатур специальных функций

Валидатор держит таблицу в модуле 29849 и проверяет ограничения вызовов между хуками:

```js
const Jq = new Map([
  ["bloxdFragmentBlockPosition", { params: "position: vec3f, normal: vec3f", returns: "vec3i", symbol: null, vertex: true }],
  ["bloxdOpaqueBehind", { params: "", returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }],
  ["bloxdTexel", { params: "textureId: u32, uv: vec2f, mipLevel: f32", returns: "vec4f", symbol: null }],
  ["bloxdTextureSize", { params: "mipLevel: f32", returns: "vec2u", symbol: null }],
]);
```

Восстановленная логика:

- вызов специальной функции без `vertex: true` из вершинного хука → *«X reaches Y, which only surface and light hooks can use.»*
- функция с `symbol` (`bloxdOpaqueBehind` → `BLOXD_SCENE_DEPTH`), достижимая из варианта, который не определяет этот макрос → *«X reaches Y, which needs BLOXD_SCENE_DEPTH, and Z doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH.»*

Примечание: `bloxdFragmentBlockPosition` исчез из генерации заголовка, но его запись остаётся в этой живой таблице — а именно таблицу опрашивает проверка идентификаторов, поэтому вызовы по-прежнему проходят валидацию. Генератор кода также продолжает вставлять определение (terrain/liquid и обе модельные программы), так что функция остаётся вызываемой на практике. Считается устаревшей: не документирована и может быть удалена в любой будущей версии.

## Диагностики зарезервированных имён

- **общее правило `/^bloxd/i`**: *«Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>»*
- **прямые объявления texture/sampler**: *«Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel.»*

## Разрешение имён текстур и диагностики

У разрешения `bloxdTextureId*` есть выделенный путь ([сообщения](../api/texture-api.md#ошибки-разрешения-имён-дословно-из-валидатора)):

- **сворачивание**: разбиение по не-буквенно-цифровым символам, CamelCase, префикс `bloxdTextureId`; обратное сопоставление не различает регистр и подчёркивания
- **подсказки написания** (новое в v5): имена без совпадения получают предложения Левенштейна с порогом `max(2, floor(len/4)) + 1`
- отдельные сообщения для написаний кадров и написаний повёрнутых копий
- имена, неоднозначные после сворачивания, непригодны к использованию

## Новые диагностики v5

- *«BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.»* — называет удалённый макрос
- паки, читающие `blockFlags` или ссылающиеся на `bloxdBlockFlag*`, проваливают диагностику зарезервированных имён — **ни один пак не сбоит молча**

## Переписывание Y-производной

Проход перезаписи токенов анализатора переписывает каждый вызов `dpdy` / `dpdyCoarse` / `dpdyFine` в `(-dpdy(...))` (семейство dpdy явно перечислено как набор инверсии). `dpdx` и `fwidth` не трогаются ([Ограничения](../api/restrictions.md#автоматические-перезаписи)).

## Генерация заголовка и текстурных констант

- заголовок дописывается спереди как read-only ([Заголовок движка](engine-header.md))
- блок `bloxdTextureId*` генерируется **на каждый пак** из упомянутых имён

## HEADER_VERSION

`HEADER_VERSION` — это `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` (ведущее целое 8 → 9 начиная с v4). Два суффикса fnv1a32 снимают отпечаток материала заголовка и отсортированного реестра имя-id. Повторная валидация сохранённых паков использует этот отпечаток, чтобы решить «нужна перепроверка» ([Совместимость](../api/compatibility.md#перепроверка-сохранённых-паков-нужна-перепроверка)).

## Стабы валидации

Код, прошедший статическую валидацию, получает синтезированный стаб-код перед настоящей проверкой браузерным WGSL: `var<private> bloxdValidationP: vec4f` плюс `bloxdValidateVertex` / `bloxdValidateFragment` — таблица стабов типов (`bool` → `p.x > 0.0`, `vec3f` → `p.xyz`, …) строит входные структуры и вызывает хуки. Подробности: [Компиляция WGSL](wgsl-compilation.md).

## Смотрите также

- [Ошибки валидации](../troubleshooting/validation.md) · [Компиляция WGSL](wgsl-compilation.md) · [Реестр текстур](texture-registry.md) · [Данные движка](engine-data.md)
