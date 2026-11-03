# Engine Internals & Research

エンジンの実装を解析して明らかになった内部仕様の資料です。これらはすべて、現行の本番ビルド (`ab90qa`) の JavaScript から直接復元したものです。公開APIの説明 ([API Reference](../api/)) とは役割を分け、内部構造の正確な処理と解析結果を保持します。

## このカテゴリーの構成

| ページ | 内容 |
|---|---|
| [レンダリングパイプライン](rendering-pipeline.md) | alphaTest の位置、方位光 2 灯、uniform の実体、greedy meshing |
| [Hook Invocation](hook-invocation.md) | フックがどう呼び出されるか |
| [エンジンヘッダ](engine-header.md) | v5 ヘッダー全文 (逐語、8,954B) |
| [Shader Validation](shader-validation.md) | 静的検証の内部、シグネチャ表、HEADER_VERSION |
| [WGSL Compilation](wgsl-compilation.md) | 第2段階の実検証、バリデーションスタブ |
| [Reserved Identifiers](reserved-identifiers.md) | 46 個の `bloxdSp*` シンボル |
| [Lighting Internals](lighting-internals.md) | blockLight / heldLight の内部構造 |
| [Fog Internals](fog-internals.md) | linear 固定・32 ブロック幅の減衰域 |
| [Texture Sampling](texture-sampling.md) | 3 バリアントのテクスチャコード生成 |
| [Texture Registry](texture-registry.md) | 名前→id の解決、896 名、ドリフト実測 |
| [Model Rendering Internals](model-rendering.md) | v5 の Model プログラム |
| [Engine Data](engine-data.md) | 定数・制限・レイアウトの計測台帳 (v5) |
| [パックに見える値を変えるもの](testing-factors.md) | ワールド・プレイヤー設定による変動源 |
| [ゲーム別の適用モード](policy.md) | shaderPackPolicy — allow 12 タイトル |
| [太陽と月の正体](sun-and-moon.md) | bloxdSunDirection の供給元 |
| [デバッグ手段](debugging.md) | URL パラメータ・統計パネル |
| [リサーチログ](research-log.md) | 計測手法・ビルド履歴・未確認事項 |

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認)

内部実装は安定したAPI契約ではありません — エンジンの更新で変わりうるものであり、各ページに根拠ビルドを明記しています ([リサーチログ](research-log.md))。
