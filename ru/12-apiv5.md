[← Предыдущая часть](11-reference.md)·[Вернуться к руководству](README.md)

# Часть XII: Руководство по миграции на API версии 5 (2026-11-03, кратко)

> Это краткое резюме для данного языка. Полная версия со всеми деталями, примерами рецептов, полностью восстановленным заголовком v5 и внутренностями движка (§69–§82) доступна на [английском](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/12-apiv5.md) и [японском](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/12-apiv5.md).

Целевой билд: `ab90qa.main.6188124c.js` — **в продакшене и preprod одновременно (измерено 2026-11-03)**, оба бандла идентичны побайтно (md5 проверен). Это крупнейший пересмотр API со времён v3: заголовок движка вырос с 6 021 до **8 954 декодированных байт**, и почти каждая структура получила поля.

## Что меняется

- `pack.json` требует `"apiVersion": 5` (строгое `===`, число) — паки v4 отклоняются при загрузке; сохранённые v4-паки молча неактивны.
- **`blockFlags` заменён структурой (главное изменение):** шесть битовых констант `bloxdBlockFlag*` исчезли; вместо них **`flags: BloxdFlags`** — 14 именованных bool-полей (шесть — старые биты под новыми именами, восемь новых): **`slab` `stairs` `flat` `placed` `held` `dropped` `thrown` `lifeform`**. Модели, предметы в руке и существа теперь отличимы от рельефа.
- **`#ifdef BLOXD_LIGHTING` удалён:** переключатель времени компиляции заменён runtime-проверкой новой функции **`bloxdLit()`**; uniform получил `lit: u32` (смещение 4, суммарно по-прежнему 64 Б). Матрица вариантов сократилась с 8 до 6 (`strict|allow` × `terrain|liquid|model`).
- **Рецепт освещения движка стал публичным:** три новые функции — **`bloxdShading(light)`**, **`bloxdWorldLight(light)`**, **`bloxdLitColour(surface, light)`** — плюс два новых входа `BloxdLightIn` (`diffuse`, `emissive`).
- **Новые входы:** `localPosition: vec3f` (координаты модели, 0 для рельефа) везде; `enchantTier` / `enchantColour` / `enchantSpeed` / `overlayColour` (зачарование и вспышка урона) в Surface/Light; **новые выходы** `enchantColour` / `overlayColour` в `BloxdSurface`, смешивает `bloxdLitColour`.
- **Удалено:** `bloxdFragmentBlockPosition()` (без замены), константы `bloxdBlockFlag*`, `bloxdSpLitColour`.
- **Шаблон дефолтного пака теперь содержит все 9 хуков** (включая light-хуки, 1 122 → 1 683 байт), а новый комментарий документирует модель удаления: *"If you delete a hook, the default is used instead."*
- Новая константа в заголовке: `const bloxdChunkSize: i32 = 32;`. Y-производные автоматически инвертируются: `dpdy`/`dpdyCoarse`/`dpdyFine` переписываются как `(-dpdy(...))`. `HEADER_VERSION` стал `9.<hash>.<hash>`.
- Пространство `bloxdSp*` выросло с 27 до **46 символов**; реестр текстур теперь **896 пригодных имён** (+1 `scorpion_eggs`, −10 — в том числе семейство `chest_double_*` и `mob_spawner_*_block_side`) — имена это API, id лишь снимок.
- Всё остальное заморожено: лимиты загрузчика (256 `.wgsl` / 256 КБ / 64 КБ / 32 МБ / 1 024 записи), имена хуков, strict-контракт (12 allow-титулов), привязки группы 3.

## Миграция кратко

| v4 | v5 |
|---|---|
| `"apiVersion": 4` | `"apiVersion": 5` (число) |
| `(s.blockFlags & bloxdBlockFlagVegetation) != 0u` | `s.flags.vegetation` |
| `#ifdef BLOXD_LIGHTING … #endif` | `if (bloxdLit()) { … } else { return bloxdDefaultLight(s, l); }` |
| `bloxdFragmentBlockPosition(p, n)` | удалён — используйте `bloxdWorldPosition()` / `flags` |
| (раньше не было) | `s.flags.held`, `s.flags.lifeform`, `s.localPosition`, `s.enchantTier` … |

Полностью восстановленный заголовок v5 (8 954 байт, дословно) и полный список дрейфа имён текстур — в полных английской и японской версиях (§82 и §80).

[← Предыдущая часть](11-reference.md)·[Вернуться к руководству](README.md)
