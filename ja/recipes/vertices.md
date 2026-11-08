# 頂点 (allow 限定)

> 対象API: 5 · 対象ビルド: `v98qt8` (2026-11-08 本番+preprod確認) · 検証状況: Verified (v5 移植済み — 動作は同一ビルドで実機確認を推奨)

vertex フックによる頂点移動。**すべて `#ifndef BLOXD_STRICT` で囲むこと** (無防備な vertex フックは strict ゲームでパック全体を無効化します)。


> すべて `#ifndef BLOXD_STRICT` で囲むこと。
> 実行条件の詳細 (allow のタイトル一覧・Custom Games は strict) は [エンジン内部: ゲーム別の適用モード](../internals/policy.md) を参照

## 草が風に揺れる (上端だけ動かす)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdSeconds() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // 垂直面のみ
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

## 液面の波 (上面のみ)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdSeconds() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdSeconds() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

## 脈動する地形

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdSeconds() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // 法線方向にわずかに膨張収縮
    return out;
}
#endif
```

## 波打つ地形 (巨大 sin 波)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdSeconds() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdSeconds() * 0.7) * 0.3;
    return out;
}
#endif
```
