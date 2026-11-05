# 引擎内部机制与研究

> 目标API: 5 · 目标构建: `bny9u` (2026-11-05 生产环境确认) · 状态: Analyzed (基于生产环境包的 JavaScript 级分析)

通过分析引擎实现复原的内部规格。这里的一切都直接复原自当前生产构建 (`bny9u`) 的 JavaScript。与公开 API 文档 ([API 参考](../api/)) 分离，以保存精确的内部行为与分析结果。

## 导航

| 页面 | 内容 |
|---|---|
| [渲染管线](rendering-pipeline.md) | alphaTest 位置、双光源设置、uniform 实情、贪心网格合并 |
| [钩子接入](hook-invocation.md) | 钩子如何拼接进引擎的 WGSL |
| [引擎标头](engine-header.md) | 完整的 v5 标头 (逐字，8,954B) |
| [着色器验证](shader-validation.md) | 分析器内部、签名表、HEADER_VERSION |
| [WGSL 编译](wgsl-compilation.md) | 第二阶段真实编译与验证桩 |
| [保留标识符](reserved-identifiers.md) | 46 个 `bloxdSp*` 符号 |
| [光照内部](lighting-internals.md) | blockLight / heldLight 结构 |
| [雾内部](fog-internals.md) | 仅线性、32 格渐变带 |
| [纹理采样](texture-sampling.md) | 三变体纹理代码生成 |
| [纹理注册表](texture-registry.md) | 名称→id 解析、896 个名称、实测漂移 |
| [模型渲染](model-rendering.md) | v5 Model 程序 |
| [引擎数据](engine-data.md) | v5 常量/限制/布局台账 |
| [测试因素](testing-factors.md) | 哪些世界/玩家设置会改变包可见值 |
| [策略](policy.md) | shaderPackPolicy — 12 个 allow 标题 |
| [太阳与月亮](sun-and-moon.md) | 什么在喂 bloxdSunDirection |
| [调试手段](debugging.md) | URL 参数、统计面板 |
| [研究日志](research-log.md) | 方法论、构建历史、未验证事项 |

> 目标API: 5 · 目标构建: `bny9u` (2026-11-05 生产环境确认)

内部机制不是稳定的 API 契约 — 它们可能随引擎更新而变化，每页都标注其证据构建 ([研究日志](research-log.md))。
