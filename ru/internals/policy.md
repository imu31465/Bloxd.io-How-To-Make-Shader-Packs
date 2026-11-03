# Режимы применения по играм (`shaderPackPolicy`)



Здесь фиксируется смысл пары `allow / strict` из §7 на уровне отдельных игр. Только игры, в чьём определении явно стоит `shaderPackPolicy: "allow"`, работают в полном режиме (vertex-хуки, `discard`, `alpha` террейна); игры без указания (или с любым значением, кроме allow) — strict: определяется `BLOXD_STRICT`, охраняемый код автоматически отключается. Со стороны пака это выбрать нельзя, поэтому знание о том, какие игры что исполняют, — предпосылка распространения.

- Опорный билд: `szby6g.main.94a7596c.js` (прод-деплой на 2026-10-17). Статический разбор всех 111 определений игр даёт **26 allow-записей (12 игр) / 85 strict-записей**. Те же 12 allow-литералов в тех же 12 играх были повторно подтверждены без изменений на продакшн-бандле v3 (`3ymzdd`, 2026-10-20) — список ниже переносится в v3 дословно.
- Над `shaderPackPolicy` стоит ещё один рубеж — гейт на стороне дистрибуции (`canUseShaderPacks` и под.): в сборках для внешних порталов (напр., версия Coolmath Games) сам механизм шейдер-паков может быть выключен ещё до проверки `shaderPackPolicy`. Разбор ниже по allow / strict основан на анализе веб-версии bloxd.io.
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
