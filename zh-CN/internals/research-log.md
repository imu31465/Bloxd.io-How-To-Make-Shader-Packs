# 研究日志

> 状态: Verified — 本文档的实测值是如何取得的

这里的技术性论断不依赖官方开发者文档，而是建立在**生产包分析**之上。本页记录方法论与证据，以便未来的构建可以被重新验证。

## 核心原则

1. **直接抓取生产包** — 从生产与预发两侧抓取原始 main.js 与 chunk，以 md5 核验同一性
2. **逐字尊重** — 标头、错误消息与 i18n 字符串**原样引用**，绝不转述
3. **复现式测量** — 注册表等派生值通过在 harness 中运行引擎自身模块重算 (真实输出，而非形似的重实现)
4. **具名构建** — 每项测量都带构建 id 与日期

## 本文档引用的构建历史

| 构建 | API | 日期 | 备注 |
|---|---|---|---|
| `szby6g` | v3 时期 | 2026-10-17 | 首次 allow/strict 静态分析 (111 个游戏定义) |
| `3ymzdd` | v3 | 2026-10-20 | v3 指南的证据构建 |
| `sjr0p7` | v3 时期 | 2026-10-17 | 漂移对比基线 |
| `cnty9` | v4 | 2026-10-27 | v4 指南与 905 名称目录的证据 |
| `6pf78` / `tcwczu` | v4 | 2026-10-31 | v4 冻结确认 (万圣节活动 + Skyblock 改版) |
| `ab90qa` | **v5** | 2026-11-03 | v5 首发构建；最初的 v5 基线。prod = preprod (md5 `fc3322212d15be2445c0e8dfc9733fcc`) |
| `xkg8x` | **v5** | 2026-11-04 | 注册表漂移 (+10 个名称)；preprod `2lcqcl` 在着色器包各表面实测一致 |
| `bny9u` | **v5** | 2026-11-05 | ；本文档基线。prod = preprod (主包 md5 `60eea80ec48253b7ac6cc45604dc8273`，自两个主机分别实时抓取确认) |
| `v98qt8` | **v5** | 2026-11-08 | **现行**; 本文档基线. prod = preprod (md5 `7458fd47ff88331d9f451d1456ff48ac`). 注册表漂移 (净 −5)，游戏 115 → 116，以及**纹理常量折叠回归** ([Texture registry](texture-registry.md#the-v98qt8-folding-regression)) |

## 关键方法论

### 引擎标头复原

以现行插值渲染 c55 标头模板 (`${vC}` = apiVersion、经 `${Gq.j}` 的 5 个 uniform 读取) — v5 共 6 处插值 ([引擎标头](engine-header.md))。

### 纹理注册表重算

在微型 webpack harness 中，针对纹理数据 (主 bundle 中的数据模块 1351) 运行引擎的注册表构建模块 (29812，由 chunk 52/53/54 携带)；记录输出 (现行构建 `bny9u` (2026-11-05) 上为具名 911 / 别名 424 / 图集 1,232 — 模块 29812 + 数据模块 1351；`xkg8x` 上为 906 / 416 / 1,220 (模块 30093 + 1391)；v5 首发时为 896) ([纹理注册表](texture-registry.md))。

动画间隔来自 `animDataPerTex` 式的表 (逐层 `numAnimStates` / `animationInterval`) — 只存在三种间隔值: 200 / 250 / 300 ms ([目录](../api/texture-catalog.md#动画族-43-个名称))。

### 错误消息采集

加载器消息逐字取自现行 i18n 字典；验证器消息取自验证模块的字符串字面量。

### allow / strict 静态分析

静态分析全部 111 个游戏定义: `shaderPackPolicy` 的 `"allow"` 字面量 — 8 个直接 + 4 个基变量 = 12 个标题 (26 条记录)，展开继承 (`{...tb,...}`) 亦被追踪 ([策略](policy.md))。

### uniform / 管线复原

`BloxdPackInputs` 字段布局来自 uniform 布局模块 (29838)；纹理三变体代码生成来自 WebGPU 生成器 (c56) ([纹理采样](texture-sampling.md))。

## 漂移观测

| 对比 | 期间 | 结果 |
|---|---|---|
| sjr0p7 → cnty9 | 10 天 | 新增 98、移除 79；779/1121 个名称改 id (69%) |
| cnty9 → ab90qa | 7 天 | +1 (`scorpion_eggs`)、−10 (双箱 ×8、刷怪笼侧面 ×2)；334/905 个名称改 id |
| ab90qa → xkg8x | 1天 | +10 (v5 首发的移除全部回归: 双箱×8、刷怪笼侧面×2)；896 个中 376 个改 id；无移除 |
| xkg8x → bny9u | 1天 | +5 (交易终端 ×3、石头发电机 ×2)；906 个中 864 个改 id (95%)；无移除；动画族 42 → 43 |
| bny9u → v98qt8 | 3 days | +1 `hay_block_top`, −6 (Furnace/Workbench/Artisan Bench became models); 716/905 names changed id (79%); families unchanged; **folding regression** — engine resolves 1,047 unfolded names |

## 未验证 / 推测

- 像素级阴影贴图属于「未来计划」是一种**解读** (由光照模板中未使用的 `var shadow: f32 = 1.;` 推得)
- allow/strict 划分可能逐构建变化 (12 标题同一性已在 ab90qa 与 xkg8x 上复确认；未来游戏未知)
- `bloxdFragmentBlockPosition` (不在 v5 标头中): 签名表条目与运行时注入均已在现行环境确认 — 调用可通过验证并编译；引擎团队是否有意保留未知

## 何时重新验证

检测到游戏更新 (新的 main.js 哈希) 时: 重查标头 (9,125B)、apiVersion 常量、重算注册表、复确认 allow/strict 列表。详细的监控方法不在本文档范围内，但上述模块位置 (c55 / c116 / c56) 是当时的起点 — 在 `bny9u` 上: header/apiVersion 模块 29815 与各验证模块位于 chunk c56，加载器 (zip/manifest/限制) 为模块 32942 (chunk c54)，注册表构建器 29812 位于 chunk c52/c53/c54，WebGPU 代码生成在 chunk c57，默认包模板为模块 33350 (chunk c122)，游戏/策略模块 517 在主 bundle 中

## 相关

- [引擎数据](engine-data.md) · [纹理注册表](texture-registry.md) · [版本历史](../history/)
