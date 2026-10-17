> [← 上一部分](2-api.md)·[返回手册](README.md)·[下一部分 →](4-realism.md)

# 第三部分: 配方集

- [R1. 颜色配方 (surface)](#r1-颜色配方-surface)
- [R2. 光照配方 (light)](#r2-光照配方-light)
- [R3. 自发光配方 (emission)](#r3-自发光配方-emission)
- [R4. 坐标配方 (世界/方块/视线)](#r4-坐标配方-世界方块视线)
- [R5. 时间配方 (动画)](#r5-时间配方-动画)
- [R6. 液体配方](#r6-液体配方)
- [R7. 顶点配方 (仅 allow)](#r7-顶点配方-仅-allow)
- [R8. 数学小技巧](#r8-数学小技巧)
- [R9. 写实系配方](#r9-写实系配方)

---

所有片段均按 8 变体通过前提写好守卫，可直接复制改常数使用。但以下配方为独立示例，不可从上到下全部拼接——同一钩子名 (`bloxdTerrainLight` 等) 或同一辅助函数名重复粘贴，会在同一模块内重复定义导致编译失败。多效果并用时，请按钩子种类合并为一个函数。

## R1. 颜色配方 (surface)

### 单色 tint (最基础)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 饱和度提升 / 去饱和

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 变鲜艳 / -1.0 全单色
```

### 色温 (暖色 ⇄ 冷色)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = 暖 (偏红), -1.0 = 冷 (偏蓝)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### 复古 / 棕褐

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### 高度渐变 (低地偏暖)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 高度 0..50 对应 1..0
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 按面朝向分涂 (朝上=亮、墙=暗)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // 地面 1 / 墙 0 / 顶 -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // 墙与顶稍暗
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 色调分离 (减色数)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. 光照配方 (light)

### 对比 S 曲线

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### 距离霾 (自制雾)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 64~192 格叠加 0..0.35 的自制雾
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### 夜晚 (skyLight 驱动偏蓝 + 灯光保护)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
    #endif
    return out;
}
```

### 洞穴压黑 (无 skyLight 处更暗)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    out.colour *= mix(1.0, 0.35, underground * underground);
    #endif
    return out;
}
```

> `skyLight` 为提升后之值 (第 10 章)，浅遮蔽 (树下：原始 0.87 → 提升后 0.97) 用此法几乎压不暗。对洞穴 (原始 0) 有效。「树荫」要明显请用 R9.12 的提升逆变换 + 阈值法。

### 夜晚蓝色环境光 (无月亮方向的拟似表现)

> 本 API 中无太阳的天空 `bloxdSunDirection()` 为零。这不是方向性月光，只是天空暗时极弱的蓝色环境光。月亮方向本身经 `-bloxdSunDirection()` 可得 (仅昼夜循环世界。第七部 R-A)。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let upward = clamp(l.normal.y, 0.0, 1.0);
    out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
    #endif
    return out;
}
```

### 黄昏暖化 (随太阳高度偏色)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 地平线 1 / 正上方 0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### 引擎输出完全替换 (最简单的重光照)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // ※ BloxdLight(...) 直接构造禁止。从 default 出发改写 colour
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // 丢弃 engineColour (引擎光照结果)，换成「材质色 × 自算亮度」
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // 丢弃 engineColour，重打雾必需
    out.colour = col + s.emission * l.fogVisibility;   // emission 自己加 (必需)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. 自发光配方 (emission)

> `emission` 在光照计算后叠加，但默认处理以 **`fogVisibility` 衰减。完全沉雾的远景发光也消失。远景也想发光的成分不要加到 emission，在 light 钩子内以 `out.colour += ...` 直接叠加** (engineColour 已打雾，远景光落在雾色之上)

### 灯光脉动 (火把呼吸)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(bloxdTime() * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### 发光矿石感 (亮材质发光)

```wgsl
// surface 侧：材质越亮 (越白) emission 越强
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### 萤火虫群感 (随时间漂移的光点)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // 数个缓慢移动的「光球」，按距离倒数发光
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. 坐标配方 (世界/方块/视线)

### 世界坐标

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### 方块坐标

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
```

### 棋盘格 (按方块)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 或 1
out.colour *= mix(0.96, 1.04, checker);
```

### 按方块伪随机 (哈希)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// 用途：草色变化、石头色斑等
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### 视线向量与轮廓光

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### 视线角度 (菲涅尔感 —— 液体用)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 正对 1 / 掠角 0
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. 时间配方 (动画)

> `bloxdTime()` 每 3600 秒 (1 小时) 回绕。但这是着色器流逝时间，不保证与游戏内太阳/昼夜同步。视觉周期动画可用，实际夜晚判定优先用 `bloxdSunDirection()` 与光照输入。

### 昼夜循环 (1 小时 1 天)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 的 1 小时周期，不保证与游戏内昼夜同步
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### 摇摆 (多 sin 叠加)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### 流動极光带 / 荧光带

```wgsl
// 以 XZ 位置与时间混合 3 色
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

## R6. 液体配方

### 水面涟漪 (颜色明灭)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid 恒有 BLOXD_ALPHA —— 守卫作习惯保留
    #endif
    return out;
}
```

### 高度伪透明度 (非真正的浅滩判定)

> v1 中场景深度与水底位置无法引用，仅凭本 API 算不出真实水深。v2 中经液体限定的 `bloxdOpaqueBehind()` 可测得至后方不透明面的厚度 ([第八部分](8-apiv2.md) R-E)。以下为不使用它的旧式拟似演出：`s.position.y` 是局部坐标，直接用会随区块原点漂移。以下仅按世界高度改变 alpha 的拟似演出，非沿岸线/水底的浅滩表现。`packWaterReferenceY` 请按世界高度调整。

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // 低处更透、高处接近原 alpha，方向请在游戏中确认
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### 水下浑浊感

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### 纯液体包 (地形无损构成)

```wgsl
// 完全不写 terrain_* 钩子。于是：
//  - 地形变体 = 无钩子 = 引擎默认原样
//  - 液体变体 = 仅 liquid_* 钩子生效
```

## R7. 顶点配方 (仅 allow)

> 全部用 `#ifndef BLOXD_STRICT` 包裹。
> 关于执行条件 (allow 标题一览; Custom Games 为 strict) 的细节参见本篇 §30 → [§30 每个游戏的适用模式](7-internals.md#30-每个游戏的适用模式-shaderpackpolicy)

### 草随风摆 (只动上端)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // 仅垂直面
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### 液面波 (仅上表面)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdTime() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdTime() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### 脉动地形

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // 沿法线轻微胀缩
    return out;
}
#endif
```

### 波浪地形 (巨大 sin 波)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdTime() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdTime() * 0.7) * 0.3;
    return out;
}
#endif
```

## R8. 数学小技巧

```wgsl
// 0..1 平滑分级 (n 级)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 二级阈值 (卡通阴影)
let shadow = smoothstep(0.35, 0.37, level);   // 阈值 ±0.02 形成台阶

// 三级卡通
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// 亮度 (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// 平滑脉冲
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// 三角波 (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// 秒 → 「缓慢相位」换算 (无视 3600 秒回绕的演出用)
let phase = t * 0.15;
```

## R9. 写实系配方

> 「把原版外观从材质重新组装」的物理系配方集。前提：
>
> 1. **light 钩子在片元最后阶段调用**。返回的 colour 原样成为最终颜色。**必须自行重打雾** (R9.10)  
> 2. **引擎默认光照只有乘法**。高光 / 菲涅尔 / 暖冷分离 / 半球环境光都要从零制作  
> 3. `l.engineColour` 是完成色 (已打雾)。丢弃改从 `s.colour` (反照率) 重建才是正统  
> 4. 纹理禁止 → 细节必须全部**程序化** (哈希/噪声) 打入 (R9.8)

### R9.1 暖色火把 × 冷色空光

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // 中间 clamp
    col = mix(l.fogColour, col, l.fogVisibility);                    // 重打雾
    out.colour = col + s.emission * l.fogVisibility;                 // emission 重加
    #endif
    return out;
}
```

### R9.2 太阳高光 (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);          // 半向量
        let ndh = max(dot(n, h), 0.0);
        let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
        let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
        out.colour += spec * vec3f(1.0, 0.97, 0.90);
    }
    #endif
    return out;
}
```

### R9.3 Schlick 菲涅尔

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // 边缘微亮
    #endif
    return out;
}
```

### R9.4 半球环境光 (上=天空 / 下=地面反弹)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // 下：反弹
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // 上：空光
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // 中间 clamp
    col = mix(l.fogColour, col, l.fogVisibility);                           // 重打雾
    out.colour = col + s.emission * l.fogVisibility;                        // emission 重加
    #endif
    return out;
}
```

### R9.5 ACES 胶片化 (Narkowicz 近似)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = 曝光
    return out;
}
```

### R9.6 大气透视 (随距离降饱和的「空气感」)

> 与雾 (颜色替换) 不同，再叠「随距离去饱和」会让远景真实得多。  
> 注意：只降饱和度，不动亮度。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // 衰减 (100 格约 30% / 400 格约 75%)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // 只降饱和 (亮度不变)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 波法线 + 太阳闪光 (水面「太阳之路」)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // 高度 h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // ∂h/∂x
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // ∂h/∂z
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = bloxdWorldPosition(l.position);
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdTime()), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);
        let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
        out.colour += glint * vec3f(1.0);
    }
    #endif
    return out;
}
```

### R9.8 程序化微凹凸 (纹理禁止的绕行法)

```wgsl
fn pack_hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}
fn pack_bumpNormal(p: vec3f, n: vec3f, strength: f32) -> vec3f {
    let e = 0.15;
    let h0 = pack_hash(p);
    let hx = pack_hash(p + vec3f(e, 0.0, 0.0));
    let hz = pack_hash(p + vec3f(0.0, 0.0, e));
    let tangentX = normalize(cross(vec3f(0.0, 1.0, 0.0), n) + vec3f(0.0001, 0.0, 0.0));
    let tangentZ = normalize(cross(n, tangentX));
    return normalize(n + tangentX * (hx - h0) * strength + tangentZ * (hz - h0) * strength);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // 方块内局部坐标
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lam = clamp(dot(n, sunDir), 0.0, 1.0);
        let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
        out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
    }
    #endif
    return out;
}
```

### R9.9 洞穴非线性压黑 + 灯光保护

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let keep = 0.12 + 0.88 * blockInt;          // 有灯处抬起
    out.colour *= mix(keep, 1.0, sky * sky);     // 非线性 (平方) 压暗
    #endif
    return out;
}
```

### R9.10 重打雾 (丢弃 engineColour 时必需)

> `l.fogVisibility` 加 `max(l.fogVisibility, 0.25)` 式下限可实现「不再更浓」  
> (0.0 = 引擎一致 / 0.3–0.5 = 远景更透)。
> 注意引擎雾为地平线专用线性雾 (仅绘制距离附近)，中距离霾需包内自制。
> 实际雾设置 (实现已对照)：linear 固定 / `fogStart` = 绘制区块距离 / `fogEnd` = +1 区块 / 雾关闭时 100–101 区块实际无效 / 默认色 RGB(183, 191, 195)。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // 雾重现 (0.15=偏薄下限)
    col += s.emission * l.fogVisibility;            // emission 同样打雾
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 电影级 (阴影偏冷 / 高光偏暖 / 夜晚去饱和)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;  // 仅太阳方向为零时算夜，不表现暮色渐变
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 投影风阴影 —— 提升逆变换 + 阈值切割 (决定版)

> **前提复核 (第 10 章)**：`l.skyLight` 不是体素原始值 (n/15)，而是引擎「提升曲线」  
> `y = 1-(1-x/(3-2x))³` (提亮暗部的 S 曲线) 之后的值。
>
> | 位置 | 体素原始 | 提升后 (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | 开阔天空 | 1.00 | 1.00 | 1.00 |  
> | 树下 (半径2) | 0.87 | **0.97** | **0.86** ← 几乎无伤 |  
> | 半径3 | 0.80 | **0.92** | 0.66 |  
> | 半径5 | 0.67 | 0.78 | 0.29 |
>
> **这就是「加伽马也压不黑阴影」的真因** (数值证明)。但曲线单调，可代数严格逆变换：  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`。恢复原始值后，只需阈值切割 (`smoothstep`) 二值化。  
> LightEngine 的 BFS 横向扩散为「相邻 1 格 = -1」，阈值 `th = 1 - r/15` 直接成为  
> 「r 格以上遮蔽视为阴影」的旋钮。破坏方块阴影即刻移动 (LightEngine 实时重算)。  
> 限制：阴影以「上方天空」为基准，不随太阳旋转 (第 15 章「阴影的真相」)。

```wgsl
// 严格逆变换引擎提升，恢复体素原始 skyLight (n/15)
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // WGSL 无 cbrt，用 pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // 阴影半径旋钮：th = 1 - r/15 (0.87=半径2以上为影)
const shSoft = 0.04;   // 边缘柔度 (0.02=硬 / 0.08=软)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. 恢复原始值 (跳过则永无阴影)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. 阈值切割 —— 向阳=1 / 阴影=0 确实分离
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // 太阳 Lambert (无太阳时回退 l.directional)
    let sunLen = length(bloxdSunDirection());
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                      sunLen > 0.5);
    // 投影的正体：直射太阳只到达看得见天空之处
    let lit = sunL * sky;
    // 阴影侧：染天空蓝而非黑 + 最低环境光
    let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
    var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
    // 火把光穿透阴影 (blockLight 同样被提升，一并恢复)
    let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                         sh_unlift(l.blockLight.g),
                         sh_unlift(l.blockLight.b));
    let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
    col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
    // 重打雾 (丢弃 engineColour 的份)
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // emission 别忘了 (打雾后叠加)
    #endif
    return out;
}
```

> 调整指南：**阴影面积只由 `shTh` 决定** —— `0.93`=半径1.5以上 / `0.87`=半径2 / `0.80`=半径3 / `0.67`=半径5。  
> 边缘硬度为 `shSoft` (0.02=硬 / 0.08=软)。影芯暗度由 `0.09` (最低环境光) 与 `0.16` (天空散射光)  
> 的两点偏移决定。黄昏想扩大阴影请加  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (长暮影近似。  
> `sunDir` 为 `bloxdSunDirection() / length(bloxdSunDirection())`)。阴影偏蓝请调高 `vec3f(0.72, 0.82, 1.05)` 的 B。
>
> ⚠️ 「用 `pow(skyLight, γ)` 加深对比」**对提升后之值加了 gamma**  
