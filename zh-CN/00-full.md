# Bloxd.io 着色器包制作方法 (完整版)

自包含的 Bloxd.io 着色器包 (仅 WebGPU 渲染器) 制作与分发指南。

> 本书为非官方指南，不代表开发者的官方立场。API 可能随时变更。  
> 本指南在 AI 协助下创建，不保证准确性。请以实际游戏表现为准。  
> 最后检查: 2026-10-27 (已确认 v4 上线 —— 构建 `cnty9`，生产与预发布一致；见第十部分。 通过对比构建确认 v3 已正式上线；钩子调用、雾、深度与 blockFlags 内部实现均从生产构建复原——第九部分 §49–§54)。完整参考材料已作为第十一部分 (`11-reference.md`) 嵌入——逐字复原的引擎头文件与含全部 905 个可用纹理名称的完整实测目录；API 说明与配方仍请持续以加载界面与游戏内编译为准。  
> 着色器包功能本身是游戏内 UI 可加载的官方功能，包为纯 WGSL  
> (无 JS 执行、无网络通信)，正常代码不会发生危险。

[返回手册](README.md)·[下一部分 →](02-api.md)

# 第一部分: 制作包

> 现行游戏自 2026-10-26 起要求 `apiVersion: 4`，加载时会拒绝 v1/v2/v3 包 —— 以下内容按 v2 规范撰写。分发前请查阅 [第九部分](09-apiv3.md) 与 [第十部分](10-apiv4.md) 以便迁移。

## 1. 概述与前提

- 着色器包**仅用于 WebGPU 渲染器**。安装包期间，设置中的 WebGPU 渲染器会被强制开启
- 包使用 **受限 WGSL 子集**编写。仅影响**地形 (terrain) 与液体 (liquid)** 的外观
- 能做的事: 修改颜色、透明度与自发光；重建光照；投影风格阴影 (R9.12)；顶点动画 (仅部分游戏)
- 不能做的事: 添加自定义纹理、后处理 (泛光等)、随太阳旋转的像素级阴影 (阴影贴图) 与真实反射 (SSR)、影响天空与实体 (采样现有方块纹理图集**自 v4 起已可行** —— `bloxdTexel`，[第十部分](10-apiv4.md) §57)
- 能做 (但容易被忽视) 的事: **使用 `skyLight` (体素天空遮蔽) 的投影风格阴影** — 可明显压暗树下与屋檐下 (R9.12)。破坏方块会使 LightEngine 立即重算，阴影实时跟随
- **大多数游戏为严格 (strict) 模式** (无顶点动画、无 `discard`)。面向公开发布的包应按严格模式设计

## 2. 最短步骤

1. 新建文件夹，放入 `pack.json` 与 `.wgsl` 文件
2. 从游戏设置 → Shader Pack 加载 zip 或文件夹
3. 出错则修复后重新加载 (见[第五部分](05-troubleshooting.md))
4. 在支持的游戏中测试
5. 完成后打包成 zip 分发

## 3. 包结构

- **分发形态**: 单个 `.zip`，或文件夹 (文件夹加载仅桌面浏览器)
- **内容**: 1 个 `pack.json` (位于包最顶层，大小写不敏感) + 1–256 个 `.wgsl` 文件
- 多个 `.wgsl` 会拼接为一个模块处理，因此自由拆分与分子目录。文件名无限制。拼接按**输入名 (路径) 的字典序**进行 (模块级声明不依赖顺序，通常无影响——只对依赖 `var` 初始化顺序的代码有影响)。非 `.wgsl` 文件 (README 等) 会被忽略
- 打包技巧: 若 zip 内所有文件位于同一公共根文件夹下，该前缀会被自动剥离 (macOS「压缩」生成的 zip 可直接使用；`__MACOSX`、`._` 前缀文件与 `.DS_Store` 等系统垃圾会被自动排除)。但根层级混入多余文件会失去顶层判定，最稳妥的是进入文件夹内直接指定 `pack.json` 与 `.wgsl` 打包 (确认 `pack.json` 位于 ZIP 根目录)

| 项目 | 上限 |
|---|---|
| zip 大小 / 条目数 | 32MB / 1024 |
| pack.json 大小 | 64KB，UTF-8 |
| .wgsl 合计大小 | 256KB，UTF-8 |
| zip 格式 | 拒绝 zip64、分卷与加密 zip。压缩仅限 store / deflate，禁止重复路径 |

## 4. pack.json

```json
{
  "apiVersion": 3,
  "name": "My Pack",
  "author": "your name"
}
```

| 字段 | 必需 | 说明 |
|---|---|---|
| `apiVersion` | 必需 | 必须与 `3` 完全一致。含 `1`/`2` 的包会在加载时被 `shaderPack:loadWrongApiVersion` 拒绝 — 迁移见 [第九部分](09-apiv3.md) |
| `name` | 必需 | 不可为空。显示在设置界面 |
| `author` | 可选 | 可省略。非字符串值 (数字等) 会报错 |

其他字段会被忽略。

## 5. 最小模板

仅需 `pack.json` (第 4 章) 与以下 `pack.wgsl` 即可运行：

```wgsl
// 轻微暖色的最小包
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

必须遵守的规范：

- 输出结构体**禁止直接构造** (`BloxdSurface(...)` 会报错)。必须以 `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` 为起点改写字段。例外：light 钩子第 1 参数 (`s: BloxdSurface`) 即输出同型，`var out = s;` 起步亦可
- 未初始化的 `var x: BloxdSurface;` (仅类型注解) 同样报错
- 钩子参数**只读**。要修改请先复制，如 `var sv = s;`
- 自定义标识符禁止使用 `bloxd_` 前缀 (6 个钩子名除外)
- 常量用 `const` 书写 (`#define` 不能带值)

## 6. 六个钩子

全部可选。签名必须类型完全一致 (参数名可自由)。

| 钩子 | 作用 |
|---|---|
| `fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex` | 地形顶点动画。**严格模式下不可用** |
| `fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface` | 地形颜色、透明度、自发光。`s.colour` 为纹理×顶点色 |
| `fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight` | 地形最终颜色。在片元**最后阶段**调用，返回值原样成为最终颜色 |
| `fn bloxdLiquidVertex / bloxdLiquidSurface / bloxdLiquidLight` (同形) | 液体版。`alpha` 作为液体透过率生效 |

回退规则：

- 液体钩子未定义时，**使用同名地形钩子** (反之不行)。只写 surface 也会对液体生效
- light 钩子未定义时使用默认行为 (`engineColour + emission × fogVisibility`)
- 丢弃 `engineColour` 改从基色重建时，需自行重打雾：`mix(l.fogColour, col, l.fogVisibility)`。叠加 emission 时先乘 `fogVisibility`

## 7. 八种变体与守卫

代码只写一份，但必须在 **{strict, allow} × {光照开, 光照关} × {地形, 液体} 的 8 种组合**下全部通过编译。
可用的条件分支只有 `#define` (仅标志名) / `#ifdef` / `#ifndef` / `#else` / `#endif`。`#` 必须位于行首 (函数内也可)。

| 守卫 | 含义 | 用途 |
|---|---|---|
| `#ifndef BLOXD_STRICT` | 仅非严格 (allow) | 包裹整个 vertex 钩子与 `discard` |
| `#ifdef BLOXD_LIGHTING` | 仅光照开启时 | 包裹触及 `blockLight`、`skyLight`、`ambientLightColour` 等的代码。**共用辅助函数 (模块级 fn) 必须整个函数包裹** (仅守卫调用处不够) |
| `#ifdef BLOXD_ALPHA` | `alpha` 字段存在时 (液体恒有、地形仅 allow) | 包裹触及 `alpha` 的代码 |

## 8. 可用的语言功能与禁项

可用的：

- WGSL 内建函数 (`sin`、`mix`、`clamp`、`distance`、`smoothstep`、`reflect`、`select` 等)
- 自写 `fn` / `struct` / `const` / `alias` / `var<private>`，函数内的 `let` 与控制流 (if/for/while/switch 等)
- 导数 (`dpdx` / `dpdy` / `fwidth`) 仅 surface/light 钩子 (片元阶段)。vertex 不可用
- `const` 数组 (如调色板 LUT)、指针 (`ptr<function, T>`)、矩阵 (`mat3x3f` 等)
- 标志定义 `#define 名称` + `#ifdef` 条件分支

禁止、注意：

- **纹理不可**：`texture_*` / `sampler` 类型不可用。质感用哈希噪声等程序化计算制作
- **`discard` 在严格模式下禁止** (用 `#ifndef BLOXD_STRICT` 包裹)
- `@属性` / `enable` / `requires` / `override` 禁止。因无法书写 `enable f16;`，**f16 系类型实际禁用**
- `@builtin` 属性同样禁止，`fragCoord` (屏幕坐标) 与 `vertex_index` 无法读取
- **模块级 `let` 不可用** (用 `const` 或 `var`)
- `atomic` 不可用
- 坐标为 noa 局部坐标。世界坐标需加 `bloxdOriginOffset()`。方块坐标为 `bloxdFaceBlock(position, normal)`

## 9. 验证、测试与分发

加载时按顺序执行以下检查：

1. 加载器限制检查 (第 3 章上限)
2. 静态编译 (全部 8 变体)
3. 浏览器 WebGPU 实机编译验证 (静态验证类型检查不完全，部分写法只在这里失败——避开第 8 章陷阱)

步骤：

1. 从设置 → Shader Pack 加载 zip / 文件夹
2. 确认状态。选中后立即显示「Ready. Reload the page to use it.」——重新加载页面后「Ready to use」即成功。出现「Saved, but it won't run until you fix these errors...」时，按错误列表 (文件:行 + 变体) 修复后重新加载
3. 重新加载页面以激活。URL 参数或 localStorage 中若残留渲染器覆盖会导致包拒绝启动，请先清除
4. 先在限制宽松的游戏中确认，再到严格游戏 (占大多数) 确认。顶点动画仅 allow 游戏有效
5. 分发时将 `pack.json` 置顶打包 (遵守第 3 章上限)。包可在同一界面被替换，但重新加载页面后才生效 (步骤 2–3)。Remove Pack 删除。游戏更新后的重验证在页面加载时自动执行

[返回手册](README.md)·[下一部分 →](02-api.md)

[← 上一部分](01-making.md)·[返回手册](README.md)·[下一部分 →](03-recipes.md)

# 第二部分: API 参考

> 现行游戏自 2026-10-26 起要求 `apiVersion: 4`，加载时会拒绝 v1/v2/v3 包 —— 以下内容按 v2 规范撰写。分发前请查阅 [第九部分](09-apiv3.md) 与 [第十部分](10-apiv4.md) 以便迁移。

## 10. 引擎头 (自动前置于包代码)

以下代码由引擎自动插入到包代码开头 (包不可重复声明)。`#ifdef` 包裹部分随变体变化。

```wgsl
// Engine-provided and read-only to packs. apiVersion 2.
const bloxdTimeWrap: f32 = 3600.0;   // seconds until time wraps to 0

fn bloxdTime() -> f32;               // seconds. wraps to 0 every 3600 s
fn bloxdOriginOffset() -> vec3i;     // whole blocks. noa-local + this = world coords
fn bloxdEyePosition() -> vec3f;      // camera position (noa-local)
fn bloxdSunDirection() -> vec3f;     // sun direction (unit vector, non-zero only with earth skybox)
fn bloxdWorldPosition(position: vec3f) -> vec3f;  // noa-local -> world coords
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i;  // world block coords of this face
fn bloxdApplyFog(colour: vec3f, l: BloxdLightIn) -> vec3f;   // mix(l.fogColour, colour, l.fogVisibility)

struct BloxdVertexIn {
    position: vec3f,   // noa-local world space (world minus bloxdOriginOffset())
    normal: vec3f,
    blockId: u32,      // owning block id (flat-interpolated, uniform across the face)
}

#ifndef BLOXD_STRICT
struct BloxdVertex {
    position: vec3f,     // noa-local
}
#endif

struct BloxdSurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    blockId: u32,        // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct BloxdLightIn {
    litColour: vec3f,          // engine lighting result (before emission and fog)
    engineColour: vec3f,       // post-fog = bloxdApplyFog(litColour, l). excludes emission
    directional: f32,          // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,            // the material's ambient times the scene's
    blockLight: vec3f,         // voxel block light, tone-mapped (all variants; 0 when unlit)
    skyLight: f32,             // voxel sky light, tone-mapped (all variants; 1 when unlit)
    ambientLightColour: vec3f, // present in all variants (white when unlit)
    skyLightColour: vec3f,     // present in all variants (white when unlit)
    heldLight: vec3f,          // held light here (all variants; 0 when unlit/out of range)
    fogColour: vec3f,
    fogVisibility: f32,        // 1 = no fog, 0 = fully fogged (renamed from v1 fogFactor)
    position: vec3f,           // as in BloxdSurfaceIn
    normal: vec3f,
    blockId: u32,              // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdLight {
    colour: vec3f,
}

// liquid variants, surface / light hooks only
struct BloxdOpaqueBehind {
    found: bool,       // false when no opaque face behind (sky)
    position: vec3f,   // opaque face position behind (noa-local)
    distance: f32,     // distance from the eye
}
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind;

#ifndef BLOXD_STRICT
fn bloxdDefaultVertex(v: BloxdVertexIn) -> BloxdVertex;
#endif

fn bloxdDefaultSurface(s: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdDefaultLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight;
```

要点解读：

- `bloxdTime()` 每 3600 秒回绕，为流逝时间 (`bloxdTimeWrap`)。不保证与游戏内昼夜时钟同步。绑定组的阶段可见性为 VERTEX|FRAGMENT，因此**vertex 钩子也可调用**。
- `bloxdSunDirection()` 仅在太阳存在时为单位向量，无太阳的天空为零。**月亮恒为 `-bloxdSunDirection()`** (引擎将月亮位置算作太阳的严格反方向)。现行构建没有昼夜循环：太阳、月亮、星星在游玩中一动不动 (仅 `dayNightSunOpacity` 之类的透明度切换)。默认 earth 型天空中太阳固定于 ≈ `(−0.56, 0.81, −0.18)` (仰角 ~54°)。**绝不要把零向量传给 `normalize`**——用 `dot(d, d) < 1e-8` 判无太阳并回退到常数方向 (见[第七部分](07-internals.md) §28)
- ※注：此前写成「零时不可复用为月亮方向」。方向本身经 `-bloxdSunDirection()` 可得，但分发包应以零为前提用 `sunPresent` 分支 (蓝色环境光拟似见 R2，方向性月光见第七部 R-A)。
- `emission` 在光照计算后叠加，以 **`fogVisibility` 衰减** (defaultLight 实现 `engineColour + emission × fogVisibility`。完全沉雾的远景发光也消失)
- **雾应用顺序**：片元内处理顺序为 ① 光照·发光合成 → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ light 钩子调用 → ⑤ return。因此 **engineColour 以打雾态到达**，**light 钩子返回值原样成为最终颜色** (钩子后不再重打雾)
- **fogVisibility 定义源**：视图空间距离 (按顶点计算、插值)。linear 模式 `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **fogMode == 0 时**：`fogColour` 以 `vec3f(0.0)` (黑) 到达。以 fogColour 色味推断时段的代码请注意
- **现行构建实际雾设置**：**linear 固定**。`fogStart` = 绘制区块距离、`fogEnd` = +1 区块 (仅地平线)。雾关闭设置下为 100 / 101 区块，实际无效。默认雾色 RGB(183, 191, 195)
- `bloxdPackInputs` uniform (`@group(3) @binding(0)`，64B) **仅经标头函数使用**。包不可直接引用。阶段可见性为 VERTEX|FRAGMENT，因此标头函数也可从钩子外的模块级函数与 vertex 钩子调用。深度纹理 (binding 1) 为 FRAGMENT 专用，因此 `bloxdOpaqueBehind()` 仅限 surface / light 钩子
- **`litColour` 可作起点**：v1 只有打雾后的 `engineColour`，自制大气表现容易双重打雾。v2 从打雾前、emission 前的 `litColour` 出发，经 `bloxdApplyFog()` 按自己的节奏重打雾
- **`blockId` 可区分方块种类**：不依赖纹理颜色的标识。但 ID 与方块种类的对应表在引擎内部，哪一 ID 对应何种方块可世界内实测，现成对应表见 [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (见[第八部分](08-apiv2.md))
- **禁止直接构造结构体**：`BloxdLight(...)` 等构造器调用会被静态检查拒绝。务必从 `bloxdDefault*` 改写，或使用输入的拷贝
- **`skyLight` / `blockLight` / `heldLight` 经过「提升曲线」后到达**。头注释的 `tone-mapped` 即指此：引擎必先对片元施加 `y = 1-(1-x/(3-2x))³` (提亮暗部的 S 曲线) 再交给包。不是体素原始值 (n/15)；如树下 (原始 0.87) 会被提升为 **0.97** 到达
- `skyLight` 实质是「该处能否看见天空」的体素遮蔽数据 (= 阴影贴图)，而非单纯的亮度参数 (见第 15 章「阴影的真相」)

## 11. 变体一览

| 变体 | BLOXD_STRICT | BLOXD_LIGHTING | BLOXD_ALPHA |
|---|---|---|---|
| allow + 无光照 + 地形 | – | – | ✓ |
| allow + 无光照 + 液体 | – | – | ✓ |
| allow + 有光照 + 地形 | – | ✓ | ✓ |
| allow + 有光照 + 液体 | – | ✓ | ✓ |
| strict + 无光照 + 地形 | ✓ | – | – |
| strict + 无光照 + 液体 | ✓ | – | ✓ |
| strict + 有光照 + 地形 | ✓ | ✓ | – |
| strict + 有光照 + 液体 | ✓ | ✓ | ✓ |

头结构体形态也随变体变化 (strict 无 `BloxdVertex`、无光照无 `blockLight` 等、strict 地形无 `alpha`)。

官方定义的符号只有 4 个 (上述 3 个 + `BLOXD_SCENE_DEPTH`——[第八部分](08-apiv2.md) §35)。地形 vs 液体不是符号，而是**独立程序**：`#ifdef BLOXD_TERRAIN` 之类的分支不可能实现。flag 名匹配不区分大小写；`#ifdef` 中名字写错时，错误消息会列出 4 个有效名字。钩子函数只注入地形与液体程序——包无法影响实体、粒子或其他任何渲染。

## 12. 骨架速查

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);          // 禁止直接构造，务必从 default 出发
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // 地形仅 allow 时有 alpha
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);         // engineColour + emission*fogVisibility
    #ifdef BLOXD_LIGHTING                       // 守卫仅光照输入
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex 务必带此守卫
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdTime()) * 0.05;
    return out;
}
#endif
```

时刻牢记 5 点：8 变体全部通过 / 严格游戏占大多数 / 纹理不可 / 钩子参数只读 / 模块级不用 `let`。

[← 上一部分](01-making.md)·[返回手册](README.md)·[下一部分 →](03-recipes.md)

[← 上一部分](02-api.md)·[返回手册](README.md)·[下一部分 →](04-realism.md)

# 第三部分: 配方集

> 现行游戏自 2026-10-26 起要求 `apiVersion: 4`，加载时会拒绝 v1/v2/v3 包 —— 以下内容按 v2 规范撰写。分发前请查阅 [第九部分](09-apiv3.md) 与 [第十部分](10-apiv4.md) 以便迁移。

- [R1. 颜色配方 (surface)](#r1-颜色配方-surface)
- [R2. 光照配方 (light)](#r2-光照配方-light)
- [R3. 自发光配方 (emission)](#r3-自发光配方-emission)
- [R4. 坐标配方 (世界/方块/视线)](#r4-坐标配方-世界方块视线)
- [R5. 时间配方 (动画)](#r5-时间配方-动画)
- [R6. 液体配方](#r6-液体配方)
- [R7. 顶点配方 (仅 allow)](#r7-顶点配方-仅-allow)
- [R8. 数学小技巧](#r8-数学小技巧)
- [R9. 写实系配方](#r9-写实系配方)

---

所有片段均按 8 变体通过前提写好守卫，可直接复制改常数使用。但以下配方为独立示例，不可从上到下全部拼接——同一钩子名 (`bloxdTerrainLight` 等) 或同一辅助函数名重复粘贴，会在同一模块内重复定义导致编译失败。多效果并用时，请按钩子种类合并为一个函数。

## R1. 颜色配方 (surface)

### 单色 tint (最基础)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 饱和度提升 / 去饱和

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 变鲜艳 / -1.0 全单色
```

