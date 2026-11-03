# 読み込みエラー

> 対象API: 5 · 検証状況: Verified

zip・`pack.json` など、**ローダー段階** (最初の門) で弾かれるエラーです。設定画面のステータス行に `shaderPack:load*` の ID つきで表示されます。

## 「There's no pack.json at the top of the pack.」

- **原因**: zip 直下に `pack.json` が無い (フォルダごと固めてルート階層がずれている等)
- **確認方法**: zip を開いて `pack.json` が最上位 (または全ファイル共通の1階層ルートの直下) にあるか見る
- **解決方法**: フォルダの中に入って `pack.json` と `.wgsl` を直接指定して固める。全ファイルが共通する1階層のルートフォルダに収まっている zip はプレフィックスが自動で剥がされる ([パックの構成](../getting-started/pack-structure.md))
- **再発防止**: zip 化の手順を `pack.json` が直下に来る形で固定する。macOS の「フォルダを圧縮」もそのまま OK (`__MACOSX` 等の OS ゴミは自動除外)

## zip 読み込みで `loadDuplicateManifest`

- **原因**: `pack.json` が 2 つある (大文字小文字違いも含む)
- **確認方法**: zip 内を `pack.json` で検索する
- **解決方法**: 1 つにする

## 容量・個数オーバー

| メッセージ | 上限 |
|---|---|
| `The zip is over 32 MB.` | zip 32 MB |
| `The zip has more than 1024 entries.` | エントリ 1,024 個 |
| `The pack has more than 256 .wgsl files.` | `.wgsl` 256 個 |
| `The pack's .wgsl files are over 256 KB in total.` | `.wgsl` 合計 256 KB |
| `pack.json is over 64 KB.` | `pack.json` 64 KB |

- **原因**: 制限超過 (v4 から不変、ab90qa で再確認)
- **解決方法**: 不要な `.wgsl` を削る / 分割をやめて1ファイルにする / コメントを削る
- **再発防止**: これらの上限は「コンパイル時間」の実用上限でもあるため、肥大化はリファクタのサインと捉える

## 形式の問題

分割 zip・Zip64・暗号化エントリ・未対応圧縮はそれぞれ専用メッセージで拒否されます。全ファイルは有効な UTF-8 である必要があります。

## ローダー段階のエラーID一覧

| ID | 意味 |
|---|---|
| `loadZipTooBig` | zip が 32MB 超 |
| `loadTooManyZipEntries` | zip エントリが 1024 個超 |
| `loadTooManyWgsl` | `.wgsl` が 256 個超 |
| `loadSourceTooBig` | `.wgsl` 合計が 256KB 超 (ファイル単位のストリーミング検査) |
| `loadManifestTooBig` | `pack.json` が 64KB 超 |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` が JSON でない / オブジェクト型でない |
| `loadNoApiVersion` / `loadWrongApiVersion` | `apiVersion` 無し / `5` でない ([APIバージョンエラー](api-version.md)) |
| `loadNoName` / `loadAuthorNotString` | `name` 無し / `author` が文字列以外 |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | 対応外圧縮 / zip64 / 分割 / 暗号化 |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | パス重複 / UTF-8 以外 / 展開失敗 / zip 損傷 |
| `loadNoManifest` / `loadDuplicateManifest` | `pack.json` の位置・重複 |

## 「Ready. Reload the page to use it.」が表示された後、反映されない

- **原因**: パックは有効化のために**ページ再読み込み**を必要とする
- **解決方法**: 選択後にページを再読み込みし、ステータスが `Ready to use` になることを確認する
- **注意**: URLパラメータや localStorage にレンダラーオーバーライド (`?renderer=`、`bloxdRenderer`) が残っているとパックの起動が拒否される。除去してから再読み込み

## 関連

- [APIバージョンエラー](api-version.md) — `apiVersion` 系の詳細
- [パックの構成](../getting-started/pack-structure.md) — zip の形式要件
- [パック形式](../api/pack-format.md) — ローダ制限の仕様表
