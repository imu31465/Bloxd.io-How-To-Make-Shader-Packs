# 液体配方



## 水面涟漪 (颜色明灭)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdRenderOffset().x);
    let worldZ = s.position.z + f32(bloxdRenderOffset().z);
    let ripple = sin(bloxdSeconds() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid 恒有 BLOXD_ALPHA —— 守卫作习惯保留
    #endif
    return out;
}
```

## 高度伪透明度 (非真正的浅滩判定)

> v1 中场景深度与水底位置无法引用，仅凭本 API 算不出真实水深。v2 中经液体限定的 `bloxdOpaqueBehind()` 可测得至后方不透明面的厚度 ([第八部分](../history/v2.md) R-E)。以下为不使用它的旧式拟似演出：`s.position.y` 是局部坐标，直接用会随区块原点漂移。以下仅按世界高度改变 alpha 的拟似演出，非沿岸线/水底的浅滩表现。`packWaterReferenceY` 请按世界高度调整。

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // 低处更透、高处接近原 alpha，方向请在游戏中确认
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

## 水下浑浊感

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

## 纯液体包 (地形无损构成)

```wgsl
// 完全不写 terrain_* 钩子。于是：
//  - 地形变体 = 无钩子 = 引擎默认原样
//  - 液体变体 = 仅 liquid_* 钩子生效
```
