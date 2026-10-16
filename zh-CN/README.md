# Bloxd.io 着色器包制作方法 (完整版)

自包含的 Bloxd.io 着色器包 (仅 WebGPU 渲染器) 制作与分发指南。
基于 `apiVersion: 2` 的规范。包含配方集与 API 参考，仅凭本文件即可从零走到分发。v1 包在现行游戏中无法加载 (v1 的 `apiVersion` 值与旧标识符会被拒绝)。v1 迁移见第八部分。

> 本书为非官方指南，不代表开发者的官方立场。API 可能随时变更。  
> 最后检查: 2026-10-15 (雾应用顺序、实际雾设置、水中渲染构造对照渲染器实现更新)。未能找到公开的官方 WGSL API 参考，API 说明与配方请持续以加载界面与游戏内编译为准。  
> 着色器包功能本身是游戏内 UI 可加载的官方功能，包为纯 WGSL  
> (无 JS 执行、无网络通信)，正常代码不会发生危险。  
> 本指南在 AI 协助下创建，不保证准确性。请以实际游戏表现为准。

## 目录

- [第一部分: 制作包](#第一部分-制作包)
- [第二部分: API 参考](#第二部分-api-参考)
- [第三部分: 配方集](recipes.md)
- [第四部分: 写实化指南](#第四部分-写实化指南)
- [第五部分: 故障排除与注意事项](#第五部分-故障排除与注意事项)
- [第六部分: 重要的实现补充](#第六部分-重要的实现补充)
- [第七部分: 内部规格的补充](#第七部分-内部规格的补充)
- [第八部分: API Version 2 迁移指南](#第八部分-api-version-2-迁移指南)

---

# 第一部分: 制作包

## 1. 概述与前提

- 着色器包**仅用于 WebGPU 渲染器**。安装包期间，设置中的 WebGPU 渲染器会被强制开启
- 包使用 **受限 WGSL 子集**编写。仅影响**地形 (terrain) 与液体 (liquid)** 的外观
- 能做的事: 修改颜色、透明度与自发光；重建光照；投影风格阴影 (R9.12)；顶点动画 (仅部分游戏)
- 不能做的事: 添加/采样纹理、后处理 (泛光等)、随太阳旋转的像素级阴影 (阴影贴图) 与真实反射 (SSR)、影响天空与实体
- 能做 (但容易被忽视) 的事: **使用 `skyLight` (体素天空遮蔽) 的投影风格阴影** — 可明显压暗树下与屋檐下 (R9.12)。破坏方块会使 LightEngine 立即重算，阴影实时跟随
- **大多数游戏为严格 (strict) 模式** (无顶点动画、无 `discard`)。面向公开发布的包应按严格模式设计

## 2. 最短步骤

1. 新建文件夹，放入 `pack.json` 与 `.wgsl` 文件
2. 从游戏设置 → Shader Pack 加载 zip 或文件夹
3. 出错则修复后重新加载 (见第五部分)
4. 在支持的游戏中测试
5. 完成后打包成 zip 分发

## 3. 包结构

- **分发形态**: 单个 `.zip`，或文件夹 (文件夹加载仅桌面浏览器)
- **内容**: 1 个 `pack.json` (位于包最顶层，大小写不敏感) + 1–256 个 `.wgsl` 文件
- 多个 `.wgsl` 会拼接为一个模块处理，因此自由拆分与分子目录。文件名无限制。非 `.wgsl` 文件 (README 等) 会被忽略
- 打包技巧: 若 zip 内所有文件位于同一公共根文件夹下，该前缀会被自动剥离 (macOS「压缩」生成的 zip 可直接使用)。但根层级混入多余文件会失去顶层判定，最稳妥的是进入文件夹内直接指定 `pack.json` 与 `.wgsl` 打包 (确认 `pack.json` 位于 ZIP 根目录)

| 项目 | 上限 |
|---|---|
| zip 大小 / 条目数 | 32MB / 1024 |
| pack.json 大小 | 64KB，UTF-8 |
| .wgsl 合计大小 | 256KB，UTF-8 |
| zip 格式 | 拒绝 zip64、分卷与加密 zip |

## 4. pack.json

```json
{
  "apiVersion": 2,
  "name": "My Pack",
  "author": "your name"
}
```

| 字段 | 必需 | 说明 |
|---|---|---|
| `apiVersion` | 必需 | 必须与 `2` 完全一致。含 `1` 的包会被 `shaderPack:loadWrongApiVersion` 拒绝 |
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
2. 确认状态。「Ready to use」即成功。出现「Saved, but it won't run until you fix these errors...」时，按错误列表 (文件:行 + 变体) 修复后重新加载
3. 重新加载页面以激活。URL 参数或 localStorage 中若残留渲染器覆盖会导致包拒绝启动，请先清除
4. 先在限制宽松的游戏中确认，再到严格游戏 (占大多数) 确认。顶点动画仅 allow 游戏有效
5. 分发时将 `pack.json` 置顶打包 (遵守第 3 章上限)。同一界面重新加载即替换包；Remove Pack 删除。游戏更新后的重验证在页面加载时自动执行

# 第二部分: API 参考

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
- `bloxdSunDirection()` 仅在太阳存在时为单位向量，无太阳的天空为零。**月亮恒为 `-bloxdSunDirection()`** (引擎将月亮位置算作太阳的严格反方向)。但默认世界太阳静止，月亮也静止，只有实现昼夜循环的世界才看得到月动 (见第七部分 §24)
- ※注：此前写成「零时不可复用为月亮方向」。方向本身经 `-bloxdSunDirection()` 可得，但分发包应以零为前提用 `sunPresent` 分支 (蓝色环境光拟似见 R2，方向性月光见第七部 R-A)。
- `emission` 在光照计算后叠加，以 **`fogVisibility` 衰减** (defaultLight 实现 `engineColour + emission × fogVisibility`。完全沉雾的远景发光也消失)
- **雾应用顺序**：片元内处理顺序为 ① 光照·发光合成 → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ light 钩子调用 → ⑤ return。因此 **engineColour 以打雾态到达**，**light 钩子返回值原样成为最终颜色** (钩子后不再重打雾)
- **fogVisibility 定义源**：视图空间距离 (按顶点计算、插值)。linear 模式 `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **fogMode == 0 时**：`fogColour` 以 `vec3f(0.0)` (黑) 到达。以 fogColour 色味推断时段的代码请注意
- **现行构建实际雾设置**：**linear 固定**。`fogStart` = 绘制区块距离、`fogEnd` = +1 区块 (仅地平线)。雾关闭设置下为 100 / 101 区块，实际无效。默认雾色 RGB(183, 191, 195)
- `bloxdPackInputs` uniform (`@group(3) @binding(0)`，64B) **仅经标头函数使用**。包不可直接引用。阶段可见性为 VERTEX|FRAGMENT，因此标头函数也可从钩子外的模块级函数与 vertex 钩子调用。深度纹理 (binding 1) 为 FRAGMENT 专用，因此 `bloxdOpaqueBehind()` 仅限 surface / light 钩子
- **`litColour` 可作起点**：v1 只有打雾后的 `engineColour`，自制大气表现容易双重打雾。v2 从打雾前、emission 前的 `litColour` 出发，经 `bloxdApplyFog()` 按自己的节奏重打雾
- **`blockId` 可区分方块种类**：不依赖纹理颜色的标识。但 ID 与方块种类的对应表在引擎内部，哪一 ID 对应何种方块只能在世界内实测 (见第八部分)
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

---

# 第四部分: 写实化指南

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
| 水下折射 | 场景色取不到。液体限定的深度 (`bloxdOpaqueBehind()`) 可做厚度吸收与底面投影 (第八部分 R-E) |
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
- 夜晚只剩受光面偏亮 → 别只压暗阴影，对完成色 (`engineColour`) 整体施加夜间衰减。保留局部灯光时用 `blockLight` / `heldLight` 减弱衰减 (第六部分 19 节)
- `pow(skyLight, γ)` 怎么也压不黑影 → `l.skyLight` 为提升后之值 (第 10 章)。切换 R9.12 逆变换 + 阈值切割
- 想调阴影面积/浓度 → 看 R9.12 调整指南 (面积=阈值 `shTh` / 边缘=`shSoft` / 影芯暗度=最低环境光与天空散射光的两点偏移)

---

# 第五部分: 故障排除与注意事项

## 17. 常见错误与修复

| 症状 | 修复 |
|---|---|
| 严格游戏加载不了 | vertex 钩子用 `#ifndef BLOXD_STRICT` 包裹 |
| `.alpha` 报未定义 | 用 `#ifdef BLOXD_ALPHA` 包裹 |
| `blockLight` 报未定义 | 用 `#ifdef BLOXD_LIGHTING` 包裹。共用辅助函数须**整个函数**包裹 (v2 字段常驻，通常不会发生。判定用守卫保留) |
| `Packs can't construct BloxdSurface directly` | 改从 `bloxdDefaultSurface(s)` 出发 |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | 用 `#ifndef BLOXD_STRICT` 包裹 |
| 远景发白浑浊 | 多为双重雾。完成色已打雾，自制雾须克制，优先只降饱和 |
| 进游戏时包被剔除 | 游戏开始时的实机检查失败。复查守卫遗漏 |
| `pack.json needs "apiVersion": 2.` | `apiVersion` 缺失或不是 `2`。填数字 `2` (字符串 `"2"` 不可)。v1 包会被 `shaderPack:loadWrongApiVersion` 拒绝 |
| `There's no pack.json at the top of the pack.` | ZIP 根无 `pack.json`。检查是否把文件夹整个打包了 |
| `bloxdTerrainVertex must be declared as: fn ...` | 签名不符。按所示声明原样重写 |
| `bloxdTerrainVertex can't run in strict games...` | vertex 钩子用 `#ifndef BLOXD_STRICT` 包裹 |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | 用 `#ifdef BLOXD_LIGHTING` 包裹 (v2 字段常驻，通常不会发生) |
| `pow(l.skyLight, γ)` 加再大影也不浓 | `skyLight` 为提升曲线之后的值 (原始 0.87 以 0.97 到达)。切换 R9.12 提升逆变换 + 阈值切割 (第 10 章) |
| `... can only be a function's parameter or return type, ...` | 未初始化的 `var x: BloxdSurface;` 会被拒。从 `bloxdDefault*` 造起 |
| `bloxdPackInputs isn't part of the bloxd_ header` | PackInputs uniform 包不可直接引用。经 `bloxdTime()` 等标头函数使用 |
| `Packs can't declare bloxd_ names...` | 去掉自定标识符的 `bloxd_` 前缀。只许定义 6 个钩子名 |
| `loadDuplicateManifest` (zip 加载时) | `pack.json` 有 2 个 (含大小写变体)。留 1 个 |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | 改从 `bloxdDefaultSurface(s)` 等出发。从 light 钩子第 1 参数的拷贝 (`var out = s;`) 起步亦可 |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` 不可。写成 `_ = f();` |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | 地形钩子内的 `bloxdOpaqueBehind()` 调用以 `#ifdef BLOXD_SCENE_DEPTH` 包裹 |
| `...only surface and light hooks can use.` | 删除 vertex 钩子内的 `bloxdOpaqueBehind()` (仅 surface / light 可用) |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | 非报错，而是 strict 游戏中的自动禁用 (`shaderPack:offInStrict`)。vertex 钩子与 `discard` 以 `#ifndef BLOXD_STRICT` 包裹 |
| `mixing '*' and '^' requires parenthesis (only in ...)` | 第 2 阶段 (浏览器 Tint) 的错误。`^` `&` `\|` `<<` `>>` 的操作数加括号 (§38) |

## 18. 权利与注意事项

- 着色器包功能本身是游戏内 UI 可加载的官方功能，制作包可视为预期行为。但未确认有公开官方文档
- 包为纯 WGSL，JS 执行与网络访问设计上不可能
- 本书为非官方指南，非开发者的官方立场。API 可能随时变更

---

# 第六部分: 重要的实现补充

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

本 API 采样不到场景色，因此**是以菲涅尔风颜色混合与太阳高光的拟似表现，而非真实的反射/折射** (水深计算在 v2 中经 `bloxdOpaqueBehind()` 已可能实现，分离至第八部分 R-E)。下例保留基色，掠角混入近空色，仅有太阳时加小闪光。

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
- 想要真实映景：本 API 输入没有屏幕色，只混色成不了真反射 (深度为液体限定可取。第八部分 R-E)。

该配方**替换**既有 `bloxdLiquidLight`。勿与 R9.7 同名波法线函数或其他同名钩子重复粘贴。

## 21. 实机测试清单

编译成功与「好看」是两回事。请按顺序确认：

1. **加载：** `pack.json` 在 ZIP 根目录，设置显示 `Ready to use`。
2. **8 变体：** strict / allow、光照开 / 关、地形 / 液体各条件无类型守卫遗漏。即使游戏只用部分条件，分发包也要按 8 种设想。
3. **白天：** 草、石、沙、木等材质颜色无溢出，顶面与侧面明暗过渡自然。
4. **夜晚：** 对比曾受光处的同材质、阴影、火把附近。仅受光面残亮则调曝光衰减，整体过暗则调局部光保护。
5. **水：** 俯视、掠角、岸边、水下、夜晚分别查看。alpha 行为与水下观感依赖游戏合成方式，勿凭单一视角判断。水下液体定义色幕按上文罩在前面，包的差异主要看水面与幕透出的地形。
6. **边界与远景：** 区块/原点切换处波形花纹无跳变，远景无双重雾与白色霾。
7. **性能：** 逐片元哈希/三角/`pow` 重效果取最小。逐步加细节并对比 FPS。

### 已知约束为前提

- 包限于地形/液体钩子，同一代码不处理天空、实体与 UI。
- 无添加阴影贴图、屏幕空间反射、折射、泛光等的输入 (场景深度为液体限定以 `bloxdOpaqueBehind()` 解禁。见第八部分)。
- `bloxdTime()` 为动画时间，不保证关联游戏内昼夜。
- `bloxdSunDirection()` 为零则真月亮方向未知，是氛围近似而非「月光物理」。方向性月光经 `-bloxdSunDirection()` 制作 (仅昼夜循环世界。第七部 R-A)。
- `s.position` / `l.position` 为局部坐标，世界相关效果请加 `bloxdOriginOffset()`。方块内局部花纹则有意用局部坐标。

## 22. 着色器到极限时的组合

着色器包不能添加或采样纹理，材质细微凹凸与天空图像不要只靠着色器解决。Bloxd.io 公开纹理包仓库 [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) 以另一方式处理纹理、天空盒、模型等。

参考：社区流传的「cinematic shader」发行物经分析实为纹理包 (128x128 纹理，不含 `pack.json` / `.wgsl`)。

现实做法是，**光照与颜色用着色器调，材质与天空用配套资源包补**。但并用可行性与加载顺序请按游戏实现与设置确认。

现实做法是，**光照与颜色用着色器调，材质与天空用配套资源包补**。但并用可行性与加载顺序请按游戏实现与设置确认。

## 23. 水中与着色器包的实情

水中的外观由 3 层构成：

| 层 | 内容 | 包可否操作? |
|---|---|---|
| ① 地形/液体绘制 | 钩子可加工。light 钩子在水下也照常调用 | 可 (在幕之下生效) |
| ② 液体定义色幕 | 相机所在液体方块定义 color/alpha 的 emissive 全屏 quad，绘制在最前面。游戏设置 `cameraTint` 有则优先 | 不可 (颜色浓度都改不了) |
| ③ cameraTint | 游戏设置 | 不可 |

实用要点：包在水下也继续工作 / 幕去不掉 / 水下不可分支 (fogStart / fogEnd / fogColour 在水下不变，fogVisibility 也检测不到)。

---

# 第七部分: 内部规格的补充

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

雾计算恒为 LINEAR 模式 (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`，clamp 0..1)，`fogStart = 32 × D`，`fogEnd = 32 × (D + 1)` (D = 雾距离设置；仅 D = 0 特例 fogEnd = 5)。**雾渐变带仅 32 格宽**，`l.fogVisibility` 与其说是「距离雾」，不如说是**到已加载世界边缘的归一化距离**指标。随玩家加载距离变化，距离系演出应自行计算 `distance(l.position, bloxdEyePosition())` (配方 R-B)。

默认雾色 `rgb(183, 191, 195)` (淡青灰)。世界作者经 `fogColourOverride` (hex) 变更。雾模式 0 (NONE) 时 **fogColour 以黑到达**。标准形 `mix(l.fogColour, col, l.fogVisibility)` 安全，因为 fogVisibility 为 1 时不用雾色。

玩家侧 `showFog` 关则雾推至 3200–3328 格，实际无效 (`fogVisibility ≈ 1` 持续返回)。

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

解码 `aPackedLightLevels` 时，引擎给每通道铺 **RGB 最亮通道 35% 的下限「35% 通道地板」**。如「纯红光源」在顶点先抬为 (1.00, 0.35, 0) 再经插值·提升。火把橙在游戏中显「白粉而非红」正缘于此，暖色火把配方 (R9.1) 饱和度以此默认行为为基准调整为好。

手持光 (`heldLight`) 范围由最亮光色通道定 (最大 15 格)，经 `dist^0.75` 预处理，同 35% 通道地板，`l.heldLight` 为环境光助推**前**之值。自定义物品可设 `spotlightRange` (射程) 与圆锥角——「持握时出光束」模式，其圆锥跟随相机。包无法得知光束方向。

自定义方块可带 `skyLightEmission` (0–15)，**向 skyLight 通道本身注入，与 blockLight BFS 分开**。R9.12 式以 skyLight 阈值判向阳/阴影的包，在人工光源抬高 skyLight 的世界会误判。分发包与 blockLight 组合判定更稳健。

## 27. 管线细节

- **surface 钩子在 alphaTest 「之前」跑**：`out.alpha` 直接喂给丢弃判定。镂空材质 (草、叶) 可做溶解式抖动特效 (配方 R-C)。液体 (混合) 中 `out.alpha` 为真实透明度 (配方 R-D)。通常不透明地形无效果——勿误解
- **`l.ambient` 内容**为 `material.ambient × sceneAmbient`，按材质各异。场景侧直连图形设置「Ambient Lighting Intensity」(默认 0.5)，切勿写死默认值
- **`bloxdTime()` 正体为 `performance.now()`**：`time() { return performance.now() / 1e3 % 3600 }`，为浏览器启动流逝时间按 1 小时回绕。与游戏内昼夜及世界流逝时间无关。想做与游戏时钟同步的动画，在昼夜循环世界由 `bloxdSunDirection()` 方位角推定时间比较现实
- 加载时区块边界的细棋盘格为引擎屏幕空间 Bayer 4×4 抖动的区块淡入，非包 bug
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

1. **通常世界** (默认天空盒、无覆盖) — bloxdSunDirection() 有、默认色
2. **太空系天空盒世界** — bloxdSunDirection() = 0。`sunPresent` 分支的外观
3. **设 `visionMinLightColour` / `skyLightColourOverride` 的自定义世界** — 暗部与颜色被抬高的情形

主要变动源：`lightingOverride` (强制光照) / `skyLightColourOverride`、`ambientLightColourOverride` (hex 替换) / `visionMinLightColour` (sky 与 ambient 的「可见最暗色」垫高；Night Vision 在用——「洞穴全黑」系包达不到预想之暗) / `heldLightColourOverride`、`Range`、`ConeAngle` / `fogChunkDistanceOverride`、`fogColourOverride`、`fogOnSkybox` / `skyBox` (bloxdSunDirection() 有无)。`uSkyLightColour` 默认 = (1,1,1) 白，`uAmbientLightColour` 默认 = (0.25,0.25,0.30)。`l.ambient` 场景成分 = 图形设置「Ambient Lighting Intensity」(默认 0.5)。`l.fogVisibility` 跟随玩家雾/区块距离设置。

## 29. 调试手段

- URL 参数 `?renderer=lite` — 强制 Lite 渲染器 (`?renderer=webgl2` / `babylon` 也可)
- URL 参数 `?vconsole` — 屏幕内控制台 (VConsole)。手机实机验证趁手
- 控制台输出 `noa-engine v0.33.0` 与 `Renderer: lite from <来源>` — 先确认以防渲染路径误诊
- WebGPU 渲染器在包适用中锁定「强制 ON」。「Disable Block Texture Atlas」设置也锁定 (Atlas 保持 ON)，无 WebGPU 环境包根本无法适用。在分发页写「需要 WebGPU 浏览器」的根据在此
- 每次进游戏运行时重验证 (`checkCompilation`)，以浏览器 WebGPU 实编全部地形材质 (比设置画面静态验证更严)。此处失败的包被逐出该游戏

# 第八部分: API Version 2 迁移指南

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

`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` 三个结构体均新增 `blockId: u32`。为面所属方块的 ID (0–65535)，同一面全域恒定 (以 `@interpolate(flat)` 传递)。用于不依赖纹理颜色的方块种类识别。但 ID 与方块种类的对应表在引擎内部，包无法引用，因此哪一 ID 对应何种方块只能在世界内实测。

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

应用：基于厚度的吸收/散射、经 `behind.position` 的底面世界坐标做波纹/焦散风投影、以 `found=false` 区分天空与遮蔽做水面空反射、按深度分级加泡与浑浊。深度拷贝管线构建失败时会安全降级为「后方空无一物」。

## 36. 其他 v2 变更

- **钩子回退**：液体程序在 `bloxdLiquidXxx` 未定义时回退到地形钩子。**仅地形钩子的包会原样作用于水面**。不希望时请显式定义 liquid 侧钩子。
- **`BLOXD_LIGHTING` 字段守卫不再必要**：全变体存在 `blockLight` 等，无光照时填默认值 (0 / 1 / 白 / 0)。仅在判定光照时使用 `#ifdef BLOXD_LIGHTING`。保留既有守卫动作不变。
- **`BLOXD_ALPHA` 定义条件变化**：非 strict 地形变体与全液体变体有定义，strict × terrain 无定义。地形钩子写 alpha 时请保留守卫。
- **禁止直接构造结构体**：`BloxdLight(...)` 等构造器调用会被静态检查拒绝。务必从 `bloxdDefault*` 改写，或使用输入的拷贝。
- **`let _ =` 改为 `_ =`**：WGSL 的弃置赋值 `_ = f();` 有效，但 `let _ = f();` 会被拒绝。
- **offInStrict**：定义 vertex 钩子，或 surface / light 钩子可达的 `discard`，不会报错而是整个包在 strict 游戏中自动禁用 (设置 UI 显示 `shaderPack:offInStrict`，allow 游戏仍可运行)。vertex 钩子与 `discard` 以 `#ifndef BLOXD_STRICT` 包裹。
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
