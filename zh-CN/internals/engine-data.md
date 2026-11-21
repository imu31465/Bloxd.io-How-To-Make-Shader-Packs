# 引擎数据

> 目标 API：5 · 用途：规格摘要

本页汇总着色器包可使用的 API，以及创建着色器包时需要注意的限制。具体定义和示例请参阅对应的参考文档。

## API 概览

| 项目 | 规格 |
|---|---|
| API 版本 | `5` |
| 钩子 | 9 个（Terrain / Liquid / Model × Vertex / Surface / Light） |
| 变体 | 6 种（allow / strict × terrain / liquid / model） |
| 宏 | `BLOXD_STRICT`、`BLOXD_ALPHA`、`BLOXD_SCENE_DEPTH`。不提供 `BLOXD_LIGHTING` |
| 包 uniform | 80 字节。字段偏移见[包格式](../api/pack-format.md) |
| 纹理 | 使用 `bloxdTextureId<Name>` 形式的具名常量。不要固定使用数字 ID |
| 保留名称 | 以 `bloxd` 开头的标识符由引擎保留 |

## 着色器包限制

| 项目 | 上限 |
|---|---:|
| WGSL 文件数 | 256 |
| WGSL 源码总量 | 256 KB |
| `pack.json` | 64 KB |
| ZIP 文件 | 32 MB |
| ZIP 条目数 | 1,024 |

ZIP 根目录必须且只能放置一个清单文件，所有文件均使用 UTF-8。重复路径和不受支持的 ZIP 格式会被拒绝。详情请参阅[包格式](../api/pack-format.md)。

## API v5 的主要功能

- `bloxdShadow()` 和 `bloxdAirShadow(t)` 提供太阳光与月光产生的阴影信息。
- `bloxdShadowDirection()` 返回投射阴影的光线方向。
- 将 `pack.json` 中可选的 `keepCircleShadows` 字段设为 `true)，即可在使用阴影 API 时保留传统圆形阴影。
- 使用 `bloxdLit()` 在运行时判断光照是否启用；不支持 `BLOXD_LIGHTING` 宏。

## 相关页面

- [API 参考](../api/) — 函数、结构和常量
- [包格式](../api/pack-format.md) — 清单、uniform 和加载器限制
- [纹理目录](../api/texture-catalog.md) — 可用纹理名称
- [各游戏适用策略](policy.md) — allow / strict 范围
- [API v4 迁移指南](../history/v4.md) — 从旧版本迁移
