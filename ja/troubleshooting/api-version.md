# APIバージョンエラー

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番検証済み) · 検証状況: Verified (ライブ i18n 辞書から逐語)

`apiVersion` まわりのエラーです。現行ゲームは **`5` のみ**を受け付けます。

## 「pack.json needs "apiVersion": {{version}}.」

- **症状**: 読み込み直後にこのメッセージが出る (`loadNoApiVersion`)
- **原因**: `apiVersion` キー自体が存在しない
- **解決方法**: `"apiVersion": 5` を追加する — **数値**として (文字列 `"5"` は失敗する)
- **再発防止**: [pack.json](../getting-started/manifest.md) のテンプレートから作り始める

## 「This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.」

- **症状**: `loadWrongApiVersion`
- **原因**: `apiVersion` はあるが 5 ではない (v1〜v4 のパック)
- **解決方法**: 対応する移行を適用する ([バージョン履歴](../history/)):
  - v4 → v5: [v5 移行ガイド](../history/v5.md) — ほぼ機械的 (flags · `bloxdLit()` · `bloxdFragmentBlockPosition` の注意点)
  - v3 → v5: まず [v4](../history/v4.md) を適用
  - v2 以前 → v5: v3 → v4 → v5 の順に段階適用
- **再発防止**: API 更新の後は、[互換性](../api/compatibility.md) と対応する移行ガイドを確認する

## 文字列 "5" は弾かれる

- **原因**: ローダーは `manifest.apiVersion !== 5` を**厳密に** (`===`) 比較する。JSON 文字列 `"5"` は数値 5 ではない
- **解決方法**: `"apiVersion": 5` (クォートなし) にする

## 保存してあった旧パックが黙って動かなくなった

- **症状**: 以前は動いていた v1〜v4 パックが無反応になる。例外は出ない
- **原因**: 保存パックは `{kind: "none", reason: "otherApiVersion"}` に解決され、**黙って不活性化**する
- **確認方法**: 設定タブのステータス行: `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`
- **解決方法**: 同じ画面から移行済みの置き換えパックを読み込む
- **再発防止**: API 更新の後は、バージョン番号を上げた新版を再リリースして告知する ([配布](../getting-started/distribution.md))

## 移行した v4 パックが検証に落ちる

典型的な3パターンです (全手順は [v5 移行ガイド](../history/v5.md) を参照):

| 検証メッセージ | 原因 | 直し方 |
|---|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | `#ifdef BLOXD_LIGHTING` の使用 | `if (bloxdLit()) { ... } else { return bloxdDefaultLight(s, l); }` に書き換える |
| `bloxdBlockFlagRock isn't part of the shader pack API...` (予約名診断) | ビット定数への残存参照 | `surface.flags.rock` 等を使用 (1対1対応表は [フラグ](../api/flags.md)) |
| `bloxdFragmentBlockPosition` がない | v5 からはドキュメントされたヘッダーにない (注入と受け入れは継続 — [関数](../api/functions.md) 参照) | 修正すべきエラーではない: コンパイルは通る。新規コードでは `flags` / `bloxdWorldPosition()` を推奨 |

## 関連

- [互換性](../api/compatibility.md) · [バージョン履歴](../history/) · [pack.json](../getting-started/manifest.md)
