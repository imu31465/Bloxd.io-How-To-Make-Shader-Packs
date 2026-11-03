# 包结构

> 目标API: 5 · 目标构建: `ab90qa` · 状态: Verified

## 分发格式

- **格式**: 单个 `.zip`，或一个文件夹 (文件夹加载仅限桌面浏览器)
- **内容**: 一个 `pack.json` (位于包顶层；大小写不敏感) + 1–256 个 `.wgsl` 文件
- 多个 `.wgsl` 文件会拼接为一个模块，因此拆分文件与建子目录都是免费的。文件名没有约束。拼接按**路径名的字典序**进行 (模块级声明与顺序无关，因此只有依赖 `var` 初始化顺序的代码才受影响)。非 `.wgsl` 文件 (README 等) 被忽略

## 大小与格式限制

| 项目 | 限制 | 超限消息 |
|---|---|---|
| zip 大小 | 32 MB | `The zip is over 32 MB.` |
| zip 条目数 | 1,024 | `The zip has more than 1024 entries.` |
| `pack.json` 大小 | 64 KB (UTF-8) | `pack.json is over 64 KB.` |
| `.wgsl` 文件数 | 256 | `The pack has more than 256 .wgsl files.` |
| `.wgsl` 源码总量 | 256 KB (UTF-8) | `The pack's .wgsl files are over 256 KB in total.` |
| zip 形态 | 禁 zip64 / 分卷 / 加密；store 或 deflate；路径不得重复 | 各以专属消息拒绝 |

所有文件必须是合法 UTF-8。

## 打 zip 的要领

把所有内容放在同一个公共根文件夹下的 zip 会自动剥掉该前缀 (macOS 的「压缩」直接可用；`__MACOSX`、`._` 前缀文件与 `.DS_Store` 会被自动排除)。根层级混入杂散文件会破坏顶层检测，因此最稳妥的做法是直接把 `pack.json` 与 `.wgsl` 文件打进 zip (确认 `pack.json` 位于 zip 根部)。
