[← 上一部分](06-implementation.md)·[返回手册](README.md)·[下一部分 →](08-apiv2.md)

# 第七部分: 内部规格的补充

引擎实现解析发现的追加规格。全部由现行正式构建的 JavaScript 直接复原。

## 24. 太阳与月亮的正体

`bloxdSunDirection()` 之源是仅在天空盒种类变化时改写的天空方向缓冲，判定基准不是「天空有无太阳」而是**「天空盒是否为 earth 型」**。

| 天空盒 | `bloxdSunDirection()` |
|---|---|
| `default` (程序天空) | 非零 (默认值见下) |
| `gloomy` / `interstellar` / `space_*` (立方体纹理) | **恒为 (0,0,0)** |

**月亮恒为 `-bloxdSunDirection()`** (引擎将月亮位置算作太阳的严格反方向)。夜晚按太阳高度判定——`bloxdSunDirection().y < 0` (太阳在地平线下) 时月亮在上。但默认世界太阳静止，月亮也静止，只有实现昼夜循环的世界才看得到月动。

默认世界太阳方向约为 `(-0.56, 0.81, -0.18)` (由 inclination = −0.2 / azimuth = 0.55 算出的单位向量，静止)。测试分发包时可在纸面预测高光方向的实用基准值。

昼夜循环并未内置于引擎——inclination 是静态数值，有昼夜移动的世界由游戏侧更新。每次更新 `bloxdSunDirection()` 也改写跟随。

地形方向光仅为场景启动时生成的 2 盏，**方向强度固定，昼夜不变**。总之**决定地形亮度的要素都不随时间，昼夜「观感」只来自天空盒与 bloxdSunDirection()**，夜间想压暗地形的包只能自行由 bloxdSunDirection() 推定时间带 (§19 的 `sunPresent` 手法)。

### R-A. 方向性月光 — moonDir = −bloxdSunDirection()

