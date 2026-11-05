# 模型渲染内部机制

> 目标API: 5 · 目标构建: `bny9u` · 状态: Analyzed (从现行 bundle 复原)

v5 Model 程序的内部机制。面向用户的指南: [模型与纹理](../guides/models.md)。

## Model 程序是什么

v5 之前，包只能接入 terrain / liquid；方块模型 (台阶、楼梯、植物) 与实体 (玩家、生物、物品) 都在**包的管辖范围之外**。v5 把 model 加入为第三个程序，绘制：

- 以方块模型绘制的方块 (标头注释: *«Drawn as block models, so never part of terrain or flagged as opaque»*)
- 手持 / 掉落 / 投掷物品
- 玩家、生物、NPC (含盔甲与外观装饰)

## 标志与输入的传递

- **`bloxdSpFlags`** — `BloxdFlags` 结构体的传递路径；8 个新字段 (`slab` / `stairs` / `flat` / `placed` / `held` / `dropped` / `thrown` / `lifeform`) 携带只在模型面上有意义的值
- **`bloxdSpItemLocalPosition`** — `localPosition` 的传递；terrain/liquid 上为 `vec3f(0.0)`
- **`bloxdSpEnchant`** — 附魔输入 (`enchantTier` / `enchantColour` / `enchantSpeed`) 的传递

## 附魔计算

引擎为闪光扫掠做动画，并把它作为 `enchantColour.a` 交给 surface/light 钩子 ([附魔效果](../recipes/enchant-effects.md))。混合发生在 `bloxdLitColour()` 内部 — 紧接着色之后、世界光照之前 ([光照](../api/lighting.md#完整管线))。

## 覆盖色 (受伤红闪等)

`overlayColour` 以 RGB + alpha 携带实体状态色 (受伤闪红等)。`bloxdLitColour` 在**光照之前**把它混入，因此状态表现搭车而行、不破坏基色。该处理在 v4 已存在于内部，v5 将其开放为输入/输出。

## 纹理路径

大多数模型面用 `textureId: 0` (无纹理) — 玩家皮肤与生物纹理不在方块纹理图集的命名空间中。`surface.colour` 到达时已烘焙皮肤 × tint，因此模型面处理从 `colour` 起步 ([模型自带纹理](../api/texture-api.md#模型自带纹理-textureid-0))。

## 变体

Model 程序构成变体矩阵的一根轴: `strict.model` / `allow.model`。`BLOXD_ALPHA` 只在 allow.model 中定义 ([预处理器](../api/preprocessor.md#宏--变体矩阵))；strict.model 没有 vertex 钩子。

## 相关

- [模型与纹理](../guides/models.md) · [模型着色器配方](../recipes/model-shaders.md) · [标志](../api/flags.md) · [渲染管线](rendering-pipeline.md)
