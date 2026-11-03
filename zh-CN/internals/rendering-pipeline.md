# 渲染管线

> 目标API: 5 · 目标构建: `ab90qa` (2026-11-03, 生产环境) · 状态: Analyzed (基于生产环境包的 JavaScript 级分析)

- **surface 钩子在 alphaTest 「之前」跑**：`out.alpha` 直接喂给丢弃判定。镂空材质 (草、叶) 可做溶解式抖动特效 (配方 R-C)。液体 (混合) 中 `out.alpha` 为真实透明度 (配方 R-D)。通常不透明地形无效果——勿误解
- **`l.ambient` 内容**为 `material.ambient × sceneAmbient`，按材质各异。场景侧直连图形设置「Ambient Lighting Intensity」(默认 0.5)，切勿写死默认值
- **场景的方向光为 2 灯组合**：主光 (方向来自天空设置中的太阳位置，强度 1.0) 与补光 (方向 `[-0.5, -1, -1]`，强度 0.35) 的 Lambert 之和到达 `l.directional`。补光朝下，因此对朝上的面没有贡献，而会照到朝下的表面 (洞穴顶等)。地形只考虑 `_initScene` 中追加的光；启动后追加的光对地形与方块模型被忽略 (官方有一则此意的警告消息)
- **`bloxdSeconds()` 的正体是 `performance.now()`**：浏览器启动后的流逝时间，按 1 小时回绕。与游戏内昼夜及世界流逝时间无关。想做与游戏时钟同步的动画，在昼夜循环世界由 `bloxdSunDirection()` 方位角推定时间比较现实
- **标头函数读取同一个 uniform**：引擎将 64 字节的 `bloxdPackInputs` uniform 放在 `@group(3) @binding(0)` (5 槽——seconds / lit / renderOffset / sunDirection / eyePosition，little-endian)，`bloxdSeconds()` / `bloxdLit()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` 对应读取这些槽 ([包格式: 逐帧 uniform](../api/pack-format.md#per-frame-uniform-bloxdpackinputs))。包无法写入该 uniform，且包与引擎的 WGSL 合并为同一模块，自行声明相同的 group/binding 也不可能。`@group(3) @binding(1)` 是液体场景深度纹理，`@binding(2)` 是 `bloxdSpTextureLayers` 存储缓冲
- **顶点数据由 mesher (Web Worker) 构建**：方块地形以每顶点 28 字节交织 (开启 atlas 时 32 字节)——position = float32×3 / normal = 8 位有符号整数×4 / colour = 8 位归一化整数×4 (`s.colour` 的本体——tint × AO 在 mesher 阶段烘焙为 8 位，包侧分离或还原原理上不可能) / UV = float32×2 / atlasIndex = float32。只有光照等级走另外的 4 字节顶点缓冲 (实测值见[引擎数据台账](engine-data.md))。顶点按区块实例化绘制
- 加载时区块边界的细棋盘格为引擎屏幕空间 Bayer 4×4 抖动的区块淡入，非包 bug (可用图形设置 `chunkFadeIn` 关闭)
- **`mod` 为保留字**：以 `pack.wgsl:3 'mod' is a reserved word in WGSL.` 拒绝。求余用 `%` 运算符书写

## R-C. Bayer 抖动溶解 — out.alpha 控制 discard

复现引擎区块淡入所用的**同一 Bayer 4×4 表**，由低方块起按抖动做「熔解」镂空。alphaTest 材质 (草、叶) 触发 discard，液体则为混合透明度。

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod 为保留字：用 % 运算符
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // 由低方块起熔解，dissolve 越高残留越多
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

## R-D. 水的相机近接淡入 — 液体 alpha 保障视野

液体钩子的 `out.alpha` 直连混合。仅透过相机正下方水面，保障潜水·水上相机的视野。

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 格由全透明到通常
    #endif
    return out;
}
```
