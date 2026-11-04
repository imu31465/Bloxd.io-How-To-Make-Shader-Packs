# 阴影

> 目标API: 5 · 目标构建: `xkg8x` · 状态: Verified (LightEngine 行为自 v4 实测以来不变)

着色器包里做出「阴影」的三种方式，以及它们的极限。

## 能 / 不能

| 效果 | 可行? | 做法 |
|---|---|---|
| 树下/屋檐下明确压暗 (投影式) | ◎ | `skyLight` 提升逆变换 + 阈值切割 (见下) |
| 阴影实时跟随方块编辑 | ◎ | LightEngine 立即重算 — 自动的 |
| 阴影偏冷 / 向阳偏暖 | ◎ | 双色偏移 |
| 阴影随太阳旋转 (阴影贴图) | ✕ | 深度仅限液体；光线遮挡不是输入 |
| 物理半影 | ✕ | 受体素分辨率 BFS 扩散所限 |
| 实时 AO (SSAO) | ✕ | 只有烘焙进顶点色的 AO |

## skyLight 是一张体素阴影贴图

`l.skyLight` 不只是亮度参数。网格生成器的 LightEngine 计算 Minecraft 风格的**「该处能否看到天空」体素遮蔽数据 — 即一张阴影贴图**：

1. **逐列扫描**: 每个 (x,z) 列自上而下；天空光从 15 出发，遇到不透明方块归 0，按 `lightFilter` 衰减 (空气 1 / 水 3 / 不透明 15)
2. **BFS 泛洪填充**: 水平扩散到 6 邻域 (每格 -1) — 这会柔化阴影边缘。半径 r 的遮蔽体下原始值为 (15-r)/15
3. blockLight (火把) 是独立的 RGB 三通道 (4 位打包) BFS

树下、屋檐下与建筑内部该值本就偏低并逐顶点平滑插值。放置或破坏方块会立即重算 — **实时跟随的阴影**。

## 提升曲线的陷阱

`l.skyLight` 到手时**已过提升曲线** (`y = 1-(1-x/(3-2x))³`，一条抬高低值的 S 曲线)：

| 位置 | 原始体素值 | 提升后 (= l.skyLight) | pow(·, 5.0) |
|---|---|---|---|
| 露天 | 1.00 | 1.00 | 1.00 |
| 树下 (半径 2) | 0.87 | **0.97** | **0.86** ← 几乎没压下去 |
| 半径 3 | 0.80 | **0.92** | 0.66 |
| 半径 5 | 0.67 | 0.78 | 0.29 |

**这正是「gamma 压不黑阴影」的已证根因** — 即使 γ=5 也只把树下的 0.97 压到 0.86。

## 解法: 提升逆变换 + 阈值切割

该曲线单调且可精确求逆: `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`。先还原原始值，再用 **`smoothstep` 阈值**二值化。LightEngine 的 BFS 扩散是「每相邻格 -1」，因此 `th = 1 - r/15` 直接就是「多少遮蔽半径算作阴影」的旋钮。

完整实现 (太阳门控 + 暖冷分离 + blockLight 直通) 在[写实系配方](../recipes/realism.md)。关键步骤：

```wgsl
// 1. restore the raw value (skipping this means shadows never appear)
let skyRaw = sh_unlift(l.skyLight);
// 2. threshold-cut — sunlit 1 / shadow 0
let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
// the essence of projection: direct sun only reaches places that see the sky
let lit = sunL * sky;
```

旋钮: **面积** = `shTh` (0.93→半径 1.5 / 0.87→2 / 0.80→3 / 0.67→5)；**边缘柔度** = `shSoft`；**影芯暗度** = 最低环境光与天空散射光的两点偏移；傍晚长影 ≈ `thEff = shTh + 0.10 * (1 - clamp(sunDir.y, 0.0, 1.0))`。

## 老实的极限

- 阴影以**上方天空**为基准，因此**不随太阳旋转** (体素分辨率；柔边来自 BFS 扩散)
- 引擎的光照模板保留着一个未使用的 `var shadow: f32 = 1.;` (恒为 1.0 = 禁用) — 像是像素级旋转阴影「未来计划」的痕迹
- 像素级旋转阴影在当前 API 之外 ([达不到的表现](constraints.md))

## 相关

- [写实系配方](../recipes/realism.md) (完整投影阴影配方) · [光照内部](../internals/lighting-internals.md) · [调试技巧](debugging.md)
