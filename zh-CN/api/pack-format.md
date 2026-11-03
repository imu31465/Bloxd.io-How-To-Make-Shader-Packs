# 包格式

> 目标API: 5 · 目标构建: `ab90qa` (2026-11-03 生产环境确认) · 状态: Verified (在现行加载器上重新实测)

整个包模型一页讲完 — manifest、加载器限制、逐帧 uniform。分步版本见[入门指南](../getting-started/manifest.md)。

## pack.json

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `apiVersion` | number | 必填 | **必须严格等于 `5`** (`===`)。字符串 `"5"` 会失败，并按其 JSON 写法原样报出 |
| `name` | string | 必填 | 去除首尾空白后非空；显示在设置中 |
| `author` | string | 可选 | 若存在则必须是字符串 |

manifest 中的其他内容一律被忽略。`pack.json` 必须是 zip 根部恰好一个 JSON 对象。

## 加载器限制 (在现行 c53 上重新实测)

| 限制 | 值 | 超限消息 |
|---|---|---|
| 每包 `.wgsl` 文件数 | 256 | `The pack has more than 256 .wgsl files.` |
| `.wgsl` 源码总量 | 256 KB | `The pack's .wgsl files are over 256 KB in total.` |
| `pack.json` 大小 | 64 KB | `pack.json is over 64 KB.` |
| zip 大小 | 32 MB | `The zip is over 32 MB.` |
| zip 条目数 | 1,024 | `The zip has more than 1024 entries.` |
| zip 形态 | — | 分卷 zip / zip64 / 加密 / 不支持的压缩各自以专属消息拒绝；所有文件须为合法 UTF-8；恰好一个 `pack.json`；路径不得重复 |

## API 版本检查

加载器以 JavaScript 严格 `!==` 比较 `manifest.apiVersion !== 5`。版本常量 `5` 与标头模板位于同一模块 (c55 / 模块 29836)，因此校验与它所假定的标头同步变动。不符时的消息: 见[兼容性](compatibility.md)。

## 逐帧 uniform: bloxdPackInputs

`@group(3) @binding(0) var<uniform> bloxdPackInputs: BloxdPackInputs` — 仍是 64 字节，但 v5 新增了一个成员 (来自现行 uniform 布局模块)：

| 偏移 | 字段 | 类型 | 备注 |
|---|---|---|---|
| 0 | `seconds` | `f32` | 支撑 `bloxdSeconds()` |
| 4 | `lit` | `u32` | 方块/天空光照开启时为 1；支撑 `bloxdLit()` |
| 16 | `renderOffset` | `vec3i` | 支撑 `bloxdRenderOffset()` |
| 32 | `sunDirection` | `vec3f` | 支撑 `bloxdSunDirection()` |
| 48 | `eyePosition` | `vec3f` | 支撑 `bloxdEyePosition()` |

`lit` 填进了 v4 在 `seconds` 与 `renderOffset` 之间本就存在的填充区 (偏移 4–15 原为对齐间隙；`vec3i` 需要 16 字节对齐，故 `renderOffset` 保持在 16)。总大小与其余偏移均未变。引擎以单次 `setUint32(4, lit ? 1 : 0)` 写入它 — 它是标志，不是光照等级 (v4 的 JS 侧名称 `terrainLightLevels` / `terrainHeldLight` 已从 bundle 中彻底消失)。

**切勿从包中直接引用该 uniform。** 请通过标头函数 (`bloxdSeconds()` 等) 使用。阶段可见性为 VERTEX|FRAGMENT，因此标头函数在模块级函数与 vertex 钩子中也可用。

## 绑定组布局

| binding | 内容 |
|---|---|
| 0 | `bloxdPackInputs` uniform (64 B) |
| 1 | 场景深度纹理 (液体变体) |
| 2 | `bloxdSpTextureLayers` 存储缓冲 |

`minBindingSize` 仍为 64。深度纹理 (binding 1) 仅限 FRAGMENT，这正是 `bloxdOpaqueBehind()` 只能在 surface/light 钩子中使用的原因。

## wgsl 拼接

多个 `.wgsl` 文件按**路径名的字典序**拼接为一个模块。模块级声明与顺序无关；只有 `var` 的初始化顺序可能有影响。非 `.wgsl` 文件被忽略。