仅月亮在上时叠加青白色 Lambert 与弱高光。`moonUp` 在默认静止太阳世界为 0，那里什么都不发生——**只在昼夜循环世界触发的安全月光**。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 月亮恒为太阳严格反方向；白天经 moonDir.y < 0 自动熄灭
    let moonDir = -bloxdSunDirection();
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(bloxdEyePosition() - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. 雾的内部规格

雾计算恒为 LINEAR 模式 (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`，clamp 0..1)，`fogStart = 32 × D`，`fogEnd = 32 × (D + 1)` (D = 雾距离设置；仅 D = 0 特例 fogEnd = 5)。**雾渐变带仅 32 格宽**，`l.fogVisibility` 与其说是「距离雾」，不如说是**到已加载世界边缘的归一化距离**指标。随玩家加载距离变化，距离系演出应自行计算 `distance(l.position, bloxdEyePosition())` (配方 R-B)。

默认雾色 `rgb(181, 191, 195)` (淡青灰)。世界作者经 `fogColourOverride` (hex) 变更。雾模式 0 (NONE) 时 **fogColour 以黑到达**。标准形 `mix(l.fogColour, col, l.fogVisibility)` 安全，因为 fogVisibility 为 1 时不用雾色。脚本 API 还提供两个选项：`fogChunkDistanceOverride` 与 `fogOnSkybox`——Custom Game 可分别独立调整雾距 (D 值) 与雾对天空盒的应用。默认天空盒不受雾影响 (只有开启 `fogOnSkybox` 的游戏会让天空盒也染上雾色)。

玩家侧 `showFog` 关则雾推至 3200–3232 格，实际无效 (`fogVisibility ≈ 1` 持续返回)。

### R-B. 加载边界带 — fogVisibility 作「世界边缘」用

仅 32 格加载边界带悄悄染冷色，淡化世界尽头 (或作为演出强调)。不自行算距离，自动跟随玩家加载距离设置是优点。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = 内侧 (到边界有余裕), 0 = 即将出边界
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. blockLight / heldLight 内部构造

`blockLight` 是**三通道 RGB 彩色光**。各发光方块定义有发射色 `[R, G, B]` (各 0–15)，该色原样成为光色 (普通火把 = 暖白 (14,14,12) / 岩浆 = 橙 (14,8,2) / 信标 = 青 (5,14,14) / 白色火把 = (15,15,15) 等)。到顶点阶段时，它以 4 nibble——r / g / b / sky——打包进一个 float 属性到达。在 light 钩子内分通道处理，即可实现彩色局部照明——暖色火把配方 (R9.1) 正是以该行为为基准校准的。

解码 `aPackedLightLevels` 时，引擎给每通道铺 **RGB 最亮通道 35% 的下限「35% 通道地板」**。如「纯红光源」在顶点先抬为 (1.00, 0.35, 0) 再经插值·提升。火把橙在游戏中显「白粉而非红」正缘于此，暖色火把配方 (R9.1) 饱和度以此默认行为为基准调整为好。

光照合成不是加法。内部上，引擎取方块光 (经 35% 通道地板后) 与按 `mix(环境色, 天空色, skyLight)` 构成的天空光的**最大值**，再与手持光 (经环境光助推后) 取 max。该合成中的通道值是原始值 (提升前)，不同于到达钩子输入的提升后值。因此 `blockLight` 与 `skyLight` 不会相互抵消——较暗一侧的贡献被直接丢弃——削弱天空光也几乎压不暗由方块光主导的地方。请围绕此结构设计曝光/衰减配方 ([第六部分](06-implementation.md) §19 的局部光保护正为此补偿)。

手持光 (`heldLight`) 范围由最亮光色通道定 (最大 15 格)，经 `dist^0.75` 预处理，同 35% 通道地板，`l.heldLight` 为环境光助推**前**之值。自定义物品可设 `spotlightRange` (射程) 与圆锥角——「持握时出光束」模式，其圆锥跟随相机。包无法得知光束方向。

自定义方块可带 `skyLightEmission` (0–15)，**向 skyLight 通道本身注入，与 blockLight BFS 分开**。R9.12 式以 skyLight 阈值判向阳/阴影的包，在人工光源抬高 skyLight 的世界会误判。分发包与 blockLight 组合判定更稳健。

## 27. 管线细节

- **surface 钩子在 alphaTest 「之前」跑**：`out.alpha` 直接喂给丢弃判定。镂空材质 (草、叶) 可做溶解式抖动特效 (配方 R-C)。液体 (混合) 中 `out.alpha` 为真实透明度 (配方 R-D)。通常不透明地形无效果——勿误解
- **`l.ambient` 内容**为 `material.ambient × sceneAmbient`，按材质各异。场景侧直连图形设置「Ambient Lighting Intensity」(默认 0.5)，切勿写死默认值
- **场景的方向光为 2 灯组合**：主光 (方向来自天空设置中的太阳位置，强度 1.0) 与补光 (方向 `[-0.5, -1, -1]`，强度 0.35) 的 Lambert 之和到达 `l.directional`。补光朝下，因此对朝上的面没有贡献，而会照到朝下的表面 (洞穴顶等)。地形只考虑 `_initScene` 中追加的光；启动后追加的光对地形与方块模型被忽略 (官方有一则此意的警告消息)
- **`bloxdTime()` 正体为 `performance.now()`**：`time() { return performance.now() / 1e3 % 3600 }`，为浏览器启动流逝时间按 1 小时回绕。与游戏内昼夜及世界流逝时间无关。想做与游戏时钟同步的动画，在昼夜循环世界由 `bloxdSunDirection()` 方位角推定时间比较现实
- **标头函数读取同一个 uniform**：引擎在 `@group(3) @binding(0)` 放置 64 字节 uniform (4 槽——time / originOffset / sunDirection / eyePosition，little-endian)，`bloxdTime()` / `bloxdOriginOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` 对应读取这些槽。`originOffset` 在当前构建恒为 `[0, 0, 0]` (为浮点世界坐标预留的槽)。包无法写入该 uniform，且包与引擎的 WGSL 合并为同一模块，自行声明相同 group/binding 也不可能
- **顶点数据由 mesher (Web Worker) 构建**：方块地形以每顶点 28 字节交织 (开启 atlas 时 32 字节)——position = float32×3 / normal = 8 位有符号整数×4 / colour = 8 位归一化整数×4 (`s.colour` 的本体——tint × AO 在 mesher 阶段烘焙为 8 位，包侧分离或还原原理上不可能) / UV = float32×2 / atlasIndex = float32。只有光照等级走另外 4 字节的顶点缓冲 ([第七部分](07-internals.md) §26、[第二部分](02-api.md) §11)。顶点按区块实例化绘制
- 加载时区块边界的细棋盘格为引擎屏幕空间 Bayer 4×4 抖动的区块淡入，非包 bug (可用图形设置 `chunkFadeIn` 关闭)
- **`mod` 为保留字**：以 `pack.wgsl:3 'mod' is a reserved word in WGSL.` 拒绝。求余用 `%` 运算符书写

### R-C. Bayer 抖动溶解 — out.alpha 控制 discard

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
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. 水的相机近接淡入 — 液体 alpha 保障视野

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

## 28. 包可见值变化之物 — 测试清单

同一包因**世界与玩家设置**渲染各异。分发前至少在以下 3 环境确认外观：

1. **通常世界** (默认天空盒、无覆盖) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`、默认色
2. **太空系天空盒世界** — bloxdSunDirection() = 0。`sunPresent` 分支的外观
3. **设 `visionMinLightColour` / `skyLightColourOverride` 的自定义世界** — 暗部与颜色被抬高的情形

主要变动源：`lightingOverride` (强制光照) / `skyLightColourOverride`、`ambientLightColourOverride` (hex 替换) / `visionMinLightColour` (「可见最暗色」。实现为对 `uSkyLightColour` 与 `uAmbientLightColour` 二者按分量取 max；Night Vision 在用——「洞穴全黑」系包达不到预想之暗，天空色本身也被垫高) / `heldLightColourOverride`、`Range`、`ConeAngle` / `fogChunkDistanceOverride`、`fogColourOverride`、`fogOnSkybox` / `skyBox` (bloxdSunDirection() 有无)。`uSkyLightColour` 默认 = (1,1,1) 白，`uAmbientLightColour` 默认 = (0.25,0.25,0.30)。`l.ambient` 场景成分 = 图形设置「Ambient Lighting Intensity」(默认 0.5)。`l.fogVisibility` 跟随玩家雾/区块距离设置。另有 `cameraTint` (覆盖全屏的 RGBA 色染) 与 `proximityFadeDistance` / `proximityFadeMinOpacity` (相机对实体的接近淡出) 两种世界侧变动源——`cameraTint` 尤其是叠加在包输出**之上**的最终通道。多数设置也可经脚本 API (`serverOption`) 定义并在对局中更新。

## 29. 调试手段

- URL 参数 `?renderer=lite` — 强制 Lite (WebGPU) 渲染器 (`?renderer=webgl2` / `babylon` 亦可；`babylon` 是 webgl2 的旧名)。优先级：URL 参数 > localStorage `bloxdRenderer` > 设置画面 > 默认 (webgl2)。无效值附带警告忽略。URL 或 localStorage 中残留的覆盖会使需要 WebGPU (lite) 的场景以「needs the new WebGPU renderer, so remove the renderer override...」出错 ([第五部分](05-troubleshooting.md) §17)
- URL 参数 `?vconsole` — 屏幕内控制台 (VConsole)。手机实机验证趁手
- URL 参数 `?drawcalls=1` — 追加绘制统计调试面板。可从调试控制台拾取游戏对象，或用 `drawCalls()` / `why()` / `configureDrawCallWatching()` 查看大型机制 (包内外) 的重绘与每一次绘制逼近约 65,000 顶点上限的情况——很适合定位性能瓶颈
- 控制台输出 `noa-engine v0.33.0` 与 `Renderer: lite from <来源>` — 先确认以防渲染路径误诊
- WebGPU 渲染器在包适用中锁定「强制 ON」。「Disable Block Texture Atlas」设置也锁定 (Atlas 保持 ON)，无 WebGPU 环境包根本无法适用。在分发页写「需要 WebGPU 浏览器」的根据在此
- 方块纹理为二维数组纹理 (`texture_2d_array`)，地形采样器为 nearest + repeat。mesher 还会将材质 / AO / 光照一致的面合并为一个矩形 (**greedy meshing**)，因此合并面的 UV 可能超过单个 tile 宽 (边缘内缩 0.0015)。平铺由硬件 repeat 寻址处理，合并面看起来无缝。注意依附 `vUV` 的程序化细节会在合并面边界断裂——请改为依附世界坐标 (`s.position` + `bloxdOriginOffset()`)
- 每次进游戏运行时重验证 (`checkCompilation`)，以浏览器 WebGPU 实编全部地形材质 (比设置画面静态验证更严)。此处失败的包被逐出该游戏

## 30. 每个游戏的适用模式 (`shaderPackPolicy`)

这里把 §7 的「allow / strict」在标题层面的语义确证下来。只有游戏定义中显式写着 `shaderPackPolicy: "allow"` 的标题才以完整模式运行 (vertex 钩子、`discard`、地形 `alpha`)；未指定 (或 allow 以外的值) 的标题视为 strict — 定义 `BLOXD_STRICT`，守卫内的代码自动失效。这个判定不在包一侧可控，因此弄清哪些标题跑什么内容是发布的前提。

- 依据构建: `szby6g.main.94a7596c.js` (2026-10-17 时点的正式部署)。静态解析全部 111 个游戏定义的结果为 **allow 26 条目 (12 个标题) / strict 85 条目**。
- 在 `shaderPackPolicy` 之上还有分发渠道闸门 (大致 `canUseShaderPacks`)：经外部 portal (如 Coolmath Games 构建) 时，着色器包系统本身可能在 `shaderPackPolicy` 被查看之前就被禁用。下文的 allow/strict 分析基于 bloxd.io 主 Web 构建。
- allow 共在 12 处声明: 游戏定义内的直接书写 8 处与基底变量 (`tb` / `kz` / `cb` / `Fb`) 的 4 处，变体通过 spread 继承 (`{...tb,...}`)。按变体的个别覆写目前不存在 (也不存在 父 allow·子 strict 的逆模式)。

allow 的 12 个标题 (合计 26 条目):

- **Test Gym** — 本体 + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (合计 11 条目)
- **Doodle Cube** — 本体 + Solos / Duos (合计 3)
- **Rocket Obby** — 本体 + Sheep / January (合计 3)
- **9 个独立标题**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

strict 侧特别容易误解的点:

- **Superflat Creative (classic_creativeFlat) 是 strict**。名字虽含「Creative」，但 classic 家族中 allow 的只有普通的 Creative (`classic_creative`)。Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns 等也全部 strict
- **Custom Games (customGames) 是 strict**。自制的自定义游戏中 vertex 钩子系效果不会发动。用于验证工作的话，用 Test Gym 最稳妥
- bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) 系等主要 PvP·服务器系标题全部 strict

另外，strict 标题中包的加载与编译本身照常进行，surface / light 等片元侧配方也正常工作。受到约束的是 vertex 钩子 (`bloxdTerrainVertex` / `bloxdLiquidVertex`)、`discard` 与地形 `alpha` (液体恒有)。

此一览为上述构建时点的静态解析结果；引擎更新会改变 allow/strict 的分布。新版发布时请再确认。

[← 上一部分](06-implementation.md)·[返回手册](README.md)·[下一部分 →](08-apiv2.md)
