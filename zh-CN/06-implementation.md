[← 上一部分](05-troubleshooting.md)·[返回手册](README.md)·[下一部分 →](07-internals.md)

# 第六部分: 重要的实现补充

## 19. 修复夜间「影黑了面却亮」

只压暗阴影，太阳缺席时引擎完成色 (`engineColour`) 依然偏亮，面影落差会显得不自然。应对完成色整体施加衰减。

下例以 `bloxdSunDirection()` 为零判夜、有方向判昼，对夜间地形完成色衰减。`blockLight` 与 `heldLight` 强处减弱衰减，尽量保留火把等近光。`0.52` 为可调值，想更暗请调小。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    #ifdef BLOXD_LIGHTING
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
    let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
    let protectLocalLight = smoothstep(0.03, 0.35, localLight);
    scale = mix(nightDim, 1.0, protectLocalLight);
    #endif
    // 完成色衰减，材质 emission 按默认经雾叠加
    out.colour = l.engineColour * scale + s.emission * l.fogVisibility;
    return out;
}
```

**该处理的局限：** 若 `bloxdSunDirection()` 为「有太阳=单位方向、无=零」二值，可分昼夜但无法连续推定黄昏薄明。且因衰减完成色，会把引擎昼光与环境光一并削弱，并非完整的时间带再现。液体同样处理时请确认液体钩子的回退关系。

## 20. 让水自然的水体统合配方

本 API 采样不到场景色，因此**是以菲涅尔风颜色混合与太阳高光的拟似表现，而非真实的反射/折射** (水深计算在 v2 中经 `bloxdOpaqueBehind()` 已可能实现，分离至[第八部分](08-apiv2.md) R-E)。下例保留基色，掠角混入近空色，仅有太阳时加小闪光。

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
    #ifdef BLOXD_LIGHTING
    let worldPos = bloxdWorldPosition(l.position);
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdTime()), topness));
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let halfDir = normalize(viewDir + sunDir);
        let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
        out.colour += vec3f(1.0, 0.97, 0.90) * glint;
    }
    #endif
    return out;
}
```

调整参考：

- 水发白/过亮：调低 `fresnel * 0.38` 的 `0.38` 与闪光的 `0.55`。
- 水过浓：稍调高 `fakeSkyReflection` 混合比。但过高会像塑料。
- 水面出现线条或规则条纹：调低波频率与闪光强度。本代码没有水面网格顶点位移。
- 想要真实映景：本 API 输入没有屏幕色，只混色成不了真反射 (深度为液体限定可取。[第八部分](08-apiv2.md) R-E)。

该配方**替换**既有 `bloxdLiquidLight`。勿与 R9.7 同名波法线函数或其他同名钩子重复粘贴。

## 21. 实机测试清单

编译成功与「好看」是两回事。请按顺序确认：

1. **加载：** `pack.json` 位于 ZIP 根目录。选中后立即显示 `Ready. Reload the page to use it.`，包在**页面重新加载后**激活；随后确认 `Ready to use`。已保存的包会在下次页面加载时自动重验证：每当引擎侧规格标头更新时，都会对标头内容做指纹检查 (通过 = 原样保留 / 失败 = 显示为已阻止)，损坏的旧包绝不会静默保持激活。
2. **8 变体：** strict / allow、光照开 / 关、地形 / 液体各条件无类型守卫遗漏。即使游戏只用部分条件，分发包也要按 8 种设想。
3. **白天：** 草、石、沙、木等材质颜色无溢出，顶面与侧面明暗过渡自然。
4. **夜晚：** 对比曾受光处的同材质、阴影、火把附近。仅受光面残亮则调曝光衰减，整体过暗则调局部光保护。
5. **水：** 俯视、掠角、岸边、水下、夜晚分别查看。alpha 行为与水下观感依赖游戏合成方式，勿凭单一视角判断。水下液体定义色幕按[第七部分](07-internals.md)所述罩在前面，包的差异主要看水面与幕透出的地形。
6. **边界与远景：** 区块/原点切换处波形花纹无跳变，远景无双重雾与白色霾。
7. **性能：** 逐片元哈希/三角/`pow` 重效果取最小。逐步加细节并对比 FPS。

### 已知约束为前提

- 包限于地形/液体钩子，同一代码不处理天空、实体与 UI。
- 无添加阴影贴图、屏幕空间反射、折射、泛光等的输入 (场景深度为液体限定以 `bloxdOpaqueBehind()` 解禁。见[第八部分](08-apiv2.md))。
- `bloxdTime()` 为动画时间，不保证关联游戏内昼夜。
- `bloxdSunDirection()` 为零则真月亮方向未知，是氛围近似而非「月光物理」。方向性月光经 `-bloxdSunDirection()` 制作 (仅昼夜循环世界。第七部 R-A)。
- `s.position` / `l.position` 为局部坐标，世界相关效果请加 `bloxdOriginOffset()`。方块内局部花纹则有意用局部坐标。

## 22. 着色器到极限时的组合

着色器包不能添加或采样纹理，材质细微凹凸与天空图像不要只靠着色器解决。Bloxd.io 公开纹理包仓库 [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) 以另一方式处理纹理、天空盒、模型等。

参考：社区流传的「cinematic shader」发行物经分析实为纹理包 (128x128 纹理，不含 `pack.json` / `.wgsl`)。

现实做法是，**光照与颜色用着色器调，材质与天空用配套资源包补**。但并用可行性与加载顺序请按游戏实现与设置确认。

纹理包有独立规格 (供参考)：大小上限为 25MB，按 base64 编码后 JSON 字符串的长度计算；PNG 经 base64 编码膨胀 +33%，因此原始图片的实际上限约为 18–19MB。CSS 由简单正则解析器处理——避免嵌套与注释。

## 23. 水中与着色器包的实情

水中的外观由 3 层构成：

| 层 | 内容 | 包可否操作? |
|---|---|---|
| ① 地形/液体绘制 | 钩子可加工。light 钩子在水下也照常调用 | 可 (在幕之下生效) |
| ② 液体定义色幕 | 相机所在液体方块定义 color/alpha 的 emissive 全屏 quad，绘制在最前面。游戏设置 `cameraTint` 有则优先 | 不可 (颜色浓度都改不了) |
| ③ cameraTint | 游戏设置 | 不可 |

实用要点：包在水下也继续工作 / 幕去不掉 / 水下不可分支 (fogStart / fogEnd / fogColour 在水下不变，fogVisibility 也检测不到)。

[← 上一部分](05-troubleshooting.md)·[返回手册](README.md)·[下一部分 →](07-internals.md)
