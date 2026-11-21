# Политика шейдер-паков по играм

> Целевая API: 5 · Тип: техническая справка
Эта страница закрепляет, что значит `allow / strict` на уровне отдельных игр. Полный режим (vertex-хуки, `discard`, `alpha` террейна) получают только игры, в чьём определении явно стоит `shaderPackPolicy: "allow"`; игры без настройки (или с любым значением, кроме allow) — strict: `BLOXD_STRICT` определён, а защищённый гардом код отключается автоматически. Выбрать это со стороны пака нельзя, поэтому знание того, какие игры что исполняют, — предпосылка для распространения.

- Над `shaderPackPolicy` стоит ещё один рубеж — гейт канала поставки (примерно `canUseShaderPacks`): во внешних порталах (напр., сборках Coolmath Games) сама система шейдер-паков может быть выключена ещё до того, как до `shaderPackPolicy` дойдёт очередь. Разбор allow/strict ниже основан на основной веб-версии bloxd.io.


## Игры с политикой allow

- **Test Gym** — базовая + Empty / Mobs / Mobs & Worldgen / Imported Mobs / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles / Interest (13 записей)
- **Doodle Cube** — базовая + Solos / Duos (3)
- **Rocket Obby** — базовая + Sheep / January (3)
- **9 одиночных игр**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

Самые обманчивые случаи на стороне strict:

- **Superflat Creative (classic_creativeFlat) — strict.** В названии есть «Creative», но в семействе classic allow имеет только обычный Creative (`classic_creative`). Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns и т.д. — все strict
- **Custom Games (customGames) — strict.** В созданных пользователем кастомных играх эффекты vertex-хуков не срабатывают. Для проверочной работы надёжный выбор — Test Gym
- Основные PvP-/серверные игры вроде bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) — все strict

При этом в strict-играх сам пак загружается и компилируется, а рецепты фрагментной стороны вроде surface / light работают как обычно. Ограничение касается vertex-хуков (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard` и `alpha` террейна (у жидкостей она есть всегда).


Перед распространением пака проверьте его непосредственно в целевой игре и убедитесь, что нужные хуки там работают.
