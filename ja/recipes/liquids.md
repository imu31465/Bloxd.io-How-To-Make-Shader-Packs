# 液体

> 対象API: 5 · 対象ビルド: `v98qt8` (2026-11-08 本番+preprod確認) · 検証状況: Verified (現在のAPIに移植済み — 実機での再確認を推奨)
## 水面のさざ波 (色の明滅)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdRenderOffset().x);
    let worldZ = s.position.z + f32(bloxdRenderOffset().z);
    let ripple = sin(bloxdSeconds() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid は常に BLOXD_ALPHA — ガードは習慣として
    #endif
    return out;
}
```

## 高度による透明度の疑似変化 (本当の浅瀬判定ではない)

> 本当の水深には液体限定の `bloxdOpaqueBehind()` が必要で、これは背後の不透明面までの厚みを測ります (完全なレシピ: [水を自然に見せる方法](../guides/water.md))。以下はそれを使わない、より単純な疑似スタイリングです: `s.position.y` はローカル座標なので、そのまま使うとチャンク原点の変化で効果がずれます。ワールド高度には `bloxdWorldPosition()` で変換します。以下はワールド高度でアルファを変えるだけの疑似効果であり、海岸線・水底を考慮した浅瀬ではありません。`packWaterReferenceY` はワールドの高度に合わせて調整してください。

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // 低高度では薄く、高高度では元のアルファに近づける。向きはゲーム内で確認すること
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

## 水中から見た水中霧

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

## 液体だけに効くパック (地形無傷の構成)

```wgsl
// terrain_* フックは一切記述しない。これにより:
//  - terrain バリアント = フック無し = 地形はエンジンの既定のまま
//  - liquid バリアント  = liquid_* フックのみ有効
```
