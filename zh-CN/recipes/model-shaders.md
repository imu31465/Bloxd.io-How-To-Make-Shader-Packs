# 模型着色器配方

> 目标API: 5 · 目标构建: `v98qt8` (2026-11-08 生产与preprod确认) · 状态: Analyzed (依 v5 标头规格撰写)

使用 v5 Model 钩子与新标志的配方，实现 **v5 之前不可能做到的「我看的是什么」选取**。基础: [模型与纹理](../guides/models.md)。

## 手持物品发光

第一人称着色器作者从 v1 起就想要的东西，两行：

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## 把世界与手分开

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;
    }
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## 发光的剑刃尖端 (localPosition)

`localPosition` 随模型旋转 — 无需世界空间猜测就能知道「我在模型的哪个位置」：

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        let tipness = clamp(surface.localPosition.y * 0.5 + 0.5, 0.0, 1.0);
        out.emission += vec3f(0.3, 0.4, 0.6) * tipness * tipness * 0.6;
    }
    return out;
}
```

注意: 实际的 `localPosition` 取值范围随模型而异 — 请实机验证并防御性地 `clamp`。

## 高亮掉落物

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.dropped) {
        let pulse = 0.5 + 0.5 * sin(bloxdSeconds() * 2.0
            + surface.localPosition.x * 3.0);
        out.emission += vec3f(0.08, 0.10, 0.06) * pulse;
    }
    return out;
}
```

## 玩家皮肤的冷色边缘光 (lifeform)

大多数模型用 `textureId: 0` (皮肤)；`surface.colour` 已含皮肤 × tint：

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.flags.lifeform) {
        let viewDir = normalize(bloxdEyePosition() - light.position);
        let rim = pow(1.0 - clamp(dot(viewDir, normalize(light.normal)), 0.0, 1.0), 2.5);
        out.colour += vec3f(0.4, 0.5, 0.7) * rim * 0.25;
    }
    return out;
}
```

## 风中摇摆的植物 (仅 allow)

植物 (`flags.flat`) 以模型绘制 — 经 vertex 钩子摇摆：

```wgsl
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(vertex);
    if (vertex.flags.flat) {
        let sway = sin(bloxdSeconds() * 1.8
            + bloxdWorldPosition(vertex.position).x * 0.7);
        let tipness = clamp(vertex.localPosition.y + 0.5, 0.0, 1.0);
        out.position.x += sway * 0.08 * tipness;
    }
    return out;
}
#endif
```

(植被同时是 `flags.vegetation`: `flat` = «以交叉平面绘制»，`vegetation` = «是植物» — 草和花两者都是。)

## 只处理带图集纹理的模型面

方块模型面 (台阶、楼梯…) 携带图集 `textureId`；用 `textureId != 0u` 选取：

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

`textureId: 0` 的面 (皮肤) 采样为白色 — 不报错 ([模型自带纹理](../api/texture-api.md#模型自带纹理-textureid-0))。

## 盔甲与其余部分

`flags.lifeform` 含盔甲与外观装饰 ([标志](../api/flags.md))。没有更细粒度的输入；可组合 `localPosition` (位置) 或 `overlayColour` 的存在性作实用近似。

## 与地形共享

对完整方块与方块模型做统一调色：

```wgsl
fn applyGrade(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02, 1.0, 0.98);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}
```

共享函数模式正是默认包模板自己推荐的做法 ([钩子](../getting-started/hooks.md#回退与代码共享))。

## 相关

- [模型与纹理](../guides/models.md) · [附魔效果](enchant-effects.md) · [标志](../api/flags.md) · [结构体](../api/structures.md)
