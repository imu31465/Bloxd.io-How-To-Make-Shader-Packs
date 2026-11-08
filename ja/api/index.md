# APIリファレンス

現行API v5の体系的な仕様書です。すべて対象ビルド `bny9u` (2026-11-05、本番と preprod 同一バンドル) での実測に基づきます。エンジンがパックの先頭に自動付与するヘッダー (全文は [エンジン内部と研究](../internals/engine-header.md)) がこの節の情報の一次ソースです。

## このカテゴリーの構成

| ページ | 内容 |
|---|---|
| [パック形式](pack-format.md) | `pack.json` の全フィールド、ローダ制限、uniform レイアウト |
| [シェーダーフック](hooks.md) | 9フックのシグネチャ・対象・実行条件の比較表 |
| [フラグ](flags.md) | `BloxdFlags` の14フィールド完全解説 |
| [入出力構造体](structures.md) | 全構造体の全フィールド (条件付きフィールド含む) |
| [関数](functions.md) | フレーム関数・デフォルト関数・特殊関数の全シグネチャ |
| [ライティング](lighting.md) | ライティングAPI全体と処理フロー |
| [テクスチャAPI](texture-api.md) | `bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*` と命名規則 |
| [定数](constants.md) | `bloxdPi` / `bloxdTau` / `bloxdChunkSize` |
| [プリプロセッサ](preprocessor.md) | `BLOXD_STRICT` / `BLOXD_ALPHA` / `BLOXD_SCENE_DEPTH` |
| [制限と予約名](restrictions.md) | 言語機能の制限、予約識別子 |
| [互換性](compatibility.md) | 旧バージョンパックの挙動、保存パックの再検証 |
| [テクスチャカタログ](texture-catalog.md) | 利用可能896名の実測カタログ (検索可能) |

> 対象API: 5 · 対象ビルド: `v98qt8` (2026-11-08 本番+preprod確認) · 検証状況: Analyzed (ヘッダー・バリデータから逐語復元)

v4からの移行が必要な場合は [バージョン履歴: v5](../history/v5.md) を参照してください。
