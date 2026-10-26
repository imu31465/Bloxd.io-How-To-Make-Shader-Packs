[← 上一部分](08-apiv2.md)·[返回手册](README.md)

# 第九部分: API Version 3 迁移指南

> **已于 2026-10-26 被取代: 现行 API 为版本 4** —— v3 包在加载时被拒绝，方式与本文对 v2 的描述完全相同。请先应用本部分，*再*应用 [第十部分](10-apiv4.md) (v3 → v4: 纹理 API、`fogAlpha` 改名、`bloxdFragmentBlockPosition`、`hit`)。

目标构建: `3ymzdd.main.fae4743f.js` — **自 2026-10-19 起的正式生产构建**。bloxd.io 在生产环境提供的 bundle 与本部分最初调查所用的预发布部署逐字节一致 (已核对 md5，主 bundle 与着色器包 chunk 均如此)，因此这里的内容原样适用于生产环境。包模型保持 v2 形态 (相同的 `pack.json` 字段、相同的加载器限制、相同的 uniform 布局)。

本指南第一至第七部分仍以 v2 为基准撰写。本部分按与[第八部分](08-apiv2.md)相同的顺序，汇总 v2 → v3 的迁移点与 v3 新功能。转换大多是机械性的 (§47)，但只有一项变更会实际改变行为——默认光照现在会让自发光随雾衰减 (§43)——另外 `blockId` 已整体替换为 `blockFlags` (§42)，因此分发前务必在游戏内编译验证。

本修订新增: **§49–§54** 越出迁移本身，深入从生产构建复原的引擎内部——Lite 渲染器实际如何调用你的钩子、真实的四模式雾函数、`bloxdOpaqueBehind()` 的精确实现、blockFlags 从方块注册到钩子的完整传递路径，以及带实测标头哈希的验证管线。这些是迄今关于包系统最深入的公开记录事实，也解答了其他指南仍列为未决的若干问题。

## 40. v2 包的命运 (先说结论)

**2026-10-19 更新: v3 已离开预发布环境，现在由正式站点提供。** 上线前保存的每个 v2 包——包括所有以 v2 分发的包——现在都会在生产环境按下文所述失败，因此对今天分发包的任何人来说，§47 的迁移不再可选。

该构建要求 manifest 的 `apiVersion` **精确匹配 3**，且**不并行支持 v2/v3**。v2 包在加载时会被「API 版本不符」消息拒绝 (i18n 键与占位文本):

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>
> `loadNoApiVersion`: "pack.json needs \"apiVersion\": {{version}}."

已保存的包沿用 v2 生命周期 ([第八部分](08-apiv2.md) §31): 每个构建都会计算其引擎标头的哈希，引擎更新会自动把已保存包标记为「需要重新检查」，而 `apiVersion` 不是当前版本的已保存包会被标记为不会运行 (并用上述状态消息指向替代包)，而不是报错。

## 41. pack.json 与 uniform 缓冲 (不变的部分)

- 必需的 manifest 字段不变: `{ apiVersion, name, author }`。
- 加载器限制不变: 32MB zip / 1024 个条目 / 256 个 `.wgsl` 文件 / 代码总量 256KB / manifest 64KB。
- 引擎 uniform 块的形状不变: `@group(3) @binding(0)`，64 B，按声明顺序存放时间、渲染偏移、太阳方向与眼睛位置。该布局以 `minBindingSize: 64` 注册，精确字段布局为 `seconds: f32` @ 字节 0、`renderOffset: vec3i` @ 16、`sunDirection: vec3f` @ 32、`eyePosition: vec3f` @ 48。有两个内部字段名改变: `time` → `seconds`，`originOffset` → `renderOffset`。**字节布局与 v2 完全相同**，而且包代码本来就不会受影响，因为包不能直接命名该 uniform (引擎标头将其标记为由引擎提供且只读，包无法命名它)；继续通过标头函数 `bloxdSeconds()` / `bloxdRenderOffset()` 使用即可。
- 包的 group 3 增加了一个有文档记录的第二个占用者: `@group(3) @binding(1)` 是 `bloxdOpaqueBehind()` 读取的场景深度纹理 (完整实现见 §51)。64 B uniform 仍在 binding 0；包仍然不能命名任一 binding。

## 42. blockId 变成 blockFlags: 每方块材质以位标志表示 (核心)