### 色温 (暖色 ⇄ 冷色)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = 暖 (偏红), -1.0 = 冷 (偏蓝)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### 复古 / 棕褐

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### 高度渐变 (低地偏暖)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 高度 0..50 对应 1..0
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 按面朝向分涂 (朝上=亮、墙=暗)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // 地面 1 / 墙 0 / 顶 -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // 墙与顶稍暗
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 色调分离 (减色数)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. 光照配方 (light)

### 对比 S 曲线

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### 距离霾 (自制雾)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 64~192 格叠加 0..0.35 的自制雾
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### 夜晚 (skyLight 驱动偏蓝 + 灯光保护)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
    #endif
    return out;
}
```

### 洞穴压黑 (无 skyLight 处更暗)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    out.colour *= mix(1.0, 0.35, underground * underground);
    #endif
    return out;
}
```

> `skyLight` 为提升后之值 (第 10 章)，浅遮蔽 (树下：原始 0.87 → 提升后 0.97) 用此法几乎压不暗。对洞穴 (原始 0) 有效。「树荫」要明显请用 R9.12 的提升逆变换 + 阈值法。

### 夜晚蓝色环境光 (无月亮方向的拟似表现)

> 本 API 中无太阳的天空 `bloxdSunDirection()` 为零。这不是方向性月光，只是天空暗时极弱的蓝色环境光。月亮方向本身经 `-bloxdSunDirection()` 可得 (仅昼夜循环世界。第七部 R-A)。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let upward = clamp(l.normal.y, 0.0, 1.0);
    out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
    #endif
    return out;
}
```

### 黄昏暖化 (随太阳高度偏色)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 地平线 1 / 正上方 0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### 引擎输出完全替换 (最简单的重光照)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // ※ BloxdLight(...) 直接构造禁止。从 default 出发改写 colour
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // 丢弃 engineColour (引擎光照结果)，换成「材质色 × 自算亮度」
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // 丢弃 engineColour，重打雾必需
    out.colour = col + s.emission * l.fogVisibility;   // emission 自己加 (必需)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. 自发光配方 (emission)

> `emission` 在光照计算后叠加，但默认处理以 **`fogVisibility` 衰减。完全沉雾的远景发光也消失。远景也想发光的成分不要加到 emission，在 light 钩子内以 `out.colour += ...` 直接叠加** (engineColour 已打雾，远景光落在雾色之上)

### 灯光脉动 (火把呼吸)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(bloxdTime() * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### 发光矿石感 (亮材质发光)

```wgsl
// surface 侧：材质越亮 (越白) emission 越强
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### 萤火虫群感 (随时间漂移的光点)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // 数个缓慢移动的「光球」，按距离倒数发光
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. 坐标配方 (世界/方块/视线)

### 世界坐标

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### 方块坐标

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
```

### 棋盘格 (按方块)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 或 1
out.colour *= mix(0.96, 1.04, checker);
```

### 按方块伪随机 (哈希)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// 用途：草色变化、石头色斑等
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### 视线向量与轮廓光

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### 视线角度 (菲涅尔感 —— 液体用)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 正对 1 / 掠角 0
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. 时间配方 (动画)

> `bloxdTime()` 每 3600 秒 (1 小时) 回绕。但这是着色器流逝时间，不保证与游戏内太阳/昼夜同步。视觉周期动画可用，实际夜晚判定优先用 `bloxdSunDirection()` 与光照输入。

### 昼夜循环 (1 小时 1 天)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 的 1 小时周期，不保证与游戏内昼夜同步
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### 摇摆 (多 sin 叠加)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### 流動极光带 / 荧光带

```wgsl
// 以 XZ 位置与时间混合 3 色
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

## R6. 液体配方

### 水面涟漪 (颜色明灭)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid 恒有 BLOXD_ALPHA —— 守卫作习惯保留
    #endif
    return out;
}
```

### 高度伪透明度 (非真正的浅滩判定)

> v1 中场景深度与水底位置无法引用，仅凭本 API 算不出真实水深。v2 中经液体限定的 `bloxdOpaqueBehind()` 可测得至后方不透明面的厚度 ([第八部分](08-apiv2.md) R-E)。以下为不使用它的旧式拟似演出：`s.position.y` 是局部坐标，直接用会随区块原点漂移。以下仅按世界高度改变 alpha 的拟似演出，非沿岸线/水底的浅滩表现。`packWaterReferenceY` 请按世界高度调整。

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // 低处更透、高处接近原 alpha，方向请在游戏中确认
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### 水下浑浊感

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### 纯液体包 (地形无损构成)

```wgsl
// 完全不写 terrain_* 钩子。于是：
//  - 地形变体 = 无钩子 = 引擎默认原样
//  - 液体变体 = 仅 liquid_* 钩子生效
```

## R7. 顶点配方 (仅 allow)

> 全部用 `#ifndef BLOXD_STRICT` 包裹。
> 关于执行条件 (allow 标题一览; Custom Games 为 strict) 的细节参见本篇 §30 → [§30 每个游戏的适用模式](07-internals.md#30-每个游戏的适用模式-shaderpackpolicy)

### 草随风摆 (只动上端)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // 仅垂直面
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### 液面波 (仅上表面)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdTime() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdTime() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### 脉动地形

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // 沿法线轻微胀缩
    return out;
}
#endif
```

### 波浪地形 (巨大 sin 波)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdTime() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdTime() * 0.7) * 0.3;
    return out;
}
#endif
```

## R8. 数学小技巧

```wgsl
// 0..1 平滑分级 (n 级)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 二级阈值 (卡通阴影)
let shadow = smoothstep(0.35, 0.37, level);   // 阈值 ±0.02 形成台阶

// 三级卡通
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// 亮度 (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// 平滑脉冲
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// 三角波 (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// 秒 → 「缓慢相位」换算 (无视 3600 秒回绕的演出用)
let phase = t * 0.15;
```

## R9. 写实系配方

> 「把原版外观从材质重新组装」的物理系配方集。前提：
>
> 1. **light 钩子在片元最后阶段调用**。返回的 colour 原样成为最终颜色。**必须自行重打雾** (R9.10)  
> 2. **引擎默认光照只有乘法**。高光 / 菲涅尔 / 暖冷分离 / 半球环境光都要从零制作  
> 3. `l.engineColour` 是完成色 (已打雾)。丢弃改从 `s.colour` (反照率) 重建才是正统  
> 4. 纹理禁止 → 细节必须全部**程序化** (哈希/噪声) 打入 (R9.8)

### R9.1 暖色火把 × 冷色空光

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // 中间 clamp
    col = mix(l.fogColour, col, l.fogVisibility);                    // 重打雾
    out.colour = col + s.emission * l.fogVisibility;                 // emission 重加
    #endif
    return out;
}
```

### R9.2 太阳高光 (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);          // 半向量
        let ndh = max(dot(n, h), 0.0);
        let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
        let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
        out.colour += spec * vec3f(1.0, 0.97, 0.90);
    }
    #endif
    return out;
}
```

### R9.3 Schlick 菲涅尔

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // 边缘微亮
    #endif
    return out;
}
```

### R9.4 半球环境光 (上=天空 / 下=地面反弹)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // 下：反弹
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // 上：空光
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // 中间 clamp
    col = mix(l.fogColour, col, l.fogVisibility);                           // 重打雾
    out.colour = col + s.emission * l.fogVisibility;                        // emission 重加
    #endif
    return out;
}
```

### R9.5 ACES 胶片化 (Narkowicz 近似)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = 曝光
    return out;
}
```

### R9.6 大气透视 (随距离降饱和的「空气感」)

> 与雾 (颜色替换) 不同，再叠「随距离去饱和」会让远景真实得多。  
> 注意：只降饱和度，不动亮度。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // 衰减 (100 格约 30% / 400 格约 75%)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // 只降饱和 (亮度不变)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 波法线 + 太阳闪光 (水面「太阳之路」)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // 高度 h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // ∂h/∂x
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // ∂h/∂z
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = bloxdWorldPosition(l.position);
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdTime()), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);
        let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
        out.colour += glint * vec3f(1.0);
    }
    #endif
    return out;
}
```

### R9.8 程序化微凹凸 (纹理禁止的绕行法)

```wgsl
fn pack_hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}
fn pack_bumpNormal(p: vec3f, n: vec3f, strength: f32) -> vec3f {
    let e = 0.15;
    let h0 = pack_hash(p);
    let hx = pack_hash(p + vec3f(e, 0.0, 0.0));
    let hz = pack_hash(p + vec3f(0.0, 0.0, e));
    let tangentX = normalize(cross(vec3f(0.0, 1.0, 0.0), n) + vec3f(0.0001, 0.0, 0.0));
    let tangentZ = normalize(cross(n, tangentX));
    return normalize(n + tangentX * (hx - h0) * strength + tangentZ * (hz - h0) * strength);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // 方块内局部坐标
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lam = clamp(dot(n, sunDir), 0.0, 1.0);
        let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
        out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
    }
    #endif
    return out;
}
```

### R9.9 洞穴非线性压黑 + 灯光保护

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let keep = 0.12 + 0.88 * blockInt;          // 有灯处抬起
    out.colour *= mix(keep, 1.0, sky * sky);     // 非线性 (平方) 压暗
    #endif
    return out;
}
```

### R9.10 重打雾 (丢弃 engineColour 时必需)

> `l.fogVisibility` 加 `max(l.fogVisibility, 0.25)` 式下限可实现「不再更浓」  
> (0.0 = 引擎一致 / 0.3–0.5 = 远景更透)。
> 注意引擎雾为地平线专用线性雾 (仅绘制距离附近)，中距离霾需包内自制。
> 实际雾设置 (实现已对照)：linear 固定 / `fogStart` = 绘制区块距离 / `fogEnd` = +1 区块 / 雾关闭时 100–101 区块实际无效 / 默认色 RGB(183, 191, 195)。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // 雾重现 (0.15=偏薄下限)
    col += s.emission * l.fogVisibility;            // emission 同样打雾
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 电影级 (阴影偏冷 / 高光偏暖 / 夜晚去饱和)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;  // 仅太阳方向为零时算夜，不表现暮色渐变
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 投影风阴影 —— 提升逆变换 + 阈值切割 (决定版)

> **前提复核 (第 10 章)**：`l.skyLight` 不是体素原始值 (n/15)，而是引擎「提升曲线」  
> `y = 1-(1-x/(3-2x))³` (提亮暗部的 S 曲线) 之后的值。
>
> | 位置 | 体素原始 | 提升后 (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | 开阔天空 | 1.00 | 1.00 | 1.00 |  
> | 树下 (半径2) | 0.87 | **0.97** | **0.86** ← 几乎无伤 |  
> | 半径3 | 0.80 | **0.92** | 0.66 |  
> | 半径5 | 0.67 | 0.78 | 0.29 |
>
> **这就是「加伽马也压不黑阴影」的真因** (数值证明)。但曲线单调，可代数严格逆变换：  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`。恢复原始值后，只需阈值切割 (`smoothstep`) 二值化。  
> LightEngine 的 BFS 横向扩散为「相邻 1 格 = -1」，阈值 `th = 1 - r/15` 直接成为  
> 「r 格以上遮蔽视为阴影」的旋钮。破坏方块阴影即刻移动 (LightEngine 实时重算)。  
> 限制：阴影以「上方天空」为基准，不随太阳旋转 (第 15 章「阴影的真相」)。

```wgsl
// 严格逆变换引擎提升，恢复体素原始 skyLight (n/15)
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // WGSL 无 cbrt，用 pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // 阴影半径旋钮：th = 1 - r/15 (0.87=半径2以上为影)
const shSoft = 0.04;   // 边缘柔度 (0.02=硬 / 0.08=软)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. 恢复原始值 (跳过则永无阴影)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. 阈值切割 —— 向阳=1 / 阴影=0 确实分离
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // 太阳 Lambert (无太阳时回退 l.directional)
    let sunLen = length(bloxdSunDirection());
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                      sunLen > 0.5);
    // 投影的正体：直射太阳只到达看得见天空之处
    let lit = sunL * sky;
    // 阴影侧：染天空蓝而非黑 + 最低环境光
    let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
    var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
    // 火把光穿透阴影 (blockLight 同样被提升，一并恢复)
    let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                         sh_unlift(l.blockLight.g),
                         sh_unlift(l.blockLight.b));
    let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
    col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
    // 重打雾 (丢弃 engineColour 的份)
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // emission 别忘了 (打雾后叠加)
    #endif
    return out;
}
```

> 调整指南：**阴影面积只由 `shTh` 决定** —— `0.93`=半径1.5以上 / `0.87`=半径2 / `0.80`=半径3 / `0.67`=半径5。  
> 边缘硬度为 `shSoft` (0.02=硬 / 0.08=软)。影芯暗度由 `0.09` (最低环境光) 与 `0.16` (天空散射光)  
> 的两点偏移决定。黄昏想扩大阴影请加  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (长暮影近似。  
> `sunDir` 为 `bloxdSunDirection() / length(bloxdSunDirection())`)。阴影偏蓝请调高 `vec3f(0.72, 0.82, 1.05)` 的 B。

[← 上一部分](02-api.md)·[返回手册](README.md)·[下一部分 →](04-realism.md)

[← 上一部分](03-recipes.md)·[返回手册](README.md)·[下一部分 →](05-troubleshooting.md)

# 第四部分: 写实化指南

> 现行游戏自 2026-10-26 起要求 `apiVersion: 4`，加载时会拒绝 v1/v2/v3 包 —— 以下内容按 v2 规范撰写。分发前请查阅 [第九部分](09-apiv3.md) 与 [第十部分](10-apiv4.md) 以便迁移。

## 13. 引擎默认光照与写实余地

引擎默认光照只有「乘法」，不存在高光、菲涅尔、暖冷分离、半球环境光。以下为可重建范围：

| 功能 | 默认 | 包可否实现? |
|---|---|---|
| 漫反射 (Lambert) | 仅方向光标量总和 | ◎ 用 `bloxdSunDirection()` 自行实现 (包裹光源等) |
| 高光 (镜面反射) | 皆无 | ◎ Blinn-Phong (R9.2) |
| 菲涅尔 | 皆无 | ◎ Schlick 近似 (R9.3) |
| 暖色火把 / 冷色空光分离 | 无色 | ◎ (R9.1) |
| 半球环境光 | 无方向 | ◎ 上=天空色 / 下=地面反弹 (R9.4) |
| 色调映射 | 无 (仅 clamp) | ◎ ACES 胶片化 (R9.5) |
| 大气透视 | 仅雾 (颜色替换) | ◎ 距离去饱和 (R9.6) |
| 表面细节 | 仅纹理解析度 | △ 哈希噪声程序化微凹凸 (R9.8) |
| 顶点波 (水面) | 皆无 (平面) | ◎ 仅 allow (R7) |
| 波法线 / 太阳闪光 | 皆无 | ◎ (R9.7) |
| 夜晚月光处理 | 仅空色变暗 | △ 月亮方向在 `-bloxdSunDirection()`：拟似表现 (R2 蓝色环境光 / R9.11) 加方向性月光 (R-A，仅昼夜循环) |
| 阴影 (天空遮蔽) | 仅 `mix(环境色, 空色, skyLight)` 轻混 | ◎ 提升逆变换 + 阈值切割 + 太阳门控 (R9.12)。树荫、屋檐下明确压暗，方块编辑实时跟随 |

## 14. 写实化的实现流派 —— 两种

**流派 A：加算修正 (defaultLight 起点)** —— 以 `engineColour` (完成色) 为底，叠加暖色辉光或轮廓光。轻便安全，但光照模型仍是默认。

**流派 B：完全重光照 (s.colour 起点)** —— 丢弃 `l.engineColour`，从 `s.colour` (反照率) 与 LightIn 原生素材重组光照。写实化的正统。遵守 4 点：

1. **重打雾**：light 钩子在雾之后调用，请自行施加 `mix(l.fogColour, col, l.fogVisibility)` (R9.10)。雾太浓时用 `max(l.fogVisibility, 0.3)` 设下限。反之在 engineColour 起点的包上再混雾色会导致双重雾发白
2. **无光照变体回退**：`#ifdef BLOXD_LIGHTING` 之外直接返回 `defaultLight`
3. **共用函数整体守卫**：以 `BloxdLightIn` 为参数的共用函数须整个 fn 用 `#ifdef BLOXD_LIGHTING` 包裹 (仅守卫调用处不够)
4. **无太阳方向时**：`bloxdSunDirection()` 为零则不计算方向性高光。`l.directional` 是光量标量而非方向向量，无法恢复高光方向。必要时切换为无方向弱环境光。月亮方向经 `-bloxdSunDirection()` 可得 (只在昼夜循环世界移动。第七部 R-A)

## 15. 达不到的表现 (写实化的「天花板」)

| 表现 | 原因 |
|---|---|
| 阴影贴图 (随太阳旋转的影、半影) | 深度纹理不可引用 (液体限定的 `bloxdOpaqueBehind()` 仅为几何信息，不能用作阴影贴图)。光线遮蔽判定也不输入钩子 |
| SSAO | 无法访问场景深度 (仅网格烘焙的顶点 AO。液体限定的深度不能用于 SSAO) |
| SSR (反射) | 场景色取不到。仅以菲涅尔混空色的拟似 |
| 泛光 / 眩光 | 无挂钩后处理的钩子 |
| 景深、色散、颗粒 | 需要全屏后处理 |
| 体积光 (上帝光) | 同上 |
| PBR 纹理 | 纹理采样禁止。仅从颜色亮度拟似推定 |
| 水下折射 | 场景色取不到。液体限定的深度 (`bloxdOpaqueBehind()`) 可做厚度吸收与底面投影 ([第八部分](08-apiv2.md) R-E) |
| 水下幕 (蓝色) 去除与变更 | 幕为「相机所在液体方块定义 color/alpha」生成的 emissive 全屏 quad，在钩子管线之外 (最前面) 绘制，包改不了颜色也改不了浓度 |
| 水下直接检测 | 无表示相机入水的字段，水下 fogStart / fogEnd / fogColour 不变，因此也没有从 fogVisibility 等推定的可靠方法 |

### 阴影的真相 —— 「树影」做得出来

上表中不可能的只是**随太阳旋转的像素级阴影贴图**。引擎从一开始就在算「影」，那就是 `skyLight`。网格侧 LightEngine 运行类 Minecraft 算法：

1. **纵列扫描**：每 (x,z) 列自上而下扫描。天空来光从 15 开始，**不透明方块处归 0**，以降按 `lightFilter` (空气 1 / 水 3 / 不透明 15) 衰减下降
2. **BFS 泛洪**：向 6 邻横向扩散 (每格 -1) —— 这正是影缘变软的正体。半径 r 遮蔽物下的原始值为 (15-r)/15
3. blockLight (火把等) 为 RGB 3 通道 (4bit 打包) 的另一路 BFS

于是 `l.skyLight` 不是单纯的亮度参数，而是**「该处能否看见天空」的体素分辨率遮蔽数据 = 阴影贴图**。树下、屋檐下、室内数值本已偏低，经顶点插值平滑到达。放置/破坏方块即刻重算 = **实时跟随的阴影**。原版仅以 `mix(环境色, 空色, skyLight)` 「轻混」使用。

正确的工具是 R9.12 的两步 (**提升逆变换恢复原始值 → 阈值 `smoothstep` 二值化**。`th = 1 - r/15` 直接拨定「视为阴影的遮蔽半径」) 加上**太阳直射光以 sky 门控** (太阳只到达看得见天空之处 = 投影的正体)，再以向阳=暖色 / 阴影=冷色染色构成。

**如实声明限制**：该阴影以「上方天空」为基准，**不随太阳移动旋转**。分辨率为方块级 (柔边来自 BFS 扩散)。引擎光照模板仍残留闭合的 `var shadow: f32 = 1.;` 阴影贴图桩 (恒为 1.0 = 无效)，可解读为「计划中的像素级旋转阴影」痕迹。若非要像素级旋转阴影，只剩 API 之外路线 (如 userscript GLSL 注入，有规则风险)。

### 水中的正体

水中的外观由 3 层构成：

