# パック形式

> 対象API: 5 · 対象ビルド: `ab90qa` (2026-11-03 本番確認) · 検証状況: Verified (ライブローダから再計測)

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

それ以外のマニフェスト内容はローダに無視されます。`pack.json` は zip ルートに厳密に1つ、JSON オブジェクトでなければなりません。

## ローダ制限 (ライブ c53 で再計測)

| 制限 | 値 | 超過時のメッセージ |
|---|---|---|
| パックあたりの `.wgsl` ファイル数 | 256 | `The pack has more than 256 .wgsl files.` |
| `.wgsl` ソース合計 | 256 KB | `The pack's .wgsl files are over 256 KB in total.` |
| `pack.json` のサイズ | 64 KB | `pack.json is over 64 KB.` |
| zip サイズ | 32 MB | `The zip is over 32 MB.` |
| zip エントリ数 | 1,024 | `The zip has more than 1024 entries.` |
| zip の形 | — | 分割 zip・Zip64・暗号化エントリ・未対応圧縮はそれぞれ専用メッセージで拒否。全ファイルは有効な UTF-8、`pack.json` は厳密に1つ、パスの重複なし |

## API バージョン検証

ローダは `manifest.apiVersion !== 5` を JavaScript の厳密な `!==` で比較します。バージョン定数 `5` とヘッダーテンプレートは同じモジュール (c55 / module 29836) にあり、検証とそれが前提するヘッダー文本体が一緒に動きます。不一致のメッセージは [互換性](compatibility.md) を参照。

## per-frame uniform: bloxdPackInputs

`@group(3) @binding(0) var<uniform> bloxdPackInputs: BloxdPackInputs` — 引き続き 64 バイト、ただし v5 でメンバが1個増えました (ライブ uniform レイアウトモジュールから):

| オフセット | フィールド | 型 | 備考 |
|---|---|---|---|
| 0 | `seconds` | `f32` | `bloxdSeconds()` の裏 |
| 4 | `lit` | `u32` | **v5 の新設** — ブロック/空ライティングが有効なら 1。`bloxdLit()` の裏 |
| 16 | `renderOffset` | `vec3i` | `bloxdRenderOffset()` の裏 |
| 32 | `sunDirection` | `vec3f` | `bloxdSunDirection()` の裏 |
| 48 | `eyePosition` | `vec3f` | `bloxdEyePosition()` の裏 |

`lit` は v4 が `seconds` と `renderOffset` の間に既に持っていたパディングに収まりました (オフセット 4〜15 は v4 ではアラインメントの隙間。`vec3i` が 16 バイトアラインを必要とするため `renderOffset` は 16 のまま)。よって構造体の合計サイズも他の全メンバのオフセットも不変です。エンジンはこれを `setUint32(4, lit ? 1 : 0)` の 1 命令で書き込みます — これは光量ではなくフラグです (v4 の JS 側名 `terrainLightLevels` / `terrainHeldLight` はバンドルから完全に消えました)。

**パックから uniform を直接参照しないでください。** ヘッダー関数 (`bloxdSeconds()` 等) 経由でのみ使用します。stage 可視性は VERTEX|FRAGMENT のため、ヘッダー関数はモジュールスコープ関数や vertex フックからも呼べます。

## bind-group レイアウト

group 3 のバインディングは:

| binding | 内容 |
|---|---|
| 0 | `bloxdPackInputs` uniform (64B) |
| 1 | シーン深度テクスチャ (liquid バリアント) |
| 2 | `bloxdSpTextureLayers` ストレージバッファ |

`minBindingSize` も 64 のまま。深度テクスチャ (binding 1) は FRAGMENT 専用のため、`bloxdOpaqueBehind()` は surface / light フック限定です。

## wgsl ファイルの連結

複数の `.wgsl` は連結されて1モジュールとして扱われます。連結は**パス名の辞書順**。モジュールスコープの宣言は順序非依存のため通常は無関係ですが、`var` の初期化順序に依存する書き方をした場合のみ効きます。`.wgsl` 以外のファイルは無視されます。

## 関連

- 読み込み時の検証パイプライン → [Getting Started: 検証](../getting-started/validation.md)
- uniform の内部 → [エンジン内部: Engine Data](../internals/engine-data.md)
- 旧バージョンの uniform (v2〜v4) → [バージョン履歴](../history/)
