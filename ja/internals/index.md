# エンジン内部と研究

エンジンの実装を解析して明らかになった内部仕様の資料です。これらはすべて、現行の本番ビルド (`bny9u`) の JavaScript から直接復元したものです。公開APIの説明 ([APIリファレンス](../api/)) とは役割を分け、内部構造の正確な処理と解析結果を保持します。

## このカテゴリーの構成

| ページ | 内容 |
|---|---|
| [レンダリングパイプライン](rendering-pipeline.md) | alphaTest の位置、方位光 2 灯、uniform の実体、greedy meshing |
| [フック呼び出しの内部](hook-invocation.md) | フックがどう呼び出されるか |
| [エンジンヘッダ (逐語)](engine-header.md) | 現行ヘッダー全文 (逐語、8,954B) |
| [シェーダー検証の内部](shader-validation.md) | 静的検証の内部、シグネチャ表、HEADER_VERSION |
| [WGSLコンパイルの内部](wgsl-compilation.md) | 第2段階の実検証、バリデーションスタブ |
| [予約識別子の内部](reserved-identifiers.md) | 46 個の `bloxdSp*` シンボル |
| [ライティングの内部](lighting-internals.md) | blockLight / heldLight の内部構造 |
| [フォグの内部仕様](fog-internals.md) | linear 固定・32 ブロック幅の減衰域 |
| [テクスチャサンプリングの内部](texture-sampling.md) | 3 バリアントのテクスチャコード生成 |
| [テクスチャレジストリの内部](texture-registry.md) | 名前→id の解決、896 名、ドリフト実測 |
| [モデル描画の内部](model-rendering.md) | Model プログラムの内部 |
| [エンジンデータ台帳](engine-data.md) | 定数・制限・レイアウトの計測台帳 |
| [パックに見える値を変えるもの](testing-factors.md) | ワールド・プレイヤー設定による変動源 |
| [ゲーム別の適用ポリシー](policy.md) | shaderPackPolicy — allow 12 タイトル |
| [太陽と月の正体](sun-and-moon.md) | bloxdSunDirection の供給元 |
| [デバッグツール](debugging.md) | URL パラメータ・統計パネル |
| [リサーチログ](research-log.md) | 計測手法・ビルド履歴・未確認事項 |

> 対象API: 5 · 対象ビルド: `v98qt8` (2026-11-08 本番+preprod確認)

内部実装は安定したAPI契約ではありません — エンジンの更新で変わりうるものであり、各ページに根拠ビルドを明記しています ([リサーチログ](research-log.md))。
