# 纹理 API

> 目标API: 5 · 目标构建: `xkg8x` · 状态: Verified (API 自 v4 起不变，已在 v5 构建上重新确认)

读取游戏自带纹理的 API: 两个函数、一个具名常量族、四个输入字段。标头自己的概句: *「This face's texture. Compare with `bloxdTextureId*`.」*

## bloxdTexel

```wgsl
fn bloxdTexel(textureId: u32, uv: vec2f, mipLevel: f32) -> vec4f
```

- **可调用处**: **仅 surface / light 钩子** (从 vertex 钩子触达会以「reaches」诊断失败)

读取纹素的方式**与引擎自己的采样器完全相同** — 同一张 `texture_2d_array<f32>` 图集、同一个采样器、`textureSampleLevel` 且 mip 取 `round(mipLevel)` — 因此你读到的纹素与引擎绘制的纹素在结构上一致。

### `bloxdTexel` 读到什么取决于管线

引擎为每条管线生成不同的 `bloxdTexel` 定义，因此一个函数有三种行为：

| 管线 | `textureId == 0` | 非零 `textureId` | 备注 |
|---|---|---|---|
| **图集管线** — terrain、liquid，以及从方块图集绘制的方块模型 | `vec4f(1.0)` (白 —「无纹理」) | 采样该**图集条目** | 具名常量适用；动画与旋转自动处理 |
| **自带纹理管线** — 网格自带漫反射纹理的模型 (玩家皮肤、生物纹理、物品贴图) | 以你传入的 uv 采样**网格自带纹理** | `vec4f(1.0)` (白) | 作用域内只有一张纹理；具名常量不适用 |
| **无纹理管线** | 白 | 白 | 桩实现；`bloxdTextureSize() -> vec2u(1u)` |

图集管线的语义细节：

- **`textureId == 0` 返回 `vec4f(1.0)` (白)。** 那是「无纹理」id；无纹理面的四个输入字段全为 0，因此 `bloxdTexel(surface.textureId, ...)` 永远可以安全调用
- **动画纹理自动返回当前帧。** 帧按游戏的动画时钟推进 — 你无法停止或逐帧步进，也永远无需如此
- **`mipLevel` 的钳制与引擎完全一致**: `clamp(round(mipLevel), 0, textureNumLevels(textureAtlas0) - 1)`；越界 mip 饱和而非报错
- **片段自身的 `textureRotation` 会应用到传入的 uv 上** (见下文)

图集管线上 `textureId` **从 1 起**：`bloxdTextureIdGrassTop` 就是 id，引擎为其采样的图集层为 `id - 1`。id 按纹理*名称*稳定，而非按图集槽位 — 引擎会在各构建间重排图集，但按名称比较的意义不变。

### 万能调用模式

```wgsl
// Works in every pipeline: on atlas faces it samples the atlas entry;
// on own-texture models textureId is 0 and it samples the model's own texture.
let texel = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
```

`surface.colour` 已包含 `纹理 × tint × 环境光遮蔽` (皮肤与染色在内)，因此纹素读取是为*额外*细节 — 亮度估计、逐纹理效果 — 而不是重建基色。

## bloxdTextureSize

```wgsl
fn bloxdTextureSize(mipLevel: f32) -> vec2u
```

- **可调用处**: 仅 surface / light 钩子

`textureDimensions(textureAtlas0, <钳制后的 mip>)`。每张纹理占一个数组层，因此这也是*该 mip 下任意一张纹理的纹素尺寸* (同一图集层级中的所有方块纹理都是同样大小的正方形)。

```wgsl
// texel-aligned resampling for a "pixel-art" look
let size = bloxdTextureSize(surface.mipLevel);
let uv = fract(surface.uv);
let texel = bloxdTexel(surface.textureId, uv, surface.mipLevel);
```

## 模型自带纹理 (textureId: 0)

标头注释: *«These are all 0 if the face has no texture. **Most models use textureId 0.**»* — 大多数模型面没有*图集*纹理，因为它们的网格自带纹理：

