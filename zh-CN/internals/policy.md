# 各游戏的着色器适用策略

> 目标API: 5 · 目标构建: `xkg8x` (2026-11-04, 生产环境) · 状态: Analyzed (基于生产环境包的 JavaScript 级分析)

本页把 `allow / strict` 在标题层面的语义确定下来。只有游戏定义中显式写着 `shaderPackPolicy: "allow"` 的标题才以完整模式运行 (vertex 钩子、`discard`、地形 `alpha`)；未指定 (或 allow 以外的值) 的标题视为 strict — 定义 `BLOXD_STRICT`，守卫内的代码自动失效。这个判定不在包一侧可控，因此弄清哪些标题跑什么内容是发布的前提。

- 依据构建: `szby6g.main.94a7596c.js` (2026-10-17 时点的正式部署)。静态解析全部 111 个游戏定义的结果为 **allow 26 条目 (12 个标题) / strict 85 条目**。同样 12 个标题的同样 12 个 allow 字面量已在 v3 生产 bundle (`3ymzdd`，2026-10-20) 上再次确认未变，并在 v4 bundle (`cnty9`，2026-10-27) 上再度确认——下方列表原样沿用至 v3 与 v4。 在 v5 构建上同样未变：已在 `ab90qa` (2026-11-03) 与 `xkg8x` (2026-11-04，重新清点 12 个 allow 字面量) 上再次确认 — 下列列表同样原样沿用至 v5。
- 在 `shaderPackPolicy` 之上还有分发渠道闸门 (大致 `canUseShaderPacks`)：经外部 portal (如 Coolmath Games 构建) 时，着色器包系统本身可能在 `shaderPackPolicy` 被查看之前就被禁用。下文的 allow/strict 分析基于 bloxd.io 主 Web 构建。
- allow 共在 12 处声明: 游戏定义内的直接书写 8 处与基底变量 (`tb` / `kz` / `cb` / `Fb`) 的 4 处，变体通过 spread 继承 (`{...tb,...}`)。按变体的个别覆写目前不存在 (也不存在 父 allow·子 strict 的逆模式)。

allow 的 12 个标题 (合计 26 条目):

- **Test Gym** — 本体 + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (合计 11 条目)
- **Doodle Cube** — 本体 + Solos / Duos (合计 3)
- **Rocket Obby** — 本体 + Sheep / January (合计 3)
- **9 个独立标题**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

strict 侧特别容易误解的点:

- **Superflat Creative (classic_creativeFlat) 是 strict**。名字虽含「Creative」，但 classic 家族中 allow 的只有普通的 Creative (`classic_creative`)。Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns 等也全部 strict
- **Custom Games (customGames) 是 strict**。自制的自定义游戏中 vertex 钩子系效果不会发动。用于验证工作的话，用 Test Gym 最稳妥
- bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) 系等主要 PvP·服务器系标题全部 strict

另外，strict 标题中包的加载与编译本身照常进行，surface / light 等片元侧配方也正常工作。受到约束的是 vertex 钩子 (`bloxdTerrainVertex` / `bloxdLiquidVertex`)、`discard` 与地形 `alpha` (液体恒有)。

此一览为上述构建时点的静态解析结果；引擎更新会改变 allow/strict 的分布。新版发布时请再确认。
