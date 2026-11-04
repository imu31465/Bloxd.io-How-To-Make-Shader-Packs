# 附魔效果

> 目标API: 5 · 目标构建: `xkg8x` (2026-11-04 生产环境确认) · 状态: Analyzed (从现行标头复原)

v5 在输入与输出两端都开放了附魔管线。这些配方在保留引擎数学的前提下控制附魔物品与盔甲的闪光。

## 输入与输出

**输入** (`BloxdSurfaceIn` / `BloxdLightIn` — 仅附魔物品与盔甲，其余全为 0)：

```wgsl
enchantTier: u32,     // 1-5 for Tier 1-5.
enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.
```

**输出** (`BloxdSurface`)：

```wgsl
enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
```

引擎在 [`bloxdLitColour()`](../api/lighting.md) 内部混入它 — 紧接着色之后、世界光照之前。`bloxdDefaultSurface` 原样透传输入，因此**默认外观与 v4 的引擎内部行为一致**。

## 理解默认行为

输入的 `enchantColour.a` 是**带动画**的 alpha — 引擎为闪光扫掠做动画，因此逐片段读取 `.a` 就免费得到流动图样。`enchantTier` 与 `enchantSpeed` 构造上自洽 («faster at higher tiers»，等级越高越快)。

非附魔面携带 `enchantTier == 0`、`enchantColour == vec4f(0.0)`、`enchantSpeed == 0.0`。

## 配方 1: 无闪光的写实化 (两行)

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.enchantColour = vec4f(0.0);
    return out;
}
```

## 配方 2: 按等级增强闪光

`enchantTier` 无需解析颜色即可实现经典的「等级缩放闪光」：

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        let tierBoost = 1.0 + f32(surface.enchantTier) * 0.12;
        out.enchantColour.a = clamp(surface.enchantColour.a * tierBoost, 0.0, 1.0);
        out.enchantColour.rgb = surface.enchantColour.rgb;
    }
    return out;
}
```

## 配方 3: 给闪光重新着色

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        var e = surface.enchantColour;
        e.rgb = mix(vec3f(0.35, 0.8, 1.0), vec3f(0.9, 0.5, 1.0),
                    f32(surface.enchantTier) / 5.0);   // low tiers blue, high purple
        out.enchantColour = e;
    }
    return out;
}
```

## 配方 4: 由 enchantSpeed 驱动的扫掠

把 `enchantSpeed` 变成相位，做自定义扫掠：

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        let band = 0.5 + 0.5 * sin(surface.localPosition.y * 6.0
                                   - bloxdSeconds() * surface.enchantSpeed * 2.0);
        var e = surface.enchantColour;
        e.a = clamp(e.a * (0.4 + 0.6 * band), 0.0, 1.0);
        out.enchantColour = e;
    }
    return out;
}
```

## 配方 5: 放大受伤红闪 (overlayColour)

`overlayColour` (仅玩家/生物；受伤红闪等) 在 `bloxdLitColour` 中于光照前混入：

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.overlayColour.a = clamp(surface.overlayColour.a * 1.6, 0.0, 1.0);
    return out;
}
```

对非实体无害 (那里 `overlayColour` 为 0)。

## 与自定义光照组合

使用 `bloxdLitColour()` 可让附魔/覆盖色的混合保持自动：

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## 注意

- 附魔输入**只在附魔物品与盔甲上到来** — 地形、水与非附魔面上全为 0
- 修改 `enchantColour` 输出从不直接触碰 `colour` — 混合发生在 `bloxdLitColour` / `bloxdDefaultLight` 中
- 模型管线之外附魔输入恒为 0

## 相关

- [光照](../api/lighting.md) · [结构体](../api/structures.md) · [模型着色器配方](model-shaders.md)
