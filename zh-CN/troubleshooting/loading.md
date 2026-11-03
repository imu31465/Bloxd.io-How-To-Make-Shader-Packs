# 加载错误

> 目标API: 5 · 状态: Verified

在**加载器阶段** (第一道关卡) 被拒绝的错误，显示在设置状态行中，ID 为 `shaderPack:load*`。

## 「There's no pack.json at the top of the pack.」

- **原因**: zip 根部没有 `pack.json` (例如文件夹被打包时多了一层嵌套)
- **检查**: 打开 zip — `pack.json` 应在顶层 (或恰好位于单个公共根文件夹之下)
- **修复**: 直接把 `pack.json` 与 `.wgsl` 文件打进 zip。单个公共根文件夹会被自动剥掉 ([包结构](../getting-started/pack-structure.md))
- **预防**: 固定你的打包流程；macOS 的「压缩」直接可用 (系统杂物会被自动排除)

## zip 加载时报 `loadDuplicateManifest`

- **原因**: 出现两个 `pack.json` (包括仅大小写不同的情况)
- **修复**: 只保留一个

## 大小与数量限制

| 消息 | 限制 |
|---|---|
| `The zip is over 32 MB.` | zip 32 MB |
| `The zip has more than 1024 entries.` | 1,024 条目 |
| `The pack has more than 256 .wgsl files.` | 256 个 `.wgsl` |
| `The pack's .wgsl files are over 256 KB in total.` | 总量 256 KB |
| `pack.json is over 64 KB.` | manifest 64 KB |

- **修复**: 删掉不需要的 `.wgsl` / 合并文件 / 精简注释
- **预防**: 这些限制也是实际的编译期天花板 — 把增长当作重构信号

## 格式问题

分卷 zip、zip64、加密条目与不支持的压缩各自以专属消息拒绝。所有文件必须是合法 UTF-8。

## 加载器错误 ID 参考

| ID | 含义 |
|---|---|
| `loadZipTooBig` | zip 超过 32MB |
| `loadTooManyZipEntries` | 超过 1024 条目 |
| `loadTooManyWgsl` | 超过 256 个 `.wgsl` |
| `loadSourceTooBig` | 总量超过 256KB (按文件流式检查) |
| `loadManifestTooBig` | `pack.json` 超过 64KB |
| `loadManifestNotJson` / `loadManifestNotObject` | 不是 JSON / 不是对象 |
| `loadNoApiVersion` / `loadWrongApiVersion` | 缺失 / 不是 `5` ([API 版本错误](api-version.md)) |
| `loadNoName` / `loadAuthorNotString` | 缺 `name` / `author` 不是字符串 |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | 不支持的压缩 / zip64 / 分卷 / 加密 |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | 路径重复 / 非 UTF-8 / 解压失败 / zip 损坏 |
| `loadNoManifest` / `loadDuplicateManifest` | manifest 位置 / 重复 |

## 显示「Ready. Reload the page to use it.」却毫无变化

- **原因**: 包需要**页面重载**才会激活
- **修复**: 选中后重载页面；状态应变为 `Ready to use`
- **注意**: URL 或 localStorage (`?renderer=`、`bloxdRenderer`) 中残留的渲染器覆盖项会让包拒绝启动 — 清掉它们再重载

## 相关

- [API 版本错误](api-version.md) · [包结构](../getting-started/pack-structure.md) · [包格式](../api/pack-format.md)
