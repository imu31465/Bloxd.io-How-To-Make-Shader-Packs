# 夜間表現の設計

> 対象API: 5 · 対象ビルド: `bbb6l5` (2026-11-20 本番+preprod確認) · 検証状況: Verified (v5 移植済み — 動作は同一ビルドで実機確認を推奨)

「影は暗いのに表面だけ明るい」問題の構造と、完成色全体への減衰パターン。


影だけを暗くする処理では、太陽の出ていない時間帯でもエンジンの完成色が明るく残り、面と影の差が不自然になる場合がある。影の色調ではなく、完成色全体に対して減衰を適用する必要がある。

次の例では、`bloxdSunDirection()` がゼロの場合は夜間、方向を持つ場合は昼間とみなし、夜間は地形の完成色を減衰させる。ライティング有効時 (`bloxdLit()`) は、`blockLight` と `heldLight` の値が強い箇所ほど減衰を緩和し、松明などの近距離光源の効果をできるだけ保持する。`0.52` は調整用の係数であり、より暗くしたい場合はこの値を小さくする。

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

**この処理の限界:** `bloxdSunDirection()` から太陽の方向を取得できるため、月の方向はその反転 (`-bloxdSunDirection()`) で求められる。ただし、デフォルトワールドでは太陽が固定されているため月も動かず、昼夜サイクルを実装したワールドでのみ移動する。また、値が単位方向またはゼロの二値なら昼夜は判別できても、夕焼けや薄明を滑らかに表現できない。この例は地形の完成色を減衰させるため、エンジンの昼光と環境光をまとめて弱める方式であり、時間帯ごとの照明を完全に再現するものではない。液体にも適用する場合は、液体フックのフォールバック関係を確認すること。
