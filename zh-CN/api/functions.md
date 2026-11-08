# 函数

> 目标API: 5 · 目标构建: `v98qt8` · 状态: Analyzed (从现行标头逐字复原)

标头函数一览。纹理 API (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`) 连同 `bloxdOpaqueBehind` 在[纹理 API](texture-api.md) 中讲述。

## 帧函数 (整帧同值)

标头注释: *「These functions return the same value for the entire frame.」* 它们读取 `bloxdPackInputs` uniform，因此也可从 vertex 钩子和模块级函数调用。

### bloxdEyePosition

```wgsl
fn bloxdEyePosition() -> vec3f
```

- **返回**: 相机的渲染位置
- **可调用处**: 全部 9 个钩子 + 模块作用域
- **用途**: 视线向量 (`normalize(l.position - bloxdEyePosition())`)、边缘光、距离

### bloxdRenderOffset

```wgsl
fn bloxdRenderOffset() -> vec3i
```

- **返回**: 整数方块偏移；**渲染位置 + 该偏移 = 世界位置**
- 随玩家移动而变化 (使渲染位置保持在 0,0,0 附近)
- `bloxdWorldPosition()` 内部使用它

### bloxdSunDirection

```wgsl
fn bloxdSunDirection() -> vec3f
```

- **返回**: 世界朝向下指向太阳的单位向量；**没有太阳时为零向量**
- **事实**:
  - **月亮永远在 `-bloxdSunDirection()`** (引擎把它放在太阳的反侧)
  - **切勿把零向量传给 `normalize`** — 用 `dot(d, d) < 1e-8` 守卫并回退到常量方向
  - 当前构建没有昼夜循环；一次会话中太阳、月亮和星星都不移动 (只有不透明度切换)。默认大地天空中太阳位于 `(−0.56, 0.81, −0.18)` 附近 (仰角 ≈ 54°)
- **用途**: 色温、光照方向、太阳门控、拟似月光

### bloxdSeconds

```wgsl
fn bloxdSeconds() -> f32
```

- **返回**: 页面加载以来的秒数 (不回绕 — f32 在最初 4.5 小时内保持亚毫秒精度)
- **用途**: 动画；以 `bloxdSeconds() % period` 实现循环计时
- **注意**: 与 v2 的 `bloxdTime()` (在 3600s 回绕) 不同，它不回绕

### bloxdLit

```wgsl
// Whether block and sky lighting is on. When it's off, BloxdLightIn's
// blockLight and heldLight are 0, and its skyLight and light colours are 1.
fn bloxdLit() -> bool
```

- **返回**: 方块与天空光照是否启用
- **v5 新增**: 以运行时检查取代 v4 的 `#ifdef BLOXD_LIGHTING` 编译期分支
- **关闭时的保证** (标头注释): `blockLight` 与 `heldLight` 为 0；`skyLight` 与光照颜色 (`ambientLightColour` / `skyLightColour`) 为 1
- **用法**: 为依赖光照的代码设门：

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    // ... lighting-enabled processing
    return out;
}
```

使用 `BLOXD_LIGHTING` 会得到 *「BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.」*

## 坐标转换

### bloxdWorldPosition

```wgsl
// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f
```

- **返回**: `position + vec3f(bloxdRenderOffset())`
- **注意**: f32 精度限制意味着远处坐标可能不精确 (标头: *「with possible f32 inaccuracy」*)

### bloxdFragmentBlockPosition — 未写入文档但仍在注入

```wgsl
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i
```

该函数**已不在有文档的标头里** (v4 时还在)，但引擎仍接受并定义它：

- **验证器**: 仍在现行签名表中，因此任何钩子 (包括 vertex 钩子) 里的调用都能通过名称验证
- **运行时**: 代码生成器仍向 terrain/liquid 模块与两个 model 程序注入定义 — terrain/liquid 用 `vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset()`；model 管线用 1/64 方块偏移，对放置的方块模型吸附到其单元格
- **告诫**: 作为未写入文档的内部实现，它可能在将来版本中不加通知地消失 — 连续位置请用 `bloxdWorldPosition()`，「这是哪个方块」请用 `flags` (从标头移除的经过见[版本历史: v5](../history/v5.md))

为 v4 编写并调用它的包仍可工作；新包不应采用。

## 默认函数 (引擎行为)

### bloxdDefaultVertex

```wgsl
fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex
// impl: return BloxdVertex(vertex.position);
```

### bloxdDefaultSurface

```wgsl
fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface
```

透传 `colour`，原样透传 `enchantColour` / `overlayColour`，将 `emission` 置零 (并在 `BLOXD_ALPHA` 变体中透传 `alpha`)。**输出结构体只能经此函数构造。**

### bloxdDefaultLight

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight
// impl:
//   let lit = bloxdLitColour(surface, light);
//   return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
```

字面意思就是「套用引擎配方，再把加了 emission 的结果蒙上雾」。

## 光照配方函数

引擎自己的光照配方，以可调用的 WGSL 记录 — 可单独组合或覆盖各阶段。说明与流程图: [光照](lighting.md)。

| 函数 | 签名 | 职责 |
|---|---|---|
| `bloxdShading` | `(light: BloxdLightIn) -> vec3f` | 面的材质与角度如何照亮它 (Lambert × 漫反射 + 自发光 + 环境，截断到 0–1) |
| `bloxdWorldLight` | `(light: BloxdLightIn) -> vec3f` | 此处的世界光照 (方块/天空/手持中最亮者，由 `ambientLightColour` 兜底) |
| `bloxdLitColour` | `(surface: BloxdSurface, light: BloxdLightIn) -> vec3f` | 按引擎方式照亮后的表面颜色 (emission 与雾之前) |
| `bloxdApplyFog` | `(colour: vec3f, light: BloxdLightIn) -> vec3f` | 套用该片段的雾 (`mix(colour, fogColour, fogAlpha)`) |

## 特殊函数

### bloxdOpaqueBehind

```wgsl
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind
```

- **返回**: `BloxdOpaqueBehind` (`hit: bool`、`position: vec3f`、`distance: f32`)
- **可调用处**: 仅 surface / light 钩子 (深度纹理仅限 FRAGMENT)
- **守卫**: `#ifdef BLOXD_SCENE_DEPTH` (液体变体中定义)
- **含义**: 该片段背后的不透明面 (透过水看到的地形)；天空时 `hit == false`
- **自 v2 改名**: `found` → `hit`
- **深入**: [版本历史: v3](../history/v3.md) 与[引擎内部](../internals/rendering-pipeline.md)

## 相关

- [光照](lighting.md) · [纹理 API](texture-api.md) · [包格式](pack-format.md)
