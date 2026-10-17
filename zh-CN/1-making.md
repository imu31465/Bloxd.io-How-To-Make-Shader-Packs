[返回手册](README.md)·[下一部分 →](2-api.md)

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
3. 出错则修复后重新加载 (见[第五部分](5-troubleshooting.md))
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
