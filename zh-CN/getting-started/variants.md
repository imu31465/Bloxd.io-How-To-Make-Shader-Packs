# 变体与守卫

> 目标API: 5 · 目标构建: `ab90qa` (2026-11-03 生产环境确认) · 状态: Analyzed

## 6 种变体

你写一份代码，但它必须在全部 **6 种变体**中编译通过: `{strict, allow} × {terrain, liquid, model}`。加载器在加载时验证全部六种。

v4 及更早的「光照开/关」轴已不复存在 (v4 有 8 种变体)。光照状态现在是 [`bloxdLit()`](../api/lighting.md) 的运行时问题，不再是编译期分支。

| 变体 | 示例 | 定义的宏 |
|---|---|---|
| `allow.terrain` | allow 游戏中的地形 | `BLOXD_ALPHA` |
| `allow.liquid` | allow 游戏中的水 | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | allow 游戏中的模型 | `BLOXD_ALPHA` |
| `strict.terrain` | strict 游戏中的地形 | — |
| `strict.liquid` | strict 游戏中的水 | `BLOXD_SCENE_DEPTH` |
| `strict.model` | strict 游戏中的模型 | — |

## 条件编译

只有 `#define NAME` (不带值) / `#ifdef` / `#ifndef` / `#else` / `#endif` 可用。`#` 须在行首 (函数体内也可以)。

| 守卫 | 含义 | 典型用法 |
|---|---|---|
| `#ifndef BLOXD_STRICT` | 仅非 strict (allow) 变体 | 包住整个 vertex 钩子、包住 `discard` |
| `#ifdef BLOXD_ALPHA` | 存在 `alpha` 的变体 (全部 liquid + 非 strict 的 terrain/model) | 包住涉及 alpha 的代码 |
| `#ifdef BLOXD_SCENE_DEPTH` | 全部液体变体 | 包住 `bloxdOpaqueBehind()` 调用 |

`BLOXD_LIGHTING` 已在 **v5 移除**。使用它会验证失败: *「BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.」*

## strict 游戏的契约

大多数游戏是 strict (无顶点动画、无 `discard`)。未加守卫的 vertex 钩子会报 `<hook> moves terrain, which strict games prevent.`，可达的 `discard` 会报 `discard makes terrain see-through, which strict games prevent.` — 两者都会在该 strict 游戏中禁用**全部钩子**。永远用 `#ifndef BLOXD_STRICT` 包住 vertex 钩子。

逐游戏策略的内部机制见[引擎内部: 策略](../internals/policy.md)。