在三个钩子输入结构体 (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`) 中，v2 字段 `blockId: u32` 都被**替换**为 `blockFlags: u32`。引擎对该字段的说明: *「这个面是什么种类的方块: `bloxdBlockFlag*` 位，整个面一致。」* 引擎现在直接提供材质数据，因此 v2 中根据数字 id 范围猜测材质、或在世界内维护 id 表的方法 ([第八部分](08-apiv2.md) §34) 不再需要。

这些位以具名常量公开:

```wgsl
// 用 (blockFlags & bloxdBlockFlagRock) != 0 测试。
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| 值 | 常量 | 含义 (引擎注释摘要) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | 完全不透明——树叶与冰也算。不包括玻璃、水、岩浆、刷怪笼，以及幽灵与隐形方块。 |
| 2 | `bloxdBlockFlagEmissive` | 发出方块光，如霓虹、传送门、灯、岩浆与信标。发光的矿石也算，无论多微弱。 |
| 4 | `bloxdBlockFlagVegetation` | 树叶，以及草方块上的草——草方块同时也属于泥土。不包括仙人掌、蘑菇方块或干草。 |
| 8 | `bloxdBlockFlagDirt` | 泥土与土壤，包括草方块。Rocky Dirt 同时也属于岩石。 |
| 16 | `bloxdBlockFlagSand` | 沙子、红沙，以及所有砂岩——砂岩同时也属于岩石。 |
| 32 | `bloxdBlockFlagRock` | 石头及其种类、安山岩、闪长岩、花岗岩、砂砾、矿石、砂岩、Rocky Dirt、基岩、黑曜石与岩浆。 |

由多种材质构成的方块会携带**每一项**匹配标志 (引擎自己的例子: 砂岩属于沙与岩石，因此两者都有)。树叶属于植被但不属于泥土；草方块同时属于植被与泥土。

植被 / 泥土 / 沙 / 岩石标志由方块注册的**显示名**分配 (不透明 / 自发光则来自引擎自身的不透明度与发光数据): 以 `Leaves` 结尾或名为 `Grass Block` 的是植被；`Dirt` / `Soil` 名称 (以及所有 `Grass Block`) 是泥土；正好为 `Sand` 与 `Red Sand`，以及任何包含 `Sandstone` 的名称是沙；包含 `Stone` / `Andesite` / `Diorite` / `Granite` 的名称、任何 `Ore`，以及 Yellowstone、Gravel、Bedrock、Obsidian、Magma、Rocky Dirt (和砂岩) 是岩石。

### 精确名称规则 (自行推导任意方块的标志)

四个材质位来自对方块注册显示名的固定分类器。变体名 (`|` 之后的内容) 会先被剥离，因此变体继承基础方块的标志。然后:

| 位 | 规则 (在剥离后的名称上求值) |
|---|---|
| 植被 | 名称**以** ` Leaves` **结尾**，或**以** ` Grass Block` **结尾** |
| 泥土 | 名称**正好是** `Dirt`、**以** ` Dirt` 或 ` Soil` **结尾**，或**以** ` Grass Block` **结尾** |
| 沙 | 名称**正好是** `Sand` 或 `Red Sand`，或**包含** `Sandstone` |
| 岩石 | 名称**正好是** `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt` 之一、**包含** `Sandstone`、**以** ` Ore` **结尾**，或以独立单词形式包含 `Stone` / `Andesite` / `Diorite` / `Granite` |

Yellowstone 被显式列出，因为 `Stone` 在 `Yellowstone` 中不是独立单词。不透明与自发光**不**来自名称——它们来自引擎自身的不透明度与方块光发射数据，因此无法用这些规则推导。

来源: 引擎的名称分类器 (模块 28537，bundle `3ymzdd`)；已对照全部 7,861 个具名方块验证，2026-10-20。

示例——按材质给每个方块着色:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

对 v2 配方的影响: R-H 的 22 项树叶 id 数组 ([第八部分](08-apiv2.md) §34) 可缩减为 `(blockFlags & bloxdBlockFlagVegetation) != 0`。id ↔ 方块名对照表 [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) 在非着色器用途上仍然有用，但已不需要为了材质样式在世界内查找。

### 不带草的树叶 (大家都会问的问题)

单独的 `vegetation` 会同时匹配树叶**和**草方块上的草，而草方块还带有 `dirt`。排除泥土即可只影响树叶——这正是引擎自身字段注释写明的判别方式:

```wgsl
// 仅树叶: 不带泥土的植被。草方块是植被 AND 泥土。
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// 仅草方块 (地形表面的草面):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

已对照实时注册表验证 (2026-10-20，bundle `3ymzdd`):
`vegetation && !dirt` 精确匹配 45 个树叶注册项 (22 个基础类型——正是 v2 R-H id 数组测得的 22 个)；`vegetation && dirt` 精确匹配 8 个草方块。两个方向都没有例外——注册表计数以该构建为准；新方块会增加数字，但不会改变规则。可配合 `vertex.normal` (上/下) 选取面，例如只选草方块顶面。

## 43. 函数改名与语义变化

| v2 | v3 | 说明 |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | 页面加载后的秒数 (下方 f32 精度说明) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | 同一量: 渲染位置 + 此值 = 世界位置 |
| `const bloxdTimeWrap: f32 = 3600` | **已删除** | 在包侧自行定义周期 |
| `engineColour` (`BloxdLightIn` 中) | **已删除** (14 → 13 个字段) | 由 `litColour` + 雾重建 |
| 钩子参数 `v` / `s` / `l` | `vertex` / `surface` / `light` | 模板写法；签名不变 |

- **`bloxdSeconds()`** — 页面加载后的秒数。在 f32 中，前 4.5 小时以不足 1 ms 的步长计数，9 到 18 小时约为 4 ms。标头推荐 `bloxdSeconds() % period` 写法：从 0 计到 `period` 后重新开始——可干净替代已删除的回绕常量。
- **`bloxdRenderOffset()`** — 以整方块为单位: 「渲染位置加上此值即为世界位置。」它会随玩家移动而变化，因此渲染位置始终靠近玩家——也就更精确。全指南中，v2 文本所称的 noa 局部偏移现已统一称为**渲染位置** / 渲染偏移；它与 `bloxdOriginOffset()` 返回的是同一个量。
- **`bloxdTimeWrap` 已删除** — 原先以 3600 秒回绕时间的包，现在自行声明常量，例如 `const timeWrap: f32 = 3600.0;` 并使用 `% timeWrap`。
- **默认光照语义** — v2 默认值为 `engineColour + emission × fogVisibility`；v3 默认改为 `bloxdApplyFog(litColour + emission, light)`——**自发光现在会在默认实现内部随雾衰减**，因此合成输出会一起经过雾混合。移植表:

  | v2 表达式 | v3 移植 |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // v2 读取 `l.engineColour + s.emission * l.fogVisibility` 的 v3 移植:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **名称与含义不变**: `bloxdEyePosition()`、`bloxdSunDirection()`、`bloxdFaceBlock()`、`bloxdApplyFog()`、`bloxdWorldPosition()`。

## 44. 新标头常量: `bloxdPi` 与 `bloxdTau`

```wgsl
// 半圈与整圈，单位为弧度。
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

无论是三角函数技巧，还是为了避免在包内硬编码 π，都很有用。注意名称复用: 包内同名常量现在会与标头的重复标识符检查冲突——删除或重命名代码中任何 `bloxdPi` / `bloxdTau` 重声明。

## 45. 六钩子模板 (官方展示液体钩子)

随构建发布的默认包文本现在包含**全部六个钩子**——地形 / 液体 × vertex / surface / light——各自返回其引擎默认值。引擎注释如此介绍: *「每个钩子都返回其引擎默认值。复制一个钩子并修改其输出，即可开始制作着色器包。」*

```wgsl
// 每个钩子都返回其引擎默认值。复制一个钩子并修改其
// 输出，即可开始制作着色器包。

// 严格游戏会保持地形原位: 若不加守卫，这个钩子会在那里
// 关闭整个着色器包。
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// 水使用这些钩子。若删除，水会改用你的地形钩子。
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

- 钩子的注释直接写明液体规则: **水需要这一组三个钩子；删除后水会复用你的地形钩子** (v2 已知的回退行为，[第八部分](08-apiv2.md) §36，现已写入模板本身)。
- `bloxdLiquidVertex` 与 `bloxdTerrainVertex` 位于同一个 `#ifndef BLOXD_STRICT` 守卫内——若不加守卫，它会像地形侧顶点效果一样，在严格游戏中关闭整个包。
- 模板写法现使用完整参数名 `vertex` / `surface` / `light` (v2 模板使用短名 `v` / `s` / `l`)。你自己代码中的参数名是自由的——只有签名重要。

## 46. 变体矩阵: 程序轴与宏的变化

变体由 **严格 × 光照 × 程序** 矩阵生成——与 v2 相同的 8 种组合，但地形 / 液体现在是矩阵的显式轴。变体名写作 `allow|strict · unlit|lit · terrain|liquid`，在 UI 中显示为 `terrain` / `liquid`、`strict` / `non-strict`、`lighting on` / `lighting off` (错误显示可能追加 "(only in {{variants}})")。

| 宏 | 定义于 |
|---|---|
| `BLOXD_STRICT` | 严格变体 (两种程序) |
| `BLOXD_LIGHTING` | 开启光照的变体 (两种程序) |
| `BLOXD_ALPHA` | **所有液体变体**，外加非严格**地形**变体 |
| `BLOXD_SCENE_DEPTH` | **所有液体变体** |

与 v2 规则相比 ([第八部分](08-apiv2.md) §36)，作者侧有两项变化:

- **`BLOXD_ALPHA` 与 v2 相同。** 变体生成器带有字面行 `"liquid"!==program&&strict||push("BLOXD_ALPHA")`——JS 运算符优先级使 *(地形 **且** 严格)* 成为唯一跳过 push 的情况，因此该宏在**所有液体变体 (严格或非严格) 与非严格地形**中定义；只有严格地形省略它。液体侧的 `#ifdef BLOXD_ALPHA` 代码编译情况与以往完全一致，§49 的 alpha 回写 (为液体程序或非严格变体拼接) 与这一集合精确吻合。
- **`BLOXD_SCENE_DEPTH` 在液体变体中始终定义**，因此那里可以不加守卫地使用深度，与 v2 完全一致 (§35)；在地形钩子中仍需 `#ifdef BLOXD_SCENE_DEPTH` 包裹。

## 47. v2 → v3 迁移清单

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`**：三个输入结构体全部修改；用针对 `bloxdBlockFlag*` 常量的位测试表达材质样式 (§42)；去掉 v2 的 id 区间启发式
3. **`bloxdTime()` → `bloxdSeconds()`**；自行声明周期，替代已删除的 `bloxdTimeWrap` (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **按 §43 的表把光照数学从 `engineColour` 重建为 `litColour` + 雾**；注意默认实现现在会让自发光随雾衰减
6. **液体钩子**: 想让水得到不同处理时，显式定义 `bloxdLiquid*`；省略则回退到地形钩子
7. **无需审查 `BLOXD_ALPHA`**——其变体集合与 v2 相同: 所有液体变体与非严格地形都定义它，只有严格地形省略 (§46)
8. **使用 `bloxdPi` / `bloxdTau`**，替代硬编码的三角相关常量；删除现在与标头重复的包内重声明
9. **保留严格守卫**: vertex 钩子与 `discard` 仍包在 `#ifndef BLOXD_STRICT` 内；模板对 `bloxdLiquidVertex` 也采用与地形相同的守卫
10. **在游戏内验证**——在支持着色器包的游戏里编译并测试

## 48. 其他 v3 变更与注意事项

- **验证仍为两阶段** ([第八部分](08-apiv2.md) §38): 先静态验证，再通过生成的桩片段调用你的钩子，交给浏览器真实 WebGPU 编译；错误会映射回源文件 / 行，诊断还会通过映射还原引擎侧标识符的原始名称。
- **严格诊断会说明原因**: 移动地形的 vertex 钩子会报告 "… moves terrain, which strict games prevent."，surface / light 钩子中的 `discard` 会报告 "discard makes terrain see-through, which strict games prevent."；设置 UI 保留 "wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`." 的说明 (`offInStrict`)。
- **加载器消息**: 错误类型与限制不变；"Zip64 archives aren't supported." 会作为 UI 消息显示 (`loadZip64`)。包 UI 的字符串清单共 57 个 `shaderPack:*` 键；在加载阶段错误中，`loadNoWgsl` (zip 中没有任何 `.wgsl` 文件) 与 `loadNotZip` (文件缺少 zip 归档结束签名) 补全了这一集合。
- **包 UI 不附带游戏内 WGSL 编辑器。** 设置画面不提供着色器代码编辑器——包在游戏外以 zip 文件编写。(bundle 中确实存在 CodeMirror 编辑器，但那是 Custom Game 脚本 UI 的 JavaScript 编辑器；它不支持 WGSL，也与包系统毫无关联。)
- **硬件门槛**: Lite 要求驱动支持 `shader-f16` WebGPU 功能；过旧的驱动会被拒绝，消息类似 "Intel driver too old for Lite (no shader-f16)"。
- **光照变更会重新验证已保存的包**: 运行时光照设置改变时，引擎会重新运行包检查 (`changed → recheck`)；回放观看以 `changed: false` 调用同一钩子，并跳过重新检查。
- **措辞**: 关于接受着色器包的游戏，文本现在写作 "in games that **support** them"。
- **标题范围**: 包可运行的游戏集合与上一构建相同。

## 49. 引擎内部: Lite 渲染器如何调用你的钩子

§40–§48 是加载器与标头告诉你的一切。本节及随后四节记录引擎在运行时实际做了什么，均从生产 bundle 复原 (Lite 渲染器——175 KB 的 chunk；集成源文件的真实名称 `lite/terrainShaderPack.ts` 仍保留在其错误字符串中)。这些不改变你要写的代码，但能消除关于钩子收到什么的猜测——并解决其他社区指南仍列为未决的若干问题。

渲染器并不会从 JavaScript「调用」你的钩子。包通过验证后，引擎通过替换其着色器文本中的固定锚点行，**把你的钩子调用拼接进它自己的地形 WGSL**。每个锚点必须恰好匹配一次——零次或多次匹配都会以 `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)` 中止。

| 阶段 | 引擎着色器中的锚点行 | 拼接内容 |
|---|---|---|
| vertex | 从 `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` 到 `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);` 的四行代码块 | 构建 `BloxdVertexIn`，调用你的 vertex 钩子，写回 `worldPos`——拼接还会把 `let worldPos` 改写为 `var worldPos` |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | 构建 `BloxdSurfaceIn`，调用你的 surface 钩子，写回 `baseColor` / `alpha` |
| lit colour | 就在 `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` 之前 | `let bloxdSpLitColour = color.rgb;`——捕获雾前颜色 |
| light | 片元着色器最后的 `return color;` 行 | 构建 `BloxdLightIn`，调用你的 light 钩子，写回 `color`——在雾混合之后 |

拼接后的代码，从正式发布的 bundle 复原 (光照等级采样表达式在引擎自身格式过长处作了缩写):

```wgsl
// 顶点阶段——带顶点钩子的非严格变体
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* 你的 bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// 片元阶段——surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* 你的 surface 钩子 */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // 仅当程序为液体或变体为非严格时拼接
```

```wgsl
// 片元阶段——light
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // directional
        ambient,                                 // ambient
        /* 光照等级 varying */.rgb,              // blockLight
        /* 同一 varying 的天空通道 */,           // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* 手持光项 (见下) */,                   // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour——仅在完全没有雾时为黑色
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* 你的 light 钩子 */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

从这次拼接可直接得出四条执行事实:

- **严格地形会忽略 surface 钩子的 alpha 变更。** `alpha = bloxdSpSurface.alpha` 回写只会为液体程序或非严格变体拼接——这正是 §46 宏表背后的实现。(在严格地形中，你的 `#ifdef BLOXD_ALPHA` 代码本来就不会编译进来；现在也确认了未加守卫的 alpha 写入在那里会被丢弃。)
- **仍声明 vertex 钩子的严格变体永远不会运行它**——引擎在构建时报告: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`。这就是官方模板 (§45) 为何把 `bloxdLiquidVertex` 与地形版本一样包在 `#ifndef BLOXD_STRICT` 中。
- `bloxdSp*` 标识符——**共 14 个**: `bloxdSpVertexIn`、`bloxdSpVertex`、`bloxdSpSurfaceIn`、`bloxdSpSurface`、`bloxdSpLightIn`、`bloxdSpLight`、`bloxdSpLitColour`、`bloxdSpSceneDepth`、`bloxdSpPixel`、`bloxdSpPositionW`、`bloxdSpZ`、`bloxdSpEye`、`bloxdSpScale`、`bloxdSpBehind`——是引擎侧临时变量。你的代码永远不会看到它们，但它们会出现在诊断和任何人的逆向输出中，因此值得一眼认出。
- **默认 surface 捷径。** 当变体的 surface 钩子字面就是 `bloxdDefaultSurface` 时，引擎完全跳过拼接 `baseColor` / `alpha` 回写行——默认实现已经产生这些值，赋值只会是死代码。未修改的钩子链不付出任何代价。

**`BloxdLightIn` 实际由什么填充**——逐字段，来自拼接代码:

| 字段 | 引擎侧来源 |
|---|---|
| `litColour` | 雾混合前刚捕获的片元颜色 (`bloxdSpLitColour` 锚点)——正如标头所说，「在自发光与雾之前」 |
| `directional` | `vTerrainLambert`——场景方向光上 `max(0, dot(normal, lightDirection)) × intensity` 的顶点插值和 (公式见 §54)；场景没有方向光时为 0 |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient`——每材质、每帧 |
| `blockLight` | 解码后的光照等级 varying 的 `.rgb` (解码见 §54) |
| `skyLight` | 同一光照等级 varying 的天空通道——*「体素天空光，经色调映射；无 BLOXD_LIGHTING 时为 1」* (标头文本) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | 手持光项，由光照等级 varying 的 w 通道与 `uHeldLightPos` / `uHeldLightColour` 帧 uniform 构成 ([第七部分](07-internals.md) §26 记录了衰减与通道地板行为) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)`——**仅在完全没有雾的场景中为黑色** (模式 0，§50) |
| `fogVisibility` | 钳制后的雾系数——§50 函数返回的精确值 |
| `position` / `normal` | `vPositionW` / `vNormalW` varying (法线逐片元重新归一化) |
| `blockFlags` | `vBlockFlags` flat varying——§52 的完整传递路径 |

阅读旧资料时的定位参考: 相同的拼接架构在 v2 渲染器中已存在，v3 的集成差异只有 `vBlockId` → `vBlockFlags` 以及新增的液体变体。跨越 v2 → v3 的断裂，钩子系统架构保持稳定。

## 50. 雾函数: 四种模式，一个字段

从生产地形着色器逐字复原:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // 线性
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // 指数
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // 指数平方
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = 雾关闭 (系数保持 1.0)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)`——一个 vec4 驱动一切。
- **着色器中存在四种模式: 0 = 关闭，1 = 指数，2 = 指数平方，3 = 线性。** 无论运行哪种模式，`fogVisibility` 都是钳制后的系数——只有一个字段，且从不向包暴露模式标志。
- Bloxd 自家标题使用模式 3 (线性)，采用[第七部分](07-internals.md) §25 所述的 32 方块雾带 (`fogStart = 32 × D`，`fogEnd = 32 × (D + 1)`)，因此第七部分的「始终线性」观察仍描述已发布玩法。但指数模式是真实、活跃的引擎代码——标题可以切换 `vFogInfos.x`，在客户端不更新的情况下改变渐变。自行计算 `distance(l.position, bloxdEyePosition())` 的距离配方 (配方 R-B) 是编写距离驱动外观的稳健方式，因为它们不会被模式切换移动。
- 这从源码层面解决了「引擎实际使用哪种雾渐变」的问题: 四种都已实现；已发布标题使用线性。(同一函数也解释了标头的 fogColour 注释——模式 0 是 `fogColour` 以黑色到达的唯一情况，而 Bloxd 的游戏从不发布模式 0；它们改为把雾推得很远，[第七部分](07-internals.md) §25。)

## 51. bloxdOpaqueBehind(): 精确实现

整个函数，从生产构建逐字复原:

```wgsl
@group(3) @binding(1) var bloxdSpSceneDepth: texture_2d<f32>;
var<private> bloxdSpPixel: vec2i;
var<private> bloxdSpPositionW: vec3f;

