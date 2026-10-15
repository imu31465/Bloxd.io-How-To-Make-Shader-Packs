# Bloxd.io 着色器包制作方法 (完整版)

自包含的 Bloxd.io 着色器包 (仅 WebGPU 渲染器) 制作与分发指南。
基于 `apiVersion: 1` 的规范。包含配方集与 API 参考，仅凭本文件即可从零走到分发。

> 本书为非官方指南，不代表开发者的官方立场。API 可能随时变更。
> 最后检查: 2026-10-15。由于未能找到公开的官方 WGSL API 参考，API 说明与配方请持续以加载界面与游戏内编译为准。
> 着色器包功能本身是游戏内 UI 可加载的官方功能，包为纯 WGSL
> (无 JS 执行、无网络通信)，正常代码不会发生危险。
> 本指南在 AI 协助下创建，不保证准确性。请以实际游戏表现为准。

## 目录

- [第一部分: 制作包](#第一部分-制作包)
- [第二部分: API 参考](#第二部分-api-参考)
- [第三部分: 配方集](#第三部分-配方集)
- [第四部分: 写实化指南](#第四部分-写实化指南)
- [第五部分: 故障排除与注意事项](#第五部分-故障排除与注意事项)
- [第六部分: 重要的实现补充](#第六部分-重要的实现补充)

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
  "apiVersion": 1,
  "name": "My Pack",
  "author": "your name"
}
```

| 字段 | 必需 | 说明 |
|---|---|---|
| `apiVersion` | 必需 | 必须与 `1` 完全一致 |
| `name` | 必需 | 不可为空。显示在设置界面 |
| `author` | 可选 | 可省略。非字符串值 (数字等) 会报错 |

其他字段会被忽略。

## 5. 最小模板

仅需 `pack.json` (第 4 章) 与以下 `pack.wgsl` 即可运行：

```wgsl
// 轻微暖色的最小包
const packWarmth = 0.18;

fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

必须遵守的规范：

- 输出结构体**禁止直接构造** (`bloxd_Surface(...)` 会报错)。必须以 `bloxd_defaultSurface(s)` / `bloxd_defaultLight(s, l)` / `bloxd_defaultVertex(v)` 为起点改写字段
- 钩子参数**只读**。要修改请先复制，如 `var sv = s;`
- 自定义标识符禁止使用 `bloxd_` 前缀 (6 个钩子名除外)
- 常量用 `const` 书写 (`#define` 不能带值)

## 6. 六个钩子

全部可选。签名必须类型完全一致 (参数名可自由)。

| 钩子 | 作用 |
|---|---|
| `fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex` | 地形顶点动画。**严格模式下不可用** |
| `fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface` | 地形颜色、透明度、自发光。`s.colour` 为纹理×顶点色 |
| `fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light` | 地形最终颜色。在片元**最后阶段**调用，返回值原样成为最终颜色 |
| `fn bloxd_liquid_vertex / _surface / _light` (同形) | 液体版。`alpha` 作为液体透过率生效 |

回退规则：

- 液体钩子未定义时，**使用同名地形钩子** (反之不行)。只写 surface 也会对液体生效
- light 钩子未定义时使用默认行为 (`engineColour + emission × fogFactor`)
- 丢弃 `engineColour` 改从基色重建时，需自行重打雾：`mix(l.fogColour, col, l.fogFactor)`。叠加 emission 时先乘 `fogFactor`

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

禁止・注意：

- **纹理不可**：`texture_*` / `sampler` 类型不可用。质感用哈希噪声等程序化计算制作
- **`discard` 在严格模式下禁止** (用 `#ifndef BLOXD_STRICT` 包裹)
- `@属性` / `enable` / `requires` / `override` 禁止。因无法书写 `enable f16;`，**f16 系类型实际禁用**
- `@builtin` 属性同样禁止，`fragCoord` (屏幕坐标) 与 `vertex_index` 无法读取
- **模块级 `let` 不可用** (用 `const` 或 `var`)
- `atomic` 不可用
- 坐标为 noa 局部坐标。世界坐标需加 `originOffset`。方块坐标为 `vec3i(floor(position - normal * 0.5)) + originOffset`

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
// Engine-provided and read-only to packs. apiVersion 1.
struct bloxd_VertexIn {
    position: vec3f,     // noa-local world space (world minus originOffset)
    normal: vec3f,
    originOffset: vec3i, // whole blocks
    time: f32,           // seconds, wrapped every 3600 s (part of the API)
}

#ifndef BLOXD_STRICT
struct bloxd_Vertex {
    position: vec3f,     // noa-local
}
#endif

struct bloxd_SurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher in v1)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    originOffset: vec3i, // a face's world block is vec3i(floor(position - normal * 0.5)) + originOffset
    eyePosition: vec3f,  // noa-local
    time: f32,
    sunDirection: vec3f, // unit, towards the sun, in world orientation; zero when the sky has no sun
}

struct bloxd_Surface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct bloxd_LightIn {
    engineColour: vec3f, // the engine's result for this fragment, from the surface hook's colour
    directional: f32,    // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,      // the material's ambient times the scene's
#ifdef BLOXD_LIGHTING
    blockLight: vec3f,   // voxel block light, tone-mapped
    skyLight: f32,       // voxel sky light, tone-mapped
    ambientLightColour: vec3f,
    skyLightColour: vec3f,
    heldLight: vec3f,    // held light here, tone-mapped like blockLight, before the ambient boost; 0 out of reach
#endif
    fogColour: vec3f,
    fogFactor: f32,      // 1 = no fog, 0 = fully fogged
    position: vec3f,     // as in bloxd_SurfaceIn
    normal: vec3f,
    originOffset: vec3i,
    eyePosition: vec3f,
    time: f32,
    sunDirection: vec3f,
}

struct bloxd_Light {
    colour: vec3f,
}

#ifndef BLOXD_STRICT
fn bloxd_defaultVertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    return bloxd_Vertex(v.position);
}
#endif

fn bloxd_defaultSurface(s: bloxd_SurfaceIn) -> bloxd_Surface {
#ifdef BLOXD_ALPHA
    return bloxd_Surface(s.colour, s.alpha, vec3f(0.0));
#else
    return bloxd_Surface(s.colour, vec3f(0.0));
#endif
}

fn bloxd_defaultLight(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    return bloxd_Light(l.engineColour + s.emission * l.fogFactor);
}
```

要点解读：

- `time` 每 3600 秒回绕，为流逝时间。不保证与游戏内昼夜时钟同步。
- `sunDirection` 仅在太阳存在时为单位向量，无太阳的天空为零。月亮方向数据不在本 API 输入中，零时不可复用为月亮方向。
- `emission` 在光照计算后叠加，之后再打雾
- 引擎内部存在名为 `bloxd_packInputs` 的 uniform，但**包不可直接引用**。经由钩子输入字段 (`s.time` 等) 使用
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

头结构体形态也随变体变化 (strict 无 `bloxd_Vertex`、无光照无 `blockLight` 等、strict 地形无 `alpha`)。

## 12. 骨架速查

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);          // 禁止直接构造，务必从 default 出发
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // 地形仅 allow 时有 alpha
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);         // engineColour + emission*fogFactor
    #ifdef BLOXD_LIGHTING                       // 守卫仅光照输入
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex 务必带此守卫
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    out.position.y += sin(v.time) * 0.05;
    return out;
}
#endif
```

时刻牢记 5 点：8 变体全部通过 / 严格游戏占大多数 / 纹理不可 / 钩子参数只读 / 模块级不用 `let`。

---

# 第三部分: 配方集

所有片段均按 8 变体通过前提写好守卫，可直接复制改常数使用。但以下配方为独立示例，不可从上到下全部拼接——同一钩子名 (`bloxd_terrain_light` 等) 或同一辅助函数名重复粘贴，会在同一模块内重复定义导致编译失败。多效果并用时，请按钩子种类合并为一个函数。

## R1. 颜色配方 (surface)

### 单色 tint (最基础)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
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
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldY = s.position.y + f32(s.originOffset.y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 高度 0..50 对应 1..0
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 按面朝向分涂 (朝上=亮、墙=暗)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
    // 64~192 格叠加 0..0.35 的自制雾
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### 夜晚 (skyLight 驱动偏蓝 + 灯光保护)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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

> 本 API 中无太阳的天空 `sunDirection` 为零，也没有月亮方向数据，无法定位朝月面。这不是方向性月光，只是天空暗时极弱的蓝色环境光。

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 地平线 1 / 正上方 0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### 引擎输出完全替换 (最简单的重光照)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    #ifdef BLOXD_LIGHTING
    // ※ bloxd_Light(...) 直接构造禁止。从 default 出发改写 colour
    var out = bloxd_defaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // 丢弃 engineColour (引擎光照结果)，换成「材质色 × 自算亮度」
    out.colour = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    return out;
    #else
    return bloxd_defaultLight(s, l);
    #endif
}
```

## R3. 自发光配方 (emission)

> `emission` 在光照计算后叠加，之后再打雾。远景也想发光的成分请自行乘 `fogFactor`。

### 灯光脉动 (火把呼吸)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(l.time * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### 发光矿石感 (亮材质发光)

```wgsl
// surface 侧：材质越亮 (越白) emission 越强
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### 萤火虫群感 (随时间漂移的光点)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let world = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    // 数个缓慢移动的「光球」，按距离倒数发光
    let t = l.time * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(l.time * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. 坐标配方 (世界/方块/视线)

### 世界坐标

```wgsl
let worldPos = s.position + vec3f(f32(s.originOffset.x), f32(s.originOffset.y), f32(s.originOffset.z));
```

### 方块坐标

```wgsl
let worldBlock = vec3i(floor(l.position - l.normal * 0.5)) + l.originOffset;
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
let viewDir = normalize(l.eyePosition - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### 视线角度 (菲涅尔感 —— 液体用)

```wgsl
let viewDir = normalize(s.eyePosition - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 正对 1 / 掠角 0
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. 时间配方 (动画)

> `time` 每 3600 秒 (1 小时) 回绕。但这是着色器流逝时间，不保证与游戏内太阳/昼夜同步。视觉周期动画可用，实际夜晚判定优先用 `sunDirection` 与光照输入。

### 昼夜循环 (1 小时 1 天)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let day = 0.5 + 0.5 * sin(l.time * 6.2831853 / 3600.0);   // 0..1 的 1 小时周期，不保证与游戏内昼夜同步
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
fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldX = s.position.x + f32(s.originOffset.x);
    let worldZ = s.position.z + f32(s.originOffset.z);
    let ripple = sin(s.time * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid 恒有 BLOXD_ALPHA —— 守卫作习惯保留
    #endif
    return out;
}
```

### 高度伪透明度 (非真正的浅滩判定)

> 场景深度与水底位置无法引用，仅凭本 API 算不出真实水深。`s.position.y` 是局部坐标，直接用会随区块原点漂移。以下仅按世界高度改变 alpha 的拟似演出，非沿岸线/水底的浅滩表现。`packWaterReferenceY` 请按世界高度调整。

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldY = s.position.y + f32(s.originOffset.y);
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
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
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

### 草随风摆 (只动上端)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let sway = sin(v.time * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // 仅垂直面
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### 液面波 (仅上表面)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_liquid_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + v.time * 1.6) * 0.5
              + sin(v.position.z * 1.2 + v.time * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### 脉动地形

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let pulse = sin(v.time * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // 沿法线轻微胀缩
    return out;
}
#endif
```

### 波浪地形 (巨大 sin 波)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + v.time * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - v.time * 0.7) * 0.3;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    out.colour = s.colour * voxel;
    #endif
    return out;
}
```

### R9.2 太阳高光 (Blinn-Phong)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // 边缘微亮
    #endif
    return out;
}
```

### R9.4 半球环境光 (上=天空 / 下=地面反弹)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // 下：反弹
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // 上：空光
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    out.colour = s.colour * voxel * hemi;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = 曝光
    return out;
}
```

### R9.6 大气透视 (随距离降饱和的「空气感」)

> 与雾 (颜色替换) 不同，再叠「随距离去饱和」会让远景真实得多。
> 注意：只降饱和度，不动亮度。

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
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
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, l.time), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(l.eyePosition - l.position);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // 方块内局部坐标
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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

> `l.fogFactor` 加 `max(l.fogFactor, 0.25)` 式下限可实现「不再更浓」
> (0.0 = 引擎一致 / 0.3–0.5 = 远景更透)。
> 注意引擎雾为地平线专用线性雾 (仅绘制距离附近)，中距离霾需包内自制。

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogFactor, 0.15));  // 雾重现 (0.15=偏薄下限)
    col += s.emission * l.fogFactor;            // emission 同样打雾
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 电影级 (阴影偏冷 / 高光偏暖 / 夜晚去饱和)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. 恢复原始值 (跳过则永无阴影)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. 阈值切割 —— 向阳=1 / 阴影=0 确实分离
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // 太阳 Lambert (无太阳时回退 l.directional)
    let sunLen = length(l.sunDirection);
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), l.sunDirection / sunLen), 0.0, 1.0),
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
    col = mix(l.fogColour, col, max(l.fogFactor, 0.15));
    out.colour = clamp(col, vec3f(0.0), vec3f(1.0));
    #endif
    return out;
}
```

> 调整指南：**阴影面积只由 `shTh` 决定** —— `0.93`=半径1.5以上 / `0.87`=半径2 / `0.80`=半径3 / `0.67`=半径5。
> 边缘硬度为 `shSoft` (0.02=硬 / 0.08=软)。影芯暗度由 `0.09` (最低环境光) 与 `0.16` (天空散射光)
> 的两点偏移决定。黄昏想扩大阴影请加
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (长暮影近似。
> `sunDir` 为 `l.sunDirection / length(l.sunDirection)`)。阴影偏蓝请调高 `vec3f(0.72, 0.82, 1.05)` 的 B。
>
> ⚠️ 「用 `pow(skyLight, γ)` 加深对比」**对提升后之值加了 gamma**
> 树下 (0.97) 从不受影响。请改用本法。

---

# 第四部分: 写实化指南

## 13. 引擎默认光照与写实余地

引擎默认光照只有「乘法」，不存在高光、菲涅尔、暖冷分离、半球环境光。以下为可重建范围：

| 功能 | 默认 | 包可否实现? |
|---|---|---|
| 漫反射 (Lambert) | 仅方向光标量总和 | ◎ 用 `sunDirection` 自行实现 (包裹光源等) |
| 高光 (镜面反射) | 皆无 | ◎ Blinn-Phong (R9.2) |
| 菲涅尔 | 皆无 | ◎ Schlick 近似 (R9.3) |
| 暖色火把 / 冷色空光分离 | 无色 | ◎ (R9.1) |
| 半球环境光 | 无方向 | ◎ 上=天空色 / 下=地面反弹 (R9.4) |
| 色调映射 | 无 (仅 clamp) | ◎ ACES 胶片化 (R9.5) |
| 大气透视 | 仅雾 (颜色替换) | ◎ 距离去饱和 (R9.6) |
| 表面细节 | 仅纹理解析度 | △ 哈希噪声程序化微凹凸 (R9.8) |
| 顶点波 (水面) | 皆无 (平面) | ◎ 仅 allow (R7) |
| 波法线 / 太阳闪光 | 皆无 | ◎ (R9.7) |
| 夜晚月光处理 | 仅空色变暗 | △ 月亮方向无输入，只能拟似表现 (R2 蓝色环境光 / R9.11) |
| 阴影 (天空遮蔽) | 仅 `mix(环境色, 空色, skyLight)` 轻混 | ◎ 提升逆变换 + 阈值切割 + 太阳门控 (R9.12)。树荫、屋檐下明确压暗，方块编辑实时跟随 |

## 14. 写实化的实现流派 —— 两种

**流派 A：加算修正 (defaultLight 起点)** —— 以 `engineColour` (完成色) 为底，叠加暖色辉光或轮廓光。轻便安全，但光照模型仍是默认。

**流派 B：完全重光照 (s.colour 起点)** —— 丢弃 `l.engineColour`，从 `s.colour` (反照率) 与 LightIn 原生素材重组光照。写实化的正统。遵守 4 点：

1. **重打雾**：light 钩子在雾之后调用，请自行施加 `mix(l.fogColour, col, l.fogFactor)` (R9.10)。雾太浓时用 `max(l.fogFactor, 0.3)` 设下限。反之在 engineColour 起点的包上再混雾色会导致双重雾发白
2. **无光照变体回退**：`#ifdef BLOXD_LIGHTING` 之外直接返回 `defaultLight`
3. **共用函数整体守卫**：以 `bloxd_LightIn` 为参数的共用函数须整个 fn 用 `#ifdef BLOXD_LIGHTING` 包裹 (仅守卫调用处不够)
4. **无太阳方向时**：`sunDirection` 为零则不计算方向性高光。`l.directional` 是光量标量而非方向向量，无法恢复高光方向。必要时切换为无方向弱环境光

## 15. 达不到的表现 (写实化的「天花板」)

| 表现 | 原因 |
|---|---|
| 阴影贴图 (随太阳旋转的影、半影) | 深度纹理不可引用。光线遮蔽判定也不输入钩子 |
| SSAO | 无法访问场景深度 (仅网格烘焙的顶点 AO) |
| SSR (反射) | 同上。仅菲涅尔混空色的拟似 |
| 泛光 / 眩光 | 无挂钩后处理的钩子 |
| 景深、色散、颗粒 | 需要全屏后处理 |
| 体积光 (上帝光) | 同上 |
| PBR 纹理 | 纹理采样禁止。仅从颜色亮度拟似推定 |
| 水下折射 | 无场景深度输入 |
| 水下检测 / 去除水幕 | 无表示相机入水的字段，水中蓝色幕在钩子管线之外 (全屏 quad + 水下天空盒)，既检测不到也去不掉 |

### 阴影的真相 —— 「树影」做得出来

上表中不可能的只是**随太阳旋转的像素级阴影贴图**。引擎从一开始就在算「影」，那就是 `skyLight`。网格侧 LightEngine 运行类 Minecraft 算法：

1. **纵列扫描**：每 (x,z) 列自上而下扫描。天空来光从 15 开始，**不透明方块处归 0**，以降按 `lightFilter` (空气 1 / 水 3 / 不透明 15) 衰减下降
2. **BFS 泛洪**：向 6 邻横向扩散 (每格 -1) —— 这正是影缘变软的正体。半径 r 遮蔽物下的原始值为 (15-r)/15
3. blockLight (火把等) 为 RGB 3 通道 (4bit 打包) 的另一路 BFS

于是 `l.skyLight` 不是单纯的亮度参数，而是**「该处能否看见天空」的体素分辨率遮蔽数据 = 阴影贴图**。树下、屋檐下、室内数值本已偏低，经顶点插值平滑到达。放置/破坏方块即刻重算 = **实时跟随的阴影**。原版仅以 `mix(环境色, 空色, skyLight)` 「轻混」使用。

正确的工具是 R9.12 的两步 (**提升逆变换恢复原始值 → 阈值 `smoothstep` 二值化**。`th = 1 - r/15` 直接拨定「视为阴影的遮蔽半径」) 加上**太阳直射光以 sky 门控** (太阳只到达看得见天空之处 = 投影的正体)，再以向阳=暖色 / 阴影=冷色染色构成。

**如实声明限制**：该阴影以「上方天空」为基准，**不随太阳移动旋转**。分辨率为方块级 (柔边来自 BFS 扩散)。引擎光照模板仍残留闭合的 `var shadow: f32 = 1.;` 阴影贴图桩 (恒为 1.0 = 无效)，可解读为「计划中的像素级旋转阴影」痕迹。若非要像素级旋转阴影，只剩 API 之外路线 (如 userscript GLSL 注入，有规则风险)。

## 16. 调试技巧

- 洞穴过亮 → `skyLight` 非线性曲线不足 (R2 洞穴配方 / R9.9)
- 白天过曝 → 降低 ACES 前曝光
- 夜晚黑到看不见 → 确保最低环境光 (夜晚 `skyLightColour` 按前提近乎全黑)
- 远景霾太重 → 调低大气系数
- 火把周围一片橙 → 调低暖色混合比 (保留部分原始染色光)
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
| `blockLight` 报未定义 | 用 `#ifdef BLOXD_LIGHTING` 包裹。共用辅助函数须**整个函数**包裹 |
| `Packs can't construct bloxd_Surface directly` | 改从 `bloxd_defaultSurface(s)` 出发 |
| `bloxd_Vertex only exists when BLOXD_STRICT isn't defined` | 用 `#ifndef BLOXD_STRICT` 包裹 |
| 远景发白浑浊 | 多为双重雾。完成色已打雾，自制雾须克制，优先只降饱和 |
| 进游戏时包被剔除 | 游戏开始时的实机检查失败。复查守卫遗漏 |
| `pack.json needs "apiVersion": 1.` | 缺 `apiVersion`。补数字 `1` (字符串 `"1"` 会被拒) |
| `There's no pack.json at the top of the pack.` | ZIP 根无 `pack.json`。检查是否把文件夹整个打包了 |
| `bloxd_terrain_vertex must be declared as: fn ...` | 签名不符。按所示声明原样重写 |
| `bloxd_terrain_vertex can't run in strict games...` | vertex 钩子用 `#ifndef BLOXD_STRICT` 包裹 |
| `bloxd_LightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | 用 `#ifdef BLOXD_LIGHTING` 包裹 |
| `pow(l.skyLight, γ)` 加再大影也不浓 | `skyLight` 为提升曲线之后的值 (原始 0.87 以 0.97 到达)。切换 R9.12 提升逆变换 + 阈值切割 (第 10 章) |

## 18. 权利与注意事项

- 着色器包功能本身是游戏内 UI 可加载的官方功能，制作包可视为预期行为。但未确认有公开官方文档
- 包为纯 WGSL，JS 执行与网络访问设计上不可能
- 本书为非官方指南，非开发者的官方立场。API 可能随时变更

---

# 第六部分: 重要的实现补充

## 19. 修复夜间「影黑了面却亮」

只压暗阴影，太阳缺席时引擎完成色 (`engineColour`) 依然偏亮，面影落差会显得不自然。应对完成色整体施加衰减。

下例以 `sunDirection` 为零判夜、有方向判昼，对夜间地形完成色衰减。`blockLight` 与 `heldLight` 强处减弱衰减，尽量保留火把等近光。`0.52` 为可调值，想更暗请调小。

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
    out.colour = l.engineColour * scale + s.emission * l.fogFactor;
    return out;
}
```

**该处理的局限：** 若 `sunDirection` 为「有太阳=单位方向、无=零」二值，可分昼夜但无法连续推定黄昏薄明。且因衰减完成色，会把引擎昼光与环境光一并削弱，并非完整的时间带再现。液体同样处理时请确认液体钩子的回退关系。

## 20. 让水自然的水体统合配方

本 API 采样不到场景色、深度与水底深度，因此**是以菲涅尔风颜色混合与太阳高光的拟似表现，而非真实的反射/折射/水深计算**。下例保留基色，掠角混入近空色，仅有太阳时加小闪光。

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, l.time), topness));
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
- 想要真实映景：本 API 输入没有屏幕色与场景深度，只混色成不了真反射。

该配方**替换**既有 `bloxd_liquid_light`。勿与 R9.7 同名波法线函数或其他同名钩子重复粘贴。

## 21. 实机测试清单

编译成功与「好看」是两回事。请按顺序确认：

1. **加载：** `pack.json` 在 ZIP 根目录，设置显示 `Ready to use`。
2. **8 变体：** strict / allow、光照开 / 关、地形 / 液体各条件无类型守卫遗漏。即使游戏只用部分条件，分发包也要按 8 种设想。
3. **白天：** 草、石、沙、木等材质颜色无溢出，顶面与侧面明暗过渡自然。
4. **夜晚：** 对比曾受光处的同材质、阴影、火把附近。仅受光面残亮则调曝光衰减，整体过暗则调局部光保护。
5. **水：** 俯视、掠角、岸边、水下、夜晚分别查看。alpha 行为与水下观感依赖游戏合成方式，勿凭单一视角判断。
6. **边界与远景：** 区块/原点切换处波形花纹无跳变，远景无双重雾与白色霾。
7. **性能：** 逐片元哈希/三角/`pow` 重效果取最小。逐步加细节并对比 FPS。

### 已知约束为前提

- 包限于地形/液体钩子，同一代码不处理天空、实体与 UI。
- 无添加阴影贴图、屏幕空间反射、场景深度、折射、泛光等的输入。
- `time` 为动画时间，不保证关联游戏内昼夜。
- `sunDirection` 为零则真月亮方向未知。蓝色环境光添加为氛围近似，非「月光物理」。
- `s.position` / `l.position` 为局部坐标，世界相关效果请加 `originOffset`。方块内局部花纹则有意用局部坐标。

## 22. 着色器到极限时的组合

着色器包不能添加或采样纹理，材质细微凹凸与天空图像不要只靠着色器解决。Bloxd.io 公开纹理包仓库 [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) 以另一方式处理纹理、天空盒、模型等。

参考：社区流传的「cinematic shader」发行物经分析实为纹理包 (128x128 纹理，不含 `pack.json` / `.wgsl`)。

现实做法是，**光照与颜色用着色器调，材质与天空用配套资源包补**。但并用可行性与加载顺序请按游戏实现与设置确认。

---

调查：ltf_ahel (使用 glm 调查)
