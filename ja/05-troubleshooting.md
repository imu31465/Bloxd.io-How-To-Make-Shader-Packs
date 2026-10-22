[← 前の部](04-realism.md)・[マニュアルに戻る](README.md)・[次の部 →](06-implementation.md)

# 第五部: トラブルシューティング・注意

> 現行ビルドは 2026-10-19 以降 `apiVersion: 3` を要求し、v1/v2 パックは読み込み時に拒否される。以下の内容は v2 仕様に基づく記述である — 配布前に [第九部](09-apiv3.md) の変更を確認すること。

## 17. よくあるエラーと直し方

| 症状 | 直し方 |
|---|---|
| strict のゲームで読み込めない | vertex フックを `#ifndef BLOXD_STRICT` で囲む |
| `.alpha` が未定義と言われる | `#ifdef BLOXD_ALPHA` で囲む |
| `blockLight` が未定義と言われる | `#ifdef BLOXD_LIGHTING` で囲む。共用ヘルパー関数は**関数ごと**囲む (v2 ではフィールド常在のため通常は起きない。判定用途のガードは残す) |
| `Packs can't construct BloxdSurface directly` | `bloxdDefaultSurface(s)` を起点に書き換える |
| `pack.json needs "apiVersion": 3.` | `apiVersion` が無いか `3` でない。数値の `3` を入れる (文字列の `"3"` は不可)。v1/v2 パックは `shaderPack:loadWrongApiVersion` で拒否される |
| `There's no pack.json at the top of the pack.` | ZIP直下に `pack.json` が無い。フォルダごと固めていないか確認する |
| `bloxdTerrainVertex must be declared as: fn ...` | シグネチャ不一致。表示された宣言どおりに書き直す |
| `bloxdTerrainVertex can't run in strict games...` | vertex フックを `#ifndef BLOXD_STRICT` で囲む |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | `#ifdef BLOXD_LIGHTING` で囲む (v2 ではフィールド常在のため通常は起きない) |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | `#ifndef BLOXD_STRICT` で囲む |
| `pow(l.skyLight, γ)` をいくら上げても影が濃くならない | `skyLight` はエンジンのリフト曲線通過後の値 (生値 0.87 が 0.97 で届く)。R9.12 のリフト逆変換 + しきい値カットに切り替える (10章) |
| `... can only be a function's parameter or return type, ...` | 未初期化の `var x: BloxdSurface;` は不可。`bloxdDefault*` から作る |
| `bloxdPackInputs isn't part of the bloxd_ header` | PackInputs uniform はパックから直接参照不可。`bloxdTime()` 等のヘッダ関数経由で使う |
| `Packs can't declare bloxd_ names...` | 自分の識別子から `bloxd_` 接頭辞を外す。定義できるのは 6 つのフック名だけ |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | `bloxdDefaultSurface(s)` 等を起点に書き換える。light フック第 1 引数のコピー `var out = s;` から始めるのも可 |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` は不可。`_ = f();` と書く |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | 地形フック内の `bloxdOpaqueBehind()` 呼び出しを `#ifdef BLOXD_SCENE_DEPTH` で囲む |
| `...only surface and light hooks can use.` | vertex フック内の `bloxdOpaqueBehind()` を消す (surface / light のみ可) |
| `Lite: …reads scene depth on a page that didn't turn it on` | 深度読み取り ([第八部](08-apiv2.md) §35) をするパックが有効な状態でページを再読み込みして開き直す。深度テクスチャの用意はページ生成時に確定する |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | エラーではなく strict ゲームでの自動無効化 (`shaderPack:offInStrict`)。vertex フックと `discard` は `#ifndef BLOXD_STRICT` で囲む |
| `mixing '*' and '^' requires parenthesis (only in ...)` | 第2段階 (ブラウザ Tint) のエラー。`^` `&` `\|` `<<` `>>` のオペランドは括る (§38) |
| zip 読み込みで `loadDuplicateManifest` | `pack.json` が 2 つある (大文字小文字違いも含む)。1 つにする |
| 「needs the new WebGPU renderer, so remove the renderer override...」 | URL の `?renderer=` と localStorage の `bloxdRenderer` を外して再読み込みする ([第七部](07-internals.md) §29) |
| 遠景が白く濁る | フォグの二重掛けが原因のことが多い。完成色はフォグ済みなので、独自の霧色は控えめにし、彩度だけを落とす方式を検討するとよい |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | 発光ブロックが密度の高い領域・領域渡りで光のシードキューが溢れ、そのチャンクのライト計算が途中で打ち切られた警告。パック由来ではないが、**発光集中部のライト欠けはこの仕様**が原因であり、ワールド側で光源を分散させれば避けられる |
| ゲーム参加時にパックが除外される | ゲーム開始時の実機チェックで失敗している。ガード漏れを見直す |
| 実機チェックが終わらず `This device couldn't check …` 等でパックが外れる | チェックには 60 秒の強制タイムアウトがある (超過分は `skipped` 扱い)。低スペック端末・重いワールドで出やすいから、負荷の高い vertex 処理や複雑なループ構造を減らして再試行する |

### ローダー段階のエラーID一覧

設定画面のエラーには `shaderPack:load*` のIDが付く。文言検索の補助として:

| ID | 意味 |
|---|---|
| `loadZipTooBig` | zip が 32MB 超 |
| `loadTooManyZipEntries` | zip エントリが 1024 個超 |
| `loadTooManyWgsl` | `.wgsl` が 256 個超 |
| `loadSourceTooBig` | `.wgsl` 合計が 256KB 超 (ファイル単位のストリーミング検査) |
| `loadManifestTooBig` | `pack.json` が 64KB 超 |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` が JSON でない / オブジェクト型でない |
| `loadNoApiVersion` / `loadWrongApiVersion` | `apiVersion` 無し / `3` でない (v1/v2 は拒否) |
| `loadNoName` / `loadAuthorNotString` | `name` 無し / `author` が文字列以外 |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | 対応外圧縮方式 / zip64 / 分割 / 暗号化 |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | パス重複 / UTF-8 以外 / 展開失敗 / zip 損傷 |

`loadNoManifest` / `loadDuplicateManifest` (pack.json の位置・重複) は上の表の該当行を参照。

## 18. 権利・注意

- シェーダーパック機能自体はゲーム内 UI から読み込める公式機能であり、パック制作は想定内の行為と考えられる。ただし公開公式ドキュメントは確認できていない
- パックは純粋な WGSL であり、JS 実行・ネットワークアクセスは設計上不可能
- 本書は非公式の手順書であり、開発元の公式見解ではない。API は予告なく変更されうる

[← 前の部](04-realism.md)・[マニュアルに戻る](README.md)・[次の部 →](06-implementation.md)
