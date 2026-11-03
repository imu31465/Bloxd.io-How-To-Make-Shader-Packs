# 検証エラー

> 対象API: 5 · 対験状況: Verified (メッセージはライブバリデータから逐語採録)

静的検証 (アナライザ、読み込み時の第1段階) で出るエラーです。多くは予約名・strict 契約・フック間の呼び出し制約に関わります。

## 「Packs can't construct BloxdSurface directly」/「Packs can't construct BloxdLight directly, since header structs gain fields; ...」

- **原因**: `BloxdSurface(...)` 等のコンストラクタ呼び出し。ヘッダー構造体はフィールドが増えるため直接構築が禁止されている
- **解決方法**: `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` を起点にフィールドを書き換える。light フックなら `var out = s;` も可

## 「Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>」

- **原因**: 自分の識別子に `bloxd` 接頭辞 (大小文字無視) を使った
- **確認方法**: 宣言した定数・関数・構造体名を確認
- **解決方法**: 接頭辞を外す (`packTint` 等)。定義できるのは9つのフック関数名のみ
- **再発防止**: パック独自の名前は `pack` / `my` 等の接頭辞で統一する

## 「bloxdPackInputs isn't part of the bloxd_ header」

- **原因**: PackInputs uniform をパックから直接参照した
- **解決方法**: `bloxdSeconds()` / `bloxdLit()` 等のヘッダー関数経由で使う ([パック形式](../api/pack-format.md#per-frame-uniform-bloxdpackinputs))

## 「... reaches bloxdTexel, which only surface and light hooks can use.」

- **原因**: vertex フック (または vertex フックから到達可能な関数) から `bloxdTexel` / `bloxdTextureSize` を呼んだ
- **確認方法**: メッセージの "reaches" は**呼び出し経路**を指す — vertex フックから呼ぶ共用関数内でも発生する
- **解決方法**: 該当呼び出しを surface / light フック側に移動する

## 「... reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and <program> doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH.」

- **原因**: `bloxdOpaqueBehind()` は全 liquid バリアントでのみ定義される `BLOXD_SCENE_DEPTH` が必要。他プログラム (terrain/model) のフックと共有する関数内から呼ぶと、コンパイルできないバリアントが生じる
- **解決方法**: 呼び出しを `#ifdef BLOXD_SCENE_DEPTH` で囲む
- **再発防止**: 深度読み取りは liquid 専用の処理として分離する

## vertex フックと strict 契約

| メッセージ | 意味 |
|---|---|
| `<hook> moves terrain, which strict games prevent.` | 無防備な vertex フック |
| `discard makes terrain see-through, which strict games prevent.` | 到達可能な `discard` |

- **重要**: これはエラー表示ではなく **strict ゲームでの自動無効化** (`shaderPack:offInStrict`)。該当 strict ゲームで**全フック**が無効になる
- **解決方法**: vertex フック全体と `discard` を `#ifndef BLOXD_STRICT` で囲む ([バリアントとガード](../getting-started/variants.md))

## v5 で追加・変更された検証メッセージ

| メッセージ | 対応 |
|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | `#ifdef BLOXD_LIGHTING` → `if (bloxdLit())` へ ([ライティングAPI](../api/lighting.md#bloxdlit-lit)) |
| `bloxdBlockFlagRock isn't part of the shader pack API...` | 旧ビット定数の残存。`flags.rock` へ ([フラグ](../api/flags.md)) |
| `bloxdSpLitColour isn't part of the shader pack API...` | v4 の内部シンボル。公開の `bloxdLitColour()` を使う |

v5 のアナライザは `blockFlags` を読み続けるパックや light フックを `#ifdef BLOXD_LIGHTING` で括るパックに**固有のメッセージ**を出すようになったため、暗黙に誤動作することはありません ([v5 移行](../history/v5.md))。

## テクスチャ名の検証メッセージ

`bloxdTextureId*` の名前解決エラー (スペル補正・フレーム綴り・回転綴り) は [テクスチャの問題](textures.md) に分けています。

## 関連

- [API Reference: 制限と予約名](../api/restrictions.md) — 予約則の全体と `bloxdSp*` 46シンボル
- [Engine Internals: Shader Validation](../internals/shader-validation.md) — バリデータの内部動作
- [バリアント固有の問題](variants.md)
