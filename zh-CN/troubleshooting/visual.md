# 画面问题

> 目标API: 5 · 状态: Verified

编译正常，画面不对。

## 远处发白/起霾

- **原因**: 雾叠了两层。默认 light 钩子输出**已带雾** (`bloxdApplyFog(lit + emission, light)`)，再往上混雾色就是双份
- **修复**: 自定义雾保持克制；可考虑只做去饱和的大气透视 ([写实系配方](../recipes/realism.md))
- **预防**: 写雾之前先理解 `fogAlpha` 语义 (0 = 无雾，1 = 只剩 fogColour) 与[管线](../api/lighting.md#完整管线)

## pow(l.skyLight, γ) 怎么也压不黑阴影

- **原因**: `skyLight` 到手时已过提升曲线 (原始 0.87 到手是 0.97)；gamma 在数学上竞争不过
- **修复**: 换成提升逆变换 + 阈值 ([阴影](../guides/shadows.md))

## 方块几乎全白

- **原因**: light 钩子输出超过 1.0 (输出之后没有 clamp)
- **修复**: 末尾追加 `clamp(col, vec3f(0.0), vec3f(1.0))`

## 没做加法却发白

- **原因**: 用除法做 un-fog 逆算
- **修复**: 去掉 un-fog；从 `s.colour` 重建、最后一次性上雾 (或经 `bloxdApplyFog`)

## 发光方块不亮 (重建系包)

- **原因**: 漏了重新加 emission — 丢掉默认输出意味着要自己补 emission
- **修复**: 加上 `+ s.emission * (1.0 - l.fogAlpha)`；v5 上最稳妥的是 `bloxdLitColour()` + emission + `bloxdApplyFog` 的组合 ([光照](../api/lighting.md))

## 波纹/图样在区块或原点切换处断开

- **原因**: 直接使用渲染空间位置 — 原点随玩家移动
- **修复**: 依赖世界的效果用 `bloxdWorldPosition(position)` ([坐标](../recipes/coordinates.md))；注意远离原点处的 f32 精度极限

## 旋转面上的水面图样错位

- **原因**: `bloxdTexel` 会把片段自身的 `textureRotation` 应用到你的 uv 上 ([旋转的微妙之处](../api/texture-api.md#旋转的微妙之处--中性采样器))
- **修复**: 用 `texelNeutral` 辅助函数预旋转

## 附魔闪光 / 受伤红闪消失

- **原因**: 自定义光照重建时没有透传 `enchantColour` / `overlayColour`
- **修复**: 透传它们，或改用 `bloxdLitColour()` ([附魔效果](../recipes/enchant-effects.md))
- **v5**: `bloxdDefaultSurface` 原样透传两者，默认行为不会丢

## 天空、云或太阳盘不受影响

- **设计如此**: 钩子只覆盖 terrain / liquid / model ([达不到的表现](../guides/constraints.md))

## 相关

- [光照问题](lighting.md) · [调试技巧](../guides/debugging.md) · [雾内部](../internals/fog-internals.md)
