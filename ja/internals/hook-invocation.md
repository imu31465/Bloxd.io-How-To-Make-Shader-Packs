# フック呼び出しの内部

> 対象API: 5 · 対象ビルド: `xkg8x` · 検証状況: Analyzed (本番バンドルから復元 — Lite レンダラ、統合元ソース `lite/terrainShaderPack.ts` がエラー文字列に残存)

エンジンが実行時にフックをどう呼び出すかの内部です。ここに書かれたことは、あなたが書くコードを変えるものではありません。しかしフックが何を受け取るかについての推測をなくし、未解決の疑問を決着させます。

## 接ぎ木 (splice) アーキテクチャ

レンダラは JavaScript からフックを「呼び出す」のではありません。パックが検証を通ると、エンジンは**シェーダーテキスト内の固定アンカー行を置換することで、あなたのフック呼び出しを自身の地形 WGSL に接ぎ木する**。アンカーはちょうど1回だけ一致しなければならない — 0回または複数回の一致は `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)` で中断します。

| 段階 | エンジンシェーダ内のアンカー | 接ぎ木される内容 |
|---|---|---|
| vertex | `let worldPos = …` から `vertexOutputs.vNormalW = …` までのブロック | `BloxdVertexIn` を構築し、vertex フックを呼び、`worldPos` を書き戻す — 接ぎ木は `let worldPos` を `var worldPos` にも書き換える |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | `BloxdSurfaceIn` を構築し、surface フックを呼び、`baseColor` / `alpha` を書き戻す |
| lit colour | フォグ混合の直前 | フォグ前の色を捕捉する (v3 では `bloxdSpLitColour` 一時変数 — v5 ではこの役割が公開の `bloxdLitColour()` ヘッダー関数へ昇格) |
| light | フラグメントシェーダ末尾の `return color;` 行 | `BloxdLightIn` を構築し、light フックを呼び、`color` を書き戻す — フォグ混合の後 |

## 接ぎ木から導ける強制事項

- **strict 地形は surface フックの alpha 変更を無視する。** `alpha = bloxdSpSurface.alpha` の書き戻しは、液体プログラムまたは非 strict バリアントでのみ接ぎ木されます — マクロ表 ([プリプロセッサ](../api/preprocessor.md)) の背後にある実装です
- **vertex フックを宣言した strict バリアントは、それを実行しない。** エンジンはビルド時に `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs` と報告します。公式テンプレートが vertex フックを `#ifndef BLOXD_STRICT` で囲むのはこのためです
- **`bloxdSp*` 識別子**はエンジン側の一時変数です。あなたのコードからは見えませんが、診断やリバースエンジニアリング出力には現れます ([Reserved Identifiers](reserved-identifiers.md) — v5 では 46 個)
- **既定 surface のショートカット。** バリアントの surface フックが文字どおり `bloxdDefaultSurface` である場合、エンジンは `baseColor` / `alpha` の書き戻し行の接ぎ木をまるごと省略します — 既定処理がすでにその値を生成しているため、代入はデッドコードだからです。**変更していないフックの連鎖には何のコストもかかりません**

## v5 での構造の変化

同じ接ぎ木アーキテクチャは v2 レンダラから存在し、v2 → v3 の断絶をまたいで安定していました (v3 は `vBlockId` → `vBlockFlags` と液体バリアントの追加だけ)。v5 の変化:

- `vBlockFlags` (ビット) → **`BloxdFlags` 構造体** (配送経路 `bloxdSpFlags`)
- `litColour` の捕捉が engine-internal から**公開APIへ** (`bloxdLitColour()` — v4 の内部シンボル `bloxdSpLitColour` が昇格)
- `BloxdLightIn` に `diffuse` / `emissive` が加わり、`bloxdShading()` が材質応答を再構築 ([ライティング](../api/lighting.md))
- `localPosition` (`bloxdSpItemLocalPosition`)、エンチャント入力 (`bloxdSpEnchant`)、`overlayColour` の配送が追加 ([モデル描画の内部](model-rendering.md))
- `fogVisibility` → **`fogAlpha`** (意味反転)
- Model プログラムがバリアント行列に加わった (3 プログラム × 2 モード = 6 バリアント)

## BloxdLightIn への供給元 (フィールド別)

| フィールド | エンジン側の供給元 |
|---|---|
| `litColour` | フォグ混合の直前に捕捉されたフラグメント色 — ヘッダーの表現では「emission とフォグの前」 |
| `directional` | シーンの方向ライトごとの Lambert 和を頂点補間したもの (方位光 2 灯構成は [レンダリングパイプライン](rendering-pipeline.md)) |
| `diffuse` / `emissive` | マテリアルの方向光 RGB 応答 / RGB グロー (v5 新設) |
| `ambient` | `material.ambient × sceneAmbient` — マテリアルごと、フレームごと |
| `blockLight` / `skyLight` | デコードされたライトレベルの varying ([ライティングの内部](lighting-internals.md)) |
| `ambientLightColour` / `skyLightColour` | 対応する uniform |
| `heldLight` | ライトレベル varying と手持ちライト uniform から作られる項 (円錐減衰は [ライティングの内部](lighting-internals.md)) |
| `fogColour` | フォグがまったく無いシーン (モード 0) でのみ黒 |
| `fogAlpha` | クランプされたフォグ係数 ([フォグの内部仕様](fog-internals.md)) |
| `position` / `normal` / `localPosition` / `flags` / `textureId` / `textureRotation` / `uv` / `mipLevel` | varying とフラット補間 (`BloxdSurfaceIn` と同じ — vertex フック適用後の値) |

## 関連

- [シェーダーフック](../api/hooks.md) — 公開仕様
- [レンダリングパイプライン](rendering-pipeline.md) — 頂点フォーマットとアトラス
- [Reserved Identifiers](reserved-identifiers.md)
- [バージョン履歴: v3](../history/v3.md) — v3 時点の接ぎ木コード (vBlockFlags 等の当時の記録)