| 层 | 内容 | 包可否操作? |
|---|---|---|
| ① 地形/液体绘制 | 钩子可加工。light 钩子在水下也照常调用 | 可 (在幕之下生效) |
| ② 液体定义色幕 | 相机所在液体方块定义 color/alpha 的 emissive 全屏 quad，绘制在最前面。游戏设置 `cameraTint` 有则优先 | 不可 (颜色浓度都改不了) |
| ③ cameraTint | 游戏设置 | 不可 |

实用要点：包在水下也继续工作 / 幕去不掉 / 水下不可分支 (fogStart / fogEnd / fogColour 在水下不变，fogVisibility 也检测不到)。

## 16. 调试技巧

- 洞穴过亮 → `skyLight` 非线性曲线不足 (R2 洞穴配方 / R9.9)
- 白天过曝 → 降低 ACES 前曝光
- 夜晚黑到看不见 → 确保最低环境光 (夜晚 `skyLightColour` 按前提近乎全黑)
- 远景霾太重 → 调低大气系数
- 火把周围一片橙 → 调低暖色混合比 (保留部分原始染色光)
- 方块几乎全白 → light 钩子输出合计超 1.0 (下游无 clamp)。末尾加 `clamp(col, vec3f(0.0), vec3f(1.0))`
- 无叠加却发白 → fogVisibility 除法 un-fog 逆算所致。去掉 un-fog，改从 `s.colour` 起重建、雾最后一次性 `mix`
- 发光方块不亮 → 重建系漏加 emission。补 `+ s.emission * l.fogVisibility`
- 夜晚只剩受光面偏亮 → 别只压暗阴影，对完成色 (`engineColour`) 整体施加夜间衰减。保留局部灯光时用 `blockLight` / `heldLight` 减弱衰减 ([第六部分](06-implementation.md) 19 节)
- `pow(skyLight, γ)` 怎么也压不黑影 → `l.skyLight` 为提升后之值 (第 10 章)。切换 R9.12 逆变换 + 阈值切割
- 想调阴影面积/浓度 → 看 R9.12 调整指南 (面积=阈值 `shTh` / 边缘=`shSoft` / 影芯暗度=最低环境光与天空散射光的两点偏移)

[← 上一部分](03-recipes.md)·[返回手册](README.md)·[下一部分 →](05-troubleshooting.md)

[← 上一部分](04-realism.md)·[返回手册](README.md)·[下一部分 →](06-implementation.md)

# 第五部分: 故障排除与注意事项

> 现行游戏自 2026-10-26 起要求 `apiVersion: 4`，加载时会拒绝 v1/v2/v3 包 —— 以下内容按 v2 规范撰写。分发前请查阅 [第九部分](09-apiv3.md) 与 [第十部分](10-apiv4.md) 以便迁移。

## 17. 常见错误与修复

| 症状 | 修复 |
|---|---|
| 严格游戏加载不了 | vertex 钩子用 `#ifndef BLOXD_STRICT` 包裹 |
| `.alpha` 报未定义 | 用 `#ifdef BLOXD_ALPHA` 包裹 |
| `blockLight` 报未定义 | 用 `#ifdef BLOXD_LIGHTING` 包裹。共用辅助函数须**整个函数**包裹 (v2 字段常驻，通常不会发生。判定用守卫保留) |
| `Packs can't construct BloxdSurface directly` | 改从 `bloxdDefaultSurface(s)` 出发 |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | 用 `#ifndef BLOXD_STRICT` 包裹 |
| 远景发白浑浊 | 多为双重雾。完成色已打雾，自制雾须克制，优先只降饱和 |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | 警告：在发光体密集区域或跨区域边界处光照种子队列溢出，该区块的光照计算被截断。非包所致，但**发光体聚集周围的光照空洞来自此规格**——将光源分散到世界各处即可避免 |
| 进游戏时包被剔除 | 游戏开始时的实机检查失败。复查守卫遗漏 |
| 实机检查永不结束，包以 `This device couldn't check …` 等脱落 | 检查有 60 秒强制期限 (超时计为 `skipped`)。在弱设备 / 重负载世界常见——减轻沉重的顶点运算与复杂循环后重试 |
| `pack.json needs "apiVersion": 3.` | `apiVersion` 缺失或不是 `3`。填数字 `3` (字符串 `"3"` 不可)。v1/v2 包会被 `shaderPack:loadWrongApiVersion` 拒绝 |
| `There's no pack.json at the top of the pack.` | ZIP 根无 `pack.json`。检查是否把文件夹整个打包了 |
| `bloxdTerrainVertex must be declared as: fn ...` | 签名不符。按所示声明原样重写 |
| `bloxdTerrainVertex can't run in strict games...` | vertex 钩子用 `#ifndef BLOXD_STRICT` 包裹 |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | 用 `#ifdef BLOXD_LIGHTING` 包裹 (v2 字段常驻，通常不会发生) |
| `pow(l.skyLight, γ)` 加再大影也不浓 | `skyLight` 为提升曲线之后的值 (原始 0.87 以 0.97 到达)。切换 R9.12 提升逆变换 + 阈值切割 (第 10 章) |
| `... can only be a function's parameter or return type, ...` | 未初始化的 `var x: BloxdSurface;` 会被拒。从 `bloxdDefault*` 造起 |
| `bloxdPackInputs isn't part of the bloxd_ header` | PackInputs uniform 包不可直接引用。经 `bloxdTime()` 等标头函数使用 |
| `Packs can't declare bloxd_ names...` | 去掉自定标识符的 `bloxd_` 前缀。只许定义 6 个钩子名 |
| `loadDuplicateManifest` (zip 加载时) | `pack.json` 有 2 个 (含大小写变体)。留 1 个 |
| 「needs the new WebGPU renderer, so remove the renderer override...」 | 去掉 URL 参数 `?renderer=` 与 localStorage 的 `bloxdRenderer` 后重新加载 ([第七部分](07-internals.md) §29) |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | 改从 `bloxdDefaultSurface(s)` 等出发。从 light 钩子第 1 参数的拷贝 (`var out = s;`) 起步亦可 |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` 不可。写成 `_ = f();` |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | 地形钩子内的 `bloxdOpaqueBehind()` 调用以 `#ifdef BLOXD_SCENE_DEPTH` 包裹 |
| `...only surface and light hooks can use.` | 删除 vertex 钩子内的 `bloxdOpaqueBehind()` (仅 surface / light 可用) |
| `Lite: …reads scene depth on a page that didn't turn it on` | 重新加载页面，并在启用读取深度的包 ([第八部分](08-apiv2.md) §35) 的状态下重新打开。深度纹理的可用性在页面生成时固定 |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | 非报错，而是 strict 游戏中的自动禁用 (`shaderPack:offInStrict`)。vertex 钩子与 `discard` 以 `#ifndef BLOXD_STRICT` 包裹 |
| `mixing '*' and '^' requires parenthesis (only in ...)` | 第 2 阶段 (浏览器 Tint) 的错误。`^` `&` `\|` `<<` `>>` 的操作数加括号 (§38) |

### 加载阶段的错误 ID

设置画面的错误带 `shaderPack:load*` ID。作为消息查找的备忘：

| ID | 含义 |
|---|---|
| `loadZipTooBig` | zip 超过 32MB |
| `loadTooManyZipEntries` | 条目超过 1024 个 |
| `loadTooManyWgsl` | `.wgsl` 超过 256 个 |
| `loadSourceTooBig` | 总量超过 256KB (流式检查、逐文件) |
| `loadManifestTooBig` | `pack.json` 超过 64KB |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` 非 JSON / 非对象 |
| `loadNoApiVersion` / `loadWrongApiVersion` | 无 `apiVersion` / 不为 `3` (v1/v2 包被拒绝) |
| `loadNoName` / `loadAuthorNotString` | 无 `name` / `author` 非字符串 |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | 不支持的压缩 / zip64 / 分卷 / 加密 |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | 重复路径 / 非 UTF-8 / 解压失败 / zip 损坏 |

`loadNoManifest` / `loadDuplicateManifest` (pack.json 位置 / 重复) — 见上表对应行。

## 18. 权利与注意事项

- 着色器包功能本身是游戏内 UI 可加载的官方功能，制作包可视为预期行为。但未确认有公开官方文档
- 包为纯 WGSL，JS 执行与网络访问设计上不可能
- 本书为非官方指南，非开发者的官方立场。API 可能随时变更

[← 上一部分](04-realism.md)·[返回手册](README.md)·[下一部分 →](06-implementation.md)

[← 上一部分](05-troubleshooting.md)·[返回手册](README.md)·[下一部分 →](07-internals.md)

# 第六部分: 重要的实现补充

> 现行游戏自 2026-10-26 起要求 `apiVersion: 4`，加载时会拒绝 v1/v2/v3 包 —— 以下内容按 v2 规范撰写。分发前请查阅 [第九部分](09-apiv3.md) 与 [第十部分](10-apiv4.md) 以便迁移。

## 19. 修复夜间「影黑了面却亮」

只压暗阴影，太阳缺席时引擎完成色 (`engineColour`) 依然偏亮，面影落差会显得不自然。应对完成色整体施加衰减。

下例以 `bloxdSunDirection()` 为零判夜、有方向判昼，对夜间地形完成色衰减。`blockLight` 与 `heldLight` 强处减弱衰减，尽量保留火把等近光。`0.52` 为可调值，想更暗请调小。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    #ifdef BLOXD_LIGHTING
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
    let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
    let protectLocalLight = smoothstep(0.03, 0.35, localLight);
    scale = mix(nightDim, 1.0, protectLocalLight);
    #endif
    // 完成色衰减，材质 emission 按默认经雾叠加
    out.colour = l.engineColour * scale + s.emission * l.fogVisibility;
    return out;
}
```

**该处理的局限：** 若 `bloxdSunDirection()` 为「有太阳=单位方向、无=零」二值，可分昼夜但无法连续推定黄昏薄明。且因衰减完成色，会把引擎昼光与环境光一并削弱，并非完整的时间带再现。液体同样处理时请确认液体钩子的回退关系。

## 20. 让水自然的水体统合配方

本 API 采样不到场景色，因此**是以菲涅尔风颜色混合与太阳高光的拟似表现，而非真实的反射/折射** (水深计算在 v2 中经 `bloxdOpaqueBehind()` 已可能实现，分离至[第八部分](08-apiv2.md) R-E)。下例保留基色，掠角混入近空色，仅有太阳时加小闪光。

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = bloxdWorldPosition(l.position);
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdTime()), topness));
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let halfDir = normalize(viewDir + sunDir);
        let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
        out.colour += vec3f(1.0, 0.97, 0.90) * glint;
    }
    #endif
    return out;
}
```

调整参考：

- 水发白/过亮：调低 `fresnel * 0.38` 的 `0.38` 与闪光的 `0.55`。
- 水过浓：稍调高 `fakeSkyReflection` 混合比。但过高会像塑料。
- 水面出现线条或规则条纹：调低波频率与闪光强度。本代码没有水面网格顶点位移。
- 想要真实映景：本 API 输入没有屏幕色，只混色成不了真反射 (深度为液体限定可取。[第八部分](08-apiv2.md) R-E)。

该配方**替换**既有 `bloxdLiquidLight`。勿与 R9.7 同名波法线函数或其他同名钩子重复粘贴。

## 21. 实机测试清单

编译成功与「好看」是两回事。请按顺序确认：

1. **加载：** `pack.json` 位于 ZIP 根目录。选中后立即显示 `Ready. Reload the page to use it.`，包在**页面重新加载后**激活；随后确认 `Ready to use`。已保存的包会在下次页面加载时自动重验证：每当引擎侧规格标头更新时，都会对标头内容做指纹检查 (通过 = 原样保留 / 失败 = 显示为已阻止)，损坏的旧包绝不会静默保持激活。
2. **8 变体：** strict / allow、光照开 / 关、地形 / 液体各条件无类型守卫遗漏。即使游戏只用部分条件，分发包也要按 8 种设想。
3. **白天：** 草、石、沙、木等材质颜色无溢出，顶面与侧面明暗过渡自然。
4. **夜晚：** 对比曾受光处的同材质、阴影、火把附近。仅受光面残亮则调曝光衰减，整体过暗则调局部光保护。
5. **水：** 俯视、掠角、岸边、水下、夜晚分别查看。alpha 行为与水下观感依赖游戏合成方式，勿凭单一视角判断。水下液体定义色幕按[第七部分](07-internals.md)所述罩在前面，包的差异主要看水面与幕透出的地形。
6. **边界与远景：** 区块/原点切换处波形花纹无跳变，远景无双重雾与白色霾。
7. **性能：** 逐片元哈希/三角/`pow` 重效果取最小。逐步加细节并对比 FPS。

### 已知约束为前提

- 包限于地形/液体钩子，同一代码不处理天空、实体与 UI。
- 无添加阴影贴图、屏幕空间反射、折射、泛光等的输入 (场景深度为液体限定以 `bloxdOpaqueBehind()` 解禁。见[第八部分](08-apiv2.md))。
- `bloxdTime()` 为动画时间，不保证关联游戏内昼夜。
- `bloxdSunDirection()` 为零则真月亮方向未知，是氛围近似而非「月光物理」。方向性月光经 `-bloxdSunDirection()` 制作 (仅昼夜循环世界。第七部 R-A)。
- `s.position` / `l.position` 为局部坐标，世界相关效果请加 `bloxdOriginOffset()`。方块内局部花纹则有意用局部坐标。

## 22. 着色器到极限时的组合

着色器包不能添加或采样纹理，材质细微凹凸与天空图像不要只靠着色器解决。Bloxd.io 公开纹理包仓库 [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) 以另一方式处理纹理、天空盒、模型等。

参考：社区流传的「cinematic shader」发行物经分析实为纹理包 (128x128 纹理，不含 `pack.json` / `.wgsl`)。

现实做法是，**光照与颜色用着色器调，材质与天空用配套资源包补**。但并用可行性与加载顺序请按游戏实现与设置确认。

纹理包有独立规格 (供参考)：大小上限为 25MB，按 base64 编码后 JSON 字符串的长度计算；PNG 经 base64 编码膨胀 +33%，因此原始图片的实际上限约为 18–19MB。CSS 由简单正则解析器处理——避免嵌套与注释。

## 23. 水中与着色器包的实情

水中的外观由 3 层构成：

| 层 | 内容 | 包可否操作? |
|---|---|---|
| ① 地形/液体绘制 | 钩子可加工。light 钩子在水下也照常调用 | 可 (在幕之下生效) |
| ② 液体定义色幕 | 相机所在液体方块定义 color/alpha 的 emissive 全屏 quad，绘制在最前面。游戏设置 `cameraTint` 有则优先 | 不可 (颜色浓度都改不了) |
| ③ cameraTint | 游戏设置 | 不可 |

实用要点：包在水下也继续工作 / 幕去不掉 / 水下不可分支 (fogStart / fogEnd / fogColour 在水下不变，fogVisibility 也检测不到)。

[← 上一部分](05-troubleshooting.md)·[返回手册](README.md)·[下一部分 →](07-internals.md)

[← 上一部分](06-implementation.md)·[返回手册](README.md)·[下一部分 →](08-apiv2.md)

# 第七部分: 内部规格的补充

> 现行游戏自 2026-10-26 起要求 `apiVersion: 4`，加载时会拒绝 v1/v2/v3 包 —— 以下内容按 v2 规范撰写。分发前请查阅 [第九部分](09-apiv3.md) 与 [第十部分](10-apiv4.md) 以便迁移。

引擎实现解析发现的追加规格。全部由现行正式构建的 JavaScript 直接复原。

## 24. 太阳与月亮的正体

`bloxdSunDirection()` 之源是仅在天空盒种类变化时改写的天空方向缓冲，判定基准不是「天空有无太阳」而是**「天空盒是否为 earth 型」**。

| 天空盒 | `bloxdSunDirection()` |
|---|---|
| `default` (程序天空) | 非零 (默认值见下) |
| `gloomy` / `interstellar` / `space_*` (立方体纹理) | **恒为 (0,0,0)** |

**月亮恒为 `-bloxdSunDirection()`** (引擎将月亮位置算作太阳的严格反方向)。夜晚按太阳高度判定——`bloxdSunDirection().y < 0` (太阳在地平线下) 时月亮在上。但默认世界太阳静止，月亮也静止，只有实现昼夜循环的世界才看得到月动。

默认世界太阳方向约为 `(-0.56, 0.81, -0.18)` (由 inclination = −0.2 / azimuth = 0.55 算出的单位向量，静止)。测试分发包时可在纸面预测高光方向的实用基准值。

昼夜循环并未内置于引擎——inclination 是静态数值，有昼夜移动的世界由游戏侧更新。每次更新 `bloxdSunDirection()` 也改写跟随。

地形方向光仅为场景启动时生成的 2 盏，**方向强度固定，昼夜不变**。总之**决定地形亮度的要素都不随时间，昼夜「观感」只来自天空盒与 bloxdSunDirection()**，夜间想压暗地形的包只能自行由 bloxdSunDirection() 推定时间带 (§19 的 `sunPresent` 手法)。

### R-A. 方向性月光 — moonDir = −bloxdSunDirection()

仅月亮在上时叠加青白色 Lambert 与弱高光。`moonUp` 在默认静止太阳世界为 0，那里什么都不发生——**只在昼夜循环世界触发的安全月光**。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 月亮恒为太阳严格反方向；白天经 moonDir.y < 0 自动熄灭
    let moonDir = -bloxdSunDirection();
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(bloxdEyePosition() - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. 雾的内部规格

雾计算恒为 LINEAR 模式 (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`，clamp 0..1)，`fogStart = 32 × D`，`fogEnd = 32 × (D + 1)` (D = 雾距离设置；仅 D = 0 特例 fogEnd = 5)。**雾渐变带仅 32 格宽**，`l.fogVisibility` 与其说是「距离雾」，不如说是**到已加载世界边缘的归一化距离**指标。随玩家加载距离变化，距离系演出应自行计算 `distance(l.position, bloxdEyePosition())` (配方 R-B)。(v3 注记: 渲染器的雾函数实际实现了 **off / exponential / exponential-squared / linear 四种模式**，正式发布的游戏驱动的是 linear；复原源码与稳健性讨论见[第九部分](09-apiv3.md) §50。)

默认雾色 `rgb(183, 191, 195)` (淡青灰)。世界作者经 `fogColourOverride` (hex) 变更。雾模式 0 (NONE) 时 **fogColour 以黑到达**。标准形 `mix(l.fogColour, col, l.fogVisibility)` 安全，因为 fogVisibility 为 1 时不用雾色。脚本 API 还提供两个选项：`fogChunkDistanceOverride` 与 `fogOnSkybox`——Custom Game 可分别独立调整雾距 (D 值) 与雾对天空盒的应用。默认天空盒不受雾影响 (只有开启 `fogOnSkybox` 的游戏会让天空盒也染上雾色)。

玩家侧 `showFog` 关则雾推至 3200–3232 格，实际无效 (`fogVisibility ≈ 1` 持续返回)。

### R-B. 加载边界带 — fogVisibility 作「世界边缘」用

仅 32 格加载边界带悄悄染冷色，淡化世界尽头 (或作为演出强调)。不自行算距离，自动跟随玩家加载距离设置是优点。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = 内侧 (到边界有余裕), 0 = 即将出边界
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. blockLight / heldLight 内部构造

`blockLight` 是**三通道 RGB 彩色光**。各发光方块定义有发射色 `[R, G, B]` (各 0–15)，该色原样成为光色 (普通火把 = 暖白 (14,14,12) / 岩浆 = 橙 (14,8,2) / 信标 = 青 (5,14,14) / 白色火把 = (15,15,15) 等)。到顶点阶段时，它以 4 nibble——r / g / b / sky——打包进一个 float 属性到达。在 light 钩子内分通道处理，即可实现彩色局部照明——暖色火把配方 (R9.1) 正是以该行为为基准校准的。

解码 `aPackedLightLevels` 时，引擎给每通道铺 **RGB 最亮通道 35% 的下限「35% 通道地板」**。如「纯红光源」在顶点先抬为 (1.00, 0.35, 0) 再经插值·提升。火把橙在游戏中显「白粉而非红」正缘于此，暖色火把配方 (R9.1) 饱和度以此默认行为为基准调整为好。

