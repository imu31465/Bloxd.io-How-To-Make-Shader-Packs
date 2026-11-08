# 坐标

> 目标API: 5 · 目标构建: `v98qt8` (2026-11-08 生产与preprod确认) · 状态: Verified (已移植到当前API — 建议实机复核)

## 世界坐标

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

## 方块坐标

```wgsl
let worldBlock = vec3i(floor(bloxdWorldPosition(l.position)));
```

## 棋盘格 (按方块)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 或 1
out.colour *= mix(0.96, 1.04, checker);
```

## 按方块伪随机 (哈希)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// 用途：草色变化、石头色斑等
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

## 视线向量与轮廓光

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

## 视线角度 (菲涅尔感 —— 液体用)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 正对 1 / 掠角 0
let fresnel = pow(1.0 - facing, 3.0);
```