fn bloxdOpaqueBehind() -> BloxdOpaqueBehind {
    let bloxdSpZ = textureLoad(bloxdSpSceneDepth, bloxdSpPixel, 0).r;
    if (bloxdSpZ <= 0.0) {
        return BloxdOpaqueBehind(false, vec3f(0.0), 0.0);
    }
    let bloxdSpEye = bloxdPackInputs.eyePosition;
    let bloxdSpScale = max(bloxdSpZ / (scene.view * vec4f(bloxdSpPositionW, 1.0)).z, 1.0);
    let bloxdSpBehind = bloxdSpEye + (bloxdSpPositionW - bloxdSpEye) * bloxdSpScale;
    return BloxdOpaqueBehind(true, bloxdSpBehind, distance(bloxdSpBehind, bloxdSpEye));
}
```

- **深度纹理位于 `@group(3) @binding(1)`**——group 3 是包自己的组: binding 0 是 64 B 的 `bloxdPackInputs` uniform (§41)，binding 1 是这个深度纹理。两者都由引擎提供，包侧无法命名。
- **深度纹理是不可过滤浮点 (unfilterable-float)、仅片元的资源。** bind group 布局将其注册为 `texture: { sampleType: "unfilterable-float" }`，可见性仅为 `GPUShaderStage.FRAGMENT`——这正是 `bloxdOpaqueBehind()` 建立在 `textureLoad` (显式 texel 坐标，mip 级别 0) 而非 `textureSample` 上的原因: 硬件过滤在这张纹理上根本不可用。
- `z ≤ 0` 表示深度采样没有命中任何东西 (远平面 / 天空): `found = false`，而 `position` / `distance` 无意义——永远先检查 `found`。
- 返回的位置是**射线缩放交点**: 不透明表面放在 `eye + (fragment − eye) × max(z / viewDepth, 1)`。`distance` 从眼睛量到该点——对水面包来说，这实际上就是「射线在撞到实体前穿过了多少水」，这也正是深度着色水面配方无需第二个深度缓冲就能工作的原因。

## 52. blockFlags 全链路: 从注册到钩子

§42 说明了各位的含义。本节给出标志位从方块注册到钩子的完整路径——每一跳都已从生产源码确认，这也把标头的「面上一致」证明到字节级。

**1. 注册 (方块定义数据库)。** 每个方块的标志在注册时计算一次:

```js
flags[id] = nameFlags                     // 显示名规则 (§42): 植被 / 泥土 / 沙 / 岩石
          | (definition.opaque === true ? 1 : 0)   // 不透明位——引擎不透明度数据
          | (anyFaceEmission >= 1       ? 2 : 0);  // 自发光位——方块光发射数据
