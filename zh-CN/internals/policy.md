# 各游戏的着色器适用策略

> 目标 API：5 · 文档类型：技术参考

本页把 `allow / strict` 在标题层面的语义确定下来。只有游戏定义中显式写着 `shaderPackPolicy: "allow"` 的标题才以完整模式运行 (vertex 钩子、`discard`、地形 `alpha`)；未指定 (或 allow 以外的值) 的标题视为 strict — 定义 `BLOXD_STRICT`，守卫内的代码自动失效。这个判定不在包一侧可控，因此弄清哪些标题跑什么内容是发布的前提。

- 在 `shaderPackPolicy` 之上还有分发渠道闸门 (大致 `canUseShaderPacks`)：经外部 portal (如 Coolmath Games 构建) 时，着色器包系统本身可能在 `shaderPackPolicy` 被查看之前就被禁用。下文的 allow/strict 分析基于 bloxd.io 主 Web 构建。

allow 的 12 个标题 (合计 26 条目):

## allow 适用的游戏

- **Test Gym** — 本体 + Empty / Mobs / Mobs & Worldgen / Imported Mobs / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles / Interest (合计 13 条目)
- **Doodle Cube** — 本体 + Solos / Duos (合计 3)
- **Rocket Obby** — 本体 + Sheep / January (合计 3)
- **9 个独立标题**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

strict 侧特别容易误解的点:

- **Superflat Creative (classic_creativeFlat) 是 strict**。名字虽含「Creative」，但 classic 家族中 allow 的只有普通的 Creative (`classic_creative`)。Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns 等也全部 strict
- **Custom Games (customGames) 是 strict**。自制的自定义游戏中 vertex 钩子系效果不会发动。用于验证工作的话，用 Test Gym 最稳妥
- bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) 系等主要 PvP·服务器系标题全部 strict

另外，strict 标题中包的加载与编译本身照常进行，surface / light 等片元侧配方也正常工作。受到约束的是 vertex 钩子 (`bloxdTerrainVertex` / `bloxdLiquidVertex`)、`discard` 与地形 `alpha` (液体恒有)。

此一览为上述构建时点的静态解析结果；引擎更新会改变 allow/strict 的分布。新版发布时请再确认。


发布着色器包前，请在目标游戏中实际测试，并确认所需的钩子在该游戏中正常工作。