光照合成不是加法。内部上，引擎取方块光 (经 35% 通道地板后) 与按 `mix(环境色, 天空色, skyLight)` 构成的天空光的**最大值**，再与手持光 (经环境光助推后) 取 max。该合成中的通道值是**提升后**的值——引擎从与到达钩子输入相同的提升后光照等级 (`terrainLightLevels`，经提升曲线后) 合成，v2 与 v3 均如此。因此 `blockLight` 与 `skyLight` 不会相互抵消——较暗一侧的贡献被直接丢弃——削弱天空光也几乎压不暗由方块光主导的地方。请围绕此结构设计曝光/衰减配方 ([第六部分](06-implementation.md) §19 的局部光保护正为此补偿)。

手持光 (`heldLight`) 范围由最亮光色通道定 (最大 15 格)，经 `dist^0.75` 预处理，同 35% 通道地板，`l.heldLight` 为环境光助推**前**之值。圆锥衰减从引擎光照模块复原如下: 光束的角度衰减为 `1 − 0.5 × (smoothstep(0.12, 0.65, t) + smoothstep(0.62, 0.95, t))`，其中 `t` 是距圆锥轴线的归一化角度 (0 = 中心，1 = 边缘)；射程为 `(rangeOverride > 0 ? rangeOverride : 最亮通道) × 圆锥衰减`，`rangeOverride` 取自手持光颜色的 alpha；射程内，覆盖值按 `(range − dist) / range` 衰减，而默认路径按通道减去 (预处理后的) 距离；随后是 35% 通道地板、除以 15、提升曲线，最后是环境光助推。自定义物品可设 `spotlightRange` (射程) 与圆锥角——「持握时出光束」模式，其圆锥跟随相机。包无法得知光束方向。

自定义方块可带 `skyLightEmission` (0–15)，**向 skyLight 通道本身注入，与 blockLight BFS 分开**。R9.12 式以 skyLight 阈值判向阳/阴影的包，在人工光源抬高 skyLight 的世界会误判。分发包与 blockLight 组合判定更稳健。

## 27. 管线细节

- **surface 钩子在 alphaTest 「之前」跑**：`out.alpha` 直接喂给丢弃判定。镂空材质 (草、叶) 可做溶解式抖动特效 (配方 R-C)。液体 (混合) 中 `out.alpha` 为真实透明度 (配方 R-D)。通常不透明地形无效果——勿误解
- **`l.ambient` 内容**为 `material.ambient × sceneAmbient`，按材质各异。场景侧直连图形设置「Ambient Lighting Intensity」(默认 0.5)，切勿写死默认值
- **场景的方向光为 2 灯组合**：主光 (方向来自天空设置中的太阳位置，强度 1.0) 与补光 (方向 `[-0.5, -1, -1]`，强度 0.35) 的 Lambert 之和到达 `l.directional`。补光朝下，因此对朝上的面没有贡献，而会照到朝下的表面 (洞穴顶等)。地形只考虑 `_initScene` 中追加的光；启动后追加的光对地形与方块模型被忽略 (官方有一则此意的警告消息)
- **`bloxdTime()` 正体为 `performance.now()`**：`time() { return performance.now() / 1e3 % 3600 }`，为浏览器启动流逝时间按 1 小时回绕。与游戏内昼夜及世界流逝时间无关。想做与游戏时钟同步的动画，在昼夜循环世界由 `bloxdSunDirection()` 方位角推定时间比较现实
- **标头函数读取同一个 uniform**：引擎在 `@group(3) @binding(0)` 放置 64 字节 uniform (4 槽——time / originOffset / sunDirection / eyePosition，little-endian)，`bloxdTime()` / `bloxdOriginOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` 对应读取这些槽。`originOffset` 在当前构建恒为 `[0, 0, 0]` (为浮点世界坐标预留的槽)。包无法写入该 uniform，且包与引擎的 WGSL 合并为同一模块，自行声明相同 group/binding 也不可能。(v3 中两个槽位改名——`seconds` / `renderOffset`，并作为 `bloxdSeconds()` / `bloxdRenderOffset()` 公开——另外 `@group(3) @binding(1)` 增加了场景深度纹理；见[第九部分](09-apiv3.md) §41 与 §51)
- **顶点数据由 mesher (Web Worker) 构建**：方块地形以每顶点 28 字节交织 (开启 atlas 时 32 字节)——position = float32×3 / normal = 8 位有符号整数×4 / colour = 8 位归一化整数×4 (`s.colour` 的本体——tint × AO 在 mesher 阶段烘焙为 8 位，包侧分离或还原原理上不可能) / UV = float32×2 / atlasIndex = float32。只有光照等级走另外 4 字节的顶点缓冲 ([第七部分](07-internals.md) §26、[第二部分](02-api.md) §11)。顶点按区块实例化绘制
- 加载时区块边界的细棋盘格为引擎屏幕空间 Bayer 4×4 抖动的区块淡入，非包 bug (可用图形设置 `chunkFadeIn` 关闭)
- **`mod` 为保留字**：以 `pack.wgsl:3 'mod' is a reserved word in WGSL.` 拒绝。求余用 `%` 运算符书写

### R-C. Bayer 抖动溶解 — out.alpha 控制 discard

复现引擎区块淡入所用的**同一 Bayer 4×4 表**，由低方块起按抖动做「熔解」镂空。alphaTest 材质 (草、叶) 触发 discard，液体则为混合透明度。

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod 为保留字：用 % 运算符
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // 由低方块起熔解，dissolve 越高残留越多
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. 水的相机近接淡入 — 液体 alpha 保障视野

液体钩子的 `out.alpha` 直连混合。仅透过相机正下方水面，保障潜水·水上相机的视野。

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 格由全透明到通常
    #endif
    return out;
}
```

## 28. 包可见值变化之物 — 测试清单

同一包因**世界与玩家设置**渲染各异。分发前至少在以下 3 环境确认外观：

1. **通常世界** (默认天空盒、无覆盖) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`、默认色
2. **太空系天空盒世界** — bloxdSunDirection() = 0。`sunPresent` 分支的外观
3. **设 `visionMinLightColour` / `skyLightColourOverride` 的自定义世界** — 暗部与颜色被抬高的情形

主要变动源：`lightingOverride` (强制光照) / `skyLightColourOverride`、`ambientLightColourOverride` (hex 替换) / `visionMinLightColour` (「可见最暗色」。实现为对 `uSkyLightColour` 与 `uAmbientLightColour` 二者按分量取 max；Night Vision 在用——「洞穴全黑」系包达不到预想之暗，天空色本身也被垫高) / `heldLightColourOverride`、`Range`、`ConeAngle` / `fogChunkDistanceOverride`、`fogColourOverride`、`fogOnSkybox` / `skyBox` (bloxdSunDirection() 有无)。`uSkyLightColour` 默认 = (1,1,1) 白，`uAmbientLightColour` 默认 = (0.25,0.25,0.30)。`l.ambient` 场景成分 = 图形设置「Ambient Lighting Intensity」(默认 0.5)。`l.fogVisibility` 跟随玩家雾/区块距离设置。另有 `cameraTint` (覆盖全屏的 RGBA 色染) 与 `proximityFadeDistance` / `proximityFadeMinOpacity` (相机对实体的接近淡出) 两种世界侧变动源——`cameraTint` 尤其是叠加在包输出**之上**的最终通道。多数设置也可经脚本 API (`serverOption`) 定义并在对局中更新。

## 29. 调试手段

- URL 参数 `?renderer=lite` — 强制 Lite (WebGPU) 渲染器 (`?renderer=webgl2` / `babylon` 亦可；`babylon` 是 webgl2 的旧名)。优先级：URL 参数 > localStorage `bloxdRenderer` > 设置画面 > 默认 (webgl2)。无效值附带警告忽略。URL 或 localStorage 中残留的覆盖会使需要 WebGPU (lite) 的场景以「needs the new WebGPU renderer, so remove the renderer override...」出错 ([第五部分](05-troubleshooting.md) §17)
- URL 参数 `?vconsole` — 屏幕内控制台 (VConsole)。手机实机验证趁手
- URL 参数 `?drawcalls=1` — 追加绘制统计调试面板。可从调试控制台拾取游戏对象，或用 `drawCalls()` / `why()` / `configureDrawCallWatching()` 查看大型机制 (包内外) 的重绘与每一次绘制逼近约 65,000 顶点上限的情况——很适合定位性能瓶颈
- 控制台输出 `noa-engine v0.33.0` 与 `Renderer: lite from <来源>` — 先确认以防渲染路径误诊
- WebGPU 渲染器在包适用中锁定「强制 ON」。「Disable Block Texture Atlas」设置也锁定 (Atlas 保持 ON)，无 WebGPU 环境包根本无法适用。在分发页写「需要 WebGPU 浏览器」的根据在此
- 方块纹理为二维数组纹理 (`texture_2d_array`)，地形采样器为 nearest + repeat。mesher 还会将材质 / AO / 光照一致的面合并为一个矩形 (**greedy meshing**)，因此合并面的 UV 可能超过单个 tile 宽 (边缘内缩 0.0015)。平铺由硬件 repeat 寻址处理，合并面看起来无缝。注意依附 `vUV` 的程序化细节会在合并面边界断裂——请改为依附世界坐标 (`s.position` + `bloxdOriginOffset()`)
- 每次进游戏运行时重验证 (`checkCompilation`)，以浏览器 WebGPU 实编全部地形材质 (比设置画面静态验证更严)。此处失败的包被逐出该游戏

## 30. 每个游戏的适用模式 (`shaderPackPolicy`)

这里把 §7 的「allow / strict」在标题层面的语义确证下来。只有游戏定义中显式写着 `shaderPackPolicy: "allow"` 的标题才以完整模式运行 (vertex 钩子、`discard`、地形 `alpha`)；未指定 (或 allow 以外的值) 的标题视为 strict — 定义 `BLOXD_STRICT`，守卫内的代码自动失效。这个判定不在包一侧可控，因此弄清哪些标题跑什么内容是发布的前提。

- 依据构建: `szby6g.main.94a7596c.js` (2026-10-17 时点的正式部署)。静态解析全部 111 个游戏定义的结果为 **allow 26 条目 (12 个标题) / strict 85 条目**。同样的 12 个 allow 字面量及其 12 个标题已在 v3 生产 bundle (`3ymzdd`，2026-10-20) 上再次确认未变——下方列表原样沿用至 v3。
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

[← 上一部分](06-implementation.md)·[返回手册](README.md)·[下一部分 →](08-apiv2.md)

[← 上一部分](07-internals.md)·[返回手册](README.md)

# 第八部分: API Version 2 迁移指南

> 现行游戏自 2026-10-26 起要求 `apiVersion: 4`，加载时会拒绝 v1/v2/v3 包 —— 以下内容按 v2 规范撰写。分发前请查阅 [第九部分](09-apiv3.md) 与 [第十部分](10-apiv4.md) 以便迁移。

目标构建：`6qxffk.main.5912a15f.js` (2026-10-16 时点的正式部署)。本书第一至第七部分已按 v2 基准改写完毕，本第八部分汇总 v1 迁移点与 v2 新功能。新功能代码例已通过 v2 编译器的 8/8 变体检验证与浏览器 WGSL 编译器 (Tint) 验证 (§38)，既有配方的 v2 转换为机械的标识符替换，分发前务必以实机编译确认。

## 31. v1 包的命运 (先说结论)

游戏要求 manifest 的 `apiVersion` 与 **2 严格一致**。加载 v1 包会被 `This pack is for shader pack API version 1. Bloxd supports version 2.` (i18n 键 `shaderPack:loadWrongApiVersion`) 拒绝。v1/v2 **不存在并行支持**。引擎还会重验已保存包的 `validation.headerVersion` (标头全文哈希)，因此引擎更新时已保存包自动变为「待重验」的机制与 v1 相同。

## 32. 标识符全面改名 (对照表)

v2 将下划线命名统一为驼峰。**旧名一律不可用**。

| v1 | v2 |
|---|---|
| `bloxd_terrain_vertex` | `bloxdTerrainVertex` |
| `bloxd_terrain_surface` | `bloxdTerrainSurface` |
| `bloxd_terrain_light` | `bloxdTerrainLight` |
| `bloxd_liquid_vertex` | `bloxdLiquidVertex` |
| `bloxd_liquid_surface` | `bloxdLiquidSurface` |
| `bloxd_liquid_light` | `bloxdLiquidLight` |
| `bloxd_defaultVertex` | `bloxdDefaultVertex` |
| `bloxd_defaultSurface` | `bloxdDefaultSurface` |
| `bloxd_defaultLight` | `bloxdDefaultLight` |
| `bloxd_VertexIn` | `BloxdVertexIn` |
| `bloxd_Vertex` | `BloxdVertex` |
| `bloxd_SurfaceIn` | `BloxdSurfaceIn` |
| `bloxd_Surface` | `BloxdSurface` |
| `bloxd_LightIn` | `BloxdLightIn` |
| `bloxd_Light` | `BloxdLight` |
| `bloxd_packInputs` (内部 uniform) | `bloxdPackInputs` (`@group(3) @binding(0)`，64B) |

钩子种类 (vertex / surface / light × terrain / liquid 共 6 种) 与 `pack.json` 格式 (`apiVersion` / `name` / `author`) 不变。加载器限制亦不变 (zip 32MB / 条目 1024 / `.wgsl` 256 个 / 合计 256KB / manifest 64KB)。

## 33. 删除字段的移植去向

v1 中 `time` / `eyePosition` / `sunDirection` / `originOffset` 为结构体字段。v2 中**这些字段已删除，改用读取引擎 uniform (`bloxdPackInputs`) 的标头函数**。函数直接读 uniform，因此**也可从钩子外的模块级函数与 vertex 钩子调用**。

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` 的世界坐标化 | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

## 34. 新功能 ①: `blockId` (按方块着色)

`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` 三个结构体均新增 `blockId: u32`。为面所属方块的 ID (0–65535)，同一面全域恒定 (以 `@interpolate(flat)` 传递)。用于不依赖纹理颜色的方块种类识别。但 ID 与方块种类的对应表在引擎内部，包无法引用，因此哪一 ID 对应何种方块，可在世界内实测，或查阅下述参考数据。内部上该 ID 被烘焙进顶点颜色的 alpha (低 8 位) 与法线的 w (高 8 位)——合计 16 位，故上限为 65535。blockId 系统本身只在有着色器包激活期间启用 (无包时接线保留其填充目标，但在第二部分的结构体定义中该差异不可观测)。

**参考**：作者在 [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) 公开了游戏内条目清单 (`entries.json`：id ↔ 方块名对应表，`Furnace|meta|rot2` 之类的旋转/meta 变种也作为独立 ID 收录)。对应关系可能随游戏更新变化，最终确认请在实机进行。

常用方块示例 (据 2026-10-18 的 entries.json；仅列出低 ID 的地形家族)：

| ID | 方块名 | ID | 方块名 |
|---|---|---|---|
| 0 | Air | 15 | Maple Wood Planks |
| 1 | Unloaded | 28 | Stone |
| 2 | Dirt | 29 | Messy Stone |
| 3 | Messy Dirt | 31 | Smooth Stone |
| 4 | Grass Block | 126 | Water |
| 5 | Sand | 128 | Bricks |
| 6 | Clay | 139 | Ice |
| 7 | Gravel | 147 | Bedrock |
| 8 | Snow | 149 | Cactus |
| 9 | Maple Log | 1491 | Lava |

entries.json 也收录非方块条目 (工具等)，但只有方块家族的 ID 能到达地形 / 液体钩子。

### R-F. 按方块种类着色 (blockId)

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // 例：石系 (id 高位比特模式) 向冷色偏移
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

### R-G. 在世界内测量 blockId——位平面显示包

用于在世界内识别「对应表未收录」的方块 ID 的调试配方。在读取想识别方块的面色时，同时改动顶部的 `plane` 常量 (`0, 1, 2, …`)。

```wgsl
const plane: u32 = 0u;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let d = (s.blockId >> (plane * 3u)) & 7u;
    var palette = array<vec3f, 8>(
        vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 1.0, 0.0),
        vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 1.0));
    out.colour = palette[d];
    return out;
}
```

面的颜色直接以 RGB 编码 blockId 的 3 位 (黑 = 0 / 红 = 1 / 绿 = 2 / 黄 = 3 / 蓝 = 4 / 品红 = 5 / 青 = 6 / 白 = 7)。一次观测读取一个八进制位。若 p0 → p3 依次读到 3, 2, 7, 2，则从最高位起读出的八进制 2723 = 1491 即该 ID (Lava)。低 ID 的地形家族用 2 次观测 (p0, p1) 就够了。本包只用 surface 钩子，因此在 strict 游戏中也运行。

### R-H. 只摇摆树叶——按 blockId 限定 vertex 钩子

R7 的风配方 ([第三部分](03-recipes.md)) 会让整个地形起伏，但 vertex 钩子也能读取 `blockId`——可以只让树叶摇摆。ID 列表与 WGSL 数组 (据 2026-10-18 实测；共 22 种——Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / 果实变种 / Autumn Aspen)：

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// vertex 钩子在 strict 游戏中自动禁用 (见 §36)
#ifndef BLOXD_STRICT

fn sp_isLeaf(id: u32) -> bool {
    for (var i = 0u; i < 22u; i++) {
        if (LEAF_IDS[i] == id) { return true; }
    }
    return false;
}

fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    if (sp_isLeaf(v.blockId)) {
        let wp   = bloxdWorldPosition(v.position);
        let t    = bloxdTime();
        // 位移是随世界坐标变化的平滑函数。指向同一世界点的共享顶点
        // 移动相同，因此面永远不会撕裂 ([第三部分](03-recipes.md) R7 遵循同一原理)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- ID 列表随引擎更新增长 (仅在实测期间就有 50 种方块新增于新构建)。要继续使用，请经由 [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) 或 R-G 的位平面显示找出新增项，再扩展数组
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) 是地上的非固体落叶层。摆动它们会像从地面剥离；把它们从数组中排除也是一个选择
- 在 strict 游戏中 vertex 钩子会被整体禁用，但有上面的守卫，包只是「停止摇摆」——片元侧效果继续工作

## 35. 新功能 ②: `BLOXD_SCENE_DEPTH` 与 `bloxdOpaqueBehind()` (核心)

v1 中结构上不可能的深度访问，**仅限液体 (liquid) 程序解禁**。取不到颜色，但**可取得后方不透明面的距离与位置等几何信息**。典型用法是以测得的水体厚度计算吸收色。

使用规则：

| 用法 | 结果 |
|---|---|
| 在 `bloxdLiquidSurface` / `bloxdLiquidLight` 内无守卫调用 | 可 (液体变体恒有定义) |
| 在 `bloxdTerrainSurface` 内无守卫调用 | 报错。以 `#ifdef BLOXD_SCENE_DEPTH` 包裹 |
| 在 vertex 钩子内调用 | 报错 (仅 surface / light 钩子可用) |

地形钩子也想用深度时，以 `#ifdef BLOXD_SCENE_DEPTH` 包裹 (地形钩子会被液体程序复用，仅液体侧深度有效)。

### R-E. 水体厚度吸收 (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // 水柱长度 = 从当前位置到后方不透明面
        let thickness = distance(behind.position, surface.position);
        // Beer-Lambert 吸收：红色迅速衰减，蓝色传得更远
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // 后方为空 = 向深水蓝色偏移
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

应用：基于厚度的吸收/散射、经 `behind.position` 的底面世界坐标做波纹/焦散风投影、以 `found=false` 区分天空与遮蔽做水面空反射、按深度分级加泡与浑浊。深度拷贝管线构建失败时会安全降级为「后方空无一物」。深度纹理的就绪状态只在页面渲染器生成时决定一次——标准是「当前激活的包是否读取深度」。**使用读取深度的包时，请务必重新加载页面**。在包激活状态下请求深度而页面未重新加载时，控制台会显示一次 `…reads scene depth on a page that didn't turn it on` 警告，深度纹理被替换为 1×1 回退，导致 `bloxdOpaqueBehind()` 恒返回 `found = false`。

## 36. 其他 v2 变更

