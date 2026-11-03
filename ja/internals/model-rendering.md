# モデル描画の内部

> 対象API: 5 · 対象ビルド: `ab90qa` · 検証状況: Analyzed (ライブバンドルから復元)

v5 で新設された Model プログラムの描画パイプラインの内部です。利用者向けの解説は [モデルの描画とテクスチャ](../guides/models.md) を参照。

## Model プログラムとは何か

v4 以前、パックが差し込めるプログラムは terrain / liquid の 2 つで、ブロックモデル (スラブ・階段・草花) とエンティティ (プレイヤー・モブ・アイテム) は**パックの管轄外**でした。v5 は3つ目のプログラムとして model を追加し、次のものを描きます:

- ブロックモデルとして描かれるブロック (ヘッダー注記: *"Drawn as block models, so never part of terrain or flagged as opaque"*)
- 手に持った / ドロップされた / 投げられたアイテム
- プレイヤー、モブ、NPC (防具とコスメティックを含む)

## フラグと新入力の配送

- **`bloxdSpFlags`** — `BloxdFlags` 構造体の配送経路。8 個の新フィールド (`slab` / `stairs` / `flat` / `placed` / `held` / `dropped` / `thrown` / `lifeform`) はモデル面でのみ意味のある値を運びます
- **`bloxdSpItemLocalPosition`** — `localPosition` の配送経路。地形・液体では `vec3f(0.0)`
- **`bloxdSpEnchant`** — エンチャント入力 (`enchantTier` / `enchantColour` / `enchantSpeed`) の経路

## エンチャントの計算

エンジンはエンチャントのきらめき (掃引するパターン) をアニメーションし、`enchantColour.a` として surface / light フックに届けます ([エンチャント効果](../recipes/enchant-effects.md))。きらめきの混合自体は `bloxdLitColour()` 内 — シェーディングの直後、ワールド光の前 — で行われます ([ライティング](../api/lighting.md#全体の処理フロー))。

## オーバーレイ (被弾フラッシュ等)

`overlayColour` はプレイヤー・モブの状態色 (ダメージ赤フラッシュ等) を RGB + アルファで運びます。`bloxdLitColour` が**ライティングの前**に混合するため、基礎色を壊さずに状態表現が乗ります。エンジン内部では v4 から存在していた処理が v5 で入出力に開放されました。

## テクスチャの経路

モデル面の多くは `textureId: 0` (テクスチャなし) です — プレイヤースキンや Mob テクスチャはブロックテクスチャアトラスの名前空間に登録されません。`surface.colour` にはスキン × 色が焼き込まれた状態で届くため、モデル面の加工は `colour` を起点にします ([テクスチャAPI](../api/texture-api.md#モデル独自のテクスチャ-textureid-0))。

## バリアント

Model プログラムはバリアント行列の1軸を構成します: `strict.model` / `allow.model`。`BLOXD_ALPHA` は allow.model でのみ定義されます ([プリプロセッサ](../api/preprocessor.md#マクロバリアントの行列))。strict.model では vertex フックが存在しません。

## 関連

- [モデルの描画とテクスチャ](../guides/models.md) — 利用者向け解説
- [モデルシェーダーのレシピ](../recipes/model-shaders.md)
- [フラグ](../api/flags.md) — 8 個の新フィールド
- [Rendering Pipeline](rendering-pipeline.md)
