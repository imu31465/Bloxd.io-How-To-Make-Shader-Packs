# エンジンデータ

> 対象API: 5 · 用途: 仕様の要約

このページでは、シェーダーパックから利用できるAPIと、パック作成時に必要な制約をまとめます。詳しい定義と使用例は各リファレンスを参照してください。

## APIの概要

| 項目 | 仕様 |
|---|---|
| APIバージョン | `5` |
| フック | 9種類 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| バリアント | 6種類 (allow / strict × terrain / liquid / model) |
| マクロ | `BLOXD_STRICT`、`BLOXD_ALPHA`、`BLOXD_SCENE_DEPTH`。`BLOXD_LIGHTING` は使用できません |
| パック uniform | 80 バイト。フィールド配置は[パック形式](../api/pack-format.md)を参照 |
| テクスチャ | `bloxdTextureId<Name>` 形式の名前付き定数を使用。数値IDを固定しないでください |
| 予約名 | `bloxd` で始まる識別子はエンジン用に予約されています |

## パックの制約

| 項目 | 上限 |
|---|---:|
| WGSLファイル数 | 256 |
| WGSLソース合計 | 256 KB |
| `pack.json` | 64 KB |
| ZIPファイル | 32 MB |
| ZIP内エントリ数 | 1,024 |

マニフェストはZIPのルートに1つ配置し、各ファイルはUTF-8で保存してください。重複するパスや未対応のZIP形式は使用できません。詳細は[パック形式](../api/pack-format.md)を参照してください。

## API v5の主な機能

- `bloxdShadow()` と `bloxdAirShadow(t)` で、太陽光・月光による影の情報を取得できます。
- `bloxdShadowDirection()` で、影を落とす光の方向を取得できます。
- `pack.json` の任意の `keepCircleShadows` を `true` にすると、影APIを使うパックでも従来の円形影を残せます。
- ライティングの有効状態は `BLOXD_LIGHTING` ではなく、`bloxdLit()` で実行時に判定します。

## 関連

- [APIリファレンス](../api/) — 関数、構造体、定数
- [パック形式](../api/pack-format.md) — マニフェスト、uniform、ローダー制約
- [テクスチャカタログ](../api/texture-catalog.md) — 使用できるテクスチャ名
- [ゲーム別の適用ポリシー](policy.md) — allow / strict の対象
- [API v4移行ガイド](../history/v4.md) — 旧バージョンからの移行
