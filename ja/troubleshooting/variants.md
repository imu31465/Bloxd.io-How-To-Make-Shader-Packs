# バリアント固有の問題

> 対象API: 5 · 検証状況: Verified

6バリアント (`strict|allow` × `terrain|liquid|model`) のうち一部だけで発生する問題です。v5 ではライティング軸 (旧 `BLOXD_LIGHTING`) が消え、**6バリアントすべてが読み込み時に一括検証**されます。

## strict のゲームでだけ読み込めない / 外される

- **症状**: allow のゲームでは動くが strict のゲームでパックが無効
- **原因**: 無防備な vertex フック、または到達可能な `discard`。strict ゲームは頂点移動・`discard` を禁止し、違反は**パック全体の自動無効化** (`shaderPack:offInStrict`) になる
- **確認方法**: 読み込み画面で `<hook> moves terrain, which strict games prevent.` / `discard makes terrain see-through, which strict games prevent.` が出るか確認
- **解決方法**: vertex フック全体と `discard` を `#ifndef BLOXD_STRICT` で囲む
- **再発防止**: vertex フックを書くときは必ずガード付きテンプレートから始める ([バリアントとガード](../getting-started/variants.md))

## `.alpha` が未定義と言われる

- **症状**: `BloxdSurface.alpha` への代入が特定バリアントでだけ失敗
- **原因**: `alpha` フィールドは `#ifdef BLOXD_ALPHA` (全 liquid + 非 strict の terrain/model) でのみ存在
- **解決方法**: `alpha` を触るコードを `#ifdef BLOXD_ALPHA` で囲む
- **再発防止**: 「liquid は常に・terrain/model は allow のみ」の行列を覚える ([プリプロセッサ](../api/preprocessor.md#マクロバリアントの行列))

## `BloxdVertex only exists when BLOXD_STRICT isn't defined`

- **原因**: strict バリアントでは vertex フック自体が存在しないため `BloxdVertex` も無い。vertex 関連コードが strict バリアントから到達可能になっている
- **解決方法**: vertex フックを `#ifndef BLOXD_STRICT` で囲む

## `bloxdOpaqueBehind` が特定バリアントでだけ失敗する

- **原因**: `BLOXD_SCENE_DEPTH` は全 liquid バリアントでのみ定義。terrain/model と共有する関数内の呼び出しが原因
- **解決方法**: `#ifdef BLOXD_SCENE_DEPTH` で囲む ([検証エラー](validation.md))

## 水だけ効果が効かない (Liquid)

- **症状**: terrain のフックを書いたのに水の見た目が変わらない
- **原因**: **v5 では、パックに Liquid Hook がない場合、水には Terrain Hook は実行されません** (v4 以前の「liquid が無ければ terrain が代行」は廃止)
- **確認方法**: パックに `bloxdLiquidSurface` / `bloxdLiquidLight` があるか
- **解決方法**: Liquid フックを書く ([フックの分担](../api/hooks.md#各プログラムが描くもの))
- **再発防止**: 水を変えるパックは必ず `bloxdLiquid*` を定義する

## モデル (エンティティ・ブロックモデル) に効かない

- **症状**: プレイヤー・モブ・スラブ・草花の見た目が変わらない
- **原因**: v4 以前はパックの対象外だった。v5 では `bloxdModel*` フックが必要
- **解決方法**: `bloxdModelSurface` / `bloxdModelLight` を定義する ([モデルの描画](../guides/models.md))

## 6バリアントの検証について

ローダは読み込み時に**6バリアントすべてを一度に検証**します (ライティング軸はもはや別コンパイルされない)。ゲームが一部の条件しか使用しない場合でも、配布用パックは6通りすべてを想定する必要があります。

| バリアント | 定義されるマクロ |
|---|---|
| `allow.terrain` | `BLOXD_ALPHA` |
| `allow.liquid` | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | `BLOXD_ALPHA` |
| `strict.terrain` | — |
| `strict.liquid` | `BLOXD_SCENE_DEPTH` |
| `strict.model` | — |

## 関連

- [バリアントとガード](../getting-started/variants.md)
- [プリプロセッサ](../api/preprocessor.md)
- [エンジン内部: ゲーム別の適用モード](../internals/policy.md) — allow / strict のタイトル一覧
