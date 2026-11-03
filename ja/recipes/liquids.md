# 液体

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認) · 検証状況: Verified (v5 移植済み — 動作は同一ビルドで実機確認を推奨)

Liquid フックで水を演出するレシピ。**v5 では、パックに Liquid Hook がない場合、水には Terrain Hook も実行されません** ([フックの分担](../api/hooks.md))。


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

## 高度を使った透明度の疑似変化 (本当の浅瀬判定ではない)

> 液体限定で `bloxdOpaqueBehind()` により奥の不透明面までの厚みが測れます (`#ifdef BLOXD_SCENE_DEPTH` ガード付き、[APIリファレンス](../api/functions.md#bloxdopaquebehind))。以下はそれを使わない旧来の疑似演出で、`s.position.y` はローカル座標なので、そのまま使うと座標原点の変化で効果がずれる。ワールド高度を使う場合は `bloxdWorldPosition()` で変換する。以下はワールド高度を使ってアルファを変えるだけの疑似演出で、海岸線や水底に沿った浅瀬表現ではない。`packWaterReferenceY` はワールド高度に合わせて調整する。

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // 低高度では薄く、高高度では元のアルファ値に近づける。ゲーム内で向きを確認する必要がある。
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
//  - terrain バリアント = フック無し = 地形はエンジンの既定設定のまま
//  - liquid バリアント  = liquid_* フックのみ有効
```
