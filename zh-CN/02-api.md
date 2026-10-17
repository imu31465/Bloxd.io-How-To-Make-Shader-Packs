[← 上一部分](01-making.md)·[返回手册](README.md)·[下一部分 →](03-recipes.md)

# 第二部分: API 参考

## 10. 引擎头 (自动前置于包代码)

以下代码由引擎自动插入到包代码开头 (包不可重复声明)。`#ifdef` 包裹部分随变体变化。

```wgsl
// Engine-provided and read-only to packs. apiVersion 2.
const bloxdTimeWrap: f32 = 3600.0;   // seconds until time wraps to 0

fn bloxdTime() -> f32;               // seconds. wraps to 0 every 3600 s
fn bloxdOriginOffset() -> vec3i;     // whole blocks. noa-local + this = world coords
fn bloxdEyePosition() -> vec3f;      // camera position (noa-local)
fn bloxdSunDirection() -> vec3f;     // sun direction (unit vector, non-zero only with earth skybox)
fn bloxdWorldPosition(position: vec3f) -> vec3f;  // noa-local -> world coords
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i;  // world block coords of this face
fn bloxdApplyFog(colour: vec3f, l: BloxdLightIn) -> vec3f;   // mix(l.fogColour, colour, l.fogVisibility)

struct BloxdVertexIn {
    position: vec3f,   // noa-local world space (world minus bloxdOriginOffset())
    normal: vec3f,
    blockId: u32,      // owning block id (flat-interpolated, uniform across the face)
}

#ifndef BLOXD_STRICT
struct BloxdVertex {
    position: vec3f,     // noa-local
}
#endif

struct BloxdSurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    blockId: u32,        // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct BloxdLightIn {
    litColour: vec3f,          // engine lighting result (before emission and fog)
    engineColour: vec3f,       // post-fog = bloxdApplyFog(litColour, l). excludes emission
    directional: f32,          // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,            // the material's ambient times the scene's
    blockLight: vec3f,         // voxel block light, tone-mapped (all variants; 0 when unlit)
    skyLight: f32,             // voxel sky light, tone-mapped (all variants; 1 when unlit)
    ambientLightColour: vec3f, // present in all variants (white when unlit)
    skyLightColour: vec3f,     // present in all variants (white when unlit)
    heldLight: vec3f,          // held light here (all variants; 0 when unlit/out of range)
    fogColour: vec3f,
    fogVisibility: f32,        // 1 = no fog, 0 = fully fogged (renamed from v1 fogFactor)
    position: vec3f,           // as in BloxdSurfaceIn
    normal: vec3f,
    blockId: u32,              // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdLight {
    colour: vec3f,
}

// liquid variants, surface / light hooks only
struct BloxdOpaqueBehind {
    found: bool,       // false when no opaque face behind (sky)
    position: vec3f,   // opaque face position behind (noa-local)
    distance: f32,     // distance from the eye
}
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind;

#ifndef BLOXD_STRICT
fn bloxdDefaultVertex(v: BloxdVertexIn) -> BloxdVertex;
#endif

fn bloxdDefaultSurface(s: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdDefaultLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight;
```

要点解读：

