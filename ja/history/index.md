# Version History

API v1 から v5 までの変更内容・移行手順・廃止されたAPIの保存資料です。過去バージョン向けに書かれたパックの移行と、各バージョン時点の仕様記録に使います。

## 年表

| バージョン | 稼働開始 | 移行ガイド | 主な変更 |
|---|---|---|---|
| v1 | (初期) | [v1](v1.md) | シェーダーパック機構の初出。6フック (terrain/liquid × vertex/surface)、`bloxdTime` / `bloxdOriginOffset` / `bloxdFaceBlock` / `engineColour` / `fogFactor` の語彙 |
| v2 | — | [v2](v2.md) | 識別子の全面改名、`blockId`、`BLOXD_SCENE_DEPTH` と `bloxdOpaqueBehind()` |
| v3 | 2026-10-19 | [v3](v3.md) | `blockId` → `blockFlags` ビットフラグ、`bloxdPi` / `bloxdTau`、液体フックの公式化、フック呼び出し内部の解析 |
| v4 | 2026-10-26 | [v4](v4.md) | テクスチャAPI (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`)、strict 契約、エンジンヘッダーとレジストリの解析 |
| **v5** | **2026-11-03** | [v5](v5.md) | **現行** — `BloxdFlags` 構造体 (14 bool)、Model フック (9フック)、`bloxdLit()` / `bloxdLitColour()` ライティングAPI、`localPosition`、エンチャント・オーバーレイ入出力、6バリアント |

## 各バージョンの運命 (共通の前置き)

現行ゲームは `apiVersion: 5` のみを受け付け、**旧バージョンのパックは読み込みのその瞬間に失敗**します (保存済みパックは例外なく暗黙に不活性化 — [互換性](../api/compatibility.md))。各移行ガイドは「前バージョンから次へ」の変換を扱います。複数バージョンを跨ぐときは古い方から順に適用してください。

## 移行チェックリストへの早道

- v4 パックを持っている → [v5 移行ガイド](v5.md) §77 (ほぼ機械的)
- v3 パック → [v4](v4.md) §61 → [v5](v5.md) §77
- v2 パック → [v3](v3.md) §47 → v4 → v5
- v1 パック → [v2](v2.md) §37 から順に

> 現行仕様そのものを調べるには [API Reference](../api/) を、現行ビルドの内部解析には [Engine Internals](../internals/) を参照してください。
