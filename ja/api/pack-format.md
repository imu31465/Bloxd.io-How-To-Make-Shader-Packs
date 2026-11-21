# パック形式

パックモデルの全体像 — マニフェスト、ローダ制限、per-frame uniform — を1ページにまとめます。入門向きの手順は [はじめに](../getting-started/manifest.md) を参照。

## pack.json

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `apiVersion` | 数値 | 必須 | **`5` と厳密に (`===`) 一致**。文字列 `"5"` は失敗し JSON 上の表記つきで報告 |
| `name` | 文字列 | 必須 | トリミング後非空。設定画面に表示 |
| `author` | 文字列 | 任意 | 存在するなら文字列 |
| `keepCircleShadows` | boolean | 任意 | パックのシェーダーがリアル太陽シャドウ API を使う場合も、プレイヤー/モブの下の従来の円形影を残す ([影の表現](../guides/shadows.md))。既定 `false`。他の型は専用のロードメッセージで拒否 |

それ以外のマニフェスト内容はローダに無視されます。`pack.json` は zip ルートに厳密に1つ、JSON オブジェクトでなければなりません。

## ローダ制限

| 制限 | 値 | 超過時のメッセージ |
|---|---|---|
| パックあたりの `.wgsl` ファイル数 | 256 | `The pack has more than 256 .wgsl files.` |
| `.wgsl` ソース合計 | 256 KB | `The pack's .wgsl files are over 256 KB in total.` |
| `pack.json` のサイズ | 64 KB | `pack.json is over 64 KB.` |
| zip サイズ | 32 MB | `The zip is over 32 MB.` |
| zip エントリ数 | 1,024 | `The zip has more than 1024 entries.` |
| zip の形 | — | 分割 zip・Zip64・暗号化エントリ・未対応圧縮はそれぞれ専用メッセージで拒否。全ファイルは有効な UTF-8、`pack.json` は厳密に1つ、パスの重複なし |

## API バージョン検証

ローダは `manifest.apiVersion !== 5` を JavaScript の厳密な比較で判定します。`5` 以外の値 (文字列の `"5"` を含む) は受け付けません。不一致時のメッセージは[互換性](compatibility.md)を参照してください。

## per-frame uniform: bloxdPackInputs

`@group(3) @binding(0) var<uniform> bloxdPackInputs: BloxdPackInputs` — **80 バイト** (`bbb6l5` 以降。それ以前は 64)。ライブ uniform レイアウトモジュールから:

| オフセット | フィールド | 型 | 備考 |
|---|---|---|---|
| 0 | `seconds` | `f32` | `bloxdSeconds()` の裏 |
| 4 | `lit` | `u32` | **v5 の新設** — ブロック/空ライティングが有効なら 1。`bloxdLit()` の裏 |
| 16 | `renderOffset` | `vec3i` | `bloxdRenderOffset()` の裏 |
| 32 | `sunDirection` | `vec3f` | `bloxdSunDirection()` の裏 |
| 48 | `eyePosition` | `vec3f` | `bloxdEyePosition()` の裏 |
| 64 | `shadowDirection` | `vec3f` | 影を落とす光の進行方向。`bloxdShadowDirection()` の裏 |

`shadowDirection` は `eyePosition` の後のパディングに収まりました (`vec3f` は 12 バイトを占めるためオフセット 60〜63 が隙間。64 の位置は 16 バイト境界で、構造体はちょうど 80 バイト)。エンジンは 3 回の `setFloat32` で書き込みます — 単位ベクトル (昼は太陽、夜は月、太陽がない worlds では既定空の太陽) で、決して水平線より上にはなりません。uniform 全体は 80 バイトで、`minBindingSize` も 80 です。

`lit` は v4 が `seconds` と `renderOffset` の間に既に持っていたパディングに収まりました (オフセット 4〜15 は v4 ではアラインメントの隙間。`vec3i` が 16 バイトアラインを必要とするため `renderOffset` は 16 のまま)。

**パックから uniform を直接参照しないでください。** ヘッダー関数 (`bloxdSeconds()` 等) 経由でのみ使用します。stage 可視性は VERTEX|FRAGMENT のため、ヘッダー関数はモジュールスコープ関数や vertex フックからも呼べます。

## bind-group レイアウト

group 3 のバインディングは次のとおりです:

| binding | 内容 |
|---|---|
| 0 | `bloxdPackInputs` uniform (80B) |
| 1 | シーン深度テクスチャ (liquid バリアント) |
| 2 | `bloxdSpTextureLayers` ストレージバッファ |

`minBindingSize` は 80 バイトです。深度テクスチャ (binding 1) は FRAGMENT 専用のため、`bloxdOpaqueBehind()` は surface / light フック限定です。

## wgsl ファイルの連結

複数の `.wgsl` は連結されて1モジュールとして扱われます。連結は**パス名の辞書順**。モジュールスコープの宣言は順序非依存のため通常は無関係ですが、`var` の初期化順序に依存する書き方をした場合のみ効きます。`.wgsl` 以外のファイルは無視されます。