```

显示名规则只覆盖四个材质位；两个物理位来自独立的引擎数据——`opaque` 直接来自方块定义，`emissive` 来自逐面方块光发射数组。标头所说「发光的矿石也算，无论多微弱」是字面意思: 任何面发射 ≥ 1 都会置位。

**2. 逐方块 → 逐材质 (mesher 初始化)。** 地形按*材质*绘制，而不是按方块 id，因此标志会重新制表为材质表 (`Uint16Array`，以材质 id 索引，每个材质取其所属方块第一个面的标志)。该表会送到 meshing Web Worker——但**只在启用包管线的配置中**；否则表为 `null`，且永远不会写入任何标志字节。没有包的玩家按构造付出零开销。

**3. 进入顶点字节 (mesher worker)。** 标志搭载在现有交错顶点数据的两个空闲字节上:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // 低 8 位 → 颜色属性的 alpha 字节
        buffer[o + normalOffset + 3] = flags >> 8;    // 高 8 位 → 法线属性的 w 字节
    }
}
```

一个面的四个顶点都收到相同值——这就是「面上一致」在实现层的含义。

**4. GPU 侧解码 (Lite 地形着色器)。** 这两个字节作为 `blockFlagWords: vec2u` 顶点属性传输 (location 7，仅在包管线开启时存在)，并在顶点阶段重组:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags` 声明为 `@interpolate(flat)`——逐面常量一直传到片元阶段，因此 §42 的位测试在面内稳定，绝不会产生面内混合。

- 管线保留 **16 位**容量 (该解码会重组两个完整字节)，而 v3 只定义了 6 位——未来新增标志无需再次修改顶点格式或提升 API 版本。
- 在 packed 顶点模式下，同样两个字节搭载于 `packed.y` 与颜色字的高字节中，而不是专用属性——值相同，容器不同。
- 关于这些标志最常被问到的树叶与草之分，见 §42 下的[不带草的树叶](#不带草的树叶-大家都会问的问题)。

## 53. 验证内部: HEADER_VERSION、签名、保留名

**实测标头哈希。** 每次包验证都会盖上引擎的 `HEADER_VERSION`。直接执行生产验证模块 (§54 末尾的 harness 说明) 可测得:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← 从正式生产 bundle 实测
```

