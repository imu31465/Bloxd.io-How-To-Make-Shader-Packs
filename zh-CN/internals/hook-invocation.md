# 钩子接入内部机制

> 目标API: 5 · 目标构建: `v98qt8` · 状态: Analyzed (从生产包复原 — Lite 渲染器；其整合源文件 `lite/terrainShaderPack.ts` 仍保留在错误字符串中)

引擎在运行时如何调用钩子。这不改变你写的代码，但能消除「钩子收到什么」的猜测。

## 拼接架构

渲染器并不从 JavaScript「调用」钩子。包通过验证后，引擎**通过替换着色器文本中的固定锚点行，把你的钩子调用嫁接进它自己的地形 WGSL**。每个锚点必须恰好匹配一次 — 零次或多次都会以 `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)` 中止。

| 阶段 | 引擎着色器中的锚点 | 嫁接内容 |
|---|---|---|
| vertex | `let worldPos = …` 到 `vertexOutputs.vNormalW = …` 的代码块 | 构造 `BloxdVertexIn`、调用 vertex 钩子、把 `worldPos` 写回 (并把 `let worldPos` 改写为 `var worldPos`) |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | 构造 `BloxdSurfaceIn`、调用 surface 钩子、写回 `baseColor` / `alpha` |
| 照亮色 | 雾混合恰之前 | 捕获雾前颜色 (v3 用 `bloxdSpLitColour` 临时量 — v5 把这个角色提升为公开的 `bloxdLitColour()` 标头函数) |
| light | 片段着色器末尾的 `return color;` | 构造 `BloxdLightIn`、调用 light 钩子、把 `color` 写回 — 在雾混合之后 |

## 拼接所强制的事实

- **strict 地形忽略 surface 钩子的 alpha 修改。** `alpha = bloxdSpSurface.alpha` 写回只为液体程序或非 strict 变体嫁接 — 即宏表背后的实现 ([预处理器](../api/preprocessor.md))
- **声明了 vertex 钩子的 strict 变体从不运行它。** 引擎在构建期报告: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`。因此模板要 `#ifndef BLOXD_STRICT`
- **`bloxdSp*` 标识符**是引擎临时量 — 你的代码看不见它们，但它们出现在诊断与逆向输出中 ([保留标识符](reserved-identifiers.md) — v5 有 46 个)
- **默认 surface 捷径。** 若某变体的 surface 钩子就是 `bloxdDefaultSurface`，引擎会整体省略 `baseColor` / `alpha` 写回嫁接 — 默认已经产出这些值，赋值是死代码。**未修改的钩子链零开销**

## v5 改了什么

拼接架构在 v2 渲染器中就已存在，并跨 v2 → v3 保持稳定 (v3 只把 `vBlockId` 改为 `vBlockFlags` 并加入液体变体)。v5 的变化：

- `vBlockFlags` (位) → **`BloxdFlags` 结构体** (经 `bloxdSpFlags` 传递)
- `litColour` 捕获从引擎内部变为**公开 API** (`bloxdLitColour()` — v4 的 `bloxdSpLitColour` 得到提升)
- `BloxdLightIn` 获得 `diffuse` / `emissive`，`bloxdShading()` 可重建材质响应 ([光照](../api/lighting.md))
- `localPosition` (`bloxdSpItemLocalPosition`)、附魔输入 (`bloxdSpEnchant`) 与 `overlayColour` 的传递 ([模型渲染](model-rendering.md))
- `fogVisibility` → **`fogAlpha`** (语义反转)
- Model 程序加入变体矩阵 (3 程序 × 2 模式 = 6 变体)

## 什么喂给 BloxdLightIn (逐字段)

| 字段 | 引擎侧来源 |
|---|---|
| `litColour` | 雾混合恰之前捕获的片段颜色 — 标头术语中的「emission 与雾之前」 |
| `directional` | 逐方向光 Lambert 的顶点插值求和 ([渲染管线](rendering-pipeline.md) 中的双光源设置) |
| `diffuse` / `emissive` | 材质的方向光 RGB 响应 / RGB 发光 |
| `ambient` | `material.ambient × sceneAmbient` — 逐材质、逐帧 |
| `blockLight` / `skyLight` | 解码后的光照等级 varying ([光照内部](lighting-internals.md)) |
| `ambientLightColour` / `skyLightColour` | 对应的 uniform |
| `heldLight` | 由光照等级 varying 与手持光 uniform 构造 (锥形衰减见[光照内部](lighting-internals.md)) |
| `fogColour` | 只在完全无雾的场景 (模式 0) 为黑 |
| `fogAlpha` | 钳制后的雾因子 ([雾内部](fog-internals.md)) |
| `position` / `normal` / `localPosition` / `flags` / `textureId` / `textureRotation` / `uv` / `mipLevel` | varying 与平面插值值 (同 `BloxdSurfaceIn` — vertex 钩子之后的值) |

## 相关

- [着色器钩子](../api/hooks.md) · [渲染管线](rendering-pipeline.md) · [保留标识符](reserved-identifiers.md) · [版本历史: v3](../history/v3.md)
