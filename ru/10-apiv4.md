[← Предыдущая часть](09-apiv3.md)·[Вернуться к руководству](README.md)

# Часть X: руководство по миграции на API версии 4 (2026-10-26, конспект)

> Это краткий конспект на данном языке. Полная версия со всеми деталями, примерами-рецептами и восстановленными внутренностями движка (§55–§66) доступна на [английском](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md) и [японском](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md).

Целевой билд: `cnty9.main.669f8081.js` — **в продакшене и предпродакшене одновременно с 2026-10-26** (оба байт-в-байт совпадают). Модель пака сохраняет форму: те же поля `pack.json`, те же лимиты загрузчика, тот же uniform на 64 Б, те же 6 хуков.

## Что меняется

- `pack.json` требует `"apiVersion": 4` (строгое `===`, число) — паки v3 отклоняются при загрузке.
- **Новый текстурный API (главное):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` сэмплит атлас блочных текстур ровно так, как это делает сам движок (id 0 = белый; анимированные текстуры автоматически дают текущий кадр), `bloxdTextureSize(mipLevel) -> vec2u`, и именованные константы `bloxdTextureId*` (CamelCase из имени файла, напр. `grass_top` → `bloxdTextureIdGrassTop`; официальный каталог — `BLOCK_TEXTURES.md`).
- **Четыре новых входных поля** в `BloxdSurfaceIn` *и* `BloxdLightIn`: `textureId`, `textureRotation` (четверти оборота по часовой, применяет `bloxdTexel`), `uv` (в блоках; рисуется `fract(uv)`), `mipLevel`.
- **Переименования со сменой смысла:** `fogVisibility` → `fogAlpha` с **инвертированным** смыслом (`0 = без тумана, 1 = только fogColour`; порт: `l.fogVisibility` → `1.0 - l.fogAlpha`); `bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (тело идентично); `BloxdOpaqueBehind.found` → `hit`.
- **Строгие игры теперь принуждаются встроенным валидатором:** незащищённый вершинный хук или достижимый `discard` даёт `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...` и отключает **все** хуки в строгих играх. С обёртками `#ifndef BLOXD_STRICT` surface/light продолжают работать.
- Всё остальное заморожено: 6 хуков, биты `blockFlags` (1/2/4/8/16/32), раскладка uniform, лимиты загрузчика, матрица вариантов, 12 allow-титулов (переподтверждены без изменений на `cnty9` 2026-10-27).

## Краткая миграция

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (число) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` или `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| Незащищённые вершинные хуки | `#ifndef BLOXD_STRICT ... #endif` |

Полный справочный материал теперь входит в руководство: целиком восстановленный заголовок движка и полный каталог текстур со всеми 905 доступными именами находятся в Части XI (`11-reference.md`). Полные детали — тонкость поворотов в `bloxdTexel`, восстановленный WGSL сэмплинга, реестр имён, новая структура `HEADER_VERSION` с хешем реестра — в полной английской и японской версиях.

[← Предыдущая часть](09-apiv3.md)·[Вернуться к руководству](README.md)
