# 視覚の問題

> 対象API: 5 · 検証状況: Verified

コンパイルは通るのに見た目がおかしいケースです。

## 遠景が白く濁る

- **原因**: フォグの二重掛け。既定の light フック出力は**フォグ適用済み** (`bloxdApplyFog(lit + emission, light)`) なので、上にさらにフォグ色を混ぜると二重になります
- **解決方法**: 独自フォグは控えめにし、彩度だけを落とす大気遠近法を検討する ([リアル系レシピ](../recipes/realism.md))
- **再発防止**: フォグを書く前に、`fogAlpha` の意味 (0 = no fog、1 = only fogColour) と[パイプライン](../api/lighting.md#全体の処理フロー)を理解する

## pow(l.skyLight, γ) をいくら上げても影が濃くならない

- **原因**: `skyLight` はリフト曲線通過後の値として届く (生値 0.87 が 0.97 で届く)。ガンマでは数学的に対抗できません
- **解決方法**: リフト逆変換 + しきい値カットに切り替える ([影の表現](../guides/shadows.md))

## ブロックがほとんど真っ白になる

- **原因**: light フックの出力が 1.0 を超えている (出力の先にクランプは存在しない)
- **解決方法**: 末尾に `clamp(col, vec3f(0.0), vec3f(1.0))` を追加する

## 加算していないのに白い

- **原因**: 除算による un-fog の逆算
- **解決方法**: un-fog をやめる。`s.colour` から再構築し、フォグは最後に一度だけ (または `bloxdApplyFog` で) 適用する

## 発光ブロックが光らない (再構築系パック)

- **原因**: emission の再加算漏れ — 既定出力を捨てるということは、emission を自分で足す必要があるということです
- **解決方法**: `+ s.emission * (1.0 - l.fogAlpha)` を追加する。v5 では `bloxdLitColour()` + emission + `bloxdApplyFog` の構成が最も安全です ([ライティング](../api/lighting.md))

## チャンク / 原点の切り替わりで波や模様が途切れる

- **原因**: レンダー空間の座標をそのまま使っている — 原点はプレイヤーとともに移動します
- **解決方法**: ワールド依存の効果には `bloxdWorldPosition(position)` を使う ([座標](../recipes/coordinates.md))。原点から遠い場所での f32 の精度限界にも注意

## 水面の模様が回転した面でずれる

- **原因**: `bloxdTexel` はフラグメント自身の `textureRotation` を渡した uv に適用する ([回転の繊細さ](../api/texture-api.md#回転の繊細さ--中立サンプリングヘルパー))
- **解決方法**: `texelNeutral` ヘルパーで事前回転する

## エンチャントのきらめき / 被弾フラッシュが消えた

- **原因**: カスタムライティングで `enchantColour` / `overlayColour` を通さずに再構築した
- **解決方法**: これらをパススルーするか、`bloxdLitColour()` を使う ([エンチャント効果](../recipes/enchant-effects.md))
- **v5**: `bloxdDefaultSurface` は両方を変更せずに通すため、デフォルト経由では失われることはありません

## 空・雲・太陽円盤に効かない

- **仕様です**: フックが対象とするのはテレイン / 液体 / モデルのみ ([到達できない表現](../guides/constraints.md))

## 関連

- [ライティングの問題](lighting.md) · [デバッグのコツ](../guides/debugging.md) · [フォグの内部](../internals/fog-internals.md)
