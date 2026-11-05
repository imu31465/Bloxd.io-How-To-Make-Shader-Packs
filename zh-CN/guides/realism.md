# 写实化的两大流派

> 目标API: 5 · 目标构建: `bny9u` (2026-11-05, 生产环境) · 状态: Verified (已移植到当前API — 建议实机复核)

**流派 A：加算修正 (defaultLight 起点)** —— 以 `engineColour` (完成色) 为底，叠加暖色辉光或轮廓光。轻便安全，但光照模型仍是默认。

**流派 B：完全重光照 (s.colour 起点)** —— 丢弃 `l.engineColour`，从 `s.colour` (反照率) 与 LightIn 原生素材重组光照。写实化的正统。遵守 4 点：

1. **重打雾**：light 钩子在雾之后调用，请自行施加 `mix(l.fogColour, col, (1.0 - l.fogAlpha))` (R9.10)。雾太浓时用 `min(l.fogAlpha, 0.70)` 设下限。反之在 engineColour 起点的包上再混雾色会导致双重雾发白
2. **无光照变体回退**：`#ifdef BLOXD_LIGHTING` 之外直接返回 `defaultLight`
3. **共用函数整体守卫**：以 `BloxdLightIn` 为参数的共用函数须整个 fn 用 `#ifdef BLOXD_LIGHTING` 包裹 (仅守卫调用处不够)
4. **无太阳方向时**：`bloxdSunDirection()` 为零则不计算方向性高光。`l.directional` 是光量标量而非方向向量，无法恢复高光方向。必要时切换为无方向弱环境光。月亮方向经 `-bloxdSunDirection()` 可得 (只在昼夜循环世界移动——见[引擎内部机制与研究：太阳与月亮](../internals/sun-and-moon.md))
