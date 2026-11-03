# 编译错误

> 目标API: 5 · 状态: Verified

通过了静态验证却作为 WGSL 失败的错误，或只在浏览器 WGSL 编译器 (第二阶段) 失败的错误。

## 「bloxdTerrainVertex must be declared as: fn ...」

- **原因**: 钩子签名不符 (参数/返回类型)
- **修复**: 按消息中展示的声明改写 (参数名自由；类型必须完全匹配)
- **预防**: 从[钩子对照表](../api/hooks.md)起步

## 「mixing '*' and '^' requires parenthesis (only in ...)」

- **原因**: WGSL 要求 `^` `&` `|` `<<` `>>` 与其他运算符混用时加括号
- **修复**: 给操作数加括号

## 「... can only be a function's parameter or return type, ...」

- **原因**: `var x: BloxdSurface;` — 裸的类型标注声明会被拒绝，因为标头结构体会增字段
- **修复**: `var out = bloxdDefaultSurface(s);` (light 钩子里也可 `var out = s;`)
- **预防**: 总是从 `bloxdDefault*` 构造输出 ([惯例](../api/structures.md#书写惯例-回顾))

## 「_ can only be the target of a phony assignment, as in _ = f();」

- **原因**: `let _ = f();` 不是合法 WGSL
- **修复**: 写成 `_ = f();`

## 「Lite: …reads scene depth on a page that didn't turn it on」

- **原因**: 读取深度的包 (`bloxdOpaqueBehind`) 在页面生成时处于激活状态；深度可用性在页面生成时就已决定
- **修复**: 保持包激活并重载页面

## dpdy 的符号看起来反了

- **这是有意为之**: 分析器自动把每次 `dpdy` / `dpdyCoarse` / `dpdyFine` 调用改写为 `(-dpdy(...))` (屏幕空间 y 向下)
- **修复**: 无需处理 — 写 `dpdy(h)` 时按「往上走 h 怎么变」的意图理解即可，产出的代码自带翻转 ([限制](../api/restrictions.md#自动改写))
- `dpdx` 与 `fwidth` 不受影响

## 加入游戏时包被弃用 / 实机检查一直跑不完

- **原因**: 实机检查失败，或触发 60 秒强制超时 (`skipped`) — 低配设备与重负载世界常见
- **修复**: 削减重型顶点运算与复杂循环；见[性能](performance.md)

## 相关

- [验证错误](validation.md) · [引擎内部: WGSL 编译](../internals/wgsl-compilation.md) · [限制](../api/restrictions.md)
