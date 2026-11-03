# エンチャント効果

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認) · 検証状況: Analyzed (ライブヘッダーから復元)

v5 でエンチャントパイプラインが入出力双方に開かれました。エンチャントされたアイテム・防具のきらめきを、エンジンの計算を保ったまま制御するレシピ集です。

## 入出力の全体像

**入力** (`BloxdSurfaceIn` / `BloxdLightIn` — エンチャントされたアイテムと防具のみ、他はすべて 0):

```wgsl
enchantTier: u32,     // 1-5 for Tier 1-5.
enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.
```

**出力** (`BloxdSurface`):

```wgsl
enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
```

エンジンの混合は [`bloxdLitColour()`](../api/lighting.md) の中で行われます — シェーディングの直後、ワールド光の前。`bloxdDefaultSurface` は入力の `enchantColour` を無変更で通すため、**デフォルトの見た目は v4 のエンジン内部挙動と同一**です。

## デフォルトの動作を理解する

`enchantColour.a` (入力) は**アニメーションするアルファ**です。エンジンがきらめきの掃引をアニメーションするため、`.a` をフラグメント毎に読むだけで動くパターンが無料で手に入ります。`enchantTier` と `enchantSpeed` は構成上矛盾しません («faster at higher tiers»)。

エンチャントされていない面では `enchantTier == 0`、`enchantColour == vec4f(0.0)`、`enchantSpeed == 0.0`。

## レシピ 1: きらめき無しリアリズム (2行)

カスタムライティングからエンチャントきらめきを消す — «きらめき無しリアリズム» パック:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    // エンチャントのきらめきを完全に無効化 (カラー出力には触れない)
    out.enchantColour = vec4f(0.0);
    return out;
}
```

## レシピ 2: 階梯できらめきを強める

`enchantTier` を使うと色を解析せずに古典的な「階梯別きらめき強度」が書けます:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        // Tier 1-5 できらめきの不透明度を強める (入力のアニメーションはそのまま活きる)
        let tierBoost = 1.0 + f32(surface.enchantTier) * 0.12;
        out.enchantColour.a = clamp(surface.enchantColour.a * tierBoost, 0.0, 1.0);
        out.enchantColour.rgb = surface.enchantColour.rgb;
    }
    return out;
}
```

## レシピ 3: きらめき色の差し替え

色相だけ自分のパックの世界観に合わせる:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        // アニメーションするアルファ (.a) は温存し、RGB だけ差し替える
        var e = surface.enchantColour;
        e.rgb = mix(vec3f(0.35, 0.8, 1.0), vec3f(0.9, 0.5, 1.0),
                    f32(surface.enchantTier) / 5.0);   // 低 Tier は青、高 Tier は紫
        out.enchantColour = e;
    }
    return out;
}
```

## レシピ 4: enchantSpeed を使った速度演出

`enchantSpeed` (高い Tier ほど速い) を位相に変換し、独自の掃引パターンを作ります:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        // モデルに沿って流れる帯 — 速度はエンジンの enchantSpeed 定義に従う
        let band = 0.5 + 0.5 * sin(surface.localPosition.y * 6.0
                                   - bloxdSeconds() * surface.enchantSpeed * 2.0);
        var e = surface.enchantColour;
        e.a = clamp(e.a * (0.4 + 0.6 * band), 0.0, 1.0);
        out.enchantColour = e;
    }
    return out;
}
```

## レシピ 5: 被弾フラッシュの強調 (overlayColour の側)

`overlayColour` (プレイヤー・モブのみ。ダメージ赤フラッシュ等) は `bloxdLitColour` がライティング前に混合します。基礎色をいじらずに際立たせる:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    // 被弾フラッシュを増幅 (a のみ触る — 基礎色には影響しない)
    out.overlayColour.a = clamp(surface.overlayColour.a * 1.6, 0.0, 1.0);
    return out;
}
```

対象外のオブジェクトでは `overlayColour` は 0 なので、このコードは無害です。

## ライティング側との組み合わせ

`bloxdLitColour()` を使う限り、`enchantColour` と `overlayColour` の混合は自動です。完全に自前のライティングを書く場合は、[処理順序](../api/lighting.md#全体の処理フロー) (オーバーレイ → シェーディング → エンチャント → ワールド光) を再現するか、敢えて省略する (上のレシピ 1 相当) かを明示的に選ぶことになります:

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    // bloxdLitColour を使えば enchant/overlay の混合は自動
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## 注意点

- エンチャント入力が乗ってくるのは**エンチャントされたアイテムと防具**だけ。地形・水・エンチャントされていない面ではすべて 0 です
- `enchantColour` 出力を変更しても色出力 (`colour`) には直接触れていません — 混合は `bloxdLitColour` / `bloxdDefaultLight` の側で起きます
- モデルパイプラインの外 (地形) ではエンチャント入力は常に 0 です

## 関連

- [ライティングAPI](../api/lighting.md) — 混合の順序と `bloxdLitColour`
- [入出力構造体](../api/structures.md) — `enchantTier` / `enchantColour` / `enchantSpeed` / `overlayColour`
- [モデルシェーダーのレシピ](model-shaders.md) — モデルパイプラインの他のレシピ
