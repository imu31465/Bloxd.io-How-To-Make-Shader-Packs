# 预处理器

> 目标API: 5 · 目标构建: `ab90qa` · 状态: Analyzed (从现行验证器复原)

条件编译只支持 `#define NAME` (不带值) / `#ifdef` / `#ifndef` / `#else` / `#endif`。`#` 须在行首 (函数体内也可以)。宏名匹配不区分大小写；`#ifdef` 的名称写错时，错误消息会列出官方集合。

## 已定义的宏 (3 个)

| 宏 | 定义于 | 典型用法 |
|---|---|---|
| `BLOXD_STRICT` | 严格游戏变体 (strict.terrain / strict.liquid / strict.model) | 用 `#ifndef BLOXD_STRICT` 包住整个 vertex 钩子与 `discard` |
| `BLOXD_ALPHA` | 存在 `BloxdSurface.alpha` 的变体 — 全部 liquid + 非 strict 的 terrain/model | 包住涉及 alpha 的代码 |
| `BLOXD_SCENE_DEPTH` | 全部液体变体 | 包住 `bloxdOpaqueBehind()` 调用 |

## 宏 × 变体矩阵

| 变体 | `BLOXD_STRICT` | `BLOXD_ALPHA` | `BLOXD_SCENE_DEPTH` |
|---|---|---|---|
| `allow.terrain` | – | ✓ | – |
| `allow.liquid` | – | ✓ | ✓ |
| `allow.model` | – | ✓ | – |
| `strict.terrain` | ✓ | – | – |
| `strict.liquid` | ✓ | ✓ | ✓ |
| `strict.model` | ✓ | – | – |

terrain / liquid / model 的差异是**独立程序，不是宏** — `#ifdef BLOXD_TERRAIN` 并不存在。

## 已移除的宏

- **`BLOXD_LIGHTING`** — v5 已移除。光照状态是 [`bloxdLit()`](lighting.md#bloxdlit--the-gate) 的运行时问题，不再是编译分支。使用它会使验证失败：

> *「BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.」*

v4 迁移模式：

```wgsl
// v4 (fails validation on v5)
#ifdef BLOXD_LIGHTING
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight { ... }
#endif

// v5 (migrated)
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    // ... lighting-enabled processing
}
```

## 示例

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // terrain has alpha only in allow
    out.alpha = s.alpha;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex hooks always need this guard
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdSeconds()) * 0.05;
    return out;
}
#endif
```

## 宏决定结构体形状

- `BloxdSurface.alpha` 只在 `#ifdef BLOXD_ALPHA` 内存在
- `bloxdOpaqueBehind()` 只在 `#ifdef BLOXD_SCENE_DEPTH` 内可调用

见[结构体](structures.md#conditional-fields--macros)。

## 相关

- [入门指南: 变体](../getting-started/variants.md) · [引擎内部: 着色器验证](../internals/shader-validation.md)
