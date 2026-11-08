# 水を自然に見せる方法

> 対象API: 5 · 対象ビルド: `v98qt8` (2026-11-08 本番+preprod確認) · 検証状況: Verified (v5 移植済み — 動作は同一ビルドで実機確認を推奨)

フレネル風の色ブレンドと太陽グリントによる疑似表現 (統合レシピ) と、水中の3層構造の実情。


このAPIではシーン色をサンプリングできないため、**本物の反射・屈折ではなく、フレネル風の色ブレンドと太陽ハイライトによる疑似表現**になる (水深計算は液体限定の `bloxdOpaqueBehind()` で可能 ([APIリファレンス: 関数](../api/functions.md#bloxdopaquebehind)))。以下は色のベースを残しながら、浅い視線角度で空色に近い色を少し混ぜ、太陽があるときだけ小さなグリントを足すサンプル。

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

調整の目安:

- 水が白っぽい / 明るすぎる場合: `fresnel * 0.38` の `0.38` とグリントの `0.55` を下げる。
- 水が濃すぎる場合: `fakeSkyReflection` の混合率を少し上げる。ただし、上げすぎるとプラスチックのような質感になる。
- 水面に線や規則的な縞が見える場合: 波の周波数やグリント強度を下げる。なお、水面メッシュ自体の頂点変位はこのコードには含まれていない。
- 実際の景色を映したい: このAPIの入力には画面色がないため、色を混ぜるだけでは実反射にならない (深度は液体限定で取得可 — [関数: bloxdOpaqueBehind](../api/functions.md) 参照)。

このレシピは既存の `bloxdLiquidLight` を**置き換える**ものである。R9.7 の同名波法線関数や他の同名フックと重複して適用しないこと。

## 水中とシェーダーパックの実情

水中の見た目は次の 3 層で構成される。

| 層 | 内容 | パックで操作可? |
|---|---|---|
| ① 地形・液体の描画 | フックで加工できる。light フックは水中でも通常どおり呼び出される | 可 (ヴェールの下で有効) |
| ② 液体定義色のヴェール | カメラ位置の液体ブロック定義 color/alpha の emissive フルスクリーン quad (最前面)。ゲーム設定 `cameraTint` があればそちらが優先される | 不可 (色も濃さも変更不可) |
| ③ cameraTint | ゲーム設定によるもの | 不可 |

実用上の要点: 水中でもパックは動作している / ヴェールは無効化できない / 水中かどうかを条件分岐できない (fogStart / fogEnd / fogColour は水中で変化せず、fogAlpha から推定する方法もない)。

[← 前の部](../troubleshooting/)・[マニュアルに戻る](../)・[次の部 →](../internals/)