它是一个 FNV-1a-32 哈希 (前缀 `6.`)，对五个输入计算: 按**每个变体**预处理并分词的引擎标头 (8 个变体各一项)、解析器完整的 WGSL 词法宇宙、四个宏名、特殊函数映射，以及 `BloxdPackInputs` 声明连同其 `@group(3) @binding(0)` uniform 行。对作者有两点后果:

- **任何引擎侧标头修改都会重新哈希**——这正是引擎更新后已保存包自动收到「需要重新检查」标记的机制 ([第八部分](08-apiv2.md) §31)。
- 哈希覆盖的是*引擎标头*，不是你的代码。在引擎更新后仍能加载的包并不代表「仍然有效」——只是尚未触发标头变更。你的 manifest 参与的唯一版本检查是 `apiVersion` 闸门 (§40)。

**钩子签名检查: 类型逐 token 精确，名称自由。** 验证器为每个钩子槽保存一个签名:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

匹配是**逐 token** 的: 参数类型名必须完全一致，`->` 与返回类型必须完全一致，并检查参数数量和逗号位置。参数*名称*自由——参数位置接受任意标识符，因此你的 `fn bloxdTerrainLight(s, l)` 即使模板写作 `(surface, light)` 也能编译。light 钩子恰好接受两个参数。

