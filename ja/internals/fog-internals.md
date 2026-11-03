# フォグの内部仕様

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認) · 検証状況: Analyzed (本番バンドルの JavaScript から直接復元)

フォグの実装 (linear 固定・32ブロック幅の減衰域) と、読み込み境界バンドの応用。


フォグ計算は常に LINEAR モード (`fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)` 相当、0〜1でクランプ) で行われ、`fogStart = 32 × D`、`fogEnd = 32 × (D + 1)` (D = フォグ距離設定。D = 0 の場合のみ fogEnd = 5 の例外) となる。**フォグの減衰域はわずか 32 ブロック幅**であり、`l.fogAlpha` は「距離に応じた霧の濃さ」というより、**「読み込まれたワールド境界までの正規化距離」**を示す指標である。プレイヤーごとに読み込み距離が異なるため、距離に基づく演出を実装する場合は、各自で `distance(l.position, bloxdEyePosition())` を計算する必要がある (下の「読み込み境界バンド」)。(v3 注記: レンダラのフォグ関数は実際には **off / exponential / exponential-squared / linear の4モード**を実装しており、出荷タイトルは linear を駆動している。復元したソースと堅牢性の議論は [バージョン履歴: v3](../history/v3.md) に当時の記録がある。)

既定のフォグ色は `rgb(183, 191, 195)` (淡い青灰色)。ワールド作成者は `fogColourOverride` (hex) で変更できる。フォグモードが 0 (NONE) の状態では **fogColour は黒で届く** (`fogColour = select(vec3f(0.0), uniforms.vFogColor, ...)`)。`bloxdApplyFog(col, l)` の標準形なら fogAlpha が 0 のとき霧色が使われないため安全。スクリプト API 側には他に `fogChunkDistanceOverride` と `fogOnSkybox` のオプションがあり、カスタムゲームはフォグ距離 (D に相当する値) とスカイボックスへのフォグ適用を個別に設定できる。既定ではスカイボックスはフォグの影響を受けない (`fogOnSkybox` を有効にしたゲームでのみ、スカイボックスもフォグ色で染まる)。

プレイヤー側の `showFog` を false に設定すると、フォグは 3200〜3232 ブロックの範囲に追いやられ、実質的に無効化される (fogAlpha ≈ 0 が継続される)。

## 読み込み境界バンド — fogAlpha を「ワールドの縁」として使う

読み込み境界付近の 32 ブロック帯を、静かな冷色で処理することで、ワールドの端を目立たなくしている。距離を個別に計算しないことにより、プレイヤーの読み込み距離設定に自動で追従するのが利点である。

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogAlpha: 0 = 内側 (境界まで余裕あり)、1 = 境界の外へ出る直前
    let edge = l.fogAlpha;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 関連

- [水を自然に見せる方法](../guides/water.md)
- [視覚の問題](../troubleshooting/visual.md)
- [エンジンデータ台帳](engine-data.md)
