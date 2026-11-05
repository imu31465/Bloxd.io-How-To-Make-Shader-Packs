# 兼容性

> 目标API: 5 · 目标构建: `bny9u` (2026-11-05 生产环境确认) · 状态: Verified

当前游戏与旧版本包如何互操作。

## 接受的版本

**仅接受 `apiVersion: 5`。** 加载器以 `manifest.apiVersion !== 5` 严格比较，v1/v2/v3/v4 包在**加载瞬间即告失败**。不存在多版本并行接受。

## 加载时消息 (逐字取自现行 i18n 字典)

- `pack.json needs "apiVersion": {{version}}.` — 缺少 `apiVersion` 键
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — 键存在但不是 5

## 已保存的旧包 (无例外 — 静默失效)

此前保存的 v1–v4 包不会抛错。已保存包的解析结果为：

```
{kind: "none", reason: "otherApiVersion"}
```

包随即**静默失效**。只有着色器包设置页会解释原因：

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

## v4 → v5 转换的本质

转换大多是机械性的 (完整清单见 [v5 迁移指南](../history/v5.md))：

- `blockFlags & bloxdBlockFlagX != 0u` → `flags.x` (1:1 改名)
- `#ifdef BLOXD_LIGHTING` → `if (bloxdLit()) { ... } else { return bloxdDefaultLight(...); }`
- `bloxdFragmentBlockPosition` 调用点仍能编译 (引擎会注入它)，但它已不再有文档 — 迁移离开它才是稳妥做法 ([函数](functions.md#bloxdfragmentblockposition--未写入文档但仍在注入))
- 把 `pack.json` 提升为 `"apiVersion": 5`

这次的暗坑：继续读取 `blockFlags`、或把光照钩子包在 `#ifdef BLOXD_LIGHTING` 里的包会**以专用消息验证失败** (分析器现在会对两种情形分别说明)，因此不会有静默的错误行为 — 只是迁移完成前始终被拒绝。

## 已保存包的重验 (「需要重新检查」)

`HEADER_VERSION` 为 `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` (开头整数从 v4 的 8 变为 9)。当引擎标头或纹理注册表变化时 (常见于游戏更新)，已保存包会被标记为「需要重新检查」，并在页面加载时自动重新验证。

一个实测的注册表漂移示例 (相隔 10 天的两个构建)：条目 1200 → 1219 (新增 98 个、移除 79 个)，且拼写未变的名称中 **1121 个里有 779 个改了 id**。换言之：

- **按名称编写的包 (`bloxdTextureIdLava`) 能在漂移中幸存** (加载器会对照现行注册表重新解析)
- **按裸 id 编写的包 (`19`) 在重验时损坏**

详情: [引擎内部: 纹理注册表](../internals/texture-registry.md)。

## 运行环境

- **仅 WebGPU 渲染器**: 安装包会强制启用 WebGPU 渲染器
- **移动端**: 受 WebGPU 限制的环境完全无法运行包 ([环境要求](../getting-started/requirements.md))
- **非图集渲染器配置**: `bloxdTexel` / `bloxdTextureSize` 退化为桩 (白色纹素、1×1)；代码仍可编译运行 ([纹理 API](texture-api.md#纹理-api-到不了的地方))

## 版本支持一览

| API 版本 | 上线时间 | 当前游戏的处理 |
|---|---|---|
| v1 | — | 加载即拒绝 (经 [v2](../history/v2.md) 迁移) |
| v2 | — | 加载即拒绝 |
| v3 | 2026-10-19 | 加载即拒绝 |
| v4 | 2026-10-26 | 加载即拒绝 |
| **v5** | **2026-11-03** | **现行** |

## 相关

- [v5 迁移清单](../history/v5.md) · [版本历史](../history/)
