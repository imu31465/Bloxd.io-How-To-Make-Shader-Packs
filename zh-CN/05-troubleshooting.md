[← 上一部分](04-realism.md)·[返回手册](README.md)·[下一部分 →](06-implementation.md)

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

[← 上一部分](04-realism.md)·[返回手册](README.md)·[下一部分 →](06-implementation.md)
