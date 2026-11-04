# 限制与保留名称

> 目标API: 5 · 目标构建: `xkg8x` · 状态: Verified (v4 实测限制在 v5 上逐字节复验一致)

包可以写什么，以及完整的名称保留规则。

## 允许

- WGSL 内建 (`sin`、`mix`、`clamp`、`distance`、`smoothstep`、`reflect`、`select`…)
- 自定义 `fn` / `struct` / `const` / `alias` / `var<private>`、函数内 `let` 与控制流 (if/for/while/switch…)
- 导数 (`dpdx` / `dpdy` / `fwidth`) 仅在 surface/light 钩子 (fragment 阶段) — vertex 钩子中不可
- `const` 数组 (颜色 LUT 等)、指针 (`ptr<function, T>`)、矩阵 (`mat3x3f` 等)
- 标志定义 `#define NAME` (不带值) + `#ifdef` 条件

## 禁止 / 注意

- **不得直接使用纹理**: 不能声明 `texture_*` / `sampler` 类型；图集读取只能经 [`bloxdTexel`](texture-api.md)。*「Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel.」*
- **strict 中禁止 `discard`** — 用 `#ifndef BLOXD_STRICT` 包裹
- `@attributes` / `enable` / `requires` / `override` 被禁止 — 没有 `enable f16;`，因此**没有 f16 类型**
- 没有 `@builtin`，故 `fragCoord` / `vertex_index` 不可触达
- **模块作用域不得使用 `let`** — 请用 `const` 或 `var`
- 没有 `atomic`
- **切勿直接构造输出结构体**: `BloxdLight(...)` 会静态验证失败；从 `bloxdDefault*` 起步
- 裸写 `var x: BloxdSurface;` 是验证错误
- 钩子参数只读 — 修改前先复制
- `#define` 不带值 (只有名称)

## 保留名称

### bloxd 前缀 (总则)

**所有匹配 `/^bloxd/i` (不区分大小写) 的标识符均为保留。** 唯一例外是 9 个钩子函数名。

验证器原文，逐字：

> *「Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>」*

### bloxdSp* 命名空间 (46 个符号)

代码生成器可能注入、因而不可重声明的 46 个符号：

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

它们覆盖标志结构体传递 (`bloxdSpFlags`)、附魔与模型局部输入 (`bloxdSpEnchant` / `bloxdSpItemLocalPosition`)、单元格采样纹理包路径、旋转链与扩展钩子局部量。**包级保留规则比这张表更宽** (一切匹配 `/^bloxd/i` 者)，因此无需背表 — 只要自己的名称不以 `bloxd` 开头即可。

### 纹理名称

以 `bloxdTextureId` 开头的标识符会被解析为纹理名称常量 ([纹理 API](texture-api.md#bloxdtextureid-具名纹理常量))。

## 自动改写

- **Y 导数符号翻转**: 分析器把对 `dpdy`、`dpdyCoarse` 与 `dpdyFine` 的每次调用改写为 `(-dpdy(...))` (验证器的 token 改写环节明确枚举 dpdy 一族为翻转集)。屏幕空间 y 向下，因此这一翻转让「向上的变化率」符合直觉。写 `dpdy(h)` 时按「往上走 h 怎么变」的意图理解即可，产出的代码自带翻转。`dpdx` 与 `fwidth` 一族不受影响

## 实际会看到的诊断

- *「Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>」*
- *「Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel.」*
- *「X reaches bloxdTexel, which only surface and light hooks can use.」*
- *「X reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and Y doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH.」*
- *「BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.」*

## 相关

- [故障排查: 编译](../troubleshooting/compilation.md) · [引擎内部: 着色器验证](../internals/shader-validation.md)