**保留名。** 规则是单个正则: `/^bloxd/i`。任何以 `bloxd` 开头的标识符都保留——所有 `bloxd*` 都由引擎提供，包不能声明进该命名空间 (这也是 §44 的 `bloxdPi` / `bloxdTau` 重声明会冲突的原因)。

**特殊函数。** v3 中恰好注册了一个:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

「特殊」意味着*与宏绑定*——可用性取决于变体符号的引擎函数。两条守卫诊断会强制正确使用:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.`——vertex 钩子调用了仅 surface / light 钩子可用的函数。
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.`——例如地形侧调用 `bloxdOpaqueBehind()` 却没有 `#ifdef BLOXD_SCENE_DEPTH` 包裹。

**引擎标头 (prelude)，已钉住。** v3 标头是一个 5,637 字节字符串，开头为 `// Engine-provided and read-only, prepended to all packs. apiVersion 3.`。它带有 `#if` / `#ifdef` 指令，由引擎自己的 WGSL 预处理器逐变体求值——引擎确实会执行 `#if` 表达式求值，格式错误的表达式会报 `Cannot evaluate #if ...`。本指南中的每个结构体、函数签名与引用注释都来自这段渲染文本，因此指南与随附标头不会漂移。

**给作者的解析器说明。**

- 包侧函数在合并进引擎着色器时会加上 `pack_` 前缀 (避免冲突)；诊断会把它们映射回你的原始名称——与[第八部分](08-apiv2.md) §38 所述第二验证阶段的机制相同。
- 未声明标识符消息为 `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`；`_ can only be the target of a phony assignment, as in _ = f();` 与 `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.` 补全了新确认的消息集合。
- 解析器的词法宇宙包含**并非标准 WGSL** 的标识符: `bufferView`、`bufferArrayView`、`bufferLength`、`atomicStoreMax`、`atomicStoreMin`。引擎将它们视为内置，但给定浏览器是否提供并不保证——绝不要基于它们构建分发包。

