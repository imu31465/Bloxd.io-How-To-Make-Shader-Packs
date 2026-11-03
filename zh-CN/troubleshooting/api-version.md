# API 版本错误

> 目标API: 5 · 目标构建: `ab90qa` (2026-11-03 生产环境确认) · 状态: Verified (逐字取自现行 i18n 字典)

围绕 `apiVersion` 的错误。当前游戏**只接受 `5`**。

## 「pack.json needs "apiVersion": {{version}}.」

- **症状**: 加载后立刻出现该消息 (`loadNoApiVersion`)
- **原因**: `apiVersion` 键完全缺失
- **修复**: 加上 `"apiVersion": 5` — 一个**数字** (字符串 `"5"` 会失败)
- **预防**: 从 [pack.json](../getting-started/manifest.md) 模板起步

## 「This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.」

- **症状**: `loadWrongApiVersion`
- **原因**: `apiVersion` 存在但不是 5 (v1–v4 包)
- **修复**: 应用相应的迁移 ([版本历史](../history/))：
  - v4 → v5: [v5 指南](../history/v5.md) — 大多机械 (flags · `bloxdLit()` · `bloxdFragmentBlockPosition` 注意点)
  - v3 → v5: 先应用 [v4](../history/v4.md)
  - v2 或更早 → v5: 依次过 v3 → v4 → v5
- **预防**: API 更新后，查看[兼容性](../api/compatibility.md)与相应迁移指南

## 字符串 "5" 被拒绝

- **原因**: 加载器**严格**比较 `manifest.apiVersion !== 5` (`===`)；JSON 字符串 `"5"` 不是数字 5
- **修复**: `"apiVersion": 5` (不加引号)

## 已保存的旧包静默失效

- **症状**: 之前正常的 v1–v4 包毫无反应，也没有异常
- **原因**: 已保存包解析为 `{kind: "none", reason: "otherApiVersion"}` 并**静默失效**
- **检查**: 设置页状态行: `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`
- **修复**: 从同一界面加载迁移后的替代包
- **预防**: API 更新后，重新发布升版本号的新版并公告 ([分发](../getting-started/distribution.md))

## 迁移后的 v4 包验证失败

三种典型模式 (完整步骤见 [v5 迁移指南](../history/v5.md))：

| 验证消息 | 原因 | 修复 |
|---|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | 使用了 `#ifdef BLOXD_LIGHTING` | 改写为 `if (bloxdLit()) { ... } else { return bloxdDefaultLight(s, l); }` |
| `bloxdBlockFlagRock isn't part of the shader pack API...` (保留名称诊断) | 残留的位常量引用 | 改用 `surface.flags.rock` 等 (1:1 对照表见[标志](../api/flags.md)) |
| `bloxdFragmentBlockPosition` 缺失 | 自 v5 起不在有文档的标头中 (仍被注入并接受 — 见[函数](../api/functions.md)) | 不是待修复的错误: 它能编译；新代码请改用 `flags` / `bloxdWorldPosition()` |

## 相关

- [兼容性](../api/compatibility.md) · [版本历史](../history/) · [pack.json](../getting-started/manifest.md)
