# 引擎数据摘要

> 目标 API：5 · 状态：Analyzed

本页汇总着色器包可使用的 API。具体用法请参阅 [API 参考](../api/)。

## API 范围

| 项目 | 规格 |
|---|---|
| API 版本 | `5` |
| 引擎标头 | 216 行；参见[引擎标头](engine-header.md) |
| 钩子 | 9 个（Terrain / Liquid / Model × Vertex / Surface / Light） |
| 变体 | 6 个（strict × terrain / liquid / model） |
| 宏 | `BLOXD_STRICT`、`BLOXD_ALPHA`、`BLOXD_SCENE_DEPTH` |
| 包 uniform | 80 字节；参见[包格式](../api/pack-format.md) |
| uniform 字段 | `seconds` @0、`lit` @4、`renderOffset` @16、`sunDirection` @32、`eyePosition` @48、`shadowDirection` @64 |
| 纹理名称 | 可用的命名常量列于[纹理目录](../api/texture-catalog.md) |

## 阴影 API

- `bloxdShadow()` 返回引擎计算的日光/月光阴影系数。
- `bloxdAirShadow(t)` 在摄像机与片段之间的指定位置评估阴影。
- `bloxdShadowDirection()` 返回产生阴影的光照方向。
- `keepCircleShadows` 是 `pack.json` 的可选布尔字段，可保留旧式圆形阴影。

## 相关页面

- [API 参考](../api/) — 着色器包可用的 API
- [包格式](../api/pack-format.md) — manifest、uniform 和加载器限制
- [游戏策略](policy.md) — 各游戏的限制
