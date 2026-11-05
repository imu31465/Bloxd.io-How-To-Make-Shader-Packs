# 故障排查

错误与画面问题，**按症状**查找。各页面遵循结构: 症状 → 原因 → 如何检查 → 修复 → 预防。

## 症状索引

| 症状 | 页面 |
|---|---|
| 包加载不了 / zip 与 pack.json 错误 | [加载错误](loading.md) |
| `apiVersion` 消息 / 旧包不运行 | [API 版本错误](api-version.md) |
| 编译不过 / `must be declared as` / WGSL 语法 | [编译错误](compilation.md) |
| 验证错误 (保留名称、strict 契约、`reaches`) | [验证错误](validation.md) |
| 只在部分变体失败 / 在 strict 游戏中被弃用 | [变体专属问题](variants.md) |
| 画面不对 (白霾、无阴影、夜晚怪异) | [画面问题](visual.md) |
| 纹理名称错误 / `did you mean` | [纹理问题](textures.md) |
| 亮度 / 阴影 / 雾问题 | [光照问题](lighting.md) |
| 模型 / 实体 / 附魔问题 | [模型问题](models.md) |
| 卡顿 / 被实机检查弃用 | [性能](performance.md) |
| 法律、安全、常见问题 | [FAQ](faq.md) |

> 目标API: 5 · 目标构建: `bny9u` (2026-11-05 生产环境确认) · 状态: Verified (消息逐字采录自现行验证器与加载器)

## 错误出现在哪里

1. **设置 → Shader Pack 状态行** — 加载器阶段错误 (ID 为 `shaderPack:load*`)
2. **加载器界面的错误列表** — 验证与编译 (文件:行号 + 变体)
3. **浏览器开发者工具控制台** — 运行时与第二阶段 (浏览器 WGSL 编译器) 错误

三阶段加载检查的细节见[入门指南: 验证](../getting-started/validation.md)。
