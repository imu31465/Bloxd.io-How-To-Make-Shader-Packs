# 兼容性

> 目标 API：5 · 类型：API 参考

本页说明当前游戏接受的着色器包 API 版本，以及旧版本已保存包的处理方式。

## 当前接受的 API 版本

当前游戏只接受清单中 `apiVersion` 为数字 `5` 的着色器包。字符串 `"5"` 不会被接受。为 API v1–v4 创建的着色器包必须迁移后才能加载。

## 加载时的提示

- `pack.json needs "apiVersion": {{version}}.` — 缺少 `apiVersion` 键
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — 指定的版本与当前版本不一致

## 已保存的旧版本着色器包

为旧 API 版本保存的着色器包无法在当前游戏中运行。着色器包设置页面会提示该包使用了不受支持的版本。请参照对应的迁移指南更新着色器包。

## 已保存着色器包的重新验证

当引擎提供的标头或纹理名称定义发生变化时，已保存的着色器包会重新验证。重新验证会在游戏加载时自动执行。在包代码中，请使用具名常量引用纹理，不要使用可能变化的数字 ID。

## 运行环境兼容性

- **WebGPU：** 着色器包需要支持 WebGPU 的渲染器。
- **移动设备：** 不支持 WebGPU 的环境无法使用着色器包（[运行要求](../getting-started/requirements.md)）。
- **纹理访问：** 在不使用纹理图集的渲染器配置中，`bloxdTexel` 和 `bloxdTextureSize` 无法正常访问图集纹理（[纹理 API](texture-api.md)）。

## API 版本支持情况

| API 版本 | 当前游戏中的支持情况 |
|---|---|
| v1 | 加载时拒绝 |
| v2 | 加载时拒绝 |
| v3 | 加载时拒绝 |
| v4 | 加载时拒绝 |
| **v5** | **当前版本** |

## 相关页面

- [从 v4 迁移到 v5](../history/v5.md)
- [版本历史](../history/)
