# テクスチャサンプリングの内部

> 対象API: 5 · 対象ビルド: `xkg8x` · 検証状況: Analyzed (ライブ生成器 c56 から復元)

`bloxdTexel` / `bloxdTextureSize` が実際にどうコンパイルされるか — 3バリアントのテクスチャコード生成です。使い方の側は [テクスチャAPI](../api/texture-api.md) を参照。

## 3バリアントの生成

エンジンはレンダラ構成に応じて異なるコードを注入します。

### バリアント 1 — テクスチャパック非アクティブ (スタブ)

生成ブロックの全体。`bloxdTextureSize` と `bloxdTexel` はスタブです:

```wgsl
fn bloxdTextureSize(bloxdSpMipLevel: f32) -> vec2u {
        return vec2u(1u);
}
fn bloxdTexel(bloxdSpTextureId: u32, bloxdSpUv: vec2f, bloxdSpMipLevel: f32) -> vec4f {
        return vec4f(1.0);
}
```

実アトラス向けに書いたコードはここでもコンパイルも実行も通ります — ただ白いテクセルと 1×1 のサイズを見るだけです。

### バリアント 2 — アトラス経路 (ゲームのデフォルト)

`bloxdTextureSize` は `textureDimensions(textureAtlas0, u32(clamp(round(bloxdSpMipLevel), 0.0, f32(textureNumLevels(textureAtlas0) - 1u))))` を返します。`bloxdTexel` はロードの前に面の四半期回転を適用します — 回転の罠が、生成された `bloxdSpTurned` の明示的な if 連鎖として書かれています:

```wgsl
        // Each quarter turn clockwise the face shows its texture at reads the unturned texture at (v, 1 - u)
        var bloxdSpTurned = bloxdSpUv;
        if (bloxdSpTextureRotation == 1u) {
                bloxdSpTurned = vec2f(bloxdSpUv.y, 1.0 - bloxdSpUv.x);
        } else if (bloxdSpTextureRotation == 2u) {
                bloxdSpTurned = 1.0 - bloxdSpUv;
        } else if (bloxdSpTextureRotation == 3u) {
                bloxdSpTurned = vec2f(1.0 - bloxdSpUv.y, bloxdSpUv.x);
        }
```

(抜粋の `bloxdSpTextureRotation` は入力フィールド `textureRotation` に対するエンジン自身の格納です。配送経路の役割は不変。)

### バリアント 3 — カスタムテクスチャパックのテクスチャ

`textureLoad(<atlas>, min(bloxdSpCellAt * bloxdSpSize + bloxdSpAt, <dims> - 1u), bloxdSpLevel)` でレイヤー化アトラスの per-texture セルをサンプリングします。パック自身のテクセルには `bloxdSpOwnTexel` 経路があります。

## アニメーションのフレームラダー

アニメーションテクスチャ (42族) は、エンジンが族ごとの固定間隔 (200 / 250 / 300 ms) でフレームを進めます ([テクスチャカタログ](../api/texture-catalog.md#アニメ族-42-名) の間隔列)。`bloxdTexel` にアニメ族の id を渡すと現在のフレームのサンプリングになります。

## サンプラの設定

ブロックテクスチャの実体は 2D 配列テクスチャ (`texture_2d_array`) で、地形のサンプラは nearest かつ repeat に設定されています。

## greedy meshing と UV

メッシャーは材質・AO・ライトが一致する面を 1 つの矩形にまとめる (**greedy meshing**) ため、頂点の UV はマージ面上でタイル幅を超えうります (縁に 0.0015 のインセット)。繰り返し側はハードの repeat アドレッシングが担うので、マージ面はシームなしに見えます。ただし `uv` を基準に手続き的ディテールを重ねると、マージ面の境界で不連続になり得るため、ワールド位置 (`bloxdWorldPosition(position)`) を基準に設計するのが安全です。

## 関連

- [テクスチャAPI](../api/texture-api.md) — 公開仕様の側
- [テクスチャレジストリの内部](texture-registry.md) — 名前→id の解決
- [レンダリングパイプライン](rendering-pipeline.md) — 頂点フォーマットとアトラス
