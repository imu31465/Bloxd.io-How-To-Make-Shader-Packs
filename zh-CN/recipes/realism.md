# 写实化

> 目标API: 5 · 目标构建: `v98qt8` (2026-11-08 生产与preprod确认) · 状态: Verified (已移植到当前API — 建议实机复核)

> 「把原版外观从材质重新组装」的物理系配方集。先读前提：
>
> 1. **light 钩子在片元最后阶段调用**。返回的 colour 原样成为最终颜色。**必须自行重打雾** (R9.10)  
> 2. **引擎默认光照只有乘法**。高光 / 菲涅尔 / 暖冷分离 / 半球环境光都要从零制作  
> 3. `l.engineColour` 是完成色 (已打雾)。丢弃改从 `s.colour` (反照率) 重建才是正统  
> 4. 纹理禁止 → 细节必须全部**程序化** (哈希/噪声) 打入 (R9.8)

## R9.1 暖色火把 × 冷色空光

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
        let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
        let voxel   = max(torch, sky);
        var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // 中间 clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                    // 重打雾
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                 // emission 重加
}
    return out;
}
```

## R9.2 太阳高光 (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
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
}
    return out;
}
```

## R9.3 Schlick 菲涅尔

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let F = pack_schlick(dot(n, viewDir), 0.02);
        out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // 边缘微亮
}
    return out;
}
```

## R9.4 半球环境光 (上=天空 / 下=地面反弹)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let upness = n.y * 0.5 + 0.5;
        let ground = l.ambientLightColour * 0.55;                          // 下：反弹
        let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // 上：空光
        let hemi = vec3f(0.25) + mix(ground, skyH, upness);
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // 中间 clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                           // 重打雾
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                        // emission 重加
}
    return out;
}
```

## R9.5 ACES 胶片化 (Narkowicz 近似)

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

## R9.6 大气透视 (随距离降饱和的「空气感」)

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

## R9.7 波法线 + 太阳闪光 (水面「太阳之路」)

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
    if (bloxdLit()) {
        let baseN = normalize(l.normal);
        let worldPos = bloxdWorldPosition(l.position);
        let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdSeconds()), clamp(baseN.y * 2.0, 0.0, 1.0)));
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);
            let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
            out.colour += glint * vec3f(1.0);
        }
}
    return out;
}
```

## R9.8 程序化微凹凸 (纹理禁止的绕行法)

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
    if (bloxdLit()) {
        let local = fract(l.position - l.normal * 0.5);   // 方块内局部坐标
        let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let lam = clamp(dot(n, sunDir), 0.0, 1.0);
            let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
            out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
        }
}
    return out;
}
```

## R9.9 洞穴非线性压黑 + 灯光保护

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let keep = 0.12 + 0.88 * blockInt;          // 有灯处抬起
        out.colour *= mix(keep, 1.0, sky * sky);     // 非线性 (平方) 压暗
}
    return out;
}
```

## R9.10 重打雾 (丢弃 engineColour 时必需)

> `(1.0 - l.fogAlpha)` 加 `min(l.fogAlpha, 0.75)` 式下限可实现「不再更浓」  
> (0.0 = 引擎一致 / 0.3–0.5 = 远景更透)。
> 注意引擎雾为地平线专用线性雾 (仅绘制距离附近)，中距离霾需包内自制。
> 实际雾设置 (实现已对照)：linear 固定 / `fogStart` = 绘制区块距离 / `fogEnd` = +1 区块 / 雾关闭时 100–101 区块实际无效 / 默认色 RGB(183, 191, 195)。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = s.colour * (voxel * 1.1 + vec3f(0.05));
        col = clamp(col, vec3f(0.0), vec3f(1.0));
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));  // 雾重现 (0.15=偏薄下限)
        col += s.emission * (1.0 - l.fogAlpha);            // emission 同样打雾
        out.colour = col;
}
    return out;
}
```

## R9.11 电影级 (阴影偏冷 / 高光偏暖 / 夜晚去饱和)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let lum = pack_luma(out.colour);
        out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;  // 仅太阳方向为零时算夜，不表现暮色渐变
        out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
}
    return out;
}
```

## R9.12 投影风阴影 —— 提升逆变换 + 阈值切割 (决定版)

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
    if (bloxdLit()) {
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
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));
        out.colour = clamp(col + s.emission * (1.0 - l.fogAlpha), vec3f(0.0), vec3f(1.0));   // emission 别忘了 (打雾后叠加)
}
    return out;
}
```

> 调整指南：**阴影面积只由 `shTh` 决定** —— `0.93`=半径1.5以上 / `0.87`=半径2 / `0.80`=半径3 / `0.67`=半径5。  
> 边缘硬度为 `shSoft` (0.02=硬 / 0.08=软)。影芯暗度由 `0.09` (最低环境光) 与 `0.16` (天空散射光)  
> 的两点偏移决定。黄昏想扩大阴影请加  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (长暮影近似。  
> `sunDir` 为 `bloxdSunDirection() / length(bloxdSunDirection())`)。阴影偏蓝请调高 `vec3f(0.72, 0.82, 1.05)` 的 B。
