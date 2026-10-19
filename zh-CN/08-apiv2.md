[← 上一部分](07-internals.md)·[返回手册](README.md)

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
