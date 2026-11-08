# 着色器验证

> 目标API: 5 · 目标构建: `v98qt8` · 状态: Analyzed (从现行验证器复原)

静态验证 (分析器，加载检查的第 1 阶段)。面向用户的修复方法: [验证错误](../troubleshooting/validation.md)。

## 各阶段

1. **加载器限制** (zip / pack.json 形态) → [包格式](../api/pack-format.md)
2. **静态验证 (分析器)** — 本页；跨全部 6 种变体检查语法、类型、保留名称、钩子契约
3. **浏览器真实编译** → [WGSL 编译](wgsl-compilation.md)
4. **加入游戏时的运行时重验** — 实际编译每一个既存地形材质 (比设置界面检查更严)；失败则该游戏弃用该包

## 特殊函数签名表

验证器在模块 29849 中维护一张表，检查跨钩子调用限制：

```js
const Jq = new Map([
  ["bloxdFragmentBlockPosition", { params: "position: vec3f, normal: vec3f", returns: "vec3i", symbol: null, vertex: true }],
  ["bloxdOpaqueBehind", { params: "", returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }],
  ["bloxdTexel", { params: "textureId: u32, uv: vec2f, mipLevel: f32", returns: "vec4f", symbol: null }],
  ["bloxdTextureSize", { params: "mipLevel: f32", returns: "vec2u", symbol: null }],
]);
```

复原出的逻辑：

- 从 vertex 钩子调用非 `vertex: true` 的特殊函数 → *「X reaches Y, which only surface and light hooks can use.」*
- 带有 `symbol` 的函数 (`bloxdOpaqueBehind` → `BLOXD_SCENE_DEPTH`) 被未定义该宏的变体触达 → *「X reaches Y, which needs BLOXD_SCENE_DEPTH, and Z doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH.」*

注意: `bloxdFragmentBlockPosition` 已不在标头生成中，但它的条目仍留在这张现行表里 — 而标识符检查查的正是这张表，因此调用仍能通过验证。代码生成器也仍会注入定义 (terrain/liquid 与两个 model 程序)，所以该函数在实践中仍可调用。应视其为已弃用: 未写入文档，且可能在任何未来版本中被移除。

## 保留名称诊断

- **`/^bloxd/i` 总则**: *«Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>»*
- **直接的纹理/采样器声明**: *«Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel.»*

## 纹理名称解析与诊断

`bloxdTextureId*` 的解析有专属路径 ([消息](../api/texture-api.md#名称解析错误-逐字取自验证器))：

- **折叠**: 以非字母数字切分、驼峰化、加 `bloxdTextureId` 前缀；反向匹配不区分大小写与下划线
- **拼写建议** (v5 新增): 未匹配的名称按莱文斯坦距离获得建议，阈值 `max(2, floor(len/4)) + 1`
- 帧拼写与旋转副本拼写各有专属消息
- 折叠后有歧义的名称不可用

## v5 的新诊断

- *«BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.»* — 点名被移除的宏
- 读取 `blockFlags` 或引用 `bloxdBlockFlag*` 的包会触发保留名称诊断 — **没有包会静默地行为异常**

## Y 导数改写

分析器的 token 改写环节把每次 `dpdy` / `dpdyCoarse` / `dpdyFine` 调用改写为 `(-dpdy(...))` (dpdy 一族被明确枚举为翻转集)。`dpdx` 与 `fwidth` 不受影响 ([限制](../api/restrictions.md#自动改写))。

## 标头与纹理常量生成

- 标头以只读形式前置 ([引擎标头](engine-header.md))
- `bloxdTextureId*` 块按包从被引用名称**逐包生成**

## HEADER_VERSION

`HEADER_VERSION` 为 `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` (开头整数从 v4 的 8 变为 9)。两个 fnv1a32 后缀分别指纹标头材料与排序后的名称-id 注册表。已保存包的重验用该指纹判定「需要重新检查」([兼容性](../api/compatibility.md#已保存包的重验-需要重新检查))。

## 验证桩

通过静态验证的代码会在浏览器真实 WGSL 检查之前被合成桩代码: `var<private> bloxdValidationP: vec4f` 加 `bloxdValidateVertex` / `bloxdValidateFragment` — 类型桩表 (`bool` → `p.x > 0.0`、`vec3f` → `p.xyz`…) 构造输入结构体并调用钩子。细节: [WGSL 编译](wgsl-compilation.md)。

## 相关

- [验证错误](../troubleshooting/validation.md) · [WGSL 编译](wgsl-compilation.md) · [纹理注册表](texture-registry.md) · [引擎数据](engine-data.md)
