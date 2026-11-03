# シェーダー検証の内部

> 対象API: 5 · 対象ビルド: `ab90qa` · 検証状況: Analyzed (ライブバリデータから復元)

パック読み込み時に走る静的検証 (アナライザ) の内部構造です。ユーザー向けのエラー対処は [検証エラー](../troubleshooting/validation.md) を参照。

## 検証の段階

1. **ローダー制限** (zip / pack.json の形) → [パック形式](../api/pack-format.md)
2. **静的検証 (アナライザ)** — このページ。6バリアントすべての構文・型・予約名・フック契約を検証
3. **ブラウザ実コンパイル** → [WGSLコンパイルの内部](wgsl-compilation.md)
4. **ゲーム参加時のランタイム再検証** — 実在する全地形マテリアルで実際にコンパイルする (設定画面の静的検証より厳しい)。失敗するとそのゲームで除外される

## 特殊関数のシグネチャ表

バリデータは module 29849 に特殊関数の表を持ち、フック間の呼び出し制約を検証します:

```js
const Jq = new Map([
  ["bloxdFragmentBlockPosition", { params: "position: vec3f, normal: vec3f", returns: "vec3i", symbol: null, vertex: true }],
  ["bloxdOpaqueBehind", { params: "", returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }],
  ["bloxdTexel", { params: "textureId: u32, uv: vec2f, mipLevel: f32", returns: "vec4f", symbol: null }],
  ["bloxdTextureSize", { params: "mipLevel: f32", returns: "vec2u", symbol: null }],
]);
```

検証ロジック (復元):

- vertex フックから `vertex: true` 以外の特殊関数を呼ぶと *"X reaches Y, which only surface and light hooks can use."*
- `symbol` が設定された関数 (`bloxdOpaqueBehind` → `BLOXD_SCENE_DEPTH`) は、そのマクロを定義しないバリアントから到達すると *"X reaches Y, which needs BLOXD_SCENE_DEPTH, and Z doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH."*

注記: `bloxdFragmentBlockPosition` はヘッダー生成からは削除済みですが、この生きたシグネチャ表にはまだ載っています — そして識別子検証が参照するのはこの表なので、呼び出しは今も検証を通ります。コードジェネレーターも定義を (地形/液体とモデル両プログラムに) 注入し続けるため、実際に呼び出し可能なままです。非公開となったため非推奨扱い: ドキュメントされておらず、将来の任意のバージョンで削除され得ます。

## 予約名の診断

- **`/^bloxd/i` 一般則**: *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*
- **テクスチャ・サンプラ直接宣言**: *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*

## テクスチャ名の解決と診断

`bloxdTextureId*` の名前解決は専用のパスを持ちます ([テクスチャAPI](../api/texture-api.md#名前解決のエラーメッセージ-バリデータから逐語)):

- **畳み込み**: 名前を非英数字で分割・CamelCase 化し、`bloxdTextureId` 接頭辞に連結。逆方向の照合は大小文字・`_` を区別しない
- **スペル補正** (v5 新設): 解決できない名前には Levenshtein 距離 `max(2, floor(len/4)) + 1` の閾値で *"did you mean bloxdTextureIdY?"* を提案
- **フレーム綴り / 回転綴り**には専用メッセージ (「アニメーションテクスチャ Z のフレームを指す」「Z の回転コピーを指す」)
- **折り畳み後の曖昧名**は使用不可

## v5 の新診断

- *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."* — 廃止マクロの使用を名指しで説明
- `blockFlags` を読むパック / `bloxdBlockFlag*` を参照するパックは予約名診断で失敗する — **暗黙に誤動作するパックは存在しない**

## Y 導関数の自動書き換え

アナライザのトークン書き換えパスは `dpdy` / `dpdyCoarse` / `dpdyFine` のすべての呼び出しを `(-dpdy(...))` に書き換えます (反転セットとして明示列挙)。`dpdx` と `fwidth` 系は手つかずです ([制限と予約名](../api/restrictions.md#自動書き換え))。

## ヘッダー・テクスチャ定数の生成

- ヘッダーはパックの先頭に付される read-only テキスト ([Engine Header](engine-header.md))
- `bloxdTextureId*` ブロックはパックが実際に参照した名前から**パック毎に生成**される (3個の定数なら3行)

## HEADER_VERSION

`HEADER_VERSION` は `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` 構造 (v4 から先頭整数が 8 → 9 へ)。2 つの fnv1a32 接尾辞はヘッダー素材とソート済み名前-id レジストリの指紋です。保存パックの再検証ロジックはこの指紋照合で「要再チェック」を判定します ([互換性](../api/compatibility.md#保存パックの再検証-再チェック))。

## 検証スタブ

静的検証を通したコードは、ブラウザ WGSL コンパイラでの実検証に回る前にスタブコードを合成されます: `var<private> bloxdValidationP: vec4f` と `bloxdValidateVertex` / `bloxdValidateFragment` — 型スタブ表 (`bool` → `p.x > 0.0`、`vec3f` → `p.xyz` 等) から入力構造体を構築してフックを実行します。詳細は [WGSLコンパイルの内部](wgsl-compilation.md)。

## 関連

- [検証エラー](../troubleshooting/validation.md) — ユーザー向け対処
- [WGSLコンパイルの内部](wgsl-compilation.md) — 第2段階の実装
- [テクスチャレジストリの内部](texture-registry.md) — 名前解決とドリフト
- [エンジンデータ台帳](engine-data.md) — 定数台帳