- **玩家皮肤**与其他非图集模型纹理 (生物、物品贴图) 以 `textureId: 0` 到来
- 在这些管线上 `bloxdTexel(0u, uv, mip)` 采样**网格自带纹理** (见上表)；任何非零 id 返回白色 — 作用域内没有图集
- 标头字段仍按文档工作: `uv` 铺满模型纹理 0–1，`mipLevel` 是该面的 mip
- **`bloxdTextureSize()`** 报告的是*管线所采样纹理*的尺寸: 图集管线上是图集，自带纹理管线上是模型自己的纹理

只在图集面上才有意义的效果应加守卫：

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        // only faces whose texture lives in the block atlas (block models)
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

- **皮肤与图集之别**: 图集把纹理*名称*映射到层，可用 `bloxdTextureId*` 比较。模型自带纹理 (皮肤) 不在该命名空间中，以 id 0 到来。`surface.colour` 已含皮肤 × tint，请以它为起点

## bloxdTextureId*: 具名纹理常量

每个可用纹理名称都成为一个可比较的 `const`。**拼写即文件名的驼峰形式**：

| 纹理文件 | 常量 | 备注 |
|---|---|---|
| `grass_top.png` | `bloxdTextureIdGrassTop` | 引擎自己的例子 |
| `lava0.png` (帧 `lava0`–`lava7`) | `bloxdTextureIdLava` | 动画族: 规范名中不含帧号后缀 |
| `black_portal0.png` (帧 0–3) | `bloxdTextureIdBlackPortal` | 同一规则 |
| `radar_screen0` (旋转副本 `[rot[1`–`[rot[4`) | `bloxdTextureIdRadarScreen0` | 旋转族: 折叠到根名称 |

### 拼写规则与命名自由度

- **生成规则** (从验证器复原): 以非字母数字段切分名称，各段首字母大写，拼接到 `bloxdTextureId` 前缀之后
- **大小写与下划线不区分**: 反向匹配 (包写出的名称 → 注册表名称) 会同时折叠你的拼写与引擎的拼写，因此 `bloxdTextureIdGrassTop` 与 `bloxdTextureId_grass_top` 解析为**同一个常量**
- **动画纹理不带帧号**: `lava` 是名称；`lava0` 是一个专属错误
- **旋转族用根名称**: 写成旋转副本的拼写会得到专属消息

### 名称解析错误 (逐字取自验证器)

> **前缀拼错 / 大小写:** `bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?`
>
> **动画帧:** `...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates.`
>
> **旋转副本:** `...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, which bloxdTexel turns as each face shows it.`
>
> **折叠后歧义:** `...could name X and Y, which differ only by case or underscores, so it can't be used.`
>
> **未找到 (带建议):** `There's no texture called X. Did you mean bloxdTextureIdY?` — 建议阈值为莱文斯坦距离 `max(2, floor(len/4)) + 1`
>
> **未找到 (无建议):** `There's no texture called X. Texture names are the file names texture packs use, as in bloxdTextureIdGrassTop for grass_top.png; BLOCK_TEXTURES.md lists them.`

> 消息中的 `BLOCK_TEXTURES.md` 是游戏自身的内部纹理名称清单，被引擎验证器引用 — 并非本站页面。本站的等价物是[纹理目录](texture-catalog.md)。

### 只发射被引用的常量

标头的 `bloxdTextureId*` 块按包**实际引用的名称**生成 — 用了 3 个常量的包得到 3 行 `const`，而不是约 900 行。

## 输入字段

`BloxdSurfaceIn` / `BloxdLightIn` 上的四个纹理字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `textureId` | `u32` | 该面的纹理；与 `bloxdTextureId*` 比较；0 = 无 |
| `textureRotation` | `u32` | 顺时针四分之一转数 (0–3)，由 `bloxdTexel` 应用 |
| `uv` | `vec2f` | 纹理铺满 0–1；实际绘制 `fract(uv)` |
| `mipLevel` | `f32` | mip 级别: 0 = 全尺寸，1 = 一半… |

