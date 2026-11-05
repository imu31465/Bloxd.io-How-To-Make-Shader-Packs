# 纹理采样内部机制

> 目标API: 5 · 目标构建: `bny9u` · 状态: Analyzed (从现行生成器 c56 复原)

`bloxdTexel` / `bloxdTextureSize` 实际如何编译 — 三变体纹理代码生成。面向用户的一面: [纹理 API](../api/texture-api.md)。

## 三个变体

### 变体 1 — 纹理包未激活 (桩)

```wgsl
fn bloxdTextureSize(bloxdSpMipLevel: f32) -> vec2u {
        return vec2u(1u);
}
fn bloxdTexel(bloxdSpTextureId: u32, bloxdSpUv: vec2f, bloxdSpMipLevel: f32) -> vec4f {
        return vec4f(1.0);
}
```

为真实图集写的代码在这里仍可编译运行 — 只是看到白色纹素与 1×1 尺寸。

### 变体 2 — 图集路径 (游戏默认)

`bloxdTextureSize` 返回 `textureDimensions(textureAtlas0, u32(clamp(round(bloxdSpMipLevel), 0.0, f32(textureNumLevels(textureAtlas0) - 1u))))`。`bloxdTexel` 在加载前应用该面的四分之一转 — 旋转陷阱被写成生成的 `bloxdSpTurned` if 链：

```wgsl
        // Each quarter turn clockwise the face shows its texture at reads the unturned texture at (v, 1 - u)
        var bloxdSpTurned = bloxdSpUv;
        if (bloxdSpTextureRotation == 1u) {
                bloxdSpTurned = vec2f(bloxdSpUv.y, 1.0 - bloxdSpUv.x);
        } else if (bloxdSpTextureRotation == 2u) {
                bloxdSpTurned = 1.0 - bloxdSpUv;
        } else if (bloxdSpTextureRotation == 3u) {
                bloxdSpTurned = vec2f(1.0 - bloxdSpUv.y, bloxdSpUv.x);
        }
```

(`bloxdSpTextureRotation` 是引擎自己对输入字段 `textureRotation` 的存储。)

### 变体 3 — 自定义纹理包纹理

`textureLoad(<atlas>, min(bloxdSpCellAt * bloxdSpSize + bloxdSpAt, <dims> - 1u), bloxdSpLevel)` 采样分层图集中逐纹理的单元格；包自己的纹素走 `bloxdSpOwnTexel` 路径。

## 动画帧阶梯

动画纹理 (43 族) 按逐族固定间隔推进 (200 / 250 / 300 ms — [纹理目录](../api/texture-catalog.md#动画族-43-个名称)的间隔列)。把动画族的 id 传给 `bloxdTexel` 会采样当前帧。

## 采样器设置

方块纹理是一张 `texture_2d_array`；地形采样器为 nearest + repeat。

## 贪心网格合并与 UV

网格生成器把材质/AO/光照一致的面合并成单个矩形 (**贪心网格合并**)，因此合并面上的顶点 UV 可能超过贴图宽度 (边缘有 0.0015 内缩)。硬件的 repeat 寻址负责平铺，所以合并面看起来无缝 — 但以 `uv` 为键的程序化细节可能在合并边界两侧不连续；依赖世界的效果请改用 `bloxdWorldPosition(position)` 为键。

## 相关

- [纹理 API](../api/texture-api.md) · [纹理注册表](texture-registry.md) · [渲染管线](rendering-pipeline.md)