- **钩子回退**：液体程序在 `bloxdLiquidXxx` 未定义时回退到地形钩子。**仅地形钩子的包会原样作用于水面**。不希望时请显式定义 liquid 侧钩子。
- **`BLOXD_LIGHTING` 字段守卫不再必要**：全变体存在 `blockLight` 等，无光照时填默认值 (0 / 1 / 白 / 0)。仅在判定光照时使用 `#ifdef BLOXD_LIGHTING`。保留既有守卫动作不变。
- **`BLOXD_ALPHA` 定义条件变化**：非 strict 地形变体与全液体变体有定义，strict × terrain 无定义。地形钩子写 alpha 时请保留守卫。
- **禁止直接构造结构体**：`BloxdLight(...)` 等构造器调用会被静态检查拒绝。务必从 `bloxdDefault*` 改写，或使用输入的拷贝。
- **`let _ =` 改为 `_ =`**：WGSL 的弃置赋值 `_ = f();` 有效，但 `let _ = f();` 会被拒绝。
- **offInStrict**：定义 vertex 钩子，或 surface / light 钩子可达的 `discard`，不会报错而是整个包在 strict 游戏中自动禁用 (设置 UI 显示 `shaderPack:offInStrict`，allow 游戏仍可运行)。vertex 钩子与 `discard` 以 `#ifndef BLOXD_STRICT` 包裹。注意设置画面自身的警告也要求把剩余部分以 `#ifndef BLOXD_STRICT` 包裹——这是官方建议，而非单纯的惯例。
- **雾的扩展**：雾计算实现了 LINEAR / EXP / EXP2 三种模式，但游戏侧设置恒为 LINEAR，既有雾规格可照用。`fogColour` 含义也正式明确 (仅在完全无雾的场景为黑)。
- **未变之物**：提升曲线、35% 通道地板、heldLight 衰减 (`pow(lightDist, 0.75)`) 与环境光助推、太阳与月亮方向规格、默认雾色、time 回绕 (3600 秒)、方向光 (最多 4 盏)、Lite (WebGPU) 专用、保存机制 (IndexedDB)、`mod` 保留字。

## 37. v1 → v2 迁移清单

1. **pack.json**：`"apiVersion": 1` → `"apiVersion": 2`
2. **标识符**：按 §32 对照表全部替换 (钩子名、结构体名、default 函数名)
3. **删除字段的移植**：按 §33 表格改用标头函数 (`s.time` → `bloxdTime()` 等)
4. **`fogFactor` → `fogVisibility`** 改名
5. **去除结构体直接构造**
6. **`let _ =` 改为 `_ =`**
7. **vertex 钩子与 discard 以 `#ifndef BLOXD_STRICT` 包裹**
8. **确认水面同样受到地形钩子影响**，不希望时显式定义 liquid 钩子
9. (可选) 以 `litColour` 为起点自管雾 / 以 `bloxdOpaqueBehind()` 加水体厚度吸收 / 以 `blockId` 做按方块表现
10. **第二阶段 (浏览器 Tint) 也要验证** — 尤其含 `^` `&` `|` `<<` `>>` 的表达式括号。存在通过静态验证却被浏览器拒绝的代码 (§38)

## 38. 第二验证阶段 — 浏览器的 WGSL 编译器比内置解析器更严格