## 旋转的微妙之处 — 中性采样器

`bloxdTexel` 会按**当前片段**的 `textureRotation` 反向旋转你传入的 uv — 与你传的是哪个 id 无关。两种常见情形：

- **重采样本面自己的纹理**时用 `surface.uv` — uv 位于该面的旋转坐标系中，反向旋转恰好映射回图集空间；这是预期的主用法
- **以图集空间 uv 采样另一张纹理**而该面处于旋转状态 — 反向旋转照样发生，采样落点被旋转。这就是陷阱

引擎无法按纹理查询旋转 (旋转是面的几何数据)，总是用片段的值。要旋转中性地采样另一张纹理，先把 uv 预旋转同样的四分之一转来抵消：

```wgsl
// Rotation-neutral texel sampling: pre-rotate uv so bloxdTexel's counter-rotation
// (by this face's textureRotation) cancels out. Pass surface.textureRotation as r.
fn texelNeutral(id: u32, uv: vec2f, mip: f32, r: u32) -> vec4f {
    var turned = uv;
    if (r == 1u) {
        turned = vec2f(1.0 - uv.y, uv.x);
    } else if (r == 2u) {
        turned = vec2f(1.0 - uv.x, 1.0 - uv.y);
    } else if (r == 3u) {
        turned = vec2f(uv.y, 1.0 - uv.x);
    }
    return bloxdTexel(id, turned, mip);
}
```

(`textureRotation == 0` 无需校正。大多数面为 0，但分发的包不得假设如此。)

## 实战示例

### 由纹素亮度生成自发光

在该面的 mip 之上再采一层，得到距离稳健的柔和分块平均：

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let avg = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + 1.0);
    let lum = dot(avg.rgb, vec3f(0.2126, 0.7152, 0.0722));
    if (surface.flags.emissive) {
        out.emission += avg.rgb * lum * 0.5;
    }
    return out;
}
```

### 逐纹理特效

比较 `textureId` 以挑出选定纹理 (例如让矿石闪光的官方做法)：

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.textureId == bloxdTextureIdDiamondOre) {
        let p = bloxdWorldPosition(light.position);
        let s = sin(bloxdSeconds() * 3.0 + p.x * 2.7 + p.y * 1.3 + p.z * 4.1);
        out.colour += vec3f(0.35, 0.45, 0.55) * max(0.0, s);
    }
    return out;
}
```

### 景深式距离模糊

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let d = distance(surface.position, bloxdEyePosition());
    if (d > 40.0 && surface.textureId != 0u) {
        let own = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel);
        if (any(abs(own.rgb - vec3f(0.0)) > vec3f(1e-6))) {          // division guard
            let blur = clamp((d - 40.0) / 60.0, 0.0, 3.0);
            let t = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + blur);
            out.colour = t.rgb / own.rgb * out.colour;
        }
    }
    return out;
}
```

(比值技巧保留了引擎的 `colour = 纹理 × tint × AO`: 用混合后的纹素除以原生纹素消去纹理内容，只留模糊系数乘回 `surface.colour`。白色读数 — 无纹理面 — 触发守卫跳过该效果。)

## 纹理 API 到不了的地方

- **vertex 钩子中不可调用** — 「reaches」诊断会拒绝
- **不能添加纹理** — 图集归引擎所有；API 只读。自定义纹理仍是纹理包系统的职责
- **非图集渲染器配置退化为桩** — `bloxdTextureSize() -> vec2u(1u)`、`bloxdTexel(...) -> vec4f(1.0)`，四个输入流转 `0u, 0u, vec2f(0.0), 0.0`。为真实图集写的代码仍可编译运行 — 只是看到白色纹素与 1×1 尺寸。能容忍 `textureId == 0` 的代码也能容忍这里

## 相关

- **全部 896 个可用名称** → [纹理目录](texture-catalog.md)
- [引擎内部: 纹理注册表](../internals/texture-registry.md) · [纹理采样](../internals/texture-sampling.md)
