# API 参考

本页介绍当前 API v5。API 定义的主要依据是引擎自动添加到每个着色器包开头的引擎标头（完整内容见[引擎内部](../internals/engine-header.md)）。

## 导航

| 页面 | 内容 |
|---|---|
| [包格式](pack-format.md) | `pack.json` 全部字段、加载器限制、uniform 布局 |
| [着色器钩子](hooks.md) | 9 钩子对照: 签名、目标、运行条件 |
| [标志](flags.md) | `BloxdFlags` 全部 14 个字段 |
| [结构体](structures.md) | 每个结构体的每个字段 (含条件字段) |
| [函数](functions.md) | 全部帧/默认/特殊函数签名 |
| [光照](lighting.md) | 光照 API 与处理顺序 |
| [纹理 API](texture-api.md) | `bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*` 与命名 |
| [常量](constants.md) | `bloxdPi` / `bloxdTau` / `bloxdChunkSize` |
| [预处理器](preprocessor.md) | `BLOXD_STRICT` / `BLOXD_ALPHA` / `BLOXD_SCENE_DEPTH` |
| [限制](restrictions.md) | 语言限制、保留标识符 |
| [兼容性](compatibility.md) | 旧版本包、已保存包重验 |
| [纹理目录](texture-catalog.md) | 1,017 个可用的具名常量（可搜索） |

> API: 5 · 状态: Analyzed（根据引擎标头和验证器还原）

从 v4 迁移？请看[版本历史: v5](../history/v5.md)。