- `bloxdTime()` 每 3600 秒回绕，为流逝时间 (`bloxdTimeWrap`)。不保证与游戏内昼夜时钟同步。绑定组的阶段可见性为 VERTEX|FRAGMENT，因此**vertex 钩子也可调用**。
- `bloxdSunDirection()` 仅在太阳存在时为单位向量，无太阳的天空为零。**月亮恒为 `-bloxdSunDirection()`** (引擎将月亮位置算作太阳的严格反方向)。但默认世界太阳静止，月亮也静止，只有实现昼夜循环的世界才看得到月动 (见[第七部分](07-internals.md) §24)
- ※注：此前写成「零时不可复用为月亮方向」。方向本身经 `-bloxdSunDirection()` 可得，但分发包应以零为前提用 `sunPresent` 分支 (蓝色环境光拟似见 R2，方向性月光见第七部 R-A)。
- `emission` 在光照计算后叠加，以 **`fogVisibility` 衰减** (defaultLight 实现 `engineColour + emission × fogVisibility`。完全沉雾的远景发光也消失)
- **雾应用顺序**：片元内处理顺序为 ① 光照·发光合成 → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ light 钩子调用 → ⑤ return。因此 **engineColour 以打雾态到达**，**light 钩子返回值原样成为最终颜色** (钩子后不再重打雾)
- **fogVisibility 定义源**：视图空间距离 (按顶点计算、插值)。linear 模式 `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **fogMode == 0 时**：`fogColour` 以 `vec3f(0.0)` (黑) 到达。以 fogColour 色味推断时段的代码请注意
- **现行构建实际雾设置**：**linear 固定**。`fogStart` = 绘制区块距离、`fogEnd` = +1 区块 (仅地平线)。雾关闭设置下为 100 / 101 区块，实际无效。默认雾色 RGB(183, 191, 195)
- `bloxdPackInputs` uniform (`@group(3) @binding(0)`，64B) **仅经标头函数使用**。包不可直接引用。阶段可见性为 VERTEX|FRAGMENT，因此标头函数也可从钩子外的模块级函数与 vertex 钩子调用。深度纹理 (binding 1) 为 FRAGMENT 专用，因此 `bloxdOpaqueBehind()` 仅限 surface / light 钩子
- **`litColour` 可作起点**：v1 只有打雾后的 `engineColour`，自制大气表现容易双重打雾。v2 从打雾前、emission 前的 `litColour` 出发，经 `bloxdApplyFog()` 按自己的节奏重打雾
- **`blockId` 可区分方块种类**：不依赖纹理颜色的标识。但 ID 与方块种类的对应表在引擎内部，哪一 ID 对应何种方块可世界内实测，现成对应表见 [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (见[第八部分](08-apiv2.md))
- **禁止直接构造结构体**：`BloxdLight(...)` 等构造器调用会被静态检查拒绝。务必从 `bloxdDefault*` 改写，或使用输入的拷贝
- **`skyLight` / `blockLight` / `heldLight` 经过「提升曲线」后到达**。头注释的 `tone-mapped` 即指此：引擎必先对片元施加 `y = 1-(1-x/(3-2x))³` (提亮暗部的 S 曲线) 再交给包。不是体素原始值 (n/15)；如树下 (原始 0.87) 会被提升为 **0.97** 到达
- `skyLight` 实质是「该处能否看见天空」的体素遮蔽数据 (= 阴影贴图)，而非单纯的亮度参数 (见第 15 章「阴影的真相」)

## 11. 变体一览

| 变体 | BLOXD_STRICT | BLOXD_LIGHTING | BLOXD_ALPHA |
|---|---|---|---|
| allow + 无光照 + 地形 | – | – | ✓ |
| allow + 无光照 + 液体 | – | – | ✓ |
| allow + 有光照 + 地形 | – | ✓ | ✓ |
| allow + 有光照 + 液体 | – | ✓ | ✓ |
| strict + 无光照 + 地形 | ✓ | – | – |
| strict + 无光照 + 液体 | ✓ | – | ✓ |
| strict + 有光照 + 地形 | ✓ | ✓ | – |
| strict + 有光照 + 液体 | ✓ | ✓ | ✓ |

头结构体形态也随变体变化 (strict 无 `BloxdVertex`、无光照无 `blockLight` 等、strict 地形无 `alpha`)。

## 12. 骨架速查

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);          // 禁止直接构造，务必从 default 出发
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // 地形仅 allow 时有 alpha
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);         // engineColour + emission*fogVisibility
    #ifdef BLOXD_LIGHTING                       // 守卫仅光照输入
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex 务必带此守卫
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdTime()) * 0.05;
    return out;
}
#endif
```

时刻牢记 5 点：8 变体全部通过 / 严格游戏占大多数 / 纹理不可 / 钩子参数只读 / 模块级不用 `let`。

[← 上一部分](01-making.md)·[返回手册](README.md)·[下一部分 →](03-recipes.md)
