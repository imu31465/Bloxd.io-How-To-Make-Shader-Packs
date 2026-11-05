# 互換性

> 対象API: 5 · 対象ビルド: `bny9u` (2026-11-05 本番確認) · 検証状況: Verified

現行ゲームと旧バージョンパックの相互運用の全体像です。

## 現行ゲームが受け付けるバージョン

**`apiVersion: 5` のみ**です。ローダは `manifest.apiVersion !== 5` を厳密比較 (`===`) し、v1/v2/v3/v4 パックは**ロードのその瞬間に失敗**します。複数バージョンの同時受け付けはありません。

## 読み込み時のメッセージ (ライブ i18n 辞書から逐語)

- `pack.json needs "apiVersion": {{version}}.` — `apiVersion` キー自体が存在しない場合
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — キーは存在するが 5 に等しくない場合

## 保存済み旧パックの挙動 (例外なし・暗黙の不活性化)

保存されていた (以前は動いていた) v1〜v4 パックはプレイヤーに例外を投げません。保存パックの結果は:

```
{kind: "none", reason: "otherApiVersion"}
```

に解決し、パックは**暗黙に不活性**となります。理由を説明するのはシェーダーパック設定タブのステータス行だけです:

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

## v4 → v5 の変換の性質

v4 からの変換は**ほぼ機械的**です ([移行チェックリスト](../history/v5.md) に全手順):

- `blockFlags & bloxdBlockFlagX != 0u` → `flags.x` (1対1のリネーム)
- `#ifdef BLOXD_LIGHTING` → `if (bloxdLit()) { ... } else { return bloxdDefaultLight(...); }`
- `bloxdFragmentBlockPosition` の呼び出し箇所は今もコンパイルが通る (エンジンが注入し続けている) が、非公開となったので移行が安全策 ([関数](functions.md#bloxdfragmentblockposition--非公開だが今も注入される))
- `pack.json` を `"apiVersion": 5` へ

今回の静かな罠: 旧ビット定数を名前で参照しているパックは**固有のメッセージ付きで検証に失敗**します (アナライザが両方の場合を説明するようになった) ので、暗黙に誤動作することはありません — ただし移植するまでロードを拒否され続けます。

## 保存パックの再検証 (再チェック)

`HEADER_VERSION` は `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` 形式です (先頭整数は v4 の 8 から 9 へ)。エンジンのヘッダーやテクスチャレジストリが変わると (ゲーム更新でよくある)、保存パックは «要再チェック» になり、ページ読み込み時に自動で再検証されます。

実測されたレジストリの動きの例 (10日間の2ビルド比較): エントリ数 1200 → 1219 (98 追加、79 削除)、綴りが変わらなかった名前のうち **779名が id を変更**。つまり:

- **名前で書いたパック (`bloxdTextureIdLava`) はドリフトを生き延びる** (ローダが読み込み時に生レジストリへ再解決するため)
- **生 id で書いたパック (`19` と書く) は再検証で壊れる**

詳細は [エンジン内部: Texture Registry](../internals/texture-registry.md) を参照。

## 実行環境との互換性

- **WebGPU レンダラー専用**: パック導入中は設定の WebGPU レンダラーが強制的にオンになります
- **モバイル**: WebGPU 対応が限定される環境ではパック自体が動きません ([動作環境](../getting-started/requirements.md))
- **非アトラスのレンダラ構成**: `bloxdTexel` / `bloxdTextureSize` はスタブに劣化します (白テクセル・1×1)。コードはコンパイルも実行も通ります ([テクスチャAPI](texture-api.md#テクスチャapiが届かない場所))

## 各バージョンのサポート状況まとめ

| APIバージョン | 稼働開始 | 現行ゲームでの扱い |
|---|---|---|
| v1 | — | 読み込み拒否 (移行は [v2](../history/v2.md) 経由) |
| v2 | — | 読み込み拒否 |
| v3 | 2026-10-19 | 読み込み拒否 |
| v4 | 2026-10-26 | 読み込み拒否 |
| **v5** | **2026-11-03** | **現行** |

## 関連

- v4 → v5 移行チェックリスト → [バージョン履歴: v5](../history/v5.md)
- 各バージョンの変更点一覧 → [バージョン履歴](../history/)
