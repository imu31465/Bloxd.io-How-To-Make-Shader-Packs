# エンジン内部仕様

エンジン内部の動作を説明する技術資料です。シェーダーパックがどのように処理されるかを詳しく知りたい場合に参照してください。安定した利用方法と公開仕様は[APIリファレンス](../api/)を参照してください。

## ページ一覧

| ページ | 内容 |
|---|---|
| [レンダリングパイプライン](rendering-pipeline.md) | alphaTest の位置、方向光2灯、uniform の実体、greedy meshing |
| [フック呼び出しの内部](hook-invocation.md) | フックがどう呼び出されるか |
| [エンジンヘッダー](engine-header.md) | パックに付加されるWGSLヘッダー |
| [シェーダー検証の内部](shader-validation.md) | 静的検証の内部、シグネチャ表、HEADER_VERSION |
| [WGSLコンパイルの内部](wgsl-compilation.md) | 第2段階の実検証、バリデーションスタブ |
| [予約識別子の内部](reserved-identifiers.md) | 46 個の `bloxdSp*` シンボル |
| [ライティングの内部](lighting-internals.md) | blockLight / heldLight の内部構造 |
| [フォグの内部仕様](fog-internals.md) | linear 固定・32 ブロック幅の減衰域 |
| [テクスチャサンプリングの内部](texture-sampling.md) | 3 バリアントのテクスチャコード生成 |
| [テクスチャレジストリの仕組み](texture-registry.md) | テクスチャ名の解決とアニメーション・回転名の扱い |
| [モデル描画の内部](model-rendering.md) | Model プログラムの内部 |
| [エンジンデータ](engine-data.md) | API v5の主要な仕様と制限 |
| [パックに見える値を変えるもの](testing-factors.md) | ワールド・プレイヤー設定による変動源 |
| [ゲーム別の適用ポリシー](policy.md) | shaderPackPolicy — allow 12 タイトル |
| [太陽と月の正体](sun-and-moon.md) | bloxdSunDirection の供給元 |
| [デバッグツール](debugging.md) | URL パラメータ・統計パネル |
