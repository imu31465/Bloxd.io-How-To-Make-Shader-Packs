# 発光

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認) · 検証状況: Verified (v5 移植済み — 動作は同一ビルドで実機確認を推奨)

`emission` 出力と light フック加算による発光表現。v5 でも emission は**ライティング後・フォグ前**に加算されます ([処理順序](../api/lighting.md#全体の処理フロー))。


> `emission` は照明計算後に加算されるが、既定処理では **`fogAlpha` に応じて減衰する。つまり完全に霧に沈む遠景では emission も消える。遠景でも光らせたい成分は emission に足さず、light フック内で `out.colour += ...` として直接加算する** (既定の出力はフォグ済みなので、遠景では霧色の上に光が乗る)

## 灯りの脈動 (松明が息をする)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let pulse = 0.5 + 0.5 * sin(bloxdSeconds() * 2.3 + l.position.x * 0.8);
        out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
}
    return out;
}
```

## 発光鉱石っぽい処理 (明るい素材を光らせる)

```wgsl
// surface 側: 素材が明るい (白い) ほど emission を強調する
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

## 蛍の群れもどき (時間で空間を漂う光点)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // 数個の「光の玉」がゆっくり移動する。distance の逆数で発光させる
    let t = bloxdSeconds() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdSeconds() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## 関連

- [ライティングAPI](../api/lighting.md) — emission とフォグの順序
- [リアル系レシピ](realism.md)
