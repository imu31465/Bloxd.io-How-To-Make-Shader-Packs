# APIバージョンエラー

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認) · 検証状況: Verified (ライブ i18n 辞書から逐語)

`apiVersion` まわりのエラーです。現行ゲームは **`5` のみ**を受け付けます。

## 「pack.json needs "apiVersion": {{version}}.」

- **症状**: 読み込み直後にこのメッセージ (`loadNoApiVersion`)
- **原因**: `pack.json` に `apiVersion` キー自体が無い
- **確認方法**: `pack.json` を開く
- **解決方法**: `"apiVersion": 5` を追加する (**数値**。文字列 `"5"` は失敗する)
- **再発防止**: [pack.json](../getting-started/manifest.md) のテンプレートから作り始める

## 「This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.」

- **症状**: `loadWrongApiVersion`
- **原因**: `apiVersion` はあるが `5` に等しくない (v1〜v4 のパック)
- **解決方法**: 対象バージョンに応じた移行手順を適用する ([Version History](../history/)):
  - v4 → v5: [v5 移行ガイド](../history/v5.md) — ほぼ機械的 (flags・`bloxdLit()`・`bloxdFragmentBlockPosition` 削除)
  - v3 → v5: v4 の変更 ([v4](../history/v4.md)) を経由
  - v2 以前 → v5: v3 ([v3](../history/v3.md)) → v4 → v5 と段階適用
- **再発防止**: API が更新されたらドキュメントの [互換性](../api/compatibility.md) と該当バージョンの移行ガイドを確認する

## 文字列 `"5"` を入れたのに弾かれる

- **原因**: ローダは `manifest.apiVersion !== 5` を**厳密比較** (`===`) する。JSON の文字列 `"5"` は数値 `5` と等しくない
- **確認方法**: `pack.json` で `"apiVersion"` の値がクォートに入っていないか
- **解決方法**: `"apiVersion": 5` (クォートなし) にする。失敗時は JSON 上の表記つきで報告される

## 保存してあった旧パックが例外も出さずに効かなくなった

- **症状**: 以前動いていた v1〜v4 パックが無反応。例外は出ない
- **原因**: 保存パックの結果は `{kind: "none", reason: "otherApiVersion"}` に解決し、**暗黙に不活性化**する
- **確認方法**: シェーダーパック設定タブのステータス行: `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`
- **解決方法**: 移行した新版を同じ画面から読み込んで置き換える
- **再発防止**: 配布者は API 更新後にバージョンを上げた新版を再配布し、プレイヤーに案内する ([配布](../getting-started/distribution.md))

## v4 パックを v5 に移植したら検証に落ちる

典型的な3パターン ([v5 移行ガイド](../history/v5.md) に全手順):

| 検証メッセージ | 原因 | 直し方 |
|---|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | `#ifdef BLOXD_LIGHTING` の使用 | `if (bloxdLit()) { ... } else { return bloxdDefaultLight(s, l); }` に書き換え |
| `bloxdBlockFlagRock isn't part of the shader pack API...` (予約名診断) | 旧ビット定数の残存参照 | `surface.flags.rock` 等へ (1対1対応表は [フラグ](../api/flags.md)) |
| `bloxdFragmentBlockPosition` が無い | v5 で削除済み | 呼び出し箇所を削除 (代替なし — 必要なら `flags` で判定) |

## 関連

- [互換性](../api/compatibility.md) — バージョン間運用の全体
- [Version History](../history/) — v1〜v5 の移行ガイド
- [pack.json](../getting-started/manifest.md) — マニフェストの全フィールド
