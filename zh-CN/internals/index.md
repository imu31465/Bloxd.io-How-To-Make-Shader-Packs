# 引擎内部机制

本分类介绍引擎内部行为，帮助理解着色器包的执行过程。这些实现细节可能随游戏更新而变化；稳定的使用规则和可用 API 请参阅 [API 参考](../api/)。


## 内容

| 页面 | 内容 |
|---|---|
| [渲染管线](rendering-pipeline.md) | alphaTest 位置、双光源设置、uniform 的实际数据布局、贪心网格合并 |
| [钩子接入](hook-invocation.md) | 钩子如何拼接进引擎的 WGSL |
| [引擎标头](engine-header.md) | 添加到着色器包前面的 WGSL 声明 |
| [着色器验证](shader-validation.md) | 分析器内部、签名表、HEADER_VERSION |
| [WGSL 编译](wgsl-compilation.md) | 第二阶段真实编译与验证桩 |
| [保留标识符](reserved-identifiers.md) | 46 个 `bloxdSp*` 符号 |
| [光照内部](lighting-internals.md) | blockLight / heldLight 结构 |
| [雾内部](fog-internals.md) | 仅线性、32 格渐变带 |
| [纹理采样](texture-sampling.md) | 三变体纹理代码生成 |
| [纹理注册表](texture-registry.md) | 名称解析以及动画和旋转名称 |
| [模型渲染](model-rendering.md) | v5 Model 程序 |
| [引擎数据](engine-data.md) | API v5 功能和着色器包限制 |
| [测试因素](testing-factors.md) | 哪些世界/玩家设置会改变包可见值 |
| [策略](policy.md) | shaderPackPolicy — 12 个 allow 标题 |
| [太阳与月亮](sun-and-moon.md) | 什么在喂 bloxdSunDirection |
| [调试手段](debugging.md) | URL 参数、统计面板 |


引擎内部实现并非稳定的 API 合约。编写着色器包时，请优先遵循 [API 参考](../api/) 中的公开规格。
