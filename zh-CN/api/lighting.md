# 光照

> 目标API: 5 · 目标构建: `ab90qa` · 状态: Analyzed (从现行标头逐字复原)

v5 公开了光照 API。引擎原先在内部做的事 (构建 `litColour`) 现在可从包中调用。本页把光照输入、函数与处理顺序作为一个体系来讲。

## 完整管线

完整的颜色链，如默认 light 阶段实现 (`bloxdDefaultLight`) 所示：

```
surface.colour
    │  mix with overlayColour (mix(colour, overlay.rgb, overlay.a))
    ▼
overlaid
    │  multiply by bloxdShading(light) — material & angle response
    ▼
shaded
    │  mix with enchantColour (mix(shaded, enchant.rgb, enchant.a))
    ▼
enchanted
    │  multiply by bloxdWorldLight(light) — world light (brightest of block/sky/held)
    ▼
lit = bloxdLitColour(surface, light)   ← the color "before emission and fog"
    │  + surface.emission               ← emission added after lighting
    ▼
    │  bloxdApplyFog(colour, light)      ← mix(colour, fogColour, fogAlpha)
    ▼
BloxdLight.colour (final color)
```

`bloxdLitColour()` 的顺序 (标头摘要: *「mixed with overlayColour, then bloxdShading, then mixed with enchantColour, then bloxdWorldLight」*):

1. 套用 `overlayColour`
2. 以 `bloxdShading()` 着色
3. 套用 `enchantColour`
4. 以 `bloxdWorldLight()` 套用世界光照

emission 与雾的顺序: **emission 在光照之后、雾之前加入**，且雾也会吞掉 emission (`bloxdDefaultLight` = `bloxdApplyFog(lit + emission, light)`)。

## 函数

### bloxdLit() — 门控

```wgsl
fn bloxdLit() -> bool
```

方块与天空光照是否开启。**关闭时的保证**：

| 字段 | 关闭时的值 |
|---|---|
| `blockLight` / `heldLight` | `0` |
| `skyLight` | `1` |
| `ambientLightColour` / `skyLightColour` | `1` (白) |

v4 的 `#ifdef BLOXD_LIGHTING` 已移除。请改用 `if (!bloxdLit()) { return bloxdDefaultLight(...); }`。

### bloxdShading() — 材质与角度响应

```wgsl
fn bloxdShading(light: BloxdLightIn) -> vec3f {
    let diffuse = light.directional * light.diffuse;
    return saturate(diffuse + light.emissive + light.ambient);
}
```

- 将 `directional` (求和后的 Lambert) 乘以 `diffuse` (材质 RGB 响应)，加上 `emissive` (材质发光) 与 `ambient` (RGB 环境光)，截断到 0–1
- **v5 新输入 `diffuse` / `emissive`** 让你可以只换掉 Lambert 项、保留引擎的材质响应

### bloxdWorldLight() — 世界光照

```wgsl
fn bloxdWorldLight(light: BloxdLightIn) -> vec3f {
    let ambientLight = light.ambientLightColour;
    let blockLight = ambientLight + light.blockLight * (1.0 - ambientLight);
    let skyLight = mix(ambientLight, light.skyLightColour, light.skyLight);
    let heldLight = ambientLight + light.heldLight * (1.0 - ambientLight);
    return max(max(blockLight, skyLight), heldLight);
}
```

- 以 `ambientLightColour` 为下限整型三个通道 (方块 / 天空 / 手持)，再取**最亮者**
- `skyLight` 按天空光量从 `ambientLightColour` 向 `skyLightColour` 插值

### bloxdLitColour() — 引擎配方

```wgsl
fn bloxdLitColour(surface: BloxdSurface, light: BloxdLightIn) -> vec3f {
    let overlay = surface.overlayColour;
    let overlaid = mix(surface.colour, overlay.rgb, overlay.a);
    let shaded = bloxdShading(light) * overlaid;
    let enchant = surface.enchantColour;
    let enchanted = mix(shaded, enchant.rgb, enchant.a);
    return max(enchanted * bloxdWorldLight(light), vec3f(0.0));
}
```

### bloxdApplyFog() — 雾

```wgsl
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}
```

- `fogAlpha`: **0 = 无雾，1 = 只剩 fogColour** (与 v4 的 `fogVisibility` 相反)
- `fogColour` 是游戏的雾 RGB；**游戏没有雾时为 `vec3f(0.0)`**

### bloxdDefaultLight() — 整套默认

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## 输入字段 (BloxdLightIn)

| 字段 | 类型 | 含义 | 备注 |
|---|---|---|---|
| `litColour` | `vec3f` | 已照亮并附魔的 RGB (emission 与雾之前) | 是结果值，不是来源 |
| `directional` | `f32` | 方向光求和的 Lambert | 无方向光时为 0 |
| `diffuse` | `vec3f` | 材质对方向光的 RGB 响应 | 让 `bloxdShading()` 可重建材质响应 |
| `emissive` | `vec3f` | 材质 RGB 发光 (加到方向光上) | |
| `ambient` | `vec3f` | RGB 环境光 (加到方向光上) | |
| `blockLight` | `vec3f` | RGB 方块光 | `!bloxdLit()` 时为 0 |
| `skyLight` | `f32` | 天空光 | `!bloxdLit()` 时为 1 |
| `ambientLightColour` | `vec3f` | 最低 RGB 光照 (下限) | `!bloxdLit()` 时为 1 |
| `skyLightColour` | `vec3f` | 天空光的 RGB 颜色 | `!bloxdLit()` 时为 1 |
| `heldLight` | `vec3f` | RGB 手持光 | `!bloxdLit()` 或空手时为 0 |
| `fogColour` | `vec3f` | 游戏雾 RGB | 无雾时为 0 |
| `fogAlpha` | `f32` | 0 = 无雾，1 = 只剩 fogColour | 与 v4 `fogVisibility` 相反 |

## 光照等级物理 (背景，可跳过)

- **`blockLight` / `skyLight` / `heldLight` 已映射到 0–1**: 0–15 的等级经过一条缓出曲线 (如 `6 → 0.45`、`12 → 0.92`)。三者都不含 `ambientLightColour`
- **提升曲线**: `skyLight` 实为「该处能否看到天空」— 体素遮蔽数据，即一张阴影贴图。基于阈值的向阳/背阴分离可能需要逆变换 (见[写实化指南](../guides/realism.md))
- **雾的内部**: 线性模式下 `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)` (截断 0..1)，按视空间逐顶点计算。当前构建仅支持线性 (细节见[引擎内部: 雾](../internals/fog-internals.md))

## 配方

### 自定义着色 + 引擎的世界光照

v4 作者靠缩放 `litColour` 近似的效果，现在可以精确写出：

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let nDotL = light.directional; // already summed Lambert
    let wrapped = nDotL * 0.5 + 0.5;
    let shaded = saturate(wrapped * light.diffuse + light.emissive + light.ambient);
    let colour = max(shaded * bloxdWorldLight(light), vec3f(0.0));
    return BloxdLight(bloxdApplyFog(colour + surface.emission, light));
}
```

### 保留引擎世界光照，只放大 emission

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission * 2.0, light));
}
```

### 夜晚偏蓝 (由 skyLight 驱动)

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    let night = 1.0 - light.skyLight;
    out.colour = mix(out.colour, out.colour * vec3f(0.75, 0.82, 1.15), night * 0.6);
    return out;
}
```

## 相关

- [函数](functions.md) · [指南: 光照](../guides/lighting.md) · [引擎内部: 光照内部](../internals/lighting-internals.md)
