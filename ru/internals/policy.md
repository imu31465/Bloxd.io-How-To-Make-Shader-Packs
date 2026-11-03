# Политика шейдер-паков по играм

> Целевой API: 5 · Целевой билд: `ab90qa` (2026-11-03, прод) · Статус: Analyzed (анализ JavaScript продакшн-бандла)
Эта страница закрепляет, что значит `allow / strict` на уровне отдельных игр. Полный режим (vertex-хуки, `discard`, `alpha` террейна) получают только игры, в чьём определении явно стоит `shaderPackPolicy: "allow"`; игры без настройки (или с любым значением, кроме allow) — strict: `BLOXD_STRICT` определён, а защищённый гардом код отключается автоматически. Выбрать это со стороны пака нельзя, поэтому знание того, какие игры что исполняют, — предпосылка для распространения.

- Опорный билд: `szby6g.main.94a7596c.js` (прод-деплой на 2026-10-17). Статический перебор всех 111 определений игр даёт **26 allow-записей (12 игр) / 85 strict-записей**. Те же 12 allow-литералов в тех же 12 играх были повторно подтверждены без изменений на продакшн-бандле v3 (`3ymzdd`, 2026-10-20) и ещё раз на бандле v4 (`cnty9`, 2026-10-27) — список ниже переносится в v3 и v4 дословно.
- Над `shaderPackPolicy` стоит ещё один рубеж — гейт канала поставки (примерно `canUseShaderPacks`): во внешних порталах (напр., сборках Coolmath Games) сама система шейдер-паков может быть выключена ещё до того, как до `shaderPackPolicy` дойдёт очередь. Разбор allow/strict ниже основан на основной веб-версии bloxd.io.
- allow объявляется в 12 местах: 8 прямых литералов в определениях игр и 4 базовые переменные (`tb` / `kz` / `cb` / `Fb`); варианты наследуют его через спред (`{...tb,...}`). Перезаписей на уровне отдельных вариантов сейчас нет (как и обратной схемы «родитель allow — потомок strict»).

12 allow-игр (всего 26 записей):

- **Test Gym** — базовая + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (11 записей)
- **Doodle Cube** — базовая + Solos / Duos (3)
- **Rocket Obby** — базовая + Sheep / January (3)
- **9 одиночных игр**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

Самые обманчивые случаи на стороне strict:

- **Superflat Creative (classic_creativeFlat) — strict.** В названии есть «Creative», но в семействе classic allow имеет только обычный Creative (`classic_creative`). Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns и т.д. — все strict
- **Custom Games (customGames) — strict.** В созданных пользователем кастомных играх эффекты vertex-хуков не срабатывают. Для проверочной работы надёжный выбор — Test Gym
- Основные PvP-/серверные игры вроде bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) — все strict

При этом в strict-играх сам пак загружается и компилируется, а рецепты фрагментной стороны вроде surface / light работают как обычно. Ограничение касается vertex-хуков (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard` и `alpha` террейна (у жидкостей она есть всегда).

Этот список отражает статический анализ указанного билда; обновления движка могут менять распределение allow/strict. При выходе новой версии перепроверяйте.
