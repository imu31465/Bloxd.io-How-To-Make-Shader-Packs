# 引擎数据台账 (v5 实测)

> 目标API: 5 · 目标构建: `v98qt8` (2026-11-08 生产与preprod确认) · 状态: Verified

本文档的实测台账 — 每个已确认的值，全部实测于当前目标构建 `bny9u`。

## 台账

| 项目 | 值 |
|---|---|
| `apiVersion` | `5` (严格 `===`，数字) |
| 引擎标头 | 解码后 8,954 B / 208 行 (随包分发形态 9,125 B，6 处插值)。首行 `// The Bloxd shader pack API, apiVersion 5. Read-only, prepended to all packs.` — 全文见[引擎标头](engine-header.md) |
| 钩子 | 9 个 (terrain/liquid/model × vertex/surface/light)。名称不变；默认模板捆绑全部 9 个 |
| 变体 | 6 种 (strict × 程序)。名称 `strict\|allow.terrain\|liquid\|model` — 光照轴已移除 |
| 宏 | `BLOXD_STRICT` (strict) · `BLOXD_ALPHA` (全部 liquid + 非 strict 的 terrain/model) · `BLOXD_SCENE_DEPTH` (全部 liquid) · ~~`BLOXD_LIGHTING`~~ **已移除** |
| 包 uniform | `@group(3) @binding(0)`，64 B: seconds@0、**lit@4 (u32，新增)**、renderOffset@16、sunDirection@32、eyePosition@48 |
| 包绑定 | group 3: 0 uniform · 1 场景深度 (液体) · 2 `bloxdSpTextureLayers` 存储 |
| 标志 | `BloxdFlags` 结构体，14 个布尔；v4 的位值退役 |
| 加载器限制 | 256 个 `.wgsl` / 256 KB 源码 / 64 KB `pack.json` / 32 MB zip / 1,024 条目；UTF-8；单一 manifest；路径唯一 — 均不变 |
| 纹理注册表 | 1,210 条目 → **896 个可用名称**；相对 cnty9 漂移 +1/−10 ([纹理注册表](texture-registry.md)) → `xkg8x` (2026-11-04)：1,220 / **906** → `bny9u` (2026-11-05)：1,232 / **911 个可用名称** — +5 (交易终端 ×3、石头发电机 ×2)，864 个 id 变化  → `v98qt8` (2026-11-08): 1,227 / **906** (+1 `hay_block_top`, −6 model-converted block textures, 716 id changes; **folding regression**) |
| 光照曲线 | 0–15 级 → 0–1，缓出 (`6 → 0.45`、`12 → 0.92`) — 在标头中，不变 |
| 提升曲线 | `1 - (1 - x / (3 - 2x))^3` — 不变 (当前位于 chunk c9) |
| 方向光锥 | `0.12 / 0.65 / 0.62 / 0.95` — 不变 (chunk c9) |
| 雾颜色 | `vec3f(183/255, 191/255, 195/255)` — 不变 |
| 保留名称 | `/^bloxd/i` (不区分大小写) + 46 个 `bloxdSp*` 引擎符号 ([保留标识符](reserved-identifiers.md)) |
| HEADER_VERSION | `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` |
| strict 标题 | 除 [策略](policy.md) 中 12 个 allow 标题外的一切 (已在 v98qt8 上重新枚举: 116 个游戏定义、28 条 allow 条目 — 同样的 12 个标题) |
| 标头/注册表构建器 | 标头模块 29815 位于 chunk c56 (自 c55 重新编号); 在 `bny9u` 上注册表构建器为模块 29812 (chunk c52/c53/c54、数据模块 1351; `xkg8x` 上为 30093 + 1391) |
| 默认包模板 | chunk c122 (`xkg8x` 上为 c116，v4 为 c124)，1,633 B |

## bundle 布局 (供重新调查者)

着色器管线簇: 加载器 (zip/manifest/限制，模块 32942) 与注册表构建器位于 c52–c54、验证器/标头 c56、WebGPU/代码生成 c57、雾 c9。**默认包模板在 c122** (`xkg8x` 上为 c116，v4 为 c124)。

chunk 格式说明: 每个 chunk 都是一个 ES 模块 (`export const modules = {...}`) — c53 同时携带 c52 与 c53 的模块 — 因此对 bundle 做纯文本检索仍然有效 (模块 id `1371` 位于 *main* 的稀疏模块数组中，不在任何 chunk 里)。

主 bundle 为 3,362,913 字节 (3.36 MB)；chunk 映射增至 201 个 ID (c0–c201，其中 7 个为命名 chunk c0–c6)。

## 过往台账

- v4 (cnty9, 2026-10-27) → [版本历史: v4](../history/v4.md)
- v3 (3ymzdd, 2026-10-19) → [版本历史: v3](../history/v3.md)

## 相关

- [研究日志](research-log.md) · [引擎标头](engine-header.md) · [策略](policy.md)
