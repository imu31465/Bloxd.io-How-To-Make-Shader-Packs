# 性能

> 目标API: 5 · 目标构建: `v98qt8` · 状态: Verified (基于实测的实践)

包的钩子在每个片段 (地形 / 液体 / 模型的全部像素) 上运行，因此风格选择会显著左右帧率。

## 首要事实

- **light 钩子是最终阶段**: 地形、液体与模型每个被绘制的像素都要跑它 — 也就是屏幕的大部分
- **包跑在 WebGPU 上**: 评估开销时要把包括移动端在内的一档到多档 GPU 都算进去
- 加载器的大小上限 (256 KB `.wgsl`) 同时也是实际的**编译期**天花板

## 开销阶梯 (便宜 → 昂贵)

| 操作 | 开销 | 备注 |
|---|---|---|
| `mix` / `clamp` / 算术 | ◎ 极小 | |
| 输入读取 (`l.skyLight`…) | ◎ | 来自 uniform/顶点属性 |
| `smoothstep` / `pow` | ○ | `pow` 随指数而变 |
| `sin` / `cos` | ○ | 动画主力 |
| `dot` / `normalize` | ○ | |
| `bloxdTexel()` (纹理采样) | △ | mip 越高越便宜 |
| `dpdx` / `dpdy` / `fwidth` | △ | 仅 surface/light 钩子 |
| 分支 (`if`) | △ | WGSL 可能两边都求值；偏 uniform 的条件 (标志判断) 很便宜 |
| 哈希噪声 (大量 `sin`/`fract`) | △ | 微凹凸效果按距离设门 |

## 实践

1. **把效果设门到需要它的面** — `flags` 选取胜过「到处 +20%」
2. **随距离丢弃细节** — `distance(surface.position, bloxdEyePosition())` 超过阈值即提前返回
3. **用 mip** — `bloxdTexel(id, uv, mipLevel + 1.0)` 是 ¼ 分辨率的平均 ([实战示例](../api/texture-api.md#实战示例))
4. **调色优先用 surface 钩子** — light 钩子是全像素的最终阶段
5. **增量添加细节并对比 FPS** ([测试](testing.md))
6. **`#ifdef` 守卫不省运行时** — 变体是编译单元；运行时的节省来自标志与距离

## 测量

- 用浏览器开发者工具 (性能面板 / WebGPU 统计) 对比有无包的 FPS
- 地形重的场景 (阴影丰富的森林) 与水 (液体钩子) 分开测
- 检查移动硬件 — 可能慢几十倍

## 相关

- [测试](testing.md) · [渲染管线](../internals/rendering-pipeline.md) · [纹理 API](../api/texture-api.md)
