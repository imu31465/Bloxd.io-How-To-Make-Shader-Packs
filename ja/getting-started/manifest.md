# pack.json (マニフェスト)

> 対象API: 5 · 対象ビルド: `v98qt8` (2026-11-08 本番+preprod確認) · 検証状況: Verified

`pack.json` はパックのマニフェストで、zip ルートにただ1つ置く JSON オブジェクトです。

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

## フィールド

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `apiVersion` | 数値 | 必須 | **`5` と厳密に (`===`) 一致させる**。文字列 `"5"` や数値以外は失敗し、JSON 上の表記つきで報告される |
| `name` | 文字列 | 必須 | 空文字不可 (トリミング後非空)。設定画面に表示される |
| `author` | 文字列 | 任意 | 省略可。存在するなら文字列であること (数値等はエラー) |

その他のフィールドはローダーに無視されます。

## API バージョン不一致時の挙動

ローダーは `manifest.apiVersion !== 5` を厳密比較し、不一致なら**ロードのその瞬間に失敗**します。ライブ i18n 辞書からメッセージは逐語で:

- `pack.json needs "apiVersion": {{version}}.` — キー自体が存在しない場合
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — キーは存在するが 5 に等しくない場合

保存されていた (以前は動いていた) 旧バージョンのパックは例外を投げず、`{kind: "none", reason: "otherApiVersion"}` に解決して**暗黙に不活性化**します。シェーダーパック設定タブのステータス行が理由を説明します:

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

v1〜v4 からの移行手順は [バージョン履歴](../history/) を参照してください。