游戏包验证分 **2 阶段**。第 1 阶段是静态验证 (引擎内置 JS 解析器。检查钩子签名、禁用语法、sceneDepth 使用等包专有规则)，第 2 阶段是浏览器验证 (将编译结果附带的子模块以真正的 WebGPU 实现编译，错误逆映射到包原始文件行显示。UI 的「Saved, but it won't run until you fix these errors」即此阶段)。错误显示末尾的 `(only in terrain)` 等后缀表示「出现该错误的变体的 program 种类」。

内置解析器未实现 WGSL 的运算符结合 (Binding) 规则，**存在通过静态验证却被浏览器拒绝的代码**。易受害的是整数哈希的经典写法：

| 运算符 | 后果 |
|---|---|
| `<<` `>>` | 只能直接结合到一元级。`a + b << c` 报错 |
| `&` `^` `\|` | 只能直接结合到一元级。`a * b ^ c` 报错 |
| `&&` `\|\|` | 不可混用。`a && b \|\| c` 报错 |

### 加括号方法 (NG / OK)

```wgsl
// NG — 通过静态验证，但浏览器 (Tint) 拒绝：
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — 每个乘法加括号 (同一运算符连锁 A ^ B ^ C 本身左结合合法)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

本书刊载代码不含此写法 (`pack_hash3` 的 `+`/`*` 混用与 `h ^ (h >> 16u)` 已加括号，故符合规范)。写完包后，第 1 阶段与第 2 阶段都要通过。

## 39. 关于独立相似资料

存在内容几乎相同的社区资料：[GlitchHunterCoder/Bloxd-Essay 的 Shader](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader)。它比本指南先公开，但**本指南内容出自 glm 对 Bloxd 实际包文件 (webpack chunk 集) 的独立解析——并非复制粘贴**。两者一致是因为独立调查同一实现必得同一结论。

---

调查：ltf_ahel (使用 glm 调查)

[← 上一部分](07-internals.md)·[返回手册](README.md)

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

**引擎标头 (prelude)，已钉住。** v3 标头是一个 5,637 字节字符串，开头为 `// Engine-provided and read-only, prepended to all packs. apiVersion 3.`。它带有 `#if` / `#ifdef` 指令，由引擎自己的 WGSL 预处理器逐变体求值——引擎确实会执行 `#if` 表达式求值，格式错误的表达式会报 `Cannot evaluate #if ...`。本指南中的每个结构体、函数签名与引用注释都来自这段渲染文本，因此指南与随附标头不会漂移。 全文已在 §54 末尾逐字给出。

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
### v3 引擎头文件全文 (逐字)

钉住的 5,637 字节 (127 行) 文本本身——即上方 §53 所描述的那件材料——从本部所针对的 v3 生产构建 `3ymzdd` 逐字复原。它是[第十一部分](11-reference.md) §67 v4 头文件的 v3 对应物,基于同样的理由完整内嵌:让 v3 包能够拿引擎实际前置的确切文本来调试,并让每一处 v3 → v4 差异 ([第十部分](10-apiv4.md) §58–§59) 可以从两份文本并排直接读出。

```wgsl

// Engine-provided and read-only, prepended to all packs. apiVersion 3.

// Half a turn and a full turn, in radians.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Per frame: the same for every vertex and fragment of a frame. The functions read bloxdPackInputs, the engine's
// uniforms, which packs can't name. Any function can call them, not only a hook.

// Seconds since the page loaded. In f32, so it counts in steps of under 1 ms for the first 4.5 hours, and of about
// 4 ms from 9 to 18 hours. bloxdSeconds() % period counts from 0 up to period, then starts again.
fn bloxdSeconds() -> f32 {
    return bloxdPackInputs.seconds;
}

// Whole blocks: a render position plus this is a world position. It changes as the player travels, so render positions
// stay close to the player, and so precise.
fn bloxdRenderOffset() -> vec3i {
    return bloxdPackInputs.renderOffset;
}

// The camera's render position.
fn bloxdEyePosition() -> vec3f {
    return bloxdPackInputs.eyePosition;
}

// Unit, towards the sun, in world orientation; zero when the sky has no sun.
fn bloxdSunDirection() -> vec3f {
    return bloxdPackInputs.sunDirection;
}

// A render position's world position. In f32, so it loses fine detail far from the world's origin.
fn bloxdWorldPosition(position: vec3f) -> vec3f {
    return position + vec3f(bloxdRenderOffset());
}

// The world block the face at a fragment's position and normal belongs to, exact anywhere: half a block back inside it.
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i {
    return vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset();
}

// Bits of the hook inputs' blockFlags: what a face's block is and what it's made of. A block made of several materials
// has each, as sandstone is sand and rock, so leaves are vegetation and not dirt. Test one with
// (blockFlags & bloxdBlockFlagRock) != 0.
const bloxdBlockFlagOpaque: u32 = 1;     // Fully opaque, leaves and ice included. Not glass, water, lava, spawners, or ghost and invisible blocks.
const bloxdBlockFlagEmissive: u32 = 2;   // Gives off block light, as neon, portals, lamps, Lava and Beacon do. Glowing ores count, however faint.
const bloxdBlockFlagVegetation: u32 = 4; // Leaves, and the grass on grass blocks, which are dirt too. Not cacti, mushroom blocks or hay.
const bloxdBlockFlagDirt: u32 = 8;       // Dirt and soil, grass blocks included. Rocky Dirt is rock too.
const bloxdBlockFlagSand: u32 = 16;      // Sand, Red Sand, and every sandstone, which is rock too.
const bloxdBlockFlagRock: u32 = 32;      // Stone and its kinds, andesite, diorite, granite, gravel, ores, sandstone, Rocky Dirt, bedrock, obsidian and magma.

struct BloxdVertexIn {
    position: vec3f,     // A render position: world minus bloxdRenderOffset().
    normal: vec3f,
    blockFlags: u32,     // What kind of block this face is: bloxdBlockFlag* bits, the same across the face.
}

struct BloxdVertex {
    position: vec3f,     // A render position.
}

struct BloxdSurfaceIn {
    colour: vec3f,       // Texture * vertex colour (tint * AO).
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // A render position; see bloxdWorldPosition and bloxdFaceBlock.
    blockFlags: u32,     // As in BloxdVertexIn.
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // Added after lighting, then fogged.
}

struct BloxdLightIn {
    litColour: vec3f,    // The engine's lit result for this fragment, from the surface hook's colour: before emission and fog.
    directional: f32,    // Summed Lambert from the scene's directional lights (0 when off).
    ambient: vec3f,      // Ambient light, added to directional.
    blockLight: vec3f,   // Voxel block light, tone-mapped; 0 without BLOXD_LIGHTING.
    skyLight: f32,       // Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING.
    ambientLightColour: vec3f, // White without BLOXD_LIGHTING.
    skyLightColour: vec3f,     // White without BLOXD_LIGHTING.
    heldLight: vec3f,    // Held light here, tone-mapped like blockLight, before the ambient boost; 0 out of reach
                         // or without BLOXD_LIGHTING.
    fogColour: vec3f,    // The game's fog colour. Bloxd's games always have fog, pushed far out when the player
                         // turns it off; black only in a scene with no fog at all.
    fogVisibility: f32,  // 1 = no fog, 0 = fully fogged.
    position: vec3f,     // As in BloxdSurfaceIn.
    normal: vec3f,
    blockFlags: u32,     // As in BloxdVertexIn.
}

struct BloxdLight {
    colour: vec3f,
}

// Returned by bloxdOpaqueBehind(), which surface and light hooks may call where BLOXD_SCENE_DEPTH is defined.
struct BloxdOpaqueBehind {
    found: bool,         // False where nothing opaque is behind (sky).
    position: vec3f,     // A render position; meaningless when !found.
    distance: f32,       // From the eye; meaningless when !found.
}

fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return BloxdVertex(vertex.position);
}

fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
#ifdef BLOXD_ALPHA
    return BloxdSurface(surface.colour, surface.alpha, vec3f(0.0));
#else
    return BloxdSurface(surface.colour, vec3f(0.0));
#endif
}

// Fogs colour as the engine fogs this fragment.
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(light.fogColour, colour, light.fogVisibility);
}

fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return BloxdLight(bloxdApplyFog(light.litColour + surface.emission, light));
}
```

---

# 第十部分: API Version 4 迁移指南 (2026-10-26, 摘要)

> 本文是该语言的简短摘要。包含全部细节、示例配方与复原的引擎内部实现 (§55–§66) 的完整版位于[英文版](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md)与[日文版](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md)。

目标构建: `cnty9.main.669f8081.js` —— **自 2026-10-26 起同时在生产与预发布环境上线** (两者逐字节一致)。包模型保持形态: 相同的 `pack.json` 字段、相同的加载器限制、相同的 64 B uniform、相同的 6 个钩子。

## 变更内容

- `pack.json` 要求 `"apiVersion": 4` (严格 `===`，数字) —— v3 包在加载时被拒绝。
- **全新纹理 API (本次亮点):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` 以与引擎本身完全相同的方式采样方块纹理图集 (id 0 = 白色；动画纹理自动返回当前帧)，`bloxdTextureSize(mipLevel) -> vec2u`，以及命名常量 `bloxdTextureId*` (由文件名转 CamelCase，如 `grass_top` → `bloxdTextureIdGrassTop`；全部 905 个可用名称的完整名录已作为 §68 嵌入第十一部分 (`11-reference.md`))。
- `BloxdSurfaceIn` *与* `BloxdLightIn` 新增 **4 个输入字段**: `textureId`、`textureRotation` (顺时针四分之一转，由 `bloxdTexel` 应用)、`uv` (以方块为单位；绘制 `fract(uv)`)、`mipLevel`。
- **伴随含义变化的改名:** `fogVisibility` → `fogAlpha`，含义**反转** (`0 = 无雾，1 = 仅有 fogColour`；移植: `l.fogVisibility` → `1.0 - l.fogAlpha`)；`bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (函数体一致)；`BloxdOpaqueBehind.found` → `hit`。
- **严格游戏现在由内置验证器强制执行:** 未加保护的顶点钩子或可达的 `discard` 会报 `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...`，并在严格游戏中禁用**全部**钩子。使用 `#ifndef BLOXD_STRICT` 包裹后 surface/light 仍可运行。
- 其余全部冻结: 6 个钩子、`blockFlags` 位 (1/2/4/8/16/32)、uniform 布局、加载器限制、变体矩阵、12 个 allow 标题 (2026-10-27 在 `cnty9` 上复确认不变)。

## 快速迁移

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (数字) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` 或 `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| 未保护的顶点钩子 | `#ifndef BLOXD_STRICT ... #endif` |

完整参考材料已作为第十一部分 (`11-reference.md`) 嵌入——逐字复原的引擎头文件与含全部 905 个可用纹理名称的完整实测目录；API 说明与配方仍请持续以加载界面与游戏内编译为准。完整细节 —— `bloxdTexel` 的旋转细节、复原的采样 WGSL、约 900 个可用常量的名称注册表、带注册表哈希的新 `HEADER_VERSION` 结构 —— 见英文与日文完整版。

[← 上一部分](09-apiv3.md)·[返回手册](README.md)

---

# 第十一部分：完整参考 — 引擎头文件与纹理目录

目标构建：`cnty9.main.669f8081.js`（2026-10-27 实测；生产与预发布逐字节一致）。本部分将两份参考材料**完整**嵌入，使指南自洽。§67 是引擎在每个包前拼接的精确头文件文本（从生产包逐字复原）；§68 是完整的纹理名称目录：带实测 id 的全部 905 个可用 `bloxdTextureId*` 名称、57 个旋转族、42 个动画族，以及注册表漂移实测。

该目录不是近似值：它是把引擎**自身的**注册表构建模块（module 28833 —— 与验证时解析 `bloxdTextureId*` 的是同一份代码）跑在活构建的数据（`textureNameToIndex`、`animDataPerTex`）上并记录其输出得到的。名称才是 API —— id 只是某个构建的快照，会漂移（§68.5）。

两节的详细说明见第十一部分的英文与日文完整版；此处的数据本身是完整的。


## 67. 完整的 v4 引擎头文件（逐字）

引擎在每个包前拼接的 6,021 字节（150 行）头文件 —— 首行为 `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.` 不包含：按渲染器配置生成的 `bloxdTexel`/`bloxdTextureSize` 函数对（§63.1）与 27 个 `bloxdSp*` 符号（§63.4）。`#ifdef BLOXD_ALPHA` 门由引擎预处理器按变体解析。


```wgsl

// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.

const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// These functions return 1 value per frame, the same for every call site.

// The camera's render position.
fn bloxdEyePosition() -> vec3f {
    return bloxdPackInputs.eyePosition;
}

// Changes as the player travels, so render positions stay close to 0,0,0.
// Integer distance, in blocks. Render position + this offset = world position.
// See bloxdWorldPosition for how this can be used.
fn bloxdRenderOffset() -> vec3i {
    return bloxdPackInputs.renderOffset;
}

// This unit vector points towards the sun, in world orientation; 0 when no sun.
fn bloxdSunDirection() -> vec3f {
    return bloxdPackInputs.sunDirection;
}

// Seconds since the page loaded. As an f32, it has sub-millisecond precision
// for the first 4.5 hours. Get a recurring timer using bloxdSeconds() % period.
fn bloxdSeconds() -> f32 {
    return bloxdPackInputs.seconds;
}

// Each bit of the binary representation of blockFlags is a flag corresponding
// to a collection of blocks. The collections overlap, so blocks can be in 0-2+.
// (blockFlags & bloxdBlockFlagRock) != 0 // The block has this flag.
// (blockFlags & bloxdBlockFlagRock) == 0 // The block doesn't have this flag.

// Opaque blocks, leaves and ice included. Not glass, water, spawners, etc.
const bloxdBlockFlagOpaque: u32 = 1;

// These blocks emit light, e.g. neon, portals, lamps, lava, and glowing ores.
const bloxdBlockFlagEmissive: u32 = 2;

// 'Leafy', e.g. leaves, and grass blocks. Not cacti, mushroom blocks or hay.
const bloxdBlockFlagVegetation: u32 = 4;

// Dirt and soil, grass blocks included. Rocky Dirt is both dirt and rock.
const bloxdBlockFlagDirt: u32 = 8;

// Sand, Red Sand, and every sandstone, which is rock too.
const bloxdBlockFlagSand: u32 = 16;

// Stone variants, and more, e.g. gravel, ores, sandstone, magma and obsidian.
const bloxdBlockFlagRock: u32 = 32;

// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f {
    return position + vec3f(bloxdRenderOffset());
}

// Using a fragment's position and normal, identify the block's world position.
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i {
    return vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset();
}

struct BloxdVertexIn {
    position: vec3f, // Render position.
    normal: vec3f,   // Unit vector direction pointing away from the face.
    blockFlags: u32, // What kind of block. See bloxdBlockFlag*.
}

struct BloxdVertex {
    position: vec3f, // The render position output.
}

struct BloxdSurfaceIn {
    colour: vec3f,   // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,      // Opacity.
    normal: vec3f,   // Unit vector direction pointing away from the face.
    position: vec3f, // Render position.
    blockFlags: u32, // What kind of block. See bloxdBlockFlag*.

    // These are 0 if the face has no texture.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // Texture coordinates in blocks; fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}

struct BloxdSurface {
    colour: vec3f,   // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,      // Opacity output.
#endif
    emission: vec3f, // Emissive RGB output, added after lighting, before fog.
}

// blockLight, skyLight and heldLight are 0-1, from the 0-15 light levels on an
// ease-out curve, e.g. 6->0.45, 12->0.92. They all exclude ambientLightColour.
struct BloxdLightIn {
    litColour: vec3f,  // RGB surface colour, lit, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 when off.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 without BLOXD_LIGHTING.
    skyLight: f32,     // Sky light; 1 without BLOXD_LIGHTING.
    ambientLightColour: vec3f, // Minimum RGB light; 1 without BLOXD_LIGHTING.
    skyLightColour: vec3f, // RGB colour of skyLight; 1 without BLOXD_LIGHTING.
    heldLight: vec3f,  // 0 without BLOXD_LIGHTING. 0 with no light source held.
    fogColour: vec3f,  // The game's RGB fog colour. 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.
    position: vec3f,   // Render position.
    normal: vec3f,     // Unit vector direction pointing away from the face.
    blockFlags: u32,   // What kind of block. See bloxdBlockFlag*.

    // These are 0 if the face has no texture.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // Texture coordinates in blocks; fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}

struct BloxdLight {
    colour: vec3f, // RGB colour output.
}

struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}

fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return BloxdVertex(vertex.position);
}

fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
#ifdef BLOXD_ALPHA
    return BloxdSurface(surface.colour, surface.alpha, vec3f(0.0));
#else
    return BloxdSurface(surface.colour, vec3f(0.0));
#endif
}

// Applies this fragment's fog to colour, as the engine does.
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}

fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return BloxdLight(bloxdApplyFog(light.litColour + surface.emission, light));
}
```

## 68. 完整的纹理目录（905 个名称，实测）

### 68.1 阅读方法

**名称**是注册表句柄；常量按 CamelCase 规则生成（§57.3）：`grass_top` → `bloxdTextureIdGrassTop`。**id** 是该常量比较的值（图集层 + 1，在 `cnty9` 上实测）—— 用于调试，不要硬编码。**备注**列标记动画族（自动取当前帧）与旋转族（引用根名，`bloxdTexel` 会重新施加旋转）。

此处没有的：416 个已知别名词形（188 个帧别名、228 个旋转别名）—— 它们不是常量，使用时会得到专用错误消息（§57.3）。


### 68.2 目录

全部可用名称，按字母序。id 是 `cnty9` 的快照 —— 名称能挺过注册表漂移，因为验证器在加载时重新解析它们。

| 名称 | id (cnty9) | 备注 |
|---|---|---|
| `alloy_kiln_back` | 1091 |  |
| `alloy_kiln_front` | 1085 |  |
| `alloy_kiln_side` | 1086 |  |
| `alloy_kiln_side_running` | 33 | animated (4 frames) |
| `alloy_kiln_top` | 1087 | turned (4 rotated copies) |
| `andesite_brick` | 465 |  |
| `apple_block_bottom` | 441 |  |
| `apple_block_side` | 439 |  |
| `apple_block_top` | 440 |  |
| `armour_lucky_block` | 995 |  |
| `armour_lucky_block_rare` | 997 |  |
| `armour_lucky_block_super` | 999 |  |
| `artisan_table_side` | 367 |  |
| `artisan_table_top` | 368 |  |
| `ash` | 1031 |  |
| `auto_bench_back` | 1106 |  |
| `auto_bench_front` | 1100 |  |
| `auto_bench_side` | 1101 |  |
| `auto_bench_side_running` | 35 | animated (4 frames) |
| `auto_bench_top` | 1102 | turned (4 rotated copies) |
| `autocrafter_bottom` | 962 |  |
| `autocrafter_lunite_bottom` | 973 |  |
| `autocrafter_lunite_side` | 972 |  |
| `autocrafter_side` | 961 |  |
| `banana_block_side` | 899 |  |
| `banana_block_top` | 900 |  |
| `beacon` | 330 |  |
| `bedrock` | 334 |  |
| `beetroot_block_bottom` | 925 |  |
| `beetroot_block_side` | 923 |  |
| `beetroot_block_top` | 924 |  |
| `belt_drop_side` | 1185 |  |
| `belt_drop_top` | 1184 |  |
| `belt_lift_side` | 1183 |  |
| `belt_lift_top` | 1182 |  |
| `belt_loader_slab_front` | 1110 |  |
| `belt_loader_top` | 1109 |  |
| `belt_tunnel_back` | 1199 |  |
| `belt_tunnel_exit_top` | 1200 | turned (4 rotated copies) |
| `belt_tunnel_mouth` | 1193 |  |
| `belt_tunnel_side` | 1194 |  |
| `belt_tunnel_top` | 1195 | turned (4 rotated copies) |
| `black_concrete` | 273 |  |
| `black_glazed_terracotta` | 429 | turned (4 rotated copies) |
| `black_planks` | 366 |  |
| `black_portal` | 2 | animated (4 frames) |
| `black_spawn_block_side` | 760 |  |
| `black_spawn_block_top` | 756 | turned (4 rotated copies) |
| `block_destroyer_tnt_side` | 1017 |  |
| `block_destroyer_tnt_top` | 1018 |  |
| `blue_concrete` | 274 |  |
| `blue_gen_spawn_coal` | 774 |  |
| `blue_gen_spawn_iron` | 775 |  |
| `blue_gen_spawn_top` | 773 |  |
| `blue_glazed_terracotta` | 413 | turned (4 rotated copies) |
| `blue_lucky_block` | 994 |  |
| `blue_lucky_block_rare` | 996 |  |
| `blue_lucky_block_super` | 998 |  |
| `blue_planks` | 362 |  |
| `blue_portal` | 3 | animated (4 frames) |
| `blue_spawn_block_side` | 755 |  |
| `blue_spawn_block_top` | 751 | turned (4 rotated copies) |
| `bone_block_side` | 818 |  |
| `bone_block_top` | 819 |  |
| `bookshelf` | 564 |  |
| `bookshelf_1` | 566 |  |
| `bookshelf_2` | 567 |  |
| `bookshelf_3` | 568 |  |
| `bookshelf_4` | 569 |  |
| `bookshelf_5` | 570 |  |
| `bookshelf_empty` | 565 |  |
| `bouncy_bomb_block` | 591 |  |
| `bowling_alley_floor` | 978 |  |
| `bread_block_back` | 435 |  |
| `bread_block_front` | 434 |  |
| `bread_block_side` | 436 |  |
| `bread_block_top` | 437 |  |
| `brick` | 315 |  |
| `brown_concrete` | 275 |  |
| `brown_glazed_terracotta` | 417 | turned (4 rotated copies) |
| `brown_mushroom_block` | 536 |  |
| `brown_planks` | 363 |  |
| `brown_portal` | 4 | animated (4 frames) |
| `brown_spawn_block_side` | 750 |  |
| `brown_spawn_block_top` | 746 | turned (4 rotated copies) |
| `building_lucky_block` | 989 |  |
| `building_lucky_block_rare` | 991 |  |
| `building_lucky_block_super` | 993 |  |
| `burner_drill_back` | 1048 |  |
| `burner_drill_bottom` | 1047 |  |
| `burner_drill_front` | 1041 |  |
| `burner_drill_side` | 1042 |  |
| `burner_drill_side_running` | 27 | animated (4 frames) |
| `burner_drill_top` | 1043 | turned (4 rotated copies) |
| `cactus_dry` | 350 |  |
| `cactus_top` | 349 |  |
| `carrot_block_bottom` | 921 |  |
| `carrot_block_side` | 919 |  |
| `carrot_block_top` | 920 |  |
| `carved_messy_stone` | 827 |  |
| `carved_pumpkin` | 543 |  |
| `chalk` | 839 |  |
| `chalk_black` | 855 |  |
| `chalk_blue` | 854 |  |
| `chalk_bricks_black` | 871 |  |
| `chalk_bricks_blue` | 870 |  |
| `chalk_bricks_brown` | 869 |  |
| `chalk_bricks_cyan` | 868 |  |
| `chalk_bricks_gray` | 867 |  |
| `chalk_bricks_green` | 866 |  |
| `chalk_bricks_light_blue` | 865 |  |
| `chalk_bricks_light_gray` | 864 |  |
| `chalk_bricks_lime` | 863 |  |
| `chalk_bricks_magenta` | 862 |  |
| `chalk_bricks_orange` | 861 |  |
| `chalk_bricks_pink` | 860 |  |
| `chalk_bricks_purple` | 859 |  |
| `chalk_bricks_red` | 858 |  |
| `chalk_bricks_slab_side_black` | 887 |  |
| `chalk_bricks_slab_side_blue` | 886 |  |
| `chalk_bricks_slab_side_brown` | 885 |  |
| `chalk_bricks_slab_side_cyan` | 884 |  |
| `chalk_bricks_slab_side_gray` | 883 |  |
| `chalk_bricks_slab_side_green` | 882 |  |
| `chalk_bricks_slab_side_light_blue` | 881 |  |
| `chalk_bricks_slab_side_light_gray` | 880 |  |
| `chalk_bricks_slab_side_lime` | 879 |  |
| `chalk_bricks_slab_side_magenta` | 878 |  |
| `chalk_bricks_slab_side_orange` | 877 |  |
| `chalk_bricks_slab_side_pink` | 876 |  |
| `chalk_bricks_slab_side_purple` | 875 |  |
| `chalk_bricks_slab_side_red` | 874 |  |
| `chalk_bricks_slab_side_white` | 873 |  |
| `chalk_bricks_slab_side_yellow` | 872 |  |
| `chalk_bricks_white` | 857 |  |
| `chalk_bricks_yellow` | 856 |  |
| `chalk_brown` | 853 |  |
| `chalk_cyan` | 852 |  |
| `chalk_gray` | 851 |  |
| `chalk_green` | 850 |  |
| `chalk_light_blue` | 849 |  |
| `chalk_light_gray` | 848 |  |
| `chalk_lime` | 847 |  |
| `chalk_magenta` | 846 |  |
| `chalk_orange` | 845 |  |
| `chalk_pink` | 844 |  |
| `chalk_purple` | 843 |  |
| `chalk_red` | 842 |  |
| `chalk_white` | 841 |  |
| `chalk_yellow` | 840 |  |
| `charge_vault_side` | 1114 |  |
| `charge_vault_top` | 1113 |  |
| `charging_pad_side` | 1159 |  |
| `charging_pad_top` | 1158 |  |
| `checkpoint_block` | 761 | turned (4 rotated copies) |
| `cherry_block_bottom` | 590 |  |
| `cherry_block_side` | 588 |  |
| `cherry_block_top` | 589 |  |
| `chest_back` | 347 |  |
| `chest_double_back_hi` | 1219 |  |
| `chest_double_back_lo` | 1218 |  |
| `chest_double_front_hi` | 1213 |  |
| `chest_double_front_lo` | 1212 |  |
| `chest_double_top_1_hi` | 1215 |  |
| `chest_double_top_1_lo` | 1214 |  |
| `chest_double_top_2_hi` | 1217 |  |
| `chest_double_top_2_lo` | 1216 |  |
| `chest_front` | 341 |  |
| `chest_side` | 342 |  |
| `chest_top` | 343 | turned (4 rotated copies) |
| `chili_pepper_block_bottom` | 678 |  |
| `chili_pepper_block_side` | 676 |  |
| `chili_pepper_block_top` | 677 |  |
| `chiseled_red_sandstone` | 456 |  |
| `chiseled_sandstone` | 325 |  |
| `clay` | 195 |  |
| `coal_block` | 233 |  |
| `coal_deposit` | 1032 |  |
| `coal_ore` | 227 |  |
| `coarse_dirt` | 191 |  |
| `coconut_block_bottom` | 522 |  |
| `coconut_block_side` | 520 |  |
| `coconut_block_top` | 521 |  |
| `code_block` | 679 |  |
| `comet_heart` | 1170 |  |
| `comet_ore` | 1169 |  |
| `compressed_messy_stone` | 530 |  |
| `conveyor_belt_bottom` | 1081 |  |
| `conveyor_belt_slab_side` | 1080 |  |
| `conveyor_belt_top` | 1079 |  |
| `conveyor_belt_turn_left` | 1171 |  |
| `conveyor_belt_turn_right` | 1172 |  |
| `copper_deposit` | 1035 |  |
| `copper_ore` | 1040 |  |
| `corn_block_bottom` | 594 |  |
| `corn_block_side` | 592 |  |
| `corn_block_top` | 593 |  |
| `crafting_table_side` | 338 |  |
| `crafting_table_top` | 339 |  |
| `crate` | 918 |  |
| `crop_harvester_back` | 1192 |  |
| `crop_harvester_back_running` | 45 | animated (4 frames) |
| `crop_harvester_front` | 1186 |  |
| `crop_harvester_side` | 1187 |  |
| `crop_harvester_side_running` | 44 | animated (4 frames) |
| `crop_harvester_top` | 1188 | turned (4 rotated copies) |
| `crusher_back` | 1055 |  |
| `crusher_front` | 1049 |  |
| `crusher_side` | 1050 |  |
| `crusher_side_running` | 28 | animated (4 frames) |
| `crusher_top` | 1051 | turned (4 rotated copies) |
| `crystal_block` | 1029 |  |
| `crystal_vat_back` | 1166 |  |
| `crystal_vat_front` | 1160 |  |
| `crystal_vat_side` | 1161 |  |
| `crystal_vat_side_running` | 42 | animated (4 frames) |
| `crystal_vat_top` | 1162 | turned (4 rotated copies) |
| `custom_lobby_block_side` | 769 |  |
| `custom_lobby_block_top` | 765 | turned (4 rotated copies) |
| `cut_red_sandstone` | 457 |  |
| `cut_sandstone` | 453 |  |
| `cyan_concrete` | 276 |  |
| `cyan_gen_spawn_coal` | 783 |  |
| `cyan_gen_spawn_iron` | 784 |  |
| `cyan_gen_spawn_top` | 782 |  |
| `cyan_glazed_terracotta` | 405 | turned (4 rotated copies) |
| `cyan_planks` | 360 |  |
| `cyan_portal` | 5 | animated (4 frames) |
| `cyan_spawn_block_side` | 745 |  |
| `cyan_spawn_block_top` | 741 | turned (4 rotated copies) |
| `dark_green_bricks` | 460 |  |
| `darkstone` | 1206 |  |
| `darkstone_bricks` | 1207 |  |
| `darkstone_bricks_cracked` | 1208 |  |
| `darkstone_bricks_lava` | 1209 |  |
| `darkstone_engraved` | 1210 |  |
| `darkstone_smooth` | 1211 |  |
| `deep_drill_back` | 1140 |  |
| `deep_drill_bottom` | 1139 |  |
| `deep_drill_front` | 1133 |  |
| `deep_drill_side` | 1134 |  |
| `deep_drill_side_running` | 39 | animated (4 frames) |
| `deep_drill_top` | 1135 | turned (4 rotated copies) |
| `diamond_block` | 340 |  |
| `diamond_gen_spawn_side` | 807 |  |
| `diamond_gen_spawn_top` | 806 |  |
| `diamond_ore` | 232 |  |
| `diorite_brick` | 463 |  |
| `dirt` | 190 |  |
| `drop_location_block_side` | 814 |  |
| `drop_location_block_top` | 813 |  |
| `drop_pad` | 1038 |  |
| `dry_grass_block` | 980 |  |
| `dry_grass_block_side` | 979 |  |
| `electric_drill_back` | 1099 |  |
| `electric_drill_bottom` | 1098 |  |
| `electric_drill_front` | 1092 |  |
| `electric_drill_side` | 1093 |  |
| `electric_drill_side_running` | 34 | animated (4 frames) |
| `electric_drill_top` | 1094 | turned (4 rotated copies) |
| `emerald_block` | 237 |  |
| `emerald_ore` | 231 |  |
| `end_stone` | 226 |  |
| `engraved_andesite` | 464 |  |
| `engraved_diorite` | 462 |  |
| `engraved_granite` | 466 |  |
| `evil_lucky_block` | 1022 |  |
| `evil_lucky_block_face` | 1023 |  |
| `explosive_paint_black_side` | 626 |  |
| `explosive_paint_black_top` | 627 |  |
| `explosive_paint_blue_side` | 624 |  |
| `explosive_paint_blue_top` | 625 |  |
| `explosive_paint_brown_side` | 622 |  |
| `explosive_paint_brown_top` | 623 |  |
| `explosive_paint_cyan_side` | 620 |  |
| `explosive_paint_cyan_top` | 621 |  |
| `explosive_paint_gray_side` | 618 |  |
| `explosive_paint_gray_top` | 619 |  |
| `explosive_paint_green_side` | 616 |  |
| `explosive_paint_green_top` | 617 |  |
| `explosive_paint_light_blue_side` | 614 |  |
| `explosive_paint_light_blue_top` | 615 |  |
| `explosive_paint_light_gray_side` | 612 |  |
| `explosive_paint_light_gray_top` | 613 |  |
| `explosive_paint_lime_side` | 610 |  |
| `explosive_paint_lime_top` | 611 |  |
| `explosive_paint_magenta_side` | 608 |  |
| `explosive_paint_magenta_top` | 609 |  |
| `explosive_paint_orange_side` | 606 |  |
| `explosive_paint_orange_top` | 607 |  |
| `explosive_paint_pink_side` | 604 |  |
| `explosive_paint_pink_top` | 605 |  |
| `explosive_paint_purple_side` | 602 |  |
| `explosive_paint_purple_top` | 603 |  |
| `explosive_paint_quick_black` | 643 |  |
| `explosive_paint_quick_blue` | 642 |  |
| `explosive_paint_quick_brown` | 641 |  |
| `explosive_paint_quick_cyan` | 640 |  |
| `explosive_paint_quick_gray` | 639 |  |
| `explosive_paint_quick_green` | 638 |  |
| `explosive_paint_quick_light_blue` | 637 |  |
| `explosive_paint_quick_light_gray` | 636 |  |
| `explosive_paint_quick_lime` | 635 |  |
| `explosive_paint_quick_magenta` | 634 |  |
| `explosive_paint_quick_orange` | 633 |  |
| `explosive_paint_quick_pink` | 632 |  |
| `explosive_paint_quick_purple` | 631 |  |
| `explosive_paint_quick_red` | 630 |  |
| `explosive_paint_quick_white` | 629 |  |
| `explosive_paint_quick_yellow` | 628 |  |
| `explosive_paint_red_side` | 600 |  |
| `explosive_paint_red_top` | 601 |  |
| `explosive_paint_seeking_black` | 659 |  |
| `explosive_paint_seeking_blue` | 658 |  |
| `explosive_paint_seeking_brown` | 657 |  |
| `explosive_paint_seeking_cyan` | 656 |  |
| `explosive_paint_seeking_gray` | 655 |  |
| `explosive_paint_seeking_green` | 654 |  |
| `explosive_paint_seeking_light_blue` | 653 |  |
| `explosive_paint_seeking_light_gray` | 652 |  |
| `explosive_paint_seeking_lime` | 651 |  |
| `explosive_paint_seeking_magenta` | 650 |  |
| `explosive_paint_seeking_orange` | 649 |  |
| `explosive_paint_seeking_pink` | 648 |  |
| `explosive_paint_seeking_purple` | 647 |  |
| `explosive_paint_seeking_red` | 646 |  |
| `explosive_paint_seeking_white` | 645 |  |
| `explosive_paint_seeking_yellow` | 644 |  |
| `explosive_paint_sticky_black` | 675 |  |
| `explosive_paint_sticky_blue` | 674 |  |
| `explosive_paint_sticky_brown` | 673 |  |
| `explosive_paint_sticky_cyan` | 672 |  |
| `explosive_paint_sticky_gray` | 671 |  |
| `explosive_paint_sticky_green` | 670 |  |
| `explosive_paint_sticky_light_blue` | 669 |  |
| `explosive_paint_sticky_light_gray` | 668 |  |
| `explosive_paint_sticky_lime` | 667 |  |
| `explosive_paint_sticky_magenta` | 666 |  |
| `explosive_paint_sticky_orange` | 665 |  |
| `explosive_paint_sticky_pink` | 664 |  |
| `explosive_paint_sticky_purple` | 663 |  |
| `explosive_paint_sticky_red` | 662 |  |
| `explosive_paint_sticky_white` | 661 |  |
| `explosive_paint_sticky_yellow` | 660 |  |
| `explosive_paint_white_side` | 598 |  |
| `explosive_paint_white_top` | 599 |  |
| `explosive_paint_yellow_side` | 596 |  |
| `explosive_paint_yellow_top` | 597 |  |
| `extra_compressed_messy_stone` | 531 |  |
| `fallen_cherry_leaves_side` | 586 |  |
| `fallen_maple_leaves_side` | 478 |  |
| `farmland` | 433 |  |
| `fast_belt_slab_side` | 1157 |  |
| `fast_belt_top` | 1156 |  |
| `fast_belt_turn_left` | 1173 |  |
| `fast_belt_turn_right` | 1174 |  |
| `fertilised_soil` | 926 |  |
| `finish_block` | 812 |  |
| `fireball_block` | 539 |  |
| `food_lucky_block` | 1007 |  |
| `food_lucky_block_rare` | 1009 |  |
| `food_lucky_block_super` | 1011 |  |
| `forge_hopper_top` | 1168 |  |
| `furnace_front` | 335 |  |
| `furnace_side` | 336 |  |
| `furnace_top` | 337 |  |
| `generator_side` | 1063 |  |
| `generator_side_running` | 30 | animated (4 frames) |
| `generator_top` | 1064 |  |
| `ghost_chest_back` | 956 |  |
| `ghost_chest_front` | 953 |  |
| `ghost_chest_side` | 954 |  |
| `ghost_chest_top` | 955 |  |
| `ghost_lucky_block` | 957 |  |
| `ghost_mystery_block` | 958 |  |
| `glass` | 294 |  |
| `glass_black` | 295 |  |
| `glass_blue` | 296 |  |
| `glass_brown` | 297 |  |
| `glass_cyan` | 298 |  |
| `glass_gray` | 299 |  |
| `glass_green` | 301 |  |
| `glass_light_blue` | 302 |  |
| `glass_light_gray` | 300 |  |
| `glass_lime` | 303 |  |
| `glass_magenta` | 304 |  |
| `glass_orange` | 305 |  |
| `glass_pink` | 306 |  |
| `glass_purple` | 307 |  |
| `glass_red` | 308 |  |
| `glass_silver` | 311 |  |
| `glass_white` | 309 |  |
| `glass_yellow` | 310 |  |
| `glowstone` | 331 |  |
| `gold_block` | 235 |  |
| `gold_deposit` | 1036 |  |
| `gold_ore` | 229 |  |
| `granite_brick` | 467 |  |
| `grass_block_side` | 192 |  |
| `grass_top` | 193 |  |
| `gravel` | 196 |  |
| `gray_concrete` | 271 |  |
| `gray_gen_spawn_coal` | 792 |  |
| `gray_gen_spawn_iron` | 793 |  |
| `gray_gen_spawn_top` | 791 |  |
| `gray_glazed_terracotta` | 397 | turned (4 rotated copies) |
| `gray_planks` | 358 |  |
| `gray_portal` | 6 | animated (4 frames) |
| `gray_spawn_block_side` | 740 |  |
| `gray_spawn_block_top` | 736 | turned (4 rotated copies) |
| `green_bricks` | 459 |  |
| `green_concrete` | 285 |  |
| `green_glazed_terracotta` | 421 | turned (4 rotated copies) |
| `green_lucky_block` | 1006 |  |
| `green_lucky_block_rare` | 1008 |  |
| `green_lucky_block_super` | 1010 |  |
| `green_planks` | 364 |  |
| `green_portal` | 7 | animated (4 frames) |
| `green_spawn_block_side` | 735 |  |
| `green_spawn_block_top` | 731 | turned (4 rotated copies) |
| `green_stone` | 458 |  |
| `grenade_block` | 581 |  |
| `grey_portal` | 8 | animated (4 frames) |
| `gun_lucky_block` | 952 |  |
| `hardened_clay` | 254 |  |
| `hardened_clay_stained_black` | 270 |  |
| `hardened_clay_stained_blue` | 266 |  |
| `hardened_clay_stained_brown` | 267 |  |
| `hardened_clay_stained_cyan` | 264 |  |
| `hardened_clay_stained_gray` | 262 |  |
| `hardened_clay_stained_green` | 268 |  |
| `hardened_clay_stained_light_blue` | 258 |  |
| `hardened_clay_stained_lime` | 260 |  |
| `hardened_clay_stained_magenta` | 257 |  |
| `hardened_clay_stained_orange` | 256 |  |
| `hardened_clay_stained_pink` | 261 |  |
| `hardened_clay_stained_purple` | 265 |  |
| `hardened_clay_stained_red` | 269 |  |
| `hardened_clay_stained_silver` | 263 |  |
| `hardened_clay_stained_white` | 255 |  |
| `hardened_clay_stained_yellow` | 259 |  |
| `harvester_bottom` | 969 |  |
| `harvester_lunite_bottom` | 977 |  |
| `harvester_lunite_side_0` | 974 |  |
| `harvester_lunite_side_1` | 975 |  |
| `harvester_lunite_top` | 976 |  |
| `harvester_side0` | 966 |  |
| `harvester_side1` | 967 |  |
| `harvester_top` | 968 |  |
| `hay_block_side` | 328 |  |
| `homestead_core` | 1037 |  |
| `homestead_core_cap` | 1122 |  |
| `homestead_core_crown` | 1121 |  |
| `homestead_core_mid` | 26 | animated (4 frames) |
| `hyper_compressed_messy_stone` | 533 |  |
| `ice` | 326 |  |
| `ice_brick` | 468 |  |
| `iceball_block` | 540 |  |
| `invisible_solid` | 314 |  |
| `iron_block` | 234 |  |
| `iron_chest_back` | 917 |  |
| `iron_chest_front` | 911 |  |
| `iron_chest_side` | 912 |  |
| `iron_chest_top` | 913 | turned (4 rotated copies) |
| `iron_deposit` | 1033 |  |
| `iron_ore` | 228 |  |
| `iron_watermelon_side` | 546 |  |
| `iron_watermelon_top` | 547 |  |
| `jungle_grass_block` | 889 |  |
| `jungle_grass_block_side` | 888 |  |
| `lapis_block` | 236 |  |
| `lapis_ore` | 230 |  |
| `lava` | 1 | animated (8 frames) |
| `leather_block_side` | 908 |  |
| `leather_block_top` | 909 |  |
| `leaves_aspen` | 288 |  |
| `leaves_aspen_autumn` | 910 |  |
| `leaves_cedar` | 470 |  |
| `leaves_cherry` | 585 |  |
| `leaves_cherry_fruity` | 906 |  |
| `leaves_jungle` | 290 |  |
| `leaves_mango` | 894 |  |
| `leaves_mango_fruity` | 907 |  |
| `leaves_maple` | 289 |  |
| `leaves_maple_autumn` | 477 |  |
| `leaves_maple_fruity` | 901 |  |
| `leaves_palm` | 471 |  |
| `leaves_palm_fruity` | 904 |  |
| `leaves_pear` | 525 |  |
| `leaves_pear_fruity` | 905 |  |
| `leaves_pine` | 287 |  |
| `leaves_pine_cone` | 902 |  |
| `leaves_plum` | 469 |  |
| `leaves_plum_fruity` | 903 |  |
| `leaves_spectral` | 831 |  |
| `light_blue_concrete` | 277 |  |
| `light_blue_glazed_terracotta` | 381 | turned (4 rotated copies) |
| `light_blue_lucky_block` | 933 |  |
| `light_blue_planks` | 354 |  |
| `light_blue_spawn_block_side` | 730 |  |
| `light_blue_spawn_block_top` | 726 | turned (4 rotated copies) |
| `light_gray_concrete` | 272 |  |
| `light_gray_glazed_terracotta` | 401 | turned (4 rotated copies) |
| `light_gray_planks` | 359 |  |
| `light_gray_spawn_block_side` | 725 |  |
| `light_gray_spawn_block_top` | 721 | turned (4 rotated copies) |
| `lightblue_portal` | 9 | animated (4 frames) |
| `lightgray_portal` | 10 | animated (4 frames) |
| `lime_concrete` | 278 |  |
| `lime_gen_spawn_coal` | 777 |  |
| `lime_gen_spawn_iron` | 778 |  |
| `lime_gen_spawn_top` | 776 |  |
| `lime_glazed_terracotta` | 389 | turned (4 rotated copies) |
| `lime_planks` | 356 |  |
| `lime_portal` | 11 | animated (4 frames) |
| `lime_spawn_block_side` | 720 |  |
| `lime_spawn_block_top` | 716 | turned (4 rotated copies) |
| `log_ancient_maple` | 1021 |  |
| `log_aspen` | 202 |  |
| `log_cedar` | 201 |  |
| `log_cherry` | 582 |  |
| `log_jungle` | 203 |  |
| `log_mango` | 891 |  |
| `log_maple` | 198 |  |
| `log_palm` | 472 |  |
| `log_pear` | 523 |  |
| `log_pine` | 199 |  |
| `log_plum` | 200 |  |
| `log_spectral` | 828 |  |
| `lucky_block_pink_question` | 959 |  |
| `lucky_block_pink_question_rare` | 1013 |  |
| `lucky_block_pink_question_super` | 1015 |  |
| `lunite_block` | 971 |  |
| `lunite_ore` | 970 |  |
| `machine_bench_side` | 1115 |  |
| `machine_bench_top` | 1116 |  |
| `machine_side` | 1039 |  |
| `magenta_concrete` | 279 |  |
| `magenta_glazed_terracotta` | 377 | turned (4 rotated copies) |
| `magenta_planks` | 353 |  |
| `magenta_portal` | 12 | animated (4 frames) |
| `magenta_spawn_block_side` | 715 |  |
| `magenta_spawn_block_top` | 711 | turned (4 rotated copies) |
| `magma` | 451 |  |
| `mailbox_front` | 571 |  |
| `mailbox_front_full` | 573 |  |
| `mailbox_side` | 572 |  |
| `mango_block_bottom` | 898 |  |
| `mango_block_side` | 896 |  |
| `mango_block_top` | 897 |  |
| `mega_compressed_messy_stone` | 535 |  |
| `melon_side` | 544 |  |
| `melon_top` | 545 |  |
| `melting_ice` | 595 |  |
| `messy_stone` | 216 |  |
| `mob_spawner_block_empty_side` | 823 |  |
| `mob_spawner_block_top` | 821 |  |
| `mob_spawner_hostile_block_side` | 822 |  |
| `mob_spawner_neutral_block_side` | 838 |  |
| `mob_spawner_passive_block_side` | 820 |  |
| `moonstone_block` | 450 |  |
| `moonstone_chest_back` | 449 |  |
| `moonstone_chest_front` | 443 |  |
| `moonstone_chest_side` | 444 |  |
| `moonstone_chest_top` | 445 | turned (4 rotated copies) |
| `moonstone_explosive_side` | 332 |  |
| `moonstone_explosive_top` | 333 |  |
| `moonstone_gen_spawn_side` | 809 |  |
| `moonstone_gen_spawn_top` | 808 |  |
| `moonstone_ore` | 442 |  |
| `mossy_cobblestone` | 438 |  |
| `mushroom_stem` | 538 |  |
| `mystery_block` | 578 |  |
| `neon_black` | 951 |  |
| `neon_blue` | 950 |  |
| `neon_brown` | 949 |  |
| `neon_cyan` | 948 |  |
| `neon_gray` | 947 |  |
| `neon_green` | 946 |  |
| `neon_light_blue` | 945 |  |
| `neon_light_gray` | 944 |  |
| `neon_lime` | 943 |  |
| `neon_magenta` | 942 |  |
| `neon_orange` | 941 |  |
| `neon_pink` | 940 |  |
| `neon_purple` | 939 |  |
| `neon_red` | 938 |  |
| `neon_white` | 937 |  |
| `neon_yellow` | 936 |  |
| `nether_brick` | 317 |  |
| `netherrack` | 318 |  |
| `obby_absorb_block` | 816 |  |
| `obby_absorb_death_block` | 817 |  |
| `obby_death_block` | 815 |  |
| `obsidian` | 327 |  |
| `orange_concrete` | 280 |  |
| `orange_glazed_terracotta` | 373 | turned (4 rotated copies) |
| `orange_lucky_block` | 1000 |  |
| `orange_lucky_block_rare` | 1002 |  |
| `orange_lucky_block_super` | 1004 |  |
| `orange_planks` | 352 |  |
| `orange_portal` | 13 | animated (4 frames) |
| `orange_spawn_block_side` | 710 |  |
| `orange_spawn_block_top` | 706 | turned (4 rotated copies) |
| `ore_gen_spawn_side` | 811 |  |
| `ore_gen_spawn_top` | 810 |  |
| `packed_snow` | 826 |  |
| `parts_bench_side` | 1117 |  |
| `parts_bench_top` | 1118 |  |
| `patterned_glass_black` | 548 |  |
| `patterned_glass_blue` | 549 |  |
| `patterned_glass_brown` | 550 |  |
| `patterned_glass_cyan` | 551 |  |
| `patterned_glass_gray` | 552 |  |
| `patterned_glass_green` | 554 |  |
| `patterned_glass_light_blue` | 555 |  |
| `patterned_glass_light_gray` | 553 |  |
| `patterned_glass_lime` | 556 |  |
| `patterned_glass_magenta` | 557 |  |
| `patterned_glass_orange` | 558 |  |
| `patterned_glass_pink` | 559 |  |
| `patterned_glass_purple` | 560 |  |
| `patterned_glass_red` | 561 |  |
| `patterned_glass_white` | 562 |  |
| `patterned_glass_yellow` | 563 |  |
| `pear_block_bottom` | 529 |  |
| `pear_block_side` | 527 |  |
| `pear_block_top` | 528 |  |
| `pet_lucky_block` | 960 |  |
| `pine_cone_block_side` | 836 |  |
| `pine_cone_block_top` | 837 |  |
| `pine_grass_block` | 834 |  |
| `pine_grass_block_side` | 833 |  |
| `pink_concrete` | 281 |  |
| `pink_gen_spawn_coal` | 789 |  |
| `pink_gen_spawn_iron` | 790 |  |
| `pink_gen_spawn_top` | 788 |  |
| `pink_glazed_terracotta` | 393 | turned (4 rotated copies) |
| `pink_planks` | 357 |  |
| `pink_portal` | 14 | animated (4 frames) |
| `pink_spawn_block_side` | 705 |  |
| `pink_spawn_block_top` | 701 | turned (4 rotated copies) |
| `planks_aspen` | 205 |  |
| `planks_cedar` | 209 |  |
| `planks_cherry` | 584 |  |
| `planks_jungle` | 207 |  |
| `planks_mango` | 893 |  |
| `planks_maple` | 204 |  |
| `planks_palm` | 473 |  |
| `planks_pear` | 524 |  |
| `planks_pine` | 208 |  |
| `planks_plum` | 206 |  |
| `planks_spectral` | 830 |  |
| `plum_block_bottom` | 519 |  |
| `plum_block_side` | 517 |  |
| `plum_block_top` | 518 |  |
| `podzol_top` | 452 |  |
| `potato_block` | 922 |  |
| `potion_lucky_block` | 1012 |  |
| `potion_lucky_block_rare` | 1014 |  |
| `potion_lucky_block_super` | 1016 |  |
| `press_back` | 1071 |  |
| `press_front` | 1065 |  |
| `press_side` | 1066 |  |
| `press_side_running` | 31 | animated (4 frames) |
| `press_top` | 1067 | turned (4 rotated copies) |
| `protector` | 348 |  |
| `protector_faction` | 575 |  |
| `protector_tribe` | 574 |  |
| `pumpkin_face_on` | 291 |  |
| `pumpkin_side` | 541 |  |
| `pumpkin_top` | 542 |  |
| `pure_coal_ore` | 1024 |  |
| `pure_copper_ore` | 1204 |  |
| `pure_diamond_ore` | 1027 |  |
| `pure_gold_ore` | 1026 |  |
| `pure_iron_ore` | 1025 |  |
| `pure_moonstone_ore` | 1028 |  |
| `pure_voltite_ore` | 1205 |  |
| `purple_concrete` | 282 |  |
| `purple_glazed_terracotta` | 409 | turned (4 rotated copies) |
| `purple_lucky_block` | 988 |  |
| `purple_lucky_block_rare` | 990 |  |
| `purple_lucky_block_super` | 992 |  |
| `purple_planks` | 361 |  |
| `purple_portal` | 15 | animated (4 frames) |
| `purple_spawn_block_side` | 700 |  |
| `purple_spawn_block_top` | 696 | turned (4 rotated copies) |
| `quartz_block_chiseled` | 320 |  |
| `quartz_block_side` | 319 |  |
| `radar_bottom` | 929 |  |
| `radar_screen` | 19 | animated (4 frames) · turned (4 rotated copies) |
| `radar_side_active` | 927 |  |
| `radar_side_inactive` | 930 |  |
| `radar_top_active` | 928 |  |
| `radar_top_inactive` | 931 |  |
| `recycler_back` | 1181 |  |
| `recycler_front` | 1175 |  |
| `recycler_side` | 1176 |  |
| `recycler_side_running` | 43 | animated (4 frames) |
| `recycler_top` | 1177 | turned (4 rotated copies) |
| `red_concrete` | 283 |  |
| `red_gen_spawn_coal` | 771 |  |
| `red_gen_spawn_iron` | 772 |  |
| `red_gen_spawn_top` | 770 |  |
| `red_glazed_terracotta` | 425 | turned (4 rotated copies) |
| `red_lucky_block` | 934 |  |
| `red_lucky_block_rare` | 984 |  |
| `red_lucky_block_super` | 986 |  |
| `red_mushroom_block` | 537 |  |
| `red_planks` | 365 |  |
| `red_portal` | 16 | animated (4 frames) |
| `red_sand` | 474 |  |
| `red_sandstone` | 454 |  |
| `red_sandstone_brick` | 475 |  |
| `red_sandstone_top` | 455 |  |
| `red_spawn_block_side` | 695 |  |
| `red_spawn_block_top` | 691 | turned (4 rotated copies) |
| `redstone_lamp_off` | 313 |  |
| `redstone_lamp_on` | 312 |  |
| `rocket_block` | 579 |  |
| `rocky_dirt` | 476 |  |
| `rope_block` | 1030 |  |
| `sand` | 194 |  |
| `sandstone_brick` | 461 |  |
| `sandstone_normal` | 225 |  |
| `sandstone_top` | 324 |  |
| `shatter_mill_back` | 1147 |  |
| `shatter_mill_front` | 1141 |  |
| `shatter_mill_side` | 1142 |  |
| `shatter_mill_side_running` | 40 | animated (4 frames) |
| `shatter_mill_top` | 1143 | turned (4 rotated copies) |
| `shop_trader_spawn_face` | 799 |  |
| `shop_trader_spawn_side` | 798 |  |
| `shop_trader_spawn_top` | 794 | turned (4 rotated copies) |
| `shop_wizard_spawn_face` | 805 |  |
| `shop_wizard_spawn_side` | 804 |  |
| `shop_wizard_spawn_top` | 800 | turned (4 rotated copies) |
| `sky_tap_back` | 1155 |  |
| `sky_tap_bottom` | 1154 |  |
| `sky_tap_front` | 1148 |  |
| `sky_tap_side` | 1149 |  |
| `sky_tap_side_running` | 41 | animated (4 frames) |
| `sky_tap_top` | 1150 | turned (4 rotated copies) |
| `slab_andesite_brick_side` | 498 |  |
| `slab_aspen_side` | 483 |  |
| `slab_brick_side` | 515 |  |
| `slab_cedar_side` | 482 |  |
| `slab_cherry_side` | 587 |  |
| `slab_chiseled_red_sandstone_side` | 512 |  |
| `slab_chiseled_sandstone_side` | 508 |  |
| `slab_cobblestone_side` | 488 |  |
| `slab_cut_red_sandstone_side` | 513 |  |
| `slab_cut_sandstone_side` | 509 |  |
| `slab_diorite_brick_side` | 502 |  |
| `slab_dirt_side` | 486 |  |
| `slab_dry_grass_top_side` | 981 |  |
| `slab_engraved_andesite_side` | 497 |  |
| `slab_engraved_diorite_side` | 501 |  |
| `slab_engraved_granite_side` | 505 |  |
| `slab_granite_brick_side` | 506 |  |
| `slab_grass_top_side` | 487 |  |
| `slab_ice_brick_side` | 516 |  |
| `slab_jungle_grass_top_side` | 890 |  |
| `slab_jungle_side` | 484 |  |
| `slab_mango_side` | 895 |  |
| `slab_maple_side` | 479 |  |
| `slab_mossy_cobblestone_side` | 493 |  |
| `slab_palm_side` | 485 |  |
| `slab_pear_side` | 526 |  |
| `slab_pine_grass_top_side` | 835 |  |
| `slab_pine_side` | 480 |  |
| `slab_plum_side` | 481 |  |
| `slab_red_sandstone_brick_side` | 514 |  |
| `slab_red_sandstone_side` | 511 |  |
| `slab_sandstone_brick_side` | 510 |  |
| `slab_sandstone_normal_side` | 507 |  |
| `slab_smooth_stone_side` | 490 |  |
| `slab_spectral_side` | 832 |  |
| `slab_stone_andesite_side` | 495 |  |
| `slab_stone_andesite_smooth_side` | 496 |  |
| `slab_stone_diorite_side` | 499 |  |
| `slab_stone_diorite_smooth_side` | 500 |  |
| `slab_stone_granite_side` | 503 |  |
| `slab_stone_granite_smooth_side` | 504 |  |
| `slab_stone_side` | 489 |  |
| `slab_stonebrick_carved_side` | 491 |  |
| `slab_stonebrick_mossy_side` | 494 |  |
| `slab_stonebrick_side` | 492 |  |
| `smelter_back` | 1062 |  |
| `smelter_front` | 1056 |  |
| `smelter_side` | 1057 |  |
| `smelter_side_running` | 29 | animated (4 frames) |
| `smelter_top` | 1058 | turned (4 rotated copies) |
| `smoke` | 23 | animated (4 frames) |
| `smooth_stone` | 218 |  |
| `snow` | 197 |  |
| `snowy_messy_stone` | 824 |  |
| `snowy_messy_stone_side` | 825 |  |
| `solar_panel_bottom` | 965 |  |
| `solar_panel_side` | 963 |  |
| `solar_panel_top` | 964 |  |
| `sorting_gate_slab_side` | 1108 |  |
| `sorting_gate_top` | 1107 |  |
| `splitter_slab_side` | 1083 |  |
| `splitter_top` | 1082 |  |
| `sponge` | 329 |  |
| `starframe` | 1167 |  |
| `stone` | 217 |  |
| `stone_andesite` | 221 |  |
| `stone_andesite_smooth` | 222 |  |
| `stone_deposit` | 1034 |  |
| `stone_diorite` | 219 |  |
| `stone_diorite_smooth` | 220 |  |
| `stone_granite` | 223 |  |
| `stone_granite_smooth` | 224 |  |
| `stonebrick` | 316 |  |
| `stonebrick_carved` | 321 |  |
| `stonebrick_cracked` | 323 |  |
| `stonebrick_mossy` | 322 |  |
| `storage_silo_side` | 1112 |  |
| `storage_silo_top` | 1111 |  |
| `stripped_aspen_log` | 211 |  |
| `stripped_cedar_log` | 215 |  |
| `stripped_cherry_log` | 583 |  |
| `stripped_jungle_log` | 213 |  |
| `stripped_mango_log` | 892 |  |
| `stripped_maple_log` | 210 |  |
| `stripped_palm_log` | 576 |  |
| `stripped_pear_log` | 577 |  |
| `stripped_pine_log` | 214 |  |
| `stripped_plum_log` | 212 |  |
| `stripped_spectral_log` | 829 |  |
| `super_compressed_messy_stone` | 532 |  |
| `super_rocket_block` | 580 |  |
| `tool_bench_side` | 1119 |  |
| `tool_bench_top` | 1120 |  |
| `tools_lucky_block` | 1001 |  |
| `tools_lucky_block_rare` | 1003 |  |
| `tools_lucky_block_super` | 1005 |  |
| `toxic_waste` | 25 | animated (8 frames) |
| `toxic_waste_barrel_bottom` | 1020 |  |
| `toxic_waste_barrel_side` | 1019 |  |
| `toxic_waste_barrel_top` | 24 | animated (4 frames) |
| `toxin_ball_block` | 680 |  |
| `tree_cutter_back` | 1129 |  |
| `tree_cutter_back_running` | 37 | animated (4 frames) |
| `tree_cutter_front` | 1123 |  |
| `tree_cutter_side` | 1124 |  |
| `tree_cutter_side_running` | 36 | animated (4 frames) |
| `tree_cutter_top` | 1125 | turned (4 rotated copies) |
| `ultra_compressed_messy_stone` | 534 |  |
| `unloaded` | 189 |  |
| `volt_engine_side` | 1131 |  |
| `volt_engine_side_running` | 38 | animated (4 frames) |
| `volt_engine_top` | 1132 |  |
| `voltite_deposit` | 1130 |  |
| `voltite_ore` | 1084 |  |
| `watermelon_side` | 292 |  |
| `watermelon_top` | 293 |  |
| `weapon_lucky_block` | 935 |  |
| `weapon_lucky_block_rare` | 985 |  |
| `weapon_lucky_block_super` | 987 |  |
| `white_concrete` | 284 |  |
| `white_gen_spawn_coal` | 786 |  |
| `white_gen_spawn_iron` | 787 |  |
| `white_gen_spawn_top` | 785 |  |
| `white_glazed_terracotta` | 369 | turned (4 rotated copies) |
| `white_planks` | 351 |  |
| `white_portal` | 17 | animated (4 frames) |
| `white_spawn_block_side` | 690 |  |
| `white_spawn_block_top` | 686 | turned (4 rotated copies) |
| `wire_mill_back` | 1078 |  |
| `wire_mill_front` | 1072 |  |
| `wire_mill_side` | 1073 |  |
| `wire_mill_side_running` | 32 | animated (4 frames) |
| `wire_mill_top` | 1074 | turned (4 rotated copies) |
| `wool_colored_black` | 253 |  |
| `wool_colored_blue` | 249 |  |
| `wool_colored_brown` | 250 |  |
| `wool_colored_cyan` | 247 |  |
| `wool_colored_gray` | 245 |  |
| `wool_colored_green` | 251 |  |
| `wool_colored_light_blue` | 241 |  |
| `wool_colored_light_grey` | 246 |  |
| `wool_colored_lime` | 243 |  |
| `wool_colored_magenta` | 240 |  |
| `wool_colored_orange` | 239 |  |
| `wool_colored_pink` | 244 |  |
| `wool_colored_purple` | 248 |  |
| `wool_colored_red` | 252 |  |
| `wool_colored_white` | 238 |  |
| `wool_colored_yellow` | 242 |  |
| `yellow_concrete` | 286 |  |
| `yellow_gen_spawn_coal` | 780 |  |
| `yellow_gen_spawn_iron` | 781 |  |
| `yellow_gen_spawn_top` | 779 |  |
| `yellow_glazed_terracotta` | 385 | turned (4 rotated copies) |
| `yellow_lucky_block` | 932 |  |
| `yellow_lucky_block_rare` | 982 |  |
| `yellow_lucky_block_super` | 983 |  |
| `yellow_planks` | 355 |  |
| `yellow_portal` | 18 | animated (4 frames) |
| `yellow_spawn_block_side` | 685 |  |
| `yellow_spawn_block_top` | 681 | turned (4 rotated copies) |

### 68.3 旋转族（57 个根）

这些纹理只以预旋转副本（`name[rot[1..4`）形式存在；注册表将其折叠到根名，`bloxdTexel` 重新施加旋转（§57.4）。

- `alloy_kiln_top` (id 1087)
- `auto_bench_top` (id 1102)
- `belt_tunnel_exit_top` (id 1200)
- `belt_tunnel_top` (id 1195)
- `black_glazed_terracotta` (id 429)
- `black_spawn_block_top` (id 756)
- `blue_glazed_terracotta` (id 413)
- `blue_spawn_block_top` (id 751)
- `brown_glazed_terracotta` (id 417)
- `brown_spawn_block_top` (id 746)
- `burner_drill_top` (id 1043)
- `checkpoint_block` (id 761)
- `chest_top` (id 343)
- `crop_harvester_top` (id 1188)
- `crusher_top` (id 1051)
- `crystal_vat_top` (id 1162)
- `custom_lobby_block_top` (id 765)
- `cyan_glazed_terracotta` (id 405)
- `cyan_spawn_block_top` (id 741)
- `deep_drill_top` (id 1135)
- `electric_drill_top` (id 1094)
- `gray_glazed_terracotta` (id 397)
- `gray_spawn_block_top` (id 736)
- `green_glazed_terracotta` (id 421)
- `green_spawn_block_top` (id 731)
- `iron_chest_top` (id 913)
- `light_blue_glazed_terracotta` (id 381)
- `light_blue_spawn_block_top` (id 726)
- `light_gray_glazed_terracotta` (id 401)
- `light_gray_spawn_block_top` (id 721)
- `lime_glazed_terracotta` (id 389)
- `lime_spawn_block_top` (id 716)
- `magenta_glazed_terracotta` (id 377)
- `magenta_spawn_block_top` (id 711)
- `moonstone_chest_top` (id 445)
- `orange_glazed_terracotta` (id 373)
- `orange_spawn_block_top` (id 706)
- `pink_glazed_terracotta` (id 393)
- `pink_spawn_block_top` (id 701)
- `press_top` (id 1067)
- `purple_glazed_terracotta` (id 409)
- `purple_spawn_block_top` (id 696)
- `radar_screen0` (id 19) · also animated
- `recycler_top` (id 1177)
- `red_glazed_terracotta` (id 425)
- `red_spawn_block_top` (id 691)
- `shatter_mill_top` (id 1143)
- `shop_trader_spawn_top` (id 794)
- `shop_wizard_spawn_top` (id 800)
- `sky_tap_top` (id 1150)
- `smelter_top` (id 1058)
- `tree_cutter_top` (id 1125)
- `white_glazed_terracotta` (id 369)
- `white_spawn_block_top` (id 686)
- `wire_mill_top` (id 1074)
- `yellow_glazed_terracotta` (id 385)
- `yellow_spawn_block_top` (id 681)

### 68.4 动画族（42 个名称）

采样这些名称会自动返回当前动画帧（§63.3）—— 帧后缀是错误写法。

间隔按族固定,并在 `cnty9` 上实测——只有三个值: **200 ms** (`lava`、`toxic_waste`、`radar_screen`)、**250 ms** (`smoke`、`homestead_core_mid`、全部机器 `*_running` 族)、**300 ms** (十七种传送门与 `toxic_waste_barrel_top`);见“间隔”列。另外,图集保存的动画根是 45 个而非 42 个:`radar_screen` 的四个预旋转副本各自携带自己的 4 帧梯。

| 名称 | 帧数 | 间隔 | 注册表基准 |
|---|---|---|---|
| `lava` | 8 | 200 ms | `lava0` |
| `toxic_waste` | 8 | 200 ms | `toxic_waste0` |
| `alloy_kiln_side_running` | 4 | 250 ms | `alloy_kiln_side_running0` |
| `auto_bench_side_running` | 4 | 250 ms | `auto_bench_side_running0` |
| `black_portal` | 4 | 300 ms | `black_portal0` |
| `blue_portal` | 4 | 300 ms | `blue_portal0` |
| `brown_portal` | 4 | 300 ms | `brown_portal0` |
| `burner_drill_side_running` | 4 | 250 ms | `burner_drill_side_running0` |
| `crop_harvester_back_running` | 4 | 250 ms | `crop_harvester_back_running0` |
| `crop_harvester_side_running` | 4 | 250 ms | `crop_harvester_side_running0` |
| `crusher_side_running` | 4 | 250 ms | `crusher_side_running0` |
| `crystal_vat_side_running` | 4 | 250 ms | `crystal_vat_side_running0` |
| `cyan_portal` | 4 | 300 ms | `cyan_portal0` |
| `deep_drill_side_running` | 4 | 250 ms | `deep_drill_side_running0` |
| `electric_drill_side_running` | 4 | 250 ms | `electric_drill_side_running0` |
| `generator_side_running` | 4 | 250 ms | `generator_side_running0` |
| `gray_portal` | 4 | 300 ms | `gray_portal0` |
| `green_portal` | 4 | 300 ms | `green_portal0` |
| `grey_portal` | 4 | 300 ms | `grey_portal0` |
| `homestead_core_mid` | 4 | 250 ms | `homestead_core_mid0` |
| `lightblue_portal` | 4 | 300 ms | `lightblue_portal0` |
| `lightgray_portal` | 4 | 300 ms | `lightgray_portal0` |
| `lime_portal` | 4 | 300 ms | `lime_portal0` |
| `magenta_portal` | 4 | 300 ms | `magenta_portal0` |
| `orange_portal` | 4 | 300 ms | `orange_portal0` |
| `pink_portal` | 4 | 300 ms | `pink_portal0` |
| `press_side_running` | 4 | 250 ms | `press_side_running0` |
| `purple_portal` | 4 | 300 ms | `purple_portal0` |
| `radar_screen` | 4 | 200 ms | `radar_screen0[rot[1` |
| `recycler_side_running` | 4 | 250 ms | `recycler_side_running0` |
| `red_portal` | 4 | 300 ms | `red_portal0` |
| `shatter_mill_side_running` | 4 | 250 ms | `shatter_mill_side_running0` |
| `sky_tap_side_running` | 4 | 250 ms | `sky_tap_side_running0` |
| `smelter_side_running` | 4 | 250 ms | `smelter_side_running0` |
| `smoke` | 4 | 250 ms | `smoke0` |
| `toxic_waste_barrel_top` | 4 | 300 ms | `toxic_waste_barrel_top0` |
| `tree_cutter_back_running` | 4 | 250 ms | `tree_cutter_back_running0` |
| `tree_cutter_side_running` | 4 | 250 ms | `tree_cutter_side_running0` |
| `volt_engine_side_running` | 4 | 250 ms | `volt_engine_side_running0` |
| `white_portal` | 4 | 300 ms | `white_portal0` |
| `wire_mill_side_running` | 4 | 250 ms | `wire_mill_side_running0` |
| `yellow_portal` | 4 | 300 ms | `yellow_portal0` |

### 68.5 注册表漂移实测（sjr0p7 → cnty9）

十月实测的两个构建，相隔十天：

- Entries: 1,200 → 1,219 (98 added, 79 removed)
- Names that kept their spelling: 1,121 — of which **779 changed id** (69%)
- A naming convention migrated mid-month: 68 `_rot1..4` suffix names became `[rot[1..4` slots, and the double-chest textures (`chest_double_*`, 8 entries) appeared with them
- The usable-name count moved 900 → 905, and the registry hash in `HEADER_VERSION` (§65.1) re-invalidated every saved pack that had baked ids

Write `bloxdTextureIdLava`, not `19` — a name-constant survives every one of those bullets unchanged.

### 68.6 漂移完整清单 (新增 98,移除 79)

把 §68.5 的汇总数字逐名写全——因为更新十月纹理包的作者需要确切知道哪些文件名不再匹配。这里比较的是*拼写*层(纹理包使用的文件名);§64 的折叠规则把这些拼写变成 §68.2 的可用常量。

**旋转折叠迁移——17 种机器顶面 (移出 68 个拼写,移入 68 个槽位)。** `alloy_kiln_top`, `auto_bench_top`, `belt_tunnel_exit_top`, `belt_tunnel_top`, `burner_drill_top`, `crop_harvester_top`, `crusher_top`, `crystal_vat_top`, `deep_drill_top`, `electric_drill_top`, `press_top`, `recycler_top`, `shatter_mill_top`, `sky_tap_top`, `smelter_top`, `tree_cutter_top`, `wire_mill_top` 从 `_rot1..4` 变体拼写迁移到 `[rot[1..4` 预旋转槽位;折叠后的根就是可用名称,因此纹理包现在只需附带一个 `X_top.png`,而不是四个 `X_top_rotN.png` 文件。

**箱子顶面折叠——3 族 (移出 6 个拼写,移入 12 个槽位)。** `chest_top_1`/`chest_top_2` → `chest_top`、`iron_chest_top_1`/`_2` → `iron_chest_top`、`moonstone_chest_top_1`/`_2` → `moonstone_chest_top`:双变体拼写变成了根下的预旋转槽位——请相应重命名 PNG 文件。

**新纹理——17 个名称。** 双人箱子 (`chest_double_back_hi`/`_lo`、`chest_double_front_hi`/`_lo`、`chest_double_top_1_hi`/`_lo`、`chest_double_top_2_hi`/`_lo`)、暗石族 (`darkstone`、`darkstone_bricks`、`darkstone_bricks_cracked`、`darkstone_bricks_lava`、`darkstone_engraved`、`darkstone_smooth`)、`pure_copper_ore`、`pure_voltite_ore` 以及 `forge_hopper_top`。

**一次普通折叠。** `ghost_chest_top_1`/`ghost_chest_top_2` 合并为单一的 `ghost_chest_top`。

**彻底移除——3 个名称。** `shaft_hopper_top`、`sun_panel_side`、`sun_panel_top` 在新注册表中没有后继拼写——这些内容随该构建离开了游戏。`forge_hopper_top` 是真正的新纹理,并非经过证实的改名。

供核验的原始拼写差异:

```text
+ 98 added (cnty9):
alloy_kiln_top[rot[1, alloy_kiln_top[rot[2, alloy_kiln_top[rot[3, alloy_kiln_top[rot[4, auto_bench_top[rot[1, auto_bench_top[rot[2
auto_bench_top[rot[3, auto_bench_top[rot[4, belt_tunnel_exit_top[rot[1, belt_tunnel_exit_top[rot[2, belt_tunnel_exit_top[rot[3, belt_tunnel_exit_top[rot[4
belt_tunnel_top[rot[1, belt_tunnel_top[rot[2, belt_tunnel_top[rot[3, belt_tunnel_top[rot[4, burner_drill_top[rot[1, burner_drill_top[rot[2
burner_drill_top[rot[3, burner_drill_top[rot[4, chest_double_back_hi, chest_double_back_lo, chest_double_front_hi, chest_double_front_lo
chest_double_top_1_hi, chest_double_top_1_lo, chest_double_top_2_hi, chest_double_top_2_lo, chest_top[rot[1, chest_top[rot[2
chest_top[rot[3, chest_top[rot[4, crop_harvester_top[rot[1, crop_harvester_top[rot[2, crop_harvester_top[rot[3, crop_harvester_top[rot[4
crusher_top[rot[1, crusher_top[rot[2, crusher_top[rot[3, crusher_top[rot[4, crystal_vat_top[rot[1, crystal_vat_top[rot[2
crystal_vat_top[rot[3, crystal_vat_top[rot[4, darkstone, darkstone_bricks, darkstone_bricks_cracked, darkstone_bricks_lava
darkstone_engraved, darkstone_smooth, deep_drill_top[rot[1, deep_drill_top[rot[2, deep_drill_top[rot[3, deep_drill_top[rot[4
electric_drill_top[rot[1, electric_drill_top[rot[2, electric_drill_top[rot[3, electric_drill_top[rot[4, forge_hopper_top, ghost_chest_top
iron_chest_top[rot[1, iron_chest_top[rot[2, iron_chest_top[rot[3, iron_chest_top[rot[4, moonstone_chest_top[rot[1, moonstone_chest_top[rot[2
moonstone_chest_top[rot[3, moonstone_chest_top[rot[4, press_top[rot[1, press_top[rot[2, press_top[rot[3, press_top[rot[4
pure_copper_ore, pure_voltite_ore, recycler_top[rot[1, recycler_top[rot[2, recycler_top[rot[3, recycler_top[rot[4
shatter_mill_top[rot[1, shatter_mill_top[rot[2, shatter_mill_top[rot[3, shatter_mill_top[rot[4, sky_tap_top[rot[1, sky_tap_top[rot[2
sky_tap_top[rot[3, sky_tap_top[rot[4, smelter_top[rot[1, smelter_top[rot[2, smelter_top[rot[3, smelter_top[rot[4
tree_cutter_top[rot[1, tree_cutter_top[rot[2, tree_cutter_top[rot[3, tree_cutter_top[rot[4, wire_mill_top[rot[1, wire_mill_top[rot[2
wire_mill_top[rot[3, wire_mill_top[rot[4

- 79 removed (sjr0p7):
alloy_kiln_top_rot1, alloy_kiln_top_rot2, alloy_kiln_top_rot3, alloy_kiln_top_rot4, auto_bench_top_rot1, auto_bench_top_rot2
auto_bench_top_rot3, auto_bench_top_rot4, belt_tunnel_exit_top_rot1, belt_tunnel_exit_top_rot2, belt_tunnel_exit_top_rot3, belt_tunnel_exit_top_rot4
belt_tunnel_top_rot1, belt_tunnel_top_rot2, belt_tunnel_top_rot3, belt_tunnel_top_rot4, burner_drill_top_rot1, burner_drill_top_rot2
burner_drill_top_rot3, burner_drill_top_rot4, chest_top_1, chest_top_2, crop_harvester_top_rot1, crop_harvester_top_rot2
crop_harvester_top_rot3, crop_harvester_top_rot4, crusher_top_rot1, crusher_top_rot2, crusher_top_rot3, crusher_top_rot4
crystal_vat_top_rot1, crystal_vat_top_rot2, crystal_vat_top_rot3, crystal_vat_top_rot4, deep_drill_top_rot1, deep_drill_top_rot2
deep_drill_top_rot3, deep_drill_top_rot4, electric_drill_top_rot1, electric_drill_top_rot2, electric_drill_top_rot3, electric_drill_top_rot4
ghost_chest_top_1, ghost_chest_top_2, iron_chest_top_1, iron_chest_top_2, moonstone_chest_top_1, moonstone_chest_top_2
press_top_rot1, press_top_rot2, press_top_rot3, press_top_rot4, recycler_top_rot1, recycler_top_rot2
recycler_top_rot3, recycler_top_rot4, shaft_hopper_top, shatter_mill_top_rot1, shatter_mill_top_rot2, shatter_mill_top_rot3
shatter_mill_top_rot4, sky_tap_top_rot1, sky_tap_top_rot2, sky_tap_top_rot3, sky_tap_top_rot4, smelter_top_rot1
smelter_top_rot2, smelter_top_rot3, smelter_top_rot4, sun_panel_side, sun_panel_top, tree_cutter_top_rot1
tree_cutter_top_rot2, tree_cutter_top_rot3, tree_cutter_top_rot4, wire_mill_top_rot1, wire_mill_top_rot2, wire_mill_top_rot3
wire_mill_top_rot4
```


[← 上一部分](10-apiv4.md)·[返回手册](README.md)
