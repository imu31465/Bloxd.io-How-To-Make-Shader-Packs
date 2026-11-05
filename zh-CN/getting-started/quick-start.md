# 快速开始

> 目标API: 5 · 目标构建: `bny9u` (2026-11-05 生产环境确认) · 状态: Verified

五分钟做出你的第一个包。

## 1. 创建文件

建一个文件夹，放入 `pack.json` 与 `pack.wgsl`：

**`pack.json`**:

```json
{
  "apiVersion": 5,
  "name": "My First Pack",
  "author": "your name"
}
```

**`pack.wgsl`** — 一个最小的暖色调包：

```wgsl
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    return out;
}
```

> 引擎标头 (常量、结构体、函数) 会在加载时自动拼在每个包前面 — 你从不亲手编写它。完整标头复现于[引擎内部](../internals/engine-header.md)。

## 2. 在游戏中加载

1. 打开设置 → Shader Pack，加载 zip 或文件夹 (文件夹加载仅限桌面浏览器)
2. 查看状态: 选中后立刻会显示「Ready. Reload the page to use it.」— **页面重载**后显示「Ready to use」即成功
3. 若看到「Saved, but it won't run until you fix these errors...」，修复列出的错误 (文件:行号 + 变体) 后重载

## 3. 验证

1. 先在宽松 (allow) 的游戏中测试
2. 再在 strict 模式游戏中测试 (大多数游戏是 strict)
3. 顶点动画只在标记为 allow 的游戏中有效

## 4. 分发

打成 zip — 见[分发](distribution.md)。

## 卡住了？

- 错误的含义 → [故障排查](../troubleshooting/)
- 怎么写钩子 → [着色器钩子](hooks.md)
- 完整的 9 钩子模板在下一页 [着色器钩子](hooks.md)
