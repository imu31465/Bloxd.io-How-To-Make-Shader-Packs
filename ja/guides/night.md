# 夜間表現の設計

> 対象API: 5 · 対象ビルド: `bbb6l5` (2026-11-20 本番+preprod確認) · 検証状況: Verified (v5 移植済み — 動作は同一ビルドで実機確認を推奨)

「影は暗いのに表面だけ明るい」問題の構造と、完成色全体への減衰パターン。


影だけを暗くしても、太陽が出ていない時間帯にはエンジンが出力する完成色 (`engineColour`) が明るいまま残り、照らされた面と影との明暗差が不自然になることがある。そのため、影の色だけでなく完成色全体を減衰させる。

この例では、`bloxdSunDirection()` がゼロなら夜間、ゼロ以外なら昼間と判定し、夜間の地形の完成色を減衰させる。ライティングが有効な場合 (`bloxdLit()`) は、`blockLight` や `heldLight` が強い場所ほど減衰を弱め、松明など近くの光源をできるだけ残す。`0.52` は調整可能な値で、夜をさらに暗くしたい場合は小さくする。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    if (bloxdLit()) {
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
        let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
        let protectLocalLight = smoothstep(0.03, 0.35, localLight);
        scale = mix(nightDim, 1.0, protectLocalLight);
    }
    // 完成色 (bloxdDefaultLight の出力 = emission 込み・フォグ済み) を減衰させる
    out.colour *= scale;
    return out;
}
```

**この処理の限界:** `bloxdSunDirection()` が「太陽があるときは単位方向ベクトル、ないときはゼロ」を返す仕様なら、昼と夜は判別できても、夕暮れや薄明を滑らかに推定することはできない。また、完成色を減衰させるため、エンジンの昼光と環境光も同時に弱まる。時刻による光の変化を完全に再現する方法ではない。液体にも同じ処理を適用する場合は、液体フックのフォールバック関係を確認すること。
