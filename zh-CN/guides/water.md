# 让水看起来自然

> 目标API: 5 · 目标构建: `bny9u` (2026-11-05, 生产环境) · 状态: Verified (已移植到当前API — 建议实机复核)

本 API 采样不到场景色，因此**是以菲涅尔风颜色混合与太阳高光的拟似表现，而非真实的反射/折射** (深度计算使用液体限定的 `bloxdOpaqueBehind()`——厚度吸收配方在本页后文)。下例保留基色，掠角混入近空色，仅有太阳时加小闪光。

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    if (bloxdLit()) {
        let worldPos = bloxdWorldPosition(l.position);
        let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
        let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdSeconds()), topness));
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let halfDir = normalize(viewDir + sunDir);
            let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
            out.colour += vec3f(1.0, 0.97, 0.90) * glint;
        }
}
    return out;
}
```

调整参考：

- 水发白/过亮：调低 `fresnel * 0.38` 的 `0.38` 与闪光的 `0.55`。
- 水过浓：稍调高 `fakeSkyReflection` 混合比。但过高会像塑料。
- 水面出现线条或规则条纹：调低波频率与闪光强度。本代码没有水面网格顶点位移。
- 想要真实映景：本 API 输入没有屏幕色，只混色成不了真反射 (深度为液体限定可取——见[函数](../api/functions.md))。

该配方**替换**既有 `bloxdLiquidLight`。勿与 R9.7 同名波法线函数或其他同名钩子重复粘贴。


## 水中与着色器包的实情



水中的外观由 3 层构成：

| 层 | 内容 | 包可否操作? |
|---|---|---|
| ① 地形/液体绘制 | 钩子可加工。light 钩子在水下也照常调用 | 可 (在幕之下生效) |
| ② 液体定义色幕 | 相机所在液体方块定义 color/alpha 的 emissive 全屏 quad，绘制在最前面。游戏设置 `cameraTint` 有则优先 | 不可 (颜色浓度都改不了) |
| ③ cameraTint | 游戏设置 | 不可 |

实用要点：包在水下也继续工作 / 幕去不掉 / 水下不可分支 (fogStart / fogEnd / fogColour 在水下不变，fogAlpha 也检测不到)。
