# 視覚の問題

> 対象API: 5 · 検証状況: Verified

コンパイルは通るが見た目がおかしい系です。

## 遠景が白く濁る

- **原因**: フォグの二重掛け。既定の light フック出力は**フォグ適用済み** (`bloxdApplyFog(lit + emission, light)`) なので、その上に独自の霧色を `mix` すると二重になる
- **確認方法**: 独自フォグを外したときに白濁が消えるか確認
- **解決方法**: 独自の霧は控えめにし、彩度だけを落とす方式 (大気遠近法) を検討 ([リアル系レシピ](../recipes/realism.md))
- **再発防止**: フォグの意味論 (0 = no fog, 1 = only fogColour) と適用位置 ([処理フロー](../api/lighting.md#全体の処理フロー)) を確認してから書く

## `pow(l.skyLight, γ)` をいくら上げても影が濃くならない

- **原因**: `skyLight` はエンジンのリフト曲線通過後の値 (生値 0.87 が 0.97 で届く)。ガンマ方式は数学的に対抗できない
- **解決方法**: リフト逆変換 + しきい値カットに切り替える ([影の表現](../guides/shadows.md) — 数値で証明済み)

## ブロックがほとんど真っ白になる

- **原因**: light フック出力の合計が 1.0 を超過している (出力の先にクランプは存在しない)
- **解決方法**: 最後に `clamp(col, vec3f(0.0), vec3f(1.0))` を挿入する

## 加算が無いのに白い

- **原因**: フォグの除算による un-fog 逆算
- **解決方法**: un-fog を外す。再構築する場合は `s.colour` を起点とし、フォグは最後に一度だけ `mix` (または `bloxdApplyFog`) で適用

## 発光ブロックが光らない (再構築系パック)

- **原因**: emission の再加算漏れ。`engineColour` を捨てて再構築した場合、emission は自分で足す必要がある
- **解決方法**: `+ s.emission * (1.0 - l.fogAlpha)` を追加する (フォグ通しで加算)。v5 なら `bloxdLitColour()` + emission + `bloxdApplyFog` の構成が安全 ([ライティングAPI](../api/lighting.md))
- **再発防止**: 再構築系の定石は [フォグをかけ直す定石](../recipes/realism.md) を参照

## チャンク / 原点の切り替わりで波や模様が途切れる

- **原因**: レンダー座標 (カメラ近傍原点) をそのまま使っている。プレイヤーの移動で原点が動く
- **解決方法**: ワールド依存の効果は `bloxdWorldPosition(position)` を使う ([座標のレシピ](../recipes/coordinates.md))
- **注意**: ワールド座標は f32 精度の限界があるため、極端に遠い座標では誤差が出うる

## 水面の模様が回転した面でずれる

- **原因**: `bloxdTexel` は渡した uv に現在のフラグメントの `textureRotation` を適用する ([回転の繊細さ](../api/texture-api.md#回転の繊細さ--中立サンプリングヘルパー))
- **解決方法**: 別テクスチャを回転中立にサンプルするなら `texelNeutral` ヘルパーで uv を事前回転する

## エンチャントのきらめきが消えた / 被弾フラッシュが消えた

- **原因**: カスタムライティングで `enchantColour` / `overlayColour` 出力を含めずに再構築した
- **解決方法**: `out.enchantColour = surface.enchantColour;` のパススルーを入れるか、`bloxdLitColour()` を使う ([エンチャント効果](../recipes/enchant-effects.md))
- **v5 の仕様**: `bloxdDefaultSurface` は両方を無変更で通すため、デフォルト経由なら勝手に消えることはない

## 空や雲・太陽円盤に効かない

- **原因**: **仕様** — フックの対象は terrain / liquid / model のみ。空はどのプログラムにも入らない ([到達できない表現](../guides/constraints.md))

## 関連

- [ライティングの問題](lighting.md) — 明るさ系の診断
- [デバッグのコツ](../guides/debugging.md) — 症状→原因の一覧
- [フォグの内部](../internals/fog-internals.md)
