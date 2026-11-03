# 验证错误

> 目标API: 5 · 状态: Verified (消息逐字采录自现行验证器)

静态验证 (分析器，第 1 阶段) 错误 — 多为保留名称、strict 契约与跨钩子调用限制。

## 「Packs can't construct BloxdSurface directly」/「Packs can't construct BloxdLight directly, since header structs gain fields; ...」

- **原因**: 调用了 `BloxdSurface(...)` 这类构造器
- **修复**: 从 `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` 起步再改字段 (light 钩子里 `var out = s;` 亦可)

## 「Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>」

- **原因**: 出现了以 `bloxd` 开头的标识符 (不区分大小写)
- **修复**: 改名 (如 `packTint`)。只有 9 个钩子名被允许
- **预防**: 给自己的名称加 `pack` / `my` 等前缀

## 「bloxdPackInputs isn't part of the bloxd_ header」

- **原因**: 直接引用了该 uniform
- **修复**: 经标头函数使用 ([包格式](../api/pack-format.md#逐帧-uniform-bloxdpackinputs))

## 「... reaches bloxdTexel, which only surface and light hooks can use.」

- **原因**: 从 vertex 钩子 (或其可触达的函数) 调用 — 「reaches」 指的是**调用路径**
- **修复**: 把调用移到 surface / light 钩子

## 「... reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and <program> doesn't define it; ...」

- **原因**: `bloxdOpaqueBehind()` 需要 `BLOXD_SCENE_DEPTH`，只在全部液体变体中定义；从 terrain/model 钩子代码共享该调用会造出无法编译的变体
- **修复**: 用 `#ifdef BLOXD_SCENE_DEPTH` 包住调用
- **预防**: 把深度读取隔离成仅液体的处理

## strict 契约

| 消息 | 含义 |
|---|---|
| `<hook> moves terrain, which strict games prevent.` | 未加守卫的 vertex 钩子 |
| `discard makes terrain see-through, which strict games prevent.` | 可达的 `discard` |

- **重要**: 这些不是编译错误 — strict 游戏会**自动禁用整个包** (`shaderPack:offInStrict`)
- **修复**: 用 `#ifndef BLOXD_STRICT` 包住 vertex 钩子与 `discard` ([变体](../getting-started/variants.md))

## 当前版本的消息

| 消息 | 处理 |
|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | 迁移 `#ifdef BLOXD_LIGHTING` → `if (bloxdLit())` ([光照](../api/lighting.md#bloxdlit--门控)) |
| `bloxdBlockFlagRock isn't part of the shader pack API...` | 残留位常量 → `flags.rock` ([标志](../api/flags.md)) |
| `bloxdSpLitColour isn't part of the shader pack API...` | v4 内部符号 → 改用公开的 `bloxdLitColour()` |

对继续读取 `blockFlags`、或把光照钩子包在 `#ifdef BLOXD_LIGHTING` 里的包，分析器给出**专属消息**，因此不会有静默的错误行为 (迁移步骤: [v5 迁移](../history/v5.md))。

纹理名称解析错误 (拼写建议、帧/旋转拼写) 见[纹理问题](textures.md)。

## 相关

- [限制与保留名称](../api/restrictions.md) · [引擎内部: 着色器验证](../internals/shader-validation.md) · [变体专属问题](variants.md)
