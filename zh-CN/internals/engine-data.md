# 引擎数据台账

> 目标 API：5 · 目标构建：`bbb6l5`（2026-11-20 已在生产环境与 preprod 验证）· 状态：Verified

本台账汇总当前构建中着色器包可见 API 的已确认数值。模块 ID、chunk 编号等 bundle 内部细节不属于 API 规格，因此不在此列出。

## 当前规格

| 项目 | 当前值 |
|---|---|
| `apiVersion` | `5`（与数值进行严格比较） |
| 引擎标头 | 216 行；全文见[引擎标头](engine-header.md) |
| 钩子 | 9 个（Terrain / Liquid / Model × Vertex / Surface / Light） |
| 变体 | 6 个（strict × terrain / liquid / model） |
| 宏 | `BLOXD_STRICT`、`BLOXD_ALPHA`、`BLOXD_SCENE_DEPTH`；`BLOXD_LIGHTING` 已在 v5 移除 |
| 包 uniform | 80 字节：`seconds` @0、`lit` @4、`renderOffset` @16、`sunDirection` @32、`eyePosition` @48、`shadowDirection` @64 |
| 包 binding | `@group(3) @binding(0)`；`minBindingSize` 为 80 |
| 标志 | `BloxdFlags` 结构体，包含 14 个布尔字段 |
| 纹理图集 | 1,650 层；1,017 个名称；776 个别名 |
| 纹理族 | 64 个旋转族、71 个动画族 |
| 保留标识符 | 匹配 `/^bloxd/i` 的名称，以及 88 个内部 `bloxdSp*` 符号 |
| 游戏定义 | 119 个 |
| 着色器包策略 | 12 个允许的游戏标题、28 条目；见[按游戏划分的策略](policy.md) |
| 默认包模板 | 1,633 字节 |
| 加载器限制 | 256 个 WGSL 文件 / 源码总计 256 KB / `pack.json` 64 KB / ZIP 32 MB / 1,024 个条目 |

## bbb6l5 的变化

`bbb6l5` 保持 `apiVersion: 5` 不变，但扩展了包可见 API：

- 新增 `bloxdShadow()`、`bloxdAirShadow(t)` 和 `bloxdShadowDirection()`，用于访问引擎计算的太阳与月亮阴影。
- uniform 在偏移 64 处增加 `shadowDirection: vec3f`，大小从 64 字节增加到 80 字节。
- `pack.json` 新增可选布尔字段 `keepCircleShadows`，用于保留旧版圆形影子。
- 图集从 1,227 层增至 1,650 层，可用名称从 906 个增至 1,017 个。
- 修复了 `v98qt8` 引入的纹理常量折叠回归。

测量说明与证据见[研究日志](research-log.md)和[纹理注册表内部机制](texture-registry.md)。

## 过往版本

- [版本历史](../history/) — 旧 API 的变化与迁移
- [研究日志](research-log.md) — 测量方法与依据

## 相关

- [引擎标头](engine-header.md) — 完整标头文本
- [按游戏划分的策略](policy.md) — allow / strict 策略列表
- [纹理注册表](texture-registry.md) — 名称与 ID 的对应关系
