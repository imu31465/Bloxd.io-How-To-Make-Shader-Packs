# モデルの問題

> 対象API: 5 · 対象ビルド: `bny9u` · 検証状況: Analyzed (v5 の新領域)

Model フックまわりの問題です。

## プレイヤーやモブの見た目が変わらない

- **症状**: terrain フックを書いたのにエンティティが変わらない
- **原因**: エンティティ (プレイヤー・モブ・NPC・防具・コスメ) は **Model プログラム**で描かれる。Terrain フックは効かない
- **確認方法**: `bloxdModelSurface` / `bloxdModelLight` をパックに定義したか
- **解決方法**: Model フックを追加する ([モデルの描画とテクスチャ](../guides/models.md))
- **再発防止**: 描画対象の分担表 ([シェーダーフック](../api/hooks.md#各プログラムが描くもの)) を確認する

## スラブ・階段・草花が変わらない

- **原因**: ブロックモデル (slab / stairs / flat) も Model プログラムで描かれる。**Terrain には入らない**
- **解決方法**: Model フックで `flags.slab` / `flags.stairs` / `flags.flat` を使う ([フラグ](../api/flags.md))

## 水面に効果が効かない

- **原因**: 水は Liquid Hook 専用。**パックに Liquid Hook がなければ水には Terrain Hook も実行されない** (v5 の仕様変更)
- **解決方法**: `bloxdLiquidSurface` / `bloxdLiquidLight` を定義する ([バリアント固有の問題](variants.md))

## 手に持ったアイテムだけ変えたいのに全部変わる

- **原因**: フラグで選別していない
- **解決方法**: `surface.flags.held` で選別する ([モデルシェーダーのレシピ](../recipes/model-shaders.md))

## フラグの判定が思った通りにならない

- **原因の候補**:
  1. **フラグを単一選択の enum として扱った** — フラグは複数同時に true になる («sandstone is sand and rock»、«possibly even none») ([フラグ](../api/flags.md#複数フラグの組み合わせ))
  2. `else` を「それ以外」と解釈した — `if (surface.flags.rock) { ... } else { ... }` の else は「rock でない」だけで sand かもしれない
- **解決方法**: 素材判定 (`opaque` 等の材質) と形状・状態 (`slab` / `held` 等) は独立に組み合わせる書き方にする

## エンチャントきらめきが消えた

- **原因**: カスタムライティングで `enchantColour` 出力を含めなかった
- **解決方法**: `out.enchantColour = surface.enchantColour;` のパススルーか、`bloxdLitColour()` を使う ([エンチャント効果](../recipes/enchant-effects.md))

## 被弾フラッシュ (赤い点滅) が消えた・強すぎる

- **原因**: `overlayColour` 出力の取り扱い。混合は `bloxdLitColour` の中、シェーディングの直後
- **解決方法**: パススルーを入れるか、`out.overlayColour.a` で強度を調整する ([エンチャント効果](../recipes/enchant-effects.md))

## `localPosition` が常に 0 に見える

- **原因**: 地形・液体の面では `localPosition` は `vec3f(0.0)` (モデルが無い) — **仕様**
- **確認方法**: Model フック内で読んでいるか、Terrain/Liquid フックで読んでいないか
- **解決方法**: モデル固有の演出は Model フックで ([モデルシェーダーのレシピ](../recipes/model-shaders.md))

## モデル面で `bloxdTexel` が白を返す

- **原因**: `textureId: 0` は「テクスチャなし」で白 `vec4f(1.0)` を返す (プレイヤースキン等)
- **解決方法**: `surface.textureId != 0u` で選別、または `surface.colour` (スキン反映済み) を加工する ([テクスチャの問題](textures.md))

## 防具だけ / コスメだけを変えたい

- **限界**: 「防具」を直接示すフラグは無い。`flags.lifeform` は防具・コスメを含む
- **近似**: `localPosition` (部位配置) や `overlayColour` の有無との組み合わせ ([モデルシェーダーのレシピ](../recipes/model-shaders.md))

## 関連

- [モデルの描画とテクスチャ](../guides/models.md)
- [モデルシェーダーのレシピ](../recipes/model-shaders.md)
- [フラグ](../api/flags.md)