## 54. 已确认的常量、限制与布局

地形程序的完整资源布局，直接来自生产 Lite 渲染器:

| Binding | 内容 |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms`——`viewProjection` mat4x4f、`view` mat4x4f、`vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms`——`uHeldLightColour` / `uHeldLightPos`、`uSkyLightColour`、`uAmbientLightColour`、**`vFogInfos`**、`vFogColor`、`outputHeight`、`sceneAmbient`、**`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: storage `array<vec4f>`——xyz = 到渲染帧的平移，w = 淡入可见度 |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`、`ambientAndCutoff`、`emissiveAndLevel`、`anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs`——包 uniform (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth`——深度纹理 (§51) |

- **方向光硬上限为四盏。** 场景尝试注册更多时，渲染器会以 `Terrain supports 4 directional lights, not ${n}` 报错。`l.directional` 是实际存在数量的 Lambert 之和 (0–4；Bloxd 自家场景使用 2 盏——[第七部分](07-internals.md) §27)。地形还会对其无法满足的光源发出警告，原文如下: 延迟加入的光源——`Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`；带色调的光源——`Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`；以及过滤网格的光源——`Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **地形程序命名**: 管线缓存键为 `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}`——包以 `-sp{variant}` 后缀出现，每个 §46 变体对应一个程序。监视器 (`watchPipelineFailures`) 将活动管线名与 `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/` 匹配，并在管线编译失败时重新检查对应的包变体；GPU 设备丢失 (`device.lost`) 会跳过该检查。
- **`BLOXD_TERRAIN_DIRECTIONAL` 是引擎内部宏** (dirLightCount > 0 时定义)。它*不是* prelude 四个宏之一，也永远不会到达包代码——但它会出现在引擎自身着色器的 WGSL dump 中，认得它可以避免混淆。
- **光照等级解码**: `aPackedLightLevels` 顶点属性是一个 f32，打包四个 nibble，各除以 15: rgb = 彩色方块光，a = 天空 / 手持通道。顶点阶段将其解码到 `vLightLevels` varying；`blockLight` 读取 `.rgb`，天空 / 手持通道读取 `.w`。引擎在插值前会把 rgb 通道抬到最亮通道的 35% 下限——这是[第七部分](07-internals.md) §26 从玩法侧记录的提升在引擎侧的锚点。
- **`vTerrainLambert`** (`directional` 的来源，§49) 由活动方向光求和生成: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`，受 `BLOXD_TERRAIN_DIRECTIONAL` 守卫。
- **索引缓冲在首个大网格处转为 32 位。** Lite 渲染器只在所有索引值 ≤ 65,534 时选用 `Uint16Array` 索引——一旦任何索引达到 65,535，缓冲区就变为 `Uint32Array` (以 `is32Bits` 标志逐缓冲跟踪)。实际影响: 顶点数至多 65,535 的区块网格可用 16 位索引；恰好 65,536 个顶点的网格必然产生 65,535 的索引，并让整个缓冲区切换到 32 位。
- **Manifest 加载细节**: `__MACOSX/` 下的 zip 条目、以 `._` 开头的文件与 `.DS_Store` 会被过滤 (macOS 归档噪声)；`pack.json` 通过小写路径比较定位——零个匹配 → `loadNoManifest`，两个或更多 → `loadDuplicateManifest`；manifest 读取上限为 65,536 字节。
- **以上内容的验证方式**: 生产 bundle 的模块被复原 (165 个 chunk；webpack 注册表在此 bundle 中计得 4,951 个模块——模块数会因是否包含异步子依赖而浮动几个，因此请把确切数字视为该 bundle 专有)，并在 Node.js 下于兼容 webpack 的 harness 中执行。实测的 `HEADER_VERSION` (§53)、渲染出的 5,637 字节标头、变体表的标准顺序与特殊函数映射都来自*运行随附代码*，而不是读取字符串。同一 harness 很适合作为社区 `pack_check` v6 的核心——对包执行引擎自己的验证器可精确复现其判定。

---

调查：ltf_ahel (使用 glm 调查)

[← 上一部分](08-apiv2.md)·[返回手册](README.md)
